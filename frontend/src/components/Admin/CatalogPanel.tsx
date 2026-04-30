import React, { useState, useEffect, useCallback } from 'react';
import { api, getImageUrl } from '../../services/api';
import {
  Search, ChevronLeft, ChevronRight, Box, Edit2, X, Save,
  Tag, AlertTriangle, CheckCircle, RefreshCw, Plus, Trash2, UploadCloud, Loader2
} from 'lucide-react';
import PaginationControls from '../Pagination/PaginationControls';
import InventoryForm from './InventoryForm';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';

interface CatalogProduct {
  id: number;         // CatalogItem.id
  service_id: number;
  price: number | null;
  is_available: boolean;
  stock: number;
  stock_reservado?: number;
  stock_disponible?: number;
  is_offer: boolean;
  discount_percentage: number;
  service: {
    id: number;
    nombre: string;
    marca: string | null;
    codigo_modelo: string | null;
    categoria: string;
    pilar_id: string;
    description: string | null;
    specs: Record<string, string> | null;
    image_url: string | null;
    image_urls: string[] | null;
  } | null;
}

const PILAR_LABELS: Record<string, string> = {
  seguridad: 'Seguridad',
  redes: 'Redes',
  tecnologia: 'Tecnología',
  cableado: 'Cableado',
  servidores: 'Servidores',
  comunicacion: 'Comunicación',
  general: 'General',
};

const PAGE_SIZE = 30;

