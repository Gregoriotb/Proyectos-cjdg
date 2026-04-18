import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Wrench, Send, AlertCircle, CheckCircle2, Loader2, Sparkles, Crown, ArrowRight } from 'lucide-react';

interface CorporateService {
  id: number;
  pilar: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number | null;
  activo: boolean;
  is_special: boolean;
  image_urls: string[] | null;
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

  // Cotización modal — V2.1: crea hilo de chat-cotización
  const [quotingService, setQuotingService] = useState<CorporateService | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [budget, setBudget] = useState('');
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
    if (!quotingService || description.trim().length < 10) {
      setError('Describe tu requerimiento con al menos 10 caracteres.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const parsedBudget = budget ? Number(budget.replace(/[^0-9.]/g, '')) : null;
      await api.post('/chat-quotations/threads', {
        service_id: quotingService.id,
        service_name: quotingService.nombre,
        requirements: description.trim(),
        location_notes: notes.trim() || null,
        budget_estimate: parsedBudget && parsedBudget > 0 ? parsedBudget : null,
      });
      setSubmitted(true);
      setTimeout(() => {
        setQuotingService(null);
        setDescription('');
        setNotes('');
        setBudget('');
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
  const specialService = services.find(s => s.is_special);

  return (
    <div className="space-y-6">
      {/* Special Service Hero — destacado premium */}
      {specialService && (
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/40 shadow-[0_0_40px_rgba(147,51,234,0.25)]">
          {/* Fondo con gradiente animado */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 animate-gradient bg-[length:200%_200%]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-fuchsia-500/10 to-cyan-400/10" />

          {/* Orbes decorativos con blur */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-fuchsia-500/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-cyan-400/30 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-purple-400/30 rounded-full blur-3xl pointer-events-none" />

          {/* Chispitas decorativas */}
          <Sparkles className="absolute top-6 left-1/4 w-4 h-4 text-yellow-300/70 animate-pulse" style={{ animationDelay: '0.3s' }} />
          <Sparkles className="absolute bottom-10 right-1/3 w-5 h-5 text-pink-300/70 animate-pulse" style={{ animationDelay: '0.8s' }} />
          <Sparkles className="absolute top-1/3 right-10 w-3 h-3 text-cyan-300/70 animate-pulse" style={{ animationDelay: '1.2s' }} />

          <div className="relative z-10 p-8 sm:p-12 lg:p-14">
            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-12 items-center">
              {/* Columna izquierda: contenido */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400/90 to-amber-500/90 text-purple-950 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg mb-5">
                  <Crown className="w-4 h-4" />
                  Servicio Premium Destacado
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-white via-pink-100 to-cyan-100 bg-clip-text text-transparent">
                    {specialService.nombre}
                  </span>
                </h2>

                <p className="text-purple-100/90 text-base sm:text-lg leading-relaxed mb-6 max-w-xl">
                  {specialService.descripcion || 'Servicio de alta especialidad corporativa diseñado para potenciar tu operación.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-7">
                  {specialService.precio_base != null && (
                    <div className="flex items-baseline gap-2 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                      <span className="text-xs text-purple-200 uppercase tracking-wider">Desde</span>
                      <span className="text-2xl font-bold text-white">
                        ${Number(specialService.precio_base).toLocaleString('es-VE')}
                      </span>
                    </div>
                  )}
                  <div className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-sm text-white font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    Personalizado
                  </div>
                </div>

                <button
                  onClick={() => {
                    setQuotingService(specialService);
                    setDescription(`Me gustaría cotizar el servicio especial: ${specialService.nombre}. Mis procesos a mejorar son: `);
                  }}
                  className="group inline-flex items-center gap-3 px-7 py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-purple-950 font-bold text-base shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:shadow-[0_0_40px_rgba(251,191,36,0.8)] transition-all active:scale-95"
                >
                  <Send className="w-5 h-5" />
                  Solicitar Cotización
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {/* Columna derecha: imagen del servicio */}
              {specialService.image_urls && specialService.image_urls.length > 0 && (
                <div className="relative hidden lg:block">
                  <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 to-cyan-400 rounded-2xl blur-xl opacity-50 animate-pulse" />
                  <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl aspect-[4/3]">
                    <img
                      src={specialService.image_urls[0]}
                      alt={specialService.nombre}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pilar filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedPilar('')}
          className={`py-1.5 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            !selectedPilar
              ? 'bg-cj-accent-blue text-white shadow-cj-md'
              : 'bg-cj-bg-secondary text-cj-text-secondary hover:bg-cj-bg-tertiary hover:text-cj-text-primary'
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
                ? 'bg-cj-accent-blue text-white shadow-cj-md'
                : 'bg-cj-bg-secondary text-cj-text-secondary hover:bg-cj-bg-tertiary hover:text-cj-text-primary'
            }`}
          >
            {PILAR_ICONS[p]} {PILAR_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cj-accent-blue" />
        </div>
      ) : (
        visiblePilares.map((pilar) => {
          const pilarServices = grouped[pilar] || [];
          if (pilarServices.length === 0) return null;

          return (
            <div key={pilar}>
              <h2 className="text-lg font-bold text-cj-text-primary mb-4 flex items-center gap-2">
                <span className="text-xl">{PILAR_ICONS[pilar]}</span>
                {PILAR_LABELS[pilar]}
                <span className="text-xs text-cj-text-secondary font-normal">({pilarServices.length} servicios)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {pilarServices.map((srv) => (
                  <div
                    key={srv.id}
                    className={`rounded-lg border bg-gradient-to-br p-5 flex flex-col shadow-cj-sm ${PILAR_COLORS[pilar]}`}
                  >
                    <h3 className="text-cj-text-primary font-medium mb-1">{srv.nombre}</h3>
                    {srv.descripcion && (
                      <p className="text-xs text-cj-text-secondary mb-4 line-clamp-2">{srv.descripcion}</p>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-cj-border">
                      <div>
                        {srv.precio_base ? (
                          <span className="text-sm text-green-700 font-mono">
                            Desde ${Number(srv.precio_base).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-cj-text-muted italic">Requiere cotización</span>
                        )}
                      </div>
                      <button
                        onClick={() => setQuotingService(srv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cj-accent-blue-light text-cj-accent-blue hover:bg-cj-accent-blue hover:text-white rounded text-sm transition-all"
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
          <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setQuotingService(null)} />
          <div className="relative w-full max-w-md bg-cj-surface border border-cj-border shadow-cj-lg rounded-lg p-6 space-y-4">
            {submitted ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-cj-text-primary">¡Solicitud Enviada!</h3>
                <p className="text-sm text-cj-text-secondary mt-1">
                  Puedes seguir la conversación en la sección "Cotizaciones".
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-cj-text-primary">Solicitar Cotización</h3>
                <p className="text-sm text-cj-text-secondary">
                  Servicio: <strong className="text-cj-text-primary">{quotingService.nombre}</strong>
                </p>

                {quotingService.image_urls && quotingService.image_urls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {quotingService.image_urls.map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded border border-cj-border overflow-hidden flex-shrink-0">
                        <img src={url} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="text-sm text-cj-text-secondary mb-1 block">Describe tu requerimiento *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    required
                    className="w-full bg-cj-surface border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:border-cj-accent-blue resize-none"
                    placeholder="Ej: Necesitamos instalar CCTV en 3 sedes, con 12 cámaras cada una..."
                  />
                </div>

                <div>
                  <label className="text-sm text-cj-text-secondary mb-1 block">Ubicación / notas logísticas</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-cj-surface border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:border-cj-accent-blue resize-none"
                    placeholder="Ej: Oficina principal, Av. Libertador. Requiere acceso en horas laborales."
                  />
                </div>

                <div>
                  <label className="text-sm text-cj-text-secondary mb-1 block">Presupuesto estimado (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-cj-surface border border-cj-border rounded px-3 py-2 text-cj-text-primary text-sm focus:outline-none focus:border-cj-accent-blue"
                    placeholder="Opcional. Ej: 5000"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setQuotingService(null)}
                    disabled={submitting}
                    className="flex-1 py-2 border border-cj-border rounded text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-secondary transition-all text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRequestQuotation}
                    disabled={submitting || description.trim().length < 10}
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
