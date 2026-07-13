import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface UserRole {
  name: string;
}

export interface UserProfile {
  id: string;
  email: string;
  roles: UserRole[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mapFirestoreRoleToRoles = (role: string): UserRole[] => {
  const roleName = role === 'operator' ? 'Operations Manager' : role;
  return [{ name: roleName }];
};

const buildUserProfile = async (firebaseUser: FirebaseUser): Promise<UserProfile> => {
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  const data = userDoc.data();
  const role = typeof data?.role === 'string' ? data.role : 'operator';

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    roles: mapFirestoreRoleToRoles(role),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await buildUserProfile(firebaseUser);
          setUser(profile);
        } catch {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            roles: mapFirestoreRoleToRoles('operator'),
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await buildUserProfile(credential.user);
    setUser(profile);
    navigate('/');
  };

  const register = async (email: string, pass: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    const { uid } = credential.user;

    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      role: 'operator',
      createdAt: serverTimestamp(),
    });

    setUser({
      id: uid,
      email,
      roles: mapFirestoreRoleToRoles('operator'),
    });
    navigate('/');
  };

  const logout = () => {
    signOut(auth)
      .then(() => {
        setUser(null);
        navigate('/login');
      })
      .catch(() => {
        setUser(null);
        navigate('/login');
      });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be called within an AuthProvider');
  return context;
};
