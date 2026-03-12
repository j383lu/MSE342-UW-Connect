import mysql from 'mysql';
import config from './config.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import profileRoutes from "./profileRoutes.js";
import multer from 'multer'; // For file uploads
import fs from 'fs'; // For file system operations

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

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

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

// GET /api/events
// default: upcoming only
// if includePast=true: return all events
app.get("/api/events", (req, res) => {
  const includePast = String(req.query.includePast).toLowerCase() === "true";
  const whereClause = includePast ? "" : "WHERE TIMESTAMP(e.event_date, e.event_time) >= NOW()";

  const sql = `
    SELECT 
      e.id,
      e.title,
      e.description,
      DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
      TIME_FORMAT(e.event_time, '%H:%i') AS event_time,
      e.location,
      e.capacity,
      COUNT(a.id) AS current_count,
      (TIMESTAMP(e.event_date, e.event_time) < NOW()) AS is_past
    FROM Events e
    LEFT JOIN Event_Attendees a ON a.event_id = e.id
    ${whereClause}
    GROUP BY e.id
    ORDER BY e.event_date ASC, e.event_time ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.log("GET /api/events error:", err);
      return res.status(500).json({ error: "Failed to load events." });
    }
    return res.json(results);
  });
});

// POST /api/events (create event)
app.post("/api/events", (req, res) => {
  const { title, description, event_date, event_time, location, capacity } = req.body;

  if (!title || !description || !event_date || !event_time || !location || capacity === undefined) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const capNum = Number(capacity);
  if (!Number.isInteger(capNum) || capNum <= 0) {
    return res.status(400).json({ error: "Capacity must be a positive integer." });
  }

  const sql = `
    INSERT INTO Events (title, description, event_date, event_time, location, capacity)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [title, description, event_date, event_time, location, capNum], (err, result) => {
    if (err) {
      console.log("POST /api/events error:", err);
      return res.status(500).json({ error: "Failed to create event." });
    }
    return res.status(201).json({ id: result.insertId });
  });
});

// POST /api/events/:id/join
app.post("/api/events/:id/join", (req, res) => {
  const eventId = Number(req.params.id);
  const attendeeName = String(req.body.attendee_name || "").trim();

  if (!eventId) return res.status(400).json({ error: "Invalid event id." });
  if (!attendeeName) return res.status(400).json({ error: "Missing attendee name." });

  // 1) block joining past events
  const dateSql = `SELECT event_date, capacity FROM Events WHERE id = ?`;
  db.query(dateSql, [eventId], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: "Event not found." });

    const eventDateStr = rows[0].event_date; // Date object or string, depending on mysql settings
    const cap = Number(rows[0].capacity);

    // compare on MySQL side for safety
    const pastSql = `SELECT (event_date < CURDATE()) AS is_past FROM Events WHERE id = ?`;
    db.query(pastSql, [eventId], (errPast, pastRows) => {
      if (errPast || pastRows.length === 0) return res.status(500).json({ error: "Failed to check event date." });
      if (Number(pastRows[0].is_past) === 1) {
        return res.status(400).json({ error: "This event already ended." });
      }

      // 2) check capacity
      const countSql = `SELECT COUNT(*) AS current_count FROM Event_Attendees WHERE event_id = ?`;
      db.query(countSql, [eventId], (err2, countRows) => {
        if (err2) return res.status(500).json({ error: "Failed to check capacity." });

        const current = Number(countRows[0].current_count || 0);
        if (cap > 0 && current >= cap) return res.status(400).json({ error: "Event is full." });

        // 3) insert attendee
        const insertSql = `INSERT INTO Event_Attendees (event_id, attendee_name) VALUES (?, ?)`;
        db.query(insertSql, [eventId, attendeeName], (err3) => {
          if (err3) {
            console.log("join insert error:", err3);
            return res.status(500).json({ error: "Failed to join event." });
          }

          // 4) return updated count
          db.query(countSql, [eventId], (err4, newCountRows) => {
            if (err4) return res.status(500).json({ error: "Joined but failed to reload count." });
            return res.json({ current_count: Number(newCountRows[0].current_count || 0) });
          });
        });
      });
    });
  });
});

