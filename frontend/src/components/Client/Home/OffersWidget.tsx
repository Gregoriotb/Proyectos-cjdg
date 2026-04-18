import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Flame, ShoppingCart, ArrowRight, AlertCircle, Package } from 'lucide-react';

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

export default function OffersWidget({ onGoToCatalog }: Props) {
  const [offers, setOffers] = useState<OfferProduct[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get('/catalog/offers', { params: { limit: 6 } })
      .then((res) => { if (alive) setOffers(res.data); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          Ofertas Especiales
        </h2>
        <button
          onClick={onGoToCatalog}
          className="text-xs text-cjdg-accent hover:text-white transition-colors flex items-center gap-1"
        >
          Ver catálogo completo <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {offers === null && !error && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-56 rounded-xl bg-white/5 border border-white/10" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se pudieron cargar las ofertas</p>
        </div>
      )}

      {offers !== null && offers.length === 0 && (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay ofertas activas en este momento</p>
          <button onClick={onGoToCatalog} className="text-xs text-cjdg-accent hover:text-white mt-2">
            Explorar catálogo →
          </button>
        </div>
      )}

      {offers !== null && offers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => (
            <button
              key={o.catalog_id}
              type="button"
              onClick={onGoToCatalog}
              className="group relative text-left overflow-hidden rounded-xl border border-white/10 hover:border-orange-400/50 bg-slate-900/60 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/10"
            >
              {/* Badge de descuento */}
              <div className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold shadow-lg">
                -{Math.round(o.discount_percentage)}%
              </div>

              {/* Imagen */}
              <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                {o.image_urls && o.image_urls.length > 0 ? (
                  <img
                    src={o.image_urls[0]}
                    alt={o.product_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Package className="w-10 h-10" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                {o.brand && (
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
                    {o.brand}
                  </div>
                )}
                <h4 className="text-sm font-medium text-white line-clamp-2 leading-snug mb-2 group-hover:text-orange-200 transition-colors">
                  {o.product_name}
                </h4>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-lg font-bold text-emerald-400">
                    ${Number(o.final_price).toLocaleString('es-VE')}
                  </span>
                  <span className="text-xs text-slate-500 line-through">
                    ${Number(o.original_price).toLocaleString('es-VE')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${o.stock > 0 ? 'text-slate-400' : 'text-red-400'}`}>
                    {o.stock > 0 ? `${o.stock} disponibles` : 'Sin stock'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-orange-300 font-medium group-hover:translate-x-0.5 transition-transform">
                    <ShoppingCart className="w-3 h-3" />
                    Ver
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
