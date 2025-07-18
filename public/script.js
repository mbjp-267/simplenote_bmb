const noteForm = document.getElementById('noteForm');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const notesContainer = document.getElementById('notesContainer');
const searchInput = document.getElementById('searchInput');
const filterDateInput = document.getElementById('dateFilter');
const toggleDarkModeBtn = document.getElementById('toggleDarkMode');
const categoryInput = document.getElementById('category');
const filterCategoryInput = document.getElementById('categoryFilter');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const PASSWORD_KEY = "notes_password";
const defaultPassword = "1234";
const passwordOverlay = document.getElementById('passwordOverlay');
const passwordInput = document.getElementById('passwordInput');
const passwordSubmit = document.getElementById('passwordSubmit');
const passwordError = document.getElementById('passwordError');
const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 jam

//variabel global
let notes = []; //menyimpan daftar semua catatan
let editIndex = null; //menyimpan index yg sudah diedit
let searchTerm = ''; //menyimpan keyword
let filterDate = ''; //menyimpan tanggal filter
let filterCategory = ''; //menyimpan kategori filter
let inactivityTimer; //timer logout otomatis.
let todos = []; //menyimpan daftar to-do dalam satu catatan

//Fungsi konversi nama field (snake_case ke camelCase)
function normalizeNote(n) {
return {
    ...n,
    createdAt: n.created_at,
    updatedAt: n.updated_at
};
}

// Mengambil semua catatan dari server
async function loadNotesFromServer() {
const res = await fetch('http://localhost:3000/notes');
const raw = await res.json();
notes = raw.map(normalizeNote); //format data
renderNotes(); //menampilkan catatan
}

//menyimpan catatan baru ke server
async function saveNoteToServer(note) {
const res = await fetch('http://localhost:3000/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
});
const raw = await res.json();
const saved = normalizeNote(raw);
notes.push(saved);
renderNotes();
}

//Tombol submit password ditekan
passwordSubmit.addEventListener('click', () => {
const input = passwordInput.value;
const real = localStorage.getItem(PASSWORD_KEY);
if (input === real) {
    passwordOverlay.style.display = 'none'; //sembunyikan overlay
    resetInactivityTimer(); //reset timer aktivitas
} else {
    passwordError.style.display = 'block'; //menampilkan pesan error
}
});

//jika password belum disetel, setel default
if (!localStorage.getItem(PASSWORD_KEY)) {
localStorage.setItem(PASSWORD_KEY, defaultPassword);
}

//aktifkan dark mode jika sebelumnya disimpan.
if (localStorage.getItem('darkMode') === 'enabled') {
document.body.classList.add('dark-mode');
toggleDarkModeBtn.textContent = '☀️';
}

//toggle dark mode diaktifkan.
toggleDarkModeBtn.addEventListener('click', () => {
const isDark = document.body.classList.toggle('dark-mode');
localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
toggleDarkModeBtn.textContent = isDark ? '☀️' : '🌙';
});

//Escape karakter HTML agar aman ditampilkan
function escapeHTML(str) {
return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

//konversi tanggal ke waktu relatif
function getRelativeTime(dateString) {
const now = new Date();
const then = new Date(dateString);
const diffSec = Math.floor((now - then) / 1000);
const diffMin = Math.floor(diffSec / 60);
const diffHr = Math.floor(diffMin / 60);
const diffDay = Math.floor(diffHr / 24);
if (diffSec < 60) return 'Baru saja';
if (diffMin < 60) return `${diffMin} menit lalu`;
if (diffHr < 24) return `${diffHr} jam lalu`;
if (diffDay === 1) return 'Kemarin';
return `${diffDay} hari lalu`;
}

//ganti password
changePasswordBtn.addEventListener('click', () => {
const oldPass = prompt("Masukkan password lama:");
const real = localStorage.getItem(PASSWORD_KEY);
if (oldPass !== real) return alert("Password lama salah!");
const newPass = prompt("Masukkan password baru:");
if (newPass && newPass.trim() !== '') {
    localStorage.setItem(PASSWORD_KEY, newPass.trim());
    alert("Password berhasil diubah!");
}
});

//label warna tiap kategori
const categoryColor = {
    "Pribadi": "#f44336",
    "Pekerjaan": "#2196f3",
    "Belajar": "#4caf50",
    "Ide": "#ff9800",
};

//fungsi utama untuk menampilkan catatan dihalaman
function renderNotes() {
notesContainer.innerHTML = '';
const filtered = notes
    .map((note, index) => ({ ...note, originalIndex: index }))
    .filter(note => {
    const matchText = note.title.toLowerCase().includes(searchTerm.toLowerCase()) || note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDate = filterDate ? new Date(note.createdAt).toISOString().slice(0, 10) === filterDate : true;
    const matchCategory = filterCategory ? note.category === filterCategory : true;
    return matchText && matchDate && matchCategory;
    })
    .sort((a, b) => (b.pinned === a.pinned) ? 0 : b.pinned ? 1 : -1);

//buat elemen HTML untuk tiap catatan
filtered.forEach(note => {
    const noteEl = document.createElement('div');
    noteEl.classList.add('note');

    const warna = categoryColor[note.category] || '#adaca2';
    noteEl.style.borderLeft = `6px solid ${warna}`;
    notesContainer.appendChild(noteEl);

    noteEl.innerHTML = `
    <h3>${escapeHTML(note.title)}</h3>
    ${note.createdAt ? `<small>Dibuat: ${getRelativeTime(note.createdAt)}</small><br>` : ""}
    ${note.updatedAt ? `<small>Diubah: ${getRelativeTime(note.updatedAt)}</small>` : ""}
    <div>${escapeHTML(note.content).replace(/\n/g, '<br>')}</div>
    ${note.todos?.length ? `<ul>${note.todos.map(todo => `<li style="text-decoration: ${todo.done ? 'line-through' : 'none'}">${escapeHTML(todo.text)}</li>`).join('')}</ul>` : ""}
    <p><strong>Kategori:</strong> ${escapeHTML(note.category || 'Tidak ada')}</p>
    <p><strong>Status:</strong> ${note.pinned ? '📌' : 'Tidak di📌'}</p>
    <button class="delete" onclick="deleteNote(${note.originalIndex})">🗑️</button>
    <button class="edit" onclick="editNote(${note.originalIndex})">🖋️</button>
    <button class="pin" onclick="togglePin(${note.originalIndex})">${note.pinned ? 'Lepas 📌' : '📌'}</button>
    `;
});
}

//menghapus catatan dari server dan array lokal
async function deleteNote(index) {
    const noteId = notes[index].id;
    await fetch(`http://localhost:3000/notes/${noteId}`, { method: 'DELETE' });
    notes.splice(index, 1);
    renderNotes();
}

//edit catatan
function editNote(index) {
    const note = notes[index];
    titleInput.value = note.title;
    contentInput.value = note.content;
    categoryInput.value = note.category || '';
    todos = note.todos || [];
    renderTodoItems();
    editIndex = index;
}

//mengekspor catatan dalam bentuk file .json
exportBtn.addEventListener('click', function () {
    const dataStr = JSON.stringify(notes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes_backup.json';
    a.click();
    URL.revokeObjectURL(url);
});

//impor file .json berisi catatan
importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', async function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (event) {
    try {
        const importedNotes = JSON.parse(event.target.result);
        if (Array.isArray(importedNotes)) {
        for (const note of importedNotes) await saveNoteToServer(note);
        alert('Import berhasil!');
        } else alert('Format file tidak valid.');
    } catch (err) {
        alert('Gagal membaca file.');
    }
};
reader.readAsText(file);
});

