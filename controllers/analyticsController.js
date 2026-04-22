const db = require('../config/db');

exports.getAnalytics = async (req, res) => {
    try {
        // Total books
        const totalBooksResult = await db.query('SELECT COUNT(*) FROM books');
        const totalBooks = parseInt(totalBooksResult.rows[0].count);

        // Active users
        const activeUsersResult = await db.query('SELECT COUNT(*) FROM users');
        const activeUsers = parseInt(activeUsersResult.rows[0].count);

        // Most borrowed books
        const mostBorrowedResult = await db.query(`
            SELECT b.title, COUNT(t.id) as borrow_count 
            FROM transactions t 
            JOIN books b ON t.book_id = b.id 
            GROUP BY b.id 
            ORDER BY borrow_count DESC LIMIT 5
        `);
        const mostBorrowed = mostBorrowedResult.rows;

        // Transactions per day (last 7 days)
        const transactionsPerDayResult = await db.query(`
            SELECT DATE(issue_date) as date, COUNT(*) as count 
            FROM transactions 
            WHERE issue_date >= CURRENT_DATE - INTERVAL '7 days' 
            GROUP BY DATE(issue_date) 
            ORDER BY DATE(issue_date) ASC
        `);
        const transactionsPerDay = transactionsPerDayResult.rows;

        res.json({
            totalBooks,
            activeUsers,
            mostBorrowed,
            transactionsPerDay
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching analytics" });
    }
};
