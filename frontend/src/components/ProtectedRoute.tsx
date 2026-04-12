import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

const ProtectedRoute = ({ adminOnly = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, verifySession } = useAuth();

  // Verificación en segundo plano (no bloquea el render)
  useEffect(() => {
    if (isAuthenticated) {
      verifySession();
    }
  }, [isAuthenticated, verifySession]);

  // Skeleton mientras carga el estado inicial de AuthContext
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cjdg-darker">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cjdg-primary"></div>
          <p className="text-cjdg-textMuted text-sm font-mono">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si requiere admin y el rol no es admin
  if (adminOnly && user?.role?.toLowerCase() !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
