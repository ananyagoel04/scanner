const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 6790;

// Middleware Setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON parsing middleware
app.use(express.json({ limit: '50mb' }));

// Static folder for serving components
app.use(express.static(path.join(__dirname, 'components')));

// Define the type of the body for the uploadImage route
interface ImageUploadBody {
  image: string; // base64 encoded image string
  mimeType: string; // e.g., 'image/jpeg'
  fileName: string; // e.g., 'image.jpg'
}

// Store the uploaded image in memory (in this example)
let uploadedImage: { data: string; mimeType: string; fileName: string } | null = null;

// Route to upload image
app.post('/uploadImage', (req, res) => {
  const { image, mimeType, fileName } = req.body as ImageUploadBody; // Type assertion here

  // Check if the image is provided
  if (!image) {
    return res.status(400).json({ success: false, message: 'No image data provided' });
  }

  // Save the uploaded image
  uploadedImage = {
    data: image,
    mimeType: mimeType,
    fileName: fileName
  };

  // Send back a successful response
  res.json({
    success: true,
    message: 'Image uploaded successfully',
    fileName: fileName,
    mimeType: mimeType,
    imageUrl: '/image', // URL to access the image
  });
});

// Route to retrieve the uploaded image
app.get('/image', (req, res) => {
  if (!uploadedImage) {
    return res.status(404).json({ success: false, message: 'No image uploaded' });
  }

  // Set the content type and send the image data as a buffer
  res.set('Content-Type', uploadedImage.mimeType);
  const imageBuffer = Buffer.from(uploadedImage.data, 'base64');
  res.send(imageBuffer);
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