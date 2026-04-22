const db = require('../config/db');

const initDB = async () => {
    try {
        console.log('🏗️  Starting Database Schema Initialization...');

        // 1. Users table (Admin, Librarian, Student)
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) CHECK (role IN ('Admin', 'Librarian', 'Student')) DEFAULT 'Student',
                full_name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Books table
        await db.query(`
            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                author VARCHAR(255) NOT NULL,
                isbn VARCHAR(50) UNIQUE,
                category VARCHAR(100) DEFAULT 'General',
                description TEXT,
                status VARCHAR(50) CHECK (status IN ('Available', 'Issued', 'Maintenance')) DEFAULT 'Available',
                total_copies INTEGER DEFAULT 1,
                available_copies INTEGER DEFAULT 1,
                cover_url TEXT,
                pdf_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Transactions table (Issue & Return Tracking)
        await db.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                due_date TIMESTAMP NOT NULL,
                return_date TIMESTAMP,
                fine_amount DECIMAL(10, 2) DEFAULT 0.00,
                status VARCHAR(50) CHECK (status IN ('Issued', 'Returned', 'Overdue')) DEFAULT 'Issued'
            );
        `);

        // 4. Activity Logs table (Audit Trail)
        await db.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                action TEXT NOT NULL,
                details JSONB,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Reservations table
        await db.query(`
            CREATE TABLE IF NOT EXISTS reservations (
                id SERIAL PRIMARY KEY,
                book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(50) CHECK (status IN ('Pending', 'Fulfilled', 'Cancelled')) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('🏛️  Professional Database Schema Initialized Successfully');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
        throw err;
    }
};

module.exports = { initDB };
