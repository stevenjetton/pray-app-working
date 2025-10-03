import type { Encounter } from '@/types/Encounter';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from './firebaseService';

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

// Fetch recent encounters (default: 3)
export async function fetchRecentEncounters(userUid: string, limitCount = 3): Promise<Encounter[]> {
  try {
    const q = query(
      collection(db, 'users', userUid, 'encounters'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Encounter));
  } catch (error) {
    handleFirestoreError(error, "fetchRecentEncounters");
    return [];
  }
}

// Fetch top favorites (default: 5)
export async function fetchTopFavorites(userUid: string, limitCount = 5): Promise<Encounter[]> {
  try {
    const q = query(
      collection(db, 'users', userUid, 'encounters'),
      where('favorite', '==', true),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Encounter));
  } catch (error) {
    handleFirestoreError(error, "fetchTopFavorites");
    return [];
  }
}

// Fetch most viewed (default: 5)
export async function fetchMostViewed(userUid: string, limitCount = 5): Promise<Encounter[]> {
  try {
    const q = query(
      collection(db, 'users', userUid, 'encounters'),
      orderBy('views', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Encounter));
  } catch (error) {
    handleFirestoreError(error, "fetchMostViewed");
    return [];
  }
}

// Fetch all encounters (for stats, etc.)
export async function fetchAllEncounters(userUid: string): Promise<Encounter[]> {
  try {
    const q = query(
      collection(db, 'users', userUid, 'encounters'),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Encounter));
  } catch (error) {
    handleFirestoreError(error, "fetchAllEncounters");
    return [];
  }
}

// Fetch a single encounter by ID
export async function fetchEncounter(userUid: string, encounterId: string): Promise<Encounter | null> {
  try {
    const docRef = doc(db, 'users', userUid, 'encounters', encounterId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as Encounter : null;
  } catch (error) {
    handleFirestoreError(error, "fetchEncounter");
    return null;
  }
}

// Add a new encounter (returns the new doc ID)
export async function addEncounter(userUid: string, data: Omit<Encounter, 'id'>): Promise<string | undefined> {
  try {
    const encountersRef = collection(db, 'users', userUid, 'encounters');
    const newDocRef = doc(encountersRef);
    await setDoc(newDocRef, data);
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, "addEncounter");
  }
}

// Update an encounter by ID
export async function updateEncounter(userUid: string, encounterId: string, data: Partial<Encounter>) {
  try {
    const docRef = doc(db, 'users', userUid, 'encounters', encounterId);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, "updateEncounter");
  }
}

// Delete an encounter by ID
export async function deleteEncounter(userUid: string, encounterId: string) {
  try {
    const docRef = doc(db, 'users', userUid, 'encounters', encounterId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, "deleteEncounter");
  }
}
