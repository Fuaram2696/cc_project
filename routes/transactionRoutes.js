const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/issue', authenticateToken, transactionController.issueBook);
router.post('/return', authenticateToken, authorizeRoles('Admin', 'Librarian'), transactionController.returnBook);
router.get('/my-history', authenticateToken, transactionController.getUserTransactions);
router.get('/all', authenticateToken, authorizeRoles('Admin', 'Librarian'), transactionController.getAllTransactions);
router.get('/activity', authenticateToken, authorizeRoles('Admin', 'Librarian'), transactionController.getActivityLogs);

module.exports = router;
