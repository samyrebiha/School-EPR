import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CreditCard,
  Users,
  Search,
  BookOpen,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  RefreshCw,
  Phone,
  User,
  GraduationCap,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Course, Student, Teacher, SchoolTenant } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatDZD } from '../../utils/formatters';
import { playScanSuccessSound } from '../../utils/audioAlerts';
import { calculateAutoMissedSessions } from '../../utils/attendanceValidation';

export interface AggregatedStudentCardRecord {
  keyId: string;
  fullName: string;
  phone: string;
  parentPhone: string;
  academicLevel: string;
  cardId?: string;
  enrolledCourses: Array<{
    courseId: string;
    courseTitle: string;
    teacherName: string;
    subject: string;
    attendedSessions: number;
    totalSessions: number;
    totalDebt: number;
    studentInstance: Student;
  }>;
  totalDebt: number;
  totalCourses: number;
}

interface StudentCardsDirectoryTabProps {
  courses: Course[];
  teachers: Teacher[];
  currentSchool: SchoolTenant | null;
  updateStudent: (courseId: string, student: Student) => void;
  enrollStudentToCourse: (
    courseId: string,
    student: Student
  ) => { receiptNumber: string; studentName: string };
  onSelectCourse: (courseId: string) => void;
  onSwitchToScanner: () => void;
  onSwitchToRoster: () => void;
}

