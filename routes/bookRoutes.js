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
    folder: 'library_covers',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage: storage });

// Routes
router.get('/', bookController.getBooks);
router.post('/add', authenticateToken, authorizeRoles('Admin', 'Librarian'), upload.single('image'), bookController.addBook);
router.delete('/:id', authenticateToken, authorizeRoles('Admin'), bookController.deleteBook);

module.exports = router;
