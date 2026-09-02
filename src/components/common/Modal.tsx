import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = '540px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0, paddingLeft: 'var(--space-2)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              {title}
            </h3>
            {description && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)', lineHeight: 1.4 }}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              minWidth: 'var(--size-touch-min)',
              minHeight: 'var(--size-touch-min)',
              width: 'var(--size-touch-min)',
              height: 'var(--size-touch-min)',
              padding: 0,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background var(--transition-fast), color var(--transition-fast)',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              flexShrink: 0,
            }}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

