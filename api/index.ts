const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const app = express();
const port = 1000;

interface UploadedFile {
  fileName: string;
  mimeType: string;
  fileId: string;
  filePath: string;
  uploadTime: number;  // Store the upload time
}

const metadataFilePath = '/tmp/uploadedFiles.json'; // Path for storing file metadata

// Initialize uploadedFiles from the JSON file if it exists
let uploadedFiles: UploadedFile[] = [];

if (fs.existsSync(metadataFilePath)) {
  // Read existing file metadata from the JSON file
  uploadedFiles = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
}

// Use Vercel's temporary storage location
const uploadDir = '/tmp/uploads';  // Vercel's temporary storage location

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer to store files on disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Store files in the /tmp/uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename based on timestamp
  },
});

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // Max file size 10MB

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
  // Return the list of uploaded files (metadata)
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

  // Find the file in memory by fileId
  const file = uploadedFiles.find(f => f.fileId === fileId);
  
  if (!file) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  // Read the file from disk
  fs.readFile(file.filePath, (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error reading file" });
    }

    res.setHeader("Content-Type", file.mimeType);  // Set the correct MIME type
    res.send(data);
  });
});

// Function to clean up files that are older than a specific time (e.g., 1 hour)
const cleanUpOldFiles = () => {
  const now = Date.now();
  const expirationTime = 60 * 60 * 1000; // 1 hour in milliseconds
  
  uploadedFiles = uploadedFiles.filter((file) => {
    const fileAge = now - file.uploadTime;
    if (fileAge > expirationTime) {
      // Delete the file from disk if it's expired
      fs.unlinkSync(file.filePath);
      console.log(`Deleted expired file: ${file.fileName}`);
      return false;  // Remove from the list of uploaded files
    }
    return true;
  });

  // Save the updated list of files back to the metadata file
  fs.writeFileSync(metadataFilePath, JSON.stringify(uploadedFiles, null, 2));
};

// Set up the cleanup interval to run every hour
setInterval(cleanUpOldFiles, 60 * 60 * 1000);  // Every hour

// Default route for testing
app.get("/t", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "components", "test.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "components", "upload.html"));
});
app.get("/uploaded", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "components", "viewUploads.html"));
});
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
