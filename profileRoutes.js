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

    return res.json(results);
  });
});

// ------------------------------------
// GET /api/profile/courses
// ------------------------------------
router.get("/courses", (req, res) => {
  const connection = mysql.createConnection(config);

  const sql = `
    SELECT course_id, course_code, course_name
    FROM Courses
    ORDER BY course_code ASC;
  `;

  console.log("Executing SQL:", sql);

  connection.query(sql, (error, results) => {
    connection.end();

    if (error) {
      console.error("Database error:", error.message);
      return res.status(500).json({ error: "Failed to fetch courses" });
    }

    return res.json(results);
  });
});

// ------------------------------------
// GET /api/profile/user-courses
// (courses enrolled by current user)
// ------------------------------------
router.get("/user-courses", (req, res) => {
  const connection = mysql.createConnection(config);

  const sql = `
    SELECT c.course_id, c.course_code, c.course_name
    FROM User_Profile_Courses upc
    JOIN Courses c ON c.course_id = upc.course_id
    JOIN User_Profiles up ON up.profile_id = upc.profile_id
    WHERE up.user_id = ?
    ORDER BY c.course_code ASC;
  `;

  console.log("Executing SQL for user courses, userId:", TEMP_USER_ID);

  connection.query(sql, [TEMP_USER_ID], (error, results) => {
    connection.end();

    if (error) {
      console.error("Database error:", error.message);
      return res.status(500).json({ error: "Failed to fetch user courses" });
    }

    return res.json(results || []);
  });
});

// ------------------------------------
// PUT /api/profile
// ------------------------------------
router.put("/", (req, res) => {
  const connection = mysql.createConnection(config);

  const { name, bio, program_id, courses } = req.body; // courses is expected to be array of course_id

  console.log("=== PUT /api/profile called ===");
  console.log("Body received:", { name, bio, program_id, courses });
  console.log("Courses type:", Array.isArray(courses) ? "array" : typeof courses);
  console.log("Courses value:", courses);

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

    // Get profile_id for course updates
    const pidSql = `SELECT profile_id FROM User_Profiles WHERE user_id = ? LIMIT 1`;
    connection.query(pidSql, [TEMP_USER_ID], (pidErr, pidRows) => {
      if (pidErr) {
        console.error("Failed to fetch profile_id:", pidErr.message);
        connection.end();
        return res.json({ ok: true });
      }

      const profileId = pidRows?.[0]?.profile_id;
      if (!profileId) {
        console.error("Profile ID not found for user", TEMP_USER_ID);
        connection.end();
        return res.json({ ok: true });
      }

      console.log("Found profile_id:", profileId, "for user:", TEMP_USER_ID);

      // Delete existing course links
      const delSql = `DELETE FROM User_Profile_Courses WHERE profile_id = ?`;
      connection.query(delSql, [profileId], (delErr) => {
        if (delErr) {
          console.error("Failed to delete courses:", delErr.message);
          connection.end();
          return res.json({ ok: true });
        }

        console.log("Deleted old course links for profile_id:", profileId);

        // If no courses, we're done
        if (!Array.isArray(courses) || courses.length === 0) {
          console.log("No courses to insert");
          connection.end();
          return res.json({
            ok: true,
            name: name.trim(),
            bio: bio ?? "",
            program_id: programIdValue,
            program_name: "",
            program: "",
            courses: [],
          });
        }

        // Insert new course links
        console.log("Inserting", courses.length, "courses for profile_id:", profileId);
        const insertSql = `INSERT INTO User_Profile_Courses (profile_id, course_id) VALUES ?`;
        const values = courses.map(cid => [profileId, Number(cid)]);
        console.log("Insert values:", values);

        connection.query(insertSql, [values], (insertErr) => {
          if (insertErr) {
            console.error("Failed to insert courses:", insertErr.message);
          } else {
            console.log("Successfully inserted courses");
          }
          connection.end();
          return res.json({
            ok: true,
            name: name.trim(),
            bio: bio ?? "",
            program_id: programIdValue,
            program_name: "",
            program: "",
            courses: [],
          });
        });
      });
    });
  });
});

export default router;