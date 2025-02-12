const express = require("express");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const app = express();
const port = 1000;

// Middleware Setup - Allowing CORS for all origins
app.use(
  cors({
    origin: (origin, callback) => {
      if (origin === "https://asprise.com" || !origin) {
        callback(null, true);
      } else {
        // Reject any other origin
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,  // Important for cookies
  })
);

// Handling preflight requests (OPTIONS)
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.status(200).end();
});

// JSON parsing middleware
app.use(express.json());

// Static folder for serving components
app.use(express.static(path.join(__dirname, "..", "components")));

// Use memory storage for Multer (in-memory storage instead of disk storage)
const storage = multer.memoryStorage(); // Store files in memory

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Maximum file size of 10MB
});

// Store the uploaded image in memory
let uploadedImage = { data: null, mimeType: "", fileName: "" };

// Route to retrieve the uploaded image
app.get("/image", (req, res) => {
  console.log(uploadedImage.data);
  if (!uploadedImage.data) {
    return res
      .status(404)
      .json({ success: false, message: "No image uploaded or image expired" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.set("Content-Type", uploadedImage.mimeType);
  const imageBuffer = Buffer.from(uploadedImage.data, "base64");
  res.send(imageBuffer);
});

// Route to handle file uploads (binary files) using memory storage
app.post("/uploadFile", upload.single("asprise_scans"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  // Convert the uploaded file to a base64 string
  const base64File = req.file.buffer.toString("base64");

  // Construct the file URL
  const fileUrl = `data:${req.file.mimetype};base64,${base64File}`;

  // Set the fileUrl in the cookie after successful upload
  res.cookie('fileUrl', fileUrl, {
    httpOnly: true,   // Prevent client-side JS access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    maxAge: 3600000,   // 1 hour expiration time for the cookie
  });

  // Send back a successful response with the file URL
  res.json({
    success: true,
    message: "File uploaded successfully",
    fileUrl: fileUrl,
  });
});


// Send uploaded file info
// app.get("/getUploadedFile", (req, res) => {
//   if (!file) {
//     return res
//       .status(404)
//       .json({ success: false, message: "No image uploaded or image expired" });
//   }

//   res.json({
//     success: true,
//   });
// });

// Default route to serve the test page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "components", "test.html"));
});
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "components", "upload.html"));
});

// Start the server
app.listen(port, () => {
  // if (process.env.NODE_ENV === "production") {
    console.log(`Server running at http://localhost:${port}`);
  // }
});

module.exports = app;

//data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCE
