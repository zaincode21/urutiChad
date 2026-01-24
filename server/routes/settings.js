const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/settings');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and ICO files
    if (file.mimetype.startsWith('image/') || file.originalname.endsWith('.ico')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files and ICO files are allowed'), false);
    }
  }
});

// Ensure uploads directory exists
const ensureUploadDir = async () => {
  const uploadPath = path.join(__dirname, '../../uploads/settings');
  try {
    await fs.mkdir(uploadPath, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
};

// Initialize upload directory
ensureUploadDir();

// Default appearance settings
const defaultAppearanceSettings = {
  theme: 'light',
  primaryColor: '#3B82F6',
  secondaryColor: '#6B7280',
  accentColor: '#10B981',
  fontFamily: 'Inter',
  fontSize: 'medium',
  borderRadius: 'medium',
  logo: null,
  companyName: 'Your Company',
  companyDescription: 'Professional business solutions',
  favicon: null,
  customCSS: ''
};

// GET /api/settings/appearance - Get appearance settings
router.get('/appearance', async (req, res) => {
  try {
    // For now, return default settings
    // In a real implementation, you would fetch from database
    res.json(defaultAppearanceSettings);
  } catch (error) {
    console.error('Error fetching appearance settings:', error);
    res.status(500).json({ error: 'Failed to fetch appearance settings' });
  }
});

// PUT /api/settings/appearance - Update appearance settings
router.put('/appearance', async (req, res) => {
  try {
    const settings = req.body;
    
    // Validate required fields
    if (!settings.companyName || !settings.companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Validate color formats
    const colorRegex = /^#[0-9A-F]{6}$/i;
    if (!colorRegex.test(settings.primaryColor)) {
      return res.status(400).json({ error: 'Primary color must be a valid hex color' });
    }
    if (!colorRegex.test(settings.secondaryColor)) {
      return res.status(400).json({ error: 'Secondary color must be a valid hex color' });
    }
    if (!colorRegex.test(settings.accentColor)) {
      return res.status(400).json({ error: 'Accent color must be a valid hex color' });
    }
    
    // In a real implementation, you would save to database
    console.log('Appearance settings updated:', settings);
    
    res.json({ 
      message: 'Appearance settings updated successfully',
      settings: settings 
    });
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    res.status(500).json({ error: 'Failed to update appearance settings' });
  }
});

// POST /api/settings/upload-asset - Upload logo or favicon
router.post('/upload-asset', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { type } = req.body;
    if (!type || !['logo', 'favicon'].includes(type)) {
      return res.status(400).json({ error: 'Invalid asset type. Must be "logo" or "favicon"' });
    }
    
    // Generate URL for the uploaded file
    const fileUrl = `/uploads/settings/${req.file.filename}`;
    
    res.json({
      message: `${type} uploaded successfully`,
      url: fileUrl,
      filename: req.file.filename,
      type: type
    });
  } catch (error) {
    console.error('Error uploading asset:', error);
    res.status(500).json({ error: 'Failed to upload asset' });
  }
});

// DELETE /api/settings/asset/:filename - Delete uploaded asset
router.delete('/asset/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads/settings', filename);
    
    try {
      await fs.unlink(filePath);
      res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: 'File not found' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// GET /api/settings/system - Get system settings
router.get('/system', async (req, res) => {
  try {
    // Return system information
    const systemInfo = {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };
    
    res.json(systemInfo);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// PUT /api/settings/system - Update system settings
router.put('/system', async (req, res) => {
  try {
    const settings = req.body;
    
    // In a real implementation, you would save to database
    console.log('System settings updated:', settings);
    
    res.json({ 
      message: 'System settings updated successfully',
      settings: settings 
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

module.exports = router;
