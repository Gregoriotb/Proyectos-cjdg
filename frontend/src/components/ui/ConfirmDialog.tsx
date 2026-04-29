/**
 * SC-09 (FEAT-Historial-v2.4) — Diálogo de confirmación para acciones críticas.
 *
 * Compone Modal con un footer estándar de Cancelar / Confirmar.
 * Variantes:
 *   default: botón azul (cambios neutros)
 *   destructive: botón rojo (eliminaciones, cancelaciones)
 *   warning: botón amarillo (cambios reversibles potencialmente dañinos)
 */
import { ReactNode, useState } from 'react';
import { AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal';

export type ConfirmVariant = 'default' | 'destructive' | 'warning';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  children?: ReactNode;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
}

const BUTTON_BY_VARIANT: Record<ConfirmVariant, string> = {
  default: 'bg-cj-accent-blue hover:bg-cj-accent-blue-dark text-white',
  destructive: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
};

const ICON_BY_VARIANT: Record<ConfirmVariant, JSX.Element | null> = {
  default: null,
  destructive: <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />,
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  variant = 'default',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={description}
      size="sm"
      hideClose={busy}
      closeOnBackdrop={!busy}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 text-sm rounded-lg border border-cj-border text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-secondary disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 inline-flex items-center gap-2 ${BUTTON_BY_VARIANT[variant]}`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {ICON_BY_VARIANT[variant]}
        <div className="text-sm text-cj-text-secondary">{children}</div>
      </div>
    </Modal>
  );
}
