import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// KONFIGURASI FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAgan50HUl6aDIdbxSFnsrZXVCSapdwin8",
  authDomain: "fld-system.firebaseapp.com",
  projectId: "fld-system",
  storageBucket: "fld-system.firebasestorage.app",
  messagingSenderId: "737737809243",
  appId: "1:737737809243:web:db8f97e82f366631b14e7e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let foldersList = [];
let notesList = [];
let activeFolderId = 'all';

// MEMANTAU STATUS USER
onAuthStateChanged(auth, async (user) => {
  const authNotice = document.getElementById('authNotice');
  const mainWorkspace = document.getElementById('mainWorkspace');
  const headerActions = document.getElementById('headerActions');

  if (user) {
    currentUser = user;
    if (authNotice) authNotice.style.display = 'none';
    if (mainWorkspace) mainWorkspace.style.display = 'grid';
    if (headerActions) headerActions.style.display = 'flex';

    await loadFolders();
    await loadNotes();
  } else {
    currentUser = null;
    if (authNotice) authNotice.style.display = 'block';
    if (mainWorkspace) mainWorkspace.style.display = 'none';
    if (headerActions) headerActions.style.display = 'none';
  }
});

/* ==================== KELOLA FOLDER ==================== */

async function loadFolders() {
  foldersList = [];
  if (!currentUser) return;

  try {
    const q = query(collection(db, "note_folders"), where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
      foldersList.push({ id: docSnap.id, ...docSnap.data() });
    });

    foldersList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    renderFolderSidebar();
    renderFolderDropdown();
  } catch (error) {
    console.error("Gagal memuat folder dari Firestore:", error);
  }
}

function renderFolderSidebar() {
  const folderListEl = document.getElementById('folderList');
  if (!folderListEl) return;

  folderListEl.innerHTML = '';

  // Item "Semua Catatan"
  const allItem = document.createElement('div');
  allItem.className = `folder-item ${activeFolderId === 'all' ? 'active' : ''}`;
  allItem.innerHTML = `<span><i class="fi fi-rr-apps"></i> Semua Catatan</span>`;
  allItem.onclick = () => selectFolder('all');
  folderListEl.appendChild(allItem);

  foldersList.forEach((folder) => {
    const item = document.createElement('div');
    item.className = `folder-item ${activeFolderId === folder.id ? 'active' : ''}`;
    item.innerHTML = `
      <span><i class="fi fi-rr-folder"></i> ${escapeHtml(folder.name)}</span>
      <button class="btn-del-folder" onclick="event.stopPropagation(); deleteFolder('${folder.id}')" title="Hapus Folder"><i class="fi fi-rr-trash"></i></button>
    `;
    item.onclick = () => selectFolder(folder.id);
    folderListEl.appendChild(item);
  });
}

function selectFolder(folderId) {
  activeFolderId = folderId;
  renderFolderSidebar();
  renderNotesGrid();
}

window.handleAddFolder = async function(e) {
  e.preventDefault();
  const inputEl = document.getElementById('newFolderInput');
  const name = inputEl.value.trim();

  if (!name || !currentUser) return;

  try {
    await addDoc(collection(db, "note_folders"), {
      userId: currentUser.uid,
      name: name,
      createdAt: serverTimestamp()
    });

    inputEl.value = '';
    closeFolderModal();
    await loadFolders();
  } catch (error) {
    console.error("Gagal menambah folder:", error);
    alert("Gagal menambahkan folder. Pastikan koneksi internet stabil.");
  }
};

window.deleteFolder = async function(folderId) {
  if (confirm("Hapus folder ini? Catatan di dalamnya tidak akan terhapus, namun tidak lagi dikelompokkan dalam folder ini.")) {
    try {
      await deleteDoc(doc(db, "note_folders", folderId));
      if (activeFolderId === folderId) activeFolderId = 'all';
      await loadFolders();
      await loadNotes();
    } catch (error) {
      console.error("Gagal menghapus folder:", error);
    }
  }
};

/* ==================== KELOLA CATATAN ==================== */

