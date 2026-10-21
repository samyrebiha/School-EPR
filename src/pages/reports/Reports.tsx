import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Users,
  GraduationCap,
  FileText,
  BookOpen,
  TrendingUp,
  Wallet,
  AlertCircle,
  Archive,
  Printer,
  AlertTriangle,
  CheckCircle,
  Percent,
  Search,
  ChevronLeft,
  Briefcase,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select, Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatDZD, formatDateArabic } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';
import { Teacher, Course, PaymentTransaction } from '../../types';

export const Reports: React.FC = () => {
  const { success } = useToast();
  const {
    courses,
    transactions,
    debts,
    teachers,
    currentSchool,
    totalEnrolledStudents,
    totalActiveCourses,
    totalOutstandingDebts,
    totalTeachersEarned,
    archiveFinancialCycle,
    expenses,
  } = useData();

  // Current active report tab
  const [activeTab, setActiveTab] = useState<'general' | 'teachers_analysis' | 'teacher_detail'>('general');
  const [period, setPeriod] = useState('this_month');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

  // Archive Cycle Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveDuration, setArchiveDuration] = useState('3_months');

  // Filter transactions dynamically by selected time period
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (period === 'all_time') return true;

      const txDate = new Date(tx.date);
      const now = new Date();

      if (period === 'this_month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }
      if (period === 'last_month') {
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return txDate.getMonth() === prevMonth.getMonth() && txDate.getFullYear() === prevMonth.getFullYear();
      }
      if (period === 'trimester_1') {
        const month = txDate.getMonth();
        return month >= 8 && month <= 10 && txDate.getFullYear() === now.getFullYear();
      }
      if (period === 'full_year' || period === 'this_year') {
        return txDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, period]);

  // Filter expenses dynamically by selected time period
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (period === 'all_time') return true;

      const expDate = new Date(exp.date);
      const now = new Date();

      if (period === 'this_month') {
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      }
      if (period === 'last_month') {
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return expDate.getMonth() === prevMonth.getMonth() && expDate.getFullYear() === prevMonth.getFullYear();
      }
      if (period === 'trimester_1') {
        const month = expDate.getMonth();
        return month >= 8 && month <= 10 && expDate.getFullYear() === now.getFullYear();
      }
      if (period === 'full_year' || period === 'this_year') {
        return expDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [expenses, period]);

  // General Financial KPIs
  const studentPayments = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [filteredTransactions]);

  const teacherDues = totalTeachersEarned || 0;
  const periodExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const netAchievedRevenue = studentPayments - teacherDues - periodExpenses;

  // Single Session Attendance & Transaction Extraction Function
  interface SingleSessionDetail {
    studentId: string;
    studentName: string;
    courseTitle: string;
    date: string;
    amount: number;
    teacherAmount: number;
    schoolAmount: number;
    notes?: string;
  }

  // Calculate detailed financial breakdown for every teacher
  interface TeacherFinancialReport {
    teacher: Teacher;
    coursesCount: number;
    enrolledStudentsCount: number;
    compensationText: string;
    grossCollected: number;
    teacherEarned: number;
    schoolNet: number;
    schoolMarginPct: number;
    teacherPaid: number;
    teacherBalanceDue: number;
    uncollectedDebt: number;
    singleSessionsCount: number;
    singleSessionsGross: number;
    singleSessionsTeacherShare: number;
    singleSessionsSchoolShare: number;
    singleSessionDetails: SingleSessionDetail[];
  }

  // Helper to calculate teacher share for a single course
  const calculateCourseTeacherShare = (teacherObj: Teacher, course: Course): number => {
    const type = teacherObj.compensationType || 'percentage_per_student';
    const commission = teacherObj.commissionPercentage !== undefined ? teacherObj.commissionPercentage : 60;
    const fixedRate =
      teacherObj.fixedRatePerStudent !== undefined
        ? teacherObj.fixedRatePerStudent
        : teacherObj.fixedCourseRate !== undefined
        ? teacherObj.fixedCourseRate
        : 1000;
    const defaultQuota = course.totalSessionsDefault && course.totalSessionsDefault > 0 ? course.totalSessionsDefault : 4;
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

  const teacherFinancials = useMemo<TeacherFinancialReport[]>(() => {
    return teachers.map((teacher) => {
      const teacherCourses = courses.filter((c) => c.teacherId === teacher.id);
      const coursesCount = teacherCourses.length;
      const enrolledStudentsCount = teacherCourses.reduce((acc, c) => acc + (c.enrolledList?.length || 0), 0);

      const compensationType = teacher.compensationType || 'percentage_per_student';
      const commission = teacher.commissionPercentage !== undefined ? teacher.commissionPercentage : 60;
      const fixedRate =
        teacher.fixedRatePerStudent !== undefined
          ? teacher.fixedRatePerStudent
          : teacher.fixedCourseRate !== undefined
          ? teacher.fixedCourseRate
          : 1000;

      const compensationText =
        compensationType === 'fixed_per_student' || (compensationType as string) === 'fixed_per_course'
          ? `مبلغ مقطوع: ${formatDZD(fixedRate)} / تلميذ`
          : `نسبة الأستاذ: ${commission}% (المؤسسة: ${100 - commission}%)`;

      let calculatedTeacherEarned = 0;
      let singleSessionsCount = 0;
      let singleSessionsGross = 0;
      let singleSessionsTeacherShare = 0;
      const singleSessionDetails: SingleSessionDetail[] = [];

      teacherCourses.forEach((c) => {
        const list = c.enrolledList || [];
        const courseTeacherShare = calculateCourseTeacherShare(teacher, c);
        calculatedTeacherEarned += courseTeacherShare;

        list.forEach((std) => {
          const allLogs = std.attendanceLogs || [];
          const singleSessionLogs = allLogs.filter((l) => l.status === 'single_session' || l.type === 'single_session');
          const singleTeacherAmt = singleSessionLogs.reduce((acc, l) => acc + (l.teacherAmount || 0), 0);
          const singlePriceAmt = singleSessionLogs.reduce((acc, l) => acc + (l.amount || 0), 0);

          singleSessionsCount += singleSessionLogs.length;
          singleSessionsGross += singlePriceAmt;
          singleSessionsTeacherShare += singleTeacherAmt;

          singleSessionLogs.forEach((l) => {
            const p = l.amount || 0;
            const t = l.teacherAmount || 0;
            singleSessionDetails.push({
              studentId: std.id,
              studentName: std.fullName,
              courseTitle: c.title,
              date: l.date,
              amount: p,
              teacherAmount: t,
              schoolAmount: Math.max(0, p - t),
              notes: l.notes,
            });
          });
        });
      });

      // Calculate gross money collected for this teacher's courses
      const teacherTx = filteredTransactions.filter((tx) =>
        teacherCourses.some((c) => c.title === tx.courseTitle)
      );
      const txGross = teacherTx.reduce((acc, tx) => acc + (tx.amount || 0), 0);

      // Student totalPaid in courses (excluding exempt students) + single session gross
      const regularStudentsPaid = teacherCourses.reduce(
        (acc, c) => acc + (c.enrolledList?.reduce((sAcc, s) => {
          if (s.isExempt) return sAcc;
          const debt = s.totalDebt || 0;
          const isKhalis = debt <= 0;
          const paid = isKhalis ? (c.monthlyPrice || 0) : 0;
          return sAcc + paid;
        }, 0) || 0),
        0
      );
      const totalStudentsAndSinglesPaid = regularStudentsPaid + singleSessionsGross;

      const grossCollected = Math.max(txGross, totalStudentsAndSinglesPaid);
      // Synchronize with teacher.totalEarned from DataContext (respects cycle reset)
      const teacherEarned = teacher.totalEarned !== undefined ? teacher.totalEarned : Math.round(calculatedTeacherEarned);
      const schoolNet = Math.max(0, grossCollected - teacherEarned);
      const schoolMarginPct = grossCollected > 0 ? Math.round((schoolNet / grossCollected) * 100) : Math.max(0, 100 - commission);

      const teacherPaid = teacher.totalPaid !== undefined ? teacher.totalPaid : 0;
      const teacherBalanceDue = teacher.balanceDue !== undefined ? teacher.balanceDue : Math.max(0, teacherEarned - teacherPaid);

      const uncollectedDebt = teacherCourses.reduce(
        (acc, c) => acc + (c.enrolledList?.reduce((sAcc, s) => sAcc + (!s.isExempt ? s.totalDebt || 0 : 0), 0) || 0),
        0
      );

      const singleSessionsSchoolShare = Math.max(0, singleSessionsGross - singleSessionsTeacherShare);

      return {
        teacher,
        coursesCount,
        enrolledStudentsCount,
        compensationText,
        grossCollected,
        teacherEarned,
        schoolNet,
        schoolMarginPct,
        teacherPaid,
        teacherBalanceDue,
        uncollectedDebt,
        singleSessionsCount,
        singleSessionsGross,
        singleSessionsTeacherShare,
        singleSessionsSchoolShare,
        singleSessionDetails,
      };
    });
  }, [teachers, courses, filteredTransactions, period]);

  // Aggregate stats across all teachers
  const allTeachersGrossCollected = useMemo(() => {
    return teacherFinancials.reduce((acc, t) => acc + t.grossCollected, 0);
  }, [teacherFinancials]);

  const allTeachersDuesTotal = useMemo(() => {
    return teacherFinancials.reduce((acc, t) => acc + t.teacherEarned, 0);
  }, [teacherFinancials]);

  const allTeachersSchoolNetTotal = useMemo(() => {
    return teacherFinancials.reduce((acc, t) => acc + t.schoolNet, 0);
  }, [teacherFinancials]);

  const allTeachersSingleSessionSchoolShare = useMemo(() => {
    return teacherFinancials.reduce((acc, t) => acc + t.singleSessionsSchoolShare, 0);
  }, [teacherFinancials]);

  const overallSchoolMarginPct = useMemo(() => {
    return allTeachersGrossCollected > 0
      ? Math.round((allTeachersSchoolNetTotal / allTeachersGrossCollected) * 100)
      : 0;
  }, [allTeachersGrossCollected, allTeachersSchoolNetTotal]);

  // Active selected teacher report
  const currentSelectedTeacherReport = useMemo(() => {
    if (!selectedTeacherId && teacherFinancials.length > 0) return teacherFinancials[0];
    return teacherFinancials.find((t) => t.teacher.id === selectedTeacherId) || teacherFinancials[0];
  }, [teacherFinancials, selectedTeacherId]);

  // Filtered teachers list by search query
  const filteredTeacherFinancials = useMemo(() => {
    if (!teacherSearchQuery.trim()) return teacherFinancials;
    const q = teacherSearchQuery.trim().toLowerCase();
    return teacherFinancials.filter(
      (t) =>
        t.teacher.fullName.toLowerCase().includes(q) ||
        t.teacher.subject.toLowerCase().includes(q) ||
        t.teacher.phone.includes(q)
    );
  }, [teacherFinancials, teacherSearchQuery]);

  // Print Official Teacher & School Share Financial Statement (PDF / A4)
  const handlePrintTeacherFinancialStatement = (report: TeacherFinancialReport) => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const formattedDate = `${formatDateArabic(now.toISOString().split('T')[0])} - ${now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const teacherCourses = courses.filter((c) => c.teacherId === report.teacher.id);

    const printWindow = window.open('', '_blank', 'width=920,height=780');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) لتوليد كشف الحساب.');
      return;
    }

    const history = report.teacher.payoutHistory || [];
    const lastSettlementIndex = history.findIndex((p) => p.isCycleSettlement);
    const currentCyclePayouts =
      lastSettlementIndex === -1
        ? history.filter((p) => !p.isCycleSettlement)
        : history.slice(0, lastSettlementIndex).filter((p) => !p.isCycleSettlement);

    let totalAllEnrolled = 0;
    let totalAllExempt = 0;
    let totalAllCoursePaid = 0;
    let totalAllCourseTeacherShare = 0;
    let totalAllCourseSchoolNet = 0;
    let totalAllCourseDebt = 0;

    const courseRows = teacherCourses
      .map((c, idx) => {
        const enrolled = c.enrolledList?.length || 0;
        const exemptCount = c.enrolledList?.filter((s) => s.isExempt).length || 0;
        const regularPaid = (c.enrolledList || []).reduce((acc, s) => {
          if (s.isExempt) return acc;
          const debt = s.totalDebt || 0;
          const isKhalis = debt <= 0;
          const paid = isKhalis ? (c.monthlyPrice || 0) : 0;
          return acc + paid;
        }, 0);
        const singlePaid = (c.enrolledList || []).reduce((acc, s) => {
          const singles = (s.attendanceLogs || []).filter((l) => l.status === 'single_session' || l.type === 'single_session');
          return acc + singles.reduce((sAcc, l) => sAcc + (l.amount || 0), 0);
        }, 0);
        const coursePrice = c.monthlyPrice || 0;
        const teacherRatePerStudent =
          report.teacher.compensationType === 'fixed_per_student' || (report.teacher.compensationType as string) === 'fixed_per_course'
            ? (report.teacher.fixedRatePerStudent !== undefined ? report.teacher.fixedRatePerStudent : (report.teacher.fixedCourseRate || 1000))
            : Math.round(coursePrice * ((report.teacher.commissionPercentage !== undefined ? report.teacher.commissionPercentage : 60) / 100));
        const schoolRemainderPerStudent = Math.max(0, coursePrice - teacherRatePerStudent);

        const totalPaid = regularPaid + singlePaid;
        const totalDebt = c.enrolledList?.reduce((acc, s) => acc + (!s.isExempt ? s.totalDebt || 0 : 0), 0) || 0;
        const courseTeacherShare = calculateCourseTeacherShare(report.teacher, c);
        const courseSchoolNet = Math.max(0, totalPaid - courseTeacherShare);
        const expectedCourseSchoolNet = Math.max(0, (totalPaid + totalDebt) - courseTeacherShare);

        totalAllEnrolled += enrolled;
        totalAllExempt += exemptCount;
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
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">
            ${enrolled} ${exemptCount > 0 ? `<div style="font-size: 8.5px; color: #b45309; font-weight: normal;">(${exemptCount} معفى)</div>` : ''}
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

    const singleSessionRows = report.singleSessionDetails
      .map((s, idx) => {
        return `
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
      `;
      })
      .join('');

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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف الحساب المالي للأستاذ وحق المؤسسة الصافي - ${report.teacher.fullName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            margin: 0;
            padding: 10px;
            color: #0f172a;
            background: #fff;
            direction: rtl;
            font-size: 11.5px;
            line-height: 1.5;
          }
          .header-box {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title {
            font-size: 19px;
            font-weight: 800;
            color: #1e3a8a;
            margin-bottom: 4px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-bottom: 18px;
          }
          .kpi-card {
            border: 1.5px solid #cbd5e1;
            background-color: #f8fafc;
            padding: 8px 10px;
            border-radius: 8px;
          }
          .kpi-title {
            font-size: 10px;
            color: #475569;
            margin-bottom: 4px;
            font-weight: 600;
          }
          .kpi-val {
            font-size: 13.5px;
            font-weight: 800;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 11px;
          }
          th {
            background-color: #f1f5f9;
            color: #1e293b;
            padding: 7px 8px;
            border: 1px solid #cbd5e1;
            text-align: right;
            font-weight: 700;
          }
          .signatures {
            margin-top: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            page-break-inside: avoid;
          }
          .sig-box {
            border-top: 1px dashed #94a3b8;
            padding-top: 8px;
            text-align: center;
            font-weight: 700;
            font-size: 11.5px;
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
            <div style="font-size: 13.5px; font-weight: 700; color: #2563eb;">كشف الحساب المالي المفصل للأستاذ وحق المؤسسة الصافي</div>
            <div style="font-size: 11px; color: #475569; margin-top: 3px;">
              الأستاذ: <strong>${report.teacher.fullName}</strong> • مادة: <strong>${report.teacher.subject}</strong> • هاتف: <strong>${report.teacher.phone || '—'}</strong>
            </div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
              نظام التعاقد: <strong>${report.compensationText}</strong>
            </div>
          </div>
          <div style="text-align: left; font-size: 10.5px; color: #475569;">
            <div>تاريخ الكشف: <strong>${formattedDate}</strong></div>
            <div style="color: #16a34a; font-weight: 700; margin-top: 3px;">كشف مالي معتمد ومطابق للحصص</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card" style="border-color: #22c55e;">
            <div class="kpi-title">1. مقبوضات أفواج الأستاذ (+)</div>
            <div class="kpi-val" style="color: #16a34a;">+${report.grossCollected.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">${report.coursesCount} أفواج • ${report.enrolledStudentsCount} تلميذ</div>
          </div>

          <div class="kpi-card" style="border-color: #3b82f6;">
            <div class="kpi-title">2. مستحقات الأستاذ (-)</div>
            <div class="kpi-val" style="color: #2563eb;">-${report.teacherEarned.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">المحسوب عن الحصص</div>
          </div>

          <div class="kpi-card" style="border: 2px solid #16a34a; background-color: #f0fdf4;">
            <div class="kpi-title" style="color: #15803d; font-weight: 800;">3. صافي المؤسسة الباقي (=)</div>
            <div class="kpi-val" style="color: #15803d; font-size: 15px; font-weight: 900;">
              +${report.schoolNet.toLocaleString('fr-DZ')} دج
            </div>
            <div style="font-size: 9px; color: #166534; font-weight: 700; margin-top: 2px;">
              المحصل فعلياً (هامش ربح محقق: ${report.schoolMarginPct}%)
            </div>
            ${totalAllCourseDebt > 0 ? `
              <div style="font-size: 8.5px; color: #047857; margin-top: 2px; border-top: 1px dashed #86efac; padding-top: 2px;">
                الصافي المتوقع عند استيفاء الديون: <strong>+${(report.schoolNet + totalAllCourseDebt).toLocaleString('fr-DZ')} دج</strong>
              </div>
            ` : ''}
          </div>

          <div class="kpi-card">
            <div class="kpi-title">4. المسدد للأستاذ (الدفعات)</div>
            <div class="kpi-val" style="color: #2563eb;">${report.teacherPaid.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 9.5px; color: ${report.teacherPaid > 0 ? '#1d4ed8' : '#b45309'}; margin-top: 2px; font-weight: 600;">
              ${report.teacherPaid > 0 ? 'دفعات مسددة' : 'في انتظار الصرف'}
            </div>
          </div>

          <div class="kpi-card" style="border: 2px solid ${report.teacherBalanceDue > 0 ? '#f59e0b' : '#10b981'};">
            <div class="kpi-title">5. صافي الرصيد المتبقي للأستاذ</div>
            <div class="kpi-val" style="color: ${report.teacherBalanceDue > 0 ? '#d97706' : '#16a34a'};">
              ${report.teacherBalanceDue.toLocaleString('fr-DZ')} دج
            </div>
            <div style="font-size: 9.5px; color: ${report.teacherBalanceDue > 0 ? '#b45309' : '#15803d'}; margin-top: 2px; font-weight: 600;">
              ${report.teacherBalanceDue > 0 ? 'مستحق الصرف' : 'تم تسوية كامل المستحقات ✓'}
            </div>
          </div>
        </div>

        <div style="font-size: 12.5px; font-weight: 700; margin-bottom: 6px; color: #1e3a8a;">
          أولاً: تفاصيل الأفواج التعليمية وتوزيع الإيرادات والأتعاب (سعر الدورة = مستحق الأستاذ + صافي المؤسسة الباقي)
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>اسم الفوج والمستوى</th>
              <th style="width: 75px; text-align: center;">سعر الدورة</th>
              <th style="width: 135px; text-align: center; color: #1e3a8a;">اتفاق الأتعاب (أستاذ / صافي المؤسسة)</th>
              <th style="text-align: center;">التلاميذ</th>
              <th style="text-align: left; color: #16a34a;">المقبوضات المحصلة (+)</th>
              <th style="text-align: left; color: #2563eb;">مستحق الأستاذ (-)</th>
              <th style="text-align: left; color: #15803d; font-weight: 800;">صافي المؤسسة الباقي (=)</th>
              <th style="text-align: left; color: #dc2626;">الديون المعلقة</th>
            </tr>
          </thead>
          <tbody>
            ${courseRows || '<tr><td colspan="9" style="text-align: center; padding: 12px; color: #94a3b8;">لا توجد أفواج مسجلة لهذا الأستاذ</td></tr>'}
          </tbody>
          ${teacherCourses.length > 0 ? `
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
              <td colspan="4" style="padding: 8px; text-align: center; font-weight: 800; color: #1e3a8a;">
                المجموع الإجمالي للأفواج (${teacherCourses.length} أفواج ${totalAllExempt > 0 ? `• منهم ${totalAllExempt} معفى` : ''})
              </td>
              <td style="padding: 8px; text-align: center; font-weight: 800; color: #1e3a8a;">${totalAllEnrolled}</td>
              <td style="padding: 8px; text-align: left; font-weight: 800; color: #16a34a;">+${totalAllCoursePaid.toLocaleString('fr-DZ')} دج</td>
              <td style="padding: 8px; text-align: left; font-weight: 800; color: #2563eb;">-${totalAllCourseTeacherShare.toLocaleString('fr-DZ')} دج</td>
              <td style="padding: 8px; text-align: left; font-weight: 800; color: #15803d;">
                <div>+${totalAllCourseSchoolNet.toLocaleString('fr-DZ')} دج</div>
                ${totalAllCourseDebt > 0 ? `<div style="font-size: 8.5px; color: #166534; font-weight: normal;">(متوقع: +${(totalAllCourseSchoolNet + totalAllCourseDebt).toLocaleString('fr-DZ')} دج)</div>` : ''}
              </td>
              <td style="padding: 8px; text-align: left; font-weight: 800; color: #dc2626;">${totalAllCourseDebt > 0 ? `${totalAllCourseDebt.toLocaleString('fr-DZ')} دج` : '<span style="color: #16a34a;">0 دج (خالص ✓)</span>'}</td>
            </tr>
          </tfoot>
          ` : ''}
        </table>

        ${
          report.singleSessionDetails.length > 0
            ? `
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #1e3a8a; margin-top: 20px;">
            ثانياً: الحصص الفردية الواحدة المسددة وتوزيع مبالغها (الأستاذ والمدرسة)
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
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
                <td colspan="4" style="padding: 7px 8px; text-align: center; font-weight: 800;">إجمالي الحصص الفردية (${report.singleSessionDetails.length} حصة)</td>
                <td style="padding: 7px 8px; text-align: left; font-weight: 800; color: #1e3a8a;">${report.singleSessionDetails.reduce((a, s) => a + s.amount, 0).toLocaleString('fr-DZ')} دج</td>
                <td style="padding: 7px 8px; text-align: left; font-weight: 800; color: #dc2626;">${report.singleSessionDetails.reduce((a, s) => a + s.teacherAmount, 0).toLocaleString('fr-DZ')} دج</td>
                <td style="padding: 7px 8px; text-align: left; font-weight: 800; color: #16a34a;">+${report.singleSessionDetails.reduce((a, s) => a + s.schoolAmount, 0).toLocaleString('fr-DZ')} دج</td>
                <td style="padding: 7px 8px; font-size: 10px; color: #15803d; font-weight: bold;">صافي المؤسسة الباقي المحصل</td>
              </tr>
            </tfoot>
          </table>
        `
            : ''
        }

        <!-- Section: Payouts history -->
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #1e3a8a; margin-top: 18px;">
          ${report.singleSessionDetails.length > 0 ? 'ثالثاً' : 'ثانياً'}: سجل الدفعات المسددة للأستاذ في هذه الدورة
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 110px; text-align: center;">تاريخ الصرف</th>
              <th style="width: 130px;">طريقة الدفع</th>
              <th style="text-align: left; color: #15803d;">المبلغ المصروف</th>
              <th>البيان والملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${payoutRows || '<tr><td colspan="5" style="text-align: center; padding: 10px; color: #94a3b8;">لم يتم تسجيل أي دفعات مسددة للأستاذ في هذه الدورة حتى الآن (في انتظار الصرف)</td></tr>'}
          </tbody>
          ${currentCyclePayouts.length > 0 ? `
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <td colspan="3" style="padding: 7px 8px; text-align: center; font-weight: 800;">إجمالي المسدد للأستاذ (الدورة الحالية)</td>
              <td style="padding: 7px 8px; text-align: left; font-weight: 800; color: #15803d;">${report.teacherPaid.toLocaleString('fr-DZ')} دج</td>
              <td style="padding: 7px 8px; font-size: 10.5px; color: #475569;">المتبقي الصافي في الذمة: <strong style="color: ${report.teacherBalanceDue > 0 ? '#b45309' : '#15803d'};">${report.teacherBalanceDue.toLocaleString('fr-DZ')} دج</strong></td>
            </tr>
          </tfoot>
          ` : ''}
        </table>

        <!-- Clarification Box -->
        <div style="margin-top: 14px; margin-bottom: 16px; padding: 10px 14px; background-color: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 6px; font-size: 11px; color: #92400e; line-height: 1.6;">
          <div style="font-weight: 800; font-size: 11.5px; margin-bottom: 5px; color: #78350f;">
            📌 توضيحات محاسبية هامة بشأن كشف الحساب:
          </div>
          <div>
            • <strong>معادلة صافي المؤسسة الباقي:</strong> سعر الدورة = مستحق الأستاذ + <strong>صافي المؤسسة الباقي</strong> (مثال: إذا كان سعر الدورة 2,000 دج وحصة الأستاذ 1,350 دج، فإن صافي المؤسسة الباقي هو 650 دج عن كل تلميذ).
          </div>
          <div>
            • <strong>توزيع الأتعاب وصافي المؤسسة:</strong> صافي المؤسسة الباقي المحقق بعد اقتطاع مستحقات الأستاذ يبلغ <strong>+${report.schoolNet.toLocaleString('fr-DZ')} دج</strong> بنسبة هامش ربح <strong>${report.schoolMarginPct}%</strong>${totalAllCourseDebt > 0 ? `، وسيرتفع إلى <strong>+${(report.schoolNet + totalAllCourseDebt).toLocaleString('fr-DZ')} دج</strong> بمجرد تحصيل الديون المعلقة البالغة <strong>${totalAllCourseDebt.toLocaleString('fr-DZ')} دج</strong>` : ''}.
          </div>
          <div>
            • <strong>التلاميذ المعفيون:</strong> ${totalAllExempt > 0 ? `يتضمن الكشف عدد (<strong>${totalAllExempt}</strong>) تلميذ معفى من الرسوم. لا يترتب على التلميذ المعفى أي مستحق مالي للأستاذ في نظام النسب (مستحقه: <strong>0 دج</strong>)، وتتكفل المؤسسة بحالته الاجتماعية دون المساس بحقوق الأستاذ عن بقية التلاميذ المسددين.` : 'لا يوجد تلاميذ معفيون في أفواج هذا الأستاذ.'}
          </div>
          <div>
            • <strong>مقبوضات الاشتراكات والديون:</strong> المقبوضات المحصلة تمثل المبالغ المسددة فعلياً من التلاميذ في هذه الدورة (+ الحصص الفردية). الديون المعلقة البالغة <strong>${totalAllCourseDebt.toLocaleString('fr-DZ')} دج</strong> قيد التحصيل بذمة التلاميذ.
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
              <div style="font-size: 15px; font-weight: 900; color: #2563eb;">-${report.teacherShare.toLocaleString('fr-DZ')} دج</div>
              <div style="font-size: 8.5px; color: #3b82f6; margin-top: 2px;">إجمالي أتعاب ومستحقات الأستاذ</div>
            </div>

            <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10px; color: #475569; font-weight: 700; margin-bottom: 3px;">3. صافي حق المؤسسة الباقي (=)</div>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a;">+${report.schoolNet.toLocaleString('fr-DZ')} دج</div>
              <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">صافي صندوق المؤسسة</div>
            </div>

            <div style="background-color: ${report.teacherBalanceDue > 0 ? '#fffbeb' : '#f0fdf4'}; border: 1.5px solid ${report.teacherBalanceDue > 0 ? '#fde68a' : '#86efac'}; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 10px; color: ${report.teacherBalanceDue > 0 ? '#92400e' : '#166534'}; font-weight: 700; margin-bottom: 3px;">4. المتبقي في الذمة للأستاذ</div>
              <div style="font-size: 15px; font-weight: 900; color: ${report.teacherBalanceDue > 0 ? '#d97706' : '#15803d'};">
                ${report.teacherBalanceDue.toLocaleString('fr-DZ')} دج
              </div>
              <div style="font-size: 8.5px; color: ${report.teacherBalanceDue > 0 ? '#b45309' : '#16a34a'}; margin-top: 2px;">
                ${report.teacherPaid > 0 ? `(تم تسديد: ${report.teacherPaid.toLocaleString('fr-DZ')} دج)` : (report.teacherBalanceDue > 0 ? 'مستحق الصرف' : 'خالص بالكامل ✓')}
              </div>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            توقيع واستلام الأستاذ: <strong>${report.teacher.fullName}</strong>
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

  // Archive print function
  const handlePrintArchiveReport = () => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('ar-DZ')} - ${now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const printWindow = window.open('', '_blank', 'width=900,height=750');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) لتوليد تقرير الأرشفة.');
      return;
    }

    const txRows = filteredTransactions
      .map(
        (tx, idx) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-family: monospace; font-weight: bold;">${tx.receiptNumber}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${tx.date}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-weight: bold;">${tx.studentName}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${tx.courseTitle}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: bold; color: #16a34a;">+${tx.amount.toLocaleString('fr-DZ')} دج</td>
      </tr>
    `
      )
      .join('');

    const teacherRows = teachers
      .map(
        (t, idx) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-weight: bold;">${t.fullName}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${t.subject}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${
          t.compensationType === 'percentage_per_student'
            ? `نسبة ${t.commissionPercentage || 60}% من كل تلميذ`
            : `مقطوع: ${(t.fixedRatePerStudent || t.fixedCourseRate || 1000).toLocaleString('fr-DZ')} دج / تلميذ`
        }</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: bold; color: #dc2626;">-${(
          t.totalEarned || 0
        ).toLocaleString('fr-DZ')} دج</td>
      </tr>
    `
      )
      .join('');

    const expenseRows = filteredExpenses
      .map(
        (exp, idx) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-family: monospace; font-weight: bold;">${exp.receiptNumber}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${exp.date}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-weight: bold;">${exp.title}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${exp.recipientName || '—'}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: bold; color: #dc2626;">-${exp.amount.toLocaleString('fr-DZ')} دج</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير أرشفة وإقفال الدورة المالية - ${schoolName}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 10px; color: #111827; background: #fff; direction: rtl; font-size: 12px; line-height: 1.5; }
          .header-box { border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 20px; font-weight: 800; color: #1e3a8a; margin-bottom: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .kpi-card { border: 1px solid #e5e7eb; background-color: #f9fafb; padding: 10px; border-radius: 6px; }
          .kpi-title { font-size: 10.5px; color: #4b5563; margin-bottom: 4px; }
          .kpi-val { font-size: 14px; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11px; }
          th { background-color: #f3f4f6; color: #374151; padding: 8px; border: 1px solid #d1d5db; text-align: right; font-weight: 700; }
          .signatures { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; page-break-inside: avoid; }
          .sig-box { border-top: 1px dashed #9ca3af; padding-top: 10px; text-align: center; font-weight: 600; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="title">${schoolName}</div>
            <div style="font-size: 13px; font-weight: 600; color: #4b5563;">تقرير الأرشفة المالية الشامل وإقفال الدورة</div>
          </div>
          <div style="text-align: left; font-size: 11px; color: #4b5563;">
            <div>تاريخ الاستخراج: <strong>${formattedDate}</strong></div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">1. المقبوضات النقدية (+)</div>
            <div class="kpi-val" style="color: #16a34a;">+${studentPayments.toLocaleString('fr-DZ')} دج</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">2. مستحقات الأساتذة (-)</div>
            <div class="kpi-val" style="color: #dc2626;">-${teacherDues.toLocaleString('fr-DZ')} دج</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">3. المصاريف والنفقات (-)</div>
            <div class="kpi-val" style="color: #ea580c;">-${periodExpenses.toLocaleString('fr-DZ')} دج</div>
          </div>
          <div class="kpi-card" style="border: 2px solid #10b981;">
            <div class="kpi-title">4. صافي الأرباح المحققة (=)</div>
            <div class="kpi-val" style="color: #1e3a8a; font-size: 15px;">
              ${netAchievedRevenue.toLocaleString('fr-DZ')} دج
            </div>
          </div>
        </div>

        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #1e3a8a;">
          جدول سندات القبض المشمولة
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>رقم الإيصال</th>
              <th>التاريخ</th>
              <th>اسم التلميذ</th>
              <th>الفوج والدورة</th>
              <th style="text-align: left;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${txRows || '<tr><td colspan="6" style="text-align: center;">لا توجد سندات</td></tr>'}
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleConfirmArchive = () => {
    archiveFinancialCycle(
      filteredTransactions.map((t) => t.id),
      filteredExpenses.map((e) => e.id)
    );
    setIsArchiveModalOpen(false);
    success(
      `تمت أرشفة وإقفال الدورة المالية (${filteredTransactions.length} سند قبض) وبدأت الدورة الجديدة من الصفر بنجاح!`,
      'أرشفة الدورة المالية'
    );
  };

  return (
    <div>
      <PageHeader
        title="التقارير والإحصائيات المالية"
        description="تحليلات الأداء المالي المتقدم، حق المدرسة الصافي، وأداء الأساتذة المخصص بالأرقام الدقيقة"
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: 'this_month', label: 'الشهر الحالي' },
                { value: 'last_month', label: 'الشهر الماضي' },
                { value: 'trimester_1', label: 'الثلاثي الأول' },
                { value: 'full_year', label: 'السنة الحالية 2026' },
                { value: 'all_time', label: 'كل الفترات (الإجمالي العام)' },
              ]}
            />

            <Button
              variant="primary"
              rightIcon={<FileText size={16} />}
              onClick={handlePrintArchiveReport}
            >
              استخراج تقرير عام PDF
            </Button>

            <Button
              variant="secondary"
              rightIcon={<Archive size={16} />}
              onClick={() => setIsArchiveModalOpen(true)}
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)',
              }}
            >
              أرشفة وإقفال الدورة
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-5)',
          paddingBottom: '4px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'general' ? 700 : 500,
            backgroundColor: activeTab === 'general' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'general' ? '#ffffff' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <TrendingUp size={16} />
          <span>التقرير المالي العام للمؤسسة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teachers_analysis')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'teachers_analysis' ? 700 : 500,
            backgroundColor: activeTab === 'teachers_analysis' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'teachers_analysis' ? '#ffffff' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Briefcase size={16} />
          <span>تحليل الأساتذة وحق المدرسة الصافي</span>
          <span
            style={{
              fontSize: '0.6875rem',
              padding: '2px 6px',
              borderRadius: '999px',
              backgroundColor: activeTab === 'teachers_analysis' ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-surface-secondary)',
              color: activeTab === 'teachers_analysis' ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {teachers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teacher_detail')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'teacher_detail' ? 700 : 500,
            backgroundColor: activeTab === 'teacher_detail' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'teacher_detail' ? '#ffffff' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={16} />
          <span>كشف الحساب المالي المفصل لكل أستاذ</span>
        </button>
      </div>

      {/* TAB 1: GENERAL FINANCIAL REPORT */}
      {activeTab === 'general' && (
        <div>
          {/* Main Financial KPIs: Achieved Revenue = Student Payments - Teacher Dues - Expenses */}
          <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4" style={{ marginBottom: 'var(--space-4)' }}>
            <StatCard
              title="الإيرادات المحققة (صافي المؤسسة)"
              value={formatDZD(netAchievedRevenue)}
              subtitle="المقبوضات – مستحقات الأساتذة – المصاريف"
              icon={<TrendingUp size={20} color={netAchievedRevenue >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />}
            />
            <StatCard
              title="إجمالي مدفوعات التلاميذ"
              value={`+${formatDZD(studentPayments)}`}
              subtitle={`${filteredTransactions.length} عملية قبض خلال هذه الفترة`}
              icon={<Wallet size={20} color="var(--color-success)" />}
            />
            <StatCard
              title="إجمالي مستحقات الأساتذة"
              value={`-${formatDZD(teacherDues)}`}
              subtitle="أتعاب الأساتذة والتأطير المحسوبة"
              icon={<Users size={20} color="var(--color-warning)" />}
            />
            <StatCard
              title="المصاريف العامة وأجور العمال"
              value={`-${formatDZD(periodExpenses)}`}
              subtitle={`${filteredExpenses.length} سندات صرف (كهرباء، أجور، إنترنت...)`}
              icon={<DollarSign size={20} color="var(--color-danger)" />}
            />
          </div>

          {/* Financial Formula Breakdown Card */}
          <Card style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                    معادلة احتساب صافي الإيرادات المحققة للمؤسسة
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    صافي المؤسسة = إجمالي مدفوعات التلاميذ (المحصلة) – مستحقات الأساتذة – المصاريف العامة وأجور العمال
                  </div>
                </div>
                <Badge variant={netAchievedRevenue >= 0 ? 'success' : 'danger'}>
                  {netAchievedRevenue >= 0 ? 'فائض أرباح صافية محققة' : 'المصاريف والمستحقات تتجاوز المقبوضات'}
                </Badge>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  padding: '14px',
                  backgroundColor: 'var(--color-bg-app)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
                className="md:grid-cols-1"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    1. مدفوعات التلاميذ (+)
                  </span>
                  <span style={{ fontSize: '1.1875rem', fontWeight: 800, color: 'var(--color-success)' }}>
                    +{formatDZD(studentPayments)}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                    المقبوضات المحصلة نقداً
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    2. مستحقات الأساتذة (-)
                  </span>
                  <span style={{ fontSize: '1.1875rem', fontWeight: 800, color: 'var(--color-danger)' }}>
                    -{formatDZD(teacherDues)}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                    أتعاب الأساتذة وفق التعاقد
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    3. المصاريف وأجور العمال (-)
                  </span>
                  <span style={{ fontSize: '1.1875rem', fontWeight: 800, color: '#ea580c' }}>
                    -{formatDZD(periodExpenses)}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                    كهرباء، إنترنت، أجور عمال، إيجار
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderRight: '2px solid var(--color-border)',
                    paddingRight: '12px',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    4. صافي أرباح المؤسسة (=)
                  </span>
                  <span
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: netAchievedRevenue >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
                    }}
                  >
                    {formatDZD(netAchievedRevenue)}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                    الربح الصافي النهائي المتبقي
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Operational Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4" style={{ marginBottom: 'var(--space-6)' }}>
            <StatCard
              title="الدورات والأفواج الجماعية"
              value={`${totalActiveCourses} أفواج`}
              subtitle="أفواج نشطة مسجلة"
              icon={<BookOpen size={20} color="var(--color-primary)" />}
            />
            <StatCard
              title="إجمالي التلاميذ في الأفواج"
              value={totalEnrolledStudents}
              subtitle="تلاميذ مسجلون"
              icon={<GraduationCap size={20} color="var(--color-success)" />}
            />
          </div>
        </div>
      )}

      {/* TAB 2: TEACHERS ANALYSIS & SCHOOL NET PROFIT */}
      {activeTab === 'teachers_analysis' && (
        <div>
          {/* Top School Share from Teachers KPIs */}
          <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4" style={{ marginBottom: 'var(--space-5)' }}>
            <Card
              style={{
                backgroundColor: 'rgba(22, 163, 74, 0.04)',
                border: '1.5px solid #22c55e',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 600 }}>
                    إجمالي صافي المؤسسة الباقي من الأساتذة
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
                    +{formatDZD(allTeachersSchoolNetTotal)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '4px' }}>
                    هامش أرباح المؤسسة: <strong>{overallSchoolMarginPct}%</strong> من إجمالي المقبوضات
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(22, 163, 74, 0.15)',
                    color: '#16a34a',
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
              </div>
            </Card>

            <Card
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    إجمالي مقبوضات أفواج التدريس
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                    {formatDZD(allTeachersGrossCollected)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    المبالغ المحصلة من تسجيلات واشتراكات التلاميذ
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg-app)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Wallet size={24} />
                </div>
              </div>
            </Card>

            <Card
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    إجمالي أتعاب الأساتذة المستحقة
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                    -{formatDZD(allTeachersDuesTotal)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    مجموع حقوق الأساتذة المحسوبة بدقة
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#dc2626',
                  }}
                >
                  <Coins size={24} />
                </div>
              </div>
            </Card>

            <Card
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.04)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#1d4ed8', fontWeight: 600 }}>
                    صافي حق المدرسة من الحصص الواحدة
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                    +{formatDZD(allTeachersSingleSessionSchoolShare)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '4px' }}>
                    أرباح الحصص المفردة والاستدراكية
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    color: '#2563eb',
                  }}
                >
                  <ArrowUpRight size={24} />
                </div>
              </div>
            </Card>
          </div>

          {/* Search and Header for Teachers Table */}
          <Card style={{ marginBottom: 'var(--space-6)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  جدول المقارنة المالية: صافي المؤسسة الباقي لكل أستاذ
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  مقارنة المقبوضات ومستحقات الأستاذ وصافي المؤسسة الباقي مع نسبة هامش الربح المحقق
                </div>
              </div>

              <div style={{ width: '280px' }}>
                <Input
                  placeholder="ابحث باسم الأستاذ أو المادة..."
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  prefixIcon={<Search size={16} />}
                />
              </div>
            </div>

            {/* Custom Responsive Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>الأستاذ والمادة</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>نظام الأتعاب</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>الأفواج والتلاميذ</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>المقبوضات (+)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>مستحق الأستاذ (-)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#16a34a' }}>
                      صافي المؤسسة الباقي (=)
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>نسبة عائد المدرسة (%)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>الرصيد المتبقي له</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeacherFinancials.map((report) => (
                    <tr
                      key={report.teacher.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-app)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {report.teacher.fullName}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                          مادة: {report.teacher.subject}
                        </div>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--color-bg-app)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                            display: 'inline-block',
                          }}
                        >
                          {report.compensationText}
                        </span>
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700 }}>{report.coursesCount}</span> أفواج •{' '}
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{report.enrolledStudentsCount}</span> تلميذ
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {formatDZD(report.grossCollected)}
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#dc2626' }}>
                        -{formatDZD(report.teacherEarned)}
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'left' }}>
                        <div style={{ fontWeight: 900, color: '#16a34a', fontSize: '0.9375rem' }}>
                          +{formatDZD(report.schoolNet)}
                        </div>
                        {report.singleSessionsCount > 0 && (
                          <div style={{ fontSize: '0.6875rem', color: '#2563eb' }}>
                            منها {formatDZD(report.singleSessionsSchoolShare)} حصص مفردة
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            backgroundColor: report.schoolMarginPct >= 30 ? 'rgba(22, 163, 74, 0.12)' : 'rgba(234, 88, 12, 0.12)',
                            color: report.schoolMarginPct >= 30 ? '#15803d' : '#ea580c',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                          }}
                        >
                          <Percent size={12} />
                          <span>{report.schoolMarginPct}% للمؤسسة</span>
                        </div>
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'left' }}>
                        <span style={{ fontWeight: 700, color: report.teacherBalanceDue > 0 ? '#ea580c' : '#16a34a' }}>
                          {report.teacherBalanceDue > 0 ? formatDZD(report.teacherBalanceDue) : '0 دج (مسدد)'}
                        </span>
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            title="عرض الكشف المالي التفصيلي"
                            onClick={() => {
                              setSelectedTeacherId(report.teacher.id);
                              setActiveTab('teacher_detail');
                            }}
                          >
                            تفاصيل وحصص
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            isIconOnly
                            title="طباعة كشف الحساب المالي للأستاذ وحق المؤسسة"
                            onClick={() => handlePrintTeacherFinancialStatement(report)}
                            style={{ color: 'var(--color-primary)' }}
                          >
                            <Printer size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTeacherFinancials.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
                  لا توجد نتائج مطابقة لبحثك
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: INDIVIDUAL DETAILED TEACHER STATEMENT */}
      {activeTab === 'teacher_detail' && currentSelectedTeacherReport && (
        <div>
          {/* Teacher Selector Card */}
          <Card style={{ marginBottom: 'var(--space-4)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.125rem',
                  }}
                >
                  {currentSelectedTeacherReport.teacher.fullName.slice(0, 1)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                    كشف حساب الأستاذ: {currentSelectedTeacherReport.teacher.fullName}
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    مادة: <strong>{currentSelectedTeacherReport.teacher.subject}</strong> • طريقة الحساب: <strong>{currentSelectedTeacherReport.compensationText}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  options={teachers.map((t) => ({ value: t.id, label: `${t.fullName} (${t.subject})` }))}
                />
                <Button
                  variant="primary"
                  rightIcon={<Printer size={16} />}
                  onClick={() => handlePrintTeacherFinancialStatement(currentSelectedTeacherReport)}
                >
                  طباعة كشف الأستاذ وحق المؤسسة
                </Button>
              </div>
            </div>
          </Card>

          {/* Visual Profit Distribution Bar */}
          <Card style={{ marginBottom: 'var(--space-4)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                توزيع الإيرادات المحصلة: حصة الأستاذ vs حق المدرسة الصافي
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                إجمالي المحصل: <strong>{formatDZD(currentSelectedTeacherReport.grossCollected)}</strong>
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '18px',
                borderRadius: '999px',
                backgroundColor: 'var(--color-border)',
                display: 'flex',
                overflow: 'hidden',
                margin: '10px 0',
              }}
            >
              <div
                style={{
                  width: `${100 - currentSelectedTeacherReport.schoolMarginPct}%`,
                  backgroundColor: '#dc2626',
                  height: '100%',
                  transition: 'width 0.3s ease',
                }}
                title={`حصة الأستاذ: ${100 - currentSelectedTeacherReport.schoolMarginPct}%`}
              />
              <div
                style={{
                  width: `${currentSelectedTeacherReport.schoolMarginPct}%`,
                  backgroundColor: '#16a34a',
                  height: '100%',
                  transition: 'width 0.3s ease',
                }}
                title={`حق المؤسسة الصافي: ${currentSelectedTeacherReport.schoolMarginPct}%`}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                <span>
                  نصيب الأستاذ: <strong>{formatDZD(currentSelectedTeacherReport.teacherEarned)}</strong> ({100 - currentSelectedTeacherReport.schoolMarginPct}%)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                <span style={{ color: '#15803d', fontWeight: 700 }}>
                  صافي المؤسسة الباقي: <strong>+{formatDZD(currentSelectedTeacherReport.schoolNet)}</strong> ({currentSelectedTeacherReport.schoolMarginPct}%)
                </span>
              </div>
            </div>
          </Card>

          {/* Teacher Specific KPI Grid */}
          <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4" style={{ marginBottom: 'var(--space-5)' }}>
            <StatCard
              title="مقبوضات أفواج الأستاذ (+)"
              value={formatDZD(currentSelectedTeacherReport.grossCollected)}
              subtitle={`${currentSelectedTeacherReport.enrolledStudentsCount} تلميذ في ${currentSelectedTeacherReport.coursesCount} أفواج`}
              icon={<Wallet size={20} color="var(--color-primary)" />}
            />
            <StatCard
              title="مستحقات الأستاذ المحسوبة (-)"
              value={`-${formatDZD(currentSelectedTeacherReport.teacherEarned)}`}
              subtitle={`مسدد له: ${formatDZD(currentSelectedTeacherReport.teacherPaid)}`}
              icon={<Coins size={20} color="var(--color-danger)" />}
            />
            <Card
              style={{
                backgroundColor: 'rgba(22, 163, 74, 0.05)',
                border: '1.5px solid #22c55e',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 700 }}>
                صافي المؤسسة الباقي المحقق (=)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
                +{formatDZD(currentSelectedTeacherReport.schoolNet)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '4px' }}>
                هامش صافي الربح: <strong>{currentSelectedTeacherReport.schoolMarginPct}%</strong>
              </div>
            </Card>
            <StatCard
              title="الديون غير المحصلة بالأفواج"
              value={formatDZD(currentSelectedTeacherReport.uncollectedDebt)}
              subtitle="مستحقات معلقة بذمة التلاميذ"
              icon={<AlertCircle size={20} color="var(--color-warning)" />}
            />
          </div>

          {/* Teacher Courses Breakdown Table */}
          <Card style={{ marginBottom: 'var(--space-5)' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
              أولاً: تفاصيل أفواج ودورات الأستاذ ومردودها المالي
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>اسم الفوج</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>المستوى</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>سعر الاشتراك</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>التلاميذ</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>المقبوضات المحصلة</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--color-primary)' }}>مستحق الأستاذ (-)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--color-success)' }}>صافي المؤسسة الباقي (=)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>الديون المعلقة</th>
                  </tr>
                </thead>
                <tbody>
                  {courses
                    .filter((c) => c.teacherId === currentSelectedTeacherReport.teacher.id)
                    .map((c) => {
                      const enrolled = c.enrolledList?.length || 0;
                      const exemptCount = c.enrolledList?.filter((s) => s.isExempt).length || 0;
                      const regularPaid = c.enrolledList?.reduce((acc, s) => acc + (!s.isExempt ? (s.totalPaid || 0) : 0), 0) || 0;
                      const singlePaid = (c.enrolledList || []).reduce((acc, s) => {
                        const singles = (s.attendanceLogs || []).filter((l) => l.status === 'single_session' || l.type === 'single_session');
                        return acc + singles.reduce((sAcc, l) => sAcc + (l.amount || 0), 0);
                      }, 0);
                      const totalPaid = regularPaid + singlePaid;
                      const debt = c.enrolledList?.reduce((acc, s) => acc + (!s.isExempt ? s.totalDebt || 0 : 0), 0) || 0;
                      const teacherShare = calculateCourseTeacherShare(currentSelectedTeacherReport.teacher, c);
                      const schoolNet = Math.max(0, totalPaid - teacherShare);

                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px 10px', fontWeight: 700 }}>{c.title}</td>
                          <td style={{ padding: '10px 10px', color: 'var(--color-text-secondary)' }}>{c.academicLevel}</td>
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>{formatDZD(c.monthlyPrice)}</td>
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {enrolled} تلميذ
                            {exemptCount > 0 && (
                              <div style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 600 }}>
                                ({exemptCount} معفى)
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-success)' }}>
                            +{formatDZD(totalPaid)}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--color-primary)' }}>
                            -{formatDZD(teacherShare)}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 800, color: '#15803d' }}>
                            +{formatDZD(schoolNet)}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: debt > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                            {debt > 0 ? formatDZD(debt) : '0 دج (خالص)'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: 'var(--color-bg-app)', borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                    <td colSpan={3} style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 800 }}>
                      المجموع العام للأفواج
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {currentSelectedTeacherReport.enrolledStudentsCount} تلميذ
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-success)' }}>
                      +{formatDZD(currentSelectedTeacherReport.grossCollected)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-primary)' }}>
                      -{formatDZD(currentSelectedTeacherReport.teacherEarned)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 900, color: '#15803d' }}>
                      +{formatDZD(currentSelectedTeacherReport.schoolNet)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-danger)' }}>
                      {formatDZD(currentSelectedTeacherReport.uncollectedDebt)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Teacher Single Sessions Table */}
          {currentSelectedTeacherReport.singleSessionDetails.length > 0 && (
            <Card style={{ marginBottom: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                    ثانياً: سجل الحصص الواحدة المسددة وتوزيع مبالغها (الأستاذ والمؤسسة)
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    توثيق كامل لكافة الحصص الفردية المحصلة ونصيب المدرسة الصافي منها مع التبرير المرفق
                  </div>
                </div>
                <Badge variant="info">
                  {currentSelectedTeacherReport.singleSessionDetails.length} حصة واحدة مسددة
                </Badge>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>التلميذ</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>الفوج</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>التاريخ</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>المبلغ المسدد</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>نصيب الأستاذ</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#16a34a' }}>صافي المؤسسة الباقي</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>التبرير / البيان</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSelectedTeacherReport.singleSessionDetails.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 10px', fontWeight: 700 }}>{s.studentName}</td>
                        <td style={{ padding: '10px 10px', color: 'var(--color-text-secondary)' }}>{s.courseTitle}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center', fontSize: '0.75rem' }}>{s.date}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700 }}>{formatDZD(s.amount)}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#dc2626' }}>
                          -{formatDZD(s.teacherAmount)}
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 800, color: '#16a34a' }}>
                          +{formatDZD(s.schoolAmount)}
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: '0.75rem', color: '#2563eb' }}>
                          {s.notes || 'حصة واحدة مسددة'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Archive Cycle Modal */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="أرشفة الدورة المالية وإعادة الضبط"
        description="توليد ملف PDF أرشيفي رسمي للفترة المحددة، ثم تصفير الحسابات للبدء من جديد"
        maxWidth="560px"
        footer={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="primary" rightIcon={<Printer size={16} />} onClick={handlePrintArchiveReport}>
                توليد وتحميل تقرير الأرشفة (PDF)
              </Button>
              <Button variant="danger" rightIcon={<Archive size={16} />} onClick={handleConfirmArchive}>
                تأكيد الأرشفة وبدء دورة جديدة
              </Button>
            </div>
            <Button variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
              اختر مدة الأرشفة المراد إقفالها:
            </label>
            <Select
              value={archiveDuration}
              onChange={(e) => setArchiveDuration(e.target.value)}
              options={[
                { value: '2_months', label: 'شهرين (آخر 60 يوماً)' },
                { value: '3_months', label: '3 أشهر (فصل دراسي - 90 يوماً)' },
                { value: '4_months', label: '4 أشهر (120 يوماً)' },
                { value: '6_months', label: '6 أشهر (سداسي - 180 يوماً)' },
                { value: '1_month', label: 'شهر واحد (آخر 30 يوماً)' },
                { value: '1_year', label: 'سنة كاملة (الموسم الدراسي الحالي)' },
                { value: 'all_time', label: 'كل المعاملات حتى اليوم' },
              ]}
            />
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-warning-bg, #fffbeb)',
              border: '1px solid var(--color-warning, #f59e0b)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-primary)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={20} color="var(--color-warning, #f59e0b)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>آلية عمل الأرشفة وإعادة الضبط:</strong>
              <ol style={{ margin: '4px 0 0 0', paddingRight: '16px', lineHeight: '1.6' }}>
                <li>اضغط على <strong>"توليد وتحميل تقرير الأرشفة (PDF)"</strong> أولاً للاحتفاظ بملف أرشيفي رسمي منظم.</li>
                <li>ثم اضغط على <strong>"تأكيد الأرشفة وبدء دورة جديدة"</strong> لتصفير الحسابات لتبدأ الدورة الجديدة من الصفر.</li>
              </ol>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
