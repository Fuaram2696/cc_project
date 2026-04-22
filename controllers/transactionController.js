const db = require('../config/db');
const { sendEmail } = require('../utils/emailService');

exports.issueBook = async (req, res) => {
    let { book_id, user_id, due_days = 14 } = req.body;
    
    // Security: Students can only issue for themselves
    if (req.user.role === 'Student') {
        user_id = req.user.id;
    }

    try {
        // 1. Check if book is available
        const bookCheck = await db.query('SELECT title, available_copies, status FROM books WHERE id = $1', [book_id]);
        if (bookCheck.rows.length === 0) return res.status(404).json({ message: "Book not found" });
        if (bookCheck.rows[0].available_copies <= 0) return res.status(400).json({ message: "Book not available" });

        // 1.5 Multi-user Handling: Prevent issuing same book to the same user twice simultaneously
        const existingIssue = await db.query(
            "SELECT id FROM transactions WHERE book_id = $1 AND user_id = $2 AND status = 'Issued'", 
            [book_id, user_id]
        );
        if (existingIssue.rows.length > 0) return res.status(400).json({ message: "You have already issued this book." });

        // 2. Start Transaction
        await db.query('BEGIN');

        // 3. Create Transaction record
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + due_days);

        const transaction = await db.query(
            `INSERT INTO transactions (book_id, user_id, due_date, status) 
             VALUES ($1, $2, $3, 'Issued') RETURNING *`,
            [book_id, user_id, dueDate]
        );

        // 4. Update Book status/copies
        await db.query(
            `UPDATE books SET available_copies = available_copies - 1, 
             status = CASE WHEN available_copies - 1 = 0 THEN 'Issued' ELSE 'Available' END 
             WHERE id = $1`,
            [book_id]
        );

        // 5. Log Activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
            [req.user.id, 'ISSUE_BOOK', JSON.stringify({ book_id, user_id })]
        );

        // 6. Send Email Notification
        const userQuery = await db.query('SELECT email, username FROM users WHERE id = $1', [user_id]);
        if (userQuery.rows.length > 0 && userQuery.rows[0].email) {
            const userEmail = userQuery.rows[0].email;
            const bookTitle = bookCheck.rows[0].title;
            sendEmail(
                userEmail, 
                `Book Issued: ${bookTitle}`, 
                `Hi ${userQuery.rows[0].username},\n\nYou have successfully issued "${bookTitle}". Please return it by ${dueDate.toDateString()}.\n\nThank you!`
            );
        }

        await db.query('COMMIT');
        res.status(201).json(transaction.rows[0]);
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: "Error issuing book" });
    }
};

exports.returnBook = async (req, res) => {
    const { transaction_id } = req.body;

    try {
        const transResult = await db.query('SELECT * FROM transactions WHERE id = $1 AND status = $2', [transaction_id, 'Issued']);
        if (transResult.rows.length === 0) return res.status(404).json({ message: "Active transaction not found" });

        const transaction = transResult.rows[0];
        const returnDate = new Date();
        const dueDate = new Date(transaction.due_date);
        
        // Calculate Fine (₹5 per day overdue)
        let fine = 0;
        if (returnDate > dueDate) {
            const diffTime = Math.abs(returnDate - dueDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            fine = diffDays * 5.00; // ₹5 per day
        }

        await db.query('BEGIN');

        // 1. Update Transaction
        await db.query(
            'UPDATE transactions SET return_date = $1, fine_amount = $2, status = $3 WHERE id = $4',
            [returnDate, fine, 'Returned', transaction_id]
        );

        // 2. Update Book
        await db.query(
            "UPDATE books SET available_copies = available_copies + 1, status = 'Available' WHERE id = $1",
            [transaction.book_id]
        );

        // 3. Log Activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
            [req.user.id, 'RETURN_BOOK', JSON.stringify({ transaction_id, fine })]
        );

        // 4. Send Email Notification
        const bookQuery = await db.query('SELECT title FROM books WHERE id = $1', [transaction.book_id]);
        const userQuery = await db.query('SELECT email, username FROM users WHERE id = $1', [transaction.user_id]);
        if (userQuery.rows.length > 0 && userQuery.rows[0].email) {
            const userEmail = userQuery.rows[0].email;
            const bookTitle = bookQuery.rows[0].title;
            const fineMsg = fine > 0 ? `\n\nA late fine of ₹${fine} has been calculated.` : '';
            sendEmail(
                userEmail, 
                `Book Returned: ${bookTitle}`, 
                `Hi ${userQuery.rows[0].username},\n\nYou have successfully returned "${bookTitle}".${fineMsg}\n\nThank you!`
            );
        }

        await db.query('COMMIT');
        res.json({ message: "Book returned successfully", fine_amount: fine });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: "Error returning book" });
    }
};

exports.getUserTransactions = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT t.*, b.title, b.author 
             FROM transactions t 
             JOIN books b ON t.book_id = b.id 
             WHERE t.user_id = $1 ORDER BY t.issue_date DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Error fetching history" });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.*, b.title, u.username 
            FROM transactions t 
            JOIN books b ON t.book_id = b.id 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.issue_date DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching transactions" });
    }
};

exports.getActivityLogs = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, u.username 
            FROM activity_logs a 
            LEFT JOIN users u ON a.user_id = u.id 
            ORDER BY a.timestamp DESC LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching activity logs" });
    }
};
