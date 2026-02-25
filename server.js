import mysql from "mysql";
import config from "./config.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

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

// -------------------- MySQL connection --------------------
const db = mysql.createConnection(config);

db.connect((err) => {
  if (err) {
    console.log("DB connection error:", err);
  } else {
    console.log("Connected to MySQL!");
  }
});

// -------------------- Events APIs --------------------

// GET /api/events (upcoming only, sorted)
app.get("/api/events", (req, res) => {
  const sql = `
    SELECT id, title, description, event_date, event_time, location, capacity
    FROM Events
    WHERE event_date >= CURDATE()
    ORDER BY event_date ASC, event_time ASC
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

  // required fields
  if (!title || !description || !event_date || !event_time || !location || capacity === undefined) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // capacity validation
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

app.listen(port, () => console.log(`Listening on port ${port}`)); //for the dev version
