import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';
import { Trash2, AlertCircle, ArrowRight, CheckCircle2, ShoppingCart, Receipt } from 'lucide-react';

interface CartSectionProps {
  onGoToInvoices: () => void;
}

const CartSection = ({ onGoToInvoices }: CartSectionProps) => {
  const { cart, removeFromCart, refreshCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0);
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  const isEmpty = !cart || !cart.items || cart.items.length === 0;

  const handleCheckout = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/invoices/checkout', { notas: notas || null });
      setInvoiceId(res.data.id);
      setInvoiceTotal(res.data.total);
      setSuccess(true);
      refreshCart();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al procesar la compra.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="glass-panel max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">¡Compra Registrada!</h2>
          <p className="text-cjdg-textMuted mb-2">
            Factura <strong className="text-white font-mono">#{invoiceId?.toString().padStart(4, '0')}</strong>
          </p>
          <p className="text-2xl font-mono font-bold text-cjdg-accent mb-4">
            ${Number(invoiceTotal).toFixed(2)}
          </p>
          <p className="text-cjdg-textMuted text-sm mb-6">
            El stock ha sido reservado. Puedes ver el estado en Facturas.
          </p>
          <button onClick={onGoToInvoices} className="btn-primary inline-flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Ver Facturas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-md mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Items */}
        <div className="lg:w-2/3 glass-panel p-6">
          <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 mb-4">
            Productos ({cart?.items?.length || 0})
          </h2>

          {isEmpty ? (
            <div className="text-center py-10">
              <ShoppingCart className="w-10 h-10 text-cjdg-textMuted/30 mx-auto mb-3" />
              <p className="text-cjdg-textMuted">Tu carrito está vacío.</p>
              <p className="text-xs text-cjdg-textMuted mt-1">Agrega productos desde el Catálogo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-cjdg-darker/50 border border-white/5">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-cjdg-accent">SKU-{item.catalog_item_id.toString().padStart(4, '0')}</span>
                      <span className="text-xs bg-cjdg-primary/20 text-cjdg-primary px-2 py-0.5 rounded font-mono">x{item.quantity}</span>
                    </div>
                    <h4 className="text-sm text-white">Producto #{item.catalog_item_id}</h4>
                    {item.observaciones && <p className="text-xs text-cjdg-textMuted mt-0.5">{item.observaciones}</p>}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-md transition-colors ml-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout */}
        <div className="lg:w-1/3">
          <div className="glass-panel p-6 sticky top-4">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 mb-4">Confirmar Compra</h2>

            <div className="mb-4">
              <label className="block text-sm text-cjdg-textMuted mb-1">Notas (opcional)</label>
              <textarea
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full border border-cjdg-border rounded-md bg-cjdg-dark/50 text-white placeholder-cjdg-textMuted p-3 focus:outline-none focus:ring-1 focus:ring-cjdg-accent text-sm resize-none"
                placeholder="Dirección de envío, instrucciones..."
              />
            </div>

            <div className="bg-cjdg-darker/50 p-3 rounded-lg border border-white/5 mb-4 text-sm">
              <p className="text-cjdg-textMuted">Items: <span className="text-white font-mono">{cart?.items?.length || 0}</span></p>
              <p className="text-xs text-cjdg-textMuted mt-2">
                Al confirmar se genera factura y se reserva el stock automáticamente.
              </p>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isEmpty || submitting}
              className="w-full py-3 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Procesando...' : (
                <>Confirmar Compra <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartSection;
