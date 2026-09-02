import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { useData } from '../../contexts/DataContext';

export const Schedule: React.FC = () => {
  const { courses, classrooms, teachers } = useData();
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  const daysOfWeek = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  // Consolidate schedule items from courses
  const scheduleItems = courses.flatMap((c) =>
    (c.scheduleDays || []).map((day) => ({
      id: `${c.id}-${day}`,
      day,
      time: c.scheduleTime,
      title: c.title,
      subject: c.subject,
      academicLevel: c.academicLevel,
      teacher: c.teacherName,
      teacherId: c.teacherId,
      room: c.roomName,
      type: c.type,
      studentsCount: c.enrolledList?.length || 0,
    }))
  );

  const filteredItems = scheduleItems.filter((item) => {
    if (selectedDay !== 'all' && item.day !== selectedDay) return false;
    if (selectedRoom !== 'all' && item.room !== selectedRoom) return false;
    if (selectedTeacher !== 'all' && item.teacherId !== selectedTeacher) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="الجدول والتوقيت الأسبوعي"
        description="عرض الحصص المبرمجة حسب الأيام، القاعات المخصصة، وتوزيع الأساتذة"
      />

      {/* Filter Bar */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-4 items-end">
          <Select
            label="تصفية حسب اليوم"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            options={[
              { value: 'all', label: 'جميع أيام الأسبوع' },
              ...daysOfWeek.map((d) => ({ value: d, label: d })),
            ]}
          />

          <Select
            label="تصفية حسب القاعة"
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            options={[
              { value: 'all', label: 'جميع القاعات' },
              ...classrooms.map((r) => ({ value: r.name, label: r.name })),
            ]}
          />

          <Select
            label="تصفية حسب الأستاذ"
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            options={[
              { value: 'all', label: 'جميع الأساتذة' },
              ...teachers.map((t) => ({ value: t.id, label: t.fullName })),
            ]}
          />

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setSelectedDay('all');
              setSelectedRoom('all');
              setSelectedTeacher('all');
            }}
          >
            إعادة تعيين الفلاتر
          </Button>
        </div>
      </Card>

      {/* Days Schedule Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {(selectedDay === 'all' ? daysOfWeek : [selectedDay]).map((day) => {
          const dayItems = filteredItems.filter((i) => i.day === day);

          return (
            <div
              key={day}
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Day Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '12px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={18} color="var(--color-primary)" />
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                    يوم {day}
                  </span>
                </div>
                <Badge variant={dayItems.length > 0 ? 'primary' : 'neutral'}>
                  {dayItems.length} حصص مبرمجة
                </Badge>
              </div>

              {/* Day Sessions List */}
              {dayItems.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                  }}
                >
                  لا توجد أي حصص مبرمجة في هذا اليوم.
                </div>
              ) : (
                <div className="grid grid-cols-3 lg:grid-cols-2 md:grid-cols-1 gap-4">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--color-bg-app)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--color-primary)',
                              backgroundColor: 'var(--color-primary-light)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Clock size={12} />
                            {item.time}
                          </span>
                          <Badge variant="neutral">
                            {item.studentsCount} مسجلين
                          </Badge>
                        </div>

                        <h4
                          style={{
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            marginTop: '6px',
                            lineHeight: 1.3,
                          }}
                        >
                          {item.title}
                        </h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {item.academicLevel}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          borderTop: '1px solid var(--color-border)',
                          paddingTop: '8px',
                          fontSize: '0.75rem',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={13} color="var(--color-primary)" />
                          <span>{item.teacher}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} />
                          <span>{item.room}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