// GET /api/events/:id/attendees
app.get("/api/events/:id/attendees", (req, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) return res.status(400).json({ error: "Invalid event id." });

  const sql = `
    SELECT attendee_name, joined_at
    FROM Event_Attendees
    WHERE event_id = ?
    ORDER BY joined_at ASC
  `;

  db.query(sql, [eventId], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to load attendees." });
    return res.json(results);
  });
});

app.use('/uploads', express.static('uploads'));

// API Routes

//CREATE GROUP PAGE:

///GET TAGS FROM DATABASE:
app.get("/api/tags", (req, res) => {
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
app.post("/api/groups", upload.single('coverImage'), (req, res) => {
  const { name, description, category, isOpen, maxMembers } = req.body;
  
  // For now, hardcode user_id = 1
  const creator_id = 1;
  
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
      
      // Return the created group with its new ID
      return res.status(201).json({
        id: result.insertId,
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
});

// GET ALL GROUPS (for discovery page):
app.get("/api/groups", (req, res) => {
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
app.get("/api/groups/:groupId", (req, res) => {
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
app.get("/api/users/:userId/groups/owned", (req, res) => {
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
app.get("/api/users/:userId/groups/member", (req, res) => {
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
app.post("/api/groups/:groupId/join", (req, res) => {
  const groupId = req.params.groupId;
  const userId = 1; // Hardcoded for now
  
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
  const userId = 1; // Hardcoded for now
  
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
app.get("/api/groups/:groupId/members", (req, res) => {
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

// FEED PAGE APIs

// Post /api/posts - create a new post
app.post('/api/posts', (req, res) => {
    let connection = mysql.createConnection(config);


    let { title, content, group_id = null, is_anonymous = 0, image_url = null, tags = [] } = req.body;
    let author_id = 1; // Placeholder for now, should be replaced with actual user ID from authentication

    let postSql = 'INSERT INTO Posts (author_id, group_id, title, content, is_anonymous, image_url) VALUES (?, ?, ?, ?, ?, ?)';
    let postData = [author_id, group_id, title, content, is_anonymous, image_url];
    
    connection.query(postSql, postData, (err, result) => {
        if (err) {
            console.error(err);
            connection.end();
            return res.status(500).send('Error creating post');
        } 

        let postId = result.insertId;

        // Insert tags into post_tags table
        if (tags.length > 0) {
            let placeholders = tags.map(() => '?').join(', ');
            let tagSql = 'SELECT tag_id, tag_name FROM Tags WHERE tag_name IN (' + placeholders + ')';


            //let tagData = tags.map(tag => [postId, tag]);
            connection.query(tagSql, tags, (err, tagResult) => {
                if (err) {
                    console.error(err);
                    connection.end();
                    return res.status(500).send('Error creating post tags');
                }

                let postTagData = tagResult.map(tag => [postId, tag.tag_id]);
                if (postTagData.length > 0) {
                    let postTagSql = 'INSERT INTO post_tags (post_id, tag_id) VALUES ?';
                    connection.query(postTagSql, [postTagData], (err) => {
                        connection.end();
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Error creating post tags');
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
                    connection.end();
                    res.json({
                        post: { post_id: postId, author_id: author_id, title, description: content, tags: [], createdAt: new Date().toISOString(), like_count: 0, liked_by_me: false },
                        message: 'Post created successfully but no valid tags found'
                    });                
                }
            });
        } else {
            connection.end();
            res.json({
                post: { post_id: postId, author_id: author_id, title, description: content, tags: [], createdAt: new Date().toISOString(), like_count: 0, liked_by_me: false },
                message: 'Post created successfully without tags'
            });
        }

    });
});

// GET /api/posts/tag/:tagName - filter posts by tag
app.get('/api/posts/tag/:tagName', (req, res) => {
    const connection = mysql.createConnection(config);
    const tagName = req.params.tagName;
    const currentUserId = 1; // placeholder

    const sql = `
        SELECT p.post_id, p.title, p.content, p.author_id, p.created_at AS createdAt,
               GROUP_CONCAT(DISTINCT t.tag_name) AS tags,
               COUNT(DISTINCT l.like_id) AS like_count,
               MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me
        FROM Posts p
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

    connection.query(sql, [currentUserId, tagName], (err, results) => {
        connection.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error filtering posts by tag' });
        }

        const formattedPosts = results.map(post => ({
            post_id: post.post_id,
            author_id: post.author_id,
            title: post.title,
            description: post.content,
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            like_count: post.like_count ?? 0,
            liked_by_me: post.liked_by_me === 1
        }));

        if (formattedPosts.length === 0) {
            return res.json({ message: "No posts found for this tag.", posts: [] });
        }

        res.json({ posts: formattedPosts });
    });
});

// GET API for posts
app.get('/api/posts', (req, res) => {
    let connection = mysql.createConnection(config);
    const currentUserId = 1 //Placeholde, need to replace with actually user id later
    let sql = `
         SELECT p.post_id, p.title, p.content, p.author_id, p.group_id,
               p.is_anonymous, p.image_url, p.created_at AS createdAt,
               GROUP_CONCAT(t.tag_name) AS tags,
               COUNT(DISTINCT l.like_id) AS like_count,
               MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me,
               (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id) AS comment_count
        FROM Posts p
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        LEFT JOIN Likes l ON p.post_id = l.post_id
        GROUP BY p.post_id
        ORDER BY p.post_id DESC
    `;

    connection.query(sql, [currentUserId], (err, results) => {
        connection.end();

        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving posts');
        }

        const formattedPosts = results.map(post => ({
            post_id: post.post_id,
            author_id: post.author_id,
            title: post.title,
            description: post.content, // map content to description
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            like_count: post.like_count,
            liked_by_me: post.liked_by_me, 
            comment_count: post.comment_count ?? 0
        }));

        res.json(formattedPosts);
    });
});

// GET API for seraching posts
app.get('/api/posts/search', (req, res) => {
    const { keyword } = req.query;

    if (!keyword || keyword.trim() === "") {
        return res.status(400).json({ error: "Please enter a keyword to search" });
    }

    const connection = mysql.createConnection(config);
    const currentUserId = 1 // placeholder

    const searchSql = `
        SELECT p.post_id, p.title, p.content AS description, p.author_id, p.created_at AS createdAt,
        GROUP_CONCAT(t.tag_name) AS tags,
        COUNT(DISTINCT l.like_id) AS like_count,
        MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me,
        (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id) AS comment_count
        FROM Posts p
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        LEFT JOIN Likes l ON p.post_id = l.post_id
        WHERE LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ?
        GROUP BY p.post_id
        ORDER BY p.created_at DESC
        LIMIT 50
    `;

    const keywordParam = `%${keyword.toLowerCase()}%`;

    connection.query(searchSql, [currentUserId, keywordParam, keywordParam], (err, results) => {
        connection.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error while searching posts" });
        }

        const formattedPosts = results.map(post => ({
            post_id: post.post_id,
            author_id: post.author_id,
            title: post.title,
            description: post.description,
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            like_count: post.like_count ?? 0,
            liked_by_me: post.liked_by_me === 1,
            comment_count: post.comment_count ?? 0
        }));

        if (formattedPosts.length === 0) {
            return res.json({ message: "No results found.", posts: [] });
        }

        res.json({ posts: formattedPosts });
    });
});

// GET /api/posts/:id - get a single post
app.get('/api/posts/:id', (req, res) => {
    const connection = mysql.createConnection(config);
    const postId = req.params.id;
    const currentUserId = 1; // placeholder

    const sql = `
        SELECT p.post_id, p.title, p.content, p.author_id, p.created_at AS createdAt,
               GROUP_CONCAT(DISTINCT t.tag_name) AS tags,
               COUNT(DISTINCT l.like_id) AS like_count,
               MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me
        FROM Posts p
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        LEFT JOIN Likes l ON p.post_id = l.post_id
        WHERE p.post_id = ?
        GROUP BY p.post_id
    `;

    connection.query(sql, [currentUserId, postId], (err, results) => {
        connection.end();
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
            title: post.title,
            description: post.content,
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            like_count: post.like_count ?? 0,
            liked_by_me: post.liked_by_me === 1
        });
    });
});

// GET /api/posts/:id/comments - get all comments for a post
app.get('/api/posts/:id/comments', (req, res) => {
    const connection = mysql.createConnection(config);
    const postId = req.params.id;

    const sql = `
        SELECT c.comment_id, c.post_id, c.user_id, c.parent_comment_id,
               c.content, c.created_at AS createdAt
        FROM Comments c
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    `;

    connection.query(sql, [postId], (err, results) => {
        connection.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error retrieving comments' });
        }
        res.json(results);
    });
});

// POST /api/posts/:id/comments - add a comment or reply
app.post('/api/posts/:id/comments', (req, res) => {
    const connection = mysql.createConnection(config);
    const postId = req.params.id;
    const { content, parent_comment_id = null } = req.body;
    const currentUserId = 1; // placeholder

    if (!content || !content.trim()) {
        connection.end();
        return res.status(400).json({ error: 'Comment content is required' });
    }

    const sql = 'INSERT INTO Comments (post_id, user_id, parent_comment_id, content) VALUES (?, ?, ?, ?)';
    connection.query(sql, [postId, currentUserId, parent_comment_id, content], (err, result) => {
        connection.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error creating comment' });
        }
        res.json({
            comment_id: result.insertId,
            post_id: parseInt(postId),
            user_id: currentUserId,
            parent_comment_id,
            content,
            createdAt: new Date().toISOString()
        });
    });
});

// DELETE /api/posts/:id - delete a post (only by author)
app.delete('/api/posts/:id', (req, res) => {
    let connection = mysql.createConnection(config);
    const postId = req.params.id;
    const requestingUserId = 1; // Placeholder need to replace with real auth user ID later

    // First verify the post exists and the requester is the author
    const checkSql = 'SELECT author_id FROM Posts WHERE post_id = ?';
    connection.query(checkSql, [postId], (err, results) => {
        if (err) {
            console.error(err);
            connection.end();
            return res.status(500).json({ error: 'Error finding post' });
        }

        if (results.length === 0) {
            connection.end();
            return res.status(404).json({ error: 'Post not found' });
        }

        if (results[0].author_id !== requestingUserId) {
            connection.end();
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        // Delete post_tags first, then the post
        const deleteTagsSql = 'DELETE FROM post_tags WHERE post_id = ?';
        connection.query(deleteTagsSql, [postId], (err) => {
            if (err) {
                console.error(err);
                connection.end();
                return res.status(500).json({ error: 'Error deleting post tags' });
            }

            const deletePostSql = 'DELETE FROM Posts WHERE post_id = ?';
            connection.query(deletePostSql, [postId], (err) => {
                connection.end();
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
app.put('/api/posts/:id', (req, res) => {
    let connection = mysql.createConnection(config);
    const postId = req.params.id;
    const requestingUserId = 1; // Placeholder - replace with real auth user ID later
    const { title, content, tags = [] } = req.body;

    // Verify the post exists and requester is the author
    const checkSql = 'SELECT author_id FROM Posts WHERE post_id = ?';
    connection.query(checkSql, [postId], (err, results) => {
        if (err) {
            connection.end();
            return res.status(500).json({ error: 'Error finding post' });
        }
        if (results.length === 0) {
            connection.end();
            return res.status(404).json({ error: 'Post not found' });
        }
        if (results[0].author_id !== requestingUserId) {
            connection.end();
            return res.status(403).json({ error: 'Not authorized to edit this post' });
        }

        // Update the post
        const updateSql = 'UPDATE Posts SET title = ?, content = ? WHERE post_id = ?';
        connection.query(updateSql, [title, content, postId], (err) => {
            if (err) {
                connection.end();
                return res.status(500).json({ error: 'Error updating post' });
            }

            // Delete old tags then re-insert new ones
            const deleteTagsSql = 'DELETE FROM post_tags WHERE post_id = ?';
            connection.query(deleteTagsSql, [postId], (err) => {
                if (err) {
                    connection.end();
                    return res.status(500).json({ error: 'Error updating tags' });
                }

                if (tags.length === 0) {
                    connection.end();
                    return res.json({
                        post: { post_id: parseInt(postId), title, description: content, tags: [] },
                        message: 'Post updated successfully'
                    });
                }

                const tagSql = 'SELECT tag_id, tag_name FROM Tags WHERE tag_name IN (' + tags.map(() => '?').join(', ') + ')';
                connection.query(tagSql, tags, (err, tagResults) => {
                    if (err) {
                        connection.end();
                        return res.status(500).json({ error: 'Error finding tags' });
                    }

                    const postTagData = tagResults.map(tag => [postId, tag.tag_id]);
                    if (postTagData.length === 0) {
                        connection.end();
                        return res.json({
                            post: { post_id: parseInt(postId), title, description: content, tags: [] },
                            message: 'Post updated successfully but no valid tags found'
                        });
                    }

                    const postTagSql = 'INSERT INTO post_tags (post_id, tag_id) VALUES ?';
                    connection.query(postTagSql, [postTagData], (err) => {
                        connection.end();
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
app.post('/api/posts/:id/like', (req, res) => {
    let connection = mysql.createConnection(config);
    const postId = req.params.id;
    const currentUserId = 1; // Placeholder - replace with real auth user ID later

    const checkSql = 'SELECT like_id FROM Likes WHERE post_id = ? AND user_id = ?';
    connection.query(checkSql, [postId, currentUserId], (err, results) => {
        if (err) {
            connection.end();
            return res.status(500).json({ error: 'Error checking like status' });
        }

        if (results.length > 0) {
            // Already liked — unlike it
            const deleteSql = 'DELETE FROM Likes WHERE post_id = ? AND user_id = ?';
            connection.query(deleteSql, [postId, currentUserId], (err) => {
                if (err) {
                    connection.end();
                    return res.status(500).json({ error: 'Error unliking post' });
                }
                const countSql = 'SELECT COUNT(*) AS like_count FROM Likes WHERE post_id = ?';
                connection.query(countSql, [postId], (err, countResult) => {
                    connection.end();
                    if (err) return res.status(500).json({ error: 'Error getting like count' });
                    res.json({ liked_by_me: false, like_count: countResult[0].like_count });
                });
            });
        } else {
            //Not liked yet, so like it
            const insertSql = 'INSERT INTO Likes (post_id, user_id) VALUES (?, ?)';
            connection.query(insertSql, [postId, currentUserId], (err) => {
                if (err) {
                    connection.end();
                    return res.status(500).json({ error: 'Error liking post' });
                }
                const countSql = 'SELECT COUNT(*) AS like_count FROM Likes WHERE post_id = ?';
                connection.query(countSql, [postId], (err, countResult) => {
                    connection.end();
                    if (err) return res.status(500).json({ error: 'Error getting like count' });
                    res.json({ liked_by_me: true, like_count: countResult[0].like_count });
                });
            });
        }
    });
});


app.listen(port, () => console.log(`Listening on port ${port}`)); //for the dev version
