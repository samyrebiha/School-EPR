import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { BottomNav, QuickActionType } from './BottomNav';

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

  return (
    <div className="app-main-layout">
      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="app-content-wrapper">
        {/* Topbar Header */}
        <Topbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

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
