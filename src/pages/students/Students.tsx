import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Users,
  Search,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Phone,
  Calendar,
  Filter,
  BadgeCheck,
  CreditCard,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/data-table/DataTable';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Select, Input } from '../../components/common/Input';
import { Student, Course, PaymentTransaction } from '../../types';
import { formatAlgerianPhone, formatDZD, formatDateArabic } from '../../utils/formatters';
import { useData } from '../../contexts/DataContext';

export interface AggregatedStudent {
  keyId: string;
  fullName: string;
  phone: string;
  parentPhone: string;
  academicLevel: string;
  courses: { id: string; title: string; subject: string; attended: number; total: number }[];
  hasPaidAnnualFee: boolean;
  annualFeeReceiptNumber?: string;
  annualFeeDate?: string;
  totalPaidAmount: number;
  totalDebtAmount: number;
  status: 'active' | 'inactive';
  registrationDate: string;
}

export const Students: React.FC = () => {
  const { courses, transactions } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  // Find all transactions that correspond to annual registration fees
  const regFeeTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.courseTitle?.includes('حقوق التسجيل') ||
        t.courseTitle?.includes('حقوق المدرسة') ||
        (t as any).feeCategory === 'registration_fee'
    );
  }, [transactions]);

  // Aggregate unique students across all courses & registration fee transactions
  const aggregatedStudents: AggregatedStudent[] = useMemo(() => {
    const studentMap = new Map<string, AggregatedStudent>();

    // 1. Traverse all enrolled students in courses
    courses.forEach((course) => {
      (course.enrolledList || []).forEach((std) => {
        // Unique key based on trimmed lowercase name or phone
        const key = std.phone?.trim() && std.phone.trim() !== '0550 00 00 00'
          ? std.phone.trim()
          : std.fullName.trim().toLowerCase();

        if (!studentMap.has(key)) {
          studentMap.set(key, {
            keyId: std.id,
            fullName: std.fullName.trim(),
            phone: std.phone || '',
            parentPhone: std.parentPhone || '',
            academicLevel: std.academicLevel || course.academicLevel,
            courses: [],
            hasPaidAnnualFee: false,
            totalPaidAmount: 0,
            totalDebtAmount: 0,
            status: 'active',
            registrationDate: std.registrationDate || new Date().toISOString().split('T')[0],
          });
        }

        const current = studentMap.get(key)!;
        current.courses.push({
          id: course.id,
          title: course.title,
          subject: course.subject,
          attended: std.attendedSessions || 0,
          total: std.totalSessions || course.totalSessionsDefault || 5,
        });
        current.totalPaidAmount += std.totalPaid || 0;
        current.totalDebtAmount += std.totalDebt || 0;
      });
    });

    // 2. Cross-reference with annual fee transactions
    regFeeTransactions.forEach((tx) => {
      const phoneMatch = tx.notes?.match(/الهاتف:\s*([0-9\s]+)/);
      const phoneFromNotes = phoneMatch ? phoneMatch[1].trim() : '';

      const key = phoneFromNotes && phoneFromNotes !== '0550 00 00 00'
        ? phoneFromNotes
        : tx.studentName.trim().toLowerCase();

      if (studentMap.has(key)) {
        const student = studentMap.get(key)!;
        student.hasPaidAnnualFee = true;
        student.annualFeeReceiptNumber = tx.receiptNumber;
        student.annualFeeDate = tx.date;
      } else {
        // Student registered for annual fees but not yet enrolled in courses
        studentMap.set(key, {
          keyId: tx.studentId || `std-${tx.id}`,
          fullName: tx.studentName.trim(),
          phone: phoneFromNotes,
          parentPhone: phoneFromNotes,
          academicLevel: 'مسجل رسمياً بالمدرسة',
          courses: [],
          hasPaidAnnualFee: true,
          annualFeeReceiptNumber: tx.receiptNumber,
          annualFeeDate: tx.date,
          totalPaidAmount: tx.amount || 500,
          totalDebtAmount: 0,
          status: 'active',
          registrationDate: tx.date,
        });
      }
    });

    return Array.from(studentMap.values());
  }, [courses, regFeeTransactions]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return aggregatedStudents.filter((std) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = std.fullName.toLowerCase().includes(q);
        const matchPhone = std.phone.includes(q) || std.parentPhone.includes(q);
        const matchCourse = std.courses.some((c) => c.title.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q));
        if (!matchName && !matchPhone && !matchCourse) return false;
      }

      // Fee status filter
      if (feeStatusFilter === 'paid' && !std.hasPaidAnnualFee) return false;
      if (feeStatusFilter === 'unpaid' && std.hasPaidAnnualFee) return false;

      // Course filter
      if (selectedCourseFilter !== 'all') {
        const isInCourse = std.courses.some((c) => c.id === selectedCourseFilter);
        if (!isInCourse) return false;
      }

      return true;
    });
  }, [aggregatedStudents, searchQuery, feeStatusFilter, selectedCourseFilter]);

  // Quick stats
  const totalStudentsCount = aggregatedStudents.length;
  const annualPaidCount = aggregatedStudents.filter((s) => s.hasPaidAnnualFee).length;
  const annualUnpaidCount = totalStudentsCount - annualPaidCount;

  const columns: Column<AggregatedStudent>[] = [
    {
      key: 'fullName',
      header: 'اسم التلميذ وبيانات الاتصال',
      sortable: true,
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: s.hasPaidAnnualFee ? 'rgba(22, 163, 74, 0.12)' : 'var(--color-bg-surface-secondary)',
              color: s.hasPaidAnnualFee ? '#16a34a' : 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
              flexShrink: 0,
            }}
          >
            {s.fullName.slice(0, 1)}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{s.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Phone size={11} />
              <span>{formatAlgerianPhone(s.phone || s.parentPhone || '0550 00 00 00')}</span>
              <span>•</span>
              <span>{s.academicLevel}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'hasPaidAnnualFee',
      header: 'الاشتراك السنوي بالمدرسة',
      sortable: true,
      render: (s) => {
        if (s.hasPaidAnnualFee) {
          return (
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(22, 163, 74, 0.1)',
                  color: '#15803d',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                <BadgeCheck size={13} /> مسدد ومسجل رسمياً
              </span>
              {s.annualFeeReceiptNumber && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                  {s.annualFeeReceiptNumber}
                </div>
              )}
            </div>
          );
        }
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <AlertCircle size={13} /> غير مسجل في الاشتراك
          </span>
        );
      },
    },
    {
      key: 'courses',
      header: 'الأفواج والدورات المشارك فيها',
      render: (s) => {
        if (s.courses.length === 0) {
          return (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              غير منضم لأي فوج حالياً
            </span>
          );
        }
        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {s.courses.map((c, i) => (
              <span
                key={i}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {c.title}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'النشاط والحضور',
      render: (s) => {
        if (s.courses.length === 0) return <span>—</span>;
        const totalAttended = s.courses.reduce((acc, c) => acc + c.attended, 0);
        const totalSessions = s.courses.reduce((acc, c) => acc + c.total, 0);

        return (
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {totalAttended} / {totalSessions} حصة
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              عبر {s.courses.length} أفواج
            </div>
          </div>
        );
      },
    },
    {
      key: 'totalDebtAmount',
      header: 'الحالة المالية',
      render: (s) => {
        if (s.totalDebtAmount > 0) {
          return (
            <div>
              <span style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '0.875rem' }}>
                متأخرات: {formatDZD(s.totalDebtAmount)}
              </span>
            </div>
          );
        }
        return (
          <span style={{ fontWeight: 600, color: 'var(--color-success)', fontSize: '0.8125rem' }}>
            خالص ({formatDZD(s.totalPaidAmount)})
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة شؤون التلاميذ"
        description="استعراض كامل التلاميذ المسجلين بالمدرسة، متابعة نشاطهم، أفواجهم، والتحقق من سداد الاشتراك السنوي"
      />

      {/* KPI Cards */}
      <div
        className="grid grid-cols-3 md:grid-cols-1 gap-4"
        style={{ marginBottom: 'var(--space-6)' }}
      >
        <StatCard
          title="إجمالي التلاميذ المسجلين"
          value={totalStudentsCount}
          subtitle="تلاميذ في النظام"
          icon={<GraduationCap size={20} color="var(--color-primary)" />}
        />

        <StatCard
          title="مسددين للاشتراك السنوي"
          value={annualPaidCount}
          subtitle="ملفات مؤكدة رسمياً"
          icon={<BadgeCheck size={20} color="#16a34a" />}
        />

        <StatCard
          title="غير مسددين للاشتراك السنوي"
          value={annualUnpaidCount}
          subtitle="بحاجة لتسوية حقوق المدرسة"
          icon={<AlertCircle size={20} color="#dc2626" />}
        />
      </div>

      {/* Filters Bar */}
      <Card style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
            <Input
              placeholder="ابحث باسم التلميذ، الهاتف، أو المادة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefixIcon={<Search size={16} />}
            />
          </div>

          <div style={{ width: '220px' }}>
            <Select
              value={feeStatusFilter}
              onChange={(e) => setFeeStatusFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'كل حالات الاشتراك السنوي' },
                { value: 'paid', label: 'مسدد للاشتراك السنوي فقط' },
                { value: 'unpaid', label: 'غير مسدد للاشتراك' },
              ]}
            />
          </div>

          <div style={{ width: '240px' }}>
            <Select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              options={[
                { value: 'all', label: 'جميع الأفواج والدورات' },
                ...courses.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <DataTable
        data={filteredStudents}
        columns={columns}
        keyExtractor={(s) => s.keyId}
        searchPlaceholder="تصفية سريعة داخل الجدول..."
        searchFields={['fullName', 'phone', 'parentPhone', 'academicLevel']}
      />
    </div>
  );
};
