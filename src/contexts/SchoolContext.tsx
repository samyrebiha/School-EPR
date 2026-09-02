import React, { createContext, useContext, ReactNode } from 'react';
import { SchoolTenant } from '../types';
import { useData } from './DataContext';

interface SchoolContextType {
  currentSchool: SchoolTenant;
  schools: SchoolTenant[];
  switchSchool: (schoolId: string) => void;
  updateSchoolProfile: (data: Partial<SchoolTenant>) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentSchool, schools, setCurrentSchoolId, updateSchool } = useData();

  const switchSchool = (schoolId: string) => {
    setCurrentSchoolId(schoolId);
  };

  const updateSchoolProfile = (data: Partial<SchoolTenant>) => {
    updateSchool({
      ...currentSchool,
      ...data,
    });
  };

  return (
    <SchoolContext.Provider
      value={{
        currentSchool,
        schools,
        switchSchool,
        updateSchoolProfile,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
