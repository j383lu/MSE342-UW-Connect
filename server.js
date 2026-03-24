import mysql from 'mysql';
import config from './config.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import profileRoutes from "./profileRoutes.js";
import multer from 'multer'; // For file uploads
import fs from 'fs'; // For file system operations
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert {type: 'json'};
import { group } from 'console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mse342-group1-default-rtdb.firebaseio.com"
});

// Middleware to verify Firebase ID Token
const checkAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const idToken = authHeader.startsWith('Bearer ') 
      ? authHeader.split('Bearer ')[1] 
      : authHeader;

  admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
      req.user = decodedToken;
      next();
    })
    .catch((error) => {
       res.status(403).json({ error: 'Unauthorized', message: 'Token invalid' });
    });
};

// Create database connection using your config (ONLY ONE DECLARATION)
const db = mysql.createConnection({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.database,
  port: config.port
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, "client/build")));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

app.use(express.static(path.join(__dirname, "client/build")));

// Profile routes
app.use("/api/profile", profileRoutes);

const getCurrentUserIdByEmail = (email, callback) => {
  const sql = `
    SELECT user_id
    FROM User_Credentials
    WHERE LOWER(email) = LOWER(?)
    LIMIT 1
  `;

  db.query(sql, [email], (err, rows) => {
    if (err) {
      return callback(err, null);
    }

    if (!rows || rows.length === 0) {
      return callback(new Error("User not found in User_Credentials"), null);
    }

    return callback(null, rows[0].user_id);
  });
};

// GET /api/events
// default: upcoming only
// if includePast=true: return all events
app.get("/api/events", checkAuth, (req, res) => {
  const includePast = String(req.query.includePast).toLowerCase() === "true";
  const whereClause = includePast
    ? ""
    : "WHERE TIMESTAMP(e.event_date, e.event_time) >= NOW()";

  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("GET /api/events user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const sql = `
      SELECT 
        e.id,
        e.title,
        e.description,
        DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
        TIME_FORMAT(e.event_time, '%H:%i') AS event_time,
        e.location,
        e.capacity,
        e.likes,
        e.category,
        DATE_FORMAT(e.published_time, '%Y-%m-%d %H:%i') AS published_time,
        COUNT(DISTINCT a.id) AS current_count,
        GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ',') AS tags,
        (TIMESTAMP(e.event_date, e.event_time) < NOW()) AS is_past,
        MAX(CASE WHEN LOWER(a.attendee_name) = ? THEN 1 ELSE 0 END) AS has_joined,
        MAX(CASE WHEN el.user_id = ? THEN 1 ELSE 0 END) AS has_liked
      FROM Events e
      LEFT JOIN Event_Attendees a ON a.event_id = e.id
      LEFT JOIN Event_Tags t ON t.event_id = e.id
      LEFT JOIN Event_Likes el ON el.event_id = e.id
      ${whereClause}
      GROUP BY e.id
      ORDER BY e.event_date ASC, e.event_time ASC
    `;

    db.query(sql, [currentUserEmail, currentUserId], (err, results) => {
      if (err) {
        console.log("GET /api/events error:", err);
        return res.status(500).json({ error: "Failed to load events." });
      }

      return res.json(results);
    });
  });
});

// POST /api/events (create event)
app.post("/api/events", checkAuth, (req, res) => {
  const {
    title,
    description,
    event_date,
    event_time,
    location,
    capacity,
    category,
    tags,
  } = req.body;

  if (
    !title ||
    !description ||
    !event_date ||
    !event_time ||
    !location ||
    capacity === undefined ||
    !category
  ) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const capNum = Number(capacity);
  if (!Number.isInteger(capNum) || capNum <= 0) {
    return res.status(400).json({ error: "Capacity must be a positive integer." });
  }

  const safeTags = Array.isArray(tags) ? tags : [];

  const insertEventSql = `
    INSERT INTO Events (title, description, event_date, event_time, location, capacity, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertEventSql,
    [title, description, event_date, event_time, location, capNum, category],
    (err, result) => {
      if (err) {
        console.log("POST /api/events error:", err);
        return res.status(500).json({ error: "Failed to create event." });
      }

      const eventId = result.insertId;

      const uniqueTags = [
        ...new Set(safeTags.map((tag) => String(tag).trim()).filter(Boolean)),
      ];

      if (uniqueTags.length === 0) {
        return res.status(201).json({
          id: eventId,
          message: "Event created successfully.",
        });
      }

      const values = uniqueTags.map((tag) => [eventId, tag]);

      const insertTagsSql = `
        INSERT INTO Event_Tags (event_id, tag_name)
        VALUES ?
      `;

      db.query(insertTagsSql, [values], (tagErr) => {
        if (tagErr) {
          console.log("Insert Event_Tags error:", tagErr);
          return res.status(500).json({
            error: "Event was created, but failed to save tags.",
          });
        }

        return res.status(201).json({
          id: eventId,
          message: "Event created successfully.",
        });
      });
    }
  );
});

