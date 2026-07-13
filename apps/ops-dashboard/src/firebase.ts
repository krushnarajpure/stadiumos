import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCexoqWZRhs5goW9bCM-tb8qMClWw9CHc0",
    authDomain: "stadiumos-57c48.firebaseapp.com",
    projectId: "stadiumos-57c48",
    storageBucket: "stadiumos-57c48.firebasestorage.app",
    messagingSenderId: "14461695521",
    appId: "1:14461695521:web:eb92f7b0a812c7a821d560",
    measurementId: "G-TJQMHR3FZ5",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;