// Fila editable del catálogo
const CatalogRow = ({ item, onItemUpdated, onDelete }: { item: CatalogProduct; onItemUpdated: (id: number, data: Partial<CatalogProduct>) => void; onDelete: (id: number) => void; }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    price: item.price ?? 0,
    stock: item.stock,
    is_offer: item.is_offer,
    discount_percentage: item.discount_percentage,
    is_available: item.is_available,
  });
  const [description, setDescription] = useState<string>(item.service?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const currentImages = item.service?.image_urls || [];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newUrl = res.data.url;
      
      const updatedImages = [...currentImages, newUrl];
      
      const patchRes = await api.patch(`/admin/services/${item.service_id}`, {
        image_url: updatedImages[0], 
        image_urls: updatedImages
      });
      onItemUpdated(item.id, { service: patchRes.data });
    } catch (e: any) {
      console.error('Error subiendo', e);
      alert("Error subiendo imagen");
    } finally {
      setUploadingImg(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    try {
      const updatedImages = currentImages.filter((_, i) => i !== indexToRemove);
      const patchRes = await api.patch(`/admin/services/${item.service_id}`, {
        image_url: updatedImages.length > 0 ? updatedImages[0] : null,
        image_urls: updatedImages
      });
      onItemUpdated(item.id, { service: patchRes.data });
    } catch (e: any) {
      console.error('Error eliminando imagen', e);
      alert("Error eliminando imagen");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/admin/inventory/${item.id}`, form);
      const updatedPayload: any = { ...res.data };

      // Si cambió la descripción, persistirla en el service asociado.
      const originalDesc = item.service?.description ?? '';
      if (description !== originalDesc) {
        const srvRes = await api.patch(`/admin/services/${item.service_id}`, {
          description,
        });
        updatedPayload.service = srvRes.data;
      }

      onItemUpdated(item.id, updatedPayload);
      setForm({
        price: res.data.price ?? 0,
        stock: res.data.stock,
        is_offer: res.data.is_offer,
        discount_percentage: res.data.discount_percentage,
        is_available: res.data.is_available,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const nombre = item.service?.nombre ?? `Ítem #${item.id}`;
  const marca = item.service?.marca;
  const modelo = item.service?.codigo_modelo;
  const imgSrc = currentImages.length > 0 ? getImageUrl(currentImages[0]) : getImageUrl(item.service?.image_url ?? null);
  const imageCount = currentImages.length;

  return (
    <>
    <tr className={`border-b ${editing ? 'border-cj-accent-blue/30 bg-cj-bg-primary' : 'border-cj-border hover:bg-cj-bg-primary'} transition-colors`}>
      {/* Imagen + Nombre */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-cj-bg-tertiary border border-cj-border flex-shrink-0 flex items-center justify-center">
            {imgSrc
              ? <img src={imgSrc} alt={nombre} className="w-full h-full object-contain" />
              : <Box className="w-5 h-5 text-cj-text-muted opacity-60" />
            }
            {imageCount > 0 && (
              <span className="absolute bottom-0 right-0 bg-cj-accent-blue text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-tl-md">{imageCount}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-cj-text-primary truncate max-w-[140px] sm:max-w-[180px] lg:max-w-[260px]">{nombre}</div>
            <div className="flex gap-1 mt-0.5">
              {marca && <span className="text-xs text-cj-accent-blue">{marca}</span>}
              {modelo && <span className="text-xs text-cj-text-secondary font-mono">· {modelo}</span>}
            </div>
          </div>
        </div>
      </td>

      {/* Categoría */}
      <td className="py-3 px-4 text-xs text-cj-text-secondary hidden md:table-cell">
        <span className="px-2 py-0.5 rounded bg-cj-bg-secondary border border-cj-border">
          {PILAR_LABELS[item.service?.pilar_id ?? ''] ?? item.service?.categoria ?? '—'}
        </span>
      </td>

      {/* Precio */}
      <td className="py-3 px-4">
        <span className={`text-sm ${form.price > 0 ? 'text-cj-text-primary' : 'text-cj-text-muted'}`}>
          {form.price > 0 ? `$${Number(form.price).toFixed(2)}` : '—'}
        </span>
      </td>

      {/* Stock */}
      <td className="py-3 px-4">
        <div className="text-sm font-mono">
          <span className={form.stock > 0 ? 'text-green-700' : 'text-cj-danger'}>
            {form.stock}
          </span>
          {(item.stock_reservado || 0) > 0 && (
            <span className="block text-[10px] text-orange-600 mt-0.5" title={`Reservado en facturas pendientes. Disponible: ${item.stock_disponible}`}>
              {item.stock_reservado} reserv. · {item.stock_disponible} disp.
            </span>
          )}
        </div>
      </td>

      {/* Oferta % */}
      <td className="py-3 px-4">
        {form.is_offer ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cj-accent-blue-light text-cj-accent-blue text-xs border border-blue-200">
            <Tag className="w-3 h-3" /> {form.discount_percentage}%
          </span>
        ) : (
          <span className="text-cj-text-muted text-xs">—</span>
        )}
      </td>

      {/* Disponible */}
      <td className="py-3 px-4 hidden lg:table-cell">
        <span className={`text-xs ${form.is_available ? 'text-green-700' : 'text-cj-danger'}`}>
          {form.is_available ? '● Visible' : '○ Oculto'}
        </span>
      </td>

      {/* Acciones */}
      <td className="py-3 px-4 text-right">
        {saved && <CheckCircle className="w-4 h-4 text-green-700 inline" />}
        {!saved && (
            <div className="flex justify-end gap-1">
              <button onClick={() => setEditing(true)} className="p-1.5 rounded text-cj-text-secondary hover:text-cj-accent-blue hover:bg-cj-accent-blue-light transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(item.id)} className="p-1.5 rounded text-cj-text-secondary hover:text-cj-danger hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
        )}
      </td>
    </tr>

    {/* ── Modal de edición ── */}
    <Modal
      open={editing}
      onClose={() => setEditing(false)}
      title={`Editar — ${nombre}`}
      description={modelo ? `Modelo ${modelo}` : marca || undefined}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="px-3 py-1.5 text-sm rounded-lg border border-cj-border text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-secondary disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-cj-accent-blue hover:bg-cj-accent-blue-dark text-white shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <Save className="w-4 h-4" /> Guardar cambios
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase text-cj-text-muted mb-1">Precio (USD)</label>
            <input
              type="number"
              value={form.price}
              onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              className="w-full bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue"
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-cj-text-muted mb-1">Stock físico</label>
            <input
              type="number"
              value={form.stock}
              onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
              className="w-full bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue"
            />
            {(item.stock_reservado || 0) > 0 && (
              <p className="text-[10px] text-orange-600 mt-1">{item.stock_reservado} reservado · {item.stock_disponible} disponible</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-start">
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={form.is_offer}
                onChange={e => setForm({ ...form, is_offer: e.target.checked })}
                className="rounded border-cj-border bg-cj-bg-primary text-cj-accent-blue"
              />
              <span className="text-sm text-cj-text-primary">En oferta</span>
            </label>
            {form.is_offer && (
              <input
                type="number"
                value={form.discount_percentage}
                onChange={e => setForm({ ...form, discount_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue"
                placeholder="% descuento"
              />
            )}
          </div>
          <div>
            <label className="block text-xs uppercase text-cj-text-muted mb-1">Visibilidad</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_available: !form.is_available })}
              className={`w-full text-sm px-3 py-2 rounded border transition-colors ${form.is_available ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-cj-danger border-red-200'}`}
            >
              {form.is_available ? '● Visible en catálogo' : '○ Oculto en catálogo'}
            </button>
          </div>
        </div>

        {/* Descripción corta */}
        <div className="border-t border-cj-border pt-4">
          <label className="block text-xs uppercase text-cj-text-muted mb-1">Descripción corta</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Resumen visible en el catálogo (1-3 líneas)"
            className="w-full bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue resize-y"
          />
        </div>

        {/* Galería */}
        <div className="border-t border-cj-border pt-4">
          <div className="flex items-center gap-1 text-xs text-cj-text-secondary mb-3">
            <UploadCloud className="w-4 h-4" />
            <span className="font-medium">Galería</span>
            <span className="text-cj-accent-blue ml-1">({imageCount})</span>
          </div>
            <div className="flex flex-wrap gap-3 items-start flex-1">
              {/* Imágenes existentes */}
              {currentImages.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-cj-bg-tertiary border border-cj-border group/thumb">
                  <img src={getImageUrl(url) || url} alt={`${nombre} ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 bg-cj-danger/80 hover:bg-cj-danger p-0.5 rounded-full text-white opacity-0 group-hover/thumb:opacity-100 transition-all"
                    title="Eliminar imagen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 bg-cj-accent-blue/90 text-white text-[8px] px-1.5 py-0.5 font-bold uppercase">Principal</span>
                  )}
                </div>
              ))}

              {/* Botón para agregar */}
              <label className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                uploadingImg
                  ? 'border-cj-accent-blue/50 bg-cj-accent-blue-light'
                  : 'border-cj-border bg-cj-bg-secondary hover:bg-cj-accent-blue-light hover:border-cj-accent-blue/50'
              } text-cj-text-secondary hover:text-cj-accent-blue`}>
                {uploadingImg ? (
                  <Loader2 className="w-5 h-5 animate-spin text-cj-accent-blue" />
                ) : (
                  <>
                    <Plus className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-medium">Agregar</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImg} />
              </label>
            </div>
        </div>
      </div>
    </Modal>
    </>
  );
};

const CatalogPanel = () => {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pilarFilter, setPilarFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const performDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/admin/inventory/${id}`);
      fetchItems();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (id: number) => {
    const item = items.find((it) => it.id === id);
    setConfirmDelete({ id, name: item?.service?.nombre || `Ítem #${id}` });
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        page_size: String(PAGE_SIZE) 
      });
      if (search.trim()) params.set('search', search.trim());
      if (pilarFilter) params.set('pilar_id', pilarFilter);

      const res = await api.get(`/admin/inventory?${params}`);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, pilarFilter]);

  // Debounce para búsqueda
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchItems();
    }, 400);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  // Actualizar solo los campos de catálogo, sin tocar el service anidado
  const handleItemUpdated = (id: number, data: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        price: data.price !== undefined ? data.price : item.price,
        stock: data.stock !== undefined ? data.stock : item.stock,
        is_offer: data.is_offer !== undefined ? data.is_offer : item.is_offer,
        discount_percentage: data.discount_percentage !== undefined ? data.discount_percentage : item.discount_percentage,
        is_available: data.is_available !== undefined ? data.is_available : item.is_available,
        service: data.service !== undefined ? data.service : item.service
      };
    }));
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cj-text-muted" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-cj-bg-primary border border-cj-border rounded text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
              placeholder="Buscar por nombre o marca..."
            />
          </div>
          <select
            value={pilarFilter}
            onChange={e => { setPilarFilter(e.target.value); setPage(1); }}
            className="bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-sm text-cj-text-primary focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
          >
            <option value="">Todos los pilares</option>
            {Object.entries(PILAR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-cj-text-secondary">{total} productos</span>
          <button onClick={fetchItems} className="p-2 rounded hover:bg-cj-bg-tertiary text-cj-text-secondary hover:text-cj-accent-blue transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 btn-primary text-sm">
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {showForm && (
        <InventoryForm onSave={() => { setShowForm(false); fetchItems(); }} onCancel={() => setShowForm(false)} />
      )}

      {/* Tabla */}
      <div className="glass-panel p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-cj-bg-secondary border-b border-cj-border text-xs font-mono uppercase tracking-widest text-cj-text-secondary">
                <th className="py-3 px-4 font-medium">Producto</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Pilar</th>
                <th className="py-3 px-4 font-medium">Precio ($)</th>
                <th className="py-3 px-4 font-medium">Stock</th>
                <th className="py-3 px-4 font-medium">Oferta</th>
                <th className="py-3 px-4 font-medium hidden lg:table-cell">Visibilidad</th>
                <th className="py-3 px-4 text-right font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-cj-border">
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-4 bg-cj-bg-tertiary rounded animate-pulse w-3/4" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-cj-text-muted">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Sin resultados para esa búsqueda.</p>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <CatalogRow key={item.id} item={item} onItemUpdated={handleItemUpdated} onDelete={handleDelete} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="px-4 pb-4">
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await performDelete(confirmDelete.id);
        }}
        title="Eliminar artículo del catálogo"
        description={confirmDelete?.name}
        variant="destructive"
        confirmLabel="Eliminar"
      >
        <p>Esta acción es <strong>irreversible</strong>. Si hay stock asociado, también se perderá la trazabilidad de movimientos.</p>
      </ConfirmDialog>
    </div>
  );
};

export default CatalogPanel;
