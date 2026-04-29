import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, User as UserIcon, Phone, ArrowRight, AlertCircle, Loader2, CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth, AccountType } from '../../context/AuthContext';
import { formatApiError } from '../../services/errors';

const Onboarding = () => {
  const { user, isLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el user ya completó este paso, sácalo. También prefill desde perfil.
  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.account_type) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      return;
    }

    // Prefill: nombre/apellido viene de Google (full_name) si no hay first/last
    if (user.first_name) setFirstName(user.first_name);
    else if (user.full_name) setFirstName(user.full_name.split(' ')[0] || '');

    if (user.last_name) setLastName(user.last_name);
    else if (user.full_name) {
      const parts = user.full_name.split(' ');
      if (parts.length > 1) setLastName(parts.slice(1).join(' '));
    }

    if (user.phone) setPhone(user.phone);
  }, [user, isLoading, navigate]);

  const canSubmit = !!accountType && firstName.trim().length >= 2 && lastName.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    try {
      await api.put('/users/profile', {
        account_type: accountType,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      });
      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(formatApiError(err, 'No se pudo guardar tu información.'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-cj-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cj-accent-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cj-bg-primary flex items-center justify-center p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cj-accent-blue/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl relative z-10 bg-cj-surface border border-cj-border shadow-cj-lg rounded-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-cj-text-primary">¡Bienvenido a Proyectos CJDG!</h1>
          <p className="text-cj-text-secondary text-sm mt-2">
            Para terminar de crear tu cuenta, cuéntanos un poco sobre ti.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-cj-danger p-3 rounded-lg mb-5 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ----- Tipo de cuenta ----- */}
          <div>
            <label className="block text-sm font-medium text-cj-text-secondary mb-3">
              ¿Cómo usarás la plataforma?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AccountTypeCard
                icon={Building2}
                title="Empresa"
                description="Registraré mi RIF y datos comerciales para facturación corporativa."
                selected={accountType === 'empresa'}
                onClick={() => setAccountType('empresa')}
              />
              <AccountTypeCard
                icon={UserIcon}
                title="Particular"
                description="Soy persona natural, registraré mi cédula de identidad."
                selected={accountType === 'particular'}
                onClick={() => setAccountType('particular')}
              />
            </div>
          </div>

          {/* ----- Datos básicos ----- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cj-text-secondary mb-2">
                Nombre <span className="text-cj-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="block w-full px-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cj-text-secondary mb-2">
                Apellido <span className="text-cj-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="block w-full px-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cj-text-secondary mb-2">Teléfono</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-cj-text-muted" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+58 412-1234567"
                className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
              />
            </div>
            <p className="text-xs text-cj-text-muted mt-1.5">Opcional ahora — lo puedes agregar luego.</p>
          </div>

          <div className="text-xs text-cj-text-muted bg-cj-bg-primary border border-cj-border rounded-lg p-3">
            <strong>Después de continuar</strong>, podrás completar tu información fiscal (
            {accountType === 'particular' ? 'cédula' : 'RIF'} y dirección) desde tu perfil cuando estés listo.
          </div>

          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="w-full btn-primary py-2.5 disabled:opacity-50 group flex justify-center items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                Continuar al panel <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const AccountTypeCard = ({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative text-left p-4 rounded-lg border-2 transition-all ${
      selected
        ? 'border-cj-accent-blue bg-cj-accent-blue-light'
        : 'border-cj-border bg-cj-bg-primary hover:border-cj-accent-blue/50'
    }`}
  >
    {selected && (
      <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-cj-accent-blue" />
    )}
    <Icon className={`w-7 h-7 mb-2 ${selected ? 'text-cj-accent-blue' : 'text-cj-text-secondary'}`} />
    <h3 className="font-semibold text-cj-text-primary">{title}</h3>
    <p className="text-xs text-cj-text-secondary mt-1">{description}</p>
  </button>
);

export default Onboarding;
