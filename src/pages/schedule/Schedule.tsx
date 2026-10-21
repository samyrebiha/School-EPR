import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { useData } from '../../contexts/DataContext';
import { ACADEMIC_LEVEL_OPTIONS } from '../../data/academicLevels';

/**
 * Returns today's day of week in Arabic
 */
const getTodayArabicDay = (): string => {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[new Date().getDay()];
};

/**
 * Normalizes Arabic day names so 'الإثنين' and 'الاثنين' match reliably
 */
const normalizeDay = (d: string) => d.replace(/[إأآ]/g, 'ا').trim();
const isSameDay = (d1: string, d2: string) => normalizeDay(d1) === normalizeDay(d2);

export const Schedule: React.FC = () => {
  const { courses, classrooms, teachers } = useData();

  // Current day in Arabic
  const todayDayName = getTodayArabicDay();

  // Default to today's day so the table immediately displays current day classes
  const [selectedDay, setSelectedDay] = useState<string>(todayDayName);
  const [selectedAcademicLevel, setSelectedAcademicLevel] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  const daysOfWeek = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  // Consolidate schedule items from courses
  const scheduleItems = courses.flatMap((c) =>
    (c.scheduleDays || []).map((day) => {
      let time = c.scheduleTime;
      // If course has per-day schedule formatted as "السبت (08:00 صباحاً - 10:00 صباحاً) • الثلاثاء (05:00 مساءً - 07:00 مساءً)"
      if (c.scheduleTime && c.scheduleTime.includes('(') && c.scheduleTime.includes(day)) {
        const match = c.scheduleTime.match(new RegExp(`${day}\\s*\\(([^)]+)\\)`));
        if (match && match[1]) {
          time = match[1];
        }
      }
      return {
        id: `${c.id}-${day}`,
        day,
        time,
        title: c.title,
        subject: c.subject,
        academicLevel: c.academicLevel,
        teacher: c.teacherName,
        teacherId: c.teacherId,
        room: c.roomName,
        type: c.type,
        studentsCount: c.enrolledList?.length || 0,
      };
    })
  );

  const filteredItems = scheduleItems.filter((item) => {
    if (selectedDay !== 'all' && !isSameDay(item.day, selectedDay)) return false;
    if (selectedAcademicLevel !== 'all' && item.academicLevel !== selectedAcademicLevel) return false;
    if (selectedRoom !== 'all' && item.room !== selectedRoom) return false;
    if (selectedTeacher !== 'all' && item.teacherId !== selectedTeacher) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="الجدول والتوقيت الأسبوعي"
        description="عرض الحصص المبرمجة حسب الأيام، القاعات المخصصة، وتوزيع الأساتذة مع التركيز على حصص اليوم"
      />

      {/* Quick Day Switcher Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: 'var(--space-4)',
          padding: '10px 14px',
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
          <Sparkles size={15} color="var(--color-primary)" />
          <span>عرض سريع:</span>
        </div>

        <Button
          variant={isSameDay(selectedDay, todayDayName) ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedDay(todayDayName)}
          rightIcon={<CalendarIcon size={14} />}
          style={{ fontWeight: 700 }}
        >
          اليوم الحالي ({todayDayName}) ⭐
        </Button>

        <Button
          variant={selectedDay === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedDay('all')}
        >
          كامل أيام الأسبوع
        </Button>

        <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--color-border)', margin: '0 4px' }} />

        {daysOfWeek.map((d) => {
          const isToday = isSameDay(d, todayDayName);
          const isSelected = isSameDay(selectedDay, d);
          return (
            <Button
              key={d}
              variant={isSelected ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedDay(d)}
              style={{
                fontWeight: isToday ? 700 : 500,
                color: isSelected ? undefined : isToday ? 'var(--color-primary)' : undefined,
              }}
            >
              {d} {isToday ? '•' : ''}
            </Button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div className="grid grid-cols-5 xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-1 gap-4 items-end">
          <Select
            label="تصفية حسب اليوم"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            options={[
              { value: todayDayName, label: `اليوم الحالي (${todayDayName}) ⭐` },
              { value: 'all', label: 'جميع أيام الأسبوع' },
              ...daysOfWeek.filter((d) => !isSameDay(d, todayDayName)).map((d) => ({ value: d, label: d })),
            ]}
          />

          <Select
            label="تصفية حسب الطور / المستوى الدراسي"
            value={selectedAcademicLevel}
            onChange={(e) => setSelectedAcademicLevel(e.target.value)}
            options={[
              { value: 'all', label: 'جميع الأطوار والمستويات' },
              ...ACADEMIC_LEVEL_OPTIONS.map((lvl) => ({ value: lvl.value, label: lvl.label })),
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
              setSelectedDay(todayDayName);
              setSelectedAcademicLevel('all');
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
          const dayItems = filteredItems.filter((i) => isSameDay(i.day, day));
          const isToday = isSameDay(day, todayDayName);

          return (
            <div
              key={day}
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                boxShadow: isToday ? '0 4px 16px rgba(30, 58, 138, 0.12)' : 'var(--shadow-sm)',
                position: 'relative',
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
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={18} color="var(--color-primary)" />
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>
                    يوم {day}
                  </span>
                  {isToday && (
                    <Badge variant="success" style={{ fontWeight: 800 }}>
                      ⭐ اليوم الحالي
                    </Badge>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedAcademicLevel !== 'all' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-app)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                      الطور: {selectedAcademicLevel}
                    </span>
                  )}
                  <Badge variant={dayItems.length > 0 ? 'primary' : 'neutral'}>
                    {dayItems.length} حصص مبرمجة
                  </Badge>
                </div>
              </div>

              {/* Day Sessions List */}
              {dayItems.length === 0 ? (
                <div
                  style={{
                    padding: '28px',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--color-bg-app)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {isToday
                    ? 'لا توجد حصص مبرمجة لهذا اليوم وفقاً لمعايير التصفية المختارة.'
                    : 'لا توجد أي حصص مبرمجة في هذا اليوم.'}
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
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--color-primary)',
                              backgroundColor: 'var(--color-primary-light)',
                              padding: '3px 8px',
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
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            marginTop: '6px',
                            lineHeight: 1.3,
                          }}
                        >
                          {item.title}
                        </h4>

                        {item.academicLevel && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              color: 'var(--color-primary)',
                              backgroundColor: 'rgba(30, 58, 138, 0.06)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              marginTop: '6px',
                              fontWeight: 600,
                            }}
                          >
                            <GraduationCap size={13} />
                            <span>{item.academicLevel}</span>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          borderTop: '1px solid var(--color-border)',
                          paddingTop: '8px',
                          fontSize: '0.75rem',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={13} color="var(--color-primary)" />
                          <span style={{ fontWeight: 600 }}>{item.teacher}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} />
                          <span>{item.room || 'غير محدد'}</span>
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
