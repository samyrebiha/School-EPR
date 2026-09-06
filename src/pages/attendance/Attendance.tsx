import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  FileCheck,
  History,
  Calendar,
  AlertTriangle,
  RotateCw,
  Phone,
  UserX,
  Check,
  Printer,
  Trash2,
  Search,
  X,
  Undo2,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select, Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Course, Student } from '../../types';
import { formatDZD, formatAlgerianPhone, formatDateArabic } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';

/**
 * Visual Circles component representing sessions quota and attendance status
 * - Green: Present
 * - Red: Absent Counted (charged)
 * - Orange: Absent Uncounted (excused)
 * - Gray dashed: Remaining session
 */
const SessionCircles: React.FC<{ student: Student }> = ({ student }) => {
  const total = student.totalSessions && student.totalSessions > 0 ? student.totalSessions : 4;
  const attended = student.attendedSessions || 0;
  const isExceeded = attended > total;

  const allLogs = student.attendanceLogs || [];
  // Find index of most recent renewal log to scope circles to current active package
  const latestRenewalIdx = allLogs.findIndex((l) => l.status === 'renewed');
  const currentCycleRawLogs = latestRenewalIdx === -1 ? allLogs : allLogs.slice(0, latestRenewalIdx);

  // Filter ONLY real quota-consuming session attendance logs (present, absent_counted).
  // Excused absence (absent_uncounted) is a skip/pass for that day and DOES NOT consume a quota slot.
  // The slot remains an empty gray circle waiting for the next session when the student attends.
  const sessionLogs = currentCycleRawLogs
    .filter((l) => l.status === 'present' || l.status === 'absent_counted')
    .slice()
    .reverse();

  const excusedLogs = currentCycleRawLogs.filter((l) => l.status === 'absent_uncounted');
  const absentCounted = sessionLogs.filter((l) => l.status === 'absent_counted').length;
  const absentUncounted = excusedLogs.length;

  const consumedCount = Math.max(attended, sessionLogs.length);
  const slotsCount = Math.max(total, consumedCount);

  const circles = [];
  for (let i = 0; i < slotsCount; i++) {
    if (i < sessionLogs.length) {
      const log = sessionLogs[i];
      if (log.status === 'absent_counted') {
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
      </div>
    </div>
  );
};

export const Attendance: React.FC = () => {
  const { success, warning } = useToast();
  const {
    courses,
    currentSchool,
    incrementStudentSession,
    recordStudentAbsence,
    renewStudentSubscription,
    undoStudentAttendance,
    removeStudentFromCourse,
  } = useData();

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0] || null;

  // Student Search Query in Roster
  const [searchQuery, setSearchQuery] = useState('');

  const enrolledList = activeCourse?.enrolledList || [];
  const filteredStudents = enrolledList.filter((std) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = (std.fullName || '').toLowerCase().includes(q);
    const phoneMatch = (std.phone || '').includes(q);
    const parentPhoneMatch = (std.parentPhone || '').includes(q);
    const levelMatch = (std.academicLevel || '').toLowerCase().includes(q);
    return nameMatch || phoneMatch || parentPhoneMatch || levelMatch;
  });

  // Student Attendance History Log Modal
  const [studentForLogs, setStudentForLogs] = useState<Student | null>(null);

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

  // Quick Click to Record 1 Attended Session (e.g. 1/5 -> 2/5 -> 6/5 with warning)
  const handleIncrement = (studentId: string) => {
    if (!activeCourse) return;

    const targetStudent = activeCourse.enrolledList?.find((s) => s.id === studentId);
    const hasUnpaidDebt = targetStudent && (targetStudent.totalDebt || 0) > 0;

    const res = incrementStudentSession(activeCourse.id, studentId);

    // Warning alert for user if the student has not paid!
    if (hasUnpaidDebt) {
      warning(
        `تنبيه مالي: التلميذ "${res.studentName}" لم يسدد مستحقاته بعد (متبقي بذمته: ${formatDZD(targetStudent.totalDebt)})! يرجى تحصيل المتأخرات.`,
        'مستحقات غير مسددة'
      );
    }

    if (res.isExceeded) {
      const overCount = res.attended - res.total;
      warning(
        `تنبيه: التلميذ "${res.studentName}" تجاوز عدد الحصص بحصة إضافية (${res.attended}/${res.total})! يرجى إعادة الاشتراك.`,
        `تجاوز بـ ${overCount} حصص`
      );
    } else if (!hasUnpaidDebt) {
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
            margin: 4mm;
          }
          body {
            font-family: 'Courier New', Courier, monospace, 'Cairo', Tahoma, sans-serif;
            margin: 0;
            padding: 8px;
            color: #000;
            background: #fff;
            direction: rtl;
            font-size: 13px;
            line-height: 1.4;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
          .total-box {
            font-size: 15px;
            font-weight: 900;
            text-align: center;
            padding: 7px 0;
            margin: 7px 0;
            border-top: 2px dashed #000;
            border-bottom: 2px dashed #000;
          }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 15px;">${schoolName}</div>
        <div class="center" style="font-size: 11px; margin-top: 2px;">وصل تجديد اشتراك باقة حصص</div>
        <div class="double-divider"></div>

        <div class="row">
          <span>رقم السند:</span>
          <span class="bold">${receipt.receiptNumber}</span>
        </div>
        <div class="row">
          <span>التاريخ والوقت:</span>
          <span>${dateFormatted} | ${timeStr}</span>
        </div>
        <div class="row">
          <span>التلميذ:</span>
          <span class="bold">${receipt.studentName}</span>
        </div>
        ${receipt.studentPhone ? `
        <div class="row">
          <span>الهاتف:</span>
          <span>${formatAlgerianPhone(receipt.studentPhone)}</span>
        </div>` : ''}
        <div class="row">
          <span>الفوج / الدورة:</span>
          <span class="bold">${receipt.courseTitle}</span>
        </div>
        ${receipt.teacherName ? `
        <div class="row">
          <span>الأستاذ:</span>
          <span>${receipt.teacherName}</span>
        </div>` : ''}
        <div class="row">
          <span>باقة الحصص:</span>
          <span class="bold">${receipt.sessionsCount} حصص</span>
        </div>
        ${receipt.overageDeducted > 0 ? `
        <div class="row" style="color: #333;">
          <span>حصص مقتطعة من التجاوز:</span>
          <span>${receipt.overageDeducted} حصص</span>
        </div>
        <div class="row">
          <span>رصيد الحصص الفعلي:</span>
          <span class="bold">${receipt.sessionsCount - receipt.overageDeducted} حصص</span>
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
        <div class="row" style="font-weight: bold;">
          <span>المتبقي في الذمة:</span>
          <span>${receipt.remainingDebt.toLocaleString('fr-DZ')} دج</span>
        </div>` : ''}

        <div class="divider"></div>

        <div class="center" style="font-size: 11px; margin-top: 5px;">
          شكراً لثقتكم بمؤسستنا التعليمية
        </div>
        <div class="center" style="font-size: 9px; color: #444; margin-top: 2px;">
          وصل رسمي مسجل بقاعدة بيانات المدرسة
        </div>

        <div style="margin-top: 14px; display: flex; justify-content: space-between; font-size: 11px;">
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
      />

      {/* Selectors Bar */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        {courses.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            لا توجد دورات مسجلة بعد. يرجى إنشاء دورة أو فوج أولاً من تبويب &quot;الدورات والأفواج الجماعية&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4 items-end">
            <Select
              label="اختر الدورة أو الفوج الدراسي"
              value={selectedCourseId || (courses[0]?.id || '')}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              options={courses.map((c) => ({ value: c.id, label: `${c.title} (${c.teacherName})` }))}
            />
            {activeCourse && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', paddingBottom: '8px' }}>
                القاعة: <strong>{activeCourse.roomName}</strong> • التوقيت: <strong>{activeCourse.scheduleTime}</strong>
              </div>
            )}
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
        <div className="table-container">
          <div className="table-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                  قائمة تلاميذ الفوج واستهلاك الحصص ({searchQuery.trim() ? `${filteredStudents.length} من ${totalEnrolled}` : totalEnrolled} تلميذ)
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  اضغط على زر &quot;+ حضور&quot; أو &quot;غياب&quot; لتسجيل الحصة، أو زر &quot;إعادة الاشتراك&quot; للتجديد واقتطاع التجاوزات
                </div>
              </div>

              {/* Student Search Input */}
              <div style={{ minWidth: '240px', maxWidth: '340px', width: '100%' }}>
                <Input
                  placeholder="ابحث عن اسم التلميذ أو هاتفه..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  prefixIcon={<Search size={16} color="var(--color-text-muted)" />}
                  suffixIcon={
                    searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--color-text-muted)',
                        }}
                        title="مسح البحث"
                      >
                        <X size={14} />
                      </button>
                    ) : undefined
                  }
                />
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
            </div>
          </div>

          {/* Desktop Table View (> 768px) */}
          <div className="table-responsive attendance-desktop-view">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>اسم التلميذ</th>
                  <th>رقم الهاتف</th>
                  <th>حالة الدفع</th>
                  <th style={{ minWidth: '180px' }}>استهلاك الحصص</th>
                  <th style={{ minWidth: '240px' }}>تسجيل الحضور والغياب والإجراءات</th>
                  <th>إعادة الاشتراك</th>
                  <th>سجل الحصص</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                      {enrolledList.length === 0 ? (
                        'لا يوجد تلاميذ مسجلين في هذا الفوج حتى الآن.'
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <Search size={28} color="var(--color-text-muted)" />
                          <span style={{ fontWeight: 600 }}>لا توجد نتائج مطابقة لبحثك عن &quot;{searchQuery}&quot;</span>
                          <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                            مسح البحث وعرض كل التلاميذ
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
                    const hasUnpaidDebt = (std.totalDebt || 0) > 0;
                    const hasAttendanceHistory =
                      (std.attendedSessions || 0) > 0 ||
                      (std.attendanceLogs &&
                        std.attendanceLogs.some((l) => {
                          const s = l.status || l.type;
                          return s === 'present' || s === 'absent_counted' || s === 'absent_uncounted';
                        }));

                    return (
                      <tr
                        key={std.id}
                        style={{
                          backgroundColor: hasUnpaidDebt
                            ? 'rgba(239, 68, 68, 0.08)'
                            : isExceeded
                            ? 'rgba(185, 74, 72, 0.04)'
                            : undefined,
                          borderRight: hasUnpaidDebt ? '4px solid #ef4444' : undefined,
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {hasUnpaidDebt && (
                              <AlertTriangle size={15} color="#ef4444" />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: hasUnpaidDebt ? '#b91c1c' : 'var(--color-text-primary)' }}>
                                {std.fullName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {std.academicLevel}
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
                          {hasUnpaidDebt ? (
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
                          ) : (
                            <Badge variant="success">خالص</Badge>
                          )}
                        </td>
                        <td>
                          {/* Visual Circles Sessions Counter */}
                          <SessionCircles student={std} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Button
                              variant={isExceeded ? 'danger' : 'primary'}
                              size="sm"
                              onClick={() => handleIncrement(std.id)}
                              rightIcon={<CheckCircle2 size={14} />}
                              title="تسجيل حضور حصة جديدة"
                            >
                              + حضور ({attended + 1})
                            </Button>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUndoAttendance(std)}
                              rightIcon={<Undo2 size={13} />}
                              disabled={!hasAttendanceHistory}
                              title={
                                hasAttendanceHistory
                                  ? 'تراجع عن آخر تسجيل (حضور أو غياب) في حال الخطأ أو النسيان'
                                  : 'لا توجد حركات حضور أو غياب سابقة للتراجع عنها'
                              }
                              style={{
                                borderColor: hasAttendanceHistory ? '#cbd5e1' : 'var(--color-border)',
                                color: hasAttendanceHistory ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                                opacity: hasAttendanceHistory ? 1 : 0.45,
                                cursor: hasAttendanceHistory ? 'pointer' : 'not-allowed',
                                padding: '0 8px',
                              }}
                            >
                              تراجع
                            </Button>
                          </div>
                        </td>
                        <td>
                          <Button
                            variant={isExceeded ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => openRenewModal(std)}
                            rightIcon={<RotateCw size={13} />}
                          >
                            إعادة الاشتراك
                          </Button>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStudentToDelete(std)}
                              style={{ color: 'var(--color-danger)', padding: '6px' }}
                              title="حذف التلميذ من هذا الفوج واستبعاده نهائياً من مستحقات الأستاذ"
                            >
                              <Trash2 size={15} />
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
          <div className="attendance-mobile-list">
            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                {enrolledList.length === 0 ? (
                  'لا يوجد تلاميذ مسجلين في هذا الفوج حتى الآن.'
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <Search size={28} color="var(--color-text-muted)" />
                    <span style={{ fontWeight: 600 }}>لا توجد نتائج مطابقة لبحثك عن &quot;{searchQuery}&quot;</span>
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                      مسح البحث وعرض كل التلاميذ
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              filteredStudents.map((std) => {
                const attended = std.attendedSessions || 0;
                const total = std.totalSessions && std.totalSessions > 0 ? std.totalSessions : 4;
                const isExceeded = attended > total;
                const hasUnpaidDebt = (std.totalDebt || 0) > 0;
                const hasAttendanceHistory =
                  (std.attendedSessions || 0) > 0 ||
                  (std.attendanceLogs &&
                    std.attendanceLogs.some((l) => {
                      const s = l.status || l.type;
                      return s === 'present' || s === 'absent_counted' || s === 'absent_uncounted';
                    }));

                return (
                  <div
                    key={std.id}
                    className={`attendance-mobile-card ${hasUnpaidDebt ? 'attendance-card-unpaid' : ''} ${isExceeded ? 'attendance-card-exceeded' : ''}`}
                    style={{
                      border: hasUnpaidDebt ? '2px solid #ef4444' : undefined,
                      backgroundColor: hasUnpaidDebt ? 'rgba(239, 68, 68, 0.05)' : undefined,
                    }}
                  >
                    {/* Top: Student Info + Status Badge */}
                    <div className="attendance-card-header">
                      <div className="attendance-student-info">
                        <div
                          className="attendance-student-avatar"
                          style={{
                            backgroundColor: hasUnpaidDebt ? '#fee2e2' : undefined,
                            color: hasUnpaidDebt ? '#b91c1c' : undefined,
                            border: hasUnpaidDebt ? '1px solid #f87171' : undefined,
                          }}
                        >
                          {std.fullName.trim().slice(0, 1)}
                        </div>
                        <div>
                          <div
                            className="attendance-student-name"
                            style={{ color: hasUnpaidDebt ? '#b91c1c' : undefined, fontWeight: 700 }}
                          >
                            {std.fullName}
                          </div>
                          <div className="attendance-student-sub">
                            <span>{std.academicLevel}</span>
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

                      <div className="attendance-card-status">
                        {hasUnpaidDebt ? (
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
                      <SessionCircles student={std} />
                    </div>

                    {/* Bottom: Actions */}
                    <div className="attendance-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Primary Attendance & Absence Buttons Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                        <Button
                          variant={isExceeded ? 'danger' : 'primary'}
                          className="attendance-primary-btn"
                          onClick={() => handleIncrement(std.id)}
                          rightIcon={<CheckCircle2 size={16} />}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          + حضور ({attended + 1})
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={() => openAbsenceModal(std)}
                          rightIcon={<UserX size={16} />}
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            borderColor: '#f97316',
                            color: '#c2410c',
                          }}
                        >
                          تسجيل غياب
                        </Button>
                      </div>

                      {/* Secondary Actions Row */}
                      <div className="attendance-secondary-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Button
                          variant={isExceeded ? 'primary' : 'secondary'}
                          size="sm"
                          className="flex-1"
                          onClick={() => openRenewModal(std)}
                          rightIcon={<RotateCw size={13} />}
                        >
                          إعادة الاشتراك
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!hasAttendanceHistory}
                          onClick={() => handleUndoAttendance(std)}
                          rightIcon={<Undo2 size={13} />}
                          style={{
                            borderColor: hasAttendanceHistory ? '#cbd5e1' : 'var(--color-border)',
                            color: hasAttendanceHistory ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                            opacity: hasAttendanceHistory ? 1 : 0.45,
                          }}
                          title="تراجع عن آخر تسجيل حضور أو غياب"
                        >
                          تراجع
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => setStudentForLogs(std)}
                          rightIcon={<History size={13} />}
                        >
                          السجل ({std.attendanceLogs?.length || 0})
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStudentToDelete(std)}
                          style={{ color: 'var(--color-danger)', padding: '6px 10px' }}
                          title="حذف التلميذ من الفوج واستبعاده من مستحقات الأستاذ"
                        >
                          <Trash2 size={15} />
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
                  label="المبلغ المسدد الآن (دج DZD)"
                  type="number"
                  value={renewPaidAmount}
                  onChange={(e) => setRenewPaidAmount(e.target.value)}
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
                  <div>• سعر باقة الاشتراك الشهري: <strong>${coursePrice.toLocaleString('fr-DZ')} دج</strong> (معدل الحصة الواحدة: <strong>${sessionPrice.toLocaleString('fr-DZ')} دج</strong>).</div>
                  <div>• إجمالي الحصص المستهلكة (حضور + غياب محسوب تم حجز المقعد والأستاذ له): <strong>${consumedSessions} حصص</strong>.</div>
                  <div>• الحصص المتبقية التي لم تبدأ بعد: <strong>${remainingSessions} حصص</strong>.</div>
                  <div style="margin-top: 6px; font-weight: 800; font-size: 12px; color: #1e40af;">
                    المبلغ المالي المستحق للاسترداد قانونياً في حال الانسحاب: ${refundableAmount > 0 ? `${refundableAmount.toLocaleString('fr-DZ')} دج` : '0 دج (تم استهلاك كامل الباقة)'}
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
                {studentForLogs.totalDebt > 0 ? (
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
    </div>
  );
};
