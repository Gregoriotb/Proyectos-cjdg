import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Flame, ArrowRight, AlertCircle, Package } from 'lucide-react';

interface OfferProduct {
  catalog_id: number;
  product_name: string;
  brand?: string;
  original_price: number | string;
  discount_percentage: number;
  final_price: number;
  stock: number;
  image_urls: string[];
  service_id: number;
}

interface Props {
  onGoToCatalog: () => void;
}

const VISIBLE = 3;

export default function OffersWidget({ onGoToCatalog }: Props) {
  const [offers, setOffers] = useState<OfferProduct[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get('/catalog/offers', { params: { limit: 12 } })
      .then((res) => { if (alive) setOffers(res.data); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  const visible = offers ? offers.slice(0, VISIBLE) : [];
  const overflow = offers ? offers.slice(VISIBLE) : [];

  return (
    <section className="glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Ofertas Especiales
        </h2>
        <button
          onClick={onGoToCatalog}
          className="text-xs text-cjdg-accent hover:text-white transition-colors flex items-center gap-1"
        >
          Catálogo <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {offers === null && !error && (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse aspect-square rounded-lg bg-white/5 border border-white/10" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-6 text-slate-500 border border-dashed border-slate-700 rounded-lg">
          <AlertCircle className="w-6 h-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">Error al cargar</p>
        </div>
      )}

      {offers !== null && offers.length === 0 && (
        <div className="text-center py-6 text-slate-500 border border-dashed border-slate-700 rounded-lg">
          <Package className="w-6 h-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">No hay ofertas activas</p>
        </div>
      )}

      {offers !== null && offers.length > 0 && (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          {visible.map((o) => (
            <button
              key={o.catalog_id}
              type="button"
              onClick={onGoToCatalog}
              title={`${o.product_name}${o.brand ? ' — ' + o.brand : ''}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 hover:border-orange-400/60 bg-gradient-to-br from-slate-800 to-slate-900 transition-all hover:-translate-y-0.5"
            >
              {o.image_urls && o.image_urls.length > 0 ? (
                <img
                  src={o.image_urls[0]}
                  alt={o.product_name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                  <Package className="w-8 h-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              {/* Badge de descuento */}
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold shadow-md">
                -{Math.round(o.discount_percentage)}%
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                {o.brand && (
                  <p className="text-[9px] uppercase tracking-wider text-orange-200/80 font-semibold truncate">
                    {o.brand}
                  </p>
                )}
                <p className="text-xs font-bold text-white line-clamp-1 leading-tight mb-0.5">
                  {o.product_name}
                </p>
                <p className="text-xs font-bold text-emerald-300">
                  ${Number(o.final_price).toLocaleString('es-VE')}
                </p>
              </div>
            </button>
          ))}

          {/* Tile "carpeta" de overflow */}
          {overflow.length > 0 && (
            <button
              type="button"
              onClick={onGoToCatalog}
              className="group relative aspect-square overflow-hidden rounded-lg border border-orange-400/40 bg-gradient-to-br from-orange-500/20 to-red-900/30 transition-all hover:-translate-y-0.5 hover:border-orange-400"
            >
              <div className="absolute inset-2 grid grid-cols-2 gap-0.5">
                {overflow.slice(0, 4).map((o, i) => (
                  <div key={o.catalog_id + '-' + i} className="rounded-sm overflow-hidden bg-slate-700">
                    {o.image_urls && o.image_urls.length > 0 ? (
                      <img src={o.image_urls[0]} alt="" className="w-full h-full object-cover opacity-70" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-3 h-3 text-orange-400/60" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                <span className="text-2xl font-black">+{overflow.length}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-200">ofertas</span>
              </div>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
