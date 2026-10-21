import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  header,
  title,
  description,
  action,
  style,
}) => {
  return (
    <div className={`card ${className}`} style={style}>
      {(header || title || description || action) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {description && (
              <p className="card-description" style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                {description}
              </p>
            )}
          </div>
          {header}
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export interface StatCardProps {
  title: string;
  value: string | number;
  growth?: number;
  growthLabel?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  growth,
  growthLabel = 'مقارنة بالشهر الماضي',
  subtitle,
  icon,
  badge,
}) => {
  const isPositive = growth !== undefined && growth >= 0;

  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', gap: 'var(--space-2)' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {title}
        </span>
        {icon && (
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        {badge}
      </div>

      <div style={{ fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)', lineHeight: 1.2 }}>
        {value}
      </div>

      {growth !== undefined ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)', fontSize: '0.8125rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
              fontWeight: 600,
            }}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(growth)}%
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>{growthLabel}</span>
        </div>
      ) : subtitle ? (
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{subtitle}</div>
      ) : null}
    </div>
  );
};

