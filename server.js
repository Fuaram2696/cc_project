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

app.get('/', (req, res) => {
  res.send('Library Management System API Running...');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
