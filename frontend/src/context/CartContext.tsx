import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface CartItem {
  id: number;
  catalog_item_id: number;
  quantity: number;
  observaciones?: string;
  // Podríamos sumar campos del catalog item devueltos por el backend para pintar UI
}

interface Cart {
  id?: number;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  addToCart: (catalogItemId: number, quantity?: number, observaciones?: string) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    
    try {
      setIsLoading(true);
      const res = await api.get('/cart');
      setCart(res.data);
    } catch (error) {
      console.error("Error al cargar carrito", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (catalogItemId: number, quantity = 1, observaciones = "") => {
    if (!isAuthenticated) return; // Podría redirigirse a Login en vez de solo return
    
    try {
      setIsLoading(true);
      const res = await api.post('/cart/items', {
        catalog_item_id: catalogItemId,
        quantity,
        observaciones
      });
      setCart(res.data);
    } catch (error) {
      console.error("No se pudo agregar al carrito", error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    try {
      setIsLoading(true);
      const res = await api.delete(`/cart/items/${itemId}`);
      setCart(res.data);
    } catch (error) {
      console.error("No se pudo eliminar el item", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{ cart, isLoading, addToCart, removeFromCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
};
