import { db } from '@services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function addEncounter(userId: string, data: {
  tags: string[];
  type: 'voice' | 'text';
  audioUrl?: string;
  title?: string;
  duration?: number;
  place?: string; // <-- Add this line
}) {
  return await addDoc(
    collection(db, 'users', userId, 'encounters'),
    {
      ...data,
      timestamp: serverTimestamp(),
    }
  );
}