async function loadNotes() {
  notesList = [];
  if (!currentUser) return;

  try {
    const q = query(collection(db, "notes"), where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
      notesList.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderNotesGrid();
  } catch (error) {
    console.error("Gagal memuat catatan dari Firestore:", error);
  }
}

function renderNotesGrid() {
  const noteGrid = document.getElementById('noteGrid');
  if (!noteGrid) return;

  noteGrid.innerHTML = '';

  const filteredNotes = activeFolderId === 'all' 
    ? notesList 
    : notesList.filter(n => n.folderId === activeFolderId);

  if (filteredNotes.length === 0) {
    noteGrid.innerHTML = '<p style="color: #666; grid-column: 1/-1;">Belum ada catatan.</p>';
    return;
  }

  filteredNotes.forEach((note) => {
    const folderObj = foldersList.find(f => f.id === note.folderId);
    const folderName = folderObj ? folderObj.name : 'Tanpa Folder';

    // Format tanggal
    let dateStr = '-';
    if (note.updatedAt && note.updatedAt.seconds) {
      dateStr = new Date(note.updatedAt.seconds * 1000).toLocaleDateString('id-ID');
    } else if (note.updatedAt instanceof Date) {
      dateStr = note.updatedAt.toLocaleDateString('id-ID');
    }

    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `
      <div>
        <div class="task-subject"><i class="fi fi-rr-folder"></i> ${escapeHtml(folderName)}</div>
        <h3 class="task-title">${escapeHtml(note.title)}</h3>
        <p class="note-snippet">${escapeHtml(note.content)}</p>
      </div>
      <div>
        <div class="task-meta">
          <span><i class="fi fi-rr-calendar"></i> ${dateStr}</span>
        </div>
        <div class="task-actions">
          <button class="btn-sm" onclick="openNoteModal('${note.id}', '${escapeHtml(note.title)}', '${escapeHtml(note.content)}', '${note.folderId || ''}')">EDIT</button>
          <button class="btn-sm btn-delete" onclick="deleteNote('${note.id}')">HAPUS</button>
        </div>
      </div>
    `;
    noteGrid.appendChild(card);
  });
}

window.handleNoteSubmit = async function(e) {
  e.preventDefault();
  if (!currentUser) return;

  const noteId = document.getElementById('noteId').value;
  const folderId = document.getElementById('inputFolderId').value;
  const title = document.getElementById('inputNoteTitle').value.trim();
  const content = document.getElementById('inputNoteContent').value.trim();

  const noteData = {
    userId: currentUser.uid,
    folderId: folderId || '',
    title: title,
    content: content,
    updatedAt: new Date()
  };

  try {
    if (noteId) {
      await updateDoc(doc(db, "notes", noteId), noteData);
    } else {
      await addDoc(collection(db, "notes"), noteData);
    }

    closeNoteModal();
    await loadNotes();
  } catch (error) {
    console.error("Gagal menyimpan catatan:", error);
    alert("Terjadi kesalahan saat menyimpan catatan.");
  }
};

window.deleteNote = async function(id) {
  if (confirm("Apakah Anda yakin ingin menghapus catatan ini?")) {
    try {
      await deleteDoc(doc(db, "notes", id));
      await loadNotes();
    } catch (error) {
      console.error("Gagal menghapus catatan:", error);
    }
  }
};

/* ==================== DROPDOWN & MODAL CONTROLS ==================== */

function renderFolderDropdown() {
  const container = document.getElementById('folderOptionsList');
  if (!container) return;

  container.innerHTML = '';

  // Pilihan tanpa folder
  const defaultOption = document.createElement('div');
  defaultOption.className = 'custom-dropdown-item';
  defaultOption.textContent = 'Tanpa Folder';
  defaultOption.onclick = () => selectFolderDropdownOption('', 'Tanpa Folder');
  container.appendChild(defaultOption);

  foldersList.forEach((folder) => {
    const item = document.createElement('div');
    item.className = 'custom-dropdown-item';
    item.textContent = folder.name;
    item.onclick = () => selectFolderDropdownOption(folder.id, folder.name);
    container.appendChild(item);
  });
}

function selectFolderDropdownOption(id, name) {
  document.getElementById('inputFolderId').value = id;
  document.querySelector('#dropdownFolder .selected-value').textContent = name;
  closeAllDropdowns();
}

window.toggleDropdown = function(id) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return;

  const isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) dropdown.classList.add('open');
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-dropdown')) closeAllDropdowns();
});

function closeAllDropdowns() {
  document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
}

window.openNoteModal = function(id = '', title = '', content = '', folderId = '') {
  document.getElementById('noteId').value = id;
  document.getElementById('inputNoteTitle').value = title;
  document.getElementById('inputNoteContent').value = content;
  document.getElementById('inputFolderId').value = folderId;

  const folderObj = foldersList.find(f => f.id === folderId);
  document.querySelector('#dropdownFolder .selected-value').textContent = folderObj ? folderObj.name : 'Tanpa Folder';

  document.getElementById('noteModalTitle').textContent = id ? 'EDIT CATATAN' : 'TAMBAH CATATAN BARU';
  document.getElementById('noteModal').classList.add('active');
};

window.closeNoteModal = function() {
  document.getElementById('noteModal').classList.remove('active');
  document.getElementById('noteForm').reset();
  document.getElementById('noteId').value = '';
  document.getElementById('inputFolderId').value = '';
};

window.openFolderModal = function() {
  document.getElementById('folderModal').classList.add('active');
};

window.closeFolderModal = function() {
  document.getElementById('folderModal').classList.remove('active');
  document.getElementById('newFolderInput').value = '';
};

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}