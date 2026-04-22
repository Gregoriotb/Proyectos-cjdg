import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      // 1) Leer token del URL fragment (#token=xxx). Los fragments no viajan al servidor ni a logs.
      const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      const params = new URLSearchParams(fragment);
      const token = params.get('token');

      if (!token) {
        setError('No se recibió un token de autenticación. Intenta de nuevo.');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
        return;
      }

      // 2) Guardar token y consultar /auth/verify para obtener datos del usuario
      localStorage.setItem('cjdg_token', token);
      try {
        const res = await api.get('/auth/verify');
        login(token, res.data);

        // 3) Decidir destino:
        //    - Admin → /admin
        //    - OAuth user sin account_type definido → /onboarding (eligen empresa o particular)
        //    - Resto → /dashboard
        const role = (res.data.role || '').toLowerCase();
        const isOAuthFirstLogin = !!res.data.oauth_provider && !res.data.account_type;

        let destination = '/dashboard';
        if (role === 'admin') destination = '/admin';
        else if (isOAuthFirstLogin) destination = '/onboarding';

        window.history.replaceState(null, '', destination);
        navigate(destination, { replace: true });
      } catch {
        localStorage.removeItem('cjdg_token');
        setError('No se pudo validar la sesión. Intenta iniciar sesión nuevamente.');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      }
    };

    run();
  }, [login, navigate]);

  return (
    <div className="min-h-screen bg-cj-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-cj-surface border border-cj-border shadow-cj-lg rounded-xl p-8 text-center">
        {error ? (
          <>
            <AlertCircle className="w-10 h-10 text-cj-danger mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-cj-text-primary mb-2">Error de autenticación</h2>
            <p className="text-sm text-cj-text-secondary">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-cj-accent-blue mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold text-cj-text-primary mb-2">Validando sesión</h2>
            <p className="text-sm text-cj-text-secondary">Terminando el inicio de sesión con Google...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
