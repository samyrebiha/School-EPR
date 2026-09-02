import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-12) var(--space-6)',
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--color-border-strong)',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-bg-surface-secondary)',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-4)',
        }}
      >
        {icon || <Inbox size={26} strokeWidth={1.5} />}
      </div>

      <h4
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {title}
      </h4>

      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '380px',
          lineHeight: 1.5,
          marginBottom: actionText ? 'var(--space-5)' : 0,
        }}
      >
        {description}
      </p>

      {actionText && onAction && (
        <Button variant="primary" onClick={onAction} rightIcon={actionIcon}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
