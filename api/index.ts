const express = require("express");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const app = express();
const port = 1000;

// Middleware Setup - Allowing CORS for all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handling preflight requests (OPTIONS)
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

interface UploadedFile {
  fileName: string;
  mimeType: string;
  data: Buffer;
}

let uploadedFiles: UploadedFile[] = [];
// Route to handle file uploads (binary files) using memory storage
app.post("/uploadFile", upload.single("asprise_scans"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }
  uploadedFiles.push({
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    data: req.file.buffer.toString("base64"), 
  });

  const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

  // Send back a successful response with the file URL
  res.json({
    success: true,
    message: "File uploaded successfully",
    fileUrl: fileUrl,
  });
});

// Send uploaded file info
app.get("/uploadedFiles", (req, res) => {
  if (uploadedFiles.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No files uploaded yet",
    });
  }

  res.json({
    success: true,
    uploadedFiles: uploadedFiles,
  });
});

// Default route to serve the test page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "components", "test.html"));
});
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "components", "upload.html"));
});
app.get("/uploaded", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "components", "viewUploads.html"));
});
// Start the server
app.listen(port, () => {
  // if (process.env.NODE_ENV === "production") {
    console.log(`Server running at http://localhost:${port}`);
  // }
});

module.exports = app;

//data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCE