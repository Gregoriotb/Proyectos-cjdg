import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
      setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthClick = (provider: string) => {
    setError(`Autenticación con ${provider} estará disponible próximamente.`);
  };

  return (
    <div className="min-h-screen bg-cj-bg-primary flex items-center justify-center p-4">
      {/* Background Glow sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cj-accent-blue/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 bg-cj-surface border border-cj-border shadow-cj-lg rounded-xl p-8">
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

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuthClick('Google')}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-secondary hover:text-cj-text-primary hover:border-cj-accent-blue transition-all text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthClick('GitHub')}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-secondary hover:text-cj-text-primary hover:border-cj-accent-blue transition-all text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
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
