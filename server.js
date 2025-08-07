const express = require('express'); // framework web
const cors = require('cors'); // allow access from other frontend
const { Pool } = require('pg'); // koneksi postgreSQL
const { error } = require('console');

const app = express(); // inisialisasi express
const PORT = 3000; // port server

// Middleware
app.use(cors()); //mengaktifkan cors
app.use(express.json()); //parsing body json
app.use(express.static('public')); // Untuk server file statis HTML/JS/CSS

const pool = new Pool({
connectionString: 'postgresql://postgres:kdjOwjqmIdtWQdWFrqqRbGINhYeeHkvV@interchange.proxy.rlwy.net:46173/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

// Endpoint untuk ambil semua catatan dari database
app.get('/notes', async (req, res) => {
    try {
    const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
    res.json(result.rows);
} catch (err) {
    res.status(500).json({ error: err.message });
}
});

// Endpoint untuk simpan catatan baru
app.post('/notes', async (req, res) => {
    try {
const { title, content, category, pinned, todos } = req.body;
const result = await pool.query(
    'INSERT INTO notes(title, content, category, pinned, todos, created_at, updated_at)VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
    [title, content, category, pinned, JSON.stringify(todos)]
);
res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Hapus catatan berdasarkan ID
app.delete('/notes/:id', async (req, res) => {
try {
    const { id } = req.params;
    await pool.query('DELETE FROM notes WHERE id = $1', [id]);
    res.json({ success: true });
} catch (err) {
    res.status(500).json({ error: err.message });
}
});

// Update pinned status
app.patch('/notes/:id/pin', async (req, res) => {
try {
    const { id } = req.params;
    const { pinned } = req.body;
    const result = await pool.query(
      'UPDATE notes SET pinned = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [pinned, id]
    );
    res.json(result.rows[0]);
} catch (err) {
    res.status(500).json({ error: err.message });
}
});

// Edit catatan
app.put('/notes/:id', async (req, res) => {
try {
    const { id } = req.params;
    const { title, content, category, todos } = req.body;
    const result = await pool.query(
    `UPDATE notes 
    SET title = $1, content = $2, category = $3, todos = $4, updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
    [title, content, category, JSON.stringify(todos), id]
    );
    res.json(result.rows[0]);
} catch (err) {
    res.status(500).json({ error: err.message });
}
});

//output lewat terminal
app.listen(PORT, () => {
    console.log('Server running on http://localhost:3000');
});
