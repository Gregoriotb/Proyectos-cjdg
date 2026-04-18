import React, { useState, useEffect, useCallback } from 'react';
import { api, getImageUrl } from '../../services/api';
import { Search, Box, RefreshCw, Edit2, X, Check } from 'lucide-react';

interface Service {
  id: number;
  nombre: string;
  marca: string | null;
  codigo_modelo: string | null;
  categoria: string;
  pilar_id: string;
  description: string | null;
  specs: Record<string, string> | null;
  image_url: string | null;
}

// Los pilares del brochure (servicios ofrecidos, NO productos físicos)
const BROCHURE_PILARES = ['tecnologia', 'climatizacion', 'energia', 'ingenieria_civil'];

const PILAR_COLORS: Record<string, string> = {
  tecnologia:       'bg-blue-50 text-blue-700 border-blue-200',
  climatizacion:    'bg-cyan-50 text-cyan-700 border-cyan-200',
  energia:          'bg-yellow-50 text-yellow-700 border-yellow-200',
  ingenieria_civil: 'bg-orange-50 text-orange-700 border-orange-200',
};

const PILAR_LABELS: Record<string, string> = {
  tecnologia:       'Tecnología',
  climatizacion:    'Climatización',
  energia:          'Energía',
  ingenieria_civil: 'Ingeniería Civil',
};

const ServiceCard = ({ service, onSaved }: { service: Service; onSaved: () => void }) => {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(service.description ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/services/${service.id}`, { description: desc });
      onSaved();
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const colorClass = PILAR_COLORS[service.pilar_id] ?? 'bg-cj-bg-secondary text-cj-text-secondary border-cj-border';

  return (
    <div className="glass-panel p-5 group relative flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-lg bg-cj-accent-blue-light border border-blue-200 flex items-center justify-center flex-shrink-0">
          <Box className="w-5 h-5 text-cj-accent-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-cj-text-primary leading-tight">{service.nombre}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded border ${colorClass}`}>
            {PILAR_LABELS[service.pilar_id] ?? service.pilar_id} · {service.categoria}
          </span>
        </div>
        <div className="flex gap-1 ml-1">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-tertiary transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={save} disabled={saving} className="p-1.5 rounded text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50">
                <Check className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="p-1.5 rounded text-cj-text-secondary hover:text-cj-accent-blue hover:bg-cj-accent-blue-light transition-colors opacity-0 group-hover:opacity-100">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Descripción */}
      {editing ? (
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={3}
          className="w-full bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-cj-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue resize-none"
          placeholder="Descripción del servicio..."
        />
      ) : (
        service.description
          ? <p className="text-xs text-cj-text-secondary line-clamp-3">{service.description}</p>
          : <p className="text-xs text-cj-text-muted italic">Sin descripción — haz clic en ✏ para agregar una.</p>
      )}
    </div>
  );
};

const ServicesPanel = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pilarFilter, setPilarFilter] = useState('');

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      // Cargamos de a pestaña por pilar para obtener solo servicios del brochure
      const results = await Promise.all(
        BROCHURE_PILARES.map(p =>
          api.get(`/admin/services?pilar_id=${p}&limit=200`).then(r => r.data as Service[])
        )
      );
      const all = results.flat();
      setServices(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filtered = services.filter(s => {
    // Solo servicios del brochure (sin marca / sin código modelo)
    const isBrochure = !s.marca && !s.codigo_modelo;
    const matchSearch = !search || s.nombre.toLowerCase().includes(search.toLowerCase());
    const matchPilar = !pilarFilter || s.pilar_id === pilarFilter;
    return isBrochure && matchSearch && matchPilar;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cj-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-cj-bg-primary border border-cj-border rounded text-cj-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
              placeholder="Buscar servicio..."
            />
          </div>
          <select
            value={pilarFilter}
            onChange={e => setPilarFilter(e.target.value)}
            className="bg-cj-bg-primary border border-cj-border rounded px-3 py-2 text-sm text-cj-text-primary focus:outline-none focus:ring-1 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue"
          >
            <option value="">Todos los pilares</option>
            {BROCHURE_PILARES.map(p => (
              <option key={p} value={p}>{PILAR_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-cj-text-secondary">{filtered.length} servicios</span>
          <button onClick={fetchServices} className="p-2 rounded hover:bg-cj-bg-tertiary text-cj-text-secondary hover:text-cj-accent-blue transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel p-5 h-28 animate-pulse bg-cj-bg-tertiary" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center text-cj-text-muted">
          <Box className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No se encontraron servicios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map(s => (
            <ServiceCard key={s.id} service={s} onSaved={fetchServices} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesPanel;
