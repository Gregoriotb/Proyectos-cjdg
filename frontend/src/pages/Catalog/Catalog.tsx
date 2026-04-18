import { useEffect, useState } from 'react';
import { ShoppingCart, Filter, Search, Plus } from 'lucide-react';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';

interface CatalogItemType {
  id: number;
  price: number;
  is_available: boolean;
  service: {
    id: number;
    nombre: string;
    descripcion: string;
    pilar_id: string;
    categoria: string;
  };
}

const Catalog = () => {
  const [items, setItems] = useState<CatalogItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPilar, setFilterPilar] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { addToCart } = useCart();

  useEffect(() => { fetchCatalog(); }, [filterPilar]);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const url = filterPilar === 'all' ? '/catalog' : `/catalog?pilar_id=${filterPilar}`;
      const res = await api.get(url);
      setItems(res.data);
    } catch (error) {
      console.error('Error cargando el catálogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (catalogItemId: number) => {
    await addToCart(catalogItemId, 1);
  };

  const filteredItems = items.filter(
    (item) =>
      item.service.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.service.descripcion.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-cj-bg-primary pt-24 px-6 md:px-12 pb-12">
      <div className="max-w-7xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-cj-text-primary mb-2">Catálogo de Servicios e Infraestructura</h1>
        <p className="text-cj-text-secondary">Explora más de 10.000 referencias técnicas en Climatización, Redes, CCTV y Energía.</p>

        {/* Filtros y búsqueda */}
        <div className="mt-8 glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex w-full md:w-auto overflow-x-auto gap-2 pb-2 md:pb-0">
            {['all', 'tecnologia', 'climatizacion', 'energia', 'ingenieria_civil'].map((pilar) => (
              <button
                key={pilar}
                onClick={() => setFilterPilar(pilar)}
                className={`py-1.5 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  filterPilar === pilar
                    ? 'bg-cj-accent-blue text-white shadow-cj-sm'
                    : 'bg-cj-bg-secondary text-cj-text-secondary hover:bg-cj-bg-tertiary hover:text-cj-text-primary'
                }`}
              >
                {pilar === 'all' ? 'Todos' : pilar.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-cj-text-muted" />
            </div>
            <input
              type="text"
              placeholder="Buscar SKU o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-cj-border rounded-full bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted focus:outline-none focus:border-cj-accent-blue focus:ring-2 focus:ring-cj-accent-blue-light text-sm"
            />
          </div>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cj-accent-blue" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="glass-card flex flex-col overflow-hidden group">
                <div className="h-1 w-full bg-gradient-to-r from-cj-accent-blue to-sky-400 opacity-80" />

                <div className="p-5 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cj-text-secondary bg-cj-bg-secondary py-1 px-2 rounded">
                      {item.service.categoria}
                    </span>
                    <span className="text-[10px] font-mono text-cj-accent-blue/80 uppercase">
                      ID: {item.service.id.toString().padStart(4, '0')}
                    </span>
                  </div>

                  <h3 className="text-cj-text-primary font-medium text-lg leading-snug mb-2 group-hover:text-cj-accent-blue transition-colors">
                    {item.service.nombre}
                  </h3>

                  <p className="text-cj-text-secondary text-xs line-clamp-3 mb-4 flex-grow">
                    {item.service.descripcion}
                  </p>

                  <div className="mt-auto pt-4 border-t border-cj-border flex items-center justify-between">
                    <div className="text-cj-text-primary font-mono text-sm">
                      {item.price > 0 ? `$${item.price.toFixed(2)}` : <span className="text-cj-text-secondary">Cotizar</span>}
                    </div>
                    <button
                      onClick={() => handleAddToCart(item.id)}
                      className="text-cj-accent-blue bg-cj-accent-blue-light hover:bg-cj-accent-blue hover:text-white p-2 rounded-lg transition-all flex items-center gap-1"
                      title="Agregar al Carrito"
                    >
                      <Plus className="w-4 h-4" />
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass-panel">
            <Filter className="w-12 h-12 text-cj-text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-cj-text-primary mb-1">No se encontraron resultados</h3>
            <p className="text-cj-text-secondary text-sm">Prueba ajustando los filtros o tu término de búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;
