import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Clock,
  Printer,
  RotateCw,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  Undo2,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  UserX,
} from 'lucide-react';
import { Course, Student, Teacher } from '../../types';
import { Card } from '../../components/common/Card';
import { CourseSelect } from './CourseSelect';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatDZD, formatDateArabic } from '../../utils/formatters';
import { validateStudentAttendanceRegistration } from '../../utils/attendanceValidation';
import {
  playScanSuccessSound,
  playScanWarningSound,
  playScanDuplicateSound,
  playScanErrorSound,
} from '../../utils/audioAlerts';

interface SmartCardScannerTabProps {
  activeCourse: Course | null;
  courses: Course[];
  teachers: Teacher[];
  schoolName: string;
  onSelectCourse: (courseId: string) => void;
  incrementStudentSession: (
    courseId: string,
    studentId: string,
    options?: { method?: 'rfid' | 'manual' | 'barcode'; notes?: string; force?: boolean }
  ) => {
    studentName: string;
    attended: number;
    total: number;
    isExceeded: boolean;
    log?: any;
    blocked?: boolean;
    blockReason?: string;
    errorMessage?: string;
    errorTitle?: string;
  };
  undoStudentAttendance: (courseId: string, studentId: string) => void;
  recordBatchAbsence?: (
    courseId: string,
    studentIds: string[],
    isCounted: boolean,
    notes?: string
  ) => { count: number; updatedStudents: string[] };
  updateStudent?: (courseId: string, student: Student) => void;
  onEnrollNewWithCard?: (cardId: string) => void;
  onOpenRenewModal?: (student: Student) => void;
}

interface ScanResultCardData {
  type: 'success' | 'warning' | 'duplicate' | 'error';
  student?: Student;
  courseTitle?: string;
  teacherName?: string;
  timeStr: string;
  message: string;
  subMessage?: string;
  sessionNumber?: number;
  totalSessions?: number;
  attendedSessions?: number;
  remainingSessions?: number;
  debtAmount?: number;
  isLastSession?: boolean;
  isExceeded?: boolean;
  unrecognizedCode?: string;
}

