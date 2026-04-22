// --- Configuration ---
// In production (Vercel), use the full Render backend URL.
// For local dev, use relative path.
const RENDER_BACKEND_URL = "https://cc-project-backend-pk9d.onrender.com";
const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "/api"
    : (window.location.protocol === "file:" ? "http://localhost:5000/api" : `${RENDER_BACKEND_URL}/api`);
const state = {
    token: localStorage.getItem("token"),
    user: JSON.parse(localStorage.getItem("user") || "null"),
    currentView: 'dashboard',
    charts: {}
};

// --- Theme Management ---
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    if (body.getAttribute('data-theme') === 'light') {
        body.removeAttribute('data-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'dark');
    } else {
        body.setAttribute('data-theme', 'light');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'light');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
        const icon = document.getElementById('theme-icon');
        if(icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
}

// --- View Management ---
function setView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    
    // Update Sidebar
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) activeNav.classList.add('active');

    // Update Header
    document.getElementById('current-view-title').innerText = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    state.currentView = viewName;

    // Load Data
    if (viewName === 'books') fetchBooks();
    if (viewName === 'users') fetchUsers();
    if (viewName === 'transactions') fetchLoans();
    if (viewName === 'dashboard') updateDashboard();
    if (viewName === 'chatbot') {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }

    // Auto-hide mobile menu
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }
}

// --- Auth Logic ---
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('auth-password');
    const toggleIcon = document.getElementById('toggle-password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

let isSignupMode = false;
function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    const title = document.getElementById('auth-title');
    const primaryBtn = document.getElementById('auth-primary-btn');
    const toggleLink = document.getElementById('auth-toggle-link');
    const toggleText = document.getElementById('auth-toggle-text');
    const extraFields = document.getElementById('signup-extra-fields');

    if (isSignupMode) {
        title.innerText = "Create Account";
        primaryBtn.innerText = "Sign Up";
        toggleText.innerText = "Already have an account?";
        toggleLink.innerText = "Login";
        extraFields.classList.remove('hidden');
    } else {
        title.innerText = "Sign in to CloudLib";
        primaryBtn.innerText = "Get Started";
        toggleText.innerText = "Don't have an account?";
        toggleLink.innerText = "Sign Up";
        extraFields.classList.add('hidden');
    }
}



async function handleAuth() {
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;
    
    if (isSignupMode) {
        const full_name = document.getElementById('auth-fullname').value;
        const email = document.getElementById('auth-email').value;
        const role = document.getElementById('auth-role').value;
        
        try {
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, full_name, email, role })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Account created! Please login.");
                toggleAuthMode();
            } else {
                showToast(data.message, 'error');
            }
        } catch (err) { showToast("Registration failed", 'error'); }
    } else {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data));
                state.token = data.token;
                state.user = data;
                showToast(`Welcome back, ${data.username}!`);
                initApp();
            } else {
                showToast(data.message, 'error');
            }
        } catch (err) { showToast("Login failed", 'error'); }
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

// --- Data Layer ---
async function fetchBooks() {
    const search = document.getElementById('book-search').value;
    const category = document.getElementById('book-filter-category').value;
    
    try {
        const res = await fetch(`${API_URL}/books?search=${search}&category=${category}`);
        const books = await res.json();
        renderBooks(books);
    } catch (err) { console.error("Error fetching books:", err); }
}

