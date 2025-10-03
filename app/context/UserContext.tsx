import { UserProfile } from '@/types/UserProfile';
import { auth, db } from '@services/firebase';
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

type UserContextType = {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  clearUserProfile: () => void;
  register: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Register a new user
  const register = async (email: string, password: string, name?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Optionally update display name in Firebase Auth
    if (name) {
      await updateProfile(user, { displayName: name });
    }

    // Create user profile in Firestore
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email ?? email,
      name: name ?? user.displayName ?? '',
    };
    await setDoc(doc(db, 'users', user.uid), profile);

    setUserProfile(profile);
  };

  // Login an existing user
  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user profile from Firestore
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    let profile: UserProfile;
    if (docSnap.exists()) {
      profile = docSnap.data() as UserProfile;
    } else {
      // Fallback: create a minimal profile if not found
      profile = {
        uid: user.uid,
        email: user.email ?? email,
        name: user.displayName ?? '',
      };
      // Save to Firestore for consistency
      await setDoc(doc(db, 'users', user.uid), profile);
    }
    setUserProfile(profile);
  };

  // Logout user
  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const clearUserProfile = () => setUserProfile(null);

  const isAuthenticated = !!userProfile?.uid;

  // Persistent login effect: auto-fetch user profile on auth state change
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          let profile: UserProfile;
          if (docSnap.exists()) {
            profile = docSnap.data() as UserProfile;
          } else {
            profile = {
              uid: user.uid,
              email: user.email ?? '',
              name: user.displayName ?? '',
            };
            // Save to Firestore for consistency
            await setDoc(doc(db, 'users', user.uid), profile);
          }
          setUserProfile(profile);
        } catch (err) {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <UserContext.Provider
      value={{
        userProfile,
        setUserProfile,
        clearUserProfile,
        register,
        login,
        logout,
        isAuthenticated,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserContext must be used within a UserProvider');
  return ctx;
}
