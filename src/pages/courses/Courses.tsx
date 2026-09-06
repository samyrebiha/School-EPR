import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Users,
  Clock,
  MapPin,
  DollarSign,
  UserPlus,
  Trash2,
  AlertTriangle,
  Check,
  CheckCircle2,
  Calendar,
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
import { ACADEMIC_LEVEL_OPTIONS, DEFAULT_ACADEMIC_LEVEL } from '../../data/academicLevels';

const ALL_WEEK_DAYS = [
  { id: 'السبت', label: 'السبت' },
  { id: 'الأحد', label: 'الأحد' },
  { id: 'الإثنين', label: 'الإثنين' },
  { id: 'الثلاثاء', label: 'الثلاثاء' },
  { id: 'الأربعاء', label: 'الأربعاء' },
  { id: 'الخميس', label: 'الخميس' },
  { id: 'الجمعة', label: 'الجمعة' },
];

const PRESET_DAY_COMBOS = [
  { label: 'السبت والثلاثاء', days: ['السبت', 'الثلاثاء'] },
  { label: 'الجمعة والسبت', days: ['الجمعة', 'السبت'] },
  { label: 'أحد، ثلاثاء، خميس', days: ['الأحد', 'الثلاثاء', 'الخميس'] },
  { label: 'إثنين وأربعاء', days: ['الإثنين', 'الأربعاء'] },
  { label: 'كل الأسبوع', days: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] },
];

const HOUR_OPTIONS = [
  { value: '01', label: '01' },
  { value: '02', label: '02' },
  { value: '03', label: '03' },
  { value: '04', label: '04' },
  { value: '05', label: '05' },
  { value: '06', label: '06' },
  { value: '07', label: '07' },
  { value: '08', label: '08' },
  { value: '09', label: '09' },
  { value: '10', label: '10' },
  { value: '11', label: '11' },
  { value: '12', label: '12' },
];

const MINUTE_OPTIONS = [
  { value: '00', label: '00 (تماماً)' },
  { value: '15', label: '15 (وربع)' },
  { value: '30', label: '30 (ونصف)' },
  { value: '45', label: '45 (إلا ربع)' },
];

