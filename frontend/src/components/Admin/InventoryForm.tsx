import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, UploadCloud, AlertCircle } from 'lucide-react';

interface InventoryFormProps {
  onSave: () => void;
  onCancel: () => void;
}

const PILARES = ['tecnologia', 'climatizacion', 'energia', 'cableado', 'seguridad', 'servidores', 'comunicacion', 'general'];

const InventoryForm = ({ onSave, onCancel }: InventoryFormProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data
  const [nombre, setNombre] = useState('');
  const [pilarId, setPilarId] = useState('tecnologia');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [codigoModelo, setCodigoModelo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [isOffer, setIsOffer] = useState(false);
  const [discount, setDiscount] = useState('0');
  
  // Images (URLs)
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);

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
      setError(e.response?.data?.detail || 'Error subiendo la imagen');
    } finally {
      setUploadingImg(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/admin/inventory', {
        nombre,
        pilar_id: pilarId,
        categoria: categoria || 'General',
        marca: marca || null,
        codigo_modelo: codigoModelo || null,
        description: descripcion || null,
        image_url: images.length > 0 ? images[0] : null,
        image_urls: images,
        price: price ? parseFloat(price) : null,
        stock: parseInt(stock) || 0,
        is_available: true,
        is_offer: isOffer,
        discount_percentage: parseFloat(discount) || 0,
      });
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error guardando en inventario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 space-y-4 relative">
      <div className="absolute top-4 right-4">
        <button onClick={onCancel} className="p-1.5 rounded text-cjdg-textMuted hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <h3 className="text-xl font-bold text-white mb-6">Añadir Nuevo Producto (Catálogo)</h3>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-md flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-cjdg-textMuted mb-1">Nombre *</label>
            <input required value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:border-cjdg-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm text-cjdg-textMuted mb-1">Pilar *</label>
            <select required value={pilarId} onChange={e=>setPilarId(e.target.value)} className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:border-cjdg-primary outline-none">
              {PILARES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-cjdg-textMuted mb-1">Categoría</label>
            <input value={categoria} onChange={e=>setCategoria(e.target.value)} placeholder="Ej: Camaras IP" className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:border-cjdg-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm text-cjdg-textMuted mb-1">Marca</label>
            <input value={marca} onChange={e=>setMarca(e.target.value)} placeholder="Ej: Hikvision" className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:border-cjdg-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm text-cjdg-textMuted mb-1">Código Modelo</label>
            <input value={codigoModelo} onChange={e=>setCodigoModelo(e.target.value)} placeholder="Ej: DS-2CD..." className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:border-cjdg-primary outline-none" />
          </div>
        </div>

        <div>
           <label className="block text-sm text-cjdg-textMuted mb-1">Descripción corta</label>
           <textarea value={descripcion} onChange={e=>setDescripcion(e.target.value)} rows={2} className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:border-cjdg-primary outline-none resize-none" />
        </div>

        <div className="border-t border-white/10 pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-cjdg-textMuted mb-1">Precio ($)</label>
            <input type="number" step="0.01" min="0" value={price} onChange={e=>setPrice(e.target.value)} className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:border-cjdg-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm text-cjdg-textMuted mb-1">Stock</label>
            <input type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)} className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:border-cjdg-primary outline-none" />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input type="checkbox" checked={isOffer} onChange={e=>setIsOffer(e.target.checked)} className="rounded bg-cjdg-dark text-cjdg-primary border-cjdg-border" />
            <span className="text-sm text-white">¿En Oferta?</span>
          </div>
          {isOffer && (
            <div>
              <label className="block text-sm text-cjdg-textMuted mb-1">% Descuento</label>
              <input type="number" min="0" max="100" value={discount} onChange={e=>setDiscount(e.target.value)} className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:border-cjdg-primary outline-none" />
            </div>
          )}
        </div>

        {/* Galeria */}
        <div className="border-t border-white/10 pt-4">
           <label className="block text-sm text-cjdg-textMuted mb-3">Galería de Imágenes</label>
           
           <div className="flex flex-wrap gap-4 items-start">
             {images.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg bg-cjdg-darker border border-cjdg-border overflow-hidden">
                   <img src={url} alt="Prod" className="w-full h-full object-cover" />
                   <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-red-500">
                     <X className="w-3 h-3" />
                   </button>
                </div>
             ))}

             <label className="w-24 h-24 rounded-lg bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-cjdg-primary transition-all text-cjdg-textMuted hover:text-white">
                <UploadCloud className="w-6 h-6 mb-1" />
                <span className="text-[10px]">Añadir Foto</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImg} />
             </label>
             {uploadingImg && <span className="text-xs text-cjdg-primary mt-4">Subiendo...</span>}
           </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition-colors text-sm text-cjdg-textMuted">Cancelar</button>
          <button type="submit" disabled={loading} className="px-4 py-2 btn-primary text-sm disabled:opacity-50">
            {loading ? 'Guardando...' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;
