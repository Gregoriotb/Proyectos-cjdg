import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Search, DollarSign, RefreshCw, Edit2, X, Check, Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle, UploadCloud } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import { formatApiError } from '../../services/errors';

interface CorporateService {
  id: number;
  pilar: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number | null;
  precio_variable: boolean;
  activo: boolean;
  is_special: boolean;
  image_urls: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

const PILARES = ['TECNOLOGIA', 'CLIMATIZACION', 'ENERGIA', 'CIVIL'] as const;

const PILAR_LABELS: Record<string, string> = {
  TECNOLOGIA: 'Tecnología',
  CLIMATIZACION: 'Climatización',
  ENERGIA: 'Energía',
  CIVIL: 'Ingeniería Civil',
};

const PILAR_COLORS: Record<string, string> = {
  TECNOLOGIA: 'bg-blue-50 text-blue-700 border-blue-200',
  CLIMATIZACION: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  ENERGIA: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  CIVIL: 'bg-orange-50 text-orange-700 border-orange-200',
};

// --- Formulario de edición/creación ---
interface ServiceFormProps {
  service?: CorporateService;
  onSave: () => void;
  onCancel: () => void;
}

const ServiceForm = ({ service, onSave, onCancel }: ServiceFormProps) => {
  const [nombre, setNombre] = useState(service?.nombre ?? '');
  const [pilar, setPilar] = useState(service?.pilar ?? 'TECNOLOGIA');
  const [descripcion, setDescripcion] = useState(service?.descripcion ?? '');
  const [precioBase, setPrecioBase] = useState(service?.precio_base?.toString() ?? '');
  const [precioVariable, setPrecioVariable] = useState(service?.precio_variable ?? true);
  const [activo, setActivo] = useState(service?.activo ?? true);
  const [isSpecial, setIsSpecial] = useState(service?.is_special ?? false);
  const [images, setImages] = useState<string[]>(service?.image_urls ?? []);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImages(prev => [...prev, res.data.url]);
    } catch (e: any) {
      setError(formatApiError(e, 'Error subiendo la imagen'));
    } finally {
      setUploadingImg(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      nombre,
      pilar,
      descripcion: descripcion || null,
      precio_base: precioBase ? parseFloat(precioBase) : null,
      precio_variable: precioVariable,
      activo,
      is_special: isSpecial,
      image_urls: images,
    };

    try {
      if (service) {
        await api.put(`/admin/corporate-services/${service.id}`, payload);
      } else {
        await api.post('/admin/corporate-services', payload);
      }
      onSave();
    } catch (err: any) {
      setError(formatApiError(err, 'Error al guardar el servicio'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-cj-danger p-3 rounded-md flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-cj-text-secondary mb-1">Nombre del Servicio</label>
          <input
            type="text"
            required
            minLength={3}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
            placeholder="Ej: Instalación de CCTV"
          />
        </div>
        <div>
          <label className="block text-sm text-cj-text-secondary mb-1">Pilar</label>
          <select
            value={pilar}
            onChange={(e) => setPilar(e.target.value)}
            disabled={!!service}
            className="w-full bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue disabled:opacity-50"
          >
            {PILARES.map((p) => (
              <option key={p} value={p}>{PILAR_LABELS[p]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-cj-text-secondary mb-1">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          className="w-full bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue resize-none"
          placeholder="Descripción del servicio..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm text-cj-text-secondary mb-1">Precio Base (USD)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={precioBase}
            onChange={(e) => setPrecioBase(e.target.value)}
            className="w-full bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
            placeholder="Dejar vacío = cotización manual"
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-cj-text-secondary">
            <input
              type="checkbox"
              checked={precioVariable}
              onChange={(e) => setPrecioVariable(e.target.checked)}
              className="rounded border-cj-border bg-cj-bg-primary text-cj-accent-blue focus:ring-cj-accent-blue-light"
            />
            Precio ajustable
          </label>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-cj-text-secondary">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="rounded border-cj-border bg-cj-bg-primary text-cj-accent-blue focus:ring-cj-accent-blue-light"
            />
            Activo
          </label>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-cj-text-secondary">
            <input
              type="checkbox"
              checked={isSpecial}
              onChange={(e) => setIsSpecial(e.target.checked)}
              className="rounded border-cj-border bg-cj-bg-primary text-purple-600 focus:ring-purple-300"
            />
            {isSpecial ? <span className="text-purple-700 font-bold">¡Servicio Especial!</span> : "Destacar Especial"}
          </label>
        </div>
      </div>

      {/* Galería */}
      <div className="border-t border-cj-border pt-4">
         <label className="block text-sm text-cj-text-secondary mb-3">Galería de Imágenes (Opcional)</label>
         <div className="flex flex-wrap gap-4 items-start">
           {images.map((url, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg bg-cj-bg-tertiary border border-cj-border overflow-hidden">
                 <img src={url} alt="Gallery item" className="w-full h-full object-cover" />
                 <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-cj-danger">
                   <X className="w-3 h-3" />
                 </button>
              </div>
           ))}
           <label className="w-24 h-24 rounded-lg bg-cj-bg-secondary border border-dashed border-cj-border flex flex-col items-center justify-center cursor-pointer hover:bg-cj-accent-blue-light hover:border-cj-accent-blue transition-all text-cj-text-muted hover:text-cj-accent-blue">
              <UploadCloud className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Añadir Foto</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImg} />
           </label>
           {uploadingImg && <span className="text-xs text-cj-accent-blue mt-4">Subiendo...</span>}
         </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-cj-border rounded text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-tertiary transition-all text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 btn-primary text-sm disabled:opacity-50"
        >
          {saving ? 'Guardando...' : (service ? 'Actualizar' : 'Crear Servicio')}
        </button>
      </div>
    </form>
  );
};

// --- Panel principal ---
const ServicePricingPanel = () => {
  const [services, setServices] = useState<CorporateService[]>([]);
  const [loading, setLoading] = useState(true);
  const [pilarFilter, setPilarFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<CorporateService | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (pilarFilter) params.append('pilar', pilarFilter);
      const res = await api.get(`/admin/corporate-services?${params.toString()}`);
      setServices(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pilarFilter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const performDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/admin/corporate-services/${id}`);
      fetchServices();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (id: number, name: string) => {
    setConfirmDelete({ id, name });
  };

  const handleEdit = (srv: CorporateService) => {
    setEditingService(srv);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingService(undefined);
    fetchServices();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingService(undefined);
  };

  const filtered = services.filter((s) => {
    if (search && !s.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Modal de creación/edición */}
      <Modal
        open={showForm}
        onClose={handleFormCancel}
        title={editingService ? 'Editar servicio corporativo' : 'Nuevo servicio corporativo'}
        size="lg"
      >
        <ServiceForm service={editingService} onSave={handleFormSave} onCancel={handleFormCancel} />
      </Modal>

      {/* Toolbar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cj-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-cj-bg-primary border border-cj-border rounded text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
              placeholder="Buscar servicio corporativo..."
            />
          </div>
          <select
            value={pilarFilter}
            onChange={(e) => setPilarFilter(e.target.value)}
            className="bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-sm text-cj-text-primary focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
          >
            <option value="">Todos los pilares</option>
            {PILARES.map((p) => (
              <option key={p} value={p}>{PILAR_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-cj-text-secondary">{filtered.length} servicios</span>
          <button
            onClick={fetchServices}
            className="p-2 rounded hover:bg-cj-bg-tertiary text-cj-text-secondary hover:text-cj-accent-blue transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditingService(undefined); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 btn-primary text-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {/* Tabla de servicios */}
      {loading ? (
        <div className="glass-panel p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cj-accent-blue"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center text-cj-text-muted">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No se encontraron servicios corporativos.</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cj-bg-secondary border-b border-cj-border text-xs font-mono uppercase tracking-widest text-cj-text-secondary">
                  <th className="py-3 px-4 font-medium">Servicio</th>
                  <th className="py-3 px-4 font-medium">Pilar</th>
                  <th className="py-3 px-4 font-medium text-right">Precio Base</th>
                  <th className="py-3 px-4 font-medium text-center">Tipo</th>
                  <th className="py-3 px-4 font-medium text-center">Estado</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((srv) => {
                  const colorClass = PILAR_COLORS[srv.pilar] ?? 'bg-cj-bg-secondary text-cj-text-secondary border-cj-border';
                  const hasPrecio = srv.precio_base !== null;

                  return (
                    <tr key={srv.id} className="border-b border-cj-border hover:bg-cj-bg-primary transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-cj-text-primary">{srv.nombre}</div>
                        {srv.descripcion && (
                          <p className="text-xs text-cj-text-secondary mt-0.5 line-clamp-1">{srv.descripcion}</p>
                        )}
                        {srv.is_special && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            ✨ Servicio Especial
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded border ${colorClass}`}>
                          {PILAR_LABELS[srv.pilar]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasPrecio ? (
                          <span className="text-sm font-mono text-green-700">${Number(srv.precio_base).toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-cj-text-muted italic">Cotización manual</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded border ${
                          hasPrecio
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {hasPrecio ? 'Automática' : 'Manual'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded border ${
                          srv.activo
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {srv.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(srv)}
                            className="p-1.5 rounded text-cj-text-secondary hover:text-cj-accent-blue hover:bg-cj-accent-blue-light transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(srv.id, srv.nombre)}
                            disabled={deletingId === srv.id}
                            className="p-1.5 rounded text-cj-text-secondary hover:text-cj-danger hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await performDelete(confirmDelete.id);
        }}
        title="Eliminar servicio corporativo"
        description={confirmDelete?.name}
        variant="destructive"
        confirmLabel="Eliminar"
      >
        <p>El servicio se eliminará del catálogo corporativo. Cotizaciones existentes mantienen su referencia, pero no podrán crearse nuevas con este servicio.</p>
      </ConfirmDialog>
    </div>
  );
};

export default ServicePricingPanel;
