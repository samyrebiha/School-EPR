import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, AppPortalMode } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  portalMode: AppPortalMode;
  isAdminMode: boolean;
  isReceptionMode: boolean;
  login: (schoolName: string, email?: string, schoolId?: string) => void;
  logout: () => void;
  switchToAdmin: () => void;
  switchToReception: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Always default to null so the user is greeted directly with the login form
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('school_saas_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Portal mode: Defaults to reception. Turns to admin if secret hash/param #admin is used or stored in session
  const [portalMode, setPortalMode] = useState<AppPortalMode>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    if (hash === '#admin' || hash === '#direction' || search.includes('portal=admin')) {
      return 'admin';
    }
    const session = typeof window !== 'undefined' ? sessionStorage.getItem('school_portal_mode') : null;
    return session === 'admin' ? 'admin' : 'reception';
  });

  // Listen to secret link/hash in the URL (e.g. #admin)
  React.useEffect(() => {
    const handleCheckSecretHash = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === '#admin' || hash === '#direction' || search.includes('portal=admin')) {
        setPortalMode('admin');
        sessionStorage.setItem('school_portal_mode', 'admin');
      } else if (hash === '#reception') {
        setPortalMode('reception');
        sessionStorage.setItem('school_portal_mode', 'reception');
      }
    };

    window.addEventListener('hashchange', handleCheckSecretHash);
    return () => window.removeEventListener('hashchange', handleCheckSecretHash);
  }, []);

  const switchToAdmin = () => {
    setPortalMode('admin');
    sessionStorage.setItem('school_portal_mode', 'admin');
    window.location.hash = 'admin';
  };

  const switchToReception = () => {
    setPortalMode('reception');
    sessionStorage.setItem('school_portal_mode', 'reception');
    // Clear hash without reload
    if (window.location.hash === '#admin' || window.location.hash === '#direction') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const login = (schoolName: string, email: string = 'admin@school.dz', schoolId: string = 'school-default') => {
    const newUser: User = {
      id: `usr-${schoolId}`,
      name: schoolName,
      email,
      role: 'school_owner',
      schoolId,
    };
    setUser(newUser);
    localStorage.setItem('school_saas_auth_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('school_saas_auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        portalMode,
        isAdminMode: portalMode === 'admin',
        isReceptionMode: portalMode === 'reception',
        login,
        logout,
        switchToAdmin,
        switchToReception,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
