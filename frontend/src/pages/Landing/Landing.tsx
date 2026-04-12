import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Wind, MonitorSmartphone, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Landing = () => {
  const { isAuthenticated } = useAuth();

  const pillars = [
    {
      title: "Tecnología",
      description: "Infraestructuras de Red, Data Center, CCTV, Control de Acceso y Cableado Estructurado bajo estándares AAA.",
      icon: <MonitorSmartphone className="w-8 h-8 text-cjdg-accent" />,
      color: "from-blue-500/20 to-cyan-500/5"
    },
    {
      title: "Climatización",
      description: "Sistemas VRF, Chiller, Aires Acondicionados de Precisión y Ventilación Industrial.",
      icon: <Wind className="w-8 h-8 text-cjdg-accent" />,
      color: "from-teal-500/20 to-emerald-500/5"
    },
    {
      title: "Energía",
      description: "Generación Eléctrica, Sistemas UPS, Paneles Solares y Tableros de Transferencia Automática.",
      icon: <Zap className="w-8 h-8 text-cjdg-accent" />,
      color: "from-yellow-500/20 to-orange-500/5"
    },
    {
      title: "Ingeniería Civil",
      description: "Diseño, Mantenimiento e Implementación de obras y estructuras para facilidades de misión crítica.",
      icon: <Shield className="w-8 h-8 text-cjdg-accent" />,
      color: "from-purple-500/20 to-indigo-500/5"
    }
  ];

  return (
    <div className="min-h-screen bg-cjdg-darker flex flex-col pt-16">
      
      {/* Navbar Minimalista */}
      <nav className="fixed top-0 left-0 right-0 h-16 glass-panel rounded-none border-x-0 border-t-0 z-50 flex items-center justify-between px-6 md:px-12">
        <div className="text-xl font-bold tracking-widest text-white">
          PROYECTOS<span className="text-cjdg-accent">CJDG</span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary text-sm px-4 py-1.5 flex items-center gap-2">
              Ir al Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-cjdg-textMuted hover:text-white transition-colors text-sm font-medium">Ingresar</Link>
              <Link to="/register" className="btn-glass text-sm px-4 py-1.5 hidden md:block">Registro Corporativo</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex-grow flex items-center justify-center px-6 py-20 overflow-hidden">
        {/* Glows Background */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cjdg-primary/10 blur-[120px] rounded-full point-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cjdg-accent/10 blur-[100px] rounded-full point-events-none"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-block mb-4 px-3 py-1 rounded-full border border-cjdg-accent/30 bg-cjdg-accent/10 text-cjdg-accent text-xs font-mono uppercase tracking-widest">
            Ingeniería & Soluciones Integrales
          </div>
          <h1 className="heading-hero leading-tight mb-6">
            Ecosistema Digital de <br className="hidden md:block"/>Misión Crítica
          </h1>
          <p className="text-lg md:text-xl text-cjdg-textMuted mb-10 max-w-2xl mx-auto leading-relaxed">
            4 pilares unificados en una sola plataforma. Explora nuestro catálogo corporativo de tecnología, climatización, energía e ingeniería civil, y gestiona tus cotizaciones en tiempo real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={isAuthenticated ? "/catalog" : "/register"} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
              Explorar Catálogo <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#pilares" className="btn-outline w-full sm:w-auto text-center">
              Nuestros Pilares
            </a>
          </div>
        </div>
      </section>

      {/* 4 Pilares Section */}
      <section id="pilares" className="py-24 px-6 md:px-12 bg-cjdg-dark relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-section">4 Pilares de Excelencia</h2>
            <p className="text-cjdg-textMuted max-w-2xl mx-auto">
              Diseñamos, implementamos y mantenemos infraestructuras complejas asegurando la conectividad y continuidad operativa de tu empresa.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar, idx) => (
              <div key={idx} className={`glass-card p-6 flex flex-col bg-gradient-to-b ${pillar.color}`}>
                <div className="bg-cjdg-darker/50 w-14 h-14 rounded-lg flex items-center justify-center mb-6 border border-white/5">
                  {pillar.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{pillar.title}</h3>
                <p className="text-cjdg-textMuted text-sm leading-relaxed flex-grow">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Minimalista */}
      <footer className="py-8 border-t border-white/5 bg-cjdg-darker text-center">
        <p className="text-cjdg-textMuted text-sm">
          &copy; {new Date().getFullYear()} Proyectos CJDG C.A. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
