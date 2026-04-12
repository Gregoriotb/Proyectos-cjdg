import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { FileText, Clock, CheckCircle, XCircle, Search as SearchIcon } from 'lucide-react';

interface Quotation {
  id: number;
  user_id: string;
  status: string;
  notas_cliente: string | null;
  created_at: string;
  updated_at: string;
  items: any[];
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  reviewing: { label: 'En Revisión', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  approved: { label: 'Aprobada', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  rejected: { label: 'Rechazada', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const QuotationsHistory = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations');
      setQuotations(res.data);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
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

  if (quotations.length === 0) {
    return (
      <div className="glass-panel p-12 text-center text-cjdg-textMuted">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <h3 className="text-lg font-medium text-white mb-1">Sin cotizaciones</h3>
        <p className="text-sm">Aún no has solicitado ninguna cotización.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs font-mono uppercase tracking-widest text-cjdg-textMuted">
                <th className="py-3 px-4 font-medium"># ID</th>
                <th className="py-3 px-4 font-medium">Fecha</th>
                <th className="py-3 px-4 font-medium">Estado</th>
                <th className="py-3 px-4 font-medium">Items</th>
                <th className="py-3 px-4 font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => {
                const statusInfo = STATUS_STYLES[q.status] || STATUS_STYLES.pending;
                return (
                  <tr key={q.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-sm text-white">#{q.id.toString().padStart(4, '0')}</td>
                    <td className="py-3 px-4 text-sm text-cjdg-textMuted">
                      {new Date(q.created_at).toLocaleDateString('es-VE', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-cjdg-textMuted">
                      {q.items.length} item(s)
                    </td>
                    <td className="py-3 px-4 text-xs text-cjdg-textMuted max-w-xs truncate">
                      {q.notas_cliente || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuotationsHistory;
