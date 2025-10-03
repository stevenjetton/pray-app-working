import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Your Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyB8vzSmdFR0vOoRKjIAyuemOQ6BBApiqx8",
  authDomain: "projects-cfe0d.firebaseapp.com",
  projectId: "projects-cfe0d",
  storageBucket: "projects-cfe0d.appspot.com", // <-- fixed typo: should be .appspot.com
  messagingSenderId: "604129584678",
  appId: "1:604129584678:web:5abb5c9dbaf1c47d0568e7"
};

// --- Initialize Firebase app (singleton pattern) ---
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// --- Initialize Auth with persistence for React Native ---
const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;
const initializeAuth = firebaseAuth.initializeAuth;
const getAuth = firebaseAuth.getAuth;

let auth: firebaseAuth.Auth;

try {
  auth = initializeAuth(app, {
    persistence: reactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

// --- Initialize Firestore ---
const db = getFirestore(app);

// --- Export for use in your app ---
export { auth, db };
