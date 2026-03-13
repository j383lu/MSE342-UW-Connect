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

  const profileSql = `
    SELECT
      up.profile_id,
      up.user_id,
      up.display_name,
      up.bio,
      up.avatar_url,
      up.updated_at,
      up.program_id,
      up.department,
      up.gender,
      up.birthday,
      up.phone_number,
      p.program_name,
      uc.role
    FROM User_Profiles up
    LEFT JOIN Programs p ON p.program_id = up.program_id
    LEFT JOIN User_Credentials uc ON uc.user_id = up.user_id
    WHERE up.user_id = ?
    LIMIT 1;
  `;

  console.log("Executing SQL:", profileSql, "userId:", TEMP_USER_ID);

  connection.query(profileSql, [TEMP_USER_ID], (error, results) => {
    if (error) {
      connection.end();
      console.error("Database error:", error.message);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }

    if (!results || results.length === 0) {
      connection.end();
      return res.status(404).json({ error: "Profile not found" });
    }

    const row = results[0];

    const coursesSql = `
      SELECT upc.course_id
      FROM User_Profile_Courses upc
      JOIN User_Profiles up ON up.profile_id = upc.profile_id
      WHERE up.user_id = ?
      ORDER BY upc.course_id ASC;
    `;

    connection.query(coursesSql, [TEMP_USER_ID], (coursesError, courseResults) => {
      connection.end();

      if (coursesError) {
        console.error("Database error:", coursesError.message);
        return res.status(500).json({ error: "Failed to fetch profile courses" });
      }

      return res.json({
        name: row.display_name || "",
        bio: row.bio || "",
        role: row.role || "",
        department: row.department || "",
        gender: row.gender || "",
        birthday: row.birthday || null,
        phone_number: row.phone_number || "",
        program_id: row.program_id ?? null,
        program_name: row.program_name || "",
        program: row.program_name || "",
        courses: (courseResults || []).map((course) => course.course_id),
      });
    });
  });
});

// ------------------------------------
// GET /api/profile/programs
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
    SELECT course_id, course_code
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
// ------------------------------------
router.get("/user-courses", (req, res) => {
  const connection = mysql.createConnection(config);

  const sql = `
    SELECT c.course_id, c.course_code
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

  const { name, bio, gender, birthday, phone_number, program_id, courses } = req.body;

  console.log("=== PUT /api/profile called ===");
  console.log("Body received:", {
    name,
    bio,
    gender,
    birthday,
    program_id,
    courses,
  });
  console.log("Courses type:", Array.isArray(courses) ? "array" : typeof courses);
  console.log("Courses value:", courses);

  if (!name || typeof name !== "string" || !name.trim()) {
    connection.end();
    return res.status(400).json({ error: "Display name is required." });
  }

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
      gender = ?,
      birthday = ?,
      phone_number = ?,
      program_id = ?,
      updated_at = NOW()
    WHERE user_id = ?;
  `;

  const updateData = [
    name.trim(),
    bio ?? "",
    gender ?? "",
    birthday || null,
    phone_number?.trim() || "",
    programIdValue,
    TEMP_USER_ID,
  ];

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

      const delSql = `DELETE FROM User_Profile_Courses WHERE profile_id = ?`;
      connection.query(delSql, [profileId], (delErr) => {
        if (delErr) {
          console.error("Failed to delete courses:", delErr.message);
          connection.end();
          return res.json({ ok: true });
        }

        console.log("Deleted old course links for profile_id:", profileId);

        if (!Array.isArray(courses) || courses.length === 0) {
          console.log("No courses to insert");
          connection.end();
          return res.json({
            ok: true,
            name: name.trim(),
            bio: bio ?? "",
            gender: gender ?? "",
            phone_number: phone_number?.trim() || "",
            birthday: birthday || null,
            program_id: programIdValue,
            program_name: "",
            program: "",
            courses: [],
          });
        }

        console.log("Inserting", courses.length, "courses for profile_id:", profileId);
        const insertSql = `INSERT INTO User_Profile_Courses (profile_id, course_id) VALUES ?`;
        const values = courses.map((cid) => [profileId, Number(cid)]);
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
            gender: gender ?? "",
            phone_number: phone_number?.trim() || "",
            birthday: birthday || null,
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

// GET /api/profile/programs/:programId/students
router.get("/programs/:programId/students", (req, res) => {
  const connection = mysql.createConnection(config);

  const programId = Number(req.params.programId);

  if (!programId) {
    connection.end();
    return res.status(400).json({ error: "Invalid program id" });
  }

  const sql = `
    SELECT
      up.user_id,
      up.profile_id,
      up.display_name,
      up.bio,
      up.program_id,
      p.program_name,
      uc.role,
      c.course_id,
      c.course_code
    FROM User_Profiles up
    JOIN Programs p ON p.program_id = up.program_id
    JOIN User_Credentials uc ON uc.user_id = up.user_id
    LEFT JOIN User_Profile_Courses upc ON upc.profile_id = up.profile_id
    LEFT JOIN Courses c ON c.course_id = upc.course_id
    WHERE up.program_id = ?
    ORDER BY up.display_name ASC, c.course_code ASC;
  `;

  console.log("Fetching students for program:", programId);

  connection.query(sql, [programId], (error, results) => {
    connection.end();

    if (error) {
      console.error("Database error:", error.message);
      return res.status(500).json({ error: "Failed to fetch program students" });
    }

    if (!results || results.length === 0) {
      return res.json({
        program_name: "",
        students: [],
      });
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
        studentsMap.get(row.user_id).courses.push({
          course_id: row.course_id,
          course_code: row.course_code,
        });
      }
    });

    return res.json({
      program_name: results[0]?.program_name || "",
      students: Array.from(studentsMap.values()),
    });
  });
});

// GET /api/profile/search-users
// Search users by name or return all users
router.get("/search-users", (req, res) => {
  const connection = mysql.createConnection(config);

  const query = req.query.query?.trim() || "";

  let sql;
  let params = [];

  if (query) {
    sql = `
      SELECT
        up.user_id,
        up.display_name,
        up.bio,
        up.department,
        p.program_name,
        uc.role
      FROM User_Profiles up
      LEFT JOIN Programs p ON p.program_id = up.program_id
      LEFT JOIN User_Credentials uc ON uc.user_id = up.user_id
      WHERE up.display_name LIKE ?
      ORDER BY up.display_name ASC;
    `;

    params = [`%${query}%`];
  } else {
    sql = `
      SELECT
        up.user_id,
        up.display_name,
        up.bio,
        up.department,
        p.program_name,
        uc.role
      FROM User_Profiles up
      LEFT JOIN Programs p ON p.program_id = up.program_id
      LEFT JOIN User_Credentials uc ON uc.user_id = up.user_id
      ORDER BY up.display_name ASC;
    `;
  }

  console.log("Executing user search:", sql, "params:", params);

  connection.query(sql, params, (error, results) => {
    connection.end();

    if (error) {
      console.error("Database error:", error.message);
      return res.status(500).json({ error: "Failed to search users" });
    }

    return res.json({
      users: results || [],
    });
  });
});

export default router;