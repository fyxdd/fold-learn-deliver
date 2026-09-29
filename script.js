import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// -------------------------------------------------------------
// CONFIGURATION FIREBASE (Ganti dengan Kredensial Firebase Kamu)
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAgan50HUl6aDIdbxSFnsrZXVCSapdwin8",
  authDomain: "fld-system.firebaseapp.com",
  projectId: "fld-system",
  storageBucket: "fld-system.firebasestorage.app",
  messagingSenderId: "737737809243",
  appId: "1:737737809243:web:db8f97e82f366631b14e7e"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;

// Memantau Status Login User
onAuthStateChanged(auth, async (user) => {
  const loggedOutState = document.getElementById('loggedOutState');
  const loggedInState = document.getElementById('loggedInState');

  if (user) {
    currentUser = user;
    loggedOutState.style.display = 'none';
    loggedInState.style.display = 'block';
    
    // Ambil data profil dari Firestore Cloud
    await loadUserProfile(user.uid, user.displayName);
  } else {
    currentUser = null;
    loggedOutState.style.display = 'block';
    loggedInState.style.display = 'none';
  }
});

// LOGIN DENGAN GOOGLE
window.loginWithGoogle = async function() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Gagal Login:", error);
    alert("Gagal login ke Google. Periksa konfigurasi Firebase.");
  }
};

// LOGOUT
window.logoutGoogle = async function() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Gagal Logout:", error);
  }
};

// MENGAMBIL DATA PROFIL DARI FIRESTORE
async function loadUserProfile(uid, defaultName) {
  const userDocRef = doc(db, "users", uid);
  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById('profileName').textContent = data.name || defaultName;
    document.getElementById('profileClass').textContent = data.className || 'Belum diisi';
  } else {
    // Jika user baru, buatkan profil awal
    const newProfile = {
      name: defaultName || 'Mahasiswa',
      className: 'IK-01'
    };
    await setDoc(userDocRef, newProfile);
    document.getElementById('profileName').textContent = newProfile.name;
    document.getElementById('profileClass').textContent = newProfile.className;
  }
}

// MODAL CONTROLS
window.openProfileModal = function() {
  document.getElementById('inputName').value = document.getElementById('profileName').textContent;
  document.getElementById('inputClass').value = document.getElementById('profileClass').textContent;
  document.getElementById('profileModal').classList.add('active');
};

window.closeProfileModal = function() {
  document.getElementById('profileModal').classList.remove('active');
};

// SIMPAN PROFIL KE FIRESTORE (CLOUD)
window.saveProfile = async function(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Kamu harus login terlebih dahulu.");
    return;
  }

  const newName = document.getElementById('inputName').value.trim();
  const newClass = document.getElementById('inputClass').value.trim();

  if (newName && newClass) {
    const userDocRef = doc(db, "users", currentUser.uid);
    
    try {
      // Simpan langsung ke database Firestore
      await setDoc(userDocRef, {
        name: newName,
        className: newClass
      }, { merge: true });

      document.getElementById('profileName').textContent = newName;
      document.getElementById('profileClass').textContent = newClass;

      window.closeProfileModal();
    } catch (error) {
      console.error("Gagal menyimpan ke Cloud:", error);
      alert("Terjadi kesalahan saat menyimpan data ke cloud.");
    }
  }
};