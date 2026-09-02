import React, { useState } from 'react';
import {
  DollarSign,
  Users,
  GraduationCap,
  FileSpreadsheet,
  FileText,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Input';
import { formatDZD } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';

export const Reports: React.FC = () => {
  const { success } = useToast();
  const { courses, transactions, debts, totalEnrolledStudents, totalActiveCourses, totalOutstandingDebts } = useData();
  const [period, setPeriod] = useState('this_month');

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

  const dynamicPeriodRevenue = filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  const handleExport = (type: 'pdf' | 'excel') => {
    success(
      `تم تصدير التقرير المالي لفترة (${period === 'this_month' ? 'الشهر الحالي' : period === 'last_month' ? 'الشهر الماضي' : 'السنة الحالية'}) بصيغة ${type === 'pdf' ? 'PDF' : 'Excel'} بنجاح!`,
      'تصدير التقارير'
    );
  };

  return (
    <div>
      <PageHeader
        title="التقارير والإحصائيات الشاملة"
        description="تحليلات الأداء المالي، تسجيلات التلاميذ في الأفواج، كشوفات المقبوضات النقدية ومستحقات الأساتذة"
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
          </div>
        }
      />

      {/* Financial KPIs Dynamic by Period */}
      <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard
          title="إجمالي الإيرادات المحصلة نقداً"
          value={formatDZD(dynamicPeriodRevenue)}
          subtitle={`${filteredTransactions.length} عملية قبض خلال هذه الفترة`}
          icon={<DollarSign size={20} />}
        />
        <StatCard
          title="مجموع الديون غير المحصلة"
          value={formatDZD(totalOutstandingDebts)}
          subtitle={`${debts.length} أقساط متأخرة`}
          icon={<Users size={20} color="var(--color-warning)" />}
        />
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

      {/* Analytics Rows */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-6" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Courses Enrollment Distribution */}
        <Card title="توزيع التلاميذ حسب الأفواج والدورات">
          {courses.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              لا توجد دورات مسجلة بعد لعرض الإحصائيات.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {courses.map((course) => {
                const count = course.enrolledList?.length || 0;
                const percent = totalEnrolledStudents > 0 ? Math.round((count / totalEnrolledStudents) * 100) : 0;

                return (
                  <div key={course.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600 }}>{course.title}</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {count} تلاميذ ({percent}%)
                      </span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--color-bg-surface-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Financial Payment Methods Distribution (Cash Only) */}
        <Card title="طرق الدفع المعتمدة للمقبوضات">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>الدفع نقداً (Cash)</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  {formatDZD(dynamicPeriodRevenue)} (100%)
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--color-bg-surface-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '4px' }} />
              </div>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', padding: '10px 12px', backgroundColor: 'var(--color-bg-app)', borderRadius: 'var(--radius-md)' }}>
              طريقة الاستلام المعتمدة في المؤسسة هي <strong>الدفع نقداً فقط (Cash)</strong>.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
