import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Users,
  Clock,
  MapPin,
  DollarSign,
  UserPlus,
  Trash2,
  Edit2,
  AlertTriangle,
  Check,
  CheckCircle2,
  Calendar,
  HeartHandshake,
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
import { DuplicateStudentBanner } from '../../components/common/DuplicateStudentBanner';
import { findDuplicateStudents } from '../../utils/studentDuplicates';
import { calculateAutoMissedSessions } from '../../utils/attendanceValidation';

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

export const TIME_SLOT_OPTIONS = [
  '08:00 صباحاً',
  '08:30 صباحاً',
  '09:00 صباحاً',
  '09:30 صباحاً',
  '10:00 صباحاً',
  '10:30 صباحاً',
  '11:00 صباحاً',
  '11:30 صباحاً',
  '12:00 ظهراً',
  '12:30 مساءً',
  '01:00 مساءً',
  '01:30 مساءً',
  '02:00 مساءً',
  '02:30 مساءً',
  '03:00 مساءً',
  '03:30 مساءً',
  '04:00 مساءً',
  '04:30 مساءً',
  '05:00 مساءً',
  '05:30 مساءً',
  '06:00 مساءً',
  '06:30 مساءً',
  '07:00 مساءً',
  '07:30 مساءً',
  '08:00 مساءً',
  '08:30 مساءً',
  '09:00 مساءً',
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
    updateCourse,
    deleteCourse,
    enrollStudentToCourse,
    updateStudent,
    removeStudentFromCourse,
  } = useData();

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [courseForEnroll, setCourseForEnroll] = useState<Course | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(isAddModalOpenInitially);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Edit Course State
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editAcademicLevel, setEditAcademicLevel] = useState(DEFAULT_ACADEMIC_LEVEL);
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editMonthlyPrice, setEditMonthlyPrice] = useState('2000');
  const [editMaxStudents, setEditMaxStudents] = useState('25');
  const [editTotalSessionsDefault, setEditTotalSessionsDefault] = useState('5');
  const [editRoomName, setEditRoomName] = useState('');
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>([]);
  const [editScheduleTime, setEditScheduleTime] = useState('');
  const [editCourseStatus, setEditCourseStatus] = useState<'active' | 'upcoming' | 'completed'>('active');

  const handleOpenEditCourseModal = (course: Course) => {
    setCourseToEdit(course);
    setEditTitle(course.title);
    setEditSubject(course.subject);
    setEditAcademicLevel(course.academicLevel);
    setEditTeacherId(course.teacherId || (teachers[0]?.id || ''));
    setEditMonthlyPrice(String(course.monthlyPrice || 2000));
    setEditMaxStudents(String(course.maxStudents || 25));
    setEditTotalSessionsDefault(String(course.totalSessionsDefault || 5));
    setEditRoomName(course.roomName || (classrooms[0]?.name || ''));
    setEditSelectedDays(course.scheduleDays || []);
    setEditScheduleTime(course.scheduleTime || '');
    setEditCourseStatus(course.status || 'active');
  };

  const handleSaveEditCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseToEdit || !editTitle.trim() || !editSubject.trim()) return;

    const teacherObj = teachers.find((t) => t.id === editTeacherId);
    const updated: Course = {
      ...courseToEdit,
      title: editTitle.trim(),
      subject: editSubject.trim(),
      academicLevel: editAcademicLevel,
      teacherId: editTeacherId,
      teacherName: teacherObj ? teacherObj.fullName : courseToEdit.teacherName,
      monthlyPrice: Number(editMonthlyPrice) || courseToEdit.monthlyPrice,
      maxStudents: Number(editMaxStudents) || courseToEdit.maxStudents,
      totalSessionsDefault: Number(editTotalSessionsDefault) || courseToEdit.totalSessionsDefault,
      roomName: editRoomName,
      scheduleDays: editSelectedDays,
      scheduleTime: editScheduleTime,
      status: editCourseStatus,
    };

    updateCourse(updated);
    setCourseToEdit(null);
    success(`تم تعديل بيانات الفوج "${updated.title}" بنجاح!`, 'تم الحفظ');
  };

  // Edit Student State (for students inside Course drawer)
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [editStdFullName, setEditStdFullName] = useState('');
  const [editStdPhone, setEditStdPhone] = useState('');
  const [editStdParentPhone, setEditStdParentPhone] = useState('');
  const [editStdPrice, setEditStdPrice] = useState('0');
  const [editStdAcademicLevel, setEditStdAcademicLevel] = useState(DEFAULT_ACADEMIC_LEVEL);
  const [editStdTotalSessions, setEditStdTotalSessions] = useState('5');
  const [editStdAttendedSessions, setEditStdAttendedSessions] = useState('0');
  const [editStdNotes, setEditStdNotes] = useState('');

  const handleOpenEditStudentModal = (student: Student) => {
    setStudentToEdit(student);
    setEditStdFullName(student.fullName);
    setEditStdPhone(student.phone || '');
    setEditStdParentPhone(student.parentPhone || '');
    const initialPrice = student.coursePrice !== undefined
      ? student.coursePrice
      : ((student.totalPaid || 0) + (student.totalDebt || 0)) || activeCourse?.monthlyPrice || 0;
    setEditStdPrice(String(initialPrice));
    setEditStdAcademicLevel(student.academicLevel || DEFAULT_ACADEMIC_LEVEL);
    setEditStdTotalSessions(String(student.totalSessions || 5));
    setEditStdAttendedSessions(String(student.attendedSessions || 0));
    setEditStdNotes(student.notes || '');
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit || !activeCourse || !editStdFullName.trim()) return;

    const newPrice = Number(editStdPrice) || 0;
    const currentPaid = studentToEdit.totalPaid || 0;
    const newDebt = studentToEdit.isExempt ? 0 : Math.max(0, newPrice - currentPaid);

    const updated: Student = {
      ...studentToEdit,
      fullName: editStdFullName.trim(),
      phone: editStdPhone.trim(),
      parentPhone: editStdParentPhone.trim(),
      gender: studentToEdit.gender || 'ذكر',
      academicLevel: editStdAcademicLevel,
      coursePrice: newPrice,
      totalDebt: newDebt,
      totalSessions: Number(editStdTotalSessions) || studentToEdit.totalSessions || 5,
      attendedSessions: Number(editStdAttendedSessions) || studentToEdit.attendedSessions || 0,
      notes: editStdNotes,
    };

    updateStudent(activeCourse.id, updated);
    setStudentToEdit(null);
    success(`تم تعديل بيانات التلميذ "${updated.fullName}" بنجاح!`, 'تم الحفظ');
  };

  // Add Course Form State
  const [title, setTitle] = useState('');
  const initialTeacher = teachers[0] || null;
  const [teacherId, setTeacherId] = useState(initialTeacher?.id || '');
  const [subject, setSubject] = useState(initialTeacher?.subject || '');
  const [academicLevel, setAcademicLevel] = useState(DEFAULT_ACADEMIC_LEVEL);
  const [monthlyPrice, setMonthlyPrice] = useState('2000');
  const [maxStudents, setMaxStudents] = useState('25');
  const [totalSessionsDefault, setTotalSessionsDefault] = useState('5');
  const [roomName, setRoomName] = useState(classrooms[0]?.name || '');
  const [selectedDays, setSelectedDays] = useState<string[]>(['السبت', 'الثلاثاء']);
  const [dayTimeSlots, setDayTimeSlots] = useState<Record<string, { start: string; end: string }>>({
    'السبت': { start: '08:00 صباحاً', end: '10:00 صباحاً' },
    'الثلاثاء': { start: '05:00 مساءً', end: '07:00 مساءً' },
  });

  const getFormattedScheduleTime = () => {
    if (selectedDays.length === 0) return '';
    const firstSlot = dayTimeSlots[selectedDays[0]] || { start: '05:00 مساءً', end: '07:00 مساءً' };
    const allSame = selectedDays.every((d) => {
      const slot = dayTimeSlots[d] || { start: '05:00 مساءً', end: '07:00 مساءً' };
      return slot.start === firstSlot.start && slot.end === firstSlot.end;
    });

    if (allSame) {
      return `${firstSlot.start} - ${firstSlot.end}`;
    }

    return selectedDays
      .map((d) => {
        const slot = dayTimeSlots[d] || { start: '05:00 مساءً', end: '07:00 مساءً' };
        return `${d} (${slot.start} - ${slot.end})`;
      })
      .join(' • ');
  };

  const toggleDay = (dayId: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayId)) {
        return prev.filter((d) => d !== dayId);
      } else {
        setDayTimeSlots((prevSlots) => {
          if (!prevSlots[dayId]) {
            return {
              ...prevSlots,
              [dayId]: { start: '05:00 مساءً', end: '07:00 مساءً' },
            };
          }
          return prevSlots;
        });
        return [...prev, dayId];
      }
    });
  };

  const applyTimeToAllDays = (sourceDay: string) => {
    const sourceSlot = dayTimeSlots[sourceDay];
    if (!sourceSlot) return;
    setDayTimeSlots((prev) => {
      const next = { ...prev };
      selectedDays.forEach((d) => {
        next[d] = { ...sourceSlot };
      });
      return next;
    });
    success(`تم تطبيق توقيت يوم ${sourceDay} على جميع الأيام المختارة بنجاح!`, 'تم تعميم التوقيت');
  };

  // Enroll Student Form State
  const [stdName, setStdName] = useState('');
  const [stdPhone, setStdPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [studentTotalSessions, setStudentTotalSessions] = useState('5');
  const [stdIsExempt, setStdIsExempt] = useState(false);

  // Single session state in enroll modal
  const [enrollIsSingleSession, setEnrollIsSingleSession] = useState(false);
  const [enrollSingleSessionPrice, setEnrollSingleSessionPrice] = useState('1000');
  const [enrollSingleSessionTeacherAmount, setEnrollSingleSessionTeacherAmount] = useState('600');
  const [enrollSingleSessionDate, setEnrollSingleSessionDate] = useState('');
  const [enrollSingleSessionJustification, setEnrollSingleSessionJustification] = useState('');

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

  // Real-time Duplicate Student Detection
  const duplicateMatches = useMemo(() => {
    const currentCourse = courseForEnroll || courses.find((c) => c.id === activeCourseId);
    return findDuplicateStudents(courses, currentCourse?.id, stdName, stdPhone, parentPhone);
  }, [courses, courseForEnroll, activeCourseId, stdName, stdPhone, parentPhone]);

  const handleAutoFillDuplicate = (matchedStd: Student) => {
    if (matchedStd.fullName && (!stdName.trim() || stdName.trim().length < 3)) {
      setStdName(matchedStd.fullName);
    }
    if (matchedStd.phone && matchedStd.phone !== '0550 00 00 00') {
      setStdPhone(matchedStd.phone);
    }
    if (matchedStd.parentPhone && matchedStd.parentPhone !== '0660 00 00 00') {
      setParentPhone(matchedStd.parentPhone);
    }
  };

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

    const calculatedScheduleTime = getFormattedScheduleTime();

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim(),
      academicLevel,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      monthlyPrice: Number(monthlyPrice) || 2000,
      maxStudents: Number(maxStudents) || 25,
      totalSessionsDefault: Number(totalSessionsDefault) || 5,
      enrolledStudents: 0,
      roomName: roomName || (classrooms[0]?.name || 'قاعة تدريس'),
      scheduleDays: selectedDays,
      scheduleTime: calculatedScheduleTime,
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
    setPaidAmount('0');
    setStudentTotalSessions(String(course.totalSessionsDefault || 5));
    setStdIsExempt(false);

    // Calculate single session rates for this course
    const defaultTotal = course.totalSessionsDefault || 5;
    const coursePrice = course.monthlyPrice || 1500;
    const defSessionPrice = Math.round(coursePrice / (defaultTotal > 0 ? defaultTotal : 5));

    const teacher = teachers.find((t) => t.id === course.teacherId);
    let defTeacherAmt = 0;
    if (teacher) {
      if (teacher.compensationType === 'fixed_per_student' || (teacher.compensationType as string) === 'fixed_per_course') {
        const fixedRate = teacher.fixedRatePerStudent !== undefined ? teacher.fixedRatePerStudent : (teacher.fixedCourseRate || 1000);
        defTeacherAmt = Math.round(fixedRate / (defaultTotal > 0 ? defaultTotal : 5));
      } else {
        const comm = teacher.commissionPercentage !== undefined ? teacher.commissionPercentage : 60;
        defTeacherAmt = Math.round(defSessionPrice * (comm / 100));
      }
    } else {
      defTeacherAmt = Math.round(defSessionPrice * 0.6);
    }

    setEnrollIsSingleSession(false);
    setEnrollSingleSessionPrice(String(defSessionPrice || 1000));
    setEnrollSingleSessionTeacherAmount(String(defTeacherAmt || 600));
    setEnrollSingleSessionDate(new Date().toISOString().split('T')[0]);
    setEnrollSingleSessionJustification('');

    setIsEnrollModalOpen(true);
  };

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCourse = courseForEnroll || activeCourse;
    if (!targetCourse || !stdName.trim() || !parentPhone.trim()) return;

    if (enrollIsSingleSession) {
      const price = Number(enrollSingleSessionPrice) || 0;
      const teacherAmt = Number(enrollSingleSessionTeacherAmount) || 0;
      const justification = enrollSingleSessionJustification.trim() || 'حصة واحدة فقط';

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
        totalPaid: price,
        totalDebt: 0,
        totalSessions: 1,
        attendedSessions: 1,
        isExempt: false,
        attendanceLogs: [],
        status: 'active',
        registrationDate: enrollSingleSessionDate || new Date().toISOString().split('T')[0],
        notes: `حصة واحدة: ${justification}`,
      };

      enrollStudentToCourse(targetCourse.id, newStudent, {
        isSingleSession: true,
        sessionPrice: price,
        teacherAmount: teacherAmt,
        justification,
        date: enrollSingleSessionDate,
      });

      setIsEnrollModalOpen(false);
      setCourseForEnroll(null);
      success(
        `تم تسجيل التلميذ "${stdName}" كحصة واحدة فقط في فوج "${targetCourse.title}" بنجاح! تم استلام ${formatDZD(price)} واحتساب ${formatDZD(teacherAmt)} للأستاذ.`,
        'تسجيل حصة واحدة'
      );

      setStdName('');
      setStdPhone('');
      setParentPhone('');
      setStdIsExempt(false);
      return;
    }

    const isExempt = stdIsExempt;
    const paidVal = isExempt ? 0 : (Number(paidAmount) || 0);
    const maxCoursePrice = targetCourse.monthlyPrice || 0;

    if (!isExempt && maxCoursePrice > 0 && paidVal > maxCoursePrice) {
      warning(
        `المبلغ المسدد (${formatDZD(paidVal)}) لا يمكن أن يتجاوز مبلغ الدورة (${formatDZD(maxCoursePrice)}) كحد أقصى لتجنب الأخطاء.`,
        'تجاوز مبلغ الدورة'
      );
      return;
    }

    const remainingVal = isExempt ? 0 : Math.max(0, targetCourse.monthlyPrice - paidVal);
    const sessionsTotal = Number(studentTotalSessions) || 5;
    const autoMissedSessions = calculateAutoMissedSessions(targetCourse);

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
      isExempt: isExempt,
      exemptionReason: isExempt ? 'معفى من تسديد مبلغ الدورة' : undefined,
      missedGroupSessions: autoMissedSessions,
      attendanceLogs: [],
      status: 'active',
      registrationDate: new Date().toISOString().split('T')[0],
      notes: isExempt ? 'معفى من تسديد الدورة' : undefined,
    };

    enrollStudentToCourse(targetCourse.id, newStudent);
    setIsEnrollModalOpen(false);
    setCourseForEnroll(null);
    success(
      isExempt
        ? `تم تسجيل التلميذ ${stdName} كمعفى في فوج "${targetCourse.title}" بنجاح!`
        : `تم تسجيل التلميذ ${stdName} في فوج "${targetCourse.title}" بنجاح!`,
      'تم التسجيل'
    );

    setStdName('');
    setStdPhone('');
    setParentPhone('');
    setStdIsExempt(false);
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
            title="تعديل بيانات الفوج"
            onClick={() => handleOpenEditCourseModal(c)}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Edit2 size={16} />
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
            <Select
              label="الأستاذ المؤطر"
              value={teacherId}
              onChange={(e) => {
                const newTId = e.target.value;
                setTeacherId(newTId);
                const found = teachers.find((t) => t.id === newTId);
                if (found) {
                  setSubject(found.subject);
                }
              }}
              options={teachers.map((t) => ({ value: t.id, label: `${t.fullName} (${t.subject})` }))}
              required
            />
            <Input
              label="المادة المدرّسة (تلقائياً حسب الأستاذ)"
              value={subject}
              readOnly
              style={{ backgroundColor: 'var(--color-bg-surface-secondary)', cursor: 'not-allowed' }}
              required
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Select
              label="الطور / المستوى الدراسي"
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              options={ACADEMIC_LEVEL_OPTIONS}
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

          {/* Time Selector for Each Selected Day */}
          {selectedDays.length > 0 && (
            <div
              style={{
                marginTop: '4px',
                padding: '12px',
                backgroundColor: 'var(--color-bg-app, #f8fafc)',
                border: '1px solid var(--color-border, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} color="var(--color-primary)" />
                  <span>تحديد توقيت كل يوم على حدة:</span>
                </div>
                {selectedDays.length > 1 && (
                  <button
                    type="button"
                    onClick={() => applyTimeToAllDays(selectedDays[0])}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                    title="تطبيق توقيت اليوم الأول على باقي الأيام"
                  >
                    تطبيق توقيت ({selectedDays[0]}) على باقي الأيام
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedDays.map((day) => {
                  const slot = dayTimeSlots[day] || { start: '05:00 مساءً', end: '07:00 مساءً' };
                  return (
                    <div
                      key={day}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-bg-surface, #ffffff)',
                        border: '1px solid var(--color-border, #cbd5e1)',
                        borderRadius: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '75px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-primary)' }}>
                          يوم {day}:
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '240px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>من:</span>
                        <select
                          value={slot.start}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            setDayTimeSlots((prev) => ({
                              ...prev,
                              [day]: { ...slot, start: newStart },
                            }));
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.8125rem',
                            borderRadius: '5px',
                            border: '1px solid var(--color-border, #cbd5e1)',
                            backgroundColor: 'var(--color-bg-surface, #fff)',
                            color: 'var(--color-text-primary)',
                            flex: 1,
                            cursor: 'pointer',
                          }}
                        >
                          {TIME_SLOT_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>

                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>إلى:</span>
                        <select
                          value={slot.end}
                          onChange={(e) => {
                            const newEnd = e.target.value;
                            setDayTimeSlots((prev) => ({
                              ...prev,
                              [day]: { ...slot, end: newEnd },
                            }));
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.8125rem',
                            borderRadius: '5px',
                            border: '1px solid var(--color-border, #cbd5e1)',
                            backgroundColor: 'var(--color-bg-surface, #fff)',
                            color: 'var(--color-text-primary)',
                            flex: 1,
                            cursor: 'pointer',
                          }}
                        >
                          {TIME_SLOT_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary of schedule time */}
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'rgba(37, 99, 235, 0.06)',
                  padding: '6px 10px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>ملخص التوقيت:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{getFormattedScheduleTime()}</strong>
              </div>
            </div>
          )}

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
                          onClick={() => handleOpenEditStudentModal(std)}
                          style={{ color: 'var(--color-text-secondary)', padding: '6px' }}
                          title="تعديل بيانات التلميذ"
                        >
                          <Edit2 size={15} />
                        </Button>

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

          {/* Real-time Duplicate Student Warning Banner */}
          <DuplicateStudentBanner
            matches={duplicateMatches}
            onAutoFill={handleAutoFillDuplicate}
          />

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

          {/* Single Session Only Option (خيار الحصة الواحدة فقط) */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: enrollIsSingleSession ? 'rgba(37, 99, 235, 0.08)' : 'var(--color-bg-app)',
              border: enrollIsSingleSession ? '1.5px solid #2563eb' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              const nextVal = !enrollIsSingleSession;
              setEnrollIsSingleSession(nextVal);
              if (nextVal) setStdIsExempt(false);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="courseEnrollIsSingleSession"
                checked={enrollIsSingleSession}
                onChange={(e) => {
                  setEnrollIsSingleSession(e.target.checked);
                  if (e.target.checked) setStdIsExempt(false);
                }}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
              />
              <div>
                <label
                  htmlFor="courseEnrollIsSingleSession"
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: enrollIsSingleSession ? '#1d4ed8' : 'var(--color-text-primary)',
                    display: 'block',
                  }}
                >
                  تسجيل كـ حصة واحدة فقط (تسديد رسم حضور حصة واحدة)
                </label>
                <div style={{ fontSize: '0.75rem', color: enrollIsSingleSession ? '#2563eb' : 'var(--color-text-muted)', marginTop: '2px' }}>
                  تسديد رسم حصة واحدة فقط دون الالتزام بدفع كامل باقة الفوج، مع تسجيل التبرير في المقبوضات
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: enrollIsSingleSession ? '#2563eb' : 'var(--color-bg-surface-secondary)',
                color: enrollIsSingleSession ? '#ffffff' : 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              حصة واحدة
            </span>
          </div>

          {/* Conditional Display: Single Session Form VS Regular Package Form */}
          {enrollIsSingleSession ? (
            <div
              style={{
                padding: '14px',
                backgroundColor: 'rgba(37, 99, 235, 0.04)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <Input
                  label="سعر الحصة الواحدة (دج DZD)"
                  type="number"
                  value={enrollSingleSessionPrice}
                  onChange={(e) => setEnrollSingleSessionPrice(e.target.value)}
                  placeholder="مثلاً: 1000"
                  required
                  min="0"
                />

                <Input
                  label="مبلغ للأستاذ من الحصة (دج DZD)"
                  type="number"
                  value={enrollSingleSessionTeacherAmount}
                  onChange={(e) => setEnrollSingleSessionTeacherAmount(e.target.value)}
                  placeholder="مثلاً: 600"
                  required
                  min="0"
                />
              </div>

              {(() => {
                const p = Number(enrollSingleSessionPrice) || 0;
                const t = Number(enrollSingleSessionTeacherAmount) || 0;
                const schoolShare = Math.max(0, p - t);
                return (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-bg-app)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-secondary)' }}>نصيب المؤسسة الصافي:</span>
                    <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.9375rem' }}>
                      {formatDZD(schoolShare)}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <Input
                  label="تاريخ الحصة"
                  type="date"
                  value={enrollSingleSessionDate}
                  onChange={(e) => setEnrollSingleSessionDate(e.target.value)}
                  required
                />
                <Input
                  label="تبرير الحصة الواحدة (يظهر في سجل المقبوضات)"
                  value={enrollSingleSessionJustification}
                  onChange={(e) => setEnrollSingleSessionJustification(e.target.value)}
                  placeholder="مثلاً: حصة تجريبية / استدراك / تلميذ زائر..."
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: '#1d4ed8',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0 }} />
                <span>
                  ستُسجل في سجل المدفوعات المقبوضة كـ <strong>حصة واحدة فقط</strong> مع التبرير، وتظهر كدائرة زرقاء برصيد (1/1)، وتُدرج في مستحقات الأستاذ.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                <Button type="submit" variant="primary" style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8' }}>
                  تأكيد تسجيل التلميذ (حصة واحدة)
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
            </div>
          ) : (
            <>
              {/* Social Exemption Option (معفى للفئة الفقيرة) */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: stdIsExempt ? '#fffbeb' : 'var(--color-bg-app)',
                  border: stdIsExempt ? '1.5px solid #f59e0b' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                }}
                onClick={() => setStdIsExempt(!stdIsExempt)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="courseStdIsExempt"
                    checked={stdIsExempt}
                    onChange={(e) => setStdIsExempt(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
                  />
                  <label htmlFor="courseStdIsExempt" style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: stdIsExempt ? '#92400e' : 'var(--color-text-primary)' }}>
                    معفى من تسديد مبلغ الدورة
                  </label>
                </div>
                <HeartHandshake size={20} color={stdIsExempt ? '#d97706' : 'var(--color-text-muted)'} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <Input
                  label="إجمالي عدد الحصص المقررة"
                  type="number"
                  value={studentTotalSessions}
                  onChange={(e) => setStudentTotalSessions(e.target.value)}
                  required
                />
                {stdIsExempt ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                      المبلغ المطلوب دفعه
                    </label>
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: 'var(--radius-md)',
                        color: '#92400e',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                      }}
                    >
                      0 دج (معفى كلياً من دفع الاشتراك)
                    </div>
                  </div>
                ) : (
                  <Input
                    label={`المبلغ المسدد نقداً (من أصل ${formatDZD((courseForEnroll || activeCourse)?.monthlyPrice || 0)})`}
                    type="number"
                    min="0"
                    max={String((courseForEnroll || activeCourse)?.monthlyPrice || '')}
                    value={paidAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      const maxPrice = (courseForEnroll || activeCourse)?.monthlyPrice || 0;
                      if (maxPrice > 0 && Number(val) > maxPrice) {
                        setPaidAmount(String(maxPrice));
                      } else {
                        setPaidAmount(val);
                      }
                    }}
                    required
                  />
                )}
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
            </>
          )}
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal
        isOpen={!!courseToEdit}
        onClose={() => setCourseToEdit(null)}
        title={`تعديل بيانات الفوج: ${courseToEdit?.title || ''}`}
        description="تعديل اسم الفوج، الأستاذ، سعر الاشتراك، المواعيد والقاعة"
        maxWidth="540px"
      >
        <form onSubmit={handleSaveEditCourse} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="اسم الفوج أو الدورة"
            placeholder="مثال: فوج التفوق - الرياضيات 3 ثانوي"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                المادة المدرّسة (تحدد تلقائياً حسب الأستاذ)
              </label>
              <input
                type="text"
                value={editSubject}
                readOnly
                placeholder="تحدد تلقائياً باختيار الأستاذ"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-surface-secondary, #f1f5f9)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  outline: 'none',
                }}
              />
            </div>
            <Select
              label="الطور / المستوى الدراسي"
              value={editAcademicLevel}
              onChange={(e) => setEditAcademicLevel(e.target.value)}
              options={ACADEMIC_LEVEL_OPTIONS}
              required
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Select
              label="الأستاذ المؤطر"
              value={editTeacherId}
              onChange={(e) => {
                const newTId = e.target.value;
                setEditTeacherId(newTId);
                const tObj = teachers.find((t) => t.id === newTId);
                if (tObj?.subject) {
                  setEditSubject(tObj.subject);
                }
              }}
              options={teachers.map((t) => ({ value: t.id, label: `${t.fullName} (${t.subject})` }))}
              required
            />
            <Input
              label="سعر الاشتراك للفوج (دج DZD)"
              type="number"
              value={editMonthlyPrice}
              onChange={(e) => setEditMonthlyPrice(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 md:grid-cols-1 gap-4">
            <Input
              label="المقاعد المتاحة"
              type="number"
              value={editMaxStudents}
              onChange={(e) => setEditMaxStudents(e.target.value)}
              required
            />
            <Input
              label="عدد الحصص المقررة"
              type="number"
              value={editTotalSessionsDefault}
              onChange={(e) => setEditTotalSessionsDefault(e.target.value)}
              required
            />
            <Select
              label="القاعة المخصصة"
              value={editRoomName}
              onChange={(e) => setEditRoomName(e.target.value)}
              options={
                classrooms.length > 0
                  ? classrooms.map((r) => ({
                      value: r.name,
                      label: `${r.name} ${r.roomNumber ? `(${r.roomNumber})` : `(سعة ${r.capacity})`}`,
                    }))
                  : [
                      {
                        value: '',
                        label: 'لا توجد قاعات مسجلة',
                      },
                    ]
              }
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="التوقيت (مثال: 05:00 - 07:00 مساءً)"
              value={editScheduleTime}
              onChange={(e) => setEditScheduleTime(e.target.value)}
              placeholder="05:00 - 07:00 مساءً"
              required
            />
            <Select
              label="حالة الفوج"
              value={editCourseStatus}
              onChange={(e) => setEditCourseStatus(e.target.value as 'active' | 'upcoming' | 'completed')}
              options={[
                { value: 'active', label: 'نشط (مستمر)' },
                { value: 'upcoming', label: 'قادم (قيد التسجيل)' },
                { value: 'completed', label: 'مكتمل' },
              ]}
            />
          </div>

          {/* Days selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              أيام الدراسة الأسبوعية
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {ALL_WEEK_DAYS.map((day) => {
                const isSelected = editSelectedDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setEditSelectedDays(editSelectedDays.filter((d) => d !== day.id));
                      } else {
                        setEditSelectedDays([...editSelectedDays, day.id]);
                      }
                    }}
                    style={{
                      padding: '8px 2px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-bg-surface)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: 'var(--space-2)' }}>
            <Button type="submit" variant="primary">
              حفظ التعديلات
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCourseToEdit(null)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student in Course Modal */}
      <Modal
        isOpen={!!studentToEdit}
        onClose={() => setStudentToEdit(null)}
        title={`تعديل بيانات التلميذ: ${studentToEdit?.fullName || ''}`}
        description={`تحديث بيانات التلميذ المسجل في فوج: ${activeCourse?.title || ''}`}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveEditStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="اسم التلميذ الكامل"
            value={editStdFullName}
            onChange={(e) => setEditStdFullName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="هاتف التلميذ"
              value={editStdPhone}
              onChange={(e) => setEditStdPhone(e.target.value)}
              required
            />
            <Input
              label="هاتف ولي الأمر"
              value={editStdParentPhone}
              onChange={(e) => setEditStdParentPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="سعر الاشتراك / الدورة (دج)"
              type="number"
              value={editStdPrice}
              onChange={(e) => setEditStdPrice(e.target.value)}
              placeholder="مثال: 2500"
              min="0"
              required
              hint={
                studentToEdit && !studentToEdit.isExempt
                  ? `المسدد حالياً: ${formatDZD(studentToEdit.totalPaid || 0)} • الدين الناتج: ${formatDZD(Math.max(0, (Number(editStdPrice) || 0) - (studentToEdit.totalPaid || 0)))}`
                  : undefined
              }
            />
            <Select
              label="المستوى الدراسي"
              value={editStdAcademicLevel}
              onChange={(e) => setEditStdAcademicLevel(e.target.value)}
              options={ACADEMIC_LEVEL_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="إجمالي الحصص المقررة"
              type="number"
              value={editStdTotalSessions}
              onChange={(e) => setEditStdTotalSessions(e.target.value)}
              required
            />
            <Input
              label="الحصص المستهلكة (الحضور)"
              type="number"
              value={editStdAttendedSessions}
              onChange={(e) => setEditStdAttendedSessions(e.target.value)}
              required
            />
          </div>

          <Input
            label="ملاحظات إضافية (اختياري)"
            value={editStdNotes}
            onChange={(e) => setEditStdNotes(e.target.value)}
            placeholder="ملاحظات خاصة بالتلميذ..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: 'var(--space-2)' }}>
            <Button type="submit" variant="primary">
              حفظ التعديلات
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStudentToEdit(null)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
