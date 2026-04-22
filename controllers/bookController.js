const db = require('../config/db');

exports.getBooks = async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = 'SELECT * FROM books WHERE 1=1';
        let params = [];
        let paramCount = 1;

        if (search) {
            query += ` AND (title ILIKE $${paramCount} OR author ILIKE $${paramCount})`;
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
        const cover_url = req.file ? req.file.path : null;

        const result = await db.query(
            `INSERT INTO books (title, author, category, isbn, description, total_copies, available_copies, cover_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $6, $7) RETURNING *`,
            [title, author, category || 'General', isbn, description, total_copies || 1, cover_url]
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
