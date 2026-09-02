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

export const Attendance: React.FC = () => {
  const { success, warning } = useToast();
  const { courses, incrementStudentSession, renewStudentSubscription } = useData();

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0] || null;

  // Student Attendance History Log Modal
  const [studentForLogs, setStudentForLogs] = useState<Student | null>(null);

  // Renew Subscription Modal State
  const [studentToRenew, setStudentToRenew] = useState<Student | null>(null);
  const [renewSessionsCount, setRenewSessionsCount] = useState('5');
  const [renewPaidAmount, setRenewPaidAmount] = useState('6000');

  // Quick Click to Record 1 Attended Session (e.g. 1/5 -> 2/5 -> 6/5 with warning)
  const handleIncrement = (studentId: string) => {
    if (!activeCourse) return;

    const res = incrementStudentSession(activeCourse.id, studentId);

    if (res.isExceeded) {
      const overCount = res.attended - res.total;
      warning(
        `تنبيه: التلميذ "${res.studentName}" تجاوز عدد الحصص بحصة إضافية (${res.attended}/${res.total})! يرجى إعادة الاشتراك.`,
        `تجاوز بـ ${overCount} حصص`
      );
    } else {
      success(`تم تسجيل حضور الحصة (${res.attended}/${res.total}) للتلميذ "${res.studentName}" بنجاح!`, 'تسجيل حضور');
    }
  };

  // Open Renew Modal
  const openRenewModal = (student: Student) => {
    setStudentToRenew(student);
    setRenewSessionsCount('5');
    setRenewPaidAmount(String(activeCourse?.monthlyPrice || 6000));
  };

  // Execute Subscription Renewal & Automatically Deduct Overages
  const handleRenew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToRenew || !activeCourse) return;

    const newPackageSessions = Number(renewSessionsCount) || 5;
    const paidVal = Number(renewPaidAmount) || 0;

    const { overageDeducted, startingAttended } = renewStudentSubscription(
      activeCourse.id,
      studentToRenew.id,
      newPackageSessions,
      paidVal
    );

    setStudentToRenew(null);

    if (overageDeducted > 0) {
      success(
        `تم تجديد اشتراك التلميذ "${studentToRenew.fullName}" بنجاح! تم اقتطاع ${overageDeducted} حصص متجاوزة (رصيد الحصص الحالي: ${startingAttended}/${newPackageSessions}).`,
        'تم التجديد واقتطاع التجاوز'
      );
    } else {
      success(`تم تجديد اشتراك التلميذ "${studentToRenew.fullName}" بـ ${newPackageSessions} حصص جديدة بنجاح!`, 'تم التجديد');
    }
  };

  const totalEnrolled = activeCourse?.enrolledList?.length || 0;
  const totalSessionsConsumed = activeCourse?.enrolledList?.reduce((acc, s) => acc + (s.attendedSessions || 0), 0) || 0;
  const totalSessionsCapacity = activeCourse?.enrolledList?.reduce((acc, s) => acc + (s.totalSessions || 5), 0) || 0;
  const totalOverdueStudents = activeCourse?.enrolledList?.filter((s) => (s.attendedSessions || 0) > (s.totalSessions || 5)).length || 0;

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
          <div className="table-toolbar">
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                قائمة تلاميذ الفوج واستهلاك الحصص ({totalEnrolled} تلميذ)
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                اضغط على الزر لتسجيل حضور حصة، أو زر &quot;إعادة الاشتراك&quot; للتجديد واقتطاع التجاوزات
              </div>
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
                  <th>استهلاك الحصص</th>
                  <th>تسجيل الحضور</th>
                  <th>إعادة الاشتراك</th>
                  <th>سجل الحصص</th>
                </tr>
              </thead>
              <tbody>
                {(!activeCourse.enrolledList || activeCourse.enrolledList.length === 0) ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                      لا يوجد تلاميذ مسجلين في هذا الفوج حتى الآن.
                    </td>
                  </tr>
                ) : (
                  activeCourse.enrolledList.map((std) => {
                    const attended = std.attendedSessions || 0;
                    const total = std.totalSessions || 5;
                    const isExceeded = attended > total;
                    const isCompleted = attended === total;
                    const overageCount = Math.max(0, attended - total);

                    return (
                      <tr key={std.id} style={{ backgroundColor: isExceeded ? 'rgba(185, 74, 72, 0.04)' : undefined }}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {std.fullName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {std.academicLevel}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                            {formatAlgerianPhone(std.phone)}
                          </span>
                        </td>
                        <td>
                          {std.totalDebt > 0 ? (
                            <Badge variant="warning">دين: {formatDZD(std.totalDebt)}</Badge>
                          ) : (
                            <Badge variant="success">خالص ✓</Badge>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontWeight: 700,
                                  fontSize: '0.875rem',
                                  fontFamily: 'monospace',
                                  backgroundColor: isExceeded
                                    ? 'var(--color-danger-bg)'
                                    : isCompleted
                                    ? 'var(--color-warning-bg)'
                                    : 'var(--color-primary-light)',
                                  color: isExceeded
                                    ? 'var(--color-danger)'
                                    : isCompleted
                                    ? 'var(--color-warning)'
                                    : 'var(--color-primary)',
                                  border: isExceeded ? '1px solid var(--color-danger)' : undefined,
                                }}
                              >
                                {attended} / {total}
                              </span>

                              {isExceeded && (
                                <Badge variant="danger">
                                  متجاوز بـ {overageCount} {overageCount === 1 ? 'حصة' : 'حصص'}
                                </Badge>
                              )}
                            </div>

                            {isCompleted && !isExceeded && (
                              <span style={{ fontSize: '0.6875rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                                اكتملت الحصص المسجلة
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <Button
                            variant={isExceeded ? 'danger' : 'primary'}
                            size="sm"
                            onClick={() => handleIncrement(std.id)}
                            rightIcon={<CheckCircle2 size={14} />}
                          >
                            + تسجيل حصة ({attended + 1})
                          </Button>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStudentForLogs(std)}
                            rightIcon={<History size={14} />}
                          >
                            السجل ({std.attendanceLogs?.length || 0})
                          </Button>
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
            {(!activeCourse.enrolledList || activeCourse.enrolledList.length === 0) ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                لا يوجد تلاميذ مسجلين في هذا الفوج حتى الآن.
              </div>
            ) : (
              activeCourse.enrolledList.map((std) => {
                const attended = std.attendedSessions || 0;
                const total = std.totalSessions || 5;
                const isExceeded = attended > total;
                const isCompleted = attended === total;
                const overageCount = Math.max(0, attended - total);

                return (
                  <div
                    key={std.id}
                    className={`attendance-mobile-card ${isExceeded ? 'attendance-card-exceeded' : ''}`}
                  >
                    {/* Top: Student Info + Status Badge */}
                    <div className="attendance-card-header">
                      <div className="attendance-student-info">
                        <div className="attendance-student-avatar">
                          {std.fullName.trim().slice(0, 1)}
                        </div>
                        <div>
                          <div className="attendance-student-name">{std.fullName}</div>
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
                        {std.totalDebt > 0 ? (
                          <Badge variant="warning">دين: {formatDZD(std.totalDebt)}</Badge>
                        ) : (
                          <Badge variant="success">خالص ✓</Badge>
                        )}
                      </div>
                    </div>

                    {/* Middle: Sessions Meter & Progress Bar */}
                    <div className="attendance-sessions-meter">
                      <div className="attendance-meter-header">
                        <span className="attendance-meter-label">استهلاك الحصص:</span>
                        <span
                          className={`attendance-meter-value ${
                            isExceeded ? 'text-danger' : isCompleted ? 'text-warning' : 'text-brand'
                          }`}
                        >
                          <strong>{attended}</strong> / {total} حصص
                        </span>
                      </div>

                      <div className="attendance-progress-track">
                        <div
                          className={`attendance-progress-fill ${
                            isExceeded ? 'fill-danger' : isCompleted ? 'fill-warning' : 'fill-primary'
                          }`}
                          style={{
                            width: `${Math.min(100, (attended / (total || 1)) * 100)}%`,
                          }}
                        />
                      </div>

                      {isExceeded && (
                        <div className="attendance-exceeded-notice">
                          <AlertTriangle size={13} />
                          <span>تجاوز بـ {overageCount} {overageCount === 1 ? 'حصة' : 'حصص'} (يرجى التجديد)</span>
                        </div>
                      )}

                      {isCompleted && !isExceeded && (
                        <div className="attendance-completed-notice">
                          <span>اكتملت الحصص المقررة ({total} حصص)</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Actions */}
                    <div className="attendance-card-actions">
                      {/* Primary Quick-Tap Button */}
                      <Button
                        variant={isExceeded ? 'danger' : 'primary'}
                        className="attendance-primary-btn"
                        onClick={() => handleIncrement(std.id)}
                        rightIcon={<CheckCircle2 size={18} />}
                      >
                        + تسجيل حضور الحصة ({attended + 1})
                      </Button>

                      {/* Secondary Actions Row */}
                      <div className="attendance-secondary-actions">
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

      {/* Renew Subscription Modal with Auto-Deduction */}
      <Modal
        isOpen={!!studentToRenew}
        onClose={() => setStudentToRenew(null)}
        title={`إعادة اشتراك التلميذ: ${studentToRenew?.fullName}`}
        description="تجديد باقة الحصص واقتطاع عدد الحصص المتجاوزة تلقائياً"
        maxWidth="500px"
      >
        {studentToRenew && activeCourse && (
          <form onSubmit={handleRenew} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Overage Notice Box */}
            {((studentToRenew.attendedSessions || 0) > (studentToRenew.totalSessions || 5)) ? (
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
                  من أصل {studentToRenew.totalSessions}.
                  <br />
                  سيتم <strong>اقتطاع {Math.max(0, (studentToRenew.attendedSessions || 0) - (studentToRenew.totalSessions || 5))} حصص تلقائياً</strong> من باقة الاشتراك الجديدة.
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
                <strong>{formatDZD(activeCourse.monthlyPrice)}</strong>
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
                {Math.max(0, (studentToRenew.attendedSessions || 0) - (studentToRenew.totalSessions || 5))} / {renewSessionsCount}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: 'var(--space-2)' }}>
              <Button type="submit" variant="primary" rightIcon={<RotateCw size={15} />}>
                تأكيد إعادة الاشتراك
              </Button>
              <Button type="button" variant="secondary" onClick={() => setStudentToRenew(null)}>
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Session Attendance Logs History Modal */}
      <Modal
        isOpen={!!studentForLogs}
        onClose={() => setStudentForLogs(null)}
        title={`سجل حضور حصص: ${studentForLogs?.fullName}`}
        description={`إجمالي الحصص المستهلكة: ${studentForLogs?.attendedSessions || 0} من ${studentForLogs?.totalSessions || 5}`}
        maxWidth="480px"
      >
        {studentForLogs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(!studentForLogs.attendanceLogs || studentForLogs.attendanceLogs.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                لا توجد حصص مسجلة حتى الآن لهذا التلميذ.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {studentForLogs.attendanceLogs.map((log) => (
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
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: log.sessionNumber === 0 ? 'var(--color-success)' : 'var(--color-primary)',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {log.sessionNumber === 0 ? '↻' : log.sessionNumber}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {log.sessionNumber === 0 ? 'تجديد اشتراك باقة جديدة' : `الحصة رقم ${log.sessionNumber}`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      <Calendar size={13} color="var(--color-primary)" />
                      <span>{formatDateArabic(log.date)}</span>
                      <span>({log.time})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button variant="secondary" onClick={() => setStudentForLogs(null)}>
                إغلاق السجل
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
