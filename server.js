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
// Allow requests from Vercel frontend and local dev
const allowedOrigins = [
  process.env.FRONTEND_URL || "https://YOUR-APP-NAME.vercel.app",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
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
