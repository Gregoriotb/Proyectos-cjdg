import { Receipt, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export interface InvoiceBriefData {
  id: number;
  invoice_type: string;
  status: string;
  total: number | string;
  notas?: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  PRODUCT_SALE: 'Productos',
  SERVICE_QUOTATION: 'Servicio',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  PENDING:   { label: 'Pendiente', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', Icon: Clock },
  PAID:      { label: 'Pagada',    color: 'bg-green-500/15 text-green-300 border-green-500/30',   Icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-500/15 text-red-300 border-red-500/30',         Icon: XCircle },
  OVERDUE:   { label: 'Vencida',   color: 'bg-orange-500/15 text-orange-300 border-orange-500/30', Icon: AlertTriangle },
};

interface Props {
  invoices: InvoiceBriefData[];
  /** Si true, la burbuja se pinta con estilos para admin (bubble blue). Default: cliente (gris). */
  fromAdmin?: boolean;
}

export default function InvoiceMentionBubble({ invoices, fromAdmin = false }: Props) {
  if (!invoices || invoices.length === 0) return null;
  const total = invoices.reduce((acc, i) => acc + Number(i.total || 0), 0);

  return (
    <div className={`rounded-xl border ${fromAdmin ? 'border-blue-300/40 bg-blue-500/10' : 'border-emerald-400/30 bg-emerald-500/10'} p-3 space-y-2`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-90">
        <Receipt className="w-4 h-4" />
        {invoices.length} factura{invoices.length > 1 ? 's' : ''} referenciada{invoices.length > 1 ? 's' : ''}
      </div>

      <div className="space-y-1.5">
        {invoices.map((inv) => {
          const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PENDING;
          const Icon = cfg.Icon;
          return (
            <div key={inv.id} className="bg-slate-900/40 rounded-lg p-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-white">
                    #{String(inv.id).padStart(4, '0')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    {TYPE_LABEL[inv.invoice_type] || inv.invoice_type}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.color} flex items-center gap-1`}>
                    <Icon className="w-2.5 h-2.5" />
                    {cfg.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(inv.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="text-sm font-bold text-emerald-300 shrink-0">
                ${Number(inv.total).toLocaleString('es-VE')}
              </div>
            </div>
          );
        })}
      </div>

      {invoices.length > 1 && (
        <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-xs">
          <span className="text-slate-400">Total mencionado</span>
          <span className="font-bold text-emerald-300">${total.toLocaleString('es-VE')}</span>
        </div>
      )}
    </div>
  );
}
