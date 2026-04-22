const db = require('../config/db');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

exports.handleChatQuery = async (req, res) => {
    const { query } = req.body;
    
    try {
        // Fetch some basic context from DB
        const availableBooksQuery = await db.query("SELECT COUNT(*) FROM books WHERE status = 'Available'");
        const totalBooksQuery = await db.query("SELECT COUNT(*) FROM books");
        const availableBooksCount = availableBooksQuery.rows[0].count;
        const totalBooksCount = totalBooksQuery.rows[0].count;
        
        let userContext = "The user is not logged in.";
        if (req.user) {
            const dueResult = await db.query(
                "SELECT b.title, t.due_date FROM transactions t JOIN books b ON t.book_id = b.id WHERE t.user_id = $1 AND t.status = 'Issued' ORDER BY t.due_date ASC",
                [req.user.id]
            );
            if (dueResult.rows.length > 0) {
                userContext = `The logged-in user has the following books issued:\n` + dueResult.rows.map(r => `- "${r.title}" due on ${new Date(r.due_date).toDateString()}`).join('\n');
            } else {
                userContext = "The logged-in user currently has no books issued.";
            }
        }
        
        // System Prompt for Groq
        const systemPrompt = `You are a helpful, intelligent AI assistant for the 'CloudLib' Library Management System. 
Current Library Stats: Total Books: ${totalBooksCount}, Available Books: ${availableBooksCount}.
${userContext}
Answer the user's query politely and concisely. If they ask for book recommendations (like "best book for science"), provide 2-3 excellent suggestions based on general knowledge. If they ask about due dates, use the user context provided. Do not use markdown (like **) in your response, just return plain text.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            model: "llama-3.1-8b-instant", 
            max_tokens: 250
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "I am unable to process that right now.";
        
        res.json({ response: responseText });
    } catch (err) {
        console.error('Groq Error:', err);
        res.status(500).json({ response: "Oops, something went wrong while communicating with the AI." });
    }
};
