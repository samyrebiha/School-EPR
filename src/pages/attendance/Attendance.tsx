import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users,
  CheckCircle2,
  FileCheck,
  History,
  Calendar,
  AlertTriangle,
  RotateCw,
  RotateCcw,
  Phone,
  UserX,
  Check,
  Printer,
  Trash2,
  Edit2,
  Search,
  X,
  Undo2,
  UserPlus,
  HeartHandshake,
  Coins,
  CreditCard,
  MoreVertical,
  GraduationCap,
  Filter,
  SlidersHorizontal,
  Clock,
  DoorOpen,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Layers,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select, Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Course, Student, SessionAttendanceLog } from '../../types';
import { formatDZD, formatAlgerianPhone, formatDateArabic } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';
import { ACADEMIC_LEVEL_OPTIONS } from '../../data/academicLevels';
import { DuplicateStudentBanner } from '../../components/common/DuplicateStudentBanner';
import { findDuplicateStudents } from '../../utils/studentDuplicates';
import {
  validateStudentAttendanceRegistration,
  calculateCurrentGroupSession,
  calculateAutoMissedSessions,
} from '../../utils/attendanceValidation';
import { SmartCardScannerTab } from './SmartCardScannerTab';
import { StudentCardsDirectoryTab } from './StudentCardsDirectoryTab';
import { CourseSelect } from './CourseSelect';

/**
 * Visual Circles component representing sessions quota and attendance status
 * - Amber dashed: Missed group session (student joined after group started)
 * - Green: Present
 * - Red: Absent Counted (charged)
 * - Orange: Absent Uncounted (excused)
 * - Gray dashed: Remaining session
 */
