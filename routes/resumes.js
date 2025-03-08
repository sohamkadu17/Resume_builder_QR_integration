const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const db = require("../config/database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    cb(null, allowedTypes.includes(file.mimetype));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Create a new resume
router.post("/v1", upload.single("profile_image"), async (req, res) => {
  var data = req.body;
  // console.log("data: ", data["personal_info"]);
  // console.log("request file: ", req);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const parsedPersonalInfo = JSON.parse(data.personal_info);

    // Insert into resumes table
    const [resumeResult] = await connection.query(
      "INSERT INTO resumes (user_id, template_id ) VALUES (?, ?)",
      [1, data.template_id || "Default"]
    );
    const resumeId = resumeResult.insertId;//adding for saving different resume_id
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : 'piyu';


    await connection.query(
      `INSERT INTO personal_info (
                resume_id, first_name, last_name, email, 
                phone, address, summary, photo_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resumeId ,
      
        parsedPersonalInfo.first_name,
        parsedPersonalInfo.last_name,
        parsedPersonalInfo.email,
        parsedPersonalInfo.phone,
        parsedPersonalInfo.address,
        parsedPersonalInfo.summary,
       photoUrl,
      
      ]
    );

    await connection.commit();
    res.json({ id: resumeId, message: "Resume created successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("Error creating resume:", err);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error("Error deleting uploaded file:", unlinkErr);
      }
    }
    res.status(500).json({
      message: "Failed to create resume",
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

// Update resume (Experience and Education)
router.put("/:id", auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const resumeId = req.params.id;

    // Update Experience
    if (req.body.experience) {



      const experienceValues = req.body.experience.map((exp) => [
        resumeId,
        exp.company || null,
        (job_title = exp.position || null),
        exp.start_date || null,
        exp.end_date || null,
        exp.description || null,
      ]);

      if (experienceValues.length > 0) {
        await connection.query(
          `INSERT INTO experience 
                    (resume_id, company, job_title, start_date, end_date, description) 
                    VALUES ?`,
          [experienceValues]
        );
      }
    }

    // Update Education
    if (req.body.education)
       {
        console.log("educatiion saving ");
   //   await connection.query("DELETE FROM education WHERE resume_id = ?", [
   //     resumeId,
   //   ]);
//
      const educationValues = req.body.education.map((edu) => [
        resumeId,
        edu.institution || null,
        edu.degree || null,
        edu.field || null,
        edu.graduation_date || null,
        edu.description || null,
      ]);

      if (educationValues.length > 0) {
        await connection.query(
          `INSERT INTO education 
                    (resume_id, institution, degree, field, graduation_date, description) 
                    VALUES ?`,
          [educationValues]
        );
      }
    }

    await connection.commit();
    res.json({ message: "Resume updated successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("Error updating resume:", err);
    res.status(500).json({
     // message: "Failed to update resume",
      error: err.message,
    });
  } finally {
    connection.release();
  }
});
// Generate QR Code and Save Data
router.post("/generate-qr", async (req, res) => {
  const connection = await db.getConnection();
  try {
      const { qrData } = req.body; // QR data received from frontend
      const parsedData = JSON.parse(qrData);
      const resumeId = parsedData.resumeId;

      // // Example QR code generation logic (replace with actual logic)
      // const qrCodeUrl = `/uploads/qrcodes/resume-${resumeId}.png`;
      const qrCodeUrl = `${baseUrl}/uploads/qrcode-${resumeId}.png`;

      // Save QR Code URL to database
      await connection.query(
          `UPDATE resumes SET qr_code_url = ? WHERE id = ?`,
          [qrCodeUrl, resumeId]
      );

      res.json({ qrCodeUrl });
  } catch (err) {
      console.error("Error generating QR code:", err);
      res.status(500).json({ message: "Failed to generate QR code" });
  } finally {
      connection.release();
  }
});
router.get("/:id", async (req, res) => {
  const connection = await db.getConnection();
try {
  // Get resume basic info
  const resumes = await connection.query(
      "SELECT * FROM resumes WHERE id = ?",
      [req.params.id]
  );
  console.log("test",resumes);
  if (resumes.length === 0) {
      return res.status(404).json({ message: "Resume not found" });
  }

  // Get personal info
  const [personalInfo] = await connection.query(
      "SELECT * FROM personal_info WHERE resume_id = ?",
      [req.params.id]
  );

  // Get experience
  const [experience] = await connection.query(
      "SELECT * FROM experience WHERE resume_id = ?",
      [req.params.id]
  );

  // Get education
  const [education] = await connection.query(
      "SELECT * FROM education WHERE resume_id = ?",
      [req.params.id]
  );

  // Construct response object
  const response = {
      resume: resumes[0],
      personal_info: personalInfo[0] || null,
      experience: experience || [],
      education: education || [],
      qr_code_url: resumes[0].qr_code_url || null
  };

  res.json(response);
} catch (err) {
  console.error("Error fetching resume:", err);
  res.status(500).json({ 
      message: "Failed to fetch resume data",
      error: err.message 
  });
} finally {
  connection.release();
}
});


// Delete a resume
router.delete("/:id", auth, async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM resumes WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Resume not found" });
    res.json({ message: "Resume deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
