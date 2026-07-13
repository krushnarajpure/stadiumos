import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const bootstrapUser = async () => {
      const token = localStorage.getItem('stadiumos_access_token');
      if (token) {
        try {
          const res = await api.get('/api/v1/users/me');
          setUser(res.data);
        } catch (e) {
          localStorage.removeItem('stadiumos_access_token');
        }
      }
      setLoading(false);
    };
    bootstrapUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.post('/api/v1/auth/login', { email, password: pass });
    const { access_token, refresh_token } = res.data;
    
    localStorage.setItem('stadiumos_access_token', access_token);
    localStorage.setItem('stadiumos_refresh_token', refresh_token);
    
    const profileRes = await api.get('/api/v1/users/me');
    setUser(profileRes.data);
    navigate('/');
  };

  const register = async (email: string, pass: string) => {
    await api.post('/api/v1/auth/register', {
      email,
      password: pass,
      account_type: 'operator',
    });
    await login(email, pass);
  };

  const logout = () => {
    localStorage.removeItem('stadiumos_access_token');
    localStorage.removeItem('stadiumos_refresh_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be called within an AuthProvider");
  return context;
};