export const SmartCardScannerTab: React.FC<SmartCardScannerTabProps> = ({
  activeCourse,
  courses,
  teachers,
  schoolName,
  onSelectCourse,
  incrementStudentSession,
  undoStudentAttendance,
  recordBatchAbsence,
  updateStudent,
  onEnrollNewWithCard,
  onOpenRenewModal,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [lastScanResult, setLastScanResult] = useState<ScanResultCardData | null>(null);
  const [scanPulse, setScanPulse] = useState(false);

  // Scan Popup Modal State
  const [popupData, setPopupData] = useState<ScanResultCardData | null>(null);
  const popupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showScanPopup = (data: ScanResultCardData) => {
    setLastScanResult(data);
    setPopupData(data);

    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }

    // Clean attendance check:
    // Success type, NOT the last session, NOT exceeded, and NO debt
    const isCleanSuccess =
      data.type === 'success' &&
      !data.isLastSession &&
      !data.isExceeded &&
      (!data.debtAmount || data.debtAmount <= 0);

    if (isCleanSuccess) {
      // Auto-dismiss popup after exactly 2 seconds (2000ms)
      popupTimerRef.current = setTimeout(() => {
        setPopupData(null);
      }, 2000);
    }
    // For warnings, last sessions, exceeded quotas, or debts:
    // NO timer is set! Stays on screen indefinitely until user actions or closes.
  };

  const closePopup = () => {
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    setPopupData(null);
  };

  const [recentScans, setRecentScans] = useState<
    Array<{
      id: string;
      studentId: string;
      studentName: string;
      cardId?: string;
      time: string;
      status: 'success' | 'last_session' | 'duplicate' | 'has_debt';
      sessionNumber: number;
      totalSessions: number;
      debtAmount: number;
    }>
  >([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const keyBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Quick Link Card to Existing Student State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [cardToLink, setCardToLink] = useState('');
  const [linkSearchQuery, setLinkSearchQuery] = useState('');

  // Auto-focus the scanner input when mounting and on window focus
  useEffect(() => {
    const focusScanner = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    focusScanner();
    const interval = setInterval(focusScanner, 2500);
    window.addEventListener('focus', focusScanner);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', focusScanner);
    };
  }, []);

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Aggregated list of all students across all courses for rapid card binding
  const allSchoolStudents = useMemo(() => {
    const map = new Map<string, { student: Student; courseNames: string[]; inActiveCourse: boolean }>();
    courses.forEach((c) => {
      (c.enrolledList || []).forEach((std) => {
        const existing = map.get(std.id);
        if (existing) {
          if (!existing.courseNames.includes(c.title)) {
            existing.courseNames.push(c.title);
          }
          if (c.id === activeCourse?.id) {
            existing.inActiveCourse = true;
          }
        } else {
          map.set(std.id, {
            student: std,
            courseNames: [c.title],
            inActiveCourse: c.id === activeCourse?.id,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [courses, activeCourse]);

  const filteredLinkStudents = useMemo(() => {
    if (!linkSearchQuery.trim()) {
      return allSchoolStudents.slice(0, 15);
    }
    const q = linkSearchQuery.toLowerCase().trim();
    return allSchoolStudents.filter(
      (item) =>
        item.student.fullName.toLowerCase().includes(q) ||
        (item.student.phone && item.student.phone.includes(q)) ||
        item.courseNames.some((c) => c.toLowerCase().includes(q))
    );
  }, [allSchoolStudents, linkSearchQuery]);

  const handleLinkCardToStudent = (student: Student) => {
    if (!cardToLink || !updateStudent) return;
    const cleanCode = cardToLink.trim();

    // Update in all courses where student is enrolled
    courses.forEach((c) => {
      const isEnrolled = (c.enrolledList || []).some((s) => s.id === student.id);
      if (isEnrolled) {
        updateStudent(c.id, {
          ...student,
          cardId: cleanCode,
        });
      }
    });

    setIsLinkModalOpen(false);

    // If student is in current active course, immediately record attendance for them
    const inCurrent = activeCourse?.enrolledList?.some((s) => s.id === student.id);
    if (activeCourse && inCurrent) {
      setTimeout(() => {
        handleProcessCardCode(cleanCode);
      }, 100);
    } else {
      if (isAudioEnabled) playScanSuccessSound();
      showScanPopup({
        type: 'success',
        student: { ...student, cardId: cleanCode },
        timeStr: new Date().toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' }),
        message: `تم ربط البطاقة بنجاح!`,
        subMessage: `تم تعيين كود البطاقة (${cleanCode}) للتلميذ "${student.fullName}". الآن بمجرد تمريرها سيتم تسجيل حضوره مباشرة.`,
      });
    }
  };

  // Check if a student has attended today in the active course
  const checkAttendedToday = (std: Student): { attended: boolean; time?: string } => {
    const logs = std.attendanceLogs || [];
    const todayLog = logs.find(
      (l) =>
        l.date === todayDateStr &&
        (l.status === 'present' ||
          l.status === 'single_session' ||
          l.type === 'present' ||
          l.type === 'single_session')
    );
    if (todayLog) {
      return { attended: true, time: todayLog.time || 'اليوم' };
    }
    return { attended: false };
  };

  // Find students in the active course who attended today
  const attendedTodayStudents = useMemo(() => {
    if (!activeCourse) return [];
    return (activeCourse.enrolledList || [])
      .filter((std) => checkAttendedToday(std).attended)
      .map((std) => {
        const info = checkAttendedToday(std);
        return {
          ...std,
          scanTime: info.time || '',
        };
      });
  }, [activeCourse, todayDateStr]);

  // Main scan handler
  const handleProcessCardCode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    setScanPulse(true);
    setTimeout(() => setScanPulse(false), 500);

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (!activeCourse) {
      if (isAudioEnabled) playScanErrorSound();
      showScanPopup({
        type: 'error',
        timeStr: timeFormatted,
        message: 'لم يتم اختيار أي فوج دراسي!',
        subMessage: 'يرجى تحديد الفوج الدراسي أولاً لمسح بطاقات التلاميذ.',
      });
      return;
    }

    const enrolledList = activeCourse.enrolledList || [];

    // 1. Look up student in the current active course
    // Match by cardId, phone, or direct student id
    const matchedStudent = enrolledList.find(
      (s) =>
        (s.cardId && s.cardId.trim().toLowerCase() === code.toLowerCase()) ||
        (s.phone && s.phone.replace(/\s+/g, '') === code.replace(/\s+/g, '')) ||
        s.id === code
    );

    if (matchedStudent) {
      // Validate attendance registration (Debt rule: 1 session only with debt; 2-hour cooldown)
      const validation = validateStudentAttendanceRegistration(matchedStudent);
      if (!validation.allowed) {
        if (isAudioEnabled) {
          if (validation.blockReason === 'debt_second_session') {
            playScanWarningSound();
          } else {
            playScanDuplicateSound();
          }
        }
        showScanPopup({
          type: 'duplicate',
          student: matchedStudent,
          courseTitle: activeCourse.title,
          teacherName: activeCourse.teacherName,
          timeStr: validation.lastAttendanceTime || timeFormatted,
          message:
            validation.blockReason === 'debt_second_session'
              ? '🚫 مرفوض: لا يمكن تسجيل الحصة الثانية للتلميذ!'
              : '⚠️ تكرار التسجيل غير مسموح (قفل الساعتين)!',
          subMessage: validation.errorMessage || 'التسجيل غير متاح حالياً.',
          sessionNumber: matchedStudent.attendedSessions || 1,
          totalSessions: matchedStudent.totalSessions || 4,
          attendedSessions: matchedStudent.attendedSessions || 1,
          debtAmount: matchedStudent.totalDebt || 0,
        });
        return;
      }

      const hasDebt = !matchedStudent.isExempt && (matchedStudent.totalDebt || 0) > 0;
      const isFirstSessionWithDebt = hasDebt && (matchedStudent.attendedSessions || 0) === 0;

      // Record attendance
      const res = incrementStudentSession(activeCourse.id, matchedStudent.id, {
        method: 'rfid',
        notes: `تسجيل حضور بالبطاقة الذكية RFID (${code})`,
      });

      if (res.blocked) {
        if (isAudioEnabled) playScanWarningSound();
        showScanPopup({
          type: 'duplicate',
          student: matchedStudent,
          courseTitle: activeCourse.title,
          teacherName: activeCourse.teacherName,
          timeStr: timeFormatted,
          message: res.errorTitle || '🚫 مرفوض',
          subMessage: res.errorMessage || 'لا يمكن تسجيل الحضور.',
          sessionNumber: matchedStudent.attendedSessions || 1,
          totalSessions: matchedStudent.totalSessions || 4,
          attendedSessions: matchedStudent.attendedSessions || 1,
          debtAmount: matchedStudent.totalDebt || 0,
        });
        return;
      }

      const updatedAttended = res.attended;
      const total = res.total;
      const isLast = updatedAttended === total && total > 1 && !matchedStudent.isExempt;
      const isExceeded = res.isExceeded || updatedAttended > total;

      const hasWarning = isLast || hasDebt || isExceeded || isFirstSessionWithDebt;

      // Play suitable sound as requested by user
      if (isAudioEnabled) {
        if (hasWarning) {
          playScanWarningSound(); // freesound_community-beep-warning-6387.mp3
        } else {
          playScanSuccessSound(); // freesound_community-short-beep-tone-47916.mp3
        }
      }

      const scanType = hasWarning ? 'warning' : 'success';
      const resultData: ScanResultCardData = {
        type: scanType,
        student: matchedStudent,
        courseTitle: activeCourse.title,
        teacherName: activeCourse.teacherName,
        timeStr: timeFormatted,
        message: isExceeded
          ? `⚠️ تجاوز الحصص المسموحة (${updatedAttended}/${total})`
          : isFirstSessionWithDebt
          ? `⚠️ تنبيه مالي: حصة أولى مسموحة بالدين (${updatedAttended}/${total})`
          : isLast
          ? '⚠️ الحصة الأخيرة في الاشتراك (انتهاء الشهر)!'
          : hasDebt
          ? `💰 تنبيه مالي: يوجد دين غير مسدد (${formatDZD(matchedStudent.totalDebt || 0)})`
          : 'تم تسجيل حضور التلميذ بنجاح!',
        subMessage: isExceeded
          ? `التلميذ استهلك كامل حصصه وتجاوز بـ ${updatedAttended - total} حصة. يلزم تجديد الاشتراك وتسديد المستحقات للحصة القادمة.`
          : isFirstSessionWithDebt
          ? `تم تسجيل حضور الحصة الأولى. تنبيه: التلميذ في ذمته دين غير مسدد (${formatDZD(matchedStudent.totalDebt || 0)}). يُسمح بدراسة حصة واحدة فقط بالدين ولن يقبل النظام تسجيل الحصة الثانية إلا بعد تسديد دينه.`
          : isLast
          ? '⚠️ هذه الحصة الأخيرة للتلميذ في الباقة الحالية — يلزم تجديد الاشتراك للحصة القادمة.'
          : hasDebt
          ? `💰 يوجد دين غير مسدد على التلميذ بمبلغ ${formatDZD(matchedStudent.totalDebt || 0)}.`
          : 'حضور موثق إلكترونياً بختم الوقت الدقيق.',
        sessionNumber: updatedAttended,
        totalSessions: total,
        attendedSessions: updatedAttended,
        remainingSessions: Math.max(0, total - updatedAttended),
        debtAmount: matchedStudent.totalDebt || 0,
        isLastSession: isLast,
        isExceeded: isExceeded,
      };

      showScanPopup(resultData);

      // Add to recent scans log
      setRecentScans((prev) => [
        {
          id: `scan-${Date.now()}`,
          studentId: matchedStudent.id,
          studentName: matchedStudent.fullName,
          cardId: matchedStudent.cardId || code,
          time: timeFormatted,
          status: isLast ? 'last_session' : hasDebt ? 'has_debt' : 'success',
          sessionNumber: updatedAttended,
          totalSessions: total,
          debtAmount: matchedStudent.totalDebt || 0,
        },
        ...prev.slice(0, 19),
      ]);
      return;
    }

    // 2. Student NOT found in this active course. Check if enrolled in ANOTHER course
    let otherCourseFound: { student: Student; course: Course } | null = null;
    for (const c of courses) {
      if (c.id === activeCourse.id) continue;
      const foundInOther = (c.enrolledList || []).find(
        (s) =>
          (s.cardId && s.cardId.trim().toLowerCase() === code.toLowerCase()) ||
          (s.phone && s.phone.replace(/\s+/g, '') === code.replace(/\s+/g, '')) ||
          s.id === code
      );
      if (foundInOther) {
        otherCourseFound = { student: foundInOther, course: c };
        break;
      }
    }

    if (otherCourseFound) {
      if (isAudioEnabled) playScanErrorSound();
      showScanPopup({
        type: 'error',
        student: otherCourseFound.student,
        timeStr: timeFormatted,
        message: `التلميذ "${otherCourseFound.student.fullName}" غير مسجل في هذا الفوج!`,
        subMessage: `هذا التلميذ مسجل في: [${otherCourseFound.course.title} — ${otherCourseFound.course.teacherName}]. يرجى تحويل الفوج أو التأكد من قاعة الدرس.`,
      });
      return;
    }

    // 3. Card not recognized anywhere in the system
    if (isAudioEnabled) playScanErrorSound();
    showScanPopup({
      type: 'error',
      timeStr: timeFormatted,
      unrecognizedCode: code,
      message: `بطاقة غير معرّفة (${code})!`,
      subMessage: `لا يوجد أي تلميذ مرتبط بهذه البطاقة في النظام. يمكنك ربطها بتلميذ سابق فوراً بالزر أدناه أو من شاشة تعديل التلميذ.`,
    });
  };

  // Keyboard wedge listener for rapid scanner typing (handles scans even if input loses focus)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      // If user is actively typing in a standard textarea or another modal input, do not intercept
      if (
        activeEl &&
        activeEl !== inputRef.current &&
        (activeEl.tagName === 'TEXTAREA' ||
          (activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type !== 'hidden'))
      ) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (keyBufferRef.current.trim().length >= 2) {
          e.preventDefault();
          const scanned = keyBufferRef.current.trim();
          keyBufferRef.current = '';
          setBarcodeInput('');
          handleProcessCardCode(scanned);
        } else if (barcodeInput.trim().length >= 2) {
          e.preventDefault();
          const scanned = barcodeInput.trim();
          setBarcodeInput('');
          handleProcessCardCode(scanned);
        }
        return;
      }

      // Check key length
      if (e.key.length === 1) {
        // Barcode scanners typically emit keystrokes under 50ms apart
        if (timeDiff > 120 && keyBufferRef.current.length > 0) {
          // Reset buffer if delay too long (manual typing)
          keyBufferRef.current = '';
        }
        keyBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [barcodeInput, activeCourse, courses, isAudioEnabled]);

  // Form submit when pressing enter in the input
  const handleSubmitInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      const code = barcodeInput.trim();
      setBarcodeInput('');
      handleProcessCardCode(code);
    }
  };

  // Print official teacher attendance verification sheet
  const handlePrintTeacherSheet = () => {
    if (!activeCourse) return;

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة كشف الحضور.');
      return;
    }

    const todayAr = formatDateArabic(todayDateStr);
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const enrolled = activeCourse.enrolledList || [];

    const rowsHtml = enrolled
      .map((std, idx) => {
        const info = checkAttendedToday(std);
        const attended = std.attendedSessions || 0;
        const total = std.totalSessions || 4;
        const isAttended = info.attended;

        return `
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${isAttended ? '#f0fdf4' : '#ffffff'};">
          <td style="padding: 8px 10px; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: bold; font-size: 13px;">${std.fullName}</td>
          <td style="padding: 8px 10px; font-family: monospace; font-size: 11px;">${std.cardId || '—'}</td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="font-weight: 800; font-family: monospace;">${attended} / ${total}</span>
          </td>
          <td style="padding: 8px 10px; text-align: center;">
            ${
              isAttended
                ? `<span style="color: #15803d; font-weight: 800; background: #dcfce7; padding: 2px 8px; border-radius: 4px;">✅ حاضر (${info.time || 'مسجل'})</span>`
                : `<span style="color: #64748b; font-weight: 600;">— لم يحضر</span>`
            }
          </td>
          <td style="padding: 8px 10px; text-align: center; color: #64748b; font-size: 12px;">
            ${!std.isExempt && (std.totalDebt || 0) > 0 ? `<span style="color: #b91c1c; font-weight: 700;">دين: ${std.totalDebt} دج</span>` : 'خالص'}
          </td>
          <td style="padding: 8px 10px; text-align: center; border-bottom: 1px dashed #cbd5e1;"></td>
        </tr>
      `;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف حضور فوج: ${activeCourse.title}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 10px; direction: rtl; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
          .title { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 14px; font-size: 12px; }
          .info-item b { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background-color: #0f172a; color: #ffffff; padding: 8px 10px; font-weight: 700; text-align: center; font-size: 12px; }
          .footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; padding: 0 20px; }
          @media print {
            body { padding: 0; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${schoolName}</div>
            <div class="subtitle">كشف الحضور الرسمي للأستاذ والفوج الدراسي</div>
          </div>
          <div style="text-align: left; font-size: 12px; color: #475569;">
            <div><b>التاريخ:</b> ${todayAr}</div>
            <div><b>توقيت الطباعة:</b> ${nowTime}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item"><b>الفوج:</b> ${activeCourse.title}</div>
          <div class="info-item"><b>الأستاذ:</b> ${activeCourse.teacherName}</div>
          <div class="info-item"><b>المستوى:</b> ${activeCourse.academicLevel || 'عام'}</div>
          <div class="info-item"><b>نسبة الحضور:</b> ${attendedTodayStudents.length} من ${enrolled.length} تلميذ</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">#</th>
              <th>اسم ولقب التلميذ</th>
              <th style="width: 100px;">رقم البطاقة</th>
              <th style="width: 80px;">رصيد الحصص</th>
              <th style="width: 140px;">حالة الحضور اليوم</th>
              <th style="width: 90px;">الوضعية المالية</th>
              <th style="width: 110px;">توقيع الأستاذ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>ختم وملاحظات الإدارة: ..........................</div>
          <div>توقيع الأستاذ المؤطر: ..........................</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const totalEnrolled = activeCourse?.enrolledList?.length || 0;
  const attendedCount = attendedTodayStudents.length;
  const pendingStudents = useMemo(() => {
    if (!activeCourse) return [];
    return (activeCourse.enrolledList || []).filter((std) => !checkAttendedToday(std).attended);
  }, [activeCourse, todayDateStr]);
  const pendingCount = pendingStudents.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Course Switcher & Sound Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: 'var(--color-bg-surface, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border, #e2e8f0)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ minWidth: '320px', flex: '1 1 360px' }}>
            <CourseSelect
              label="الفوج النشط للمسح"
              courses={courses}
              selectedCourseId={activeCourse?.id || ''}
              onSelectCourse={onSelectCourse}
            />
          </div>

          {activeCourse && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac',
                }}
              >
                حضر اليوم: {attendedCount} / {totalEnrolled}
              </span>

              {pendingCount > 0 && (
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                  }}
                >
                  لم يحضروا بعد: {pendingCount}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border, #e2e8f0)',
              backgroundColor: isAudioEnabled ? 'rgba(37, 99, 235, 0.08)' : '#f8fafc',
              color: isAudioEnabled ? 'var(--color-primary, #2563eb)' : '#64748b',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={isAudioEnabled ? 'الصوت مفعّل' : 'الصوت معطّل'}
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isAudioEnabled ? 'التنبيهات الصوتية: نشطة' : 'صامت'}</span>
          </button>

          {/* End of Day / Session Batch Absence Button */}
          {activeCourse && recordBatchAbsence && pendingCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<UserX size={15} />}
              onClick={() => {
                if (
                  window.confirm(
                    `هل أنت متأكد من إنهاء الحصة وتسجيل غياب محسوب لجميع التلاميذ غير الحاضرين (${pendingCount} تلميذ)؟`
                  )
                ) {
                  const studentIds = pendingStudents.map((s) => s.id);
                  const res = recordBatchAbsence(activeCourse.id, studentIds, true, 'غياب محسوب (إنهاء حصة اليوم بالماسح)');
                  playScanWarningSound();
                  alert(`تم تسجيل الغياب بنجاح لـ ${res.count} تلميذ واقتطاع الحصة من رصيدهم!`);
                }
              }}
              style={{
                backgroundColor: '#dc2626',
                borderColor: '#dc2626',
              }}
              title={`إنهاء الحصة وتسجيل غياب لمن لم يحضر (${pendingCount} تلاميذ)`}
            >
              🛑 إنهاء الحصة وتسجيل غياب ({pendingCount})
            </Button>
          )}

          {/* Print Teacher Sheet Button */}
          {activeCourse && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer size={15} />}
              onClick={handlePrintTeacherSheet}
            >
              طباعة كشف حضور الأستاذ
            </Button>
          )}
        </div>
      </div>

      {/* Main Scanner Section (Live RFID Reader Zone) */}
      <div
        style={{
          position: 'relative',
          padding: '24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          boxShadow: scanPulse
            ? '0 0 0 4px rgba(34, 197, 94, 0.4), 0 20px 30px rgba(0, 0, 0, 0.3)'
            : '0 10px 25px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Pulse Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              boxShadow: '0 0 12px #22c55e',
              display: 'inline-block',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#86efac', letterSpacing: '0.5px' }}>
            قارئ البطاقات الذكية (RFID / Barcode) جاهز للاستقبال اللحظي
          </span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
          مرّر بطاقة التلميذ على الجهاز الآن
        </h2>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8', maxWidth: '540px' }}>
          يتم تسجيل الحضور وخصم الحصة وإصدار نغمة التأكيد في جزء من الثانية مع إيقاف التكرار تلقائياً ⚡
        </p>

        {/* Input box */}
        <form
          onSubmit={handleSubmitInput}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            maxWidth: '520px',
            marginTop: '6px',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="كود البطاقة أو رقم هاتف التلميذ..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px 44px 12px 16px',
                borderRadius: '12px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                outline: 'none',
                boxSizing: 'border-box',
                textAlign: 'center',
                letterSpacing: '1px',
                fontFamily: 'monospace',
                transition: 'border 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#38bdf8')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
            />
            <CreditCard
              size={20}
              color="#38bdf8"
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: 800,
              backgroundColor: '#0284c7',
              borderColor: '#0284c7',
              whiteSpace: 'nowrap',
            }}
          >
            مسح
          </Button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: '#64748b' }}>
          <span>🔒 قفل التكرار مفعّل: تلميذ واحد = حصة واحدة يومياً</span>
          <span>•</span>
          <span>⏱️ توثيق بالثانية</span>
        </div>
      </div>

      {/* Live Scan Result Hero Banner */}
      {lastScanResult && (
        <div
          style={{
            padding: '20px 24px',
            borderRadius: '16px',
            backgroundColor:
              lastScanResult.type === 'success'
                ? '#f0fdf4'
                : lastScanResult.type === 'warning'
                ? '#fffbeb'
                : lastScanResult.type === 'duplicate'
                ? '#fff7ed'
                : '#fef2f2',
            border: `2px solid ${
              lastScanResult.type === 'success'
                ? '#86efac'
                : lastScanResult.type === 'warning'
                ? '#fcd34d'
                : lastScanResult.type === 'duplicate'
                ? '#fdba74'
                : '#fca5a5'
            }`,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {/* Top Row: Icon + Title + Timestamp */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {lastScanResult.type === 'success' && <CheckCircle2 size={32} color="#16a34a" />}
              {lastScanResult.type === 'warning' && <AlertTriangle size={32} color="#d97706" />}
              {lastScanResult.type === 'duplicate' && <RotateCw size={32} color="#ea580c" />}
              {lastScanResult.type === 'error' && <XCircle size={32} color="#dc2626" />}

              <div>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    margin: 0,
                    color:
                      lastScanResult.type === 'success'
                        ? '#15803d'
                        : lastScanResult.type === 'warning'
                        ? '#b45309'
                        : lastScanResult.type === 'duplicate'
                        ? '#c2410c'
                        : '#b91c1c',
                  }}
                >
                  {lastScanResult.message}
                </h3>
                {lastScanResult.subMessage && (
                  <p
                    style={{
                      margin: '3px 0 0',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color:
                        lastScanResult.type === 'success'
                          ? '#166534'
                          : lastScanResult.type === 'warning'
                          ? '#92400e'
                          : lastScanResult.type === 'duplicate'
                          ? '#9a3412'
                          : '#991b1b',
                    }}
                  >
                    {lastScanResult.subMessage}
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#475569',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
              }}
            >
              <Clock size={14} />
              <span>التوقيت: {lastScanResult.timeStr}</span>
            </div>
          </div>

          {/* Action buttons if unrecognized card */}
          {lastScanResult.unrecognizedCode && (
            <div
              style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
              }}
            >
              {updateStudent && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CreditCard size={16} />}
                  onClick={() => {
                    setCardToLink(lastScanResult.unrecognizedCode!);
                    setLinkSearchQuery('');
                    setIsLinkModalOpen(true);
                  }}
                >
                  🔗 ربط بتلميذ سابق (قديم)
                </Button>
              )}

              {onEnrollNewWithCard && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Sparkles size={16} />}
                  onClick={() => {
                    onEnrollNewWithCard(lastScanResult.unrecognizedCode!);
                  }}
                >
                  ➕ تسجيل تلميذ جديد بهذه البطاقة
                </Button>
              )}
            </div>
          )}

          {/* Student Profile Card (if matched) */}
          {lastScanResult.student && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                padding: '14px 18px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--color-primary, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                  }}
                >
                  {lastScanResult.student.fullName.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                    {lastScanResult.student.fullName}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                    بطاقة رقم:{' '}
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                      {lastScanResult.student.cardId || '—'}
                    </span>{' '}
                    • الهاتف: {lastScanResult.student.phone || '—'}
                  </div>
                </div>
              </div>

              {/* Progress & Debt Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>رصيد الحصص</span>
                  <span
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      color:
                        lastScanResult.isLastSession
                          ? '#b45309'
                          : lastScanResult.isExceeded
                          ? '#dc2626'
                          : '#15803d',
                    }}
                  >
                    {lastScanResult.sessionNumber || lastScanResult.student.attendedSessions || 0} /{' '}
                    {lastScanResult.totalSessions || lastScanResult.student.totalSessions || 4}
                  </span>
                </div>

                {lastScanResult.isLastSession && (
                  <span
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      border: '1.5px solid #fcd34d',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                    }}
                  >
                    ⚠️ الحصة الأخيرة
                  </span>
                )}

                {!lastScanResult.student.isExempt && (lastScanResult.student.totalDebt || 0) > 0 && (
                  <span
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      border: '1.5px solid #fca5a5',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                    }}
                  >
                    💰 دين: {formatDZD(lastScanResult.student.totalDebt || 0)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two Column Layout: Today's Attendees vs Live Scan Activity Feed */}
      <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
        {/* Right Card: Attendees Today in this Course */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--color-primary, #2563eb)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                الحاضرون اليوم في هذا الفوج ({attendedTodayStudents.length})
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              من إجمالي {totalEnrolled} تلميذ
            </span>
          </div>

          {attendedTodayStudents.length === 0 ? (
            <div
              style={{
                padding: '30px 16px',
                textAlign: 'center',
                color: '#64748b',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              لم يُسجل حضور أي تلميذ في هذا الفوج اليوم حتى الآن. مرّر البطاقات للبدء!
            </div>
          ) : (
            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attendedTodayStudents.map((std, idx) => {
                const attended = std.attendedSessions || 0;
                const total = std.totalSessions || 4;
                const isLast = attended === total && total > 1 && !std.isExempt;
                const hasDebt = !std.isExempt && (std.totalDebt || 0) > 0;

                return (
                  <div
                    key={std.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{std.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ساعة الحضور: {std.scanTime || 'اليوم'} • بطاقة: {std.cardId || '—'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: isLast ? '#fef3c7' : '#dcfce7',
                          color: isLast ? '#b45309' : '#15803d',
                          fontSize: '0.75rem',
                        }}
                      >
                        {attended} / {total}
                      </span>
                      {hasDebt && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                          }}
                        >
                          دين
                        </span>
                      )}
                      {activeCourse && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من التراجع عن تسجيل حضور "${std.fullName}"؟`)) {
                              undoStudentAttendance(activeCourse.id, std.id);
                            }
                          }}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="تراجع عن الحضور"
                        >
                          <Undo2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Left Card: Live Recent Scan Feed */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#0284c7" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                سجل المسح المباشر اللحظي (Live Feed)
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>آخر 20 تمريرة</span>
          </div>

          {recentScans.length === 0 ? (
            <div
              style={{
                padding: '30px 16px',
                textAlign: 'center',
                color: '#64748b',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              لم يتم تمرير أي بطاقة في هذه الجلسة بعد.
            </div>
          ) : (
            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor:
                      scan.status === 'last_session'
                        ? '#fffbeb'
                        : scan.status === 'has_debt'
                        ? '#fef2f2'
                        : '#ffffff',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{scan.studentName}</span>
                    <span style={{ margin: '0 6px', color: '#cbd5e1' }}>•</span>
                    <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>
                      {scan.cardId}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {scan.status === 'last_session' && (
                      <span style={{ color: '#b45309', fontWeight: 700, fontSize: '0.6875rem' }}>
                        ⚠️ الحصة الأخيرة
                      </span>
                    )}
                    {scan.status === 'has_debt' && (
                      <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.6875rem' }}>
                        💰 عليه دين
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    >
                      {scan.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Link Card Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="ربط بطاقة إلكترونية بتلميذ سابق"
        description={`تعيين كود البطاقة (${cardToLink}) لتلميذ مسجل مسبقاً في النظام`}
        maxWidth="540px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              fontSize: '0.875rem',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <CreditCard size={20} color="#2563eb" />
            <div>
              كود البطاقة الممسوحة:{' '}
              <strong style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#1d4ed8' }}>
                {cardToLink}
              </strong>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 700 }}>
              ابحث عن اسم التلميذ:
            </label>
            <Input
              placeholder="اكتب اسم التلميذ أو لقبه أو هاتفه..."
              value={linkSearchQuery}
              onChange={(e) => setLinkSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {filteredLinkStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '0.875rem' }}>
                لم يتم العثور على أي تلميذ بهذا الاسم.
              </div>
            ) : (
              filteredLinkStudents.map(({ student, courseNames, inActiveCourse }) => (
                <div
                  key={student.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: inActiveCourse ? '#f0fdf4' : '#f8fafc',
                    border: `1.5px solid ${inActiveCourse ? '#86efac' : '#e2e8f0'}`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      {student.fullName}
                      {inActiveCourse && (
                        <span
                          style={{
                            marginRight: '8px',
                            fontSize: '0.6875rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            fontWeight: 700,
                          }}
                        >
                          في هذا الفوج
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      {student.phone ? `هاتف: ${student.phone} • ` : ''}
                      الأفواج: {courseNames.join('، ') || 'غير مسجل في فوج'}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={inActiveCourse ? 'primary' : 'outline'}
                    onClick={() => handleLinkCardToStudent(student)}
                  >
                    {inActiveCourse ? 'ربط وتسجيل حضور ⚡' : 'ربط البطاقة'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* 🚀 Scan Result Popup Modal (2s auto-dismiss for clean success, indefinite + renewal for warnings) */}
      {popupData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={(e) => {
            const isClean =
              popupData.type === 'success' &&
              !popupData.isLastSession &&
              !popupData.isExceeded &&
              (!popupData.debtAmount || popupData.debtAmount <= 0);
            if (isClean && e.target === e.currentTarget) {
              closePopup();
            }
          }}
        >
          <style>{`
            @keyframes popupZoomIn {
              from { opacity: 0; transform: scale(0.92) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes shrinkProgress {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>

          <div
            style={{
              width: '100%',
              maxWidth:
                popupData.type === 'warning' ||
                popupData.isLastSession ||
                popupData.isExceeded ||
                (popupData.debtAmount && popupData.debtAmount > 0)
                  ? '530px'
                  : '430px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              animation: 'popupZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              direction: 'rtl',
              textAlign: 'right',
            }}
          >
            {/* 🟢 حالة الحضور السليم 100%: بدون ديون، بدون تجاوز، غير منتهي (تختفي تلقائياً بعد 2 ثانية) */}
            {popupData.type === 'success' &&
            !popupData.isLastSession &&
            !popupData.isExceeded &&
            (!popupData.debtAmount || popupData.debtAmount <= 0) ? (
              <div style={{ padding: '34px 28px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    margin: '0 auto 16px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '4px solid #bbf7d0',
                  }}
                >
                  <CheckCircle2 size={48} color="#16a34a" />
                </div>

                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 800,
                    color: '#15803d',
                    backgroundColor: '#f0fdf4',
                    padding: '4px 14px',
                    borderRadius: '999px',
                    display: 'inline-block',
                    marginBottom: '8px',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  ✓ تسجيل حضور ناجح ومؤكد
                </div>

                <h2
                  style={{
                    fontSize: '1.625rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    margin: '4px 0 6px 0',
                  }}
                >
                  {popupData.student?.fullName || 'التلميذ'}
                </h2>

                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '18px' }}>
                  {popupData.courseTitle} {popupData.teacherName ? `• الأستاذ: ${popupData.teacherName}` : ''}
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px 24px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    marginBottom: '22px',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>رصيد الحصص</div>
                    <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#16a34a', fontFamily: 'monospace' }}>
                      {popupData.sessionNumber} / {popupData.totalSessions}
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '32px', backgroundColor: '#cbd5e1' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>الساعة الدقيقة</div>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {popupData.timeStr}
                    </div>
                  </div>
                </div>

                {/* 2-Second Visual Countdown Indicator */}
                <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: '#16a34a',
                      animation: 'shrinkProgress 2s linear forwards',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>
                  تختفي هذه النافذة تلقائياً بعد 2 ثانيتين...
                </div>
              </div>
            ) : (
              /* ⚠️ حالة التنبيه: تجاوز، أو دين، أو انتهاء الشهر/الحصة الأخيرة (نافذة بدون مؤقت + زر إعادة الاشتراك) */
              <div style={{ padding: '28px 26px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '18px',
                      backgroundColor: popupData.isExceeded ? '#fee2e2' : popupData.isLastSession ? '#fef3c7' : '#fee2e2',
                      border: `2px solid ${popupData.isExceeded ? '#fca5a5' : popupData.isLastSession ? '#fcd34d' : '#fca5a5'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {popupData.isExceeded ? (
                      <AlertCircle size={36} color="#dc2626" />
                    ) : popupData.isLastSession ? (
                      <AlertTriangle size={36} color="#b45309" />
                    ) : (
                      <AlertTriangle size={36} color="#dc2626" />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '3px 12px',
                        borderRadius: '6px',
                        backgroundColor: popupData.isExceeded ? '#fef2f2' : popupData.isLastSession ? '#fffbeb' : '#fef2f2',
                        color: popupData.isExceeded ? '#dc2626' : popupData.isLastSession ? '#b45309' : '#b91c1c',
                        border: `1px solid ${popupData.isExceeded ? '#fecaca' : popupData.isLastSession ? '#fde68a' : '#fecaca'}`,
                        marginBottom: '6px',
                      }}
                    >
                      {popupData.isExceeded
                        ? 'تنبيه: تجاوز رصيد الحصص!'
                        : popupData.isLastSession
                        ? 'تنبيه: الحصة الأخيرة في الباقة (انتهاء الشهر)!'
                        : popupData.debtAmount && popupData.debtAmount > 0
                        ? 'تنبيه مالي: يوجد دين غير مسدد!'
                        : popupData.type === 'error'
                        ? 'تنبيه في البطاقة'
                        : 'تنبيه الحضور'}
                    </div>

                    <h2
                      style={{
                        fontSize: '1.375rem',
                        fontWeight: 900,
                        color: '#0f172a',
                        margin: 0,
                      }}
                    >
                      {popupData.student?.fullName || popupData.message}
                    </h2>
                    {popupData.courseTitle && (
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                        {popupData.courseTitle} {popupData.teacherName ? `• الأستاذ: ${popupData.teacherName}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details card */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1.5px solid #e2e8f0',
                    marginBottom: '20px',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#334155',
                      lineHeight: '1.6',
                    }}
                  >
                    {popupData.subMessage || popupData.message}
                  </p>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {popupData.sessionNumber !== undefined && (
                      <div
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          backgroundColor: popupData.isExceeded ? '#fee2e2' : popupData.isLastSession ? '#fef3c7' : '#ffffff',
                          border: `1.5px solid ${popupData.isExceeded ? '#fca5a5' : popupData.isLastSession ? '#fcd34d' : '#cbd5e1'}`,
                        }}
                      >
                        <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                          رصيد الحصص
                        </span>
                        <span
                          style={{
                            fontSize: '1.125rem',
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            color: popupData.isExceeded ? '#dc2626' : popupData.isLastSession ? '#b45309' : '#0f172a',
                          }}
                        >
                          {popupData.sessionNumber} / {popupData.totalSessions}{' '}
                          {popupData.isExceeded ? '(تجاوز)' : ''}
                        </span>
                      </div>
                    )}

                    {popupData.debtAmount && popupData.debtAmount > 0 ? (
                      <div
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          backgroundColor: '#fee2e2',
                          border: '1.5px solid #fca5a5',
                        }}
                      >
                        <span style={{ fontSize: '0.6875rem', color: '#991b1b', display: 'block', fontWeight: 700 }}>
                          الدين المستحق
                        </span>
                        <span style={{ fontSize: '1.125rem', fontWeight: 900, color: '#dc2626', fontFamily: 'monospace' }}>
                          {formatDZD(popupData.debtAmount)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* زر إعادة الاشتراك وأزرار الإجراءات */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                  {popupData.student && onOpenRenewModal && (
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<RotateCw size={17} />}
                      onClick={() => {
                        const std = popupData.student!;
                        closePopup();
                        onOpenRenewModal(std);
                      }}
                      style={{
                        backgroundColor: '#2563eb',
                        borderColor: '#2563eb',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                        fontWeight: 800,
                      }}
                    >
                      🔄 إعادة / تجديد الاشتراك الآن
                    </Button>
                  )}

                  {popupData.unrecognizedCode && updateStudent && (
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<CreditCard size={17} />}
                      onClick={() => {
                        setCardToLink(popupData.unrecognizedCode!);
                        setLinkSearchQuery('');
                        closePopup();
                        setIsLinkModalOpen(true);
                      }}
                    >
                      🔗 ربط بتلميذ سابق
                    </Button>
                  )}

                  {popupData.unrecognizedCode && onEnrollNewWithCard && (
                    <Button
                      variant="outline"
                      size="md"
                      leftIcon={<Sparkles size={17} />}
                      onClick={() => {
                        const code = popupData.unrecognizedCode!;
                        closePopup();
                        onEnrollNewWithCard(code);
                      }}
                    >
                      ➕ تسجيل تلميذ جديد
                    </Button>
                  )}

                  <Button variant="ghost" size="md" onClick={closePopup}>
                    إغلاق ومتابعة المسح
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