// POST /api/events/:id/join
app.post("/api/events/:id/join", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const attendeeEmail = String(req.user.email || "").trim().toLowerCase();

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  if (!attendeeEmail) {
    return res.status(400).json({ error: "Missing authenticated user email." });
  }

  const eventSql = `
    SELECT id, title, event_date, event_time, capacity
    FROM Events
    WHERE id = ?
    LIMIT 1
  `;

  db.query(eventSql, [eventId], (err, rows) => {
    if (err) {
      console.log("Join event lookup error:", err);
      return res.status(500).json({ error: "Failed to load event." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const event = rows[0];
    const cap = Number(event.capacity || 0);

    const isPastSql = `
      SELECT (TIMESTAMP(event_date, event_time) < NOW()) AS is_past
      FROM Events
      WHERE id = ?
      LIMIT 1
    `;

    db.query(isPastSql, [eventId], (pastErr, pastRows) => {
      if (pastErr || pastRows.length === 0) {
        return res.status(500).json({ error: "Failed to check event time." });
      }

      if (Number(pastRows[0].is_past) === 1) {
        return res.status(400).json({ error: "This event already ended." });
      }

      const duplicateSql = `
        SELECT id
        FROM Event_Attendees
        WHERE event_id = ? AND LOWER(attendee_name) = ?
        LIMIT 1
      `;

      db.query(duplicateSql, [eventId, attendeeEmail], (dupErr, dupRows) => {
        if (dupErr) {
          return res.status(500).json({ error: "Failed to check join status." });
        }

        if (dupRows.length > 0) {
          return res.status(400).json({ error: "You have already joined this event." });
        }

        const countSql = `
          SELECT COUNT(*) AS current_count
          FROM Event_Attendees
          WHERE event_id = ?
        `;

        db.query(countSql, [eventId], (countErr, countRows) => {
          if (countErr) {
            return res.status(500).json({ error: "Failed to check capacity." });
          }

          const current = Number(countRows[0].current_count || 0);

          if (cap > 0 && current >= cap) {
            return res.status(400).json({ error: "Event is full." });
          }

          const insertSql = `
            INSERT INTO Event_Attendees (event_id, attendee_name)
            VALUES (?, ?)
          `;

          db.query(insertSql, [eventId, attendeeEmail], (insertErr) => {
            if (insertErr) {
              console.log("join insert error:", insertErr);
              return res.status(500).json({ error: "Failed to join event." });
            }

            db.query(countSql, [eventId], (reloadErr, newCountRows) => {
              if (reloadErr) {
                return res.status(500).json({
                  error: "Joined event, but failed to reload attendee count.",
                });
              }

              return res.json({
                current_count: Number(newCountRows[0].current_count || 0),
                has_joined: 1,
                message: `You have successfully joined the "${event.title}" event.`,
              });
            });
          });
        });
      });
    });
  });
});

// DELETE /api/events/:id/leave
app.delete("/api/events/:id/leave", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const attendeeEmail = String(req.user.email || "").trim().toLowerCase();

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  if (!attendeeEmail) {
    return res.status(400).json({ error: "Missing authenticated user email." });
  }

  const eventSql = `
    SELECT title
    FROM Events
    WHERE id = ?
    LIMIT 1
  `;

  db.query(eventSql, [eventId], (eventErr, eventRows) => {
    if (eventErr) {
      console.log("Leave event title lookup error:", eventErr);
      return res.status(500).json({ error: "Failed to load event." });
    }

    if (eventRows.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const eventTitle = eventRows[0].title;

    const deleteSql = `
      DELETE FROM Event_Attendees
      WHERE event_id = ? AND LOWER(attendee_name) = ?
    `;

    db.query(deleteSql, [eventId, attendeeEmail], (err, result) => {
      if (err) {
        console.log("leave event error:", err);
        return res.status(500).json({ error: "Failed to leave event." });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({ error: "You have not joined this event yet." });
      }

      const countSql = `
        SELECT COUNT(*) AS current_count
        FROM Event_Attendees
        WHERE event_id = ?
      `;

      db.query(countSql, [eventId], (countErr, countRows) => {
        if (countErr) {
          console.log("Leave event reload count error:", countErr);
          return res.status(500).json({
            error: "Left event, but failed to reload attendee count.",
          });
        }

        return res.json({
          current_count: Number(countRows[0].current_count || 0),
          has_joined: 0,
          message: `You have successfully left the "${eventTitle}" event.`,
        });
      });
    });
  });
});

// GET /api/events/:id/attendees
app.get("/api/events/:id/attendees", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  const sql = `
    SELECT 
      a.attendee_name,
      a.joined_at,
      uc.user_id,
      up.display_name
    FROM Event_Attendees a
    LEFT JOIN User_Credentials uc
      ON LOWER(a.attendee_name) = LOWER(uc.email)
    LEFT JOIN User_Profiles up
      ON uc.user_id = up.user_id
    WHERE a.event_id = ?
    ORDER BY a.joined_at ASC
  `;

  db.query(sql, [eventId], (err, results) => {
    if (err) {
      console.log("GET /api/events/:id/attendees error:", err);
      return res.status(500).json({ error: "Failed to load attendees." });
    }

    const formatted = (results || []).map((row) => ({
      attendee_name: row.display_name || row.attendee_name,
      joined_at: row.joined_at,
      email: row.attendee_name,
      user_id: row.user_id || null,
    }));

    return res.json(formatted);
  });
});

app.use('/uploads', express.static('uploads'));

// API Routes

//CREATE GROUP PAGE:

///GET TAGS FROM DATABASE:
app.get("/api/tags", checkAuth, (req, res) => {
  const sql = "SELECT tag_id, tag_name FROM Tags ORDER BY tag_name ASC;";
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET /api/tags error:", err);
      return res.status(500).json({ error: "Failed to fetch tags" });
    }
    return res.json(rows);
  });
});

// CREATE GROUP API (with optional image upload):
app.post("/api/groups", checkAuth, upload.single('coverImage'), (req, res) => {
  const { name, description, category, isOpen, maxMembers } = req.body;
  
  // Creator comes from the logged-in app user (sent by client)
  const creator_id = Number(req.body.user_id);
  if (!creator_id) {
    return res.status(400).json({ error: "Missing or invalid user_id for group creator" });
  }
  
  // Convert isOpen (public = true, private = false) to is_private (1 for private, 0 for public)
  const is_private = isOpen === 'true' ? 0 : 1;
  
  // Handle max_members (if empty/null, set to NULL for unlimited)
  const max_members = maxMembers ? parseInt(maxMembers) : null;
  
  // Get the uploaded file path if exists
  const image_url = req.file ? req.file.filename : null;
  
  const sql = `
    INSERT INTO Social_Group 
    (creator_id, name, description, category, is_private, max_members, image_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [creator_id, name, description, category, is_private, max_members, image_url], 
    (err, result) => {
      if (err) {
        console.error("POST /api/groups error:", err);
        return res.status(500).json({ 
          error: "Failed to create group", 
          details: err.message 
        });
      }

      const groupId = result.insertId;

      // For both public and private: creator is automatically a member (shows in "My Groups")
      db.query(
        "INSERT INTO Group_Members (group_id, user_id) VALUES (?, ?)",
        [groupId, creator_id],
        (errMember) => {
          if (errMember) {
            console.error("POST /api/groups: auto-join creator failed:", errMember);
          }
          return res.status(201).json({
            id: groupId,
            creator_id,
            name,
            description,
            category,
            is_private,
            max_members,
            image_url,
            message: "Group created successfully"
          });
        }
      );
    }
  );
});

// GET ALL GROUPS (for discovery page):
app.get("/api/groups", checkAuth, (req, res) => {
  const { category, search } = req.query;
  
  let sql = `
    SELECT sg.*, up.display_name as creator_name, 
    (SELECT COUNT(*) FROM Group_Members gm WHERE gm.group_id = sg.group_id) as member_count
    FROM Social_Group sg
    LEFT JOIN User_Profiles up ON sg.creator_id = up.user_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (category && category !== 'All') {
    sql += " AND sg.category = ?";
    params.push(category);
  }
  
  if (search) {
    sql += " AND (sg.name LIKE ? OR sg.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  
  sql += " ORDER BY sg.group_id DESC";
  
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("GET /api/groups error:", err);
      return res.status(500).json({ error: "Failed to fetch groups" });
    }
    return res.json(rows);
  });
});

// GET SINGLE GROUP BY ID:
app.get("/api/groups/:groupId", checkAuth, (req, res) => {
  const groupId = req.params.groupId;
  
  const sql = `
    SELECT sg.*, up.display_name as creator_name,
    (SELECT COUNT(*) FROM Group_Members gm WHERE gm.group_id = sg.group_id) as member_count
    FROM Social_Group sg
    LEFT JOIN User_Profiles up ON sg.creator_id = up.user_id
    WHERE sg.group_id = ?
  `;
  
  db.query(sql, [groupId], (err, rows) => {
    if (err) {
      console.error("GET /api/groups/:groupId error:", err);
      return res.status(500).json({ error: "Failed to fetch group" });
    }
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }
    
    return res.json(rows[0]);
  });
});

// GET GROUPS CREATED BY USER (Owned Groups):
app.get("/api/users/:userId/groups/owned", checkAuth, (req, res) => {
  const userId = req.params.userId;
  
  const sql = `
    SELECT sg.*, 
    (SELECT COUNT(*) FROM Group_Members gm WHERE gm.group_id = sg.group_id) as member_count
    FROM Social_Group sg
    WHERE sg.creator_id = ?
    ORDER BY sg.group_id DESC
  `;
  
  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("GET /api/users/:userId/groups/owned error:", err);
      return res.status(500).json({ error: "Failed to fetch owned groups" });
    }
    return res.json(rows);
  });
});

