import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  breadcrumbs,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-6)',
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-1)',
            flexWrap: 'wrap',
          }}
          aria-label="مسار التنقل"
        >
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span style={{ opacity: 0.5 }}>/</span>}
              <span
                style={{
                  color: idx === breadcrumbs.length - 1 ? 'var(--color-text-primary)' : 'inherit',
                  fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                }}
              >
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <h1 className="heading-page">
            {title}
          </h1>
          {description && (
            <p
              style={{
                fontSize: '0.9375rem',
                color: 'var(--color-text-secondary)',
                marginTop: 'var(--space-1)',
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2-5)',
              flexWrap: 'wrap',
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

