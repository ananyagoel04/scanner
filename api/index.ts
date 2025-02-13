const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const app = express();
const port = 1000;
const https = require("https");
const http = require("http");

interface UploadedFile {
  fileName: string;
  mimeType: string;
  fileId: string;
  filePath: string;
  uploadTime: number;
}

const metadataFilePath = '/tmp/uploadedFiles.json'; 

let uploadedFiles: UploadedFile[] = [];
if (fs.existsSync(metadataFilePath)) {
  uploadedFiles = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
}

const uploadDir = '/tmp/uploads'; 

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer to store files on disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // Max file size 10MB

// Enable CORS for all origins
app.use(cors()); // Allow all origins by default

// Route to handle file uploads
app.post("/uploadFile", upload.single("asprise_scans"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  // Generate a unique file ID for the uploaded file
  const fileId = Date.now().toString();

  // Log the file data before storing
  const fileData = {
    fileId: fileId,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    filePath: req.file.path, // Store the path of the file on disk
    uploadTime: Date.now(),  // Store the time when the file was uploaded
  };

  // Store the file's metadata (in-memory and also write to the JSON file)
  uploadedFiles.push(fileData);

  // Write the updated metadata to the JSON file
  fs.writeFileSync(metadataFilePath, JSON.stringify(uploadedFiles, null, 2));

  res.json({
    success: true,
    message: "File uploaded successfully",
    fileId: fileId,  // Send fileId to retrieve it later
  });
});

// Route to get the list of uploaded files (metadata)
app.get("/getUploadedFiles", (req, res) => {
  const fileMetadata = uploadedFiles.map(file => ({
    fileId: file.fileId,
    fileName: file.fileName,
    mimeType: file.mimeType
  }));
  res.json({
    success: true,
    files: fileMetadata,
  });
});

// Route to retrieve the uploaded file based on fileId
app.get("/getFile", (req, res) => {
  const fileId = req.query.id;

  const file = uploadedFiles.find(f => f.fileId === fileId);
  
  if (!file) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  fs.readFile(file.filePath, (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error reading file" });
    }

    res.setHeader("Content-Type", file.mimeType);  // Set the correct MIME type
    res.send(data);
  });
});

// Route to handle proxy requests
app.get("/proxy", (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ success: false, message: "No URL provided" });
  }

  const decodedUrl = decodeURIComponent(targetUrl);

  const client = decodedUrl.startsWith("https") ? https : http;

  client.get(decodedUrl, (response) => {
    const contentLength = response.headers["content-length"];
    
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    } else {
      res.setHeader("Transfer-Encoding", "chunked");
    }

    res.setHeader("Content-Type", response.headers["content-type"]);
    response.pipe(res);
  }).on("error", (err) => {
    console.error("Error fetching the file:", err);
    res.status(500).json({ success: false, message: `Error fetching the file: ${err.message}` });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
