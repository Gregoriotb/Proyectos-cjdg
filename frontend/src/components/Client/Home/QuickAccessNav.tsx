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
  tile: string;
}> = [
  {
    key: 'catalog',
    label: 'Catálogo',
    description: 'Productos físicos con checkout',
    icon: ShoppingBag,
    tile: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-700',
  },
  {
    key: 'services',
    label: 'Servicios CJDG',
    description: 'Los 4 pilares corporativos',
    icon: Wrench,
    tile: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 text-purple-700',
  },
  {
    key: 'quotations',
    label: 'Cotizaciones',
    description: 'Conversa con el equipo CJDG',
    icon: MessageSquare,
    tile: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
  },
  {
    key: 'invoices',
    label: 'Facturas',
    description: 'Historial de compras',
    icon: Receipt,
    tile: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 text-amber-700',
  },
];

export default function QuickAccessNav({ onNavigate }: Props) {
  return (
    <section className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="w-5 h-5 text-cj-accent-blue" />
        <h2 className="text-lg font-bold text-cj-text-primary">Accesos Rápidos</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, label, description, icon: Icon, tile }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            className={`group relative overflow-hidden text-left rounded-xl border ${tile} p-4 shadow-cj-sm transition-all hover:-translate-y-0.5 hover:shadow-cj-md`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className="w-6 h-6" />
              <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-cj-text-primary font-bold text-sm">{label}</div>
            <div className="text-xs text-cj-text-secondary mt-0.5">{description}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