function renderBooks(books) {
    const list = document.getElementById('books-list');
    list.innerHTML = "";
    
    books.forEach(book => {
        let securePdfUrl = book.pdf_url;

        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <div class="book-cover">
                ${book.cover_url ? `<img src="${book.cover_url}" alt="${book.title}">` : '📚'}
            </div>
            <div class="book-info">
                <p class="book-category">${book.category}</p>
                <h4 class="book-title">${book.title}</h4>
                <p class="book-author">by ${book.author}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="status-badge" style="background: ${book.status === 'Available' ? '#dcfce7' : '#fee2e2'}; color: ${book.status === 'Available' ? '#166534' : '#991b1b'};">
                        ${book.status}
                    </span>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <i class="fas fa-qrcode" style="color: var(--primary); cursor: pointer;" onclick="showQRCode(${book.id})" title="View QR Code"></i>
                        ${securePdfUrl ? `<a href="${securePdfUrl}" target="_blank" title="Download E-Book"><i class="fas fa-file-pdf" style="color: #e11d48; cursor: pointer;"></i></a>` : ''}
                        ${book.status === 'Available' 
                            ? `<button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="issueBook(${book.id})">Borrow</button>` 
                            : `<button class="btn" style="background: var(--warning); color: #fff; padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="reserveBook(${book.id})">Reserve</button>`
                        }
                        ${state.user.role === 'Admin' ? `<i class="fas fa-trash" style="color: var(--danger); cursor: pointer;" onclick="deleteBook(${book.id})"></i>` : ''}
                    </div>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

async function addBook() {
    const btn = document.querySelector('button[onclick="addBook()"]');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const title = document.getElementById('new-book-title').value;
        const author = document.getElementById('new-book-author').value;
        const category = document.getElementById('new-book-category').value;
        const isbn = document.getElementById('new-book-isbn').value;
        const description = document.getElementById('new-book-desc').value;
        const coverFile = document.getElementById('new-book-cover').files[0];
        const pdfFile = document.getElementById('new-book-pdf').files[0];

        if (!title || !author) {
            alert("Title and Author are required!");
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        // Cloudinary Free Tier Limit: 10MB (10 * 1024 * 1024 bytes)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        
        if (coverFile && coverFile.size > MAX_FILE_SIZE) {
            alert("Cover image exceeds the 10MB limit for Cloudinary's free tier. Please choose a smaller file.");
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        if (pdfFile && pdfFile.size > MAX_FILE_SIZE) {
            alert("PDF file (" + (pdfFile.size / (1024*1024)).toFixed(1) + "MB) exceeds the 10MB limit for Cloudinary's free tier. Please compress your PDF or choose a smaller one.");
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("author", author);
        formData.append("category", category);
        if (isbn) formData.append("isbn", isbn);
        if (description) formData.append("description", description);
        if (coverFile) formData.append("cover", coverFile);
        if (pdfFile) formData.append("pdf", pdfFile);

        const res = await fetch(`${API_URL}/books/add`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` },
            body: formData
        });
        
        if (res.ok) {
            closeBookModal();
            fetchBooks();
            updateDashboard();
            
            // Clear form fields
            document.getElementById('new-book-title').value = '';
            document.getElementById('new-book-author').value = '';
            document.getElementById('new-book-isbn').value = '';
            document.getElementById('new-book-desc').value = '';
            document.getElementById('new-book-cover').value = '';
            document.getElementById('new-book-pdf').value = '';
        } else {
            let errorMessage = "Failed to add book.";
            try {
                const data = await res.json();
                errorMessage = data.message || errorMessage;
            } catch (e) {
                // If the server returns HTML (e.g. 500 stack trace)
                const text = await res.text();
                console.error("Server HTML Response:", text.substring(0, 500));
                errorMessage = "Server returned an invalid response (check console).";
            }
            alert(errorMessage);
        }
    } catch (err) { 
        console.error("Add Book Error:", err.message || err);
        alert("Error adding book: " + (err.message || "Network issue.")); 
    } finally {
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}

async function deleteBook(id) {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
        const res = await fetch(`${API_URL}/books/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (res.ok) fetchBooks();
    } catch (err) { alert("Error deleting book"); }
}

async function issueBook(bookId) {
    try {
        const res = await fetch(`${API_URL}/transactions/issue`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}` 
            },
            body: JSON.stringify({ book_id: bookId, user_id: state.user.id })
        });
        if (res.ok) {
            showToast("Book borrowed successfully!");
            fetchBooks();
            updateDashboard();
        } else {
            const data = await res.json();
            showToast(data.message, 'error');
        }
    } catch (err) { showToast("Error borrowing book", 'error'); }
}

// --- Dashboard & Analytics ---
async function updateDashboard() {
    try {
        const statsRes = await fetch(`${API_URL}/analytics`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        if (statsRes.ok) {
            const data = await statsRes.json();
            document.getElementById('stat-total-books').innerText = data.totalBooks;
            // Active users or other stats could go here. We'll leave available/issued static for now or calculate from books.
            
            initChart(data);
        }

        // We still need all books to calculate Available/Issued/Overdue if not provided by analytics
        const res = await fetch(`${API_URL}/books`);
        const books = await res.json();
        document.getElementById('stat-available').innerText = books.filter(b => b.status === 'Available').length;
        document.getElementById('stat-issued').innerText = books.filter(b => b.status === 'Issued').length;
        
        renderRecommendations();
        if (state.user.role !== 'Student') fetchActivityLogs();
    } catch (err) { console.error("Dashboard error:", err); }
}

async function fetchActivityLogs() {
    try {
        const res = await fetch(`${API_URL}/transactions/activity`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const logs = await res.json();
        const logContainer = document.getElementById('activity-log');
        logContainer.innerHTML = "";
        
        logs.forEach(log => {
            const item = document.createElement('div');
            item.style.padding = "0.5rem 0";
            item.style.borderBottom = "1px solid #f1f5f9";
            item.innerHTML = `
                <p style="font-weight: 600; font-size: 0.8125rem;">${log.username || 'System'}: ${log.action}</p>
                <p style="font-size: 0.75rem; color: var(--text-muted);">${new Date(log.timestamp).toLocaleTimeString()} • ${JSON.stringify(log.details)}</p>
            `;
            logContainer.appendChild(item);
        });
    } catch (err) { console.error("Error fetching logs:", err); }
}

function initChart(data) {
    const ctx = document.getElementById('libraryChart').getContext('2d');
    if (state.charts.main) state.charts.main.destroy();

    const labels = data.mostBorrowed.map(b => b.title);
    const chartData = data.mostBorrowed.map(b => parseInt(b.borrow_count));

    state.charts.main = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Borrow Count',
                data: chartData,
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#64748b']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

async function renderRecommendations() {
    const list = document.getElementById('ai-recommendations');
    list.innerHTML = "<p>Loading recommendations...</p>";
    try {
        const res = await fetch(`${API_URL}/books/recommendations`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const recs = await res.json();
        list.innerHTML = "";
        if (recs.length === 0) {
            list.innerHTML = "<p>No recommendations yet.</p>";
            return;
        }
        renderBooksInElement(recs, list);
    } catch (err) {
        list.innerHTML = "<p>Failed to load recommendations.</p>";
    }
}

function renderBooksInElement(books, element) {
    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <div class="book-cover">${book.cover_url ? `<img src="${book.cover_url}">` : '📚'}</div>
            <div class="book-info">
                <p class="book-category">${book.category}</p>
                <h4 class="book-title">${book.title}</h4>
                <p class="book-author">${book.author}</p>
            </div>
        `;
        element.appendChild(card);
    });
}

// --- UI Helpers ---
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.toggle('open');
    if(overlay) overlay.classList.toggle('open');
}

function openAddBookModal() { document.getElementById('modal-book').classList.remove('hidden'); }
function closeBookModal() { document.getElementById('modal-book').classList.add('hidden'); }

function initApp() {
    if (state.token && state.user) {
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        document.getElementById('display-username').innerText = state.user.username;
        document.getElementById('display-role').innerText = state.user.role;
        document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${state.user.username}&background=6366f1&color=fff`;

        // Role-based UI
        if (state.user.role === 'Admin' || state.user.role === 'Librarian') {
          document.getElementById('nav-transactions').classList.remove('hidden');
          document.getElementById('librarian-actions').classList.remove('hidden');
        }
        if (state.user.role === 'Admin') {
          document.getElementById('nav-users').classList.remove('hidden');
        }

        setView('dashboard');
    } else {
        document.getElementById('auth-overlay').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }
}

async function fetchUsers() {
    try {
        const res = await fetch(`${API_URL}/auth/users`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const users = await res.json();
        renderUsers(users);
    } catch (err) { console.error("Error fetching users:", err); }
}

function renderUsers(users) {
    const list = document.getElementById('users-table-body');
    list.innerHTML = "";
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #f1f5f9";
        row.innerHTML = `
            <td style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <img src="https://ui-avatars.com/api/?name=${user.username}&background=random" style="width: 32px; height: 32px; border-radius: 50%;">
                    <span>${user.full_name || user.username}</span>
                </div>
            </td>
            <td style="padding: 1rem; color: var(--text-muted);">${user.email || 'N/A'}</td>
            <td style="padding: 1rem;"><span class="status-badge" style="background: #eef2ff; color: var(--primary);">${user.role}</span></td>
            <td style="padding: 1rem; color: var(--text-muted); font-size: 0.875rem;">${new Date(user.created_at).toLocaleDateString()}</td>
            <td style="padding: 1rem;">
                <i class="fas fa-edit" style="color: var(--primary); cursor: pointer; margin-right: 1rem;"></i>
                <i class="fas fa-trash" style="color: var(--danger); cursor: pointer;"></i>
            </td>
        `;
        list.appendChild(row);
    });
}

async function fetchLoans() {
    const endpoint = state.user.role === 'Student' ? '/transactions/my-history' : '/transactions/all';
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const loans = await res.json();
        renderLoans(loans);
    } catch (err) { console.error("Error fetching loans:", err); }
}

function renderLoans(loans) {
    const list = document.getElementById('loans-table-body');
    list.innerHTML = "";
    const isSpecial = state.user.role === 'Admin' || state.user.role === 'Librarian';

    loans.forEach(loan => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #f1f5f9";
        const isOverdue = new Date() > new Date(loan.due_date) && loan.status === 'Issued';
        
        row.innerHTML = `
            <td style="padding: 1rem;"><strong>${loan.title}</strong></td>
            <td style="padding: 1rem;">${loan.username || 'You'}</td>
            <td style="padding: 1rem; color: ${isOverdue ? 'var(--danger)' : 'inherit'}">${new Date(loan.due_date).toLocaleDateString()}</td>
            <td style="padding: 1rem;">
                <span class="status-badge" style="background: ${loan.status === 'Returned' ? '#dcfce7' : (isOverdue ? '#fee2e2' : '#fef9c3')}; color: ${loan.status === 'Returned' ? '#166534' : (isOverdue ? '#991b1b' : '#854d0e')};">
                    ${isOverdue ? 'Overdue' : loan.status}
                </span>
            </td>
            <td style="padding: 1rem;">$${loan.fine_amount || '0.00'}</td>
            <td style="padding: 1rem;">
                ${(isSpecial && loan.status === 'Issued') ? `<button class="btn" style="background: var(--success); color: white; padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="processReturn(${loan.id})">Return</button>` : '—'}
            </td>
        `;
        list.appendChild(row);
    });
}

async function processReturn(transId) {
    try {
        const res = await fetch(`${API_URL}/transactions/return`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}` 
            },
            body: JSON.stringify({ transaction_id: transId })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message);
            if (data.fine_amount > 0) showToast(`Fine calculated: $${data.fine_amount}`, 'error');
            fetchLoans();
            updateDashboard();
        }
    } catch (err) { showToast("Error returning book", 'error'); }
}

// --- Notifications ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function logActivity(action, details) {
    const log = document.getElementById('activity-log');
    if (log.querySelector('p')) log.innerHTML = "";
    
    const item = document.createElement('div');
    item.style.padding = "0.5rem 0";
    item.style.borderBottom = "1px solid #f1f5f9";
    item.innerHTML = `
        <p style="font-weight: 600;">${action}</p>
        <p style="font-size: 0.75rem; color: var(--text-muted);">${details} • Just now</p>
    `;
    log.prepend(item);
}

