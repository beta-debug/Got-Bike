const firebaseConfig = {
    apiKey: "AIzaSyAfOzHPTPWTYKV8wwuyA1bP7WHyy7NteMM",
    authDomain: "got-bike.firebaseapp.com",
    databaseURL: "https://got-bike-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "got-bike",
    storageBucket: "got-bike.firebasestorage.app",
    messagingSenderId: "1069700911258",
    appId: "1:1069700911258:web:a587e0e7cd0221e02b0f23",
    measurementId: "G-8NVCQ8099S"
};

// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
