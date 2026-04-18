import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Receipt, RefreshCw, ChevronDown, ChevronUp, Package, Search } from 'lucide-react';

interface InvoiceItem {
  id: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Invoice {
  id: number;
  user_id: string;
  invoice_type: string;
  status: string;
  total: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  items: InvoiceItem[];
}

const STATUSES = ['PENDING', 'PAID', 'CANCELLED', 'OVERDUE'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  PAID: { label: 'Pagada', color: 'bg-green-50 text-green-700 border-green-200' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200' },
  OVERDUE: { label: 'Vencida', color: 'bg-orange-50 text-orange-700 border-orange-200' },
};

const TYPE_LABELS: Record<string, string> = {
  PRODUCT_SALE: 'Producto',
  SERVICE_QUOTATION: 'Servicio',
};

const InvoicesPanel = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices/all');
      setInvoices(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleStatusChange = async (invoiceId: number, newStatus: string) => {
    setUpdatingId(invoiceId);
    try {
      await api.put(`/invoices/${invoiceId}/status`, { status: newStatus });
      // Actualizar local
      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId ? { ...inv, status: newStatus } : inv
      ));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = invoices.filter(inv => !statusFilter || inv.status === statusFilter);

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'PENDING').length,
    paid: invoices.filter(i => i.status === 'PAID').length,
    revenue: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + Number(i.total), 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <p className="text-xs text-cj-text-secondary uppercase">Total Facturas</p>
          <p className="text-2xl font-mono font-bold text-cj-text-primary">{stats.total}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-yellow-700 uppercase">Pendientes</p>
          <p className="text-2xl font-mono font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-green-700 uppercase">Pagadas</p>
          <p className="text-2xl font-mono font-bold text-green-700">{stats.paid}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-cj-accent-blue uppercase">Ingresos</p>
          <p className="text-2xl font-mono font-bold text-cj-accent-blue">${stats.revenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('')}
            className={`py-1.5 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              !statusFilter ? 'bg-cj-accent-blue text-white' : 'bg-cj-bg-secondary text-cj-text-secondary hover:bg-cj-bg-tertiary'
            }`}
          >
            Todas ({invoices.length})
          </button>
          {STATUSES.map(s => {
            const count = invoices.filter(i => i.status === s).length;
            if (count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`py-1.5 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  statusFilter === s ? 'bg-cj-accent-blue text-white' : 'bg-cj-bg-secondary text-cj-text-secondary hover:bg-cj-bg-tertiary'
                }`}
              >
                {STATUS_CONFIG[s].label} ({count})
              </button>
            );
          })}
        </div>
        <button onClick={fetchInvoices} className="p-2 rounded hover:bg-cj-bg-tertiary text-cj-text-secondary hover:text-cj-accent-blue transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="glass-panel p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cj-accent-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center text-cj-text-muted">
          <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay facturas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const statusInfo = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PENDING;
            const isExpanded = expandedId === inv.id;

            return (
              <div key={inv.id} className="glass-panel overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-cj-bg-primary transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-cj-accent-blue-light flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-cj-accent-blue" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-cj-text-primary">
                        Factura #{inv.id.toString().padStart(4, '0')}
                      </p>
                      <p className="text-xs text-cj-text-secondary">
                        {new Date(inv.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{TYPE_LABELS[inv.invoice_type] || inv.invoice_type}
                        {' · '}{inv.items.length} item(s)
                        {' · '}Cliente: {inv.user_id.split('-')[0]}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 text-xs rounded border ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <span className="text-cj-text-primary font-mono font-bold">${Number(inv.total).toFixed(2)}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-cj-text-secondary" /> : <ChevronDown className="w-4 h-4 text-cj-text-secondary" />}
                  </div>
                </button>

                {/* Detalle */}
                {isExpanded && (
                  <div className="border-t border-cj-border p-4 bg-cj-bg-primary">
                    {inv.notas && (
                      <p className="text-xs text-cj-text-secondary mb-3 italic border-l-2 border-cj-accent-blue/30 pl-3">{inv.notas}</p>
                    )}

                    {/* Items */}
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="text-xs text-cj-text-secondary border-b border-cj-border">
                          <th className="text-left py-2">Producto</th>
                          <th className="text-center py-2">Cant.</th>
                          <th className="text-right py-2">P. Unit.</th>
                          <th className="text-right py-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((item) => (
                          <tr key={item.id} className="border-b border-cj-border">
                            <td className="py-2 text-cj-text-primary">{item.descripcion}</td>
                            <td className="py-2 text-center text-cj-text-secondary font-mono">{item.cantidad}</td>
                            <td className="py-2 text-right font-mono text-cj-text-secondary">${Number(item.precio_unitario).toFixed(2)}</td>
                            <td className="py-2 text-right font-mono text-cj-text-primary">${Number(item.subtotal).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="pt-3 text-right font-bold text-cj-text-secondary text-xs uppercase">Total</td>
                          <td className="pt-3 text-right font-mono font-bold text-cj-accent-blue">${Number(inv.total).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Cambiar estado */}
                    <div className="flex items-center gap-3 pt-3 border-t border-cj-border">
                      <span className="text-xs text-cj-text-secondary">Cambiar estado:</span>
                      {STATUSES.map(s => {
                        if (s === inv.status) return null;
                        const cfg = STATUS_CONFIG[s];
                        return (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(inv.id, s)}
                            disabled={updatingId === inv.id}
                            className={`px-3 py-1 text-xs rounded border transition-all hover:opacity-80 disabled:opacity-50 ${cfg.color}`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvoicesPanel;
