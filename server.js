import mysql from 'mysql';
import config from './config.js';
import express from 'express';
import path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import multer from 'multer'; // For file uploads
import fs from 'fs'; // For file system operations
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
console.log(process.env.PORT);
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

// to create notifications
const createNotification = (recipientId, actorId, entityId, entityType, actionType, message) => {
  const sql = `
    INSERT INTO Notifications (recipient_id, actor_id, entity_id, entity_type, action_type, message) 
    VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.query(sql, [recipientId, actorId, entityId, entityType, actionType, message], (err) => {
    if (err) {
      console.error("Critical: Notification failed to save:", err);
    } else {
      console.log(`Notification sent to User ${recipientId} for ${actionType}`);
    }
  });
};

const triggerNotification = (recipientId, actorId, entityId, entityType, actionType, message) => {
  const sql = `
    INSERT INTO Notifications (recipient_id, actor_id, entity_id, entity_type, action_type, message) 
    VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [recipientId, actorId, entityId, entityType, actionType, message], (err) => {
    if (err) console.error("Notification Error:", err);
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

  const createFollowsTableSql = `
    CREATE TABLE IF NOT EXISTS User_Follows (
      follow_id INT AUTO_INCREMENT PRIMARY KEY,
      follower_user_id INT NOT NULL,
      followed_user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_follow (follower_user_id, followed_user_id)
    );
  `;

  db.query(createFollowsTableSql, (tableErr) => {
    if (tableErr) {
      console.error('Error ensuring User_Follows table exists:', tableErr);
    }
  });
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

// Profile routes (inline - migrated from profileRoutes.js)
app.get("/api/profile", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user?.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }
  getCurrentUserIdByEmail(currentUserEmail, (userErr, userId) => {
    if (userErr) {
      return res.status(404).json({ error: "No database user found for this authenticated account." });
    }
    const profileSql = `
      SELECT up.profile_id, up.user_id, up.display_name, up.bio, up.avatar_url, up.updated_at,
        up.program_id, up.department, up.gender, up.birthday, up.phone_number,
        p.program_name, uc.role, uc.email
      FROM User_Profiles up
      LEFT JOIN Programs p ON p.program_id = up.program_id
      LEFT JOIN User_Credentials uc ON uc.user_id = up.user_id
      WHERE up.user_id = ? LIMIT 1;
    `;
    db.query(profileSql, [userId], (err, results) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to fetch profile" });
      }
      if (!results || results.length === 0) {
        return res.status(404).json({ error: "Profile not found" });
      }
      const row = results[0];
      const coursesSql = `
        SELECT upc.course_id FROM User_Profile_Courses upc
        JOIN User_Profiles up ON up.profile_id = upc.profile_id
        WHERE up.user_id = ? ORDER BY upc.course_id ASC;
      `;
      db.query(coursesSql, [userId], (err2, courseResults) => {
        if (err2) {
          console.error("Database error:", err2.message);
          return res.status(500).json({ error: "Failed to fetch profile" });
        }
        return res.json({
          name: row.display_name || "",
          bio: row.bio || "",
          avatar_url: row.avatar_url || null,
          role: row.role || "",
          department: row.department || "",
          gender: row.gender || "",
          birthday: row.birthday || null,
          phone_number: row.phone_number || "",
          email: row.email || "",
          program_id: row.program_id ?? null,
          program_name: row.program_name || "",
          program: row.program_name || "",
          courses: (courseResults || []).map((c) => c.course_id),
        });
      });
    });
  });
});

app.get("/api/profile/programs", checkAuth, (req, res) => {
  const sql = `SELECT program_id, program_name FROM Programs ORDER BY program_name ASC;`;
  db.query(sql, [], (err, results) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Failed to fetch programs" });
    }
    return res.json(results || []);
  });
});

app.get("/api/profile/courses", checkAuth, (req, res) => {
  const sql = `SELECT course_id, course_code FROM Courses ORDER BY course_code ASC;`;
  db.query(sql, [], (err, results) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Failed to fetch courses" });
    }
    return res.json(results || []);
  });
});

app.get("/api/profile/user-courses", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user?.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }
  getCurrentUserIdByEmail(currentUserEmail, (userErr, userId) => {
    if (userErr) {
      return res.status(404).json({ error: "No database user found for this authenticated account." });
    }
    const sql = `
      SELECT c.course_id, c.course_code FROM User_Profile_Courses upc
      JOIN Courses c ON c.course_id = upc.course_id
      JOIN User_Profiles up ON up.profile_id = upc.profile_id
      WHERE up.user_id = ? ORDER BY c.course_code ASC;
    `;
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to fetch user courses" });
      }
      return res.json(results || []);
    });
  });
});

app.get("/api/profile/following", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user?.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      return res.status(404).json({ error: "No database user found for this authenticated account." });
    }

    const sql = `
      SELECT
        up.user_id,
        up.display_name,
        up.bio,
        up.avatar_url,
        up.department,
        up.gender,
        up.program_id,
        p.program_name,
        uc.email,
        uc.role,
        uf.created_at AS followed_at
      FROM User_Follows uf
      INNER JOIN User_Profiles up
        ON up.user_id = uf.followed_user_id
      LEFT JOIN Programs p
        ON p.program_id = up.program_id
      LEFT JOIN User_Credentials uc
        ON uc.user_id = up.user_id
      WHERE uf.follower_user_id = ?
      ORDER BY COALESCE(up.display_name, uc.email) ASC, uf.created_at DESC;
    `;

    db.query(sql, [currentUserId], (err, results) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to fetch following list" });
      }

      return res.json({ following: results || [] });
    });
  });
});

app.put("/api/profile/avatar", checkAuth, upload.single('avatar'), (req, res) => {
  const currentUserEmail = String(req.user?.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }
  if (!req.file || !req.file.filename) {
    return res.status(400).json({ error: "No image file provided." });
  }
  getCurrentUserIdByEmail(currentUserEmail, (userErr, userId) => {
    if (userErr) {
      return res.status(404).json({ error: "No database user found for this authenticated account." });
    }
    const avatarUrl = req.file.filename;
    const updateSql = `UPDATE User_Profiles SET avatar_url = ?, updated_at = NOW() WHERE user_id = ?;`;
    db.query(updateSql, [avatarUrl, userId], (err, result) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to update avatar" });
      }
      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ error: "Profile not found" });
      }
      return res.json({ ok: true, avatar_url: avatarUrl });
    });
  });
});

app.put("/api/profile", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user?.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }
  const { name, bio, gender, birthday, phone_number, program_id, courses } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Display name is required." });
  }
  const programIdValue = Number(program_id);
  if (!program_id || Number.isNaN(programIdValue) || programIdValue <= 0) {
    return res.status(400).json({ error: "Program is required." });
  }
  getCurrentUserIdByEmail(currentUserEmail, (userErr, userId) => {
    if (userErr) {
      return res.status(404).json({ error: "No database user found for this authenticated account." });
    }
    const updateSql = `
      UPDATE User_Profiles SET display_name = ?, bio = ?, gender = ?, birthday = ?,
        phone_number = ?, program_id = ?, updated_at = NOW()
      WHERE user_id = ?;
    `;
    const updateData = [name.trim(), bio ?? "", gender ?? "", birthday || null, phone_number?.trim() || "", programIdValue, userId];
    db.query(updateSql, updateData, (err, result) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to save profile" });
      }
      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ error: "Profile not found" });
      }
      const pidSql = `SELECT profile_id FROM User_Profiles WHERE user_id = ? LIMIT 1;`;
      db.query(pidSql, [userId], (err2, pidRows) => {
        if (err2 || !pidRows || pidRows.length === 0) {
          return res.status(404).json({ error: "Profile ID not found" });
        }
        const profileId = pidRows[0].profile_id;
        const delSql = `DELETE FROM User_Profile_Courses WHERE profile_id = ?`;
        db.query(delSql, [profileId], (err3) => {
          if (err3) {
            console.error("Database error:", err3.message);
            return res.status(500).json({ error: "Failed to save profile" });
          }
          if (Array.isArray(courses) && courses.length > 0) {
            const validCourseValues = courses
              .map((cid) => Number(cid))
              .filter((cid) => !Number.isNaN(cid) && cid > 0)
              .map((cid) => [profileId, cid]);
            if (validCourseValues.length > 0) {
              const placeholders = validCourseValues.map(() => "(?, ?)").join(", ");
              const flatParams = validCourseValues.flat();
              const insertSql = `INSERT INTO User_Profile_Courses (profile_id, course_id) VALUES ${placeholders}`;
              db.query(insertSql, flatParams, (err4) => {
                if (err4) {
                  console.error("Database error:", err4.message);
                  return res.status(500).json({ error: "Failed to save profile" });
                }
                return res.json({ ok: true, name: name.trim(), bio: bio ?? "", gender: gender ?? "", phone_number: phone_number?.trim() || "", birthday: birthday || null, program_id: programIdValue, courses: Array.isArray(courses) ? courses : [] });
              });
              return;
            }
          }
          return res.json({ ok: true, name: name.trim(), bio: bio ?? "", gender: gender ?? "", phone_number: phone_number?.trim() || "", birthday: birthday || null, program_id: programIdValue, courses: Array.isArray(courses) ? courses : [] });
        });
      });
    });
  });
});

app.get("/api/profile/programs/:programId/students", checkAuth, (req, res) => {
  const programId = Number(req.params.programId);
  if (!programId) {
    return res.status(400).json({ error: "Invalid program id" });
  }
  const sql = `
    SELECT up.user_id, up.profile_id, up.display_name, up.bio, up.program_id, p.program_name, uc.role, c.course_id, c.course_code
    FROM User_Profiles up
    JOIN Programs p ON p.program_id = up.program_id
    JOIN User_Credentials uc ON uc.user_id = up.user_id
    LEFT JOIN User_Profile_Courses upc ON upc.profile_id = up.profile_id
    LEFT JOIN Courses c ON c.course_id = upc.course_id
    WHERE up.program_id = ?
    ORDER BY up.display_name ASC, c.course_code ASC;
  `;
  db.query(sql, [programId], (err, results) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Failed to fetch program students" });
    }
    if (!results || results.length === 0) {
      return res.json({ program_name: "", students: [] });
    }
    const studentsMap = new Map();
    results.forEach((row) => {
      if (!studentsMap.has(row.user_id)) {
        studentsMap.set(row.user_id, {
          user_id: row.user_id,
          profile_id: row.profile_id,
          display_name: row.display_name,
          bio: row.bio || "",
          program_id: row.program_id,
          program_name: row.program_name || "",
          role: row.role || "",
          courses: [],
        });
      }
      if (row.course_id && row.course_code) {
        studentsMap.get(row.user_id).courses.push({ course_id: row.course_id, course_code: row.course_code });
      }
    });
    return res.json({ program_name: results[0]?.program_name || "", students: Array.from(studentsMap.values()) });
  });
});

app.get("/api/profile/search-users", checkAuth, (req, res) => {
  const userQuery = (req.query.query || "").trim();
  let sql;
  let params = [];

  if (userQuery) {
    const like = `%${userQuery}%`;
    sql = `
      SELECT
        up.user_id,
        up.display_name,
        uc.email,
        up.bio,
        up.department,
        up.gender,
        up.program_id,
        p.program_name,
        uc.role
      FROM User_Profiles up
      LEFT JOIN Programs p ON p.program_id = up.program_id
      LEFT JOIN User_Credentials uc ON uc.user_id = up.user_id
      WHERE LOWER(up.display_name) LIKE LOWER(?)
         OR LOWER(COALESCE(uc.email, '')) LIKE LOWER(?)
      ORDER BY up.display_name ASC;
    `;
    params = [like, like];
  } else {
    sql = `
      SELECT
        up.user_id,
        up.display_name,
        uc.email,
        up.bio,
        up.department,
        up.gender,
        up.program_id,
        p.program_name,
        uc.role
      FROM User_Profiles up
      LEFT JOIN Programs p ON p.program_id = up.program_id
      LEFT JOIN User_Credentials uc ON uc.user_id = up.user_id
      ORDER BY up.display_name ASC;
    `;
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Failed to search users" });
    }
    return res.json({ users: results || [] });
  });
});