const ARABIC_TIME_PRESETS = [
  {
    label: '05:00 - 07:00 مساءً',
    startHour: '05',
    startMinute: '00',
    startPeriod: 'مساءً' as const,
    endHour: '07',
    endMinute: '00',
    endPeriod: 'مساءً' as const,
  },
  {
    label: '08:00 - 10:00 صباحاً',
    startHour: '08',
    startMinute: '00',
    startPeriod: 'صباحاً' as const,
    endHour: '10',
    endMinute: '00',
    endPeriod: 'صباحاً' as const,
  },
  {
    label: '10:00 - 12:00 صباحاً',
    startHour: '10',
    startMinute: '00',
    startPeriod: 'صباحاً' as const,
    endHour: '12',
    endMinute: '00',
    endPeriod: 'مساءً' as const,
  },
  {
    label: '02:00 - 04:00 بعد الزوال',
    startHour: '02',
    startMinute: '00',
    startPeriod: 'مساءً' as const,
    endHour: '04',
    endMinute: '00',
    endPeriod: 'مساءً' as const,
  },
  {
    label: '04:00 - 06:00 عصراً',
    startHour: '04',
    startMinute: '00',
    startPeriod: 'مساءً' as const,
    endHour: '06',
    endMinute: '00',
    endPeriod: 'مساءً' as const,
  },
  {
    label: '06:00 - 08:00 ليلاً',
    startHour: '06',
    startMinute: '00',
    startPeriod: 'مساءً' as const,
    endHour: '08',
    endMinute: '00',
    endPeriod: 'مساءً' as const,
  },
];

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
  const {
    courses,
    teachers,
    classrooms,
    transactions,
    addCourse,
    deleteCourse,
    enrollStudentToCourse,
    removeStudentFromCourse,
  } = useData();

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [courseForEnroll, setCourseForEnroll] = useState<Course | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(isAddModalOpenInitially);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Add Course Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('الرياضيات');
  const [academicLevel, setAcademicLevel] = useState(DEFAULT_ACADEMIC_LEVEL);
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [monthlyPrice, setMonthlyPrice] = useState('6000');
  const [maxStudents, setMaxStudents] = useState('25');
  const [totalSessionsDefault, setTotalSessionsDefault] = useState('5');
  const [roomName, setRoomName] = useState(classrooms[0]?.name || '');
  const [selectedDays, setSelectedDays] = useState<string[]>(['السبت', 'الثلاثاء']);
  const [startHour, setStartHour] = useState('05');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState<'صباحاً' | 'مساءً'>('مساءً');
  const [endHour, setEndHour] = useState('07');
  const [endMinute, setEndMinute] = useState('00');
  const [endPeriod, setEndPeriod] = useState<'صباحاً' | 'مساءً'>('مساءً');

  const formattedScheduleTime = `${startHour}:${startMinute} ${startPeriod} - ${endHour}:${endMinute} ${endPeriod}`;

  const toggleDay = (dayId: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  // Enroll Student Form State
  const [stdName, setStdName] = useState('');
  const [stdPhone, setStdPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [paidAmount, setPaidAmount] = useState('6000');
  const [studentTotalSessions, setStudentTotalSessions] = useState('5');

  // Real-time check if student has paid the annual school registration fee (حقوق التسجيل / حقوق المدرسة)
  const annualFeePayment = useMemo(() => {
    const cleanName = stdName.trim().toLowerCase();
    const cleanStdPhone = stdPhone.replace(/[\s-]/g, '');
    const cleanParentPhone = parentPhone.replace(/[\s-]/g, '');

    if (!cleanName && !cleanStdPhone && !cleanParentPhone) return null;

    return transactions.find((t) => {
      const isRegFee =
        t.type === 'registration_fee' ||
        t.feeCategory === 'registration_fee' ||
        t.courseTitle?.includes('حقوق التسجيل') ||
        t.courseTitle?.includes('حقوق المدرسة');

      if (!isRegFee) return false;

      const tName = (t.studentName || '').trim().toLowerCase();
      const tPhone = (t.studentPhone || '').replace(/[\s-]/g, '');
      const tNotes = (t.notes || '').replace(/[\s-]/g, '');

      const matchName = cleanName.length >= 3 && (tName.includes(cleanName) || cleanName.includes(tName));
      const matchPhone =
        (cleanStdPhone.length >= 8 && (tPhone.includes(cleanStdPhone) || tNotes.includes(cleanStdPhone))) ||
        (cleanParentPhone.length >= 8 && (tPhone.includes(cleanParentPhone) || tNotes.includes(cleanParentPhone)));

      return matchName || matchPhone;
    });
  }, [transactions, stdName, stdPhone, parentPhone]);

  const activeCourse = courses.find((c) => c.id === activeCourseId);

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const teacher = teachers.find((t) => t.id === teacherId) || teachers[0];
    if (!teacher) {
      warning('يرجى إضافة أستاذ واحد على الأقل في صفحة الأساتذة أولاً.');
      return;
    }

    if (selectedDays.length === 0) {
      warning('يرجى اختيار يوم واحد على الأقل من أيام الدراسة الأسبوعية.');
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
      scheduleDays: selectedDays,
      scheduleTime: formattedScheduleTime,
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
    if (!targetCourse || !stdName.trim() || !parentPhone.trim()) return;

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
      parentPhone: parentPhone.trim(),
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
            <Select
              label="الطور / المستوى الدراسي"
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              options={ACADEMIC_LEVEL_OPTIONS}
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

          {/* Premium Days of Week Multi-select Checkbox Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                أيام الدراسة الأسبوعية (اختر يوماً أو أكثر) <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              {selectedDays.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                  ({selectedDays.length} أيام مختارة: {selectedDays.join('، ')})
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {ALL_WEEK_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day.id);
                return (
                  <button
                    type="button"
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: isSelected ? 'var(--color-primary-light, rgba(30, 58, 138, 0.08))' : 'var(--color-bg-surface)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(30, 58, 138, 0.12)' : 'none',
                    }}
                  >
                    <span>{day.label}</span>
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: isSelected ? 'none' : '1.5px solid var(--color-border)',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                      }}
                    >
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Presets for Days */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>نماذج سريعة:</span>
              {PRESET_DAY_COMBOS.map((combo) => (
                <button
                  type="button"
                  key={combo.label}
                  onClick={() => setSelectedDays(combo.days)}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--color-border)',
                    backgroundColor: 'var(--color-bg-surface-secondary)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {combo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Selector with Presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                توقيت الحصة (تحديد البداية والنهاية بالعربية) <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                نظام 12 ساعة (صباحاً / مساءً)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Start Time Box */}
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-bg-app)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: '#16a34a' }}>
                  <span>توقيت بداية الحصة</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Select
                    label="الساعة"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    options={HOUR_OPTIONS}
                  />
                  <Select
                    label="الدقيقة"
                    value={startMinute}
                    onChange={(e) => setStartMinute(e.target.value)}
                    options={MINUTE_OPTIONS}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    الفترة
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setStartPeriod('صباحاً')}
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        border: startPeriod === 'صباحاً' ? '1.5px solid #2563eb' : '1px solid var(--color-border)',
                        backgroundColor: startPeriod === 'صباحاً' ? 'rgba(37, 99, 235, 0.12)' : 'var(--color-bg-surface)',
                        color: startPeriod === 'صباحاً' ? '#1d4ed8' : 'var(--color-text-primary)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      صباحاً
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartPeriod('مساءً')}
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        border: startPeriod === 'مساءً' ? '1.5px solid #2563eb' : '1px solid var(--color-border)',
                        backgroundColor: startPeriod === 'مساءً' ? 'rgba(37, 99, 235, 0.12)' : 'var(--color-bg-surface)',
                        color: startPeriod === 'مساءً' ? '#1d4ed8' : 'var(--color-text-primary)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      مساءً
                    </button>
                  </div>
                </div>
              </div>

              {/* End Time Box */}
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-bg-app)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: '#2563eb' }}>
                  <span>توقيت نهاية الحصة</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Select
                    label="الساعة"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    options={HOUR_OPTIONS}
                  />
                  <Select
                    label="الدقيقة"
                    value={endMinute}
                    onChange={(e) => setEndMinute(e.target.value)}
                    options={MINUTE_OPTIONS}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    الفترة
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setEndPeriod('صباحاً')}
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        border: endPeriod === 'صباحاً' ? '1.5px solid #2563eb' : '1px solid var(--color-border)',
                        backgroundColor: endPeriod === 'صباحاً' ? 'rgba(37, 99, 235, 0.12)' : 'var(--color-bg-surface)',
                        color: endPeriod === 'صباحاً' ? '#1d4ed8' : 'var(--color-text-primary)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      صباحاً
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndPeriod('مساءً')}
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        border: endPeriod === 'مساءً' ? '1.5px solid #2563eb' : '1px solid var(--color-border)',
                        backgroundColor: endPeriod === 'مساءً' ? 'rgba(37, 99, 235, 0.12)' : 'var(--color-bg-surface)',
                        color: endPeriod === 'مساءً' ? '#1d4ed8' : 'var(--color-text-primary)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      مساءً
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Presets for Times */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>أوقات شائعة جاهزة:</span>
              {ARABIC_TIME_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => {
                    setStartHour(preset.startHour);
                    setStartMinute(preset.startMinute);
                    setStartPeriod(preset.startPeriod);
                    setEndHour(preset.endHour);
                    setEndMinute(preset.endMinute);
                    setEndPeriod(preset.endPeriod);
                  }}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--color-border)',
                    backgroundColor: 'var(--color-bg-surface-secondary)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Live Preview Banner */}
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-primary)',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Clock size={16} color="var(--color-primary)" />
              <span>
                التوقيت المعتمد للحصة: <strong>من الساعة {startHour}:{startMinute} {startPeriod} إلى الساعة {endHour}:{endMinute} {endPeriod}</strong>
              </span>
            </div>
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
                {activeCourse.enrolledList.map((std) => {
                  const hasUnpaidDebt = (std.totalDebt || 0) > 0;
                  return (
                    <div
                      key={std.id}
                      style={{
                        padding: 'var(--space-3)',
                        backgroundColor: hasUnpaidDebt ? 'rgba(239, 68, 68, 0.06)' : 'var(--color-bg-surface)',
                        border: hasUnpaidDebt ? '1.5px solid #ef4444' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {hasUnpaidDebt && <AlertTriangle size={15} color="#ef4444" />}
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: hasUnpaidDebt ? '#b91c1c' : 'var(--color-text-primary)',
                            }}
                          >
                            {std.fullName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            هاتف: {std.phone} {std.parentPhone ? `• ولي الأمر: ${std.parentPhone}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {std.attendedSessions || 0} / {std.totalSessions || 5} حصص
                          </div>
                          <div
                            style={{
                              fontSize: '0.6875rem',
                              color: hasUnpaidDebt ? 'var(--color-danger)' : 'var(--color-success)',
                              fontWeight: 700,
                            }}
                          >
                            {hasUnpaidDebt ? `غير مسدد (دين: ${formatDZD(std.totalDebt)})` : 'خالص'}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من رغبتك في حذف التلميذ "${std.fullName}" من هذا الفوج واستبعاده من أتعاب ومستحقات الأستاذ؟`)) {
                              removeStudentFromCourse(activeCourse.id, std.id);
                              success(`تم حذف التلميذ "${std.fullName}" من الفوج واستبعاده من أتعاب الأستاذ بنجاح.`);
                            }
                          }}
                          style={{ color: 'var(--color-danger)', padding: '6px' }}
                          title="حذف التلميذ واستبعاده من الفوج ومستحقات الأستاذ"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
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
              label="هاتف ولي الأمر (إجباري)"
              placeholder="0661 98 76 54"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              required
            />
          </div>

          {/* Annual Registration Fee Alert & Status */}
          {annualFeePayment ? (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid #86efac',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.85rem',
                color: '#15803d',
              }}
            >
              <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div>
                <strong>مسجل في الاشتراك السنوي للمدرسة</strong>
                <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '2px' }}>
                  مسدد بمبلغ {formatDZD(annualFeePayment.amount)} بتاريخ {annualFeePayment.date} (سند رقم: {annualFeePayment.receiptNumber})
                </div>
              </div>
            </div>
          ) : (stdName.trim().length >= 3 || stdPhone.trim().length >= 8 || parentPhone.trim().length >= 8) ? (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '0.8125rem',
                color: '#b45309',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                <div>
                  <strong>تنبيه: التلميذ غير مسجل في الاشتراك السنوي بعد!</strong>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '2px' }}>
                    لم يتم العثور على وصل دفع حقوق المدرسة لهذا التلميذ.
                  </div>
                </div>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEnrollModalOpen(false);
                    onNavigate('payments');
                  }}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #f59e0b',
                    color: '#92400e',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  تسجيل الحقوق الآن
                </button>
              )}
            </div>
          ) : null}

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
