import React, { useState } from 'react';
import {
  Wallet,
  DollarSign,
  CheckCircle,
  FileText,
  Printer,
  Coins,
  Percent,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/data-table/DataTable';
import { StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Drawer } from '../../components/common/Drawer';
import { Input, Select } from '../../components/common/Input';
import { Teacher, TeacherPayoutLog, Course } from '../../types';
import { formatDZD, formatDateArabic, formatDZDInWords, formatAlgerianPhone } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';
import { useSchool } from '../../contexts/SchoolContext';

export const Payroll: React.FC = () => {
  const { success, warning } = useToast();
  const { currentSchool } = useSchool();
  const {
    teachers,
    courses,
    payoutTeacher,
    deleteTeacherPayout,
    resetTeacherPayroll,
    totalTeachersEarned,
    totalTeachersPaid,
    totalTeachersBalanceDue,
  } = useData();

  // Payout Modal State
  const [selectedTeacherForPayout, setSelectedTeacherForPayout] = useState<Teacher | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('نقداً (Cash)');
  const [payoutNote, setPayoutNote] = useState('');

  // Detailed Breakdown Drawer State
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);
  const activeTeacher = teachers.find((t) => t.id === activeTeacherId) || null;

  // Delete Payout Confirmation Modal State
  const [payoutToDelete, setPayoutToDelete] = useState<{ teacherId: string; teacherName: string; log: TeacherPayoutLog } | null>(null);

  // Reset Cycle Confirmation Modal State
  const [teacherToReset, setTeacherToReset] = useState<Teacher | null>(null);

  const handlePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForPayout || !payoutAmount) return;

    const payVal = Number(payoutAmount) || 0;
    const teacher = selectedTeacherForPayout;
    const method = payoutMethod;
    const note = payoutNote;

    payoutTeacher(teacher.id, payVal, method, note);

    success(`تم تسديد ${formatDZD(payVal)} للأستاذ ${teacher.fullName} بنجاح!`, 'تم صرف المستحقات');
    setSelectedTeacherForPayout(null);
    setPayoutAmount('');
    setPayoutNote('');
  };

  const confirmDeletePayout = () => {
    if (!payoutToDelete) return;
    deleteTeacherPayout(payoutToDelete.teacherId, payoutToDelete.log.id);
    success(`تم حذف سجل الدفعة بقيمة ${formatDZD(payoutToDelete.log.amount)} بنجاح.`);
    setPayoutToDelete(null);
  };

  const confirmResetPayroll = () => {
    if (!teacherToReset) return;
    const res = resetTeacherPayroll(teacherToReset.id);
    success(
      `تمت تصفية سجلات الأستاذ "${teacherToReset.fullName}" وبدء دورة جديدة بنجاح! تم تصفير (${res.resetStudentsCount} تلميذ أكملوا حصصهم)، والإبقاء على (${res.remainingStudentsCount} تلميذ لم يكملوا الحصص بعد).`,
      'تسوية الدورة وبدء دورة جديدة'
    );
    setTeacherToReset(null);
  };

  // Get courses assigned to a teacher
  const getTeacherCourses = (teacherId: string) => {
    return courses.filter((c) => c.teacherId === teacherId);
  };

  // Total students enrolled in all courses for a teacher
  const getTeacherTotalStudents = (teacherId: string) => {
    return getTeacherCourses(teacherId).reduce((acc, c) => acc + (c.enrolledList?.length || 0), 0);
  };

  // Total actual gross revenue collected by teacher's courses (students paid + single sessions)
  const getTeacherGrossRevenue = (teacherId: string) => {
    return getTeacherCourses(teacherId).reduce((acc, c) => {
      const price = c.monthlyPrice || 0;
      const regularPaid = c.enrolledList?.reduce((sAcc, s) => {
        if (s.isExempt) return sAcc;
        const debt = s.totalDebt || 0;
        // التلميذ الخالص يمثل سعر الدورة نفسها
        if (debt <= 0) return sAcc + price;
        return sAcc;
      }, 0) || 0;
      const singlePaid = (c.enrolledList || []).reduce((sAcc, s) => {
        const singles = (s.attendanceLogs || []).filter((l) => l.status === 'single_session' || l.type === 'single_session');
        return sAcc + singles.reduce((lAcc, l) => lAcc + (l.amount || 0), 0);
      }, 0);
      return acc + regularPaid + singlePaid;
    }, 0);
  };

  // Calculate teacher share for a specific course based on student attendance & absences & single sessions
  const calculateCourseTeacherShare = (teacher: Teacher, course: Course): number => {
    const type = teacher.compensationType || 'percentage_per_student';
    const commission = teacher.commissionPercentage !== undefined ? teacher.commissionPercentage : 60;
    const fixedRate =
      teacher.fixedRatePerStudent !== undefined
        ? teacher.fixedRatePerStudent
        : teacher.fixedCourseRate !== undefined
        ? teacher.fixedCourseRate
        : 1000;
    const price = course.monthlyPrice || 0;
    const list = course.enrolledList || [];

    let earned = 0;
    list.forEach((std) => {
      const isExempt = !!std.isExempt;
      const allLogs = std.attendanceLogs || [];
      const singleSessionLogs = allLogs.filter((l) => l.status === 'single_session' || l.type === 'single_session');
      const singleSessionTeacherAmount = singleSessionLogs.reduce((acc, l) => acc + (l.teacherAmount || 0), 0);

      if (isExempt) {
        earned += singleSessionTeacherAmount;
        return;
      }

      const debt = std.totalDebt || 0;
      const paid = std.totalPaid || 0;
      const isKhalis = debt <= 0 && singleSessionLogs.length === 0;

      if (isKhalis) {
        // التلميذ الخالص يحصل الأستاذ على كامل حصته من سعر الدورة نفسها
        if (type === 'fixed_per_student' || (type as string) === 'fixed_per_course') {
          earned += fixedRate;
        } else {
          earned += price * (commission / 100);
        }
        return;
      }

      earned += singleSessionTeacherAmount;
    });

    return Math.round(earned);
  };

  const handlePrintTeacherStatement = (teacher: Teacher) => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const formattedDate = `${formatDateArabic(now.toISOString().split('T')[0])} - ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    const teacherCourses = getTeacherCourses(teacher.id);
    const compensationType = teacher.compensationType || 'percentage_per_student';
    const commission = teacher.commissionPercentage !== undefined ? teacher.commissionPercentage : 60;
    const fixedRate = teacher.fixedRatePerStudent !== undefined ? teacher.fixedRatePerStudent : (teacher.fixedCourseRate !== undefined ? teacher.fixedCourseRate : 1000);

    let compText = `نسبة ${commission}% من اشتراك كل تلميذ`;
    if (compensationType === 'fixed_per_student' || (compensationType as string) === 'fixed_per_course') {
      compText = `مبلغ مقطوع: ${fixedRate.toLocaleString('fr-DZ')} دج عن كل تلميذ`;
    }

    // Flatten all students across all courses of this teacher
    const studentRows: string[] = [];
    let totalAllEnrolled = 0;
    let totalExemptCount = 0;
    let totalAllPresent = 0;
    let totalAllSingleSessions = 0;
    let totalAllSingleSessionTeacherAmount = 0;
    let totalAllAbsentCounted = 0;
    let totalAllAbsentUncounted = 0;
    let totalAllCalculatedForTeacher = 0;
    let totalAllSubscribedQuota = 0;
    let totalAllTeacherShare = 0;
    let totalAllStudentPaid = 0;
    let totalAllStudentDebt = 0;
    let totalKhalisCount = 0;

    teacherCourses.forEach((c) => {
      const list = c.enrolledList || [];
      totalAllEnrolled += list.length;

      // Group's current milestone: highest session progress reached in the current cycle
      const courseMaxSessions = Math.max(
        0,
        ...list.map((s) => {
          const logs = s.attendanceLogs || [];
          const renewIdx = logs.findIndex((l) => l.status === 'renewed' || l.type === 'renewed');
          const cycleLogs = renewIdx === -1 ? logs : logs.slice(0, renewIdx);
          const validSessionLogs = cycleLogs.filter((l) => {
            const st = l.status || l.type;
            return st === 'present' || st === 'absent_counted' || st === 'absent_uncounted' || st === 'single_session';
          });
          return Math.max(s.attendedSessions || 0, validSessionLogs.length);
        })
      );

      list.forEach((std) => {
        const isExempt = !!std.isExempt;
        if (isExempt) {
          totalExemptCount++;
        }

        const allLogs = std.attendanceLogs || [];
        // Scope attendance strictly to the current active cycle (after the most recent renewal/cycle reset)
        const latestRenewalIdx = allLogs.findIndex((l) => l.status === 'renewed' || l.type === 'renewed');
        const currentLogs = latestRenewalIdx === -1 ? allLogs : allLogs.slice(0, latestRenewalIdx);

        const presentLogs = currentLogs.filter((l) => l.status === 'present');
        // Single session logs are independent individual sessions; preserve from allLogs
        const singleSessionLogs = allLogs.filter((l) => l.status === 'single_session' || l.type === 'single_session');
        const absentCountedLogs = currentLogs.filter((l) => l.status === 'absent_counted');
        const absentUncountedLogs = currentLogs.filter((l) => l.status === 'absent_uncounted');

        const allCycleSessionLogs = currentLogs.filter((l) => {
          const st = l.status || l.type;
          return st === 'present' || st === 'absent_counted' || st === 'absent_uncounted' || st === 'single_session';
        });

        const singleSessionTeacherAmount = singleSessionLogs.reduce((acc, l) => acc + (l.teacherAmount || 0), 0);
        const singleSessionStudentAmount = singleSessionLogs.reduce((acc, l) => acc + (l.amount || 0), 0);
        const singleSessionCount = singleSessionLogs.length;

        // Determine if student is a dedicated single-session enrollee or regular subscriber
        const hasCourseSub = !!latestRenewalIdx && latestRenewalIdx !== -1 ? true : ((std.totalSessions || 0) > 1 && !std.notes?.includes('حصة واحدة'));
        const isSingleStudent = (singleSessionLogs.length > 0 && !hasCourseSub) || (std.notes?.includes('حصة واحدة') && !hasCourseSub) || (std.totalSessions === 1 && !isExempt && !hasCourseSub);

        const coursePrice = c.monthlyPrice || 0;
        const studentDebt = isExempt ? 0 : (std.totalDebt || 0);
        const isKhalis = !isExempt && !isSingleStudent && studentDebt <= 0;

        // Calculate all money that actually entered from this student (خالص = سعر الدورة نفسها تماماً)
        let studentPaid = 0;
        if (isExempt) {
          studentPaid = singleSessionStudentAmount;
        } else if (isSingleStudent) {
          studentPaid = Math.max(std.totalPaid || 0, singleSessionStudentAmount);
        } else if (isKhalis) {
          // التلميذ الخالص يمثل سعر الدورة نفسها تماماً
          studentPaid = coursePrice;
          totalKhalisCount++;
        } else {
          // التلميذ غير الخالص (مدين) لا يدرج ضمن مقبوضات الخالص
          studentPaid = 0;
        }

        totalAllStudentPaid += studentPaid;
        totalAllStudentDebt += studentDebt;

        const presentCount = currentLogs.length > 0 ? presentLogs.length : (std.attendedSessions || 0);
        const absentCounted = absentCountedLogs.length;
        const absentUncounted = absentUncountedLogs.length;
        const totalCalculatedForTeacher = presentCount + absentCounted + singleSessionCount;

        const studentCycleProgress = Math.max(presentCount, allCycleSessionLogs.length);
        const missedGroupSessions = std.missedGroupSessions || 0;

        totalAllPresent += presentCount;
        totalAllSingleSessions += singleSessionCount;
        totalAllSingleSessionTeacherAmount += singleSessionTeacherAmount;
        totalAllAbsentCounted += absentCounted;
        totalAllAbsentUncounted += absentUncounted;
        totalAllCalculatedForTeacher += totalCalculatedForTeacher;

        // Base package quota per cycle (e.g. 4)
        const basePackage = std.totalSessions && std.totalSessions > 0
          ? std.totalSessions
          : c.totalSessionsDefault && c.totalSessionsDefault > 0
          ? c.totalSessionsDefault
          : 4;

        // In the current active cycle, the subscription quota is simply basePackage (not accumulated)!
        const totalSubscribedSessions = basePackage;
        totalAllSubscribedQuota += totalSubscribedSessions;

        // Formulate absence & single session history details string for current cycle
        const attendanceDetails: string[] = [];

        if (missedGroupSessions > 0) {
          attendanceDetails.push(
            `<span style="color: #b45309; font-weight: bold; background-color: #fef3c7; border: 1px solid #fde68a; padding: 1px 5px; border-radius: 3px; display: inline-block;">⚠️ التحاق متأخر بالفوج (فاتته ${missedGroupSessions === 1 ? 'حصة واحدة' : missedGroupSessions === 2 ? 'حصتان' : `${missedGroupSessions} حصص`} سابقة)</span>`
          );
        }

        if (singleSessionLogs.length > 0) {
          singleSessionLogs.forEach((l) => {
            attendanceDetails.push(`<span style="color: #2563eb; font-weight: bold;">● ${l.date}: حضور حصة واحدة (${(l.amount || 0).toLocaleString('fr-DZ')} دج | للأستاذ: ${(l.teacherAmount || 0).toLocaleString('fr-DZ')} دج)</span>`);
          });
        }
        absentCountedLogs.forEach((l) => {
          attendanceDetails.push(`${l.date} (حصة ${l.sessionNumber}): محسوبة`);
        });
        absentUncountedLogs.forEach((l) => {
          attendanceDetails.push(`${l.date}: معفى ${l.notes ? `(${l.notes})` : ''}`);
        });

        // Student's monetary contribution to teacher based on student payment (خالص = سعر الدورة كاملة)
        let teacherShareFromStudent = 0;
        if (isExempt) {
          // Exempt student does not generate teacher course dues (0 DZD)
          teacherShareFromStudent = singleSessionTeacherAmount;
        } else if (isSingleStudent) {
          teacherShareFromStudent = singleSessionTeacherAmount;
        } else if (isKhalis) {
          // التلميذ الخالص: يحسب حق الأستاذ مباشرة على أساس سعر الدورة نفسها
          if (compensationType === 'fixed_per_student' || (compensationType as string) === 'fixed_per_course') {
            teacherShareFromStudent = fixedRate;
          } else {
            teacherShareFromStudent = Math.round(coursePrice * (commission / 100));
          }
        }
        totalAllTeacherShare += teacherShareFromStudent;

        const studentSchoolNet = isExempt ? 0 : Math.max(0, studentPaid - Math.round(teacherShareFromStudent));

        const isExceeded = presentCount > totalSubscribedSessions;
        const maxBoxes = Math.max(totalSubscribedSessions, presentCount);
        const boxesHtmlList: string[] = [];

        // 1. Missed Group Sessions (فاتت حصص قبل الالتحاق): خلايا فارغة تماماً
        for (let m = 0; m < missedGroupSessions; m++) {
          boxesHtmlList.push(
            `<span style="width: 22px; height: 22px; border: 1.5px solid #334155; border-radius: 2px; background-color: #ffffff; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;" title="حصة ${m + 1} للفوج: فائتة قبل التحاقه"></span>`
          );
        }

        // 2. Student's session quota slots
        for (let i = 0; i < maxBoxes; i++) {
          const log = currentLogs[i];
          if (log && log.status === 'single_session') {
            boxesHtmlList.push(
              `<span style="width: 22px; height: 22px; border: 1.5px solid #334155; border-radius: 2px; background-color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: #0f172a; flex-shrink: 0;" title="حضور حصة واحدة">✓</span>`
            );
          } else if (log && (log.status === 'absent_counted' || log.status === 'absent_uncounted')) {
            // غائب: تبقى الخلية فارغة تماماً
            boxesHtmlList.push(
              `<span style="width: 22px; height: 22px; border: 1.5px solid #334155; border-radius: 2px; background-color: #ffffff; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;" title="غياب مسجل"></span>`
            );
          } else if (i < presentCount) {
            // حاضر: علامة صح في مربع قديم
            boxesHtmlList.push(
              `<span style="width: 22px; height: 22px; border: 1.5px solid #334155; border-radius: 2px; background-color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: #0f172a; flex-shrink: 0;" title="حضور مسجل">✓</span>`
            );
          } else {
            // حصة متبقية: خلية فارغة بإطار خفيف
            boxesHtmlList.push(
              `<span style="width: 22px; height: 22px; border: 1.5px dashed #cbd5e1; border-radius: 2px; background-color: #ffffff; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;" title="حصة متبقية"></span>`
            );
          }
        }

        const sessionsVisualHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 2px 0;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 5px; flex-wrap: wrap;">
              ${boxesHtmlList.join('')}
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px; font-size: 11px;">
              <span style="font-weight: 800; font-family: monospace; color: ${isExceeded ? '#dc2626' : '#1e293b'};">
                ${presentCount} / ${totalSubscribedSessions} حصص
              </span>
              ${isExceeded ? `
                <span style="background-color: #fee2e2; color: #dc2626; padding: 1px 8px; border-radius: 4px; font-size: 9.5px; font-weight: 700; border: 1px solid #fca5a5;">
                  تجاوز بـ ${presentCount - totalSubscribedSessions}
                </span>
              ` : ''}
              ${missedGroupSessions > 0 ? `
                <span style="background-color: #f8fafc; color: #64748b; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; border: 1px solid #e2e8f0;">
                  فاتت ${missedGroupSessions} حصص
                </span>
              ` : ''}
            </div>
          </div>
        `;

        studentRows.push(`
          <tr>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${studentRows.length + 1}</td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-weight: bold;">
              ${std.fullName}
              ${isExempt ? `<div style="display: inline-block; background-color: #fef3c7; color: #92400e; border: 1px solid #f59e0b; padding: 1px 6px; border-radius: 4px; font-size: 9.5px; font-weight: bold; margin-right: 4px;">تلميذ معفى</div>` : ''}
              ${missedGroupSessions > 0 ? `<div style="display: block; background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: bold; margin-top: 3px;">⚠️ التحاق متأخر (فاتته ${missedGroupSessions === 1 ? 'حصة واحدة' : missedGroupSessions === 2 ? 'حصتان' : `${missedGroupSessions} حصص`})</div>` : ''}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${c.title}</td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">
              ${isExempt ? (
                `<span style="color: #92400e; font-weight: bold; font-size: 10px;">معفى</span>`
              ) : isSingleStudent ? (
                studentDebt > 0 ? (
                  `<span style="color: #c2410c; font-weight: bold; font-size: 10px;">حصة واحدة (متبقي: ${studentDebt.toLocaleString('fr-DZ')} دج)</span>`
                ) : (
                  `<span style="color: #2563eb; font-weight: bold; font-size: 10px;">حصة واحدة (خالص)</span>`
                )
              ) : studentDebt <= 0 ? (
                `<strong style="color: #16a34a; font-size: 11.5px;">خالص</strong>`
              ) : studentPaid > 0 ? (
                `<span style="color: #c2410c; font-weight: bold; font-size: 10px;">متبقي: ${studentDebt.toLocaleString('fr-DZ')} دج</span>`
              ) : (
                `<span style="color: #dc2626; font-weight: bold; font-size: 10px;">غير مسدد (دين)</span>`
              )}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">
              ${sessionsVisualHtml}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-size: 10px; color: #4b5563;">
              ${isExempt ? `<span style="color: #92400e; font-weight: bold;">[تلميذ معفى من تسديد مصاريف الدورة]</span><br/>` : ''}
              ${attendanceDetails.length > 0
                ? attendanceDetails.join('<br/>')
                : (totalCalculatedForTeacher === 0
                  ? '<span style="color: #64748b;">دورة جديدة • في انتظار الحصص</span>'
                  : '<span style="color: #16a34a;">لا توجد غيابات مسجلة (حضور كامل)</span>')}
              ${missedGroupSessions > 0 && absentCounted === 0 && absentUncounted === 0 ? '<div style="color: #16a34a; font-size: 9.5px; margin-top: 2px; font-weight: 600;">● حضور منتظم منذ التحاقه (لا توجد غيابات)</div>' : ''}
              ${std.notes && !std.notes.startsWith('حصة واحدة') ? `<div style="margin-top: 3px; font-size: 9px; color: #64748b; font-style: italic;">ملاحظة: ${std.notes}</div>` : ''}
            </td>
          </tr>
        `);
      });
    });

    const teacherPaid = teacher.totalPaid || 0;
    const teacherEarned = totalAllTeacherShare;
    const netTeacherBalanceDue = Math.max(0, teacherEarned - teacherPaid);
    const totalAllSchoolNet = Math.max(0, totalAllStudentPaid - Math.round(totalAllTeacherShare));

    const printWindow = window.open('', '_blank', 'width=1000,height=850');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) للتمكن من طباعة الوصل.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف مستحقات وحضور الأستاذ - ${teacher.fullName}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            margin: 0;
            padding: 8px;
            color: #111827;
            background: #fff;
            direction: rtl;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-box {
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 10px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            color: #1e3a8a;
          }
          .sub-title {
            font-size: 12px;
            font-weight: 600;
            color: #4b5563;
          }
          .info-cards {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          .card {
            border: 1px solid #e5e7eb;
            background-color: #f9fafb;
            padding: 8px 10px;
            border-radius: 6px;
          }
          .card-title {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 3px;
            font-weight: 600;
          }
          .card-val {
            font-size: 13.5px;
            font-weight: 800;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 10.5px;
          }
          th {
            background-color: #f3f4f6;
            color: #1f2937;
            padding: 7px 5px;
            border: 1px solid #d1d5db;
            text-align: right;
            font-weight: 700;
          }
          .legend-box {
            display: flex;
            gap: 14px;
            padding: 7px 12px;
            background-color: #f3f4f6;
            border-radius: 6px;
            font-size: 10px;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }
          .signatures {
            margin-top: 18px;
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
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="title">${schoolName}</div>
            <div class="sub-title">كشف حضور وغيابات التلاميذ للدورة الحالية</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
              الأستاذ: <strong>${teacher.fullName}</strong> | المادة: <strong>${teacher.subject}</strong> | نظام الأتعاب: <strong>${compText}</strong>
            </div>
          </div>
          <div style="text-align: left; font-size: 10px; color: #4b5563;">
            <div>تاريخ الاستخراج: <strong>${formattedDate}</strong></div>
            <div>الرقم المرجعي: <strong>STM-TCH-${teacher.id.replace('t-', '')}-${now.getFullYear()}</strong></div>
          </div>
        </div>

        <div class="legend-box">
          <span>دليل كشف الحضور الكلاسيكي:</span>
          <span><strong style="border: 1.5px solid #334155; padding: 0 4px; border-radius: 2px; font-weight: 900;">✓</strong>: حضور (${totalAllPresent + totalAllSingleSessions} حصة)</span>
          <span><strong style="border: 1.5px solid #334155; padding: 0 8px; border-radius: 2px;">&nbsp;</strong>: غياب أو حصص فائتة قبل الالتحاق (خلية فارغة)</span>
          <span><strong>المبالغ المسددة فعلياً</strong>: ${totalAllStudentPaid.toLocaleString('fr-DZ')} دج</span>
          <span><strong style="color: #92400e;">● تلاميذ معفيون</strong>: ${totalExemptCount} تلميذ</span>
          <span><strong>إجمالي الحصص المسجلة</strong>: ${totalAllPresent + totalAllSingleSessions + totalAllAbsentCounted + totalAllAbsentUncounted} حصة</span>
        </div>

        <div style="font-weight: 700; margin-bottom: 6px; font-size: 11px; color: #1e3a8a;">
          كشف حضور وغياب التلاميذ المفصل في أفواج الأستاذ:
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>اسم التلميذ</th>
              <th>الفوج</th>
              <th style="width: 90px; text-align: center; color: #059669;">المسدد من التلميذ</th>
              <th style="width: 210px; text-align: center; color: #1e3a8a;">استهلاك الحصص (متابعة الحضور)</th>
              <th>تفاصيل وتواريخ الحصص والغياب</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows.length > 0 ? studentRows.join('') : '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #9ca3af;">لا يوجد تلاميذ مسجلين في أفواج هذا الأستاذ حتى الآن</td></tr>'}
          </tbody>
          ${studentRows.length > 0 ? `
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
              <td colspan="3" style="padding: 8px; text-align: center; font-weight: 800; color: #1e3a8a;">
                المجموع الإجمالي العام (${studentRows.length} تلميذ ${totalExemptCount > 0 ? `• منهم ${totalExemptCount} معفى` : ''})
              </td>
              <td style="padding: 8px; text-align: center; font-weight: 800; font-size: 11px;">
                <div style="font-size: 11px; color: #166534; font-weight: 800; background-color: #dcfce7; border: 1px solid #86efac; border-radius: 4px; padding: 2px 6px; display: inline-block; margin-bottom: 3px;">
                  مجموع (${totalKhalisCount}) كلمة خالص
                </div>
                <div style="font-size: 13.5px; color: #15803d; font-weight: 900;">+${totalAllStudentPaid.toLocaleString('fr-DZ')} دج</div>
                <div style="font-size: 8.5px; color: #4b5563; font-weight: 600; margin-top: 1px;">(${totalKhalisCount} خالص × سعر الدورة)</div>
                <div style="font-size: 10px; color: #2563eb; font-weight: 800; margin-top: 3px; border-top: 1px dashed #cbd5e1; padding-top: 2px;">حق الأستاذ: -${Math.round(totalAllTeacherShare).toLocaleString('fr-DZ')} دج</div>
                ${totalAllStudentDebt > 0 ? `<div style="font-size: 8.5px; color: #dc2626; font-weight: bold; margin-top: 1px;">(ديون معلقة: ${totalAllStudentDebt.toLocaleString('fr-DZ')} دج)</div>` : ''}
              </td>
              <td style="padding: 8px; text-align: center; font-weight: 800; font-size: 11px;">
                <div style="font-size: 12px; color: #1e293b;">
                  إجمالي الحضور: <span style="color: #16a34a; font-weight: 800;">${totalAllPresent}</span> / ${totalAllSubscribedQuota} حصة
                </div>
                <div style="display: flex; justify-content: center; gap: 8px; font-size: 9px; color: #64748b; margin-top: 3px;">
                  ${totalAllSingleSessions > 0 ? `<span style="color: #2563eb; font-weight: 700;">● ${totalAllSingleSessions} فردية</span>` : ''}
                  ${totalAllAbsentCounted > 0 ? `<span style="color: #dc2626; font-weight: 700;">● ${totalAllAbsentCounted} غياب محسوب</span>` : ''}
                  ${totalAllAbsentUncounted > 0 ? `<span style="color: #ea580c; font-weight: 700;">● ${totalAllAbsentUncounted} غياب معفى</span>` : ''}
                </div>
              </td>
              <td style="padding: 8px; font-size: 10px; color: #64748b;">
                إجمالي الحصص: ${totalAllPresent + totalAllSingleSessions + totalAllAbsentCounted + totalAllAbsentUncounted} حصة
              </td>
            </tr>
          </tfoot>
          ` : ''}
        </table>

        <!-- Total Financial Clearance & Teacher Rights Summary Box -->
        <div style="margin-top: 14px; margin-bottom: 12px; border: 2px solid #2563eb; border-radius: 8px; background-color: #f8fafc; padding: 12px 16px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="font-size: 13px; font-weight: 800; color: #1e3a8a; display: flex; align-items: center; gap: 6px;">
              <span>💰</span>
              <span>خلاصة الحساب المالي: خلاص المقبوضات كاملة وحق الأستاذ وحق المؤسسة</span>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b;">
              طريقة احتساب الأتعاب: <strong>${compText}</strong>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
            <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10.5px; color: #166534; font-weight: 800; margin-bottom: 2px;">1. خلاص مقبوضات التلاميذ (+)</div>
              <div style="font-size: 11px; color: #15803d; font-weight: 800; margin-bottom: 2px;">مجموع (${totalKhalisCount}) كلمة خالص</div>
              <div style="font-size: 16px; font-weight: 900; color: #15803d;">+${totalAllStudentPaid.toLocaleString('fr-DZ')} دج</div>
              <div style="font-size: 8.5px; color: #166534; margin-top: 2px; font-weight: 600;">(كل خالص = سعر الدورة نفسها)</div>
            </div>

            <div style="background-color: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10.5px; color: #1e40af; font-weight: 800; margin-bottom: 2px;">2. حق الأستاذ كامل (-)</div>
              <div style="font-size: 11px; color: #2563eb; font-weight: 800; margin-bottom: 2px;">محسوب بناءً على (${totalKhalisCount}) خالص</div>
              <div style="font-size: 16px; font-weight: 900; color: #2563eb;">-${Math.round(totalAllTeacherShare).toLocaleString('fr-DZ')} دج</div>
              <div style="font-size: 8.5px; color: #3b82f6; margin-top: 2px; font-weight: 600;">(${compText})</div>
            </div>

            <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10.5px; color: #475569; font-weight: 800; margin-bottom: 2px;">3. صافي حق المؤسسة الباقي (=)</div>
              <div style="font-size: 11px; color: #475569; font-weight: 800; margin-bottom: 2px;">المقبوضات - حق الأستاذ</div>
              <div style="font-size: 16px; font-weight: 900; color: #0f172a;">+${totalAllSchoolNet.toLocaleString('fr-DZ')} دج</div>
              <div style="font-size: 8.5px; color: #64748b; margin-top: 2px; font-weight: 600;">المتبقي لصندوق المؤسسة</div>
            </div>

            <div style="background-color: ${netTeacherBalanceDue > 0 ? '#fffbeb' : '#f0fdf4'}; border: 1.5px solid ${netTeacherBalanceDue > 0 ? '#fde68a' : '#86efac'}; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10.5px; color: ${netTeacherBalanceDue > 0 ? '#92400e' : '#166534'}; font-weight: 800; margin-bottom: 2px;">4. المتبقي في الذمة للأستاذ</div>
              <div style="font-size: 11px; color: ${netTeacherBalanceDue > 0 ? '#b45309' : '#15803d'}; font-weight: 800; margin-bottom: 2px;">المستحق - المدفوع مسبقاً</div>
              <div style="font-size: 16px; font-weight: 900; color: ${netTeacherBalanceDue > 0 ? '#d97706' : '#15803d'};">
                ${netTeacherBalanceDue.toLocaleString('fr-DZ')} دج
              </div>
              <div style="font-size: 8.5px; color: ${netTeacherBalanceDue > 0 ? '#b45309' : '#16a34a'}; margin-top: 2px; font-weight: 600;">
                ${teacherPaid > 0 ? `(تم تسديد: ${teacherPaid.toLocaleString('fr-DZ')} دج)` : (netTeacherBalanceDue > 0 ? 'مستحق الصرف' : 'خالص بالكامل ✓')}
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Clarification Box -->
        <div style="margin-top: 12px; margin-bottom: 14px; padding: 10px 14px; background-color: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 6px; font-size: 11px; color: #92400e; line-height: 1.6;">
          <div style="font-weight: 800; font-size: 11.5px; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; color: #78350f;">
            <span>📌</span>
            <span>توضيح بخصوص خلاص مقبوضات التلاميذ والمستحقات في هذه الدورة:</span>
          </div>
          <div>
            • <strong>التلاميذ المعفيون:</strong> ${totalExemptCount > 0 ? `يتضمن هذا الكشف عدد (<strong>${totalExemptCount}</strong>) تلميذ معفى من تسديد مصاريف الدورة، ومكتوب في خاناتهم بوضوح <strong>"معفى"</strong> (لا يترتب عليهم مستحق للأستاذ).` : 'لا يوجد تلاميذ معفيون في أفواج هذا الأستاذ حالياً.'}
          </div>
          <div>
            • <strong>خلاص مقبوضات التلاميذ:</strong> إجمالي المقبوضات المحسوبة بلغت <strong>${totalAllStudentPaid.toLocaleString('fr-DZ')} دج</strong> وهي تمثل مجموع (${totalKhalisCount}) كلمة خالص (حيث كل كلمة خالص تمثل سعر الدورة نفسها تماماً)${totalAllStudentDebt > 0 ? ` مع بقاء ديون معلقة بقيمة <strong>${totalAllStudentDebt.toLocaleString('fr-DZ')} دج</strong> بذمة التلاميذ قيد التحصيل وتضاف فور تسديدها` : ' (تم تحصيل كامل اشتراكات الفوج بنجاح)'}.
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            توقيع وختم إدارة المدرسة
            <div style="height: 40px;"></div>
          </div>
          <div class="sig-box">
            توقيع واستلام الأستاذ: <strong>${teacher.fullName}</strong>
            <div style="font-size: 9.5px; color: #6b7280; margin-top: 2px;">
              أقر باستلامي المستحقات وموافقتي على كشف الحضور والغيابات المذكور أعلاه
            </div>
            <div style="height: 30px;"></div>
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

  // Print Official Detailed Teacher & School Share Financial Statement (A4)
  const handlePrintTeacherFinancialStatement = (teacher: Teacher) => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const formattedDate = `${formatDateArabic(now.toISOString().split('T')[0])} - ${now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const teacherCourses = getTeacherCourses(teacher.id);

    const printWindow = window.open('', '_blank', 'width=920,height=780');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) لتوليد كشف الحساب.');
      return;
    }

    const compensationType = teacher.compensationType || 'percentage_per_student';
    const commission = teacher.commissionPercentage !== undefined ? teacher.commissionPercentage : 60;
    const fixedRate =
      teacher.fixedRatePerStudent !== undefined
        ? teacher.fixedRatePerStudent
        : teacher.fixedCourseRate !== undefined
        ? teacher.fixedCourseRate
        : 1000;

    const compText =
      compensationType === 'fixed_per_student' || (compensationType as string) === 'fixed_per_course'
        ? `مبلغ مقطوع: ${formatDZD(fixedRate)} / تلميذ`
        : `نسبة الأستاذ: ${commission}% (المؤسسة: ${100 - commission}%)`;

    let totalAllEnrolled = 0;
    let totalAllExempt = 0;
    let totalAllFullPaidCount = 0;
    let totalAllFullPaidAmount = 0;
    let totalAllPartialDebtorsCount = 0;
    let totalAllPartialPaidAmount = 0;
    let totalAllPartialDebtAmount = 0;
    let totalAllFullDebtorsCount = 0;
    let totalAllFullDebtAmount = 0;
    let totalAllSingleSessionCount = 0;
    let totalAllSingleSessionAmount = 0;
    let totalAllSingleSessionTeacherAmount = 0;
    let totalAllSingleSessionSchoolAmount = 0;

    let totalAllCoursePaid = 0;
    let totalAllCourseTeacherShare = 0;
    let totalAllCourseSchoolNet = 0;
    let totalAllCourseDebt = 0;

    let totalAllPresent = 0;
    let totalAllAbsentCounted = 0;
    let totalAllAbsentUncounted = 0;
    let totalAllCalculatedSessions = 0;

    const singleSessionDetails: Array<{
      studentName: string;
      courseTitle: string;
      date: string;
      amount: number;
      teacherAmount: number;
      schoolAmount: number;
      notes?: string;
    }> = [];

    const courseRows = teacherCourses
      .map((c, idx) => {
        const enrolled = c.enrolledList?.length || 0;
        let courseTotalPaid = 0;
        let courseTotalDebt = 0;
        let courseExemptCount = 0;
        let courseFullPaidCount = 0;
        let coursePartialCount = 0;
        let courseFullDebtorCount = 0;
        let courseSingleCount = 0;

        (c.enrolledList || []).forEach((s) => {
          const isEx = !!s.isExempt;
          const sLogs = s.attendanceLogs || [];
          const sSingles = sLogs.filter((l) => l.status === 'single_session' || l.type === 'single_session');
          const sSingleAmount = sSingles.reduce((acc, l) => acc + (l.amount || 0), 0);
          const sSingleTeacherAmount = sSingles.reduce((acc, l) => acc + (l.teacherAmount || 0), 0);

          const sRenewIdx = sLogs.findIndex((l) => l.status === 'renewed' || l.type === 'renewed');
          const sHasCourseSub = sRenewIdx !== -1 ? true : ((s.totalSessions || 0) > 1 && !s.notes?.includes('حصة واحدة'));
          const sIsSingle = (sSingles.length > 0 && !sHasCourseSub) || (s.notes?.includes('حصة واحدة') && !sHasCourseSub) || (s.totalSessions === 1 && !isEx && !sHasCourseSub);

          const coursePrice = c.monthlyPrice || 0;
          const sDebt = isEx ? 0 : (s.totalDebt || 0);
          const isKhalis = !isEx && !sIsSingle && sDebt <= 0;

          let sPaid = 0;
          if (isEx) {
            sPaid = sSingleAmount;
          } else if (sIsSingle) {
            sPaid = Math.max(s.totalPaid || 0, sSingleAmount);
          } else if (isKhalis) {
            sPaid = coursePrice; // التلميذ الخالص يمثل سعر الدورة نفسها
          } else {
            sPaid = (s.totalPaid || 0) + sSingleAmount;
          }

          courseTotalPaid += sPaid;
          courseTotalDebt += sDebt;

          if (isEx) {
            courseExemptCount++;
            totalAllExempt++;
            if (sSingleAmount > 0) {
              courseSingleCount++;
              totalAllSingleSessionCount += sSingles.length;
              totalAllSingleSessionAmount += sSingleAmount;
              totalAllSingleSessionTeacherAmount += sSingleTeacherAmount;
              totalAllSingleSessionSchoolAmount += Math.max(0, sSingleAmount - sSingleTeacherAmount);
            }
          } else if (sIsSingle) {
            courseSingleCount++;
            totalAllSingleSessionCount += Math.max(1, sSingles.length);
            totalAllSingleSessionAmount += sPaid;
            totalAllSingleSessionTeacherAmount += sSingleTeacherAmount;
            totalAllSingleSessionSchoolAmount += Math.max(0, sPaid - sSingleTeacherAmount);
          } else if (isKhalis || (sDebt <= 0 && sPaid > 0)) {
            courseFullPaidCount++;
            totalAllFullPaidCount++;
            totalAllFullPaidAmount += sPaid;
          } else if (sDebt > 0 && sPaid > 0) {
            coursePartialCount++;
            totalAllPartialDebtorsCount++;
            totalAllPartialPaidAmount += sPaid;
            totalAllPartialDebtAmount += sDebt;
          } else if (sDebt > 0 && sPaid <= 0) {
            courseFullDebtorCount++;
            totalAllFullDebtorsCount++;
            totalAllFullDebtAmount += sDebt;
          }

          const currentLogs = sRenewIdx === -1 ? sLogs : sLogs.slice(0, sRenewIdx);
          const pres = currentLogs.filter((l) => l.status === 'present').length;
          const absCounted = currentLogs.filter((l) => l.status === 'absent_counted').length;
          const absUncounted = currentLogs.filter((l) => l.status === 'absent_uncounted').length;
          const singlesCount = sSingles.length;

          totalAllPresent += pres;
          totalAllAbsentCounted += absCounted;
          totalAllAbsentUncounted += absUncounted;
          totalAllCalculatedSessions += (pres + absCounted + singlesCount);

          sSingles.forEach((l) => {
            const p = l.amount || 0;
            const t = l.teacherAmount || 0;
            singleSessionDetails.push({
              studentName: s.fullName,
              courseTitle: c.title,
              date: l.date,
              amount: p,
              teacherAmount: t,
              schoolAmount: Math.max(0, p - t),
              notes: l.notes,
            });
          });
        });

        const coursePrice = c.monthlyPrice || 0;
        const teacherRatePerStudent =
          teacher.compensationType === 'fixed_per_student' || (teacher.compensationType as string) === 'fixed_per_course'
            ? (teacher.fixedRatePerStudent !== undefined ? teacher.fixedRatePerStudent : (teacher.fixedCourseRate || 1000))
            : Math.round(coursePrice * ((teacher.commissionPercentage !== undefined ? teacher.commissionPercentage : 60) / 100));
        const schoolRemainderPerStudent = Math.max(0, coursePrice - teacherRatePerStudent);

        const totalPaid = courseTotalPaid;
        const totalDebt = courseTotalDebt;
        const courseTeacherShare = calculateCourseTeacherShare(teacher, c);
        const courseSchoolNet = Math.max(0, totalPaid - courseTeacherShare);
        const expectedCourseSchoolNet = Math.max(0, (totalPaid + totalDebt) - courseTeacherShare);

        totalAllEnrolled += enrolled;
        totalAllCoursePaid += totalPaid;
        totalAllCourseTeacherShare += courseTeacherShare;
        totalAllCourseSchoolNet += courseSchoolNet;
        totalAllCourseDebt += totalDebt;

        return `
        <tr>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-weight: bold;">
            ${c.title}
            <div style="font-size: 8.5px; color: #64748b;">${c.academicLevel}</div>
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0f172a;">
            ${coursePrice.toLocaleString('fr-DZ')} دج
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center;">
            <div style="font-size: 9.5px; font-weight: 700; color: #2563eb;">للأستاذ: ${teacherRatePerStudent.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 9px; font-weight: 800; color: #15803d;">للمؤسسة (الباقي): ${schoolRemainderPerStudent.toLocaleString('fr-DZ')} دج</div>
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center;">
            <strong>${enrolled} تلميذ</strong>
            <div style="font-size: 8.5px; color: #475569; margin-top: 2px;">
              ${courseFullPaidCount} خالص • ${coursePartialCount} جزئي • ${courseFullDebtorCount} غير مسدد ${courseSingleCount > 0 ? `• ${courseSingleCount} حصة` : ''} ${courseExemptCount > 0 ? `• ${courseExemptCount} معفى` : ''}
            </div>
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #16a34a;">+${totalPaid.toLocaleString('fr-DZ')} دج</td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #2563eb;">-${courseTeacherShare.toLocaleString('fr-DZ')} دج</td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #15803d;">
            <div>+${courseSchoolNet.toLocaleString('fr-DZ')} دج</div>
            ${totalDebt > 0 ? `<div style="font-size: 8.5px; color: #64748b; font-weight: normal;">(متوقع: +${expectedCourseSchoolNet.toLocaleString('fr-DZ')} دج)</div>` : ''}
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #dc2626;">${totalDebt > 0 ? `${totalDebt.toLocaleString('fr-DZ')} دج` : '<span style="color: #16a34a;">0 دج (خالص ✓)</span>'}</td>
        </tr>
      `;
      })
      .join('');

    const singleSessionRows = singleSessionDetails
      .map(
        (s, idx) => `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: bold;">${s.studentName}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${s.courseTitle}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${s.date}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold;">${s.amount.toLocaleString('fr-DZ')} دج</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #dc2626;">${s.teacherAmount.toLocaleString('fr-DZ')} دج</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #16a34a;">+${s.schoolAmount.toLocaleString('fr-DZ')} دج</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10px; color: #475569;">${s.notes || 'حصة واحدة مسددة'}</td>
        </tr>
      `
      )
      .join('');

    // Payouts for current cycle
    const history = teacher.payoutHistory || [];
    const lastSettlementIndex = history.findIndex((p) => p.isCycleSettlement);
    const currentCyclePayouts =
      lastSettlementIndex === -1
        ? history.filter((p) => !p.isCycleSettlement)
        : history.slice(0, lastSettlementIndex).filter((p) => !p.isCycleSettlement);

    const payoutRows = currentCyclePayouts
      .map(
        (p, idx) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${formatDateArabic(p.date)}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${p.paymentMethod || 'نقداً'}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #15803d;">+${(p.amount || 0).toLocaleString('fr-DZ')} دج</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10px; color: #475569;">${p.notes || 'دفعة مستحقات مسددة'}</td>
      </tr>
    `
      )
      .join('');

    // Synchronize teacher earnings and balances strictly with attendance share calculations
    const teacherEarned = Math.round(totalAllCourseTeacherShare);
    const teacherPaid = teacher.totalPaid || 0;
    const teacherBalanceDue = Math.max(0, teacherEarned - teacherPaid);
    const schoolNet = Math.max(0, totalAllCoursePaid - teacherEarned);
    const totalAllCourseExpectedSchoolNet = Math.max(0, (totalAllCoursePaid + totalAllCourseDebt) - teacherEarned);
    const schoolMarginPct = totalAllCoursePaid > 0 ? Math.round((schoolNet / totalAllCoursePaid) * 100) : 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف الحساب المالي للأستاذ وحق المؤسسة الصافي - ${teacher.fullName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            margin: 0;
            padding: 8px;
            color: #0f172a;
            background: #fff;
            direction: rtl;
            font-size: 11px;
            line-height: 1.45;
          }
          .header-box {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            color: #1e3a8a;
            margin-bottom: 3px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 7px;
            margin-bottom: 12px;
          }
          .kpi-card {
            border: 1.5px solid #cbd5e1;
            background-color: #f8fafc;
            padding: 7px 9px;
            border-radius: 7px;
          }
          .kpi-title {
            font-size: 9.5px;
            color: #475569;
            margin-bottom: 3px;
            font-weight: 600;
          }
          .kpi-val {
            font-size: 13px;
            font-weight: 800;
          }
          .stat-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 7px;
            margin-bottom: 10px;
          }
          .stat-card {
            border-radius: 7px;
            padding: 7px 9px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .attendance-bar {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 5px 10px;
            font-size: 9.5px;
            color: #334155;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 10.5px;
          }
          th {
            background-color: #f1f5f9;
            color: #1e293b;
            padding: 6px 7px;
            border: 1px solid #cbd5e1;
            text-align: right;
            font-weight: 700;
          }
          .signatures {
            margin-top: 22px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            page-break-inside: avoid;
          }
          .sig-box {
            border-top: 1px dashed #94a3b8;
            padding-top: 6px;
            text-align: center;
            font-weight: 700;
            font-size: 11px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="title">${schoolName}</div>
            <div style="font-size: 13px; font-weight: 700; color: #2563eb;">كشف الحساب المالي المفصل للأستاذ وحق المؤسسة الصافي</div>
            <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">
              الأستاذ: <strong>${teacher.fullName}</strong> • مادة: <strong>${teacher.subject}</strong> • هاتف: <strong>${teacher.phone || '—'}</strong>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 1px;">
              نظام التعاقد المالي: <strong>${compText}</strong>
            </div>
          </div>
          <div style="text-align: left; font-size: 10px; color: #475569;">
            <div>تاريخ الكشف: <strong>${formattedDate}</strong></div>
            <div>الرقم المرجعي: <strong>FIN-${teacher.id.replace('t-', '')}-${now.getFullYear()}</strong></div>
            <div style="color: #16a34a; font-weight: 700; margin-top: 2px;">كشف مالي مطابق تماماً لكشف الحضور</div>
          </div>
        </div>

        <!-- Section: Top KPI Financial Summary -->
        <div class="kpi-grid">
          <div class="kpi-card" style="border-color: #22c55e;">
            <div class="kpi-title">1. مقبوضات أفواج الأستاذ (+)</div>
            <div class="kpi-val" style="color: #16a34a;">+${totalAllCoursePaid.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${teacherCourses.length} أفواج • ${totalAllEnrolled} تلميذ</div>
          </div>

          <div class="kpi-card" style="border-color: #3b82f6;">
            <div class="kpi-title">2. مستحقات الأستاذ (-)</div>
            <div class="kpi-val" style="color: #2563eb;">-${teacherEarned.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">المحسوب عن الحصص</div>
          </div>

          <div class="kpi-card" style="border: 2px solid #16a34a; background-color: #f0fdf4;">
            <div class="kpi-title" style="color: #15803d; font-weight: 800;">3. صافي المؤسسة الباقي (=)</div>
            <div class="kpi-val" style="color: #15803d; font-size: 15px; font-weight: 900;">
              +${schoolNet.toLocaleString('fr-DZ')} دج
            </div>
            <div style="font-size: 9px; color: #166534; font-weight: 700; margin-top: 2px;">
              المحصل فعلياً (هامش ربح محقق: ${schoolMarginPct}%)
            </div>
            ${totalAllCourseDebt > 0 ? `
              <div style="font-size: 8.5px; color: #047857; margin-top: 2px; border-top: 1px dashed #86efac; padding-top: 2px;">
                الصافي المتوقع عند استيفاء الديون: <strong>+${totalAllCourseExpectedSchoolNet.toLocaleString('fr-DZ')} دج</strong>
              </div>
            ` : ''}
          </div>

          <div class="kpi-card">
            <div class="kpi-title">4. المسدد للأستاذ (الدفعات)</div>
            <div class="kpi-val" style="color: #2563eb;">${teacherPaid.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 9px; color: ${teacherPaid > 0 ? '#1d4ed8' : '#b45309'}; margin-top: 2px; font-weight: 600;">
              ${teacherPaid > 0 ? 'دفعات مسددة للأستاذ' : 'في انتظار الصرف'}
            </div>
          </div>

          <div class="kpi-card" style="border: 2px solid ${teacherBalanceDue > 0 ? '#f59e0b' : '#10b981'};">
            <div class="kpi-title">5. صافي الرصيد المتبقي للأستاذ</div>
            <div class="kpi-val" style="color: ${teacherBalanceDue > 0 ? '#d97706' : '#16a34a'};">
              ${teacherBalanceDue.toLocaleString('fr-DZ')} دج
            </div>
            <div style="font-size: 9px; color: ${teacherBalanceDue > 0 ? '#b45309' : '#15803d'}; margin-top: 2px; font-weight: 600;">
              ${teacherBalanceDue > 0 ? 'مستحق الصرف للأستاذ' : 'تم تسوية كامل المستحقات ✓'}
            </div>
          </div>
        </div>

        <!-- Section: Statistical Classification & Breakdown of Students -->
        <div style="font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #1e3a8a;">
          إحصائيات وتصنيف الوضعية المالية للتلاميذ في أفواج الأستاذ:
        </div>
        <div class="stat-grid">
          <!-- 1. Full Paid Subscribers -->
          <div class="stat-card" style="border: 1.5px solid #86efac; background-color: #f0fdf4;">
            <div style="font-size: 9.5px; font-weight: 700; color: #15803d; margin-bottom: 2px;">
              ✓ مسددو الاشتراك كاملاً
            </div>
            <div style="font-size: 13.5px; font-weight: 800; color: #16a34a;">
              ${totalAllFullPaidCount} <span style="font-size: 9.5px; font-weight: 600;">تلميذ</span>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #15803d; margin-top: 2px;">
              +${totalAllFullPaidAmount.toLocaleString('fr-DZ')} دج
            </div>
            <div style="font-size: 8px; color: #166534; margin-top: 1px;">
              (تسديد 100% • بدون ديون)
            </div>
          </div>

          <!-- 2. Partial Debtors -->
          <div class="stat-card" style="border: 1.5px solid #fed7aa; background-color: #fff7ed;">
            <div style="font-size: 9.5px; font-weight: 700; color: #c2410c; margin-bottom: 2px;">
              ⚠️ مدينون جزئياً (متبقي)
            </div>
            <div style="font-size: 13.5px; font-weight: 800; color: #ea580c;">
              ${totalAllPartialDebtorsCount} <span style="font-size: 9.5px; font-weight: 600;">تلميذ</span>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #059669; margin-top: 2px;">
              دفعوا: +${totalAllPartialPaidAmount.toLocaleString('fr-DZ')} دج
            </div>
            <div style="font-size: 8px; color: #dc2626; font-weight: 700; margin-top: 1px;">
              باقي ديون: ${totalAllPartialDebtAmount.toLocaleString('fr-DZ')} دج
            </div>
          </div>

          <!-- 3. Full Debtors -->
          <div class="stat-card" style="border: 1.5px solid #fecaca; background-color: #fef2f2;">
            <div style="font-size: 9.5px; font-weight: 700; color: #b91c1c; margin-bottom: 2px;">
              ✕ لم يدفعوا إطلاقاً (ديون)
            </div>
            <div style="font-size: 13.5px; font-weight: 800; color: #dc2626;">
              ${totalAllFullDebtorsCount} <span style="font-size: 9.5px; font-weight: 600;">تلميذ</span>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #dc2626; margin-top: 2px;">
              ديون: ${totalAllFullDebtAmount.toLocaleString('fr-DZ')} دج
            </div>
            <div style="font-size: 8px; color: #991b1b; margin-top: 1px;">
              (المدفوع: 0 دج • ذمة كاملة)
            </div>
          </div>

          <!-- 4. Single Session -->
          <div class="stat-card" style="border: 1.5px solid #bfdbfe; background-color: #eff6ff;">
            <div style="font-size: 9.5px; font-weight: 700; color: #1d4ed8; margin-bottom: 2px;">
              ● أصحاب الحصة الواحدة
            </div>
            <div style="font-size: 13.5px; font-weight: 800; color: #2563eb;">
              ${totalAllSingleSessionCount} <span style="font-size: 9.5px; font-weight: 600;">حصة</span>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #1e40af; margin-top: 2px;">
              مقبوضات: +${totalAllSingleSessionAmount.toLocaleString('fr-DZ')} دج
            </div>
            <div style="font-size: 8px; color: #1d4ed8; margin-top: 1px;">
              (أستاذ: ${totalAllSingleSessionTeacherAmount.toLocaleString('fr-DZ')} | مدرسة: ${totalAllSingleSessionSchoolAmount.toLocaleString('fr-DZ')})
            </div>
          </div>

          <!-- 5. Exempt Students -->
          <div class="stat-card" style="border: 1.5px solid #fde68a; background-color: #fffbeb;">
            <div style="font-size: 9.5px; font-weight: 700; color: #92400e; margin-bottom: 2px;">
              🤝 التلاميذ المعفون
            </div>
            <div style="font-size: 13.5px; font-weight: 800; color: #d97706;">
              ${totalAllExempt} <span style="font-size: 9.5px; font-weight: 600;">تلميذ</span>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #92400e; margin-top: 2px;">
              معفى من الرسوم
            </div>
            <div style="font-size: 8px; color: #b45309; margin-top: 1px;">
              (فئات اجتماعية • تكفل المؤسسة)
            </div>
          </div>
        </div>

        <!-- Attendance Reconciliation Bar matching Attendance Sheet -->
        <div class="attendance-bar">
          <span><strong>📊 إحصائيات الحضور للحصص (مطابقة لكشف الحضور):</strong></span>
          <span><strong style="color: #16a34a;">● حضور عادي:</strong> ${totalAllPresent} حصة</span>
          <span><strong style="color: #2563eb;">● حضور حصة واحدة:</strong> ${totalAllSingleSessionCount} حصة (${totalAllSingleSessionTeacherAmount.toLocaleString('fr-DZ')} دج للأستاذ)</span>
          <span><strong style="color: #dc2626;">● غياب محسوب:</strong> ${totalAllAbsentCounted} حصة</span>
          <span><strong style="color: #ea580c;">● غياب معفى:</strong> ${totalAllAbsentUncounted} حصة</span>
          <span><strong>المجموع المحسوب للأستاذ:</strong> <strong style="color: #1e3a8a;">${totalAllCalculatedSessions} حصة</strong></span>
        </div>

        <div style="font-size: 12px; font-weight: 700; margin-bottom: 5px; color: #1e3a8a;">
          أولاً: تفاصيل الأفواج التعليمية وتوزيع الإيرادات والأتعاب (سعر الدورة = مستحق الأستاذ + صافي المؤسسة الباقي)
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>اسم الفوج والمستوى</th>
              <th style="width: 75px; text-align: center;">سعر الدورة</th>
              <th style="width: 135px; text-align: center; color: #1e3a8a;">اتفاق الأتعاب (أستاذ / صافي المؤسسة)</th>
              <th style="text-align: center;">التلاميذ وتفصيل الوضعية</th>
              <th style="text-align: left; color: #16a34a;">المقبوضات المحصلة (+)</th>
              <th style="text-align: left; color: #2563eb;">مستحق الأستاذ (-)</th>
              <th style="text-align: left; color: #15803d; font-weight: 800;">صافي المؤسسة الباقي (=)</th>
              <th style="text-align: left; color: #dc2626;">الديون المعلقة</th>
            </tr>
          </thead>
          <tbody>
            ${courseRows || '<tr><td colspan="9" style="text-align: center; padding: 10px; color: #94a3b8;">لا توجد أفواج مسجلة لهذا الأستاذ</td></tr>'}
          </tbody>
          ${teacherCourses.length > 0 ? `
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
              <td colspan="4" style="padding: 7px 8px; text-align: center; font-weight: 800; color: #1e3a8a;">
                المجموع الإجمالي للأفواج (${teacherCourses.length} أفواج • ${totalAllEnrolled} تلميذ)
              </td>
              <td style="padding: 7px 8px; text-align: center; font-weight: 800; font-size: 9.5px; color: #334155;">
                ${totalAllFullPaidCount} خالص | ${totalAllPartialDebtorsCount} جزئي | ${totalAllFullDebtorsCount} غير مسدد ${totalAllSingleSessionCount > 0 ? `| ${totalAllSingleSessionCount} حصة` : ''} ${totalAllExempt > 0 ? `| ${totalAllExempt} معفى` : ''}
              </td>
              <td style="padding: 7px 8px; text-align: left; font-weight: 800; color: #16a34a; font-size: 11px;">+${totalAllCoursePaid.toLocaleString('fr-DZ')} دج</td>
              <td style="padding: 7px 8px; text-align: left; font-weight: 800; color: #2563eb; font-size: 11px;">-${totalAllCourseTeacherShare.toLocaleString('fr-DZ')} دج</td>
              <td style="padding: 7px 8px; text-align: left; font-weight: 800; color: #15803d; font-size: 11px;">
                <div>+${totalAllCourseSchoolNet.toLocaleString('fr-DZ')} دج</div>
                ${totalAllCourseDebt > 0 ? `<div style="font-size: 8.5px; color: #166534; font-weight: normal;">(متوقع: +${totalAllCourseExpectedSchoolNet.toLocaleString('fr-DZ')} دج)</div>` : ''}
              </td>
              <td style="padding: 7px 8px; text-align: left; font-weight: 800; color: #dc2626; font-size: 11px;">${totalAllCourseDebt > 0 ? `${totalAllCourseDebt.toLocaleString('fr-DZ')} دج` : '0 دج (خالص ✓)'}</td>
            </tr>
          </tfoot>
          ` : ''}
        </table>

        ${
          singleSessionDetails.length > 0
            ? `
          <div style="font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #1e3a8a; margin-top: 14px;">
            ثانياً: الحصص الفردية الواحدة المسددة وتوزيع مبالغها (الأستاذ والمدرسة)
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th>اسم التلميذ</th>
                <th>الفوج</th>
                <th style="text-align: center;">التاريخ</th>
                <th style="text-align: left;">المبلغ المسدد</th>
                <th style="text-align: left;">للأستاذ</th>
                <th style="text-align: left; color: #16a34a;">صافي المؤسسة الباقي</th>
                <th>التبرير والبيان</th>
              </tr>
            </thead>
            <tbody>
              ${singleSessionRows}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="4" style="padding: 6px 7px; text-align: center; font-weight: 800;">
                  مجموع الحصص الفردية (${singleSessionDetails.length} حصة)
                </td>
                <td style="padding: 6px 7px; text-align: left; font-weight: 800; color: #1e3a8a;">
                  ${totalAllSingleSessionAmount.toLocaleString('fr-DZ')} دج
                </td>
                <td style="padding: 6px 7px; text-align: left; font-weight: 800; color: #dc2626;">
                  ${totalAllSingleSessionTeacherAmount.toLocaleString('fr-DZ')} دج
                </td>
                <td style="padding: 6px 7px; text-align: left; font-weight: 800; color: #16a34a;">
                  +${totalAllSingleSessionSchoolAmount.toLocaleString('fr-DZ')} دج
                </td>
                <td style="padding: 6px 7px; font-size: 9.5px; color: #15803d; font-weight: bold;">صافي المؤسسة الباقي المحصل</td>
              </tr>
            </tfoot>
          </table>
        `
            : ''
        }

        <!-- Section: Payouts history -->
        <div style="font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #1e3a8a; margin-top: 14px;">
          ${singleSessionDetails.length > 0 ? 'ثالثاً' : 'ثانياً'}: سجل الدفعات المسددة للأستاذ في هذه الدورة
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="width: 100px; text-align: center;">تاريخ الصرف</th>
              <th style="width: 120px;">طريقة الدفع</th>
              <th style="text-align: left; color: #15803d;">المبلغ المصروف</th>
              <th>البيان والملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${payoutRows || '<tr><td colspan="5" style="text-align: center; padding: 8px; color: #94a3b8;">لم يتم تسجيل أي دفعات مسددة للأستاذ في هذه الدورة حتى الآن (في انتظار الصرف)</td></tr>'}
          </tbody>
          ${currentCyclePayouts.length > 0 ? `
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <td colspan="3" style="padding: 6px 7px; text-align: center; font-weight: 800;">إجمالي المسدد للأستاذ (الدورة الحالية)</td>
              <td style="padding: 6px 7px; text-align: left; font-weight: 800; color: #15803d;">${teacherPaid.toLocaleString('fr-DZ')} دج</td>
              <td style="padding: 6px 7px; font-size: 10px; color: #475569;">المتبقي الصافي في الذمة: <strong style="color: ${teacherBalanceDue > 0 ? '#b45309' : '#15803d'};">${teacherBalanceDue.toLocaleString('fr-DZ')} دج</strong></td>
            </tr>
          </tfoot>
          ` : ''}
        </table>

        <!-- Clarification Box with Attendance Sheet Reconciliation -->
        <div style="margin-top: 12px; margin-bottom: 14px; padding: 9px 12px; background-color: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 6px; font-size: 10.5px; color: #92400e; line-height: 1.55;">
          <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px; color: #78350f;">
            📌 توضيحات محاسبية ومطابقة كشف الحضور:
          </div>
          <div>
            • <strong>معادلة صافي المؤسسة الباقي:</strong> سعر الدورة = مستحق الأستاذ + <strong>صافي المؤسسة الباقي</strong> (مثال: إذا كان سعر الدورة 2,000 دج وحصة الأستاذ 1,350 دج، فإن صافي المؤسسة الباقي هو 650 دج عن كل تلميذ). صافي المؤسسة المحصل فعلياً في الصندوق يبلغ <strong>+${schoolNet.toLocaleString('fr-DZ')} دج</strong> (بنسبة هامش محقق ${schoolMarginPct}%)، ومع استيفاء الديون المعلقة سيصل إلى <strong>+${totalAllCourseExpectedSchoolNet.toLocaleString('fr-DZ')} دج</strong>.
          </div>
          <div>
            • <strong>مطابقة المداخيل والمقبوضات:</strong> إجمالي المقبوضات المحصلة البالغة <strong>+${totalAllCoursePaid.toLocaleString('fr-DZ')} دج</strong> مطابقة تماماً لكشف الحضور، وتتكون من: مسددي الاشتراك كاملاً (${totalAllFullPaidAmount.toLocaleString('fr-DZ')} دج عن ${totalAllFullPaidCount} تلميذ)، الدفعات الجزئية للمدينين (${totalAllPartialPaidAmount.toLocaleString('fr-DZ')} دج عن ${totalAllPartialDebtorsCount} تلميذ)، ورسوم الحصص الفردية (${totalAllSingleSessionAmount.toLocaleString('fr-DZ')} دج عن ${totalAllSingleSessionCount} حصة).
          </div>
          <div>
            • <strong>الديون المعلقة:</strong> يبلغ إجمالي الديون المتبقية بذمة التلاميذ <strong>${totalAllCourseDebt.toLocaleString('fr-DZ')} دج</strong> (منها ${totalAllPartialDebtAmount.toLocaleString('fr-DZ')} دج بذمة ${totalAllPartialDebtorsCount} مدين جزئي، و ${totalAllFullDebtAmount.toLocaleString('fr-DZ')} دج بذمة ${totalAllFullDebtorsCount} تلميذ لم يسدد إطلاقاً)، وهي ديون قيد التحصيل وتضاف للمقبوضات فور تسديدها.
          </div>
          <div>
            • <strong>مستحقات الأستاذ الصافية:</strong> تم احتساب مستحقات الأستاذ البالغة <strong>${teacherEarned.toLocaleString('fr-DZ')} دج</strong> بناءً على الحصص المنجزة ونظام الأتعاب المتفق عليه (${compText})، وقد سُدد منها دفعات بقيمة <strong>${teacherPaid.toLocaleString('fr-DZ')} دج</strong> وتبقى في الذمة <strong>${teacherBalanceDue.toLocaleString('fr-DZ')} دج</strong>.
          </div>
          <div>
            • <strong>التلاميذ المعفيون:</strong> يتضمن الكشف عدد (<strong>${totalAllExempt}</strong>) تلميذ معفى من الرسوم. التلميذ المعفى لا يُحتسب له أي مستحق مالي للأستاذ في نظام النسب (مستحقه: <strong>0 دج</strong>)، وتتكفل المؤسسة بحالته دون المساس بحقوق الأستاذ عن بقية التلاميذ المسددين.
          </div>
        </div>

        <!-- Total Financial Clearance Summary Box -->
        <div style="margin-top: 14px; margin-bottom: 14px; border: 2px solid #2563eb; border-radius: 8px; background-color: #f8fafc; padding: 12px 16px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="font-size: 13px; font-weight: 800; color: #1e3a8a; display: flex; align-items: center; gap: 6px;">
              <span>💰</span>
              <span>خلاصة الحساب المالي النهائي: خلاص المقبوضات كاملة وحق الأستاذ وحق المؤسسة</span>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b;">
              تاريخ الاعتماد: <strong>${formattedDate}</strong>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
            <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10px; color: #166534; font-weight: 700; margin-bottom: 3px;">1. خلاص المقبوضات كاملة (+)</div>
              <div style="font-size: 15px; font-weight: 900; color: #15803d;">+${totalAllCoursePaid.toLocaleString('fr-DZ')} دج</div>
              <div style="font-size: 8.5px; color: #16a34a; margin-top: 2px;">إجمالي المقبوضات المحصلة فعلياً</div>
            </div>

            <div style="background-color: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10px; color: #1e40af; font-weight: 700; margin-bottom: 3px;">2. حق الأستاذ كامل (-)</div>
              <div style="font-size: 15px; font-weight: 900; color: #2563eb;">-${teacherEarned.toLocaleString('fr-DZ')} دج</div>
              <div style="font-size: 8.5px; color: #3b82f6; margin-top: 2px;">إجمالي أتعاب ومستحقات الأستاذ</div>
            </div>

            <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10px; color: #475569; font-weight: 700; margin-bottom: 3px;">3. صافي حق المؤسسة الباقي (=)</div>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a;">+${schoolNet.toLocaleString('fr-DZ')} دج</div>
              <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">صافي صندوق المؤسسة</div>
            </div>

            <div style="background-color: ${teacherBalanceDue > 0 ? '#fffbeb' : '#f0fdf4'}; border: 1.5px solid ${teacherBalanceDue > 0 ? '#fde68a' : '#86efac'}; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10px; color: ${teacherBalanceDue > 0 ? '#92400e' : '#166534'}; font-weight: 700; margin-bottom: 3px;">4. المتبقي في الذمة للأستاذ</div>
              <div style="font-size: 15px; font-weight: 900; color: ${teacherBalanceDue > 0 ? '#d97706' : '#15803d'};">
                ${teacherBalanceDue.toLocaleString('fr-DZ')} دج
              </div>
              <div style="font-size: 8.5px; color: ${teacherBalanceDue > 0 ? '#b45309' : '#16a34a'}; margin-top: 2px;">
                ${teacherPaid > 0 ? `(تم تسديد: ${teacherPaid.toLocaleString('fr-DZ')} دج)` : (teacherBalanceDue > 0 ? 'مستحق الصرف' : 'خالص بالكامل ✓')}
              </div>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            توقيع واستلام الأستاذ: <strong>${teacher.fullName}</strong>
            <div style="height: 50px;"></div>
          </div>
          <div class="sig-box">
            توقيع وختم إدارة المؤسسة
            <div style="height: 50px;"></div>
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


  const totalGrossRevenueAll = teachers.reduce((acc, t) => acc + getTeacherGrossRevenue(t.id), 0);
  const totalSchoolShareAll = Math.max(0, totalGrossRevenueAll - totalTeachersEarned);

  const columns: Column<Teacher>[] = [
    {
      key: 'fullName',
      header: 'اسم الأستاذ والمادة',
      sortable: true,
      render: (t) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.fullName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {t.subject} • {t.specialization}
          </div>
        </div>
      ),
    },
    {
      key: 'compensationType',
      header: 'طريقة احتساب الأتعاب',
      render: (t) => {
        const type = t.compensationType || 'percentage_per_student';
        if (type === 'fixed_per_student' || (type as string) === 'fixed_per_course') {
          return (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-warning)' }}>
              {formatDZD(t.fixedRatePerStudent || t.fixedCourseRate || 1000)} / تلميذ
            </span>
          );
        }
        return (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            {t.commissionPercentage || 60}% من كل تلميذ
          </span>
        );
      },
    },
    {
      key: 'groupsCount',
      header: 'الأفواج والتلاميذ',
      sortable: true,
      render: (t) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
            {getTeacherTotalStudents(t.id)} تلميذ مسجل
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            في {t.groupsCount} أفواج
          </div>
        </div>
      ),
    },
    {
      key: 'studentsCollected',
      header: 'مقبوضات التلاميذ',
      sortable: true,
      render: (t) => {
        const tCourses = getTeacherCourses(t.id);
        const collected = tCourses.reduce((acc, c) => {
          return acc + (c.enrolledList?.reduce((sAcc, s) => sAcc + (!s.isExempt ? (s.totalPaid || 0) : 0), 0) || 0);
        }, 0);
        const exemptCount = tCourses.reduce((acc, c) => {
          return acc + (c.enrolledList?.filter((s) => s.isExempt).length || 0);
        }, 0);

        return (
          <div>
            <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
              {formatDZD(collected)}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
              {exemptCount > 0 ? (
                <span style={{ color: '#b45309', fontWeight: 600 }}>منهم {exemptCount} معفى</span>
              ) : (
                <span>محصلة من الاشتراكات</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'totalEarned',
      header: 'مستحق الدورة الحالية',
      sortable: true,
      render: (t) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9375rem' }}>
            {formatDZD(t.totalEarned || 0)}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            {(t.totalEarned || 0) > 0 ? (
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                محسوب من الحضور والغياب (حضور / غياب محسوب)
              </span>
            ) : (
              <span>دورة جديدة • في انتظار الحصص</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'totalPaid',
      header: 'المسدد للأستاذ (الدورة)',
      sortable: true,
      render: (t) => {
        const paid = t.totalPaid || 0;
        return (
          <div>
            <div style={{ color: paid > 0 ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.9375rem' }}>
              {formatDZD(paid)}
            </div>
            {paid === 0 && (t.totalEarned || 0) > 0 ? (
              <div style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 600 }}>
                بانتظار الصرف
              </div>
            ) : paid > 0 ? (
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                دفعات مستلمة
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'balanceDue',
      header: 'المتبقي في الذمة',
      sortable: true,
      render: (t) => (
        <div>
          {(t.balanceDue || 0) > 0 ? (
            <span style={{ color: 'var(--color-warning)', fontWeight: 700, fontSize: '0.9375rem' }}>
              {formatDZD(t.balanceDue)}
            </span>
          ) : (t.totalEarned || 0) === 0 ? (
            <Badge variant="info">دورة جديدة (0 دج)</Badge>
          ) : (
            <Badge variant="success">مسدد بالكامل</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      width: '320px',
      render: (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handlePrintTeacherStatement(t)}
            title="كشف تفصيلي لحضور وغياب تلاميذ الأفواج"
            rightIcon={<FileText size={13} />}
          >
            كشف حضور
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTeacherId(t.id)}
          >
            الحساب
          </Button>

          <Button
            variant={(t.balanceDue || 0) > 0 ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setSelectedTeacherForPayout(t);
              setPayoutAmount(String(t.balanceDue || 0));
            }}
            disabled={(t.balanceDue || 0) <= 0}
          >
            تسديد
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTeacherToReset(t)}
            title="تسوية مستحقات الأستاذ وبدء دورة جديدة"
            style={{
              color: '#2563eb',
              backgroundColor: '#eff6ff',
              borderColor: '#bfdbfe',
              padding: '6px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="تسوية مستحقات الأستاذ وبدء دورة جديدة"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="مستحقات وأجور الأساتذة"
        description="حساب أجور الأساتذة بالخيارات المعتمدة: نسبة من كل تلميذ، نسبة من سعر الدورة، أو مبلغ ثابت للدورة"
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard
          title="مستحقات الدورة الحالية"
          value={formatDZD(totalTeachersEarned)}
          subtitle="محسوبة بالخيارات المحددة"
          icon={<Wallet size={20} color="var(--color-primary)" />}
        />
        <StatCard
          title="صافي حصة المؤسسة"
          value={formatDZD(totalSchoolShareAll)}
          subtitle="بعد خصم مستحقات الأساتذة"
          icon={<Coins size={20} color="var(--color-success)" />}
        />
        <StatCard
          title="المسدد للأساتذة (الدورة الحالية)"
          value={formatDZD(totalTeachersPaid)}
          subtitle="مدفوعات مستلمة"
          icon={<CheckCircle size={20} color="var(--color-info)" />}
        />
        <StatCard
          title="المستحقات المعلقة في الذمة"
          value={formatDZD(totalTeachersBalanceDue)}
          subtitle="مستحقة الصرف"
          icon={<DollarSign size={20} color="var(--color-warning)" />}
        />
      </div>

      <DataTable
        data={teachers}
        columns={columns}
        keyExtractor={(t) => t.id}
        searchPlaceholder="ابحث باسم الأستاذ أو المادة..."
        searchFields={['fullName', 'subject']}
      />

      {/* Payout Modal */}
      <Modal
        isOpen={!!selectedTeacherForPayout}
        onClose={() => setSelectedTeacherForPayout(null)}
        title={`تسديد مستحقات: ${selectedTeacherForPayout?.fullName}`}
        description={`المتبقي الإجمالي في ذمة المدرسة: ${formatDZD(selectedTeacherForPayout?.balanceDue || 0)}`}
      >
        {selectedTeacherForPayout && (
          <form onSubmit={handlePayout} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-bg-surface-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>إجمالي المستحق المحسوب:</span>
                <span style={{ fontWeight: 600 }}>{formatDZD(selectedTeacherForPayout.totalEarned || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>تم تسديد سابقًا:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{formatDZD(selectedTeacherForPayout.totalPaid || 0)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              <Input
                label="المبلغ المراد صرفه وتسديده الآن (دج)"
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                required
                autoFocus
              />
              <Select
                label="طريقة الدفع"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                options={[
                  { value: 'نقداً (Cash)', label: 'نقداً (Cash)' },
                  { value: 'شيك بنكي (Cheque)', label: 'شيك بنكي (Cheque)' },
                  { value: 'تحويل بريدي موب (BaridiMob)', label: 'تحويل بريدي موب (BaridiMob)' },
                  { value: 'تحويل بنكي (Bank Transfer)', label: 'تحويل بنكي (Bank Transfer)' },
                ]}
              />
            </div>

            <Input
              label="ملاحظات الصرف أو رقم الإشعار"
              placeholder="مثال: تسديد دفعة شهر أوت 2026"
              value={payoutNote}
              onChange={(e) => setPayoutNote(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: 'var(--space-2)' }}>
              <Button type="submit" variant="primary">
                تأكيد تسديد المستحقات
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSelectedTeacherForPayout(null)}>
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Teacher Detailed Breakdown Drawer */}
      <Drawer
        isOpen={!!activeTeacher}
        onClose={() => setActiveTeacherId(null)}
        title={`كشف حساب ومستحقات: ${activeTeacher?.fullName}`}
        subtitle={`طريقة الأتعاب: ${
          activeTeacher?.compensationType === 'fixed_per_student' || (activeTeacher?.compensationType as string) === 'fixed_per_course'
            ? `${formatDZD(activeTeacher?.fixedRatePerStudent || activeTeacher?.fixedCourseRate || 1000)} مبلغ مقطوع عن كل تلميذ`
            : `${activeTeacher?.commissionPercentage || 60}% من اشتراك كل تلميذ`
        }`}
        footer={null}
      >
        {activeTeacher && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Summary card */}
            {(() => {
              const activeTeacherCourses = getTeacherCourses(activeTeacher.id);
              const activeTeacherStudentsPaid = activeTeacherCourses.reduce((acc, c) => {
                const regPaid = c.enrolledList?.reduce((sAcc, s) => sAcc + (!s.isExempt ? (s.totalPaid || 0) : 0), 0) || 0;
                const singlePaid = (c.enrolledList || []).reduce((sAcc, s) => {
                  const singles = (s.attendanceLogs || []).filter((l) => l.status === 'single_session' || l.type === 'single_session');
                  return sAcc + singles.reduce((lAcc, l) => lAcc + (l.amount || 0), 0);
                }, 0);
                return acc + regPaid + singlePaid;
              }, 0);
              const activeTeacherExemptCount = activeTeacherCourses.reduce((acc, c) => {
                return acc + (c.enrolledList?.filter((s) => s.isExempt).length || 0);
              }, 0);
              const activeTeacherSchoolNet = Math.max(0, activeTeacherStudentsPaid - (activeTeacher.totalEarned || 0));

              return (
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--color-primary-light)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>مقبوضات التلاميذ (+)</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                      {formatDZD(activeTeacherStudentsPaid)}
                    </div>
                    {activeTeacherExemptCount > 0 && (
                      <div style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 600 }}>
                        {activeTeacherExemptCount} تلميذ معفى
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>مستحق الأستاذ (-)</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
                      {formatDZD(activeTeacher.totalEarned || 0)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#15803d', fontWeight: 600 }}>
                      المدرسة: {formatDZD(activeTeacherSchoolNet)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>المسدد للأستاذ (الدفعات)</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '2px' }}>
                      {formatDZD(activeTeacher.totalPaid || 0)}
                    </div>
                    {(activeTeacher.totalPaid || 0) === 0 && (activeTeacher.totalEarned || 0) > 0 && (
                      <div style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 600 }}>
                        بانتظار الصرف
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>المتبقي في الذمة</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: (activeTeacher.balanceDue || 0) > 0 ? 'var(--color-warning)' : 'var(--color-success)', marginTop: '2px' }}>
                      {formatDZD(activeTeacher.balanceDue || 0)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: (activeTeacher.balanceDue || 0) > 0 ? '#b45309' : '#15803d', fontWeight: 600 }}>
                      {(activeTeacher.balanceDue || 0) > 0 ? 'مستحق الصرف' : 'مسدد بالكامل ✓'}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Print Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Button
                variant="primary"
                onClick={() => handlePrintTeacherFinancialStatement(activeTeacher)}
                rightIcon={<Printer size={15} />}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                كشف الحساب المالي وحق المؤسسة
              </Button>
              <Button
                variant="secondary"
                onClick={() => handlePrintTeacherStatement(activeTeacher)}
                rightIcon={<FileText size={15} />}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                كشف الحضور والغيابات المفصل
              </Button>
            </div>

            {/* Reset / New Cycle Action Banner */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-bg-surface-secondary)',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                  بدء دورة حسابية جديدة للأستاذ
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1px' }}>
                  تصفية سجلات الدفع السابقة بعد انتهاء الدورة أو الشهر للبدء من الصفر
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTeacherToReset(activeTeacher)}
                rightIcon={<RefreshCw size={13} />}
                style={{
                  color: '#2563eb',
                  backgroundColor: '#eff6ff',
                  borderColor: '#bfdbfe',
                }}
              >
                تسوية وبدء دورة جديدة
              </Button>
            </div>

            {/* Courses list breakdown */}
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              تفاصيل الأفواج والدورات وحساب النسب
            </h4>

            {getTeacherCourses(activeTeacher.id).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                لا توجد دورات مسندة لهذا الأستاذ بعد.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getTeacherCourses(activeTeacher.id).map((course) => {
                  const enrolled = course.enrolledList?.length || 0;
                  const exemptCount = course.enrolledList?.filter((s) => s.isExempt).length || 0;
                  const price = course.monthlyPrice || 0;
                  const regularPaid = course.enrolledList?.reduce((acc, s) => acc + (!s.isExempt ? (s.totalPaid || 0) : 0), 0) || 0;
                  const singlePaid = (course.enrolledList || []).reduce((acc, s) => {
                    const singles = (s.attendanceLogs || []).filter((l) => l.status === 'single_session' || l.type === 'single_session');
                    return acc + singles.reduce((sAcc, l) => sAcc + (l.amount || 0), 0);
                  }, 0);
                  const totalPaid = regularPaid + singlePaid;
                  const totalDebt = course.enrolledList?.reduce((acc, s) => acc + (!s.isExempt ? s.totalDebt || 0 : 0), 0) || 0;
                  const teacherShare = calculateCourseTeacherShare(activeTeacher, course);
                  const schoolNet = Math.max(0, totalPaid - teacherShare);
                  const compType = activeTeacher.compensationType || 'percentage_per_student';

                  return (
                    <div
                      key={course.id}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{course.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {course.academicLevel} • {course.scheduleTime}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {exemptCount > 0 && (
                            <Badge variant="warning">{exemptCount} معفى</Badge>
                          )}
                          <Badge variant="primary">{enrolled} تلاميذ</Badge>
                        </div>
                      </div>

                      {/* Math Calculation formula */}
                      <div
                        style={{
                          padding: '8px 10px',
                          backgroundColor: 'var(--color-bg-app)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>سعر اشتراك الدورة:</span>
                          <span style={{ fontWeight: 600 }}>{formatDZD(price)}</span>
                        </div>

                        {compType === 'percentage_per_student' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>مستحق الأستاذ في التلميذ الواحد ({activeTeacher.commissionPercentage}%):</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{formatDZD(price * ((activeTeacher.commissionPercentage || 60) / 100))}</span>
                          </div>
                        )}

                        {(compType === 'fixed_per_student' || (compType as string) === 'fixed_per_course') && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>مستحق الأستاذ المقطوع عن كل تلميذ:</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                              {formatDZD(activeTeacher.fixedRatePerStudent || activeTeacher.fixedCourseRate || 1000)}
                              <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginRight: '6px' }}>
                                (صافي المؤسسة الباقي: {formatDZD(Math.max(0, price - (activeTeacher.fixedRatePerStudent || activeTeacher.fixedCourseRate || 1000)))})
                              </span>
                            </span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '4px', marginTop: '2px' }}>
                          <span><strong>مقبوضات الفوج المحصلة (+):</strong></span>
                          <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>+{formatDZD(totalPaid)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span><strong>مستحق الأستاذ من الفوج (-):</strong></span>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>-{formatDZD(teacherShare)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 700 }}>
                          <span>صافي المؤسسة الباقي (=):</span>
                          <span>+{formatDZD(schoolNet)}</span>
                        </div>

                        {totalDebt > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)', fontSize: '0.6875rem', borderTop: '1px dotted var(--color-border)', paddingTop: '3px' }}>
                            <span>ديون معلقة بذمة التلاميذ:</span>
                            <span>{formatDZD(totalDebt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Courses Combined Summary Card */}
            {getTeacherCourses(activeTeacher.id).length > 0 && (() => {
              const activeTeacherCourses = getTeacherCourses(activeTeacher.id);
              const totalPaidAllCourses = activeTeacherCourses.reduce((acc, c) => {
                const regularPaid = c.enrolledList?.reduce((sAcc, s) => {
                  if (s.isExempt) return sAcc;
                  const isKhalis = (s.totalDebt || 0) <= 0;
                  return isKhalis ? sAcc + (c.monthlyPrice || 0) : sAcc;
                }, 0) || 0;
                const singlePaid = (c.enrolledList || []).reduce((sAcc, s) => {
                  const singles = (s.attendanceLogs || []).filter((l) => l.status === 'single_session' || l.type === 'single_session');
                  return sAcc + singles.reduce((lAcc, l) => lAcc + (l.amount || 0), 0);
                }, 0);
                return acc + regularPaid + singlePaid;
              }, 0);
              const totalTeacherShareAll = activeTeacherCourses.reduce((acc, c) => acc + calculateCourseTeacherShare(activeTeacher, c), 0);
              const totalSchoolNetAll = Math.max(0, totalPaidAllCourses - totalTeacherShareAll);
              const totalDebtAll = activeTeacherCourses.reduce((acc, c) => {
                return acc + (c.enrolledList?.reduce((sAcc, s) => sAcc + (!s.isExempt ? (s.totalDebt || 0) : 0), 0) || 0);
              }, 0);

              return (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--color-bg-surface-secondary)',
                    border: '1.5px solid var(--color-primary)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '4px',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)' }}>
                    خلاصة المقبوضات وحق الأستاذ الإجمالي لكافة الأفواج:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.8125rem' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>خلاص المقبوضات كاملة (+)</div>
                      <div style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '1rem', marginTop: '2px' }}>
                        +{formatDZD(totalPaidAllCourses)}
                      </div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>حق الأستاذ كامل (-)</div>
                      <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1rem', marginTop: '2px' }}>
                        -{formatDZD(totalTeacherShareAll)}
                      </div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>صافي حق المؤسسة (=)</div>
                      <div style={{ fontWeight: 800, color: '#15803d', fontSize: '1rem', marginTop: '2px' }}>
                        +{formatDZD(totalSchoolNetAll)}
                      </div>
                    </div>
                  </div>
                  {totalDebtAll > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                      ديون معلقة بذمة التلاميذ قيد التحصيل: {formatDZD(totalDebtAll)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Payout History Logs - Segregated into Current Cycle vs Archived */}
            {(() => {
              const history = activeTeacher.payoutHistory || [];
              const lastSettlementIndex = history.findIndex((p) => p.isCycleSettlement);
              const currentCycleLogs =
                lastSettlementIndex === -1
                  ? history.filter((p) => !p.isCycleSettlement)
                  : history.slice(0, lastSettlementIndex).filter((p) => !p.isCycleSettlement);
              const archivedLogs =
                lastSettlementIndex === -1
                  ? []
                  : history.slice(lastSettlementIndex);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
                  {/* Current Cycle Payouts */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        دفعات الدورة الحالية المسددة للأستاذ
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        إجمالي المسدد: <strong style={{ color: 'var(--color-success)' }}>{formatDZD(activeTeacher.totalPaid || 0)}</strong>
                      </span>
                    </div>

                    {currentCycleLogs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '14px', backgroundColor: 'var(--color-bg-surface-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                        لم يتم تسجيل أي دفعات مسددة للأستاذ في هذه الدورة حتى الآن (في انتظار الصرف).
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {currentCycleLogs.map((log) => (
                          <div
                            key={log.id}
                            style={{
                              padding: '10px 12px',
                              backgroundColor: 'var(--color-bg-surface-secondary)',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.8125rem',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                                +{formatDZD(log.amount)}
                              </div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                {log.paymentMethod} {log.notes ? `• ${log.notes}` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                {formatDateArabic(log.date)}
                              </span>
                              <button
                                onClick={() =>
                                  setPayoutToDelete({
                                    teacherId: activeTeacher.id,
                                    teacherName: activeTeacher.fullName,
                                    log,
                                  })
                                }
                                title="حذف هذا السجل"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--color-danger)',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  transition: 'background-color 0.2s',
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Archived Settlements & Previous Cycles */}
                  {archivedLogs.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                        أرشيف التسويات والدورات السابقة ({archivedLogs.length} سجلات)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {archivedLogs.map((log) => {
                          if (log.isCycleSettlement) {
                            return (
                              <div
                                key={log.id}
                                style={{
                                  padding: '8px 12px',
                                  backgroundColor: 'var(--color-primary-light)',
                                  border: '1px dashed var(--color-primary)',
                                  borderRadius: 'var(--radius-md)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '0.75rem',
                                  color: 'var(--color-primary)',
                                  fontWeight: 600,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <CheckCircle size={14} />
                                  <span>{log.notes || 'تمت تسوية الحساب وإقفال الدورة السابقة'}</span>
                                </div>
                                <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>
                                  {formatDateArabic(log.date)}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={log.id}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--color-bg-app)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                                border: '1px solid var(--color-border)',
                                opacity: 0.85,
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                  +{formatDZD(log.amount)}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                                  {log.paymentMethod} {log.notes ? `• ${log.notes}` : ''}
                                </div>
                              </div>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                                {formatDateArabic(log.date)} (دورة سابقة)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Final Overall Clearance Summary Card at Bottom of Drawer */}
            {(() => {
              const activeTeacherCourses = getTeacherCourses(activeTeacher.id);
              const totalPaidAllCourses = activeTeacherCourses.reduce((acc, c) => {
                const regularPaid = c.enrolledList?.reduce((sAcc, s) => sAcc + (!s.isExempt ? (s.totalPaid || 0) : 0), 0) || 0;
                const singlePaid = (c.enrolledList || []).reduce((sAcc, s) => {
                  const singles = (s.attendanceLogs || []).filter((l) => l.status === 'single_session' || l.type === 'single_session');
                  return sAcc + singles.reduce((lAcc, l) => lAcc + (l.amount || 0), 0);
                }, 0);
                return acc + regularPaid + singlePaid;
              }, 0);
              const teacherEarned = activeTeacher.totalEarned || 0;
              const teacherPaid = activeTeacher.totalPaid || 0;
              const balanceDue = activeTeacher.balanceDue || 0;
              const schoolNet = Math.max(0, totalPaidAllCourses - teacherEarned);

              return (
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--color-bg-surface-secondary)',
                    border: '2px solid #2563eb',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginTop: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💰</span>
                      <span>خلاصة الحساب المالي النهائي للأستاذ</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      حالة الصرف: <strong style={{ color: balanceDue > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>{balanceDue > 0 ? 'في انتظار استيفاء المستحقات' : 'تمت التسوية بالكامل ✓'}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: '#166534', fontSize: '0.6875rem', fontWeight: 600 }}>خلاص المقبوضات كاملة (+)</div>
                      <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9375rem', marginTop: '2px' }}>
                        +{formatDZD(totalPaidAllCourses)}
                      </div>
                    </div>

                    <div style={{ padding: '8px', backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: '#1e40af', fontSize: '0.6875rem', fontWeight: 600 }}>حق الأستاذ كامل (-)</div>
                      <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.9375rem', marginTop: '2px' }}>
                        -{formatDZD(teacherEarned)}
                      </div>
                    </div>

                    <div style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: '#475569', fontSize: '0.6875rem', fontWeight: 600 }}>صافي حق المؤسسة (=)</div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9375rem', marginTop: '2px' }}>
                        +{formatDZD(schoolNet)}
                      </div>
                    </div>

                    <div style={{ padding: '8px', backgroundColor: balanceDue > 0 ? '#fffbeb' : '#f0fdf4', border: `1px solid ${balanceDue > 0 ? '#fde68a' : '#86efac'}`, borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: balanceDue > 0 ? '#92400e' : '#166534', fontSize: '0.6875rem', fontWeight: 600 }}>المتبقي في الذمة للأستاذ</div>
                      <div style={{ fontWeight: 800, color: balanceDue > 0 ? '#d97706' : '#15803d', fontSize: '0.9375rem', marginTop: '2px' }}>
                        {formatDZD(balanceDue)}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', marginTop: '1px' }}>
                        {teacherPaid > 0 ? `(سُدد: ${formatDZD(teacherPaid)})` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Drawer>

      {/* Delete Payout Confirmation Modal */}
      <Modal
        isOpen={!!payoutToDelete}
        onClose={() => setPayoutToDelete(null)}
        title="تأكيد حذف دفعة مسددة"
        description="هل أنت متأكد من رغبتك في حذف هذا السجل المالي؟"
      >
        {payoutToDelete && (
          <div>
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-danger-light, #fee2e2)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                marginBottom: 'var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={18} />
              <span>
                سيتم حذف دفعة بقيمة <strong>{formatDZD(payoutToDelete.log.amount)}</strong> وإعادة إضافتها إلى المتبقي في ذمة الأستاذ <strong>{payoutToDelete.teacherName}</strong>.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px' }}>
              <Button variant="danger" onClick={confirmDeletePayout}>
                تأكيد الحذف
              </Button>
              <Button variant="secondary" onClick={() => setPayoutToDelete(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Payroll Cycle Confirmation Modal */}
      <Modal
        isOpen={!!teacherToReset}
        onClose={() => setTeacherToReset(null)}
        title="تسوية مستحقات الأستاذ وبدء دورة جديدة"
        description={`إغلاق الدورة الحسابية الحالية للأستاذ: ${teacherToReset?.fullName}`}
      >
        {teacherToReset && (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              عند تأكيد هذا الإجراء، سيتم تسجيل إغلاق وتسوية الدورة **مع الاحتفاظ بكامل سجل الدفعات والمبالغ المسددة سابقاً** كأرشيف دائم، لبدء دورة جديدة وتسجيل بيانات وأفواج لاحقة دون فقدان السجلات المالية القديمة.
            </p>

            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-bg-surface-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>مستحقات الدورة الحالية المسواة:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{formatDZD(teacherToReset.totalEarned || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>المبالغ المسددة في هذه الدورة:</span>
                <strong style={{ color: 'var(--color-success)' }}>{formatDZD(teacherToReset.totalPaid || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>المتبقي في الذمة:</span>
                <strong style={{ color: (teacherToReset.balanceDue || 0) > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {formatDZD(teacherToReset.balanceDue || 0)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '6px', marginTop: '6px' }}>
                <span>سجل الدفعات المحفوظة في الأرشيف:</span>
                <strong>{(teacherToReset.payoutHistory || []).filter(p => !p.isCycleSettlement).length} دفعات</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                ستبدأ الدورة الجديدة برصيد 0 دج وتتراكم أتعاب الأستاذ تلقائياً مع كل حصة حضور أو غياب محسوب تسجل لاحقاً.
              </div>
            </div>

            {/* Attendance Reset Details Box */}
            {(() => {
              const tCourses = getTeacherCourses(teacherToReset.id);
              const allStds = tCourses.flatMap((c) =>
                (c.enrolledList || []).map((s) => ({
                  ...s,
                  quota: s.totalSessions && s.totalSessions > 0 ? s.totalSessions : (c.totalSessionsDefault || 4),
                }))
              );
              const completedStds = allStds.filter((s) => (s.attendedSessions || 0) >= s.quota);
              const ongoingStds = allStds.filter((s) => (s.attendedSessions || 0) < s.quota);

              return (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '6px' }}>
                    حالة سجلات الحضور والغياب لتلاميذ أفواج هذا الأستاذ:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', marginBottom: '4px' }}>
                    <span>• الذين أنهوا الحصص (سيتم إرجاع رصيدهم إلى 0 لبدء الدورة الجديدة):</span>
                    <strong>{completedStds.length} تلميذ</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                    <span>• الذين لم ينهوا الحصص بعد (تبقى بياناتهم وحصصهم المستهلكة كما هي):</span>
                    <strong>{ongoingStds.length} تلميذ</strong>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px' }}>
              <Button variant="primary" onClick={confirmResetPayroll} rightIcon={<RefreshCw size={14} />}>
                تأكيد التسوية وبدء دورة جديدة
              </Button>
              <Button variant="secondary" onClick={() => setTeacherToReset(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