// GET GROUPS USER IS A MEMBER OF (My Groups):
app.get("/api/users/:userId/groups/member", checkAuth, (req, res) => {
  const userId = req.params.userId;
  
  console.log(`GET /api/users/${userId}/groups/member - Fetching user's groups`);
  
  const sql = `
    SELECT sg.*, 
    (SELECT COUNT(*) FROM Group_Members gm2 WHERE gm2.group_id = sg.group_id) as member_count
    FROM Social_Group sg
    INNER JOIN Group_Members gm ON sg.group_id = gm.group_id
    WHERE gm.user_id = ?
    ORDER BY sg.group_id DESC
  `;
  
  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("GET /api/users/:userId/groups/member error:", err);
      return res.status(500).json({ error: "Failed to fetch member groups" });
    }
    console.log(`Found ${rows.length} groups for user ${userId}:`, rows);
    return res.json(rows);
  });
});

// JOIN GROUP:
app.post("/api/groups/:groupId/join", checkAuth, (req, res) => {
  const groupId = req.params.groupId;
  // Prefer explicit userId from client, fallback to 1 for now
  const userId = Number(req.body.userId) || 1;
  
  // First check if group exists and has space
  const checkSql = `
    SELECT sg.*, COUNT(gm.user_id) as current_members
    FROM Social_Group sg
    LEFT JOIN Group_Members gm ON sg.group_id = gm.group_id
    WHERE sg.group_id = ?
    GROUP BY sg.group_id
  `;
  
  db.query(checkSql, [groupId], (err, rows) => {
    if (err) {
      console.error("Error checking group:", err);
      return res.status(500).json({ error: "Failed to check group" });
    }
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }
    
    const group = rows[0];
    
    // Check if group is full
    if (group.max_members && group.current_members >= group.max_members) {
      return res.status(400).json({ error: "Group is full" });
    }
    
    // Check if user is already a member
    const memberCheckSql = "SELECT * FROM Group_Members WHERE group_id = ? AND user_id = ?";
    db.query(memberCheckSql, [groupId, userId], (err, memberRows) => {
      if (err) {
        console.error("Error checking membership:", err);
        return res.status(500).json({ error: "Failed to check membership" });
      }
      
      if (memberRows.length > 0) {
        return res.status(400).json({ error: "Already a member of this group" });
      }
      
      // Add user to group
      const joinSql = "INSERT INTO Group_Members (group_id, user_id) VALUES (?, ?)";
      db.query(joinSql, [groupId, userId], (err, result) => {
        if (err) {
          console.error("Error joining group:", err);
          return res.status(500).json({ error: "Failed to join group" });
        }
        
        return res.status(201).json({ 
          message: "Successfully joined group",
          groupId: groupId,
          userId: userId
        });
      });
    });
  });
});

