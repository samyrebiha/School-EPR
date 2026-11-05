import React from 'react';
import { Wrench, ArrowRight } from 'lucide-react';

export const AdminMaintenanceScreen: React.FC = () => {
  const handleReturnToSchool = () => {
    // Clear hash and session
    window.location.hash = '';
    sessionStorage.removeItem('school_portal_mode');
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    window.location.reload();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999999,
        backgroundColor: 'var(--color-primary, #1e40af)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        color: '#ffffff',
        direction: 'rtl',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          maxWidth: '680px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }}
        >
          <Wrench size={44} color="#ffffff" />
        </div>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            margin: '8px 0 0',
            lineHeight: 1.4,
            color: '#ffffff',
            letterSpacing: '-0.02em',
          }}
        >
          إن صفحة الإدارة تحت الصيانة إلى يوم غير معلوم
        </h1>

        <p
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            opacity: 0.95,
            margin: '0',
            color: '#ffffff',
            lineHeight: 1.6,
          }}
        >
          شكراً لكم، إدارة نظام مدرستك...
        </p>

        <button
          type="button"
          onClick={handleReturnToSchool}
          style={{
            marginTop: '16px',
            padding: '12px 28px',
            backgroundColor: '#ffffff',
            color: 'var(--color-primary, #1e40af)',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.18)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <span>العودة لواجهة النظام الرئيسية</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

