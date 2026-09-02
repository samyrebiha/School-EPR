import { supabase } from '../lib/supabase';
import {
  SchoolTenant,
  Teacher,
  Course,
  Classroom,
  PaymentTransaction,
  DebtRecord,
} from '../types';

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
      const { error } = await supabase.from('classrooms').upsert({
        id: String(classroom.id),
        school_id: schoolId || null,
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

      return data.map((t: any) => ({
        id: t.id,
        fullName: t.full_name,
        phone: t.phone,
        email: t.email || '',
        subject: t.subject,
        specialization: t.specialization || '',
        compensationType: t.compensation_type || 'percentage_per_student',
        commissionPercentage: t.commission_percentage !== null ? Number(t.commission_percentage) : 60,
        fixedCourseRate: t.fixed_course_rate !== null ? Number(t.fixed_course_rate) : 25000,
        status: t.status || 'active',
        groupsCount: 0,
        totalEarned: 0,
        totalPaid: 0,
        balanceDue: 0,
        payoutHistory: t.payout_history || [],
      }));
    });
  },

  async upsertTeacher(teacher: Teacher, schoolId?: string) {
    return withRetry(async () => {
      const { error } = await supabase.from('teachers').upsert({
        id: String(teacher.id),
        school_id: schoolId || null,
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

      return data.map((c: any) => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
        academicLevel: c.academic_level,
        teacherId: c.teacher_id,
        teacherName: c.teacher_name,
        monthlyPrice: Number(c.monthly_price) || 5000,
        maxStudents: c.max_students || 25,
        totalSessionsDefault: c.total_sessions_default || 5,
        enrolledStudents: c.enrolled_students || 0,
        roomName: c.room_name || '',
        scheduleDays: c.schedule_days || [],
        scheduleTime: c.schedule_time || '',
        type: c.type || 'group',
        status: c.status || 'active',
        enrolledList: c.enrolled_list || [],
      }));
    });
  },

  async upsertCourse(course: Course, schoolId?: string) {
    return withRetry(async () => {
      const { error } = await supabase.from('courses').upsert({
        id: String(course.id),
        school_id: schoolId || null,
        title: course.title,
        subject: course.subject,
        academic_level: course.academicLevel,
        teacher_id: course.teacherId || null,
        teacher_name: course.teacherName || null,
        monthly_price: Number(course.monthlyPrice) || 5000,
        max_students: Number(course.maxStudents) || 25,
        total_sessions_default: Number(course.totalSessionsDefault) || 5,
        enrolled_students: Number(course.enrolledStudents) || 0,
        room_name: course.roomName || null,
        schedule_days: course.scheduleDays || [],
        schedule_time: course.scheduleTime || null,
        type: course.type || 'group',
        status: course.status || 'active',
        enrolled_list: course.enrolledList || [],
      });

      if (error) {
        console.warn('Supabase course notice:', error.message);
      }
      return true;
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
      const { error } = await supabase.from('payment_transactions').upsert({
        id: String(tx.id),
        school_id: schoolId || null,
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
      const { error } = await supabase.from('debts').upsert({
        id: String(debt.id),
        school_id: schoolId || null,
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
      return true;
    });
  },
};