const SessionCircles: React.FC<{ student: Student; maxCourseSessions?: number }> = ({
  student,
  maxCourseSessions = 0,
}) => {
  const total = student.totalSessions && student.totalSessions > 0 ? student.totalSessions : 4;
  const attended = student.attendedSessions || 0;
  const isExceeded = attended > total;

  const allLogs = student.attendanceLogs || [];
  // Find index of most recent renewal log to scope circles to current active package
  const latestRenewalIdx = allLogs.findIndex((l) => l.status === 'renewed');
  const currentCycleRawLogs = latestRenewalIdx === -1 ? allLogs : allLogs.slice(0, latestRenewalIdx);

  // Filter ONLY real quota-consuming session attendance logs (present, absent_counted, single_session).
  // Excused absence (absent_uncounted) is a skip/pass for that day and DOES NOT consume a quota slot.
  // The slot remains an empty gray circle waiting for the next session when the student attends.
  const sessionLogs = currentCycleRawLogs
    .filter((l) => l.status === 'present' || l.status === 'absent_counted' || l.status === 'single_session')
    .slice()
    .reverse();

  // All session logs in this cycle (including excused absences) to calculate total participated sessions
  const allCycleSessionLogs = currentCycleRawLogs.filter((l) => {
    const s = l.status || l.type;
    return s === 'present' || s === 'absent_counted' || s === 'absent_uncounted' || s === 'single_session';
  });

  const studentCycleProgress = Math.max(attended, allCycleSessionLogs.length);
  // Missed sessions entered explicitly by user (e.g. 1 or 2)
  const missedGroupSessions = student.missedGroupSessions || 0;

  const excusedLogs = currentCycleRawLogs.filter((l) => l.status === 'absent_uncounted');
  const absentCounted = sessionLogs.filter((l) => l.status === 'absent_counted').length;
  const singleSessionCount = sessionLogs.filter((l) => l.status === 'single_session').length;
  const absentUncounted = excusedLogs.length;

  const consumedCount = Math.max(attended, sessionLogs.length);
  const slotsCount = Math.max(total, consumedCount);

  const circles = [];

  // 1. Missed Group Sessions (pre-enrollment / late join - displayed with amber dashed styling)
  for (let m = 0; m < missedGroupSessions; m++) {
    circles.push({
      type: 'missed_group',
      icon: '⚠️',
      tooltip: `حصة ${m + 1} للفوج: فائتة (التحاق متأخر بالفوج - فاتته ${missedGroupSessions === 1 ? 'حصة واحدة' : missedGroupSessions === 2 ? 'حصتان' : `${missedGroupSessions} حصص`})`,
      bgColor: '#fffbeb',
      borderColor: '#f59e0b',
      textColor: '#b45309',
      boxShadow: '0 1px 3px rgba(245, 158, 11, 0.25)',
      isDashed: true,
    });
  }

  // 2. Student's own quota slots
  for (let i = 0; i < slotsCount; i++) {
    if (i < sessionLogs.length) {
      const log = sessionLogs[i];
      if (log.status === 'single_session') {
        circles.push({
          type: 'single_session',
          icon: '✓',
          tooltip: `حصة ${i + 1}: حضور حصة واحدة (مسددة: ${formatDZD(log.amount || 0)} | للأستاذ: ${formatDZD(log.teacherAmount || 0)})${log.date ? ` • ${formatDateArabic(log.date)}` : ''}`,
          bgColor: '#2563eb',
          borderColor: '#1d4ed8',
          textColor: '#ffffff',
          boxShadow: '0 2px 5px rgba(37, 99, 235, 0.35)',
        });
      } else if (log.status === 'absent_counted') {
        circles.push({
          type: 'absent_counted',
          icon: '✕',
          tooltip: `حصة ${i + 1}: غياب محسوب (مقتطع من الرصيد)${log.date ? ` • ${formatDateArabic(log.date)}` : ''}${log.notes ? ` • ${log.notes}` : ''}`,
          bgColor: '#ef4444',
          borderColor: '#dc2626',
          textColor: '#ffffff',
          boxShadow: '0 2px 5px rgba(239, 68, 68, 0.35)',
        });
      } else {
        // present
        circles.push({
          type: 'present',
          icon: '✓',
          tooltip: `حصة ${i + 1}: حضور مسجل${log.date ? ` • ${formatDateArabic(log.date)}` : ''}`,
          bgColor: '#10b981',
          borderColor: '#059669',
          textColor: '#ffffff',
          boxShadow: '0 2px 5px rgba(16, 185, 129, 0.35)',
        });
      }
    } else if (i < attended) {
      // Carried over overage session from previous package or legacy record
      circles.push({
        type: 'present',
        icon: '✓',
        tooltip: `حصة ${i + 1}: حصة مستهلكة مرحّلة من التجاوز السابق`,
        bgColor: '#10b981',
        borderColor: '#059669',
        textColor: '#ffffff',
        boxShadow: '0 2px 5px rgba(16, 185, 129, 0.35)',
      });
    } else {
      // Empty / remaining session
      circles.push({
        type: 'empty',
        icon: `${i + 1}`,
        tooltip: `حصة ${i + 1}: حصة متبقية`,
        bgColor: 'var(--color-bg-app, #f8fafc)',
        borderColor: 'var(--color-border, #cbd5e1)',
        textColor: 'var(--color-text-muted, #94a3b8)',
        boxShadow: 'none',
        isDashed: true,
      });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Visual Circles Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {circles.map((c, idx) => (
          <div
            key={idx}
            title={c.tooltip}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6875rem',
              fontWeight: 700,
              backgroundColor: c.bgColor,
              color: c.textColor,
              border: c.isDashed ? `2px dashed ${c.borderColor}` : `2px solid ${c.borderColor}`,
              boxShadow: c.boxShadow,
              cursor: 'default',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {c.icon}
          </div>
        ))}
      </div>

      {/* Numerical Counter & Status Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
        <span
          style={{
            fontWeight: 700,
            color: isExceeded ? 'var(--color-danger)' : attended === total ? 'var(--color-warning)' : 'var(--color-text-primary)',
            fontFamily: 'monospace',
          }}
        >
          {attended} / {total} حصص
        </span>

        {missedGroupSessions > 0 && (
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
              fontSize: '0.6875rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
            title={`فاتت التلميذ ${missedGroupSessions} ${missedGroupSessions === 1 ? 'حصة' : missedGroupSessions === 2 ? 'حصتين' : 'حصص'} من انطلاق دروس الفوج`}
          >
            ⚠️ فاتت {missedGroupSessions} {missedGroupSessions === 1 ? 'حصة' : missedGroupSessions === 2 ? 'حصتين' : 'حصص'}
          </span>
        )}

        {singleSessionCount > 0 && (
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#1d4ed8',
              fontSize: '0.6875rem',
              fontWeight: 600,
            }}
          >
            {singleSessionCount} حصة واحدة
          </span>
        )}

        {absentCounted > 0 && (
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              fontSize: '0.6875rem',
              fontWeight: 600,
            }}
          >
            {absentCounted} غياب محسوب
          </span>
        )}

        {absentUncounted > 0 && (
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              color: '#c2410c',
              fontSize: '0.6875rem',
              fontWeight: 600,
            }}
            title={`${absentUncounted} غياب معفى: تجاوز لليوم دون خصم من الباقة، وتُحسب في الحصة القادمة`}
          >
            {absentUncounted} غياب معفى (تجاوز يوم)
          </span>
        )}

        {isExceeded && (
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              fontSize: '0.6875rem',
              fontWeight: 700,
            }}
          >
            تجاوز بـ {Math.max(0, attended - total)}
          </span>
        )}

        {attended === total && total > 1 && !isExceeded && !student.isExempt && (
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fcd34d',
              fontSize: '0.6875rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
            title="التلميذ استهلك كامل حصص اشتراكه (الحصة الأخيرة) - يرجى تذكيره بالتجديد للحصة القادمة"
          >
            ⚠️ الحصة الأخيرة - يلزم التجديد
          </span>
        )}
      </div>
    </div>
  );
};

interface AttendanceProps {
  initialViewMode?: 'roster' | 'smart_card' | 'cards_directory';
}

export const Attendance: React.FC<AttendanceProps> = ({ initialViewMode }) => {
  const { success, warning } = useToast();
  const {
    courses,
    teachers,
    currentSchool,
    debts,
    recordPayment,
    deleteDebt,
    incrementStudentSession,
    recordStudentAbsence,
    recordBatchAbsence,
    revertTodayAutoAbsence,
    clearTodayAutoAbsentCancellation,
    renewStudentSubscription,
    undoStudentAttendance,
    recordSingleSessionAttendance,
    convertSingleSessionToCourse,
    updateStudent,
    removeStudentFromCourse,
    enrollStudentToCourse,
  } = useData();

  // Attendance View Mode: 'roster' (Standard Table) | 'smart_card' (Smart RFID/Barcode Scanner) | 'cards_directory' (Central Cards Directory)
  const [attendanceViewMode, setAttendanceViewMode] = useState<'roster' | 'smart_card' | 'cards_directory'>(
    initialViewMode || 'roster'
  );

  useEffect(() => {
    if (initialViewMode) {
      setAttendanceViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Course Advanced Filter States
  const [courseSearch, setCourseSearch] = useState('');
  const [courseTeacherFilter, setCourseTeacherFilter] = useState('all');
  const [courseLevelFilter, setCourseLevelFilter] = useState('all');
  const [courseDayFilter, setCourseDayFilter] = useState('all');
  const [isAdvancedCourseFilterOpen, setIsAdvancedCourseFilterOpen] = useState(false);

  // Today's day name in Arabic for instant 1-click filter
  const todayDayName = useMemo(() => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[new Date().getDay()];
  }, []);

  // Distinct academic levels available in courses
  const availableCourseLevels = useMemo(() => {
    const levels = new Set<string>();
    courses.forEach((c) => {
      if (c.academicLevel) levels.add(c.academicLevel);
    });
    return Array.from(levels);
  }, [courses]);

  // Filtered courses based on advanced filter controls
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // 1. Search Query
      if (courseSearch.trim()) {
        const q = courseSearch.trim().toLowerCase();
        const matchTitle = (c.title || '').toLowerCase().includes(q);
        const matchSubject = (c.subject || '').toLowerCase().includes(q);
        const matchTeacher = (c.teacherName || '').toLowerCase().includes(q);
        const matchRoom = (c.roomName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchTeacher && !matchRoom) return false;
      }
      // 2. Teacher Filter
      if (courseTeacherFilter !== 'all') {
        if (c.teacherId !== courseTeacherFilter && c.teacherName !== courseTeacherFilter) return false;
      }
      // 3. Academic Level Filter
      if (courseLevelFilter !== 'all') {
        if (c.academicLevel !== courseLevelFilter) return false;
      }
      // 4. Day Filter
      if (courseDayFilter !== 'all') {
        if (!c.scheduleDays || !c.scheduleDays.includes(courseDayFilter)) return false;
      }
      return true;
    });
  }, [courses, courseSearch, courseTeacherFilter, courseLevelFilter, courseDayFilter]);

  const activeCourseFiltersCount =
    (courseSearch.trim() ? 1 : 0) +
    (courseTeacherFilter !== 'all' ? 1 : 0) +
    (courseLevelFilter !== 'all' ? 1 : 0) +
    (courseDayFilter !== 'all' ? 1 : 0);

  const handleResetCourseFilters = () => {
    setCourseSearch('');
    setCourseTeacherFilter('all');
    setCourseLevelFilter('all');
    setCourseDayFilter('all');
  };

  const handleFilterTodayCourses = () => {
    if (courseDayFilter === todayDayName) {
      setCourseDayFilter('all');
    } else {
      setCourseDayFilter(todayDayName);
    }
  };

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');

  // Keep selectedCourseId in sync with filteredCourses
  useEffect(() => {
    if (filteredCourses.length > 0 && !filteredCourses.some((c) => c.id === selectedCourseId)) {
      setSelectedCourseId(filteredCourses[0].id);
    }
  }, [filteredCourses, selectedCourseId]);

  const activeCourse =
    filteredCourses.find((c) => c.id === selectedCourseId) ||
    courses.find((c) => c.id === selectedCourseId) ||
    filteredCourses[0] ||
    courses[0] ||
    null;

  // Student Search Query in Roster
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Student Sort State: 'default' | 'name_asc' | 'name_desc' | 'absences_desc' | 'debt_desc'
  const [studentSortBy, setStudentSortBy] = useState<
    'default' | 'name_asc' | 'name_desc' | 'absences_desc' | 'debt_desc'
  >('default');

  // Toggle for sticky docked table height vs full page expansion
  const [isRosterDocked, setIsRosterDocked] = useState<boolean>(true);

  // Keyboard shortcut listener for Ctrl+K and /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      const isCtrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && !isInput;

      if (isCtrlK || isSlash) {
        if (searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }

      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (searchQuery) {
          setSearchQuery('');
        } else {
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Quick Filter Tabs: 'all' | 'pending_today' | 'attended_today' | 'absent_today' | 'paid' | 'debtors' | 'partial_debtors' | 'single_session'
  const [todayFilterTab, setTodayFilterTab] = useState<
    'all' | 'pending_today' | 'attended_today' | 'absent_today' | 'paid' | 'debtors' | 'partial_debtors' | 'single_session'
  >('all');

  // Toggle Switch: Auto-move students who attended today to the bottom of the list
  const [moveAttendedToBottom, setMoveAttendedToBottom] = useState<boolean>(true);

  const todayDateStr = new Date().toISOString().split('T')[0];

  const enrolledList = activeCourse?.enrolledList || [];

  // Group's current milestone: highest session progress reached in the current cycle
  const maxCourseSessions = useMemo(() => {
    if (!enrolledList || enrolledList.length === 0) return 0;
    return Math.max(
      0,
      ...enrolledList.map((s) => {
        const logs = s.attendanceLogs || [];
        const renewIdx = logs.findIndex((l) => l.status === 'renewed');
        const cycleLogs = renewIdx === -1 ? logs : logs.slice(0, renewIdx);
        const validSessionLogs = cycleLogs.filter((l) => {
          const st = l.status || l.type;
          return st === 'present' || st === 'absent_counted' || st === 'absent_uncounted' || st === 'single_session';
        });
        return Math.max(s.attendedSessions || 0, validSessionLogs.length);
      })
    );
  }, [enrolledList]);

  const isStudentAttendedToday = (std: Student) => {
    return (std.attendanceLogs || []).some(
      (l) =>
        l.date === todayDateStr &&
        (l.status === 'present' ||
          l.status === 'single_session' ||
          l.type === 'present' ||
          l.type === 'single_session')
    );
  };

  const isStudentAbsentToday = (std: Student) => {
    return (std.attendanceLogs || []).some(
      (l) =>
        l.date === todayDateStr &&
        (l.status === 'absent_counted' ||
          l.status === 'absent_uncounted' ||
          l.type === 'absent_counted' ||
          l.type === 'absent_uncounted')
    );
  };

  const isStudentPendingToday = (std: Student) => {
    return !isStudentAttendedToday(std) && !isStudentAbsentToday(std);
  };

  // Batch absence & auto-mark end-of-day absent states
  const [autoMarkAbsentsEndOfDay, setAutoMarkAbsentsEndOfDay] = useState<boolean>(() => {
    return localStorage.getItem('school_auto_mark_absent_end_of_day') === 'true';
  });

  const toggleAutoMarkAbsentsEndOfDay = () => {
    const nextVal = !autoMarkAbsentsEndOfDay;
    setAutoMarkAbsentsEndOfDay(nextVal);
    localStorage.setItem('school_auto_mark_absent_end_of_day', String(nextVal));
    if (nextVal) {
      success('تم تفعيل خاصية احتساب الغياب تلقائياً بنهاية اليوم لمن لم يأتِ.', 'الغياب التلقائي');
    } else {
      warning('تم تعطيل خاصية احتساب الغياب التلقائي.', 'الغياب التلقائي');
    }
  };

  const [isBatchAbsenceModalOpen, setIsBatchAbsenceModalOpen] = useState(false);
  const [batchAbsenceIsCounted, setBatchAbsenceIsCounted] = useState(true);
  const [batchAbsenceNote, setBatchAbsenceNote] = useState('');

  // Revert auto-absence for today states
  const [isRevertAutoAbsenceModalOpen, setIsRevertAutoAbsenceModalOpen] = useState(false);
  const [selectedRevertStudentIds, setSelectedRevertStudentIds] = useState<string[]>([]);
  const [isRevertingAutoAbsence, setIsRevertingAutoAbsence] = useState(false);

  // Single session student: registered as single session or has single session attendance logs without full course subscription
  const isStudentSingleSession = (std: Student) => {
    const singleSessionLogs = (std.attendanceLogs || []).filter(
      (l) => l.status === 'single_session' || l.type === 'single_session'
    );
    const latestRenewalLog = (std.attendanceLogs || []).find(
      (l) => l.status === 'renewed' || l.type === 'renewed'
    );
    const hasCourseSubscription = !!latestRenewalLog || ((std.totalSessions || 0) > 1 && !std.notes?.includes('حصة واحدة'));

    if (singleSessionLogs.length > 0 && !hasCourseSubscription) return true;
    if (std.notes?.includes('حصة واحدة') && !hasCourseSubscription) return true;
    if (std.totalSessions === 1 && !std.isExempt && !hasCourseSubscription) return true;
    return singleSessionLogs.length > 0 && !latestRenewalLog;
  };

  // Course subscription paid: paid full course subscription (separated from single session) and owes no debt
  const isStudentPaid = (std: Student) => !isStudentSingleSession(std) && (std.isExempt || (std.totalDebt || 0) <= 0);
  // Full debtor: did not pay anything towards subscription (totalPaid <= 0 and totalDebt > 0)
  const isStudentDebtor = (std: Student) => !std.isExempt && (std.totalDebt || 0) > 0 && (std.totalPaid || 0) <= 0;
  // Partial debtor: paid partially but still owes debt (totalPaid > 0 and totalDebt > 0)
  const isStudentPartialDebtor = (std: Student) => !std.isExempt && (std.totalDebt || 0) > 0 && (std.totalPaid || 0) > 0;

  // Helper to count student total absences (counted + uncounted)
  const getStudentAbsenceCount = (std: Student): number => {
    const logs = std.attendanceLogs || [];
    return logs.filter((l) => {
      const s = l.status || l.type;
      return s === 'absent_counted' || s === 'absent_uncounted';
    }).length;
  };

  // Helper to get active debt for sorting
  const getStudentDebt = (std: Student): number => {
    if (std.isExempt) return 0;
    return Math.max(0, std.totalDebt || 0);
  };

  // Handler for column click sorting
  const handleToggleColumnSort = (type: 'name' | 'absences' | 'debt') => {
    if (type === 'name') {
      if (studentSortBy === 'name_asc') setStudentSortBy('name_desc');
      else if (studentSortBy === 'name_desc') setStudentSortBy('default');
      else setStudentSortBy('name_asc');
    } else if (type === 'absences') {
      setStudentSortBy(studentSortBy === 'absences_desc' ? 'default' : 'absences_desc');
    } else if (type === 'debt') {
      setStudentSortBy(studentSortBy === 'debt_desc' ? 'default' : 'debt_desc');
    }
  };

  const attendedTodayCount = enrolledList.filter(isStudentAttendedToday).length;
  const absentTodayCount = enrolledList.filter(isStudentAbsentToday).length;
  const pendingTodayStudents = useMemo(() => enrolledList.filter(isStudentPendingToday), [enrolledList, todayDateStr]);
  const pendingTodayCount = pendingTodayStudents.length;
  const paidCount = enrolledList.filter(isStudentPaid).length;
  const debtorsCount = enrolledList.filter(isStudentDebtor).length;
  const partialDebtorsCount = enrolledList.filter(isStudentPartialDebtor).length;
  const singleSessionStudentsCount = enrolledList.filter(isStudentSingleSession).length;

  // Students who have an absence log recorded for today (target for auto-absent removal)
  const autoAbsentTodayStudents = useMemo(() => {
    if (!activeCourse) return [];
    return (activeCourse.enrolledList || []).filter((std) =>
      (std.attendanceLogs || []).some(
        (l) =>
          l.date === todayDateStr &&
          (l.status === 'absent_counted' ||
            l.status === 'absent_uncounted' ||
            l.type === 'absent_counted' ||
            l.type === 'absent_uncounted')
      )
    );
  }, [activeCourse, todayDateStr]);
  const autoAbsentTodayCount = autoAbsentTodayStudents.length;

  // Check if auto-absence was cancelled/reverted for today in the database or locally
  const isAutoAbsentCancelledToday = useMemo(() => {
    if (!activeCourse) return false;
    const localKey = localStorage.getItem(`auto_marked_absent_${activeCourse.id}_${todayDateStr}`);
    if (localKey === 'cancelled') return true;
    return (activeCourse.enrolledList || []).some(
      (s: any) => s.autoAbsentCancelledDate === todayDateStr
    );
  }, [activeCourse, todayDateStr]);

  const handleOpenRevertAutoAbsenceModal = () => {
    if (!activeCourse) return;
    setSelectedRevertStudentIds(autoAbsentTodayStudents.map((s) => s.id));
    setIsRevertAutoAbsenceModalOpen(true);
  };

  const handleExecuteRevertAutoAbsence = () => {
    if (!activeCourse || selectedRevertStudentIds.length === 0) return;

    setIsRevertingAutoAbsence(true);
    try {
      const res = revertTodayAutoAbsence(activeCourse.id, selectedRevertStudentIds);
      setIsRevertAutoAbsenceModalOpen(false);

      if (res.count > 0) {
        success(
          `تم التراجع عن الغياب التلقائي لـ ${res.count} تلميذ لليوم بنجاح، وحفظ التعديلات في قاعدة البيانات ومزامنتها على جميع الأجهزة!`,
          'تراجع الغياب التلقائي'
        );
      } else {
        warning('لم يتم العثور على تسجيلات غياب تلقائي لليوم للتراجع عنها.', 'تنبيه');
      }
    } finally {
      setIsRevertingAutoAbsence(false);
    }
  };

  const handleResetAutoAbsentCancellation = () => {
    if (!activeCourse) return;
    clearTodayAutoAbsentCancellation(activeCourse.id);
    success(
      `تمت إعادة تفعيل إمكانية احتساب الغياب التلقائي لفوج "${activeCourse.title}" لليوم في قاعدة البيانات.`,
      'إعادة تفعيل الغياب التلقائي'
    );
  };

  const handleExecuteBatchAbsence = () => {
    if (!activeCourse || pendingTodayStudents.length === 0) return;

    const studentIds = pendingTodayStudents.map((s) => s.id);
    const res = recordBatchAbsence(
      activeCourse.id,
      studentIds,
      batchAbsenceIsCounted,
      batchAbsenceNote.trim() || undefined
    );

    setIsBatchAbsenceModalOpen(false);
    setBatchAbsenceNote('');

    if (batchAbsenceIsCounted) {
      success(
        `تم تسجيل غياب محسوب لـ ${res.count} تلميذ لم يحضروا اليوم بنجاح واقتطاع حصة من رصيدهم!`,
        'إنهاء الحصة وتسجيل الغياب'
      );
    } else {
      success(
        `تم تسجيل غياب معفى لـ ${res.count} تلميذ لم يحضروا اليوم بنجاح دون خصم من الرصيد.`,
        'تسجيل غياب معفى'
      );
    }
  };

  // Auto-mark absent at end of day if enabled
  useEffect(() => {
    if (!autoMarkAbsentsEndOfDay || !activeCourse || pendingTodayStudents.length === 0) return;

    // If auto-absence was cancelled/reverted for today in database, DO NOT auto-mark again on ANY device!
    if (isAutoAbsentCancelledToday) return;

    const autoKey = `auto_marked_absent_${activeCourse.id}_${todayDateStr}`;
    if (localStorage.getItem(autoKey)) return;

    const isTodayScheduled = !activeCourse.scheduleDays || activeCourse.scheduleDays.length === 0 || activeCourse.scheduleDays.includes(todayDayName);
    if (!isTodayScheduled) return;

    const now = new Date();
    const currentHour = now.getHours();

    let shouldAutoMark = currentHour >= 19;

    if (!shouldAutoMark && activeCourse.scheduleTime) {
      const match = activeCourse.scheduleTime.match(/(\d{1,2}):(\d{2})\s*$/);
      if (match) {
        const endHour = parseInt(match[1], 10);
        const endMin = parseInt(match[2], 10);
        if (currentHour > endHour || (currentHour === endHour && now.getMinutes() >= endMin + 15)) {
          shouldAutoMark = true;
        }
      }
    }

    if (shouldAutoMark) {
      localStorage.setItem(autoKey, 'true');
      const studentIds = pendingTodayStudents.map((s) => s.id);
      const res = recordBatchAbsence(
        activeCourse.id,
        studentIds,
        true,
        'احتساب غياب تلقائي بنهاية اليوم (لم يحضر الحصة)'
      );
      success(
        `تم احتساب الغياب تلقائياً بنهاية اليوم لـ ${res.count} تلميذ لم يحضروا في فوج "${activeCourse.title}".`,
        'الغياب التلقائي المبرمج'
      );
    }
  }, [autoMarkAbsentsEndOfDay, activeCourse, pendingTodayStudents, todayDateStr, todayDayName, isAutoAbsentCancelledToday]);

  const filteredStudents = useMemo(() => {
    let list = enrolledList.slice();

    // 1. Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((std) => {
        const nameMatch = (std.fullName || '').toLowerCase().includes(q);
        const phoneMatch = (std.phone || '').includes(q);
        const parentPhoneMatch = (std.parentPhone || '').includes(q);
        const levelMatch = (std.academicLevel || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || parentPhoneMatch || levelMatch;
      });
    }

    // 2. Tab Filter
    if (todayFilterTab === 'pending_today') {
      list = list.filter(isStudentPendingToday);
    } else if (todayFilterTab === 'attended_today') {
      list = list.filter(isStudentAttendedToday);
    } else if (todayFilterTab === 'absent_today') {
      list = list.filter(isStudentAbsentToday);
    } else if (todayFilterTab === 'paid') {
      list = list.filter(isStudentPaid);
    } else if (todayFilterTab === 'debtors') {
      list = list.filter(isStudentDebtor);
    } else if (todayFilterTab === 'partial_debtors') {
      list = list.filter(isStudentPartialDebtor);
    } else if (todayFilterTab === 'single_session') {
      list = list.filter(isStudentSingleSession);
    }

    // 3. Sort comparator function
    const compareStudents = (a: Student, b: Student): number => {
      if (studentSortBy === 'name_asc') {
        return (a.fullName || '').localeCompare(b.fullName || '', 'ar');
      }
      if (studentSortBy === 'name_desc') {
        return (b.fullName || '').localeCompare(a.fullName || '', 'ar');
      }
      if (studentSortBy === 'absences_desc') {
        const absA = getStudentAbsenceCount(a);
        const absB = getStudentAbsenceCount(b);
        if (absB !== absA) return absB - absA; // most absences first
        return (a.fullName || '').localeCompare(b.fullName || '', 'ar');
      }
      if (studentSortBy === 'debt_desc') {
        const debtA = getStudentDebt(a);
        const debtB = getStudentDebt(b);
        if (debtB !== debtA) return debtB - debtA; // highest debt first
        return (a.fullName || '').localeCompare(b.fullName || '', 'ar');
      }
      return 0; // Default original enrollment order
    };

    // 4. Move attended today to the bottom of the list if toggle enabled
    if (moveAttendedToBottom && todayFilterTab === 'all') {
      list.sort((a, b) => {
        const aAttended = isStudentAttendedToday(a);
        const bAttended = isStudentAttendedToday(b);
        if (aAttended !== bAttended) {
          return aAttended ? 1 : -1; // un-attended first, attended goes to the bottom
        }
        return compareStudents(a, b);
      });
    } else if (studentSortBy !== 'default') {
      list.sort(compareStudents);
    }

    return list;
  }, [enrolledList, searchQuery, todayFilterTab, moveAttendedToBottom, studentSortBy, todayDateStr]);

  // Student Attendance History Log Modal
  const [studentForLogs, setStudentForLogs] = useState<Student | null>(null);

  // Active Dropdown Menu Student ID (for 3-dots menu)
  const [openDropdownStudentId, setOpenDropdownStudentId] = useState<string | null>(null);

  // Edit Student State
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [editStdFullName, setEditStdFullName] = useState('');
  const [editStdCardId, setEditStdCardId] = useState('');
  const [editStdPhone, setEditStdPhone] = useState('');
  const [editStdParentPhone, setEditStdParentPhone] = useState('');
  const [editStdPrice, setEditStdPrice] = useState('0');
  const [editStdTotalSessions, setEditStdTotalSessions] = useState('5');
  const [editStdAttendedSessions, setEditStdAttendedSessions] = useState('0');
  const [editStdIsExempt, setEditStdIsExempt] = useState(false);
  const [editHasMissedSessions, setEditHasMissedSessions] = useState(false);
  const [editStdMissedSessions, setEditStdMissedSessions] = useState('0');
  const [editStdNotes, setEditStdNotes] = useState('');

  const handleOpenEditStudentModal = (student: Student) => {
    setStudentToEdit(student);
    setEditStdFullName(student.fullName);
    setEditStdCardId(student.cardId || '');
    setEditStdPhone(student.phone || '');
    setEditStdParentPhone(student.parentPhone || '');
    const initialPrice = student.coursePrice !== undefined
      ? student.coursePrice
      : ((student.totalPaid || 0) + (student.totalDebt || 0)) || activeCourse?.monthlyPrice || 0;
    setEditStdPrice(String(initialPrice));
    setEditStdTotalSessions(String(student.totalSessions || 5));
    setEditStdAttendedSessions(String(student.attendedSessions || 0));
    setEditStdIsExempt(!!student.isExempt);
    const initialMissed = student.missedGroupSessions || 0;
    setEditHasMissedSessions(initialMissed > 0);
    setEditStdMissedSessions(String(initialMissed > 0 ? initialMissed : 1));
    setEditStdNotes(student.notes || '');
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit || !activeCourse || !editStdFullName.trim()) return;

    const newPrice = Number(editStdPrice) || 0;
    const currentPaid = studentToEdit.totalPaid || 0;
    const newDebt = editStdIsExempt ? 0 : Math.max(0, newPrice - currentPaid);
    const missedCount = editHasMissedSessions ? Math.max(0, parseInt(editStdMissedSessions, 10) || 0) : 0;

    const updated: Student = {
      ...studentToEdit,
      fullName: editStdFullName.trim(),
      cardId: editStdCardId.trim() || undefined,
      phone: editStdPhone.trim(),
      parentPhone: editStdParentPhone.trim(),
      gender: studentToEdit.gender || 'ذكر',
      academicLevel: studentToEdit.academicLevel || activeCourse?.academicLevel || '',
      coursePrice: newPrice,
      totalDebt: newDebt,
      totalSessions: Number(editStdTotalSessions) || studentToEdit.totalSessions || 5,
      attendedSessions: Number(editStdAttendedSessions) || studentToEdit.attendedSessions || 0,
      isExempt: editStdIsExempt,
      exemptionReason: editStdIsExempt ? 'معفى من تسديد مبلغ الدورة' : undefined,
      missedGroupSessions: missedCount,
      notes: editStdNotes,
    };

    updateStudent(activeCourse.id, updated);
    setStudentToEdit(null);
    success(`تم تعديل بيانات التلميذ "${updated.fullName}" بنجاح!`, 'تم الحفظ');
  };

  // Add Student to Course Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollStdFullName, setEnrollStdFullName] = useState('');
  const [enrollStdCardId, setEnrollStdCardId] = useState('');
  const [enrollStdPhone, setEnrollStdPhone] = useState('');
  const [enrollStdParentPhone, setEnrollStdParentPhone] = useState('');
  const [enrollStdGender, setEnrollStdGender] = useState<'ذكر' | 'أنثى'>('ذكر');
  const [enrollStdAcademicLevel, setEnrollStdAcademicLevel] = useState('');
  const [enrollStdTotalSessions, setEnrollStdTotalSessions] = useState('4');
  const [enrollStdPaidAmount, setEnrollStdPaidAmount] = useState('0');
  const [enrollStdIsExempt, setEnrollStdIsExempt] = useState(false);
  const [enrollHasMissedSessions, setEnrollHasMissedSessions] = useState(false);
  const [enrollStdMissedSessions, setEnrollStdMissedSessions] = useState('1');
  const [enrollMarkPresentToday, setEnrollMarkPresentToday] = useState(true);
  const [enrollStdNotes, setEnrollStdNotes] = useState('');

  // Single session state in enroll modal
  const [enrollIsSingleSession, setEnrollIsSingleSession] = useState(false);
  const [enrollSingleSessionPrice, setEnrollSingleSessionPrice] = useState('1000');
  const [enrollSingleSessionTeacherAmount, setEnrollSingleSessionTeacherAmount] = useState('600');
  const [enrollSingleSessionDate, setEnrollSingleSessionDate] = useState('');
  const [enrollSingleSessionJustification, setEnrollSingleSessionJustification] = useState('');

  // Real-time Duplicate Student Detection in Attendance
  const duplicateMatches = useMemo(() => {
    return findDuplicateStudents(
      courses,
      activeCourse?.id,
      enrollStdFullName,
      enrollStdPhone,
      enrollStdParentPhone
    );
  }, [courses, activeCourse, enrollStdFullName, enrollStdPhone, enrollStdParentPhone]);

  const handleAutoFillDuplicate = (matchedStd: Student) => {
    if (matchedStd.fullName && (!enrollStdFullName.trim() || enrollStdFullName.trim().length < 3)) {
      setEnrollStdFullName(matchedStd.fullName);
    }
    if (matchedStd.phone && matchedStd.phone !== '0550 00 00 00') {
      setEnrollStdPhone(matchedStd.phone);
    }
    if (matchedStd.parentPhone && matchedStd.parentPhone !== '0660 00 00 00') {
      setEnrollStdParentPhone(matchedStd.parentPhone);
    }
    if (matchedStd.gender) {
      setEnrollStdGender(matchedStd.gender);
    }
    if (matchedStd.academicLevel && !enrollStdAcademicLevel) {
      setEnrollStdAcademicLevel(matchedStd.academicLevel);
    }
    if (matchedStd.cardId && !enrollStdCardId) {
      setEnrollStdCardId(matchedStd.cardId);
    }
  };

  const handleOpenEnrollModal = () => {
    if (!activeCourse) return;
    setEnrollStdFullName('');
    setEnrollStdCardId('');
    setEnrollStdPhone('');
    setEnrollStdParentPhone('');
    setEnrollStdGender('ذكر');
    setEnrollStdAcademicLevel(activeCourse.academicLevel || '');
    setEnrollStdTotalSessions(String(activeCourse.totalSessionsDefault || 4));
    setEnrollStdPaidAmount('0');
    setEnrollStdIsExempt(false);

    // Auto calculate missed sessions via formula: (الحصة التي فيها الفوج الآن) - 1
    const autoMissed = calculateAutoMissedSessions(activeCourse);
    setEnrollHasMissedSessions(autoMissed > 0);
    setEnrollStdMissedSessions(String(autoMissed));
    setEnrollMarkPresentToday(true);
    setEnrollStdNotes('');

    // Pre-calculate single session rates
    const defaultTotal = activeCourse.totalSessionsDefault || 5;
    const coursePrice = activeCourse.monthlyPrice || 1500;
    const defSessionPrice = Math.round(coursePrice / (defaultTotal > 0 ? defaultTotal : 5));

    const teacher = teachers.find((t) => t.id === activeCourse.teacherId);
    let defTeacherAmt = 0;
    if (teacher) {
      if (teacher.compensationType === 'fixed_per_student' || (teacher.compensationType as string) === 'fixed_per_course') {
        const fixedRate = teacher.fixedRatePerStudent !== undefined ? teacher.fixedRatePerStudent : (teacher.fixedCourseRate || 1000);
        defTeacherAmt = Math.round(fixedRate / (defaultTotal > 0 ? defaultTotal : 5));
      } else {
        const comm = teacher.commissionPercentage !== undefined ? teacher.commissionPercentage : 60;
        defTeacherAmt = Math.round(defSessionPrice * (comm / 100));
      }
    } else {
      defTeacherAmt = Math.round(defSessionPrice * 0.6);
    }

    setEnrollIsSingleSession(false);
    setEnrollSingleSessionPrice(String(defSessionPrice || 1000));
    setEnrollSingleSessionTeacherAmount(String(defTeacherAmt || 600));
    setEnrollSingleSessionDate(new Date().toISOString().split('T')[0]);
    setEnrollSingleSessionJustification('');

    setIsEnrollModalOpen(true);
  };

  const handleSaveEnrollStudent = (e: React.FormEvent, andPrint: boolean = false) => {
    e.preventDefault();
    if (!activeCourse || !enrollStdFullName.trim()) return;

    if (enrollIsSingleSession) {
      const price = Number(enrollSingleSessionPrice) || 0;
      const teacherAmt = Number(enrollSingleSessionTeacherAmount) || 0;
      const studentId = `std-${Date.now()}`;
      const justification = enrollSingleSessionJustification.trim() || 'حصة واحدة فقط';

      const newStudent: Student = {
        id: studentId,
        fullName: enrollStdFullName.trim(),
        cardId: enrollStdCardId.trim() || undefined,
        phone: enrollStdPhone.trim() || '0550 00 00 00',
        gender: enrollStdGender,
        academicLevel: enrollStdAcademicLevel || activeCourse.academicLevel,
        parentName: 'ولي الأمر',
        parentPhone: enrollStdParentPhone.trim() || '0660 00 00 00',
        parentRelation: 'أب',
        enrolledCourseTitle: activeCourse.title,
        totalPaid: price,
        totalDebt: 0,
        totalSessions: 1,
        attendedSessions: 1,
        status: 'active',
        registrationDate: enrollSingleSessionDate || new Date().toISOString().split('T')[0],
        notes: `حصة واحدة: ${justification}`,
        attendanceLogs: [],
      };

      const result = enrollStudentToCourse(activeCourse.id, newStudent, {
        isSingleSession: true,
        sessionPrice: price,
        teacherAmount: teacherAmt,
        justification,
        date: enrollSingleSessionDate,
      });

      setIsEnrollModalOpen(false);
      success(
        `تم تسجيل التلميذ "${newStudent.fullName}" كحصة واحدة فقط بنجاح! تم استلام ${formatDZD(price)} واحتساب ${formatDZD(teacherAmt)} للأستاذ.`,
        'تسجيل تلميذ - حصة واحدة'
      );

      if (andPrint && result) {
        const receiptData: SingleSessionReceiptData = {
          receiptNumber: result.receiptNumber,
          studentName: newStudent.fullName,
          courseTitle: activeCourse.title,
          teacherName: activeCourse.teacherName,
          sessionPrice: price,
          teacherAmount: teacherAmt,
          date: enrollSingleSessionDate || new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          notes: justification,
        };
        setPrintedSingleSessionReceipt(receiptData);
        handlePrintSingleSessionReceipt(receiptData);
      }
      return;
    }

    const isExempt = enrollStdIsExempt;
    const paidVal = isExempt ? 0 : (Number(enrollStdPaidAmount) || 0);
    const sessionsTotal = Number(enrollStdTotalSessions) || (activeCourse.totalSessionsDefault || 4);
    const remainingVal = isExempt ? 0 : Math.max(0, (activeCourse.monthlyPrice || 0) - paidVal);
    const missedVal = enrollHasMissedSessions ? Math.max(0, parseInt(enrollStdMissedSessions, 10) || 0) : 0;
    const studentId = `std-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];
    const currentGroupSession = calculateCurrentGroupSession(activeCourse);

    const initialAttendanceLogs: SessionAttendanceLog[] = [];
    if (enrollMarkPresentToday) {
      initialAttendanceLogs.push({
        id: `log-${Date.now()}`,
        sessionNumber: 1,
        date: todayStr,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'present',
        type: 'present',
        method: 'manual',
        notes: 'تسجيل الحضور الأول عند الالتحاق بالفوج',
      });
    }

    const newStudent: Student = {
      id: studentId,
      fullName: enrollStdFullName.trim(),
      cardId: enrollStdCardId.trim() || undefined,
      phone: enrollStdPhone.trim() || '0550 00 00 00',
      gender: enrollStdGender,
      academicLevel: enrollStdAcademicLevel || activeCourse.academicLevel,
      parentName: 'ولي الأمر',
      parentPhone: enrollStdParentPhone.trim() || '0660 00 00 00',
      parentRelation: 'أب',
      enrolledCourseTitle: activeCourse.title,
      totalPaid: paidVal,
      totalDebt: remainingVal,
      totalSessions: sessionsTotal,
      attendedSessions: enrollMarkPresentToday ? 1 : 0,
      isExempt: isExempt,
      exemptionReason: isExempt ? 'معفى من تسديد مبلغ الدورة' : undefined,
      missedGroupSessions: missedVal,
      attendanceLogs: initialAttendanceLogs,
      status: 'active',
      registrationDate: todayStr,
      notes: enrollStdNotes.trim() || (isExempt ? 'معفى من تسديد الدورة' : undefined),
    };

    enrollStudentToCourse(activeCourse.id, newStudent);
    setIsEnrollModalOpen(false);
    success(
      isExempt
        ? `تم تسجيل التلميذ "${newStudent.fullName}" كمعفى في فوج "${activeCourse.title}" بنجاح!${enrollMarkPresentToday ? ' (وتم تسجيل حضوره لليوم ✓)' : ''}`
        : `تم تسجيل التلميذ "${newStudent.fullName}" في فوج "${activeCourse.title}" بنجاح!${enrollMarkPresentToday ? ' (وتم تسجيل حضوره لليوم ✓)' : ''}`,
      'تمت إضافة التلميذ'
    );
  };

  // Toggle Student Exemption Status (زر معفى)
  const handleToggleExemption = (student: Student) => {
    if (!activeCourse) return;

    const newExemptState = !student.isExempt;
    const regularDebt = Math.max(0, (activeCourse.monthlyPrice || 0) - (student.totalPaid || 0));

    const updated: Student = {
      ...student,
      isExempt: newExemptState,
      totalDebt: newExemptState ? 0 : regularDebt,
      exemptionReason: newExemptState ? 'معفى من تسديد مبلغ الدورة' : undefined,
      notes: student.notes
        ? student.notes
        : newExemptState
        ? 'معفى من تسديد مبلغ الدورة'
        : undefined,
    };

    updateStudent(activeCourse.id, updated);

    if (newExemptState) {
      success(
        `تم إعفاء التلميذ "${student.fullName}" من تسديد مبلغ الدورة وتصفير ديونه في الفوج بنجاح.`,
        'تم إعفاء التلميذ'
      );
    } else {
      success(
        `تم إلغاء الإعفاء عن التلميذ "${student.fullName}" وإعادة احتساب مستحقات الدورة (${formatDZD(regularDebt)}).`,
        'تم إلغاء الإعفاء'
      );
    }
  };

  // Student Absence Modal State
  const [studentForAbsence, setStudentForAbsence] = useState<Student | null>(null);
  const [absenceNote, setAbsenceNote] = useState('');

  // Renew Subscription Modal State
  const [studentToRenew, setStudentToRenew] = useState<Student | null>(null);
  const [renewSessionsCount, setRenewSessionsCount] = useState('5');
  const [renewPaidAmount, setRenewPaidAmount] = useState('6000');

  // Simple Renewal Receipt State
  interface RenewalReceiptData {
    receiptNumber: string;
    studentName: string;
    studentPhone?: string;
    courseTitle: string;
    teacherName?: string;
    sessionsCount: number;
    overageDeducted: number;
    startingAttended: number;
    paidAmount: number;
    remainingDebt: number;
    date: string;
  }
  const [printedReceipt, setPrintedReceipt] = useState<RenewalReceiptData | null>(null);

  // Delete Student from Course State
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const handleConfirmDeleteStudent = () => {
    if (!studentToDelete || !activeCourse) return;
    const name = studentToDelete.fullName;
    removeStudentFromCourse(activeCourse.id, studentToDelete.id);
    setStudentToDelete(null);
    success(
      `تم حذف التلميذ "${name}" من الفوج واستبعاده نهائياً من احتساب مستحقات وأتعاب الأستاذ بنجاح.`,
      'تم الحذف والاستبعاد'
    );
  };

  // Pay Student Debt Modal State
  const [studentToPayDebt, setStudentToPayDebt] = useState<Student | null>(null);
  const [debtPayAmount, setDebtPayAmount] = useState('');
  const [debtPayDate, setDebtPayDate] = useState('');
  const [debtPayNotes, setDebtPayNotes] = useState('');
  const [autoDeleteFromDebts, setAutoDeleteFromDebts] = useState(true);

  interface DebtReceiptData {
    receiptNumber: string;
    studentName: string;
    studentPhone?: string;
    courseTitle: string;
    teacherName?: string;
    paidAmount: number;
    remainingDebt: number;
    date: string;
    time: string;
    notes?: string;
  }

  const openPayDebtModal = (student: Student) => {
    setStudentToPayDebt(student);
    setDebtPayAmount(String(student.totalDebt || 0));
    setDebtPayDate(new Date().toISOString().split('T')[0]);
    setDebtPayNotes(`تسديد دين مستحقات الدورة نقداً - ${activeCourse?.title || ''}`);
    setAutoDeleteFromDebts(true);
  };

  const handlePrintDebtPaymentReceipt = (receipt: DebtReceiptData) => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const dateFormatted = formatDateArabic(receipt.date);

    const printWindow = window.open('', '_blank', 'width=380,height=550');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) للتمكن من طباعة الوصل.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>وصل تسديد دين - ${receipt.receiptNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            color: #000000 !important;
            border-color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            direction: rtl;
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
            margin: 0 auto !important;
            padding: 2mm 3mm 1mm 3mm !important;
            width: 100%;
            max-width: 72mm;
            font-size: 12px;
            line-height: 1.35;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
          }
          .center { text-align: center; }
          .bold { font-weight: 800; }
          .divider { border-top: 1.5px dashed #000000; margin: 4px 0; width: 100%; }
          .double-divider { border-top: 2.5px solid #000000; margin: 5px 0; width: 100%; }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 6px;
            margin: 3px 0;
            font-size: 12px;
            width: 100%;
            box-sizing: border-box;
          }
          .row > span:first-child {
            flex-shrink: 0;
            color: #000000 !important;
            font-weight: 700;
            white-space: nowrap;
          }
          .row > span:last-child {
            flex: 1;
            min-width: 0;
            max-width: 72%;
            text-align: left;
            font-weight: 800;
            color: #000000 !important;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .total-box {
            font-size: 14px;
            font-weight: 900;
            color: #000000 !important;
            text-align: center;
            padding: 5px 0;
            margin: 5px 0;
            border-top: 1.5px dashed #000000;
            border-bottom: 1.5px dashed #000000;
          }
          .success-badge {
            display: inline-block;
            padding: 1px 5px;
            border: 1px solid #000000;
            color: #000000 !important;
            font-weight: 800;
            border-radius: 3px;
            font-size: 11px;
          }
          @media print {
            @page {
              size: 80mm auto;
              margin: 0 !important;
            }
            html, body {
              width: 100% !important;
              max-width: 72mm !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              margin: 0 auto !important;
              padding: 2mm 3mm 0mm 3mm !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .sig-row {
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="center" style="font-size: 15px; font-weight: 900; color: #000000;">${schoolName}</div>
        <div class="center" style="font-size: 12px; font-weight: 800; margin-top: 2px; color: #000000;">وصل قبض وتسديد دين الدورة</div>
        <div class="double-divider"></div>

        <div class="row">
          <span>رقم السند:</span>
          <span>${receipt.receiptNumber}</span>
        </div>
        <div class="row">
          <span>التاريخ والوقت:</span>
          <span>${dateFormatted} | ${receipt.time}</span>
        </div>
        <div class="row">
          <span>التلميذ:</span>
          <span>${receipt.studentName}</span>
        </div>
        ${receipt.studentPhone ? `
        <div class="row">
          <span>الهاتف:</span>
          <span>${receipt.studentPhone}</span>
        </div>` : ''}
        <div class="row">
          <span>الفوج / الدورة:</span>
          <span>${receipt.courseTitle}</span>
        </div>
        ${receipt.teacherName ? `
        <div class="row">
          <span>الأستاذ:</span>
          <span>${receipt.teacherName}</span>
        </div>` : ''}
        <div class="row">
          <span>نوع العملية:</span>
          <span>تسديد متأخرات / دين نقداً</span>
        </div>
        <div class="row">
          <span>حالة الحساب:</span>
          <span>${receipt.remainingDebt <= 0 ? '<span class="success-badge">مسدد بالكامل (خالص)</span>' : `<span style="color: #b91c1c; font-weight: bold;">متبقي في الذمة: ${receipt.remainingDebt.toLocaleString('fr-DZ')} دج</span>`}</span>
        </div>

        <div class="total-box">
          <div style="font-size: 11px; font-weight: 700; margin-bottom: 2px;">المبلغ المقبوض نقداً:</div>
          <div>${receipt.paidAmount.toLocaleString('fr-DZ')} دج</div>
        </div>

        ${receipt.notes ? `
        <div class="row" style="margin-top: 4px;">
          <span>البيان / التبرير:</span>
          <span>${receipt.notes}</span>
        </div>` : ''}

        <div class="divider"></div>
        <div class="center" style="font-size: 10.5px; font-weight: 700; margin-top: 4px; color: #000000;">
          شكراً لثقتكم بمؤسستنا التعليمية • وصل رسمي مسجل بالخزينة
        </div>

        <div class="sig-row" style="margin-top: 8px; margin-bottom: 0; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700;">
          <span>ختم واستلام الإدارة</span>
          <span>....................</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleConfirmPayDebt = (e?: React.FormEvent, andPrint = false) => {
    if (e) e.preventDefault();
    if (!studentToPayDebt || !activeCourse) return;

    const amt = Number(debtPayAmount) || 0;
    if (amt <= 0) {
      warning('يرجى إدخال مبلغ صحيح لتسديد الدين.', 'المبلغ غير صحيح');
      return;
    }

    const currentDebt = studentToPayDebt.totalDebt || 0;
    const coursePrice = activeCourse.monthlyPrice || 0;
    const maxAllowed = Math.min(currentDebt, coursePrice > 0 ? coursePrice : currentDebt);

    // Prevent paying more than the debt or course price to prevent mistakes
    if (amt > maxAllowed) {
      warning(
        `المبلغ المدخل (${formatDZD(amt)}) يتجاوز الحد الأقصى المسموح (${formatDZD(maxAllowed)}) لتجنب الأخطاء.`,
        'تجاوز الحد الأقصى'
      );
      return;
    }

    const isFullyPaid = amt >= currentDebt;
    // Crucial: Only delete the debt record if it was fully paid off!
    const shouldDeleteDebt = isFullyPaid;

    const receiptNo = `REC-DEBT-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dateStr = debtPayDate || now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // 1. تسجيل المعاملة وتحديث حساب الطالب والدين ذرياً دون أي تعارض في التزامن
    const newTx = {
      id: `tx-debt-${Date.now()}`,
      receiptNumber: receiptNo,
      studentId: studentToPayDebt.id,
      studentName: studentToPayDebt.fullName,
      courseTitle: activeCourse.title,
      amount: amt,
      paymentMethod: 'cash' as const,
      date: dateStr,
      status: 'completed' as const,
      recordedBy: 'إدارة المؤسسة',
      notes: debtPayNotes.trim() || 'تسديد دين مستحقات الدورة نقداً',
    };

    recordPayment(newTx, studentToPayDebt.id, undefined, { autoDeleteDebt: shouldDeleteDebt });

    const prevStudent = studentToPayDebt;
    setStudentToPayDebt(null);

    if (isFullyPaid) {
      success(
        `تم تسديد الدين بالكامل للتلميذ "${prevStudent.fullName}" بقيمة ${formatDZD(amt)} وتحديث حسابه إلى خالص!`,
        'تم تسديد الدين'
      );
    } else {
      const remainingDebt = Math.max(0, currentDebt - amt);
      success(
        `تم تسديد دفعة بقيمة ${formatDZD(amt)} للتلميذ "${prevStudent.fullName}". متبقي في الذمة ${formatDZD(remainingDebt)}.`,
        'تسديد دفعة من الدين'
      );
    }

    if (andPrint) {
      handlePrintDebtPaymentReceipt({
        receiptNumber: receiptNo,
        studentName: prevStudent.fullName,
        studentPhone: prevStudent.phone,
        courseTitle: activeCourse.title,
        teacherName: activeCourse.teacherName,
        paidAmount: amt,
        remainingDebt: Math.max(0, currentDebt - amt),
        date: dateStr,
        time: timeStr,
        notes: debtPayNotes.trim(),
      });
    }
  };

  // Quick Click to Record 1 Attended Session (e.g. 1/5 -> 2/5 -> 6/5 with warning)
  const handleIncrement = (studentId: string) => {
    if (!activeCourse) return;

    const targetStudent = activeCourse.enrolledList?.find((s) => s.id === studentId);
    if (!targetStudent) return;

    // Validate 2-hour cooldown & Debt rule (max 1 session while in debt)
    const validation = validateStudentAttendanceRegistration(targetStudent);
    if (!validation.allowed) {
      warning(validation.errorMessage || 'التسجيل غير متاح حالياً.', validation.errorTitle || 'تنبيه التسجيل');
      return;
    }

    const hasUnpaidDebt = !targetStudent.isExempt && (targetStudent.totalDebt || 0) > 0;
    const isFirstSessionWithDebt = hasUnpaidDebt && (targetStudent.attendedSessions || 0) === 0;

    const res = incrementStudentSession(activeCourse.id, studentId);

    if (res.blocked) {
      warning(res.errorMessage || 'التسجيل غير متاح حالياً.', res.errorTitle || 'تنبيه التسجيل');
      return;
    }

    // Warning alert for user if the student attended their single allowed session with debt
    if (isFirstSessionWithDebt) {
      warning(
        `تنبيه مالي: التلميذ "${res.studentName}" عليه دين غير مسدد (متبقي بذمته: ${formatDZD(targetStudent.totalDebt)})! هذه هي الحصة الأولى والوحيدة المسموحة بالدين، ولن يسمح له النظام بتسجيل الحصة الثانية إلا بعد تسديد دينه.`,
        'حصة أولى مسموحة بالدين'
      );
    } else if (res.isExceeded) {
      const overCount = res.attended - res.total;
      warning(
        `تنبيه: التلميذ "${res.studentName}" تجاوز عدد الحصص بحصة إضافية (${res.attended}/${res.total})! يرجى إعادة الاشتراك.`,
        `تجاوز بـ ${overCount} حصص`
      );
    } else {
      success(`تم تسجيل حضور الحصة (${res.attended}/${res.total}) للتلميذ "${res.studentName}" بنجاح!`, 'تسجيل حضور');
    }
  };

  // Open Absence Modal
  const openAbsenceModal = (student: Student) => {
    setStudentForAbsence(student);
    setAbsenceNote('');
  };

  // Confirm Absence (Counted or Uncounted)
  const handleConfirmAbsence = (isCounted: boolean) => {
    if (!studentForAbsence || !activeCourse) return;

    const res = recordStudentAbsence(
      activeCourse.id,
      studentForAbsence.id,
      isCounted,
      absenceNote
    );

    setStudentForAbsence(null);
    setAbsenceNote('');

    if (isCounted) {
      if (res.isExceeded) {
        warning(
          `تم تسجيل غياب محسوب للتلميذ "${res.studentName}" وتجاوز عدد الحصص (${res.attended}/${res.total})! يرجى إعادة الاشتراك.`,
          'غياب محسوب - تجاوز الحصص'
        );
      } else {
        success(
          `تم تسجيل غياب محسوب للتلميذ "${res.studentName}" بنجاح! تم اقتطاع حصة من رصيده (${res.attended}/${res.total}).`,
          'تسجيل غياب محسوب'
        );
      }
    } else {
      success(
        `تم تسجيل غياب معفى (تجاوز يوم) للتلميذ "${res.studentName}". رصيد الحصص لم يُقتطع (${res.attended}/${res.total}) وسيُحسب في الحصة القادمة عند حضوره.`,
        'غياب معفى - تجاوز يوم'
      );
    }
  };

  // Undo Last Attendance or Absence Record (in case of mistake or forgetfulness)
  const handleUndoAttendance = (student: Student) => {
    if (!activeCourse) return;

    const res = undoStudentAttendance(activeCourse.id, student.id);
    if (!res) {
      warning(`لا يوجد تسجيل حضور أو غياب سابق للتراجع عنه للتلميذ "${student.fullName}".`, 'لا يمكن التراجع');
      return;
    }

    success(
      `تم التراجع عن ${res.actionDescription} للتلميذ "${res.studentName}" بنجاح! الرصيد الحالي للحصص: (${res.attended}/${res.total}).`,
      'تم التراجع عن التسجيل'
    );
  };

  // Open Renew Modal
  const openRenewModal = (student: Student) => {
    setStudentToRenew(student);
    const defaultSessions =
      student.totalSessions && student.totalSessions > 0
        ? student.totalSessions
        : activeCourse?.totalSessionsDefault && activeCourse.totalSessionsDefault > 0
        ? activeCourse.totalSessionsDefault
        : 4;

    setRenewSessionsCount(String(defaultSessions));
    setRenewPaidAmount(String(activeCourse?.monthlyPrice || 6000));
  };

  // Single Session Attendance Modal State
  const [studentForSingleSession, setStudentForSingleSession] = useState<Student | null>(null);
  const [singleSessionPrice, setSingleSessionPrice] = useState('1000');
  const [singleSessionTeacherAmount, setSingleSessionTeacherAmount] = useState('600');
  const [singleSessionDate, setSingleSessionDate] = useState('');
  const [singleSessionNotes, setSingleSessionNotes] = useState('');

  // Single Session Receipt Print State
  interface SingleSessionReceiptData {
    receiptNumber: string;
    studentName: string;
    courseTitle: string;
    teacherName?: string;
    sessionPrice: number;
    teacherAmount: number;
    date: string;
    time: string;
    notes?: string;
  }
  const [printedSingleSessionReceipt, setPrintedSingleSessionReceipt] = useState<SingleSessionReceiptData | null>(null);

  const openSingleSessionModal = (student: Student) => {
    setStudentForSingleSession(student);
    const defaultTotal = student.totalSessions || activeCourse?.totalSessionsDefault || 5;
    const coursePrice = activeCourse?.monthlyPrice || 1500;
    const defSessionPrice = Math.round(coursePrice / (defaultTotal > 0 ? defaultTotal : 5));

    const teacher = teachers.find((t) => t.id === activeCourse?.teacherId);
    let defTeacherAmt = 0;
    if (teacher) {
      if (teacher.compensationType === 'fixed_per_student' || (teacher.compensationType as string) === 'fixed_per_course') {
        const fixedRate = teacher.fixedRatePerStudent !== undefined ? teacher.fixedRatePerStudent : (teacher.fixedCourseRate || 1000);
        defTeacherAmt = Math.round(fixedRate / (defaultTotal > 0 ? defaultTotal : 5));
      } else {
        const comm = teacher.commissionPercentage !== undefined ? teacher.commissionPercentage : 60;
        defTeacherAmt = Math.round(defSessionPrice * (comm / 100));
      }
    } else {
      defTeacherAmt = Math.round(defSessionPrice * 0.6);
    }

    setSingleSessionPrice(String(defSessionPrice || 1000));
    setSingleSessionTeacherAmount(String(defTeacherAmt || 600));
    setSingleSessionDate(new Date().toISOString().split('T')[0]);
    setSingleSessionNotes('');
  };

  // Convert Single Session to Course Modal State & Handlers
  const [studentToConvertToCourse, setStudentToConvertToCourse] = useState<Student | null>(null);
  const [courseSubscriptionSessionsCount, setCourseSubscriptionSessionsCount] = useState('4');
  const [courseSubscriptionPaidAmount, setCourseSubscriptionPaidAmount] = useState('6000');
  const [courseSubscriptionDate, setCourseSubscriptionDate] = useState('');
  const [courseSubscriptionNotes, setCourseSubscriptionNotes] = useState('');

  interface CourseSubscriptionReceiptData {
    receiptNumber: string;
    studentName: string;
    studentPhone?: string;
    courseTitle: string;
    teacherName?: string;
    sessionsCount: number;
    paidAmount: number;
    addedDebt: number;
    coursePrice: number;
    previousSingleSessionsCount: number;
    teacherEarnedFromSingles: number;
    date: string;
    time: string;
    notes?: string;
  }
  const [printedCourseSubscriptionReceipt, setPrintedCourseSubscriptionReceipt] = useState<CourseSubscriptionReceiptData | null>(null);

  const openConvertToCourseModal = (student: Student) => {
    setStudentToConvertToCourse(student);
    const defaultTotal =
      activeCourse?.totalSessionsDefault && activeCourse.totalSessionsDefault > 0
        ? activeCourse.totalSessionsDefault
        : 4;
    setCourseSubscriptionSessionsCount(String(defaultTotal));
    setCourseSubscriptionPaidAmount(String(activeCourse?.monthlyPrice || 6000));
    setCourseSubscriptionDate(new Date().toISOString().split('T')[0]);
    setCourseSubscriptionNotes('');
  };

  const handleConfirmConvertToCourse = (e: React.FormEvent, andPrint = false) => {
    e.preventDefault();
    if (!studentToConvertToCourse || !activeCourse) return;

    const newSessions = Number(courseSubscriptionSessionsCount) || 4;
    const paidAmt = Number(courseSubscriptionPaidAmount) || 0;

    const res = convertSingleSessionToCourse(
      activeCourse.id,
      studentToConvertToCourse.id,
      newSessions,
      paidAmt,
      courseSubscriptionDate,
      courseSubscriptionNotes.trim()
    );

    setStudentToConvertToCourse(null);
    success(
      `تم تسجيل اشتراك التلميذ "${res.studentName}" في الدورة بنجاح (${newSessions} حصص)! بمبلغ مسدد ${formatDZD(res.paidAmount)}${res.addedDebt > 0 ? ` ودين متبقي ${formatDZD(res.addedDebt)}` : ''}. وحصص الأستاذ السابقة (${formatDZD(res.teacherEarnedFromSingles)}) محفوظة بالكامل في حسابه.`,
      'تم الاشتراك في الدورة'
    );

    if (andPrint) {
      const receiptData: CourseSubscriptionReceiptData = {
        receiptNumber: res.receiptNumber,
        studentName: res.studentName,
        studentPhone: studentToConvertToCourse.phone,
        courseTitle: res.courseTitle,
        teacherName: activeCourse.teacherName,
        sessionsCount: res.newTotalSessions,
        paidAmount: res.paidAmount,
        addedDebt: res.addedDebt,
        coursePrice: activeCourse.monthlyPrice || 0,
        previousSingleSessionsCount: res.previousSingleSessionsCount,
        teacherEarnedFromSingles: res.teacherEarnedFromSingles,
        date: res.date,
        time: res.time,
        notes: courseSubscriptionNotes.trim(),
      };
      setPrintedCourseSubscriptionReceipt(receiptData);
      handlePrintCourseSubscriptionReceipt(receiptData);
    }
  };

  const handlePrintCourseSubscriptionReceipt = (receipt: CourseSubscriptionReceiptData) => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const timeStr = receipt.time || now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = formatDateArabic(receipt.date || now.toISOString().split('T')[0]);

    const printWindow = window.open('', '_blank', 'width=380,height=580');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) للتمكن من طباعة الوصل.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>وصل اشتراك في دورة - ${receipt.receiptNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            color: #000000 !important;
            border-color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            direction: rtl;
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
            margin: 0 auto !important;
            padding: 2mm 3mm 1mm 3mm !important;
            width: 100%;
            max-width: 72mm;
            font-size: 12px;
            line-height: 1.35;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
          }
          .center { text-align: center; }
          .bold { font-weight: 800; }
          .divider { border-top: 1.5px dashed #000000; margin: 4px 0; width: 100%; }
          .double-divider { border-top: 2.5px solid #000000; margin: 5px 0; width: 100%; }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 6px;
            margin: 3px 0;
            font-size: 12px;
            width: 100%;
            box-sizing: border-box;
          }
          .row > span:first-child {
            flex-shrink: 0;
            color: #000000 !important;
            font-weight: 700;
            white-space: nowrap;
          }
          .row > span:last-child {
            flex: 1;
            min-width: 0;
            max-width: 72%;
            text-align: left;
            font-weight: 800;
            color: #000000 !important;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .total-box {
            font-size: 14px;
            font-weight: 900;
            color: #000000 !important;
            text-align: center;
            padding: 5px 0;
            margin: 5px 0;
            border-top: 1.5px dashed #000000;
            border-bottom: 1.5px dashed #000000;
          }
          .badge-box {
            border: 1px solid #000000;
            border-radius: 4px;
            padding: 4px 6px;
            font-size: 11px;
            font-weight: 700;
            line-height: 1.35;
            margin: 4px 0;
            text-align: center;
            color: #000000 !important;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .footer-text {
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            color: #000000 !important;
            margin-top: 6px;
            margin-bottom: 0 !important;
            border-top: 1.5px dashed #000000;
            padding-top: 4px;
            padding-bottom: 0 !important;
          }
          @media print {
            @page {
              size: 80mm auto;
              margin: 0 !important;
            }
            html, body {
              width: 100% !important;
              max-width: 72mm !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              margin: 0 auto !important;
              padding: 2mm 3mm 0mm 3mm !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .footer-text {
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="center" style="font-size: 15px; font-weight: 900; color: #000000;">${schoolName}</div>
        <div class="center" style="font-size: 12px; font-weight: 800; margin-top: 2px; color: #000000;">وصل اشتراك جديد في دورة تعليمية</div>
        <div class="double-divider"></div>

        <div class="row">
          <span>رقم السند:</span>
          <span>${receipt.receiptNumber}</span>
        </div>
        <div class="row">
          <span>التاريخ والوقت:</span>
          <span>${dateFormatted} | ${timeStr}</span>
        </div>
        <div class="row">
          <span>التلميذ:</span>
          <span>${receipt.studentName}</span>
        </div>
        ${receipt.studentPhone ? `
        <div class="row">
          <span>الهاتف:</span>
          <span>${formatAlgerianPhone(receipt.studentPhone)}</span>
        </div>` : ''}
        <div class="row">
          <span>الفوج / الدورة:</span>
          <span>${receipt.courseTitle}</span>
        </div>
        ${receipt.teacherName ? `
        <div class="row">
          <span>الأستاذ:</span>
          <span>${receipt.teacherName}</span>
        </div>` : ''}
        <div class="divider"></div>
        <div class="row">
          <span>باقة الدورة الجديدة:</span>
          <span>${receipt.sessionsCount} حصص (تبدأ من 0)</span>
        </div>
        ${receipt.previousSingleSessionsCount > 0 ? `
        <div class="badge-box">
          تمت دراسة ${receipt.previousSingleSessionsCount} حصص فردية سابقة مسددة (مستحقات الأستاذ منها: ${formatDZD(receipt.teacherEarnedFromSingles)} محفوظة)
        </div>` : ''}
        <div class="row">
          <span>سعر الدورة:</span>
          <span>${formatDZD(receipt.coursePrice)}</span>
        </div>
        <div class="total-box">
          المبلغ المسدد: ${formatDZD(receipt.paidAmount)}
        </div>
        ${receipt.addedDebt > 0 ? `
        <div class="row">
          <span>المتبقي كدين:</span>
          <span style="font-weight: 900;">${formatDZD(receipt.addedDebt)}</span>
        </div>` : `
        <div class="center" style="font-size: 11px; font-weight: 800; color: #000000; margin: 4px 0;">
          ✓ تم سداد رسوم الدورة كاملة
        </div>`}
        ${receipt.notes ? `
        <div class="row" style="margin-top: 4px;">
          <span>ملاحظات:</span>
          <span>${receipt.notes}</span>
        </div>` : ''}
        <div class="footer-text">
          شكراً لاشتراككم معنا نتمنى لكم التوفيق والنجاح
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintSingleSessionReceipt = (receipt: SingleSessionReceiptData) => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const timeStr = receipt.time || now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = formatDateArabic(receipt.date || now.toISOString().split('T')[0]);

    const printWindow = window.open('', '_blank', 'width=380,height=540');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) للتمكن من طباعة الوصل.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>وصل تسديد حصة واحدة - ${receipt.receiptNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            color: #000000 !important;
            border-color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            direction: rtl;
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
            margin: 0 auto !important;
            padding: 2mm 3mm 1mm 3mm !important;
            width: 100%;
            max-width: 72mm;
            font-size: 12px;
            line-height: 1.35;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
          }
          .center { text-align: center; }
          .bold { font-weight: 800; }
          .divider { border-top: 1.5px dashed #000000; margin: 4px 0; width: 100%; }
          .double-divider { border-top: 2.5px solid #000000; margin: 5px 0; width: 100%; }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 6px;
            margin: 3px 0;
            font-size: 12px;
            width: 100%;
            box-sizing: border-box;
          }
          .row > span:first-child {
            flex-shrink: 0;
            color: #000000 !important;
            font-weight: 700;
            white-space: nowrap;
          }
          .row > span:last-child {
            flex: 1;
            min-width: 0;
            max-width: 72%;
            text-align: left;
            font-weight: 800;
            color: #000000 !important;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .total-box {
            font-size: 14px;
            font-weight: 900;
            color: #000000 !important;
            text-align: center;
            padding: 5px 0;
            margin: 5px 0;
            border-top: 1.5px dashed #000000;
            border-bottom: 1.5px dashed #000000;
          }
          @media print {
            @page {
              size: 80mm auto;
              margin: 0 !important;
            }
            html, body {
              width: 100% !important;
              max-width: 72mm !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              margin: 0 auto !important;
              padding: 2mm 3mm 0mm 3mm !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .sig-row {
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="center" style="font-size: 15px; font-weight: 900; color: #000000;">${schoolName}</div>
        <div class="center" style="font-size: 12px; font-weight: 800; margin-top: 2px; color: #000000;">وصل تسديد واستحقاق حصة واحدة</div>
        <div class="double-divider"></div>

        <div class="row">
          <span>رقم السند:</span>
          <span>${receipt.receiptNumber}</span>
        </div>
        <div class="row">
          <span>التاريخ والوقت:</span>
          <span>${dateFormatted} | ${timeStr}</span>
        </div>
        <div class="row">
          <span>التلميذ:</span>
          <span>${receipt.studentName}</span>
        </div>
        <div class="row">
          <span>الفوج / الدورة:</span>
          <span>${receipt.courseTitle}</span>
        </div>
        ${receipt.teacherName ? `
        <div class="row">
          <span>الأستاذ:</span>
          <span>${receipt.teacherName}</span>
        </div>` : ''}
        <div class="row">
          <span>نوع العملية:</span>
          <span>حضور حصة واحدة (مسددة)</span>
        </div>

        <div class="total-box">
          <div style="font-size: 11px; font-weight: 700; margin-bottom: 2px;">المبلغ المسدد من التلميذ:</div>
          <div>${receipt.sessionPrice.toLocaleString('fr-DZ')} دج</div>
          <div style="font-size: 11px; font-weight: 700; margin-top: 2px; color: #000000;">(مستحق الأستاذ: ${receipt.teacherAmount.toLocaleString('fr-DZ')} دج)</div>
        </div>

        ${receipt.notes ? `
        <div class="row" style="margin-top: 4px;">
          <span>البيان / التبرير:</span>
          <span>${receipt.notes}</span>
        </div>` : ''}

        <div class="divider"></div>
        <div class="center" style="font-size: 10.5px; font-weight: 700; margin-top: 4px; color: #000000;">
          شكراً لثقتكم بمؤسستنا التعليمية • مصلحة الاستقبال والخزينة
        </div>

        <div class="sig-row" style="margin-top: 8px; margin-bottom: 0; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700;">
          <span>ختم واستلام الإدارة</span>
          <span>....................</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleConfirmSingleSession = (e: React.FormEvent, andPrint = false) => {
    e.preventDefault();
    if (!studentForSingleSession || !activeCourse) return;

    const price = Number(singleSessionPrice) || 0;
    const teacherAmt = Number(singleSessionTeacherAmount) || 0;

    const res = recordSingleSessionAttendance(
      activeCourse.id,
      studentForSingleSession.id,
      price,
      teacherAmt,
      singleSessionNotes.trim(),
      singleSessionDate
    );

    setStudentForSingleSession(null);
    success(
      `تم تسجيل حضور حصة واحدة للتلميذ "${res.studentName}" بنجاح! تم استلام ${formatDZD(res.sessionPrice)}، واحتساب ${formatDZD(res.teacherAmount)} لمستحقات الأستاذ.`,
      'تسجيل حصة واحدة'
    );

    if (andPrint) {
      const receiptData: SingleSessionReceiptData = {
        receiptNumber: res.receiptNumber,
        studentName: res.studentName,
        courseTitle: activeCourse.title,
        teacherName: activeCourse.teacherName,
        sessionPrice: res.sessionPrice,
        teacherAmount: res.teacherAmount,
        date: res.date,
        time: res.time,
        notes: singleSessionNotes.trim(),
      };
      setPrintedSingleSessionReceipt(receiptData);
      handlePrintSingleSessionReceipt(receiptData);
    }
  };

  // Print Ultra-Simple Renewal Receipt (80mm POS Thermal & Standard)
  const handlePrintSimpleRenewalReceipt = (receipt: RenewalReceiptData) => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = formatDateArabic(receipt.date || now.toISOString().split('T')[0]);

    const printWindow = window.open('', '_blank', 'width=380,height=540');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) للتمكن من طباعة الوصل.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>وصل تجديد اشتراك - ${receipt.receiptNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            color: #000000 !important;
            border-color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            direction: rtl;
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
            margin: 0 auto !important;
            padding: 2mm 3mm 1mm 3mm !important;
            width: 100%;
            max-width: 72mm;
            font-size: 12px;
            line-height: 1.35;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
          }
          .center { text-align: center; }
          .bold { font-weight: 800; }
          .divider { border-top: 1.5px dashed #000000; margin: 4px 0; width: 100%; }
          .double-divider { border-top: 2.5px solid #000000; margin: 5px 0; width: 100%; }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 6px;
            margin: 3px 0;
            font-size: 12px;
            width: 100%;
            box-sizing: border-box;
          }
          .row > span:first-child {
            flex-shrink: 0;
            color: #000000 !important;
            font-weight: 700;
            white-space: nowrap;
          }
          .row > span:last-child {
            flex: 1;
            min-width: 0;
            max-width: 72%;
            text-align: left;
            font-weight: 800;
            color: #000000 !important;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .total-box {
            font-size: 14px;
            font-weight: 900;
            color: #000000 !important;
            text-align: center;
            padding: 5px 0;
            margin: 5px 0;
            border-top: 1.5px dashed #000000;
            border-bottom: 1.5px dashed #000000;
          }
          @media print {
            @page {
              size: 80mm auto;
              margin: 0 !important;
            }
            html, body {
              width: 100% !important;
              max-width: 72mm !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              margin: 0 auto !important;
              padding: 2mm 3mm 0mm 3mm !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .sig-row {
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="center" style="font-size: 15px; font-weight: 900; color: #000000;">${schoolName}</div>
        <div class="center" style="font-size: 12px; font-weight: 800; margin-top: 2px; color: #000000;">وصل تجديد اشتراك باقة حصص</div>
        <div class="double-divider"></div>

        <div class="row">
          <span>رقم السند:</span>
          <span>${receipt.receiptNumber}</span>
        </div>
        <div class="row">
          <span>التاريخ والوقت:</span>
          <span>${dateFormatted} | ${timeStr}</span>
        </div>
        <div class="row">
          <span>التلميذ:</span>
          <span>${receipt.studentName}</span>
        </div>
        ${receipt.studentPhone ? `
        <div class="row">
          <span>الهاتف:</span>
          <span>${formatAlgerianPhone(receipt.studentPhone)}</span>
        </div>` : ''}
        <div class="row">
          <span>الفوج / الدورة:</span>
          <span>${receipt.courseTitle}</span>
        </div>
        ${receipt.teacherName ? `
        <div class="row">
          <span>الأستاذ:</span>
          <span>${receipt.teacherName}</span>
        </div>` : ''}
        <div class="row">
          <span>باقة الحصص:</span>
          <span>${receipt.sessionsCount} حصص</span>
        </div>
        ${receipt.overageDeducted > 0 ? `
        <div class="row">
          <span>حصص مقتطعة من التجاوز:</span>
          <span>${receipt.overageDeducted} حصص</span>
        </div>
        <div class="row">
          <span>رصيد الحصص الفعلي:</span>
          <span>${receipt.sessionsCount - receipt.overageDeducted} حصص</span>
        </div>` : ''}

        <div class="divider"></div>

        <div class="row">
          <span>طريقة الدفع:</span>
          <span>نقداً (Cash)</span>
        </div>

        <div class="total-box">
          المبلغ المسدد: ${receipt.paidAmount.toLocaleString('fr-DZ')} دج
        </div>

        ${receipt.remainingDebt > 0 ? `
        <div class="row">
          <span>المتبقي في الذمة:</span>
          <span style="font-weight: 900;">${receipt.remainingDebt.toLocaleString('fr-DZ')} دج</span>
        </div>` : ''}

        <div class="divider"></div>

        <div class="center" style="font-size: 10.5px; font-weight: 700; margin-top: 4px; color: #000000;">
          شكراً لثقتكم بمؤسستنا التعليمية • وصل رسمي مسجل
        </div>

        <div class="sig-row" style="margin-top: 8px; margin-bottom: 0; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700;">
          <span>ختم واستلام الإدارة</span>
          <span>....................</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Execute Subscription Renewal & Automatically Deduct Overages
  const handleRenew = (e: React.FormEvent, shouldPrint: boolean = false) => {
    e.preventDefault();
    if (!studentToRenew || !activeCourse) return;

    const defaultSessions =
      studentToRenew.totalSessions && studentToRenew.totalSessions > 0
        ? studentToRenew.totalSessions
        : activeCourse.totalSessionsDefault && activeCourse.totalSessionsDefault > 0
        ? activeCourse.totalSessionsDefault
        : 4;

    const newPackageSessions = Number(renewSessionsCount) || defaultSessions;
    const paidVal = Number(renewPaidAmount) || 0;

    const coursePrice =
      studentToRenew.coursePrice !== undefined && studentToRenew.coursePrice > 0
        ? studentToRenew.coursePrice
        : activeCourse.monthlyPrice || 6000;

    if (coursePrice > 0 && paidVal > coursePrice) {
      warning(
        `المبلغ المسدد (${formatDZD(paidVal)}) لا يمكن أن يتجاوز مبلغ الدورة (${formatDZD(coursePrice)}) كحد أقصى لتجنب الأخطاء.`,
        'تجاوز مبلغ الدورة'
      );
      return;
    }

    const res = renewStudentSubscription(
      activeCourse.id,
      studentToRenew.id,
      newPackageSessions,
      paidVal
    );

    const receiptData: RenewalReceiptData = {
      receiptNumber: res.receiptNumber,
      studentName: studentToRenew.fullName,
      studentPhone: studentToRenew.phone,
      courseTitle: activeCourse.title,
      teacherName: activeCourse.teacherName,
      sessionsCount: newPackageSessions,
      overageDeducted: res.overageDeducted,
      startingAttended: res.startingAttended,
      paidAmount: paidVal,
      remainingDebt: res.addedDebt,
      date: new Date().toISOString().split('T')[0],
    };

    setStudentToRenew(null);

    if (shouldPrint) {
      handlePrintSimpleRenewalReceipt(receiptData);
    } else {
      setPrintedReceipt(receiptData);
    }

    if (res.overageDeducted > 0) {
      success(
        `تم تجديد اشتراك التلميذ "${studentToRenew.fullName}" بنجاح! تم اقتطاع ${res.overageDeducted} حصص متجاوزة (رصيد الحصص الحالي: ${res.startingAttended}/${newPackageSessions}). رقم الوصل: ${res.receiptNumber}`,
        'تم التجديد واقتطاع التجاوز'
      );
    } else {
      success(
        `تم تجديد اشتراك التلميذ "${studentToRenew.fullName}" بـ ${newPackageSessions} حصص جديدة بنجاح! رقم الوصل: ${res.receiptNumber}`,
        'تم التجديد'
      );
    }
  };

  const totalEnrolled = activeCourse?.enrolledList?.length || 0;
  const totalSessionsConsumed = activeCourse?.enrolledList?.reduce((acc, s) => acc + (s.attendedSessions || 0), 0) || 0;
  const totalSessionsCapacity = activeCourse?.enrolledList?.reduce((acc, s) => acc + (s.totalSessions && s.totalSessions > 0 ? s.totalSessions : (activeCourse.totalSessionsDefault || 4)), 0) || 0;
  const totalOverdueStudents = activeCourse?.enrolledList?.filter((s) => (s.attendedSessions || 0) > (s.totalSessions && s.totalSessions > 0 ? s.totalSessions : (activeCourse.totalSessionsDefault || 4))).length || 0;

  return (
    <div>
      <PageHeader
        title="الحضور والغياب واستهلاك الحصص"
        description="تسجيل الحضور بنقرة زر، تنبيهات تجاوز الحصص، وإعادة تجديد الاشتراكات مع اقتطاع التجاوزات تلقائياً"
        actions={
          activeCourse ? (
            <Button
              variant="primary"
              size="sm"
              rightIcon={<UserPlus size={15} />}
              onClick={handleOpenEnrollModal}
            >
              + إضافة تلميذ
            </Button>
          ) : undefined
        }
      />

      {/* Top Attendance View Mode Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: 'var(--space-6)',
          borderBottom: '2px solid var(--color-border, #e2e8f0)',
          paddingBottom: '0px',
        }}
      >
        <button
          type="button"
          onClick={() => setAttendanceViewMode('roster')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            borderBottom: attendanceViewMode === 'roster' ? '3px solid var(--color-primary, #2563eb)' : '3px solid transparent',
            backgroundColor: attendanceViewMode === 'roster' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
            color: attendanceViewMode === 'roster' ? 'var(--color-primary, #2563eb)' : 'var(--color-text-secondary, #64748b)',
            fontWeight: 800,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={18} />
          <span>جدول الحضور وتفاصيل الفوج</span>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceViewMode('smart_card')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            borderBottom: attendanceViewMode === 'smart_card' ? '3px solid #0284c7' : '3px solid transparent',
            backgroundColor: attendanceViewMode === 'smart_card' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
            color: attendanceViewMode === 'smart_card' ? '#0284c7' : 'var(--color-text-secondary, #64748b)',
            fontWeight: 800,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <CreditCard size={18} />
          <span>ماسح البطاقات الذكي السريع (RFID / Barcode)</span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
            }}
          >
            مسح سريع
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceViewMode('cards_directory')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            borderBottom: attendanceViewMode === 'cards_directory' ? '3px solid #9333ea' : '3px solid transparent',
            backgroundColor: attendanceViewMode === 'cards_directory' ? 'rgba(147, 51, 234, 0.1)' : 'transparent',
            color: attendanceViewMode === 'cards_directory' ? '#9333ea' : 'var(--color-text-secondary, #64748b)',
            fontWeight: 800,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={18} />
          <span>دليل بطاقات التلاميذ والمواد (المركزي)</span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: '#f3e8ff',
              color: '#9333ea',
              border: '1px solid #d8b4fe',
            }}
          >
            بطاقة موحدة
          </span>
        </button>
      </div>

      {attendanceViewMode === 'roster' ? (
        <>
          {/* Enhanced Course Selector & Advanced Filter Bar */}
          <Card style={{ marginBottom: 'var(--space-6)', overflow: 'visible' }}>
        {courses.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            لا توجد دورات مسجلة بعد. يرجى إنشاء دورة أو فوج أولاً من تبويب &quot;الدورات والأفواج الجماعية&quot;.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Top Row: Course Select Dropdown + Quick Action Tools */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: '1 1 340px', minWidth: '260px' }}>
                <CourseSelect
                  label="اختر الدورة أو الفوج الدراسي"
                  courses={filteredCourses}
                  selectedCourseId={activeCourse?.id || ''}
                  onSelectCourse={(courseId) => setSelectedCourseId(courseId)}
                  totalCoursesCount={courses.length}
                />
              </div>

              {/* Quick Filter Control Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* 1-Click Filter for Today's Courses */}
                <button
                  type="button"
                  onClick={handleFilterTodayCourses}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: courseDayFilter === todayDayName ? '1px solid var(--color-primary, #2563eb)' : '1px solid var(--color-border, #e2e8f0)',
                    backgroundColor: courseDayFilter === todayDayName ? 'var(--color-primary, #2563eb)' : '#ffffff',
                    color: courseDayFilter === todayDayName ? '#ffffff' : 'var(--color-text-primary, #1e293b)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: courseDayFilter === todayDayName ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                  }}
                  title={`عرض فقط الأفواج التي لديها حصة مقررة اليوم (${todayDayName})`}
                >
                  <Calendar size={14} />
                  <span>حصص اليوم ({todayDayName})</span>
                  {courseDayFilter === todayDayName && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        color: '#ffffff',
                        fontWeight: 700,
                      }}
                    >
                      مفعّل
                    </span>
                  )}
                </button>

                {/* Advanced Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsAdvancedCourseFilterOpen(!isAdvancedCourseFilterOpen)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: isAdvancedCourseFilterOpen || activeCourseFiltersCount > 0 ? '1px solid var(--color-primary, #2563eb)' : '1px solid var(--color-border, #e2e8f0)',
                    backgroundColor: isAdvancedCourseFilterOpen ? 'rgba(37, 99, 235, 0.08)' : '#ffffff',
                    color: isAdvancedCourseFilterOpen || activeCourseFiltersCount > 0 ? 'var(--color-primary, #2563eb)' : 'var(--color-text-secondary, #475569)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  title="فتح لوحة التحكم والفلاتر المتقدمة لاختيار الفوج"
                >
                  <SlidersHorizontal size={14} />
                  <span>فلترة متقدمة</span>
                  {activeCourseFiltersCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--color-primary, #2563eb)',
                        color: '#ffffff',
                        fontWeight: 700,
                      }}
                    >
                      {activeCourseFiltersCount}
                    </span>
                  )}
                </button>

                {/* Reset Filters Button */}
                {activeCourseFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetCourseFilters}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px dashed #ef4444',
                      backgroundColor: '#fef2f2',
                      color: '#b91c1c',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="مسح كافة معايير الفلترة وإظهار جميع الأفواج"
                  >
                    <X size={13} />
                    <span>مسح الفلاتر</span>
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Advanced Course Filter Panel */}
            {isAdvancedCourseFilterOpen && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--color-bg-surface-secondary, #f8fafc)',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    <Filter size={15} color="var(--color-primary, #2563eb)" />
                    <span>أدوات التحكم وتصفية الأفواج الدراسية</span>
                  </div>
                  {activeCourseFiltersCount > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-primary, #2563eb)', fontWeight: 600 }}>
                      تم تطبيق {activeCourseFiltersCount} فلاتر نشطة
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-3 items-end">
                  {/* Search Query */}
                  <div>
                    <Input
                      label="بحث سريع عن فوج أو مادة"
                      placeholder="اسم الفوج، المادة، القاعة..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      prefixIcon={<Search size={14} color="var(--color-text-muted)" />}
                      suffixIcon={
                        courseSearch ? (
                          <button
                            type="button"
                            onClick={() => setCourseSearch('')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-muted)' }}
                          >
                            <X size={13} />
                          </button>
                        ) : undefined
                      }
                    />
                  </div>

                  {/* Teacher Filter */}
                  <div>
                    <Select
                      label="تصفية حسب الأستاذ"
                      value={courseTeacherFilter}
                      onChange={(e) => setCourseTeacherFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'كل الأساتذة والمؤطرين' },
                        ...teachers.map((t) => {
                          const count = courses.filter((c) => c.teacherId === t.id || c.teacherName === t.fullName).length;
                          return {
                            value: t.id,
                            label: `${t.fullName} (${count} أفواج)`,
                          };
                        }),
                      ]}
                    />
                  </div>

                  {/* Academic Level Filter */}
                  <div>
                    <Select
                      label="تصفية حسب المستوى الدراسي"
                      value={courseLevelFilter}
                      onChange={(e) => setCourseLevelFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'كل المستويات والأطوار' },
                        ...availableCourseLevels.map((lvl) => ({
                          value: lvl,
                          label: lvl,
                        })),
                      ]}
                    />
                  </div>

                  {/* Day Filter */}
                  <div>
                    <Select
                      label="تصفية حسب يوم الحصة"
                      value={courseDayFilter}
                      onChange={(e) => setCourseDayFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'كل أيام الأسبوع' },
                        { value: 'السبت', label: 'السبت' },
                        { value: 'الأحد', label: 'الأحد' },
                        { value: 'الإثنين', label: 'الإثنين' },
                        { value: 'الثلاثاء', label: 'الثلاثاء' },
                        { value: 'الأربعاء', label: 'الأربعاء' },
                        { value: 'الخميس', label: 'الخميس' },
                        { value: 'الجمعة', label: 'الجمعة' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Active Course Details Banner */}
            {activeCourse ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-bg-app, #f8fafc)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.8125rem',
                }}
              >
                {/* Left/Middle Pill stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', color: 'var(--color-text-secondary, #475569)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Users size={14} color="var(--color-primary, #2563eb)" />
                    <span>
                      الأستاذ: <strong style={{ color: 'var(--color-text-primary, #1e293b)' }}>{activeCourse.teacherName}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <DoorOpen size={14} color="#059669" />
                    <span>
                      القاعة: <strong style={{ color: 'var(--color-text-primary, #1e293b)' }}>{activeCourse.roomName}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={14} color="#d97706" />
                    <span>
                      التوقيت: <strong style={{ color: 'var(--color-text-primary, #1e293b)' }}>{activeCourse.scheduleTime}</strong>
                    </span>
                  </div>

                  {activeCourse.scheduleDays && activeCourse.scheduleDays.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={14} color="#7c3aed" />
                      <span>
                        الأيام: <strong style={{ color: 'var(--color-text-primary, #1e293b)' }}>{activeCourse.scheduleDays.join(' • ')}</strong>
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Coins size={14} color="#0891b2" />
                    <span>
                      الاشتراك: <strong style={{ color: 'var(--color-text-primary, #1e293b)' }}>{formatDZD(activeCourse.monthlyPrice)}</strong> / {activeCourse.totalSessionsDefault || 4} حصص
                    </span>
                  </div>
                </div>

                {/* Right Badge summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #86efac',
                    }}
                  >
                    خالص: {paidCount}
                  </span>
                  {partialDebtorsCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#ffedd5',
                        color: '#c2410c',
                        border: '1px solid #fdba74',
                      }}
                    >
                      متبقي في الذمة: {partialDebtorsCount}
                    </span>
                  )}
                  {singleSessionStudentsCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      الحصة الواحدة: {singleSessionStudentsCount}
                    </span>
                  )}
                  {debtorsCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #f87171',
                      }}
                    >
                      غير مسدد: {debtorsCount}
                    </span>
                  )}
                </div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  backgroundColor: '#fffbeb',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid #fcd34d',
                  color: '#92400e',
                  fontSize: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>لا توجد أفواج تطابق معايير الفلترة المحددة.</span>
                <Button variant="outline" size="sm" onClick={handleResetCourseFilters}>
                  إعادة تعيين الفلاتر وعرض كافة الأفواج
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* KPI Stats */}
      {activeCourse && (
        <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4" style={{ marginBottom: 'var(--space-6)' }}>
          <StatCard
            title="التلاميذ المسجلون في الفوج"
            value={`${totalEnrolled} تلاميذ`}
            subtitle={`سعة القاعة: ${activeCourse.maxStudents} مقعد`}
            icon={<Users size={20} color="var(--color-primary)" />}
          />
          <StatCard
            title="إجمالي الحصص المستهلكة"
            value={`${totalSessionsConsumed} حصة`}
            subtitle={`من إجمالي ${totalSessionsCapacity} حصة مسجلة`}
            icon={<CheckCircle2 size={20} color="var(--color-success)" />}
          />
          <StatCard
            title="نسبة استهلاك الحصص للفوج"
            value={`${Math.round((totalSessionsConsumed / (totalSessionsCapacity || 1)) * 100)}%`}
            subtitle="تقدم دراسة البرنامج"
            icon={<FileCheck size={20} color="var(--color-info)" />}
          />
          <StatCard
            title="تنبيهات تجاوز الحصص"
            value={`${totalOverdueStudents} تلاميذ`}
            subtitle={totalOverdueStudents > 0 ? 'بحاجة لإعادة تجديد الاشتراك' : 'كل الحصص ضمن النطاق'}
            icon={<AlertTriangle size={20} color={totalOverdueStudents > 0 ? 'var(--color-danger)' : 'var(--color-success)'} />}
          />
        </div>
      )}

      {/* Attendance & Session Consumption Table */}
      {activeCourse && (
        <div className="table-container attendance-table-container has-sticky-header">
          <div
            className="table-toolbar table-toolbar-sticky"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              position: 'sticky',
              top: 'var(--height-topbar, 68px)',
              zIndex: 25,
              backgroundColor: 'var(--color-bg-surface, #ffffff)',
              borderBottom: '1px solid var(--color-border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    قائمة تلاميذ الفوج واستهلاك الحصص ({searchQuery.trim() || todayFilterTab !== 'all' || studentSortBy !== 'default' ? `${filteredStudents.length} من ${totalEnrolled}` : totalEnrolled} تلميذ)
                  </span>
                  {studentSortBy !== 'default' && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        fontWeight: 700,
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      {studentSortBy === 'name_asc' && 'مفرز: أبجدياً (أ - ي)'}
                      {studentSortBy === 'name_desc' && 'مفرز: أبجدياً (ي - أ)'}
                      {studentSortBy === 'absences_desc' && 'مفرز: الأكثر غياباً'}
                      {studentSortBy === 'debt_desc' && 'مفرز: الأعلى ديناً 💰'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  اضغط على زر &quot;+ حضور&quot; أو &quot;غياب&quot; لتسجيل الحصة، أو زر &quot;إعادة الاشتراك&quot; للتجديد واقتطاع التجاوزات
                </div>
              </div>

              {/* Student Search, View Mode Toggle, and Add Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Roster Docked / Expanded Height Toggle */}
                <button
                  type="button"
                  onClick={() => setIsRosterDocked(!isRosterDocked)}
                  className="btn btn-outline btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isRosterDocked ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    borderColor: isRosterDocked ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: isRosterDocked ? 'var(--color-primary-bg, #eff6ff)' : '#ffffff',
                  }}
                  title={isRosterDocked ? 'الجدول مثبت في الشاشة مع شريط تمرير داخلي. انقر للتمديد الكامل لأسفل الصفحة' : 'انقر لتثبيت ترويسة الجدول داخل الشاشة'}
                >
                  {isRosterDocked ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  <span className="hidden sm:inline">{isRosterDocked ? 'تثبيت الترويسة' : 'تمرير حر'}</span>
                </button>

                {/* Search Bar with Ctrl+K and / Shortcuts */}
                <div style={{ minWidth: '220px', maxWidth: '300px' }}>
                  <Input
                    ref={searchInputRef}
                    placeholder="ابحث عن اسم التلميذ أو هاتفه..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    prefixIcon={<Search size={16} color="var(--color-text-muted)" />}
                    suffixIcon={
                      searchQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            searchInputRef.current?.focus();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--color-text-muted)',
                          }}
                          title="مسح البحث (Esc)"
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            userSelect: 'none',
                            pointerEvents: 'none',
                          }}
                          title="اضغط Ctrl+K أو / للبحث السريع"
                        >
                          <kbd
                            style={{
                              fontSize: '0.625rem',
                              padding: '1px 5px',
                              backgroundColor: 'var(--color-bg-surface-secondary, #f1f5f9)',
                              border: '1px solid var(--color-border, #cbd5e1)',
                              borderRadius: '4px',
                              color: 'var(--color-text-muted)',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                            }}
                          >
                            Ctrl K
                          </kbd>
                          <kbd
                            style={{
                              fontSize: '0.625rem',
                              padding: '1px 5px',
                              backgroundColor: 'var(--color-bg-surface-secondary, #f1f5f9)',
                              border: '1px solid var(--color-border, #cbd5e1)',
                              borderRadius: '4px',
                              color: 'var(--color-text-muted)',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                            }}
                          >
                            /
                          </kbd>
                        </div>
                      )
                    }
                  />
                </div>

                {activeCourse && pendingTodayCount > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    rightIcon={<UserX size={14} />}
                    onClick={() => setIsBatchAbsenceModalOpen(true)}
                    style={{
                      whiteSpace: 'nowrap',
                      backgroundColor: '#dc2626',
                      borderColor: '#dc2626',
                    }}
                    title={`تسجيل غياب لمن لم يحضر اليوم (${pendingTodayCount} تلاميذ)`}
                  >
                    🛑 إنهاء الحصة وتسجيل غياب ({pendingTodayCount})
                  </Button>
                )}

                <button
                  type="button"
                  onClick={toggleAutoMarkAbsentsEndOfDay}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: autoMarkAbsentsEndOfDay ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                    backgroundColor: autoMarkAbsentsEndOfDay ? '#f0fdf4' : '#ffffff',
                    color: autoMarkAbsentsEndOfDay ? '#15803d' : '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  title="إذا انتهى اليوم ولم يسجل التلميذ حضوراً، يُحتسب له غياب محسوب تلقائياً"
                >
                  <Clock size={13} color={autoMarkAbsentsEndOfDay ? '#16a34a' : '#64748b'} />
                  <span>احتساب الغياب التلقائي:</span>
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: autoMarkAbsentsEndOfDay ? '#16a34a' : '#94a3b8',
                      color: '#ffffff',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                    }}
                  >
                    {autoMarkAbsentsEndOfDay ? 'مفعّل ⚡' : 'معطّل'}
                  </span>
                </button>

                {/* Button: Revert / Remove Auto-Absence for today */}
                {activeCourse && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    rightIcon={<RotateCcw size={14} />}
                    onClick={handleOpenRevertAutoAbsenceModal}
                    disabled={autoAbsentTodayCount === 0 && !isAutoAbsentCancelledToday}
                    style={{
                      whiteSpace: 'nowrap',
                      backgroundColor: autoAbsentTodayCount > 0 ? '#fff7ed' : isAutoAbsentCancelledToday ? '#f0fdf4' : '#f8fafc',
                      borderColor: autoAbsentTodayCount > 0 ? '#ea580c' : isAutoAbsentCancelledToday ? '#16a34a' : '#cbd5e1',
                      color: autoAbsentTodayCount > 0 ? '#c2410c' : isAutoAbsentCancelledToday ? '#15803d' : '#94a3b8',
                      fontWeight: 700,
                      boxShadow: autoAbsentTodayCount > 0 ? '0 1px 3px rgba(234, 88, 12, 0.25)' : 'none',
                    }}
                    title={
                      autoAbsentTodayCount > 0
                        ? `إزالة الغائب التلقائي / تراجع غياب التلقائي لليوم (${autoAbsentTodayCount} تلاميذ)`
                        : isAutoAbsentCancelledToday
                        ? 'تم التراجع عن الغياب التلقائي لليوم (مسجل في قاعدة البيانات ومزامن)'
                        : 'لا يوجد تلاميذ مسجلين كغياب تلقائي لليوم'
                    }
                  >
                    <span>تراجع الغياب التلقائي (اليوم)</span>
                    {autoAbsentTodayCount > 0 && (
                      <span
                        style={{
                          marginRight: '4px',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          backgroundColor: '#ea580c',
                          color: '#ffffff',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                        }}
                      >
                        {autoAbsentTodayCount}
                      </span>
                    )}
                    {isAutoAbsentCancelledToday && autoAbsentTodayCount === 0 && (
                      <span
                        style={{
                          marginRight: '4px',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                        }}
                      >
                        تم الإلغاء ✓
                      </span>
                    )}
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<UserPlus size={14} />}
                  onClick={handleOpenEnrollModal}
                  style={{ whiteSpace: 'nowrap' }}
                  title={`إضافة تلميذ جديد لفوج ${activeCourse.title}`}
                >
                  + إضافة تلميذ
                </Button>
              </div>
            </div>

            {/* Quick Filter Tabs & Sort Controls & Auto-move to Bottom Toggle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '8px 12px',
                backgroundColor: 'var(--color-bg-surface-secondary, #f8fafc)',
                border: '1px solid var(--color-border, #e2e8f0)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {/* Filter Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setTodayFilterTab('all')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: todayFilterTab === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    backgroundColor: todayFilterTab === 'all' ? 'var(--color-primary)' : '#ffffff',
                    color: todayFilterTab === 'all' ? '#ffffff' : 'var(--color-text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: todayFilterTab === 'all' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>الكل</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: todayFilterTab === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-surface-secondary, #f1f5f9)',
                      color: todayFilterTab === 'all' ? '#ffffff' : 'var(--color-text-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {totalEnrolled}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTodayFilterTab('pending_today')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: todayFilterTab === 'pending_today' ? '1px solid #f59e0b' : '1px solid var(--color-border)',
                    backgroundColor: todayFilterTab === 'pending_today' ? '#f59e0b' : '#ffffff',
                    color: todayFilterTab === 'pending_today' ? '#ffffff' : 'var(--color-text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: todayFilterTab === 'pending_today' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>لم يحضروا بعد اليوم</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: todayFilterTab === 'pending_today' ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                      color: todayFilterTab === 'pending_today' ? '#ffffff' : '#92400e',
                      fontWeight: 700,
                    }}
                  >
                    {pendingTodayCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTodayFilterTab('attended_today')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: todayFilterTab === 'attended_today' ? '1px solid #10b981' : '1px solid var(--color-border)',
                    backgroundColor: todayFilterTab === 'attended_today' ? '#10b981' : '#ffffff',
                    color: todayFilterTab === 'attended_today' ? '#ffffff' : 'var(--color-text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: todayFilterTab === 'attended_today' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>حاضرون اليوم</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: todayFilterTab === 'attended_today' ? 'rgba(255,255,255,0.25)' : '#dcfce7',
                      color: todayFilterTab === 'attended_today' ? '#ffffff' : '#15803d',
                      fontWeight: 700,
                    }}
                  >
                    {attendedTodayCount}
                  </span>
                </button>

                {absentTodayCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setTodayFilterTab('absent_today')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: todayFilterTab === 'absent_today' ? '1px solid #ef4444' : '1px solid var(--color-border)',
                      backgroundColor: todayFilterTab === 'absent_today' ? '#ef4444' : '#ffffff',
                      color: todayFilterTab === 'absent_today' ? '#ffffff' : 'var(--color-text-primary)',
                      fontSize: '0.8125rem',
                      fontWeight: todayFilterTab === 'absent_today' ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>غائبون اليوم</span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: todayFilterTab === 'absent_today' ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                        color: todayFilterTab === 'absent_today' ? '#ffffff' : '#b91c1c',
                        fontWeight: 700,
                      }}
                    >
                      {absentTodayCount}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTodayFilterTab('paid')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: todayFilterTab === 'paid' ? '1px solid #059669' : '1px solid var(--color-border)',
                    backgroundColor: todayFilterTab === 'paid' ? '#059669' : '#ffffff',
                    color: todayFilterTab === 'paid' ? '#ffffff' : 'var(--color-text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: todayFilterTab === 'paid' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>مسددين الاشتراك</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: todayFilterTab === 'paid' ? 'rgba(255,255,255,0.25)' : '#d1fae5',
                      color: todayFilterTab === 'paid' ? '#ffffff' : '#047857',
                      fontWeight: 700,
                    }}
                  >
                    {paidCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTodayFilterTab('debtors')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: todayFilterTab === 'debtors' ? '1px solid #dc2626' : '1px solid var(--color-border)',
                    backgroundColor: todayFilterTab === 'debtors' ? '#dc2626' : '#ffffff',
                    color: todayFilterTab === 'debtors' ? '#ffffff' : 'var(--color-text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: todayFilterTab === 'debtors' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="تلاميذ لم يسددوا الاشتراك إطلاقاً"
                >
                  <span>مدينين لم يسلكوا الاشتراك</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: todayFilterTab === 'debtors' ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                      color: todayFilterTab === 'debtors' ? '#ffffff' : '#b91c1c',
                      fontWeight: 700,
                    }}
                  >
                    {debtorsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTodayFilterTab('partial_debtors')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: todayFilterTab === 'partial_debtors' ? '1px solid #ea580c' : '1px solid var(--color-border)',
                    backgroundColor: todayFilterTab === 'partial_debtors' ? '#ea580c' : '#ffffff',
                    color: todayFilterTab === 'partial_debtors' ? '#ffffff' : 'var(--color-text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: todayFilterTab === 'partial_debtors' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="تلاميذ سددوا جزءاً من الاشتراك وما زال في ذمتهم دين متبقي"
                >
                  <span>المدينين الجزئيين</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: todayFilterTab === 'partial_debtors' ? 'rgba(255,255,255,0.25)' : '#ffedd5',
                      color: todayFilterTab === 'partial_debtors' ? '#ffffff' : '#c2410c',
                      fontWeight: 700,
                    }}
                  >
                    {partialDebtorsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTodayFilterTab('single_session')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: todayFilterTab === 'single_session' ? '1px solid #2563eb' : '1px solid var(--color-border)',
                    backgroundColor: todayFilterTab === 'single_session' ? '#2563eb' : '#ffffff',
                    color: todayFilterTab === 'single_session' ? '#ffffff' : 'var(--color-text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: todayFilterTab === 'single_session' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="عرض أصحاب الحصة الواحدة فقط"
                >
                  <span>الحصة الواحدة</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: todayFilterTab === 'single_session' ? 'rgba(255,255,255,0.25)' : '#eff6ff',
                      color: todayFilterTab === 'single_session' ? '#ffffff' : '#1d4ed8',
                      fontWeight: 700,
                    }}
                  >
                    {singleSessionStudentsCount}
                  </span>
                </button>
              </div>

              {/* 1-Click Sort Buttons & Auto-move to Bottom Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* 1-Click Sort Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowUpDown size={13} />
                    <span>فرز:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setStudentSortBy(studentSortBy === 'name_asc' ? 'default' : 'name_asc')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: studentSortBy === 'name_asc' ? 700 : 500,
                      border: studentSortBy === 'name_asc' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: studentSortBy === 'name_asc' ? 'var(--color-primary)' : '#ffffff',
                      color: studentSortBy === 'name_asc' ? '#ffffff' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="فرز أبجدي من أ إلى ي"
                  >
                    <span>أبجدياً (أ - ي)</span>
                    {studentSortBy === 'name_asc' && <span>✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentSortBy(studentSortBy === 'absences_desc' ? 'default' : 'absences_desc')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: studentSortBy === 'absences_desc' ? 700 : 500,
                      border: studentSortBy === 'absences_desc' ? '1px solid #ef4444' : '1px solid var(--color-border)',
                      backgroundColor: studentSortBy === 'absences_desc' ? '#ef4444' : '#ffffff',
                      color: studentSortBy === 'absences_desc' ? '#ffffff' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="فرز حسب الأكثر غياباً"
                  >
                    <span>الأكثر غياباً</span>
                    {studentSortBy === 'absences_desc' && <span>✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentSortBy(studentSortBy === 'debt_desc' ? 'default' : 'debt_desc')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: studentSortBy === 'debt_desc' ? 700 : 500,
                      border: studentSortBy === 'debt_desc' ? '1px solid #dc2626' : '1px solid var(--color-border)',
                      backgroundColor: studentSortBy === 'debt_desc' ? '#dc2626' : '#ffffff',
                      color: studentSortBy === 'debt_desc' ? '#ffffff' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="فرز حسب الأعلى ديناً للتركيز على تحصيل المبالغ أولاً"
                  >
                    <span>الأعلى ديناً 💰</span>
                    {studentSortBy === 'debt_desc' && <span>✓</span>}
                  </button>

                  {studentSortBy !== 'default' && (
                    <button
                      type="button"
                      onClick={() => setStudentSortBy('default')}
                      style={{
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        border: 'none',
                        backgroundColor: 'var(--color-bg-surface-secondary, #f1f5f9)',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                      }}
                      title="استعادة الترتيب الافتراضي"
                    >
                      إلغاء الفرز ✕
                    </button>
                  )}
                </div>

                {/* Toggle Switch: Auto-move attended to bottom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      userSelect: 'none',
                    }}
                    title="عند التفعيل: الطالب الذي يسجل حضوره اليوم ينزل تلقائياً إلى أسفل القائمة لإبقاء من لم يحضر في الأعلى"
                  >
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        setMoveAttendedToBottom(!moveAttendedToBottom);
                      }}
                      style={{
                        position: 'relative',
                        width: '38px',
                        height: '22px',
                        backgroundColor: moveAttendedToBottom ? 'var(--color-primary, #2563eb)' : '#cbd5e1',
                        borderRadius: '20px',
                        transition: 'background-color 0.2s ease',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: moveAttendedToBottom ? '18px' : '2px',
                          width: '18px',
                          height: '18px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                          transition: 'left 0.2s ease',
                        }}
                      />
                    </div>
                    <span>نقل الحاضرين لأسفل</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Visual Color Legend for Session Circles */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                padding: '8px 14px',
                backgroundColor: 'var(--color-bg-app)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>دليل ألوان الحصص:</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                <span>حضور (أخضر)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'inline-block' }} />
                <span>حضور حصة واحدة (أزرق)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                <span>غياب محسوب (أحمر)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f97316', display: 'inline-block' }} />
                <span>غياب غير محسوب / مبرر (برتقالي)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px dashed #94a3b8', display: 'inline-block' }} />
                <span>حصة متبقية (رمادي)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px dashed #f59e0b', backgroundColor: '#fffbeb', display: 'inline-block' }} />
                <span>حصة فائتة قبل الالتحاق (أصفر/برتقالي)</span>
              </span>
            </div>
          </div>

          {/* Desktop Table View (> 768px) with Sticky Header */}
          <div
            className="table-responsive attendance-desktop-view"
            style={{
              maxHeight: isRosterDocked ? 'calc(100vh - 240px)' : 'none',
              minHeight: isRosterDocked ? '420px' : 'none',
              overflowY: isRosterDocked ? 'auto' : 'visible',
              overflowX: 'auto',
              position: 'relative',
              transition: 'max-height 0.2s ease',
            }}
          >
            <table className="saas-table attendance-sticky-table">
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 15,
                  backgroundColor: 'var(--color-bg-surface-secondary, #f8fafc)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                }}
              >
                <tr>
                  <th
                    onClick={() => handleToggleColumnSort('name')}
                    style={{ cursor: 'pointer', userSelect: 'none', backgroundColor: 'inherit' }}
                    title="انقر لفرز التلاميذ أبجدياً"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>اسم التلميذ</span>
                      {studentSortBy === 'name_asc' ? (
                        <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>▲</span>
                      ) : studentSortBy === 'name_desc' ? (
                        <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>▼</span>
                      ) : (
                        <ArrowUpDown size={12} color="var(--color-text-muted)" style={{ opacity: 0.6 }} />
                      )}
                    </div>
                  </th>
                  <th style={{ backgroundColor: 'inherit' }}>رقم الهاتف</th>
                  <th
                    onClick={() => handleToggleColumnSort('debt')}
                    style={{ cursor: 'pointer', userSelect: 'none', backgroundColor: 'inherit' }}
                    title="انقر لفرز التلاميذ حسب الأعلى ديناً"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>حالة الدفع</span>
                      {studentSortBy === 'debt_desc' ? (
                        <span style={{ color: '#dc2626', fontWeight: 800 }}>💰 ▼</span>
                      ) : (
                        <ArrowUpDown size={12} color="var(--color-text-muted)" style={{ opacity: 0.6 }} />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleColumnSort('absences')}
                    style={{ minWidth: '180px', cursor: 'pointer', userSelect: 'none', backgroundColor: 'inherit' }}
                    title="انقر لفرز التلاميذ حسب الأكثر غياباً"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>استهلاك الحصص</span>
                      {studentSortBy === 'absences_desc' ? (
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>✕ ▼</span>
                      ) : (
                        <ArrowUpDown size={12} color="var(--color-text-muted)" style={{ opacity: 0.6 }} />
                      )}
                    </div>
                  </th>
                  <th style={{ minWidth: '240px', backgroundColor: 'inherit' }}>تسجيل الحضور والغياب والإجراءات</th>
                  <th style={{ backgroundColor: 'inherit' }}>الاشتراك / التجديد</th>
                  <th style={{ backgroundColor: 'inherit' }}>سجل الحصص</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                      {enrolledList.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <Users size={32} color="var(--color-text-muted)" />
                          <span style={{ fontWeight: 600 }}>لا يوجد تلاميذ مسجلين في هذا الفوج حتى الآن.</span>
                          <Button variant="primary" size="sm" rightIcon={<UserPlus size={14} />} onClick={handleOpenEnrollModal}>
                            + إضافة تلميذ للفوج
                          </Button>
                        </div>
                      ) : searchQuery ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <Search size={28} color="var(--color-text-muted)" />
                          <span style={{ fontWeight: 600 }}>لا توجد نتائج مطابقة لبحثك عن &quot;{searchQuery}&quot;</span>
                          <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                            مسح البحث وعرض كل التلاميذ
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <Users size={28} color="var(--color-text-muted)" />
                          <span style={{ fontWeight: 600 }}>لا يوجد تلاميذ ينطبق عليهم هذا الفلتر.</span>
                          <Button variant="outline" size="sm" onClick={() => setTodayFilterTab('all')}>
                            عرض جميع التلاميذ
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((std) => {
                    const attended = std.attendedSessions || 0;
                    const total = std.totalSessions && std.totalSessions > 0 ? std.totalSessions : 4;
                    const isExceeded = attended > total;
                    const isExempt = !!std.isExempt;
                    const isLastSession = !isExempt && attended === total && total > 1;
                    const isFullDebtor = isStudentDebtor(std);
                    const isPartialDebtor = isStudentPartialDebtor(std);
                    const hasUnpaidDebt = isFullDebtor || isPartialDebtor;
                    const hasAttendanceHistory =
                      (std.attendedSessions || 0) > 0 ||
                      (std.attendanceLogs &&
                        std.attendanceLogs.some((l) => {
                          const s = l.status || l.type;
                          return s === 'present' || s === 'absent_counted' || s === 'absent_uncounted' || s === 'single_session';
                        }));

                    const singleSessionLogs = (std.attendanceLogs || []).filter(
                      (l) => l.status === 'single_session' || l.type === 'single_session'
                    );
                    const singleSessionCount = singleSessionLogs.length;
                    const latestRenewalLog = (std.attendanceLogs || []).find(
                      (l) => l.status === 'renewed' || l.type === 'renewed'
                    );
                    const hasCourseSubscription = !!latestRenewalLog || ((std.totalSessions || 0) > 1 && !std.notes?.includes('حصة واحدة'));
                    const isSingleSession = isStudentSingleSession(std);
                    const studentCycleProgress = Math.max(
                      attended,
                      (std.attendanceLogs || []).filter((l) => {
                        const s = l.status || l.type;
                        return s === 'present' || s === 'absent_counted' || s === 'absent_uncounted' || s === 'single_session';
                      }).length
                    );
                    const missedGroupSessions = std.missedGroupSessions || 0;

                    const isAttendedToday = isStudentAttendedToday(std);
                    const todayLog = (std.attendanceLogs || []).find(
                      (l) =>
                        l.date === todayDateStr &&
                        (l.status === 'present' ||
                          l.status === 'single_session' ||
                          l.type === 'present' ||
                          l.type === 'single_session')
                    );
                    const todayLogTime = todayLog?.time;

                    return (
                      <tr
                        key={std.id}
                        style={{
                          backgroundColor: isFullDebtor
                            ? 'rgba(239, 68, 68, 0.08)'
                            : isPartialDebtor
                            ? 'rgba(249, 115, 22, 0.08)'
                            : isExempt
                            ? 'rgba(245, 158, 11, 0.04)'
                            : isAttendedToday
                            ? 'rgba(16, 185, 129, 0.04)'
                            : isExceeded
                            ? 'rgba(185, 74, 72, 0.04)'
                            : undefined,
                          borderRight: isFullDebtor
                            ? '4px solid #ef4444'
                            : isPartialDebtor
                            ? '4px solid #f97316'
                            : isExempt
                            ? '4px solid #f59e0b'
                            : isAttendedToday
                            ? '4px solid #10b981'
                            : undefined,
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isFullDebtor && (
                              <span title="تلميذ لم يسدد الاشتراك إطلاقاً" style={{ display: 'inline-flex' }}>
                                <AlertTriangle size={15} color="#ef4444" />
                              </span>
                            )}
                            {isPartialDebtor && (
                              <span title={`تلميذ متبقي في الذمة: ${formatDZD(std.totalDebt || 0)}`} style={{ display: 'inline-flex' }}>
                                <AlertTriangle size={15} color="#f97316" />
                              </span>
                            )}
                            {isExempt && (
                              <span title="تلميذ معفى من تسديد مبلغ الدورة" style={{ display: 'inline-flex' }}>
                                <HeartHandshake size={16} color="#d97706" />
                              </span>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: isFullDebtor ? '#b91c1c' : isPartialDebtor ? '#c2410c' : isExempt ? '#92400e' : 'var(--color-text-primary)' }}>
                                {std.fullName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <span>{std.academicLevel}</span>
                                {isExempt && (
                                  <span style={{ fontSize: '0.6875rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                                    معفى
                                  </span>
                                )}
                                {singleSessionCount > 0 && (
                                  <span
                                    style={{
                                      fontSize: '0.6875rem',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      backgroundColor: '#eff6ff',
                                      color: '#1d4ed8',
                                      border: '1px solid #bfdbfe',
                                      fontWeight: 700,
                                    }}
                                    title={`درس التلميذ ${singleSessionCount} حصص بنظام الحصة`}
                                  >
                                    نظام الحصة ({singleSessionCount})
                                  </span>
                                )}
                                {missedGroupSessions > 0 && (
                                  <span
                                    style={{
                                      fontSize: '0.6875rem',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      backgroundColor: '#fffbeb',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                    title={`التحق بعد بداية الفوج - فاتت التلميذ ${missedGroupSessions} حصص من البرنامج`}
                                  >
                                    ⚠️ فاتت {missedGroupSessions} {missedGroupSessions === 1 ? 'حصة' : missedGroupSessions === 2 ? 'حصتان' : `${missedGroupSessions} حصص`}
                                  </span>
                                )}
                                {isAttendedToday && (
                                  <span
                                    style={{
                                      fontSize: '0.6875rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #86efac',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                    title={`تم تسجيل حضور الطالب اليوم${todayLogTime ? ` عند الساعة ${todayLogTime}` : ''}`}
                                  >
                                    ✓ سُجّل اليوم {todayLogTime ? `(${todayLogTime})` : ''}
                                  </span>
                                )}
                                {isStudentAbsentToday(std) && (
                                  <span
                                    style={{
                                      fontSize: '0.6875rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#fee2e2',
                                      color: '#b91c1c',
                                      border: '1px solid #fca5a5',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                    title="تم تسجيل غياب التلميذ اليوم"
                                  >
                                    ✕ غائب اليوم
                                  </span>
                                )}
                                {isLastSession && (
                                  <span
                                    style={{
                                      fontSize: '0.6875rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#fef3c7',
                                      color: '#b45309',
                                      border: '1px solid #f59e0b',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                    title="التلميذ أتم حصص اشتراكه الحالي - يرجى تذكيره بالتجديد للحصة القادمة"
                                  >
                                    ⚠️ الحصة الأخيرة - يلزم التجديد الحصة القادمة
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                            {formatAlgerianPhone(std.phone)}
                          </span>
                        </td>
                        <td>
                          {isExempt ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <Badge
                                variant="warning"
                                style={{
                                  fontWeight: 800,
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  border: '1px solid #f59e0b',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <HeartHandshake size={13} />
                                معفى
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleExemption(std)}
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '1px 6px',
                                  height: '22px',
                                  color: 'var(--color-text-muted)',
                                }}
                                title="إلغاء الإعفاء وإعادة احتساب مستحقات الدورة"
                              >
                                إلغاء الإعفاء
                              </Button>
                            </div>
                          ) : isPartialDebtor ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                              <Badge
                                variant="warning"
                                style={{
                                  fontWeight: 800,
                                  backgroundColor: '#fff7ed',
                                  color: '#c2410c',
                                  border: '1px solid #f97316',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                متبقي في الذمة ({formatDZD(std.totalDebt)})
                              </Badge>
                              <span style={{ fontSize: '0.6875rem', color: '#ea580c', fontWeight: 600 }}>
                                المدفوع: {formatDZD(std.totalPaid || 0)}
                              </span>
                            </div>
                          ) : isFullDebtor ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <Badge
                                variant="danger"
                                style={{
                                  fontWeight: 800,
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #f87171',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                غير مسدد ({formatDZD(std.totalDebt)})
                              </Badge>
                            </div>
                          ) : isSingleSession ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                              <Badge
                                variant="info"
                                style={{
                                  fontWeight: 800,
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                حصة واحدة
                              </Badge>
                              {std.totalPaid > 0 && (
                                <span style={{ fontSize: '0.6875rem', color: '#1d4ed8', fontWeight: 600 }}>
                                  المسدد: {formatDZD(std.totalPaid || 0)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="success">خالص</Badge>
                          )}
                        </td>
                        <td>
                          {/* Visual Circles Sessions Counter */}
                          <SessionCircles student={std} maxCourseSessions={maxCourseSessions} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {(() => {
                              const validation = validateStudentAttendanceRegistration(std);
                              const isBlocked = !validation.allowed;
                              const isDebtBlocked = validation.blockReason === 'debt_second_session';
                              const isCooldownBlocked = validation.blockReason === 'cooldown_2h';

                              return (
                                <Button
                                  variant={isExceeded ? 'danger' : isBlocked ? 'secondary' : 'primary'}
                                  size="sm"
                                  onClick={() => handleIncrement(std.id)}
                                  rightIcon={<CheckCircle2 size={14} />}
                                  style={
                                    isBlocked
                                      ? {
                                          opacity: 0.85,
                                          borderColor: isDebtBlocked ? '#fca5a5' : '#fed7aa',
                                          backgroundColor: isDebtBlocked ? '#fef2f2' : '#fff7ed',
                                          color: isDebtBlocked ? '#b91c1c' : '#c2410c',
                                        }
                                      : undefined
                                  }
                                  title={
                                    isDebtBlocked
                                      ? `ممنوع التسجيل: التلميذ في ذمته دين (${formatDZD(std.totalDebt)}) ودرس حصته الأولى المسموحة. يجب تسديد الدين لتسجيل الحصة الثانية.`
                                      : isCooldownBlocked
                                      ? `تكرار التسجيل غير مسموح: يجب انتظار ساعتين من تسجيل الحصة الأولى (متبقي ${validation.remainingMinutes} دقيقة)`
                                      : 'تسجيل حضور حصة جديدة'
                                  }
                                >
                                  + حضور ({attended + 1})
                                </Button>
                              );
                            })()}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openAbsenceModal(std)}
                              rightIcon={<UserX size={14} />}
                              style={{
                                borderColor: 'var(--color-warning, #f59e0b)',
                                color: '#c2410c',
                              }}
                              title="تسجيل غياب (محسوب أو مبرر)"
                            >
                              غياب
                            </Button>

                            {/* Dropdown Menu Trigger for Extra Actions */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownStudentId(openDropdownStudentId === std.id ? null : std.id);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-border, #cbd5e1)',
                                  backgroundColor: openDropdownStudentId === std.id ? 'var(--color-bg-surface-secondary, #f1f5f9)' : '#ffffff',
                                  color: 'var(--color-text-secondary, #475569)',
                                  cursor: 'pointer',
                                  padding: 0,
                                  transition: 'all 0.15s ease',
                                }}
                                title="خيارات إضافية"
                                aria-label="خيارات إضافية"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {openDropdownStudentId === std.id && (
                                <>
                                  <div
                                    style={{
                                      position: 'fixed',
                                      inset: 0,
                                      zIndex: 998,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownStudentId(null);
                                    }}
                                  />
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: 0,
                                      marginTop: '4px',
                                      backgroundColor: '#ffffff',
                                      border: '1px solid var(--color-border, #e2e8f0)',
                                      borderRadius: '8px',
                                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 6px rgba(0, 0, 0, 0.05)',
                                      zIndex: 999,
                                      minWidth: '120px',
                                      padding: '4px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenDropdownStudentId(null);
                                        handleUndoAttendance(std);
                                      }}
                                      style={{
                                        width: '100%',
                                        textAlign: 'right',
                                        padding: '7px 12px',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        color: '#ea580c',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fff7ed')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      title="التراجع عن آخر تسجيل للتلميذ (حضور أو غياب)"
                                    >
                                      <RotateCcw size={13} />
                                      <span>تراجع عن التسجيل</span>
                                    </button>

                                    {(std.totalDebt || 0) > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenDropdownStudentId(null);
                                          openPayDebtModal(std);
                                        }}
                                        style={{
                                          width: '100%',
                                          textAlign: 'right',
                                          padding: '7px 12px',
                                          fontSize: '0.8125rem',
                                          fontWeight: 500,
                                          color: '#059669',
                                          backgroundColor: 'transparent',
                                          border: 'none',
                                          borderRadius: '5px',
                                          cursor: 'pointer',
                                          display: 'block',
                                          whiteSpace: 'nowrap',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ecfdf5')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        تسديد الدين
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenDropdownStudentId(null);
                                        setStudentToDelete(std);
                                      }}
                                      style={{
                                        width: '100%',
                                        textAlign: 'right',
                                        padding: '7px 12px',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        color: '#ef4444',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        display: 'block',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      الحذف
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenDropdownStudentId(null);
                                        handleOpenEditStudentModal(std);
                                      }}
                                      style={{
                                        width: '100%',
                                        textAlign: 'right',
                                        padding: '7px 12px',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        color: 'var(--color-text-primary, #1e293b)',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        display: 'block',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      التعديل
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenDropdownStudentId(null);
                                        openSingleSessionModal(std);
                                      }}
                                      style={{
                                        width: '100%',
                                        textAlign: 'right',
                                        padding: '7px 12px',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        color: '#2563eb',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        display: 'block',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      حصة واحدة
                                    </button>

                                    {singleSessionCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenDropdownStudentId(null);
                                          openConvertToCourseModal(std);
                                        }}
                                        style={{
                                          width: '100%',
                                          textAlign: 'right',
                                          padding: '7px 12px',
                                          fontSize: '0.8125rem',
                                          fontWeight: 600,
                                          color: '#059669',
                                          backgroundColor: 'transparent',
                                          border: 'none',
                                          borderRadius: '5px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ecfdf5')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <GraduationCap size={14} />
                                        الاشتراك في دورة (جديد)
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {singleSessionCount > 0 && !hasCourseSubscription ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openConvertToCourseModal(std)}
                              rightIcon={<GraduationCap size={14} />}
                              style={{
                                backgroundColor: '#059669',
                                borderColor: '#047857',
                                color: '#ffffff',
                                fontWeight: 700,
                                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                              }}
                              title="الاشتراك في دورة جديدة كاملة مع حفظ مستحقات الأستاذ من الحصص الفردية السابقة"
                            >
                              الاشتراك في دورة
                            </Button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Button
                                variant={isExceeded || isLastSession ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => openRenewModal(std)}
                                rightIcon={<RotateCw size={13} />}
                                style={
                                  isLastSession
                                    ? {
                                        backgroundColor: '#d97706',
                                        borderColor: '#b45309',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                      }
                                    : undefined
                                }
                              >
                                إعادة الاشتراك
                              </Button>
                              {singleSessionCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openConvertToCourseModal(std)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    border: '1px solid #a7f3d0',
                                    backgroundColor: '#ecfdf5',
                                    color: '#059669',
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                  title="تسجيل اشتراك جديد في دورة كاملة"
                                >
                                  <GraduationCap size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStudentForLogs(std)}
                              rightIcon={<History size={14} />}
                            >
                              السجل ({std.attendanceLogs?.length || 0})
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Dedicated Mobile Card View (<= 768px) for Ultra-Fast One-Thumb Attendance Marking */}
          <div
            className="attendance-mobile-list"
            style={{
              maxHeight: isRosterDocked ? 'calc(100vh - 250px)' : 'none',
              overflowY: isRosterDocked ? 'auto' : 'visible',
              transition: 'max-height 0.2s ease',
            }}
          >
            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                {enrolledList.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <Users size={32} color="var(--color-text-muted)" />
                    <span style={{ fontWeight: 600 }}>لا يوجد تلاميذ مسجلين في هذا الفوج حتى الآن.</span>
                    <Button variant="primary" size="sm" rightIcon={<UserPlus size={14} />} onClick={handleOpenEnrollModal}>
                      + إضافة تلميذ للفوج
                    </Button>
                  </div>
                ) : (
                  searchQuery ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Search size={28} color="var(--color-text-muted)" />
                      <span style={{ fontWeight: 600 }}>لا توجد نتائج مطابقة لبحثك عن &quot;{searchQuery}&quot;</span>
                      <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                        مسح البحث وعرض كل التلاميذ
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Users size={28} color="var(--color-text-muted)" />
                      <span style={{ fontWeight: 600 }}>لا يوجد تلاميذ ينطبق عليهم هذا الفلتر.</span>
                      <Button variant="outline" size="sm" onClick={() => setTodayFilterTab('all')}>
                        عرض جميع التلاميذ
                      </Button>
                    </div>
                  )
                )}
              </div>
            ) : (
              filteredStudents.map((std) => {
                const attended = std.attendedSessions || 0;
                const total = std.totalSessions && std.totalSessions > 0 ? std.totalSessions : 4;
                const isExceeded = attended > total;
                const isExempt = !!std.isExempt;
                const isLastSession = !isExempt && attended === total && total > 1;
                const isFullDebtor = isStudentDebtor(std);
                const isPartialDebtor = isStudentPartialDebtor(std);
                const hasUnpaidDebt = isFullDebtor || isPartialDebtor;
                const hasAttendanceHistory =
                  (std.attendedSessions || 0) > 0 ||
                  (std.attendanceLogs &&
                    std.attendanceLogs.some((l) => {
                      const s = l.status || l.type;
                      return s === 'present' || s === 'absent_counted' || s === 'absent_uncounted' || s === 'single_session';
                    }));

                const singleSessionLogs = (std.attendanceLogs || []).filter(
                  (l) => l.status === 'single_session' || l.type === 'single_session'
                );
                const singleSessionCount = singleSessionLogs.length;
                const latestRenewalLog = (std.attendanceLogs || []).find(
                  (l) => l.status === 'renewed' || l.type === 'renewed'
                );
                const hasCourseSubscription = !!latestRenewalLog || ((std.totalSessions || 0) > 1 && !std.notes?.includes('حصة واحدة'));
                const isSingleSession = isStudentSingleSession(std);
                const studentCycleProgress = Math.max(
                  attended,
                  (std.attendanceLogs || []).filter((l) => {
                    const s = l.status || l.type;
                    return s === 'present' || s === 'absent_counted' || s === 'absent_uncounted' || s === 'single_session';
                  }).length
                );
                const missedGroupSessions = std.missedGroupSessions || 0;

                const isAttendedToday = isStudentAttendedToday(std);
                const todayLog = (std.attendanceLogs || []).find(
                  (l) =>
                    l.date === todayDateStr &&
                    (l.status === 'present' ||
                      l.status === 'single_session' ||
                      l.type === 'present' ||
                      l.type === 'single_session')
                );
                const todayLogTime = todayLog?.time;

                return (
                  <div
                    key={std.id}
                    className={`attendance-mobile-card ${hasUnpaidDebt ? 'attendance-card-unpaid' : ''} ${isExceeded ? 'attendance-card-exceeded' : ''}`}
                    style={{
                      border: isFullDebtor
                        ? '2px solid #ef4444'
                        : isPartialDebtor
                        ? '2px solid #f97316'
                        : isExempt
                        ? '2px solid #f59e0b'
                        : isAttendedToday
                        ? '2px solid #10b981'
                        : undefined,
                      backgroundColor: isFullDebtor
                        ? 'rgba(239, 68, 68, 0.05)'
                        : isPartialDebtor
                        ? 'rgba(249, 115, 22, 0.05)'
                        : isExempt
                        ? 'rgba(245, 158, 11, 0.04)'
                        : isAttendedToday
                        ? 'rgba(16, 185, 129, 0.04)'
                        : undefined,
                    }}
                  >
                    {/* Top: Student Info + Status Badge */}
                    <div className="attendance-card-header">
                      <div className="attendance-student-info">
                        <div
                          className="attendance-student-avatar"
                          style={{
                            backgroundColor: isFullDebtor ? '#fee2e2' : isPartialDebtor ? '#ffedd5' : isExempt ? '#fef3c7' : isAttendedToday ? '#dcfce7' : undefined,
                            color: isFullDebtor ? '#b91c1c' : isPartialDebtor ? '#c2410c' : isExempt ? '#92400e' : isAttendedToday ? '#15803d' : undefined,
                            border: isFullDebtor ? '1px solid #f87171' : isPartialDebtor ? '1px solid #fdba74' : isExempt ? '1px solid #f59e0b' : isAttendedToday ? '1px solid #86efac' : undefined,
                          }}
                        >
                          {std.fullName.trim().slice(0, 1)}
                        </div>
                        <div>
                          <div
                            className="attendance-student-name"
                            style={{ color: isFullDebtor ? '#b91c1c' : isPartialDebtor ? '#c2410c' : isExempt ? '#92400e' : undefined, fontWeight: 700 }}
                          >
                            {std.fullName}
                          </div>
                          <div className="attendance-student-sub" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span>{std.academicLevel}</span>
                            {isExempt && (
                              <span style={{ fontSize: '0.6875rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                                معفى
                              </span>
                            )}
                            {singleSessionCount > 0 && (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  fontWeight: 700,
                                }}
                                title={`درس التلميذ ${singleSessionCount} حصص بنظام الحصة`}
                              >
                                نظام الحصة ({singleSessionCount})
                              </span>
                            )}
                            {missedGroupSessions > 0 && (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title={`التحق بعد بداية الفوج - فاتت التلميذ ${missedGroupSessions} حصص من البرنامج`}
                              >
                                ⚠️ فاتت {missedGroupSessions} {missedGroupSessions === 1 ? 'حصة' : missedGroupSessions === 2 ? 'حصتان' : `${missedGroupSessions} حصص`}
                              </span>
                            )}
                            {isAttendedToday && (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: '#dcfce7',
                                  color: '#15803d',
                                  border: '1px solid #86efac',
                                  fontWeight: 700,
                                }}
                                title={`تم تسجيل حضور الطالب اليوم${todayLogTime ? ` عند الساعة ${todayLogTime}` : ''}`}
                              >
                                ✓ سُجّل اليوم
                              </span>
                            )}
                            {isLastSession && (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #f59e0b',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="التلميذ أتم حصص اشتراكه الحالي - يرجى تذكيره بالتجديد للحصة القادمة"
                              >
                                ⚠️ الحصة الأخيرة - يلزم التجديد
                              </span>
                            )}
                            {std.phone && (
                              <>
                                <span>•</span>
                                <a href={`tel:${std.phone}`} className="attendance-phone-link">
                                  <Phone size={11} />
                                  <span>{formatAlgerianPhone(std.phone)}</span>
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="attendance-card-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        {isExempt ? (
                          <Badge
                            variant="warning"
                            style={{
                              fontWeight: 800,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #f59e0b',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <HeartHandshake size={13} />
                            معفى
                          </Badge>
                        ) : isPartialDebtor ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <Badge
                              variant="warning"
                              style={{
                                fontWeight: 800,
                                backgroundColor: '#fff7ed',
                                color: '#c2410c',
                                border: '1px solid #f97316',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              متبقي في الذمة: {formatDZD(std.totalDebt)}
                            </Badge>
                            <span style={{ fontSize: '0.6875rem', color: '#ea580c', fontWeight: 600 }}>
                              المدفوع: {formatDZD(std.totalPaid || 0)}
                            </span>
                          </div>
                        ) : isFullDebtor ? (
                          <Badge
                            variant="danger"
                            style={{
                              fontWeight: 800,
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #f87171',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            غير مسدد: {formatDZD(std.totalDebt)}
                          </Badge>
                        ) : isSingleSession ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <Badge
                              variant="info"
                              style={{
                                fontWeight: 800,
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              حصة واحدة
                            </Badge>
                            {std.totalPaid > 0 && (
                              <span style={{ fontSize: '0.6875rem', color: '#1d4ed8', fontWeight: 600 }}>
                                المسدد: {formatDZD(std.totalPaid || 0)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="success">خالص</Badge>
                        )}
                      </div>
                    </div>

                    {/* Middle: Sessions Circles Meter */}
                    <div className="attendance-sessions-meter" style={{ backgroundColor: 'var(--color-bg-app)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ marginBottom: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        استهلاك الحصص:
                      </div>
                      <SessionCircles student={std} maxCourseSessions={maxCourseSessions} />
                    </div>

                    {/* Bottom: Actions */}
                    <div className="attendance-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Primary Attendance & Absence & 3-dots Dropdown */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                        {(() => {
                          const validation = validateStudentAttendanceRegistration(std);
                          const isBlocked = !validation.allowed;
                          const isDebtBlocked = validation.blockReason === 'debt_second_session';
                          const isCooldownBlocked = validation.blockReason === 'cooldown_2h';

                          return (
                            <Button
                              variant={isExceeded ? 'danger' : isBlocked ? 'secondary' : 'primary'}
                              className="attendance-primary-btn"
                              onClick={() => handleIncrement(std.id)}
                              rightIcon={<CheckCircle2 size={15} />}
                              style={{
                                flex: 1,
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                padding: '6px 4px',
                                ...(isBlocked
                                  ? {
                                      opacity: 0.85,
                                      borderColor: isDebtBlocked ? '#fca5a5' : '#fed7aa',
                                      backgroundColor: isDebtBlocked ? '#fef2f2' : '#fff7ed',
                                      color: isDebtBlocked ? '#b91c1c' : '#c2410c',
                                    }
                                  : {}),
                              }}
                              title={
                                isDebtBlocked
                                  ? `ممنوع التسجيل: التلميذ في ذمته دين (${formatDZD(std.totalDebt)}) ودرس حصته الأولى المسموحة. يجب تسديد الدين لتسجيل الحصة الثانية.`
                                  : isCooldownBlocked
                                  ? `تكرار التسجيل غير مسموح: يجب انتظار ساعتين من تسجيل الحصة الأولى (متبقي ${validation.remainingMinutes} دقيقة)`
                                  : 'تسجيل حضور حصة جديدة'
                              }
                            >
                              + حضور ({attended + 1})
                            </Button>
                          );
                        })()}

                        <Button
                          variant="secondary"
                          onClick={() => openAbsenceModal(std)}
                          rightIcon={<UserX size={15} />}
                          style={{
                            justifyContent: 'center',
                            borderColor: '#f97316',
                            color: '#c2410c',
                            fontSize: '0.75rem',
                            padding: '6px 12px',
                          }}
                        >
                          غياب
                        </Button>

                        {/* Mobile Dropdown Menu Trigger for Extra Actions */}
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownStudentId(openDropdownStudentId === `mob-${std.id}` ? null : `mob-${std.id}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-border, #cbd5e1)',
                              backgroundColor: openDropdownStudentId === `mob-${std.id}` ? 'var(--color-bg-surface-secondary, #f1f5f9)' : '#ffffff',
                              color: 'var(--color-text-secondary, #475569)',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title="خيارات إضافية"
                            aria-label="خيارات إضافية"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openDropdownStudentId === `mob-${std.id}` && (
                            <>
                              <div
                                style={{
                                  position: 'fixed',
                                  inset: 0,
                                  zIndex: 998,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownStudentId(null);
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  marginTop: '4px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid var(--color-border, #e2e8f0)',
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 6px rgba(0, 0, 0, 0.05)',
                                  zIndex: 999,
                                  minWidth: '130px',
                                  padding: '4px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {(std.totalDebt || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownStudentId(null);
                                      openPayDebtModal(std);
                                    }}
                                    style={{
                                      width: '100%',
                                      textAlign: 'right',
                                      padding: '8px 12px',
                                      fontSize: '0.8125rem',
                                      fontWeight: 500,
                                      color: '#059669',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderRadius: '5px',
                                      cursor: 'pointer',
                                      display: 'block',
                                      whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ecfdf5')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    تسديد الدين
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenDropdownStudentId(null);
                                    setStudentToDelete(std);
                                  }}
                                  style={{
                                    width: '100%',
                                    textAlign: 'right',
                                    padding: '8px 12px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#ef4444',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    display: 'block',
                                  }}
                                >
                                  الحذف
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenDropdownStudentId(null);
                                    handleOpenEditStudentModal(std);
                                  }}
                                  style={{
                                    width: '100%',
                                    textAlign: 'right',
                                    padding: '8px 12px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: 'var(--color-text-primary, #1e293b)',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    display: 'block',
                                  }}
                                >
                                  التعديل
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenDropdownStudentId(null);
                                    openSingleSessionModal(std);
                                  }}
                                  style={{
                                    width: '100%',
                                    textAlign: 'right',
                                    padding: '8px 12px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#2563eb',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    display: 'block',
                                  }}
                                >
                                  حصة واحدة
                                </button>

                                {singleSessionCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownStudentId(null);
                                      openConvertToCourseModal(std);
                                    }}
                                    style={{
                                      width: '100%',
                                      textAlign: 'right',
                                      padding: '8px 12px',
                                      fontSize: '0.8125rem',
                                      fontWeight: 600,
                                      color: '#059669',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderRadius: '5px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <GraduationCap size={14} />
                                    الاشتراك في دورة (جديد)
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Secondary Actions Row */}
                      <div className="attendance-secondary-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {singleSessionCount > 0 && !hasCourseSubscription ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            onClick={() => openConvertToCourseModal(std)}
                            rightIcon={<GraduationCap size={13} />}
                            style={{ backgroundColor: '#059669', borderColor: '#047857' }}
                          >
                            الاشتراك في دورة
                          </Button>
                        ) : (
                          <Button
                            variant={isExceeded || isLastSession ? 'primary' : 'secondary'}
                            size="sm"
                            className="flex-1"
                            onClick={() => openRenewModal(std)}
                            rightIcon={<RotateCw size={13} />}
                            style={
                              isLastSession
                                ? {
                                    backgroundColor: '#d97706',
                                    borderColor: '#b45309',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                  }
                                : undefined
                            }
                          >
                            إعادة الاشتراك
                          </Button>
                        )}


                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => setStudentForLogs(std)}
                          rightIcon={<History size={13} />}
                        >
                          السجل ({std.attendanceLogs?.length || 0})
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
        </>
      ) : attendanceViewMode === 'smart_card' ? (
        <SmartCardScannerTab
          activeCourse={activeCourse}
          courses={filteredCourses.length > 0 ? filteredCourses : courses}
          teachers={teachers}
          schoolName={currentSchool?.name || 'مدرستي'}
          onSelectCourse={setSelectedCourseId}
          incrementStudentSession={incrementStudentSession}
          undoStudentAttendance={undoStudentAttendance}
          recordBatchAbsence={recordBatchAbsence}
          updateStudent={updateStudent}
          onEnrollNewWithCard={(cardId) => {
            handleOpenEnrollModal();
            setEnrollStdCardId(cardId);
            setAttendanceViewMode('roster');
            setIsEnrollModalOpen(true);
          }}
          onOpenRenewModal={(student) => {
            setStudentToRenew(student);
          }}
        />
      ) : (
        <StudentCardsDirectoryTab
          courses={courses}
          teachers={teachers}
          currentSchool={currentSchool}
          updateStudent={updateStudent}
          enrollStudentToCourse={enrollStudentToCourse}
          onSelectCourse={setSelectedCourseId}
          onSwitchToScanner={() => setAttendanceViewMode('smart_card')}
          onSwitchToRoster={() => setAttendanceViewMode('roster')}
        />
      )}

      {/* Batch End of Day Absence Confirmation Modal */}
      <Modal
        isOpen={isBatchAbsenceModalOpen}
        onClose={() => setIsBatchAbsenceModalOpen(false)}
        title="إنهاء حصة اليوم وتسجيل غياب لمن لم يحضر"
        description={`تسجيل الغياب للتلاميذ الذين لم يسجلوا حضورهم اليوم في فوج: ${activeCourse?.title || ''}`}
        maxWidth="540px"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
            <Button
              variant="danger"
              rightIcon={<UserX size={15} />}
              onClick={handleExecuteBatchAbsence}
            >
              تأكيد تسجيل الغياب لـ ({pendingTodayStudents.length}) تلميذ
            </Button>
            <Button variant="secondary" onClick={() => setIsBatchAbsenceModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: 'var(--radius-md)',
              color: '#9a3412',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertTriangle size={24} color="#ea580c" style={{ flexShrink: 0 }} />
            <div>
              يوجد <strong>{pendingTodayStudents.length} تلميذ</strong> لم يسجلوا حضورهم اليوم في هذا الفوج.
              سيتم تسجيل غياب رسمي لهم بتاريخ اليوم <strong>({todayDateStr})</strong>.
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
              اختر نوع الغياب المراد تطبيقه:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: batchAbsenceIsCounted ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  backgroundColor: batchAbsenceIsCounted ? '#fef2f2' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="batchAbsenceType"
                  checked={batchAbsenceIsCounted}
                  onChange={() => setBatchAbsenceIsCounted(true)}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.875rem' }}>
                    غياب محسوب (يقتطع حصة من رصيد التلميذ ويُحتسب للأستاذ) — المعيار الرسمي
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    تُخصم حصة من باقة التلميذ وتدخل الحصة في حساب مستحقات الأستاذ المالية.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: !batchAbsenceIsCounted ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  backgroundColor: !batchAbsenceIsCounted ? '#fffbeb' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="batchAbsenceType"
                  checked={!batchAbsenceIsCounted}
                  onChange={() => setBatchAbsenceIsCounted(false)}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#b45309', fontSize: '0.875rem' }}>
                    غياب معفى (تجاوز يوم — لا يقتطع من الرصيد)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    لا يُخصم من رصيد التلميذ ويُحسب له الحضور في الحصة القادمة.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <Input
            label="ملاحظة أو بيان الغياب (اختياري)"
            placeholder="مثال: غياب بنهاية اليوم"
            value={batchAbsenceNote}
            onChange={(e) => setBatchAbsenceNote(e.target.value)}
          />

          {/* Student Names Preview */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              قائمة التلاميذ المعنيين بالتسجيل ({pendingTodayStudents.length}):
            </div>
            <div
              style={{
                maxHeight: '130px',
                overflowY: 'auto',
                backgroundColor: 'var(--color-bg-app, #f8fafc)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              {pendingTodayStudents.map((std, i) => (
                <span
                  key={std.id}
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontWeight: 600,
                  }}
                >
                  {i + 1}. {std.fullName}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Revert / Remove Auto-Absence Modal for Today (Synced with Database) */}
      <Modal
        isOpen={isRevertAutoAbsenceModalOpen}
        onClose={() => setIsRevertAutoAbsenceModalOpen(false)}
        title="إزالة وتراجع الغياب التلقائي (اليوم فقط)"
        description={`إلغاء احتساب الغياب التلقائي المسجل اليوم واسترجاع الحصص المقتطعة لفوج: ${activeCourse?.title || ''}`}
        maxWidth="650px"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <Button
              variant="primary"
              rightIcon={<RotateCcw size={15} />}
              onClick={handleExecuteRevertAutoAbsence}
              disabled={selectedRevertStudentIds.length === 0 || isRevertingAutoAbsence}
              style={{
                backgroundColor: '#ea580c',
                borderColor: '#ea580c',
              }}
            >
              {isRevertingAutoAbsence
                ? 'جاري الحفظ والمزامنة...'
                : `تأكيد إزالة الغياب واسترجاع الحصص (${selectedRevertStudentIds.length})`}
            </Button>
            <Button variant="secondary" onClick={() => setIsRevertAutoAbsenceModalOpen(false)}>
              إلغاء
            </Button>
            {isAutoAbsentCancelledToday && (
              <button
                type="button"
                onClick={handleResetAutoAbsentCancellation}
                style={{
                  marginRight: 'auto',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #16a34a',
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="إعادة السماح للنظام باحتساب الغياب التلقائي لليوم إذا دعت الحاجة"
              >
                إعادة تفعيل الغياب التلقائي لليوم
              </button>
            )}
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Information & Database Sync Banner */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#fff7ed',
              border: '1.5px solid #fdba74',
              borderRadius: 'var(--radius-md)',
              color: '#9a3412',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <RotateCcw size={22} color="#ea580c" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: '3px' }}>
                تراجع وإزالة الغياب التلقائي لليوم فقط ({todayDateStr})
              </div>
              <div style={{ fontSize: '0.8125rem', lineHeight: '1.5' }}>
                سيتم حذف تسجيل الغياب التلقائي المسجل اليوم للتلاميذ المحددين واسترجاع الحصص المقتطعة تلقائياً إلى رصيدهم.
                <br />
                <strong>⚡ ميزة المزامنة الفورية:</strong> تُحفظ العملية مباشرة في <strong>قاعدة البيانات (Supabase)</strong> وتتزامن فوراً مع كافة الحواسيب المتصلة، مع ضمان <strong>عدم إعادة تطبيق الغياب التلقائي</strong> لهذا الفوج اليوم.
              </div>
            </div>
          </div>

          {autoAbsentTodayStudents.length > 0 ? (
            <>
              {/* Select All / Deselect All Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ fontWeight: 700, color: '#334155' }}>
                  التلاميذ المعنيون بالتراجع: ({selectedRevertStudentIds.length} من {autoAbsentTodayStudents.length})
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRevertStudentIds(autoAbsentTodayStudents.map((s) => s.id))}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#2563eb',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    تحديد الكل
                  </button>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRevertStudentIds([])}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#64748b',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {/* Students List with Checkboxes */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  paddingRight: '2px',
                }}
              >
                {autoAbsentTodayStudents.map((std) => {
                  const isChecked = selectedRevertStudentIds.includes(std.id);
                  const todayAbsentLog = (std.attendanceLogs || []).find(
                    (l) =>
                      l.date === todayDateStr &&
                      (l.status === 'absent_counted' ||
                        l.status === 'absent_uncounted' ||
                        l.type === 'absent_counted' ||
                        l.type === 'absent_uncounted')
                  );
                  const isCounted =
                    todayAbsentLog?.status === 'absent_counted' || todayAbsentLog?.type === 'absent_counted';
                  const currentAttended = std.attendedSessions || 0;
                  const restoredAttended = isCounted ? Math.max(0, currentAttended - 1) : currentAttended;
                  const total = std.totalSessions || activeCourse?.totalSessionsDefault || 5;

                  return (
                    <label
                      key={std.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isChecked ? '1.5px solid #fdba74' : '1px solid #e2e8f0',
                        backgroundColor: isChecked ? '#fffaf5' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRevertStudentIds((prev) => [...prev, std.id]);
                            } else {
                              setSelectedRevertStudentIds((prev) => prev.filter((id) => id !== std.id));
                            }
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ea580c' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                            {std.fullName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span>{std.academicLevel}</span>
                            {todayAbsentLog?.notes && (
                              <span style={{ color: '#9a3412', fontStyle: 'italic' }}>
                                • {todayAbsentLog.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            backgroundColor: isCounted ? '#fee2e2' : '#fef3c7',
                            color: isCounted ? '#b91c1c' : '#92400e',
                            fontWeight: 700,
                          }}
                        >
                          {isCounted ? 'غياب محسوب' : 'غياب معفى'}
                        </span>
                        {isCounted && (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                            رصيد الحصص: {currentAttended}/{total} ⬅️ يُسترجع إلى {restoredAttended}/{total}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
              }}
            >
              <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                {isAutoAbsentCancelledToday
                  ? 'تم التراجع عن الغياب التلقائي لليوم ومزامنته بنجاح'
                  : 'لا يوجد تلاميذ مسجلين كغياب اليوم في هذا الفوج'}
              </div>
              <div style={{ fontSize: '0.8125rem' }}>
                {isAutoAbsentCancelledToday
                  ? 'تم تسجيل حالة الإلغاء في قاعدة البيانات وتحديث جميع الأجهزة، ولن يتم احتساب الغياب التلقائي اليوم.'
                  : 'جميع التلاميذ إما حاضرون أو في وضع الانتظار.'}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Student Confirmation Modal */}
      <Modal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        title="تأكيد حذف التلميذ واستبعاده من الفوج"
        description={`إلغاء تسجيل التلميذ من الفوج: ${activeCourse?.title || ''}`}
        maxWidth="480px"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
            <Button variant="danger" rightIcon={<Trash2 size={15} />} onClick={handleConfirmDeleteStudent}>
              نعم، حذف واستبعاد التلميذ
            </Button>
            <Button variant="secondary" onClick={() => setStudentToDelete(null)}>
              إلغاء
            </Button>
          </div>
        }
      >
        {studentToDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <AlertTriangle size={22} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                هل أنت متأكد من رغبتك في حذف التلميذ <strong>&quot;{studentToDelete.fullName}&quot;</strong> من هذا الفوج؟
                <br />
                <strong style={{ color: 'var(--color-danger)' }}>
                  تنبيه مالي مهم:
                </strong>{' '}
                سيتم إلغاء تسجيل التلميذ وحذف كامل سجل حضوره وغيابه من الفوج، <strong>ولن يتم احتساب أي حصة له في مستحقات وأجور الأستاذ المالية نهائياً</strong>.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={!!studentToEdit}
        onClose={() => setStudentToEdit(null)}
        title={`تعديل بيانات التلميذ: ${studentToEdit?.fullName || ''}`}
        description={`تحديث بيانات التلميذ المسجل في فوج: ${activeCourse?.title || ''}`}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveEditStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="اسم التلميذ الكامل"
            value={editStdFullName}
            onChange={(e) => setEditStdFullName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="هاتف التلميذ"
              value={editStdPhone}
              onChange={(e) => setEditStdPhone(e.target.value)}
              required
            />
            <Input
              label="هاتف ولي الأمر"
              value={editStdParentPhone}
              onChange={(e) => setEditStdParentPhone(e.target.value)}
              required
            />
          </div>

          <Input
            label="رقم البطاقة الإلكترونية الذكية (RFID / Barcode)"
            placeholder="امسح البطاقة بالقارئ أو اكتب الكود..."
            value={editStdCardId}
            onChange={(e) => setEditStdCardId(e.target.value)}
            prefixIcon={<CreditCard size={15} color="var(--color-primary, #2563eb)" />}
            hint="يمكنك تمرير البطاقة على قارئ الـ RFID مباشرة لتسجيل الكود تلقائياً"
          />

          <Input
            label="سعر الاشتراك / الدورة (دج)"
            type="number"
            value={editStdPrice}
            onChange={(e) => setEditStdPrice(e.target.value)}
            placeholder="مثال: 2500"
            min="0"
            required
            hint={
              studentToEdit && !editStdIsExempt
                ? `المسدد حالياً: ${formatDZD(studentToEdit.totalPaid || 0)} • الدين الناتج: ${formatDZD(Math.max(0, (Number(editStdPrice) || 0) - (studentToEdit.totalPaid || 0)))}`
                : undefined
            }
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="إجمالي الحصص المقررة"
              type="number"
              value={editStdTotalSessions}
              onChange={(e) => setEditStdTotalSessions(e.target.value)}
              required
            />
            <Input
              label="الحصص المستهلكة (الحضور)"
              type="number"
              value={editStdAttendedSessions}
              onChange={(e) => setEditStdAttendedSessions(e.target.value)}
              required
            />
          </div>

          {/* Social Exemption Option (معفى للفئة الفقيرة) */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: editStdIsExempt ? '#fffbeb' : 'var(--color-bg-app)',
              border: editStdIsExempt ? '1.5px solid #f59e0b' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              cursor: 'pointer',
            }}
            onClick={() => setEditStdIsExempt(!editStdIsExempt)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="editIsExempt"
                checked={editStdIsExempt}
                onChange={(e) => setEditStdIsExempt(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
              />
              <label htmlFor="editIsExempt" style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: editStdIsExempt ? '#92400e' : 'var(--color-text-primary)' }}>
                معفى من تسديد مبلغ الدورة
              </label>
            </div>
            <HeartHandshake size={20} color={editStdIsExempt ? '#d97706' : 'var(--color-text-muted)'} />
          </div>

          {/* Late enrollment / Missed sessions option (خيار التحاق متأخر وفاتته حصص) */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: editHasMissedSessions ? '#fffbeb' : 'var(--color-bg-app)',
              border: editHasMissedSessions ? '1.5px solid #f59e0b' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                cursor: 'pointer',
              }}
              onClick={() => setEditHasMissedSessions(!editHasMissedSessions)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="editHasMissedSessions"
                  checked={editHasMissedSessions}
                  onChange={(e) => setEditHasMissedSessions(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
                />
                <div>
                  <label
                    htmlFor="editHasMissedSessions"
                    style={{
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: editHasMissedSessions ? '#92400e' : 'var(--color-text-primary)',
                      display: 'block',
                    }}
                  >
                    التحاق متأخر بالفوج (فاتته حصة أو أكثر)
                  </label>
                  <div style={{ fontSize: '0.75rem', color: editHasMissedSessions ? '#b45309' : 'var(--color-text-muted)', marginTop: '2px' }}>
                    تحديد أو تعديل عدد الحصص التي فاتت التلميذ قبل التحاقه بالفوج
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: editHasMissedSessions ? '#fef3c7' : 'var(--color-bg-surface-secondary)',
                  color: editHasMissedSessions ? '#92400e' : 'var(--color-text-secondary)',
                  border: editHasMissedSessions ? '1px solid #fde68a' : 'none',
                }}
              >
                ⚠️ حصص فائتة
              </span>
            </div>

            {editHasMissedSessions && (
              <div
                style={{
                  paddingTop: '10px',
                  borderTop: '1px dashed #fde68a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '150px' }}>
                    <Input
                      label="عدد الحصص الفائتة"
                      type="number"
                      min="1"
                      max="20"
                      value={editStdMissedSessions}
                      onChange={(e) => setEditStdMissedSessions(e.target.value)}
                      placeholder="1 أو 2..."
                      required={editHasMissedSessions}
                    />
                  </div>
                  <div style={{ flex: 1, fontSize: '0.75rem', color: '#92400e', lineHeight: 1.5 }}>
                    اكتب يدوياً كم حصة فاتت هذا التلميذ قبل التحاقه بالفوج (مثلاً: 1 حصة أو 2 حصتين).
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: '#92400e',
                    lineHeight: 1.5,
                  }}
                >
                  💡 <strong>توضيح هام:</strong> الحصص الفائتة لا تخصم من رصيد حصص التلميذ المدفوعة، بل تظهر كدوائر تنبيهية صفراء ⚠️ في جدول المتابعة وتُدرج كملاحظة توضيحية للأستاذ في كشف الحضور.
                </div>
              </div>
            )}
          </div>

          <Input
            label="ملاحظات إضافية (اختياري)"
            value={editStdNotes}
            onChange={(e) => setEditStdNotes(e.target.value)}
            placeholder="ملاحظات خاصة بالتلميذ..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: 'var(--space-2)' }}>
            <Button type="submit" variant="primary">
              حفظ التعديلات
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStudentToEdit(null)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Student to Course Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`إضافة تلميذ جديد للفوج: ${activeCourse?.title || ''}`}
        description="تسجيل تلميذ جديد مباشرة في هذا الفوج وتحديد الحصص والمبلغ المسدد"
        maxWidth="520px"
      >
        <form onSubmit={handleSaveEnrollStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {activeCourse && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--color-bg-surface-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                الدورة: <strong>{activeCourse.title}</strong> • الأستاذ: <strong>{activeCourse.teacherName}</strong>
              </div>
              <div>
                السعر: <strong>{formatDZD(activeCourse.monthlyPrice)}</strong>
              </div>
            </div>
          )}

          <Input
            label="اسم التلميذ الكامل"
            placeholder="مثال: محمد الأمين بن علي"
            value={enrollStdFullName}
            onChange={(e) => setEnrollStdFullName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="هاتف التلميذ"
              placeholder="0550 12 34 56"
              value={enrollStdPhone}
              onChange={(e) => setEnrollStdPhone(e.target.value)}
            />
            <Input
              label="هاتف ولي الأمر"
              placeholder="0661 98 76 54"
              value={enrollStdParentPhone}
              onChange={(e) => setEnrollStdParentPhone(e.target.value)}
              required
            />
          </div>

          <Input
            label="رقم البطاقة الإلكترونية الذكية (RFID / Barcode) — اختياري"
            placeholder="امسح البطاقة بالقارئ أو اكتب الكود..."
            value={enrollStdCardId}
            onChange={(e) => setEnrollStdCardId(e.target.value)}
            prefixIcon={<CreditCard size={15} color="var(--color-primary, #2563eb)" />}
            hint="مرّر البطاقة على جهاز الـ RFID أو ماسح الباركود للربط الفوري"
          />

          {/* Real-time Duplicate Student Warning Banner */}
          <DuplicateStudentBanner
            matches={duplicateMatches}
            onAutoFill={handleAutoFillDuplicate}
          />

          {/* Single Session Only Option (خيار الحصة الواحدة فقط) */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: enrollIsSingleSession ? 'rgba(37, 99, 235, 0.08)' : 'var(--color-bg-app)',
              border: enrollIsSingleSession ? '1.5px solid #2563eb' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              const nextVal = !enrollIsSingleSession;
              setEnrollIsSingleSession(nextVal);
              if (nextVal) setEnrollStdIsExempt(false);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="enrollIsSingleSession"
                checked={enrollIsSingleSession}
                onChange={(e) => {
                  setEnrollIsSingleSession(e.target.checked);
                  if (e.target.checked) setEnrollStdIsExempt(false);
                }}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
              />
              <div>
                <label
                  htmlFor="enrollIsSingleSession"
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: enrollIsSingleSession ? '#1d4ed8' : 'var(--color-text-primary)',
                    display: 'block',
                  }}
                >
                  تسجيل كـ حصة واحدة فقط (تسديد رسم حضور حصة واحدة)
                </label>
                <div style={{ fontSize: '0.75rem', color: enrollIsSingleSession ? '#2563eb' : 'var(--color-text-muted)', marginTop: '2px' }}>
                  تسديد رسم حصة واحدة فقط دون الالتزام بدفع كامل باقة الفوج، مع تسجيل التبرير في المقبوضات
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: enrollIsSingleSession ? '#2563eb' : 'var(--color-bg-surface-secondary)',
                color: enrollIsSingleSession ? '#ffffff' : 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              حصة واحدة
            </span>
          </div>

          {/* Conditional Display: Single Session Form VS Regular Package Form */}
          {enrollIsSingleSession ? (
            <div
              style={{
                padding: '14px',
                backgroundColor: 'rgba(37, 99, 235, 0.04)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <Input
                  label="سعر الحصة الواحدة (دج DZD)"
                  type="number"
                  value={enrollSingleSessionPrice}
                  onChange={(e) => setEnrollSingleSessionPrice(e.target.value)}
                  placeholder="مثلاً: 1000"
                  required
                  min="0"
                />

                <Input
                  label="مبلغ للأستاذ من الحصة (دج DZD)"
                  type="number"
                  value={enrollSingleSessionTeacherAmount}
                  onChange={(e) => setEnrollSingleSessionTeacherAmount(e.target.value)}
                  placeholder="مثلاً: 600"
                  required
                  min="0"
                />
              </div>

              {(() => {
                const p = Number(enrollSingleSessionPrice) || 0;
                const t = Number(enrollSingleSessionTeacherAmount) || 0;
                const schoolShare = Math.max(0, p - t);
                return (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-bg-app)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-secondary)' }}>نصيب المؤسسة الصافي:</span>
                    <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.9375rem' }}>
                      {formatDZD(schoolShare)}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <Input
                  label="تاريخ الحصة"
                  type="date"
                  value={enrollSingleSessionDate}
                  onChange={(e) => setEnrollSingleSessionDate(e.target.value)}
                  required
                />
                <Input
                  label="تبرير الحصة الواحدة (يظهر في سجل المقبوضات)"
                  value={enrollSingleSessionJustification}
                  onChange={(e) => setEnrollSingleSessionJustification(e.target.value)}
                  placeholder="مثلاً: حصة تجريبية / استدراك / تلميذ زائر..."
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: '#1d4ed8',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0 }} />
                <span>
                  ستُسجل في سجل المدفوعات المقبوضة كـ <strong>حصة واحدة فقط</strong> مع التبرير، وتظهر كدائرة زرقاء برصيد (1/1)، وتُدرج في مستحقات الأستاذ.
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'var(--space-2)' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={(e) => handleSaveEnrollStudent(e, true)}
                  rightIcon={<Printer size={15} />}
                  style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8' }}
                >
                  تسجيل وطباعة الوصل
                </Button>
                <Button type="button" variant="secondary" onClick={(e) => handleSaveEnrollStudent(e, false)} rightIcon={<UserPlus size={15} />}>
                  تسجيل الحصة فقط
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsEnrollModalOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Social Exemption Option (معفى للفئة الفقيرة) */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: enrollStdIsExempt ? '#fffbeb' : 'var(--color-bg-app)',
                  border: enrollStdIsExempt ? '1.5px solid #f59e0b' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                }}
                onClick={() => setEnrollStdIsExempt(!enrollStdIsExempt)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="enrollIsExempt"
                    checked={enrollStdIsExempt}
                    onChange={(e) => setEnrollStdIsExempt(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
                  />
                  <label htmlFor="enrollIsExempt" style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: enrollStdIsExempt ? '#92400e' : 'var(--color-text-primary)' }}>
                    معفى من تسديد مبلغ الدورة
                  </label>
                </div>
                <HeartHandshake size={20} color={enrollStdIsExempt ? '#d97706' : 'var(--color-text-muted)'} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <Input
                  label="إجمالي الحصص المقررة للباقة"
                  type="number"
                  value={enrollStdTotalSessions}
                  onChange={(e) => setEnrollStdTotalSessions(e.target.value)}
                  required
                />
                {enrollStdIsExempt ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                      المبلغ المطلوب دفعه
                    </label>
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: 'var(--radius-md)',
                        color: '#92400e',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                      }}
                    >
                      0 دج (معفى كلياً من دفع الاشتراك)
                    </div>
                  </div>
                ) : (
                  <Input
                    label={`المبلغ المسدد نقداً (من أصل ${formatDZD(activeCourse?.monthlyPrice || 0)})`}
                    type="number"
                    value={enrollStdPaidAmount}
                    onChange={(e) => setEnrollStdPaidAmount(e.target.value)}
                    required
                  />
                )}
              </div>

              {/* Late enrollment / Missed sessions option (خيار التحاق متأخر وفاتته حصص - تعرف تلقائي) */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: enrollHasMissedSessions ? '#fffbeb' : 'var(--color-bg-app)',
                  border: enrollHasMissedSessions ? '1.5px solid #f59e0b' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setEnrollHasMissedSessions(!enrollHasMissedSessions)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="enrollHasMissedSessions"
                      checked={enrollHasMissedSessions}
                      onChange={(e) => setEnrollHasMissedSessions(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
                    />
                    <div>
                      <label
                        htmlFor="enrollHasMissedSessions"
                        style={{
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: enrollHasMissedSessions ? '#92400e' : 'var(--color-text-primary)',
                          display: 'block',
                        }}
                      >
                        التحاق متأخر بالفوج (فاتته حصة أو أكثر)
                      </label>
                      <div style={{ fontSize: '0.75rem', color: enrollHasMissedSessions ? '#b45309' : 'var(--color-text-muted)', marginTop: '2px' }}>
                        {activeCourse && (
                          <span>
                            التعرف التلقائي: الفوج حالياً في <strong>الحصة {calculateCurrentGroupSession(activeCourse)}</strong> (المعادلة: الحصة {calculateCurrentGroupSession(activeCourse)} - 1 = {calculateAutoMissedSessions(activeCourse)} حصص فائتة)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: enrollHasMissedSessions ? '#fef3c7' : 'var(--color-bg-surface-secondary)',
                      color: enrollHasMissedSessions ? '#92400e' : 'var(--color-text-secondary)',
                      border: enrollHasMissedSessions ? '1px solid #fde68a' : 'none',
                    }}
                  >
                    ⚠️ حصص فائتة
                  </span>
                </div>

                {enrollHasMissedSessions && (
                  <div
                    style={{
                      paddingTop: '10px',
                      borderTop: '1px dashed #fde68a',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '150px' }}>
                        <Input
                          label="عدد الحصص الفائتة"
                          type="number"
                          min="1"
                          max="20"
                          value={enrollStdMissedSessions}
                          onChange={(e) => setEnrollStdMissedSessions(e.target.value)}
                          placeholder="1 أو 2..."
                          required={enrollHasMissedSessions}
                        />
                      </div>
                      <div style={{ flex: 1, fontSize: '0.75rem', color: '#92400e', lineHeight: 1.5 }}>
                        {activeCourse && (
                          <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                            ℹ️ محسوبة تلقائياً: الفوج وصل للحصة {calculateCurrentGroupSession(activeCourse)}، وفاتته {calculateAutoMissedSessions(activeCourse)} حصة.
                          </div>
                        )}
                        يمكنك تعديل عدد الحصص الفائتة يدوياً إن لزم الأمر.
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        color: '#92400e',
                        lineHeight: 1.5,
                      }}
                    >
                      💡 <strong>توضيح كشف الحضور:</strong> الحصص الفائتة لا تخصم أبداً من رصيد حصص التلميذ المدفوعة (يحتفظ بكامل باقته {enrollStdTotalSessions || 4} حصص للمستقبل)، بل تظهر كخلايا فارغة في كشف الحضور الكلاسيكي لتوضيح أنه التحق متأخراً عن الفوج.
                    </div>
                  </div>
                )}
              </div>

              {/* Attendance Today Option: تسجيل كحاضر اليوم مباشرة */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: enrollMarkPresentToday ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-bg-app)',
                  border: enrollMarkPresentToday ? '1.5px solid #10b981' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setEnrollMarkPresentToday(!enrollMarkPresentToday)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="enrollMarkPresentToday"
                    checked={enrollMarkPresentToday}
                    onChange={(e) => setEnrollMarkPresentToday(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <div>
                    <label
                      htmlFor="enrollMarkPresentToday"
                      style={{
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: enrollMarkPresentToday ? '#065f46' : 'var(--color-text-primary)',
                        display: 'block',
                      }}
                    >
                      تسجيل التلميذ كحاضر اليوم مباشرة ({activeCourse ? `الحصة رقم ${calculateCurrentGroupSession(activeCourse)}` : 'اليوم'})
                    </label>
                    <div style={{ fontSize: '0.75rem', color: enrollMarkPresentToday ? '#047857' : 'var(--color-text-muted)', marginTop: '2px' }}>
                      تسجيل حضور الحصة الأولى له في رصيده لليوم تلقائياً (تظهر علامة ✓ في كشف الحضور)
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: enrollMarkPresentToday ? '#d1fae5' : 'var(--color-bg-surface-secondary)',
                    color: enrollMarkPresentToday ? '#065f46' : 'var(--color-text-secondary)',
                    border: enrollMarkPresentToday ? '1px solid #a7f3d0' : 'none',
                  }}
                >
                  ✓ تسجيل حضور اليوم
                </span>
              </div>

              <Input
                label="ملاحظات إضافية (اختياري)"
                placeholder="ملاحظات خاصة بالتلميذ..."
                value={enrollStdNotes}
                onChange={(e) => setEnrollStdNotes(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: 'var(--space-2)' }}>
                <Button type="submit" variant="primary" rightIcon={<UserPlus size={15} />}>
                  تأكيد إضافة التلميذ للفوج
                </Button>
                <Button type="button" variant="secondary" onClick={() => setIsEnrollModalOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Renew Subscription Modal with Auto-Deduction */}
      <Modal
        isOpen={!!studentToRenew}
        onClose={() => setStudentToRenew(null)}
        title={`إعادة اشتراك التلميذ: ${studentToRenew?.fullName}`}
        description="تجديد باقة الحصص واقتطاع عدد الحصص المتجاوزة تلقائياً"
        maxWidth="500px"
      >
        {studentToRenew && activeCourse && (() => {
          const previousQuota =
            studentToRenew.totalSessions && studentToRenew.totalSessions > 0
              ? studentToRenew.totalSessions
              : activeCourse.totalSessionsDefault && activeCourse.totalSessionsDefault > 0
              ? activeCourse.totalSessionsDefault
              : 4;
          const isOverdue = (studentToRenew.attendedSessions || 0) > previousQuota;
          const overageCount = Math.max(0, (studentToRenew.attendedSessions || 0) - previousQuota);

          return (
            <form onSubmit={handleRenew} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Overage Notice Box */}
              {isOverdue ? (
                <div
                  style={{
                    padding: 'var(--space-3) var(--space-3-5)',
                    backgroundColor: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2-5)',
                  }}
                >
                  <AlertTriangle size={20} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                    <strong>تنبيه تجاوز الحصص:</strong> استهلك التلميذ{' '}
                    <strong style={{ color: 'var(--color-danger)' }}>
                      {studentToRenew.attendedSessions} حصص
                    </strong>{' '}
                    من أصل {previousQuota}.
                    <br />
                    سيتم <strong>اقتطاع {overageCount} حصص تلقائياً</strong> من باقة الاشتراك الجديدة.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 'var(--space-3) var(--space-3-5)',
                    backgroundColor: 'var(--color-bg-surface-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                  }}
                >
                  الدورة: <strong>{activeCourse.title}</strong> • سعر الدورة:{' '}
                  <strong>{formatDZD(activeCourse.monthlyPrice)}</strong> • الحصص السابقة للباقة:{' '}
                  <strong>{previousQuota} حصص</strong>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <Input
                  label="عدد الحصص الجديدة في الباقة"
                  type="number"
                  value={renewSessionsCount}
                  onChange={(e) => setRenewSessionsCount(e.target.value)}
                  required
                />

                <Input
                  label={`المبلغ المسدد الآن (دج DZD) • الحد الأقصى: ${formatDZD(activeCourse.monthlyPrice || 0)}`}
                  type="number"
                  min="0"
                  max={String(activeCourse.monthlyPrice || '')}
                  value={renewPaidAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const maxPrice = activeCourse.monthlyPrice || 0;
                    if (maxPrice > 0 && Number(val) > maxPrice) {
                      setRenewPaidAmount(String(maxPrice));
                    } else {
                      setRenewPaidAmount(val);
                    }
                  }}
                  required
                />
              </div>

              {/* Calculated Result Preview */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-primary-light)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>رصيد الحصص بعد التجديد:</span>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'monospace' }}>
                  {overageCount} / {renewSessionsCount}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'var(--space-2)' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={(e) => handleRenew(e, true)}
                  rightIcon={<Printer size={15} />}
                >
                  تجديد وطباعة الوصل
                </Button>
                <Button type="submit" variant="secondary" rightIcon={<RotateCw size={14} />}>
                  تجديد فقط
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStudentToRenew(null)}>
                  إلغاء
                </Button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Single Session Attendance & Payment Modal */}
      <Modal
        isOpen={!!studentForSingleSession}
        onClose={() => setStudentForSingleSession(null)}
        title="تسجيل حضور حصة واحدة وتسديد مستحقاتها"
        description="تسديد رسم حصة واحدة للتلميذ وتحديد نصيب الأستاذ منها مباشرة"
        maxWidth="480px"
      >
        {studentForSingleSession && activeCourse && (
          <form onSubmit={(e) => handleConfirmSingleSession(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>التلميذ:</span>
                <strong>{studentForSingleSession.fullName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>الفوج:</span>
                <span>{activeCourse.title} ({activeCourse.teacherName})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>رصيد الحصص الحالي:</span>
                <span style={{ fontWeight: 700 }}>
                  {studentForSingleSession.attendedSessions || 0} / {studentForSingleSession.totalSessions || 5} حصص
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              <Input
                label="سعر الحصة الواحدة (دج DZD)"
                type="number"
                value={singleSessionPrice}
                onChange={(e) => setSingleSessionPrice(e.target.value)}
                placeholder="مثلاً: 1000"
                required
                min="0"
                autoFocus
              />

              <Input
                label="مبلغ للأستاذ من الحصة (دج DZD)"
                type="number"
                value={singleSessionTeacherAmount}
                onChange={(e) => setSingleSessionTeacherAmount(e.target.value)}
                placeholder="مثلاً: 600"
                required
                min="0"
              />
            </div>

            {(() => {
              const p = Number(singleSessionPrice) || 0;
              const t = Number(singleSessionTeacherAmount) || 0;
              const schoolShare = Math.max(0, p - t);
              return (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--color-bg-app)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ color: 'var(--color-text-secondary)' }}>نصيب المؤسسة الصافي:</span>
                  <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.9375rem' }}>
                    {formatDZD(schoolShare)}
                  </span>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              <Input
                label="تاريخ الحصة"
                type="date"
                value={singleSessionDate}
                onChange={(e) => setSingleSessionDate(e.target.value)}
                required
              />
              <Input
                label="ملاحظات (اختياري)"
                value={singleSessionNotes}
                onChange={(e) => setSingleSessionNotes(e.target.value)}
                placeholder="ملاحظات حول الحصة..."
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid #3b82f6',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: '#1d4ed8',
              }}
            >
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0 }} />
              <span>
                ستظهر هذه الحصة كـ <strong>دائرة زرقاء</strong> في شريط متابعة الحصص، وتُدرج مباشرة في مستحقات وكشف حساب الأستاذ.
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'var(--space-2)' }}>
              <Button
                type="button"
                variant="primary"
                onClick={(e) => handleConfirmSingleSession(e, true)}
                rightIcon={<Printer size={15} />}
                style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8' }}
              >
                تسجيل وطباعة الوصل
              </Button>
              <Button type="submit" variant="secondary" rightIcon={<Coins size={14} />}>
                تسجيل الحصة فقط
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStudentForSingleSession(null)}>
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Convert Single Session to Course Subscription Modal */}
      <Modal
        isOpen={!!studentToConvertToCourse}
        onClose={() => setStudentToConvertToCourse(null)}
        title={`الاشتراك في دورة جديدة: ${studentToConvertToCourse?.fullName}`}
        description="تسجيل اشتراك تلميذ نظام الحصة في دورة كاملة مع حفظ مستحقات الأستاذ من الحصص الفردية السابقة"
        maxWidth="520px"
      >
        {studentToConvertToCourse && activeCourse && (() => {
          const singleLogs = (studentToConvertToCourse.attendanceLogs || []).filter(
            (l) => l.status === 'single_session' || l.type === 'single_session'
          );
          const singlesCount = singleLogs.length;
          const teacherEarnedFromSingles = singleLogs.reduce((acc, l) => acc + (l.teacherAmount || 0), 0);
          const totalPaidForSingles = singleLogs.reduce((acc, l) => acc + (l.amount || 0), 0);
          const coursePrice = activeCourse.monthlyPrice || 0;
          const paidAmtNum = Number(courseSubscriptionPaidAmount) || 0;
          const remainingDebt = Math.max(0, coursePrice - paidAmtNum);
          const newSessionsNum = Number(courseSubscriptionSessionsCount) || 4;

          return (
            <form onSubmit={(e) => handleConfirmConvertToCourse(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Informational Banner */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700, fontSize: '0.875rem' }}>
                  <GraduationCap size={18} color="#059669" />
                  <span>الاشتراك في دورة كاملة (اشتراك جديد)</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#047857', lineHeight: 1.5 }}>
                  • درس التلميذ سابقاً: <strong>{singlesCount} حصص بنظام الحصة</strong> (سدّد عنها: {formatDZD(totalPaidForSingles)}).
                  <br />
                  • مستحقات الأستاذ المحفوظة: <strong>{formatDZD(teacherEarnedFromSingles)}</strong> ستبقى مسجلة في حسابه ومستحقاته دون فقدانها.
                  <br />
                  • سيبدأ التلميذ باقة الدورة الجديدة من <strong>(0 / {newSessionsNum} حصص)</strong> دون احتساب الحصص الفردية كتجاوز.
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-bg-surface-secondary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>الدورة: <strong>{activeCourse.title}</strong></span>
                <span>سعر الدورة: <strong>{formatDZD(coursePrice)}</strong></span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <Input
                  label="عدد حصص الدورة الجديدة"
                  type="number"
                  min="1"
                  value={courseSubscriptionSessionsCount}
                  onChange={(e) => setCourseSubscriptionSessionsCount(e.target.value)}
                  required
                />

                <Input
                  label="المبلغ المسدد الآن (دج DZD)"
                  type="number"
                  min="0"
                  value={courseSubscriptionPaidAmount}
                  onChange={(e) => setCourseSubscriptionPaidAmount(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <Input
                  label="تاريخ الاشتراك"
                  type="date"
                  value={courseSubscriptionDate}
                  onChange={(e) => setCourseSubscriptionDate(e.target.value)}
                  required
                />

                <Input
                  label="ملاحظات (اختياري)"
                  placeholder="ملاحظات إضافية حول الاشتراك..."
                  value={courseSubscriptionNotes}
                  onChange={(e) => setCourseSubscriptionNotes(e.target.value)}
                />
              </div>

              {/* Live Preview Box */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: remainingDebt > 0 ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${remainingDebt > 0 ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>رصيد الحصص للدورة الجديدة: </span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.9375rem' }}>0 / {newSessionsNum}</strong>
                </div>
                <div>
                  {remainingDebt > 0 ? (
                    <Badge variant="danger" style={{ fontWeight: 700 }}>
                      دين متبقي: {formatDZD(remainingDebt)}
                    </Badge>
                  ) : (
                    <Badge variant="success" style={{ fontWeight: 700 }}>
                      خالص بالكامل (0 دج دين)
                    </Badge>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'var(--space-2)' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={(e) => handleConfirmConvertToCourse(e, true)}
                  rightIcon={<Printer size={15} />}
                  style={{ backgroundColor: '#059669', borderColor: '#047857' }}
                >
                  تأكيد الاشتراك وطباعة الوصل
                </Button>
                <Button type="submit" variant="secondary" rightIcon={<Check size={14} />}>
                  تأكيد الاشتراك فقط
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStudentToConvertToCourse(null)}>
                  إلغاء
                </Button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Course Subscription Receipt Modal */}
      <Modal
        isOpen={!!printedCourseSubscriptionReceipt}
        onClose={() => setPrintedCourseSubscriptionReceipt(null)}
        title="وصل اشتراك في دورة جديدة"
        description="تم تسجيل اشتراك التلميذ في الدورة بنجاح. يمكنك طباعة الوصل الآن"
        maxWidth="420px"
      >
        {printedCourseSubscriptionReceipt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div
              style={{
                border: '1.5px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                backgroundColor: 'var(--color-bg-surface-secondary)',
                fontSize: '0.8125rem',
                lineHeight: 1.6,
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9375rem', marginBottom: '2px' }}>
                {currentSchool?.name || 'مدرستي التعليمية'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginBottom: '8px' }}>
                وصل اشتراك جديد في دورة تعليمية
              </div>
              <div style={{ borderTop: '1px dashed var(--color-border)', margin: '8px 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>رقم السند:</span>
                <strong style={{ fontFamily: 'monospace' }}>{printedCourseSubscriptionReceipt.receiptNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>التاريخ:</span>
                <span>{formatDateArabic(printedCourseSubscriptionReceipt.date || new Date().toISOString().split('T')[0])}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>التلميذ:</span>
                <strong style={{ color: 'var(--color-text-primary)' }}>{printedCourseSubscriptionReceipt.studentName}</strong>
              </div>
              {printedCourseSubscriptionReceipt.studentPhone && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>الهاتف:</span>
                  <span style={{ fontFamily: 'monospace' }}>{formatAlgerianPhone(printedCourseSubscriptionReceipt.studentPhone)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>الدورة / الفوج:</span>
                <span>{printedCourseSubscriptionReceipt.courseTitle}</span>
              </div>
              {printedCourseSubscriptionReceipt.teacherName && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>الأستاذ:</span>
                  <span>{printedCourseSubscriptionReceipt.teacherName}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>باقة الحصص الجديدة:</span>
                <strong style={{ color: '#059669' }}>{printedCourseSubscriptionReceipt.sessionsCount} حصص (0 مستهلك)</strong>
              </div>
              {printedCourseSubscriptionReceipt.previousSingleSessionsCount > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '4px 6px', borderRadius: '4px', margin: '4px 0' }}>
                  درس سابقاً: {printedCourseSubscriptionReceipt.previousSingleSessionsCount} حصص فردية مسددة (مستحقات الأستاذ محفوظة: {formatDZD(printedCourseSubscriptionReceipt.teacherEarnedFromSingles)})
                </div>
              )}

              <div
                style={{
                  margin: '10px 0 6px',
                  padding: '10px',
                  backgroundColor: 'rgba(5, 150, 105, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#047857' }}>المبلغ المسدد للدورة:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                  {formatDZD(printedCourseSubscriptionReceipt.paidAmount)}
                </div>
                {printedCourseSubscriptionReceipt.addedDebt > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px', fontWeight: 700 }}>
                    دين متبقي: {formatDZD(printedCourseSubscriptionReceipt.addedDebt)}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="primary"
                onClick={() => handlePrintCourseSubscriptionReceipt(printedCourseSubscriptionReceipt)}
                rightIcon={<Printer size={15} />}
                style={{ backgroundColor: '#059669', borderColor: '#047857' }}
              >
                طباعة الوصل
              </Button>
              <Button variant="secondary" onClick={() => setPrintedCourseSubscriptionReceipt(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Single Session Receipt Modal */}
      <Modal
        isOpen={!!printedSingleSessionReceipt}
        onClose={() => setPrintedSingleSessionReceipt(null)}
        title="وصل تسديد حصة واحدة"
        description="تم تسجيل الحصة الواحدة بنجاح. يمكنك إعادة طباعة الوصل الآن"
        maxWidth="420px"
      >
        {printedSingleSessionReceipt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div
              style={{
                border: '1.5px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                backgroundColor: 'var(--color-bg-surface-secondary)',
                fontSize: '0.8125rem',
                lineHeight: 1.6,
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9375rem', marginBottom: '2px' }}>
                {currentSchool?.name || 'مدرستي التعليمية'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                وصل تسديد حصة واحدة
              </div>
              <div style={{ borderTop: '1px dashed var(--color-border)', margin: '8px 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>رقم السند:</span>
                <strong style={{ fontFamily: 'monospace' }}>{printedSingleSessionReceipt.receiptNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>التاريخ:</span>
                <span>{formatDateArabic(printedSingleSessionReceipt.date)} - {printedSingleSessionReceipt.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>التلميذ:</span>
                <strong>{printedSingleSessionReceipt.studentName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>الفوج:</span>
                <span>{printedSingleSessionReceipt.courseTitle}</span>
              </div>
              {printedSingleSessionReceipt.teacherName && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>الأستاذ:</span>
                  <span>{printedSingleSessionReceipt.teacherName}</span>
                </div>
              )}
              <div
                style={{
                  margin: '10px 0 6px',
                  padding: '10px',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>المبلغ المسدد للحصة:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8' }}>
                  {formatDZD(printedSingleSessionReceipt.sessionPrice)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '2px' }}>
                  (مستحق الأستاذ: {formatDZD(printedSingleSessionReceipt.teacherAmount)})
                </div>
              </div>

              {printedSingleSessionReceipt.notes && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  ملاحظات: {printedSingleSessionReceipt.notes}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="primary"
                onClick={() => handlePrintSingleSessionReceipt(printedSingleSessionReceipt)}
                rightIcon={<Printer size={15} />}
                style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8' }}
              >
                طباعة الوصل
              </Button>
              <Button variant="secondary" onClick={() => setPrintedSingleSessionReceipt(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Ultra-Simple Renewal Receipt Modal */}
      <Modal
        isOpen={!!printedReceipt}
        onClose={() => setPrintedReceipt(null)}
        title="وصل تجديد الاشتراك"
        description="تم تجديد اشتراك التلميذ بنجاح. يمكنك طباعة الوصل البسيط الآن"
        maxWidth="420px"
      >
        {printedReceipt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div
              style={{
                border: '1.5px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                backgroundColor: 'var(--color-bg-surface-secondary)',
                fontSize: '0.8125rem',
                lineHeight: 1.6,
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9375rem', marginBottom: '2px' }}>
                {currentSchool?.name || 'مدرستي التعليمية'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                وصل تجديد اشتراك باقة حصص
              </div>
              <div style={{ borderTop: '1px dashed var(--color-border)', margin: '8px 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>رقم السند:</span>
                <strong style={{ fontFamily: 'monospace' }}>{printedReceipt.receiptNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>التاريخ:</span>
                <span>{formatDateArabic(printedReceipt.date || new Date().toISOString().split('T')[0])}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>التلميذ:</span>
                <strong>{printedReceipt.studentName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>الفوج / الدورة:</span>
                <span>{printedReceipt.courseTitle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>باقة الحصص:</span>
                <strong>{printedReceipt.sessionsCount} حصص</strong>
              </div>
              {printedReceipt.overageDeducted > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>حصص مقتطعة من التجاوز:</span>
                  <span>{printedReceipt.overageDeducted} حصص</span>
                </div>
              )}

              <div
                style={{
                  margin: '10px 0 6px',
                  padding: '8px',
                  backgroundColor: 'var(--color-bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '0.9375rem',
                  color: 'var(--color-primary)',
                }}
              >
                المبلغ المسدد: {printedReceipt.paidAmount.toLocaleString('fr-DZ')} دج
              </div>

              {printedReceipt.remainingDebt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-warning)', fontWeight: 700 }}>
                  <span>المتبقي في الذمة:</span>
                  <span>{printedReceipt.remainingDebt.toLocaleString('fr-DZ')} دج</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
              <Button
                variant="primary"
                onClick={() => handlePrintSimpleRenewalReceipt(printedReceipt)}
                rightIcon={<Printer size={15} />}
              >
                طباعة الوصل الآن
              </Button>
              <Button variant="secondary" onClick={() => setPrintedReceipt(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Absence Confirmation Modal */}
      <Modal
        isOpen={!!studentForAbsence}
        onClose={() => setStudentForAbsence(null)}
        title={`تسجيل غياب التلميذ: ${studentForAbsence?.fullName}`}
        description="اختر نوع الغياب لتحديد ما إذا كانت الحصة ستُقتطع من رصيد التلميذ وتُحتسب في مستحقات الأستاذ أم لا"
        maxWidth="540px"
      >
        {studentForAbsence && activeCourse && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-bg-app)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.8125rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                الفوج: <strong>{activeCourse.title}</strong>
              </div>
              <div>
                الحصص المسجلة حالياً: <strong>{studentForAbsence.attendedSessions || 0} من {studentForAbsence.totalSessions || 5}</strong>
              </div>
            </div>

            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              هل تود تسجيل حصة الغياب على أنها محسوبة عنه أم لا؟
            </div>

            <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
              {/* Option 1: Counted Absence (Red) */}
              <div
                onClick={() => handleConfirmAbsence(true)}
                style={{
                  padding: '16px 14px',
                  borderRadius: 'var(--radius-lg)',
                  border: '2px solid #ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.125rem',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  ✕
                </div>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.9375rem' }}>
                  غياب محسوب (أحمر)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, minHeight: '40px' }}>
                  تُقتطع الحصة من رصيد التلميذ، وتُحتسب كحصة منجزة في مستحقات الأستاذ المالية.
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  style={{ width: '100%', marginTop: '4px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmAbsence(true);
                  }}
                >
                  تأكيد: غياب محسوب
                </Button>
              </div>

              {/* Option 2: Uncounted Absence (Orange) */}
              <div
                onClick={() => handleConfirmAbsence(false)}
                style={{
                  padding: '16px 14px',
                  borderRadius: 'var(--radius-lg)',
                  border: '2px solid #f97316',
                  backgroundColor: 'rgba(249, 115, 22, 0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#f97316',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    boxShadow: '0 2px 6px rgba(249, 115, 22, 0.4)',
                  }}
                >
                  —
                </div>
                <div style={{ fontWeight: 700, color: '#c2410c', fontSize: '0.9375rem' }}>
                  غياب معفى (تجاوز يوم)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, minHeight: '40px' }}>
                  تجاوز لليوم: لا تُقتطع الحصة من باقة التلميذ (تظل كحصة رمادية متبقية)، وتُحسب في الحصة القادمة عند حضوره.
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ width: '100%', marginTop: '4px', borderColor: '#f97316', color: '#c2410c' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmAbsence(false);
                  }}
                >
                  تأكيد: غياب معفى
                </Button>
              </div>
            </div>

            <Input
              label="سبب أو ملاحظة الغياب (اختياري)"
              placeholder="مثال: غياب مبرر بشهادة طبية، ظرف عائلي، سفر..."
              value={absenceNote}
              onChange={(e) => setAbsenceNote(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
              <Button variant="secondary" onClick={() => setStudentForAbsence(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Session Attendance Logs History Modal */}
      <Modal
        isOpen={!!studentForLogs}
        onClose={() => setStudentForLogs(null)}
        title={`سجل حضور وغياب وحساب استحقاق: ${studentForLogs?.fullName}`}
        description={`الفوج: ${activeCourse?.title || studentForLogs?.enrolledCourseTitle || ''}`}
        maxWidth="560px"
      >
        {studentForLogs && (() => {
          const studentCourse = courses.find((c) => c.enrolledList?.some((s) => s.id === studentForLogs.id)) || activeCourse;
          const coursePrice = studentCourse?.monthlyPrice || 6000;
          const totalSessions = studentForLogs.totalSessions || 5;

          const logs = studentForLogs.attendanceLogs || [];
          const lastRenewalIdx = logs.findIndex((l) => l.status === 'renewed');
          const currentLogs = lastRenewalIdx === -1 ? logs : logs.slice(0, lastRenewalIdx);

          const presentLogs = currentLogs.filter((l) => l.status === 'present');
          const absentCountedLogs = currentLogs.filter((l) => l.status === 'absent_counted');
          const absentUncountedLogs = currentLogs.filter((l) => l.status === 'absent_uncounted');

          const presentCount = presentLogs.length > 0 || absentCountedLogs.length > 0 ? presentLogs.length : (studentForLogs.attendedSessions || 0);
          const absentCounted = absentCountedLogs.length;
          const absentUncounted = absentUncountedLogs.length;
          const consumedSessions = studentForLogs.attendedSessions || 0;
          const remainingSessions = Math.max(0, totalSessions - consumedSessions);
          const sessionPrice = Math.round(coursePrice / (totalSessions > 0 ? totalSessions : 5));
          const refundableAmount = remainingSessions * sessionPrice;

          // Lifetime total consumed across all renewal packages
          const totalAllPresent = logs.filter((l) => l.status === 'present').length;
          const totalAllAbsentCounted = logs.filter((l) => l.status === 'absent_counted').length;
          const totalLifetimeConsumed = Math.max(
            totalAllPresent + totalAllAbsentCounted,
            studentForLogs.attendedSessions || 0
          );

          const handlePrintStudentStatement = () => {
            const schoolName = currentSchool?.name || 'مدرستي التعليمية';
            const now = new Date();
            const formattedDate = `${formatDateArabic(now.toISOString().split('T')[0])} - ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

            const logRows = logs.map((l, idx) => {
              let statusBadgeText = 'حضور';
              let statusColor = '#16a34a';
              if (l.status === 'absent_counted') {
                statusBadgeText = 'غياب محسوب (مقتطع)';
                statusColor = '#dc2626';
              } else if (l.status === 'absent_uncounted') {
                statusBadgeText = 'غياب غير محسوب / معفى';
                statusColor = '#ea580c';
              } else if (l.status === 'single_session') {
                statusBadgeText = `حضور حصة واحدة مسددة (${l.amount ? `${l.amount.toLocaleString('fr-DZ')} دج` : ''} - للأستاذ: ${l.teacherAmount ? `${l.teacherAmount.toLocaleString('fr-DZ')} دج` : ''})`;
                statusColor = '#2563eb';
              } else if (l.status === 'renewed') {
                statusBadgeText = 'تجديد اشتراك باقة';
                statusColor = '#2563eb';
              } else if (l.status === 'payment') {
                statusBadgeText = `تسديد مالي (${l.amount ? `${l.amount.toLocaleString('fr-DZ')} دج` : 'نقداً'})`;
                statusColor = '#059669';
              }

              const sessionLabel =
                l.status === 'payment'
                  ? 'سند قبض'
                  : l.sessionNumber > 0
                  ? `حصة ${l.sessionNumber}`
                  : 'تجديد';

              return `
                <tr>
                  <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
                  <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: bold;">${sessionLabel}</td>
                  <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${l.date}</td>
                  <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${l.time || '—'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-weight: bold; color: ${statusColor};">${statusBadgeText}</td>
                  <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-size: 10px; color: #4b5563;">${l.notes || '—'}</td>
                </tr>
              `;
            }).join('');

            const printWindow = window.open('', '_blank', 'width=800,height=750');
            if (!printWindow) {
              alert('يرجى السماح بالنوافذ المنبثقة (Popups) للتمكن من طباعة الكشف.');
              return;
            }

            printWindow.document.write(`
              <!DOCTYPE html>
              <html dir="rtl" lang="ar">
              <head>
                <meta charset="utf-8">
                <title>كشف حضور وحصص التلميذ - ${studentForLogs.fullName}</title>
                <style>
                  @page { size: A4 portrait; margin: 15mm; }
                  body {
                    font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
                    margin: 0;
                    padding: 10px;
                    color: #111827;
                    background: #fff;
                    direction: rtl;
                    font-size: 11.5px;
                    line-height: 1.5;
                  }
                  .header-box {
                    border-bottom: 2px solid #1e3a8a;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  }
                  .title { font-size: 18px; font-weight: 800; color: #1e3a8a; }
                  .grid-summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 16px;
                  }
                  .card {
                    border: 1px solid #e5e7eb;
                    background-color: #f9fafb;
                    padding: 10px;
                    border-radius: 6px;
                  }
                  .card-title { font-size: 10px; color: #6b7280; margin-bottom: 3px; }
                  .card-val { font-size: 14px; font-weight: 800; }
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 16px;
                    font-size: 11px;
                  }
                  th {
                    background-color: #f3f4f6;
                    color: #1f2937;
                    padding: 7px 8px;
                    border: 1px solid #d1d5db;
                    text-align: right;
                    font-weight: 700;
                  }
                  .refund-box {
                    padding: 12px;
                    border: 1px solid #93c5fd;
                    background-color: #eff6ff;
                    border-radius: 6px;
                    margin-bottom: 16px;
                    font-size: 11px;
                  }
                  .signatures {
                    margin-top: 30px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    page-break-inside: avoid;
                  }
                  .sig-box {
                    border-top: 1px dashed #9ca3af;
                    padding-top: 8px;
                    text-align: center;
                    font-weight: 600;
                    font-size: 11px;
                  }
                  @media print { body { padding: 0; } }
                </style>
              </head>
              <body>
                <div class="header-box">
                  <div>
                    <div class="title">${schoolName}</div>
                    <div style="font-size: 13px; font-weight: 700; color: #4b5563;">كشف تفصيلي لحضور وغيابات التلميذ وحساب الاستحقاق المالي</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 3px;">
                      التلميذ: <strong>${studentForLogs.fullName}</strong> | الفوج: <strong>${studentForLogs.enrolledCourseTitle || studentCourse?.title || '—'}</strong>
                    </div>
                  </div>
                  <div style="text-align: left; font-size: 10px; color: #4b5563;">
                    <div>تاريخ الاستخراج: <strong>${formattedDate}</strong></div>
                    <div>هاتف التلميذ: <strong>${studentForLogs.phone}</strong></div>
                    ${studentForLogs.parentPhone ? `<div>هاتف ولي الأمر: <strong>${studentForLogs.parentPhone}</strong></div>` : ''}
                  </div>
                </div>

                <div class="grid-summary">
                  <div class="card">
                    <div class="card-title">إجمالي الحصص المقررة</div>
                    <div class="card-val" style="color: #1e3a8a;">${totalSessions} حصص</div>
                  </div>
                  <div class="card">
                    <div class="card-title">حضور فعلي (مؤكد)</div>
                    <div class="card-val" style="color: #16a34a;">${presentCount} حصص</div>
                  </div>
                  <div class="card">
                    <div class="card-title">غياب محسوب (مقتطع)</div>
                    <div class="card-val" style="color: #dc2626;">${absentCounted} حصة</div>
                  </div>
                  <div class="card">
                    <div class="card-title">الحصص المتبقية (غير المستهلكة)</div>
                    <div class="card-val" style="color: #2563eb;">${remainingSessions} حصص</div>
                  </div>
                </div>

                <div class="refund-box">
                  <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">
                    بيان التسوية المالية والاسترداد في حال الانسحاب والانقطاع:
                  </div>
                  ${studentForLogs.isExempt ? `
                    <div style="margin-bottom: 6px; padding: 4px 8px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; color: #92400e; font-weight: bold;">
                      • حالة التلميذ: تلميذ معفى من تسديد مصاريف الدورة (لا تترتب عليه أي مستحقات أو مبالغ استرداد مالية).
                    </div>
                  ` : ''}
                  <div>• سعر باقة الاشتراك الشهري: <strong>${coursePrice.toLocaleString('fr-DZ')} دج</strong> (معدل الحصة الواحدة: <strong>${sessionPrice.toLocaleString('fr-DZ')} دج</strong>).</div>
                  <div>• إجمالي الحصص المستهلكة (حضور + غياب محسوب تم حجز المقعد والأستاذ له): <strong>${consumedSessions} حصص</strong>.</div>
                  <div>• الحصص المتبقية التي لم تبدأ بعد: <strong>${remainingSessions} حصص</strong>.</div>
                  <div style="margin-top: 6px; font-weight: 800; font-size: 12px; color: #1e40af;">
                    المبلغ المالي المستحق للاسترداد قانونياً في حال الانسحاب: ${studentForLogs.isExempt ? '0 دج (تلميذ معفى)' : refundableAmount > 0 ? `${refundableAmount.toLocaleString('fr-DZ')} دج` : '0 دج (تم استهلاك كامل الباقة)'}
                  </div>
                </div>

                <div style="font-weight: 700; margin-bottom: 6px; color: #1e3a8a;">
                  السجل الزمني المؤرخ لجميع الحصص المسجلة:
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 30px; text-align: center;">#</th>
                      <th style="width: 60px; text-align: center;">رقم الحصة</th>
                      <th>التاريخ</th>
                      <th>التوقيت</th>
                      <th>الحالة والتصنيف</th>
                      <th>الملاحظات والسبب المسجل</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${logRows || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #9ca3af;">لا توجد حصص مسجلة حتى الآن</td></tr>'}
                  </tbody>
                </table>

                <div class="signatures">
                  <div class="sig-box">
                    توقيع واستلام التلميذ / ولي الأمر
                    <div style="height: 40px;"></div>
                  </div>
                  <div class="sig-box">
                    توقيع وختم إدارة المدرسة
                    <div style="height: 40px;"></div>
                  </div>
                </div>

                <script>
                  window.onload = function() {
                    window.print();
                  };
                </script>
              </body>
              </html>
            `);
            printWindow.document.close();
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Financial Status Badge Card */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor:
                    studentForLogs.totalDebt > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: studentForLogs.totalDebt > 0 ? '1.5px solid #f87171' : '1px solid #6ee7b7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {studentForLogs.totalDebt > 0 ? (
                    <AlertTriangle size={16} color="#ef4444" />
                  ) : (
                    <CheckCircle2 size={16} color="#10b981" />
                  )}
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    الوضعية المالية للمستحقات:
                  </span>
                </div>
                {studentForLogs.isExempt ? (
                  <Badge
                    variant="warning"
                    style={{
                      fontWeight: 800,
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #f59e0b',
                    }}
                  >
                    تلميذ معفى من تسديد مصاريف الدورة (0 دج)
                  </Badge>
                ) : studentForLogs.totalDebt > 0 ? (
                  <Badge
                    variant="danger"
                    style={{
                      fontWeight: 800,
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #f87171',
                    }}
                  >
                    غير مسدد (متبقي بذمته: {formatDZD(studentForLogs.totalDebt)})
                  </Badge>
                ) : (
                  <Badge variant="success">
                    خالص ومسدد بالكامل (إجمالي المسدد: {formatDZD(studentForLogs.totalPaid || 0)})
                  </Badge>
                )}
              </div>

              {/* Quota & Refund Audit Card */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-bg-app)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    تدقيق الحصص وحساب الاسترداد المالي:
                  </span>
                  <Badge variant={remainingSessions > 0 ? 'info' : 'success'}>
                    {remainingSessions > 0 ? `متبقي ${remainingSessions} حصص` : 'الباقة مكتملة'}
                  </Badge>
                </div>

                {/* Quota badges row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <div style={{ padding: '6px', textAlign: 'center', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>حضور</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#10b981' }}>{presentCount}</div>
                  </div>
                  <div style={{ padding: '6px', textAlign: 'center', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>غياب مقتطع</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#ef4444' }}>{absentCounted}</div>
                  </div>
                  <div style={{ padding: '6px', textAlign: 'center', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>غياب معفى</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#f97316' }}>{absentUncounted}</div>
                  </div>
                  <div style={{ padding: '6px', textAlign: 'center', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>متبقي</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-primary)' }}>{remainingSessions}</div>
                  </div>
                </div>

                {/* Legal Refund Notice */}
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, backgroundColor: 'var(--color-bg-surface)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <div>• باقة الاشتراك الحالية: <strong>{consumedSessions} من أصل {totalSessions} حصص مستهلكة</strong> (الحضور والغياب المحسوب لا يُسترد لحجز المقعد والأستاذ).</div>
                  {totalLifetimeConsumed > consumedSessions && (
                    <div style={{ marginTop: '2px', color: 'var(--color-primary)' }}>
                      • إجمالي الحصص المستهلكة تاريخياً عبر جميع الاشتراكات: <strong>{totalLifetimeConsumed} حصة</strong> (محفوظة في سجل وأتعاب الأستاذ).
                    </div>
                  )}
                  <div style={{ marginTop: '2px' }}>
                    • قيمة الحصص المتبقية القابلة للاسترجاع قانونياً في حال الانقطاع: <strong style={{ color: 'var(--color-primary)' }}>{formatDZD(refundableAmount)}</strong> ({sessionPrice} دج / حصة).
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                السجل الزمني المؤرخ لجميع العمليات والحصص:
              </div>
            {(!studentForLogs.attendanceLogs || studentForLogs.attendanceLogs.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                لا توجد حركات مسجلة حتى الآن لهذا التلميذ.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
                {studentForLogs.attendanceLogs.map((log) => {
                  const isPayment = log.status === 'payment';
                  const isAbsentCounted = log.status === 'absent_counted';
                  const isAbsentUncounted = log.status === 'absent_uncounted';
                  const isRenewed = log.status === 'renewed' || (log.sessionNumber === 0 && !isPayment);

                  let badgeBg = '#10b981';
                  let icon = '✓';
                  let title = `حضور - الحصة رقم ${log.sessionNumber}`;
                  let statusBadge = <Badge variant="success">حضور</Badge>;

                  if (isPayment) {
                    badgeBg = '#059669';
                    icon = 'DZD';
                    title = `تسديد دفعة مالية نقداً ${log.receiptNumber ? `(${log.receiptNumber})` : ''}`;
                    statusBadge = (
                      <Badge
                        variant="success"
                        style={{ fontWeight: 700, backgroundColor: '#d1fae5', color: '#065f46' }}
                      >
                        {log.amount ? `+${formatDZD(log.amount)}` : 'دفعة مسددة'}
                      </Badge>
                    );
                  } else if (log.status === 'single_session') {
                    badgeBg = '#2563eb';
                    icon = '✓';
                    title = `حضور حصة واحدة (مسددة: ${formatDZD(log.amount || 0)} | للأستاذ: ${formatDZD(log.teacherAmount || 0)})`;
                    statusBadge = (
                      <Badge
                        variant="info"
                        style={{ fontWeight: 700, backgroundColor: '#dbeafe', color: '#1d4ed8' }}
                      >
                        حصة واحدة ({formatDZD(log.amount || 0)})
                      </Badge>
                    );
                  } else if (isAbsentCounted) {
                    badgeBg = '#ef4444';
                    icon = '✕';
                    title = `غياب محسوب - الحصة رقم ${log.sessionNumber}`;
                    statusBadge = <Badge variant="danger">غياب محسوب (مقتطع)</Badge>;
                  } else if (isAbsentUncounted) {
                    badgeBg = '#f97316';
                    icon = '—';
                    title = 'غياب غير محسوب / مبرر';
                    statusBadge = <Badge variant="warning">غياب معفى</Badge>;
                  } else if (isRenewed) {
                    badgeBg = 'var(--color-primary)';
                    icon = '↻';
                    title = 'تجديد اشتراك باقة جديدة';
                    statusBadge = <Badge variant="primary">تجديد باقة</Badge>;
                  }

                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--color-bg-app)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: badgeBg,
                            color: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {icon}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {title}
                          </div>
                          {log.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              {log.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {log.receiptNumber && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handlePrintSimpleRenewalReceipt({
                                  receiptNumber: log.receiptNumber!,
                                  studentName: studentForLogs.fullName,
                                  studentPhone: studentForLogs.phone,
                                  courseTitle: activeCourse?.title || '',
                                  teacherName: activeCourse?.teacherName,
                                  sessionsCount: studentForLogs.totalSessions || 4,
                                  overageDeducted: 0,
                                  startingAttended: 0,
                                  paidAmount: log.amount || (activeCourse?.monthlyPrice || 0),
                                  remainingDebt: 0,
                                  date: log.date,
                                });
                              }}
                              rightIcon={<Printer size={12} />}
                              style={{ padding: '2px 8px', fontSize: '0.75rem', height: '26px' }}
                              title="طباعة الوصل البسيط"
                            >
                              طباعة الوصل
                            </Button>
                          )}
                          {statusBadge}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                          <Calendar size={11} color="var(--color-primary)" />
                          <span>{formatDateArabic(log.date)}</span>
                          <span>({log.time})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrintStudentStatement}
                rightIcon={<Printer size={14} />}
              >
                طباعة كشف حضور التلميذ (إثبات الغياب والاسترداد)
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setStudentForLogs(null)}>
                إغلاق السجل
              </Button>
            </div>
          </div>
        );})()}
      </Modal>

      {/* Pay Student Debt Modal */}
      <Modal
        isOpen={!!studentToPayDebt}
        onClose={() => setStudentToPayDebt(null)}
        title="تسديد دين التلميذ وتصفية الحساب"
        description="تسديد مستحقات الدورة نقداً وتصفية الدين ليصبح التلميذ خالصاً"
        maxWidth="500px"
      >
        {studentToPayDebt && (
          <form onSubmit={(e) => handleConfirmPayDebt(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Student & Course Summary Card */}
            <div
              style={{
                backgroundColor: 'var(--color-bg-app, #f8fafc)',
                border: '1px solid var(--color-border, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>التلميذ:</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {studentToPayDebt.fullName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>الفوج / الدورة:</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                  {activeCourse?.title || ''}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>إجمالي المسدد سابقاً:</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#059669' }}>
                  {formatDZD(studentToPayDebt.totalPaid || 0)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px dashed var(--color-border, #cbd5e1)',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#b91c1c' }}>الدين المستحق في الذمة:</span>
                <span
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    color: '#dc2626',
                    backgroundColor: '#fee2e2',
                    padding: '2px 10px',
                    borderRadius: '6px',
                  }}
                >
                  {formatDZD(studentToPayDebt.totalDebt || 0)}
                </span>
              </div>
            </div>

            {/* Input: Payment Amount */}
            {(() => {
              const currentDebt = studentToPayDebt.totalDebt || 0;
              const coursePrice = activeCourse?.monthlyPrice || 0;
              const maxAllowed = Math.min(currentDebt, coursePrice > 0 ? coursePrice : currentDebt);
              const enteredAmt = Number(debtPayAmount) || 0;
              const remainingVal = Math.max(0, currentDebt - enteredAmt);

              return (
                <Input
                  label={`المبلغ المسدد نقداً الآن (دج DZD) • الحد الأقصى: ${formatDZD(maxAllowed)}`}
                  type="number"
                  min="1"
                  max={String(maxAllowed)}
                  required
                  value={debtPayAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (Number(val) > maxAllowed) {
                      setDebtPayAmount(String(maxAllowed));
                    } else {
                      setDebtPayAmount(val);
                    }
                  }}
                  placeholder={`الحد الأقصى: ${maxAllowed}`}
                  hint={
                    enteredAmt > 0 && enteredAmt < currentDebt
                      ? `تسديد جزئي: سيتبقى في ذمة التلميذ ${formatDZD(remainingVal)}`
                      : enteredAmt >= currentDebt
                      ? 'تسديد كامل مبلغ الدين ليصبح التلميذ خالصاً'
                      : 'القيمة الافتراضية هي كامل مبلغ الدين لتسديده دفعة واحدة'
                  }
                />
              );
            })()}

            {/* Input: Payment Date */}
            <Input
              label="تاريخ السداد والقبض"
              type="date"
              required
              value={debtPayDate}
              onChange={(e) => setDebtPayDate(e.target.value)}
            />

            {/* Input: Notes */}
            <Input
              label="ملاحظات السند (اختياري)"
              type="text"
              value={debtPayNotes}
              onChange={(e) => setDebtPayNotes(e.target.value)}
              placeholder="مثال: تسديد دين الدورة نقداً"
            />

            {/* Checkbox: Remove from debts list */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                userSelect: 'none',
                backgroundColor: 'rgba(16, 185, 129, 0.06)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <input
                type="checkbox"
                checked={autoDeleteFromDebts}
                onChange={(e) => setAutoDeleteFromDebts(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
              />
              <span>إزالة الدين نهائياً من قائمة المتأخرات والديون عند التسديد التام وتصفية الحساب</span>
            </label>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                marginTop: 'var(--space-2)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="submit"
                  variant="primary"
                  rightIcon={<Check size={16} />}
                  style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                >
                  تأكيد تسديد الدين
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleConfirmPayDebt(undefined, true)}
                  rightIcon={<Printer size={15} />}
                  style={{ color: '#059669', borderColor: '#059669' }}
                  title="تسديد الدين وطباعة وصل استلام حراري فوري لولي الأمر"
                >
                  تسديد + طباعة وصل
                </Button>
              </div>

              <Button type="button" variant="outline" onClick={() => setStudentToPayDebt(null)}>
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
