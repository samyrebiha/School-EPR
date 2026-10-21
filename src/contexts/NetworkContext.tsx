import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { NetworkStatusModal } from '../components/common/NetworkStatusModal';
import { useToast } from './ToastContext';

export interface NetworkContextType {
  isOnline: boolean;
  isOfflineModalOpen: boolean;
  openOfflineModal: () => void;
  closeOfflineModal: () => void;
  checkConnection: () => Promise<boolean>;
  isChecking: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const { success, warning } = useToast();

  const verifyRealConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    try {
      // Lightweight fetch with no-cache and short timeout to check real network connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Using a reliable, lightweight public endpoint or origin check
      const res = await fetch(`https://dns.google/resolve?name=google.com&type=A&_t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);
      return !!(res && (res.ok || res.status === 200));
    } catch {
      // Fallback to navigator.onLine if external ping blocked by CORS
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
  }, []);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setIsOfflineModalOpen(false);
    success('تم استعادة الاتصال بالإنترنت بنجاح! جاري التحديث والمزامنة التلقائية...', 'الاتصال متوفر');
  }, [success]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setIsOfflineModalOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();
    }

    // Periodic heartbeat every 45s to detect silent disconnects
    const heartbeat = setInterval(async () => {
      const realStatus = await verifyRealConnection();
      if (!realStatus && isOnline) {
        handleOffline();
      } else if (realStatus && !isOnline) {
        handleOnline();
      }
    }, 45000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(heartbeat);
    };
  }, [handleOnline, handleOffline, verifyRealConnection, isOnline]);

  const checkConnection = async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const active = await verifyRealConnection();
      setIsOnline(active);
      if (active) {
        handleOnline();
        return true;
      } else {
        warning('ما زال الاتصال بالإنترنت مقطوعاً. أنت تعمل في وضع عدم الاتصال حالياً مع الحفظ التلقائي.', 'لا يوجد اتصال');
        return false;
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isOfflineModalOpen,
        openOfflineModal: () => setIsOfflineModalOpen(true),
        closeOfflineModal: () => setIsOfflineModalOpen(false),
        checkConnection,
        isChecking,
      }}
    >
      {children}

      {/* Internet Disconnected Popup Modal */}
      <NetworkStatusModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        onCheckConnection={checkConnection}
        isChecking={isChecking}
        isOnline={isOnline}
      />
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
