import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { ToastProvider } from './contexts/ToastContext';
import { DataProvider } from './contexts/DataContext';
import { AppLayout } from './components/layout/AppLayout';
import { QuickActionType } from './components/layout/BottomNav';

import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Teachers } from './pages/teachers/Teachers';
import { Courses } from './pages/courses/Courses';
import { Schedule } from './pages/schedule/Schedule';
import { Rooms } from './pages/rooms/Rooms';
import { Attendance } from './pages/attendance/Attendance';
import { Payments } from './pages/payments/Payments';
import { Payroll } from './pages/payroll/Payroll';
import { Reports } from './pages/reports/Reports';
import { Settings } from './pages/settings/Settings';
import { SuperAdmin } from './pages/super-admin/SuperAdmin';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [activePage, setActivePage] = useState<string>('dashboard');

  // Direct modal trigger states for Quick Actions
  const [openRecordPaymentModal, setOpenRecordPaymentModal] = useState(false);
  const [openAddCourseModal, setOpenAddCourseModal] = useState(false);
  const [openAddTeacherModal, setOpenAddTeacherModal] = useState(false);
  const [openAddRoomModal, setOpenAddRoomModal] = useState(false);

  // Secret URL listener for Super Admin Portal (#super-admin or ?portal=super-admin)
  useEffect(() => {
    const checkSecretRoute = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === '#super-admin' || search.includes('super-admin')) {
        setActivePage('super-admin');
      }
    };

    checkSecretRoute();
    window.addEventListener('hashchange', checkSecretRoute);
    return () => window.removeEventListener('hashchange', checkSecretRoute);
  }, []);

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
    if (action === 'payment') {
      setActivePage('payments');
      setOpenRecordPaymentModal(true);
    } else if (action === 'course') {
      setActivePage('courses');
      setOpenAddCourseModal(true);
    } else if (action === 'teacher') {
      setActivePage('teachers');
      setOpenAddTeacherModal(true);
    } else if (action === 'room') {
      setActivePage('rooms');
      setOpenAddRoomModal(true);
    } else if (action === 'reports') {
      setActivePage('reports');
    }
  };

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={(page) => setActivePage(page)}
            onOpenRecordPayment={() => {
              setActivePage('payments');
              setOpenRecordPaymentModal(true);
            }}
          />
        );
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
      case 'payments':
        return (
          <Payments
            isRecordModalOpenInitially={openRecordPaymentModal}
            onCloseRecordModalInitially={() => setOpenRecordPaymentModal(false)}
          />
        );
      case 'payroll':
        return <Payroll />;
      case 'reports':
        return <Reports />;
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
    <DataProvider>
      <SchoolProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </SchoolProvider>
    </DataProvider>
  );
}

export default App;