// --- New Features Logic ---

async function sendChat() {
    const input = document.getElementById('chat-input');
    const query = input.value.trim();
    if (!query) return;

    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML += `<div style="margin-bottom: 1rem; color: var(--text-color);"><strong>You:</strong> ${query}</div>`;
    input.value = '';

    try {
        const res = await fetch(`${API_URL}/chatbot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        chatMessages.innerHTML += `<div style="margin-bottom: 1rem; color: var(--primary);"><strong>Bot:</strong> ${data.response}</div>`;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        chatMessages.innerHTML += `<div style="margin-bottom: 1rem; color: var(--danger);"><strong>Bot:</strong> Error reaching the server.</div>`;
    }
}

async function showQRCode(bookId) {
    document.getElementById('modal-qrcode').classList.remove('hidden');
    const container = document.getElementById('qr-image-container');
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const res = await fetch(`${API_URL}/books/${bookId}/qrcode`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const data = await res.json();
        if (res.ok) {
            container.innerHTML = `<img src="${data.qr_code}" alt="Book QR Code" style="max-width: 200px;">`;
        } else {
            container.innerHTML = `<p>${data.message}</p>`;
        }
    } catch (err) {
        container.innerHTML = `<p>Error loading QR code.</p>`;
    }
}

function closeQRModal() {
    document.getElementById('modal-qrcode').classList.add('hidden');
}

async function reserveBook(bookId) {
    try {
        const res = await fetch(`${API_URL}/books/reserve`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}` 
            },
            body: JSON.stringify({ book_id: bookId })
        });
        const data = await res.json();
        if (res.ok) {
            showToast("Book reserved successfully!");
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) { showToast("Error reserving book", 'error'); }
}

// --- Start ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initApp();
});
