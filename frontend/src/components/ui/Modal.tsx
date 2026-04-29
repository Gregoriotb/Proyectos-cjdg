/**
 * SC-09 (FEAT-Historial-v2.4) — Modal base reutilizable.
 *
 * - Portal a document.body
 * - ESC cierra
 * - Click en backdrop cierra
 * - Bloquea scroll del body mientras está abierto
 * - 3 variantes vía size: sm | md | lg
 * - Footer slot opcional
 *
 * Uso:
 *   <Modal open={isOpen} onClose={() => setOpen(false)} title="Confirmar">
 *     contenido...
 *   </Modal>
 */
import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  hideClose?: boolean;
  closeOnBackdrop?: boolean;
}

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose = false,
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${SIZES[size]} bg-cj-surface border border-cj-border rounded-xl shadow-cj-xl overflow-hidden flex flex-col max-h-[90vh]`}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-cj-border">
            <div className="min-w-0">
              {title && <h3 className="text-base font-semibold text-cj-text-primary truncate">{title}</h3>}
              {description && <p className="text-xs text-cj-text-muted mt-0.5">{description}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="p-1 -m-1 text-cj-text-muted hover:text-cj-text-primary hover:bg-cj-bg-primary rounded transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="px-5 py-4 overflow-y-auto flex-1 text-sm text-cj-text-secondary">
          {children}
        </div>

        {footer && (
          <div className="px-5 py-3 border-t border-cj-border bg-cj-bg-primary flex justify-end gap-2 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
