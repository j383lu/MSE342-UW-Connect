import express from "express";
import mysql from "mysql";
import config from "./config.js";

const router = express.Router();

// GET /api/profile
router.get("/", (req, res) => {
  const connection = mysql.createConnection(config);

  const userId = 1; // temp test user until login exists

  // 1) Profile + Program name
  const profileSql = `
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

  console.log("Executing SQL:", profileSql, "userId:", userId);

  connection.query(profileSql, [userId], (error, profileResults) => {
    if (error) {
      console.error("Database error:", error.message);
      connection.end();
      return res.status(500).json({ error: "Failed to fetch profile" });
    }

    if (!profileResults || profileResults.length === 0) {
      connection.end();
      return res.status(404).json({ error: "Profile not found" });
    }
    const profileRow = profileResults[0];

    connection.end();
    return res.json({
        name: profileRow.display_name,
        program: profileRow.program_name || "",
        bio: profileRow.bio || "",
        courses: [],
    });
  });
});

export default router;