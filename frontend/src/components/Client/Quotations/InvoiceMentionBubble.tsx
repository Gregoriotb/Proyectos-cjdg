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
  PENDING:   { label: 'Pendiente', color: 'bg-yellow-50 text-yellow-700 border-yellow-200',   Icon: Clock },
  PAID:      { label: 'Pagada',    color: 'bg-green-50 text-green-700 border-green-200',      Icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200',            Icon: XCircle },
  OVERDUE:   { label: 'Vencida',   color: 'bg-orange-50 text-orange-700 border-orange-200',   Icon: AlertTriangle },
};

interface Props {
  invoices: InvoiceBriefData[];
  /** Si true, la burbuja se pinta con estilos para admin (bubble blue). Default: cliente (gris). */
  fromAdmin?: boolean;
}

export default function InvoiceMentionBubble({ invoices, fromAdmin = false }: Props) {
  if (!invoices || invoices.length === 0) return null;
  const total = invoices.reduce((acc, i) => acc + Number(i.total || 0), 0);

  // `fromAdmin` se usa en dos contextos opuestos:
  //  - En ClientChatView: fromAdmin=true cuando el admin envia (burbuja gris recibida);
  //    fromAdmin=false cuando el cliente envia (burbuja azul propia).
  //  - En AdminChatPanel: fromAdmin=true cuando el admin envia (burbuja azul propia);
  //    fromAdmin=false cuando el cliente envia (burbuja gris recibida).
  // Mantenemos el borde distintivo (verde esmeralda para mencion del cliente,
  // azul para mencion del admin) y usamos tarjetas internas semi-translucidas
  // que son legibles tanto sobre fondo azul como sobre fondo gris.
  const outerClasses = fromAdmin
    ? 'border-blue-300/50 bg-blue-500/10'
    : 'border-emerald-400/40 bg-emerald-500/10';

  const headerTextClass = fromAdmin ? 'text-white/90' : 'text-cj-text-primary';
  const footerLabelClass = fromAdmin ? 'text-white/80' : 'text-cj-text-secondary';
  const totalLabelClass = 'text-emerald-600';

  return (
    <div className={`rounded-xl border ${outerClasses} p-3 space-y-2`}>
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${headerTextClass}`}>
        <Receipt className="w-4 h-4" />
        {invoices.length} factura{invoices.length > 1 ? 's' : ''} referenciada{invoices.length > 1 ? 's' : ''}
      </div>

      <div className="space-y-1.5">
        {invoices.map((inv) => {
          const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PENDING;
          const Icon = cfg.Icon;
          return (
            <div key={inv.id} className="bg-white/70 backdrop-blur-sm rounded-lg p-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-cj-text-primary">
                    #{String(inv.id).padStart(4, '0')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-cj-text-secondary font-semibold">
                    {TYPE_LABEL[inv.invoice_type] || inv.invoice_type}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.color} flex items-center gap-1`}>
                    <Icon className="w-2.5 h-2.5" />
                    {cfg.label}
                  </span>
                </div>
                <div className="text-[11px] text-cj-text-secondary mt-0.5">
                  {new Date(inv.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="text-sm font-bold text-emerald-600 shrink-0">
                ${Number(inv.total).toLocaleString('es-VE')}
              </div>
            </div>
          );
        })}
      </div>

      {invoices.length > 1 && (
        <div className="flex items-center justify-between pt-1.5 border-t border-white/20 text-xs">
          <span className={footerLabelClass}>Total mencionado</span>
          <span className={`font-bold ${totalLabelClass}`}>${total.toLocaleString('es-VE')}</span>
        </div>
      )}
    </div>
  );
}
