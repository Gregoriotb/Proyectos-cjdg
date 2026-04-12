import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Receipt, ChevronDown, ChevronUp, Package, Clock, CheckCircle, XCircle, Truck, AlertTriangle } from 'lucide-react';

interface Invoice {
  id: number;
  invoice_type: string;
  status: string;
  total: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  items: { id: number; descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  PRODUCT_SALE: 'Compra de Producto',
  SERVICE_QUOTATION: 'Servicio Cotizado',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pendiente de Pago', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: Clock },
  PAID: { label: 'Pagada', color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle },
  OVERDUE: { label: 'Vencida', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: AlertTriangle },
};

const InvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data);
    } catch (error) {
      console.error('Error cargando facturas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cjdg-primary" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="glass-panel p-12 text-center text-cjdg-textMuted">
        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <h3 className="text-lg font-medium text-white mb-1">Sin facturas</h3>
        <p className="text-sm">Cuando realices una compra, tus facturas aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const statusInfo = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PENDING;
        const StatusIcon = statusInfo.icon;
        const isExpanded = expandedId === inv.id;

        return (
          <div key={inv.id} className="glass-panel overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : inv.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  inv.status === 'PAID' ? 'bg-green-500/10' : inv.status === 'CANCELLED' ? 'bg-red-500/10' : 'bg-cjdg-primary/10'
                }`}>
                  <StatusIcon className={`w-5 h-5 ${
                    inv.status === 'PAID' ? 'text-green-400' : inv.status === 'CANCELLED' ? 'text-red-400' : 'text-cjdg-primary'
                  }`} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">
                    Factura #{inv.id.toString().padStart(4, '0')}
                  </p>
                  <p className="text-xs text-cjdg-textMuted">
                    {new Date(inv.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {' · '}{TYPE_LABELS[inv.invoice_type] || inv.invoice_type}
                    {' · '}{inv.items.length} item(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2.5 py-1 text-xs rounded border ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                <span className="text-white font-mono font-bold text-lg">
                  ${Number(inv.total).toFixed(2)}
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-cjdg-textMuted" /> : <ChevronDown className="w-4 h-4 text-cjdg-textMuted" />}
              </div>
            </button>

            {/* Detalle expandible */}
            {isExpanded && (
              <div className="border-t border-white/5 p-4 bg-cjdg-darker/30">
                {inv.notas && (
                  <p className="text-xs text-cjdg-textMuted mb-3 italic border-l-2 border-cjdg-primary/30 pl-3">{inv.notas}</p>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-cjdg-textMuted border-b border-white/5">
                      <th className="text-left py-2">Producto</th>
                      <th className="text-center py-2">Cant.</th>
                      <th className="text-right py-2">P. Unit.</th>
                      <th className="text-right py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((item) => (
                      <tr key={item.id} className="border-b border-white/5">
                        <td className="py-2 text-white flex items-center gap-2">
                          <Package className="w-3 h-3 text-cjdg-textMuted" />
                          {item.descripcion}
                        </td>
                        <td className="py-2 text-center text-cjdg-textMuted font-mono">{item.cantidad}</td>
                        <td className="py-2 text-right font-mono text-cjdg-textMuted">${Number(item.precio_unitario).toFixed(2)}</td>
                        <td className="py-2 text-right font-mono text-white">${Number(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-3 text-right font-bold text-cjdg-textMuted text-xs uppercase">Total</td>
                      <td className="pt-3 text-right font-mono font-bold text-cjdg-accent text-lg">${Number(inv.total).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Estado info */}
                {inv.status === 'PENDING' && (
                  <div className="mt-4 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-sm text-yellow-300">
                    Factura pendiente de pago. El método de pago será habilitado próximamente.
                  </div>
                )}
                {inv.status === 'PAID' && (
                  <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-sm text-green-300">
                    Pago recibido. Tu pedido está siendo procesado por el equipo CJDG.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InvoiceList;
