import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  SchoolTenant,
  Teacher,
  Course,
  Classroom,
  PaymentTransaction,
  DebtRecord,
  Student,
  SessionAttendanceLog,
  TeacherPayoutLog,
  PaymentStatus,
  Expense,
  AttendanceLogStatus,
} from '../types';
import { storage } from '../utils/storage';
import { supabaseService } from '../services/supabaseService';

interface DataContextType {
  // Schools
  schools: SchoolTenant[];
  currentSchool: SchoolTenant;
  addSchool: (school: SchoolTenant) => void;
  updateSchool: (school: SchoolTenant) => void;
  deleteSchool: (schoolId: string) => void;
  toggleSchoolStatus: (schoolId: string) => void;
  extendSchoolSubscription: (schoolId: string, months: number) => void;
  setCurrentSchoolId: (id: string) => void;

  // Teachers
  teachers: Teacher[];
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (teacherId: string) => void;
  payoutTeacher: (teacherId: string, amount: number, paymentMethod?: string, notes?: string) => void;
  deleteTeacherPayout: (teacherId: string, payoutId: string) => void;
  resetTeacherPayroll: (teacherId: string) => void;

  // Courses & Groups
  courses: Course[];
  addCourse: (course: Course) => void;
  updateCourse: (course: Course) => void;
  deleteCourse: (courseId: string) => void;
  enrollStudentToCourse: (courseId: string, student: Student) => void;
  removeStudentFromCourse: (courseId: string, studentId: string) => void;
  incrementStudentSession: (courseId: string, studentId: string) => { studentName: string; attended: number; total: number; isExceeded: boolean };
  recordStudentAbsence: (
    courseId: string,
    studentId: string,
    isCounted: boolean,
    notes?: string
  ) => { studentName: string; attended: number; total: number; isExceeded: boolean; isCounted: boolean };
  renewStudentSubscription: (
    courseId: string,
    studentId: string,
    newTotalSessions: number,
    paidAmount: number
  ) => {
    overageDeducted: number;
    startingAttended: number;
    receiptNumber: string;
    addedDebt: number;
    paidAmount: number;
  };
  undoStudentAttendance: (
    courseId: string,
    studentId: string
  ) => {
    success: boolean;
    studentName: string;
    actionDescription: string;
    attended: number;
    total: number;
  } | null;

  // Classrooms
  classrooms: Classroom[];
  addClassroom: (classroom: Classroom) => void;
  updateClassroom: (classroom: Classroom) => void;
  deleteClassroom: (classroomId: string) => void;

  // Payments, Debts & Expenses
  transactions: PaymentTransaction[];
  debts: DebtRecord[];
  expenses: Expense[];
  recordPayment: (transaction: PaymentTransaction, updateDebtStudentId?: string) => void;
  addDebt: (debt: Omit<DebtRecord, 'id'>) => DebtRecord;
  deleteTransaction: (transactionId: string) => void;
  deleteDebt: (debtId: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'receiptNumber'>) => Expense;
  deleteExpense: (expenseId: string) => void;
  archiveFinancialCycle: (archivedTransactionIds?: string[], archivedExpenseIds?: string[]) => void;

