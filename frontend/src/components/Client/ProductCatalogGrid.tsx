import React, { useEffect, useState } from 'react';
import { ShoppingCart, Search, Plus, Minus, Filter, Package, Tag, X, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getImageUrl } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useCatalog, CatalogItemType } from '../../hooks/useCatalog';
import PaginationControls from '../Pagination/PaginationControls';

const PILARES = [
  { value: 'all', label: 'Todos' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'climatizacion', label: 'Climatización' },
  { value: 'energia', label: 'Energía' },
  { value: 'ingenieria_civil', label: 'Ingeniería Civil' },
];

const PAGE_SIZE = 24;

const ProductCard = ({ item, stockMap, openQuantityModal }: { item: CatalogItemType; stockMap: Record<number, number>; openQuantityModal: (item: CatalogItemType) => void; }) => {
  const realStock = stockMap[item.id] ?? item.stock;
  const hasDiscount = item.is_offer && item.discount_percentage > 0;
  const finalPrice = hasDiscount && item.price ? item.price * (1 - item.discount_percentage / 100) : item.price;
  
  // Array de imagenes: image_urls o la solitaria image_url
  const rawImages = item.service.image_urls?.length ? item.service.image_urls : (item.service.image_url ? [item.service.image_url] : []);
  const images = rawImages.map(img => getImageUrl(img));
  const [imgIndex, setImgIndex] = useState(0);

  const handleNext = (e: any) => { e.stopPropagation(); setImgIndex(i => (i + 1) % images.length); };
  const handlePrev = (e: any) => { e.stopPropagation(); setImgIndex(i => (i - 1 + images.length) % images.length); };

  return (
    <div className="bg-cj-surface border border-cj-border shadow-cj-sm rounded-lg flex flex-col overflow-hidden group hover:border-cj-accent-blue/40 hover:shadow-cj-md transition-all">
      <div className="relative h-40 bg-cj-bg-secondary flex items-center justify-center overflow-hidden group/carousel">
        {images.length > 0 ? (
          <img src={images[imgIndex]} alt={item.service.nombre} className="w-full h-full object-contain p-3 transition-transform" loading="lazy" />
        ) : (
          <Package className="w-12 h-12 text-cj-text-muted" />
        )}

        {images.length > 1 && (
          <>
            <button onClick={handlePrev} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover/carousel:opacity-100 hover:bg-cj-accent-blue transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNext} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover/carousel:opacity-100 hover:bg-cj-accent-blue transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-1 left-0 w-full flex justify-center gap-1">
              {images.map((_, idx) => (
                <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === imgIndex ? 'bg-cj-accent-blue' : 'bg-cj-border'}`} />
              ))}
            </div>
          </>
        )}

        {hasDiscount && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
            <Tag className="w-3 h-3" /> -{item.discount_percentage}%
          </span>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <span className="text-[10px] font-mono uppercase tracking-wider text-cj-text-secondary mb-1">
          {item.service.categoria}{item.service.marca && ` · ${item.service.marca}`}
        </span>
        <h3 className="text-sm font-medium text-cj-text-primary leading-snug mb-1 line-clamp-2 group-hover:text-cj-accent-blue transition-colors">
          {item.service.nombre}
        </h3>
        {item.service.codigo_modelo && (
          <p className="text-xs text-cj-text-secondary font-mono mb-2">{item.service.codigo_modelo}</p>
        )}
        <div className="mt-auto">
          <div className={`text-xs mb-2 ${realStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {realStock > 0 ? `${realStock} en stock` : 'Agotado'}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-cj-border">
            <div>
              {item.price ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-cj-text-primary font-mono font-bold text-sm">${Number(finalPrice).toFixed(2)}</span>
                  {hasDiscount && <span className="text-xs text-cj-text-muted line-through">${Number(item.price).toFixed(2)}</span>}
                </div>
              ) : (
                <span className="text-xs text-cj-text-muted italic">Cotizar</span>
              )}
            </div>
            {realStock > 0 ? (
              <button
                onClick={() => openQuantityModal(item)}
                className="p-2 rounded-md transition-all flex items-center gap-1 text-sm text-cj-accent-blue bg-cj-accent-blue-light hover:bg-cj-accent-blue hover:text-white"
              >
                <Plus className="w-4 h-4" /><ShoppingCart className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-xs text-red-600 font-medium">Agotado</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCatalogGrid = () => {
  const { addToCart } = useCart();
  const {
    items,
    loading,
    total,
    page,
    totalPages,
    setPage,
    filterPilar,
    setFilterPilar,
    searchTerm,
    setSearchTerm
  } = useCatalog(PAGE_SIZE);

  const [stockMap, setStockMap] = useState<Record<number, number>>({});

  // Modal de cantidad
  const [selectedItem, setSelectedItem] = useState<CatalogItemType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // SSE desactivado en produccion (cross-origin no soporta EventSource)
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
    if (apiUrl.startsWith('/')) {
      const eventSource = new EventSource(`${apiUrl}/catalog/stock-stream`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data.error) setStockMap(data);
        } catch { /* ignore */ }
      };
      eventSource.onerror = () => { eventSource.close(); };
      return () => eventSource.close();
    }
  }, []);

  const hasMore = items.length < total;

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

  // (El debounce de búsqueda ya no lo necesitamos duplicado aquí porque useCatalog lo hace)

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
                  ? 'bg-cj-accent-blue text-white shadow-cj-md'
                  : 'bg-cj-bg-secondary text-cj-text-secondary hover:bg-cj-bg-tertiary hover:text-cj-text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cj-text-muted" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-cj-border rounded-full bg-cj-surface text-cj-text-primary placeholder-cj-text-muted focus:outline-none focus:border-cj-accent-blue text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col h-[320px] animate-pulse bg-cj-surface border border-cj-border shadow-cj-sm p-4 rounded-lg">
              <div className="w-full h-32 bg-cj-bg-secondary rounded-md mb-4 flex-shrink-0"></div>
              <div className="w-1/4 h-2 bg-cj-bg-tertiary rounded mb-2"></div>
              <div className="w-3/4 h-4 bg-cj-bg-tertiary rounded mb-2"></div>
              <div className="w-1/2 h-3 bg-cj-bg-tertiary rounded mb-auto"></div>
              <div className="flex justify-between items-end mt-4">
                <div className="w-1/3 h-5 bg-cj-bg-tertiary rounded"></div>
                <div className="w-8 h-8 bg-cj-bg-tertiary rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-cj-surface border border-cj-border border-dashed shadow-cj-sm rounded-lg p-12 text-center text-cj-text-muted">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No se encontraron productos.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} stockMap={stockMap} openQuantityModal={openQuantityModal} />
          ))}
        </div>

        <PaginationControls 
          page={page} 
          totalPages={totalPages} 
          totalItems={total} 
          pageSize={PAGE_SIZE} 
          onPageChange={setPage} 
        />
        </>
      )}

      {/* Modal de cantidad */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !adding && setSelectedItem(null)} />
          <div className="relative w-full max-w-sm bg-cj-surface border border-cj-border shadow-cj-lg rounded-lg p-6">
            {added ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-cj-text-primary">Agregado al carrito</h3>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-cj-text-primary pr-4">Agregar al Carrito</h3>
                  <button onClick={() => setSelectedItem(null)} className="text-cj-text-secondary hover:text-cj-text-primary">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Producto info */}
                <div className="flex gap-3 mb-5 p-3 bg-cj-bg-secondary rounded-lg border border-cj-border">
                  <div className="w-16 h-16 rounded bg-cj-surface border border-cj-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {getImageUrl(selectedItem.service.image_url) ? (
                      <img src={getImageUrl(selectedItem.service.image_url)!} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Package className="w-6 h-6 text-cj-text-muted" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cj-text-primary truncate">{selectedItem.service.nombre}</p>
                    <p className="text-xs text-cj-text-secondary">{selectedItem.service.marca}</p>
                    <p className="text-sm font-mono text-cj-accent-blue mt-1">${Number(selectedItem.price).toFixed(2)} c/u</p>
                  </div>
                </div>

                {/* Selector de cantidad */}
                <div className="mb-5">
                  <label className="text-sm text-cj-text-secondary mb-2 block">Cantidad</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-lg border border-cj-border bg-cj-surface text-cj-text-primary flex items-center justify-center hover:bg-cj-bg-secondary transition-colors"
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
                      className="w-20 text-center bg-cj-surface border border-cj-border rounded-lg py-2 text-cj-text-primary font-mono text-lg focus:outline-none focus:border-cj-accent-blue"
                    />
                    <button
                      onClick={() => {
                        const max = stockMap[selectedItem.id] ?? selectedItem.stock;
                        setQuantity(q => Math.min(max, q + 1));
                      }}
                      className="w-10 h-10 rounded-lg border border-cj-border bg-cj-surface text-cj-text-primary flex items-center justify-center hover:bg-cj-bg-secondary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-cj-text-secondary">
                      máx {stockMap[selectedItem.id] ?? selectedItem.stock}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mb-5 p-3 bg-cj-accent-blue-light rounded-lg border border-cj-accent-blue/20">
                  <span className="text-sm text-cj-text-secondary">Total</span>
                  <span className="text-xl font-mono font-bold text-cj-text-primary">
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
