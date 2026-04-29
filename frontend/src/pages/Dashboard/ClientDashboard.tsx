import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Home, ShoppingBag, ShoppingCart, Wrench, MessageSquare, Receipt, User, LogOut, Menu, X, AlertCircle, ArrowRight, Building2
} from 'lucide-react';
import { getImageUrl } from '../../services/api';
import ProductCatalogGrid from '../../components/Client/ProductCatalogGrid';
import ServiceBrowser from '../../components/Client/ServiceBrowser';
import ClientQuotationsList from '../../components/Client/Quotations/ClientQuotationsList';
import ClientChatView from '../../components/Client/Quotations/ClientChatView';
import InvoiceList from '../../components/Client/InvoiceList';
import CartSection from '../../components/Client/CartSection';
import ClientHome from '../../components/Client/Home/ClientHome';
import ProfileForm from '../../components/Client/Profile/ProfileForm';
import NotificationBell from '../../components/NotificationBell';
import { useCart } from '../../context/CartContext';

type SectionType = 'overview' | 'catalog' | 'cart' | 'services' | 'quotations' | 'invoices' | 'profile';

const SECTIONS = [
  { key: 'overview' as SectionType, label: 'Inicio', icon: Home },
  { key: 'catalog' as SectionType, label: 'Catálogo', icon: ShoppingBag },
  { key: 'cart' as SectionType, label: 'Mi Carrito', icon: ShoppingCart },
  { key: 'services' as SectionType, label: 'Servicios CJDG', icon: Wrench },
  { key: 'quotations' as SectionType, label: 'Cotizaciones', icon: MessageSquare },
  { key: 'invoices' as SectionType, label: 'Facturas', icon: Receipt },
  { key: 'profile' as SectionType, label: 'Mi Perfil', icon: User },
];

const ClientDashboard = () => {
  const [activeSection, setActiveSection] = useState<SectionType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const { user, logout, refreshUser } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const cartCount = cart?.items?.length || 0;

  // Refresca el perfil al montar para asegurar que tenemos campos fiscales
  // (el localStorage puede tener una snapshot vieja sin los nuevos campos)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const profileIncomplete = !user?.account_type || !user?.rif || !user?.fiscal_address;
  const avatarUrl = user?.profile_photo_url ? getImageUrl(user.profile_photo_url) : null;
  const isCompany = user?.account_type === 'empresa';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSectionChange = (section: SectionType) => {
    setActiveSection(section);
    setSidebarOpen(false);
    if (section !== 'quotations') setSelectedThreadId(null);
  };

  const sidebarItemClass = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
      isActive
        ? 'bg-cj-accent-blue-light text-cj-accent-blue font-medium'
        : 'text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-primary'
    }`;

  return (
    <div className="h-screen bg-cj-bg-primary flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col flex-shrink-0 w-64 bg-cj-surface border-r border-cj-border z-40 overflow-y-auto">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-cj-border">
          <span className="text-lg font-bold text-cj-text-primary tracking-wide">Proyectos CJDG</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.key;
            return (
              <button
                key={s.key}
                onClick={() => handleSectionChange(s.key)}
                className={sidebarItemClass(isActive)}
              >
                <Icon className="w-4 h-4" />
                {s.label}
                {s.key === 'cart' && cartCount > 0 && (
                  <span className="ml-auto bg-cj-accent-blue text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="border-t border-cj-border p-4">
          <button
            type="button"
            onClick={() => handleSectionChange('profile')}
            className="w-full flex items-center gap-3 mb-3 group hover:bg-cj-bg-primary rounded-lg p-1 -m-1 transition-colors"
            title="Ir a Mi Perfil"
          >
            <div className="w-9 h-9 rounded-full bg-cj-accent-blue-light flex items-center justify-center overflow-hidden flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : isCompany ? (
                <Building2 className="w-4 h-4 text-cj-accent-blue" />
              ) : (
                <User className="w-4 h-4 text-cj-accent-blue" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-cj-text-primary truncate">{user?.full_name}</p>
              <p className="text-xs text-cj-text-muted">@{user?.username}</p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-cj-danger hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-cj-surface border-r border-cj-border flex flex-col shadow-cj-xl">
            <div className="h-16 flex items-center justify-between px-6 border-b border-cj-border">
              <span className="text-lg font-bold text-cj-text-primary">Proyectos CJDG</span>
              <button onClick={() => setSidebarOpen(false)} className="text-cj-text-secondary hover:text-cj-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => handleSectionChange(s.key)}
                    className={sidebarItemClass(activeSection === s.key)}
                  >
                    <Icon className="w-4 h-4" /> {s.label}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-cj-border p-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-cj-danger hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-cj-border bg-cj-surface flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-cj-text-secondary hover:text-cj-text-primary"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-cj-text-primary">
              {SECTIONS.find((s) => s.key === activeSection)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell
              onNavigate={(n) => {
                if (n.type === 'chat_message' || n.type === 'quotation_status') {
                  if (n.metadata?.thread_id) setSelectedThreadId(n.metadata.thread_id);
                  handleSectionChange('quotations');
                } else if (n.type === 'invoice_created' || n.type === 'invoice_status') {
                  handleSectionChange('invoices');
                }
              }}
            />
            <div className="text-sm text-cj-text-secondary hidden sm:block">
              {user?.full_name} · <span className="uppercase text-xs text-cj-accent-blue font-semibold">{user?.role}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-cj-bg-primary">
          {/* Banner de perfil incompleto — visible en todas las secciones excepto 'profile' */}
          {profileIncomplete && activeSection !== 'profile' && (
            <button
              type="button"
              onClick={() => handleSectionChange('profile')}
              className="w-full mb-6 group flex items-center justify-between gap-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md text-left hover:bg-yellow-100 transition-colors"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">
                    Completa tu información fiscal
                  </p>
                  <p className="text-xs text-yellow-800 mt-0.5">
                    Necesitas registrar tu RIF y dirección fiscal para emitir facturas.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-900 group-hover:translate-x-1 transition-transform">
                Completar ahora <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          )}

          {activeSection === 'overview' && <ClientHome onNavigate={(s) => handleSectionChange(s as SectionType)} />}
          {activeSection === 'catalog' && <ProductCatalogGrid />}
          {activeSection === 'cart' && <CartSection onGoToInvoices={() => setActiveSection('invoices')} />}
          {activeSection === 'services' && <ServiceBrowser />}
          {activeSection === 'quotations' && (
            selectedThreadId
              ? <ClientChatView threadId={selectedThreadId} onBack={() => setSelectedThreadId(null)} />
              : <ClientQuotationsList onSelectThread={setSelectedThreadId} />
          )}
          {activeSection === 'invoices' && <InvoiceList />}
          {activeSection === 'profile' && <ProfileForm />}
        </main>
      </div>
    </div>
  );
};

export default ClientDashboard;
