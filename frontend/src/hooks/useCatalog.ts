import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface CatalogItemType {
  id: number;
  price: number;
  is_available: boolean;
  stock: number;
  is_offer: boolean;
  discount_percentage: number;
  service: {
    id: number;
    nombre: string;
    description: string;
    pilar_id: string;
    categoria: string;
    marca: string | null;
    codigo_modelo: string | null;
    image_url: string | null;
  };
}

export const useCatalog = (pageSize: number = 24) => {
  const [items, setItems] = useState<CatalogItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  const [page, setPage] = useState(1);
  const [filterPilar, setFilterPilar] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cuando cambian los filtros principales, volver a la página 1
  useEffect(() => {
    setPage(1);
  }, [filterPilar, searchTerm]);

  useEffect(() => {
    // Usamos timeout para debounce en la busqueda
    const timeout = setTimeout(() => {
      fetchCatalog(page);
    }, 400);
    return () => clearTimeout(timeout);
  }, [page, filterPilar, searchTerm]);

  const fetchCatalog = async (currentPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: String(currentPage), 
        page_size: String(pageSize) 
      });
      
      if (filterPilar !== 'all') params.set('pilar_id', filterPilar);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await api.get(`/catalog?${params}`);
      const data = res.data;
      
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('[Catalogo] Error:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    loading,
    total,
    page,
    totalPages,
    setPage,
    filterPilar,
    setFilterPilar,
    searchTerm,
    setSearchTerm
  };
};
