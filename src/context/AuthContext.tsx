import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Presence } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: 'teacher' | 'student') => Promise<void>;
  activeDM: { id: string, name: string } | null;
  setActiveDM: (dm: { id: string, name: string } | null) => void;
  navigateToChat: (id: string, name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Track presence
        const presenceRef = doc(db, 'presence', user.uid);
        setDoc(presenceRef, {
          status: 'online',
          displayName: user.displayName || 'Anonymous Student',
          lastSeen: new Date()
        }, { merge: true });

        // Update presence on disconnect
        const handleVisibility = () => {
          if (document.visibilityState === 'hidden') {
            setDoc(presenceRef, { status: 'offline', lastSeen: new Date() }, { merge: true });
          } else {
            setDoc(presenceRef, { 
              status: 'online', 
              displayName: user.displayName || 'Anonymous Student',
              lastSeen: new Date() 
            }, { merge: true });
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        // Fetch profile
        const profileRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          } else {
            setProfile(null);
          }
        });

        setLoading(false);
        return () => {
          unsubscribeProfile();
          document.removeEventListener('visibilitychange', handleVisibility);
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Check if user already has a profile
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // New user - they'll need to select a role in the UI
        // We'll handle this in the App.tsx logic
      }
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const logout = async () => {
    if (user) {
      const presenceRef = doc(db, 'presence', user.uid);
      await setDoc(presenceRef, { status: 'offline', lastSeen: new Date() }, { merge: true });
    }
    await signOut(auth);
  };

  const updateRole = async (role: 'teacher' | 'student') => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const profileData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      role,
      isApproved: role === 'teacher' ? true : false, // Students need approval, teachers auto for lite
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(userRef, profileData);
  };

  const [activeDM, setActiveDM] = useState<{ id: string, name: string } | null>(null);

  const navigateToChat = (id: string, name: string) => {
    setActiveDM({ id, name });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, updateRole, activeDM, setActiveDM, navigateToChat }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
