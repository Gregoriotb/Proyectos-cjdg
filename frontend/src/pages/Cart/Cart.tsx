import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { Trash2, AlertCircle, FileText, ArrowRight, CheckCircle2, ShoppingCart, Receipt } from 'lucide-react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cart, removeFromCart, refreshCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0);
  const [notas, setNotas] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'factura' | 'nota_entrega'>('factura');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      setError(err.response?.data?.detail || "Ocurrió un error al procesar tu compra. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cj-bg-primary pt-24 px-6 md:px-12 pb-12 flex items-center justify-center">
        <div className="glass-panel max-w-lg w-full p-10 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-cj-text-primary mb-2">¡Compra Registrada!</h2>
          <p className="text-cj-text-secondary mb-4">
            Se ha generado la factura <strong className="text-cj-text-primary font-mono">#{invoiceId?.toString().padStart(4, '0')}</strong> por un total de{' '}
            <strong className="text-cj-accent-blue font-mono">${Number(invoiceTotal).toFixed(2)}</strong>.
          </p>
          <p className="text-cj-text-secondary text-sm mb-8">
            El stock ha sido reservado. Puedes ver el estado de tu factura en la sección "Facturas" de tu dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/dashboard')} className="btn-primary inline-flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Ver Facturas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cj-bg-primary pt-24 px-6 md:px-12 pb-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-cj-text-primary mb-2 flex items-center gap-3">
          <ShoppingCart className="text-cj-accent-blue" /> Mi Carrito
        </h1>
        <p className="text-cj-text-secondary mb-10">Revisa los productos antes de confirmar tu compra.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-md mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Lista de Items */}
          <div className="lg:w-2/3 glass-panel p-6">
            <h2 className="text-xl font-bold text-cj-text-primary border-b border-cj-border pb-4 mb-4">Productos Seleccionados</h2>

            {isEmpty ? (
              <div className="text-center py-12">
                <div className="inline-block p-4 rounded-full bg-cj-bg-secondary mb-4">
                  <ShoppingCart className="w-8 h-8 text-cj-text-secondary" />
                </div>
                <h3 className="text-lg font-medium text-cj-text-primary mb-1">Tu carrito está vacío</h3>
                <p className="text-cj-text-secondary text-sm mb-6">Explora el catálogo y agrega productos.</p>
                <button onClick={() => navigate('/dashboard')} className="btn-outline">Ir al Catálogo</button>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-cj-bg-secondary border border-cj-border">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-cj-accent-blue uppercase">SKU-{item.catalog_item_id.toString().padStart(4, '0')}</span>
                        <span className="text-xs bg-cj-accent-blue-light text-cj-accent-blue px-2 py-0.5 rounded font-mono">x{item.quantity}</span>
                      </div>
                      <h4 className="text-cj-text-primary font-medium">Producto #{item.catalog_item_id}</h4>
                      {item.observaciones && <p className="text-sm text-cj-text-secondary mt-1">Nota: {item.observaciones}</p>}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-md transition-colors ml-4"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen y Checkout */}
          <div className="lg:w-1/3">
            <div className="glass-panel p-6 sticky top-24">
              <h2 className="text-xl font-bold text-cj-text-primary border-b border-cj-border pb-4 mb-4">Confirmar Compra</h2>

              {/* SC-08 (FEAT-Historial-v2.4): selector tipo de documento */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-cj-text-secondary mb-2">Tipo de documento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['factura', 'nota_entrega'] as const).map((tipo) => {
                    const active = tipoDocumento === tipo;
                    const label = tipo === 'factura' ? 'Factura fiscal' : 'Nota de entrega';
                    const sub = tipo === 'factura' ? 'Requiere RIF + dirección' : 'Sin valor fiscal';
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

              <div className="mb-6">
                <label className="block text-sm font-medium text-cj-text-secondary mb-2">
                  Notas (Opcional)
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-cj-border rounded-lg bg-cj-bg-primary text-cj-text-primary placeholder:text-cj-text-muted p-3 focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue text-sm resize-none"
                  placeholder="Dirección de envío, instrucciones especiales..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </div>

              <div className="bg-cj-bg-secondary p-4 rounded-lg border border-cj-border mb-6 text-sm">
                <p className="text-cj-text-secondary mb-1">Total ítems: <span className="text-cj-text-primary font-mono">{cart?.items?.length || 0}</span></p>
                <p className="text-cj-text-secondary text-xs mt-3">
                  Al confirmar, se generará una factura y el stock se reservará automáticamente.
                </p>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isEmpty || submitting}
                className="w-full flex justify-center py-3 px-4 btn-primary group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Procesando...' : (
                  <span className="flex items-center gap-2">
                    Confirmar Compra <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Cart;
