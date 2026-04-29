/**
 * SC-10 (FEAT-Historial-v2.4) — Panel Admin del Historial de Transacciones.
 *
 * Tabla paginada con:
 *  - Filtros: tipo, estado, search por número/cliente
 *  - Acciones por fila: ver detalle, reactivar, borrar
 *  - Acciones globales: exportar Excel, bulk delete tras respaldo, sweep manual
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Archive, Download, Trash2, RefreshCw, ChevronLeft, ChevronRight, Search,
  FileText, MessageSquare, Eye, RotateCcw, Loader2, AlertCircle, Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { useHistorial, HistorialListItem } from '../../hooks/useHistorial';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';

type SourceType = 'invoice' | 'quotation_thread';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', PAID: 'Pagada', CANCELLED: 'Cancelada',
  OVERDUE: 'Vencida', SHIPPED: 'Enviada', DELIVERED: 'Entregada',
  DELETED_BY_CLIENT: 'Borrada por cliente',
  closed: 'Cerrado', quoted: 'Cotizado', cancelled: 'Cancelado',
  active: 'En proceso', pending: 'Pendiente', negotiating: 'Negociando',
};

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700 border-green-200',
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  OVERDUE: 'bg-orange-100 text-orange-700 border-orange-200',
  DELETED_BY_CLIENT: 'bg-gray-100 text-gray-600 border-gray-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
  quoted: 'bg-blue-100 text-blue-700 border-blue-200',
};

function statusBadge(status: string) {
  return STATUS_COLORS[status] || 'bg-gray-50 text-gray-600 border-gray-200';
}

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

export default function HistorialPanel() {
  const { data, pagination, loading, error, filters, setFilters, refetch } = useHistorial('/admin/historial');
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | { item: HistorialListItem; type: 'reactivar' | 'delete' }>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const totalPages = pagination?.total_pages || 1;
  const currentPage = filters.page || 1;
  const tipo = filters.tipo;

  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/historial/exportar/xlsx', {
        params: {
          tipo: filters.tipo,
          fecha_desde: filters.fecha_desde,
          fecha_hasta: filters.fecha_hasta,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dispo = res.headers['content-disposition'] || '';
      const m = /filename="([^"]+)"/.exec(dispo);
      a.download = m ? m[1] : 'historial.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      setFeedback('✅ Excel descargado.');
    } catch (err: any) {
      setFeedback(err?.response?.data?.detail?.message || 'Error al exportar.');
    } finally {
      setExporting(false);
    }
  };

  const sweep = async () => {
    setSweeping(true);
    try {
      const res = await api.post('/admin/maintenance/sweep-quotations');
      setFeedback(`✅ Sweep ejecutado. ${res.data?.archived || 0} cotizaciones archivadas.`);
      refetch();
    } catch (err: any) {
      setFeedback(err?.response?.data?.detail || 'Error al ejecutar sweep.');
    } finally {
      setSweeping(false);
    }
  };

  const reactivar = async (item: HistorialListItem) => {
    await api.post(`/admin/historial/${item.id}/reactivar`, {});
    setFeedback(`✅ ${item.numero_documento} reactivada.`);
    refetch();
  };

  const deleteOne = async (item: HistorialListItem) => {
    await api.delete(`/admin/historial/${item.id}`);
    setFeedback(`🗑 ${item.numero_documento} eliminada.`);
    refetch();
  };

  const bulkDelete = async () => {
    const params: Record<string, any> = { confirmado: true };
    if (filters.tipo) params.tipo = filters.tipo;
    const res = await api.delete('/admin/historial', { params });
    setFeedback(res.data?.message || 'Bulk delete ejecutado');
    refetch();
  };

  const summary = useMemo(() => {
    if (!pagination) return '';
    if (pagination.total === 0) return 'Sin registros';
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(start + pagination.limit - 1, pagination.total);
    return `Mostrando ${start}-${end} de ${pagination.total}`;
  }, [pagination]);

  return (
    <div className="space-y-4">
      {/* Header de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-cj-text-primary flex items-center gap-2">
            <Archive className="w-5 h-5 text-cj-accent-blue" /> Historial de Transacciones
          </h2>
          <p className="text-xs text-cj-text-muted mt-0.5">Facturas y cotizaciones archivadas. {summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={sweep}
            disabled={sweeping}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-cj-border text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-secondary disabled:opacity-50"
            title="Archiva cotizaciones cerradas hace más de 7 días"
          >
            {sweeping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Sweep 7d
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cj-accent-blue hover:bg-cj-accent-blue-dark text-white shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => setBulkDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Borrar todo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center p-3 bg-cj-bg-secondary rounded-lg border border-cj-border">
        <div className="flex gap-1">
          {(['', 'invoice', 'quotation_thread'] as const).map((t) => {
            const active = (tipo || '') === t;
            const label = t === '' ? 'Todos' : t === 'invoice' ? 'Facturas' : 'Cotizaciones';
            return (
              <button
                key={t || 'all'}
                onClick={() => setFilters((f) => ({ ...f, tipo: (t || undefined) as any, page: 1 }))}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  active
                    ? 'bg-cj-accent-blue text-white border-cj-accent-blue'
                    : 'border-cj-border text-cj-text-secondary hover:bg-cj-bg-primary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-w-[200px] flex gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cj-text-muted" />
            <input
              type="search"
              placeholder="Número o cliente..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              className="w-full pl-8 pr-2 py-1.5 text-sm bg-cj-bg-primary border border-cj-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cj-accent-blue"
            />
          </div>
          <button
            onClick={applySearch}
            className="px-3 py-1.5 text-xs rounded-lg border border-cj-border text-cj-text-secondary hover:bg-cj-bg-primary"
          >
            Buscar
          </button>
        </div>
        <button
          onClick={() => refetch()}
          title="Recargar"
          className="p-1.5 rounded-lg border border-cj-border text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-primary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {feedback && (
        <div className="text-xs px-3 py-2 bg-cj-accent-blue-light text-cj-accent-blue border border-cj-accent-blue/30 rounded-lg flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 hover:text-cj-accent-blue-dark">×</button>
        </div>
      )}

      {error && (
        <div className="text-xs px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla */}
      <div className="border border-cj-border rounded-lg overflow-hidden bg-cj-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cj-bg-primary text-xs uppercase text-cj-text-muted">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Tipo</th>
                <th className="text-left px-3 py-2.5 font-semibold">Número</th>
                <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-3 py-2.5 font-semibold">Estado</th>
                <th className="text-right px-3 py-2.5 font-semibold">Total</th>
                <th className="text-left px-3 py-2.5 font-semibold">Items</th>
                <th className="text-left px-3 py-2.5 font-semibold">Archivado</th>
                <th className="text-right px-3 py-2.5 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cj-border">
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-cj-text-muted">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Cargando...
                  </td>
                </tr>
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-cj-text-muted">
                    <Archive className="w-8 h-8 opacity-40 mx-auto mb-2" />
                    Sin transacciones archivadas con esos filtros
                  </td>
                </tr>
              )}
              {data.map((item) => {
                const isInvoice = item.source_type === 'invoice';
                return (
                  <tr key={item.id} className="hover:bg-cj-bg-primary transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs">
                        {isInvoice ? <FileText className="w-3.5 h-3.5 text-cj-accent-blue" /> : <MessageSquare className="w-3.5 h-3.5 text-purple-500" />}
                        {isInvoice ? 'Factura' : 'Cotización'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{item.numero_documento}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-cj-text-primary">{item.user?.full_name || '—'}</div>
                      <div className="text-[11px] text-cj-text-muted truncate max-w-[180px]">{item.user?.email || ''}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border ${statusBadge(item.status_at_archive)}`}>
                        {STATUS_LABELS[item.status_at_archive] || item.status_at_archive}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{formatMoney(item.total)}</td>
                    <td className="px-3 py-2.5 text-cj-text-secondary">{item.items_count}</td>
                    <td className="px-3 py-2.5 text-cj-text-secondary text-xs">{formatDate(item.archived_at)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          onClick={() => setDetailId(item.id)}
                          title="Ver detalle"
                          className="p-1.5 rounded text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-primary"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!item.reactivated_at && (
                          <button
                            onClick={() => setConfirmAction({ item, type: 'reactivar' })}
                            title="Reactivar"
                            className="p-1.5 rounded text-cj-text-secondary hover:text-cj-accent-blue hover:bg-cj-bg-primary"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmAction({ item, type: 'delete' })}
                          title="Borrar"
                          className="p-1.5 rounded text-cj-text-muted hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-cj-border text-xs">
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
      </div>

      {/* Modal de detalle */}
      <HistorialDetailModal
        historialId={detailId}
        isAdmin
        open={detailId !== null}
        onClose={() => setDetailId(null)}
      />

      {/* Confirmaciones de fila */}
      <ConfirmDialog
        open={confirmAction?.type === 'reactivar'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => reactivar(confirmAction!.item)}
        title="Reactivar transacción"
        description={confirmAction?.item.numero_documento}
        variant="warning"
        confirmLabel="Reactivar"
      >
        Esta acción restaura la transacción al estado activo. La entrada del historial se marca como reactivada para auditoría.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => deleteOne(confirmAction!.item)}
        title="Eliminar entrada del historial"
        description={confirmAction?.item.numero_documento}
        variant="destructive"
        confirmLabel="Eliminar"
      >
        Esta acción borra <strong>permanentemente</strong> esta entrada del historial. La transacción original no se ve afectada.
      </ConfirmDialog>

      {/* Bulk delete */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={bulkDelete}
        title="Borrar todo el historial"
        variant="destructive"
        confirmLabel="Borrar definitivamente"
      >
        <p>Vas a borrar <strong>todas las entradas del historial{filters.tipo ? ` de tipo ${filters.tipo === 'invoice' ? 'factura' : 'cotización'}` : ''}</strong>.</p>
        <p className="mt-2 text-xs text-cj-text-muted">Recomendado: exportar Excel antes de proceder. Esta acción es irreversible.</p>
      </ConfirmDialog>
    </div>
  );
}


// =========================================================
//   Modal de detalle (admin + cliente, depende de isAdmin)
// =========================================================
interface DetailProps {
  historialId: number | null;
  isAdmin: boolean;
  open: boolean;
  onClose: () => void;
}

export function HistorialDetailModal({ historialId, isAdmin, open, onClose }: DetailProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!historialId || !open) {
      setData(null);
      return;
    }
    const path = isAdmin ? `/admin/historial/${historialId}` : `/cliente/historial/${historialId}`;
    setLoading(true);
    api.get(path)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [historialId, isAdmin, open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data ? `${data.numero_documento}` : 'Detalle'}
      description={data ? (data.source_type === 'invoice' ? 'Factura archivada' : 'Cotización archivada') : undefined}
      size="lg"
    >
      {loading && (
        <div className="flex items-center justify-center py-8 text-cj-text-muted">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando detalle...
        </div>
      )}
      {!loading && data && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase text-cj-text-muted">Estado</p>
              <p className="font-medium">{STATUS_LABELS[data.status_at_archive] || data.status_at_archive}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-cj-text-muted">Total</p>
              <p className="font-medium">{formatMoney(data.total)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-cj-text-muted">Cliente</p>
              <p className="font-medium">{data.user?.full_name || '—'}</p>
              <p className="text-xs text-cj-text-muted">{data.user?.email || ''}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-cj-text-muted">Archivado</p>
              <p className="font-medium">{formatDate(data.archived_at)}</p>
            </div>
          </div>

          {data.items?.length > 0 && (
            <div className="border-t border-cj-border pt-3">
              <p className="text-[10px] uppercase text-cj-text-muted mb-2">Items</p>
              <ul className="space-y-1">
                {data.items.map((it: any) => (
                  <li key={it.id} className="text-xs flex justify-between gap-2 border-b border-cj-border/50 pb-1">
                    <span className="truncate">{it.descripcion} <span className="text-cj-text-muted">x{it.cantidad}</span></span>
                    <span className="text-cj-text-secondary shrink-0">{formatMoney(it.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.snapshot?.timeline && (
            <div className="border-t border-cj-border pt-3">
              <p className="text-[10px] uppercase text-cj-text-muted mb-2">Timeline</p>
              <ul className="space-y-1.5 text-xs">
                {data.snapshot.timeline.map((t: any, idx: number) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-medium">{t.estado}</span>
                    <span className="text-cj-text-muted">— {t.descripcion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
