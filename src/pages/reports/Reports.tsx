import React, { useState } from 'react';
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
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatDZD } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';

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
  const [period, setPeriod] = useState('this_month');

  // Archive Cycle Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveDuration, setArchiveDuration] = useState('3_months');

  // Filter transactions dynamically by selected time period
  const filteredTransactions = transactions.filter((tx) => {
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
      // Trimester 1 (Sept - Nov) or last 3 months
      const month = txDate.getMonth();
      return (month >= 8 && month <= 10) && txDate.getFullYear() === now.getFullYear();
    }
    if (period === 'full_year' || period === 'this_year') {
      return txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Filter expenses dynamically by selected time period
  const filteredExpenses = expenses.filter((exp) => {
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
      return (month >= 8 && month <= 10) && expDate.getFullYear() === now.getFullYear();
    }
    if (period === 'full_year' || period === 'this_year') {
      return expDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // 1. Total payments collected from students in the selected period
  const studentPayments = filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  // 2. Teacher dues for active courses (current cycle)
  const teacherDues = totalTeachersEarned || 0;

  // 3. Operational Expenses for the selected period
  const periodExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // 4. Achieved Revenue (صافي المؤسسة) = مدفوعات التلاميذ - مستحقات الأساتذة - المصاريف التشغيلية
  const netAchievedRevenue = studentPayments - teacherDues - periodExpenses;

  // Filter transactions for archiving based on archiveDuration
  const filteredArchiveTx = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    const now = new Date();

    if (archiveDuration === '1_month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return txDate >= oneMonthAgo && txDate <= now;
    }
    if (archiveDuration === '2_months') {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(now.getMonth() - 2);
      return txDate >= twoMonthsAgo && txDate <= now;
    }
    if (archiveDuration === '3_months') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return txDate >= threeMonthsAgo && txDate <= now;
    }
    if (archiveDuration === '4_months') {
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(now.getMonth() - 4);
      return txDate >= fourMonthsAgo && txDate <= now;
    }
    if (archiveDuration === '6_months') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      return txDate >= sixMonthsAgo && txDate <= now;
    }
    if (archiveDuration === '1_year') {
      return txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Filter expenses for archiving based on archiveDuration
  const filteredArchiveExpenses = expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    const now = new Date();

    if (archiveDuration === '1_month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return expDate >= oneMonthAgo && expDate <= now;
    }
    if (archiveDuration === '2_months') {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(now.getMonth() - 2);
      return expDate >= twoMonthsAgo && expDate <= now;
    }
    if (archiveDuration === '3_months') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return expDate >= threeMonthsAgo && expDate <= now;
    }
    if (archiveDuration === '4_months') {
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(now.getMonth() - 4);
      return expDate >= fourMonthsAgo && expDate <= now;
    }
    if (archiveDuration === '6_months') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      return expDate >= sixMonthsAgo && expDate <= now;
    }
    if (archiveDuration === '1_year') {
      return expDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const archiveStudentPayments = filteredArchiveTx.reduce((acc, t) => acc + (t.amount || 0), 0);
  const archiveTeacherDues = totalTeachersEarned || 0;
  const archiveExpenses = filteredArchiveExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const archiveNetRevenue = archiveStudentPayments - archiveTeacherDues - archiveExpenses;

  const durationLabels: Record<string, string> = {
    '1_month': 'شهر واحد (آخر 30 يوماً)',
    '2_months': 'شهرين (آخر 60 يوماً)',
    '3_months': '3 أشهر (فصل دراسي - 90 يوماً)',
    '4_months': '4 أشهر (120 يوماً)',
    '6_months': '6 أشهر (سداسي - 180 يوماً)',
    '1_year': 'سنة كاملة (الموسم الدراسي الحالي)',
    'all_time': 'كل المعاملات حتى اليوم',
  };

  const handlePrintArchiveReport = () => {
    const schoolName = currentSchool?.name || 'مدرستي التعليمية';
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('ar-DZ')} - ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    const printWindow = window.open('', '_blank', 'width=900,height=750');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) لتوليد تقرير الأرشفة.');
      return;
    }

    const txRows = filteredArchiveTx.map((tx, idx) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-family: monospace; font-weight: bold;">${tx.receiptNumber}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${tx.date}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-weight: bold;">${tx.studentName}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${tx.courseTitle}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: bold; color: #16a34a;">+${tx.amount.toLocaleString('fr-DZ')} دج</td>
      </tr>
    `).join('');

    const teacherRows = teachers.map((t, idx) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-weight: bold;">${t.fullName}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${t.subject}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${t.compensationType === 'percentage_per_student' ? `نسبة ${t.commissionPercentage || 60}%` : 'مبلغ مقطوع'}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: bold; color: #dc2626;">-${(t.totalEarned || 0).toLocaleString('fr-DZ')} دج</td>
      </tr>
    `).join('');

    const expenseRows = filteredArchiveExpenses.map((exp, idx) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-family: monospace; font-weight: bold;">${exp.receiptNumber}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${exp.date}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-weight: bold;">${exp.title}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${exp.recipientName || '—'}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: bold; color: #dc2626;">-${exp.amount.toLocaleString('fr-DZ')} دج</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير أرشفة وإقفال الدورة المالية - ${schoolName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            margin: 0;
            padding: 10px;
            color: #111827;
            background: #fff;
            direction: rtl;
            font-size: 12px;
            line-height: 1.5;
          }
          .header-box {
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            color: #1e3a8a;
            margin-bottom: 4px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .kpi-card {
            border: 1px solid #e5e7eb;
            background-color: #f9fafb;
            padding: 10px;
            border-radius: 6px;
          }
          .kpi-title {
            font-size: 10.5px;
            color: #4b5563;
            margin-bottom: 4px;
          }
          .kpi-val {
            font-size: 14px;
            font-weight: 800;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 11px;
          }
          th {
            background-color: #f3f4f6;
            color: #374151;
            padding: 8px;
            border: 1px solid #d1d5db;
            text-align: right;
            font-weight: 700;
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
            padding-top: 10px;
            text-align: center;
            font-weight: 600;
            font-size: 12px;
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
            <div style="font-size: 13px; font-weight: 600; color: #4b5563;">تقرير الأرشفة المالية الشامل وإقفال الدورة</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">فترة الأرشفة: <strong>${durationLabels[archiveDuration] || archiveDuration}</strong></div>
          </div>
          <div style="text-align: left; font-size: 11px; color: #4b5563;">
            <div>تاريخ الاستخراج: <strong>${formattedDate}</strong></div>
            <div>حالة التقرير: <strong>أرشيف نهائي معتمد</strong></div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">1. المقبوضات النقدية (+)</div>
            <div class="kpi-val" style="color: #16a34a;">+${archiveStudentPayments.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 10px; color: #6b7280;">(${filteredArchiveTx.length} سند قبض)</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-title">2. مستحقات الأساتذة (-)</div>
            <div class="kpi-val" style="color: #dc2626;">-${archiveTeacherDues.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 10px; color: #6b7280;">(${teachers.length} مؤطرين)</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-title">3. المصاريف والنفقات (-)</div>
            <div class="kpi-val" style="color: #ea580c;">-${archiveExpenses.toLocaleString('fr-DZ')} دج</div>
            <div style="font-size: 10px; color: #6b7280;">(${filteredArchiveExpenses.length} بنود مصاريف)</div>
          </div>

          <div class="kpi-card" style="border: 2px solid ${archiveNetRevenue >= 0 ? '#10b981' : '#ef4444'};">
            <div class="kpi-title">4. صافي الأرباح المحققة (=)</div>
            <div class="kpi-val" style="color: ${archiveNetRevenue >= 0 ? '#1e3a8a' : '#dc2626'}; font-size: 15px;">
              ${archiveNetRevenue.toLocaleString('fr-DZ')} دج
            </div>
            <div style="font-size: 10px; color: #6b7280;">صافي الربح النهائي</div>
          </div>
        </div>

        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #1e3a8a;">
          أولاً: جدول المقبوضات وسندات القبض المشمولة بالأرشفة
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>رقم الإيصال</th>
              <th>التاريخ</th>
              <th>اسم التلميذ</th>
              <th>الفوج والدورة</th>
              <th style="text-align: left;">المبلغ المحصل</th>
            </tr>
          </thead>
          <tbody>
            ${txRows || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #9ca3af;">لا توجد سندات قبض مسجلة في هذه الفترة</td></tr>'}
          </tbody>
        </table>

        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #1e3a8a; margin-top: 20px;">
          ثانياً: جدول أجور ومستحقات الأساتذة المقفلة في الدورة
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>اسم الأستاذ</th>
              <th>المادة</th>
              <th>نظام الأتعاب</th>
              <th style="text-align: left;">المستحقات المقفلة</th>
            </tr>
          </thead>
          <tbody>
            ${teacherRows || '<tr><td colspan="5" style="text-align: center; padding: 12px; color: #9ca3af;">لا توجد بيانات أساتذة</td></tr>'}
          </tbody>
        </table>

        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #1e3a8a; margin-top: 20px;">
          ثالثاً: جدول المصاريف التشغيلية وأجور العمال المقفلة في الدورة
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>رقم السند</th>
              <th>التاريخ</th>
              <th>بيان المصروف</th>
              <th>المستلم / الجهة</th>
              <th style="text-align: left;">المبلغ المصروف</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRows || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #9ca3af;">لا توجد مصاريف مسجلة في هذه الفترة</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            توقيع وختم أمين الصندوق / المحاسب
            <div style="height: 50px;"></div>
          </div>
          <div class="sig-box">
            توقيع وختم مدير المؤسسة
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

  const handleConfirmArchive = () => {
    archiveFinancialCycle(
      filteredArchiveTx.map((t) => t.id),
      filteredArchiveExpenses.map((e) => e.id)
    );
    setIsArchiveModalOpen(false);
    success(
      `تمت أرشفة وإقفال الدورة المالية (${filteredArchiveTx.length} سند قبض، مستحقات أساتذة بقيمة ${formatDZD(archiveTeacherDues)}، ومصاريف بقيمة ${formatDZD(archiveExpenses)}) وبدأت الدورة المالية الجديدة من الصفر بنجاح!`,
      'أرشفة الدورة المالية'
    );
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    handlePrintArchiveReport();
  };

  return (
    <div>
      <PageHeader
        title="التقارير والإحصائيات الشاملة"
        description="تحليلات الأداء المالي، تسجيلات التلاميذ في الأفواج، كشوفات المقبوضات النقدية ومستحقات الأساتذة"
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
              onClick={() => handleExport('pdf')}
            >
              استخراج تقرير PDF
            </Button>

            <Button
              variant="secondary"
              rightIcon={<Archive size={16} />}
              onClick={() => setIsArchiveModalOpen(true)}
              style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
            >
              أرشفة الدورة وبدء دورة جديدة
            </Button>
          </div>
        }
      />

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
                أتعاب الأساتذة وفق النسب
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
              <Button
                variant="primary"
                rightIcon={<Printer size={16} />}
                onClick={handlePrintArchiveReport}
              >
                توليد وتحميل تقرير الأرشفة (PDF)
              </Button>
              <Button
                variant="danger"
                rightIcon={<Archive size={16} />}
                onClick={handleConfirmArchive}
              >
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
          {/* Duration Selector */}
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

          {/* Archive Period Financial Summary */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--color-bg-app)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              ملخص الأرقام المشمولة في هذه الأرشفة ({durationLabels[archiveDuration]}):
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }} className="md:grid-cols-1">
              <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>المقبوضات (+)</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '2px' }}>
                  +{formatDZD(archiveStudentPayments)}
                </div>
                <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)' }}>{filteredArchiveTx.length} سند قبض</div>
              </div>

              <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>مستحقات الأساتذة (-)</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: '2px' }}>
                  -{formatDZD(archiveTeacherDues)}
                </div>
                <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)' }}>{teachers.length} مؤطرين</div>
              </div>

              <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>المصاريف والنفقات (-)</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#ea580c', marginTop: '2px' }}>
                  -{formatDZD(archiveExpenses)}
                </div>
                <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)' }}>{filteredArchiveExpenses.length} سندات صرف</div>
              </div>

              <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>صافي الأرباح (=)</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: archiveNetRevenue >= 0 ? 'var(--color-primary)' : 'var(--color-danger)', marginTop: '2px' }}>
                  {formatDZD(archiveNetRevenue)}
                </div>
                <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)' }}>الربح الصافي النهائي</div>
              </div>
            </div>
          </div>

          {/* Workflow Explanation Banner */}
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
                <li>اضغط على <strong>"توليد وتحميل تقرير الأرشفة (PDF)"</strong> أولاً للاحتفاظ بملف أرشيفي رسمي منظم يحتوي كافة التفاصيل وسندات القبض.</li>
                <li>ثم اضغط على <strong>"تأكيد الأرشفة وبدء دورة جديدة"</strong> لتصفير مستحقات الأساتذة السابقة وتصفير المقبوضات لتبدأ الدورة المالية الجديدة من الصفر.</li>
              </ol>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
