import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../services/api';

export type AccountType = 'empresa' | 'particular';

export interface UserData {
  id?: string;
  full_name: string;
  role: 'admin' | 'tecnico' | 'cliente';
  username: string;
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  company_name?: string | null;
  fiscal_address?: string | null;
  rif?: string | null;
  rif_file_url?: string | null;
  account_type?: AccountType | null;
  profile_photo_url?: string | null;
  oauth_provider?: string | null;
  has_password?: boolean;
}

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: UserData) => void;
  logout: () => void;
  verifySession: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (raw: any): UserData => ({
  id: raw.id,
  full_name: raw.full_name,
  role: (raw.role || '').toLowerCase() as UserData['role'],
  username: raw.username,
  email: raw.email,
  first_name: raw.first_name ?? null,
  last_name: raw.last_name ?? null,
  phone: raw.phone ?? null,
  company_name: raw.company_name ?? null,
  fiscal_address: raw.fiscal_address ?? null,
  rif: raw.rif ?? null,
  rif_file_url: raw.rif_file_url ?? null,
  account_type: (raw.account_type ?? null) as AccountType | null,
  profile_photo_url: raw.profile_photo_url ?? null,
  oauth_provider: raw.oauth_provider ?? null,
  has_password: raw.has_password ?? false,
});

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
      const userData = normalizeUser(res.data);
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

  // Re-fetch del perfil sin invalidar la sesión (uso post-update)
  const refreshUser = useCallback(async () => {
    await verifySession();
  }, [verifySession]);

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
    const normalized = normalizeUser({ ...userData, role: userData.role });
    localStorage.setItem('cjdg_token', token);
    localStorage.setItem('cjdg_user', JSON.stringify(normalized));
    setUser(normalized);
  };

  const logout = () => {
    localStorage.removeItem('cjdg_token');
    localStorage.removeItem('cjdg_user');
    setUser(null);
    // SC-SECURITY-01: Limpiar historial para que "atrás" no restaure sesión.
    // Full reload (replace) para que el widget de WebChat reinicialice con visitorId "anon".
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, verifySession, refreshUser }}
    >
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
