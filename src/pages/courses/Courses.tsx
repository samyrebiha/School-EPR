import React, { useState } from 'react';
import {
  PlusCircle,
  Users,
  Clock,
  MapPin,
  DollarSign,
  UserPlus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/data-table/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Drawer } from '../../components/common/Drawer';
import { Input, Select } from '../../components/common/Input';
import { Course, Student } from '../../types';
import { formatDZD } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';

export interface CoursesProps {
  onNavigate?: (page: string) => void;
  isAddModalOpenInitially?: boolean;
  onCloseAddModalInitially?: () => void;
}

export const Courses: React.FC<CoursesProps> = ({
  onNavigate,
  isAddModalOpenInitially = false,
  onCloseAddModalInitially,
}) => {
  const { success, warning } = useToast();
  const { courses, teachers, classrooms, addCourse, deleteCourse, enrollStudentToCourse } = useData();

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [courseForEnroll, setCourseForEnroll] = useState<Course | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(isAddModalOpenInitially);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Add Course Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('الرياضيات');
  const [academicLevel, setAcademicLevel] = useState('3 ثانوي (بكالوريا)');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [monthlyPrice, setMonthlyPrice] = useState('6000');
  const [maxStudents, setMaxStudents] = useState('25');
  const [totalSessionsDefault, setTotalSessionsDefault] = useState('5');
  const [roomName, setRoomName] = useState(classrooms[0]?.name || '');
  const [scheduleDays, setScheduleDays] = useState('السبت، الثلاثاء');
  const [scheduleTime, setScheduleTime] = useState('17:00 - 19:00');

  // Enroll Student Form State
  const [stdName, setStdName] = useState('');
  const [stdPhone, setStdPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [paidAmount, setPaidAmount] = useState('6000');
  const [studentTotalSessions, setStudentTotalSessions] = useState('5');

  const activeCourse = courses.find((c) => c.id === activeCourseId);

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const teacher = teachers.find((t) => t.id === teacherId) || teachers[0];
    if (!teacher) {
      warning('يرجى إضافة أستاذ واحد على الأقل في صفحة الأساتذة أولاً.');
      return;
    }

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim(),
      academicLevel,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      monthlyPrice: Number(monthlyPrice) || 6000,
      maxStudents: Number(maxStudents) || 25,
      totalSessionsDefault: Number(totalSessionsDefault) || 5,
      enrolledStudents: 0,
      roomName: roomName || (classrooms[0]?.name || 'قاعة تدريس'),
      scheduleDays: scheduleDays.split('،').map((d) => d.trim()),
      scheduleTime,
      type: 'group',
      status: 'active',
      enrolledList: [],
    };

    addCourse(newCourse);
    setIsAddModalOpen(false);
    success(`تم إنشاء فوج "${title}" بنجاح!`, 'تم الإنشاء');

    setTitle('');
  };

  const confirmDeleteCourse = () => {
    if (!courseToDelete) return;
    deleteCourse(courseToDelete.id);
    success(`تم حذف الدورة "${courseToDelete.title}" بنجاح.`);
    setCourseToDelete(null);
  };

  const handleOpenEnrollModal = (course: Course) => {
    setCourseForEnroll(course);
    setPaidAmount(String(course.monthlyPrice || 6000));
    setStudentTotalSessions(String(course.totalSessionsDefault || 5));
    setIsEnrollModalOpen(true);
  };

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCourse = courseForEnroll || activeCourse;
    if (!targetCourse || !stdName.trim()) return;

    const paidVal = Number(paidAmount) || 0;
    const remainingVal = Math.max(0, targetCourse.monthlyPrice - paidVal);
    const sessionsTotal = Number(studentTotalSessions) || 5;

    const newStudent: Student = {
      id: `std-${Date.now()}`,
      fullName: stdName.trim(),
      phone: stdPhone.trim() || '0550 00 00 00',
      gender: 'ذكر',
      academicLevel: targetCourse.academicLevel,
      parentName: 'ولي الأمر',
      parentPhone: parentPhone.trim() || '', // Optional
      parentRelation: 'أب',
      enrolledCourseTitle: targetCourse.title,
      totalPaid: paidVal,
      totalDebt: remainingVal,
      totalSessions: sessionsTotal,
      attendedSessions: 0,
      attendanceLogs: [],
      status: 'active',
      registrationDate: new Date().toISOString().split('T')[0],
    };

    enrollStudentToCourse(targetCourse.id, newStudent);
    setIsEnrollModalOpen(false);
    setCourseForEnroll(null);
    success(`تم تسجيل التلميذ ${stdName} في فوج "${targetCourse.title}" بنجاح!`, 'تم التسجيل');

    setStdName('');
    setStdPhone('');
    setParentPhone('');
  };

  const columns: Column<Course>[] = [
    {
      key: 'title',
      header: 'اسم الدورة والمادة',
      sortable: true,
      render: (c) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
            {c.title}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {c.academicLevel} • مادة: {c.subject}
          </div>
        </div>
      ),
    },
    {
      key: 'teacherName',
      header: 'الأستاذ المؤطر',
      sortable: true,
      render: (c) => (
        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {c.teacherName}
        </span>
      ),
    },
    {
      key: 'monthlyPrice',
      header: 'سعر الاشتراك',
      sortable: true,
      render: (c) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
          {formatDZD(c.monthlyPrice)}
        </span>
      ),
    },
    {
      key: 'enrolledStudents',
      header: 'المسجلون / السعة',
      sortable: true,
      render: (c) => {
        const count = c.enrolledList?.length || 0;
        const isFull = count >= c.maxStudents;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: isFull ? 'var(--color-danger)' : 'inherit' }}>
              {count} / {c.maxStudents}
            </span>
            {isFull && <Badge variant="danger">مكتمل</Badge>}
          </div>
        );
      },
    },
    {
      key: 'roomName',
      header: 'القاعة والتوقيت',
      render: (c) => (
        <div style={{ fontSize: '0.8125rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}>
            <MapPin size={13} color="var(--color-primary)" />
            <span>{c.roomName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            <Clock size={13} />
            <span>{c.scheduleTime} ({c.scheduleDays?.join('، ')})</span>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      width: '200px',
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveCourseId(c.id)}
            rightIcon={<Users size={14} />}
          >
            التلاميذ ({c.enrolledList?.length || 0})
          </Button>

          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            title="حذف الفوج"
            onClick={() => setCourseToDelete(c)}
            style={{ color: 'var(--color-danger)' }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="الدورات والأفواج الجماعية"
        description="تنظيم وتسيير أفواج التدريس، تسجيل التلاميذ، وتوزيع القاعات والمواقيت"
        actions={
          <Button
            variant="primary"
            rightIcon={<PlusCircle size={16} />}
            onClick={() => {
              if (teachers.length === 0) {
                warning('يرجى إضافة أستاذ واحد على الأقل أولاً لإنشاء دورة.');
                return;
              }
              if (teachers.length > 0 && !teacherId) setTeacherId(teachers[0].id);
              if (classrooms.length > 0 && !roomName) setRoomName(classrooms[0].name);
              setIsAddModalOpen(true);
            }}
          >
            + إنشاء دورة / فوج جديد
          </Button>
        }
      />

      {/* Courses Table */}
      <DataTable
        data={courses}
        columns={columns}
        keyExtractor={(c) => c.id}
        searchPlaceholder="ابحث باسم الفوج، المادة، أو الأستاذ..."
        searchFields={['title', 'subject', 'teacherName', 'roomName']}
        emptyTitle="لا توجد دورات أو أفواج بعد"
        emptyDescription="اضغط على زر (إنشاء دورة / فوج جديد) لبدء إضافة أفواج التدريس."
      />

      {/* Add Course Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          if (onCloseAddModalInitially) onCloseAddModalInitially();
        }}
        title="إنشاء دورة أو فوج جماعي جديد"
        description="تسجيل بيانات الفوج، الأستاذ المؤطر، وسعر الاشتراك والقاعة"
        maxWidth="540px"
      >
        <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="اسم الفوج أو الدورة"
            placeholder="مثال: فوج التفوق - الرياضيات 3 ثانوي"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="المادة المدرّسة (نص حر)"
              placeholder="مثال: الرياضيات، العلوم..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <Input
              label="الطور / المستوى الدراسي"
              placeholder="مثال: 3 ثانوي (بكالوريا)"
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Select
              label="الأستاذ المؤطر"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              options={teachers.map((t) => ({ value: t.id, label: `${t.fullName} (${t.subject})` }))}
              required
            />
            <Input
              label="سعر الاشتراك للفوج (دج DZD)"
              type="number"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 md:grid-cols-1 gap-4">
            <Input
              label="المقاعد المتاحة"
              type="number"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              required
            />
            <Input
              label="عدد الحصص (مثال: 5)"
              type="number"
              value={totalSessionsDefault}
              onChange={(e) => setTotalSessionsDefault(e.target.value)}
              required
            />
            <Select
              label="القاعة المخصصة"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              options={
                classrooms.length > 0
                  ? classrooms.map((r) => ({
                      value: r.name,
                      label: `${r.name} ${r.roomNumber ? `(${r.roomNumber})` : `(سعة ${r.capacity})`}`,
                    }))
                  : [
                      {
                        value: '',
                        label: 'لا توجد قاعات مسجلة - أضف قاعة من إدارة القاعات والمخابر',
                      },
                    ]
              }
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="أيام الدراسة"
              placeholder="السبت، الثلاثاء"
              value={scheduleDays}
              onChange={(e) => setScheduleDays(e.target.value)}
              required
            />
            <Input
              label="التوقيت"
              placeholder="17:00 - 19:00"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: 'var(--space-2)' }}>
            <Button type="submit" variant="primary">
              إنشاء الدورة
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Course Modal */}
      <Modal
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        title="تأكيد حذف الدورة أو الفوج"
        description="هل أنت متأكد من رغبتك في حذف هذا الفوج الدراسي؟"
        maxWidth="440px"
        footer={
          <>
            <Button variant="danger" onClick={confirmDeleteCourse}>
              نعم، حذف الدورة
            </Button>
            <Button variant="secondary" onClick={() => setCourseToDelete(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        {courseToDelete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)' }}>
            <AlertTriangle size={24} color="var(--color-danger)" />
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              سيتم حذف <strong>{courseToDelete.title}</strong> وجميع بيانات التسجيل المرتبطة بها.
            </div>
          </div>
        )}
      </Modal>

      {/* Course Student Roster Drawer */}
      <Drawer
        isOpen={!!activeCourse}
        onClose={() => setActiveCourseId(null)}
        title={activeCourse?.title || ''}
        subtitle={`المسجلون: ${activeCourse?.enrolledList?.length || 0} من ${activeCourse?.maxStudents || 0} مقعد`}
        footer={
          activeCourse ? (
            <Button
              variant="primary"
              className="w-full"
              rightIcon={<UserPlus size={16} />}
              onClick={() => handleOpenEnrollModal(activeCourse)}
            >
              + إضافة تلميذ جديد لهذا الفوج
            </Button>
          ) : null
        }
      >
        {activeCourse && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                padding: 'var(--space-3) var(--space-3-5)',
                backgroundColor: 'var(--color-bg-surface-secondary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
              }}
            >
              <span>سعر الاشتراك: <strong>{formatDZD(activeCourse.monthlyPrice)}</strong></span>
              <span>الأستاذ: <strong>{activeCourse.teacherName}</strong></span>
            </div>

            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              قائمة تلاميذ هذا الفوج ({activeCourse.enrolledList?.length || 0})
            </h4>

            {(!activeCourse.enrolledList || activeCourse.enrolledList.length === 0) ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                لا يوجد تلاميذ مسجلون في هذا الفوج بعد. اضغط على الزر أدناه لإضافة تلميذ.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {activeCourse.enrolledList.map((std) => (
                  <div
                    key={std.id}
                    style={{
                      padding: 'var(--space-3)',
                      backgroundColor: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                        {std.fullName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        هاتف: {std.phone} {std.parentPhone ? `• ولي الأمر: ${std.parentPhone}` : ''}
                      </div>
                    </div>

                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {std.attendedSessions || 0} / {std.totalSessions || 5} حصص
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: std.totalDebt > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                        {std.totalDebt > 0 ? `دين: ${formatDZD(std.totalDebt)}` : 'خالص ✓'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Enroll Student to Course Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false);
          setCourseForEnroll(null);
        }}
        title={`تسجيل تلميذ جديد في فوج: ${(courseForEnroll || activeCourse)?.title || ''}`}
        description="تسجيل بيانات التلميذ، الحصص، والمبلغ المسدد نقداً"
        maxWidth="500px"
      >
        <form onSubmit={handleEnrollStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="اسم التلميذ الكامل"
            placeholder="مثال: أمين بن علي"
            value={stdName}
            onChange={(e) => setStdName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="هاتف التلميذ"
              placeholder="0550 12 34 56"
              value={stdPhone}
              onChange={(e) => setStdPhone(e.target.value)}
              required
            />
            <Input
              label="هاتف ولي الأمر (اختياري)"
              placeholder="0661 98 76 54 (اختياري)"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              required={false}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="إجمالي عدد الحصص المقررة"
              type="number"
              value={studentTotalSessions}
              onChange={(e) => setStudentTotalSessions(e.target.value)}
              required
            />
            <Input
              label={`المبلغ المسدد نقداً (من أصل ${formatDZD((courseForEnroll || activeCourse)?.monthlyPrice || 0)})`}
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary">
              تأكيد تسجيل التلميذ في الفوج
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEnrollModalOpen(false);
                setCourseForEnroll(null);
              }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
