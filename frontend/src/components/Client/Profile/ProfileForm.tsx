import { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon, Mail, Phone, Building, MapPin, FileText, Upload,
  CheckCircle, AlertCircle, Loader2, Eye,
} from 'lucide-react';
import { api, getImageUrl } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

interface FormState {
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  fiscal_address: string;
  rif: string;
  rif_file_url: string;
}

const emptyForm: FormState = {
  full_name: '',
  first_name: '',
  last_name: '',
  phone: '',
  company_name: '',
  fiscal_address: '',
  rif: '',
  rif_file_url: '',
};

const ProfileForm = () => {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prellenar con datos actuales del usuario
  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.full_name || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      company_name: user.company_name || '',
      fiscal_address: user.fiscal_address || '',
      rif: user.rif || '',
      rif_file_url: user.rif_file_url || '',
    });
  }, [user]);

  const onChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
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
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Mandamos solo los campos no vacíos (PUT con exclude_unset)
    const payload: Partial<FormState> = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((k) => {
      const value = form[k]?.trim();
      if (value !== '') payload[k] = value;
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

  const isFiscalComplete = !!user?.rif && !!user?.fiscal_address;
  const rifPreviewUrl = form.rif_file_url ? getImageUrl(form.rif_file_url) : null;
  const isPdf = form.rif_file_url?.toLowerCase().endsWith('.pdf');

  return (
    <div className="max-w-3xl">
      {/* Header con estado fiscal */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cj-text-primary">Mi Perfil</h2>
          <p className="text-sm text-cj-text-secondary mt-1">
            Datos personales e información fiscal para facturación.
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
          {isFiscalComplete ? 'Perfil completo' : 'Información fiscal incompleta'}
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
        {/* ---------- Sección: Solo lectura (cuenta) ---------- */}
        <section className="glass-panel p-5">
          <h3 className="text-sm font-semibold text-cj-text-primary mb-4 uppercase tracking-wide">
            Cuenta
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadOnlyField icon={UserIcon} label="Usuario" value={`@${user?.username}`} />
            <ReadOnlyField icon={Mail} label="Correo" value={user?.email || '—'} />
          </div>
          {user?.oauth_provider === 'google' && (
            <p className="text-xs text-cj-text-muted mt-3">
              Cuenta vinculada a Google. El correo no puede modificarse desde aquí.
            </p>
          )}
        </section>

        {/* ---------- Sección: Datos personales ---------- */}
        <section className="glass-panel p-5 space-y-4">
          <h3 className="text-sm font-semibold text-cj-text-primary uppercase tracking-wide">
            Datos personales
          </h3>
          <FormField
            label="Nombre completo o razón social"
            icon={UserIcon}
            value={form.full_name}
            onChange={onChange('full_name')}
            placeholder="Juan Pérez / Constructora XYZ C.A."
            required
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

        {/* ---------- Sección: Información fiscal ---------- */}
        <section className="glass-panel p-5 space-y-4">
          <h3 className="text-sm font-semibold text-cj-text-primary uppercase tracking-wide">
            Información fiscal
          </h3>
          <FormField
            label="Empresa"
            icon={Building}
            value={form.company_name}
            onChange={onChange('company_name')}
            placeholder="Nombre comercial de la empresa"
          />
          <FormField
            label="RIF"
            icon={FileText}
            value={form.rif}
            onChange={onChange('rif')}
            placeholder="J-12345678-9"
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

          {/* Upload del RIF */}
          <div>
            <label className="block text-sm font-medium text-cj-text-secondary mb-2">
              Archivo del RIF (PDF o imagen)
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="rif-upload-input"
              />
              <label
                htmlFor="rif-upload-input"
                className={`inline-flex items-center gap-2 px-4 py-2 border border-cj-border rounded-lg text-sm cursor-pointer transition-all ${
                  uploading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'text-cj-text-secondary hover:text-cj-text-primary hover:border-cj-accent-blue'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> {form.rif_file_url ? 'Reemplazar archivo' : 'Subir archivo'}
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
              <img
                src={rifPreviewUrl}
                alt="RIF"
                className="mt-3 max-h-40 rounded border border-cj-border"
              />
            )}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || uploading}
            className="btn-primary px-6 py-2.5 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ----- Subcomponentes auxiliares -----

const FormField = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  required,
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

const ReadOnlyField = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <div>
    <label className="block text-xs text-cj-text-muted uppercase tracking-wider mb-1">{label}</label>
    <div className="flex items-center gap-2 text-cj-text-primary">
      <Icon className="w-4 h-4 text-cj-text-muted" />
      <span className="text-sm">{value}</span>
    </div>
  </div>
);

export default ProfileForm;
