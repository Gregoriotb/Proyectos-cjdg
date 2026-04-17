import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Wrench, Send, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface CorporateService {
  id: number;
  pilar: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number | null;
  activo: boolean;
}

const PILAR_LABELS: Record<string, string> = {
  TECNOLOGIA: 'Tecnología',
  CLIMATIZACION: 'Climatización',
  ENERGIA: 'Energía',
  CIVIL: 'Ingeniería Civil',
};

const PILAR_COLORS: Record<string, string> = {
  TECNOLOGIA: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
  CLIMATIZACION: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30',
  ENERGIA: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
  CIVIL: 'from-orange-500/20 to-orange-600/5 border-orange-500/30',
};

const PILAR_ICONS: Record<string, string> = {
  TECNOLOGIA: '💻',
  CLIMATIZACION: '❄️',
  ENERGIA: '⚡',
  CIVIL: '🏗️',
};

const ServiceBrowser = () => {
  const [services, setServices] = useState<CorporateService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPilar, setSelectedPilar] = useState('');

  // Cotización modal
  const [quotingService, setQuotingService] = useState<CorporateService | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/corporate-services-public');
      setServices(res.data);
    } catch (e) {
      console.error('Error cargando servicios corporativos:', e);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestQuotation = async () => {
    if (!quotingService || !description.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      await api.post('/service-quotation', {
        service_catalog_id: quotingService.id,
        descripcion_requerimiento: description,
        notas_adicionales: notes || null,
      });
      setSubmitted(true);
      setTimeout(() => {
        setQuotingService(null);
        setDescription('');
        setNotes('');
        setSubmitted(false);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const pilares = ['TECNOLOGIA', 'CLIMATIZACION', 'ENERGIA', 'CIVIL'];
  const grouped = pilares.reduce<Record<string, CorporateService[]>>((acc, p) => {
    acc[p] = services.filter((s) => s.pilar === p);
    return acc;
  }, {});

  const visiblePilares = selectedPilar ? [selectedPilar] : pilares;

  return (
    <div className="space-y-6">
      {/* AI Collaboration Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-cjdg-border/30 border border-purple-500/30 p-6 sm:p-8">
        <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold mb-3 border border-purple-500/30">
              ✨ Nuevo Servicio Especial
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
              Plan de Automatización con IA
            </h2>
            <p className="text-cjdg-textMuted text-sm sm:text-base leading-relaxed">
              En colaboración exclusiva con <strong className="text-purple-300 font-medium">Artificialic.com</strong>, ofrecemos un plan integral para modernizar tu negocio. 
              Nos encargamos de la <span className="text-white">instalación</span> de herramientas de inteligencia artificial y brindamos <span className="text-white">capacitación</span> especializada para tu equipo.
            </p>
          </div>
          <button
            onClick={() => {
              setQuotingService({
                id: -1, // ID temporal para el backend
                pilar: 'TECNOLOGIA',
                nombre: 'Plan de Automatización con IA (Artificialic.com)',
                descripcion: 'Servicio integral de instalación y capacitación corporativa de Inteligencia Artificial.',
                precio_base: null,
                activo: true
              });
              setDescription('Me gustaría cotizar el plan de automatización con Inteligencia Artificial. Mis procesos a mejorar son: ');
            }}
            className="whitespace-nowrap flex-shrink-0 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Solicitar Plan
          </button>
        </div>
      </div>

      {/* Pilar filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedPilar('')}
          className={`py-1.5 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            !selectedPilar
              ? 'bg-cjdg-primary text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
              : 'bg-white/5 text-cjdg-textMuted hover:bg-white/10'
          }`}
        >
          Todos
        </button>
        {pilares.map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPilar(p)}
            className={`py-1.5 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              selectedPilar === p
                ? 'bg-cjdg-primary text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                : 'bg-white/5 text-cjdg-textMuted hover:bg-white/10'
            }`}
          >
            {PILAR_ICONS[p]} {PILAR_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cjdg-primary" />
        </div>
      ) : (
        visiblePilares.map((pilar) => {
          const pilarServices = grouped[pilar] || [];
          if (pilarServices.length === 0) return null;

          return (
            <div key={pilar}>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-xl">{PILAR_ICONS[pilar]}</span>
                {PILAR_LABELS[pilar]}
                <span className="text-xs text-cjdg-textMuted font-normal">({pilarServices.length} servicios)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {pilarServices.map((srv) => (
                  <div
                    key={srv.id}
                    className={`rounded-lg border bg-gradient-to-br p-5 flex flex-col ${PILAR_COLORS[pilar]}`}
                  >
                    <h3 className="text-white font-medium mb-1">{srv.nombre}</h3>
                    {srv.descripcion && (
                      <p className="text-xs text-cjdg-textMuted mb-4 line-clamp-2">{srv.descripcion}</p>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/10">
                      <div>
                        {srv.precio_base ? (
                          <span className="text-sm text-green-400 font-mono">
                            Desde ${Number(srv.precio_base).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-cjdg-textMuted italic">Requiere cotización</span>
                        )}
                      </div>
                      <button
                        onClick={() => setQuotingService(srv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cjdg-primary/20 text-cjdg-primary hover:bg-cjdg-primary hover:text-white rounded text-sm transition-all"
                      >
                        <Send className="w-3 h-3" /> Cotizar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Quotation Modal */}
      {quotingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !submitting && setQuotingService(null)} />
          <div className="relative w-full max-w-md glass-panel p-6 space-y-4">
            {submitted ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">¡Solicitud Enviada!</h3>
                <p className="text-sm text-cjdg-textMuted mt-1">Un ingeniero revisará tu requerimiento.</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white">Solicitar Cotización</h3>
                <p className="text-sm text-cjdg-textMuted">
                  Servicio: <strong className="text-white">{quotingService.nombre}</strong>
                </p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="text-sm text-cjdg-textMuted mb-1 block">Describe tu requerimiento *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    required
                    className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cjdg-primary resize-none"
                    placeholder="Ej: Necesitamos instalar CCTV en 3 sedes, con 12 cámaras cada una..."
                  />
                </div>

                <div>
                  <label className="text-sm text-cjdg-textMuted mb-1 block">Notas adicionales</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-cjdg-darker border border-cjdg-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cjdg-primary resize-none"
                    placeholder="Ubicación, plazos, presupuesto estimado..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setQuotingService(null)}
                    disabled={submitting}
                    className="flex-1 py-2 border border-cjdg-border rounded text-cjdg-textMuted hover:text-white transition-all text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRequestQuotation}
                    disabled={submitting || !description.trim()}
                    className="flex-1 py-2 btn-primary text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Enviar Solicitud'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBrowser;
