const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  getPublicContent,
  getGallery,
  getFeaturedImage,
  getLandingStats,
  uploadImage,
  updateContent,
  updateImage,
  replaceImage,
  deleteImage,
  bulkDeleteImages,
  getAllImages
} = require('../controllers/landingPageController');
const { auth, authorize } = require('../middleware/auth');

const landingUploadsDir = path.join(__dirname, '..', 'uploads', 'landing');
if (!fs.existsSync(landingUploadsDir)) {
  fs.mkdirSync(landingUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, landingUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WEBP, and GIF files are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

router.get('/content', getPublicContent);
router.get('/gallery', getGallery);
router.get('/images/featured', getFeaturedImage);
router.get('/stats', getLandingStats);

router.post('/upload', auth, authorize('admin'), upload.single('image'), uploadImage);
router.put('/content', auth, authorize('admin'), updateContent);
router.get('/admin/images', auth, authorize('admin'), getAllImages);
router.put('/images/:id', auth, authorize('admin'), updateImage);
router.put('/images/:id/replace', auth, authorize('admin'), upload.single('image'), replaceImage);
router.delete('/images/:id', auth, authorize('admin'), deleteImage);
router.post('/images/bulk-delete', auth, authorize('admin'), bulkDeleteImages);

module.exports = router;
