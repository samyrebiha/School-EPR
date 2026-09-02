import React from 'react';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  withDot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  withDot = true,
  className = '',
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {withDot && <span className="badge-dot" />}
      <span>{children}</span>
    </span>
  );
};
