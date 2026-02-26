import express from "express";
import mysql from "mysql";
import config from "./config.js";

const router = express.Router();

// TEMP test user until login exists
const TEMP_USER_ID = 1;

// ------------------------------------
// GET /api/profile
// ------------------------------------
router.get("/", (req, res) => {
  const connection = mysql.createConnection(config);

  const sql = `
    SELECT
      up.profile_id,
      up.user_id,
      up.display_name,
      up.bio,
      up.avatar_url,
      up.updated_at,
      up.program_id,
      p.program_name
    FROM User_Profiles up
    LEFT JOIN Programs p ON p.program_id = up.program_id
    WHERE up.user_id = ?
    LIMIT 1;
  `;

  console.log("Executing SQL:", sql, "userId:", TEMP_USER_ID);

  connection.query(sql, [TEMP_USER_ID], (error, results) => {
    connection.end();

    if (error) {
      console.error("Database error:", error.message);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const row = results[0];

    // Return both id + name (best for dropdown + saving)
    return res.json({
      name: row.display_name || "",
      bio: row.bio || "",
      program_id: row.program_id ?? null,
      program_name: row.program_name || "",
      // optional: keep old key so your current frontend doesn't break
      program: row.program_name || "",
      courses: [],
    });
  });
});

// ------------------------------------
// GET /api/profile/programs
// (dropdown options)
// ------------------------------------
router.get("/programs", (req, res) => {
  const connection = mysql.createConnection(config);

  const sql = `
    SELECT program_id, program_name
    FROM Programs
    ORDER BY program_name ASC;
  `;

  console.log("Executing SQL:", sql);

  connection.query(sql, (error, results) => {
    connection.end();

    if (error) {
      console.error("Database error:", error.message);
      return res.status(500).json({ error: "Failed to fetch programs" });
    }

    // results already in the shape you want:
    // [{ program_id, program_name }, ...]
    return res.json(results);
  });
});

// ------------------------------------
// PUT /api/profile
// (update profile info)
// ------------------------------------
router.put("/", (req, res) => {
  const connection = mysql.createConnection(config);

  const { name, bio, program_id } = req.body;

  // Minimal validation (frontend validates name too)
  if (!name || typeof name !== "string" || !name.trim()) {
    connection.end();
    return res.status(400).json({ error: "Display name is required." });
  }

  // program_id is now required
  const programIdValue = Number(program_id);
  if (!program_id || Number.isNaN(programIdValue) || programIdValue <= 0) {
    connection.end();
    return res.status(400).json({ error: "Program is required." });
  }

  const updateSql = `
    UPDATE User_Profiles
    SET
      display_name = ?,
      bio = ?,
      program_id = ?,
      updated_at = NOW()
    WHERE user_id = ?;
  `;

  const updateData = [name.trim(), bio ?? "", programIdValue, TEMP_USER_ID];

  console.log("Executing SQL:", updateSql, "data:", updateData);

  connection.query(updateSql, updateData, (error, result) => {
    if (error) {
      console.error("Database error:", error.message);
      connection.end();
      return res.status(500).json({ error: "Failed to save profile" });
    }

    if (!result || result.affectedRows === 0) {
      connection.end();
      return res.status(404).json({ error: "Profile not found" });
    }

    // Return updated profile (handy for frontend)
    const selectSql = `
      SELECT
        up.user_id,
        up.display_name,
        up.bio,
        up.program_id,
        p.program_name
      FROM User_Profiles up
      LEFT JOIN Programs p ON p.program_id = up.program_id
      WHERE up.user_id = ?
      LIMIT 1;
    `;

    connection.query(selectSql, [TEMP_USER_ID], (error2, rows) => {
      connection.end();

      if (error2) {
        console.error("Database error:", error2.message);
        return res.json({ ok: true });
      }

      const r = rows?.[0];

      return res.json({
        ok: true,
        name: r?.display_name ?? "",
        bio: r?.bio ?? "",
        program_id: r?.program_id ?? null,
        program_name: r?.program_name ?? "",
        program: r?.program_name ?? "",
        courses: [],
      });
    });
  });
});

export default router;