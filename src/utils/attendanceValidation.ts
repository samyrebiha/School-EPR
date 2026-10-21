import { Student, SessionAttendanceLog } from '../types';
import { formatDZD } from './formatters';

export interface AttendanceValidationResult {
  allowed: boolean;
  blockReason?: 'cooldown_2h' | 'debt_second_session';
  errorTitle?: string;
  errorMessage?: string;
  warningMessage?: string;
  lastAttendanceTime?: string;
  remainingMinutes?: number;
  debtAmount?: number;
}

/**
 * Extracts a numeric epoch timestamp (ms) from an attendance log.
 */
export function getAttendanceLogTimestamp(log: SessionAttendanceLog): number {
  if (!log) return 0;

  // 1. Try extracting timestamp from log id (e.g. 'log-1740000000000' or 'log-single-1740000000000')
  if (log.id && log.id.startsWith('log-')) {
    const parts = log.id.split('-');
    for (const part of parts) {
      const num = Number(part);
      if (!isNaN(num) && num > 1600000000000 && num < 2500000000000) {
        return num;
      }
    }
  }

  // 2. Try parsing date + time
  if (log.date) {
    const timeStr = log.time || '00:00:00';
    const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    const parsed = new Date(`${log.date}T${normalizedTime}`).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

/**
 * Checks if the student was registered for attendance within the last 2 hours (120 minutes).
 */
export function checkAttendance2HourCooldown(student: Student, nowMs: number = Date.now()): {
  inCooldown: boolean;
  lastTime?: string;
  remainingMinutes: number;
  lastLog?: SessionAttendanceLog;
} {
  const logs = student.attendanceLogs || [];
  const attendanceLogs = logs.filter(
    (l) =>
      l &&
      (l.status === 'present' ||
        l.type === 'present' ||
        l.status === 'single_session' ||
        l.type === 'single_session')
  );

  if (attendanceLogs.length === 0) {
    return { inCooldown: false, remainingMinutes: 0 };
  }

  // Find latest attendance log by timestamp
  let latestTs = 0;
  let latestLog: SessionAttendanceLog | undefined;

  for (const log of attendanceLogs) {
    const ts = getAttendanceLogTimestamp(log);
    if (ts > latestTs) {
      latestTs = ts;
      latestLog = log;
    }
  }

  if (!latestLog || latestTs === 0) {
    return { inCooldown: false, remainingMinutes: 0 };
  }

  const diffMs = nowMs - latestTs;
  const twoHoursMs = 2 * 60 * 60 * 1000; // 7,200,000 ms (2 hours)

  if (diffMs >= 0 && diffMs < twoHoursMs) {
    const elapsedMinutes = Math.floor(diffMs / 60000);
    const remainingMinutes = Math.max(1, 120 - elapsedMinutes);
    return {
      inCooldown: true,
      lastTime: latestLog.time || new Date(latestTs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      remainingMinutes,
      lastLog: latestLog,
    };
  }

  return { inCooldown: false, remainingMinutes: 0 };
}

/**
 * Validates whether a student can be marked present/attended:
 * 1. Debt Rule: A student with debt can attend ONLY 1 session. On the 2nd session (attendedSessions >= 1) with debt, attendance is strictly blocked.
 * 2. Cooldown Rule: A student cannot be registered twice within 2 hours of their previous attendance.
 */
export function validateStudentAttendanceRegistration(
  student: Student,
  nowMs: number = Date.now()
): AttendanceValidationResult {
  if (!student) {
    return { allowed: false, errorMessage: 'بيانات التلميذ غير متوفرة' };
  }

  const totalDebt = student.totalDebt || 0;
  const hasDebt = !student.isExempt && totalDebt > 0;
  const attendedSessions = student.attendedSessions || 0;

  // 1. Debt Rule: Can study only ONE session if in debt. If attendedSessions >= 1, second session cannot be recorded.
  if (hasDebt && attendedSessions >= 1) {
    return {
      allowed: false,
      blockReason: 'debt_second_session',
      debtAmount: totalDebt,
      errorTitle: 'ممنوع التسجيل - مستحقات مالية غير مسددة',
      errorMessage: `لا يمكن تسجيل التلميذ "${student.fullName}" لوجود دين غير مسدد بذمته (${formatDZD(totalDebt)}). يُسمح بدراسة حصة واحدة فقط بالدين وقد استنفذها، ولا يمكن تسجيل الحصة الثانية إلا بعد تسديد المتأخرات!`,
    };
  }

  // 2. Cooldown Rule: Cannot be registered twice within 2 hours
  const cooldown = checkAttendance2HourCooldown(student, nowMs);
  if (cooldown.inCooldown) {
    return {
      allowed: false,
      blockReason: 'cooldown_2h',
      lastAttendanceTime: cooldown.lastTime,
      remainingMinutes: cooldown.remainingMinutes,
      errorTitle: 'تكرار التسجيل غير مسموح (قفل الساعتين)',
      errorMessage: `لا يمكن تسجيل حضور التلميذ "${student.fullName}" مرتين إلا بعد مرور ساعتين من تسجيله أول مرة! سُجّل الحضور سابقاً الساعة ${cooldown.lastTime} (متبقي ${cooldown.remainingMinutes} دقيقة على إتاحة التسجيل مجدداً).`,
    };
  }

  // If student has debt but attendedSessions === 0, they are allowed to attend their 1st session with an advisory warning
  const warningMessage =
    hasDebt && attendedSessions === 0
      ? `تنبيه مالي: التلميذ عليه دين غير مسدد (${formatDZD(totalDebt)}). هذه هي الحصة الأولى والوحيدة المسموحة بالدين، ولن يسمح له النظام بتسجيل الحصة الثانية إلا بعد تسديد دينه.`
      : undefined;

  return {
    allowed: true,
    warningMessage,
  };
}

/**
 * Calculates the current session number of the group.
 * If attendance was already recorded today for any student in the group,
 * the group is currently in session `maxSessions`.
 * If no one attended today yet, the upcoming session for the group is `maxSessions + 1`.
 * If the course has never held any sessions, it is at session 1.
 */
export function calculateCurrentGroupSession(course?: { enrolledList?: Student[] } | null): number {
  const students = course?.enrolledList || [];
  if (students.length === 0) return 1;

  const todayStr = new Date().toISOString().split('T')[0];
  let maxSessions = 0;
  let hasAttendanceToday = false;

  for (const s of students) {
    const logs = s.attendanceLogs || [];
    const renewIdx = logs.findIndex((l) => l.status === 'renewed');
    const cycleLogs = renewIdx === -1 ? logs : logs.slice(0, renewIdx);
    const validLogs = cycleLogs.filter((l) => {
      const st = l.status || l.type;
      return st === 'present' || st === 'absent_counted' || st === 'absent_uncounted' || st === 'single_session';
    });

    const attendedCount = Math.max(s.attendedSessions || 0, validLogs.length);
    if (attendedCount > maxSessions) {
      maxSessions = attendedCount;
    }

    if (
      logs.some(
        (l) =>
          l.date === todayStr &&
          (l.status === 'present' || l.status === 'single_session' || l.type === 'present' || l.type === 'single_session')
      )
    ) {
      hasAttendanceToday = true;
    }
  }

  if (maxSessions === 0) {
    return 1;
  }

  return hasAttendanceToday ? Math.max(1, maxSessions) : maxSessions + 1;
}

/**
 * Calculates the automatically detected missed sessions for a newly joining student.
 * Formula requested: (الحصة التي فيها الفوج الآن) - 1
 */
export function calculateAutoMissedSessions(course?: { enrolledList?: Student[] } | null): number {
  const currentSession = calculateCurrentGroupSession(course);
  return Math.max(0, currentSession - 1);
}