// GET /api/profile/:userId - fetch another user's public profile (for View Profile from search)
app.get("/api/profile/:userId", checkAuth, (req, res) => {
  const targetUserId = Number(req.params.userId);
  if (!targetUserId || Number.isNaN(targetUserId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  const profileSql = `
    SELECT up.profile_id, up.user_id, up.display_name, up.bio, up.avatar_url, up.program_id,
      up.department, up.gender, up.birthday, up.phone_number, p.program_name, uc.role, uc.email
    FROM User_Profiles up
    LEFT JOIN Programs p ON p.program_id = up.program_id
    LEFT JOIN User_Credentials uc ON uc.user_id = up.user_id
    WHERE up.user_id = ? LIMIT 1;
  `;
  db.query(profileSql, [targetUserId], (err, results) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
    if (!results || results.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    const row = results[0];
    const coursesSql = `
      SELECT upc.course_id, c.course_code FROM User_Profile_Courses upc
      JOIN Courses c ON c.course_id = upc.course_id
      JOIN User_Profiles up ON up.profile_id = upc.profile_id
      WHERE up.user_id = ? ORDER BY c.course_code ASC;
    `;
    db.query(coursesSql, [targetUserId], (err2, courseResults) => {
      if (err2) {
        console.error("Database error:", err2.message);
        return res.status(500).json({ error: "Failed to fetch profile" });
      }
      return res.json({
        name: row.display_name || "",
        bio: row.bio || "",
        avatar_url: row.avatar_url || null,
        role: row.role || "",
        department: row.department || "",
        gender: row.gender || "",
        birthday: row.birthday || null,
        phone_number: row.phone_number || "",
        email: row.email || "",
        program_id: row.program_id ?? null,
        program_name: row.program_name || "",
        program: row.program_name || "",
        courses: (courseResults || []).map((c) => ({ course_id: c.course_id, course_code: c.course_code })),
      });
    });
  });
});

app.get("/api/profile/:userId/follow-status", checkAuth, (req, res) => {
  const targetUserId = Number(req.params.userId);
  if (!targetUserId || Number.isNaN(targetUserId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const currentUserEmail = String(req.user?.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      return res.status(404).json({ error: "No database user found for this authenticated account." });
    }

    if (Number(currentUserId) === targetUserId) {
      return res.json({ isFollowing: false, isSelf: true });
    }

    const sql = `
      SELECT 1
      FROM User_Follows
      WHERE follower_user_id = ? AND followed_user_id = ?
      LIMIT 1;
    `;

    db.query(sql, [currentUserId, targetUserId], (err, results) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to fetch follow status" });
      }

      return res.json({
        isFollowing: !!(results && results.length > 0),
        isSelf: false,
      });
    });
  });
});

app.post("/api/profile/:userId/follow", checkAuth, (req, res) => {
  const targetUserId = Number(req.params.userId);
  if (!targetUserId || Number.isNaN(targetUserId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const currentUserEmail = String(req.user?.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      return res.status(404).json({ error: "No database user found for this authenticated account." });
    }

    if (Number(currentUserId) === targetUserId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    const insertSql = `
      INSERT INTO User_Follows (follower_user_id, followed_user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE followed_user_id = VALUES(followed_user_id);
    `;

    db.query(insertSql, [currentUserId, targetUserId], (err) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to follow user" });
      }

      return res.json({ ok: true, isFollowing: true });
    });
  });
});

app.delete("/api/profile/:userId/follow", checkAuth, (req, res) => {
  const targetUserId = Number(req.params.userId);
  if (!targetUserId || Number.isNaN(targetUserId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const currentUserEmail = String(req.user?.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      return res.status(404).json({ error: "No database user found for this authenticated account." });
    }

    if (Number(currentUserId) === targetUserId) {
      return res.status(400).json({ error: "You cannot unfollow yourself." });
    }

    const deleteSql = `
      DELETE FROM User_Follows
      WHERE follower_user_id = ? AND followed_user_id = ?;
    `;

    db.query(deleteSql, [currentUserId, targetUserId], (err) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to unfollow user" });
      }

      return res.json({ ok: true, isFollowing: false });
    });
  });
});

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

// Set up helper function to get the current like count
// This function gets the total number of likes for a specific event from the database.
const getCurrentLikeCount = (eventId, callback) => {
  const countSql = `
    SELECT COUNT(*) AS likes
    FROM Event_Likes
    WHERE event_id = ?
  `;

  db.query(countSql, [eventId], (err, rows) => {
    if (err) {
      return callback(err, null);
    }

    return callback(null, Number(rows[0]?.likes || 0));
  });
};

// Calendar "Personal" events live in Events but should not appear on the Events discovery page.
const SQL_EXCLUDE_CALENDAR_PERSONAL_EVENT = `
      AND NOT EXISTS (
        SELECT 1 FROM Event_Tags cal_personal
        WHERE cal_personal.event_id = e.id
          AND cal_personal.tag_name = '__calscope__:personal'
      )`;

