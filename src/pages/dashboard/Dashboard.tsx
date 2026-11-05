import React, { useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  PlusCircle,
  Clock,
  MapPin,
  Users,
  Settings,
  CheckCircle2,
  CreditCard,
  Building2,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard, Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatDateArabic } from '../../utils/formatters';
import { useSchool } from '../../contexts/SchoolContext';
import { useData } from '../../contexts/DataContext';

export interface DashboardProps {
  onNavigate: (page: string) => void;
  onOpenRecordPayment?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentSchool } = useSchool();
  const {
    teachers,
    classrooms,
    courses,
    totalEnrolledStudents,
    totalActiveCourses,
  } = useData();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute today's attendance stats across all courses
  const todayAttendanceStats = useMemo(() => {
    let attendedTodayCount = 0;
    const recentActivity: Array<{
      id: string;
      studentName: string;
      courseTitle: string;
      time: string;
      status: string;
    }> = [];

    courses.forEach((c) => {
      (c.enrolledList || []).forEach((std) => {
        (std.attendanceLogs || []).forEach((log) => {
          if (log && log.date === todayStr) {
            if (log.status === 'present' || log.type === 'present' || log.status === 'single_session') {
              attendedTodayCount++;
              recentActivity.push({
                id: log.id || `${std.id}-${log.time}`,
                studentName: std.fullName || 'تلميذ',
                courseTitle: c.title || 'فوج دراسي',
                time: log.time || '',
                status: 'حاضر',
              });
            }
          }
        });
      });
    });

    // Sort recent activity by time descending
    recentActivity.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

    return {
      attendedTodayCount,
      recentActivity: recentActivity.slice(0, 6),
    };
  }, [courses, todayStr]);

  return (
    <div>
      {/* Header */}
      <PageHeader
        title={`منظومة الحضور والغياب — ${currentSchool.name}`}
        description="إدارة الأفواج الدراسية، تسجيل الحضور عبر الماسح الذكي، ومتابعة انضباط التلاميذ الميداني"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              rightIcon={<CheckCircle2 size={16} />}
              onClick={() => onNavigate('attendance')}
            >
              تسجيل الحضور (الماسح الذكي)
            </Button>
            <Button
              variant="secondary"
              rightIcon={<PlusCircle size={16} />}
              onClick={() => onNavigate('courses')}
            >
              إنشاء فوج أو دورة
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

        <StatCard
          title="حضور اليوم المسجل"
          value={`${todayAttendanceStats.attendedTodayCount} تلميذ`}
          subtitle="سُجّل حضورهم اليوم"
          icon={<CheckCircle2 size={20} color="var(--color-success)" />}
        />

        <StatCard
          title="الأفواج التدريسية النشطة"
          value={`${totalActiveCourses} أفواج`}
          subtitle="أفواج تدريس نشطة"
          icon={<BookOpen size={20} color="var(--color-primary)" />}
        />

        <StatCard
          title="الأساتذة والمؤطرون"
          value={`${teachers.length} أستاذ`}
          subtitle="طاقم التدريس المعتمد"
          icon={<Users size={20} color="var(--color-info)" />}
        />
      </div>

      {/* Quick Actions & Schedule Row */}
      <div
        className="grid grid-cols-3 lg:grid-cols-1 gap-6"
        style={{ marginBottom: 'var(--space-6)' }}
      >
        {/* Today's Schedule (2 cols) */}
        <div className="col-span-2 lg:col-span-1">
          <Card
            title="حصص وجدول اليوم للأفواج"
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('schedule')}>
                عرض الجدول الكامل
              </Button>
            }
          >
            {courses.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                لا توجد حصص مسجلة بعد. ابدأ بإنشاء فوج دراسي جديد.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
                {courses.slice(0, 4).map((course) => (
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
                          <Clock size={13} /> {course.scheduleTime || 'غير محدد'}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <MapPin size={13} /> {course.roomName || 'القاعة العامة'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant="success">
                        {course.enrolledList?.length || 0}/{course.maxStudents} تلميذ
                      </Badge>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onNavigate('attendance')}
                      >
                        الحضور
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions Widget */}
        <Card title="إجراءات سريعة وميدانية">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Button
              variant="primary"
              className="w-full justify-start"
              rightIcon={<CheckCircle2 size={16} />}
              onClick={() => onNavigate('attendance')}
            >
              تسجيل الحضور بالماسح الذكي
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              rightIcon={<CreditCard size={16} color="var(--color-primary)" />}
              onClick={() => onNavigate('cards_directory')}
            >
              دليل بطاقات التلاميذ والباركود
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              rightIcon={<BookOpen size={16} color="var(--color-warning)" />}
              onClick={() => onNavigate('courses')}
            >
              إدارة الأفواج والدورات
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              rightIcon={<Calendar size={16} color="var(--color-info)" />}
              onClick={() => onNavigate('schedule')}
            >
              جدول الحصص والتوقيت
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              rightIcon={<Building2 size={16} color="var(--color-text-secondary)" />}
              onClick={() => onNavigate('rooms')}
            >
              القاعات والمخابر
            </Button>
          </div>
        </Card>
      </div>

      {/* Bottom Row: Recent Attendance Activity */}
      <Card
        title="أحدث تسجيلات الحضور اليوم"
        action={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('attendance')}>
            شاشة الحضور الكاملة
          </Button>
        }
      >
        {todayAttendanceStats.recentActivity.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            لم يتم تسجيل أي حضور لليوم حتى الآن. ابدأ بمسح بطاقات التلاميذ أو تسجيل الحضور اليدوي.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
            {todayAttendanceStats.recentActivity.map((act) => (
              <div
                key={act.id}
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
                    {act.studentName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {act.courseTitle}
                  </div>
                </div>

                <div style={{ textAlign: 'left', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Badge variant="success">{act.status}</Badge>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600, direction: 'ltr' }}>
                    {act.time}
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

export default Dashboard;
