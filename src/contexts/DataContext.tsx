import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
import { supabase } from '../lib/supabase';
import { supabaseService } from '../services/supabaseService';
import { offlineQueue } from '../services/offlineSync';
import { reconcileStudentFinancials, reconcileCourseStudents } from '../utils/studentFinancials';
import { validateStudentAttendanceRegistration } from '../utils/attendanceValidation';

export interface SingleSessionEnrollConfig {
  isSingleSession: boolean;
  sessionPrice: number;
  teacherAmount: number;
  justification?: string;
  date?: string;
}

export interface DataContextType {
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
  resetTeacherPayroll: (teacherId: string) => { resetStudentsCount: number; remainingStudentsCount: number };

  // Courses & Groups
  courses: Course[];
  addCourse: (course: Course) => void;
  updateCourse: (course: Course) => void;
  deleteCourse: (courseId: string) => void;
  enrollStudentToCourse: (
    courseId: string,
    student: Student,
    singleSessionConfig?: SingleSessionEnrollConfig
  ) => {
    receiptNumber: string;
    studentName: string;
    transaction?: PaymentTransaction;
  };
  updateStudent: (courseId: string, student: Student) => void;
  removeStudentFromCourse: (courseId: string, studentId: string) => void;
  incrementStudentSession: (
    courseId: string,
    studentId: string,
    options?: { method?: 'rfid' | 'manual' | 'barcode'; notes?: string; force?: boolean }
  ) => {
    studentName: string;
    attended: number;
    total: number;
    isExceeded: boolean;
    log?: SessionAttendanceLog;
    blocked?: boolean;
    blockReason?: 'cooldown_2h' | 'debt_second_session';
    errorMessage?: string;
    errorTitle?: string;
  };
  recordStudentAbsence: (
    courseId: string,
    studentId: string,
    isCounted: boolean,
    notes?: string
  ) => { studentName: string; attended: number; total: number; isExceeded: boolean; isCounted: boolean };
  recordBatchAbsence: (
    courseId: string,
    studentIds: string[],
    isCounted: boolean,
    notes?: string
  ) => { count: number; updatedStudents: string[] };
  revertTodayAutoAbsence: (
    courseId: string,
    studentIds?: string[]
  ) => { count: number; revertedStudents: string[] };
  clearTodayAutoAbsentCancellation: (courseId: string) => void;
  renewStudentSubscription: (
    courseId: string,
    studentId: string,
    newTotalSessions: number,
    paidAmount: number,
    customCoursePrice?: number,
    markTodayAttended?: boolean
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
  recordSingleSessionAttendance: (
    courseId: string,
    studentId: string,
    sessionPrice: number,
    teacherAmount: number,
    notes?: string,
    date?: string
  ) => {
    studentName: string;
    attended: number;
    total: number;
    receiptNumber: string;
    sessionPrice: number;
    teacherAmount: number;
    date: string;
    time: string;
  };
  convertSingleSessionToCourse: (
    courseId: string,
    studentId: string,
    newTotalSessions: number,
    paidAmount: number,
    customDate?: string,
    notes?: string
  ) => {
    receiptNumber: string;
    studentName: string;
    courseTitle: string;
    newTotalSessions: number;
    paidAmount: number;
    addedDebt: number;
    previousSingleSessionsCount: number;
    teacherEarnedFromSingles: number;
    date: string;
    time: string;
  };

  // Classrooms
  classrooms: Classroom[];
  addClassroom: (classroom: Classroom) => void;
  updateClassroom: (classroom: Classroom) => void;
  deleteClassroom: (classroomId: string) => void;

  // Payments, Debts & Expenses
  transactions: PaymentTransaction[];
  debts: DebtRecord[];
  expenses: Expense[];
  recordPayment: (
    transaction: PaymentTransaction,
    updateDebtStudentId?: string,
    targetDebtId?: string,
    options?: { autoDeleteDebt?: boolean }
  ) => void;
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

  // Auto-Save & Sync Status
  isAutoSaving: boolean;
  lastSavedTime: Date | null;
  isRefreshing: boolean;
  lastSyncTime: Date | null;
  refreshData: (silent?: boolean) => Promise<boolean>;
  pendingOfflineCount: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DELETED_STUDENTS_KEY = 'school_saas_deleted_students';
const getDeletedStudentIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_STUDENTS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const addDeletedStudentId = (id: string) => {
  try {
    const set = getDeletedStudentIds();
    set.add(id);
    localStorage.setItem(DELETED_STUDENTS_KEY, JSON.stringify(Array.from(set).slice(-500)));
  } catch (e) {
    console.error('Error saving deleted student id:', e);
  }
};

const DELETED_DEBTS_KEY = 'school_saas_deleted_debts';
const getDeletedDebtIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_DEBTS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const addDeletedDebtId = (id: string) => {
  try {
    const set = getDeletedDebtIds();
    set.add(id);
    localStorage.setItem(DELETED_DEBTS_KEY, JSON.stringify(Array.from(set).slice(-500)));
  } catch (e) {
    console.error('Error saving deleted debt id:', e);
  }
};

const removeDeletedDebtId = (id: string) => {
  try {
    const set = getDeletedDebtIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(DELETED_DEBTS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {
    console.error('Error removing deleted debt id:', e);
  }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schools, setSchools] = useState<SchoolTenant[]>(() => storage.getSchools());
  const [currentSchoolId, setCurrentSchoolIdState] = useState<string>(() => storage.getCurrentSchoolId());
  const [rawTeachers, setRawTeachers] = useState<Teacher[]>(() => storage.getTeachers());
  const [courses, setCourses] = useState<Course[]>(() => {
    const localCourses = storage.getCourses();
    const todayStr = new Date().toISOString().split('T')[0];
    return localCourses.map((c) => {
      const isTargetCourse =
        c.title?.includes('4 متوسط') ||
        c.title?.includes('رابعة متوسط') ||
        c.teacherName?.includes('المرغني') ||
        c.teacherName?.includes('مبروك');

      // Course real price is 1500 DZD
      const correctedMonthlyPrice = isTargetCourse && (c.monthlyPrice === 3500 || !c.monthlyPrice) ? 1500 : (c.monthlyPrice || 1500);

      const fixedEnrolledList = (c.enrolledList || []).map((std) => {
        let fixedStd = { ...std };

        // 1. Financial correction: paid 1500 and debt 2000 (was calculated based on wrong 3500 base price)
        if (
          (fixedStd.totalPaid === 1500 && fixedStd.totalDebt === 2000) ||
          (isTargetCourse && fixedStd.totalPaid === 1500 && (fixedStd.totalDebt || 0) > 0)
        ) {
          fixedStd.coursePrice = 1500;
          fixedStd.totalDebt = 0;
        } else if (isTargetCourse && (fixedStd.coursePrice === 3500 || !fixedStd.coursePrice)) {
          fixedStd.coursePrice = 1500;
        }

        // 2. Attendance deduplication: fix any student registered twice today!
        const todayAttendanceLogs = (fixedStd.attendanceLogs || []).filter(
          (l) => l.date === todayStr && (l.status === 'present' || l.type === 'present' || l.status === 'single_session')
        );

        if (todayAttendanceLogs.length > 1) {
          let keptOne = false;
          const cleanedLogs = (fixedStd.attendanceLogs || []).filter((l) => {
            const isTodayAtt = l.date === todayStr && (l.status === 'present' || l.type === 'present' || l.status === 'single_session');
            if (isTodayAtt) {
              if (!keptOne) {
                keptOne = true;
                return true;
              }
              return false; // remove duplicate log
            }
            return true;
          });

          const extraCount = todayAttendanceLogs.length - 1;
          fixedStd.attendanceLogs = cleanedLogs;
          fixedStd.attendedSessions = Math.max(1, (fixedStd.attendedSessions || 1) - extraCount);
        } else if (todayAttendanceLogs.length === 1 && (!fixedStd.attendedSessions || fixedStd.attendedSessions === 0)) {
          fixedStd.attendedSessions = 1;
        }

        return reconcileStudentFinancials(fixedStd, correctedMonthlyPrice);
      });

      return {
        ...c,
        monthlyPrice: correctedMonthlyPrice,
        enrolledList: fixedEnrolledList,
      };
    });
  });
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => storage.getClassrooms());
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => {
    const localTx = storage.getTransactions();
    // Deduplicate any rapid payments recorded within minutes for the same student and amount
    const seen = new Set<string>();
    return localTx.filter((tx) => {
      if (tx.notes?.includes('تجديد اشتراك') && tx.amount === 1500) {
        const key = `${tx.studentId || tx.studentName}-${tx.amount}-${tx.date}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    });
  });
  const [debts, setDebts] = useState<DebtRecord[]>(() => {
    const localDebts = storage.getDebts();
    // Remove erroneous 2000 DZD debt records generated from 1500 paid in 3500 course
    return localDebts.filter((d) => {
      if (d.remainingAmount === 2000 && d.paidAmount === 1500 && d.totalAmount === 3500) return false;
      return true;
    });
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => storage.getExpenses());

  // Prevent background polling / realtime from clobbering recent local user actions
  const lastLocalWriteRef = useRef<number>(0);
  const markLocalWrite = () => {
    lastLocalWriteRef.current = Date.now();
  };

  // Bandwidth & Egress Protection: Track last remote fetch timestamp to prevent excessive egress consumption
  const lastFetchTimeRef = useRef<number>(0);

  // Auto-Save & Sync States
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() => offlineQueue.getPendingCount());

  const triggerAutoSaveEffect = () => {
    setIsAutoSaving(true);
    const timer = setTimeout(() => {
      setIsAutoSaving(false);
      setLastSavedTime(new Date());
      setPendingOfflineCount(offlineQueue.getPendingCount());
    }, 400);
    return () => clearTimeout(timer);
  };

  useEffect(() => {
    storage.setCurrentSchoolId(currentSchoolId);
  }, [currentSchoolId]);

  useEffect(() => {
    storage.setSchools(schools);
    return triggerAutoSaveEffect();
  }, [schools]);

  useEffect(() => {
    storage.setTeachers(rawTeachers);
    return triggerAutoSaveEffect();
  }, [rawTeachers]);

  useEffect(() => {
    storage.setCourses(courses);
    return triggerAutoSaveEffect();
  }, [courses]);

  useEffect(() => {
    storage.setClassrooms(classrooms);
    return triggerAutoSaveEffect();
  }, [classrooms]);

  useEffect(() => {
    storage.setTransactions(transactions);
    return triggerAutoSaveEffect();
  }, [transactions]);

  useEffect(() => {
    storage.setDebts(debts);
    return triggerAutoSaveEffect();
  }, [debts]);

  useEffect(() => {
    storage.setExpenses(expenses);
    return triggerAutoSaveEffect();
  }, [expenses]);

  // Safe Supabase call with automatic offline queue fallback
  const safeSupabaseCall = async (
    action: () => Promise<any>,
    queueType: Parameters<typeof offlineQueue.enqueue>[0],
    queuePayload: any,
    schoolId?: string,
    options?: any
  ) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueue.enqueue(queueType, queuePayload, schoolId, options);
      setPendingOfflineCount(offlineQueue.getPendingCount());
      return null;
    }
    try {
      const res = await action();
      if (!res || res.success === false) {
        offlineQueue.enqueue(queueType, queuePayload, schoolId, options);
        setPendingOfflineCount(offlineQueue.getPendingCount());
      }
      return res;
    } catch {
      offlineQueue.enqueue(queueType, queuePayload, schoolId, options);
      setPendingOfflineCount(offlineQueue.getPendingCount());
      return null;
    }
  };

  const safeSync = {
    upsertSchool: (s: SchoolTenant) => safeSupabaseCall(() => supabaseService.upsertSchool(s), 'upsert_school', s),
    deleteSchool: (id: string) => safeSupabaseCall(() => supabaseService.deleteSchool(id), 'delete_school', id),
    upsertTeacher: (t: Teacher, sId?: string) => safeSupabaseCall(() => supabaseService.upsertTeacher(t, sId), 'upsert_teacher', t, sId),
    deleteTeacher: (id: string) => safeSupabaseCall(() => supabaseService.deleteTeacher(id), 'delete_teacher', id),
    upsertCourse: (c: Course, sId?: string, options?: any) =>
      safeSupabaseCall(
        async () => {
          const res = await supabaseService.upsertCourse(c, sId, options);
          if (res && res.enrolledList) {
            // Update local state if remote merge brought additional students or reconciled updates
            setCourses((prev) =>
              prev.map((item) =>
                item.id === c.id
                  ? { ...item, enrolledList: res.enrolledList, enrolledStudents: res.enrolledList.length }
                  : item
              )
            );
          }
          return res;
        },
        'upsert_course',
        c,
        sId,
        options
      ),
    deleteCourse: (id: string) => safeSupabaseCall(() => supabaseService.deleteCourse(id), 'delete_course', id),
    upsertClassroom: (r: Classroom, sId?: string) => safeSupabaseCall(() => supabaseService.upsertClassroom(r, sId), 'upsert_classroom', r, sId),
    deleteClassroom: (id: string) => safeSupabaseCall(() => supabaseService.deleteClassroom(id), 'delete_classroom', id),
    insertTransaction: (tx: PaymentTransaction, sId?: string) => safeSupabaseCall(() => supabaseService.insertTransaction(tx, sId), 'insert_transaction', tx, sId),
    deleteTransaction: (id: string) => safeSupabaseCall(() => supabaseService.deleteTransaction(id), 'delete_transaction', id),
    upsertDebt: (d: DebtRecord, sId?: string) => safeSupabaseCall(() => supabaseService.upsertDebt(d, sId), 'upsert_debt', d, sId),
    deleteDebt: (id: string, sId?: string) => safeSupabaseCall(() => supabaseService.deleteDebt(id), 'delete_debt', id, sId),
    upsertExpense: (e: Expense, sId?: string) => safeSupabaseCall(() => supabaseService.upsertExpense(e, sId), 'insert_expense', e, sId),
    deleteExpense: (id: string) => safeSupabaseCall(() => supabaseService.deleteExpense(id), 'delete_expense', id),
  };

  // Full Refresh from Supabase + Replaying Offline Queue + Smart Local Preservation
  const refreshData = async (silent: boolean = false): Promise<boolean> => {
    if (isRefreshing) return false;
    // Prevent background refresh from overwriting data right after user made a local change
    if (silent && Date.now() - lastLocalWriteRef.current < 4000) {
      setTimeout(() => {
        refreshData(true);
      }, 4200);
      return false;
    }
    // Bandwidth / Egress protection: Throttle silent background refreshes (min 15s interval)
    const now = Date.now();
    if (silent && now - lastFetchTimeRef.current < 15000) {
      return false;
    }
    lastFetchTimeRef.current = now;
    setIsRefreshing(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        // 1. Process offline queue first if there are pending items
        if (offlineQueue.getPendingCount() > 0) {
          await offlineQueue.processQueue();
          setPendingOfflineCount(offlineQueue.getPendingCount());
        }

        // 2. Fetch fresh data from Supabase
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
          // If current school is dummy default or not in remote, switch to first real school
          if (currentSchoolId === 'school-default' || !remoteSchools.some((s) => s.id === currentSchoolId)) {
            const firstSchoolId = remoteSchools[0].id;
            setCurrentSchoolIdState(firstSchoolId);
            storage.setCurrentSchoolId(firstSchoolId);
          }
        }
        if (remoteClassrooms && remoteClassrooms.length > 0) setClassrooms(remoteClassrooms);
        if (remoteTeachers && remoteTeachers.length > 0) setRawTeachers(remoteTeachers);

        // Smart merge courses with local courses to preserve any newly registered students
        if (remoteCourses && remoteCourses.length > 0) {
          setCourses((prevLocalCourses) => {
            const deletedStudentIds = getDeletedStudentIds();
            const pendingCourseIds = new Set(
              offlineQueue
                .getQueue()
                .filter((q) => q.type === 'upsert_course')
                .map((q) => q.payload?.id)
            );

            const mergedRemote = remoteCourses.map((remoteC) => {
              const localC = prevLocalCourses.find((lc) => lc.id === remoteC.id);
              const monthlyPrice = Number(remoteC.monthlyPrice) || 5000;
              if (!localC) {
                return {
                  ...remoteC,
                  enrolledList: (remoteC.enrolledList || []).map((s) => reconcileStudentFinancials(s, monthlyPrice)),
                };
              }

              const remoteList = remoteC.enrolledList || [];
              const localList = localC.enrolledList || [];

              const studentMap = new Map<string, Student>();

              // 1. Remote students (the server source of truth)
              remoteList.forEach((std) => {
                if (std && std.id && !deletedStudentIds.has(std.id)) {
                  studentMap.set(std.id, reconcileStudentFinancials(std, monthlyPrice));
                }
              });

              // 2. Safely merge local students without clobbering remote updates
              localList.forEach((std) => {
                if (std && std.id && !deletedStudentIds.has(std.id)) {
                  if (!studentMap.has(std.id)) {
                    // Only keep local-only students if pending offline or recently created locally
                    const isPendingOffline = offlineQueue.getQueue().some(
                      (q) => q.type === 'upsert_course' && (q.payload?.enrolledList || []).some((s: any) => s.id === std.id)
                    );
                    const isRecentWrite = Date.now() - lastLocalWriteRef.current < 15000;
                    if (isPendingOffline || isRecentWrite) {
                      studentMap.set(std.id, reconcileStudentFinancials(std, monthlyPrice));
                    }
                  } else {
                    const remoteStd = studentMap.get(std.id)!;
                    const isPendingOffline = offlineQueue.getQueue().some(
                      (q) => q.type === 'upsert_course' && (q.payload?.enrolledList || []).some((s: any) => s.id === std.id)
                    );
                    const isRecentWrite = Date.now() - lastLocalWriteRef.current < 15000;

                    // If this device has no uncommitted local writes or pending offline actions,
                    // trust the authoritative remote student state from Supabase directly!
                    const localRenewLog = (std.attendanceLogs || []).find((l) => l && (l.status === 'renewed' || l.type === 'renewed'));
                    const remoteRenewLog = (remoteStd.attendanceLogs || []).find((l) => l && (l.status === 'renewed' || l.type === 'renewed'));

                    // If remote has a newer renewal that this computer doesn't have yet, accept remote student directly
                    if (remoteRenewLog && !localRenewLog) {
                      studentMap.set(std.id, reconcileStudentFinancials(remoteStd, monthlyPrice));
                    } else if (localRenewLog && !remoteRenewLog) {
                      // Local device just renewed this student and remote hasn't received it yet -> keep local
                      studentMap.set(std.id, reconcileStudentFinancials(std, monthlyPrice));
                    } else if (!isPendingOffline && !isRecentWrite) {
                      studentMap.set(std.id, reconcileStudentFinancials(remoteStd, monthlyPrice));
                    } else {
                      const logMap = new Map<string, SessionAttendanceLog>();
                      (remoteStd.attendanceLogs || []).forEach((l) => { if (l && l.id) logMap.set(l.id, l); });
                      (std.attendanceLogs || []).forEach((l) => { if (l && l.id) logMap.set(l.id, l); });

                      const isExempt = !!(remoteStd.isExempt || std.isExempt);
                      const maxPaid = Math.max(remoteStd.totalPaid || 0, std.totalPaid || 0);

                      const mergedLogs = Array.from(logMap.values()).sort((a, b) => {
                        const dateComp = (b.date || '').localeCompare(a.date || '');
                        if (dateComp !== 0) return dateComp;
                        const timeComp = (b.time || '').localeCompare(a.time || '');
                        if (timeComp !== 0) return timeComp;
                        return (b.id || '').localeCompare(a.id || '');
                      });

                      const latestRenewLog = mergedLogs.find((l) => l && (l.status === 'renewed' || l.type === 'renewed'));
                      let activeCycleSessions = 0;
                      if (latestRenewLog) {
                        const renewDate = latestRenewLog.date || '';
                        const renewTime = latestRenewLog.time || '';
                        activeCycleSessions = mergedLogs.filter((l) => {
                          if (!l) return false;
                          const st = l.status || l.type;
                          const isSession = st === 'present' || st === 'absent_counted' || st === 'single_session';
                          if (!isSession) return false;
                          const logDate = l.date || '';
                          if (logDate > renewDate) return true;
                          if (logDate === renewDate) {
                            return (
                              l.sessionNumber === 1 ||
                              l.notes?.includes('مجدد') ||
                              l.notes?.includes('الدورة الجديدة') ||
                              (l.time || '') >= renewTime
                            );
                          }
                          return false;
                        }).length;
                      } else {
                        activeCycleSessions = mergedLogs.filter((l) => {
                          const st = l.status || l.type;
                          return st === 'present' || st === 'absent_counted' || st === 'single_session';
                        }).length;
                      }

                      let mergedAttended = Math.max(activeCycleSessions, remoteStd.attendedSessions || 0, std.attendedSessions || 0);
                      let mergedDebt = isExempt
                        ? 0
                        : Math.min(
                            remoteStd.totalDebt !== undefined ? remoteStd.totalDebt : 999999,
                            std.totalDebt !== undefined ? std.totalDebt : 999999
                          );
                      if (mergedDebt === 999999) mergedDebt = 0;

                      const baseStd = (remoteRenewLog && !localRenewLog)
                        ? { ...std, ...remoteStd }
                        : { ...remoteStd, ...std };

                      const candidate: Student = {
                        ...baseStd,
                        isExempt,
                        totalPaid: maxPaid,
                        totalDebt: mergedDebt,
                        attendanceLogs: mergedLogs,
                        attendedSessions: mergedAttended,
                        totalSessions: (remoteRenewLog && !localRenewLog)
                          ? (remoteStd.totalSessions || std.totalSessions || 4)
                          : (std.totalSessions || remoteStd.totalSessions || 4),
                      };

                      studentMap.set(std.id, reconcileStudentFinancials(candidate, monthlyPrice));
                    }
                  }
                }
              });

              const mergedList = Array.from(studentMap.values());
              return {
                ...remoteC,
                enrolledList: mergedList,
                enrolledStudents: mergedList.length,
              };
            });

            // Preserve newly created local courses only if pending in offline queue or created recently
            const remoteMap = new Map<string, Course>();
            mergedRemote.forEach((c) => remoteMap.set(c.id, c));
            prevLocalCourses.forEach((lc) => {
              if (!remoteMap.has(lc.id)) {
                if (pendingCourseIds.has(lc.id) || Date.now() - lastLocalWriteRef.current < 15000) {
                  remoteMap.set(lc.id, lc);
                }
              }
            });
            return Array.from(remoteMap.values());
          });
        }

        // Smart merge transactions (keep any unsynced local transaction)
        if (remoteTransactions && remoteTransactions.length > 0) {
          setTransactions((prevLocal) => {
            const txMap = new Map<string, PaymentTransaction>();
            remoteTransactions.forEach((t) => txMap.set(t.id, t));
            const pendingTxIds = new Set(
              offlineQueue
                .getQueue()
                .filter((q) => q.type === 'insert_transaction')
                .map((q) => q.payload?.id)
            );
            prevLocal.forEach((t) => {
              if (!txMap.has(t.id) && (pendingTxIds.has(t.id) || Date.now() - lastLocalWriteRef.current < 15000)) {
                txMap.set(t.id, t);
              }
            });
            return Array.from(txMap.values());
          });
        }

        // Smart merge debts (keep any unsynced local debt and respect deleted debts)
        if (remoteDebts && remoteDebts.length > 0) {
          setDebts((prevLocal) => {
            const deletedDebtIds = getDeletedDebtIds();
            const localMap = new Map<string, DebtRecord>();
            prevLocal.forEach((d) => {
              if (!deletedDebtIds.has(d.id)) {
                localMap.set(d.id, d);
              }
            });

            const debtMap = new Map<string, DebtRecord>();

            // 1. Process remote debts (the source of truth)
            remoteDebts.forEach((remoteD) => {
              if (deletedDebtIds.has(remoteD.id)) return;

              const localD = localMap.get(remoteD.id);
              if (!localD) {
                debtMap.set(remoteD.id, remoteD);
              } else {
                // If local debt is marked paid or has higher paid amount, keep local!
                const localIsMorePaid = (localD.paidAmount || 0) > (remoteD.paidAmount || 0);
                const localIsPaidStatus = localD.status === 'paid' && remoteD.status !== 'paid';

                if (localIsMorePaid || localIsPaidStatus) {
                  debtMap.set(localD.id, localD);
                } else {
                  debtMap.set(remoteD.id, {
                    ...remoteD,
                    studentPhone: remoteD.studentPhone || localD.studentPhone,
                  });
                }
              }
            });

            // 2. Only preserve local debts that are pending in offline queue or created in last 15s
            const pendingDebtIds = new Set(
              offlineQueue
                .getQueue()
                .filter((q) => q.type === 'upsert_debt')
                .map((q) => q.payload?.id)
            );
            localMap.forEach((localD, id) => {
              if (!debtMap.has(id) && (pendingDebtIds.has(id) || Date.now() - lastLocalWriteRef.current < 15000)) {
                debtMap.set(id, localD);
              }
            });

            return Array.from(debtMap.values());
          });
        }

        if (remoteExpenses && remoteExpenses.length > 0) setExpenses(remoteExpenses);

        setLastSyncTime(new Date());
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Auto-refresh error (operating locally):', err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-Refresh Triggers: Initial hydration + Smart Tab focus + Reconnection + Supabase Realtime
  // Egress Bandwidth Optimized: eliminated aggressive 25s polling and redundant focus downloads
  useEffect(() => {
    refreshData(true);

    const handleFocusOrVisibility = () => {
      // Only refetch on focus/visibility if at least 5 minutes have passed since last fetch
      if (document.visibilityState === 'visible' && Date.now() - lastFetchTimeRef.current >= 5 * 60 * 1000) {
        refreshData(true);
      }
    };

    const handleOnline = () => {
      refreshData(false);
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);
    window.addEventListener('online', handleOnline);

    // Passive fallback interval: only runs every 15 minutes as safety net instead of aggressive 25 seconds
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && document.visibilityState === 'visible') {
        if (Date.now() - lastFetchTimeRef.current >= 15 * 60 * 1000) {
          refreshData(true);
        }
      }
    }, 15 * 60 * 1000);

    // Supabase Realtime listener with debounce for smooth multi-user synchronization
    let realtimeTimeout: any = null;
    const triggerDebouncedRefresh = () => {
      if (realtimeTimeout) clearTimeout(realtimeTimeout);
      realtimeTimeout = setTimeout(() => {
        // Reset lastFetchTimeRef so real-time updates from other computers are not blocked by the throttle
        lastFetchTimeRef.current = 0;
        refreshData(true);
      }, 1500);
    };

    const channel = supabase
      .channel('school-saas-realtime-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_transactions' },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debts' },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classrooms' },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schools' },
        triggerDebouncedRefresh
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
      if (realtimeTimeout) clearTimeout(realtimeTimeout);
      supabase.removeChannel(channel);
    };
  }, []);

  // Current School resolution
  const currentSchool =
    schools.find((s) => s.id === currentSchoolId) ||
    schools[0] || {
      id: 'school-1788371708568',
      name: 'مدرسة النور',
      code: 'SCH-9861',
      username: 'nour2026',
      password: 'adminnour2006',
      phone: '0673818821',
      email: 'nour2026@school.dz',
      address: 'كوينين ، بجانب مسجد أبي بكر الصديق ، الوادي',
      wilaya: 'كوينين ، الوادي',
      plan: 'professional' as const,
      planStatus: 'active' as const,
      subscriptionStart: '2026-09-02',
      subscriptionEnd: '2027-09-02',
      studentsCount: 0,
      revenueGenerated: 20000,
      logoText: 'مدرسة النور',
    };

  // Helper to match items belonging to current school across tenant aliases
  const isMatchingSchool = (targetSchoolId?: string | null) => {
    if (!targetSchoolId) return true;
    if (targetSchoolId === currentSchool.id) return true;
    if (
      (targetSchoolId === 'school-default' && currentSchool.id === 'school-1788371708568') ||
      (targetSchoolId === 'school-1788371708568' && currentSchool.id === 'school-default')
    ) {
      return true;
    }
    return false;
  };

  // Filter scoped data strictly for current active school
  const currentSchoolClassrooms = classrooms.filter((c) => isMatchingSchool(c.schoolId));
  const currentSchoolCourses = courses.filter((c) => isMatchingSchool(c.schoolId));
  const currentSchoolTransactions = transactions.filter((t) => isMatchingSchool(t.schoolId));
  const currentSchoolDebts = debts.filter((d) => isMatchingSchool(d.schoolId));
  const currentSchoolExpenses = expenses.filter((e) => isMatchingSchool(e.schoolId));
  const currentSchoolRawTeachers = rawTeachers.filter((t) => isMatchingSchool(t.schoolId));

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
    const fixedRate = teacher.fixedRatePerStudent !== undefined ? teacher.fixedRatePerStudent : (teacher.fixedCourseRate !== undefined ? teacher.fixedCourseRate : 1000);

    let cumulativeEarned = 0;
    let totalAttendedSessions = 0;
    let totalCountedAbsences = 0;

    teacherCourses.forEach((c) => {
      const defaultQuota = c.totalSessionsDefault || 5;
      const coursePrice = c.monthlyPrice || 0;
      const list = c.enrolledList || [];

      if (compensationType === 'fixed_per_student' || (compensationType as string) === 'fixed_per_course') {
        // Fixed amount per student (e.g. 1000 DZD per student for the course cycle, school keeps remainder)
        list.forEach((std) => {
          const studentQuota = std.totalSessions || defaultQuota || 5;
          const teacherSharePerSession = fixedRate / (studentQuota > 0 ? studentQuota : 5);

          const allLogs = std.attendanceLogs || [];
          const latestRenewalIdx = allLogs.findIndex((l) => l.status === 'renewed' || l.type === 'renewed');
          const logs = latestRenewalIdx === -1 ? allLogs : allLogs.slice(0, latestRenewalIdx);

          const presentLogsCount = logs.filter((l) => l.status === 'present').length;
          const absentCountedLogsCount = logs.filter((l) => l.status === 'absent_counted').length;
          // Single-session logs are independent individual sessions; they are preserved from allLogs
          // so teacher earnings are never lost when the student enrolls in a full course or renews.
          const singleSessionLogs = allLogs.filter((l) => l.status === 'single_session' || l.type === 'single_session');
          const singleSessionTeacherAmount = singleSessionLogs.reduce((acc, l) => acc + (l.teacherAmount || 0), 0);

          const countedSessions =
            logs.length > 0
              ? presentLogsCount + absentCountedLogsCount
              : (std.attendedSessions || 0);

          const presentSessions = logs.length > 0 ? (presentLogsCount + singleSessionLogs.length) : (std.attendedSessions || 0);
          const absentCountedSessions = logs.length > 0 ? absentCountedLogsCount : 0;

          totalAttendedSessions += presentSessions;
          totalCountedAbsences += absentCountedSessions;

          const isExempt = !!std.isExempt;
          if (!isExempt) {
            cumulativeEarned += (countedSessions * teacherSharePerSession) + singleSessionTeacherAmount;
          } else {
            cumulativeEarned += singleSessionTeacherAmount;
          }
        });
      } else {
        // Percentage per student ('percentage_per_student')
        list.forEach((std) => {
          const studentQuota = std.totalSessions || defaultQuota || 5;
          const perSessionPrice = coursePrice / (studentQuota > 0 ? studentQuota : 5);
          const teacherSharePerSession = perSessionPrice * (commission / 100);

          const allLogs = std.attendanceLogs || [];
          const latestRenewalIdx = allLogs.findIndex((l) => l.status === 'renewed' || l.type === 'renewed');
          const logs = latestRenewalIdx === -1 ? allLogs : allLogs.slice(0, latestRenewalIdx);

          const presentLogsCount = logs.filter((l) => l.status === 'present').length;
          const absentCountedLogsCount = logs.filter((l) => l.status === 'absent_counted').length;
          // Single-session logs are independent individual sessions; they are preserved from allLogs
          // so teacher earnings are never lost when the student enrolls in a full course or renews.
          const singleSessionLogs = allLogs.filter((l) => l.status === 'single_session' || l.type === 'single_session');
          const singleSessionTeacherAmount = singleSessionLogs.reduce((acc, l) => acc + (l.teacherAmount || 0), 0);

          const countedSessions =
            logs.length > 0
              ? presentLogsCount + absentCountedLogsCount
              : (std.attendedSessions || 0);

          const presentSessions = logs.length > 0 ? (presentLogsCount + singleSessionLogs.length) : (std.attendedSessions || 0);
          const absentCountedSessions = logs.length > 0 ? absentCountedLogsCount : 0;

          totalAttendedSessions += presentSessions;
          totalCountedAbsences += absentCountedSessions;

          const isExempt = !!std.isExempt;
          if (!isExempt) {
            cumulativeEarned += (countedSessions * teacherSharePerSession) + singleSessionTeacherAmount;
          } else {
            cumulativeEarned += singleSessionTeacherAmount;
          }
        });
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
    const fixedRate = t.fixedRatePerStudent !== undefined ? t.fixedRatePerStudent : (t.fixedCourseRate !== undefined ? t.fixedCourseRate : 1000);

    // 1. Calculate cumulative earned directly from ALL student attendance and counted absences
    const { cumulativeEarned, totalAttendedSessions, totalCountedAbsences } =
      calculateTeacherDuesFromAttendance(t, teacherCourses);

    // 2. Extract payout history and latest settlement
    const history = t.payoutHistory || [];
    const lastSettlementIndex = history.findIndex((p) => p.isCycleSettlement);
    const lastSettlement = lastSettlementIndex !== -1 ? history[lastSettlementIndex] : null;

    // 3. settledEarned = the cumulative earned amount that was frozen at the last settlement/reset
    const settledEarned =
      t.settledEarned !== undefined && t.settledEarned > 0
        ? t.settledEarned
        : Number(lastSettlement?.settledEarned) || 0;

    // 4. Current cycle earned = what's newly earned from attendance since the last settlement
    const currentCycleEarned = Math.max(0, cumulativeEarned - settledEarned);

    // 5. Current cycle paid = payouts recorded AFTER the latest settlement marker
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
      fixedRatePerStudent: fixedRate,
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
    safeSync.upsertSchool(school);
  };

  const updateSchool = (school: SchoolTenant) => {
    setSchools((prev) => prev.map((s) => (s.id === school.id ? school : s)));
    safeSync.upsertSchool(school);
  };

  const deleteSchool = (schoolId: string) => {
    const remainingSchools = schools.filter((s) => s.id !== schoolId);
    setSchools(remainingSchools);
    safeSync.deleteSchool(schoolId);

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
        safeSync.upsertSchool(fallbackSchool);
      }
    }
  };

  const toggleSchoolStatus = (schoolId: string) => {
    setSchools((prev) => {
      const updated = prev.map((s) =>
        s.id === schoolId ? { ...s, planStatus: s.planStatus === 'active' ? ('suspended' as const) : ('active' as const) } : s
      );
      const target = updated.find((s) => s.id === schoolId);
      if (target) safeSync.upsertSchool(target);
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
          safeSync.upsertSchool(updatedSch);
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
    safeSync.upsertTeacher(teacherWithSchool, currentSchool.id);
  };

  const updateTeacher = (teacher: Teacher) => {
    const teacherWithSchool: Teacher = { ...teacher, schoolId: teacher.schoolId || currentSchool.id };
    setRawTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacherWithSchool : t)));
    safeSync.upsertTeacher(teacherWithSchool, currentSchool.id);
  };

  const deleteTeacher = (teacherId: string) => {
    setRawTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    safeSync.deleteTeacher(teacherId);
  };

  const payoutTeacher = (teacherId: string, amount: number, paymentMethod: string = 'نقداً (Cash)', notes: string = '') => {
    markLocalWrite();
    const newPayoutLog: TeacherPayoutLog = {
      id: `payout-${Date.now()}`,
      amount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      notes,
    };

    let teacherToSync: Teacher | null = null;

    setRawTeachers((prev) => {
      const updated = prev.map((t) => {
        if (t.id === teacherId) {
          const updatedTeacher: Teacher = {
            ...t,
            schoolId: t.schoolId || currentSchool.id,
            payoutHistory: [newPayoutLog, ...(t.payoutHistory || [])],
          };
          teacherToSync = updatedTeacher;
          return updatedTeacher;
        }
        return t;
      });
      return updated;
    });

    if (teacherToSync) {
      safeSync.upsertTeacher(teacherToSync, currentSchool.id);
    }
  };

  const deleteTeacherPayout = (teacherId: string, payoutId: string) => {
    markLocalWrite();
    let teacherToSync: Teacher | null = null;

    setRawTeachers((prev) => {
      const updated = prev.map((t) => {
        if (t.id === teacherId) {
          const updatedTeacher: Teacher = {
            ...t,
            schoolId: t.schoolId || currentSchool.id,
            payoutHistory: (t.payoutHistory || []).filter((p) => p.id !== payoutId),
          };
          teacherToSync = updatedTeacher;
          return updatedTeacher;
        }
        return t;
      });
      return updated;
    });

    if (teacherToSync) {
      safeSync.upsertTeacher(teacherToSync, currentSchool.id);
    }
  };

  const resetTeacherPayroll = (teacherId: string): { resetStudentsCount: number; remainingStudentsCount: number } => {
    markLocalWrite();
    const now = new Date();
    let resetStudentsCount = 0;
    let remainingStudentsCount = 0;

    // 1. Identify teacher and courses synchronously
    const currentTeacher = currentSchoolRawTeachers.find((t) => t.id === teacherId);
    const teacherCoursesBeforeReset = currentSchoolCourses.filter((c) => c.teacherId === teacherId);
    const { cumulativeEarned: frozenEarned } = currentTeacher
      ? calculateTeacherDuesFromAttendance(currentTeacher, teacherCoursesBeforeReset)
      : { cumulativeEarned: 0 };

    // 2. Prepare updated courses and debt records synchronously for all courses belonging to this teacher
    const newDebtsToCreate: DebtRecord[] = [];
    const updatedCoursesForTeacher: Course[] = [];
    const updatedAllCourses = courses.map((c) => {
      if (c.teacherId === teacherId) {
        const updatedEnrolledList = (c.enrolledList || []).map((std) => {
          const quota =
            std.totalSessions && std.totalSessions > 0
              ? std.totalSessions
              : c.totalSessionsDefault && c.totalSessionsDefault > 0
              ? c.totalSessionsDefault
              : 4;
          const attended = std.attendedSessions || 0;
          const hasCompletedQuota = attended >= quota;

          if (hasCompletedQuota) {
            resetStudentsCount++;
            const cycleResetLog: SessionAttendanceLog = {
              id: `log-cycle-${Date.now()}-${std.id}`,
              sessionNumber: 0,
              date: now.toISOString().split('T')[0],
              time: now.toTimeString().split(' ')[0].substring(0, 5),
              status: 'renewed',
              type: 'renewed',
              notes: `بدء دورة جديدة بعد اكتمال الحصص (${attended}/${quota}) وتسوية دورة الأستاذ`,
            };

            const coursePrice =
              std.coursePrice !== undefined && std.coursePrice > 0
                ? Number(std.coursePrice)
                : Number(c.monthlyPrice) || 0;

            const isExempt = !!std.isExempt;
            const newDebtAmount = isExempt ? 0 : coursePrice;

            if (!isExempt && newDebtAmount > 0) {
              newDebtsToCreate.push({
                id: `dbt-cycle-${Date.now()}-${std.id}`,
                schoolId: currentSchool.id,
                studentId: std.id,
                studentName: std.fullName || 'تلميذ',
                studentPhone: std.phone || '',
                courseTitle: c.title || 'دورة تعليمية',
                totalAmount: newDebtAmount,
                paidAmount: 0,
                remainingAmount: newDebtAmount,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'unpaid',
              });
            }

            const updatedStd: Student = {
              ...std,
              attendedSessions: 0,
              totalDebt: newDebtAmount,
              attendanceLogs: [cycleResetLog, ...(std.attendanceLogs || [])],
            };

            return reconcileStudentFinancials(updatedStd, coursePrice);
          } else {
            remainingStudentsCount++;
            return std;
          }
        });

        const updatedCourse: Course = {
          ...c,
          schoolId: c.schoolId || currentSchool.id,
          enrolledList: updatedEnrolledList,
          enrolledStudents: updatedEnrolledList.length,
        };
        updatedCoursesForTeacher.push(updatedCourse);
        return updatedCourse;
      }
      return c;
    });

    // 3. Compute baseline dues for ongoing students synchronously
    const baselineOngoingEarned = currentTeacher
      ? calculateTeacherDuesFromAttendance(currentTeacher, updatedCoursesForTeacher).cumulativeEarned
      : 0;

    const settlementLog: TeacherPayoutLog = {
      id: `cycle-${Date.now()}`,
      amount: 0,
      date: now.toISOString().split('T')[0],
      paymentMethod: 'تسوية الدورة',
      notes: `تمت تسوية الحساب وبدء دورة جديدة — إجمالي المستحقات المقفلة: ${frozenEarned.toLocaleString('fr-DZ')} دج`,
      isCycleSettlement: true,
      settledEarned: baselineOngoingEarned,
    };

    let updatedTeacherObj: Teacher | null = null;
    const updatedAllTeachers = rawTeachers.map((t) => {
      if (t.id === teacherId) {
        const updatedTeacher: Teacher = {
          ...t,
          schoolId: t.schoolId || currentSchool.id,
          settledEarned: baselineOngoingEarned,
          lastSettledDate: now.toISOString().split('T')[0],
          payoutHistory: [settlementLog, ...(t.payoutHistory || [])],
        };
        updatedTeacherObj = updatedTeacher;
        return updatedTeacher;
      }
      return t;
    });

    // 4. Update React state and write to localStorage immediately
    setCourses(updatedAllCourses);
    storage.setCourses(updatedAllCourses);

    setRawTeachers(updatedAllTeachers);
    storage.setTeachers(updatedAllTeachers);

    // Save newly created debts if any
    if (newDebtsToCreate.length > 0) {
      setDebts((prev) => [...newDebtsToCreate, ...prev]);
      storage.setDebts([...newDebtsToCreate, ...storage.getDebts()]);
      newDebtsToCreate.forEach((d) => safeSync.upsertDebt(d, currentSchool.id));
    }

    // 5. Explicitly sync updated courses to Supabase with skipMerge: true to avoid clobbering reset
    updatedCoursesForTeacher.forEach((uc) => {
      safeSync.upsertCourse(uc, uc.schoolId || currentSchool.id, { skipMerge: true });
    });

    // Sync updated teacher to Supabase
    if (updatedTeacherObj) {
      safeSync.upsertTeacher(updatedTeacherObj, currentSchool.id);
    }

    return { resetStudentsCount, remainingStudentsCount };
  };

  // Course Actions
  const addCourse = (course: Course) => {
    const courseWithSchool: Course = { ...course, schoolId: currentSchool.id };
    setCourses((prev) => [courseWithSchool, ...prev]);
    safeSync.upsertCourse(courseWithSchool, currentSchool.id);
  };

  const updateCourse = (course: Course) => {
    const courseWithSchool: Course = { ...course, schoolId: course.schoolId || currentSchool.id };
    setCourses((prev) => prev.map((c) => (c.id === course.id ? courseWithSchool : c)));
    safeSync.upsertCourse(courseWithSchool, currentSchool.id);
  };

  const deleteCourse = (courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    safeSync.deleteCourse(courseId);
  };

  const enrollStudentToCourse = (
    courseId: string,
    student: Student,
    singleSessionConfig?: SingleSessionEnrollConfig
  ) => {
    markLocalWrite();
    const isSingleSession = !!singleSessionConfig?.isSingleSession;
    const now = new Date();
    const sessionDate = singleSessionConfig?.date || student.registrationDate || now.toISOString().split('T')[0];
    const sessionTime = now.toTimeString().split(' ')[0].substring(0, 5);

    const initialReceiptNo = isSingleSession
      ? `REC-SS-${Date.now().toString().slice(-6)}`
      : `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    let studentToEnroll = { ...student };

    if (isSingleSession) {
      const price = Number(singleSessionConfig.sessionPrice) || 0;
      const teacherAmt = Number(singleSessionConfig.teacherAmount) || 0;
      const justif = singleSessionConfig.justification?.trim() || '';

      const singleSessionLog: SessionAttendanceLog = {
        id: `log-ss-${Date.now()}`,
        sessionNumber: 1,
        date: sessionDate,
        time: sessionTime,
        status: 'single_session',
        type: 'single_session',
        amount: price,
        teacherAmount: teacherAmt,
        notes: justif
          ? `حضور حصة واحدة مسددة - تبرير: ${justif} (${price} دج - نصيب الأستاذ: ${teacherAmt} دج)`
          : `حضور حصة واحدة مسددة (${price} دج - نصيب الأستاذ: ${teacherAmt} دج)`,
      };

      studentToEnroll = {
        ...student,
        totalSessions: 1,
        attendedSessions: 1,
        totalPaid: price,
        totalDebt: 0,
        notes: justif ? `حصة واحدة: ${justif}` : (student.notes || 'حصة واحدة مسددة'),
        attendanceLogs: [singleSessionLog, ...(student.attendanceLogs || [])],
      };
    } else if (student.totalPaid > 0) {
      const initPaymentLog: SessionAttendanceLog = {
        id: `log-pay-init-${Date.now()}`,
        sessionNumber: 0,
        date: student.registrationDate || now.toISOString().split('T')[0],
        time: sessionTime,
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

    let courseTitle = student.enrolledCourseTitle || 'دورة تعليمية';
    let updatedCourseToSync: Course | null = null;

    setCourses((prev) => {
      return prev.map((c) => {
        if (c.id === courseId) {
          courseTitle = c.title || courseTitle;
          studentToEnroll.enrolledCourseTitle = courseTitle;
          // Prevent accidental duplicate insertion if student ID or name already in this list
          const existingList = (c.enrolledList || []).filter((s) => s.id !== studentToEnroll.id);
          const newList = [studentToEnroll, ...existingList];
          const updatedCourse: Course = {
            ...c,
            schoolId: c.schoolId || currentSchool.id,
            enrolledList: newList,
            enrolledStudents: newList.length,
          };
          updatedCourseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
    });

    if (updatedCourseToSync) {
      safeSync.upsertCourse(updatedCourseToSync, (updatedCourseToSync as Course).schoolId || currentSchool.id);
    }

    // If there is initial debt, record it (only for regular subscription)
    if (!isSingleSession && student.totalDebt > 0) {
      const newDebt: DebtRecord = {
        id: `dbt-${Date.now()}`,
        schoolId: currentSchool.id,
        studentId: student.id,
        studentName: student.fullName,
        studentPhone: student.phone,
        courseTitle: courseTitle,
        totalAmount: student.totalPaid + student.totalDebt,
        paidAmount: student.totalPaid,
        remainingAmount: student.totalDebt,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: student.totalPaid > 0 ? 'partial' : 'unpaid',
      };
      removeDeletedDebtId(newDebt.id);
      setDebts((prev) => [newDebt, ...prev]);
      safeSync.upsertDebt(newDebt, currentSchool.id);
    }

    // Record transaction in received payments (Cash only)
    let createdTx: PaymentTransaction | undefined;
    if (isSingleSession) {
      const price = Number(singleSessionConfig.sessionPrice) || 0;
      const teacherAmt = Number(singleSessionConfig.teacherAmount) || 0;
      const justif = singleSessionConfig.justification?.trim() || '';

      if (price > 0) {
        createdTx = {
          id: `tx-ss-${Date.now()}`,
          schoolId: currentSchool.id,
          receiptNumber: initialReceiptNo,
          studentId: student.id,
          studentName: student.fullName,
          courseTitle: courseTitle,
          amount: price,
          paymentMethod: 'cash',
          date: sessionDate,
          status: 'completed',
          recordedBy: 'إدارة المؤسسة',
          notes: `تسديد رسم حصة واحدة (مستحق الأستاذ: ${teacherAmt} دج)` + (justif ? ` - تبرير: ${justif}` : ''),
        };
        setTransactions((prev) => [createdTx!, ...prev]);
        safeSync.insertTransaction(createdTx, currentSchool.id);
      }
    } else if (student.totalPaid > 0) {
      createdTx = {
        id: `tx-${Date.now()}`,
        schoolId: currentSchool.id,
        receiptNumber: initialReceiptNo,
        studentId: student.id,
        studentName: student.fullName,
        courseTitle: courseTitle,
        amount: student.totalPaid,
        paymentMethod: 'cash',
        date: student.registrationDate || now.toISOString().split('T')[0],
        status: 'completed',
        recordedBy: 'إدارة المؤسسة',
        notes: 'دفعة أولية نقدية عند التسجيل',
      };
      setTransactions((prev) => [createdTx!, ...prev]);
      safeSync.insertTransaction(createdTx, currentSchool.id);
    }

    return {
      receiptNumber: initialReceiptNo,
      studentName: student.fullName,
      transaction: createdTx,
    };
  };

  const removeStudentFromCourse = (courseId: string, studentId: string) => {
    markLocalWrite();
    addDeletedStudentId(studentId);
    let updatedCourseToSync: Course | null = null;
    setCourses((prev) => {
      return prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).filter((std) => std.id !== studentId);
          const updatedCourse: Course = {
            ...c,
            schoolId: c.schoolId || currentSchool.id,
            enrolledList: updatedList,
            enrolledStudents: updatedList.length,
          };
          updatedCourseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
    });

    if (updatedCourseToSync) {
      safeSync.upsertCourse(updatedCourseToSync, (updatedCourseToSync as Course).schoolId || currentSchool.id, { deletedStudentIds: [studentId] });
    }
  };

  const updateStudent = (courseId: string, updatedStudent: Student) => {
    markLocalWrite();
    const coursesToSync: Course[] = [];
    setCourses((prev) => {
      return prev.map((c) => {
        const isInThisCourse = c.id === courseId || (c.enrolledList && c.enrolledList.some((s) => s.id === updatedStudent.id));
        if (isInThisCourse) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === updatedStudent.id) {
              const candidate =
                c.id === courseId || !courseId
                  ? updatedStudent
                  : {
                      ...std,
                      fullName: updatedStudent.fullName,
                      phone: updatedStudent.phone,
                      parentPhone: updatedStudent.parentPhone,
                      parentName: updatedStudent.parentName,
                      academicLevel: updatedStudent.academicLevel,
                      gender: updatedStudent.gender,
                    };
              return reconcileStudentFinancials(candidate, c.monthlyPrice);
            }
            return std;
          });
          const updatedCourse: Course = {
            ...c,
            schoolId: c.schoolId || currentSchool.id,
            enrolledList: updatedList,
          };
          coursesToSync.push(updatedCourse);
          return updatedCourse;
        }
        return c;
      });
    });

    coursesToSync.forEach((uc) => {
      safeSync.upsertCourse(uc, uc.schoolId || currentSchool.id);
    });

    // Update related debts if name, phone, debt amount, or price changed
    const debtsToUpsert: DebtRecord[] = [];
    setDebts((prev) => {
      let foundDebt = false;
      const updatedDebts = prev.map((d) => {
        if (d.studentId === updatedStudent.id) {
          foundDebt = true;
          const courseTotal = updatedStudent.coursePrice ?? (updatedStudent.totalPaid + updatedStudent.totalDebt);
          const updatedDebt: DebtRecord = {
            ...d,
            studentName: updatedStudent.fullName,
            studentPhone: updatedStudent.phone,
            totalAmount: courseTotal > 0 ? courseTotal : d.totalAmount,
            paidAmount: updatedStudent.totalPaid || d.paidAmount || 0,
            remainingAmount: updatedStudent.totalDebt,
            status: updatedStudent.totalDebt <= 0 ? 'paid' : (updatedStudent.totalPaid || 0) > 0 ? 'partial' : 'unpaid',
          };
          debtsToUpsert.push(updatedDebt);
          return updatedDebt;
        }
        return d;
      });

      // If student has debt now but no debt record existed, add one
      if (!foundDebt && updatedStudent.totalDebt > 0) {
        const courseTotal = updatedStudent.coursePrice ?? (updatedStudent.totalPaid + updatedStudent.totalDebt);
        const newDebt: DebtRecord = {
          id: `dbt-${Date.now()}`,
          schoolId: currentSchool.id,
          studentId: updatedStudent.id,
          studentName: updatedStudent.fullName,
          studentPhone: updatedStudent.phone,
          courseTitle: updatedStudent.enrolledCourseTitle || '',
          totalAmount: courseTotal,
          paidAmount: updatedStudent.totalPaid || 0,
          remainingAmount: updatedStudent.totalDebt,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: (updatedStudent.totalPaid || 0) > 0 ? 'partial' : 'unpaid',
        };
        debtsToUpsert.push(newDebt);
        return [newDebt, ...updatedDebts];
      }

      return updatedDebts;
    });

    debtsToUpsert.forEach((ud) => {
      safeSync.upsertDebt(ud, currentSchool.id);
    });

    // Update related transactions if student name changed
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.studentId === updatedStudent.id) {
          return {
            ...t,
            studentName: updatedStudent.fullName,
          };
        }
        return t;
      })
    );
  };

  const incrementStudentSession = (
    courseId: string,
    studentId: string,
    options?: { method?: 'rfid' | 'manual' | 'barcode'; notes?: string; force?: boolean }
  ) => {
    markLocalWrite();
    let studentName = '';
    let attended = 0;
    let total = 5;
    let createdLog: SessionAttendanceLog | undefined;
    let courseToSync: Course | null = null;

    // Pre-check attendance validation (Debt rule & 2-hour cooldown)
    const existingCourse = courses.find((c) => c.id === courseId);
    const existingStudent = existingCourse?.enrolledList?.find((s) => s.id === studentId);

    if (existingStudent && !options?.force) {
      const validation = validateStudentAttendanceRegistration(existingStudent);
      if (!validation.allowed) {
        return {
          studentName: existingStudent.fullName,
          attended: existingStudent.attendedSessions || 0,
          total: existingStudent.totalSessions || 5,
          isExceeded: false,
          blocked: true,
          blockReason: validation.blockReason,
          errorMessage: validation.errorMessage,
          errorTitle: validation.errorTitle,
        };
      }
    }

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              studentName = std.fullName;
              attended = (std.attendedSessions || 0) + 1;
              total = std.totalSessions || 5;

              const now = new Date();
              const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const newLog: SessionAttendanceLog = {
                id: `log-${Date.now()}`,
                sessionNumber: attended,
                date: now.toISOString().split('T')[0],
                time: timeStr,
                status: 'present',
                type: 'present',
                notes: options?.notes || (options?.method === 'rfid' ? 'تسجيل حضور تلقائي عبر البطاقة الذكية (RFID)' : 'تسجيل حضور'),
                method: options?.method || 'manual',
              };
              createdLog = newLog;

              return {
                ...std,
                attendedSessions: attended,
                attendanceLogs: [newLog, ...(std.attendanceLogs || [])],
              };
            }
            return std;
          });
          const updatedCourse: Course = { ...c, schoolId: c.schoolId || currentSchool.id, enrolledList: updatedList };
          courseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    if (courseToSync) {
      safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id);
    }

    return {
      studentName,
      attended,
      total,
      isExceeded: attended > total,
      log: createdLog,
    };
  };

  const recordStudentAbsence = (
    courseId: string,
    studentId: string,
    isCounted: boolean,
    notes?: string
  ) => {
    markLocalWrite();
    let studentName = '';
    let attended = 0;
    let total = 5;
    let courseToSync: Course | null = null;

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
          courseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    if (courseToSync) {
      safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id);
    }

    return {
      studentName,
      attended,
      total,
      isExceeded: attended > total,
      isCounted,
    };
  };

  const recordBatchAbsence = (
    courseId: string,
    studentIds: string[],
    isCounted: boolean,
    notes?: string
  ): { count: number; updatedStudents: string[] } => {
    markLocalWrite();
    if (!studentIds || studentIds.length === 0) return { count: 0, updatedStudents: [] };

    const idSet = new Set(studentIds);
    const updatedNames: string[] = [];
    let courseToSync: Course | null = null;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const status: AttendanceLogStatus = isCounted ? 'absent_counted' : 'absent_uncounted';

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (idSet.has(std.id)) {
              updatedNames.push(std.fullName);
              const total = std.totalSessions || 5;
              const attended = isCounted ? (std.attendedSessions || 0) + 1 : (std.attendedSessions || 0);

              const newLog: SessionAttendanceLog = {
                id: `log-${Date.now()}-${std.id.slice(-4)}`,
                sessionNumber: isCounted ? attended : (std.attendedSessions || 0),
                date: todayStr,
                time: timeStr,
                status,
                type: status,
                notes: notes || (isCounted ? 'غياب محسوب (نهاية اليوم - لم يحضر)' : 'غياب معفى (نهاية اليوم - لم يحضر)'),
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
          courseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    if (courseToSync) {
      safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id);
    }

    return {
      count: updatedNames.length,
      updatedStudents: updatedNames,
    };
  };

  const revertTodayAutoAbsence = (
    courseId: string,
    studentIds?: string[]
  ): { count: number; revertedStudents: string[] } => {
    let revertedCount = 0;
    const revertedNames: string[] = [];
    let courseToSync: Course | null = null;
    const todayStr = new Date().toISOString().split('T')[0];

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const idSet = studentIds && studentIds.length > 0 ? new Set(studentIds) : null;

          const updatedList = (c.enrolledList || []).map((std) => {
            if (idSet && !idSet.has(std.id)) return std;

            const logs = std.attendanceLogs || [];
            // Find today's absence logs (auto absent, batch end of day, etc.)
            const targetLogIndex = logs.findIndex((l) => {
              if (l.date !== todayStr) return false;
              const s = l.status || l.type;
              return s === 'absent_counted' || s === 'absent_uncounted';
            });

            if (targetLogIndex !== -1) {
              const targetLog = logs[targetLogIndex];
              const s = targetLog.status || targetLog.type;
              revertedCount++;
              revertedNames.push(std.fullName);

              // If it was counted, restore 1 session to quota
              const newAttended = s === 'absent_counted'
                ? Math.max(0, (std.attendedSessions || 0) - 1)
                : (std.attendedSessions || 0);

              // Remove today's absence log
              const newLogs = logs.filter((_, idx) => idx !== targetLogIndex);

              return {
                ...std,
                attendedSessions: newAttended,
                attendanceLogs: newLogs,
                autoAbsentCancelledDate: todayStr, // Marker to sync across all computers in database
              };
            }

            // Even if no log on this student, mark the cancellation date for the course students
            if (!idSet || idSet.has(std.id)) {
              return {
                ...std,
                autoAbsentCancelledDate: todayStr,
              };
            }

            return std;
          });

          const updatedCourse: Course = {
            ...c,
            schoolId: c.schoolId || currentSchool.id,
            enrolledList: updatedList,
          };
          courseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    if (courseToSync) {
      lastLocalWriteRef.current = Date.now();
      safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id, { skipMerge: true });
      localStorage.setItem(`auto_marked_absent_${courseId}_${todayStr}`, 'cancelled');
    }

    return {
      count: revertedCount,
      revertedStudents: revertedNames,
    };
  };

  const clearTodayAutoAbsentCancellation = (courseId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let courseToSync: Course | null = null;

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.autoAbsentCancelledDate === todayStr) {
              const { autoAbsentCancelledDate, ...rest } = std;
              return rest;
            }
            return std;
          });
          const updatedCourse: Course = {
            ...c,
            schoolId: c.schoolId || currentSchool.id,
            enrolledList: updatedList,
          };
          courseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    if (courseToSync) {
      lastLocalWriteRef.current = Date.now();
      safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id, { skipMerge: true });
      localStorage.removeItem(`auto_marked_absent_${courseId}_${todayStr}`);
    }
  };

  const renewStudentSubscription = (
    courseId: string,
    studentId: string,
    newTotalSessions: number,
    paidAmount: number,
    customCoursePrice?: number,
    markTodayAttended: boolean = true
  ) => {
    markLocalWrite();

    let overageDeducted = 0;
    let startingAttended = 0;

    const course = currentSchoolCourses.find((c) => c.id === courseId);
    const targetStudent = course?.enrolledList?.find((s) => s.id === studentId);

    const effectiveCoursePrice =
      customCoursePrice !== undefined && customCoursePrice > 0
        ? customCoursePrice
        : targetStudent?.coursePrice !== undefined && targetStudent.coursePrice > 0
        ? targetStudent.coursePrice
        : course?.monthlyPrice || 1500;

    const addedDebt = Math.max(0, effectiveCoursePrice - paidAmount);
    const renewReceiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let courseToSync: Course | null = null;
    let studentFullName = targetStudent?.fullName || 'تلميذ';
    let studentPhone = targetStudent?.phone || '';
    let courseTitle = course?.title || 'دورة تعليمية';

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          courseTitle = c.title || courseTitle;
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              studentFullName = std.fullName || studentFullName;
              studentPhone = std.phone || studentPhone;
              const currentAttended = std.attendedSessions || 0;
              const currentTotal =
                std.totalSessions && std.totalSessions > 0
                  ? std.totalSessions
                  : course?.totalSessionsDefault && course.totalSessionsDefault > 0
                  ? course.totalSessionsDefault
                  : 4;
              const hasOnlySingleSessions =
                (std.attendanceLogs || []).length > 0 &&
                (std.attendanceLogs || []).every(
                  (l) => l.status === 'single_session' || l.type === 'single_session' || l.status === 'payment' || l.type === 'payment'
                );
              overageDeducted = hasOnlySingleSessions ? 0 : Math.max(0, currentAttended - currentTotal);
              startingAttended = overageDeducted;

              // Check if student already attended today
              const existingTodayLog = (std.attendanceLogs || []).find(
                (l) => l.date === todayStr && (l.status === 'present' || l.type === 'present' || l.status === 'single_session')
              );
              // Filter out existing today attendance log to prevent ANY duplicate
              const cleanLogsWithoutTodayAttendance = (std.attendanceLogs || []).filter(
                (l) => !(l.date === todayStr && (l.status === 'present' || l.type === 'present' || l.status === 'single_session'))
              );

              const shouldMarkSession1 = markTodayAttended || !!existingTodayLog;

              const renewalLog: SessionAttendanceLog = {
                id: `renew-${Date.now()}`,
                sessionNumber: 0,
                date: todayStr,
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                status: 'renewed',
                type: 'renewed',
                notes: `تجديد باقة اشتراك جديدة (${newTotalSessions} حصص) بسعر ${effectiveCoursePrice.toLocaleString('fr-DZ')} دج`,
              };

              const logsToAdd: SessionAttendanceLog[] = [];

              // If session 1 is marked as attended today
              if (shouldMarkSession1) {
                startingAttended = Math.max(startingAttended, 1);
                logsToAdd.push({
                  id: existingTodayLog?.id || `log-att-${Date.now()}`,
                  sessionNumber: 1,
                  date: todayStr,
                  time: existingTodayLog?.time || timeStr,
                  status: 'present',
                  type: 'present',
                  notes: 'تسجيل حضور الحصة الأولى من الدورة الجديدة (مجدد اليوم)',
                  method: existingTodayLog?.method || 'manual',
                });
              }

              if (paidAmount > 0) {
                logsToAdd.push({
                  id: `log-pay-${Date.now()}`,
                  sessionNumber: 0,
                  date: todayStr,
                  time: now.toTimeString().split(' ')[0].substring(0, 5),
                  status: 'payment',
                  type: 'payment',
                  amount: paidAmount,
                  receiptNumber: renewReceiptNo,
                  notes: `تسديد اشتراك باقة جديدة نقداً (${renewReceiptNo}) بقيمة ${paidAmount.toLocaleString('fr-DZ')} دج`,
                });
              }

              logsToAdd.push(renewalLog);

              const updatedStd: Student = {
                ...std,
                coursePrice: effectiveCoursePrice,
                totalSessions: newTotalSessions,
                attendedSessions: startingAttended,
                totalPaid: (std.totalPaid || 0) + paidAmount,
                totalDebt: addedDebt,
                attendanceLogs: [...logsToAdd, ...cleanLogsWithoutTodayAttendance],
              };
              return reconcileStudentFinancials(updatedStd, effectiveCoursePrice);
            }
            return std;
          });
          const updatedCourse: Course = { ...c, schoolId: c.schoolId || currentSchool.id, enrolledList: updatedList };
          courseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    if (courseToSync) {
      safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id);
    }

    // Clear out any old debt records for this student in this course from Supabase and local state
    const oldDebtsToDelete = debts.filter(
      (d) => d.studentId === studentId && (d.courseTitle === courseTitle || !d.courseTitle)
    );
    oldDebtsToDelete.forEach((oldDebt) => {
      addDeletedDebtId(oldDebt.id);
      safeSync.deleteDebt(oldDebt.id, currentSchool.id);
    });

    if (addedDebt > 0) {
      const newDebt: DebtRecord = {
        id: `dbt-${Date.now()}`,
        schoolId: currentSchool.id,
        studentId,
        studentName: studentFullName,
        studentPhone: studentPhone,
        courseTitle: courseTitle,
        totalAmount: effectiveCoursePrice,
        paidAmount: paidAmount,
        remainingAmount: addedDebt,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: paidAmount > 0 ? 'partial' : 'unpaid',
      };
      setDebts((prev) => [newDebt, ...prev.filter((d) => !oldDebtsToDelete.some((od) => od.id === d.id))]);
      safeSync.upsertDebt(newDebt, currentSchool.id);
    } else {
      setDebts((prev) => prev.filter((d) => !oldDebtsToDelete.some((od) => od.id === d.id)));
    }

    // Record payment transaction (Cash only) with duplicate prevention guard
    if (paidAmount > 0) {
      const isRecentDuplicate = transactions.some(
        (t) =>
          t.studentId === studentId &&
          t.amount === paidAmount &&
          t.date === todayStr &&
          t.notes?.includes('تجديد اشتراك')
      );
      if (!isRecentDuplicate) {
        const newTx: PaymentTransaction = {
          id: `tx-${Date.now()}`,
          schoolId: currentSchool.id,
          receiptNumber: renewReceiptNo,
          studentId,
          studentName: studentFullName,
          courseTitle: courseTitle,
          amount: paidAmount,
          paymentMethod: 'cash',
          date: todayStr,
          status: 'completed',
          recordedBy: 'إدارة المؤسسة',
          notes: 'تجديد اشتراك باقة حصص جديدة',
        };
        setTransactions((prev) => [newTx, ...prev]);
        safeSync.insertTransaction(newTx, currentSchool.id);
      }
    }

    return {
      overageDeducted,
      startingAttended,
      receiptNumber: renewReceiptNo,
      addedDebt,
      paidAmount,
    };
  };

  const convertSingleSessionToCourse = (
    courseId: string,
    studentId: string,
    newTotalSessions: number,
    paidAmount: number,
    customDate?: string,
    notes?: string
  ) => {
    markLocalWrite();

    let studentName = '';
    let studentPhone = '';
    let courseTitle = 'دورة تعليمية';
    let previousSingleSessionsCount = 0;
    let teacherEarnedFromSingles = 0;

    const course = currentSchoolCourses.find((c) => c.id === courseId);
    const coursePrice = course?.monthlyPrice || 0;
    const addedDebt = Math.max(0, coursePrice - paidAmount);
    const receiptNo = `REC-CRS-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dateStr = customDate || now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    let courseToSync: Course | null = null;

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          courseTitle = c.title || courseTitle;
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              studentName = std.fullName;
              studentPhone = std.phone || '';
              const singleLogs = (std.attendanceLogs || []).filter(
                (l) => l.status === 'single_session' || l.type === 'single_session'
              );
              previousSingleSessionsCount = singleLogs.length;
              teacherEarnedFromSingles = singleLogs.reduce((acc, l) => acc + (l.teacherAmount || 0), 0);

              const courseLog: SessionAttendanceLog = {
                id: `sub-crs-${Date.now()}`,
                sessionNumber: 0,
                date: dateStr,
                time: timeStr,
                status: 'renewed',
                type: 'renewed',
                notes:
                  notes ||
                  `الاشتراك في دورة جديدة (${newTotalSessions} حصص) بعد دراسة ${previousSingleSessionsCount} حصص بنظام الحصة مسددة`,
              };

              const logsToAdd: SessionAttendanceLog[] = [courseLog];

              if (paidAmount > 0) {
                logsToAdd.unshift({
                  id: `log-pay-${Date.now()}`,
                  sessionNumber: 0,
                  date: dateStr,
                  time: timeStr,
                  status: 'payment',
                  type: 'payment',
                  amount: paidAmount,
                  receiptNumber: receiptNo,
                  notes: `تسديد اشتراك الدورة الجديدة (${receiptNo}) بقيمة ${paidAmount.toLocaleString('fr-DZ')} دج`,
                });
              }

              const updatedRaw = {
                ...std,
                totalSessions: newTotalSessions,
                attendedSessions: 0, // Clean start for the new course package
                totalPaid: std.totalPaid + paidAmount,
                totalDebt: (std.totalDebt || 0) + addedDebt,
                attendanceLogs: [...logsToAdd, ...(std.attendanceLogs || [])],
              };
              return reconcileStudentFinancials(updatedRaw, coursePrice);
            }
            return std;
          });
          const updatedCourse: Course = { ...c, schoolId: c.schoolId || currentSchool.id, enrolledList: updatedList };
          courseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    if (courseToSync) {
      safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id);
    }

    // Record debt if partial payment
    if (addedDebt > 0) {
      const newDebt: DebtRecord = {
        id: `dbt-${Date.now()}`,
        schoolId: currentSchool.id,
        studentId,
        studentName: studentName || 'تلميذ',
        studentPhone: studentPhone,
        courseTitle: courseTitle,
        totalAmount: coursePrice,
        paidAmount: paidAmount,
        remainingAmount: addedDebt,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: paidAmount > 0 ? 'partial' : 'unpaid',
      };
      setDebts((prev) => [newDebt, ...prev]);
      safeSync.upsertDebt(newDebt, currentSchool.id);
    }

    // Record transaction
    if (paidAmount > 0) {
      const newTx: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        schoolId: currentSchool.id,
        receiptNumber: receiptNo,
        studentId,
        studentName: studentName || 'تلميذ',
        courseTitle: courseTitle,
        amount: paidAmount,
        paymentMethod: 'cash',
        date: dateStr,
        status: 'completed',
        recordedBy: 'إدارة المؤسسة',
        feeCategory: 'course',
        notes: `اشتراك في دورة جديدة بعد نظام الحصة (${previousSingleSessionsCount} حصص سابقة)`,
      };
      setTransactions((prev) => [newTx, ...prev]);
      safeSync.insertTransaction(newTx, currentSchool.id);
    }

    return {
      receiptNumber: receiptNo,
      studentName,
      courseTitle,
      newTotalSessions,
      paidAmount,
      addedDebt,
      previousSingleSessionsCount,
      teacherEarnedFromSingles,
      date: dateStr,
      time: timeStr,
    };
  };

  const undoStudentAttendance = (courseId: string, studentId: string) => {
    markLocalWrite();
    let studentName = '';
    let actionDescription = '';
    let newAttended = 0;
    let total = 5;
    let found = false;
    let courseToSync: Course | null = null;

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              studentName = std.fullName;
              total = std.totalSessions || 5;

              const logs = std.attendanceLogs || [];
              const latestRenewalIndex = logs.findIndex((l) => l.status === 'renewed' || l.type === 'renewed');
              // Find the most recent attendance or absence log within the current active cycle
              const targetLogIndex = logs.findIndex((l, idx) => {
                if (latestRenewalIndex !== -1 && idx >= latestRenewalIndex) return false;
                const s = l.status || l.type;
                return s === 'present' || s === 'absent_counted' || s === 'absent_uncounted' || s === 'single_session';
              });

              if (targetLogIndex !== -1) {
                found = true;
                const targetLog = logs[targetLogIndex];
                const s = targetLog.status || targetLog.type;

                if (s === 'present') {
                  actionDescription = `حضور (الحصة ${targetLog.sessionNumber || std.attendedSessions || 1})`;
                  newAttended = Math.max(0, (std.attendedSessions || 0) - 1);
                } else if (s === 'single_session') {
                  actionDescription = `حصة واحدة (الحصة ${targetLog.sessionNumber || std.attendedSessions || 1})`;
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
            courseToSync = updatedCourse;
            return updatedCourse;
          }
        }
        return c;
      });
      return updated;
    });

    if (courseToSync) {
      safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id, { skipMerge: true });
    }

    if (!found) return null;

    return {
      success: true,
      studentName,
      actionDescription,
      attended: newAttended,
      total,
    };
  };

  const recordSingleSessionAttendance = (
    courseId: string,
    studentId: string,
    sessionPrice: number,
    teacherAmount: number,
    notes?: string,
    customDate?: string
  ) => {
    markLocalWrite();
    let studentName = '';
    let attended = 0;
    let total = 5;
    const now = new Date();
    const dateStr = customDate || now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const receiptNumber = `REC-SS-${Date.now().toString().slice(-6)}`;

    let courseTitle = 'دورة تعليمية';
    let courseToSync: Course | null = null;

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          courseTitle = c.title || courseTitle;
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              studentName = std.fullName;
              attended = (std.attendedSessions || 0) + 1;
              total = Math.max(std.totalSessions || 5, attended);

              const newLog: SessionAttendanceLog = {
                id: `log-ss-${Date.now()}`,
                sessionNumber: attended,
                date: dateStr,
                time: timeStr,
                status: 'single_session',
                type: 'single_session',
                amount: sessionPrice,
                teacherAmount: teacherAmount,
                notes: notes || `تسجيل حضور حصة واحدة مسددة (${sessionPrice} دج - نصيب الأستاذ: ${teacherAmount} دج)`,
              };

              return {
                ...std,
                attendedSessions: attended,
                totalSessions: total,
                attendanceLogs: [newLog, ...(std.attendanceLogs || [])],
              };
            }
            return std;
          });
          const updatedCourse: Course = { ...c, schoolId: c.schoolId || currentSchool.id, enrolledList: updatedList };
          courseToSync = updatedCourse;
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    if (courseToSync) {
      safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id);
    }

    if (sessionPrice > 0) {
      const newTx: PaymentTransaction = {
        id: `tx-ss-${Date.now()}`,
        schoolId: currentSchool.id,
        receiptNumber,
        studentId,
        studentName: studentName || 'تلميذ',
        courseTitle,
        amount: sessionPrice,
        paymentMethod: 'cash',
        date: dateStr,
        status: 'completed',
        recordedBy: 'إدارة المؤسسة',
        notes: `تسديد رسم حصة واحدة (مستحق الأستاذ: ${teacherAmount} دج)` + (notes ? ` - ${notes}` : ''),
      };
      setTransactions((prev) => [newTx, ...prev]);
      safeSync.insertTransaction(newTx, currentSchool.id);
    }

    return {
      studentName,
      attended,
      total,
      receiptNumber,
      sessionPrice,
      teacherAmount,
      date: dateStr,
      time: timeStr,
    };
  };

  // Classroom Actions
  const addClassroom = (classroom: Classroom) => {
    const classroomWithSchool: Classroom = { ...classroom, schoolId: currentSchool.id };
    setClassrooms((prev) => [classroomWithSchool, ...prev]);
    safeSync.upsertClassroom(classroomWithSchool, currentSchool.id);
  };

  const updateClassroom = (classroom: Classroom) => {
    const classroomWithSchool: Classroom = { ...classroom, schoolId: classroom.schoolId || currentSchool.id };
    setClassrooms((prev) => prev.map((r) => (r.id === classroom.id ? classroomWithSchool : r)));
    safeSync.upsertClassroom(classroomWithSchool, currentSchool.id);
  };

  const deleteClassroom = (classroomId: string) => {
    setClassrooms((prev) => prev.filter((r) => r.id !== classroomId));
    safeSync.deleteClassroom(classroomId);
  };

  // Payment & Debt Actions
  const recordPayment = (
    transaction: PaymentTransaction,
    updateDebtStudentId?: string,
    targetDebtId?: string,
    options?: { autoDeleteDebt?: boolean }
  ) => {
    markLocalWrite();
    const txWithSchool: PaymentTransaction = { ...transaction, schoolId: currentSchool.id };
    setTransactions((prev) => [txWithSchool, ...prev]);
    safeSync.insertTransaction(txWithSchool, currentSchool.id);

    const targetStudentId = updateDebtStudentId || transaction.studentId;
    const targetStudentName = transaction.studentName?.trim();

    // 1. Update student's financial records in course and add payment log
    let updatedCourseToSync: Course | null = null;
    setCourses((prevCourses) => {
      let anyUpdated = false;
      const updatedCourses = prevCourses.map((c) => {
        const hasStudent = (c.enrolledList || []).some(
          (std) =>
            (targetStudentId && std.id === targetStudentId) ||
            (targetStudentName && std.fullName.trim() === targetStudentName)
        );

        if (!hasStudent) return c;

        // If the transaction specifies a courseTitle, prioritize that course
        if (transaction.courseTitle && c.title !== transaction.courseTitle) {
          const specificCourseMatches = prevCourses.some(
            (pc) =>
              pc.title === transaction.courseTitle &&
              (pc.enrolledList || []).some(
                (s) =>
                  (targetStudentId && s.id === targetStudentId) ||
                  (targetStudentName && s.fullName.trim() === targetStudentName)
              )
          );
          if (specificCourseMatches) return c;
        }

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

          const rawUpdatedStd = {
            ...std,
            totalDebt: newDebt,
            totalPaid: newPaid,
            attendanceLogs: [paymentLog, ...(std.attendanceLogs || [])],
          };

          return reconcileStudentFinancials(rawUpdatedStd, c.monthlyPrice);
        });

        const updatedCourse: Course = {
          ...c,
          schoolId: c.schoolId || currentSchool.id,
          enrolledList: updatedList,
        };

        updatedCourseToSync = updatedCourse;
        return updatedCourse;
      });

      return anyUpdated ? updatedCourses : prevCourses;
    });

    if (updatedCourseToSync) {
      safeSync.upsertCourse(updatedCourseToSync, (updatedCourseToSync as Course).schoolId || currentSchool.id);
    }

    // 2. Handle Debt Record update or deletion
    if (options?.autoDeleteDebt) {
      // Find matching debts, register as deleted, and delete cleanly from Supabase without competing upsert
      const matchingDebtIds: string[] = [];
      setDebts((prevDebts) => {
        const remaining: DebtRecord[] = [];
        prevDebts.forEach((d) => {
          const isMatch = targetDebtId
            ? d.id === targetDebtId
            : ((targetStudentId && d.studentId === targetStudentId) ||
               (targetStudentName && d.studentName.trim() === targetStudentName));

          if (isMatch) {
            matchingDebtIds.push(d.id);
            addDeletedDebtId(d.id);
          } else {
            remaining.push(d);
          }
        });
        return remaining;
      });

      matchingDebtIds.forEach((id) => {
        safeSync.deleteDebt(id);
      });
    } else {
      // Update DebtRecord in debts state & Supabase
      const debtsToUpsert: DebtRecord[] = [];
      setDebts((prevDebts) => {
        return prevDebts.map((d) => {
          const isMatch = targetDebtId
            ? d.id === targetDebtId
            : ((targetStudentId && d.studentId === targetStudentId) ||
               (targetStudentName && d.studentName.trim() === targetStudentName));

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

          debtsToUpsert.push(updatedDebt);
          return updatedDebt;
        });
      });

      debtsToUpsert.forEach((ud) => {
        safeSync.upsertDebt(ud, currentSchool.id);
      });
    }
  };

  const addDebt = (debt: Omit<DebtRecord, 'id'>): DebtRecord => {
    markLocalWrite();
    const newDebt: DebtRecord = {
      ...debt,
      id: `dbt-${Date.now()}`,
      schoolId: debt.schoolId || currentSchool.id,
    };
    removeDeletedDebtId(newDebt.id);

    setDebts((prev) => [newDebt, ...prev]);
    safeSync.upsertDebt(newDebt, currentSchool.id);

    // If student is found in courses, add to student's totalDebt as well
    if (newDebt.studentId || newDebt.studentName) {
      let courseToSync: Course | null = null;
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

          courseToSync = updatedCourse;
          return updatedCourse;
        });

        return anyUpdated ? updatedCourses : prevCourses;
      });

      if (courseToSync) {
        safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id);
      }
    }

    return newDebt;
  };

  const deleteTransaction = (transactionId: string) => {
    markLocalWrite();
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    safeSync.deleteTransaction(transactionId);
  };

  const deleteDebt = (debtId: string) => {
    markLocalWrite();
    addDeletedDebtId(debtId);
    const targetDebt = debts.find((d) => d.id === debtId);
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    safeSync.deleteDebt(debtId);

    // If studentId is known, clear their totalDebt in enrolled courses as well
    if (targetDebt?.studentId) {
      let courseToSync: Course | null = null;
      setCourses((prev) => {
        return prev.map((c) => {
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
            courseToSync = updatedCourse;
            return updatedCourse;
          }
          return c;
        });
      });

      if (courseToSync) {
        safeSync.upsertCourse(courseToSync, (courseToSync as Course).schoolId || currentSchool.id);
      }
    }
  };

  const archiveFinancialCycle = (archivedTxIds?: string[], archivedExpenseIds?: string[]) => {
    markLocalWrite();
    const now = new Date();
    const teachersToSync: Teacher[] = [];

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
          teachersToSync.push(updatedTeacher);
          return updatedTeacher;
        }
        return t;
      });
      return updated;
    });

    teachersToSync.forEach((ut) => {
      safeSync.upsertTeacher(ut, currentSchool.id);
    });

    // 2. Clear/archive transactions for this school that were included in the archive
    if (archivedTxIds && archivedTxIds.length > 0) {
      setTransactions((prev) => prev.filter((tx) => !archivedTxIds.includes(tx.id)));
      archivedTxIds.forEach((id) => {
        safeSync.deleteTransaction(id);
      });
    }

    // 3. Clear/archive expenses for this school that were included in the archive
    if (archivedExpenseIds && archivedExpenseIds.length > 0) {
      setExpenses((prev) => prev.filter((exp) => !archivedExpenseIds.includes(exp.id)));
      archivedExpenseIds.forEach((id) => {
        safeSync.deleteExpense(id);
      });
    }
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'receiptNumber'>): Expense => {
    markLocalWrite();
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
    safeSync.upsertExpense(newExpense, currentSchool.id);
    return newExpense;
  };

  const deleteExpense = (expenseId: string) => {
    markLocalWrite();
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    safeSync.deleteExpense(expenseId);
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
        updateStudent,
        removeStudentFromCourse,
        incrementStudentSession,
        recordStudentAbsence,
        recordBatchAbsence,
        revertTodayAutoAbsence,
        clearTodayAutoAbsentCancellation,
        renewStudentSubscription,
        convertSingleSessionToCourse,
        undoStudentAttendance,
        recordSingleSessionAttendance,

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

        // Auto-Save & Auto-Refresh
        isAutoSaving,
        lastSavedTime,
        isRefreshing,
        lastSyncTime,
        refreshData,
        pendingOfflineCount,
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
