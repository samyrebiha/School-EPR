import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Building,
  LogOut,
  Menu,
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';

export interface TopbarProps {
  onOpenSearch: () => void;
  onToggleMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenSearch,
  onToggleMobileSidebar,
}) => {
  const { currentSchool } = useSchool();
  const { logout } = useAuth();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const schoolInitial = currentSchool?.name ? currentSchool.name.trim().slice(0, 1) : 'م';

  return (
    <header className="saas-topbar">
      {/* Right Side (RTL Start): Mobile Hamburger + Search trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: '1 1 auto', minWidth: 0 }}>
        <button
          onClick={onToggleMobileSidebar}
          className="topbar-mobile-toggle"
          style={{
            minWidth: 'var(--size-touch-min)',
            minHeight: 'var(--size-touch-min)',
            width: 'var(--size-touch-min)',
            height: 'var(--size-touch-min)',
            padding: 0,
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: 'transparent',
          }}
          aria-label="فتح القائمة الجانبية"
        >
          <Menu size={22} />
        </button>

        {/* Global Search trigger bar */}
        <button
          onClick={onOpenSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2-5)',
            padding: '0 var(--space-3-5)',
            height: 'var(--height-input)',
            minHeight: 'var(--height-input)',
            width: '100%',
            maxWidth: '360px',
            backgroundColor: 'var(--color-bg-surface-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-muted)',
            fontSize: '0.875rem',
            textAlign: 'right',
            transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
            cursor: 'pointer',
          }}
        >
          <Search size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            بحث سريع في المنصة...
          </span>
          <span
            className="md:hidden"
            style={{
              padding: '2px 6px',
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.6875rem',
              color: 'var(--color-text-secondary)',
              fontFamily: 'monospace',
              flexShrink: 0,
            }}
          >
            Ctrl + K
          </span>
        </button>
      </div>

      {/* Left Side (RTL End): School Account & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
        {/* School Name Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-1-5) var(--space-3)',
            backgroundColor: 'var(--color-bg-surface-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            minHeight: '36px',
          }}
        >
          <Building size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          <span className="school-name-text">
            {currentSchool.name}
          </span>
        </div>

        {/* School User Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid transparent',
              transition: 'background var(--transition-fast)',
              cursor: 'pointer',
              minHeight: 'var(--size-touch-min)',
            }}
            aria-label="قائمة المستخدم"
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9375rem',
                flexShrink: 0,
              }}
            >
              {schoolInitial}
            </div>
            <div className="user-info-text" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                {currentSchool.name}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                إدارة المؤسسة
              </div>
            </div>
          </button>

          {isUserMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '230px',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                padding: 'var(--space-2)',
                zIndex: 100,
                animation: 'fadeIn 120ms ease forwards',
              }}
            >
              <div
                style={{
                  padding: 'var(--space-1-5) var(--space-2-5)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}
              >
                {currentSchool.name}
              </div>
              <div
                style={{
                  padding: '0 var(--space-2-5) var(--space-2) var(--space-2-5)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                المستخدم: <code>{currentSchool.username}</code>
              </div>

              <button
                onClick={() => {
                  logout();
                  setIsUserMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-2-5)',
                  marginTop: 'var(--space-1)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  minHeight: 'var(--size-touch-min)',
                  backgroundColor: 'transparent',
                  textAlign: 'right',
                }}
              >
                <LogOut size={16} />
                <span>تسجيل الخروج من المدرسة</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

