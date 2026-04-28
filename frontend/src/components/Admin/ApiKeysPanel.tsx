/**
 * SC-API-KEYS-01 — Panel de gestión de API Keys + documentación.
 *
 * Permite al admin crear/listar/revocar/borrar keys para los endpoints
 * /admin/export/*. El raw key solo se muestra UNA VEZ al crear.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  KeyRound, Plus, Copy, Trash2, Eye, EyeOff, AlertCircle, CheckCircle, Loader2,
  Power, PowerOff, Clock, Activity, FileCode2, X,
} from 'lucide-react';
import { api } from '../../services/api';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
}

interface CreatedApiKey extends ApiKey {
  key: string; // raw — solo viene una vez
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api/v1';
const EXPORT_BASE = `${API_URL}/admin/export`;

interface ExportEndpoint {
  path: string;
  label: string;
  description: string;
}

const EXPORT_ENDPOINTS: ExportEndpoint[] = [
  { path: '/users', label: 'Usuarios', description: 'Listado de usuarios (sin password ni oauth_id)' },
  { path: '/invoices', label: 'Facturas', description: 'Facturas con items, status y totales' },
  { path: '/catalog', label: 'Catálogo de productos', description: 'Productos con servicio asociado, precio y stock' },
  { path: '/services', label: 'Servicios corporativos', description: 'Catálogo corporativo de servicios por pilar' },
  { path: '/quotations', label: 'Cotizaciones', description: 'Threads de cotización con todos los mensajes' },
  { path: '/notifications', label: 'Notificaciones', description: 'Notificaciones in-app de todos los usuarios' },
  { path: '/settings', label: 'Ecommerce settings', description: 'Configuración global del ecommerce' },
  { path: '/summary', label: 'Resumen', description: 'Totales agregados (usuarios, ingresos, mensajes...)' },
];

const EXPIRATION_PRESETS: Array<{ label: string; days: number | null }> = [
  { label: 'Nunca', days: null },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: '1 año', days: 365 },
];

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatRelative = (iso: string | null) => {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Hace segundos';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Hace ${d} d`;
};

const ApiKeysPanel = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedApiKey | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/api-keys');
      setKeys(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudieron cargar las API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleToggle = async (k: ApiKey) => {
    try {
      await api.patch(`/admin/api-keys/${k.id}`, { is_active: !k.is_active });
      loadKeys();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo actualizar la key.');
    }
  };

  const handleDelete = async (k: ApiKey) => {
    if (!window.confirm(`Borrar permanentemente "${k.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/admin/api-keys/${k.id}`);
      loadKeys();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo borrar la key.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-cj-text-primary flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-cj-accent-blue" />
            API Keys & Integraciones
          </h2>
          <p className="text-sm text-cj-text-secondary mt-1">
            Gestiona tokens programáticos para los endpoints de export por servicio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2"
        >
          <Plus className="w-4 h-4" /> Nueva API Key
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-cj-danger p-3 rounded-lg flex items-start gap-2 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ---- Tabla de keys ---- */}
      <div className="glass-panel p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cj-accent-blue animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12 text-cj-text-muted">
            <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aún no hay API keys. Crea la primera.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cj-bg-primary border-b border-cj-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-cj-text-secondary">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-cj-text-secondary">Prefix</th>
                <th className="text-left px-4 py-3 font-semibold text-cj-text-secondary">Último uso</th>
                <th className="text-left px-4 py-3 font-semibold text-cj-text-secondary">Usos</th>
                <th className="text-left px-4 py-3 font-semibold text-cj-text-secondary">Expira</th>
                <th className="text-left px-4 py-3 font-semibold text-cj-text-secondary">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-cj-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cj-border">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-cj-bg-primary transition-colors">
                  <td className="px-4 py-3 text-cj-text-primary font-medium">{k.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-cj-bg-primary border border-cj-border px-2 py-1 rounded">
                      {k.prefix}***
                    </code>
                  </td>
                  <td className="px-4 py-3 text-cj-text-secondary">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" /> {formatRelative(k.last_used_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cj-text-secondary">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Activity className="w-3 h-3" /> {k.usage_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cj-text-secondary text-xs">
                    {k.expires_at ? formatDate(k.expires_at) : 'Nunca'}
                  </td>
                  <td className="px-4 py-3">
                    {k.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-cj-text-muted bg-cj-bg-primary border border-cj-border px-2 py-0.5 rounded-full">
                        <PowerOff className="w-3 h-3" /> Revocada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => handleToggle(k)}
                      title={k.is_active ? 'Revocar' : 'Reactivar'}
                      className="p-1.5 rounded hover:bg-cj-bg-primary text-cj-text-secondary hover:text-cj-text-primary transition-colors"
                    >
                      {k.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(k)}
                      title="Borrar"
                      className="p-1.5 rounded hover:bg-red-50 text-cj-text-muted hover:text-cj-danger transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Documentación del endpoint ---- */}
      <EndpointDocs />

      {/* ---- Modales ---- */}
      {createModalOpen && (
        <CreateKeyModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={(k) => {
            setJustCreated(k);
            setCreateModalOpen(false);
            loadKeys();
          }}
        />
      )}
      {justCreated && (
        <NewKeyDisplayModal apiKey={justCreated} onClose={() => setJustCreated(null)} />
      )}
    </div>
  );
};

