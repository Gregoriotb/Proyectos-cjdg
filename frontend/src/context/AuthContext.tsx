import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface UserData {
  full_name: string;
  role: 'admin' | 'tecnico' | 'cliente';
  username: string;
}

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: UserData) => void;
  logout: () => void;
  verifySession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificación de sesión contra backend
  const verifySession = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('cjdg_token');
    if (!token) {
      setUser(null);
      return false;
    }

    try {
      const res = await api.get('/auth/verify');
      const userData: UserData = {
        role: res.data.role.toLowerCase(),
        full_name: res.data.full_name,
        username: res.data.username,
      };
      setUser(userData);
      localStorage.setItem('cjdg_user', JSON.stringify(userData));
      return true;
    } catch {
      // Token inválido o expirado
      localStorage.removeItem('cjdg_token');
      localStorage.removeItem('cjdg_user');
      setUser(null);
      return false;
    }
  }, []);

  // Bootstrapping: intenta recuperar sesión del localStorage y verificar
  useEffect(() => {
    const token = localStorage.getItem('cjdg_token');
    const storedUser = localStorage.getItem('cjdg_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('cjdg_token');
        localStorage.removeItem('cjdg_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: UserData) => {
    // Normalizar role a lowercase para consistencia
    const normalized = { ...userData, role: userData.role.toLowerCase() as UserData['role'] };
    localStorage.setItem('cjdg_token', token);
    localStorage.setItem('cjdg_user', JSON.stringify(normalized));
    setUser(normalized);
  };

  const logout = () => {
    localStorage.removeItem('cjdg_token');
    localStorage.removeItem('cjdg_user');
    setUser(null);
    // SC-SECURITY-01: Limpiar historial para que "atrás" no restaure sesión
    window.history.replaceState(null, '', '/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, verifySession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
