import { deleteDoc, doc, getDoc, getFirestore, setDoc, updateDoc } from "firebase/firestore";

// Initialize Firestore only once
export const db = getFirestore();

// --- Error Handling Helper ---
function handleFirestoreError(error: unknown, context: string) {
  if (error instanceof Error) {
    console.error(`[Firestore] ${context}:`, error.message);
    throw new Error(`[${context}] ${error.message}`);
  } else {
    console.error(`[Firestore] ${context}:`, error);
    throw new Error(`[${context}] Unknown error`);
  }
}

// Generic Firestore Operations
export async function getDocument(path: string) {
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    handleFirestoreError(error, "getDocument");
  }
}

export async function setDocument(path: string, data: any) {
  try {
    const docRef = doc(db, path);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, "setDocument");
  }
}

export async function updateDocument(path: string, data: any) {
  try {
    const docRef = doc(db, path);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, "updateDocument");
  }
}

export async function deleteDocument(path: string) {
  try {
    const docRef = doc(db, path);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, "deleteDocument");
  }
}

// Centralized User Profile Fetch/Create
export async function getOrCreateUserProfile(uid: string, defaultProfile: any = {}) {
  try {
    const path = `users/${uid}`;
    const userDoc = await getDocument(path);
    if (userDoc) return userDoc;
    await setDocument(path, defaultProfile);
    return defaultProfile;
  } catch (error) {
    handleFirestoreError(error, "getOrCreateUserProfile");
  }
}
