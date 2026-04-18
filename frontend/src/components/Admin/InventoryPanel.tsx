import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Save, Edit2, X, Tag, Package, Percent } from 'lucide-react';

interface CatalogItem {
  id: number;
  service_id: number;
  price: number | null;
  is_available: boolean;
  stock: number;
  is_offer: boolean;
  discount_percentage: number;
  service: {
    nombre: string;
    categoria: string;
  } | null;
}

const InventoryPanel = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<CatalogItem>>({});

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/admin/inventory');
      setItems(res.data);
    } catch (error) {
      console.error("Error fetching inventory", error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: number) => {
    try {
      // Evitamos mandar objetos anidados complejos en el body
      const { service, ...payload } = editForm as any;
      await api.put(`/admin/inventory/${id}`, payload);
      await fetchInventory();
      setEditingId(null);
    } catch (error) {
      console.error("Error updating item", error);
    }
  };

  if (loading) {
    return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-cj-bg-tertiary rounded w-3/4"></div></div></div>;
  }

  return (
    <div className="glass-panel p-6">
      <h2 className="text-xl font-bold text-cj-text-primary flex items-center gap-2 mb-6 border-b border-cj-border pb-4">
        <Package className="w-5 h-5 text-cj-accent-blue" /> Panel de Inventario
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cj-bg-secondary border-b border-cj-border text-xs font-mono uppercase tracking-widest text-cj-text-secondary">
              <th className="pb-3 px-4 font-medium">Producto / Servicio</th>
              <th className="pb-3 px-4 font-medium">Precio ($)</th>
              <th className="pb-3 px-4 font-medium">Stock</th>
              <th className="pb-3 px-4 font-medium">Categoría</th>
              <th className="pb-3 px-4 font-medium text-center">Oferta</th>
              <th className="pb-3 px-4 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <tr key={item.id} className={`border-b border-cj-border transition-colors ${isEditing ? 'bg-cj-bg-primary' : 'hover:bg-cj-bg-primary'}`}>
                  {/* Nombre */}
                  <td className="py-4 px-4 text-sm text-cj-text-primary font-medium">
                    {item.service?.nombre || `Ítem #${item.id}`}
                  </td>

                  {/* Precio */}
                  <td className="py-4 px-4 text-sm">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.price || ''}
                        onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value)})}
                        className="w-24 bg-cj-bg-primary border border-cj-border rounded px-2 py-1 text-cj-text-primary focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
                      />
                    ) : (
                      <span className="text-cj-text-secondary">${item.price !== null ? item.price : 'N/A'}</span>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="py-4 px-4 text-sm">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.stock || 0}
                        onChange={(e) => setEditForm({...editForm, stock: parseInt(e.target.value)})}
                        className="w-20 bg-cj-bg-primary border border-cj-border rounded px-2 py-1 text-cj-text-primary focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
                      />
                    ) : (
                      <span className={`${item.stock > 0 ? 'text-green-700' : 'text-cj-danger'}`}>{item.stock} uds</span>
                    )}
                  </td>

                  {/* Categoria */}
                  <td className="py-4 px-4 text-xs font-mono text-cj-text-secondary">
                    {item.service?.categoria || 'Sin categoría'}
                  </td>

                  {/* Oferta */}
                  <td className="py-4 px-4 text-center">
                    {isEditing ? (
                       <label className="flex items-center justify-center cursor-pointer">
                         <input
                           type="checkbox"
                           checked={editForm.is_offer || false}
                           onChange={(e) => setEditForm({...editForm, is_offer: e.target.checked})}
                           className="form-checkbox h-4 w-4 text-cj-accent-blue rounded border-cj-border bg-cj-bg-primary focus:ring-cj-accent-blue-light"
                         />
                       </label>
                    ) : (
                      item.is_offer ? <Tag className="w-4 h-4 text-cj-accent-blue mx-auto" /> : <span className="text-cj-text-muted mx-auto">-</span>
                    )}
                  </td>

                  {/* Acción */}
                  <td className="py-4 px-4 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                         <button onClick={cancelEdit} className="text-cj-text-secondary hover:text-cj-text-primary transition-colors p-1"><X className="w-4 h-4" /></button>
                         <button onClick={() => saveEdit(item.id)} className="text-green-700 hover:text-green-800 transition-colors p-1"><Save className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(item)} className="text-cj-text-secondary hover:text-cj-accent-blue transition-colors p-1"><Edit2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-cj-text-muted text-sm">No hay ítems en el catálogo aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryPanel;
