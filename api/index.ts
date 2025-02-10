const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const app = express();
const port = 4000;

// Middleware Setup - Allowing CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handling preflight requests (OPTIONS)
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
});

// JSON parsing middleware
app.use(express.json());

// Static folder for serving components
app.use(express.static(path.join(__dirname, '..', 'components')));

// Use memory storage for Multer (in-memory storage instead of disk storage)
const storage = multer.memoryStorage(); // Store files in memory

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Maximum file size of 10MB
});

// Store the uploaded image in memory
let uploadedImage = { data: null, mimeType: '', fileName: '' };
let imageTimeout = null;

// Route to upload image (base64 encoded) via JSON
app.post('/uploadImage', (req, res) => {
    const { image, mimeType, fileName } = req.body;

    // Check if the image exists
    if (!image || !image.trim()) {
        return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    // Save the uploaded image in memory
    uploadedImage = { data: image, mimeType: mimeType, fileName: fileName };

    // Set a timeout to delete the image after 5 minutes (300000 ms)
    if (imageTimeout) {
        clearTimeout(imageTimeout);  // Clear any previous timeout if a new image is uploaded
    }

    imageTimeout = setTimeout(() => {
        uploadedImage = { data: null, mimeType: '', fileName: '' };
    }, 300000);  // 5 minutes in milliseconds

    // Send back a successful response with the image URL
    res.json({
        success: true,
        message: 'Image uploaded successfully',
        fileName: fileName,
        mimeType: mimeType,
        imageUrl: '/image',
    });
});

// Route to retrieve the uploaded image
app.get('/image', (req, res) => {
  console.log(uploadedImage.data);
    if (!uploadedImage.data) {
        return res.status(404).json({ success: false, message: 'No image uploaded or image expired' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', uploadedImage.mimeType);
    const imageBuffer = Buffer.from(uploadedImage.data, 'base64');
    res.send(imageBuffer);
});

// Route to handle file uploads (binary files) using memory storage
app.post('/uploadFile', upload.single('asprise_scans'), (req, res) => {
    console.log('Incoming file:', req.file);
  if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // Send back a successful response with the file URL
  res.json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl: `/uploads/${req.file.filename}`,
  });
});


// Send uploaded file info
app.get('/getUploadedFile', (req, res) => {
  if (!uploadedImage.data) {
      return res.status(404).json({ success: false, message: 'No image uploaded or image expired' });
  }

  res.json({
      success: true,
      fileUrl: `/uploads/${uploadedImage.fileName}`,
      mimeType: uploadedImage.mimeType
  });
});


// Default route to serve the test page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'components', 'test.html'));
});

// Start the server
app.listen(port, () => {
    if (process.env.NODE_ENV === 'production') {
        console.log(`Server running at http://localhost:${port}`);
    }
});

module.exports = app;



//data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCE