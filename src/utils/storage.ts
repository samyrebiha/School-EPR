import {
  SchoolTenant,
  Teacher,
  Course,
  Classroom,
  PaymentTransaction,
  DebtRecord,
} from '../types';

const STORAGE_KEYS = {
  SCHOOLS: 'school_saas_schools',
  CURRENT_SCHOOL_ID: 'school_saas_current_school_id',
  TEACHERS: 'school_saas_teachers',
  COURSES: 'school_saas_courses',
  CLASSROOMS: 'school_saas_classrooms',
  TRANSACTIONS: 'school_saas_transactions',
  DEBTS: 'school_saas_debts',
};

// Initial default school if localStorage is empty
const defaultInitialSchools: SchoolTenant[] = [
  {
    id: 'school-default',
    name: 'مدرستي التعليمية',
    code: 'MY-SCHOOL-01',
    username: 'admin',
    password: 'password123',
    phone: '0550 00 00 00',
    email: 'admin@school.dz',
    address: 'المقر الرئيسي للمؤسسة',
    wilaya: 'الجزائر العاصمة (16)',
    plan: 'professional',
    planStatus: 'active',
    subscriptionStart: new Date().toISOString().split('T')[0],
    subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    studentsCount: 0,
    revenueGenerated: 30000,
    logoText: 'مدرستي التعليمية',
  },
];

export function getStoredData<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

export const storage = {
  getSchools: (): SchoolTenant[] => getStoredData(STORAGE_KEYS.SCHOOLS, defaultInitialSchools),
  setSchools: (schools: SchoolTenant[]) => setStoredData(STORAGE_KEYS.SCHOOLS, schools),

  getCurrentSchoolId: (): string => getStoredData(STORAGE_KEYS.CURRENT_SCHOOL_ID, 'school-default'),
  setCurrentSchoolId: (id: string) => setStoredData(STORAGE_KEYS.CURRENT_SCHOOL_ID, id),

  getTeachers: (): Teacher[] => getStoredData(STORAGE_KEYS.TEACHERS, []),
  setTeachers: (teachers: Teacher[]) => setStoredData(STORAGE_KEYS.TEACHERS, teachers),

  getCourses: (): Course[] => getStoredData(STORAGE_KEYS.COURSES, []),
  setCourses: (courses: Course[]) => setStoredData(STORAGE_KEYS.COURSES, courses),

  getClassrooms: (): Classroom[] => getStoredData(STORAGE_KEYS.CLASSROOMS, []),
  setClassrooms: (classrooms: Classroom[]) => setStoredData(STORAGE_KEYS.CLASSROOMS, classrooms),

  getTransactions: (): PaymentTransaction[] => getStoredData(STORAGE_KEYS.TRANSACTIONS, []),
  setTransactions: (transactions: PaymentTransaction[]) => setStoredData(STORAGE_KEYS.TRANSACTIONS, transactions),

  getDebts: (): DebtRecord[] => getStoredData(STORAGE_KEYS.DEBTS, []),
  setDebts: (debts: DebtRecord[]) => setStoredData(STORAGE_KEYS.DEBTS, debts),

  clearAllData: () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
