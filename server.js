import mysql from 'mysql';
import config from './config.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, "client/build")));

// API Routes
// TODO: Implement the following endpoints:
// GET /api/movies - retrieve all movies from database  
// POST /api/reviews - create a new movie review

// MySQL connection
const db = mysql.createConnection(config);
db.connect((err) => {
  if (err) {
    console.log("DB connection error:", err);
  } else {
    console.log("Connected to MySQL!");
  }
});

// GET /api/events (upcoming only, sorted, formatted date time, includes current_count)
app.get("/api/events", (req, res) => {
  const sql = `
    SELECT 
      e.id,
      e.title,
      e.description,
      DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
      TIME_FORMAT(e.event_time, '%H:%i') AS event_time,
      e.location,
      e.capacity,
      COUNT(a.id) AS current_count
    FROM Events e
    LEFT JOIN Event_Attendees a ON a.event_id = e.id
    WHERE e.event_date >= CURDATE()
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

// POST /api/events/:id/join  (join now)
app.post("/api/events/:id/join", (req, res) => {
  const eventId = Number(req.params.id);
  const { attendee_name } = req.body;

  if (!eventId) return res.status(400).json({ error: "Invalid event id." });
  if (!attendee_name) return res.status(400).json({ error: "Missing attendee name." });

  // first check capacity
  const capacitySql = `
    SELECT e.capacity, COUNT(a.id) AS current_count
    FROM Events e
    LEFT JOIN Event_Attendees a ON a.event_id = e.id
    WHERE e.id = ?
    GROUP BY e.id
  `;

  db.query(capacitySql, [eventId], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(500).json({ error: "Failed to check capacity." });
    }

    const cap = Number(rows[0].capacity);
    const current = Number(rows[0].current_count);

    if (current >= cap) {
      return res.status(400).json({ error: "Event is full." });
    }

    // insert attendee
    const insertSql = `INSERT INTO Event_Attendees (event_id, attendee_name) VALUES (?, ?)`;
    db.query(insertSql, [eventId, attendee_name], (err2) => {
      if (err2) {
        console.log("join insert error:", err2);
        return res.status(500).json({ error: "Failed to join event." });
      }

      // return updated count
      const countSql = `SELECT COUNT(*) AS current_count FROM Event_Attendees WHERE event_id = ?`;
      db.query(countSql, [eventId], (err3, rows2) => {
        if (err3) return res.status(500).json({ error: "Joined but failed to reload count." });
        return res.json({ current_count: Number(rows2[0].current_count) });
      });
    });
  });
});

// GET /api/events/:id/attendees  (show details)
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

app.listen(port, () => console.log(`Listening on port ${port}`)); //for the dev version
