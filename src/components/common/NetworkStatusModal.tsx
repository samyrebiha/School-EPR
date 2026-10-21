import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, ShieldCheck, HardDrive } from 'lucide-react';
import { Button } from './Button';

export interface NetworkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckConnection: () => Promise<boolean>;
  isChecking: boolean;
  isOnline: boolean;
}

export const NetworkStatusModal: React.FC<NetworkStatusModalProps> = ({
  isOpen,
  onClose,
  onCheckConnection,
  isChecking,
  isOnline,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.2)',
          maxWidth: '520px',
          width: '100%',
          overflow: 'hidden',
          textAlign: 'center',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            backgroundColor: '#fee2e2',
            padding: '24px 20px 20px',
            borderBottom: '1px solid #fecaca',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Animated WifiOff Icon Bubble */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 0 8px rgba(239, 68, 68, 0.2)',
            }}
          >
            <WifiOff size={32} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
              تنبيه: انقطع الاتصال بالإنترنت
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#b91c1c', margin: '4px 0 0', fontWeight: 500 }}>
              أنت تعمل حالياً في وضع عدم الاتصال (Offline Mode)
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Auto-Save Reassurance Box */}
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1.5px solid #a7f3d0',
              borderRadius: '12px',
              padding: '14px 16px',
              textAlign: 'right',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={24} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#065f46' }}>
                ✓ ميزة الحفظ التلقائي (Auto-Saving) نشطة ومؤمنة
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#047857', marginTop: '4px', lineHeight: 1.5 }}>
                لا داعي للقلق أبداً: جميع العمليات (تسجيل الحضور، الاشتراكات، الإضافات، وتعديل الأسعار) تُحفظ محلياً على جهازك بصورة فورية وتلقائية ولن تفقد أي معلومة.
              </div>
            </div>
          </div>

          {/* Sync Explanation Box */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            <HardDrive size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <span>
              ستتم المزامنة والتحديث والريفريش التلقائي مع السيرفر السحابي بمجرد عودة الاتصال بشبكة الإنترنت.
            </span>
          </div>

          {/* Connection status message */}
          {isOnline ? (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#dcfce7',
                border: '1px solid #86efac',
                borderRadius: '8px',
                color: '#15803d',
                fontSize: '0.875rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={18} />
              تم استعادة الاتصال بالإنترنت بنجاح!
            </div>
          ) : null}
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '16px 24px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button
            type="button"
            variant="primary"
            onClick={onCheckConnection}
            disabled={isChecking}
            rightIcon={<RefreshCw size={16} className={isChecking ? 'spin-animation' : undefined} />}
            style={{
              backgroundColor: '#ef4444',
              borderColor: '#dc2626',
              minWidth: '160px',
              fontWeight: 700,
            }}
          >
            {isChecking ? 'جاري فحص الاتصال...' : 'إعادة فحص الاتصال الآن'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            style={{ minWidth: '160px' }}
          >
            متابعة العمل في وضع الأوفلاين
          </Button>
        </div>
      </div>
    </div>
  );
};
