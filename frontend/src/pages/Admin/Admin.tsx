import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Settings, Users, Activity, ToggleLeft, ToggleRight, FileText, ShoppingBag, Wrench, Receipt, KeyRound, Archive } from 'lucide-react';
import CatalogPanel from '../../components/Admin/CatalogPanel';
import ServicePricingPanel from '../../components/Admin/ServicePricingPanel';
import InvoicesPanel from '../../components/Admin/InvoicesPanel';
import QuotationsPanel from '../../components/Admin/Quotation/QuotationsPanel';
import ApiKeysPanel from '../../components/Admin/ApiKeysPanel';
import HistorialPanel from '../../components/Admin/HistorialPanel';

interface EcommerceSettings {
  is_catalog_visible: boolean;
  are_prices_visible: boolean;
  support_email: string;
  support_phone: string;
}

type TabType = 'leads' | 'catalog' | 'services' | 'invoices' | 'historial' | 'api' | 'settings';

const TABS: Array<{ key: TabType; label: string; Icon: typeof FileText }> = [
  { key: 'leads',    label: 'Cotizaciones',      Icon: FileText },
  { key: 'catalog',  label: 'Catálogo',          Icon: ShoppingBag },
  { key: 'services', label: 'Servicios',         Icon: Wrench },
  { key: 'invoices', label: 'Facturación',       Icon: Receipt },
  { key: 'historial', label: 'Historial',        Icon: Archive },
  { key: 'api',      label: 'API Keys',          Icon: KeyRound },
  { key: 'settings', label: 'Ajustes',           Icon: Settings },
];

const Admin = () => {
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

  useEffect(() => { fetchAdminData(); }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const settingsRes = await api.get('/admin/settings');
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error cargando panel de administrador', error);
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
      console.error('Error al guardar configuración', error);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) {
    return (
      <div className="min-h-screen bg-cj-bg-primary pt-24 pb-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cj-accent-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cj-bg-primary flex flex-col">
      {/* Navbar Admin */}
      <nav className="border-b border-cj-border bg-cj-surface shadow-cj-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cj-accent-blue-light flex items-center justify-center">
              <Activity className="w-4 h-4 text-cj-accent-blue" />
            </div>
            <span className="text-lg font-bold text-cj-text-primary tracking-wide">Consola CJDG</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-cj-text-primary">{user?.full_name}</div>
              <div className="text-xs text-cj-accent-blue uppercase tracking-wider font-semibold">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-cj-danger hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="border-b border-cj-border bg-cj-surface">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex gap-3 sm:gap-6 lg:gap-8 overflow-x-auto scrollbar-thin">
            {TABS.map(({ key, label, Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => changeTab(key)}
                  className={`py-3 sm:py-4 px-1 sm:px-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? 'border-cj-accent-blue text-cj-accent-blue'
                      : 'border-transparent text-cj-text-secondary hover:text-cj-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2"><Icon className="w-4 h-4 shrink-0" /> {label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-grow max-w-7xl mx-auto w-full px-6 py-8">
        {activeTab === 'leads' && (
          <div className="glass-panel p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <QuotationsPanel />
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CatalogPanel />
          </div>
        )}

        {activeTab === 'services' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ServicePricingPanel />
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InvoicesPanel />
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <HistorialPanel />
          </div>
        )}

        {activeTab === 'api' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ApiKeysPanel />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold text-cj-text-primary flex items-center gap-2 mb-6 border-b border-cj-border pb-4">
                <Settings className="w-5 h-5 text-cj-accent-blue" /> Configuración de E-Commerce
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-cj-text-primary font-medium">Catálogo Público</h3>
                    <p className="text-xs text-cj-text-secondary mt-1">Permite a usuarios no registrados ver los modelos.</p>
                  </div>
                  <button onClick={() => toggleSetting('is_catalog_visible')} className={settings?.is_catalog_visible ? 'text-cj-accent-blue' : 'text-cj-text-muted'}>
                    {settings?.is_catalog_visible ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-cj-text-primary font-medium">Precios Visibles</h3>
                    <p className="text-xs text-cj-text-secondary mt-1">Oculta precios (forzando cotizaciones personalizadas).</p>
                  </div>
                  <button onClick={() => toggleSetting('are_prices_visible')} className={settings?.are_prices_visible ? 'text-cj-accent-blue' : 'text-cj-text-muted'}>
                    {settings?.are_prices_visible ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 flex flex-col justify-center">
              <h3 className="text-cj-text-primary font-bold mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-cj-accent-blue" /> Estadísticas Generales
              </h3>
              <p className="text-sm text-cj-text-secondary mb-6">Métricas crudas del sistema en tiempo real.</p>

              <div className="flex items-center gap-8">
                <div>
                  <div className="text-4xl font-mono text-cj-text-primary font-bold">4</div>
                  <div className="text-xs font-mono uppercase tracking-widest text-cj-text-secondary mt-1">Pilares DB</div>
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
