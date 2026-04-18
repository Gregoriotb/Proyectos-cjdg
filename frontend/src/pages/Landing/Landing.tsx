import { Link } from 'react-router-dom';
import { Shield, Zap, Wind, MonitorSmartphone, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Landing = () => {
  const { isAuthenticated } = useAuth();

  const pillars = [
    {
      title: 'Tecnología',
      description: 'Infraestructuras de Red, Data Center, CCTV, Control de Acceso y Cableado Estructurado bajo estándares AAA.',
      Icon: MonitorSmartphone,
      accent: 'from-blue-50 to-blue-100 border-blue-200',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Climatización',
      description: 'Sistemas VRF, Chiller, Aires Acondicionados de Precisión y Ventilación Industrial.',
      Icon: Wind,
      accent: 'from-cyan-50 to-cyan-100 border-cyan-200',
      iconColor: 'text-cyan-600',
    },
    {
      title: 'Energía',
      description: 'Generación Eléctrica, Sistemas UPS, Paneles Solares y Tableros de Transferencia Automática.',
      Icon: Zap,
      accent: 'from-amber-50 to-amber-100 border-amber-200',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Ingeniería Civil',
      description: 'Diseño, Mantenimiento e Implementación de obras y estructuras para facilidades de misión crítica.',
      Icon: Shield,
      accent: 'from-violet-50 to-violet-100 border-violet-200',
      iconColor: 'text-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-cj-bg-primary flex flex-col pt-16">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-cj-surface border-b border-cj-border shadow-cj-sm z-50 flex items-center justify-between px-6 md:px-12">
        <div className="text-xl font-bold tracking-widest text-cj-text-primary">
          PROYECTOS<span className="text-cj-accent-blue">CJDG</span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary text-sm px-4 py-1.5 flex items-center gap-2">
              Ir al Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-cj-text-secondary hover:text-cj-text-primary transition-colors text-sm font-medium">
                Ingresar
              </Link>
              <Link to="/register" className="btn-glass text-sm px-4 py-1.5 hidden md:block">
                Registro Corporativo
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex-grow flex items-center justify-center px-6 py-20 overflow-hidden">
        {/* Glows Background (sutiles, en tonos azules suaves) */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cj-accent-blue/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-400/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-block mb-4 px-3 py-1 rounded-full border border-cj-accent-blue/30 bg-cj-accent-blue-light text-cj-accent-blue text-xs font-mono uppercase tracking-widest">
            Ingeniería &amp; Soluciones Integrales
          </div>
          <h1 className="heading-hero leading-tight mb-6">
            Ecosistema Digital de <br className="hidden md:block" />
            <span className="text-cj-accent-blue">Misión Crítica</span>
          </h1>
          <p className="text-lg md:text-xl text-cj-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            4 pilares unificados en una sola plataforma. Explora nuestro catálogo corporativo de tecnología, climatización, energía e ingeniería civil, y gestiona tus cotizaciones en tiempo real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? '/catalog' : '/register'}
              className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Explorar Catálogo <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#pilares" className="btn-outline w-full sm:w-auto text-center">
              Nuestros Pilares
            </a>
          </div>
        </div>
      </section>

      {/* 4 Pilares */}
      <section id="pilares" className="py-24 px-6 md:px-12 bg-cj-surface relative z-10 border-t border-cj-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-section">4 Pilares de Excelencia</h2>
            <p className="text-cj-text-secondary max-w-2xl mx-auto">
              Diseñamos, implementamos y mantenemos infraestructuras complejas asegurando la conectividad y continuidad operativa de tu empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((p, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-6 flex flex-col bg-gradient-to-br ${p.accent} border shadow-cj-sm hover:shadow-cj-md transition-shadow duration-300`}
              >
                <div className="bg-cj-surface w-14 h-14 rounded-lg flex items-center justify-center mb-6 border border-cj-border shadow-cj-sm">
                  <p.Icon className={`w-7 h-7 ${p.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-cj-text-primary mb-3">{p.title}</h3>
                <p className="text-cj-text-secondary text-sm leading-relaxed flex-grow">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-cj-border bg-cj-surface text-center">
        <p className="text-cj-text-muted text-sm">
          &copy; {new Date().getFullYear()} Proyectos CJDG C.A. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
