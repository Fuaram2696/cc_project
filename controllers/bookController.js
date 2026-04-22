const db = require('../config/db');
const QRCode = require('qrcode');

exports.getBooks = async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = 'SELECT * FROM books WHERE 1=1';
        let params = [];
        let paramCount = 1;

        if (search) {
            query += ` AND (title ILIKE $${paramCount} OR author ILIKE $${paramCount} OR category ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (category) {
            query += ` AND category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching books" });
    }
};

exports.addBook = async (req, res) => {
    try {
        const { title, author, category, isbn, description, total_copies } = req.body;
        const cover_url = req.files && req.files['cover'] ? req.files['cover'][0].path : null;
        const pdf_url = req.files && req.files['pdf'] ? req.files['pdf'][0].path : null;

        const result = await db.query(
            `INSERT INTO books (title, author, category, isbn, description, total_copies, available_copies, cover_url, pdf_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8) RETURNING *`,
            [title, author, category || 'General', isbn, description, total_copies || 1, cover_url, pdf_url]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('❌ Error adding book:', err);
        res.status(500).json({ message: "Error adding book" });
    }
};

exports.deleteBook = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM books WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Book not found" });
        }
        res.json({ message: "Book deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting book" });
    }
};

// 1. AI Book Recommendation System (Simple logic based on user history)
exports.getRecommendations = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find categories of books the user has borrowed
        const historyResult = await db.query(`
            SELECT DISTINCT b.category 
            FROM transactions t 
            JOIN books b ON t.book_id = b.id 
            WHERE t.user_id = $1
        `, [userId]);

        const categories = historyResult.rows.map(row => row.category);

        if (categories.length === 0) {
            // Default recommendation if no history
            const defaultRecs = await db.query('SELECT * FROM books ORDER BY available_copies DESC LIMIT 5');
            return res.json(defaultRecs.rows);
        }

        // Find other books in those categories not borrowed by the user
        const recommendationsResult = await db.query(`
            SELECT b.* 
            FROM books b
            WHERE b.category = ANY($1::text[]) 
            AND b.id NOT IN (SELECT book_id FROM transactions WHERE user_id = $2)
            ORDER BY RANDOM() LIMIT 5
        `, [categories, userId]);

        res.json(recommendationsResult.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching recommendations" });
    }
};

// 2. Smart Search Autocomplete
exports.getAutocomplete = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const result = await db.query(
            "SELECT id, title, author FROM books WHERE title ILIKE $1 OR author ILIKE $1 LIMIT 5",
            [`%${q}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching autocomplete suggestions" });
    }
};

// 3. QR Code Generation
exports.getQRCode = async (req, res) => {
    try {
        const { id } = req.params;
        const bookCheck = await db.query('SELECT id, title FROM books WHERE id = $1', [id]);
        if (bookCheck.rows.length === 0) return res.status(404).json({ message: "Book not found" });

        const qrData = JSON.stringify({ book_id: id, action: 'scan_to_issue' });
        const qrImage = await QRCode.toDataURL(qrData);
        
        res.json({ qr_code: qrImage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating QR code" });
    }
};

// 9. Book Reservation System
exports.reserveBook = async (req, res) => {
    try {
        const { book_id } = req.body;
        const user_id = req.user.id;

        const bookCheck = await db.query('SELECT available_copies FROM books WHERE id = $1', [book_id]);
        if (bookCheck.rows.length === 0) return res.status(404).json({ message: "Book not found" });
        if (bookCheck.rows[0].available_copies > 0) return res.status(400).json({ message: "Book is available. No need to reserve." });

        const result = await db.query(
            "INSERT INTO reservations (book_id, user_id) VALUES ($1, $2) RETURNING *",
            [book_id, user_id]
        );

        res.status(201).json({ message: "Book reserved successfully", reservation: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error reserving book" });
    }
};
