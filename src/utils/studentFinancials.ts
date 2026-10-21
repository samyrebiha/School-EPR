import { Student, SessionAttendanceLog } from '../types';

/**
 * Reconciles and repairs financial records (totalPaid, totalDebt) for a student
 * based on their course price, exemption status, and verified attendance payment logs.
 *
 * This prevents the bug where totalDebt is erroneously reset to the full subscription
 * price (monthlyPrice) after payments were registered or after multi-device sync.
 */
export function reconcileStudentFinancials(
  student: Student,
  courseMonthlyPrice?: number
): Student {
  if (!student) return student;

  // 1. If student is marked exempt, they have 0 debt by definition
  if (student.isExempt) {
    return {
      ...student,
      totalDebt: 0,
      totalPaid: student.totalPaid || 0,
    };
  }

  const logs: SessionAttendanceLog[] = Array.isArray(student.attendanceLogs)
    ? student.attendanceLogs
    : [];

  // 2. Sum verified cash payments from attendance logs
  const paymentLogs = logs.filter(
    (l) => l && (l.status === 'payment' || l.type === 'payment')
  );
  const paidFromLogs = paymentLogs.reduce(
    (sum, l) => sum + (Number(l.amount) || 0),
    0
  );

  // Student's totalPaid can never be lower than verified payment logs
  const actualPaid = Math.max(Number(student.totalPaid) || 0, paidFromLogs);

  // 3. Determine the base price of the course/package for this student
  const basePrice =
    student.coursePrice !== undefined && student.coursePrice > 0
      ? Number(student.coursePrice)
      : Number(courseMonthlyPrice) || 0;

  if (basePrice <= 0) {
    return {
      ...student,
      totalPaid: actualPaid,
      totalDebt: 0,
    };
  }

  // 4. Check current cycle payments based on the latest renewal marker
  const latestRenewalIdx = logs.findIndex(
    (l) => l && (l.status === 'renewed' || l.type === 'renewed')
  );
  const currentCycleLogs = latestRenewalIdx === -1 ? logs : logs.slice(0, latestRenewalIdx);
  const currentCyclePaid = currentCycleLogs
    .filter((l) => l && (l.status === 'payment' || l.type === 'payment'))
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  // 5. Reconcile remaining debt
  let currentDebt = Math.max(0, Number(student.totalDebt) || 0);

  if (latestRenewalIdx !== -1) {
    // Student has a renewal log (cycle reset or new package)
    if (currentCyclePaid >= basePrice) {
      currentDebt = 0;
    } else if (currentCyclePaid > 0) {
      currentDebt = Math.max(0, basePrice - currentCyclePaid);
    } else if (currentDebt <= 0 && (student.totalDebt === undefined || student.totalDebt <= 0)) {
      currentDebt = 0;
    } else {
      // Unpaid renewal cycle (keeps set debt or defaults to basePrice)
      currentDebt = currentDebt > 0 ? currentDebt : basePrice;
    }
  } else {
    // Initial cycle (no renewals yet)
    if (actualPaid >= basePrice && currentDebt <= 0) {
      currentDebt = 0;
    } else if (currentDebt > 0 && actualPaid > 0 && actualPaid + currentDebt > basePrice) {
      currentDebt = Math.max(0, basePrice - actualPaid);
    }
  }

  return {
    ...student,
    totalPaid: actualPaid,
    totalDebt: currentDebt,
  };
}

/**
 * Reconciles an entire array of students in a course
 */
export function reconcileCourseStudents(
  students: Student[],
  courseMonthlyPrice?: number
): Student[] {
  if (!Array.isArray(students)) return [];
  return students.map((s) => reconcileStudentFinancials(s, courseMonthlyPrice));
}
