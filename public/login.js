import { auth, signInWithEmailAndPassword, onAuthStateChanged } from "./firebase-config.js";

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');
const loginBtn = document.getElementById('login-btn');

// Check if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "admin.html";
    }
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    loginBtn.textContent = "Signing In...";
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Successful login will trigger onAuthStateChanged redirect
    } catch (error) {
        console.error("Login Failed", error);
        let message = "Login Failed. Please check your credentials.";
        if (error.code === 'auth/invalid-credential') {
            message = "Incorrect email or password.";
        } else if (error.code === 'auth/too-many-requests') {
            message = "Too many failed attempts. Try again later.";
        }
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        loginBtn.textContent = "Sign In";
        loginBtn.disabled = false;
    }
});
