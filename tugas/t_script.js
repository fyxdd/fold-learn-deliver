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
  where 
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

// Inisialisasi
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let subjectsList = [];

// MAPEL DEFAULT jika user belum memiliki mapel tersimpan
const DEFAULT_SUBJECTS = ["Matematika", "Fisika", "Kimia", "Biologi", "Bahasa Indonesia", "Bahasa Inggris"];

// Pantau Status Auth User
onAuthStateChanged(auth, async (user) => {
  const authNotice = document.getElementById('authNotice');
  const taskGrid = document.getElementById('taskGrid');
  const headerActions = document.getElementById('headerActions');

  if (user) {
    currentUser = user;
    authNotice.style.display = 'none';
    taskGrid.style.display = 'grid';
    headerActions.style.display = 'flex';

    await loadSubjects();
    await loadTasks();
  } else {
    currentUser = null;
    authNotice.style.display = 'block';
    taskGrid.style.display = 'none';
    headerActions.style.display = 'none';
  }
});

// MEMUAT DAFTAR MATA PELAJARAN DARI FIRESTORE
async function loadSubjects() {
  subjectsList = [];
  try {
    const q = query(collection(db, "subjects"), where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      for (const name of DEFAULT_SUBJECTS) {
        const docRef = await addDoc(collection(db, "subjects"), {
          userId: currentUser.uid,
          name: name
        });
        subjectsList.push({ id: docRef.id, name: name });
      }
    } else {
      querySnapshot.forEach((docSnap) => {
        subjectsList.push({ id: docSnap.id, name: docSnap.data().name });
      });
    }

    subjectsList.sort((a, b) => a.name.localeCompare(b.name));
    renderCustomSubjectOptions();
    renderSubjectManageList();
  } catch (error) {
    console.error("Gagal memuat mata pelajaran:", error);
  }
}

// RENDER OPTION CUSTOM DROPDOWN MAPEL
function renderCustomSubjectOptions() {
  const optionsContainer = document.getElementById('subjectOptionsList');
  const hiddenInput = document.getElementById('inputSubject');
  const triggerLabel = document.querySelector('#dropdownSubject .selected-value');

  optionsContainer.innerHTML = '';

  subjectsList.forEach((sub) => {
    const item = document.createElement('div');
    item.className = 'custom-dropdown-item';
    if (hiddenInput.value === sub.name) {
      item.classList.add('selected');
    }
    item.textContent = sub.name;
    item.onclick = () => selectSubjectOption(sub.name);
    optionsContainer.appendChild(item);
  });

  if (hiddenInput.value) {
    triggerLabel.textContent = hiddenInput.value;
  } else {
    triggerLabel.textContent = 'Pilih Mata Pelajaran';
  }
}

// PILIH ITEM MATA PELAJARAN
window.selectSubjectOption = function(val) {
  document.getElementById('inputSubject').value = val;
  document.querySelector('#dropdownSubject .selected-value').textContent = val;
  closeAllDropdowns();
  renderCustomSubjectOptions();
};

// PILIH ITEM STATUS
window.selectStatusOption = function(val) {
  document.getElementById('inputStatus').value = val;
  document.querySelector('#dropdownStatus .selected-value').textContent = val;
  
  const items = document.querySelectorAll('#dropdownStatus .custom-dropdown-item');
  items.forEach(item => {
    if (item.textContent.trim() === val || (val === 'Proses' && item.textContent.includes('Dikerjakan'))) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });

  closeAllDropdowns();
};

// TOGGLE DROPDOWN
window.toggleDropdown = function(id) {
  const dropdown = document.getElementById(id);
  const isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) {
    dropdown.classList.add('open');
  }
};

// TUTUP SEMUA DROPDOWN JIKA KLIK DI LUAR
document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-dropdown')) {
    closeAllDropdowns();
  }
});

function closeAllDropdowns() {
  document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
}

// RENDER LIST KELOLA MAPEL
function renderSubjectManageList() {
  const listEl = document.getElementById('subjectList');
  listEl.innerHTML = '';

  if (subjectsList.length === 0) {
    listEl.innerHTML = '<p style="color: #666; padding: 8px;">Belum ada mata pelajaran.</p>';
    return;
  }

  subjectsList.forEach((sub) => {
    const item = document.createElement('div');
    item.className = 'subject-item';
    item.innerHTML = `
      <span>${escapeHtml(sub.name)}</span>
      <button class="btn-del-subject" onclick="deleteSubject('${sub.id}')" title="Hapus Mapel">&times;</button>
    `;
    listEl.appendChild(item);
  });
}

// TAMBAH MAPEL BARU
window.handleAddSubject = async function(e) {
  e.preventDefault();
  const inputEl = document.getElementById('newSubjectInput');
  const name = inputEl.value.trim();

  if (!name || !currentUser) return;

  if (subjectsList.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    alert("Mata pelajaran ini sudah ada dalam daftar!");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "subjects"), {
      userId: currentUser.uid,
      name: name
    });
    subjectsList.push({ id: docRef.id, name: name });
    subjectsList.sort((a, b) => a.name.localeCompare(b.name));

    inputEl.value = '';
    renderCustomSubjectOptions();
    renderSubjectManageList();
  } catch (error) {
    console.error("Gagal menambahkan mapel:", error);
    alert("Gagal menambahkan mata pelajaran.");
  }
};

