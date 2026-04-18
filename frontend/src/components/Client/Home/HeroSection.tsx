import { Building2, Mail, Phone, ShoppingBag, FileText, Cpu, Snowflake, Zap, HardHat } from 'lucide-react';

interface Props {
  onNavigate: (section: 'catalog' | 'services' | 'quotations') => void;
}

const PILARES = [
  { icon: Cpu,       label: 'Tecnología',    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { icon: Snowflake, label: 'Climatización', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { icon: Zap,       label: 'Energía',       color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { icon: HardHat,   label: 'Ing. Civil',    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
];

export default function HeroSection({ onNavigate }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Hero principal — 2 columnas */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.15)] lg:col-span-2">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/80 to-indigo-900 animate-gradient bg-[length:200%_200%]" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-7 sm:p-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs uppercase tracking-wider text-blue-200 font-semibold mb-4">
            <Building2 className="w-3.5 h-3.5" />
            Proyectos CJDG
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
            Cuatro disciplinas,
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-200 bg-clip-text text-transparent">
              una sola solución
            </span>
          </h1>

          <p className="text-slate-200/90 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
            Somos una empresa venezolana especializada en diseñar e implementar soluciones integrales
            y sostenibles, combinando <strong className="text-white">tecnología</strong>,{' '}
            <strong className="text-white">climatización</strong>,{' '}
            <strong className="text-white">energía</strong> e{' '}
            <strong className="text-white">ingeniería civil</strong>.
          </p>

          {/* Chips de pilares */}
          <div className="flex flex-wrap gap-2 mb-6">
            {PILARES.map(({ icon: Icon, label, color }) => (
              <span key={label} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${color}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('catalog')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              Ver Catálogo
            </button>
            <button
              onClick={() => onNavigate('services')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-medium transition-all active:scale-95"
            >
              <FileText className="w-4 h-4" />
              Solicitar Cotización
            </button>
          </div>
        </div>
      </div>

      {/* Soporte card — 1 columna */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-900/40 p-6 sm:p-7">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs uppercase tracking-wider text-emerald-300 font-semibold mb-4">
            Soporte 24/7
          </div>
          <h3 className="text-white font-bold text-lg mb-4">¿Necesitas ayuda?</h3>
          <div className="space-y-3">
            <a
              href="mailto:ventas@proyectoscjdg.com"
              className="flex items-start gap-3 text-slate-200 hover:text-emerald-300 transition-colors group"
            >
              <Mail className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              <div className="text-sm break-all">ventas@proyectoscjdg.com</div>
            </a>
            <a
              href="tel:+582122350938"
              className="flex items-center gap-3 text-slate-200 hover:text-emerald-300 transition-colors"
            >
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-sm">+58 212-2350938</div>
            </a>
            <a
              href="tel:+584142849979"
              className="flex items-center gap-3 text-slate-200 hover:text-emerald-300 transition-colors"
            >
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-sm">+58 414-2849979</div>
            </a>
          </div>
          <div className="mt-5 pt-5 border-t border-white/10">
            <button
              onClick={() => onNavigate('quotations')}
              className="text-xs text-emerald-300 hover:text-emerald-200 font-medium"
            >
              Ver mis cotizaciones activas →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
