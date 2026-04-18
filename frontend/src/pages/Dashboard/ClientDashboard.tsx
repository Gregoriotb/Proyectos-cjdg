import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Home, ShoppingBag, ShoppingCart, Wrench, MessageSquare, Receipt, User, LogOut, Menu, X
} from 'lucide-react';
import ProductCatalogGrid from '../../components/Client/ProductCatalogGrid';
import ServiceBrowser from '../../components/Client/ServiceBrowser';
import ClientQuotationsList from '../../components/Client/Quotations/ClientQuotationsList';
import ClientChatView from '../../components/Client/Quotations/ClientChatView';
import InvoiceList from '../../components/Client/InvoiceList';
import CartSection from '../../components/Client/CartSection';
import ClientHome from '../../components/Client/Home/ClientHome';
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
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const cartCount = cart?.items?.length || 0;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSectionChange = (section: SectionType) => {
    setActiveSection(section);
    setSidebarOpen(false);
    if (section !== 'quotations') setSelectedThreadId(null);
  };

  return (
    <div className="h-screen bg-cjdg-darker flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col flex-shrink-0 w-64 bg-cjdg-dark/80 border-r border-white/5 backdrop-blur-lg z-40 overflow-y-auto">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <span className="text-lg font-bold text-white tracking-wide">Proyectos CJDG</span>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-cjdg-primary/10 text-cjdg-primary border border-cjdg-primary/20'
                    : 'text-cjdg-textMuted hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
                {s.key === 'cart' && cartCount > 0 && (
                  <span className="ml-auto bg-cjdg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-cjdg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-cjdg-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-cjdg-textMuted">@{user?.username}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-cjdg-dark border-r border-white/5 flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
              <span className="text-lg font-bold text-white">Proyectos CJDG</span>
              <button onClick={() => setSidebarOpen(false)} className="text-cjdg-textMuted">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      activeSection === s.key
                        ? 'bg-cjdg-primary/10 text-cjdg-primary'
                        : 'text-cjdg-textMuted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {s.label}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-white/5 p-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/5 bg-cjdg-dark/50 backdrop-blur-lg flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-cjdg-textMuted hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">
              {SECTIONS.find((s) => s.key === activeSection)?.label}
            </h1>
          </div>
          <div className="text-sm text-cjdg-textMuted hidden sm:block">
            {user?.full_name} · <span className="uppercase text-xs">{user?.role}</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
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
          {activeSection === 'profile' && <ProfileSection />}
        </main>
      </div>
    </div>
  );
};

// --- Secciones internas ---

const ProfileSection = () => {
  const { user } = useAuth();
  return (
    <div className="glass-panel p-8 max-w-lg">
      <h2 className="text-xl font-bold text-white mb-6">Mi Perfil</h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-cjdg-textMuted uppercase tracking-wider">Nombre</label>
          <p className="text-white">{user?.full_name}</p>
        </div>
        <div>
          <label className="text-xs text-cjdg-textMuted uppercase tracking-wider">Usuario</label>
          <p className="text-white">@{user?.username}</p>
        </div>
        <div>
          <label className="text-xs text-cjdg-textMuted uppercase tracking-wider">Rol</label>
          <p className="text-white uppercase">{user?.role}</p>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
