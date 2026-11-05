import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { ToastProvider } from './contexts/ToastContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { DataProvider } from './contexts/DataContext';
import { TypographyProvider } from './contexts/TypographyContext';
import { AppLayout } from './components/layout/AppLayout';
import { QuickActionType } from './components/layout/BottomNav';
import { AdminMaintenanceScreen } from './components/common/AdminMaintenanceScreen';

import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Teachers } from './pages/teachers/Teachers';
import { Courses } from './pages/courses/Courses';
import { Schedule } from './pages/schedule/Schedule';
import { Rooms } from './pages/rooms/Rooms';
import { Attendance } from './pages/attendance/Attendance';
import { Settings } from './pages/settings/Settings';
import { SuperAdmin } from './pages/super-admin/SuperAdmin';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [activePage, setActivePage] = useState<string>('dashboard');

  // Direct modal trigger states for Quick Actions
  const [openAddCourseModal, setOpenAddCourseModal] = useState(false);
  const [openAddTeacherModal, setOpenAddTeacherModal] = useState(false);
  const [openAddRoomModal, setOpenAddRoomModal] = useState(false);

  // Admin maintenance screen state
  const [isAdminMaintenance, setIsAdminMaintenance] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    return hash === '#admin' || hash === '#direction' || search.includes('portal=admin');
  });

  // Secret URL listener for Super Admin Portal (#super-admin or ?portal=super-admin) & Admin Maintenance
  useEffect(() => {
    const checkSecretRoute = () => {
      const hash = window.location.hash;
      const search = window.location.search;

      if (hash === '#admin' || hash === '#direction' || search.includes('portal=admin')) {
        setIsAdminMaintenance(true);
      } else {
        setIsAdminMaintenance(false);
      }

      if (hash === '#super-admin' || search.includes('super-admin')) {
        setActivePage('super-admin');
      }
    };

    checkSecretRoute();
    window.addEventListener('hashchange', checkSecretRoute);
    return () => window.removeEventListener('hashchange', checkSecretRoute);
  }, []);

  // 🛑 Admin Maintenance Screen: Displays fullscreen brand primary color with white maintenance message
  if (isAdminMaintenance) {
    return <AdminMaintenanceScreen />;
  }

  // Super Admin: Completely Standalone Dedicated Fullscreen Layout (NO school sidebar, NO school topbar)
  if (activePage === 'super-admin') {
    return (
      <SuperAdmin
        onExit={() => {
          window.location.hash = '';
          setActivePage('dashboard');
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleTriggerQuickAction = (action: QuickActionType) => {
    if (action === 'course') {
      setActivePage('courses');
      setOpenAddCourseModal(true);
    } else if (action === 'teacher') {
      setActivePage('teachers');
      setOpenAddTeacherModal(true);
    } else if (action === 'room') {
      setActivePage('rooms');
      setOpenAddRoomModal(true);
    }
  };

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={(page) => setActivePage(page)} />;
      case 'teachers':
        return (
          <Teachers
            isAddModalOpenInitially={openAddTeacherModal}
            onCloseAddModalInitially={() => setOpenAddTeacherModal(false)}
          />
        );
      case 'courses':
        return (
          <Courses
            isAddModalOpenInitially={openAddCourseModal}
            onCloseAddModalInitially={() => setOpenAddCourseModal(false)}
          />
        );
      case 'schedule':
        return <Schedule />;
      case 'rooms':
        return (
          <Rooms
            isAddModalOpenInitially={openAddRoomModal}
            onCloseAddModalInitially={() => setOpenAddRoomModal(false)}
          />
        );
      case 'attendance':
        return <Attendance />;
      case 'cards_directory':
        return <Attendance initialViewMode="cards_directory" />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={(page) => setActivePage(page)} />;
    }
  };

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={(p) => setActivePage(p)}
      onTriggerQuickAction={handleTriggerQuickAction}
    >
      {renderCurrentPage()}
    </AppLayout>
  );
}

export function App() {
  return (
    <ToastProvider>
      <NetworkProvider>
        <DataProvider>
          <SchoolProvider>
            <AuthProvider>
              <TypographyProvider>
                <AppContent />
              </TypographyProvider>
            </AuthProvider>
          </SchoolProvider>
        </DataProvider>
      </NetworkProvider>
    </ToastProvider>
  );
}

export default App;
