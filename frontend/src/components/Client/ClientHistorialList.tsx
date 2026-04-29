/**
 * SC-10 Cliente (FEAT-Historial-v2.4) — Vista cliente del historial.
 *
 * Solo lectura. Lista paginada de las transacciones archivadas del cliente
 * autenticado. Click en una abre el modal de detalle con timeline.
 */
import { useMemo, useState } from 'react';
import {
  Archive, FileText, MessageSquare, Eye, Loader2, ChevronLeft, ChevronRight, AlertCircle,
} from 'lucide-react';
import { useHistorial } from '../../hooks/useHistorial';
import { HistorialDetailModal } from '../Admin/HistorialPanel';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', PAID: 'Pagada', CANCELLED: 'Cancelada',
  OVERDUE: 'Vencida', SHIPPED: 'Enviada', DELIVERED: 'Entregada',
  DELETED_BY_CLIENT: 'Eliminada',
  closed: 'Cerrado', quoted: 'Cotizado', cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-orange-100 text-orange-700',
  DELETED_BY_CLIENT: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-100 text-gray-700',
  quoted: 'bg-blue-100 text-blue-700',
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(v: number | string | null | undefined) {
  if (v === null || v === undefined) return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return '—';
  return `$${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ClientHistorialList() {
  const { data, pagination, loading, error, filters, setFilters } = useHistorial('/cliente/historial');
  const [detailId, setDetailId] = useState<number | null>(null);

  const tipo = filters.tipo;
  const totalPages = pagination?.total_pages || 1;
  const currentPage = filters.page || 1;

  const summary = useMemo(() => {
    if (!pagination) return '';
    if (pagination.total === 0) return '';
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(start + pagination.limit - 1, pagination.total);
    return `${start}-${end} de ${pagination.total}`;
  }, [pagination]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-cj-text-primary flex items-center gap-2">
          <Archive className="w-5 h-5 text-cj-accent-blue" /> Mi Historial
        </h2>
        <p className="text-xs text-cj-text-muted mt-0.5">
          Tus transacciones archivadas (facturas pagadas/canceladas, cotizaciones cerradas).
        </p>
      </div>

      {/* Filtros tipo */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'invoice', 'quotation_thread'] as const).map((t) => {
          const active = (tipo || '') === t;
          const label = t === '' ? 'Todos' : t === 'invoice' ? 'Facturas' : 'Cotizaciones';
          return (
            <button
              key={t || 'all'}
              onClick={() => setFilters((f) => ({ ...f, tipo: (t || undefined) as any, page: 1 }))}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                active
                  ? 'bg-cj-accent-blue text-white border-cj-accent-blue'
                  : 'border-cj-border bg-cj-surface text-cj-text-secondary hover:bg-cj-bg-secondary'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="text-xs px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards en mobile, tabla en desktop */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-cj-text-muted">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-cj-text-muted bg-cj-surface border border-cj-border rounded-xl">
          <Archive className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aún no tienes transacciones archivadas.</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {data.map((item) => (
              <button
                key={item.id}
                onClick={() => setDetailId(item.id)}
                className="w-full text-left bg-cj-surface border border-cj-border rounded-lg p-3 hover:border-cj-accent-blue transition-all"
              >
                <div className="flex justify-between items-start gap-3 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-cj-text-muted">
                    {item.source_type === 'invoice' ? (
                      <FileText className="w-3.5 h-3.5 text-cj-accent-blue" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                    )}
                    <span className="font-mono">{item.numero_documento}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[item.status_at_archive] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[item.status_at_archive] || item.status_at_archive}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cj-text-primary font-medium">{formatMoney(item.total)}</span>
                  <span className="text-xs text-cj-text-muted">{formatDate(item.archived_at)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block bg-cj-surface border border-cj-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cj-bg-primary text-xs uppercase text-cj-text-muted">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold">Tipo</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Número</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Estado</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Total</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Items</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Archivado</th>
                  <th className="text-right px-3 py-2.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cj-border">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-cj-bg-primary transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs">
                        {item.source_type === 'invoice'
                          ? <FileText className="w-3.5 h-3.5 text-cj-accent-blue" />
                          : <MessageSquare className="w-3.5 h-3.5 text-purple-500" />}
                        {item.source_type === 'invoice' ? 'Factura' : 'Cotización'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{item.numero_documento}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${STATUS_COLORS[item.status_at_archive] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[item.status_at_archive] || item.status_at_archive}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{formatMoney(item.total)}</td>
                    <td className="px-3 py-2.5 text-cj-text-secondary">{item.items_count}</td>
                    <td className="px-3 py-2.5 text-cj-text-secondary text-xs">{formatDate(item.archived_at)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setDetailId(item.id)}
                        title="Ver detalle"
                        className="p-1.5 rounded text-cj-text-secondary hover:text-cj-accent-blue hover:bg-cj-bg-primary"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-cj-text-muted">{summary}</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                  className="p-1 rounded text-cj-text-secondary hover:bg-cj-bg-primary disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-cj-text-secondary">{currentPage} / {totalPages}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                  className="p-1 rounded text-cj-text-secondary hover:bg-cj-bg-primary disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <HistorialDetailModal
        historialId={detailId}
        isAdmin={false}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
