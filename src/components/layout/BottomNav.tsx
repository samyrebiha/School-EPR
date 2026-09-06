import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CheckSquare,
  Plus,
  DollarSign,
  UserPlus,
  BookOpen,
  DoorOpen,
  FileBarChart,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type QuickActionType = 'payment' | 'course' | 'teacher' | 'room' | 'reports';

export interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onTriggerQuickAction?: (action: QuickActionType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activePage,
  onNavigate,
  onTriggerQuickAction,
}) => {
  const { isReceptionMode } = useAuth();
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'teachers', label: 'الأساتذة', icon: Users },
    { id: 'courses', label: 'الأفواج', icon: GraduationCap },
    { id: 'attendance', label: 'الحضور', icon: CheckSquare },
  ];

  const handleAction = (action: QuickActionType) => {
    setIsQuickActionOpen(false);
    if (onTriggerQuickAction) {
      onTriggerQuickAction(action);
    }
  };

  return (
    <>
      {/* Floating Bottom Nav Container for Mobile & iPad */}
      <nav className="mobile-bottom-nav-container" aria-label="شريط التنقل السفلي">
        {/* Navigation Capsule Bar */}
        <div className="mobile-bottom-nav-capsule">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const IconComponent = item.icon;
            const itemColor = isActive ? 'var(--color-primary)' : '#4A5568';

            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
              >
                <span className="mobile-nav-icon">
                  <IconComponent size={20} color={itemColor} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                {isActive && (
                  <span className="mobile-nav-label" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Floating Quick Action Button (+) */}
        <button
          type="button"
          className="mobile-bottom-nav-fab"
          onClick={() => setIsQuickActionOpen(true)}
          aria-label="إجراء سريع جديد"
          title="إجراء سريع"
        >
          <Plus size={24} color="#ffffff" strokeWidth={2.8} />
        </button>
      </nav>

      {/* Quick Action Modal / Sheet */}
      {isQuickActionOpen && (
        <div
          className="mobile-quick-actions-backdrop"
          onClick={() => setIsQuickActionOpen(false)}
        >
          <div
            className="mobile-quick-actions-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="mobile-quick-actions-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  إجراء سريع جديد
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  اختر العملية لفتح نموذج الإضافة مباشرة
                </p>
              </div>
              <button
                type="button"
                className="mobile-quick-actions-close"
                onClick={() => setIsQuickActionOpen(false)}
                aria-label="إغلاق"
              >
                <X size={18} color="var(--color-text-secondary)" />
              </button>
            </div>

            {/* Quick Action Grid Items */}
            <div className="mobile-quick-actions-grid">
              <button
                type="button"
                className="mobile-quick-action-btn"
                onClick={() => handleAction('payment')}
              >
                <div className="mobile-quick-action-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                  <DollarSign size={22} color="var(--color-success)" />
                </div>
                <div className="mobile-quick-action-text">
                  <div className="mobile-quick-action-title">تسجيل دفع نقداً</div>
                  <div className="mobile-quick-action-desc">فتح سند قبض فوري للتلميذ</div>
                </div>
              </button>

              <button
                type="button"
                className="mobile-quick-action-btn"
                onClick={() => handleAction('course')}
              >
                <div className="mobile-quick-action-icon" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                  <BookOpen size={22} color="var(--color-primary)" />
                </div>
                <div className="mobile-quick-action-text">
                  <div className="mobile-quick-action-title">إضافة فوج جديد</div>
                  <div className="mobile-quick-action-desc">فتح نموذج إنشاء دورة أو فوج</div>
                </div>
              </button>

              <button
                type="button"
                className="mobile-quick-action-btn"
                onClick={() => handleAction('teacher')}
              >
                <div className="mobile-quick-action-icon" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                  <UserPlus size={22} color="var(--color-info)" />
                </div>
                <div className="mobile-quick-action-text">
                  <div className="mobile-quick-action-title">إضافة أستاذ مؤطر</div>
                  <div className="mobile-quick-action-desc">فتح نموذج الأستاذ وطريقة الأتعاب</div>
                </div>
              </button>

              <button
                type="button"
                className="mobile-quick-action-btn"
                onClick={() => handleAction('room')}
              >
                <div className="mobile-quick-action-icon" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                  <DoorOpen size={22} color="var(--color-warning)" />
                </div>
                <div className="mobile-quick-action-text">
                  <div className="mobile-quick-action-title">إضافة قاعة أو مخبر</div>
                  <div className="mobile-quick-action-desc">فتح نموذج إضافة قاعة وتجهيزاتها</div>
                </div>
              </button>

              {!isReceptionMode && (
                <button
                  type="button"
                  className="mobile-quick-action-btn"
                  onClick={() => {
                    setIsQuickActionOpen(false);
                    onNavigate('students');
                  }}
                >
                  <div className="mobile-quick-action-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                    <GraduationCap size={22} color="#2563eb" />
                  </div>
                  <div className="mobile-quick-action-text">
                    <div className="mobile-quick-action-title">إدارة وسجل التلاميذ</div>
                    <div className="mobile-quick-action-desc">عرض قائمة كل التلاميذ والاشتراكات</div>
                  </div>
                </button>
              )}

              {!isReceptionMode && (
                <button
                  type="button"
                  className="mobile-quick-action-btn"
                  onClick={() => handleAction('reports')}
                >
                  <div className="mobile-quick-action-icon" style={{ backgroundColor: 'rgba(23, 107, 103, 0.1)', color: 'var(--color-primary)' }}>
                    <FileBarChart size={22} color="var(--color-primary)" />
                  </div>
                  <div className="mobile-quick-action-text">
                    <div className="mobile-quick-action-title">التقارير والإحصائيات</div>
                    <div className="mobile-quick-action-desc">استخراج وطباعة تقرير PDF</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
