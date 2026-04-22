const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_123';

exports.signup = async (req, res) => {
    try {
        const { username, password, role, full_name, email } = req.body;
        
        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const roleToCreate = role || 'Student';

        if (roleToCreate === 'Admin' || roleToCreate === 'Librarian') {
            const existingRoleUser = await db.query('SELECT id FROM users WHERE role = $1 LIMIT 1', [roleToCreate]);
            if (existingRoleUser.rows.length > 0) {
                return res.status(400).json({ message: `Only one ${roleToCreate} is allowed.` });
            }
        }

        const result = await db.query(
            'INSERT INTO users (username, password, role, full_name, email) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role',
            [username, hashedPassword, roleToCreate, full_name, email]
        );

        res.status(201).json({ 
            message: "User created successfully", 
            user: result.rows[0] 
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: "Username or Email already exists" });
        }
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '2h' }
        );

        res.json({ 
            token, 
            username: user.username, 
            role: user.role,
            fullName: user.full_name
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, full_name, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching users" });
    }
};
