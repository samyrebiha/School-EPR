import { supabase } from '../lib/supabase';
import {
  SchoolTenant,
  Teacher,
  Course,
  Classroom,
  PaymentTransaction,
  DebtRecord,
  Expense,
  Student,
  SessionAttendanceLog,
} from '../types';
import { reconcileStudentFinancials } from '../utils/studentFinancials';

/**
 * Helper to run Supabase calls with auto-retry on network glitches
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === retries) {
        console.warn('Supabase network operation completed offline/cached:', e?.message || e);
        return null;
      }
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  return null;
}

/**
 * Ensures school_id maps to a valid existing school in Supabase to satisfy foreign key constraints
 */
function sanitizeSchoolId(schoolId?: string | null): string | null {
  if (!schoolId) return null;
  if (schoolId === 'school-default') {
    return 'school-1788371708568';
  }
  return schoolId;
}

/**
 * Service to sync application data directly with Supabase tables
 */
export const supabaseService = {
  // === SCHOOLS ===
  async fetchSchools(): Promise<SchoolTenant[] | null> {
    return withRetry(async () => {
      const { data, error } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
      if (error || !data) return null;

      return data.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        username: s.username,
        password: s.password,
        phone: s.phone,
        email: s.email || '',
        address: s.address || '',
        wilaya: s.wilaya || 'الجزائر العاصمة (16)',
        plan: s.plan || 'professional',
        planStatus: s.plan_status || 'active',
        subscriptionStart: s.subscription_start,
        subscriptionEnd: s.subscription_end,
        studentsCount: s.students_count || 0,
        revenueGenerated: s.revenue_generated || 30000,
        logoText: s.logo_text || s.name,
      }));
    });
  },

  async upsertSchool(school: SchoolTenant) {
    return withRetry(async () => {
      const { error } = await supabase.from('schools').upsert({
        id: String(school.id),
        name: school.name,
        code: school.code,
        username: school.username,
        password: school.password,
        phone: school.phone,
        email: school.email || null,
        address: school.address || null,
        wilaya: school.wilaya || 'الجزائر العاصمة (16)',
        plan: school.plan || 'professional',
        plan_status: school.planStatus || 'active',
        subscription_start: school.subscriptionStart || new Date().toISOString().split('T')[0],
        subscription_end: school.subscriptionEnd || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        students_count: Number(school.studentsCount) || 0,
        revenue_generated: Number(school.revenueGenerated) || 30000,
        logo_text: school.logoText || school.name,
      });

      if (error) {
        console.warn('Supabase school upsert notice:', error.message);
      }
      return true;
    });
  },

  async deleteSchool(schoolId: string) {
    return withRetry(async () => {
      await supabase.from('schools').delete().eq('id', schoolId);
      await supabase.from('classrooms').delete().eq('school_id', schoolId);
      await supabase.from('teachers').delete().eq('school_id', schoolId);
      await supabase.from('courses').delete().eq('school_id', schoolId);
      await supabase.from('payment_transactions').delete().eq('school_id', schoolId);
      await supabase.from('debts').delete().eq('school_id', schoolId);
      return true;
    });
  },

  // === CLASSROOMS ===
  async fetchClassrooms(schoolId?: string): Promise<Classroom[] | null> {
    return withRetry(async () => {
      let query = supabase.from('classrooms').select('*').order('created_at', { ascending: false });
      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id || undefined,
        name: r.name,
        roomNumber: r.room_number || '',
        capacity: r.capacity || 25,
        type: r.type || 'lecture',
        equipment: r.equipment || [],
        status: r.status || 'available',
        currentOccupant: r.current_occupant || undefined,
      }));
    });
  },

  async upsertClassroom(classroom: Classroom, schoolId?: string) {
    return withRetry(async () => {
      const targetSchoolId = sanitizeSchoolId(schoolId || classroom.schoolId || null);
      const { error } = await supabase.from('classrooms').upsert({
        id: String(classroom.id),
        school_id: targetSchoolId,
        name: classroom.name,
        room_number: classroom.roomNumber || null,
        capacity: Number(classroom.capacity) || 25,
        type: classroom.type || 'lecture',
        equipment: classroom.equipment || [],
        status: classroom.status || 'available',
        current_occupant: classroom.currentOccupant || null,
      });

      if (error) {
        console.warn('Supabase classroom notice:', error.message);
      }
      return true;
    });
  },

  async deleteClassroom(classroomId: string) {
    return withRetry(async () => {
      await supabase.from('classrooms').delete().eq('id', classroomId);
      return true;
    });
  },

  // === TEACHERS ===
  async fetchTeachers(schoolId?: string): Promise<Teacher[] | null> {
    return withRetry(async () => {
      let query = supabase.from('teachers').select('*').order('created_at', { ascending: false });
      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((t: any) => {
        const payoutHistory = Array.isArray(t.payout_history) ? t.payout_history : [];

        return {
          id: t.id,
          schoolId: t.school_id || undefined,
          fullName: t.full_name,
          phone: t.phone,
          email: t.email || '',
          subject: t.subject,
          specialization: t.specialization || '',
          compensationType: t.compensation_type || 'percentage_per_student',
          commissionPercentage: t.commission_percentage !== null ? Number(t.commission_percentage) : 60,
          fixedCourseRate: t.fixed_course_rate !== null ? Number(t.fixed_course_rate) : 25000,
          status: t.status || 'active',
          settledEarned: t.settled_earned !== null ? Number(t.settled_earned) : 0,
          lastSettledDate: t.last_settled_date || undefined,
          groupsCount: 0,
          totalEarned: 0,
          totalPaid: 0,
          balanceDue: 0,
          payoutHistory,
        };
      });
    });
  },

  async upsertTeacher(teacher: Teacher, schoolId?: string) {
    return withRetry(async () => {
      const targetSchoolId = sanitizeSchoolId(schoolId || teacher.schoolId || null);
      const { error } = await supabase.from('teachers').upsert({
        id: String(teacher.id),
        school_id: targetSchoolId,
        full_name: teacher.fullName,
        phone: teacher.phone,
        email: teacher.email || null,
        subject: teacher.subject,
        specialization: teacher.specialization || null,
        compensation_type: teacher.compensationType || 'percentage_per_student',
        commission_percentage: teacher.commissionPercentage,
        fixed_course_rate: teacher.fixedCourseRate,
        status: teacher.status || 'active',
        payout_history: teacher.payoutHistory || [],
        settled_earned: teacher.settledEarned || 0,
        last_settled_date: teacher.lastSettledDate || null,
      });

      if (error) {
        console.warn('Supabase teacher notice:', error.message);
      }
      return true;
    });
  },

  async deleteTeacher(teacherId: string) {
    return withRetry(async () => {
      await supabase.from('teachers').delete().eq('id', teacherId);
      return true;
    });
  },

  // === COURSES ===
  async fetchCourses(schoolId?: string): Promise<Course[] | null> {
    return withRetry(async () => {
      let query = supabase.from('courses').select('*').order('created_at', { ascending: false });
      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((c: any) => {
        const monthlyPrice = Number(c.monthly_price) || 5000;
        const rawList: Student[] = Array.isArray(c.enrolled_list) ? c.enrolled_list : [];
        const enrolledList = rawList.map((s) => reconcileStudentFinancials(s, monthlyPrice));
        return {
          id: c.id,
          schoolId: c.school_id || undefined,
          title: c.title,
          subject: c.subject,
          academicLevel: c.academic_level,
          teacherId: c.teacher_id,
          teacherName: c.teacher_name,
          monthlyPrice,
          maxStudents: c.max_students || 25,
          totalSessionsDefault: c.total_sessions_default || 5,
          enrolledStudents: enrolledList.length,
          roomName: c.room_name || '',
          scheduleDays: c.schedule_days || [],
          scheduleTime: c.schedule_time || '',
          type: c.type || 'group',
          status: c.status || 'active',
          enrolledList,
        };
      });
    });
  },

  async upsertCourse(
    course: Course,
    schoolId?: string,
    options?: { deletedStudentIds?: string[]; skipMerge?: boolean }
  ): Promise<{ success: boolean; enrolledList: Student[] } | null> {
    return withRetry(async () => {
      const targetSchoolId = sanitizeSchoolId(schoolId || course.schoolId || null);
      let finalEnrolledList: Student[] = Array.isArray(course.enrolledList)
        ? course.enrolledList.map((s) => reconcileStudentFinancials(s, course.monthlyPrice))
        : [];

      if (!options?.skipMerge) {
        try {
          // Fetch current enrolled_list directly from Supabase to prevent concurrent overwrite
          const { data: remoteData, error: fetchErr } = await supabase
            .from('courses')
            .select('enrolled_list')
            .eq('id', String(course.id))
            .maybeSingle();

          if (!fetchErr && remoteData && Array.isArray(remoteData.enrolled_list)) {
            const remoteList: Student[] = remoteData.enrolled_list;
            const deletedIds = new Set(options?.deletedStudentIds || []);

            const mergedMap = new Map<string, Student>();

            // 1. Preserve all existing remote students (reconciled)
            remoteList.forEach((rStd) => {
              if (rStd && rStd.id && !deletedIds.has(rStd.id)) {
                mergedMap.set(rStd.id, reconcileStudentFinancials(rStd, course.monthlyPrice));
              }
            });

            // 2. Overlay / Merge local students
            finalEnrolledList.forEach((lStd) => {
              if (!lStd || !lStd.id) return;
              if (deletedIds.has(lStd.id)) return;

              const existing = mergedMap.get(lStd.id);
              if (!existing) {
                // New student registered on this device
                mergedMap.set(lStd.id, reconcileStudentFinancials(lStd, course.monthlyPrice));
              } else {
                // Student exists in both: merge attendance logs so nothing is lost
                const remoteLogs = existing.attendanceLogs || [];
                const localLogs = lStd.attendanceLogs || [];
                const logsMap = new Map<string, SessionAttendanceLog>();
                remoteLogs.forEach((log) => {
                  if (log && log.id) logsMap.set(log.id, log);
                });
                localLogs.forEach((log) => {
                  if (log && log.id) logsMap.set(log.id, log);
                });
                const mergedLogs = Array.from(logsMap.values()).sort((a, b) => {
                  const dateA = a.date || '';
                  const dateB = b.date || '';
                  return dateB.localeCompare(dateA);
                });

                const isExempt = !!(lStd.isExempt || existing.isExempt);
                const maxPaid = Math.max(existing.totalPaid || 0, lStd.totalPaid || 0);

                // Renewal-aware session count and debt calculation:
                // If a renewal/cycle-reset log exists, attendedSessions and totalDebt must represent the active cycle
                // instead of naively taking Math.max/Math.min which would clobber new cycle records.
                const localRenewLog = (lStd.attendanceLogs || []).find((l) => l && (l.status === 'renewed' || l.type === 'renewed'));
                const remoteRenewLog = (existing.attendanceLogs || []).find((l) => l && (l.status === 'renewed' || l.type === 'renewed'));
                let mergedAttended = Math.max(existing.attendedSessions || 0, lStd.attendedSessions || 0);
                let mergedDebt = isExempt ? 0 : (lStd.totalDebt !== undefined ? lStd.totalDebt : (existing.totalDebt || 0));

                if (localRenewLog || remoteRenewLog) {
                  const renewIdx = mergedLogs.findIndex((l) => l && (l.status === 'renewed' || l.type === 'renewed'));
                  const currentCycleLogs = renewIdx === -1 ? mergedLogs : mergedLogs.slice(0, renewIdx);
                  const activeCycleSessions = currentCycleLogs.filter((l) => {
                    const st = l.status || l.type;
                    return st === 'present' || st === 'absent_counted' || st === 'single_session';
                  }).length;

                  if (localRenewLog && !remoteRenewLog) {
                    // Local side has a newer renewal that remote has not seen yet -> trust local attended sessions & debt
                    mergedAttended = Math.max(lStd.attendedSessions || 0, activeCycleSessions);
                    if (!isExempt) mergedDebt = lStd.totalDebt !== undefined ? lStd.totalDebt : 0;
                  } else if (remoteRenewLog && !localRenewLog) {
                    // Remote side has a newer renewal that local has not seen yet -> trust remote attended sessions & debt
                    mergedAttended = Math.max(existing.attendedSessions || 0, activeCycleSessions);
                    if (!isExempt) mergedDebt = existing.totalDebt !== undefined ? existing.totalDebt : 0;
                  } else {
                    // Both sides have renewals recorded:
                    mergedAttended = Math.max(activeCycleSessions, Math.min(existing.attendedSessions || 0, lStd.attendedSessions || 0));
                    mergedAttended = Math.max(mergedAttended, activeCycleSessions);
                    if (!isExempt) {
                      const d1 = existing.totalDebt !== undefined ? existing.totalDebt : 999999;
                      const d2 = lStd.totalDebt !== undefined ? lStd.totalDebt : 999999;
                      mergedDebt = Math.min(d1, d2);
                      if (mergedDebt === 999999) mergedDebt = 0;
                    }
                  }
                } else if (!isExempt) {
                  const d1 = existing.totalDebt !== undefined ? existing.totalDebt : 999999;
                  const d2 = lStd.totalDebt !== undefined ? lStd.totalDebt : 999999;
                  mergedDebt = Math.min(d1, d2);
                  if (mergedDebt === 999999) mergedDebt = 0;
                }

                const mergedCandidate: Student = {
                  ...existing,
                  ...lStd,
                  isExempt,
                  totalPaid: maxPaid,
                  totalDebt: mergedDebt,
                  attendanceLogs: mergedLogs,
                  attendedSessions: mergedAttended,
                  totalSessions: lStd.totalSessions || existing.totalSessions || 5,
                };

                mergedMap.set(lStd.id, reconcileStudentFinancials(mergedCandidate, course.monthlyPrice));
              }
            });

            finalEnrolledList = Array.from(mergedMap.values());
          }
        } catch (err) {
          console.warn('Smart merge note (proceeding with local list):', err);
        }
      }

      finalEnrolledList = finalEnrolledList.map((s) => reconcileStudentFinancials(s, course.monthlyPrice));

      const { error } = await supabase.from('courses').upsert({
        id: String(course.id),
        school_id: targetSchoolId,
        title: course.title,
        subject: course.subject,
        academic_level: course.academicLevel,
        teacher_id: course.teacherId || null,
        teacher_name: course.teacherName || null,
        monthly_price: Number(course.monthlyPrice) || 5000,
        max_students: Number(course.maxStudents) || 25,
        total_sessions_default: Number(course.totalSessionsDefault) || 5,
        enrolled_students: finalEnrolledList.length,
        room_name: course.roomName || null,
        schedule_days: course.scheduleDays || [],
        schedule_time: course.scheduleTime || null,
        type: course.type || 'group',
        status: course.status || 'active',
        enrolled_list: finalEnrolledList,
      });

      if (error) {
        console.warn('Supabase course notice:', error.message);
      }
      return { success: !error, enrolledList: finalEnrolledList };
    });
  },

  async deleteCourse(courseId: string) {
    return withRetry(async () => {
      await supabase.from('courses').delete().eq('id', courseId);
      return true;
    });
  },

  // === PAYMENT TRANSACTIONS ===
  async fetchTransactions(schoolId?: string): Promise<PaymentTransaction[] | null> {
    return withRetry(async () => {
      let query = supabase.from('payment_transactions').select('*').order('created_at', { ascending: false });
      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((t: any) => ({
        id: t.id,
        schoolId: t.school_id || undefined,
        receiptNumber: t.receipt_number,
        studentId: t.student_id,
        studentName: t.student_name,
        courseTitle: t.course_title,
        amount: Number(t.amount) || 0,
        paymentMethod: t.payment_method || 'cash',
        date: t.date,
        status: t.status || 'completed',
        recordedBy: t.recorded_by || 'إدارة المؤسسة',
        notes: t.notes || '',
      }));
    });
  },

  async insertTransaction(tx: PaymentTransaction, schoolId?: string) {
    return withRetry(async () => {
      const targetSchoolId = sanitizeSchoolId(schoolId || tx.schoolId || null);
      const { error } = await supabase.from('payment_transactions').upsert({
        id: String(tx.id),
        school_id: targetSchoolId,
        receipt_number: tx.receiptNumber,
        student_id: tx.studentId || null,
        student_name: tx.studentName,
        course_title: tx.courseTitle,
        amount: Number(tx.amount) || 0,
        payment_method: tx.paymentMethod || 'cash',
        date: tx.date || new Date().toISOString().split('T')[0],
        status: tx.status || 'completed',
        recorded_by: tx.recordedBy || 'إدارة المؤسسة',
        notes: tx.notes || null,
      });

      if (error) {
        console.warn('Supabase transaction notice:', error.message);
      }
      return true;
    });
  },

  async deleteTransaction(txId: string) {
    return withRetry(async () => {
      await supabase.from('payment_transactions').delete().eq('id', txId);
      return true;
    });
  },

  // === DEBTS ===
  async fetchDebts(schoolId?: string): Promise<DebtRecord[] | null> {
    return withRetry(async () => {
      let query = supabase.from('debts').select('*').order('created_at', { ascending: false });
      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((d: any) => ({
        id: d.id,
        schoolId: d.school_id || undefined,
        studentId: d.student_id,
        studentName: d.student_name,
        studentPhone: d.student_phone || '',
        courseTitle: d.course_title,
        totalAmount: Number(d.total_amount) || 0,
        paidAmount: Number(d.paid_amount) || 0,
        remainingAmount: Number(d.remaining_amount) || 0,
        dueDate: d.due_date,
        status: d.status || 'unpaid',
      }));
    });
  },

  async upsertDebt(debt: DebtRecord, schoolId?: string) {
    return withRetry(async () => {
      const targetSchoolId = sanitizeSchoolId(schoolId || debt.schoolId || null);
      const { error } = await supabase.from('debts').upsert({
        id: String(debt.id),
        school_id: targetSchoolId,
        student_id: debt.studentId || null,
        student_name: debt.studentName,
        student_phone: debt.studentPhone || null,
        course_title: debt.courseTitle,
        total_amount: Number(debt.totalAmount) || 0,
        paid_amount: Number(debt.paidAmount) || 0,
        remaining_amount: Number(debt.remainingAmount) || 0,
        due_date: debt.dueDate || new Date().toISOString().split('T')[0],
        status: debt.status || 'unpaid',
      });

      if (error) {
        console.warn('Supabase debt notice:', error.message);
      }
      return !error;
    });
  },

  async deleteDebt(debtId: string) {
    return withRetry(async () => {
      const { error } = await supabase.from('debts').delete().eq('id', debtId);
      if (error) {
        console.warn('Supabase delete debt notice:', error.message);
      }
      return !error;
    });
  },

  // === EXPENSES ===
  async fetchExpenses(schoolId?: string): Promise<Expense[] | null> {
    return withRetry(async () => {
      let query = supabase.from('expenses').select('*').order('date', { ascending: false });
      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((e: any) => ({
        id: e.id,
        schoolId: e.school_id || undefined,
        receiptNumber: e.receipt_number || `EXP-${e.id.substring(0, 6)}`,
        title: e.title,
        category: e.category || 'other',
        amount: Number(e.amount) || 0,
        date: e.date,
        recipientName: e.recipient_name || undefined,
        paymentMethod: e.payment_method || 'نقداً',
        notes: e.notes || undefined,
      }));
    });
  },

  async upsertExpense(expense: Expense, schoolId?: string) {
    return withRetry(async () => {
      const targetSchoolId = sanitizeSchoolId(schoolId || expense.schoolId || null);
      const { error } = await supabase.from('expenses').upsert({
        id: String(expense.id),
        school_id: targetSchoolId,
        receipt_number: expense.receiptNumber,
        title: expense.title,
        category: expense.category,
        amount: Number(expense.amount) || 0,
        recipient_name: expense.recipientName || null,
        date: expense.date || new Date().toISOString().split('T')[0],
        payment_method: expense.paymentMethod || 'نقداً',
        notes: expense.notes || null,
      });

      if (error) {
        console.warn('Supabase expense notice:', error.message);
      }
      return true;
    });
  },

  async deleteExpense(expenseId: string) {
    return withRetry(async () => {
      await supabase.from('expenses').delete().eq('id', expenseId);
      return true;
    });
  },

  // === STUDENT CARDS DIRECTORY ===
  async fetchStudentCards(schoolId?: string): Promise<any[] | null> {
    return withRetry(async () => {
      let query = supabase.from('student_cards').select('*').order('created_at', { ascending: false });
      if (schoolId) {
        const sid = sanitizeSchoolId(schoolId);
        if (sid) query = query.eq('school_id', sid);
      }
      const { data, error } = await query;
      if (error || !data) return null;
      return data;
    });
  },

  async upsertStudentCard(cardData: {
    schoolId?: string;
    cardId: string;
    studentId?: string;
    studentName: string;
    phone?: string;
    parentPhone?: string;
    academicLevel?: string;
    notes?: string;
  }) {
    return withRetry(async () => {
      const targetSchoolId = sanitizeSchoolId(cardData.schoolId || null);
      const { error } = await supabase.from('student_cards').upsert(
        {
          school_id: targetSchoolId,
          card_id: cardData.cardId.trim(),
          student_id: cardData.studentId || null,
          student_name: cardData.studentName.trim(),
          phone: cardData.phone?.trim() || null,
          parent_phone: cardData.parentPhone?.trim() || null,
          academic_level: cardData.academicLevel || null,
          notes: cardData.notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'school_id,card_id' }
      );
      if (error) {
        console.warn('Supabase student_cards notice:', error.message);
      }
      return true;
    });
  },
};
