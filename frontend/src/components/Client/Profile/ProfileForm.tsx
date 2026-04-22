import { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon, Mail, Phone, Building, MapPin, FileText, Upload,
  CheckCircle, AlertCircle, Loader2, Eye, Camera, Lock, Building2,
} from 'lucide-react';
import { api, getImageUrl } from '../../../services/api';
import { useAuth, AccountType } from '../../../context/AuthContext';

interface FormState {
  account_type: AccountType | '';
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  fiscal_address: string;
  rif: string;
  rif_file_url: string;
  profile_photo_url: string;
}

const emptyForm: FormState = {
  account_type: '',
  full_name: '',
  first_name: '',
  last_name: '',
  phone: '',
  company_name: '',
  fiscal_address: '',
  rif: '',
  rif_file_url: '',
  profile_photo_url: '',
};

// Validación de tax ID por tipo (frontend = estricto; backend = flexible)
const validateTaxId = (value: string, type: AccountType | ''): string | null => {
  if (!value) return null;
  const v = value.trim().toUpperCase().replace(/\s/g, '');
  if (type === 'empresa') {
    if (!/^[VEJGPC]-?\d{6,9}-?\d?$/.test(v)) {
      return 'Formato de RIF inválido. Ejemplo: J-12345678-9';
    }
  } else if (type === 'particular') {
    if (!/^[VE]-?\d{6,9}$/.test(v)) {
      return 'Formato de cédula inválido. Ejemplo: V-12345678';
    }
  }
  return null;
};

