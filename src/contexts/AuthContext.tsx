import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (schoolName: string, email?: string, schoolId?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Always default to null so the user is greeted directly with the login form
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('school_saas_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

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
        login,
        logout,
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
