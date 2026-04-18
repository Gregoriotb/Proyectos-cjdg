import { ShoppingBag, Wrench, MessageSquare, Receipt, ArrowRight, Rocket } from 'lucide-react';

type SectionKey = 'catalog' | 'services' | 'quotations' | 'invoices';

interface Props {
  onNavigate: (section: SectionKey) => void;
}

const ITEMS: Array<{
  key: SectionKey;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
  gradient: string;
  accent: string;
}> = [
  {
    key: 'catalog',
    label: 'Catálogo',
    description: 'Productos físicos con checkout',
    icon: ShoppingBag,
    gradient: 'from-blue-500/20 to-blue-900/10',
    accent: 'text-blue-300 border-blue-500/30',
  },
  {
    key: 'services',
    label: 'Servicios CJDG',
    description: 'Los 4 pilares corporativos',
    icon: Wrench,
    gradient: 'from-purple-500/20 to-purple-900/10',
    accent: 'text-purple-300 border-purple-500/30',
  },
  {
    key: 'quotations',
    label: 'Cotizaciones',
    description: 'Conversa con el equipo CJDG',
    icon: MessageSquare,
    gradient: 'from-emerald-500/20 to-emerald-900/10',
    accent: 'text-emerald-300 border-emerald-500/30',
  },
  {
    key: 'invoices',
    label: 'Facturas',
    description: 'Historial de compras',
    icon: Receipt,
    gradient: 'from-amber-500/20 to-amber-900/10',
    accent: 'text-amber-300 border-amber-500/30',
  },
];

export default function QuickAccessNav({ onNavigate }: Props) {
  return (
    <section className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="w-5 h-5 text-cjdg-accent" />
        <h2 className="text-lg font-bold text-white">Accesos Rápidos</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, label, description, icon: Icon, gradient, accent }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            className={`group relative overflow-hidden text-left rounded-xl border bg-gradient-to-br ${gradient} ${accent} p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className="w-6 h-6" />
              <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-white font-bold text-sm">{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{description}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
