import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../services/api';
import AdminChatPanel from './AdminChatPanel';
import {
  MessageSquare, Clock, AlertCircle, Filter, ChevronRight,
  User, Building2, DollarSign, Bell, MapPin,
} from 'lucide-react';

interface ClientSummary {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface LeadThread {
  id: string;
  client_id: string;
  service_name: string;
  company_name?: string;
  status: string;
  budget_estimate?: number | string;
  location_notes?: string;
  last_message_preview?: string;
  last_message_time?: string;
  admin_unread: number;
  client_unread: number;
  created_at: string;
  client?: ClientSummary;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', active: 'En Proceso', quoted: 'Cotizado',
  negotiating: 'Negociando', closed: 'Cerrado', cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  quoted: 'bg-green-50 text-green-700 border-green-200',
  negotiating: 'bg-purple-50 text-purple-700 border-purple-200',
  closed: 'bg-gray-50 text-gray-700 border-gray-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

function clientDisplayName(c?: ClientSummary): string {
  if (!c) return 'Cliente';
  const composed = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return composed || c.full_name || c.email || 'Cliente';
}

export default function QuotationsPanel() {
  const [threads, setThreads] = useState<LeadThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { status_filter: filter } : {};
      const res = await api.get('/chat-quotations/admin/threads', { params });
      setThreads(res.data);
    } catch (e) {
      console.error('Error cargando cotizaciones:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 10000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  if (selectedThread) {
    return (
      <AdminChatPanel
        threadId={selectedThread}
        onBack={() => setSelectedThread(null)}
        onStatusChange={loadThreads}
      />
    );
  }

  const totalUnread = threads.reduce((acc, t) => acc + (t.admin_unread || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-cj-text-primary flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-cj-accent-blue" />
          Cotizaciones Entrantes
          {totalUnread > 0 && (
            <span className="bg-cj-danger text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
              <Bell className="w-3 h-3" />
              {totalUnread} sin leer
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cj-text-muted" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-cj-bg-primary border border-cj-border text-sm text-cj-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light"
          >
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="active">En Proceso</option>
            <option value="quoted">Cotizadas</option>
            <option value="negotiating">Negociando</option>
            <option value="closed">Cerradas</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-cj-text-secondary">
          Cargando cotizaciones...
        </div>
      ) : (
        <div className="grid gap-3">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedThread(thread.id)}
              className="group text-left bg-cj-surface border border-cj-border hover:border-cj-accent-blue rounded-xl p-5 transition-all shadow-cj-sm hover:shadow-cj-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-cj-accent-blue-light flex items-center justify-center text-cj-accent-blue shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-cj-text-primary font-medium truncate group-hover:text-cj-accent-blue transition-colors">
                      {clientDisplayName(thread.client)}
                    </h3>
                    <p className="text-sm text-cj-text-secondary flex items-center gap-2 truncate">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {thread.company_name || 'Sin empresa'} · {thread.service_name}
                    </p>
                  </div>
                  {thread.admin_unread > 0 && (
                    <span className="bg-cj-danger text-white text-[10px] font-bold px-2 py-1 rounded-full shrink-0 animate-pulse">
                      {thread.admin_unread} nuevo{thread.admin_unread > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-cj-text-muted group-hover:text-cj-accent-blue group-hover:translate-x-1 transition-all shrink-0" />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-cj-text-secondary mb-3">
                {thread.budget_estimate != null && (
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <DollarSign className="w-3.5 h-3.5" />
                    ${Number(thread.budget_estimate).toLocaleString('es-VE')}
                  </span>
                )}
                {thread.location_notes && (
                  <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{thread.location_notes}</span>
                  </span>
                )}
                {thread.last_message_time && (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(thread.last_message_time).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[thread.status]} shrink-0`}>
                  {STATUS_LABELS[thread.status] || thread.status}
                </span>
              </div>

              {thread.last_message_preview && (
                <p className="text-sm text-cj-text-secondary line-clamp-1 bg-cj-bg-secondary p-2 rounded-lg">
                  "{thread.last_message_preview}…"
                </p>
              )}
            </button>
          ))}

          {threads.length === 0 && (
            <div className="text-center py-20 text-cj-text-muted border border-dashed border-cj-border rounded-xl bg-cj-surface">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No hay cotizaciones {filter !== 'all' ? 'en este estado' : ''}</p>
              <p className="text-sm mt-2">Las solicitudes de los clientes aparecerán aquí.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