export const StudentCardsDirectoryTab: React.FC<StudentCardsDirectoryTabProps> = ({
  courses,
  teachers,
  currentSchool,
  updateStudent,
  enrollStudentToCourse,
  onSelectCourse,
  onSwitchToScanner,
  onSwitchToRoster,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'has_card' | 'no_card' | 'multi_courses'>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all');

  // Modals state
  const [assignCardStudent, setAssignCardStudent] = useState<AggregatedStudentCardRecord | null>(null);
  const [cardInputVal, setCardInputVal] = useState('');

  // Enroll existing student in another course modal
  const [enrollExtraModalStudent, setEnrollExtraModalStudent] = useState<AggregatedStudentCardRecord | null>(null);
  const [selectedTargetCourseId, setSelectedTargetCourseId] = useState('');

  // Add entirely new global student modal
  const [isAddNewStudentModalOpen, setIsAddNewStudentModalOpen] = useState(false);
  const [newStdName, setNewStdName] = useState('');
  const [newStdPhone, setNewStdPhone] = useState('');
  const [newStdParentPhone, setNewStdParentPhone] = useState('');
  const [newStdCardId, setNewStdCardId] = useState('');
  const [newStdLevel, setNewStdLevel] = useState('');
  const [newStdInitialCourseId, setNewStdInitialCourseId] = useState('');

  const cardInputRef = useRef<HTMLInputElement>(null);

  // Auto focus card input when assign modal opens
  useEffect(() => {
    if (assignCardStudent) {
      setTimeout(() => {
        cardInputRef.current?.focus();
      }, 100);
    }
  }, [assignCardStudent]);

  // Aggregate students uniquely by phone or name across all school courses
  const aggregatedStudents = useMemo<AggregatedStudentCardRecord[]>(() => {
    const map = new Map<string, AggregatedStudentCardRecord>();

    courses.forEach((course) => {
      (course.enrolledList || []).forEach((std) => {
        // Unify student key primarily by phone without spaces, or clean name
        const cleanPhone = (std.phone || '').replace(/\s+/g, '');
        const cleanName = std.fullName.trim().toLowerCase();
        const studentKey = cleanPhone ? `phone_${cleanPhone}` : `name_${cleanName}`;

        const existing = map.get(studentKey);
        const courseInfo = {
          courseId: course.id,
          courseTitle: course.title,
          teacherName: course.teacherName,
          subject: course.subject || 'مادة عامة',
          attendedSessions: std.attendedSessions || 0,
          totalSessions: std.totalSessions || 4,
          totalDebt: std.totalDebt || 0,
          studentInstance: std,
        };

        if (existing) {
          // If this instance has cardId and existing didn't, adopt it
          if (!existing.cardId && std.cardId) {
            existing.cardId = std.cardId;
          }
          if (!existing.academicLevel && (std.academicLevel || course.academicLevel)) {
            existing.academicLevel = std.academicLevel || course.academicLevel || '';
          }
          if (!existing.phone && std.phone) existing.phone = std.phone;
          if (!existing.parentPhone && std.parentPhone) existing.parentPhone = std.parentPhone;

          // Add course if not already recorded
          if (!existing.enrolledCourses.some((c) => c.courseId === course.id)) {
            existing.enrolledCourses.push(courseInfo);
            existing.totalCourses += 1;
            existing.totalDebt += std.totalDebt || 0;
          }
        } else {
          map.set(studentKey, {
            keyId: studentKey,
            fullName: std.fullName.trim(),
            phone: std.phone || '',
            parentPhone: std.parentPhone || '',
            academicLevel: std.academicLevel || course.academicLevel || '',
            cardId: std.cardId || undefined,
            enrolledCourses: [courseInfo],
            totalDebt: std.totalDebt || 0,
            totalCourses: 1,
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
  }, [courses]);

  // Academic levels available
  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    aggregatedStudents.forEach((s) => {
      if (s.academicLevel) set.add(s.academicLevel);
    });
    return Array.from(set);
  }, [aggregatedStudents]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return aggregatedStudents.filter((student) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = student.fullName.toLowerCase().includes(q);
        const matchPhone = student.phone.includes(q) || student.parentPhone.includes(q);
        const matchCard = student.cardId && student.cardId.toLowerCase().includes(q);
        const matchCourse = student.enrolledCourses.some((c) => c.courseTitle.toLowerCase().includes(q));
        if (!matchName && !matchPhone && !matchCard && !matchCourse) return false;
      }

      // Mode filter
      if (filterMode === 'has_card' && !student.cardId) return false;
      if (filterMode === 'no_card' && !!student.cardId) return false;
      if (filterMode === 'multi_courses' && student.totalCourses < 2) return false;

      // Level filter
      if (selectedLevelFilter !== 'all' && student.academicLevel !== selectedLevelFilter) return false;

      return true;
    });
  }, [aggregatedStudents, searchQuery, filterMode, selectedLevelFilter]);

  // Statistics KPIs
  const totalStudentsCount = aggregatedStudents.length;
  const withCardCount = aggregatedStudents.filter((s) => !!s.cardId).length;
  const withoutCardCount = totalStudentsCount - withCardCount;
  const multiCourseCount = aggregatedStudents.filter((s) => s.totalCourses >= 2).length;
  const cardCoveragePercent = totalStudentsCount > 0 ? Math.round((withCardCount / totalStudentsCount) * 100) : 0;

  // Handle assigning / updating card across all student's enrolled courses
  const handleSaveCardAssignment = () => {
    if (!assignCardStudent) return;
    const cleanCard = cardInputVal.trim();

    // Check if another student already holds this card
    if (cleanCard) {
      const conflict = aggregatedStudents.find(
        (s) => s.keyId !== assignCardStudent.keyId && s.cardId && s.cardId.toLowerCase() === cleanCard.toLowerCase()
      );
      if (conflict) {
        alert(`تنبيه أمان: هذه البطاقة (${cleanCard}) مرتبطة بالفعل بالتلميذ "${conflict.fullName}". لا يمكن تعيين نفس البطاقة لتلميذين مختلفين.`);
        return;
      }
    }

    // Apply update across all courses where this student is enrolled
    courses.forEach((c) => {
      const studentInstances = (c.enrolledList || []).filter((s) => {
        const p1 = (s.phone || '').replace(/\s+/g, '');
        const p2 = assignCardStudent.phone.replace(/\s+/g, '');
        if (p1 && p2 && p1 === p2) return true;
        return s.fullName.trim().toLowerCase() === assignCardStudent.fullName.trim().toLowerCase();
      });

      studentInstances.forEach((std) => {
        updateStudent(c.id, {
          ...std,
          cardId: cleanCard || undefined,
        });
      });
    });

    if (cleanCard) playScanSuccessSound();
    setAssignCardStudent(null);
    setCardInputVal('');
  };

  // Handle enrolling student in an extra course
  const handleEnrollInExtraCourse = () => {
    if (!enrollExtraModalStudent || !selectedTargetCourseId) return;

    const targetCourse = courses.find((c) => c.id === selectedTargetCourseId);
    if (!targetCourse) return;

    // Check if already in this course
    const alreadyEnrolled = (targetCourse.enrolledList || []).some((s) => {
      const p1 = (s.phone || '').replace(/\s+/g, '');
      const p2 = enrollExtraModalStudent.phone.replace(/\s+/g, '');
      if (p1 && p2 && p1 === p2) return true;
      return s.fullName.trim().toLowerCase() === enrollExtraModalStudent.fullName.trim().toLowerCase();
    });

    if (alreadyEnrolled) {
      alert(`التلميذ مسجل بالفعل في فوج "${targetCourse.title}".`);
      return;
    }

    // Pick first instance as base template
    const baseInstance = enrollExtraModalStudent.enrolledCourses[0]?.studentInstance;

    const newStudentObj: Student = {
      id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: enrollExtraModalStudent.fullName,
      phone: enrollExtraModalStudent.phone,
      parentPhone: enrollExtraModalStudent.parentPhone,
      parentName: baseInstance?.parentName || 'ولي الأمر',
      parentRelation: baseInstance?.parentRelation || 'أب',
      academicLevel: enrollExtraModalStudent.academicLevel || targetCourse.academicLevel || '',
      gender: baseInstance?.gender || 'ذكر',
      cardId: enrollExtraModalStudent.cardId || undefined,
      coursePrice: targetCourse.monthlyPrice || 5000,
      totalSessions: targetCourse.totalSessionsDefault || 5,
      attendedSessions: 0,
      totalPaid: 0,
      totalDebt: targetCourse.monthlyPrice || 5000,
      isExempt: false,
      missedGroupSessions: calculateAutoMissedSessions(targetCourse),
      status: 'active',
      registrationDate: new Date().toISOString().split('T')[0],
      attendanceLogs: [],
    };

    enrollStudentToCourse(targetCourse.id, newStudentObj);
    playScanSuccessSound();
    setEnrollExtraModalStudent(null);
    setSelectedTargetCourseId('');
  };

  // Handle adding completely new student
  const handleAddNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStdName.trim() || !newStdInitialCourseId) {
      alert('يرجى كتابة اسم التلميذ وتحديد الفوج الأولي.');
      return;
    }

    const targetCourse = courses.find((c) => c.id === newStdInitialCourseId);
    if (!targetCourse) return;

    const cleanCard = newStdCardId.trim();
    if (cleanCard) {
      const conflict = aggregatedStudents.find(
        (s) => s.cardId && s.cardId.toLowerCase() === cleanCard.toLowerCase()
      );
      if (conflict) {
        alert(`تنبيه: هذه البطاقة (${cleanCard}) مرتبطة بالفعل بالتلميذ "${conflict.fullName}".`);
        return;
      }
    }

    const newStudentObj: Student = {
      id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: newStdName.trim(),
      phone: newStdPhone.trim(),
      parentPhone: newStdParentPhone.trim(),
      parentName: 'ولي الأمر',
      parentRelation: 'أب',
      academicLevel: newStdLevel.trim() || targetCourse.academicLevel || '',
      gender: 'ذكر',
      cardId: cleanCard || undefined,
      coursePrice: targetCourse.monthlyPrice || 5000,
      totalSessions: targetCourse.totalSessionsDefault || 5,
      attendedSessions: 0,
      totalPaid: 0,
      totalDebt: targetCourse.monthlyPrice || 5000,
      isExempt: false,
      missedGroupSessions: calculateAutoMissedSessions(targetCourse),
      status: 'active',
      registrationDate: new Date().toISOString().split('T')[0],
      attendanceLogs: [],
    };

    enrollStudentToCourse(targetCourse.id, newStudentObj);
    playScanSuccessSound();
    setIsAddNewStudentModalOpen(false);
    setNewStdName('');
    setNewStdPhone('');
    setNewStdParentPhone('');
    setNewStdCardId('');
    setNewStdLevel('');
    setNewStdInitialCourseId('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: 'rtl', textAlign: 'right' }}>
      {/* Top Banner & Title */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={20} color="#38bdf8" />
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 900, margin: 0, color: '#ffffff' }}>
              الدليل المركزي لبطاقات التلاميذ والمواد
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                color: '#86efac',
                border: '1px solid rgba(34, 197, 94, 0.4)',
              }}
            >
              بطاقة واحدة • مواد متعددة
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8', maxWidth: '640px' }}>
            كل تلميذ يملك بطاقة إلكترونية واحدة تمكنه من تسجيل الحضور في جميع أفواجه ومواده المدرسية بلمسة واحدة.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsAddNewStudentModalOpen(true)}
            style={{
              backgroundColor: '#0284c7',
              borderColor: '#0284c7',
              fontWeight: 800,
            }}
          >
            + إضافة تلميذ وبطاقة جديدة
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards Row */}
      <div className="grid grid-cols-4 md:grid-cols-2 sm:grid-cols-1 gap-4">
        <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>إجمالي التلاميذ المسجلين</span>
            <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#0f172a' }}>{totalStudentsCount} تلميذ</div>
          </div>
        </Card>

        <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>لديهم بطاقة إلكترونية</span>
            <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#16a34a' }}>
              {withCardCount}{' '}
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>({cardCoveragePercent}%)</span>
            </div>
          </div>
        </Card>

        <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: withoutCardCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: withoutCardCount > 0 ? '#dc2626' : '#64748b',
            }}
          >
            <AlertCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>بدون بطاقة حتى الآن</span>
            <div style={{ fontSize: '1.375rem', fontWeight: 900, color: withoutCardCount > 0 ? '#dc2626' : '#0f172a' }}>
              {withoutCardCount} تلميذ
            </div>
          </div>
        </Card>

        <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(147, 51, 234, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9333ea',
            }}
          >
            <Layers size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>يدرسون مواد متعددة</span>
            <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#9333ea' }}>{multiCourseCount} تلميذ</div>
          </div>
        </Card>
      </div>

      {/* Search, Filter Pills & Quick Controls */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
            <Input
              placeholder="ابحث بالاسم، كود البطاقة، رقم الهاتف، أو اسم المادة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefixIcon={<Search size={18} color="#64748b" />}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              size="sm"
              variant={filterMode === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilterMode('all')}
            >
              الكل ({totalStudentsCount})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'has_card' ? 'primary' : 'outline'}
              onClick={() => setFilterMode('has_card')}
            >
              💳 لديهم بطاقة ({withCardCount})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'no_card' ? 'primary' : 'outline'}
              onClick={() => setFilterMode('no_card')}
            >
              ⚠️ بدون بطاقة ({withoutCardCount})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'multi_courses' ? 'primary' : 'outline'}
              onClick={() => setFilterMode('multi_courses')}
            >
              📚 مواد متعددة ({multiCourseCount})
            </Button>

            {availableLevels.length > 0 && (
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">جميع المستويات الدراسية</option>
                {availableLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Card>

      {/* Main Student Directory List / Cards */}
      {filteredStudents.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
            لا يوجد تلاميذ يطابقون معايير البحث
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            جرّب تغيير كلمات البحث أو الفلاتر بالأعلى، أو اضغط على &quot;إضافة تلميذ وبطاقة جديدة&quot;.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredStudents.map((student) => {
            const hasCard = !!student.cardId;

            return (
              <div
                key={student.keyId}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: `1.5px solid ${hasCard ? '#e2e8f0' : '#fed7aa'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left: Student Identity & Card Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '280px' }}>
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '14px',
                      backgroundColor: hasCard ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                      border: `1.5px solid ${hasCard ? '#86efac' : '#fdba74'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: hasCard ? '#16a34a' : '#ea580c',
                      flexShrink: 0,
                    }}
                  >
                    <User size={26} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a' }}>
                        {student.fullName}
                      </span>
                      {student.academicLevel && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                          }}
                        >
                          {student.academicLevel}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '3px', display: 'flex', gap: '10px' }}>
                      {student.phone && <span>الهاتف: <strong style={{ color: '#0f172a' }}>{student.phone}</strong></span>}
                      {student.parentPhone && <span>• الولي: {student.parentPhone}</span>}
                    </div>

                    {/* Card Pill */}
                    <div style={{ marginTop: '6px' }}>
                      {hasCard ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #86efac',
                            fontSize: '0.75rem',
                            color: '#15803d',
                            fontWeight: 800,
                          }}
                        >
                          <CreditCard size={13} color="#16a34a" />
                          بطاقة ذكية:{' '}
                          <code style={{ fontFamily: 'monospace', fontWeight: 900, color: '#047857' }}>
                            {student.cardId}
                          </code>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#fff7ed',
                            border: '1px solid #fdba74',
                            fontSize: '0.75rem',
                            color: '#c2410c',
                            fontWeight: 700,
                          }}
                        >
                          <AlertCircle size={13} />
                          لم تُربط بطاقة بعد
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Courses & Subjects Enrolled */}
                <div style={{ flex: '1', minWidth: '320px', maxWidth: '580px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                    الأفواج والمواد المسجل فيها ({student.totalCourses}):
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {student.enrolledCourses.map((c) => {
                      const isLast = c.attendedSessions === c.totalSessions && c.totalSessions > 1;
                      const isOver = c.attendedSessions > c.totalSessions;

                      return (
                        <div
                          key={c.courseId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            backgroundColor: isOver ? '#fef2f2' : isLast ? '#fffbeb' : '#f8fafc',
                            border: `1px solid ${isOver ? '#fca5a5' : isLast ? '#fde68a' : '#e2e8f0'}`,
                            fontSize: '0.8125rem',
                          }}
                        >
                          <BookOpen size={14} color="#64748b" />
                          <div>
                            <strong style={{ color: '#0f172a' }}>{c.courseTitle}</strong>
                            <span style={{ margin: '0 4px', color: '#cbd5e1' }}>•</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>أ. {c.teacherName}</span>
                            <span
                              style={{
                                marginRight: '6px',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                color: isOver ? '#dc2626' : isLast ? '#b45309' : '#16a34a',
                              }}
                            >
                              ({c.attendedSessions}/{c.totalSessions})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Actions Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    size="sm"
                    variant={hasCard ? 'outline' : 'primary'}
                    leftIcon={<CreditCard size={14} />}
                    onClick={() => {
                      setAssignCardStudent(student);
                      setCardInputVal(student.cardId || '');
                    }}
                  >
                    {hasCard ? 'تغيير البطاقة' : 'تعيين بطاقة ⚡'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Plus size={14} />}
                    onClick={() => {
                      setEnrollExtraModalStudent(student);
                      setSelectedTargetCourseId('');
                    }}
                    title="تسجيل هذا التلميذ في مادة أو فوج إضافي بنفس البطاقة"
                  >
                    + تسجيل بمادة أخرى
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign / Change RFID Card Modal */}
      <Modal
        isOpen={!!assignCardStudent}
        onClose={() => {
          setAssignCardStudent(null);
          setCardInputVal('');
        }}
        title={`تعيين بطاقة ذكية: ${assignCardStudent?.fullName || ''}`}
        description="مرّر البطاقة على جهاز الـ RFID أو اكتب كود البطاقة وسيتم تعميمه تلقائياً على جميع أفواج التلميذ"
        maxWidth="500px"
      >
        {assignCardStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '10px',
                border: '1px solid #bbf7d0',
                fontSize: '0.875rem',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <ShieldCheck size={24} color="#16a34a" />
              <div>
                <strong>تزامن مركزي موحد:</strong> عند حفظ هذه البطاقة ستعمل فوراً في جميع المواد المسجل بها التلميذ (
                {assignCardStudent.enrolledCourses.map((c) => c.courseTitle).join('، ')}).
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 700 }}>
                رقم البطاقة الذكية (مرّر البطاقة على القارئ):
              </label>
              <Input
                ref={cardInputRef}
                placeholder="امسح البطاقة بالقارئ أو اكتب الكود..."
                value={cardInputVal}
                onChange={(e) => setCardInputVal(e.target.value)}
                prefixIcon={<CreditCard size={18} color="#2563eb" />}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: '6px' }}>
              <Button variant="primary" onClick={handleSaveCardAssignment}>
                حفظ البطاقة وتعميمها
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAssignCardStudent(null);
                  setCardInputVal('');
                }}
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Enroll in Extra Course Modal */}
      <Modal
        isOpen={!!enrollExtraModalStudent}
        onClose={() => {
          setEnrollExtraModalStudent(null);
          setSelectedTargetCourseId('');
        }}
        title={`تسجيل التلميذ في مادة إضافية: ${enrollExtraModalStudent?.fullName || ''}`}
        description="تسجيل التلميذ في فوج آخر مع الحفاظ التلقائي على نفس بطاقته وبياناته"
        maxWidth="500px"
      >
        {enrollExtraModalStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
              <div>التلميذ: <strong>{enrollExtraModalStudent.fullName}</strong></div>
              {enrollExtraModalStudent.cardId && (
                <div style={{ marginTop: '4px', color: '#15803d' }}>
                  البطاقة المربوطة: <code style={{ fontFamily: 'monospace', fontWeight: 800 }}>{enrollExtraModalStudent.cardId}</code>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 700 }}>
                اختر الفوج / المادة الإضافية:
              </label>
              <select
                value={selectedTargetCourseId}
                onChange={(e) => setSelectedTargetCourseId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="">-- اضغط لاختيار الفوج --</option>
                {courses
                  .filter((c) => !enrollExtraModalStudent.enrolledCourses.some((ec) => ec.courseId === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} • {c.subject} (أ. {c.teacherName}) — {formatDZD(c.monthlyPrice)}
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: '6px' }}>
              <Button
                variant="primary"
                disabled={!selectedTargetCourseId}
                onClick={handleEnrollInExtraCourse}
              >
                تأكيد التسجيل في الفوج
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEnrollExtraModalStudent(null);
                  setSelectedTargetCourseId('');
                }}
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Entirely New Student Modal */}
      <Modal
        isOpen={isAddNewStudentModalOpen}
        onClose={() => setIsAddNewStudentModalOpen(false)}
        title="إضافة تلميذ وبطاقة جديدة للنظام"
        description="تسجيل تلميذ جديد وتعيين بطاقته الإلكترونية وفوج البداية"
        maxWidth="540px"
      >
        <form onSubmit={handleAddNewStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="اسم ولقب التلميذ *"
            placeholder="مثال: عبد القادر زروقي"
            value={newStdName}
            onChange={(e) => setNewStdName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            <Input
              label="هاتف التلميذ"
              placeholder="0550 11 22 33"
              value={newStdPhone}
              onChange={(e) => setNewStdPhone(e.target.value)}
            />
            <Input
              label="هاتف ولي الأمر"
              placeholder="0661 44 55 66"
              value={newStdParentPhone}
              onChange={(e) => setNewStdParentPhone(e.target.value)}
            />
          </div>

          <Input
            label="رقم البطاقة الإلكترونية الذكية (RFID / Barcode) — مرّر البطاقة"
            placeholder="مرّر البطاقة على القارئ أو اكتب الكود..."
            value={newStdCardId}
            onChange={(e) => setNewStdCardId(e.target.value)}
            prefixIcon={<CreditCard size={18} color="#2563eb" />}
          />

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 700 }}>
              الفوج الأولي للتسجيل *
            </label>
            <select
              value={newStdInitialCourseId}
              onChange={(e) => setNewStdInitialCourseId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.9375rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="">-- اختر الفوج المسجل به --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} • {c.subject} (أ. {c.teacherName})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: '10px' }}>
            <Button type="submit" variant="primary">
              حفظ وتسجيل التلميذ
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsAddNewStudentModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
