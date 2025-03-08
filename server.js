

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const authRoutes = require("./routes/auth");
const resumeRoutes = require("./routes/resumes");
const db = require("./config/database");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");


const app = express();
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const corsOptions = {
  origin: '*', // Allow requests from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
// API route to provide the ngrok URL to the frontend


async function getNgrokUrl() {
  try {
    console.log("Checking ngrok status...");
    const response = await axios.get("  http://127.0.0.1:4040/api/tunnels", { timeout: 2000 });
  
    console.log("Ngrok API response:", response.data); 
    const httpsUrl = response.data.tunnels.find(tunnel => tunnel.proto === "https");

    if (httpsUrl) {
  
      console.log("Using ngrok URL:", httpsUrl.public_url);
      return httpsUrl.public_url;
    } 
}catch (error) {
    console.log("Ngrok not running, using local URL");
  }
  return "http://localhost:3000"; 
}

app.get("/api/ngrok-url", async (req, res) => {
  const ngrokUrl = await getNgrokUrl();
  res.json({ ngrokUrl });
});
//file upoad setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
      cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
  
});
const upload = multer({ storage });

const uploadPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); 

//app.use(upload.single("profileImage")); 
// Routes
app.use("/api/auth", authRoutes);

app.post('/generate-qr', async (req, res) => {
  try {
      const { qrData, resumeId } = req.body; 
      console.log("data: ", req.body);
      if (!resumeId) {
        return res.status(400).json({ message: "resumeId is missing!" });
    }
// Get data from the frontend
      const qrCodeImage = await QRCode.toDataURL(qrData); // Generate QR Code as Base64
      const baseUrl = await getNgrokUrl();
      const qrCodeUrl = `${baseUrl}/resume/${resumeId}`; 

      const qrCodePath = path.join(__dirname, 'public/uploads', `qrcode-${resumeId}.png`);
      fs.writeFileSync(qrCodePath, qrCodeImage.split(',')[1], 'base64');

      await db.query(
        `UPDATE resumes SET qr_code_url = ? WHERE id = ?`,
        [qrCodeUrl, resumeId]
      );
  
      res.status(200).json({
          message: 'QR Code generated successfully!',
          qrCodeUrl,
          resumeId , // URL for frontend to access
      });
  } catch (error) {
      console.error('Error generating QR Code:', error);
      res.status(500).json({ error: 'Failed to generate QR Code' });
  }
});

app.post("/api/store-qr", async (req, res) => {
  try {
    const { userId, videoUrl, certificateUrls, qrCodeImage } = req.body;

    if (!userId || !videoUrl || !certificateUrls || !qrCodeImage) {
      return res.status(400).json({ message: "Missing required fields" });
    }
   
    const [result] = await db.query(
      "INSERT INTO qr_codes (resume_id, video_url, certificate_urls, qr_code_url, qr_code_image) VALUES (?,?, ?, ?, ?)",
      [userId, videoUrl, JSON.stringify(certificateUrls), qrCodeImage]
    );

    res.json({ success: true, qrId: result.insertId });
  } catch (error) {
    console.error("Error storing QR code:", error);
    res.status(500).json({ message: "Error storing QR code data" });
  }
});


// Route to upload files and generate QR code
app.post( "/uploads",
  upload.fields([{ name: "video", maxCount: 1 }, { name: "certificates", maxCount: 10 }]),
  async (req, res) => {
    try {
     console.log("qr upload method");
      // const ngrokUrl = await getNgrokUrl();
      const baseUrl = await getNgrokUrl(); 
      const video = req.files["video"]?.[0];
      const certificates = req.files["certificates"] || [];
      const resumeId = req.body.resumeId;
      
      if (!video || certificates.length === 0) {
        return res.status(400).json({ message: "Please upload both video and certificates." });
      }

      const videoUrl = `${baseUrl}/uploads/${video.filename}`;
      const certificateUrls = certificates.map(file => `${baseUrl}/uploads/${file.filename}`);
      const qrUrl = `${baseUrl}/qr-view?video=${encodeURIComponent(videoUrl)}&certs=${encodeURIComponent(JSON.stringify(certificateUrls))}`; // Debugging
      
      const qrCodeImage = await QRCode.toDataURL(qrUrl); // ✅ Generates a scannable QR code
      
 


      // Save QR code to file
      const qrCodeFileName = `qr-${Date.now()}.png`;
      const qrCodePath = path.join(__dirname, "public/uploads", qrCodeFileName);
      fs.writeFileSync(qrCodePath, qrCodeImage.split(",")[1], "base64");
      const qrCodeUrl = `${baseUrl}/uploads/${qrCodeFileName}`;
      // Store in database
      //const qr_code_url = generateQRCodeUrl(filePath);
    
      const [result] = await db.query(
        "INSERT INTO qr_codes (resume_id,video_url, certificate_urls, qr_code_url,qr_code_image) VALUES (?,?,?,?,?)",
        [    resumeId,videoUrl,
           JSON.stringify(certificateUrls), qrCodeUrl,  qrCodeUrl]
      ); 

      res.json({
        message: "Files uploaded successfully!",
        videoUrl,
        certificateUrls,
        qrCode:qrCodeUrl,
        qrId: result.insertId,
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Error uploading files." });
    }
  }
);
// Route to retrieve the latest QR code data for a user
app.get("/api/get-qr/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const [rows] = await db.query(
      "SELECT * FROM qr_codes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No QR code found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error retrieving QR code:", error);
    res.status(500).json({ message: "Error retrieving QR code data" });
  }
});





app.use(express.static(path.join(__dirname, "public")));
app.get('/qr-view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr-view.html'));
});
// Use other routes after file upload handling
app.use("/api/resumes", resumeRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "INTERFACE_trial.html"));
});

app.get("/landing2", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "INTERFACE2Trial.html"));
});

// Serve template files
app.get("/resume/:id", (req, res) => {
  const templateId = req.query.template || 1;
  res.sendFile(
    path.join(__dirname, "public", "templates", `template${templateId}.html`)
  );
});

// Serve download page
app.get("/download", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "FINAL_PAGE.html"));
});

// Serve index page (login)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "claudeP1.html"));
});

// Serve signup page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// Handle other routes
app.get("/templates", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "AFTER_INTERFACE1.html"));
});

app.get("/personal-info", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "AFTER_INTERFACE2.html"));
});

app.get("/experience", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "AFTER_INTERFACE3.html"));
});

app.get("/education", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "education-page.html"));
});
app.get("/qrcode", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "qrcodegenerate.html"));
});

app.get("/review", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "review_trials.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Something went wrong!" });
});

const PORT = process.env.PORT || 3000;



async function startServer() {
  try {
    await db.getConnection();
    console.log("Database connected successfully");

    // Wait for ngrok to start
    const ngrokUrl = await getNgrokUrl();
    console.log(`Server ngrok is running on ${ngrokUrl}`);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} (Accessible at: ${ngrokUrl})`);
    });
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }
}

startServer();