  // Computed KPIs
  totalEnrolledStudents: number;
  totalActiveCourses: number;
  totalMonthlyRevenue: number;
  totalOutstandingDebts: number;
  totalTeachersEarned: number;
  totalTeachersPaid: number;
  totalTeachersBalanceDue: number;
  totalExpenses: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schools, setSchools] = useState<SchoolTenant[]>(() => storage.getSchools());
  const [currentSchoolId, setCurrentSchoolIdState] = useState<string>(() => storage.getCurrentSchoolId());
  const [rawTeachers, setRawTeachers] = useState<Teacher[]>(() => storage.getTeachers());
  const [courses, setCourses] = useState<Course[]>(() => storage.getCourses());
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => storage.getClassrooms());
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => storage.getTransactions());
  const [debts, setDebts] = useState<DebtRecord[]>(() => storage.getDebts());
  const [expenses, setExpenses] = useState<Expense[]>(() => storage.getExpenses());

  // === SUPABASE INITIAL HYDRATION ===
  useEffect(() => {
    async function hydrateFromSupabase() {
      const [remoteSchools, remoteClassrooms, remoteTeachers, remoteCourses, remoteTransactions, remoteDebts, remoteExpenses] =
        await Promise.all([
          supabaseService.fetchSchools(),
          supabaseService.fetchClassrooms(),
          supabaseService.fetchTeachers(),
          supabaseService.fetchCourses(),
          supabaseService.fetchTransactions(),
          supabaseService.fetchDebts(),
          supabaseService.fetchExpenses(),
        ]);

      if (remoteSchools && remoteSchools.length > 0) {
        setSchools(remoteSchools);
      }
      if (remoteClassrooms && remoteClassrooms.length > 0) {
        setClassrooms(remoteClassrooms);
      }
      if (remoteTeachers && remoteTeachers.length > 0) {
        setRawTeachers(remoteTeachers);
      }
      if (remoteCourses && remoteCourses.length > 0) {
        setCourses(remoteCourses);
      }
      if (remoteTransactions && remoteTransactions.length > 0) {
        setTransactions(remoteTransactions);
      }
      if (remoteDebts && remoteDebts.length > 0) {
        setDebts(remoteDebts);
      }
      if (remoteExpenses && remoteExpenses.length > 0) {
        setExpenses(remoteExpenses);
      }
    }

    hydrateFromSupabase();
  }, []);

  useEffect(() => {
    storage.setSchools(schools);
  }, [schools]);

  useEffect(() => {
    storage.setTeachers(rawTeachers);
  }, [rawTeachers]);

  useEffect(() => {
    storage.setCourses(courses);
  }, [courses]);

  useEffect(() => {
    storage.setClassrooms(classrooms);
  }, [classrooms]);

  useEffect(() => {
    storage.setTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    storage.setDebts(debts);
  }, [debts]);

  useEffect(() => {
    storage.setExpenses(expenses);
  }, [expenses]);

  // Current School resolution
  const currentSchool =
    schools.find((s) => s.id === currentSchoolId) ||
    schools[0] || {
      id: 'school-default',
      name: 'مدرستي التعليمية',
      code: 'MY-SCHOOL-01',
      username: 'admin',
      password: 'password123',
      phone: '0550 00 00 00',
      email: 'admin@school.dz',
      address: 'المقر الرئيسي للمؤسسة',
      wilaya: 'الجزائر العاصمة (16)',
      plan: 'professional' as const,
      planStatus: 'active' as const,
      subscriptionStart: new Date().toISOString().split('T')[0],
      subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      studentsCount: 0,
      revenueGenerated: 30000,
      logoText: 'مدرستي التعليمية',
    };

  // Filter scoped data strictly for current active school
  const currentSchoolClassrooms = classrooms.filter(
    (c) => c.schoolId === currentSchool.id || (!c.schoolId && currentSchool.id === 'school-default')
  );
  const currentSchoolCourses = courses.filter(
    (c) => c.schoolId === currentSchool.id || (!c.schoolId && currentSchool.id === 'school-default')
  );
  const currentSchoolTransactions = transactions.filter(
    (t) => t.schoolId === currentSchool.id || (!t.schoolId && currentSchool.id === 'school-default')
  );
  const currentSchoolDebts = debts.filter(
    (d) => d.schoolId === currentSchool.id || (!d.schoolId && currentSchool.id === 'school-default')
  );
  const currentSchoolExpenses = expenses.filter(
    (e) => e.schoolId === currentSchool.id || (!e.schoolId && currentSchool.id === 'school-default')
  );
  const currentSchoolRawTeachers = rawTeachers.filter(
    (t) => t.schoolId === currentSchool.id || (!t.schoolId && currentSchool.id === 'school-default')
  );

  /**
   * Calculates cumulative teacher dues directly linked to student attendance & counted absences.
   * - present: counted session
   * - absent_counted: counted session (deducted from student, earned by teacher)
   * - absent_uncounted: excused absence (not counted in teacher dues)
   * - renewed: cycle renewal marker
   */
  const calculateTeacherDuesFromAttendance = (
    teacher: Teacher,
    teacherCourses: Course[]
  ): {
    cumulativeEarned: number;
    totalAttendedSessions: number;
    totalCountedAbsences: number;
  } => {
    const compensationType = teacher.compensationType || 'percentage_per_student';
    const commission = teacher.commissionPercentage !== undefined ? teacher.commissionPercentage : 60;
    const fixedRate = teacher.fixedCourseRate !== undefined ? teacher.fixedCourseRate : 25000;

    let cumulativeEarned = 0;
    let totalAttendedSessions = 0;
    let totalCountedAbsences = 0;

    teacherCourses.forEach((c) => {
      const defaultQuota = c.totalSessionsDefault || 5;
      const coursePrice = c.monthlyPrice || 0;

      if (compensationType === 'percentage_per_student') {
        const list = c.enrolledList || [];
        list.forEach((std) => {
          const studentQuota = std.totalSessions || defaultQuota || 5;
          const perSessionPrice = coursePrice / (studentQuota > 0 ? studentQuota : 5);
          const teacherSharePerSession = perSessionPrice * (commission / 100);

          const logs = std.attendanceLogs || [];
          const presentLogsCount = logs.filter((l) => l.status === 'present').length;
          const absentCountedLogsCount = logs.filter((l) => l.status === 'absent_counted').length;

          // If logs exist, use actual present + absent_counted logs.
          // If logs array is empty (e.g. initial demo student), fallback to std.attendedSessions
          const countedSessions =
            logs.length > 0
              ? presentLogsCount + absentCountedLogsCount
              : (std.attendedSessions || 0);

          const presentSessions = logs.length > 0 ? presentLogsCount : (std.attendedSessions || 0);
          const absentCountedSessions = logs.length > 0 ? absentCountedLogsCount : 0;

          totalAttendedSessions += presentSessions;
          totalCountedAbsences += absentCountedSessions;

          cumulativeEarned += countedSessions * teacherSharePerSession;
        });
      } else if (compensationType === 'percentage_per_course') {
        const perSession = (coursePrice / (defaultQuota > 0 ? defaultQuota : 5)) * (commission / 100);
        // Course sessions held = max of counted sessions among enrolled students
        const list = c.enrolledList || [];
        const courseSessionsHeld = list.reduce((maxSess, std) => {
          const logs = std.attendanceLogs || [];
          const count =
            logs.length > 0
              ? logs.filter((l) => l.status === 'present' || l.status === 'absent_counted').length
              : (std.attendedSessions || 0);
          return Math.max(maxSess, count);
        }, 0);

        cumulativeEarned += courseSessionsHeld * perSession;
      } else if (compensationType === 'fixed_per_course') {
        const perSession = fixedRate / (defaultQuota > 0 ? defaultQuota : 5);
        const list = c.enrolledList || [];
        const courseSessionsHeld = list.reduce((maxSess, std) => {
          const logs = std.attendanceLogs || [];
          const count =
            logs.length > 0
              ? logs.filter((l) => l.status === 'present' || l.status === 'absent_counted').length
              : (std.attendedSessions || 0);
          return Math.max(maxSess, count);
        }, 0);

        cumulativeEarned += courseSessionsHeld * perSession;
      }
    });

    return {
      cumulativeEarned: Math.round(cumulativeEarned),
      totalAttendedSessions,
      totalCountedAbsences,
    };
  };

  // Dynamically compute Teacher earnings directly linked to active courses and student attendance/absences
  const teachers: Teacher[] = currentSchoolRawTeachers.map((t) => {
    const teacherCourses = currentSchoolCourses.filter((c) => c.teacherId === t.id);
    const groupsCount = teacherCourses.length;
    const compensationType = t.compensationType || 'percentage_per_student';
    const commission = t.commissionPercentage !== undefined ? t.commissionPercentage : 60;
    const fixedRate = t.fixedCourseRate !== undefined ? t.fixedCourseRate : 25000;

    // 1. Calculate cumulative earned directly from ALL student attendance and counted absences
    const { cumulativeEarned, totalAttendedSessions, totalCountedAbsences } =
      calculateTeacherDuesFromAttendance(t, teacherCourses);

    // 2. settledEarned = the cumulative earned amount that was frozen at the last settlement/reset
    const settledEarned = t.settledEarned || 0;

    // 3. Current cycle earned = what's newly earned from attendance since the last settlement
    const currentCycleEarned = Math.max(0, cumulativeEarned - settledEarned);

    // 4. Current cycle paid = payouts recorded AFTER the latest settlement marker
    const history = t.payoutHistory || [];
    const lastSettlementIndex = history.findIndex((p) => p.isCycleSettlement);
    const currentCycleLogs =
      lastSettlementIndex === -1
        ? history.filter((p) => !p.isCycleSettlement)
        : history.slice(0, lastSettlementIndex).filter((p) => !p.isCycleSettlement);
    const currentCyclePaid = currentCycleLogs.reduce((acc, log) => acc + (Number(log.amount) || 0), 0);

    // 5. Balance due for current cycle
    const balanceDue = Math.max(0, currentCycleEarned - currentCyclePaid);

    return {
      ...t,
      schoolId: t.schoolId || currentSchool.id,
      compensationType,
      commissionPercentage: commission,
      fixedCourseRate: fixedRate,
      groupsCount,
      totalEarned: currentCycleEarned,
      totalPaid: currentCyclePaid,
      balanceDue,
      settledEarned,
      totalAttendedSessions,
      totalCountedAbsences,
    };
  });

  // Sync to localStorage
  useEffect(() => {
    storage.setSchools(schools);
  }, [schools]);

  useEffect(() => {
    storage.setCurrentSchoolId(currentSchoolId);
  }, [currentSchoolId]);

  useEffect(() => {
    storage.setTeachers(rawTeachers);
  }, [rawTeachers]);

  useEffect(() => {
    storage.setCourses(courses);
  }, [courses]);

  useEffect(() => {
    storage.setClassrooms(classrooms);
  }, [classrooms]);

  useEffect(() => {
    storage.setTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    storage.setDebts(debts);
  }, [debts]);

  // School Actions
  const setCurrentSchoolId = (id: string) => {
    setCurrentSchoolIdState(id);
  };

  const addSchool = (school: SchoolTenant) => {
    setSchools((prev) => [school, ...prev]);
    supabaseService.upsertSchool(school);
  };

  const updateSchool = (school: SchoolTenant) => {
    setSchools((prev) => prev.map((s) => (s.id === school.id ? school : s)));
    supabaseService.upsertSchool(school);
  };

  const deleteSchool = (schoolId: string) => {
    const remainingSchools = schools.filter((s) => s.id !== schoolId);
    setSchools(remainingSchools);
    supabaseService.deleteSchool(schoolId);

    // Clean up local items belonging to deleted school
    setRawTeachers((prev) => prev.filter((t) => (t.schoolId ? t.schoolId !== schoolId : schoolId !== 'school-default')));
    setCourses((prev) => prev.filter((c) => (c.schoolId ? c.schoolId !== schoolId : schoolId !== 'school-default')));
    setClassrooms((prev) => prev.filter((r) => (r.schoolId ? r.schoolId !== schoolId : schoolId !== 'school-default')));
    setTransactions((prev) => prev.filter((tx) => (tx.schoolId ? tx.schoolId !== schoolId : schoolId !== 'school-default')));
    setDebts((prev) => prev.filter((d) => (d.schoolId ? d.schoolId !== schoolId : schoolId !== 'school-default')));

    if (currentSchoolId === schoolId) {
      if (remainingSchools.length > 0) {
        setCurrentSchoolIdState(remainingSchools[0].id);
      } else {
        const fallbackSchool: SchoolTenant = {
          id: `school-${Date.now()}`,
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
        };
        setSchools([fallbackSchool]);
        setCurrentSchoolIdState(fallbackSchool.id);
        supabaseService.upsertSchool(fallbackSchool);
      }
    }
  };

  const toggleSchoolStatus = (schoolId: string) => {
    setSchools((prev) => {
      const updated = prev.map((s) =>
        s.id === schoolId ? { ...s, planStatus: s.planStatus === 'active' ? ('suspended' as const) : ('active' as const) } : s
      );
      const target = updated.find((s) => s.id === schoolId);
      if (target) supabaseService.upsertSchool(target);
      return updated;
    });
  };

  const extendSchoolSubscription = (schoolId: string, months: number) => {
    setSchools((prev) => {
      const updated = prev.map((s) => {
        if (s.id === schoolId) {
          const currentEnd = new Date(s.subscriptionEnd || new Date());
          currentEnd.setMonth(currentEnd.getMonth() + months);
          const updatedSch = {
            ...s,
            subscriptionEnd: currentEnd.toISOString().split('T')[0],
            planStatus: 'active' as const,
          };
          supabaseService.upsertSchool(updatedSch);
          return updatedSch;
        }
        return s;
      });
      return updated;
    });
  };

  // Teacher Actions
  const addTeacher = (teacher: Teacher) => {
    const teacherWithSchool: Teacher = { ...teacher, schoolId: currentSchool.id };
    setRawTeachers((prev) => [teacherWithSchool, ...prev]);
    supabaseService.upsertTeacher(teacherWithSchool, currentSchool.id);
  };

  const updateTeacher = (teacher: Teacher) => {
    const teacherWithSchool: Teacher = { ...teacher, schoolId: teacher.schoolId || currentSchool.id };
    setRawTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacherWithSchool : t)));
    supabaseService.upsertTeacher(teacherWithSchool, currentSchool.id);
  };

  const deleteTeacher = (teacherId: string) => {
    setRawTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    supabaseService.deleteTeacher(teacherId);
  };

  const payoutTeacher = (teacherId: string, amount: number, paymentMethod: string = 'نقداً (Cash)', notes: string = '') => {
    const newPayoutLog: TeacherPayoutLog = {
      id: `payout-${Date.now()}`,
      amount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      notes,
    };

    setRawTeachers((prev) => {
      const updated = prev.map((t) => {
        if (t.id === teacherId) {
          const updatedTeacher: Teacher = {
            ...t,
            schoolId: t.schoolId || currentSchool.id,
            payoutHistory: [newPayoutLog, ...(t.payoutHistory || [])],
          };
          supabaseService.upsertTeacher(updatedTeacher, currentSchool.id);
          return updatedTeacher;
        }
        return t;
      });
      return updated;
    });
  };

  const deleteTeacherPayout = (teacherId: string, payoutId: string) => {
    setRawTeachers((prev) => {
      const updated = prev.map((t) => {
        if (t.id === teacherId) {
          const updatedTeacher: Teacher = {
            ...t,
            schoolId: t.schoolId || currentSchool.id,
            payoutHistory: (t.payoutHistory || []).filter((p) => p.id !== payoutId),
          };
          supabaseService.upsertTeacher(updatedTeacher, currentSchool.id);
          return updatedTeacher;
        }
        return t;
      });
      return updated;
    });
  };

  const resetTeacherPayroll = (teacherId: string) => {
    const now = new Date();

    setRawTeachers((prev) => {
      const updated = prev.map((t) => {
        if (t.id === teacherId) {
          // Compute the current cumulative earned from attendance to freeze it for settlement
          const teacherCourses = currentSchoolCourses.filter((c) => c.teacherId === t.id);
          const { cumulativeEarned } = calculateTeacherDuesFromAttendance(t, teacherCourses);

          const settlementLog: TeacherPayoutLog = {
            id: `cycle-${Date.now()}`,
            amount: 0,
            date: now.toISOString().split('T')[0],
            paymentMethod: 'تسوية الدورة',
            notes: `تمت تسوية الحساب وبدء دورة جديدة — إجمالي المستحقات المقفلة: ${cumulativeEarned.toLocaleString('fr-DZ')} دج`,
            isCycleSettlement: true,
            settledEarned: cumulativeEarned,
          };

          const updatedTeacher: Teacher = {
            ...t,
            schoolId: t.schoolId || currentSchool.id,
            settledEarned: cumulativeEarned,
            lastSettledDate: now.toISOString().split('T')[0],
            payoutHistory: [settlementLog, ...(t.payoutHistory || [])],
          };
          supabaseService.upsertTeacher(updatedTeacher, currentSchool.id);
          return updatedTeacher;
        }
        return t;
      });
      return updated;
    });
  };

  // Course Actions
  const addCourse = (course: Course) => {
    const courseWithSchool: Course = { ...course, schoolId: currentSchool.id };
    setCourses((prev) => [courseWithSchool, ...prev]);
    supabaseService.upsertCourse(courseWithSchool, currentSchool.id);
  };

  const updateCourse = (course: Course) => {
    const courseWithSchool: Course = { ...course, schoolId: course.schoolId || currentSchool.id };
    setCourses((prev) => prev.map((c) => (c.id === course.id ? courseWithSchool : c)));
    supabaseService.upsertCourse(courseWithSchool, currentSchool.id);
  };

  const deleteCourse = (courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    supabaseService.deleteCourse(courseId);
  };

  const enrollStudentToCourse = (courseId: string, student: Student) => {
    const initialReceiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    let studentToEnroll = student;

    // If there is initial payment, add a logged entry directly to student's record
    if (student.totalPaid > 0) {
      const now = new Date();
      const initPaymentLog: SessionAttendanceLog = {
        id: `log-pay-init-${Date.now()}`,
        sessionNumber: 0,
        date: student.registrationDate || now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0].substring(0, 5),
        status: 'payment',
        type: 'payment',
        amount: student.totalPaid,
        receiptNumber: initialReceiptNo,
        notes: `دفعة أولية نقدية عند التسجيل بقيمة ${student.totalPaid.toLocaleString('fr-DZ')} دج`,
      };
      studentToEnroll = {
        ...student,
        attendanceLogs: [initPaymentLog, ...(student.attendanceLogs || [])],
      };
    }

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const newList = [studentToEnroll, ...(c.enrolledList || [])];
          const updatedCourse: Course = {
            ...c,
            schoolId: c.schoolId || currentSchool.id,
            enrolledList: newList,
            enrolledStudents: newList.length,
          };
          supabaseService.upsertCourse(updatedCourse, c.schoolId || currentSchool.id);
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    // If there is initial debt, record it
    if (student.totalDebt > 0) {
      const newDebt: DebtRecord = {
        id: `dbt-${Date.now()}`,
        schoolId: currentSchool.id,
        studentId: student.id,
        studentName: student.fullName,
        studentPhone: student.phone,
        courseTitle: student.enrolledCourseTitle || 'دورة تعليمية',
        totalAmount: student.totalPaid + student.totalDebt,
        paidAmount: student.totalPaid,
        remainingAmount: student.totalDebt,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: student.totalPaid > 0 ? 'partial' : 'unpaid',
      };
      setDebts((prev) => [newDebt, ...prev]);
      supabaseService.upsertDebt(newDebt, currentSchool.id);
    }

    // If there is initial payment, record transaction (Cash only)
    if (student.totalPaid > 0) {
      const newTx: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        schoolId: currentSchool.id,
        receiptNumber: initialReceiptNo,
        studentId: student.id,
        studentName: student.fullName,
        courseTitle: student.enrolledCourseTitle || 'دورة تعليمية',
        amount: student.totalPaid,
        paymentMethod: 'cash',
        date: student.registrationDate || new Date().toISOString().split('T')[0],
        status: 'completed',
        recordedBy: 'إدارة المؤسسة',
        notes: 'دفعة أولية نقدية عند التسجيل',
      };
      setTransactions((prev) => [newTx, ...prev]);
      supabaseService.insertTransaction(newTx, currentSchool.id);
    }
  };

  const removeStudentFromCourse = (courseId: string, studentId: string) => {
    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).filter((std) => std.id !== studentId);
          const updatedCourse: Course = {
            ...c,
            schoolId: c.schoolId || currentSchool.id,
            enrolledList: updatedList,
            enrolledStudents: updatedList.length,
          };
          supabaseService.upsertCourse(updatedCourse, c.schoolId || currentSchool.id);
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });
  };

  const incrementStudentSession = (courseId: string, studentId: string) => {
    let studentName = '';
    let attended = 0;
    let total = 5;

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              studentName = std.fullName;
              attended = (std.attendedSessions || 0) + 1;
              total = std.totalSessions || 5;

              const now = new Date();
              const newLog: SessionAttendanceLog = {
                id: `log-${Date.now()}`,
                sessionNumber: attended,
                date: now.toISOString().split('T')[0],
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                status: 'present',
                type: 'present',
                notes: 'تسجيل حضور',
              };

              return {
                ...std,
                attendedSessions: attended,
                attendanceLogs: [newLog, ...(std.attendanceLogs || [])],
              };
            }
            return std;
          });
          const updatedCourse: Course = { ...c, schoolId: c.schoolId || currentSchool.id, enrolledList: updatedList };
          supabaseService.upsertCourse(updatedCourse, c.schoolId || currentSchool.id);
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    return {
      studentName,
      attended,
      total,
      isExceeded: attended > total,
    };
  };

  const recordStudentAbsence = (
    courseId: string,
    studentId: string,
    isCounted: boolean,
    notes?: string
  ) => {
    let studentName = '';
    let attended = 0;
    let total = 5;

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              studentName = std.fullName;
              total = std.totalSessions || 5;
              // If counted, consumes 1 session of quota (counted towards teacher earnings)
              attended = isCounted ? (std.attendedSessions || 0) + 1 : (std.attendedSessions || 0);

              const now = new Date();
              const status: AttendanceLogStatus = isCounted ? 'absent_counted' : 'absent_uncounted';
              const newLog: SessionAttendanceLog = {
                id: `log-${Date.now()}`,
                sessionNumber: isCounted ? attended : (std.attendedSessions || 0),
                date: now.toISOString().split('T')[0],
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                status,
                type: status,
                notes: notes || (isCounted ? 'غياب محسوب (مقتطع من الرصيد)' : 'غياب معفى (تجاوز يوم - تُحسب في الحصة القادمة)'),
              };

              return {
                ...std,
                attendedSessions: attended,
                attendanceLogs: [newLog, ...(std.attendanceLogs || [])],
              };
            }
            return std;
          });
          const updatedCourse: Course = { ...c, schoolId: c.schoolId || currentSchool.id, enrolledList: updatedList };
          supabaseService.upsertCourse(updatedCourse, c.schoolId || currentSchool.id);
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    return {
      studentName,
      attended,
      total,
      isExceeded: attended > total,
      isCounted,
    };
  };

  const renewStudentSubscription = (
    courseId: string,
    studentId: string,
    newTotalSessions: number,
    paidAmount: number
  ) => {
    let overageDeducted = 0;
    let startingAttended = 0;

    const course = currentSchoolCourses.find((c) => c.id === courseId);
    const coursePrice = course?.monthlyPrice || 6000;
    const addedDebt = Math.max(0, coursePrice - paidAmount);

    const renewReceiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              const currentAttended = std.attendedSessions || 0;
              const currentTotal =
                std.totalSessions && std.totalSessions > 0
                  ? std.totalSessions
                  : course?.totalSessionsDefault && course.totalSessionsDefault > 0
                  ? course.totalSessionsDefault
                  : 4;
              overageDeducted = Math.max(0, currentAttended - currentTotal);
              startingAttended = overageDeducted;

              const now = new Date();
              const renewalLog: SessionAttendanceLog = {
                id: `renew-${Date.now()}`,
                sessionNumber: 0,
                date: now.toISOString().split('T')[0],
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                status: 'renewed',
                type: 'renewed',
                notes: `تجديد باقة اشتراك جديدة (${newTotalSessions} حصص)`,
              };

              const logsToAdd: SessionAttendanceLog[] = [renewalLog];

              if (paidAmount > 0) {
                logsToAdd.unshift({
                  id: `log-pay-${Date.now()}`,
                  sessionNumber: 0,
                  date: now.toISOString().split('T')[0],
                  time: now.toTimeString().split(' ')[0].substring(0, 5),
                  status: 'payment',
                  type: 'payment',
                  amount: paidAmount,
                  receiptNumber: renewReceiptNo,
                  notes: `تسديد اشتراك باقة جديدة نقداً (${renewReceiptNo}) بقيمة ${paidAmount.toLocaleString('fr-DZ')} دج`,
                });
              }

              return {
                ...std,
                totalSessions: newTotalSessions,
                attendedSessions: startingAttended,
                totalPaid: std.totalPaid + paidAmount,
                totalDebt: std.totalDebt + addedDebt,
                attendanceLogs: [...logsToAdd, ...(std.attendanceLogs || [])],
              };
            }
            return std;
          });
          const updatedCourse: Course = { ...c, schoolId: c.schoolId || currentSchool.id, enrolledList: updatedList };
          supabaseService.upsertCourse(updatedCourse, c.schoolId || currentSchool.id);
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    // If there is newly added debt on renewal, record it in debts
    if (addedDebt > 0) {
      const student = course?.enrolledList?.find((s) => s.id === studentId);
      const newDebt: DebtRecord = {
        id: `dbt-${Date.now()}`,
        schoolId: currentSchool.id,
        studentId,
        studentName: student?.fullName || 'تلميذ',
        studentPhone: student?.phone || '',
        courseTitle: course?.title || 'دورة تعليمية',
        totalAmount: coursePrice,
        paidAmount: paidAmount,
        remainingAmount: addedDebt,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: paidAmount > 0 ? 'partial' : 'unpaid',
      };
      setDebts((prev) => [newDebt, ...prev]);
      supabaseService.upsertDebt(newDebt, currentSchool.id);
    }

    // Record payment transaction (Cash only)
    if (paidAmount > 0) {
      const student = course?.enrolledList?.find((s) => s.id === studentId);
      const newTx: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        schoolId: currentSchool.id,
        receiptNumber: renewReceiptNo,
        studentId,
        studentName: student?.fullName || 'تلميذ',
        courseTitle: course?.title || 'دورة تعليمية',
        amount: paidAmount,
        paymentMethod: 'cash',
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        recordedBy: 'إدارة المؤسسة',
        notes: 'تجديد اشتراك باقة حصص جديدة',
      };
      setTransactions((prev) => [newTx, ...prev]);
      supabaseService.insertTransaction(newTx, currentSchool.id);
    }

    return {
      overageDeducted,
      startingAttended,
      receiptNumber: renewReceiptNo,
      addedDebt,
      paidAmount,
    };
  };

  const undoStudentAttendance = (courseId: string, studentId: string) => {
    let studentName = '';
    let actionDescription = '';
    let newAttended = 0;
    let total = 5;
    let found = false;

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              studentName = std.fullName;
              total = std.totalSessions || 5;

              const logs = std.attendanceLogs || [];
              // Find the most recent attendance or absence log
              const targetLogIndex = logs.findIndex((l) => {
                const s = l.status || l.type;
                return s === 'present' || s === 'absent_counted' || s === 'absent_uncounted';
              });

              if (targetLogIndex !== -1) {
                found = true;
                const targetLog = logs[targetLogIndex];
                const s = targetLog.status || targetLog.type;

                if (s === 'present') {
                  actionDescription = `حضور (الحصة ${targetLog.sessionNumber || std.attendedSessions || 1})`;
                  newAttended = Math.max(0, (std.attendedSessions || 0) - 1);
                } else if (s === 'absent_counted') {
                  actionDescription = `غياب محسوب (الحصة ${targetLog.sessionNumber || std.attendedSessions || 1})`;
                  newAttended = Math.max(0, (std.attendedSessions || 0) - 1);
                } else {
                  actionDescription = 'غياب مبرر / غير محسوب';
                  newAttended = std.attendedSessions || 0;
                }

                const newLogs = logs.filter((_, idx) => idx !== targetLogIndex);

                return {
                  ...std,
                  attendedSessions: newAttended,
                  attendanceLogs: newLogs,
                };
              } else if ((std.attendedSessions || 0) > 0) {
                found = true;
                actionDescription = 'حصة حضور';
                newAttended = Math.max(0, (std.attendedSessions || 0) - 1);
                return {
                  ...std,
                  attendedSessions: newAttended,
                };
              }
            }
            return std;
          });

          if (found) {
            const updatedCourse: Course = { ...c, schoolId: c.schoolId || currentSchool.id, enrolledList: updatedList };
            supabaseService.upsertCourse(updatedCourse, c.schoolId || currentSchool.id);
            return updatedCourse;
          }
        }
        return c;
      });
      return updated;
    });

    if (!found) return null;

    return {
      success: true,
      studentName,
      actionDescription,
      attended: newAttended,
      total,
    };
  };

  // Classroom Actions
  const addClassroom = (classroom: Classroom) => {
    const classroomWithSchool: Classroom = { ...classroom, schoolId: currentSchool.id };
    setClassrooms((prev) => [classroomWithSchool, ...prev]);
    supabaseService.upsertClassroom(classroomWithSchool, currentSchool.id);
  };

  const updateClassroom = (classroom: Classroom) => {
    const classroomWithSchool: Classroom = { ...classroom, schoolId: classroom.schoolId || currentSchool.id };
    setClassrooms((prev) => prev.map((r) => (r.id === classroom.id ? classroomWithSchool : r)));
    supabaseService.upsertClassroom(classroomWithSchool, currentSchool.id);
  };

  const deleteClassroom = (classroomId: string) => {
    setClassrooms((prev) => prev.filter((r) => r.id !== classroomId));
    supabaseService.deleteClassroom(classroomId);
  };

  // Payment & Debt Actions
  const recordPayment = (transaction: PaymentTransaction, updateDebtStudentId?: string) => {
    const txWithSchool: PaymentTransaction = { ...transaction, schoolId: currentSchool.id };
    setTransactions((prev) => [txWithSchool, ...prev]);
    supabaseService.insertTransaction(txWithSchool, currentSchool.id);

    const targetStudentId = updateDebtStudentId || transaction.studentId;
    const targetStudentName = transaction.studentName?.trim();

    // 1. Update student's financial records in course and add payment log
    setCourses((prevCourses) => {
      let anyUpdated = false;
      const updatedCourses = prevCourses.map((c) => {
        const hasStudent = (c.enrolledList || []).some(
          (std) =>
            (targetStudentId && std.id === targetStudentId) ||
            (targetStudentName && std.fullName.trim() === targetStudentName)
        );

        if (!hasStudent) return c;
        anyUpdated = true;

        const now = new Date();
        const paymentLog: SessionAttendanceLog = {
          id: `log-pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sessionNumber: 0,
          date: transaction.date || now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0].substring(0, 5),
          status: 'payment',
          type: 'payment',
          amount: transaction.amount,
          receiptNumber: transaction.receiptNumber,
          notes: `تسديد دفعة مالية نقداً (${transaction.receiptNumber}) بقيمة ${transaction.amount.toLocaleString('fr-DZ')} دج${transaction.notes ? ` - ${transaction.notes}` : ''}`,
        };

        const updatedList = (c.enrolledList || []).map((std) => {
          const isMatch =
            (targetStudentId && std.id === targetStudentId) ||
            (targetStudentName && std.fullName.trim() === targetStudentName);

          if (!isMatch) return std;

          const currentDebt = std.totalDebt || 0;
          const currentPaid = std.totalPaid || 0;
          const newDebt = Math.max(0, currentDebt - transaction.amount);
          const newPaid = currentPaid + transaction.amount;

          return {
            ...std,
            totalDebt: newDebt,
            totalPaid: newPaid,
            attendanceLogs: [paymentLog, ...(std.attendanceLogs || [])],
          };
        });

        const updatedCourse: Course = {
          ...c,
          schoolId: c.schoolId || currentSchool.id,
          enrolledList: updatedList,
        };

        supabaseService.upsertCourse(updatedCourse, c.schoolId || currentSchool.id);
        return updatedCourse;
      });

      return anyUpdated ? updatedCourses : prevCourses;
    });

    // 2. Update DebtRecord in debts state & Supabase (DO NOT filter out, so it shows as 'paid' / خالص)
    setDebts((prevDebts) => {
      return prevDebts.map((d) => {
        const isMatch =
          (targetStudentId && d.studentId === targetStudentId) ||
          (targetStudentName && d.studentName.trim() === targetStudentName);

        if (!isMatch) return d;

        const newPaid = d.paidAmount + transaction.amount;
        const remaining = Math.max(0, d.totalAmount - newPaid);
        const newStatus: PaymentStatus = remaining === 0 ? 'paid' : 'partial';

        const updatedDebt: DebtRecord = {
          ...d,
          schoolId: d.schoolId || currentSchool.id,
          paidAmount: newPaid,
          remainingAmount: remaining,
          status: newStatus,
        };

        supabaseService.upsertDebt(updatedDebt, currentSchool.id);
        return updatedDebt;
      });
    });
  };

  const addDebt = (debt: Omit<DebtRecord, 'id'>): DebtRecord => {
    const newDebt: DebtRecord = {
      ...debt,
      id: `dbt-${Date.now()}`,
      schoolId: currentSchool.id,
    };

    setDebts((prev) => [newDebt, ...prev]);
    supabaseService.upsertDebt(newDebt, currentSchool.id);

    // If student is found in courses, add to student's totalDebt as well
    if (newDebt.studentId || newDebt.studentName) {
      setCourses((prevCourses) => {
        let anyUpdated = false;
        const updatedCourses = prevCourses.map((c) => {
          const hasStudent = (c.enrolledList || []).some(
            (std) =>
              (newDebt.studentId && std.id === newDebt.studentId) ||
              (newDebt.studentName && std.fullName.trim() === newDebt.studentName.trim())
          );

          if (!hasStudent) return c;
          anyUpdated = true;

          const updatedList = (c.enrolledList || []).map((std) => {
            const isMatch =
              (newDebt.studentId && std.id === newDebt.studentId) ||
              (newDebt.studentName && std.fullName.trim() === newDebt.studentName.trim());

            if (!isMatch) return std;

            return {
              ...std,
              totalDebt: (std.totalDebt || 0) + newDebt.remainingAmount,
            };
          });

          const updatedCourse: Course = {
            ...c,
            schoolId: c.schoolId || currentSchool.id,
            enrolledList: updatedList,
          };

          supabaseService.upsertCourse(updatedCourse, c.schoolId || currentSchool.id);
          return updatedCourse;
        });

        return anyUpdated ? updatedCourses : prevCourses;
      });
    }

    return newDebt;
  };

  const deleteTransaction = (transactionId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    supabaseService.deleteTransaction(transactionId);
  };

  const deleteDebt = (debtId: string) => {
    const targetDebt = debts.find((d) => d.id === debtId);
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    supabaseService.deleteDebt(debtId);

    // If studentId is known, clear their totalDebt in enrolled courses as well
    if (targetDebt?.studentId) {
      setCourses((prev) => {
        const updated = prev.map((c) => {
          const hasStudent = c.enrolledList?.some((s) => s.id === targetDebt.studentId);
          if (hasStudent) {
            const updatedList = (c.enrolledList || []).map((std) => {
              if (std.id === targetDebt.studentId) {
                return {
                  ...std,
                  totalDebt: 0,
                };
              }
              return std;
            });
            const updatedCourse: Course = {
              ...c,
              schoolId: c.schoolId || currentSchool.id,
              enrolledList: updatedList,
            };
            supabaseService.upsertCourse(updatedCourse, c.schoolId || currentSchool.id);
            return updatedCourse;
          }
          return c;
        });
        return updated;
      });
    }
  };

  const archiveFinancialCycle = (archivedTxIds?: string[], archivedExpenseIds?: string[]) => {
    const now = new Date();

    // 1. Settle all teachers belonging to current school (freeze cumulative earnings into settledEarned)
    setRawTeachers((prev) => {
      const updated = prev.map((t) => {
        if (t.schoolId === currentSchool.id || (!t.schoolId && currentSchool.id === 'school-default')) {
          const teacherCourses = currentSchoolCourses.filter((c) => c.teacherId === t.id);
          const { cumulativeEarned } = calculateTeacherDuesFromAttendance(t, teacherCourses);

          const settlementLog: TeacherPayoutLog = {
            id: `cycle-archive-${Date.now()}-${t.id}`,
            amount: 0,
            date: now.toISOString().split('T')[0],
            paymentMethod: 'أرشفة الدورة المالية',
            notes: `تم إقفال وأرشفة الدورة المالية — إجمالي المستحقات المقفلة: ${cumulativeEarned.toLocaleString('fr-DZ')} دج`,
            isCycleSettlement: true,
            settledEarned: cumulativeEarned,
          };

          const updatedTeacher: Teacher = {
            ...t,
            schoolId: t.schoolId || currentSchool.id,
            settledEarned: cumulativeEarned,
            lastSettledDate: now.toISOString().split('T')[0],
            payoutHistory: [settlementLog, ...(t.payoutHistory || [])],
          };
          supabaseService.upsertTeacher(updatedTeacher, currentSchool.id);
          return updatedTeacher;
        }
        return t;
      });
      return updated;
    });

    // 2. Clear/archive transactions for this school that were included in the archive
    if (archivedTxIds && archivedTxIds.length > 0) {
      setTransactions((prev) => prev.filter((tx) => !archivedTxIds.includes(tx.id)));
      archivedTxIds.forEach((id) => {
        supabaseService.deleteTransaction(id);
      });
    }

    // 3. Clear/archive expenses for this school that were included in the archive
    if (archivedExpenseIds && archivedExpenseIds.length > 0) {
      setExpenses((prev) => prev.filter((exp) => !archivedExpenseIds.includes(exp.id)));
      archivedExpenseIds.forEach((id) => {
        supabaseService.deleteExpense(id);
      });
    }
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'receiptNumber'>): Expense => {
    const id = `exp-${Date.now()}`;
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `EXP-${new Date().getFullYear()}-${randomSeq}`;

    const newExpense: Expense = {
      ...expenseData,
      id,
      receiptNumber,
      schoolId: currentSchool.id,
    };

    setExpenses((prev) => [newExpense, ...prev]);
    supabaseService.upsertExpense(newExpense, currentSchool.id);
    return newExpense;
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    supabaseService.deleteExpense(expenseId);
  };

  // Computed KPIs scoped to current active school
  const totalEnrolledStudents = currentSchoolCourses.reduce((acc, c) => acc + (c.enrolledList?.length || 0), 0);
  const totalActiveCourses = currentSchoolCourses.length;
  const totalMonthlyRevenue = (() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return currentSchoolTransactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  })();
  const totalOutstandingDebts = currentSchoolDebts.reduce((acc, d) => acc + (d.remainingAmount || 0), 0);
  const totalExpenses = currentSchoolExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const totalTeachersEarned = teachers.reduce((acc, t) => acc + (t.totalEarned || 0), 0);
  const totalTeachersPaid = teachers.reduce((acc, t) => acc + (t.totalPaid || 0), 0);
  const totalTeachersBalanceDue = teachers.reduce((acc, t) => acc + (t.balanceDue || 0), 0);

  return (
    <DataContext.Provider
      value={{
        schools,
        currentSchool,
        addSchool,
        updateSchool,
        deleteSchool,
        toggleSchoolStatus,
        extendSchoolSubscription,
        setCurrentSchoolId,

        teachers,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        payoutTeacher,
        deleteTeacherPayout,
        resetTeacherPayroll,

        courses: currentSchoolCourses,
        addCourse,
        updateCourse,
        deleteCourse,
        enrollStudentToCourse,
        removeStudentFromCourse,
        incrementStudentSession,
        recordStudentAbsence,
        renewStudentSubscription,
        undoStudentAttendance,

        classrooms: currentSchoolClassrooms,
        addClassroom,
        updateClassroom,
        deleteClassroom,

        transactions: currentSchoolTransactions,
        debts: currentSchoolDebts,
        expenses: currentSchoolExpenses,
        recordPayment,
        addDebt,
        deleteTransaction,
        deleteDebt,
        addExpense,
        deleteExpense,
        archiveFinancialCycle,

        totalEnrolledStudents,
        totalActiveCourses,
        totalMonthlyRevenue,
        totalOutstandingDebts,
        totalTeachersEarned,
        totalTeachersPaid,
        totalTeachersBalanceDue,
        totalExpenses,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
