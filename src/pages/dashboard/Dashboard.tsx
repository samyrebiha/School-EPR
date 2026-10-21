import React from 'react';
import {
  GraduationCap,
  BookOpen,
  DollarSign,
  AlertCircle,
  PlusCircle,
  CreditCard,
  Clock,
  MapPin,
  Users,
  Settings,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard, Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatDZD, formatDateArabic } from '../../utils/formatters';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

export interface DashboardProps {
  onNavigate: (page: string) => void;
  onOpenRecordPayment?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenRecordPayment,
}) => {
  const { currentSchool } = useSchool();
  const { isReceptionMode } = useAuth();
  const {
    teachers,
    classrooms,
    courses,
    transactions,
    debts,
    totalEnrolledStudents,
    totalActiveCourses,
    totalMonthlyRevenue,
    totalOutstandingDebts,
  } = useData();

  return (
    <div>
      {/* Header */}
      <PageHeader
        title={isReceptionMode ? `مكتب الاستقبال — ${currentSchool.name}` : `لوحة إدارة ${currentSchool.name}`}
        description={
          isReceptionMode
            ? "العمليات اليومية الميدانية، إدارة الأفواج، الحضور والغياب، وتسجيل وصولات التلاميذ"
            : "متابعة الدورات والأفواج، تسجيلات التلاميذ، والإيرادات المالية"
        }
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              rightIcon={<CreditCard size={16} />}
              onClick={() => (onOpenRecordPayment ? onOpenRecordPayment() : onNavigate('payments'))}
            >
              تسجيل عملية دفع
            </Button>
            <Button
              variant="primary"
              rightIcon={<PlusCircle size={16} />}
              onClick={() => onNavigate('courses')}
            >
              إنشاء دورة أو فوج جديد
            </Button>
            <Button
              variant="outline"
              rightIcon={<Settings size={16} />}
              onClick={() => onNavigate('settings')}
            >
              الإعدادات
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div
        className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4"
        style={{ marginBottom: 'var(--space-6)' }}
      >
        <StatCard
          title="إجمالي التلاميذ في الأفواج"
          value={totalEnrolledStudents}
          subtitle="تلاميذ مسجلون حالياً"
          icon={<GraduationCap size={20} />}
        />

        {isReceptionMode ? (
          <StatCard
            title="الأساتذة والمؤطرون"
            value={`${teachers.length} أستاذ`}
            subtitle="طاقم التدريس النشط"
            icon={<Users size={20} color="var(--color-info)" />}
          />
        ) : (
          <StatCard
            title="إجمالي الإيرادات المحصلة"
            value={formatDZD(totalMonthlyRevenue)}
            subtitle="سندات مقبوضة"
            icon={<DollarSign size={20} />}
          />
        )}

        <StatCard
          title="الدورات والأفواج الجماعية"
          value={`${totalActiveCourses} أفواج`}
          subtitle="أفواج تدريس نشطة"
          icon={<BookOpen size={20} color="var(--color-primary)" />}
        />

        {isReceptionMode ? (
          <StatCard
            title="القاعات والمخابر"
            value={`${classrooms.length} قاعة`}
            subtitle="مساحات تدريس مجهزة"
            icon={<MapPin size={20} color="var(--color-warning)" />}
          />
        ) : (
          <StatCard
            title="إجمالي الديون غير المحصلة"
            value={formatDZD(totalOutstandingDebts)}
            subtitle={`${debts.length} أقساط متأخرة`}
            icon={<AlertCircle size={20} color="var(--color-danger)" />}
          />
        )}
      </div>

      {/* Quick Actions & Schedule Row */}
      <div
        className="grid grid-cols-3 lg:grid-cols-1 gap-6"
        style={{ marginBottom: 'var(--space-6)' }}
      >
        {/* Today's Schedule (2 cols) */}
        <div className="col-span-2 lg:col-span-1">
          <Card
            title="حصص اليوم وجدول القاعات"
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('schedule')}>
                عرض الجدول الكامل
              </Button>
            }
          >
            {courses.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                لا توجد حصص مسجلة بعد. ابدأ بإنشاء دورة جديدة.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
                {courses.slice(0, 3).map((course) => (
                  <div
                    key={course.id}
                    style={{
                      padding: 'var(--space-3-5)',
                      backgroundColor: 'var(--color-bg-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {course.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2-5)',
                          marginTop: 'var(--space-1)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{course.teacherName}</span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <Clock size={13} /> {course.scheduleTime}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <MapPin size={13} /> {course.roomName}
                        </span>
                      </div>
                    </div>

                    <Badge variant="success">
                      {course.enrolledList?.length || 0}/{course.maxStudents} تلميذ
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions Widget */}
        <Card title="إجراءات سريعة">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              className="w-full justify-start"
              rightIcon={<BookOpen size={16} color="var(--color-primary)" />}
              onClick={() => onNavigate('courses')}
            >
              إنشاء دورة أو فوج جديد
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              rightIcon={<Users size={16} color="var(--color-warning)" />}
              onClick={() => onNavigate('teachers')}
            >
              إضافة أستاذ جديد
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              rightIcon={<CreditCard size={16} color="var(--color-success)" />}
              onClick={() => (onOpenRecordPayment ? onOpenRecordPayment() : onNavigate('payments'))}
            >
              تسجيل عملية دفع
            </Button>
          </div>
        </Card>
      </div>

      {/* Bottom Row: Recent Transactions */}
      <Card
        title="آخر عمليات الدفع المسجلة"
        action={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('payments')}>
            جميع العمليات
          </Button>
        }
      >
        {transactions.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            لا توجد أي عمليات دفع مسجلة حتى الآن.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-bg-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-3)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {tx.studentName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {tx.courseTitle} • {tx.receiptNumber}
                  </div>
                </div>

                <div style={{ textAlign: 'left', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatDZD(tx.amount)}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {formatDateArabic(tx.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

