import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../services/api';
import { X, Receipt, Check, Clock, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';

export interface InvoiceLite {
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
  open: boolean;
  /** Si está presente, usamos endpoint admin `/invoices/all?user_id=` */
  clientIdForAdmin?: string;
  onClose: () => void;
  onConfirm: (invoiceIds: number[]) => void;
}

export default function InvoiceSelectorModal({ open, clientIdForAdmin, onClose, onConfirm }: Props) {
  const [invoices, setInvoices] = useState<InvoiceLite[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setLoading(true);
    const url = clientIdForAdmin ? `/invoices/all` : `/invoices`;
    const params = clientIdForAdmin ? { user_id: clientIdForAdmin } : {};
    api
      .get(url, { params })
      .then((res) => setInvoices(res.data))
      .catch((e) => { console.error(e); setInvoices([]); })
      .finally(() => setLoading(false));
  }, [open, clientIdForAdmin]);

  const { groups, totalSelected } = useMemo(() => {
    const g: Record<string, InvoiceLite[]> = { PENDING: [], OVERDUE: [], PAID: [], CANCELLED: [] };
    (invoices || []).forEach((inv) => {
      const bucket = g[inv.status] ? inv.status : 'PENDING';
      g[bucket].push(inv);
    });
    const total = (invoices || [])
      .filter((i) => selected.has(i.id))
      .reduce((acc, i) => acc + Number(i.total || 0), 0);
    return { groups: g, totalSelected: total };
  }, [invoices, selected]);

  if (!open) return null;

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected).sort((a, b) => a - b));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            Adjuntar facturas
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400" />
            </div>
          )}

          {!loading && invoices !== null && invoices.length === 0 && (
            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-700 rounded-lg">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No hay facturas para mostrar.</p>
            </div>
          )}

          {!loading && invoices !== null && invoices.length > 0 && (
            <>
              {(['PENDING', 'OVERDUE', 'PAID', 'CANCELLED'] as const).map((key) => {
                const list = groups[key] || [];
                if (list.length === 0) return null;
                const cfg = STATUS_CONFIG[key];
                return (
                  <div key={key}>
                    <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                      {cfg.label} · {list.length}
                    </h3>
                    <div className="space-y-2">
                      {list.map((inv) => {
                        const Icon = cfg.Icon;
                        const isOn = selected.has(inv.id);
                        return (
                          <button
                            key={inv.id}
                            type="button"
                            onClick={() => toggle(inv.id)}
                            className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all ${
                              isOn
                                ? 'bg-emerald-500/10 border-emerald-500/40'
                                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                              isOn ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                            }`}>
                              {isOn && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-mono font-bold text-white">
                                  #{String(inv.id).padStart(4, '0')}
                                </span>
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.color} flex items-center gap-1`}>
                                  <Icon className="w-3 h-3" />
                                  {cfg.label}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                  {TYPE_LABEL[inv.invoice_type] || inv.invoice_type}
                                </span>
                              </div>
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs text-slate-400 truncate">
                                  {new Date(inv.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-sm font-bold text-emerald-300 shrink-0">
                                  ${Number(inv.total).toLocaleString('es-VE')}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 flex items-center justify-between gap-3 bg-slate-900/80">
          <div className="text-xs text-slate-400">
            <span className="font-bold text-white">{selected.size}</span> seleccionada{selected.size === 1 ? '' : 's'}
            {selected.size > 0 && (
              <span className="ml-2">· Total <span className="text-emerald-300 font-bold">${totalSelected.toLocaleString('es-VE')}</span></span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirm}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium transition-colors"
            >
              Adjuntar ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
