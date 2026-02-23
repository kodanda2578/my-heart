// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCfddW-OgvCOEVH7VZTDLAnICsevBkZ3Z8",
    authDomain: "my-heart-project-a8106.firebaseapp.com",
    projectId: "my-heart-project-a8106",
    storageBucket: "my-heart-project-a8106.firebasestorage.app",
    messagingSenderId: "578684387018",
    appId: "1:578684387018:web:447097fd1eedb42aedfe33",
    measurementId: "G-K4J62VJ2V4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export instances for use in other files
export { auth, db, storage, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, doc, getDoc, setDoc, updateDoc, ref, uploadBytes, getDownloadURL };