// =========================================================
//              MODAL: Crear nueva key
// =========================================================
const CreateKeyModal = ({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (k: CreatedApiKey) => void;
}) => {
  const [name, setName] = useState('');
  const [expirationDays, setExpirationDays] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: any = { name: name.trim() };
      if (expirationDays !== null) {
        const exp = new Date();
        exp.setDate(exp.getDate() + expirationDays);
        payload.expires_at = exp.toISOString();
      }
      const res = await api.post('/admin/api-keys', payload);
      onCreated(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo crear la key.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-cj-surface border border-cj-border rounded-xl shadow-cj-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded text-cj-text-muted hover:text-cj-text-primary hover:bg-cj-bg-primary"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-cj-text-primary mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-cj-accent-blue" /> Nueva API Key
        </h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-cj-danger p-3 rounded-lg mb-4 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cj-text-secondary mb-2">
              Nombre descriptivo <span className="text-cj-danger">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Integración Zapier, Backup diario..."
              className="block w-full px-3 py-2.5 border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cj-text-secondary mb-2">
              Expiración
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPIRATION_PRESETS.map((preset) => {
                const isSelected = expirationDays === preset.days;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setExpirationDays(preset.days)}
                    className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                      isSelected
                        ? 'border-cj-accent-blue bg-cj-accent-blue-light text-cj-accent-blue font-semibold'
                        : 'border-cj-border bg-cj-bg-primary text-cj-text-secondary hover:border-cj-accent-blue/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-cj-text-muted mt-2">
              "Nunca" es útil para integraciones permanentes. Puedes revocar manualmente en cualquier momento.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-cj-border rounded-lg text-sm text-cj-text-secondary hover:text-cj-text-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-4 py-2 disabled:opacity-50"
            >
              {saving ? 'Generando...' : 'Crear key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================
//       MODAL: Muestra raw key UNA VEZ tras crear
// =========================================================
const NewKeyDisplayModal = ({ apiKey, onClose }: { apiKey: CreatedApiKey; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(true);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-cj-surface border border-cj-border rounded-xl shadow-cj-xl max-w-lg w-full p-6 relative">
        <h3 className="text-lg font-bold text-cj-text-primary mb-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" /> API Key creada
        </h3>
        <p className="text-sm text-cj-text-secondary mb-4">
          <strong className="text-cj-danger">Guarda este valor ahora.</strong> No se mostrará de nuevo.
          Si lo pierdes, deberás crear otra.
        </p>

        <div className="bg-cj-bg-primary border-2 border-dashed border-cj-accent-blue rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-cj-text-muted uppercase tracking-wider">Raw key</span>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-cj-accent-blue hover:underline text-xs inline-flex items-center gap-1 ml-auto"
            >
              {showRaw ? <><EyeOff className="w-3 h-3" /> Ocultar</> : <><Eye className="w-3 h-3" /> Mostrar</>}
            </button>
          </div>
          <code className="block text-sm font-mono break-all text-cj-text-primary select-all">
            {showRaw ? apiKey.key : '•'.repeat(apiKey.key.length)}
          </code>
        </div>

        <button
          onClick={copyKey}
          className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 mb-3"
        >
          {copied ? <><CheckCircle className="w-4 h-4" /> Copiado al portapapeles</> : <><Copy className="w-4 h-4" /> Copiar key</>}
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 border border-cj-border rounded-lg text-sm text-cj-text-secondary hover:text-cj-text-primary"
        >
          Entendido, cerrar
        </button>
      </div>
    </div>
  );
};

// =========================================================
//       Documentación de los endpoints expuestos
// =========================================================
const EndpointDocs = () => {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string>(EXPORT_ENDPOINTS[0].path);

  const fullUrl = (path: string) => `${EXPORT_BASE}${path}`;

  const curlExample = (path: string) =>
    `curl -H "X-API-Key: pcjdg_XXXXXXXX..." \\\n  ${fullUrl(path)}`;

  const jsExample = (path: string) =>
    `fetch("${fullUrl(path)}", {\n  headers: { "X-API-Key": "pcjdg_XXXXXXXX..." }\n}).then(r => r.json()).then(console.log);`;

  const copy = async (text: string, path: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch { /* noop */ }
  };

  const active = EXPORT_ENDPOINTS.find((e) => e.path === activePath) || EXPORT_ENDPOINTS[0];

  return (
    <div className="glass-panel p-5">
      <h3 className="text-sm font-semibold text-cj-text-primary flex items-center gap-2 mb-1">
        <FileCode2 className="w-4 h-4 text-cj-accent-blue" /> Endpoints expuestos por servicio
      </h3>
      <p className="text-xs text-cj-text-muted mb-4">
        Cada servicio tiene su propio endpoint. Consume solo lo que necesitas — no más payloads gigantes.
      </p>

      {/* Tabla de endpoints */}
      <div className="border border-cj-border rounded-lg overflow-hidden mb-5">
        <table className="w-full text-xs">
          <thead className="bg-cj-bg-primary">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-cj-text-secondary">Servicio</th>
              <th className="text-left px-3 py-2 font-semibold text-cj-text-secondary">URL</th>
              <th className="text-right px-3 py-2 font-semibold text-cj-text-secondary">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cj-border">
            {EXPORT_ENDPOINTS.map((ep) => (
              <tr
                key={ep.path}
                className={`hover:bg-cj-bg-primary transition-colors cursor-pointer ${
                  activePath === ep.path ? 'bg-cj-accent-blue-light/30' : ''
                }`}
                onClick={() => setActivePath(ep.path)}
              >
                <td className="px-3 py-2">
                  <div className="font-semibold text-cj-text-primary">{ep.label}</div>
                  <div className="text-cj-text-muted">{ep.description}</div>
                </td>
                <td className="px-3 py-2">
                  <code className="text-xs text-cj-text-primary break-all">GET {EXPORT_BASE.replace(API_URL, '')}{ep.path}</code>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); copy(fullUrl(ep.path), ep.path); }}
                    className="text-cj-accent-blue inline-flex items-center gap-1 hover:underline"
                  >
                    <Copy className="w-3 h-3" /> {copiedPath === ep.path ? 'Copiado' : 'URL'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalle del endpoint activo */}
      <div className="space-y-4">
        <div>
          <p className="text-xs text-cj-text-muted mb-1 uppercase tracking-wider">
            Detalle: {active.label}
          </p>
          <code className="block text-xs bg-cj-bg-primary border border-cj-border px-3 py-2 rounded break-all">
            GET {fullUrl(active.path)}
          </code>
        </div>

        <div>
          <p className="text-xs text-cj-text-muted mb-1 uppercase tracking-wider">Header de autenticación</p>
          <code className="block text-xs bg-cj-bg-primary border border-cj-border px-3 py-2 rounded">
            X-API-Key: pcjdg_XXXXXXXX...
          </code>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-cj-text-muted uppercase tracking-wider">Ejemplo curl</p>
            <button
              onClick={() => copy(curlExample(active.path), `curl-${active.path}`)}
              className="text-cj-accent-blue text-xs inline-flex items-center gap-1 hover:underline"
            >
              <Copy className="w-3 h-3" /> {copiedPath === `curl-${active.path}` ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <pre className="text-xs bg-cj-bg-primary border border-cj-border px-3 py-2 rounded overflow-x-auto text-cj-text-primary">{curlExample(active.path)}</pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-cj-text-muted uppercase tracking-wider">Ejemplo JavaScript</p>
            <button
              onClick={() => copy(jsExample(active.path), `js-${active.path}`)}
              className="text-cj-accent-blue text-xs inline-flex items-center gap-1 hover:underline"
            >
              <Copy className="w-3 h-3" /> {copiedPath === `js-${active.path}` ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <pre className="text-xs bg-cj-bg-primary border border-cj-border px-3 py-2 rounded overflow-x-auto text-cj-text-primary">{jsExample(active.path)}</pre>
        </div>

        <div className="text-xs text-cj-text-secondary border-t border-cj-border pt-3">
          <p className="font-semibold text-cj-text-primary mb-1">Notas:</p>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            <li>Todos los endpoints requieren rol admin (X-API-Key o Bearer JWT).</li>
            <li>Los datos sensibles (password hashes, oauth_id, key_hash) están excluidos.</li>
            <li>Cada respuesta incluye <code className="bg-cj-bg-primary px-1 rounded">exported_at</code> y <code className="bg-cj-bg-primary px-1 rounded">count</code>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApiKeysPanel;
