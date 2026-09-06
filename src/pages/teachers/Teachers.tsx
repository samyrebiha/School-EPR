import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Percent,
  Coins,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/data-table/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { Teacher, TeacherCompensationType } from '../../types';
import { formatAlgerianPhone, formatDZD } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ACADEMIC_LEVEL_OPTIONS, DEFAULT_ACADEMIC_LEVEL } from '../../data/academicLevels';

export interface TeachersProps {
  isAddModalOpenInitially?: boolean;
  onCloseAddModalInitially?: () => void;
}

export const Teachers: React.FC<TeachersProps> = ({
  isAddModalOpenInitially = false,
  onCloseAddModalInitially,
}) => {
  const { success } = useToast();
  const { isReceptionMode } = useAuth();
  const { teachers, addTeacher, deleteTeacher } = useData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(isAddModalOpenInitially);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [specialization, setSpecialization] = useState(DEFAULT_ACADEMIC_LEVEL);
  const [compensationType, setCompensationType] = useState<TeacherCompensationType>('percentage_per_student');
  const [commissionPercentage, setCommissionPercentage] = useState('60');
  const [fixedCourseRate, setFixedCourseRate] = useState('25000');

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !subject.trim()) return;

    const newTeacher: Teacher = {
      id: `tch-${Date.now()}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || `${phone.trim()}@school.dz`,
      subject: subject.trim(), // Free text
      specialization: specialization.trim() || DEFAULT_ACADEMIC_LEVEL,
      compensationType,
      commissionPercentage: Number(commissionPercentage) || 60,
      fixedCourseRate: Number(fixedCourseRate) || 25000,
      groupsCount: 0,
      totalEarned: 0,
      totalPaid: 0,
      balanceDue: 0,
      payoutHistory: [],
      status: 'active',
    };

    addTeacher(newTeacher);
    setIsAddModalOpen(false);

    const typeDesc =
      compensationType === 'percentage_per_student'
        ? `بنسبة ${newTeacher.commissionPercentage}% من كل تلميذ`
        : compensationType === 'percentage_per_course'
        ? `بنسبة ${newTeacher.commissionPercentage}% من سعر الدورة مهما كان عدد التلاميذ`
        : `بمبلغ ثابت ${formatDZD(newTeacher.fixedCourseRate || 0)} عن كل دورة`;

    success(`تم تسجيل الأستاذ ${fullName} بنجاح (${typeDesc})!`, 'تمت الإضافة');

    // Reset
    setFullName('');
    setPhone('');
    setEmail('');
    setSubject('');
    setSpecialization(DEFAULT_ACADEMIC_LEVEL);
    setCompensationType('percentage_per_student');
    setCommissionPercentage('60');
    setFixedCourseRate('25000');
  };

  const confirmDeleteTeacher = () => {
    if (!teacherToDelete) return;
    deleteTeacher(teacherToDelete.id);
    success(`تم حذف الأستاذ "${teacherToDelete.fullName}" بنجاح.`);
    setTeacherToDelete(null);
  };

  const allColumns: Column<Teacher>[] = [
    {
      key: 'fullName',
      header: 'اسم الأستاذ',
      sortable: true,
      render: (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            {t.fullName.slice(0, 1)}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {t.fullName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {formatAlgerianPhone(t.phone)} {t.specialization ? `• ${t.specialization}` : ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'المادة المدرسة',
      sortable: true,
      render: (t) => (
        <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.875rem' }}>
          {t.subject}
        </span>
      ),
    },
    {
      key: 'compensationType',
      header: 'طريقة احتساب الأتعاب',
      sortable: true,
      render: (t) => {
        const type = t.compensationType || 'percentage_per_student';

        if (type === 'percentage_per_course') {
          return (
            <div>
              <span
                style={{
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-info-bg)',
                  color: 'var(--color-info)',
                  fontSize: '0.75rem',
                }}
              >
                {t.commissionPercentage || 60}% من سعر الدورة
              </span>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                (مهما كان عدد التلاميذ)
              </div>
            </div>
          );
        }

        if (type === 'fixed_per_course') {
          return (
            <div>
              <span
                style={{
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-warning-bg)',
                  color: 'var(--color-warning)',
                  fontSize: '0.75rem',
                }}
              >
                {formatDZD(t.fixedCourseRate || 25000)} / دورة
              </span>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                (مبلغ ثابت عن الفوج)
              </div>
            </div>
          );
        }

        // Default: per student
        return (
          <div>
            <span
              style={{
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                fontSize: '0.75rem',
              }}
            >
              {t.commissionPercentage || 60}% من كل تلميذ
            </span>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              (حسب الحضور والتسجيل)
            </div>
          </div>
        );
      },
    },
    {
      key: 'groupsCount',
      header: 'الأفواج والدورات',
      sortable: true,
      render: (t) => (
        <Badge variant="neutral">
          {t.groupsCount} أفواج
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (t) => (
        <Badge variant={t.status === 'active' ? 'success' : 'neutral'}>
          {t.status === 'active' ? 'نشط' : 'غير نشط'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      width: '120px',
      render: (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            title="حذف الأستاذ"
            onClick={() => setTeacherToDelete(t)}
            style={{ color: 'var(--color-danger)' }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  const columns = isReceptionMode
    ? allColumns.filter((c) => c.key !== 'compensationType')
    : allColumns;

  return (
    <div>
      <PageHeader
        title="إدارة الأساتذة"
        description="تسجيل الأساتذة المؤطرين، المواد المدرسة، وتحديد خيار احتساب المستحقات (بالتلميذ أو بالدورة)"
        actions={
          <Button
            variant="primary"
            rightIcon={<PlusCircle size={16} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            إضافة أستاذ جديد
          </Button>
        }
      />

      <DataTable
        data={teachers}
        columns={columns}
        keyExtractor={(t) => t.id}
        searchPlaceholder="ابحث باسم الأستاذ أو المادة أو الهاتف..."
        searchFields={['fullName', 'subject', 'phone', 'specialization']}
      />

      {/* Add Teacher Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          if (onCloseAddModalInitially) onCloseAddModalInitially();
        }}
        title="إضافة أستاذ جديد وتحديد طريقة المستحقات"
        description="تسجيل بيانات الأستاذ واختيار طريقة احتساب الأتعاب المناسبة"
        maxWidth="540px"
      >
        <form onSubmit={handleAddTeacher} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="اسم الأستاذ الكامل"
            placeholder="مثال: أ. عبد الرحمان بن ساعد"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="رقم الهاتف (الجزائر)"
              placeholder="0550 11 22 33"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="البريد الإلكتروني (اختياري)"
              placeholder="teacher@school.dz"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="المادة المدرسة (نص حر)"
              placeholder="مثال: الرياضيات، الفلسفة..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <Select
              label="الطور / المستوى الدراسي"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              options={ACADEMIC_LEVEL_OPTIONS}
              required
            />
          </div>

          {/* Compensation Model Box */}
          <div
            style={{
              padding: 'var(--space-3-5)',
              backgroundColor: 'var(--color-bg-surface-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <Select
              label="طريقة احتساب مستحقات وأتعاب الأستاذ"
              value={compensationType}
              onChange={(e) => setCompensationType(e.target.value as TeacherCompensationType)}
              options={[
                { value: 'percentage_per_student', label: '1. نسبة مئوية (%) من اشتراك كل تلميذ مسجل' },
                { value: 'percentage_per_course', label: '2. نسبة مئوية (%) من سعر الدورة مهما كان عدد التلاميذ' },
                { value: 'fixed_per_course', label: '3. مبلغ ثابت محدد (دج) عن كل دورة / فوج' },
              ]}
            />

            {compensationType === 'percentage_per_student' && (
              <div>
                <Input
                  label="نسبة الأستاذ في كل تلميذ مسجل (%)"
                  placeholder="60"
                  type="number"
                  value={commissionPercentage}
                  onChange={(e) => setCommissionPercentage(e.target.value)}
                  prefixIcon={<Percent size={15} />}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  يتم ضرب نسبة الأستاذ في سعر اشتراك الدورة لكل تلميذ مسجل (مثال: 10 تلاميذ × 6,000 دج × 60% = 36,000 دج).
                </div>
              </div>
            )}

            {compensationType === 'percentage_per_course' && (
              <div>
                <Input
                  label="نسبة الأستاذ من السعر الإجمالي للدورة (%)"
                  placeholder="60"
                  type="number"
                  value={commissionPercentage}
                  onChange={(e) => setCommissionPercentage(e.target.value)}
                  prefixIcon={<Percent size={15} />}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  يأخذ الأستاذ هذه النسبة من سعر الدورة الأساسي مهما كان عدد التلاميذ المسجلين في القاعة.
                </div>
              </div>
            )}

            {compensationType === 'fixed_per_course' && (
              <div>
                <Input
                  label="المبلغ الثابت المخصص للأستاذ عن الفوج (دج DZD)"
                  placeholder="25000"
                  type="number"
                  value={fixedCourseRate}
                  onChange={(e) => setFixedCourseRate(e.target.value)}
                  prefixIcon={<Coins size={15} />}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  يتقاضى الأستاذ هذا المبلغ الثابت عن كل فوج يؤطره بغض النظر عن عدد التلاميذ المسجلين.
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary">
              حفظ الأستاذ
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!teacherToDelete}
        onClose={() => setTeacherToDelete(null)}
        title="تأكيد حذف الأستاذ"
        description="هل أنت متأكد من رغبتك في حذف هذا الأستاذ من سجلات المؤسسة؟"
        maxWidth="440px"
        footer={
          <>
            <Button variant="danger" onClick={confirmDeleteTeacher}>
              نعم، حذف الأستاذ
            </Button>
            <Button variant="secondary" onClick={() => setTeacherToDelete(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        {teacherToDelete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)' }}>
            <AlertTriangle size={24} color="var(--color-danger)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              سيتم حذف بيانات <strong>{teacherToDelete.fullName}</strong> ({teacherToDelete.subject}).
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
