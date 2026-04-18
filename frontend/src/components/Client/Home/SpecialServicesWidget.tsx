import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Crown, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

interface SpecialService {
  id: number;
  nombre: string;
  descripcion: string | null;
  pilar: string;
  precio_base: number | null;
  image_urls: string[];
  is_special: boolean;
}

const PILAR_LABEL: Record<string, string> = {
  TECNOLOGIA: 'Tecnología',
  CLIMATIZACION: 'Climatización',
  ENERGIA: 'Energía',
  CIVIL: 'Ingeniería Civil',
};

interface Props {
  onGoToServices: () => void;
}

const VISIBLE = 3;

export default function SpecialServicesWidget({ onGoToServices }: Props) {
  const [services, setServices] = useState<SpecialService[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get('/services/special')
      .then((res) => { if (alive) setServices(res.data); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  const visible = services ? services.slice(0, VISIBLE) : [];
  const overflow = services ? services.slice(VISIBLE) : [];

  return (
    <section className="glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          Servicios Destacados
        </h2>
        <button
          onClick={onGoToServices}
          className="text-xs text-cjdg-accent hover:text-white transition-colors flex items-center gap-1"
        >
          Ver todos <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {services === null && !error && (
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

      {services !== null && services.length === 0 && (
        <div className="text-center py-6 text-slate-500 border border-dashed border-slate-700 rounded-lg">
          <Sparkles className="w-6 h-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">Sin destacados por ahora</p>
        </div>
      )}

      {services !== null && services.length > 0 && (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          {visible.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={onGoToServices}
              title={`${s.nombre}${s.descripcion ? ' — ' + s.descripcion : ''}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 hover:border-amber-400/60 bg-gradient-to-br from-slate-800 to-slate-900 transition-all hover:-translate-y-0.5"
            >
              {s.image_urls && s.image_urls.length > 0 ? (
                <img
                  src={s.image_urls[0]}
                  alt={s.nombre}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-amber-400/70">
                  <Crown className="w-8 h-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute top-1.5 right-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400 drop-shadow-lg" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-[10px] uppercase tracking-wider text-amber-200/80 font-semibold truncate">
                  {PILAR_LABEL[s.pilar] || s.pilar}
                </p>
                <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
                  {s.nombre}
                </p>
              </div>
            </button>
          ))}

          {/* Tile "carpeta" de overflow */}
          {overflow.length > 0 && (
            <button
              type="button"
              onClick={onGoToServices}
              className="group relative aspect-square overflow-hidden rounded-lg border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-amber-900/30 transition-all hover:-translate-y-0.5 hover:border-amber-400"
            >
              {/* Mini-grid de preview 2x2 estilo carpeta iOS */}
              <div className="absolute inset-2 grid grid-cols-2 gap-0.5">
                {overflow.slice(0, 4).map((o, i) => (
                  <div key={o.id + '-' + i} className="rounded-sm overflow-hidden bg-slate-700">
                    {o.image_urls && o.image_urls.length > 0 ? (
                      <img src={o.image_urls[0]} alt="" className="w-full h-full object-cover opacity-70" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Crown className="w-3 h-3 text-amber-400/60" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                <span className="text-2xl font-black">+{overflow.length}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-200">más</span>
              </div>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