// HAPUS MAPEL
window.deleteSubject = async function(id) {
  if (confirm("Apakah Anda yakin ingin menghapus mata pelajaran ini?")) {
    try {
      await deleteDoc(doc(db, "subjects", id));
      subjectsList = subjectsList.filter(s => s.id !== id);
      
      const hiddenSubject = document.getElementById('inputSubject').value;
      if (!subjectsList.some(s => s.name === hiddenSubject)) {
        document.getElementById('inputSubject').value = '';
      }

      renderCustomSubjectOptions();
      renderSubjectManageList();
    } catch (error) {
      console.error("Gagal menghapus mapel:", error);
      alert("Gagal menghapus mata pelajaran.");
    }
  }
};

// MEMUAT TUGAS DARI FIRESTORE
async function loadTasks() {
  const taskGrid = document.getElementById('taskGrid');
  taskGrid.innerHTML = '<p style="color: #666;">Memuat data tugas...</p>';

  try {
    const q = query(collection(db, "tasks"), where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      taskGrid.innerHTML = '<p style="color: #666; grid-column: 1/-1;">Belum ada tugas yang ditambahkan.</p>';
      return;
    }

    taskGrid.innerHTML = '';
    querySnapshot.forEach((docSnap) => {
      const task = docSnap.data();
      const taskId = docSnap.id;

      let badgeClass = 'badge-pending';
      if (task.status === 'Proses') badgeClass = 'badge-progress';
      if (task.status === 'Selesai') badgeClass = 'badge-done';

      const taskCard = document.createElement('div');
      taskCard.className = 'task-card';
      taskCard.innerHTML = `
        <div>
          <div class="task-subject">${escapeHtml(task.subject)}</div>
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
        </div>
        
        <div>
          <div class="task-meta">
            <span class="task-deadline"><i class="fi fi-rr-calendar"></i> ${task.deadline}</span>
            <span class="badge ${badgeClass}">${task.status}</span>
          </div>

          <div class="task-actions">
            ${task.link ? `<a href="${escapeHtml(task.link)}" target="_blank" class="btn-sm">LINK</a>` : ''}
            <button class="btn-sm" onclick="openTaskModal('${taskId}', '${escapeHtml(task.subject)}', '${escapeHtml(task.title)}', '${task.deadline}', '${task.status}', '${escapeHtml(task.link || '')}')">EDIT</button>
            <button class="btn-sm btn-delete" onclick="deleteTask('${taskId}')">HAPUS</button>
          </div>
        </div>
      `;

      taskGrid.appendChild(taskCard);
    });
  } catch (error) {
    console.error("Gagal memuat tugas:", error);
    taskGrid.innerHTML = '<p style="color: #ff4444;">Gagal memuat daftar tugas.</p>';
  }
}

// SIMPAN ATAU UPDATE TUGAS
window.handleTaskSubmit = async function(e) {
  e.preventDefault();

  if (!currentUser) return;

  const taskId = document.getElementById('taskId').value;
  const subject = document.getElementById('inputSubject').value;
  const title = document.getElementById('inputTitle').value.trim();
  const deadline = document.getElementById('inputDeadline').value;
  const status = document.getElementById('inputStatus').value;
  const link = document.getElementById('inputLink').value.trim();

  if (!subject) {
    alert("Silakan pilih mata pelajaran terlebih dahulu!");
    return;
  }

  const taskData = {
    userId: currentUser.uid,
    subject,
    title,
    deadline,
    status,
    link,
    updatedAt: new Date()
  };

  try {
    if (taskId) {
      await updateDoc(doc(db, "tasks", taskId), taskData);
    } else {
      await addDoc(collection(db, "tasks"), taskData);
    }

    closeTaskModal();
    await loadTasks();
  } catch (error) {
    console.error("Gagal menyimpan tugas:", error);
    alert("Terjadi kesalahan saat menyimpan data tugas.");
  }
};

// HAPUS TUGAS
window.deleteTask = async function(id) {
  if (confirm("Apakah Anda yakin ingin menghapus tugas ini?")) {
    try {
      await deleteDoc(doc(db, "tasks", id));
      await loadTasks();
    } catch (error) {
      console.error("Gagal menghapus tugas:", error);
      alert("Gagal menghapus tugas.");
    }
  }
};

// MODAL CONTROLS - TASK
window.openTaskModal = function(id = '', subject = '', title = '', deadline = '', status = 'Belum Selesai', link = '') {
  document.getElementById('taskId').value = id;
  document.getElementById('inputSubject').value = subject;
  document.getElementById('inputTitle').value = title;
  document.getElementById('inputDeadline').value = deadline;

  selectStatusOption(status);
  renderCustomSubjectOptions();

  document.getElementById('inputLink').value = link;
  document.getElementById('modalTitle').textContent = id ? 'EDIT TUGAS' : 'TAMBAH TUGAS BARU';
  document.getElementById('taskModal').classList.add('active');
};

window.closeTaskModal = function() {
  document.getElementById('taskModal').classList.remove('active');
  document.getElementById('taskForm').reset();
  document.getElementById('taskId').value = '';
  document.getElementById('inputSubject').value = '';
  selectStatusOption('Belum Selesai');
  closeAllDropdowns();
};

// MODAL CONTROLS - SUBJECT
window.openSubjectModal = function() {
  document.getElementById('subjectModal').classList.add('active');
};

window.closeSubjectModal = function() {
  document.getElementById('subjectModal').classList.remove('active');
  document.getElementById('newSubjectInput').value = '';
};

// Utility Sanitasi Karakter Input
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}