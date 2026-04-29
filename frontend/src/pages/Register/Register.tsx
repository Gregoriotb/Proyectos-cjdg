import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, Building, AlertCircle, ArrowRight, ArrowLeft, Check, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api/v1';

const STEPS = [
  { label: 'Cuenta', description: 'Datos de acceso' },
  { label: 'Perfil', description: 'Datos personales' },
  { label: 'Términos', description: 'Condiciones de uso' },
];

const Register = () => {
  const [step, setStep] = useState(0);

  // Step 1: Datos de cuenta
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Step 2: Datos personales
  const [fullName, setFullName] = useState('');

  // Step 3: T&C
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Estado general
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- Validación de username en tiempo real (debounced) ---
  const checkUsername = useCallback(async (value: string) => {
    if (value.length < 4) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await api.post('/auth/check-username', { username: value });
      setUsernameAvailable(res.data.available);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 4 && /^[a-zA-Z0-9_]+$/.test(username)) {
        checkUsername(username);
      } else {
        setUsernameAvailable(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  // --- Validaciones por paso ---
  const isStep1Valid = () => {
    return (
      username.length >= 4 &&
      /^[a-zA-Z0-9_]+$/.test(username) &&
      usernameAvailable === true &&
      email.length > 0 &&
      password.length >= 6 &&
      confirmPassword === password
    );
  };

  const isStep2Valid = () => fullName.trim().length > 0;
  const isStep3Valid = () => acceptedTerms;

  const handleNext = () => {
    setError('');
    if (step === 0 && !isStep1Valid()) {
      setError('Completa todos los campos correctamente antes de continuar.');
      return;
    }
    if (step === 1 && !isStep2Valid()) {
      setError('El nombre completo es obligatorio.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setStep((prev) => prev - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep3Valid()) return;
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', {
        username: username.toLowerCase(),
        email,
        password,
        confirm_password: confirmPassword,
        full_name: fullName,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocurrió un error al registrar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google/login`;
  };

  // --- Indicador de pasos ---
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                i < step
                  ? 'bg-green-500 text-cj-text-primary'
                  : i === step
                  ? 'bg-cj-accent-blue text-white ring-2 ring-cj-accent-blue/40'
                  : 'bg-cj-bg-secondary text-cj-text-muted border border-cj-border'
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1.5 ${i === step ? 'text-cj-text-primary' : 'text-cj-text-secondary'}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-12 h-0.5 mx-2 mt-[-14px] transition-all duration-300 ${i < step ? 'bg-green-500' : 'bg-cj-border'}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // --- Username feedback visual ---
  const UsernameFeedback = () => {
    if (username.length < 4) return null;
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return <p className="text-red-600 text-xs mt-1">Solo letras, números y guiones bajos</p>;
    }
    if (checkingUsername) {
      return <p className="text-cj-text-secondary text-xs mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Verificando...</p>;
    }
    if (usernameAvailable === true) {
      return <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Disponible</p>;
    }
    if (usernameAvailable === false) {
      return <p className="text-red-600 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> No disponible</p>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-cj-bg-primary flex items-center justify-center p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cj-accent-blue/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 glass-panel p-6 sm:p-8">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-cj-text-primary tracking-wide">Registro Corporativo</h1>
          <p className="text-cj-text-secondary mt-2 text-sm">
            {STEPS[step].description}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-cj-danger p-3 rounded-lg mb-5 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-lg mb-6 text-center">
            <h3 className="text-lg font-bold mb-2">¡Cuenta Creada Exitosamente!</h3>
            <p className="text-sm opacity-80">Serás redirigido al portal de inicio de sesión en unos segundos...</p>
          </div>
        ) : (
          <>
            <StepIndicator />

            <form onSubmit={handleRegister}>
              {/* ========== PASO 1: Datos de Cuenta ========== */}
              {step === 0 && (
                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-cj-text-secondary mb-2">Nombre de Usuario</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-cj-text-secondary" />
                      </div>
                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={50}
                        className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue transition-all"
                        placeholder="mi_usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                      />
                    </div>
                    <UsernameFeedback />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-cj-text-secondary mb-2">Correo Electrónico</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-cj-text-secondary" />
                      </div>
                      <input
                        type="email"
                        required
                        className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue transition-all"
                        placeholder="contacto@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-cj-text-secondary mb-2">Contraseña</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-cj-text-secondary" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {password.length > 0 && password.length < 6 && (
                      <p className="text-red-600 text-xs mt-1">Mínimo 6 caracteres</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-cj-text-secondary mb-2">Confirmar Contraseña</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-cj-text-secondary" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue transition-all"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <p className="text-red-600 text-xs mt-1">Las contraseñas no coinciden</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!isStep1Valid()}
                    className="w-full flex justify-center py-2.5 px-4 btn-primary mt-4 group disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      Siguiente <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </div>
              )}

              {/* ========== PASO 2: Datos Personales ========== */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cj-text-secondary mb-2">Nombre Completo o Empresa</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-cj-text-secondary" />
                      </div>
                      <input
                        type="text"
                        required
                        className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue transition-all"
                        placeholder="Ej. Juan Pérez - Constructora XYZ"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 flex justify-center py-2.5 px-4 border border-cj-border rounded-md text-cj-text-secondary hover:text-cj-text-primary hover:border-cj-accent-blue transition-all group"
                    >
                      <span className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Anterior
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!isStep2Valid()}
                      className="flex-1 flex justify-center py-2.5 px-4 btn-primary group disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center gap-2">
                        Siguiente <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========== PASO 3: Términos y Condiciones ========== */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="bg-cj-bg-primary border border-cj-border rounded-md p-4 max-h-48 overflow-y-auto text-sm text-cj-text-secondary leading-relaxed">
                    <h4 className="text-cj-text-primary font-semibold mb-2">Términos y Condiciones de Uso</h4>
                    <p className="mb-2">
                      Al registrarse en la plataforma digital de <strong className="text-cj-text-primary">Proyectos CJDG</strong>, usted acepta los siguientes términos:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>La plataforma está diseñada para la gestión de servicios de ingeniería integral en las áreas de <strong className="text-cj-text-primary">Tecnología, Climatización, Energía e Ingeniería Civil</strong>.</li>
                      <li>Las cotizaciones generadas a través del sistema son propuestas preliminares sujetas a revisión por el equipo de Proyectos CJDG.</li>
                      <li>Los precios de productos del catálogo están sujetos a disponibilidad y cambios sin previo aviso.</li>
                      <li>Los servicios corporativos requieren cotización personalizada y aprobación por parte del equipo administrativo.</li>
                      <li>El uso indebido de la plataforma, incluyendo la manipulación de datos o acceso no autorizado, resultará en la suspensión de la cuenta.</li>
                      <li>Proyectos CJDG se reserva el derecho de modificar estos términos. Los cambios serán notificados a través de la plataforma.</li>
                    </ol>
                    <p className="mt-3">
                      Contacto: <strong className="text-cj-text-primary">ventas@proyectoscjdg.com</strong> | +58 212-2350938
                    </p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-cj-border bg-cj-surface text-cj-accent-blue focus:ring-cj-accent-blue-light focus:ring-offset-0"
                    />
                    <span className="text-sm text-cj-text-secondary group-hover:text-cj-text-primary transition-colors">
                      He leído y acepto los <strong className="text-cj-accent-blue">Términos y Condiciones</strong> de Proyectos CJDG
                    </span>
                  </label>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 flex justify-center py-2.5 px-4 border border-cj-border rounded-md text-cj-text-secondary hover:text-cj-text-primary hover:border-cj-accent-blue transition-all group"
                    >
                      <span className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Anterior
                      </span>
                    </button>
                    <button
                      type="submit"
                      disabled={!isStep3Valid() || loading}
                      className="flex-1 flex justify-center py-2.5 px-4 btn-primary group disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creando cuenta...' : (
                        <span className="flex items-center gap-2">
                          Crear Cuenta <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* OAuth — solo en paso 1 */}
            {step === 0 && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-cj-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-cj-surface text-cj-text-muted">o regístrate con</span>
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
            )}
          </>
        )}

        <div className="mt-6 text-center text-sm text-cj-text-secondary pt-4">
          ¿Ya posees acceso?{' '}
          <Link to="/login" className="text-cj-accent-blue hover:text-cj-text-primary transition-colors font-medium">
            Iniciar Sesión
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
