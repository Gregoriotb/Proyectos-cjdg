/// <reference types="vite/client" />
import axios from 'axios';

// Utiliza la variable de entorno o un default de desarrollo
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api/v1';

export const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Construye la URL absoluta basada en el API_URL base (ej: quita /api/v1)
  const baseUrl = API_URL.replace('/api/v1', '');
  return `${baseUrl}${path}`;
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar automáticamente el JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cjdg_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores 401 unificados
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // No interceptar 401 en rutas de auth (login, register, verify, check-username)
    const isAuthRoute = url.includes('/auth/');
    if (error.response?.status === 401 && !isAuthRoute) {
      console.warn("Sesión expirada o no autorizada.");
      localStorage.removeItem('cjdg_token');
      localStorage.removeItem('cjdg_user');
    }
    return Promise.reject(error);
  }
);
