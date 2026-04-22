const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Config for PaaS/Storage as a Service
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'library_assets',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
    resource_type: 'auto', // Add this to prevent Cloudinary from parsing PDFs as images
  },
});
const upload = multer({ storage: storage });

// Routes
router.get('/', bookController.getBooks);
router.get('/autocomplete', bookController.getAutocomplete);
router.get('/recommendations', authenticateToken, bookController.getRecommendations);
router.get('/:id/qrcode', authenticateToken, bookController.getQRCode);
router.post('/reserve', authenticateToken, bookController.reserveBook);

router.post(
  '/add', 
  authenticateToken, 
  authorizeRoles('Admin', 'Librarian'), 
  upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), 
  bookController.addBook
);

router.delete('/:id', authenticateToken, authorizeRoles('Admin'), bookController.deleteBook);

module.exports = router;
