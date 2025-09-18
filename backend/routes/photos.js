const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/photos');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use SID from request body or filename without extension
    const sid = req.body.sid || path.parse(file.originalname).name;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${sid}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload single photo
router.post('/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No photo file provided' 
      });
    }

    const { sid } = req.body;
    if (!sid) {
      return res.status(400).json({ 
        success: false, 
        message: 'SID is required' 
      });
    }

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        sid: sid,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: `/uploads/photos/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Photo upload failed',
      error: error.message 
    });
  }
});

// Upload multiple photos
router.post('/upload-multiple', upload.array('photos', 50), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No photo files provided' 
      });
    }

    const results = req.files.map(file => {
      const sid = path.parse(file.originalname).name;
      return {
        sid: sid,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        path: `/uploads/photos/${file.filename}`,
        success: true
      };
    });

    res.json({
      success: true,
      message: `${results.length} photos uploaded successfully`,
      data: results
    });
  } catch (error) {
    console.error('Multiple photo upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Photo upload failed',
      error: error.message 
    });
  }
});

// Get photo by SID
router.get('/:sid', (req, res) => {
  try {
    const { sid } = req.params;
    const photoPath = path.join(__dirname, '../uploads/photos', `${sid}.jpg`);
    
    if (fs.existsSync(photoPath)) {
      res.sendFile(photoPath);
    } else {
      // Try other extensions
      const extensions = ['.png', '.jpeg', '.webp'];
      let found = false;
      
      for (const ext of extensions) {
        const altPath = path.join(__dirname, '../uploads/photos', `${sid}${ext}`);
        if (fs.existsSync(altPath)) {
          res.sendFile(altPath);
          found = true;
          break;
        }
      }
      
      if (!found) {
        res.status(404).json({ 
          success: false, 
          message: 'Photo not found' 
        });
      }
    }
  } catch (error) {
    console.error('Photo retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Photo retrieval failed',
      error: error.message 
    });
  }
});

// Delete photo by SID
router.delete('/:sid', (req, res) => {
  try {
    const { sid } = req.params;
    const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
    let deleted = false;
    
    for (const ext of extensions) {
      const photoPath = path.join(__dirname, '../uploads/photos', `${sid}${ext}`);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
        deleted = true;
        break;
      }
    }
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Photo deleted successfully'
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Photo not found' 
      });
    }
  } catch (error) {
    console.error('Photo deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Photo deletion failed',
      error: error.message 
    });
  }
});

// List all photos
router.get('/', (req, res) => {
  try {
    const photosDir = path.join(__dirname, '../uploads/photos');
    
    if (!fs.existsSync(photosDir)) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const files = fs.readdirSync(photosDir);
    const photos = files
      .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .map(file => {
        const stats = fs.statSync(path.join(photosDir, file));
        return {
          filename: file,
          sid: path.parse(file).name,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });
    
    res.json({
      success: true,
      data: photos
    });
  } catch (error) {
    console.error('Photo listing error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Photo listing failed',
      error: error.message 
    });
  }
});

module.exports = router;

