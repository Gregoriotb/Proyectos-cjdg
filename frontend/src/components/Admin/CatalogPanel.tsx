import React, { useState, useEffect, useCallback } from 'react';
import { api, getImageUrl } from '../../services/api';
import {
  Search, ChevronLeft, ChevronRight, Box, Edit2, X, Save,
  Tag, AlertTriangle, CheckCircle, RefreshCw, Plus, Trash2
} from 'lucide-react';
import PaginationControls from '../Pagination/PaginationControls';
import InventoryForm from './InventoryForm';

interface CatalogProduct {
  id: number;         // CatalogItem.id
  service_id: number;
  price: number | null;
  is_available: boolean;
  stock: number;
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/admin/inventory/${item.id}`, form);
      // Actualizar solo este item en el estado del padre, sin recargar toda la lista
      onItemUpdated(item.id, res.data);
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
  const imgSrc = getImageUrl(item.service?.image_url ?? null);

  return (
    <tr className={`border-b border-white/5 transition-colors ${editing ? 'bg-white/5' : 'hover:bg-white/5'}`}>
      {/* Imagen + Nombre */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
            {imgSrc
              ? <img src={imgSrc} alt={nombre} className="w-full h-full object-contain" />
              : <Box className="w-5 h-5 text-cjdg-textMuted opacity-40" />
            }
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate max-w-[200px]">{nombre}</div>
            <div className="flex gap-1 mt-0.5">
              {marca && <span className="text-xs text-cjdg-primary">{marca}</span>}
              {modelo && <span className="text-xs text-cjdg-textMuted font-mono">· {modelo}</span>}
            </div>
          </div>
        </div>
      </td>

      {/* Categoría */}
      <td className="py-3 px-4 text-xs text-cjdg-textMuted hidden md:table-cell">
        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
          {PILAR_LABELS[item.service?.pilar_id ?? ''] ?? item.service?.categoria ?? '—'}
        </span>
      </td>

      {/* Precio */}
      <td className="py-3 px-4">
        {editing ? (
          <input
            type="number"
            value={form.price}
            onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            className="w-24 bg-cjdg-darker border border-cjdg-border rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-cjdg-primary"
          />
        ) : (
          <span className={`text-sm ${form.price > 0 ? 'text-white' : 'text-cjdg-textMuted'}`}>
            {form.price > 0 ? `$${Number(form.price).toFixed(2)}` : '—'}
          </span>
        )}
      </td>

      {/* Stock */}
      <td className="py-3 px-4">
        {editing ? (
          <input
            type="number"
            value={form.stock}
            onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
            className="w-20 bg-cjdg-darker border border-cjdg-border rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-cjdg-primary"
          />
        ) : (
          <span className={`text-sm font-mono ${form.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {form.stock}
          </span>
        )}
      </td>

      {/* Oferta % */}
      <td className="py-3 px-4">
        {editing ? (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_offer}
                onChange={e => setForm({ ...form, is_offer: e.target.checked })}
                className="rounded border-cjdg-border bg-cjdg-darker text-cjdg-primary"
              />
              <span className="text-xs text-cjdg-textMuted">Activo</span>
            </label>
            {form.is_offer && (
              <input
                type="number"
                value={form.discount_percentage}
                onChange={e => setForm({ ...form, discount_percentage: parseFloat(e.target.value) || 0 })}
                className="w-16 bg-cjdg-darker border border-cjdg-border rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cjdg-accent"
                placeholder="%"
              />
            )}
          </div>
        ) : (
          form.is_offer ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cjdg-accent/20 text-cjdg-accent text-xs border border-cjdg-accent/30">
              <Tag className="w-3 h-3" /> {form.discount_percentage}%
            </span>
          ) : (
            <span className="text-cjdg-textMuted text-xs">—</span>
          )
        )}
      </td>

      {/* Disponible */}
      <td className="py-3 px-4 hidden lg:table-cell">
        {editing ? (
          <button
            onClick={() => setForm({ ...form, is_available: !form.is_available })}
            className={`text-xs px-2 py-1 rounded border transition-colors ${form.is_available ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}
          >
            {form.is_available ? 'Visible' : 'Oculto'}
          </button>
        ) : (
          <span className={`text-xs ${form.is_available ? 'text-green-400' : 'text-red-400'}`}>
            {form.is_available ? '● Visible' : '○ Oculto'}
          </span>
        )}
      </td>

      {/* Acciones */}
      <td className="py-3 px-4 text-right">
        {saved && <CheckCircle className="w-4 h-4 text-green-400 inline" />}
        {!saved && editing ? (
          <div className="flex justify-end gap-1">
            <button onClick={() => setEditing(false)} className="p-1.5 rounded text-cjdg-textMuted hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <button onClick={save} disabled={saving} className="p-1.5 rounded text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />
            </button>
          </div>
        ) : (
          !saved && (
            <div className="flex justify-end gap-1">
              <button onClick={() => setEditing(true)} className="p-1.5 rounded text-cjdg-textMuted hover:text-cjdg-primary hover:bg-cjdg-primary/10 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(item.id)} className="p-1.5 rounded text-cjdg-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        )}
      </td>
    </tr>
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

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar este artículo del catálogo?")) return;
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
        price: data.price,
        stock: data.stock,
        is_offer: data.is_offer,
        discount_percentage: data.discount_percentage,
        is_available: data.is_available,
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cjdg-textMuted" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-cjdg-darker border border-cjdg-border rounded text-white text-sm focus:outline-none focus:border-cjdg-primary"
              placeholder="Buscar por nombre o marca..."
            />
          </div>
          <select
            value={pilarFilter}
            onChange={e => { setPilarFilter(e.target.value); setPage(1); }}
            className="bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cjdg-primary"
          >
            <option value="">Todos los pilares</option>
            {Object.entries(PILAR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-cjdg-textMuted">{total} productos</span>
          <button onClick={fetchItems} className="p-2 rounded hover:bg-white/10 text-cjdg-textMuted hover:text-white transition-colors">
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
              <tr className="border-b border-white/10 text-xs font-mono uppercase tracking-widest text-cjdg-textMuted">
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
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-cjdg-textMuted">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
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
    </div>
  );
};

export default CatalogPanel;