// GET /api/events
// This API is used to get a list of events from the database.
// If includePast=true is passed in the query, it will return all events including past ones.
// It also checks the current user to see if they have joined or liked each event.
app.get("/api/events", checkAuth, (req, res) => {
  const includePast = String(req.query.includePast).toLowerCase() === "true";
  const pastFilter = includePast
    ? ""
    : "AND TIMESTAMP(e.event_date, e.event_time) >= NOW()";

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
        COUNT(DISTINCT el.id) AS likes,
        e.category,
        e.event_type,
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
      WHERE 1=1
      AND e.event_type <> 'private'
      ${pastFilter}
      ${SQL_EXCLUDE_CALENDAR_PERSONAL_EVENT}
      GROUP BY
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.location,
        e.capacity,
        e.category,
        e.event_type,
        e.published_time
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
// POST /api/events
// This API creates a new event using the information provided by the user and saves it to the database.
app.post("/api/events", checkAuth, (req, res) => {
  const {
    title,
    description,
    event_date,
    event_time,
    end_date,
    end_time,
    location,
    capacity,
    category,
    tags,
    event_type,
    group_ids,
  } = req.body;

  if (
    !title ||
    !description ||
    !event_date ||
    !event_time ||
    !end_date ||
    !end_time ||
    !location ||
    capacity === undefined ||
    !category
  ) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const startDateOnly = new Date(`${event_date}T00:00`);
  const endDateOnly = new Date(`${end_date}T00:00`);

  if (
    Number.isNaN(startDateOnly.getTime()) ||
    Number.isNaN(endDateOnly.getTime())
  ) {
    return res.status(400).json({ error: "Invalid start date or end date." });
  }

  if (endDateOnly < startDateOnly) {
    return res.status(400).json({
      error: "End date must be later than or equal to start date.",
    });
  }

  const startDateTime = new Date(`${event_date}T${event_time}`);
  const endDateTime = new Date(`${end_date}T${end_time}`);

  if (
    Number.isNaN(startDateTime.getTime()) ||
    Number.isNaN(endDateTime.getTime())
  ) {
    return res.status(400).json({ error: "Invalid event date or time." });
  }

  if (event_date === end_date && endDateTime <= startDateTime) {
    return res.status(400).json({
      error: "If end date is the same as start date, end time must be later than start time.",
    });
  }

  if (endDateTime <= startDateTime) {
    return res.status(400).json({
      error: "End date and end time must be later than start date and start time.",
    });
  }

  const capNum = Number(capacity);
  if (!Number.isInteger(capNum) || capNum < 2) {
    return res.status(400).json({
      error: "Max RSVP spots must be an integer greater than or equal to 2.",
    });
  }

  const safeEventType =
    String(event_type || "public").trim().toLowerCase() === "group"
      ? "group"
      : "public";

  const safeTags = Array.isArray(tags) ? tags : [];

  const safeGroupIds = Array.isArray(group_ids)
    ? [
        ...new Set(
          group_ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        ),
      ]
    : [];

  if (safeEventType === "group" && safeGroupIds.length === 0) {
    return res.status(400).json({
      error: "Please select at least one group for a group event.",
    });
  }

  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("POST /api/events user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const verifyGroupsAndCreateEvent = () => {
      const insertEventSql = `
        INSERT INTO Events (
          title,
          description,
          event_date,
          event_time,
          end_date,
          end_time,
          location,
          capacity,
          category,
          event_type,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertEventSql,
        [
          title,
          description,
          event_date,
          event_time,
          end_date,
          end_time,
          location,
          capNum,
          category,
          safeEventType,
          currentUserId,
        ],
        (err, result) => {
          if (err) {
            console.log("POST /api/events error:", err);
            return res.status(500).json({ error: "Failed to create event." });
          }

          const eventId = result.insertId;

          const uniqueTags = [
            ...new Set(safeTags.map((tag) => String(tag).trim()).filter(Boolean)),
          ];

          const insertEventGroups = (done) => {
            if (safeEventType !== "group" || safeGroupIds.length === 0) {
              return done(null);
            }

            const groupValues = safeGroupIds.map((groupId) => [eventId, groupId]);

            const insertGroupsSql = `
              INSERT INTO Event_Groups (event_id, group_id)
              VALUES ?
            `;

            db.query(insertGroupsSql, [groupValues], (groupErr) => {
              if (groupErr) {
                console.log("Insert Event_Groups error:", groupErr);
                return done(new Error("Event was created, but failed to save selected groups."));
              }

              return done(null);
            });
          };

          const insertEventTags = (done) => {
            if (uniqueTags.length === 0) {
              return done(null);
            }

            const tagValues = uniqueTags.map((tag) => [eventId, tag]);

            const insertTagsSql = `
              INSERT INTO Event_Tags (event_id, tag_name)
              VALUES ?
            `;

            db.query(insertTagsSql, [tagValues], (tagErr) => {
              if (tagErr) {
                console.log("Insert Event_Tags error:", tagErr);
                return done(new Error("Event was created, but failed to save tags."));
              }

              return done(null);
            });
          };

          insertEventGroups((groupInsertErr) => {
            if (groupInsertErr) {
              return res.status(500).json({ error: groupInsertErr.message });
            }

            insertEventTags((tagInsertErr) => {
              if (tagInsertErr) {
                return res.status(500).json({ error: tagInsertErr.message });
              }

              return res.status(201).json({
                id: eventId,
                event_type: safeEventType,
                group_ids: safeGroupIds,
                message: "Event created successfully.",
              });
            });
          });
        }
      );
    };

    if (safeEventType !== "group") {
      return verifyGroupsAndCreateEvent();
    }

    const placeholders = safeGroupIds.map(() => "?").join(", ");

    const verifyGroupsSql = `
      SELECT DISTINCT gm.group_id
      FROM Group_Members gm
      WHERE gm.user_id = ?
        AND gm.group_id IN (${placeholders})
    `;

    db.query(
      verifyGroupsSql,
      [currentUserId, ...safeGroupIds],
      (verifyErr, verifyRows) => {
        if (verifyErr) {
          console.log("Verify selected groups error:", verifyErr);
          return res.status(500).json({ error: "Failed to verify selected groups." });
        }

        const verifiedGroupIds = (verifyRows || []).map((row) => Number(row.group_id));

        if (verifiedGroupIds.length !== safeGroupIds.length) {
          return res.status(403).json({
            error: "You can only create a group event for groups you have joined.",
          });
        }

        return verifyGroupsAndCreateEvent();
      }
    );
  });
});

// GET /api/calendar/contacts — users you follow (User_Follows + profile name)
app.get("/api/calendar/contacts", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("GET /api/calendar/contacts user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const sql = `
      SELECT
        uc.user_id,
        uc.email,
        COALESCE(up.display_name, uc.email) AS display_name
      FROM User_Follows uf
      JOIN User_Credentials uc ON uc.user_id = uf.followed_user_id
      LEFT JOIN User_Profiles up ON up.user_id = uf.followed_user_id
      WHERE uf.follower_user_id = ?
        AND uf.followed_user_id <> ?
      ORDER BY display_name ASC, uc.email ASC
    `;

    db.query(sql, [currentUserId, currentUserId], (err, rows) => {
      if (err) {
        console.log("GET /api/calendar/contacts error:", err);
        return res.status(500).json({ error: "Failed to load contacts." });
      }

      return res.json(rows || []);
    });
  });
});

// GET /api/calendar/events?userIds=1,2,3 — events created by or joined by any of those users
app.get("/api/calendar/events", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("GET /api/calendar/events user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const raw = String(req.query.userIds || "").trim();
    let userIds = raw
      ? raw
          .split(",")
          .map((s) => Number(String(s).trim()))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const idSet = new Set([currentUserId, ...userIds]);
    userIds = [...idSet];

    if (userIds.length === 0) {
      return res.json([]);
    }

    const ph = userIds.map(() => "?").join(", ");
    const sql = `
      SELECT
        e.id,
        e.title,
        e.description,
        DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
        TIME_FORMAT(e.event_time, '%H:%i') AS event_time,
        DATE_FORMAT(e.end_date, '%Y-%m-%d') AS end_date,
        TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
        e.category,
        e.capacity,
        e.event_type,
        e.created_by,
        COALESCE(creator_up.display_name, creator_uc.email) AS creator_name,
        GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ',') AS tags,
        (SELECT COUNT(*) FROM Event_Attendees ac WHERE ac.event_id = e.id) AS attendee_count,
        (NOW() > TIMESTAMP(e.end_date, e.end_time)) AS is_past,
        (NOW() > TIMESTAMP(e.event_date, e.event_time)) AS is_overdue
      FROM Events e
      LEFT JOIN User_Credentials creator_uc ON creator_uc.user_id = e.created_by
      LEFT JOIN User_Profiles creator_up ON creator_up.user_id = e.created_by
      LEFT JOIN Event_Tags t ON t.event_id = e.id
      WHERE
        (
          e.created_by IN (${ph})
          OR EXISTS (
            SELECT 1
            FROM Event_Attendees a2
            INNER JOIN User_Credentials uc2 ON LOWER(uc2.email) = LOWER(a2.attendee_name)
            WHERE a2.event_id = e.id AND uc2.user_id IN (${ph})
          )
        )
        AND (
          NOT EXISTS (
            SELECT 1
            FROM Event_Tags pv
            WHERE pv.event_id = e.id
              AND pv.tag_name = '__calvisibility__:private'
          )
          OR e.created_by = ?
          OR EXISTS (
            SELECT 1
            FROM Event_Attendees a_self
            WHERE a_self.event_id = e.id
              AND LOWER(a_self.attendee_name) = LOWER(?)
          )
        )
      GROUP BY
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.end_date,
        e.end_time,
        e.category,
        e.capacity,
        e.event_type,
        e.created_by,
        creator_uc.email,
        creator_up.display_name
      ORDER BY e.event_date ASC, e.event_time ASC
    `;

    const params = [...userIds, ...userIds, currentUserId, currentUserEmail];

    db.query(sql, params, (err, rows) => {
      if (err) {
        console.log("GET /api/calendar/events error:", err);
        return res.status(500).json({ error: "Failed to load calendar events." });
      }

      return res.json(rows || []);
    });
  });
});

// GET /api/calendar/events/:id — fetch full event row for details popup
// (Must include capacity/event_type because the calendar list query can be filtered.)
app.get("/api/calendar/events/:id", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("GET /api/calendar/events/:id user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const sql = `
      SELECT
        e.id,
        e.title,
        e.description,
        DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
        TIME_FORMAT(e.event_time, '%H:%i') AS event_time,
        DATE_FORMAT(e.end_date, '%Y-%m-%d') AS end_date,
        TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
        e.location,
        e.capacity,
        e.category,
        e.event_type,
        e.created_by,
        COALESCE(creator_up.display_name, creator_uc.email) AS creator_name,
        GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ',') AS tags,
        (SELECT COUNT(*) FROM Event_Attendees ac2 WHERE ac2.event_id = e.id) AS attendee_count
      FROM Events e
      LEFT JOIN User_Credentials creator_uc ON creator_uc.user_id = e.created_by
      LEFT JOIN User_Profiles creator_up ON creator_up.user_id = e.created_by
      LEFT JOIN Event_Tags t ON t.event_id = e.id
      WHERE
        e.id = ?
        AND (
          NOT EXISTS (
            SELECT 1
            FROM Event_Tags pv
            WHERE pv.event_id = e.id
              AND pv.tag_name = '__calvisibility__:private'
          )
          OR e.created_by = ?
          OR EXISTS (
            SELECT 1
            FROM Event_Attendees a_self
            WHERE a_self.event_id = e.id
              AND LOWER(a_self.attendee_name) = LOWER(?)
          )
        )
      GROUP BY
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.end_date,
        e.end_time,
        e.location,
        e.capacity,
        e.category,
        e.event_type,
        e.created_by,
        creator_uc.email,
        creator_up.display_name
      LIMIT 1
    `;

    db.query(sql, [eventId, currentUserId, currentUserEmail], (err, rows) => {
      if (err) {
        console.log("GET /api/calendar/events/:id error:", err);
        return res.status(500).json({ error: "Failed to load event details." });
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Event not found." });
      }
      return res.json(rows[0]);
    });
  });
});

// POST /api/calendar/todos — quick create with explicit end date/time; maps to Events + optional tags/attendees
app.post("/api/calendar/todos", checkAuth, (req, res) => {
  const {
    title,
    description,
    category,
    event_date,
    event_time,
    end_date,
    end_time,
    participant_user_ids,
    calendar_color,
    scope,
    visibility,
  } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "Title is required." });
  }
  if (!event_date || !event_time) {
    return res.status(400).json({ error: "Start date and start time are required." });
  }
  if (!end_date || !end_time) {
    return res.status(400).json({ error: "End date and end time are required." });
  }
  if (!category || !String(category).trim()) {
    return res.status(400).json({ error: "Category is required." });
  }

  const norm = (t) => String(t || "").trim().slice(0, 5);
  const et = norm(event_time);
  const xt = norm(end_time);

  const startDateOnly = new Date(`${event_date}T00:00:00`);
  const endDateOnly = new Date(`${end_date}T00:00:00`);
  if (Number.isNaN(startDateOnly.getTime()) || Number.isNaN(endDateOnly.getTime())) {
    return res.status(400).json({ error: "Invalid start or end date." });
  }
  if (endDateOnly < startDateOnly) {
    return res.status(400).json({ error: "End date must be on or after start date." });
  }

  const startDT = new Date(`${event_date}T${et}:00`);
  const endDT = new Date(`${end_date}T${xt}:00`);
  if (Number.isNaN(startDT.getTime()) || Number.isNaN(endDT.getTime())) {
    return res.status(400).json({ error: "Invalid start or end time." });
  }
  if (endDT <= startDT) {
    return res.status(400).json({ error: "End must be after start." });
  }

  const rawScope = String(scope || "personal").trim().toLowerCase();
  const eventScope = rawScope === "group" ? "group" : "personal";
  const rawVisibility = String(visibility || "public").trim().toLowerCase();
  const eventVisibility =
    eventScope === "group" ? (rawVisibility === "private" ? "private" : "public") : "private";

  const participantIds =
    eventScope === "group" && Array.isArray(participant_user_ids)
      ? [
          ...new Set(
            participant_user_ids
              .map((id) => Number(id))
              .filter((id) => Number.isInteger(id) && id > 0)
          ),
        ]
      : [];

  const safeColor = String(calendar_color || "blue")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);

  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("POST /api/calendar/todos user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const insertEventSql = `
      INSERT INTO Events (
        title,
        description,
        event_date,
        event_time,
        end_date,
        end_time,
        location,
        capacity,
        category,
        event_type,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', ?)
    `;

    const desc = description != null ? String(description) : "";
    const cap = 999;
    const startTimeDb = et;
    const endTimeDb = xt;

    db.query(
      insertEventSql,
      [
        String(title).trim(),
        desc,
        event_date,
        startTimeDb,
        end_date,
        endTimeDb,
        "Calendar",
        cap,
        String(category).trim(),
        currentUserId,
      ],
      (err, result) => {
        if (err) {
          console.log("POST /api/calendar/todos insert error:", err);
          return res.status(500).json({ error: "Failed to create todo." });
        }

        const eventId = result.insertId;
        const tagNames = [
          `__calendar__`,
          `__calcolor__:${safeColor || "blue"}`,
          `__calscope__:${eventScope}`,
          `__calvisibility__:${eventVisibility}`,
        ];

        const insertTags = (done) => {
          const tagValues = tagNames.map((tag) => [eventId, tag]);
          const insertTagsSql = `
            INSERT INTO Event_Tags (event_id, tag_name)
            VALUES ?
          `;
          db.query(insertTagsSql, [tagValues], (tagErr) => {
            if (tagErr) {
              console.log("POST /api/calendar/todos tags error:", tagErr);
              return done(tagErr);
            }
            return done(null);
          });
        };

        const insertAttendees = (done) => {
          if (participantIds.length === 0) {
            return done(null);
          }
          const ph = participantIds.map(() => "?").join(", ");
          const emailSql = `SELECT user_id, LOWER(email) AS email FROM User_Credentials WHERE user_id IN (${ph})`;
          db.query(emailSql, participantIds, (emErr, emRows) => {
            if (emErr) {
              console.log("POST /api/calendar/todos participant lookup error:", emErr);
              return done(emErr);
            }
            const emails = (emRows || [])
              .map((r) => r.email)
              .filter((e) => e && String(e).toLowerCase() !== currentUserEmail);
            if (emails.length === 0) {
              return done(null);
            }
            const rows = emails.map((email) => [eventId, email]);
            const insertSql = `INSERT INTO Event_Attendees (event_id, attendee_name) VALUES ?`;
            db.query(insertSql, [rows], (attErr) => {
              if (attErr) {
                console.log("POST /api/calendar/todos attendees error:", attErr);
                return done(attErr);
              }
              return done(null);
            });
          });
        };

        insertTags((tagErr) => {
          if (tagErr) {
            return res.status(500).json({ error: "Created event but failed to save calendar metadata." });
          }
          insertAttendees((attErr) => {
            if (attErr) {
              return res.status(500).json({ error: "Created event but failed to add participants." });
            }
            return res.status(201).json({
              id: eventId,
              message: "Event created successfully.",
            });
          });
        });
      }
    );
  });
});

// PUT /api/calendar/events/:id — owner can edit calendar event details
app.put("/api/calendar/events/:id", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  const {
    title,
    description,
    category,
    event_date,
    event_time,
    end_date,
    end_time,
    participant_user_ids,
    calendar_color,
    scope,
    visibility,
    capacity: capacityBody,
    max_attendees: maxAttendeesBody,
  } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "Title is required." });
  }
  if (!event_date || !event_time) {
    return res.status(400).json({ error: "Start date and start time are required." });
  }
  if (!end_date || !end_time) {
    return res.status(400).json({ error: "End date and end time are required." });
  }
  if (!category || !String(category).trim()) {
    return res.status(400).json({ error: "Category is required." });
  }

  const norm = (t) => String(t || "").trim().slice(0, 5);
  const et = norm(event_time);
  const xt = norm(end_time);
  const startDT = new Date(`${event_date}T${et}:00`);
  const endDT = new Date(`${end_date}T${xt}:00`);
  if (Number.isNaN(startDT.getTime()) || Number.isNaN(endDT.getTime())) {
    return res.status(400).json({ error: "Invalid start or end time." });
  }
  if (endDT <= startDT) {
    return res.status(400).json({ error: "End must be after start." });
  }

  const rawScope = String(scope || "personal").trim().toLowerCase();
  const eventScope = rawScope === "group" ? "group" : "personal";
  const rawVisibility = String(visibility || "public").trim().toLowerCase();
  const eventVisibility =
    eventScope === "group" ? (rawVisibility === "private" ? "private" : "public") : "private";
  const participantIds =
    eventScope === "group" && Array.isArray(participant_user_ids)
      ? [
          ...new Set(
            participant_user_ids
              .map((id) => Number(id))
              .filter((id) => Number.isInteger(id) && id > 0)
          ),
        ]
      : [];
  const safeColor = String(calendar_color || "blue")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);

  const capBodyNum = Number(capacityBody);
  const capMaxNum = Number(maxAttendeesBody);
  let capacityNum =
    Number.isFinite(capBodyNum) && capBodyNum >= 1 && capBodyNum <= 99999 ? capBodyNum : NaN;
  if (
    !Number.isFinite(capacityNum) &&
    Number.isFinite(capMaxNum) &&
    capMaxNum >= 1 &&
    capMaxNum <= 99999
  ) {
    capacityNum = capMaxNum;
  }
  if (!Number.isFinite(capacityNum)) {
    capacityNum = 999;
  }

  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("PUT /api/calendar/events/:id user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const ownershipSql = `
      SELECT
        e.id,
        e.event_type AS current_event_type,
        EXISTS (
          SELECT 1 FROM Event_Tags ct
          WHERE ct.event_id = e.id AND ct.tag_name = '__calendar__'
        ) AS has_calendar,
        EXISTS (
          SELECT 1 FROM Event_Groups eg
          WHERE eg.event_id = e.id
        ) AS has_event_groups
      FROM Events e
      WHERE e.id = ?
        AND e.created_by = ?
      LIMIT 1
    `;

    db.query(ownershipSql, [eventId, currentUserId], (ownErr, ownRows) => {
      if (ownErr) {
        console.log("PUT /api/calendar/events/:id ownership error:", ownErr);
        return res.status(500).json({ error: "Failed to verify event ownership." });
      }
      if (!ownRows || ownRows.length === 0) {
        return res.status(403).json({ error: "Only the owner can edit this event." });
      }

      const hasCalendar = Number(ownRows[0].has_calendar) === 1;
      const hasEventGroups = Number(ownRows[0].has_event_groups) === 1;

      let nextEventType = null;
      if (eventScope === "group") {
        if (eventVisibility === "private") {
          nextEventType = "private";
        } else {
          nextEventType = hasEventGroups ? "group" : "public";
        }
      }

      let updateSql = `
        UPDATE Events
        SET
          title = ?,
          description = ?,
          category = ?,
          event_date = ?,
          event_time = ?,
          end_date = ?,
          end_time = ?,
          capacity = ?`;
      const updateParams = [
        String(title).trim(),
        description != null ? String(description) : "",
        String(category).trim(),
        event_date,
        et,
        end_date,
        xt,
        capacityNum,
      ];
      if (nextEventType !== null) {
        updateSql += `,\n          event_type = ?`;
        updateParams.push(nextEventType);
      }
      updateSql += `\n        WHERE id = ?`;
      updateParams.push(eventId);

      const respondSuccess = () => {
        const payload = {
          message: "Event updated successfully.",
          capacity: capacityNum,
        };
        if (nextEventType !== null) {
          payload.event_type = nextEventType;
        }
        return res.json(payload);
      };

      const syncGroupAttendees = () => {
        if (eventScope !== "group") {
          return respondSuccess();
        }

        const clearAttendeeSql = "DELETE FROM Event_Attendees WHERE event_id = ?";
        db.query(clearAttendeeSql, [eventId], (clearAttErr) => {
          if (clearAttErr) {
            console.log("PUT /api/calendar/events/:id clear attendees error:", clearAttErr);
            return res.status(500).json({ error: "Failed to update attendees." });
          }

          if (participantIds.length === 0) {
            return respondSuccess();
          }

          const ph = participantIds.map(() => "?").join(", ");
          const emailSql = `SELECT LOWER(email) AS email FROM User_Credentials WHERE user_id IN (${ph})`;
          db.query(emailSql, participantIds, (emErr, emRows) => {
            if (emErr) {
              console.log("PUT /api/calendar/events/:id attendee lookup error:", emErr);
              return res.status(500).json({ error: "Failed to lookup attendees." });
            }
            const emails = (emRows || [])
              .map((r) => r.email)
              .filter((e) => e && String(e).toLowerCase() !== currentUserEmail);
            if (emails.length === 0) {
              return respondSuccess();
            }
            const rows = emails.map((email) => [eventId, email]);
            db.query("INSERT INTO Event_Attendees (event_id, attendee_name) VALUES ?", [rows], (attErr) => {
              if (attErr) {
                console.log("PUT /api/calendar/events/:id insert attendees error:", attErr);
                return res.status(500).json({ error: "Failed to save attendees." });
              }
              return respondSuccess();
            });
          });
        });
      };

      /** Writes __calscope__ / __calvisibility__ (and friends) so group public/private persists for feed events too. */
      const persistCalendarMetaThenSyncAttendees = () => {
        const clearMetaSql = `
            DELETE FROM Event_Tags
            WHERE event_id = ?
              AND (
                tag_name = '__calendar__'
                OR tag_name LIKE '__calcolor__:%'
                OR tag_name LIKE '__calscope__:%'
                OR tag_name LIKE '__calvisibility__:%'
              )
          `;

        db.query(clearMetaSql, [eventId], (clearErr) => {
          if (clearErr) {
            console.log("PUT /api/calendar/events/:id clear tags error:", clearErr);
            return res.status(500).json({ error: "Failed to update calendar metadata." });
          }

          const tagValues = [
            [eventId, "__calendar__"],
            [eventId, `__calcolor__:${safeColor || "blue"}`],
            [eventId, `__calscope__:${eventScope}`],
            [eventId, `__calvisibility__:${eventVisibility}`],
          ];
          db.query("INSERT INTO Event_Tags (event_id, tag_name) VALUES ?", [tagValues], (tagErr) => {
            if (tagErr) {
              console.log("PUT /api/calendar/events/:id insert tags error:", tagErr);
              return res.status(500).json({ error: "Failed to save calendar metadata." });
            }
            return syncGroupAttendees();
          });
        });
      };

      db.query(updateSql, updateParams, (updErr) => {
          if (updErr) {
            console.log("PUT /api/calendar/events/:id update error:", updErr);
            return res.status(500).json({ error: "Failed to update event." });
          }

          // Feed events had no __calendar__ row before: still persist visibility in Event_Tags when editing as group.
          if (eventScope === "group" || hasCalendar) {
            return persistCalendarMetaThenSyncAttendees();
          }

          return syncGroupAttendees();
        }
      );
    });
  });
});

// DELETE /api/calendar/events/:id — owner can delete; attendee can remove from own calendar
app.delete("/api/calendar/events/:id", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();
  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("DELETE /api/calendar/events/:id user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const lookupSql = `
      SELECT e.id, e.created_by
      FROM Events e
      WHERE e.id = ?
        AND EXISTS (
          SELECT 1
          FROM Event_Tags ct
          WHERE ct.event_id = e.id
            AND ct.tag_name = '__calendar__'
        )
      LIMIT 1
    `;

    db.query(lookupSql, [eventId], (lookupErr, rows) => {
      if (lookupErr) {
        console.log("DELETE /api/calendar/events/:id lookup error:", lookupErr);
        return res.status(500).json({ error: "Failed to load event." });
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Calendar event not found." });
      }

      const isOwner = Number(rows[0].created_by) === Number(currentUserId);
      if (isOwner) {
        const delLikes = "DELETE FROM Event_Likes WHERE event_id = ?";
        const delTags = "DELETE FROM Event_Tags WHERE event_id = ?";
        const delAttendees = "DELETE FROM Event_Attendees WHERE event_id = ?";
        const delEventGroups = "DELETE FROM Event_Groups WHERE event_id = ?";
        const delEvent = "DELETE FROM Events WHERE id = ?";

        db.query(delLikes, [eventId], () => {
          db.query(delTags, [eventId], () => {
            db.query(delAttendees, [eventId], () => {
              db.query(delEventGroups, [eventId], () => {
                db.query(delEvent, [eventId], (delErr) => {
                  if (delErr) {
                    console.log("DELETE /api/calendar/events/:id owner delete error:", delErr);
                    return res.status(500).json({ error: "Failed to delete event." });
                  }
                  return res.json({ message: "Event removed from calendar." });
                });
              });
            });
          });
        });
        return;
      }

      const removeAttendeeSql = `
        DELETE FROM Event_Attendees
        WHERE event_id = ?
          AND LOWER(attendee_name) = ?
      `;
      db.query(removeAttendeeSql, [eventId, currentUserEmail], (attErr, attResult) => {
        if (attErr) {
          console.log("DELETE /api/calendar/events/:id attendee remove error:", attErr);
          return res.status(500).json({ error: "Failed to remove event from calendar." });
        }
        if (!attResult || attResult.affectedRows === 0) {
          return res.status(403).json({ error: "You can only remove your own calendar items." });
        }
        return res.json({ message: "Event removed from calendar." });
      });
    });
  });
});

// POST /api/events/:id/join
// This API lets a user join an event if it is not full, not ended, and they have not joined before.
app.post("/api/events/:id/join", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const attendeeEmail = String(req.user.email || "").trim().toLowerCase();

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  if (!attendeeEmail) {
    return res.status(400).json({ error: "Missing authenticated user email." });
  }

  getCurrentUserIdByEmail(attendeeEmail, (userErr, currentUserId) => {
    if (userErr) {
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const eventSql = `
      SELECT id, title, event_date, event_time, end_date, end_time, capacity, event_type
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

      const continueJoin = () => {
        const statusSql = `
          SELECT
            CASE
              WHEN NOW() < TIMESTAMP(event_date, event_time) THEN 'open_for_application'
              WHEN NOW() >= TIMESTAMP(event_date, event_time) AND NOW() <= TIMESTAMP(end_date, end_time) THEN 'in_progress'
              ELSE 'ended'
            END AS event_status
          FROM Events
          WHERE id = ?
          LIMIT 1
        `;

        db.query(statusSql, [eventId], (statusErr, statusRows) => {
          if (statusErr || statusRows.length === 0) {
            return res.status(500).json({ error: "Failed to check event status." });
          }

          if (String(statusRows[0].event_status) === "ended") {
            return res.status(400).json({ error: "This event has already ended." });
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
      };

      if (String(event.event_type || "").toLowerCase() !== "group") {
        return continueJoin();
      }

      const membershipSql = `
        SELECT 1
        FROM Event_Groups eg
        INNER JOIN Group_Members gm
          ON gm.group_id = eg.group_id
        WHERE eg.event_id = ?
          AND gm.user_id = ?
        LIMIT 1
      `;

      db.query(membershipSql, [eventId, currentUserId], (membershipErr, membershipRows) => {
        if (membershipErr) {
          return res.status(500).json({ error: "Failed to verify group membership." });
        }

        if (!membershipRows || membershipRows.length === 0) {
          return res.status(403).json({
            error: "You can only join this private event if you are in one of the selected groups.",
          });
        }

        return continueJoin();
      });
    });
  });
});

// DELETE /api/events/:id/leave
// This API allows a user to leave an event they joined and updates the attendee count.
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
// This API returns the list of users who joined a specific event.
// It matches attendees by email internally and returns display names to the frontend.

app.get("/api/events/:id/attendees", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  const eventTypeSql = `
    SELECT event_type
    FROM Events
    WHERE id = ?
    LIMIT 1
  `;

  db.query(eventTypeSql, [eventId], (eventErr, eventRows) => {
    if (eventErr) {
      console.log("GET /api/events/:id/attendees event lookup error:", eventErr);
      return res.status(500).json({ error: "Failed to load event attendees." });
    }

    if (!eventRows || eventRows.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const eventType = String(eventRows[0].event_type || "").toLowerCase();

    if (eventType !== "group") {
      const publicSql = `
        SELECT
          ea.id,
          ea.joined_at,
          ea.attendee_name AS attendee_email,
          uc.user_id AS user_id,
          COALESCE(up.display_name, SUBSTRING_INDEX(ea.attendee_name, '@', 1)) AS attendee_name
        FROM Event_Attendees ea
        LEFT JOIN User_Credentials uc
          ON LOWER(uc.email) = LOWER(ea.attendee_name)
        LEFT JOIN User_Profiles up
          ON up.user_id = uc.user_id
        WHERE ea.event_id = ?
        ORDER BY ea.joined_at ASC, ea.id ASC
      `;

      db.query(publicSql, [eventId], (err, rows) => {
        if (err) {
          console.log("GET /api/events/:id/attendees public error:", err);
          return res.status(500).json({ error: "Failed to load attendees." });
        }

        return res.json(
          rows.map((row) => ({
            id: row.id,
            joined_at: row.joined_at,
            user_id: row.user_id,
            attendee_email: row.attendee_email,
            attendee_name: row.attendee_name,
          }))
        );
      });

      return;
    }

    const privateSql = `
      SELECT
        ea.id,
        ea.joined_at,
        ea.attendee_name AS attendee_email,
        uc.user_id AS user_id,
        COALESCE(up.display_name, SUBSTRING_INDEX(ea.attendee_name, '@', 1)) AS attendee_name
      FROM Event_Attendees ea
      INNER JOIN Events e
        ON e.id = ea.event_id
      LEFT JOIN User_Credentials uc_creator
        ON uc_creator.user_id = e.created_by
      LEFT JOIN User_Credentials uc
        ON LOWER(uc.email) = LOWER(ea.attendee_name)
      LEFT JOIN User_Profiles up
        ON up.user_id = uc.user_id
      WHERE ea.event_id = ?
        AND (
          LOWER(ea.attendee_name) = LOWER(uc_creator.email)
          OR EXISTS (
            SELECT 1
            FROM User_Credentials uc_att
            INNER JOIN Group_Members gm
              ON gm.user_id = uc_att.user_id
            INNER JOIN Event_Groups eg
              ON eg.group_id = gm.group_id
            WHERE eg.event_id = e.id
              AND LOWER(uc_att.email) = LOWER(ea.attendee_name)
          )
        )
      ORDER BY ea.joined_at ASC, ea.id ASC
    `;

    db.query(privateSql, [eventId], (err, rows) => {
      if (err) {
        console.log("GET /api/events/:id/attendees private error:", err);
        return res.status(500).json({ error: "Failed to load attendees." });
      }

      return res.json(
        rows.map((row) => ({
          id: row.id,
          joined_at: row.joined_at,
          user_id: row.user_id,
          attendee_email: row.attendee_email,
          attendee_name: row.attendee_name,
        }))
      );
    });
  });
});

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
app.post("/api/groups", checkAuth, upload.single("coverImage"), (req, res) => {
  const { name, description, category, isOpen, maxMembers } = req.body;

  const explicitCreatorId = Number(req.body.user_id);

  const createGroupWithCreator = (creator_id) => {
    if (!creator_id) {
      return res
        .status(400)
        .json({ error: "Missing or invalid user_id for group creator" });
    }

    const is_private = isOpen === "true" ? 0 : 1;
    const max_members = maxMembers ? parseInt(maxMembers, 10) : null;
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
              message: "Group created successfully",
            });
          }
        );
      }
    );
  };

  if (explicitCreatorId) {
    return createGroupWithCreator(explicitCreatorId);
  }

  getCurrentUserIdByEmail(req.user.email, (lookupErr, resolvedUserId) => {
    if (lookupErr || !resolvedUserId) {
      console.error("POST /api/groups user lookup error:", lookupErr);
      return res
        .status(400)
        .json({ error: "Missing or invalid user_id for group creator" });
    }

    return createGroupWithCreator(resolvedUserId);
  });
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
        
        const creatorId = group.creator_id;
        const groupName = group.name;

        // get the display name of the person joining
        db.query("SELECT display_name FROM User_Profiles WHERE user_id = ?", [userId], (err, profile) => {
            if (!err && profile.length > 0) {
                const actorName = profile[0].display_name || "A student";
                const message = `${actorName} joined your group: ${groupName}`;

                // trigger the notification for the creator
                if (creatorId !== userId) {
                    triggerNotification(creatorId, userId, groupId, 'GROUP', 'JOIN', message);
                }
            }
        });
        
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
  const userId = Number(req.body.userId);

  const infoSql = `
    SELECT sg.name, sg.creator_id, up.display_name
    FROM Social_Group sg
    JOIN User_Profiles up ON up.user_id = ?
    WHERE sg.group_id = ?`;
  
  console.log("leave group fetch")
  db.query(infoSql, [userId, groupId], (err, result) => {
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (err) return res.status(500).json({ error: "Failed to leave group" });

    const { name, display_name, creator_id } = result[0];

    function performDelete() {
      const sql = "DELETE FROM Group_Members WHERE group_id = ? AND user_id = ?";
      db.query(sql, [groupId, userId], (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to leave group" });
        
        // Trigger Notification if delete worked
        if (result.affectedRows > 0 && creator_id !== userId) {
          const msg = `${display_name || "A student"} left your group: ${name}`;
          triggerNotification(creator_id, userId, groupId, 'GROUP', 'LEAVE', msg);
        }
        
        return res.json({ message: "Successfully left group" });
      });
    }

    performDelete();
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

// --- Group Join Requests (Request Access for private groups) ---

// POST /api/groups/:groupId/request-access - User requests to join a private group
app.post("/api/groups/:groupId/request-access", checkAuth, async (req, res) => {
  const groupId = Number(req.params.groupId);
  let userId;
  try {
    userId = await getNumericUserId(req.user.email);
  } catch (err) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!groupId || !userId) {
    return res.status(400).json({ error: "groupId and userId are required" });
  }

  const groupSql = "SELECT group_id, creator_id, is_private FROM Social_Group WHERE group_id = ? LIMIT 1";
  db.query(groupSql, [groupId], (groupErr, groupRows) => {
    if (groupErr) {
      console.error("Error fetching group:", groupErr);
      return res.status(500).json({ error: "Failed to load group" });
    }
    if (!groupRows || groupRows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }
    const group = groupRows[0];
    if (!group.is_private) {
      return res.status(400).json({ error: "Group is public; use Join instead" });
    }
    if (group.creator_id === userId) {
      return res.status(400).json({ error: "You own this group; use Join instead" });
    }

    const memberCheck = "SELECT 1 FROM Group_Members WHERE group_id = ? AND user_id = ? LIMIT 1";
    db.query(memberCheck, [groupId, userId], (memberErr, memberRows) => {
      if (memberErr) {
        return res.status(500).json({ error: "Failed to check membership" });
      }
      if (memberRows && memberRows.length > 0) {
        return res.status(400).json({ error: "Already a member of this group" });
      }

      const insertSql = `
        INSERT INTO Group_Join_Requests (group_id, user_id, status)
        VALUES (?, ?, 'pending')
        ON DUPLICATE KEY UPDATE status = 'pending', created_at = CURRENT_TIMESTAMP
      `;
      db.query(insertSql, [groupId, userId], (insertErr) => {
        if (insertErr) {
          console.error("Error creating join request:", insertErr);
          return res.status(500).json({ error: "Failed to send request" });
        }
        return res.status(201).json({ message: "Request sent", groupId, userId });
      });
    });
  });
});

// GET /api/users/:userId/join-requests-as-owner - Pending join requests for groups the user owns
app.get("/api/users/:userId/join-requests-as-owner", checkAuth, (req, res) => {
  const ownerId = Number(req.params.userId);
  if (!ownerId) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  const sql = `
    SELECT 
      gjr.id AS request_id,
      gjr.group_id,
      gjr.user_id,
      gjr.status,
      gjr.created_at,
      sg.name AS group_name,
      up.display_name AS requester_name
    FROM Group_Join_Requests gjr
    JOIN Social_Group sg ON sg.group_id = gjr.group_id
    LEFT JOIN User_Profiles up ON up.user_id = gjr.user_id
    WHERE sg.creator_id = ? AND gjr.status = 'pending'
    ORDER BY gjr.created_at DESC
  `;
  db.query(sql, [ownerId], (err, rows) => {
    if (err) {
      console.error("GET /api/users/:userId/join-requests-as-owner error:", err);
      return res.status(500).json({ error: "Failed to fetch join requests" });
    }
    return res.json(rows || []);
  });
});

// POST /api/join-requests/:requestId/respond - Owner accepts or declines a join request
app.post("/api/join-requests/:requestId/respond", checkAuth, async (req, res) => {
  const requestId = Number(req.params.requestId);
  const { action, ownerId } = req.body;

  if (!requestId || !ownerId) {
    return res.status(400).json({ error: "requestId and ownerId are required" });
  }
  if (action !== "accept" && action !== "decline") {
    return res.status(400).json({ error: "action must be 'accept' or 'decline'" });
  }

  const getSql = `
    SELECT gjr.id, gjr.group_id, gjr.user_id, gjr.status, sg.creator_id, sg.name AS group_name, sg.max_members
    FROM Group_Join_Requests gjr
    JOIN Social_Group sg ON sg.group_id = gjr.group_id
    WHERE gjr.id = ? LIMIT 1
  `;
  db.query(getSql, [requestId], (getErr, rows) => {
    if (getErr) {
      console.error("Error fetching join request:", getErr);
      return res.status(500).json({ error: "Failed to load request" });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }
    const reqRow = rows[0];
    if (Number(reqRow.creator_id) !== Number(ownerId)) {
      return res.status(403).json({ error: "Only the group owner can respond" });
    }
    if (reqRow.status !== "pending") {
      return res.status(400).json({ error: "Request is no longer pending" });
    }

    const updateSql = "UPDATE Group_Join_Requests SET status = ? WHERE id = ?";

    if (action === "decline") {
      db.query(updateSql, ["declined", requestId], (upErr) => {
        if (upErr) {
          console.error("Error declining request:", upErr);
          return res.status(500).json({ error: "Failed to decline" });
        }
        return res.json({ message: "Request declined" });
      });
      return;
    }

    if (action === "accept") {
      const checkFullSql = `
        SELECT COUNT(*) AS cnt FROM Group_Members WHERE group_id = ?
      `;
      db.query(checkFullSql, [reqRow.group_id], (cntErr, cntRows) => {
        if (cntErr) {
          return res.status(500).json({ error: "Failed to check group size" });
        }
        const currentCount = cntRows[0]?.cnt || 0;
        if (reqRow.max_members && currentCount >= reqRow.max_members) {
          return res.status(400).json({ error: "Group is full" });
        }

        const addMemberSql = "INSERT INTO Group_Members (group_id, user_id) VALUES (?, ?)";
        db.query(addMemberSql, [reqRow.group_id, reqRow.user_id], (addErr) => {
          if (addErr) {
            console.error("Error adding member:", addErr);
            return res.status(500).json({ error: "Failed to add member" });
          }
          db.query(updateSql, ["accepted", requestId], (upErr) => {
            if (upErr) {
              console.error("Error updating request:", upErr);
            }
            return res.json({
              message: "Request accepted",
              group_name: reqRow.group_name,
            });
          });
        });
      });
    }
  });
});

// UPDATE GROUP:
app.put("/api/groups/:groupId", checkAuth, upload.single("coverImage"), (req, res) => {
  const groupId = req.params.groupId;
  const { name, description, category, isOpen, maxMembers } = req.body;
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  getCurrentUserIdByEmail(currentUserEmail, (userErr, userId) => {
    if (userErr || userId == null) {
      console.error("PUT /api/groups/:groupId user lookup error:", userErr);
      return res.status(401).json({ error: "User not found" });
    }

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

      const is_private = isOpen === "true" ? 0 : 1;
      const max_members = maxMembers ? parseInt(maxMembers, 10) : null;

      let sql = `
      UPDATE Social_Group 
      SET name = ?, description = ?, category = ?, is_private = ?, max_members = ?
    `;

      const params = [name, description, category, is_private, max_members];

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
});

// DELETE GROUP:
app.delete("/api/groups/:groupId", checkAuth, (req, res) => {
  const groupId = req.params.groupId;
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  getCurrentUserIdByEmail(currentUserEmail, (userErr, userId) => {
    if (userErr || userId == null) {
      console.error("DELETE /api/groups/:groupId user lookup error:", userErr);
      return res.status(401).json({ error: "User not found" });
    }

    const checkSql = "SELECT * FROM Social_Group WHERE group_id = ? AND creator_id = ?";

    db.query(checkSql, [groupId, userId], (err, rows) => {
      if (err) {
        console.error("Error checking group ownership:", err);
        return res.status(500).json({ error: "Failed to verify ownership" });
      }

      if (rows.length === 0) {
        return res.status(403).json({ error: "You don't have permission to delete this group" });
      }

      const deleteMembersSql = "DELETE FROM Group_Members WHERE group_id = ?";
      db.query(deleteMembersSql, [groupId], (err) => {
        if (err) {
          console.error("Error deleting group members:", err);
          return res.status(500).json({ error: "Failed to delete group members" });
        }

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

// ------------------------------POST/FEED APIs---------------------------------

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
          up.display_name AS author_name, up.avatar_url AS author_avatar,
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
      group_id: post.group_id,        
      group_name: post.group_name,
      is_anonymous: post.is_anonymous === 1,
      author_avatar: post.is_anonymous ? null : post.author_avatar,     
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
                p.created_at AS createdAt, up.display_name AS author_name, up.avatar_url AS author_avatar,
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
      group_id: post.group_id,       
      group_name: post.group_name,
      is_anonymous: post.is_anonymous === 1,
      author_avatar: post.is_anonymous ? null : post.author_avatar,

    }));

    if (formattedPosts.length === 0) {
      return res.json({ message: "No posts found for this tag.", posts: [] });
    }

    res.json({ posts: formattedPosts });
  });
});

// GET API for posts
app.get('/api/posts', checkAuth, async (req, res) => {
  const { filter, sort } = req.query
  let currentUserId; 
  try {
    currentUserId = await getNumericUserId(req.user.email);
  } catch (err) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Base where clause depending on filter
  const whereClause = filter === 'mygroups'
    ? `WHERE (
            p.group_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM Group_Members gm
                WHERE gm.group_id = p.group_id
                AND gm.user_id = ?
            )
          )`
    : `WHERE (
            p.group_id IS NULL
            OR sg.is_private = 0
          )`;

  // sort clause
  const orderClause = sort === 'likes'
    ? 'ORDER BY like_count DESC, p.post_id DESC'
    : sort ==='comments'
    ? 'ORDER BY comment_count DESC, p.post_id DESC'
    :'ORDER BY p.post_id DESC'; // default is most recent
  let sql = `
         SELECT p.post_id, p.title, p.content, p.author_id, p.group_id, sg.name AS group_name,
               p.is_anonymous, p.image_url, p.created_at AS createdAt,
               up.display_name AS author_name,up.avatar_url AS author_avatar,
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
        ${whereClause}
        GROUP BY p.post_id
        ${orderClause}
    `;

  db.query(sql, filter === 'mygroups' ? [currentUserId, currentUserId] : [currentUserId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error retrieving posts');
    }

    const formattedPosts = results.map(post => ({
      post_id: post.post_id,
      author_id: post.author_id,
      author_name: post.author_name ?? `User ${post.author_id}`,
      title: post.title,
      description: post.content,
      image_url: post.image_url,
      tags: post.tags ? post.tags.split(',') : [],
      createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
      like_count: post.like_count,
      liked_by_me: post.liked_by_me === 1,
      comment_count: post.comment_count ?? 0,
      group_id: post.group_id,
      group_name: post.group_name,
      is_anonymous: post.is_anonymous === 1,
      author_avatar: post.is_anonymous ? null : post.author_avatar,
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
      group_id: post.group_id,
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
               c.content, c.created_at AS createdAt,
               up.display_name AS author_name, up.avatar_url
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
      'SELECT display_name, avatar_url FROM User_Profiles WHERE user_id = ?',
      [currentUserId],
      (err2, profileRows) => {
        const author_name = profileRows?.[0]?.display_name ?? `User ${currentUserId}`;
        const avatar_url = profileRows?.[0]?.avatar_url ?? null;
        res.json({
          comment_id: result.insertId,
          post_id: parseInt(postId),
          user_id: currentUserId,
          author_name,
          avatar_url,
          parent_comment_id,
          content,
          createdAt: new Date().toISOString()
        });
      }
    );
  });
});

// DELETE /api/posts/:id - delete a post (only by author)
app.delete('/api/posts/:id', checkAuth, async (req, res) => {
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
app.put('/api/posts/:id', checkAuth, upload.single('image'), async (req, res) => {
  const postId = req.params.id;
  let { title, content, tags = [], group_id = null, is_anonymous = 0, remove_image = '0' } = req.body;

  // parse tags since they come as JSON string via FormData
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = []; }
  }

  //const image_url = req.file ? req.file.filename : null;
  let imageUpdateSql = '';
  let imageValue = undefined;

  if (req.file) {
    imageUpdateSql = ', image_url = ?';
    imageValue = req.file.filename;
  } else if (remove_image === '1') {
    imageUpdateSql = ', image_url = NULL';
  }

  let requestingUserId;
  try {
    requestingUserId = await getNumericUserId(req.user.email);
  } catch (err) {
    return res.status(404).json({ error: 'User not found' });
  }

  const checkSql = 'SELECT author_id FROM Posts WHERE post_id = ?';
  db.query(checkSql, [postId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error finding post' });
    if (results.length === 0) return res.status(404).json({ error: 'Post not found' });
    if (results[0].author_id !== requestingUserId) return res.status(403).json({ error: 'Not authorized' });

    // Only update image_url if a new image was uploaded
    const updateSql = `UPDATE Posts SET title = ?, content = ?, group_id = ?, is_anonymous = ?${imageUpdateSql} WHERE post_id = ?`;

    const updateParams = imageValue !== undefined
      ? [title, content, group_id || null, is_anonymous, imageValue, postId]
      : [title, content, group_id || null, is_anonymous, postId]

    db.query(updateSql, updateParams, (err) => {
      if (err) return res.status(500).json({ error: 'Error updating post' });

      const deleteTagsSql = 'DELETE FROM post_tags WHERE post_id = ?';
      db.query(deleteTagsSql, [postId], (err) => {
        if (err) return res.status(500).json({ error: 'Error updating tags' });

        if (tags.length === 0) {
          return res.json({
            post: { post_id: parseInt(postId), title, description: content, tags: [] },
            message: 'Post updated successfully'
          });
        }

        const tagSql = 'SELECT tag_id, tag_name FROM Tags WHERE tag_name IN (' + tags.map(() => '?').join(', ') + ')';
        db.query(tagSql, tags, (err, tagResults) => {
          if (err) return res.status(500).json({ error: 'Error finding tags' });

          const postTagData = tagResults.map(tag => [postId, tag.tag_id]);
          if (postTagData.length === 0) {
            return res.json({
              post: { post_id: parseInt(postId), title, description: content, tags: [] },
              message: 'Post updated successfully but no valid tags found'
            });
          }

          const postTagSql = 'INSERT INTO post_tags (post_id, tag_id) VALUES ?';
          db.query(postTagSql, [postTagData], (err) => {
            if (err) return res.status(500).json({ error: 'Error inserting tags' });
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
  const postId = req.params.id;
  let currentUserId; 
  try {
    currentUserId = await getNumericUserId(req.user.email);
  } catch (err) {
    return res.status(404).json({ error: 'User not found' });
  }

  const checkSql = 'SELECT like_id FROM Likes WHERE post_id = ? AND user_id = ?';
  db.query(checkSql, [postId, currentUserId], (err, results) => {
    if (err) {

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
        SELECT l.user_id, up.display_name, up.avatar_url
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

    const eventSql = `
      SELECT id, title
      FROM Events
      WHERE id = ?
      LIMIT 1
    `;

    db.query(eventSql, [eventId], (eventErr, eventRows) => {
      if (eventErr) {
        console.log("Like event lookup error:", eventErr);
        return res.status(500).json({ error: "Failed to load event." });
      }

      if (!eventRows || eventRows.length === 0) {
        return res.status(404).json({ error: "Event not found." });
      }

      const eventTitle = eventRows[0].title;

      const checkLikeSql = `
        SELECT id
        FROM Event_Likes
        WHERE event_id = ? AND user_id = ?
        LIMIT 1
      `;

      db.query(checkLikeSql, [eventId, currentUserId], (checkErr, likeRows) => {
        if (checkErr) {
          console.log("Check like status error:", checkErr);
          return res.status(500).json({ error: "Failed to check like status." });
        }

        if (likeRows.length > 0) {
          const deleteLikeSql = `
            DELETE FROM Event_Likes
            WHERE event_id = ? AND user_id = ?
          `;

          db.query(deleteLikeSql, [eventId, currentUserId], (deleteErr) => {
            if (deleteErr) {
              console.log("Unlike event error:", deleteErr);
              return res.status(500).json({ error: "Failed to unlike event." });
            }

            getCurrentLikeCount(eventId, (countErr, likeCount) => {
              if (countErr) {
                console.log("Reload like count error after unlike:", countErr);
                return res.status(500).json({
                  error: "Unliked event, but failed to reload like count.",
                });
              }

              return res.json({
                likes: likeCount,
                has_liked: 0,
                message: `You removed your like from "${eventTitle}".`,
              });
            });
          });
        } else {
          const insertLikeSql = `
            INSERT INTO Event_Likes (event_id, user_id)
            VALUES (?, ?)
          `;

          db.query(insertLikeSql, [eventId, currentUserId], (insertErr) => {
            if (insertErr) {
              console.log("Like event insert error:", insertErr);
              return res.status(500).json({ error: "Failed to like event." });
            }

            getCurrentLikeCount(eventId, (countErr, likeCount) => {
              if (countErr) {
                console.log("Reload like count error after like:", countErr);
                return res.status(500).json({
                  error: "Liked event, but failed to reload like count.",
                });
              }

              return res.json({
                likes: likeCount,
                has_liked: 1,
                message: `You liked "${eventTitle}".`,
              });
            });
          });
        }
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

  if (!keyword) {
    return res.status(400).json({ error: "Keyword is required." });
  }

  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

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
        ORDER BY likes DESC, e.published_time DESC
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
        COUNT(DISTINCT el.id) AS likes,
        e.category,
        e.event_type,
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
        (
          e.title LIKE ?
          OR e.category LIKE ?
          OR t.tag_name LIKE ?
        )
      AND e.event_type <> 'private'
      ${SQL_EXCLUDE_CALENDAR_PERSONAL_EVENT}
      GROUP BY
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.location,
        e.capacity,
        e.category,
        e.event_type,
        e.published_time
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

// Delete API route to delete a search history for the logged-in user
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

// Get API route for search suggestions in the event page.
app.get("/api/events/suggestions", checkAuth, (req, res) => {
  const keyword = String(req.query.keyword || "").trim();
  const tab = String(req.query.tab || "public").trim();
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  if (!keyword) {
    return res.json([]);
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("Suggestions user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const like = `%${keyword}%`;

    let accessCondition = `
      (
        e.event_type = 'public'
        OR (
          e.event_type = 'group'
          AND EXISTS (
            SELECT 1
            FROM Event_Groups eg2
            INNER JOIN Group_Members gm2
              ON gm2.group_id = eg2.group_id
            WHERE eg2.event_id = e.id
              AND gm2.user_id = ?
          )
        )
      )
    `;

    let params = [currentUserId];

    if (tab === "my-groups") {
      accessCondition = `
        (
          e.event_type = 'group'
          AND EXISTS (
            SELECT 1
            FROM Event_Groups eg2
            INNER JOIN Group_Members gm2
              ON gm2.group_id = eg2.group_id
            WHERE eg2.event_id = e.id
              AND gm2.user_id = ?
          )
        )
      `;
      params = [currentUserId];
    } else if (tab === "my-events") {
      accessCondition = `
        (
          (
            e.created_by = ?
            OR EXISTS (
              SELECT 1
              FROM Event_Attendees a2
              WHERE a2.event_id = e.id
                AND LOWER(a2.attendee_name) = ?
            )
          )
          AND
          (
            e.event_type IN ('public', 'private')
            OR (
              e.event_type = 'group'
              AND EXISTS (
                SELECT 1
                FROM Event_Groups eg2
                INNER JOIN Group_Members gm2
                  ON gm2.group_id = eg2.group_id
                WHERE eg2.event_id = e.id
                  AND gm2.user_id = ?
              )
            )
          )
        )
      `;
      params = [currentUserId, currentUserEmail, currentUserId];
    }

    const sql = `
      SELECT value, type
      FROM (
        SELECT DISTINCT e.title AS value, 'Title' AS type
        FROM Events e
        WHERE ${accessCondition}
          ${SQL_EXCLUDE_CALENDAR_PERSONAL_EVENT}
          AND e.title LIKE ?

        UNION

        SELECT DISTINCT e.category AS value, 'Category' AS type
        FROM Events e
        WHERE ${accessCondition}
          ${SQL_EXCLUDE_CALENDAR_PERSONAL_EVENT}
          AND e.category LIKE ?

        UNION

        SELECT DISTINCT t.tag_name AS value, 'Tag' AS type
        FROM Events e
        INNER JOIN Event_Tags t ON t.event_id = e.id
        WHERE ${accessCondition}
          ${SQL_EXCLUDE_CALENDAR_PERSONAL_EVENT}
          AND t.tag_name LIKE ?
      ) AS combined
      LIMIT 10
    `;

    const finalParams = [
      ...params, like,
      ...params, like,
      ...params, like,
    ];

    db.query(sql, finalParams, (err, rows) => {
      if (err) {
        console.log("Suggestions error:", err);
        return res.status(500).json({ error: "Failed to load suggestions." });
      }

      return res.json(rows);
    });
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

// GET /api/my-groups
// return all groups the current logged-in user has joined, if user is not in any groups, return message in frontend
app.get("/api/my-groups", checkAuth, (req, res) => {
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("GET /api/my-groups user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const sql = `
      SELECT 
        sg.group_id,
        sg.name
      FROM Group_Members gm
      JOIN Social_Group sg
        ON gm.group_id = sg.group_id
      WHERE gm.user_id = ?
      ORDER BY sg.name ASC
    `;

    db.query(sql, [currentUserId], (err, rows) => {
      if (err) {
        console.log("GET /api/my-groups error:", err);
        return res.status(500).json({ error: "Failed to load groups." });
      }

      return res.json({
        groups: rows,
      });
    });
  });
});

// GET /api/events/public
// Show public events and group events visible to this user.
// If includePast=false, only return events that have not ended yet.

app.get("/api/events/public", checkAuth, (req, res) => {
  const includePast = String(req.query.includePast).toLowerCase() === "true";
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("GET /api/events/public user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const pastClause = includePast
      ? ""
      : "AND NOW() <= TIMESTAMP(e.end_date, e.end_time)";

    const sql = `
      SELECT
        e.id,
        e.title,
        e.description,
        DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
        TIME_FORMAT(e.event_time, '%H:%i') AS event_time,
        DATE_FORMAT(e.end_date, '%Y-%m-%d') AS end_date,
        TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
        e.location,
        e.capacity,
        COUNT(DISTINCT el.id) AS likes,
        e.category,
        e.event_type,
        e.created_by,
        CASE
          WHEN e.created_by = ? THEN 1
          ELSE 0
        END AS is_owner,
        DATE_FORMAT(e.published_time, '%Y-%m-%d %H:%i') AS published_time,
        COUNT(
          DISTINCT CASE
            WHEN e.event_type = 'public' THEN a.id
            WHEN e.event_type = 'group'
              AND (
                LOWER(a.attendee_name) = LOWER(uc_creator.email)
                OR EXISTS (
                  SELECT 1
                  FROM User_Credentials uc_att
                  INNER JOIN Group_Members gm_att
                    ON gm_att.user_id = uc_att.user_id
                  INNER JOIN Event_Groups eg_att
                    ON eg_att.group_id = gm_att.group_id
                  WHERE eg_att.event_id = e.id
                    AND LOWER(uc_att.email) = LOWER(a.attendee_name)
                )
              )
            THEN a.id
            ELSE NULL
          END
        ) AS current_count,
        GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ',') AS tags,
        GROUP_CONCAT(DISTINCT eg.group_id ORDER BY eg.group_id SEPARATOR ',') AS group_ids,
        GROUP_CONCAT(DISTINCT sg.name ORDER BY sg.name SEPARATOR ',') AS group_names,
        CASE
          WHEN NOW() > TIMESTAMP(e.end_date, e.end_time) THEN 1
          ELSE 0
        END AS is_past,
        CASE
          WHEN NOW() < TIMESTAMP(e.event_date, e.event_time) THEN 'open_for_application'
          WHEN NOW() >= TIMESTAMP(e.event_date, e.event_time)
            AND NOW() <= TIMESTAMP(e.end_date, e.end_time) THEN 'in_progress'
          ELSE 'ended'
        END AS event_status,
        MAX(CASE WHEN LOWER(a.attendee_name) = ? THEN 1 ELSE 0 END) AS has_joined,
        MAX(CASE WHEN el.user_id = ? THEN 1 ELSE 0 END) AS has_liked
      FROM Events e
      LEFT JOIN Event_Attendees a
        ON a.event_id = e.id
      LEFT JOIN Event_Tags t
        ON t.event_id = e.id
      LEFT JOIN Event_Likes el
        ON el.event_id = e.id
      LEFT JOIN Event_Groups eg
        ON eg.event_id = e.id
      LEFT JOIN Social_Group sg
        ON sg.group_id = eg.group_id
      LEFT JOIN User_Credentials uc_creator
        ON uc_creator.user_id = e.created_by
      WHERE (
        e.event_type = 'public'
        OR (
          e.event_type = 'group'
          AND EXISTS (
            SELECT 1
            FROM Event_Groups eg2
            INNER JOIN Group_Members gm2
              ON gm2.group_id = eg2.group_id
            WHERE eg2.event_id = e.id
              AND gm2.user_id = ?
          )
        )
      )
      ${pastClause}
      GROUP BY
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.end_date,
        e.end_time,
        e.location,
        e.capacity,
        e.category,
        e.event_type,
        e.created_by,
        e.published_time,
        uc_creator.email
      ORDER BY e.event_date ASC, e.event_time ASC
    `;

    db.query(
      sql,
      [currentUserId, currentUserEmail, currentUserId, currentUserId],
      (err, rows) => {
        if (err) {
          console.log("GET /api/events/public error:", err);
          return res.status(500).json({ error: "Failed to load events." });
        }

        return res.json(rows);
      }
    );
  });
});

// GET /api/events/my-groups
// Show only group events linked to groups the current user joined.
// If includePast=false, only return events that have not ended yet.

app.get("/api/events/my-groups", checkAuth, (req, res) => {
  const includePast = String(req.query.includePast).toLowerCase() === "true";
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("GET /api/events/my-groups user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const pastClause = includePast
      ? ""
      : "AND NOW() <= TIMESTAMP(e.end_date, e.end_time)";

    const sql = `
      SELECT
        e.id,
        e.title,
        e.description,
        DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
        TIME_FORMAT(e.event_time, '%H:%i') AS event_time,
        DATE_FORMAT(e.end_date, '%Y-%m-%d') AS end_date,
        TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
        e.location,
        e.capacity,
        COUNT(DISTINCT el.id) AS likes,
        e.category,
        e.event_type,
        e.created_by,
        CASE
          WHEN e.created_by = ? THEN 1
          ELSE 0
        END AS is_owner,
        DATE_FORMAT(e.published_time, '%Y-%m-%d %H:%i') AS published_time,
        COUNT(
          DISTINCT CASE
            WHEN e.event_type = 'public' THEN a.id
            WHEN e.event_type = 'group'
              AND (
                LOWER(a.attendee_name) = LOWER(uc_creator.email)
                OR EXISTS (
                  SELECT 1
                  FROM User_Credentials uc_att
                  INNER JOIN Group_Members gm_att
                    ON gm_att.user_id = uc_att.user_id
                  INNER JOIN Event_Groups eg_att
                    ON eg_att.group_id = gm_att.group_id
                  WHERE eg_att.event_id = e.id
                    AND LOWER(uc_att.email) = LOWER(a.attendee_name)
                )
              )
            THEN a.id
            ELSE NULL
          END
        ) AS current_count,
        GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ',') AS tags,
        GROUP_CONCAT(DISTINCT eg.group_id ORDER BY eg.group_id SEPARATOR ',') AS group_ids,
        GROUP_CONCAT(DISTINCT sg.name ORDER BY sg.name SEPARATOR ',') AS group_names,
        CASE
          WHEN NOW() > TIMESTAMP(e.end_date, e.end_time) THEN 1
          ELSE 0
        END AS is_past,
        CASE
          WHEN NOW() < TIMESTAMP(e.event_date, e.event_time) THEN 'open_for_application'
          WHEN NOW() >= TIMESTAMP(e.event_date, e.event_time)
            AND NOW() <= TIMESTAMP(e.end_date, e.end_time) THEN 'in_progress'
          ELSE 'ended'
        END AS event_status,
        MAX(CASE WHEN LOWER(a.attendee_name) = ? THEN 1 ELSE 0 END) AS has_joined,
        MAX(CASE WHEN el.user_id = ? THEN 1 ELSE 0 END) AS has_liked
      FROM Events e
      INNER JOIN Event_Groups eg_filter
        ON eg_filter.event_id = e.id
      INNER JOIN Group_Members gm_filter
        ON gm_filter.group_id = eg_filter.group_id
      LEFT JOIN Event_Attendees a
        ON a.event_id = e.id
      LEFT JOIN Event_Tags t
        ON t.event_id = e.id
      LEFT JOIN Event_Likes el
        ON el.event_id = e.id
      LEFT JOIN Event_Groups eg
        ON eg.event_id = e.id
      LEFT JOIN Social_Group sg
        ON sg.group_id = eg.group_id
      LEFT JOIN User_Credentials uc_creator
        ON uc_creator.user_id = e.created_by
      WHERE gm_filter.user_id = ?
      ${pastClause}
      GROUP BY
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.end_date,
        e.end_time,
        e.location,
        e.capacity,
        e.category,
        e.event_type,
        e.created_by,
        e.published_time,
        uc_creator.email
      ORDER BY e.event_date ASC, e.event_time ASC
    `;

    db.query(
      sql,
      [currentUserId, currentUserEmail, currentUserId, currentUserId],
      (err, rows) => {
        if (err) {
          console.log("GET /api/events/my-groups error:", err);
          return res.status(500).json({ error: "Failed to load group events." });
        }

        return res.json(rows);
      }
    );
  });
});

// GET /api/events/my-events
// Show events the current user created or joined.
// If includePast=false, only return events that have not ended yet.

app.get("/api/events/my-events", checkAuth, (req, res) => {
  const includePast = String(req.query.includePast).toLowerCase() === "true";
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      console.log("GET /api/events/my-events user lookup error:", userErr);
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const pastClause = includePast
      ? ""
      : "AND NOW() <= TIMESTAMP(e.end_date, e.end_time)";

    const sql = `
      SELECT
        e.id,
        e.title,
        e.description,
        DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
        TIME_FORMAT(e.event_time, '%H:%i') AS event_time,
        DATE_FORMAT(e.end_date, '%Y-%m-%d') AS end_date,
        TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
        e.location,
        e.capacity,
        COUNT(DISTINCT el.id) AS likes,
        e.category,
        e.event_type,
        e.created_by,
        CASE
          WHEN e.created_by = ? THEN 1
          ELSE 0
        END AS is_owner,
        DATE_FORMAT(e.published_time, '%Y-%m-%d %H:%i') AS published_time,
        COUNT(
          DISTINCT CASE
            WHEN e.event_type IN ('public', 'private') THEN a.id
            WHEN e.event_type = 'group'
              AND (
                LOWER(a.attendee_name) = LOWER(uc_creator.email)
                OR EXISTS (
                  SELECT 1
                  FROM User_Credentials uc_att
                  INNER JOIN Group_Members gm_att
                    ON gm_att.user_id = uc_att.user_id
                  INNER JOIN Event_Groups eg_att
                    ON eg_att.group_id = gm_att.group_id
                  WHERE eg_att.event_id = e.id
                    AND LOWER(uc_att.email) = LOWER(a.attendee_name)
                )
              )
            THEN a.id
            ELSE NULL
          END
        ) AS current_count,
        GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ',') AS tags,
        GROUP_CONCAT(DISTINCT eg.group_id ORDER BY eg.group_id SEPARATOR ',') AS group_ids,
        GROUP_CONCAT(DISTINCT sg.name ORDER BY sg.name SEPARATOR ',') AS group_names,
        CASE
          WHEN NOW() > TIMESTAMP(e.end_date, e.end_time) THEN 1
          ELSE 0
        END AS is_past,
        CASE
          WHEN NOW() < TIMESTAMP(e.event_date, e.event_time) THEN 'open_for_application'
          WHEN NOW() >= TIMESTAMP(e.event_date, e.event_time)
            AND NOW() <= TIMESTAMP(e.end_date, e.end_time) THEN 'in_progress'
          ELSE 'ended'
        END AS event_status,
        MAX(CASE WHEN LOWER(a.attendee_name) = ? THEN 1 ELSE 0 END) AS has_joined,
        MAX(CASE WHEN el.user_id = ? THEN 1 ELSE 0 END) AS has_liked
      FROM Events e
      LEFT JOIN Event_Attendees a
        ON a.event_id = e.id
      LEFT JOIN Event_Tags t
        ON t.event_id = e.id
      LEFT JOIN Event_Likes el
        ON el.event_id = e.id
      LEFT JOIN Event_Groups eg
        ON eg.event_id = e.id
      LEFT JOIN Social_Group sg
        ON sg.group_id = eg.group_id
      LEFT JOIN User_Credentials uc_creator
        ON uc_creator.user_id = e.created_by
      WHERE
        (
          e.created_by = ?
          OR EXISTS (
            SELECT 1
            FROM Event_Attendees a2
            WHERE a2.event_id = e.id
              AND LOWER(a2.attendee_name) = ?
          )
        )
        AND
        (
          e.event_type IN ('public', 'private')
          OR (
            e.event_type = 'group'
            AND EXISTS (
              SELECT 1
              FROM Event_Groups eg2
              INNER JOIN Group_Members gm2
                ON gm2.group_id = eg2.group_id
              WHERE eg2.event_id = e.id
                AND gm2.user_id = ?
            )
          )
        )
        ${pastClause}
      GROUP BY
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.end_date,
        e.end_time,
        e.location,
        e.capacity,
        e.category,
        e.event_type,
        e.created_by,
        e.published_time,
        uc_creator.email
      ORDER BY e.event_date ASC, e.event_time ASC
    `;

    db.query(
      sql,
      [
        currentUserId,
        currentUserEmail,
        currentUserId,
        currentUserId,
        currentUserEmail,
        currentUserId,
      ],
      (err, rows) => {
        if (err) {
          console.log("GET /api/events/my-events error:", err);
          return res.status(500).json({ error: "Failed to load your events." });
        }

        return res.json(rows);
      }
    );
  });
});

// notifications
app.get('/api/notifications', checkAuth, async (req, res) => {
    try {
        const currentUserId = await getNumericUserId(req.user.email);
        
        const sql = `
            SELECT * FROM Notifications 
            WHERE recipient_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50`;

        db.query(sql, [currentUserId], (err, rows) => {
            if (err) return res.status(500).json({ error: "Failed to fetch notifications" });
            res.json(rows);
        });
    } catch (err) {
        res.status(404).json({ error: "User not found" });
    }
});

app.put('/api/notifications/read-all', checkAuth, async (req, res) => {
    try {
        const currentUserId = await getNumericUserId(req.user.email);
        const sql = "UPDATE Notifications SET is_read = 1 WHERE recipient_id = ?";
        
        db.query(sql, [currentUserId], (err) => {
            if (err) return res.status(500).json({ error: "Update failed" });
            res.json({ message: "All notifications marked as read" });
        });
    } catch (err) {
        res.status(404).json({ error: "User not found" });
    }
});

app.get('/api/notifications/unread-count', checkAuth, async (req, res) => {
  try {
    const currentUserId = await getNumericUserId(req.user.email);
    const sql = "SELECT COUNT(*) as unreadCount FROM Notifications WHERE recipient_id = ? AND is_read = 0";
    
    db.query(sql, [currentUserId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ unreadCount: results[0].unreadCount });
    });
  } catch (err) {
    res.status(404).json({ error: "User not found" });
  }
});

app.delete('/api/notifications/:id', (req, res) => {
  const notificationId = req.params.id;

  const query = 'DELETE FROM Notifications WHERE id = ?';

  db.query(query, [notificationId], (err, result) => {
    if (err) {
      console.error('Error deleting notification:', err);
      return res.status(500).json({ error: 'Database deletion failed' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({ message: 'Deleted successfully' });
  });
});

// PUT /api/events/:id
// This API allows the event creator to update or re-edit an existing event’s information,
// including details like title, time, location, capacity, tags, event type, and group settings
app.put("/api/events/:id", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  const { title, description, event_date, event_time, end_date, end_time, location, capacity, category, tags, event_type, group_ids } =
    req.body;

  if (!title || !description || !event_date || !event_time || !end_date || !end_time || !location || capacity === undefined || !category) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const startDateOnly = new Date(`${event_date}T00:00`);
  const endDateOnly = new Date(`${end_date}T00:00`);

  if (
    Number.isNaN(startDateOnly.getTime()) ||
    Number.isNaN(endDateOnly.getTime())
  ) {
    return res.status(400).json({ error: "Invalid start date or end date." });
  }

  if (endDateOnly < startDateOnly) {
    return res.status(400).json({
      error: "End date must be later than or equal to start date.",
    });
  }

  const startDateTime = new Date(`${event_date}T${event_time}`);
  const endDateTime = new Date(`${end_date}T${end_time}`);

  if (
    Number.isNaN(startDateTime.getTime()) ||
    Number.isNaN(endDateTime.getTime())
  ) {
    return res.status(400).json({ error: "Invalid event date or time." });
  }

  if (event_date === end_date && endDateTime <= startDateTime) {
    return res.status(400).json({
      error: "If end date is the same as start date, end time must be later than start time.",
    });
  }

  if (endDateTime <= startDateTime) {
    return res.status(400).json({
      error: "End date and end time must be later than start date and start time.",
    });
  }

  const capNum = Number(capacity);
  if (!Number.isInteger(capNum) || capNum < 2) {
    return res.status(400).json({
      error: "Max RSVP spots must be an integer greater than or equal to 2.",
    });
  }

  const rawPutEvtType = String(event_type || "public").trim().toLowerCase();
  const safeEventType =
    rawPutEvtType === "group" ? "group" : rawPutEvtType === "private" ? "private" : "public";

  const safeTags = Array.isArray(tags) ? tags : [];

  const safeGroupIds = Array.isArray(group_ids)
    ? [
        ...new Set(
          group_ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        ),
      ]
    : [];

  if (safeEventType === "group" && safeGroupIds.length === 0) {
    return res.status(400).json({
      error: "Please select at least one group for a group event.",
    });
  }

  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const ownerSql = `
      SELECT id, created_by
      FROM Events
      WHERE id = ?
      LIMIT 1
    `;

    db.query(ownerSql, [eventId], (ownerErr, ownerRows) => {
      if (ownerErr) {
        console.log("PUT /api/events/:id owner lookup error:", ownerErr);
        return res.status(500).json({ error: "Failed to load event." });
      }

      if (!ownerRows || ownerRows.length === 0) {
        return res.status(404).json({ error: "Event not found." });
      }

      if (Number(ownerRows[0].created_by) !== Number(currentUserId)) {
        return res.status(403).json({
          error: "Only the user who created this event can edit it.",
        });
      }

      const verifyGroups = (done) => {
        if (safeEventType !== "group") {
          return done(null);
        }

        const placeholders = safeGroupIds.map(() => "?").join(", ");
        const verifyGroupsSql = `
          SELECT DISTINCT gm.group_id
          FROM Group_Members gm
          WHERE gm.user_id = ?
            AND gm.group_id IN (${placeholders})
        `;

        db.query(
          verifyGroupsSql,
          [currentUserId, ...safeGroupIds],
          (verifyErr, verifyRows) => {
            if (verifyErr) {
              return done(new Error("Failed to verify selected groups."));
            }

            const verifiedGroupIds = (verifyRows || []).map((row) =>
              Number(row.group_id)
            );

            if (verifiedGroupIds.length !== safeGroupIds.length) {
              return done(
                new Error("You can only create a group event for groups you have joined.")
              );
            }

            return done(null);
          }
        );
      };

      const attendeeCountSql = `
        SELECT COUNT(*) AS current_count
        FROM Event_Attendees
        WHERE event_id = ?
      `;

      db.query(attendeeCountSql, [eventId], (countErr, countRows) => {
        if (countErr) {
          return res.status(500).json({ error: "Failed to check attendee count." });
        }

        const attendeeCount = Number(countRows[0]?.current_count || 0);

        if (capNum < attendeeCount) {
          return res.status(400).json({
            error: `Max RSVP spots cannot be smaller than the current attendee count of ${attendeeCount}.`,
          });
        }

        verifyGroups((verifyError) => {
          if (verifyError) {
            return res.status(403).json({ error: verifyError.message });
          }

          db.beginTransaction((txErr) => {
            if (txErr) {
              return res.status(500).json({ error: "Failed to start update transaction." });
            }

            const rollbackWithError = (message, errObj = null) => {
              return db.rollback(() => {
                if (errObj) {
                  console.log(message, errObj);
                }
                return res.status(500).json({ error: message });
              });
            };

            const updateEventSql = `
              UPDATE Events
              SET
                title = ?,
                description = ?,
                event_date = ?,
                event_time = ?,
                end_date = ?,
                end_time = ?,
                location = ?,
                capacity = ?,
                category = ?,
                event_type = ?
              WHERE id = ?
            `;

            db.query(
              updateEventSql,
              [
                title,
                description,
                event_date,
                event_time,
                end_date,
                end_time,
                location,
                capNum,
                category,
                safeEventType,
                eventId,
              ],
              (updateErr) => {
                if (updateErr) {
                  return rollbackWithError("Failed to update event.", updateErr);
                }

                db.query(
                  `DELETE FROM Event_Tags WHERE event_id = ?`,
                  [eventId],
                  (deleteTagsErr) => {
                    if (deleteTagsErr) {
                      return rollbackWithError("Failed to update tags.", deleteTagsErr);
                    }

                    const uniqueTags = [
                      ...new Set(
                        safeTags.map((tag) => String(tag).trim()).filter(Boolean)
                      ),
                    ];

                    const insertTags = (done) => {
                      if (uniqueTags.length === 0) {
                        return done(null);
                      }

                      const tagValues = uniqueTags.map((tag) => [eventId, tag]);
                      const insertTagsSql = `
                        INSERT INTO Event_Tags (event_id, tag_name)
                        VALUES ?
                      `;

                      db.query(insertTagsSql, [tagValues], (tagErr) => {
                        if (tagErr) {
                          return done(tagErr);
                        }

                        return done(null);
                      });
                    };

                    insertTags((insertTagsErr) => {
                      if (insertTagsErr) {
                        return rollbackWithError("Failed to update tags.", insertTagsErr);
                      }

                      db.query(
                        `DELETE FROM Event_Groups WHERE event_id = ?`,
                        [eventId],
                        (deleteGroupsErr) => {
                          if (deleteGroupsErr) {
                            return rollbackWithError(
                              "Failed to update selected groups.",
                              deleteGroupsErr
                            );
                          }

                          const insertGroups = (done) => {
                            if (safeEventType !== "group" || safeGroupIds.length === 0) {
                              return done(null);
                            }

                            const groupValues = safeGroupIds.map((groupId) => [
                              eventId,
                              groupId,
                            ]);

                            const insertGroupsSql = `
                              INSERT INTO Event_Groups (event_id, group_id)
                              VALUES ?
                            `;

                            db.query(insertGroupsSql, [groupValues], (groupErr) => {
                              if (groupErr) {
                                return done(groupErr);
                              }

                              return done(null);
                            });
                          };

                          insertGroups((insertGroupsErr) => {
                            if (insertGroupsErr) {
                              return rollbackWithError(
                                "Failed to update selected groups.",
                                insertGroupsErr
                              );
                            }

                            const updateAttendeesForPrivateEvent = (done) => {
                              if (safeEventType !== "group" || safeGroupIds.length === 0) {
                                return done(null);
                              }

                              const placeholders = safeGroupIds.map(() => "?").join(", ");

                              const deleteNonMemberAttendeesSql = `
                                DELETE ea
                                FROM Event_Attendees ea
                                INNER JOIN Events e
                                  ON e.id = ea.event_id
                                LEFT JOIN User_Credentials uc_creator
                                  ON uc_creator.user_id = e.created_by
                                WHERE ea.event_id = ?
                                  AND LOWER(ea.attendee_name) <> LOWER(uc_creator.email)
                                  AND LOWER(ea.attendee_name) NOT IN (
                                    SELECT LOWER(uc.email)
                                    FROM Group_Members gm
                                    INNER JOIN User_Credentials uc
                                      ON uc.user_id = gm.user_id
                                    WHERE gm.group_id IN (${placeholders})
                                  )
                              `;

                              db.query(
                                deleteNonMemberAttendeesSql,
                                [eventId, ...safeGroupIds],
                                (attendeeDeleteErr) => {
                                  if (attendeeDeleteErr) {
                                    return done(attendeeDeleteErr);
                                  }

                                  return done(null);
                                }
                              );
                            };

                            updateAttendeesForPrivateEvent((attendeeDeleteErr) => {
                              if (attendeeDeleteErr) {
                                return rollbackWithError(
                                  "Failed to update attendees for the private event.",
                                  attendeeDeleteErr
                                );
                              }

                              db.commit((commitErr) => {
                                if (commitErr) {
                                  return rollbackWithError(
                                    "Failed to save event changes.",
                                    commitErr
                                  );
                                }

                                return res.json({
                                  message: "Event updated successfully.",
                                });
                              });
                            });
                          });
                        }
                      );
                    });
                  }
                );
              }
            );
          });
        });
      });
    });
  });
});

// DELETE /api/events/:id
// This API allows the event creator to delete an event and remove all related data,
// such as attendees, tags, likes, and group associations from the database
app.delete("/api/events/:id", checkAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const currentUserEmail = String(req.user.email || "").trim().toLowerCase();

  if (!eventId) {
    return res.status(400).json({ error: "Invalid event id." });
  }

  if (!currentUserEmail) {
    return res.status(401).json({ error: "Authenticated user email not found." });
  }

  getCurrentUserIdByEmail(currentUserEmail, (userErr, currentUserId) => {
    if (userErr) {
      return res.status(500).json({ error: "Failed to identify current user." });
    }

    const eventSql = `
      SELECT id, title, created_by
      FROM Events
      WHERE id = ?
      LIMIT 1
    `;

    db.query(eventSql, [eventId], (eventErr, eventRows) => {
      if (eventErr) {
        console.log("DELETE /api/events/:id lookup error:", eventErr);
        return res.status(500).json({ error: "Failed to load event." });
      }

      if (!eventRows || eventRows.length === 0) {
        return res.status(404).json({ error: "Event not found." });
      }

      const event = eventRows[0];

      if (Number(event.created_by) !== Number(currentUserId)) {
        return res.status(403).json({
          error: "Only the user who created this event can delete it.",
        });
      }

      db.beginTransaction((txErr) => {
        if (txErr) {
          return res.status(500).json({ error: "Failed to start delete transaction." });
        }

        const rollbackWithError = (message, errObj = null) => {
          return db.rollback(() => {
            if (errObj) {
              console.log(message, errObj);
            }
            return res.status(500).json({ error: message });
          });
        };

        db.query(
          `DELETE FROM Event_Attendees WHERE event_id = ?`,
          [eventId],
          (attendeeErr) => {
            if (attendeeErr) {
              return rollbackWithError("Failed to delete event attendees.", attendeeErr);
            }

            db.query(
              `DELETE FROM Event_Tags WHERE event_id = ?`,
              [eventId],
              (tagErr) => {
                if (tagErr) {
                  return rollbackWithError("Failed to delete event tags.", tagErr);
                }

                db.query(
                  `DELETE FROM Event_Likes WHERE event_id = ?`,
                  [eventId],
                  (likeErr) => {
                    if (likeErr) {
                      return rollbackWithError("Failed to delete event likes.", likeErr);
                    }

                    db.query(
                      `DELETE FROM Event_Groups WHERE event_id = ?`,
                      [eventId],
                      (groupErr) => {
                        if (groupErr) {
                          return rollbackWithError(
                            "Failed to delete event groups.",
                            groupErr
                          );
                        }

                        db.query(
                          `DELETE FROM Events WHERE id = ?`,
                          [eventId],
                          (deleteEventErr) => {
                            if (deleteEventErr) {
                              return rollbackWithError(
                                "Failed to delete event.",
                                deleteEventErr
                              );
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return rollbackWithError(
                                  "Failed to finish deleting the event.",
                                  commitErr
                                );
                              }

                              return res.json({
                                message: `The event "${event.title}" was deleted successfully.`,
                              });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});

app.listen(port, () => console.log(`Listening on port ${port}`)); 
