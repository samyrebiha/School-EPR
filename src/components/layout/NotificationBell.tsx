import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  Sparkles,
  AlertTriangle,
  Info,
  Megaphone,
  CheckCheck,
  Clock,
  User,
  X,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AppNotification, NotificationType } from '../../types';
import { useSchool } from '../../contexts/SchoolContext';
import { formatDateArabic } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const NotificationBell: React.FC = () => {
  const { currentSchool } = useSchool();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('school_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from Supabase
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        // Table might not be created yet in the DB
        console.warn('Could not fetch app_notifications:', error.message);
        return;
      }

      if (data) {
        // Map snake_case to AppNotification interface
        const mapped: AppNotification[] = data
          .filter((item: any) => {
            // Either sent to all schools (school_id is null/empty) or matches current school
            return !item.school_id || item.school_id === currentSchool?.id;
          })
          .map((item: any) => ({
            id: String(item.id),
            schoolId: item.school_id,
            title: item.title || 'إشعار جديد',
            message: item.message || '',
            type: (item.type as NotificationType) || 'update',
            sender: item.sender || 'إدارة النظام',
            isActive: item.is_active,
            createdAt: item.created_at,
          }));

        setNotifications(mapped);
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and Realtime subscription
  useEffect(() => {
    // Attempt one fetch; if the table doesn't exist the fetch already swallows the error
    // and we set a flag to skip the realtime subscription entirely.
    let tableExists = true;

    const initialFetch = async () => {
      try {
        const { error } = await supabase
          .from('app_notifications')
          .select('id')
          .limit(1);
        if (error) {
          tableExists = false; // Table doesn't exist yet – skip subscription silently
          return;
        }
      } catch {
        tableExists = false;
        return;
      }
      fetchNotifications();
    };

    initialFetch().then(() => {
      if (!tableExists) return;

      // Only subscribe if the table was confirmed to exist
      const channel = supabase
        .channel('realtime:app_notifications')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_notifications' },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [currentSchool?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  // Mark a single notification as read
  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem('school_read_notifications', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const combined = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(combined);
    try {
      localStorage.setItem('school_read_notifications', JSON.stringify(combined));
    } catch (e) {
      console.warn(e);
    }
  };

  // Handle click on a notification item: mark as read and open the full message modal
  const handleNotificationClick = (item: AppNotification) => {
    markAsRead(item.id);
    setSelectedNotification(item);
    setIsOpen(false);
  };

  // Notification type styling helpers
  const getTypeBadge = (type?: NotificationType) => {
    switch (type) {
      case 'update':
        return {
          icon: <Sparkles size={13} color="#2563eb" />,
          label: 'تحديث جديد',
          bg: '#eff6ff',
          color: '#1d4ed8',
          border: '#bfdbfe',
        };
      case 'alert':
        return {
          icon: <AlertTriangle size={13} color="#dc2626" />,
          label: 'تنبيه هام',
          bg: '#fef2f2',
          color: '#b91c1c',
          border: '#fca5a5',
        };
      case 'announcement':
        return {
          icon: <Megaphone size={13} color="#7c3aed" />,
          label: 'إعلان إداري',
          bg: '#f5f3ff',
          color: '#6d28d9',
          border: '#ddd6fe',
        };
      case 'info':
      default:
        return {
          icon: <Info size={13} color="#059669" />,
          label: 'معلومة',
          bg: '#f0fdf4',
          color: '#15803d',
          border: '#bbf7d0',
        };
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={unreadCount > 0 ? `لديك ${unreadCount} إشعارات غير مقروءة` : 'جرس التنبيهات والتحديثات'}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '38px',
          minHeight: '38px',
          width: '38px',
          height: '38px',
          padding: 0,
          borderRadius: 'var(--radius-md)',
          border: unreadCount > 0 ? '1px solid #fca5a5' : '1px solid var(--color-border)',
          backgroundColor: unreadCount > 0 ? '#fff1f2' : 'var(--color-bg-surface-secondary)',
          color: unreadCount > 0 ? '#e11d48' : 'var(--color-text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
        aria-label="جرس التنبيهات"
      >
        <Bell size={18} />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '10px',
              backgroundColor: '#e11d48',
              color: '#ffffff',
              fontSize: '0.6875rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(225, 29, 72, 0.4)',
              border: '2px solid #ffffff',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '360px',
            maxWidth: '90vw',
            backgroundColor: 'var(--color-bg-surface, #ffffff)',
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 100,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid var(--color-border, #e2e8f0)',
              backgroundColor: 'var(--color-bg-surface-secondary, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="var(--color-primary, #2563eb)" />
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                التنبيهات والتحديثات
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: '#e11d48',
                    color: '#ffffff',
                  }}
                >
                  {unreadCount} جديد
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--color-primary, #2563eb)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCheck size={13} />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted, #64748b)',
                  fontSize: '0.8125rem',
                }}
              >
                <MessageSquare size={32} color="#94a3b8" style={{ margin: '0 auto 8px', opacity: 0.7 }} />
                <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                  لا توجد تنبيهات حالياً
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  ستظهر الرسائل والتحديثات الجديدة المرسلة من الإدارة هنا مباشرة.
                </div>
              </div>
            ) : (
              notifications.map((item) => {
                const isRead = readIds.includes(item.id);
                const badge = getTypeBadge(item.type);
                const dateStr = item.createdAt ? formatDateArabic(item.createdAt.split('T')[0]) : '';
                const timeStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--color-border, #f1f5f9)',
                      backgroundColor: isRead ? 'transparent' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isRead ? '#f8fafc' : '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isRead ? 'transparent' : '#f8fafc';
                    }}
                  >
                    {/* Header Row: Type Badge + Sender + Time */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                        }}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: '#94a3b8' }}>
                        <span>{dateStr}</span>
                        {timeStr && <span>({timeStr})</span>}
                        {!isRead && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#e11d48',
                              display: 'inline-block',
                            }}
                            title="غير مقروء"
                          />
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <div
                      style={{
                        fontWeight: isRead ? 600 : 800,
                        fontSize: '0.875rem',
                        color: isRead ? 'var(--color-text-primary)' : '#0f172a',
                        marginTop: '2px',
                      }}
                    >
                      {item.title}
                    </div>

                    {/* Message Preview */}
                    <div
                      style={{
                        fontSize: '0.78125rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: '1.4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {item.message}
                    </div>

                    {/* Sender footer */}
                    {item.sender && (
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={11} />
                        <span>المرسل: {item.sender}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Message Content Modal (عند الضغط على الرسالة تخرج له محتوى الرسالة مباشرة) */}
      <Modal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title || 'تفاصيل الرسالة'}
        maxWidth="560px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <Button variant="secondary" onClick={() => setSelectedNotification(null)}>
              إغلاق
            </Button>
          </div>
        }
      >
        {selectedNotification && (() => {
          const badge = getTypeBadge(selectedNotification.type);
          const dateStr = selectedNotification.createdAt ? formatDateArabic(selectedNotification.createdAt.split('T')[0]) : '';
          const timeStr = selectedNotification.createdAt
            ? new Date(selectedNotification.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : '';

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Message Header Strip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: badge.bg,
                  border: `1px solid ${badge.border}`,
                  borderRadius: 'var(--radius-md, 8px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {badge.icon}
                  <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: badge.color }}>
                    {badge.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: badge.color, fontWeight: 600 }}>
                  <Clock size={12} />
                  <span>{dateStr}</span>
                  {timeStr && <span>({timeStr})</span>}
                </div>
              </div>

              {/* Sender Details */}
              {selectedNotification.sender && (
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                  }}
                >
                  <User size={14} color="var(--color-primary)" />
                  <span>المرسل: <strong>{selectedNotification.sender}</strong></span>
                </div>
              )}

              {/* Full Message Content */}
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--color-bg-surface-secondary, #f8fafc)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.9375rem',
                  lineHeight: '1.7',
                  color: 'var(--color-text-primary, #1e293b)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                }}
              >
                {selectedNotification.message}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
