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
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';

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

  const navGroups: NavGroup[] = [
    {
      groupLabel: '',
      items: [
        {
          id: 'dashboard',
          label: 'الرئيسية',
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
      ],
    },
    {
      groupLabel: 'المالية',
      items: [
        {
          id: 'payments',
          label: 'المدفوعات',
          icon: <CreditCard size={18} />,
        },
        {
          id: 'payroll',
          label: 'مستحقات الأساتذة',
          icon: <Wallet size={18} />,
        },
      ],
    },
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
  ];

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
            <p>نظام الإدارة المدرسي</p>
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
          منصة إدارة المدارس والمراكز
        </div>
      </aside>
    </>
  );
};