const ProfileForm = () => {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingRif, setUploadingRif] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const rifInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      account_type: (user.account_type ?? '') as AccountType | '',
      full_name: user.full_name || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      company_name: user.company_name || '',
      fiscal_address: user.fiscal_address || '',
      rif: user.rif || '',
      rif_file_url: user.rif_file_url || '',
      profile_photo_url: user.profile_photo_url || '',
    });
  }, [user]);

  const onChange = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setError(null);
      setSuccess(false);
    };

  const setAccountType = (type: AccountType) => {
    setForm((prev) => ({ ...prev, account_type: type }));
    setError(null);
    setSuccess(false);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/users/profile/photo-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, profile_photo_url: res.data.url }));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo subir la foto.');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRifFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRif(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/users/profile/rif-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, rif_file_url: res.data.url }));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo subir el archivo.');
    } finally {
      setUploadingRif(false);
      if (rifInputRef.current) rifInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Validación frontend del tax ID por tipo
    const taxIdError = validateTaxId(form.rif, form.account_type);
    if (taxIdError) {
      setError(taxIdError);
      setSaving(false);
      return;
    }

    const payload: Record<string, any> = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((k) => {
      const value = form[k];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '') payload[k] = trimmed;
      }
    });

    try {
      await api.put('/users/profile', payload);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const isCompany = form.account_type === 'empresa';
  const isPerson = form.account_type === 'particular';
  const taxLabel = isPerson ? 'Cédula de identidad' : 'RIF';
  const taxPlaceholder = isPerson ? 'V-12345678' : 'J-12345678-9';
  const fileLabel = isPerson ? 'Cédula' : 'RIF';

  const isFiscalComplete = !!user?.account_type && !!user?.rif && !!user?.fiscal_address;
  const rifPreviewUrl = form.rif_file_url ? getImageUrl(form.rif_file_url) : null;
  const photoPreviewUrl = form.profile_photo_url ? getImageUrl(form.profile_photo_url) : null;
  const isPdf = form.rif_file_url?.toLowerCase().endsWith('.pdf');

  return (
    <div className="max-w-3xl">
      {/* Header con estado fiscal */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-cj-text-primary">Mi Perfil</h2>
          <p className="text-sm text-cj-text-secondary mt-1">
            Datos personales, información fiscal y seguridad de la cuenta.
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            isFiscalComplete
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}
        >
          {isFiscalComplete ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {isFiscalComplete ? 'Perfil completo' : 'Información incompleta'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-cj-danger p-3 rounded-lg mb-4 flex items-start gap-2 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4 flex items-start gap-2 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>Perfil actualizado correctamente.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ---------- Foto + Cuenta ---------- */}
        <section className="glass-panel p-5">
          <h3 className="text-sm font-semibold text-cj-text-primary mb-4 uppercase tracking-wide">
            Cuenta
          </h3>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar uploader */}
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-full bg-cj-bg-primary border border-cj-border overflow-hidden flex items-center justify-center">
                {photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : isCompany ? (
                  <Building2 className="w-10 h-10 text-cj-text-muted" />
                ) : (
                  <UserIcon className="w-10 h-10 text-cj-text-muted" />
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoSelect}
                className="hidden"
                id="photo-upload-input"
              />
              <label
                htmlFor="photo-upload-input"
                className={`mt-2 inline-flex items-center gap-1.5 text-xs cursor-pointer transition-colors ${
                  uploadingPhoto
                    ? 'opacity-50 cursor-not-allowed text-cj-text-muted'
                    : 'text-cj-accent-blue hover:underline'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                {photoPreviewUrl ? 'Cambiar foto' : 'Subir foto'}
              </label>
            </div>

            {/* Datos de cuenta solo lectura */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <ReadOnlyField icon={UserIcon} label="Usuario" value={`@${user?.username}`} />
              <ReadOnlyField icon={Mail} label="Correo" value={user?.email || '—'} />
            </div>
          </div>

          {user?.oauth_provider === 'google' && (
            <p className="text-xs text-cj-text-muted mt-3">
              Cuenta vinculada a Google. El correo no se modifica desde aquí.
            </p>
          )}
        </section>

        {/* ---------- Tipo de cuenta ---------- */}
        <section className="glass-panel p-5">
          <h3 className="text-sm font-semibold text-cj-text-primary mb-3 uppercase tracking-wide">
            Tipo de cuenta <span className="text-cj-danger">*</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TypeOption
              icon={Building2}
              label="Empresa"
              hint="RIF y datos comerciales"
              selected={isCompany}
              onClick={() => setAccountType('empresa')}
            />
            <TypeOption
              icon={UserIcon}
              label="Particular"
              hint="Cédula de identidad"
              selected={isPerson}
              onClick={() => setAccountType('particular')}
            />
          </div>
        </section>

        {/* ---------- Datos personales ---------- */}
        <section className="glass-panel p-5 space-y-4">
          <h3 className="text-sm font-semibold text-cj-text-primary uppercase tracking-wide">
            Datos personales
          </h3>
          <FormField
            label={isCompany ? 'Razón social o nombre completo' : 'Nombre completo'}
            icon={UserIcon}
            value={form.full_name}
            onChange={onChange('full_name')}
            placeholder={isCompany ? 'Constructora XYZ C.A.' : 'Juan Pérez'}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nombre(s)" value={form.first_name} onChange={onChange('first_name')} />
            <FormField label="Apellido(s)" value={form.last_name} onChange={onChange('last_name')} />
          </div>
          <FormField
            label="Teléfono"
            icon={Phone}
            value={form.phone}
            onChange={onChange('phone')}
            placeholder="+58 412-1234567"
          />
        </section>

        {/* ---------- Información fiscal ---------- */}
        <section className="glass-panel p-5 space-y-4">
          <h3 className="text-sm font-semibold text-cj-text-primary uppercase tracking-wide">
            Información fiscal
          </h3>

          {!form.account_type && (
            <p className="text-sm text-cj-text-secondary bg-cj-bg-primary border border-cj-border rounded-lg p-3">
              Selecciona arriba si tu cuenta es <strong>Empresa</strong> o <strong>Particular</strong>{' '}
              para mostrar los campos correctos.
            </p>
          )}

          {form.account_type && (
            <>
              {isCompany && (
                <FormField
                  label="Empresa / Razón social"
                  icon={Building}
                  value={form.company_name}
                  onChange={onChange('company_name')}
                  placeholder="Nombre comercial"
                />
              )}

              <FormField
                label={taxLabel}
                icon={FileText}
                value={form.rif}
                onChange={onChange('rif')}
                placeholder={taxPlaceholder}
              />

              <div>
                <label className="block text-sm font-medium text-cj-text-secondary mb-2">
                  Dirección fiscal
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <MapPin className="h-5 w-5 text-cj-text-muted" />
                  </div>
                  <textarea
                    rows={3}
                    value={form.fiscal_address}
                    onChange={onChange('fiscal_address')}
                    placeholder="Av. Principal, Edif. ABC, Piso 4, Caracas, Venezuela"
                    className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue resize-none"
                  />
                </div>
              </div>

              {/* Upload del RIF/Cédula */}
              <div>
                <label className="block text-sm font-medium text-cj-text-secondary mb-2">
                  Archivo del {fileLabel} (PDF o imagen)
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    ref={rifInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handleRifFileSelect}
                    className="hidden"
                    id="rif-upload-input"
                  />
                  <label
                    htmlFor="rif-upload-input"
                    className={`inline-flex items-center gap-2 px-4 py-2 border border-cj-border rounded-lg text-sm cursor-pointer transition-all ${
                      uploadingRif
                        ? 'opacity-50 cursor-not-allowed'
                        : 'text-cj-text-secondary hover:text-cj-text-primary hover:border-cj-accent-blue'
                    }`}
                  >
                    {uploadingRif ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> {form.rif_file_url ? 'Reemplazar' : 'Subir archivo'}
                      </>
                    )}
                  </label>
                  {form.rif_file_url && rifPreviewUrl && (
                    <a
                      href={rifPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-cj-accent-blue hover:underline"
                    >
                      <Eye className="w-4 h-4" /> Ver {isPdf ? 'PDF' : 'imagen'}
                    </a>
                  )}
                </div>
                {form.rif_file_url && !isPdf && rifPreviewUrl && (
                  <img src={rifPreviewUrl} alt={fileLabel} className="mt-3 max-h-40 rounded border border-cj-border" />
                )}
              </div>
            </>
          )}
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || uploadingPhoto || uploadingRif}
            className="btn-primary px-6 py-2.5 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* ---------- Seguridad (formulario aparte para mantener flujos limpios) ---------- */}
      <SecurityPanel />
    </div>
  );
};

// =====================================================================
//                        SECURITY PANEL
// =====================================================================

const SecurityPanel = () => {
  const { user, refreshUser } = useAuth();
  const hasPassword = !!user?.has_password;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const canSubmit =
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    (!hasPassword || currentPassword.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.post('/users/password', {
        current_password: hasPassword ? currentPassword : undefined,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      reset();
      setSuccess(true);
      await refreshUser();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo actualizar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-panel p-5 mt-6">
      <h3 className="text-sm font-semibold text-cj-text-primary mb-1 uppercase tracking-wide flex items-center gap-2">
        <Lock className="w-4 h-4" /> Seguridad
      </h3>
      <p className="text-xs text-cj-text-secondary mb-4">
        {hasPassword
          ? 'Cambia tu contraseña actual ingresándola primero.'
          : 'Tu cuenta es OAuth y aún no tiene contraseña local. Estable una para iniciar sesión sin Google.'}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-cj-danger p-3 rounded-lg mb-3 flex items-start gap-2 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-3 flex items-start gap-2 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{hasPassword ? 'Contraseña actualizada.' : 'Contraseña establecida.'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {hasPassword && (
          <PasswordField
            label="Contraseña actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        )}
        <PasswordField
          label={hasPassword ? 'Nueva contraseña' : 'Contraseña'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={6}
          required
        />
        <PasswordField
          label={hasPassword ? 'Confirmar nueva contraseña' : 'Confirmar contraseña'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={6}
          required
        />
        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
          <p className="text-xs text-red-600">Las contraseñas no coinciden</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="btn-primary px-5 py-2 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : hasPassword ? 'Cambiar contraseña' : 'Establecer contraseña'}
          </button>
        </div>
      </form>
    </section>
  );
};

// =====================================================================
//                        SUBCOMPONENTES
// =====================================================================

const FormField = ({
  label, icon: Icon, value, onChange, placeholder, required,
}: {
  label: string;
  icon?: React.ElementType;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}) => (
  <div>
    <label className="block text-sm font-medium text-cj-text-secondary mb-2">
      {label} {required && <span className="text-cj-danger">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-cj-text-muted" />
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`block w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue`}
      />
    </div>
  </div>
);

const PasswordField = ({
  label, value, onChange, minLength, required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  minLength?: number;
  required?: boolean;
}) => (
  <div>
    <label className="block text-sm font-medium text-cj-text-secondary mb-2">
      {label} {required && <span className="text-cj-danger">*</span>}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Lock className="h-5 w-5 text-cj-text-muted" />
      </div>
      <input
        type="password"
        value={value}
        onChange={onChange}
        minLength={minLength}
        required={required}
        className="block w-full pl-10 pr-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
      />
    </div>
  </div>
);

const ReadOnlyField = ({
  icon: Icon, label, value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <div>
    <label className="block text-xs text-cj-text-muted uppercase tracking-wider mb-1">{label}</label>
    <div className="flex items-center gap-2 text-cj-text-primary">
      <Icon className="w-4 h-4 text-cj-text-muted" />
      <span className="text-sm truncate">{value}</span>
    </div>
  </div>
);

const TypeOption = ({
  icon: Icon, label, hint, selected, onClick,
}: {
  icon: React.ElementType;
  label: string;
  hint: string;
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
      <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-cj-accent-blue" />
    )}
    <Icon className={`w-6 h-6 mb-2 ${selected ? 'text-cj-accent-blue' : 'text-cj-text-secondary'}`} />
    <p className="font-semibold text-cj-text-primary text-sm">{label}</p>
    <p className="text-xs text-cj-text-secondary mt-0.5">{hint}</p>
  </button>
);

export default ProfileForm;
