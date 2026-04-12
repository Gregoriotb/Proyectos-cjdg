import React, { useEffect, useState } from 'react';
import { ShoppingCart, Search, Plus, Minus, Filter, Package, Tag, X, CheckCircle2 } from 'lucide-react';
import { api, getImageUrl } from '../../services/api';
import { useCart } from '../../context/CartContext';

interface CatalogItemType {
  id: number;
  price: number;
  is_available: boolean;
  stock: number;
  is_offer: boolean;
  discount_percentage: number;
  service: {
    id: number;
    nombre: string;
    description: string;
    pilar_id: string;
    categoria: string;
    marca: string | null;
    codigo_modelo: string | null;
    image_url: string | null;
  };
}

const PILARES = [
  { value: 'all', label: 'Todos' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'climatizacion', label: 'Climatización' },
  { value: 'energia', label: 'Energía' },
  { value: 'ingenieria_civil', label: 'Ingeniería Civil' },
];

const ProductCatalogGrid = () => {
  const [items, setItems] = useState<CatalogItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPilar, setFilterPilar] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const { addToCart } = useCart();

  // Modal de cantidad
  const [selectedItem, setSelectedItem] = useState<CatalogItemType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // SSE para stock en tiempo real
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost/api/v1';
    const eventSource = new EventSource(`${apiUrl}/catalog/stock-stream`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.error) setStockMap(data);
      } catch { /* ignore */ }
    };
    return () => eventSource.close();
  }, []);

  useEffect(() => { fetchCatalog(); }, [filterPilar]);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const url = filterPilar === 'all' ? '/catalog' : `/catalog?pilar_id=${filterPilar}`;
      const res = await api.get(url);
      setItems(res.data);
    } catch (error) {
      console.error('Error cargando catálogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const openQuantityModal = (item: CatalogItemType) => {
    setSelectedItem(item);
    setQuantity(1);
    setAdded(false);
  };

  const handleConfirmAdd = async () => {
    if (!selectedItem) return;
    setAdding(true);
    await addToCart(selectedItem.id, quantity);
    setAdding(false);
    setAdded(true);
    setTimeout(() => {
      setSelectedItem(null);
      setAdded(false);
    }, 1500);
  };

  const filtered = items.filter((item) =>
    item.service.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.service.description && item.service.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.service.marca && item.service.marca.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex w-full md:w-auto overflow-x-auto gap-2 pb-2 md:pb-0">
          {PILARES.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilterPilar(p.value)}
              className={`py-1.5 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filterPilar === p.value
                  ? 'bg-cjdg-primary text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                  : 'bg-white/5 text-cjdg-textMuted hover:bg-white/10 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cjdg-textMuted" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-white/10 rounded-full bg-cjdg-darker/50 text-white placeholder-cjdg-textMuted focus:outline-none focus:border-cjdg-accent text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-panel h-64 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center text-cjdg-textMuted">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No se encontraron productos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => {
            const realStock = stockMap[item.id] ?? item.stock;
            const imageUrl = getImageUrl(item.service.image_url);
            const hasDiscount = item.is_offer && item.discount_percentage > 0;
            const finalPrice = hasDiscount && item.price
              ? item.price * (1 - item.discount_percentage / 100)
              : item.price;

            return (
              <div key={item.id} className="glass-panel flex flex-col overflow-hidden group hover:border-cjdg-primary/30 transition-all">
                <div className="relative h-40 bg-cjdg-darker/50 flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.service.nombre} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform" loading="lazy" />
                  ) : (
                    <Package className="w-12 h-12 text-cjdg-textMuted/30" />
                  )}
                  {hasDiscount && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <Tag className="w-3 h-3" /> -{item.discount_percentage}%
                    </span>
                  )}
                </div>
                <div className="p-4 flex-grow flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cjdg-textMuted mb-1">
                    {item.service.categoria}{item.service.marca && ` · ${item.service.marca}`}
                  </span>
                  <h3 className="text-sm font-medium text-white leading-snug mb-1 line-clamp-2 group-hover:text-cjdg-accent transition-colors">
                    {item.service.nombre}
                  </h3>
                  {item.service.codigo_modelo && (
                    <p className="text-xs text-cjdg-textMuted font-mono mb-2">{item.service.codigo_modelo}</p>
                  )}
                  <div className="mt-auto">
                    <div className={`text-xs mb-2 ${realStock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {realStock > 0 ? `${realStock} en stock` : 'Agotado'}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div>
                        {item.price ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-white font-mono font-bold text-sm">${Number(finalPrice).toFixed(2)}</span>
                            {hasDiscount && <span className="text-xs text-cjdg-textMuted line-through">${Number(item.price).toFixed(2)}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-cjdg-textMuted italic">Cotizar</span>
                        )}
                      </div>
                      <button
                        onClick={() => openQuantityModal(item)}
                        disabled={realStock <= 0 || !item.price}
                        className={`p-2 rounded-md transition-all flex items-center gap-1 text-sm ${
                          realStock > 0 && item.price
                            ? 'text-cjdg-primary bg-cjdg-primary/10 hover:bg-cjdg-primary hover:text-white'
                            : 'text-cjdg-textMuted/30 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-4 h-4" /><ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de cantidad */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !adding && setSelectedItem(null)} />
          <div className="relative w-full max-w-sm glass-panel p-6">
            {added ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">Agregado al carrito</h3>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-white pr-4">Agregar al Carrito</h3>
                  <button onClick={() => setSelectedItem(null)} className="text-cjdg-textMuted hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Producto info */}
                <div className="flex gap-3 mb-5 p-3 bg-cjdg-darker/50 rounded-lg border border-white/5">
                  <div className="w-16 h-16 rounded bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {getImageUrl(selectedItem.service.image_url) ? (
                      <img src={getImageUrl(selectedItem.service.image_url)!} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Package className="w-6 h-6 text-cjdg-textMuted/30" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{selectedItem.service.nombre}</p>
                    <p className="text-xs text-cjdg-textMuted">{selectedItem.service.marca}</p>
                    <p className="text-sm font-mono text-cjdg-accent mt-1">${Number(selectedItem.price).toFixed(2)} c/u</p>
                  </div>
                </div>

                {/* Selector de cantidad */}
                <div className="mb-5">
                  <label className="text-sm text-cjdg-textMuted mb-2 block">Cantidad</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-lg border border-cjdg-border bg-cjdg-dark/50 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={stockMap[selectedItem.id] ?? selectedItem.stock}
                      value={quantity}
                      onChange={(e) => {
                        const max = stockMap[selectedItem.id] ?? selectedItem.stock;
                        const val = Math.min(Math.max(1, parseInt(e.target.value) || 1), max);
                        setQuantity(val);
                      }}
                      className="w-20 text-center bg-cjdg-darker border border-cjdg-border rounded-lg py-2 text-white font-mono text-lg focus:outline-none focus:border-cjdg-primary"
                    />
                    <button
                      onClick={() => {
                        const max = stockMap[selectedItem.id] ?? selectedItem.stock;
                        setQuantity(q => Math.min(max, q + 1));
                      }}
                      className="w-10 h-10 rounded-lg border border-cjdg-border bg-cjdg-dark/50 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-cjdg-textMuted">
                      máx {stockMap[selectedItem.id] ?? selectedItem.stock}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mb-5 p-3 bg-cjdg-primary/5 rounded-lg border border-cjdg-primary/20">
                  <span className="text-sm text-cjdg-textMuted">Total</span>
                  <span className="text-xl font-mono font-bold text-white">
                    ${(Number(selectedItem.price) * quantity).toFixed(2)}
                  </span>
                </div>

                {/* Botón confirmar */}
                <button
                  onClick={handleConfirmAdd}
                  disabled={adding}
                  className="w-full py-3 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {adding ? 'Agregando...' : (
                    <><ShoppingCart className="w-4 h-4" /> Agregar {quantity} al Carrito</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalogGrid;
