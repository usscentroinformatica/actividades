import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyACZMmhj1EqO-0pRCddDwJUCEZ8QRr6HPk",
  authDomain: "calendario-41748.firebaseapp.com",
  projectId: "calendario-41748",
  storageBucket: "calendario-41748.firebasestorage.app",
  messagingSenderId: "763224273395",
  appId: "1:763224273395:web:0821a81d312d37d9442286"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);