//bagian to-do list
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoItemsList = document.getElementById('todoItems');

//menambahkan to-do baru
addTodoBtn.addEventListener('click', () => {
const text = todoInput.value.trim();
if (!text) return;
    todos.push({ text, done: false });
    todoInput.value = '';
    renderTodoItems();
});

//fungsi edit, delete, toggle to-do
function editTodo(index) {
    const newText = prompt("Edit item to-do:", todos[index].text);
    if (newText !== null && newText.trim() !== "") {
    todos[index].text = newText.trim();
    renderTodoItems();
    }
}
function deleteTodo(index) {
    todos.splice(index, 1);
    renderTodoItems();
}
function toggleTodo(index) {
    todos[index].done = !todos[index].done;
    renderTodoItems();
}

//menampilkan ulang semua item to-do
function renderTodoItems() {
todoItemsList.innerHTML = '';
todos.forEach((todo, index) => {
    const li = document.createElement('li');
    li.className = todo.done ? 'completed' : '';
    li.innerHTML = `
    <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTodo(${index})">
    <span onclick="toggleTodo(${index})">${escapeHTML(todo.text)}</span>
    <button onclick="editTodo(${index})">✏️</button>
    <button onclick="deleteTodo(${index})">❌</button>
    `;
    todoItemsList.appendChild(li);
    });
}

//menyimpan/mengedit catatan saat mengsubmit
noteForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const newNote = {
        title: titleInput.value,
        content: contentInput.value,
    category: categoryInput.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: false,
    todos: todos
};
noteForm.reset();
todos = [];
renderTodoItems();

if (editIndex !== null) {
    const existingNote = notes[editIndex];
    await fetch(`http://localhost:3000/notes/${existingNote.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newNote)
    });
    await loadNotesFromServer();
    editIndex = null;
} else {
    await saveNoteToServer(newNote);
}
});

//event pencarian, filter tanggal, filter kategori
searchInput.addEventListener('input', function (e) {
    searchTerm = e.target.value;
    renderNotes();
});
filterDateInput.addEventListener('input', function (e) {
    filterDate = e.target.value;
    renderNotes();
});
filterCategoryInput.addEventListener('input', function (e) {
    filterCategory = e.target.value;
    renderNotes();
});

//pin/unpin catatan
async function togglePin(index) {
const note = notes[index];
note.pinned = !note.pinned;
await fetch(`http://localhost:3000/notes/${note.id}/pin`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinned: note.pinned })
});
renderNotes();
}

//enter untuk tambah to-do
todoInput.addEventListener('keydown', (e) => {
if (e.key === 'Enter') {
    e.preventDefault();
    addTodoBtn.click();
}
});

//logout otomatis setelah 1 jam tanpa aktivitas user(tampilkan overlay password)
function logout() {
passwordOverlay.style.display = 'flex';
}

//reset timer logout
function resetInactivityTimer() {
clearTimeout(inactivityTimer);
inactivityTimer = setTimeout(logout, INACTIVITY_LIMIT);
}

//aktivitas user
['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
window.addEventListener(event, resetInactivityTimer);
});

//saat halaman selesai dimuat, tampilkan overlay dan load catatan
window.addEventListener('DOMContentLoaded', () => {
passwordOverlay.style.display = 'flex';
loadNotesFromServer();
});