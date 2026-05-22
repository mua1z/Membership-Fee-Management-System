// routes/importRoutes.js - Import Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { importMembers, getImportTemplate } = require('../controllers/importController');
const { auth, authorize, scopeSector } = require('../middleware/auth');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls, .csv) are allowed!'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.use(auth);
router.use(scopeSector);

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post('/', authorize('admin', 'operator', 'sector_officer'), upload.single('file'), importMembers);
router.get('/template', getImportTemplate);

module.exports = router;
