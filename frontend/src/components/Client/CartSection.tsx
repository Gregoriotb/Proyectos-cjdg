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
  const [tipoDocumento, setTipoDocumento] = useState<'factura' | 'nota_entrega'>('factura');
  const [error, setError] = useState('');

  const isEmpty = !cart || !cart.items || cart.items.length === 0;

  const handleCheckout = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/invoices/checkout', {
        notas: notas || null,
        tipo_documento: tipoDocumento,
      });
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
        <div className="bg-cj-surface border border-cj-border shadow-cj-md rounded-lg max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-cj-text-primary mb-2">¡Compra Registrada!</h2>
          <p className="text-cj-text-secondary mb-2">
            Factura <strong className="text-cj-text-primary font-mono">#{invoiceId?.toString().padStart(4, '0')}</strong>
          </p>
          <p className="text-2xl font-mono font-bold text-cj-accent-blue mb-4">
            ${Number(invoiceTotal).toFixed(2)}
          </p>
          <p className="text-cj-text-secondary text-sm mb-6">
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
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Items */}
        <div className="lg:w-2/3 bg-cj-surface border border-cj-border shadow-cj-md rounded-lg p-6">
          <h2 className="text-lg font-bold text-cj-text-primary border-b border-cj-border pb-3 mb-4">
            Productos ({cart?.items?.length || 0})
          </h2>

          {isEmpty ? (
            <div className="text-center py-10">
              <ShoppingCart className="w-10 h-10 text-cj-text-muted mx-auto mb-3" />
              <p className="text-cj-text-secondary">Tu carrito está vacío.</p>
              <p className="text-xs text-cj-text-muted mt-1">Agrega productos desde el Catálogo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-cj-bg-secondary border border-cj-border">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-cj-accent-blue">SKU-{item.catalog_item_id.toString().padStart(4, '0')}</span>
                      <span className="text-xs bg-cj-accent-blue-light text-cj-accent-blue px-2 py-0.5 rounded font-mono">x{item.quantity}</span>
                    </div>
                    <h4 className="text-sm text-cj-text-primary">Producto #{item.catalog_item_id}</h4>
                    {item.observaciones && <p className="text-xs text-cj-text-secondary mt-0.5">{item.observaciones}</p>}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors ml-3"
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
          <div className="bg-cj-surface border border-cj-border shadow-cj-md rounded-lg p-6 sticky top-4">
            <h2 className="text-lg font-bold text-cj-text-primary border-b border-cj-border pb-3 mb-4">Confirmar Compra</h2>

            {/* SC-08 (FEAT-Historial-v2.4): selector tipo de documento */}
            <div className="mb-4">
              <label className="block text-sm text-cj-text-secondary mb-2">Tipo de documento</label>
              <div className="grid grid-cols-2 gap-2">
                {(['factura', 'nota_entrega'] as const).map((tipo) => {
                  const active = tipoDocumento === tipo;
                  const label = tipo === 'factura' ? 'Factura fiscal' : 'Nota de entrega';
                  const sub = tipo === 'factura' ? 'Requiere RIF + dirección fiscal' : 'Sin valor fiscal';
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoDocumento(tipo)}
                      className={`px-3 py-2 text-left rounded-lg border transition-all ${
                        active
                          ? 'bg-cj-accent-blue-light border-cj-accent-blue text-cj-accent-blue'
                          : 'bg-cj-bg-primary border-cj-border text-cj-text-secondary hover:border-cj-accent-blue/50'
                      }`}
                    >
                      <div className="text-xs font-semibold">{label}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">{sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-cj-text-secondary mb-1">Notas (opcional)</label>
              <textarea
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full border border-cj-border rounded-md bg-cj-surface text-cj-text-primary placeholder-cj-text-muted p-3 focus:outline-none focus:ring-1 focus:ring-cj-accent-blue text-sm resize-none"
                placeholder="Dirección de envío, instrucciones..."
              />
            </div>

            <div className="bg-cj-bg-secondary p-3 rounded-lg border border-cj-border mb-4 text-sm">
              <p className="text-cj-text-secondary">Items: <span className="text-cj-text-primary font-mono">{cart?.items?.length || 0}</span></p>
              <p className="text-xs text-cj-text-muted mt-2">
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
