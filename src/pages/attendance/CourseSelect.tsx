import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  X,
  Check,
  GraduationCap,
  DoorOpen,
  Clock,
  Users,
  Layers,
} from 'lucide-react';
import { Course } from '../../types';

export interface CourseSelectProps {
  label?: string;
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  totalCoursesCount?: number;
  disabled?: boolean;
}

export const CourseSelect: React.FC<CourseSelectProps> = ({
  label,
  courses,
  selectedCourseId,
  onSelectCourse,
  totalCoursesCount,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active course
  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // Filtered courses based on local search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      const title = (c.title || '').toLowerCase();
      const subject = (c.subject || '').toLowerCase();
      const teacher = (c.teacherName || '').toLowerCase();
      const room = (c.roomName || '').toLowerCase();
      const level = (c.academicLevel || '').toLowerCase();
      const time = (c.scheduleTime || '').toLowerCase();
      return (
        title.includes(q) ||
        subject.includes(q) ||
        teacher.includes(q) ||
        room.includes(q) ||
        level.includes(q) ||
        time.includes(q)
      );
    });
  }, [courses, searchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      onSelectCourse(filteredOptions[0].id);
      setIsOpen(false);
    }
  };

  const handleSelect = (courseId: string) => {
    onSelectCourse(courseId);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      style={{
        position: 'relative',
        width: '100%',
        fontFamily: 'inherit',
      }}
    >
      {/* Label */}
      {label && (
        <label
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-text-primary, #1e293b)',
            cursor: disabled ? 'default' : 'pointer',
          }}
        >
          <span>{label}</span>
          {totalCoursesCount !== undefined && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary, #64748b)',
                fontWeight: 500,
              }}
            >
              {courses.length} من {totalCoursesCount} متاح
            </span>
          )}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          minHeight: '46px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: disabled
            ? 'var(--color-bg-surface-secondary, #f1f5f9)'
            : 'var(--color-bg-surface, #ffffff)',
          border: isOpen
            ? '1.5px solid var(--color-primary, #176B67)'
            : '1px solid var(--color-border-strong, #cbd5e1)',
          borderRadius: 'var(--radius-md, 8px)',
          boxShadow: isOpen
            ? '0 0 0 3px var(--color-primary-focus, rgba(23, 107, 103, 0.15))'
            : '0 1px 2px rgba(0, 0, 0, 0.04)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'right',
          direction: 'rtl',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
      >
        {activeCourse ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
              flex: 1,
            }}
          >
            {/* Subject / Course Icon */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-primary-light, #E8F4F2)',
                color: 'var(--color-primary, #176B67)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={18} />
            </div>

            {/* Course Information Summary */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: 0,
                flex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary, #1e293b)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeCourse.title}
                </span>

                {activeCourse.academicLevel && (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '1px 7px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-bg-surface-secondary, #f1f5f9)',
                      color: 'var(--color-text-secondary, #475569)',
                      border: '1px solid var(--color-border, #e2e8f0)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {activeCourse.academicLevel}
                  </span>
                )}
              </div>

              {/* Secondary details */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary, #64748b)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={12} color="var(--color-primary, #176B67)" />
                  <span>{activeCourse.teacherName}</span>
                </span>

                {activeCourse.roomName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DoorOpen size={12} color="#059669" />
                    <span>{activeCourse.roomName}</span>
                  </span>
                )}

                {activeCourse.scheduleTime && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} color="#d97706" />
                    <span>{activeCourse.scheduleTime}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <span
            style={{
              color: 'var(--color-text-muted, #94a3b8)',
              fontSize: '0.875rem',
            }}
          >
            اختر الدورة أو الفوج الدراسي...
          </span>
        )}

        {/* Dropdown Chevron Arrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isOpen
              ? 'var(--color-primary, #176B67)'
              : 'var(--color-text-muted, #94a3b8)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease, color 0.2s ease',
            flexShrink: 0,
            padding: '2px',
          }}
        >
          <ChevronDown size={18} />
        </div>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            left: 0,
            zIndex: 1050,
            backgroundColor: 'var(--color-bg-surface, #ffffff)',
            borderRadius: 'var(--radius-md, 10px)',
            border: '1px solid var(--color-border-strong, #cbd5e1)',
            boxShadow:
              '0 12px 28px -4px rgba(15, 23, 42, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            direction: 'rtl',
            animation: 'fadeInMenu 0.15s ease-out',
          }}
        >
          {/* Quick Search Header */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--color-border, #e2e8f0)',
              backgroundColor: 'var(--color-bg-surface-secondary, #f8fafc)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  right: '10px',
                  color: 'var(--color-text-muted, #94a3b8)',
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث بالفوج، المادة، الأستاذ، أو القاعة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 32px 7px 28px',
                  fontSize: '0.8125rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  backgroundColor: '#ffffff',
                  color: 'var(--color-text-primary, #1e293b)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    background: 'none',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted, #94a3b8)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--color-text-muted, #64748b)',
                backgroundColor: '#ffffff',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--color-border, #e2e8f0)',
                whiteSpace: 'nowrap',
              }}
            >
              {filteredOptions.length} فوج
            </span>
          </div>

          {/* List of Courses */}
          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((course) => {
                const isSelected = course.id === selectedCourseId;
                const enrolledCount =
                  course.enrolledList?.length || course.enrolledStudents || 0;

                return (
                  <div
                    key={course.id}
                    onClick={() => handleSelect(course.id)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      backgroundColor: isSelected
                        ? 'var(--color-primary-light, #E8F4F2)'
                        : 'transparent',
                      border: isSelected
                        ? '1px solid var(--color-primary, #176B67)'
                        : '1px solid transparent',
                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          'var(--color-bg-surface-secondary, #f8fafc)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {/* Course Main Details */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {/* Top Line: Title + Level Badge + Enrolled Badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? 700 : 600,
                            color: isSelected
                              ? 'var(--color-primary, #176B67)'
                              : 'var(--color-text-primary, #1e293b)',
                          }}
                        >
                          {course.title}
                        </span>

                        {course.academicLevel && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 500,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: isSelected
                                ? '#ffffff'
                                : 'var(--color-bg-surface-secondary, #f1f5f9)',
                              color: 'var(--color-text-secondary, #475569)',
                              border: '1px solid var(--color-border, #e2e8f0)',
                            }}
                          >
                            {course.academicLevel}
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 500,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isSelected
                              ? 'rgba(23, 107, 103, 0.1)'
                              : 'var(--color-bg-surface-secondary, #f1f5f9)',
                            color: isSelected
                              ? 'var(--color-primary, #176B67)'
                              : 'var(--color-text-muted, #64748b)',
                          }}
                        >
                          {enrolledCount} تلميذ
                        </span>
                      </div>

                      {/* Bottom Line: Teacher • Room • Time */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '0.75rem',
                          color: isSelected
                            ? 'var(--color-primary, #176B67)'
                            : 'var(--color-text-secondary, #64748b)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} />
                          <span>{course.teacherName}</span>
                        </span>

                        {course.roomName && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <DoorOpen size={12} />
                            <span>{course.roomName}</span>
                          </span>
                        )}

                        {course.scheduleTime && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            <span>{course.scheduleTime}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selected Checkmark Icon */}
                    {isSelected && (
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary, #176B67)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(23, 107, 103, 0.25)',
                        }}
                      >
                        <Check size={13} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted, #94a3b8)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Search size={22} style={{ opacity: 0.5 }} />
                <span>لا توجد نتائج مطابقة لبحثك &quot;{searchQuery}&quot;</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
