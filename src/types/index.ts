export type UserRole = 'school_owner' | 'receptionist';
export type AppPortalMode = 'reception' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  schoolId: string;
  avatarUrl?: string;
}

export interface SchoolTenant {
  id: string;
  name: string;
  code: string;
  username: string; // Custom username assigned by Platform Owner
  password: string; // Custom password assigned by Platform Owner
  phone: string;
  email: string;
  address: string;
  wilaya: string;
  plan: 'professional';
  planStatus: 'trial' | 'active' | 'suspended' | 'expired';
  subscriptionStart: string;
  subscriptionEnd: string;
  studentsCount?: number;
  revenueGenerated?: number;
  logoText: string;
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

export type AttendanceLogStatus = 'present' | 'absent_counted' | 'absent_uncounted' | 'renewed' | 'payment';

export interface SessionAttendanceLog {
  id: string;
  sessionNumber: number;
  date: string;
  time: string;
  status?: AttendanceLogStatus;
  type?: AttendanceLogStatus;
  notes?: string;
  amount?: number;
  receiptNumber?: string;
}

export interface TeacherPayoutLog {
  id: string;
  amount: number;
  date: string;
  paymentMethod: string;
  notes?: string;
  isCycleSettlement?: boolean;
  settledEarned?: number;
}

export interface Student {
  id: string;
  fullName: string;
  phone: string;
  gender: 'ذكر' | 'أنثى';
  academicLevel: string;
  parentName: string;
  parentPhone: string;
  parentRelation: 'أب' | 'أم' | 'ولي أمر';
  enrolledCourseTitle?: string;
  totalPaid: number;
  totalDebt: number;
  totalSessions?: number; // e.g. 5
  attendedSessions?: number; // e.g. 1
  attendanceLogs?: SessionAttendanceLog[];
  status: 'active' | 'inactive';
  registrationDate: string;
  schoolRegistrationPaid?: boolean;
  schoolRegistrationAmount?: number;
  schoolRegistrationDate?: string;
  notes?: string;
}

export type TeacherCompensationType = 'percentage_per_student' | 'percentage_per_course' | 'fixed_per_course';

export interface Teacher {
  id: string;
  schoolId?: string;
  fullName: string;
  phone: string;
  email: string;
  subject: string; // Free text
  specialization: string;
  compensationType: TeacherCompensationType; // Method of calculating payout
  commissionPercentage: number; // Agreed percentage (e.g. 60%)
  fixedCourseRate?: number; // Fixed amount per course (e.g. 25000 DZD)
  groupsCount: number;
  totalEarned: number;
  totalPaid: number;
  balanceDue: number;
  settledEarned?: number;
  lastSettledDate?: string;
  totalAttendedSessions?: number;
  totalCountedAbsences?: number;
  payoutHistory?: TeacherPayoutLog[];
  status: 'active' | 'inactive';
}

export interface Course {
  id: string;
  schoolId?: string;
  title: string;
  subject: string;
  academicLevel: string;
  teacherId: string;
  teacherName: string;
  monthlyPrice: number; // in DZD
  maxStudents: number;
  enrolledStudents: number;
  enrolledList: Student[];
  totalSessionsDefault?: number; // Default total sessions (e.g. 5)
  roomName: string;
  scheduleDays: string[];
  scheduleTime: string;
  type: 'group' | 'support' | 'intensive';
  status: 'active' | 'upcoming' | 'completed';
}

export interface Classroom {
  id: string;
  schoolId?: string;
  name: string;
  roomNumber: string;
  capacity: number;
  type: 'lecture' | 'lab' | 'small_group';
  equipment: string[];
  status: 'available' | 'occupied' | 'maintenance';
  currentOccupant?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  date: string;
  studentId: string;
  studentName: string;
  courseTitle: string;
  status: 'present' | 'absent' | 'late';
  note?: string;
}

export type PaymentMethod = 'cash' | 'baridimob' | 'ccp' | 'bank_transfer';

export interface PaymentTransaction {
  id: string;
  schoolId?: string;
  receiptNumber: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  courseTitle: string;
  amount: number; // in DZD
  paymentMethod: PaymentMethod;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
  recordedBy: string;
  notes?: string;
  feeCategory?: 'course' | 'registration_fee';
  type?: string;
}

export interface DebtRecord {
  id: string;
  schoolId?: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  courseTitle: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: PaymentStatus;
}

export interface DashboardKPIs {
  totalStudents: number;
  activeStudents: number;
  studentsGrowth: number;
  totalTeachers: number;
  totalCourses: number;
  totalSupportGroups: number;
  monthRevenue: number;
  revenueGrowth: number;
  totalDebts: number;
  unpaidStudentsCount: number;
}

export type ExpenseCategory = 'salary' | 'electricity' | 'internet' | 'rent' | 'supplies' | 'maintenance' | 'other';

export interface Expense {
  id: string;
  schoolId?: string;
  receiptNumber: string;
  title: string;
  category: ExpenseCategory;
  amount: number; // in DZD
  date: string;
  recipientName?: string; // اسم المستلم أو العامل
  paymentMethod?: string;
  notes?: string;
}
