import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Settings, Users, Activity, ToggleLeft, ToggleRight, FileText, ShoppingBag, Grid, Wrench, Receipt } from 'lucide-react';
import CatalogPanel from '../../components/Admin/CatalogPanel';
import ServicePricingPanel from '../../components/Admin/ServicePricingPanel';
import InvoicesPanel from '../../components/Admin/InvoicesPanel';

interface Quotation {
  id: number;
  user_id: string;
  fecha: string;
  status: string;
  notas_cliente: string;
}

interface EcommerceSettings {
  is_catalog_visible: boolean;
  are_prices_visible: boolean;
  support_email: string;
  support_phone: string;
}

type TabType = 'leads' | 'catalog' | 'services' | 'invoices' | 'settings';

const Admin = () => {
  const [leads, setLeads] = useState<Quotation[]>([]);
  const [settings, setSettings] = useState<EcommerceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('cjdg_admin_tab');
    return (saved as TabType) || 'leads';
  });

  const changeTab = (tab: TabType) => {
    setActiveTab(tab);
    localStorage.setItem('cjdg_admin_tab', tab);
  };

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [leadsRes, settingsRes] = await Promise.all([
        api.get('/admin/leads'),
        api.get('/admin/settings')
      ]);
      setLeads(leadsRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error("Error cargando panel de administrador", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (field: keyof EcommerceSettings) => {
    if (!settings) return;
    try {
      const updatedValue = !settings[field];
      const res = await api.put('/admin/settings', { [field]: updatedValue });
      setSettings(res.data);
    } catch (error) {
      console.error("Error al guardar configuración", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cjdg-darker pt-24 pb-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cjdg-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cjdg-darker flex flex-col">
      {/* Navbar Exclusiva del Admin */}
      <nav className="border-b border-white/5 bg-cjdg-dark/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-cjdg-accent" />
            <span className="text-lg font-bold text-white tracking-wide">Consola CJDG</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-white">{user?.full_name}</div>
              <div className="text-xs text-cjdg-textMuted uppercase tracking-wider">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-medium border border-red-500/20"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Selector de Pestañas */}
      <div className="border-b border-white/10 bg-cjdg-dark/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            <button
              onClick={() => changeTab('leads')}
              className={`py-4 px-2 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'leads' ? 'border-cjdg-primary text-cjdg-primary' : 'border-transparent text-cjdg-textMuted hover:text-white'}`}
            >
              <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Cotizaciones Entrantes</div>
            </button>
            <button
              onClick={() => changeTab('catalog')}
              className={`py-4 px-2 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'catalog' ? 'border-cjdg-primary text-cjdg-primary' : 'border-transparent text-cjdg-textMuted hover:text-white'}`}
            >
              <div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Catálogo</div>
            </button>
            <button
              onClick={() => changeTab('services')}
              className={`py-4 px-2 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'services' ? 'border-cjdg-primary text-cjdg-primary' : 'border-transparent text-cjdg-textMuted hover:text-white'}`}
            >
              <div className="flex items-center gap-2"><Wrench className="w-4 h-4" /> Servicios</div>
            </button>
            <button
              onClick={() => changeTab('invoices')}
              className={`py-4 px-2 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'invoices' ? 'border-cjdg-primary text-cjdg-primary' : 'border-transparent text-cjdg-textMuted hover:text-white'}`}
            >
              <div className="flex items-center gap-2"><Receipt className="w-4 h-4" /> Facturación</div>
            </button>
            <button
              onClick={() => changeTab('settings')}
              className={`py-4 px-2 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'settings' ? 'border-cjdg-primary text-cjdg-primary' : 'border-transparent text-cjdg-textMuted hover:text-white'}`}
            >
              <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Ajustes Globales</div>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Dinámico */}
      <div className="flex-grow max-w-7xl mx-auto w-full px-6 py-8">

        {/* Pestaña: LEADS */}
        {activeTab === 'leads' && (
          <div className="glass-panel p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cjdg-primary" /> Historial de Leads ({leads.length})
              </h2>
            </div>

            {leads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-cjdg-textMuted">No hay cotizaciones pendientes en este momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-mono uppercase tracking-widest text-cjdg-textMuted">
                      <th className="pb-3 px-4 font-medium">ID Lead</th>
                      <th className="pb-3 px-4 font-medium">Fecha</th>
                      <th className="pb-3 px-4 font-medium">Cliente ID</th>
                      <th className="pb-3 px-4 font-medium">Estado</th>
                      <th className="pb-3 px-4 font-medium text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-mono text-sm text-white">#{lead.id.toString().padStart(4, '0')}</td>
                        <td className="py-4 px-4 text-sm text-cjdg-textMuted">
                          {lead.fecha ? new Date(lead.fecha).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-xs font-mono text-cjdg-textMuted">
                          {lead.user_id.split('-')[0]}...
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 text-xs border border-yellow-500/30">
                            {lead.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button className="text-cjdg-accent text-sm hover:underline">Ver Notas</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pestaña: CATÁLOGO */}
        {activeTab === 'catalog' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CatalogPanel />
          </div>
        )}

        {/* Pestaña: SERVICIOS (CJDG Brochure - precios, CRUD, estado) */}
        {activeTab === 'services' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ServicePricingPanel />
          </div>
        )}

        {/* Pestaña: FACTURACIÓN */}
        {activeTab === 'invoices' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InvoicesPanel />
          </div>
        )}

        {/* Pestaña: AJUSTES GLOBALES */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                <Settings className="w-5 h-5 text-cjdg-primary" /> Configuración de E-Commerce
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Catálogo Público</h3>
                    <p className="text-xs text-cjdg-textMuted mt-1">Permite a usuarios no registrados ver los modelos.</p>
                  </div>
                  <button onClick={() => toggleSetting('is_catalog_visible')} className="text-cjdg-accent">
                    {settings?.is_catalog_visible ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-cjdg-textMuted" />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Precios Visibles</h3>
                    <p className="text-xs text-cjdg-textMuted mt-1">Oculta precios (forzando cotizaciones personalizadas).</p>
                  </div>
                  <button onClick={() => toggleSetting('are_prices_visible')} className="text-cjdg-accent">
                    {settings?.are_prices_visible ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-cjdg-textMuted" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 bg-gradient-to-br from-cjdg-darker to-blue-900/10 flex flex-col justify-center">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Users className="w-5 h-5" /> Estadísticas Generales</h3>
              <p className="text-sm text-cjdg-textMuted mb-6">Métricas crudas del sistema en tiempo real.</p>

              <div className="flex items-center gap-8">
                <div>
                  <div className="text-4xl font-mono text-cjdg-accent font-bold">{leads.length}</div>
                  <div className="text-xs font-mono uppercase tracking-widest text-cjdg-textMuted mt-1">Leads Activos</div>
                </div>
                <div className="h-12 w-px bg-white/10"></div>
                <div>
                  <div className="text-4xl font-mono text-white font-bold">4</div>
                  <div className="text-xs font-mono uppercase tracking-widest text-cjdg-textMuted mt-1">Pilares DB</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Admin;