// LEAVE GROUP:
app.delete("/api/groups/:groupId/leave", (req, res) => {
  const groupId = req.params.groupId;
  // Prefer explicit userId from client, fallback to 1 for now
  const userId = Number(req.body.userId) || 1;
  
  const sql = "DELETE FROM Group_Members WHERE group_id = ? AND user_id = ?";
  
  db.query(sql, [groupId, userId], (err, result) => {
    if (err) {
      console.error("Error leaving group:", err);
      return res.status(500).json({ error: "Failed to leave group" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Not a member of this group" });
    }
    
    return res.json({ message: "Successfully left group" });
  });
});

// Create group invite(s) by email (owner only, matches existing Group_Invites schema: id, group_id, email, invited_by_user_id, status, created_at)
app.post("/api/groups/:groupId/invite", checkAuth, (req, res) => {
  const groupId = Number(req.params.groupId);
  const { emails = [], inviterId } = req.body;

  if (!groupId || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: "groupId and at least one email are required" });
  }

  const normalizedEmails = emails
    .map(e => String(e || "").trim().toLowerCase())
    .filter(e => e);

  if (normalizedEmails.length === 0) {
    return res.status(400).json({ error: "No valid email addresses provided" });
  }

  // Verify group exists and get creator
  const groupSql = "SELECT group_id, creator_id, name FROM Social_Group WHERE group_id = ? LIMIT 1";
  db.query(groupSql, [groupId], (groupErr, groupRows) => {
    if (groupErr) {
      console.error("Error fetching group for invite:", groupErr);
      return res.status(500).json({ error: "Failed to load group for invite" });
    }

    if (!groupRows || groupRows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const group = groupRows[0];
    const resolvedInviterId = inviterId ? Number(inviterId) : group.creator_id;

    // Optional: ensure only creator can invite for now
    if (inviterId && resolvedInviterId !== group.creator_id) {
      return res.status(403).json({ error: "Only the group owner can send invites" });
    }

    // Look up users & names for these emails
    const placeholders = normalizedEmails.map(() => "?").join(", ");
    const usersSql = `
      SELECT uc.user_id, uc.email, up.display_name
      FROM User_Credentials uc
      LEFT JOIN User_Profiles up ON up.user_id = uc.user_id
      WHERE LOWER(uc.email) IN (${placeholders})
    `;

    db.query(usersSql, normalizedEmails, (userErr, userRows) => {
      if (userErr) {
        console.error("Error looking up invitee users:", userErr);
        return res.status(500).json({ error: "Failed to look up invitees" });
      }

      if (!userRows || userRows.length === 0) {
        return res.status(404).json({ error: "No matching users found for provided emails" });
      }

      const targetUser = userRows[0];

      // Check if already a member of this group
      const memberSql = "SELECT 1 FROM Group_Members WHERE group_id = ? AND user_id = ? LIMIT 1";
      db.query(memberSql, [groupId, targetUser.user_id], (memberErr, memberRows) => {
        if (memberErr) {
          console.error("Error checking membership before invite:", memberErr);
          return res.status(500).json({ error: "Failed to check membership" });
        }

        if (memberRows && memberRows.length > 0) {
          const name = targetUser.display_name || targetUser.email;
          return res.status(400).json({
            error: `${name} is already a member of the group`,
            code: "already_member",
            userName: name,
          });
        }

        // Insert invites; Group_Invites stores email, not invitee_user_id
        const values = normalizedEmails.map(email => [groupId, email, resolvedInviterId, "pending"]);

        const insertSql = `
          INSERT INTO Group_Invites (group_id, email, invited_by_user_id, status)
          VALUES ?
        `;

        db.query(insertSql, [values], (inviteErr) => {
          if (inviteErr) {
            console.error("Error creating group invites:", inviteErr);
            return res.status(500).json({ error: "Failed to create invites" });
          }

          const invitedName = targetUser.display_name || targetUser.email;
          return res.status(201).json({
            message: "Invites created successfully",
            invitedCount: values.length,
            invitedName,
          });
        });
      });
    });
  });
});

// Get pending invites for a user, using email from User_Credentials
app.get("/api/users/:userId/invites", checkAuth, (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  const sql = `
    SELECT 
      gi.id AS invite_id,
      gi.group_id,
      gi.status,
      gi.created_at,
      sg.name AS group_name,
      up.display_name AS inviter_name
    FROM Group_Invites gi
    JOIN Social_Group sg ON sg.group_id = gi.group_id
    LEFT JOIN User_Profiles up ON up.user_id = gi.invited_by_user_id
    JOIN User_Credentials uc ON LOWER(uc.email) = LOWER(gi.email)
    WHERE uc.user_id = ? AND gi.status = 'pending'
    ORDER BY gi.created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("GET /api/users/:userId/invites error:", err);
      return res.status(500).json({ error: "Failed to fetch invites" });
    }
    return res.json(rows || []);
  });
});

// Respond to an invite (accept / decline) using existing Group_Invites schema
app.post("/api/invites/:inviteId/respond", checkAuth, (req, res) => {
  const inviteId = Number(req.params.inviteId);
  const { action, userId } = req.body;

  if (!inviteId || !userId) {
    return res.status(400).json({ error: "inviteId and userId are required" });
  }

  if (action !== "accept" && action !== "decline") {
    return res.status(400).json({ error: "action must be 'accept' or 'decline'" });
  }

  const getInviteSql = `
    SELECT gi.id, gi.group_id, gi.email, gi.status
    FROM Group_Invites gi
    JOIN User_Credentials uc ON LOWER(uc.email) = LOWER(gi.email)
    WHERE gi.id = ? AND uc.user_id = ?
    LIMIT 1
  `;

  db.query(getInviteSql, [inviteId, userId], (inviteErr, inviteRows) => {
    if (inviteErr) {
      console.error("Error fetching invite:", inviteErr);
      return res.status(500).json({ error: "Failed to load invite" });
    }

    if (!inviteRows || inviteRows.length === 0) {
      return res.status(404).json({ error: "Invite not found" });
    }

    const invite = inviteRows[0];
    if (invite.status !== "pending") {
      return res.status(400).json({ error: "Invite is no longer pending" });
    }

    // Helper to delete the invite row
    const deleteSql = "DELETE FROM Group_Invites WHERE id = ?";

    if (action === "decline") {
      db.query(deleteSql, [inviteId], (delErr) => {
        if (delErr) {
          console.error("Error deleting invite on decline:", delErr);
          return res.status(500).json({ error: "Failed to update invite" });
        }
        return res.json({ message: "Invite declined" });
      });
      return;
    }

    // If accepting, also add to Group_Members (if not already a member)
    const memberCheckSql = "SELECT * FROM Group_Members WHERE group_id = ? AND user_id = ?";
    db.query(memberCheckSql, [invite.group_id, userId], (memberErr, memberRows) => {
      if (memberErr) {
        console.error("Error checking group membership on accept:", memberErr);
        return res.status(500).json({ error: "Failed to update membership" });
      }

      if (memberRows && memberRows.length > 0) {
        // Already a member; just delete invite
        db.query(deleteSql, [inviteId], (delErr) => {
          if (delErr) {
            console.error("Error deleting invite after accept (already member):", delErr);
            return res.status(500).json({ error: "Failed to update invite" });
          }
          return res.json({ message: "Invite accepted; already a member" });
        });
        return;
      }

      const addMemberSql = "INSERT INTO Group_Members (group_id, user_id) VALUES (?, ?)";
      db.query(addMemberSql, [invite.group_id, userId], (addErr) => {
        if (addErr) {
          console.error("Error adding member on invite accept:", addErr);
          return res.status(500).json({ error: "Failed to add member to group" });
        }

        // After successful membership, delete invite
        db.query(deleteSql, [inviteId], (delErr) => {
          if (delErr) {
            console.error("Error deleting invite after accept:", delErr);
            return res.status(500).json({ error: "Failed to update invite" });
          }
          return res.json({ message: "Invite accepted and membership granted" });
        });
      });
    });
  });
});

// UPDATE GROUP:
app.put("/api/groups/:groupId", upload.single('coverImage'), (req, res) => {
  const groupId = req.params.groupId;
  const { name, description, category, isOpen, maxMembers } = req.body;
  const userId = 1; // Hardcoded for now
  
  // Check if user is the creator
  const checkSql = "SELECT * FROM Social_Group WHERE group_id = ? AND creator_id = ?";
  
  db.query(checkSql, [groupId, userId], (err, rows) => {
    if (err) {
      console.error("Error checking group ownership:", err);
      return res.status(500).json({ error: "Failed to verify ownership" });
    }
    
    if (rows.length === 0) {
      return res.status(403).json({ error: "You don't have permission to edit this group" });
    }
    
    const is_private = isOpen === 'true' ? 0 : 1;
    const max_members = maxMembers ? parseInt(maxMembers) : null;
    
    let sql = `
      UPDATE Social_Group 
      SET name = ?, description = ?, category = ?, is_private = ?, max_members = ?
    `;
    
    const params = [name, description, category, is_private, max_members];
    
    // Add image_url to update if new image uploaded
    if (req.file) {
      sql += ", image_url = ?";
      params.push(req.file.filename);
    }
    
    sql += " WHERE group_id = ?";
    params.push(groupId);
    
    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("Error updating group:", err);
        return res.status(500).json({ error: "Failed to update group" });
      }
      
      return res.json({ 
        message: "Group updated successfully",
        groupId: groupId
      });
    });
  });
});

// DELETE GROUP:
app.delete("/api/groups/:groupId", (req, res) => {
  const groupId = req.params.groupId;
  const userId = 1; // Hardcoded for now
  
  // Check if user is the creator
  const checkSql = "SELECT * FROM Social_Group WHERE group_id = ? AND creator_id = ?";
  
  db.query(checkSql, [groupId, userId], (err, rows) => {
    if (err) {
      console.error("Error checking group ownership:", err);
      return res.status(500).json({ error: "Failed to verify ownership" });
    }
    
    if (rows.length === 0) {
      return res.status(403).json({ error: "You don't have permission to delete this group" });
    }
    
    // First delete all members
    const deleteMembersSql = "DELETE FROM Group_Members WHERE group_id = ?";
    db.query(deleteMembersSql, [groupId], (err) => {
      if (err) {
        console.error("Error deleting group members:", err);
        return res.status(500).json({ error: "Failed to delete group members" });
      }
      
      // Then delete the group
      const deleteGroupSql = "DELETE FROM Social_Group WHERE group_id = ?";
      db.query(deleteGroupSql, [groupId], (err, result) => {
        if (err) {
          console.error("Error deleting group:", err);
          return res.status(500).json({ error: "Failed to delete group" });
        }
        
        return res.json({ message: "Group deleted successfully" });
      });
    });
  });
});

// GET GROUP MEMBERS with user details
app.get("/api/groups/:groupId/members", checkAuth, (req, res) => {
  const groupId = req.params.groupId;
  
  console.log(`GET /api/groups/${groupId}/members - Fetching group members`);
  
  const sql = `
    SELECT gm.user_id, gm.role, gm.joined_at, up.display_name, up.avatar_url
    FROM Group_Members gm
    LEFT JOIN User_Profiles up ON gm.user_id = up.user_id
    WHERE gm.group_id = ?
    ORDER BY 
      CASE WHEN gm.user_id = ? THEN 0 ELSE 1 END, -- Put owner first (you'll need to pass creator_id)
      gm.joined_at ASC
  `;
  
  // We need the creator_id to identify the owner
  // First get the creator_id
  const creatorSql = "SELECT creator_id FROM Social_Group WHERE group_id = ?";
  
  db.query(creatorSql, [groupId], (err, creatorResult) => {
    if (err) {
      console.error("Error fetching group creator:", err);
      return res.status(500).json({ error: "Failed to fetch group creator" });
    }
    
    if (creatorResult.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }
    
    const creatorId = creatorResult[0].creator_id;
    
    // Now fetch members with the creator_id for ordering
    db.query(sql, [groupId, creatorId], (err, rows) => {
      if (err) {
        console.error("Error fetching group members:", err);
        return res.status(500).json({ error: "Failed to fetch members" });
      }
      
      // Add role information (owner vs member)
      const membersWithRole = rows.map(member => ({
        ...member,
        role: member.user_id === creatorId ? 'owner' : 'member'
      }));
      
      console.log(`Found ${membersWithRole.length} members for group ${groupId}`);
      return res.json(membersWithRole);
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ------------------------------FEED PAGE APIs
const getNumericUserId = (email) => {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT user_id FROM User_Credentials WHERE email = ? LIMIT 1',
            [email],
            (err, rows) => {
                if (err) return reject(err);
                if (!rows || rows.length === 0) return reject(new Error('User not found'));
                resolve(rows[0].user_id);
            }
        );
    });
};

// GET /api/groups/:groupId/posts - get posts for a specific group
app.get('/api/groups/:groupId/posts', checkAuth, async (req, res) => {
    const groupId = Number(req.params.groupId);
    if (!groupId) {
        return res.status(400).json({ error: 'Invalid group id' });
    }

    let currentUserId;
    try {
        currentUserId = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    const sql = `
        SELECT p.post_id, p.title, p.content, p.author_id, p.group_id, sg.name AS group_name,
               p.is_anonymous, p.image_url, p.created_at AS createdAt,
               up.display_name AS author_name,
               GROUP_CONCAT(DISTINCT t.tag_name) AS tags,
               COUNT(DISTINCT l.like_id) AS like_count,
               MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me,
               (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id) AS comment_count
        FROM Posts p
        LEFT JOIN Social_Group sg ON p.group_id = sg.group_id
        LEFT JOIN User_Profiles up ON p.author_id = up.user_id
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        LEFT JOIN Likes l ON p.post_id = l.post_id
        WHERE p.group_id = ?
        GROUP BY p.post_id
        ORDER BY p.post_id DESC
    `;

    db.query(sql, [currentUserId, groupId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error retrieving group posts' });
        }

        const formattedPosts = results.map(post => ({
            post_id: post.post_id,
            author_id: post.author_id,
            author_name: post.author_name ?? `User ${post.author_id}`,
            title: post.title,
            description: post.content,
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            like_count: post.like_count,
            liked_by_me: post.liked_by_me === 1,
            comment_count: post.comment_count ?? 0,
            group_id: post.group_id,
            group_name: post.group_name
        }));

        return res.json(formattedPosts);
    });
});

// Post /api/posts - create a new post
app.post('/api/posts', checkAuth, upload.single('image'), async (req, res) => {
    //let connection = mysql.createConnection(config);

    let { title, content, group_id = null, is_anonymous = 0, tags = [] } = req.body;
    const image_url = req.file ? req.file.filename : null;
    if (typeof tags === 'string') {
        try { tags = JSON.parse(tags); } catch { tags = []; }
    }

    let author_id; // Placeholder for now, should be replaced with actual user ID from authentication
    try {
        author_id = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    let postSql = 'INSERT INTO Posts (author_id, group_id, title, content, is_anonymous, image_url) VALUES (?, ?, ?, ?, ?, ?)';
    let postData = [author_id, group_id, title, content, is_anonymous, image_url];
    
    db.query(postSql, postData, (err, result) => {
        if (err) {
            console.error(err);
            //db.end();
            return res.status(500).send('Error creating post');
        } 

        let postId = result.insertId;

        // Insert tags into post_tags table
        if (tags.length > 0) {
            let placeholders = tags.map(() => '?').join(', ');
            let tagSql = 'SELECT tag_id, tag_name FROM Tags WHERE tag_name IN (' + placeholders + ')';


            //let tagData = tags.map(tag => [postId, tag]);
            db.query(tagSql, tags, (err, tagResult) => {
                if (err) {
                    console.error(err);
                    //db.end();
                    return res.status(500).send('Error creating post tags');
                }

                let postTagData = tagResult.map(tag => [postId, tag.tag_id]);
                if (postTagData.length > 0) {
                    let postTagSql = 'INSERT INTO post_tags (post_id, tag_id) VALUES ?';
                    db.query(postTagSql, [postTagData], (err) => {
                        //db.end();
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ 
                                posts: [], 
                                error: 'Error creating post tags' 
                            });
                        } 
                        res.json({
                            post: {
                                post_id: postId,
                                author_id: author_id,
                                title,
                                description: content,
                                tags: tagResult.map(t => t.tag_name),
                                createdAt: new Date().toISOString(),
                                like_count: 0,
                                liked_by_me: false
                            },
                            message: 'Post created successfully with tags'  
                        });                  
                    });
                } else {
                    //db.end();
                    res.json({
                        post: { post_id: postId, author_id: author_id, title, description: content, tags: [], createdAt: new Date().toISOString(), like_count: 0, liked_by_me: false },
                        message: 'Post created successfully but no valid tags found'
                    });                
                }
            });
        } else {
            //db.end();
            res.json({
                post: { post_id: postId, author_id: author_id, title, description: content, tags: [], createdAt: new Date().toISOString(), like_count: 0, liked_by_me: false },
                message: 'Post created successfully without tags'
            });
        }

    });
});


// GET API for seraching posts
app.get('/api/posts/search', checkAuth, async (req, res) => {
    const { keyword } = req.query;
    if (!keyword || keyword.trim() === "") {
        return res.status(400).json({ error: "Please enter a keyword to search" });
    }

    //const connection = mysql.createConnection(config);
    let currentUserId; // placeholder
    try {
        currentUserId = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    const searchSql = `
        SELECT p.post_id, p.title, p.content AS description, p.author_id, 
          p.group_id, sg.name AS group_name, p.created_at AS createdAt,
          up.display_name AS author_name,
          GROUP_CONCAT(DISTINCT t.tag_name) AS tags,
          COUNT(DISTINCT l.like_id) AS like_count,
          MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me,
          (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id) AS comment_count
        FROM Posts p
        LEFT JOIN Social_Group sg ON p.group_id = sg.group_id
        LEFT JOIN User_Profiles up ON p.author_id = up.user_id
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        LEFT JOIN Likes l ON p.post_id = l.post_id
        WHERE LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ?
        GROUP BY p.post_id
        ORDER BY p.created_at DESC
        LIMIT 50
    `;

    const keywordParam = `%${keyword.toLowerCase()}%`;

    db.query(searchSql, [currentUserId, keywordParam, keywordParam], (err, results) => {
        //db.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error while searching posts" });
        }

        const formattedPosts = results.map(post => ({
            post_id: post.post_id,
            author_id: post.author_id,
            author_name: post.author_name ?? `User ${post.author_id}`,
            title: post.title,
            description: post.description,
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            like_count: post.like_count ?? 0,
            liked_by_me: post.liked_by_me === 1,
            comment_count: post.comment_count ?? 0,
            group_id: post.group_id,        // new
            group_name: post.group_name     // new
        }));

        if (formattedPosts.length === 0) {
            return res.json({ message: "No results found.", posts: [] });
        }

        res.json({ posts: formattedPosts });
    });
});

// GET /api/posts/tag/:tagName - filter posts by tag
app.get('/api/posts/tag/:tagName', checkAuth, async (req, res) => {
    //const connection = mysql.createConnection(config);
    const tagName = req.params.tagName;
    let currentUserId; // placeholder
    try {
        currentUserId = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    const sql = `
        SELECT p.post_id, p.title, p.content, p.author_id, p.group_id, sg.name AS group_name, 
                p.created_at AS createdAt, up.display_name AS author_name,
               GROUP_CONCAT(DISTINCT t.tag_name) AS tags,
               COUNT(DISTINCT l.like_id) AS like_count,
               MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me,
               (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id) AS comment_count
        FROM Posts p
        LEFT JOIN Social_Group sg ON p.group_id = sg.group_id
        LEFT JOIN User_Profiles up ON p.author_id = up.user_id
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        LEFT JOIN Likes l ON p.post_id = l.post_id
        WHERE p.post_id IN (
            SELECT pt2.post_id FROM post_tags pt2
            JOIN Tags t2 ON pt2.tag_id = t2.tag_id
            WHERE LOWER(t2.tag_name) = LOWER(?)
        )
        GROUP BY p.post_id
        ORDER BY p.created_at DESC
    `;

    db.query(sql, [currentUserId, tagName], (err, results) => {
        //db.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error filtering posts by tag' });
        }

        const formattedPosts = (Array.isArray(results) ? results : []).map(post => ({
            post_id: post.post_id,
            author_id: post.author_id,
            author_name: post.author_name ?? `User ${post.author_id}`,
            title: post.title,
            description: post.content,
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            like_count: post.like_count ?? 0,
            liked_by_me: post.liked_by_me === 1,
            comment_count: post.comment_count ?? 0,
            group_id: post.group_id,        // new
            group_name: post.group_name     // new
        }));

        if (formattedPosts.length === 0) {
            return res.json({ message: "No posts found for this tag.", posts: [] });
        }

        res.json({ posts: formattedPosts });
    });
});

// GET API for posts
app.get('/api/posts', checkAuth, async (req, res) => {
    //let connection = mysql.createConnection(config);
    let currentUserId; //Placeholde, need to replace with actually user id later
    try {
        currentUserId = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    let sql = `
         SELECT p.post_id, p.title, p.content, p.author_id, p.group_id, sg.name AS group_name,
               p.is_anonymous, p.image_url, p.created_at AS createdAt,
               up.display_name AS author_name,
               GROUP_CONCAT(DISTINCT t.tag_name) AS tags,
               COUNT(DISTINCT l.like_id) AS like_count,
               MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me,
               (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id) AS comment_count
        FROM Posts p
        LEFT JOIN Social_Group sg ON p.group_id = sg.group_id
        LEFT JOIN User_Profiles up ON p.author_id = up.user_id
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        LEFT JOIN Likes l ON p.post_id = l.post_id
        GROUP BY p.post_id
        ORDER BY p.post_id DESC
    `;

    db.query(sql, [currentUserId], (err, results) => {
        //db.end();

        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving posts');
        }

        const formattedPosts = results.map(post => ({
            post_id: post.post_id,
            author_id: post.author_id,
            author_name: post.author_name ?? `User ${post.author_id}`,
            title: post.title,
            description: post.content, // map content to description
            image_url: post.image_url,
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            like_count: post.like_count,
            liked_by_me: post.liked_by_me === 1, 
            comment_count: post.comment_count ?? 0,
            group_id: post.group_id,        
            group_name: post.group_name,
            is_anonymous: post.is_anonymous === 1     
        }));

        res.json(formattedPosts);
    });
});

// GET /api/posts/:id - get a single post
app.get('/api/posts/:id', checkAuth, async (req, res) => {
    //const connection = mysql.createConnection(config);
    const postId = req.params.id;
    let currentUserId; // placeholder
    try {
        currentUserId = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    const sql = `
        SELECT p.post_id, p.title, p.content, p.author_id, p.created_at AS createdAt,
              up.display_name AS author_name, sg.name AS group_name, p.group_id, p.is_anonymous,
               GROUP_CONCAT(DISTINCT t.tag_name) AS tags,
               COUNT(DISTINCT l.like_id) AS like_count,
               MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me
        FROM Posts p
        LEFT JOIN User_Profiles up ON p.author_id = up.user_id
        LEFT JOIN Social_Group sg ON p.group_id = sg.group_id
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        LEFT JOIN Likes l ON p.post_id = l.post_id
        WHERE p.post_id = ?
        GROUP BY p.post_id
    `;

    db.query(sql, [currentUserId, postId], (err, results) => {
        //db.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error retrieving post' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const post = results[0];
        res.json({
            post_id: post.post_id,
            author_id: post.author_id,
            author_name: post.is_anonymous ? 'Anonymous' : (post.author_name ?? 'Unknown'),
            title: post.title,
            description: post.content,
            group_id: post.group_name,
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            like_count: post.like_count ?? 0,
            liked_by_me: post.liked_by_me === 1,
            group_name: post.group_name,  
            is_anonymous: post.is_anonymous === 1

        });
    });
});

// GET /api/posts/:id/comments - get all comments for a post
app.get('/api/posts/:id/comments', checkAuth, async (req, res) => {
    //const connection = mysql.createConnection(config);
    const postId = req.params.id

    const sql = `
        SELECT c.comment_id, c.post_id, c.user_id, c.parent_comment_id,
               c.content, c.created_at AS createdAt, up.display_name as author_name
        FROM Comments c
        LEFT JOIN User_Profiles up ON c.user_id = up.user_id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    `;

    db.query(sql, [postId], (err, results) => {
        //db.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error retrieving comments' });
        }
        res.json(results);
    });
});

// POST /api/posts/:id/comments - add a comment or reply
app.post('/api/posts/:id/comments', checkAuth, async (req, res) => {
    //const connection = mysql.createConnection(config);
    const postId = req.params.id;
    const { content, parent_comment_id = null } = req.body;
    let currentUserId; // placeholder
    try {
        currentUserId = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (!content || !content.trim()) {
        //db.end();
        return res.status(400).json({ error: 'Comment content is required' });
    }

    const sql = 'INSERT INTO Comments (post_id, user_id, parent_comment_id, content) VALUES (?, ?, ?, ?)';
    db.query(sql, [postId, currentUserId, parent_comment_id, content], (err, result) => {
        //db.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error creating comment' });
        }
       db.query(
        'SELECT display_name FROM User_Profiles WHERE user_id = ?',
        [currentUserId],
        (err2, profileRows) => {
            const author_name = profileRows?.[0]?.display_name ?? `User ${currentUserId}`;
            res.json({
                comment_id: result.insertId,
                post_id: parseInt(postId),
                user_id: currentUserId,
                author_name,
                parent_comment_id,
                content,
                createdAt: new Date().toISOString()
            });
        }
    );
    });
});

// DELETE /api/posts/:id - delete a post (only by author)
app.delete('/api/posts/:id', checkAuth, async(req, res) => {
    //let connection = mysql.createConnection(config);
    const postId = req.params.id;
    let requestingUserId; // Placeholder need to replace with real auth user ID later
    try {
        requestingUserId = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    const checkSql = 'SELECT author_id FROM Posts WHERE post_id = ?';
    db.query(checkSql, [postId], (err, results) => {
        if (err) {
            console.error(err);
            //db.end();
            return res.status(500).json({ error: 'Error finding post' });
        }

        if (results.length === 0) {
            //db.end();
            return res.status(404).json({ error: 'Post not found' });
        }

        if (results[0].author_id !== requestingUserId) {
            //db.end();
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        const deleteTagsSql = 'DELETE FROM post_tags WHERE post_id = ?';
        db.query(deleteTagsSql, [postId], (err) => {
            if (err) {
                console.error(err);
                //db.end();
                return res.status(500).json({ error: 'Error deleting post tags' });
            }

            const deletePostSql = 'DELETE FROM Posts WHERE post_id = ?';
            db.query(deletePostSql, [postId], (err) => {
                //db.end();
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Error deleting post' });
                }
                res.json({ message: 'Post deleted successfully', post_id: postId });
            });
        });
    });
});

// PUT /api/posts/:id - edit a post (only by author)
app.put('/api/posts/:id', checkAuth, async (req, res) => {
    //let connection = mysql.createConnection(config);
    const postId = req.params.id;
    const { title, content, tags = [], group_id = null, is_anonymous = 0 } = req.body;

    let requestingUserId; // Placeholder - replace with real auth user ID later
    try {
        requestingUserId = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    const checkSql = 'SELECT author_id FROM Posts WHERE post_id = ?';
    db.query(checkSql, [postId], (err, results) => {
        if (err) {
            //db.end();
            return res.status(500).json({ error: 'Error finding post' });
        }
        if (results.length === 0) {
            //db.end();
            return res.status(404).json({ error: 'Post not found' });
        }
        if (results[0].author_id !== requestingUserId) {
            //db.end();
            return res.status(403).json({ error: 'Not authorized to edit this post' });
        }

        const updateSql = 'UPDATE Posts SET title = ?, content = ?, group_id = ?, is_anonymous = ? WHERE post_id = ?';
        db.query(updateSql, [title, content, group_id, is_anonymous, postId], (err) => {
            if (err) {
                //db.end();
                return res.status(500).json({ error: 'Error updating post' });
            }

            const deleteTagsSql = 'DELETE FROM post_tags WHERE post_id = ?';
            db.query(deleteTagsSql, [postId], (err) => {
                if (err) {
                    //db.end();
                    return res.status(500).json({ error: 'Error updating tags' });
                }

                if (tags.length === 0) {
                    //db.end();
                    return res.json({
                        post: { post_id: parseInt(postId), title, description: content, tags: [] },
                        message: 'Post updated successfully'
                    });
                }

                const tagSql = 'SELECT tag_id, tag_name FROM Tags WHERE tag_name IN (' + tags.map(() => '?').join(', ') + ')';
                db.query(tagSql, tags, (err, tagResults) => {
                    if (err) {
                        //db.end();
                        return res.status(500).json({ error: 'Error finding tags' });
                    }

                    const postTagData = tagResults.map(tag => [postId, tag.tag_id]);
                    if (postTagData.length === 0) {
                        //db.end();
                        return res.json({
                            post: { post_id: parseInt(postId), title, description: content, tags: [] },
                            message: 'Post updated successfully but no valid tags found'
                        });
                    }

                    const postTagSql = 'INSERT INTO post_tags (post_id, tag_id) VALUES ?';
                    db.query(postTagSql, [postTagData], (err) => {
                        //db.end();
                        if (err) {
                            return res.status(500).json({ error: 'Error inserting tags' });
                        }
                        res.json({
                            post: {
                                post_id: parseInt(postId),
                                title,
                                description: content,
                                tags: tagResults.map(t => t.tag_name)
                            },
                            message: 'Post updated successfully'
                        });
                    });
                });
            });
        });
    });
});

// POST /api/posts/:id/like - toggle like/unlike
app.post('/api/posts/:id/like', checkAuth, async (req, res) => {
    //let connection = mysql.createConnection(config);
    const postId = req.params.id;
    let currentUserId; // Placeholder - replace with real auth user ID later
    try {
        currentUserId = await getNumericUserId(req.user.email);
    } catch (err) {
        return res.status(404).json({ error: 'User not found' });
    }

    const checkSql = 'SELECT like_id FROM Likes WHERE post_id = ? AND user_id = ?';
    db.query(checkSql, [postId, currentUserId], (err, results) => {
        if (err) {
            //db.end();
            return res.status(500).json({ error: 'Error checking like status' });
        }

        if (results.length > 0) {
            const deleteSql = 'DELETE FROM Likes WHERE post_id = ? AND user_id = ?';
            db.query(deleteSql, [postId, currentUserId], (err) => {
                if (err) {
                    //db.end();
                    return res.status(500).json({ error: 'Error unliking post' });
                }
                const countSql = 'SELECT COUNT(*) AS like_count FROM Likes WHERE post_id = ?';
                db.query(countSql, [postId], (err, countResult) => {
                    //db.end();
                    if (err) return res.status(500).json({ error: 'Error getting like count' });
                    res.json({ liked_by_me: false, like_count: countResult[0].like_count });
                });
            });
        } else {
            const insertSql = 'INSERT INTO Likes (post_id, user_id) VALUES (?, ?)';
            db.query(insertSql, [postId, currentUserId], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error liking post' });
                }
                const countSql = 'SELECT COUNT(*) AS like_count FROM Likes WHERE post_id = ?';
                db.query(countSql, [postId], (err, countResult) => {
                    //db.end();
                    if (err) return res.status(500).json({ error: 'Error getting like count' });
                    res.json({ liked_by_me: true, like_count: countResult[0].like_count });
                });
            });
        }
    });
});

// GET /api/posts/:id/likes - get list of users who liked a post
app.get('/api/posts/:id/likes', checkAuth, async (req, res) => {
    const postId = req.params.id;

    const sql = `
        SELECT l.user_id, up.display_name
        FROM Likes l
        LEFT JOIN User_Profiles up ON l.user_id = up.user_id
        WHERE l.post_id = ?
        ORDER BY up.display_name ASC
    `;

    db.query(sql, [postId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error retrieving likes' });
        }
        res.json(results);
    });
});

//---------------------EVENTs-------------------------------------

// Post API for "Like an Event"
// POST /api/events/:id/like
app.post("/api/events/:id/like", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  if (!currentUserEmail) {
    return res.status(400).json({ error: "Missing authenticated user email." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("POST /api/events/:id/like user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const checkSql = `
      SELECT id
      FROM Event_Likes
      WHERE event_id = ? AND user_id = ?
      LIMIT 1
    `;

    db.query(checkSql, [eventId, currentUserId], (checkErr, checkRows) => {
      if (checkErr) {
        console.log("Check event like error:", checkErr);
        return res.status(500).json({ error: "Failed to check like status." });
      }

      if (checkRows.length > 0) {
        return res.status(400).json({ error: "You have already liked this event." });
      }

      const eventSql = `
        SELECT title
        FROM Events
        WHERE id = ?
        LIMIT 1
      `;

      db.query(eventSql, [eventId], (eventErr, eventRows) => {
        if (eventErr || eventRows.length === 0) {
          return res.status(404).json({ error: "Event not found." });
        }

        const eventTitle = eventRows[0].title;

        const insertLikeSql = `
          INSERT INTO Event_Likes (event_id, user_id)
          VALUES (?, ?)
        `;

        db.query(insertLikeSql, [eventId, currentUserId], (insertErr) => {
          if (insertErr) {
            console.log("Insert event like error:", insertErr);
            return res.status(500).json({ error: "Failed to like event." });
          }

          const updateSql = `
            UPDATE Events
            SET likes = likes + 1
            WHERE id = ?
          `;

          db.query(updateSql, [eventId], (updateErr, result) => {
            if (updateErr) {
              console.log("Update event likes error:", updateErr);
              return res.status(500).json({ error: "Failed to update event likes." });
            }

            if (result.affectedRows === 0) {
              return res.status(404).json({ error: "Event not found." });
            }

            const selectSql = `
              SELECT likes
              FROM Events
              WHERE id = ?
              LIMIT 1
            `;

            db.query(selectSql, [eventId], (err2, rows) => {
              if (err2 || rows.length === 0) {
                return res.status(500).json({
                  error: "Liked event, but failed to reload likes.",
                });
              }

              return res.json({
                likes: Number(rows[0].likes || 0),
                has_liked: 1,
                message: `You have successfully liked the "${eventTitle}" event.`,
              });
            });
          });
        });
      });
    });
  });
});

app.get("/api/categories", (req, res) => {
  const sql = `
    SELECT tag_name
    FROM Tags
    ORDER BY tag_name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.log("GET /api/categories error:", err);
      return res.status(500).json({ error: "Failed to load categories." });
    }

    return res.json(results);
  });
});

