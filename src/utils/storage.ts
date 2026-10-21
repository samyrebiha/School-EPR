import {
  SchoolTenant,
  Teacher,
  Course,
  Classroom,
  PaymentTransaction,
  DebtRecord,
  Expense,
} from '../types';

const STORAGE_KEYS = {
  SCHOOLS: 'school_saas_schools',
  CURRENT_SCHOOL_ID: 'school_saas_current_school_id',
  TEACHERS: 'school_saas_teachers',
  COURSES: 'school_saas_courses',
  CLASSROOMS: 'school_saas_classrooms',
  TRANSACTIONS: 'school_saas_transactions',
  DEBTS: 'school_saas_debts',
  EXPENSES: 'school_saas_expenses',
};

const defaultSampleExpenses: Expense[] = [
  {
    id: 'exp-1',
    schoolId: 'school-default',
    receiptNumber: 'EXP-2026-001',
    title: 'فاتورة الكهرباء والغاز',
    category: 'electricity',
    amount: 12500,
    date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().split('T')[0],
    paymentMethod: 'نقداً',
    recipientName: 'شركة سونلغاز',
    notes: 'استهلاك كهرباء القاعات والتكييف',
  },
  {
    id: 'exp-2',
    schoolId: 'school-default',
    receiptNumber: 'EXP-2026-002',
    title: 'اشتراك الإنترنت والألياف البصرية',
    category: 'internet',
    amount: 4500,
    date: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split('T')[0],
    paymentMethod: 'نقداً',
    recipientName: 'اتصالات الجزائر',
    notes: 'خدمة التدفق العالي لقاعات التدريس',
  },
  {
    id: 'exp-3',
    schoolId: 'school-default',
    receiptNumber: 'EXP-2026-003',
    title: 'أجرة عامل النظافة والاستقبال',
    category: 'salary',
    amount: 35000,
    date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0],
    recipientName: 'كريم بن مسعود',
    paymentMethod: 'نقداً',
    notes: 'أجرة شهرية كاملة',
  },
];

// Initial default school if localStorage is empty
const defaultInitialSchools: SchoolTenant[] = [
  {
    id: 'school-1788371708568',
    name: 'مدرسة النور',
    code: 'SCH-9861',
    username: 'nour2026',
    password: 'adminnour2006',
    phone: '0673818821',
    email: 'nour2026@school.dz',
    address: 'كوينين ، بجانب مسجد أبي بكر الصديق ، الوادي',
    wilaya: 'كوينين ، الوادي',
    plan: 'professional',
    planStatus: 'active',
    subscriptionStart: '2026-09-02',
    subscriptionEnd: '2027-09-02',
    studentsCount: 0,
    revenueGenerated: 20000,
    logoText: 'مدرسة النور',
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

  getCurrentSchoolId: (): string => getStoredData(STORAGE_KEYS.CURRENT_SCHOOL_ID, 'school-1788371708568'),
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

  getExpenses: (): Expense[] => getStoredData(STORAGE_KEYS.EXPENSES, defaultSampleExpenses),
  setExpenses: (expenses: Expense[]) => setStoredData(STORAGE_KEYS.EXPENSES, expenses),

  clearAllData: () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
