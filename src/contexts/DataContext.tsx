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

  // Courses & Groups
  courses: Course[];
  addCourse: (course: Course) => void;
  updateCourse: (course: Course) => void;
  deleteCourse: (courseId: string) => void;
  enrollStudentToCourse: (courseId: string, student: Student) => void;
  incrementStudentSession: (courseId: string, studentId: string) => { studentName: string; attended: number; total: number; isExceeded: boolean };
  renewStudentSubscription: (courseId: string, studentId: string, newTotalSessions: number, paidAmount: number) => { overageDeducted: number; startingAttended: number };

  // Classrooms
  classrooms: Classroom[];
  addClassroom: (classroom: Classroom) => void;
  updateClassroom: (classroom: Classroom) => void;
  deleteClassroom: (classroomId: string) => void;

  // Payments & Debts
  transactions: PaymentTransaction[];
  debts: DebtRecord[];
  recordPayment: (transaction: PaymentTransaction, updateDebtStudentId?: string) => void;
  deleteTransaction: (transactionId: string) => void;

  // Computed KPIs
  totalEnrolledStudents: number;
  totalActiveCourses: number;
  totalMonthlyRevenue: number;
  totalOutstandingDebts: number;
  totalTeachersEarned: number;
  totalTeachersPaid: number;
  totalTeachersBalanceDue: number;
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

  // === SUPABASE INITIAL HYDRATION ===
  useEffect(() => {
    async function hydrateFromSupabase() {
      const [remoteSchools, remoteClassrooms, remoteTeachers, remoteCourses, remoteTransactions, remoteDebts] =
        await Promise.all([
          supabaseService.fetchSchools(),
          supabaseService.fetchClassrooms(),
          supabaseService.fetchTeachers(),
          supabaseService.fetchCourses(),
          supabaseService.fetchTransactions(),
          supabaseService.fetchDebts(),
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
    }

    hydrateFromSupabase();
  }, []);

  // Dynamically compute Teacher earnings based on active courses, compensation model, and percentage/rate
  const teachers: Teacher[] = rawTeachers.map((t) => {
    const teacherCourses = courses.filter((c) => c.teacherId === t.id);
    const groupsCount = teacherCourses.length;
    const compensationType = t.compensationType || 'percentage_per_student';
    const commission = t.commissionPercentage !== undefined ? t.commissionPercentage : 60;
    const fixedRate = t.fixedCourseRate !== undefined ? t.fixedCourseRate : 25000;

    // Calculate total earned according to selected compensation model
    const totalEarned = teacherCourses.reduce((acc, c) => {
      const enrolledCount = c.enrolledList?.length || 0;
      const price = c.monthlyPrice || 0;

      let courseEarned = 0;
      if (compensationType === 'percentage_per_student') {
        courseEarned = enrolledCount * price * (commission / 100);
      } else if (compensationType === 'percentage_per_course') {
        courseEarned = price * (commission / 100);
      } else if (compensationType === 'fixed_per_course') {
        courseEarned = fixedRate;
      }

      return acc + courseEarned;
    }, 0);

    const totalPaid = t.totalPaid || 0;
    const balanceDue = Math.max(0, totalEarned - totalPaid);

    return {
      ...t,
      compensationType,
      commissionPercentage: commission,
      fixedCourseRate: fixedRate,
      groupsCount,
      totalEarned,
      totalPaid,
      balanceDue,
    };
  });

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

    setCourses([]);
    setRawTeachers([]);
    setClassrooms([]);
    setTransactions([]);
    setDebts([]);
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
    setRawTeachers((prev) => [teacher, ...prev]);
    supabaseService.upsertTeacher(teacher, currentSchool.id);
  };

  const updateTeacher = (teacher: Teacher) => {
    setRawTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
    supabaseService.upsertTeacher(teacher, currentSchool.id);
  };

  const deleteTeacher = (teacherId: string) => {
    setRawTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    supabaseService.deleteTeacher(teacherId);
  };

  const payoutTeacher = (teacherId: string, amount: number, paymentMethod: string = 'نقداً (Cash)', notes: string = '') => {
    const now = new Date();
    const newPayoutLog: TeacherPayoutLog = {
      id: `payout-${Date.now()}`,
      amount,
      date: now.toISOString().split('T')[0],
      paymentMethod,
      notes,
    };

    setRawTeachers((prev) => {
      const updated = prev.map((t) => {
        if (t.id === teacherId) {
          const newPaid = (t.totalPaid || 0) + amount;
          const currentHistory = t.payoutHistory || [];
          const updatedTeacher = {
            ...t,
            totalPaid: newPaid,
            payoutHistory: [newPayoutLog, ...currentHistory],
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
    setCourses((prev) => [course, ...prev]);
    supabaseService.upsertCourse(course, currentSchool.id);
  };

  const updateCourse = (course: Course) => {
    setCourses((prev) => prev.map((c) => (c.id === course.id ? course : c)));
    supabaseService.upsertCourse(course, currentSchool.id);
  };

  const deleteCourse = (courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    supabaseService.deleteCourse(courseId);
  };

  const enrollStudentToCourse = (courseId: string, student: Student) => {
    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const newList = [student, ...(c.enrolledList || [])];
          const updatedCourse = {
            ...c,
            enrolledList: newList,
            enrolledStudents: newList.length,
          };
          supabaseService.upsertCourse(updatedCourse, currentSchool.id);
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
        studentId: student.id,
        studentName: student.fullName,
        studentPhone: student.phone,
        courseTitle: student.enrolledCourseTitle || 'دورة تعليمية',
        totalAmount: student.totalPaid + student.totalDebt,
        paidAmount: student.totalPaid,
        remainingAmount: student.totalDebt,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'unpaid',
      };
      setDebts((prev) => [newDebt, ...prev]);
      supabaseService.upsertDebt(newDebt, currentSchool.id);
    }

    // If there is initial payment, record transaction (Cash only)
    if (student.totalPaid > 0) {
      const newTx: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        receiptNumber: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        studentId: student.id,
        studentName: student.fullName,
        courseTitle: student.enrolledCourseTitle || 'دورة تعليمية',
        amount: student.totalPaid,
        paymentMethod: 'cash',
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        recordedBy: 'إدارة المؤسسة',
      };
      setTransactions((prev) => [newTx, ...prev]);
      supabaseService.insertTransaction(newTx, currentSchool.id);
    }
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
              };

              return {
                ...std,
                attendedSessions: attended,
                attendanceLogs: [newLog, ...(std.attendanceLogs || [])],
              };
            }
            return std;
          });
          const updatedCourse = { ...c, enrolledList: updatedList };
          supabaseService.upsertCourse(updatedCourse, currentSchool.id);
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

  const renewStudentSubscription = (
    courseId: string,
    studentId: string,
    newTotalSessions: number,
    paidAmount: number
  ) => {
    let overageDeducted = 0;
    let startingAttended = 0;

    const course = courses.find((c) => c.id === courseId);
    const coursePrice = course?.monthlyPrice || 6000;
    const addedDebt = Math.max(0, coursePrice - paidAmount);

    setCourses((prev) => {
      const updated = prev.map((c) => {
        if (c.id === courseId) {
          const updatedList = (c.enrolledList || []).map((std) => {
            if (std.id === studentId) {
              const currentAttended = std.attendedSessions || 0;
              const currentTotal = std.totalSessions || 5;
              overageDeducted = Math.max(0, currentAttended - currentTotal);
              startingAttended = overageDeducted;

              const now = new Date();
              const renewalLog: SessionAttendanceLog = {
                id: `renew-${Date.now()}`,
                sessionNumber: 0,
                date: now.toISOString().split('T')[0],
                time: now.toTimeString().split(' ')[0].substring(0, 5),
              };

              return {
                ...std,
                totalSessions: newTotalSessions,
                attendedSessions: startingAttended,
                totalPaid: std.totalPaid + paidAmount,
                totalDebt: std.totalDebt + addedDebt,
                attendanceLogs: [renewalLog, ...(std.attendanceLogs || [])],
              };
            }
            return std;
          });
          const updatedCourse = { ...c, enrolledList: updatedList };
          supabaseService.upsertCourse(updatedCourse, currentSchool.id);
          return updatedCourse;
        }
        return c;
      });
      return updated;
    });

    // Record payment transaction (Cash only)
    if (paidAmount > 0) {
      const student = course?.enrolledList?.find((s) => s.id === studentId);
      const newTx: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        receiptNumber: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
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

    return { overageDeducted, startingAttended };
  };

  // Classroom Actions
  const addClassroom = (classroom: Classroom) => {
    setClassrooms((prev) => [classroom, ...prev]);
    supabaseService.upsertClassroom(classroom, currentSchool.id);
  };

  const updateClassroom = (classroom: Classroom) => {
    setClassrooms((prev) => prev.map((r) => (r.id === classroom.id ? classroom : r)));
    supabaseService.upsertClassroom(classroom, currentSchool.id);
  };

  const deleteClassroom = (classroomId: string) => {
    setClassrooms((prev) => prev.filter((r) => r.id !== classroomId));
    supabaseService.deleteClassroom(classroomId);
  };

  // Payment & Debt Actions
  const recordPayment = (transaction: PaymentTransaction, updateDebtStudentId?: string) => {
    setTransactions((prev) => [transaction, ...prev]);
    supabaseService.insertTransaction(transaction, currentSchool.id);

    if (updateDebtStudentId) {
      setDebts((prev) =>
        prev
          .map((d) => {
            if (d.studentId === updateDebtStudentId) {
              const newPaid = d.paidAmount + transaction.amount;
              const remaining = Math.max(0, d.totalAmount - newPaid);
              const newStatus: PaymentStatus = remaining === 0 ? 'paid' : 'partial';
              const updatedDebt = {
                ...d,
                paidAmount: newPaid,
                remainingAmount: remaining,
                status: newStatus,
              };
              supabaseService.upsertDebt(updatedDebt, currentSchool.id);
              return updatedDebt;
            }
            return d;
          })
          .filter((d) => d.remainingAmount > 0)
      );
    }
  };

  const deleteTransaction = (transactionId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    supabaseService.deleteTransaction(transactionId);
  };

  // Computed KPIs
  const totalEnrolledStudents = courses.reduce((acc, c) => acc + (c.enrolledList?.length || 0), 0);
  const totalActiveCourses = courses.length;
  const totalMonthlyRevenue = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalOutstandingDebts = debts.reduce((acc, d) => acc + (d.remainingAmount || 0), 0);

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

        courses,
        addCourse,
        updateCourse,
        deleteCourse,
        enrollStudentToCourse,
        incrementStudentSession,
        renewStudentSubscription,

        classrooms,
        addClassroom,
        updateClassroom,
        deleteClassroom,

        transactions,
        debts,
        recordPayment,
        deleteTransaction,

        totalEnrolledStudents,
        totalActiveCourses,
        totalMonthlyRevenue,
        totalOutstandingDebts,
        totalTeachersEarned,
        totalTeachersPaid,
        totalTeachersBalanceDue,
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