app.get("/api/events/search-history", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("GET search history user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const sql = `
      SELECT search_term
      FROM Event_Search_History
      WHERE user_id = ?
      ORDER BY searched_at DESC
      LIMIT 8
    `;

    db.query(sql, [currentUserId], (err, rows) => {
      if (err) {
        console.log("GET search history error:", err);
        return res.status(500).json({ error: "Failed to load search history." });
      }

      return res.json(rows);
    });
  });
});

app.post("/api/events/search-history", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();
  const term = String(req.body.search_term || "").trim();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  if (!term) {
    return res.status(400).json({ error: "Missing search term." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("POST search history user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const sql = `
      INSERT INTO Event_Search_History (user_id, search_term, searched_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE searched_at = NOW()
    `;

    db.query(sql, [currentUserId, term], (err) => {
      if (err) {
        console.log("Insert search history error:", err);
        return res.status(500).json({ error: "Failed to save search history." });
      }

      return res.json({ message: "Saved" });
    });
  });
});

app.get("/api/events/search", checkAuth, (req, res) => {
  const keyword = String(req.query.keyword || "").trim();
  const sort = String(req.query.sort || "mostUpcoming").trim();
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!keyword) {
    return res.json({ events: [] });
  }

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("Search events user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const like = `%${keyword}%`;

    let orderClause = `
      ORDER BY e.event_date ASC, e.event_time ASC
    `;

    if (sort === "mostRecentPublished") {
      orderClause = `
        ORDER BY e.published_time DESC
      `;
    } else if (sort === "mostLiked") {
      orderClause = `
        ORDER BY e.likes DESC, e.published_time DESC
      `;
    }

    const sql = `
      SELECT 
        e.id,
        e.title,
        e.description,
        DATE_FORMAT(e.event_date,'%Y-%m-%d') AS event_date,
        TIME_FORMAT(e.event_time,'%H:%i') AS event_time,
        e.location,
        e.capacity,
        e.likes,
        e.category,
        DATE_FORMAT(e.published_time, '%Y-%m-%d %H:%i') AS published_time,
        COUNT(DISTINCT a.id) AS current_count,
        GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ',') AS tags,
        (TIMESTAMP(e.event_date,e.event_time) < NOW()) AS is_past,
        MAX(CASE WHEN LOWER(a.attendee_name) = ? THEN 1 ELSE 0 END) AS has_joined,
        MAX(CASE WHEN el.user_id = ? THEN 1 ELSE 0 END) AS has_liked
      FROM Events e
      LEFT JOIN Event_Attendees a ON a.event_id = e.id
      LEFT JOIN Event_Tags t ON t.event_id = e.id
      LEFT JOIN Event_Likes el ON el.event_id = e.id
      WHERE 
        e.title LIKE ?
        OR e.category LIKE ?
        OR t.tag_name LIKE ?
      GROUP BY e.id
      ${orderClause}
      LIMIT 50
    `;

    db.query(
      sql,
      [currentUserEmail, currentUserId, like, like, like],
      (err, rows) => {
        if (err) {
          console.log("Search events error:", err);
          return res.status(500).json({ error: "Search failed." });
        }

        return res.json({ events: rows });
      }
    );
  });
});

app.delete("/api/events/search-history", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();
  const term = String(req.body.search_term || "").trim();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  if (!term) {
    return res.status(400).json({ error: "Missing search term." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("DELETE search history user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const sql = `
      DELETE FROM Event_Search_History
      WHERE user_id = ? AND search_term = ?
    `;

    db.query(sql, [currentUserId, term], (err) => {
      if (err) {
        console.log("Delete search history error:", err);
        return res.status(500).json({ error: "Failed to delete search history." });
      }

      return res.json({ message: "Deleted successfully." });
    });
  });
});

app.get("/api/events/suggestions", (req, res) => {
  const keyword = String(req.query.keyword || "").trim();

  if (!keyword) {
    return res.json([]);
  }

  const like = `%${keyword}%`;

  const sql = `
    SELECT value, type
    FROM (
      SELECT DISTINCT e.title AS value, 'Title' AS type
      FROM Events e
      WHERE e.title LIKE ?

      UNION

      SELECT DISTINCT e.category AS value, 'Category' AS type
      FROM Events e
      WHERE e.category LIKE ?

      UNION

      SELECT DISTINCT t.tag_name AS value, 'Tag' AS type
      FROM Event_Tags t
      WHERE t.tag_name LIKE ?
    ) AS combined
    LIMIT 10
  `;

  db.query(sql, [like, like, like], (err, rows) => {
    if (err) {
      console.log("Suggestions error:", err);
      return res.status(500).json({ error: "Failed to load suggestions." });
    }

    return res.json(rows);
  });
});

// for registration
app.post('/api/register', checkAuth, (req, res) => {
   const { email, password, username, firebase_uid, role } = req.body;
    
    const sqlCredentials = "INSERT INTO User_Credentials (email, password_hash, firebase_uid, role) VALUES (?, ?, ?, ?)";
    
    // insert into Credentials
    db.query(sqlCredentials, [email, password, firebase_uid, role], (err, result) => {
        if (err) {
            console.error("Credentials Error:", err);
            return res.status(500).json({ error: "Database error during registration." });
        }
        
        const newUserId = result.insertId;
        const sqlProfile = "INSERT INTO User_Profiles (user_id, display_name) VALUES (?, ?)";
        
        // insert into Profile
        db.query(sqlProfile, [newUserId, username], (profileErr) => {
            if (profileErr) {
                console.error("Profile Error:", profileErr);
                return res.status(500).json({ error: "Profile creation failed." });
            }
            
            console.log(`User ${newUserId} fully registered!`);
            return res.status(201).json({ 
                message: "User created successfully!",
                userId: newUserId 
            });
        });
    });
});

// Lookup app user_id by email (used after Firebase login)
app.get('/api/users/by-email', checkAuth, (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const sql = "SELECT user_id FROM User_Credentials WHERE email = ? LIMIT 1";

  db.query(sql, [email], (err, rows) => {
    if (err) {
      console.error("GET /api/users/by-email error:", err);
      return res.status(500).json({ error: "Failed to lookup user" });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "User not found for given email" });
    }

    return res.json({ userId: rows[0].user_id });
  });
});



app.listen(port, () => console.log(`Listening on port ${port}`)); 
