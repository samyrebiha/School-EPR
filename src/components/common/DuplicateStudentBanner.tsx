import React from 'react';
import { AlertTriangle, Sparkles, BookOpen } from 'lucide-react';
import { DuplicateStudentMatch } from '../../utils/studentDuplicates';
import { Student } from '../../types';
import { formatDZD } from '../../utils/formatters';

interface DuplicateStudentBannerProps {
  matches: DuplicateStudentMatch[];
  onAutoFill?: (student: Student) => void;
}

export const DuplicateStudentBanner: React.FC<DuplicateStudentBannerProps> = ({
  matches,
  onAutoFill,
}) => {
  if (!matches || matches.length === 0) return null;

  const sameCourseMatch = matches.find((m) => m.matchType === 'same_course');
  const otherCourseMatches = matches.filter((m) => m.matchType === 'other_course');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
      {/* 1. Critical Warning: Already in THIS course */}
      {sameCourseMatch && (
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#fef2f2',
            border: '1.5px solid #f87171',
            borderRadius: 'var(--radius-md, 8px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 800, fontSize: '0.875rem' }}>
            <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            <span>⚠️ تنبيه تكرار: هذا التلميذ مسجل بالفعل في هذا الفوج!</span>
          </div>

          <div style={{ fontSize: '0.8125rem', color: '#991b1b', lineHeight: 1.5, paddingRight: '26px' }}>
            <div>
              التلميذ: <strong>{sameCourseMatch.student.fullName}</strong>
              {sameCourseMatch.student.phone && ` (هاتف: ${sameCourseMatch.student.phone})`}
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '2px', color: '#7f1d1d' }}>
              • سبب الكشف: <strong>{sameCourseMatch.matchDescription}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '2px', color: '#7f1d1d' }}>
              • الحصص المستهلكة: <strong>{sameCourseMatch.student.attendedSessions || 0} من {sameCourseMatch.student.totalSessions || 5}</strong>
              {sameCourseMatch.student.totalDebt > 0 ? (
                <span style={{ color: '#dc2626', fontWeight: 700 }}> • عليه دين: {formatDZD(sameCourseMatch.student.totalDebt)}</span>
              ) : (
                <span style={{ color: '#16a34a', fontWeight: 700 }}> • خالص ومسدد</span>
              )}
            </div>
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: '#991b1b',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '6px 10px',
              borderRadius: '4px',
              marginTop: '4px',
              fontWeight: 600,
            }}
          >
            🛑 لتفادي تكرار الاسم واستهلاك مقعدين، تأكد هل تريد فعلاً إعادة تسجيله كاشتراك جديد أم الاكتفاء بتعديله من جدول الفوج.
          </div>
        </div>
      )}

      {/* 2. Helpful Info: Registered in OTHER courses (Auto-fill assistant) */}
      {!sameCourseMatch && otherCourseMatches.length > 0 && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: 'var(--radius-md, 8px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}>
              <Sparkles size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>تلميذ معروف في المؤسسة ({otherCourseMatches[0].matchDescription})</span>
            </div>

            {onAutoFill && (
              <button
                type="button"
                onClick={() => onAutoFill(otherCourseMatches[0].student)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                title="تعبئة أرقام الهاتف وبيانات ولي الأمر المسجلة سابقاً تلقائياً"
              >
                <span>⚡ ملء البيانات تلقائياً</span>
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.78125rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <BookOpen size={13} color="#15803d" />
            <span>مسجل مسبقاً في:</span>
            {otherCourseMatches.map((m, idx) => (
              <span
                key={m.courseId + idx}
                style={{
                  backgroundColor: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                {m.courseTitle}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
