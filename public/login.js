import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "./firebase-config.js";

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');

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
            message = "User not found or password incorrect. Try 'Create Account'.";
        } else if (error.code === 'auth/too-many-requests') {
            message = "Too many failed attempts. Try again later.";
        }
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        loginBtn.textContent = "Sign In";
        loginBtn.disabled = false;
    }
});

// Handle Register
if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            errorMsg.textContent = "Please enter email and password.";
            errorMsg.style.display = 'block';
            return;
        }

        registerBtn.textContent = "Creating Account...";
        registerBtn.disabled = true;
        errorMsg.style.display = 'none';

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("Account Created! Use 'Sign In' now.");
            registerBtn.textContent = "Account Created!";
        } catch (error) {
            console.error("Registration Failed", error);
            let message = "Registration Failed: " + error.message;
            if (error.code === 'auth/email-already-in-use') {
                message = "Account already exists! Please check your password.";
            } else if (error.code === 'auth/weak-password') {
                message = "Password should be at least 6 characters.";
            }
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
            registerBtn.textContent = "First Time? Create Account";
            registerBtn.disabled = false;
        }
    });
}
