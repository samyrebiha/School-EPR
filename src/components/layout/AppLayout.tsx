import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { BottomNav, QuickActionType } from './BottomNav';
import { useNetwork } from '../../contexts/NetworkContext';
import { WifiOff, ArrowLeft } from 'lucide-react';

export interface AppLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onTriggerQuickAction?: (action: QuickActionType) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activePage,
  onNavigate,
  onTriggerQuickAction,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('school_sidebar_collapsed') === 'true';
  });
  const { isOnline, openOfflineModal } = useNetwork();

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('school_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-main-layout">
      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main Container */}
      <div className="app-content-wrapper">
        {/* Topbar Header */}
        <Topbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onToggleDesktopSidebar={toggleSidebarCollapse}
          isSidebarCollapsed={isSidebarCollapsed}
          onNavigate={onNavigate}
        />

        {/* Offline Warning Banner */}
        {!isOnline && (
          <div
            onClick={openOfflineModal}
            style={{
              backgroundColor: '#fffbeb',
              borderBottom: '1px solid #fde68a',
              color: '#92400e',
              padding: '9px 20px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              zIndex: 30,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'background-color 0.15s ease',
            }}
            title="انقر لفتح نافذة فحص الاتصال والتفاصيل"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WifiOff size={16} color="#d97706" style={{ flexShrink: 0 }} />
              <span>
                أنت تعمل حالياً في <strong>وضع عدم الاتصال (Offline)</strong> — نظام الحفظ التلقائي المحلي نشط ويعمل بأمان ✓
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
              <span>إعادة فحص الاتصال</span>
              <ArrowLeft size={14} />
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="app-main-container">
          {children}
        </main>
      </div>

      {/* Floating Bottom Navigation Bar (Phones & iPads Only) */}
      <BottomNav
        activePage={activePage}
        onNavigate={onNavigate}
        onTriggerQuickAction={onTriggerQuickAction}
      />

      {/* Global Search Dialog (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
