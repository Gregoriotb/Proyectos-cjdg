/**
 * SC-10 (FEAT-Historial-v2.4) — Hook para listar el historial.
 *
 * Sirve para Admin (basePath="/admin/historial") y Cliente (basePath="/cliente/historial").
 * Mismo response shape: { data, pagination }.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export interface HistorialUserBrief {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
}

export interface HistorialListItem {
  id: number;
  source_type: 'invoice' | 'quotation_thread';
  original_id: string;
  numero_documento: string;
  status_at_archive: string;
  total: string | number | null;
  archived_at: string;
  reactivated_at?: string | null;
  items_count: number;
  user?: HistorialUserBrief | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface HistorialFilters {
  tipo?: 'invoice' | 'quotation_thread';
  estado?: string;
  cliente_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_order?: 'asc' | 'desc';
}

interface Result {
  data: HistorialListItem[];
  pagination: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  filters: HistorialFilters;
  setFilters: (f: HistorialFilters | ((prev: HistorialFilters) => HistorialFilters)) => void;
  refetch: () => Promise<void>;
}

export function useHistorial(basePath: '/admin/historial' | '/cliente/historial', initial: HistorialFilters = {}): Result {
  const [data, setData] = useState<HistorialListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistorialFilters>({ page: 1, limit: 20, ...initial });

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params[k] = v;
      });
      const res = await api.get(basePath, { params });
      setData(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Error cargando historial');
    } finally {
      setLoading(false);
    }
  }, [basePath, filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, pagination, loading, error, filters, setFilters, refetch: fetch };
}
