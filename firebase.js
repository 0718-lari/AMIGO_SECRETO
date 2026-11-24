
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDjvSOQOi3XmYyWe_8-kX6HYDmq5idg7CI",
    authDomain: "amigosecretonatal.firebaseapp.com",
    projectId: "amigosecretonatal",
    storageBucket: "amigosecretonatal.firebasestorage.app",
    messagingSenderId: "1070630372132",
    appId: "1:1070630372132:web:bd95c36951f8e19cc929b1"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { app, db };
