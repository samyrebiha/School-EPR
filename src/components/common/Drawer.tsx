import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '480px',
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
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-content" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div
          style={{
            padding: 'var(--space-5)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)', lineHeight: 1.4 }}>
                {subtitle}
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
              backgroundColor: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)' }}>
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: 'var(--space-4) var(--space-5)',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-surface-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

