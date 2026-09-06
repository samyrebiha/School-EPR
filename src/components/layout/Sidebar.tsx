import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Building2,
  CheckCircle2,
  CreditCard,
  Wallet,
  BarChart3,
  Settings,
  BookOpen,
  School,
  GraduationCap,
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, ShieldAlert, UserCheck } from 'lucide-react';

export interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentSchool } = useSchool();
  const { isReceptionMode, isAdminMode, switchToReception } = useAuth();

  const allNavGroups: NavGroup[] = [
    {
      groupLabel: '',
      items: [
        {
          id: 'dashboard',
          label: isReceptionMode ? 'الرئيسية (الاستقبال)' : 'الرئيسية (الإدارة)',
          icon: <LayoutDashboard size={18} />,
        },
      ],
    },
    {
      groupLabel: 'الإدارة والتعليم',
      items: [
        {
          id: 'teachers',
          label: 'الأساتذة',
          icon: <Users size={18} />,
        },
        {
          id: 'courses',
          label: 'الدورات والأفواج الجماعية',
          icon: <BookOpen size={18} />,
        },
        {
          id: 'schedule',
          label: 'الجدول والتوقيت',
          icon: <Calendar size={18} />,
        },
        {
          id: 'rooms',
          label: 'القاعات والمخابر',
          icon: <Building2 size={18} />,
        },
        {
          id: 'attendance',
          label: 'الحضور والغياب',
          icon: <CheckCircle2 size={18} />,
        },
        // Admin only: Students Management
        ...(!isReceptionMode
          ? [
              {
                id: 'students',
                label: 'إدارة التلاميذ',
                icon: <GraduationCap size={18} />,
              },
            ]
          : []),
      ],
    },
    {
      groupLabel: 'المالية وسندات القبض',
      items: [
        {
          id: 'payments',
          label: isReceptionMode ? 'تسجيل وسندات القبض' : 'المدفوعات والخزينة',
          icon: <CreditCard size={18} />,
        },
        // Admin only
        ...(!isReceptionMode
          ? [
              {
                id: 'payroll',
                label: 'مستحقات الأساتذة',
                icon: <Wallet size={18} />,
              },
            ]
          : []),
      ],
    },
    // Admin only: Analytics & Settings
    ...(!isReceptionMode
      ? [
          {
            groupLabel: 'التحليلات',
            items: [
              {
                id: 'reports',
                label: 'التقارير والإحصائيات',
                icon: <BarChart3 size={18} />,
              },
            ],
          },
          {
            groupLabel: '',
            items: [
              {
                id: 'settings',
                label: 'الإعدادات',
                icon: <Settings size={18} />,
              },
            ],
          },
        ]
      : []),
  ];

  const navGroups = allNavGroups.filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="modal-overlay md:block"
          style={{ zIndex: 45 }}
          onClick={onCloseMobile}
        />
      )}

      <aside className={`saas-sidebar ${isOpenMobile ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo">
            <School size={20} />
          </div>
          <div className="brand-text">
            <h2>{currentSchool.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: '12px',
                  backgroundColor: isReceptionMode ? 'var(--color-bg-surface-secondary)' : '#dbeafe',
                  color: isReceptionMode ? 'var(--color-text-secondary)' : '#1e40af',
                  border: isReceptionMode ? '1px solid var(--color-border)' : '1px solid #bfdbfe',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isReceptionMode ? (
                  <>
                    <UserCheck size={11} /> مكتب الاستقبال
                  </>
                ) : (
                  <>
                    <ShieldAlert size={11} /> لوحة الإدارة
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.groupLabel && (
                <div className="nav-group-label">{group.groupLabel}</div>
              )}
              {group.items.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <div
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onNavigate(item.id);
                      onCloseMobile();
                    }}
                  >
                    <span className="nav-item-icon">{item.icon}</span>
                    <span className="nav-item-text">{item.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          {isAdminMode ? (
            <button
              onClick={() => {
                switchToReception();
                onNavigate('dashboard');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-md)',
                color: '#1e40af',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <LogOut size={14} /> العودة لوضع الاستقبال
            </button>
          ) : (
            <div>منصة إدارة المدارس والمراكز</div>
          )}
        </div>
      </aside>
    </>
  );
};

