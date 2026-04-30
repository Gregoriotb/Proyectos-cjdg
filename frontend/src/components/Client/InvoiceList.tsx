import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { formatApiError } from '../../services/errors';
import { Receipt, ChevronDown, ChevronUp, Package, Clock, CheckCircle, XCircle, Truck, AlertTriangle, Trash2 } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';

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
  PENDING: { label: 'Pendiente de Pago', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
  PAID: { label: 'Pagada', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  OVERDUE: { label: 'Vencida', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle },
};

const InvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const performDelete = async (invoiceId: number) => {
    setDeleteError(null);
    try {
      await api.delete(`/invoices/${invoiceId}`);
      // Remove de la lista localmente — el backend la archivó
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      if (expandedId === invoiceId) setExpandedId(null);
    } catch (err: any) {
      setDeleteError(formatApiError(err, 'No se pudo eliminar la factura.'));
      throw err; // mantener modal abierto si falla
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cj-accent-blue" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-cj-surface border border-cj-border border-dashed shadow-cj-sm rounded-lg p-12 text-center text-cj-text-muted">
        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <h3 className="text-lg font-medium text-cj-text-primary mb-1">Sin facturas</h3>
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
          <div key={inv.id} className="bg-cj-surface border border-cj-border shadow-cj-sm rounded-lg overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : inv.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-cj-bg-secondary transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  inv.status === 'PAID' ? 'bg-green-50' : inv.status === 'CANCELLED' ? 'bg-red-50' : 'bg-cj-accent-blue-light'
                }`}>
                  <StatusIcon className={`w-5 h-5 ${
                    inv.status === 'PAID' ? 'text-green-600' : inv.status === 'CANCELLED' ? 'text-red-600' : 'text-cj-accent-blue'
                  }`} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-cj-text-primary">
                    Factura #{inv.id.toString().padStart(4, '0')}
                  </p>
                  <p className="text-xs text-cj-text-secondary">
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
                <span className="text-cj-text-primary font-mono font-bold text-lg">
                  ${Number(inv.total).toFixed(2)}
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-cj-text-secondary" /> : <ChevronDown className="w-4 h-4 text-cj-text-secondary" />}
              </div>
            </button>

            {/* Detalle expandible */}
            {isExpanded && (
              <div className="border-t border-cj-border p-4 bg-cj-bg-secondary">
                {inv.notas && (
                  <p className="text-xs text-cj-text-secondary mb-3 italic border-l-2 border-cj-accent-blue/40 pl-3">{inv.notas}</p>
                )}
                <table className="w-full text-sm">
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
                        <td className="py-2 text-cj-text-primary flex items-center gap-2">
                          <Package className="w-3 h-3 text-cj-text-secondary" />
                          {item.descripcion}
                        </td>
                        <td className="py-2 text-center text-cj-text-secondary font-mono">{item.cantidad}</td>
                        <td className="py-2 text-right font-mono text-cj-text-secondary">${Number(item.precio_unitario).toFixed(2)}</td>
                        <td className="py-2 text-right font-mono text-cj-text-primary">${Number(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-3 text-right font-bold text-cj-text-secondary text-xs uppercase">Total</td>
                      <td className="pt-3 text-right font-mono font-bold text-cj-accent-blue text-lg">${Number(inv.total).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Estado info */}
                {inv.status === 'PENDING' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    Factura pendiente de pago. El método de pago será habilitado próximamente.
                  </div>
                )}
                {inv.status === 'PAID' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    Pago recibido. Tu pedido está siendo procesado por el equipo CJDG.
                  </div>
                )}

                {/* SC-05 (FEAT-Historial-v2.4): cliente puede borrar SOLO si está PENDING */}
                {inv.status === 'PENDING' && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(inv)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar factura
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal confirmación delete */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setDeleteError(null); }}
        onConfirm={async () => {
          if (confirmDelete) await performDelete(confirmDelete.id);
        }}
        title="Eliminar factura pendiente"
        description={confirmDelete ? `Factura #${confirmDelete.id.toString().padStart(4, '0')} · $${Number(confirmDelete.total).toFixed(2)}` : undefined}
        variant="destructive"
        confirmLabel="Eliminar factura"
      >
        <p>El stock reservado se devolverá al inventario y la factura quedará archivada en tu historial.</p>
        <p className="mt-2 text-xs text-cj-text-muted">Solo puedes eliminar facturas en estado <strong>Pendiente de Pago</strong>. Una vez confirmado el pago, ya no se pueden eliminar.</p>
        {deleteError && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{deleteError}</p>
        )}
      </ConfirmDialog>
    </div>
  );
};

export default InvoiceList;
