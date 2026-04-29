import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatApiError } from '../../services/errors';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api/v1';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: 'No se pudo completar la autenticación con Google. Intenta nuevamente.',
  no_userinfo: 'Google no devolvió la información del usuario.',
  missing_claims: 'Google no devolvió los datos requeridos.',
  email_not_verified: 'Tu correo de Google no está verificado.',
  user_inactive: 'Tu cuenta está inactiva. Contacta al administrador.',
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username.toLowerCase());
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, role, full_name, username: uname } = response.data;
      login(access_token, { role, full_name, username: uname });

      const destination = role && role.toLowerCase() === 'admin' ? '/admin' : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(formatApiError(err, 'Error al iniciar sesión. Verifica tus credenciales.'));
    } finally {
      setLoading(false);
    }
  };

  // Si regresamos del backend con ?oauth_error=xxx, mostrar el mensaje correspondiente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errCode = params.get('oauth_error');
    if (errCode) {
      setError(OAUTH_ERROR_MESSAGES[errCode] || 'Error al autenticar con Google.');
      window.history.replaceState(null, '', '/login');
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google/login`;
  };

  return (
    <div className="min-h-screen bg-cj-bg-primary flex items-center justify-center p-4">
      {/* Background Glow sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cj-accent-blue/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 bg-cj-surface border border-cj-border shadow-cj-lg rounded-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cj-text-primary">
            Proyectos <span className="text-cj-accent-blue">CJDG</span>
          </h1>
          <p className="text-cj-text-secondary mt-2 text-sm uppercase tracking-widest font-mono">Portal de Ingreso</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-cj-danger p-3 rounded-lg mb-6 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-cj-text-secondary mb-2">Nombre de Usuario</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-cj-text-muted" />
              </div>
              <input
                type="text"
                required
                minLength={4}
                className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue transition-all"
                placeholder="tu_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cj-text-secondary mb-2">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-cj-text-muted" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 btn-primary mt-6 group disabled:opacity-50"
          >
            {loading ? 'Validando...' : (
              <span className="flex items-center gap-2">
                Ingresar al Ecosistema <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </form>

        {/* OAuth UI (no funcional aún) */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cj-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-cj-surface text-cj-text-muted">o continúa con</span>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-secondary hover:text-cj-text-primary hover:border-cj-accent-blue transition-all text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuar con Google
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-cj-text-secondary border-t border-cj-border pt-6">
          ¿Representas una empresa nueva?{' '}
          <Link to="/register" className="text-cj-accent-blue hover:text-cj-accent-blue-hover transition-colors font-medium">
            Registrar Perfil Corporativo
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
