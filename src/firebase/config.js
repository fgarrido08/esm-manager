import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB9FZru2eZTzahJzgAgO_Fca5rzLCHa5ZM",
  authDomain: "esm-manager.firebaseapp.com",
  projectId: "esm-manager",
  storageBucket: "esm-manager.firebasestorage.app",
  messagingSenderId: "501285071574",
  appId: "1:501285071574:web:75f88dab14a0cf21ca7777"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);