import React, { useState, useEffect, useRef } from 'react';
import { Search, User, BookOpen, CreditCard, ArrowLeft, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { teachers, courses, transactions } = useData();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedTeachers = q
    ? teachers.filter((t) => t.fullName.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
    : [];

  const matchedCourses = q
    ? courses.filter((c) => c.title.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q))
    : [];

  const matchedPayments = q
    ? transactions.filter((p) => p.receiptNumber.toLowerCase().includes(q) || p.studentName.toLowerCase().includes(q))
    : [];

  const hasResults =
    matchedTeachers.length > 0 ||
    matchedCourses.length > 0 ||
    matchedPayments.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '620px', padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="البحث السريع"
      >
        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-surface)',
          }}
        >
          <Search size={20} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="ابحث عن أستاذ، دورة، فوج، إيصال دفع..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              color: 'var(--color-text-primary)',
              background: 'transparent',
              minWidth: 0,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                color: 'var(--color-text-muted)',
                padding: 'var(--space-1)',
                minWidth: '32px',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="مسح نص البحث"
            >
              <X size={16} />
            </button>
          )}
          <span
            className="md:hidden"
            style={{
              padding: '2px 8px',
              backgroundColor: 'var(--color-bg-surface-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
            }}
          >
            ESC للإغلاق
          </span>
        </div>

        {/* Results Area */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: 'var(--space-3) var(--space-4)' }}>
          {!query ? (
            <div style={{ padding: 'var(--space-6) var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <p style={{ fontSize: '0.875rem' }}>ابدأ بالكتابة للبحث في كامل المنصة...</p>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 'var(--space-4)',
                  marginTop: 'var(--space-4)',
                  fontSize: '0.8125rem',
                  flexWrap: 'wrap',
                }}
              >
                <span>الأساتذة ({teachers.length})</span>
                <span>الدورات والأفواج ({courses.length})</span>
                <span>المدفوعات ({transactions.length})</span>
              </div>
            </div>
          ) : !hasResults ? (
            <div style={{ padding: 'var(--space-6) var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              لم يتم العثور على أي نتائج مطابقة لـ &quot;{query}&quot;
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Teachers */}
              {matchedTeachers.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                    الأساتذة ({matchedTeachers.length})
                  </div>
                  {matchedTeachers.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        onNavigate('teachers');
                        onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        minHeight: '40px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)' }}>
                        <User size={16} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.fullName}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t.subject}</span>
                      </div>
                      <ArrowLeft size={14} color="var(--color-text-muted)" />
                    </div>
                  ))}
                </div>
              )}

              {/* Courses */}
              {matchedCourses.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                    الدورات والأفواج ({matchedCourses.length})
                  </div>
                  {matchedCourses.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        onNavigate('courses');
                        onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        minHeight: '40px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)' }}>
                        <BookOpen size={16} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{c.title}</span>
                      </div>
                      <ArrowLeft size={14} color="var(--color-text-muted)" />
                    </div>
                  ))}
                </div>
              )}

              {/* Payments */}
              {matchedPayments.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                    المدفوعات والإيصالات ({matchedPayments.length})
                  </div>
                  {matchedPayments.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onNavigate('payments');
                        onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        minHeight: '40px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)' }}>
                        <CreditCard size={16} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.receiptNumber}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.studentName}</span>
                      </div>
                      <ArrowLeft size={14} color="var(--color-text-muted)" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

