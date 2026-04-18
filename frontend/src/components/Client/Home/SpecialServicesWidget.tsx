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

const PILAR_ACCENT: Record<string, string> = {
  TECNOLOGIA: 'from-blue-500/20 to-blue-600/5',
  CLIMATIZACION: 'from-cyan-500/20 to-cyan-600/5',
  ENERGIA: 'from-yellow-500/20 to-yellow-600/5',
  CIVIL: 'from-orange-500/20 to-orange-600/5',
};

interface Props {
  onGoToServices: () => void;
}

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

  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
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
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse h-40 rounded-xl bg-white/5 border border-white/10" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se pudieron cargar los servicios destacados</p>
        </div>
      )}

      {services !== null && services.length === 0 && (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aún no hay servicios destacados</p>
          <button onClick={onGoToServices} className="text-xs text-cjdg-accent hover:text-white mt-2">
            Ver el catálogo completo →
          </button>
        </div>
      )}

      {services !== null && services.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {services.map((s) => {
            const gradient = PILAR_ACCENT[s.pilar] || 'from-blue-500/20 to-blue-600/5';
            return (
              <button
                key={s.id}
                type="button"
                onClick={onGoToServices}
                className={`group relative overflow-hidden text-left rounded-xl border border-white/10 hover:border-amber-400/50 bg-gradient-to-br ${gradient} p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/10`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    {PILAR_LABEL[s.pilar] || s.pilar}
                  </span>
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                </div>

                {s.image_urls && s.image_urls.length > 0 && (
                  <div className="aspect-video rounded-lg overflow-hidden mb-3 border border-white/10">
                    <img src={s.image_urls[0]} alt={s.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}

                <h3 className="text-sm font-bold text-white mb-1 line-clamp-1 group-hover:text-amber-200 transition-colors">
                  {s.nombre}
                </h3>
                <p className="text-xs text-slate-300/80 line-clamp-2 leading-snug">
                  {s.descripcion || 'Servicio especializado corporativo.'}
                </p>

                {s.precio_base != null && (
                  <div className="mt-3 text-xs text-emerald-400 font-semibold">
                    Desde ${Number(s.precio_base).toLocaleString('es-VE')}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
