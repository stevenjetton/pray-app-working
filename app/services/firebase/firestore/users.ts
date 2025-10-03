
import { db } from '@services/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function createUserProfile(user: { uid: string, email: string, name?: string }) {
  await setDoc(
    doc(db, 'users', user.uid),
    {
      email: user.email,
      name: user.name || '',
      createdAt: new Date(),
    },
    { merge: true }
  );
}
