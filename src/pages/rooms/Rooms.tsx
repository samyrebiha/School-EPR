import React, { useState } from 'react';
import {
  Building2,
  PlusCircle,
  Users,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Column } from '../../components/data-table/DataTable';
import { StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { Classroom } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';

export interface RoomsProps {
  isAddModalOpenInitially?: boolean;
  onCloseAddModalInitially?: () => void;
}

export const Rooms: React.FC<RoomsProps> = ({
  isAddModalOpenInitially = false,
  onCloseAddModalInitially,
}) => {
  const { success } = useToast();
  const { classrooms, addClassroom, deleteClassroom } = useData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(isAddModalOpenInitially);
  const [roomToDelete, setRoomToDelete] = useState<Classroom | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [capacity, setCapacity] = useState('25');
  const [type, setType] = useState<'lecture' | 'lab' | 'small_group'>('lecture');
  const [equipmentStr, setEquipmentStr] = useState('سبورة تفاعلية، مكيف هوائي، جهاز عرض');

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRoom: Classroom = {
      id: `room-${Date.now()}`,
      name: name.trim(),
      roomNumber: roomNumber.trim() || `القاعة 0${classrooms.length + 1}`,
      capacity: Number(capacity) || 20,
      type,
      equipment: equipmentStr ? equipmentStr.split('،').map((s) => s.trim()) : [],
      status: 'available',
    };

    addClassroom(newRoom);
    setIsAddModalOpen(false);
    success(`تمت إضافة ${name} بنجاح!`, 'تم الحفظ');

    setName('');
    setRoomNumber('');
  };

  const confirmDeleteRoom = () => {
    if (!roomToDelete) return;
    deleteClassroom(roomToDelete.id);
    success(`تم حذف القاعة "${roomToDelete.name}" بنجاح.`);
    setRoomToDelete(null);
  };

  const availableCount = classrooms.filter((r) => r.status === 'available').length;
  const occupiedCount = classrooms.filter((r) => r.status === 'occupied').length;
  const totalCapacity = classrooms.reduce((acc, r) => acc + r.capacity, 0);

  const columns: Column<Classroom>[] = [
    {
      key: 'name',
      header: 'اسم القاعة والرقم',
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
            {r.roomNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'نوع القاعة',
      render: (r) => {
        const typeLabels: Record<string, string> = {
          lecture: 'قاعة تدريس كبرى',
          lab: 'مخبر علمي / لغات',
          small_group: 'قاعة أفواج مصغرة',
        };
        return (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            {typeLabels[r.type] || r.type}
          </span>
        );
      },
    },
    {
      key: 'capacity',
      header: 'السعة الاستيعابية',
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
          {r.capacity} مقعد
        </span>
      ),
    },
    {
      key: 'equipment',
      header: 'التجهيزات المتاحة',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {r.equipment && r.equipment.length > 0 ? (
            r.equipment.slice(0, 2).map((eq, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.6875rem',
                  backgroundColor: 'var(--color-bg-surface-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {eq}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>—</span>
          )}
          {r.equipment && r.equipment.length > 2 && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
              +{r.equipment.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة الحالية',
      render: (r) => (
        <div>
          <Badge variant={r.status === 'available' ? 'success' : r.status === 'occupied' ? 'warning' : 'neutral'}>
            {r.status === 'available' ? 'شاغرة حاليًا' : r.status === 'occupied' ? 'مشغولة' : 'صيانة'}
          </Badge>
          {r.currentOccupant && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {r.currentOccupant}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      width: '120px',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            title="حذف القاعة"
            onClick={() => setRoomToDelete(r)}
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
        title="إدارة القاعات والمخابر"
        description="متابعة جاهزية القاعات، السعة الاستيعابية، والتجهيزات المتوفرة"
        actions={
          <Button
            variant="primary"
            rightIcon={<PlusCircle size={16} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            إضافة قاعة جديدة
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard
          title="إجمالي القاعات والمخابر"
          value={`${classrooms.length} قاعات`}
          subtitle="جاهزة للاستغلال"
          icon={<Building2 size={20} />}
        />
        <StatCard
          title="القاعات الشاغرة الآن"
          value={`${availableCount} قاعات`}
          subtitle="متاحة لحجز حصص جديدة"
          icon={<CheckCircle size={20} color="var(--color-success)" />}
        />
        <StatCard
          title="القاعات المشغولة حاليًا"
          value={`${occupiedCount} قاعات`}
          subtitle="تجري فيها حصص حاليًا"
          icon={<AlertCircle size={20} color="var(--color-warning)" />}
        />
        <StatCard
          title="إجمالي الطاقة الاستيعابية"
          value={`${totalCapacity} مقعد`}
          subtitle="في جميع القاعات"
          icon={<Users size={20} color="var(--color-primary)" />}
        />
      </div>

      <DataTable
        data={classrooms}
        columns={columns}
        keyExtractor={(r) => r.id}
        searchPlaceholder="ابحث باسم القاعة أو التجهيزات..."
        searchFields={['name', 'roomNumber', 'currentOccupant']}
      />

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          if (onCloseAddModalInitially) onCloseAddModalInitially();
        }}
        title="إضافة قاعة أو مخبر جديد"
        description="تسجيل مواصفات القاعة وسعتها الاستيعابية وتجهيزاتها"
      >
        <form onSubmit={handleAddRoom} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="اسم القاعة"
              placeholder="مثال: قاعة الخوارزمي"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="رقم القاعة أو الترميز"
              placeholder="القاعة 06"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <Input
              label="السعة الاستيعابية (عدد المقاعد)"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
            <Select
              label="نوع القاعة"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              options={[
                { value: 'lecture', label: 'قاعة تدريس كبرى' },
                { value: 'lab', label: 'مخبر علمي / لغات' },
                { value: 'small_group', label: 'قاعة أفواج مصغرة' },
              ]}
            />
          </div>

          <Input
            label="التجهيزات المتاحة (مفصولة بفاصلة)"
            placeholder="سبورة تفاعلية، مكيف هوائي، جهاز عرض DataShow..."
            value={equipmentStr}
            onChange={(e) => setEquipmentStr(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: 'var(--space-2)' }}>
            <Button type="submit" variant="primary">
              حفظ القاعة
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        title="تأكيد حذف القاعة"
        description="هل أنت متأكد من رغبتك في حذف هذه القاعة؟"
        maxWidth="440px"
        footer={
          <>
            <Button variant="danger" onClick={confirmDeleteRoom}>
              نعم، حذف القاعة
            </Button>
            <Button variant="secondary" onClick={() => setRoomToDelete(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        {roomToDelete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)' }}>
            <AlertTriangle size={24} color="var(--color-danger)" />
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              سيتم حذف <strong>{roomToDelete.name}</strong> ({roomToDelete.roomNumber}).
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
