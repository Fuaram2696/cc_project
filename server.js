const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const { initDB } = require('./models/schema');
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const cron = require('node-cron');
const db = require('./config/db');
const { sendEmail } = require('./utils/emailService');

const app = express();

// --- Static File Serving (PaaS Requirement) ---
app.use(express.static('.')); 

// --- Security as a Service ---
app.use(helmet()); 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: "Too many requests, please try again later."
});
app.use(limiter);
// Allow all origins for the Vercel frontend
app.use(cors({
  origin: true, // Allows any origin
  credentials: true
}));
app.use(express.json());

// --- Storage as a Service (Cloudinary Config) ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Environment Variables
const PORT = process.env.PORT || 5000;

// Initialize Database
initDB();

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/analytics', analyticsRoutes);

// --- Cron Jobs ---
// Run every day at 8:00 AM to send due date reminders
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Running daily due date reminder check...');
  try {
    const result = await db.query(`
      SELECT t.id, t.due_date, u.email, u.username, b.title 
      FROM transactions t 
      JOIN users u ON t.user_id = u.id 
      JOIN books b ON t.book_id = b.id 
      WHERE t.status = 'Issued' 
      AND DATE(t.due_date) = CURRENT_DATE + INTERVAL '1 day'
    `);

    result.rows.forEach(row => {
      if (row.email) {
        sendEmail(
          row.email,
          `Reminder: Book Due Tomorrow - ${row.title}`,
          `Hi ${row.username},\n\nThis is a gentle reminder that the book "${row.title}" is due tomorrow (${new Date(row.due_date).toDateString()}). Please return it to avoid late fines (₹5/day).\n\nThank you!`
        );
      }
    });
  } catch (err) {
    console.error('❌ Error running cron job:', err);
  }
});

app.get('/', (req, res) => {
  res.send('Library Management System API Running...');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
