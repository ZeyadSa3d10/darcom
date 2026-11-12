import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../../context/SettingsContext.jsx';
import './AdminNotificationBell.css';

function getIconForEvent(type, entityType) {
  const key = (type || entityType || '').toLowerCase();
  if (key.includes('booking')) return 'bi-calendar2-check';
  if (key.includes('purchase')) return 'bi-bag-check';
  if (key.includes('listing-request')) return 'bi-house-add';
  if (key.includes('property')) return 'bi-building';
  if (key.includes('broker')) return 'bi-person-badge';
  if (key.includes('viewing') || key.includes('requirement')) return 'bi-search-heart';
  if (key.includes('inquiry')) return 'bi-envelope';
  if (key.includes('user')) return 'bi-person-plus';
  return 'bi-bell';
}

function formatTimeAgo(isoDate, isRtl) {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return isRtl ? 'الآن' : 'Just now';
  if (mins < 60) return isRtl ? `منذ ${mins} د` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isRtl ? `منذ ${hrs} س` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return isRtl ? `منذ ${days} ي` : `${days}d ago`;
}

export default function AdminNotificationBell({
  notifications,
  unreadCount,
  connectionState,
  onMarkRead,
  onMarkAllRead,
  onSelectNotification,
}) {
  const { isRtl } = useSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const statusLabel =
    connectionState === 'connected'
      ? isRtl ? 'مباشر' : 'Live'
      : connectionState === 'reconnecting'
        ? isRtl ? 'جاري إعادة الاتصال' : 'Reconnecting'
        : isRtl ? 'غير متصل' : 'Offline';

  return (
    <div className="admin-bell-wrap" ref={rootRef}>
      <span
        className={`admin-live-pill is-${connectionState}`}
        title={statusLabel}
      >
        <span className="admin-live-dot" />
        <span className="d-none d-sm-inline">{statusLabel}</span>
      </span>

      <button
        type="button"
        className={`admin-bell-btn ${open ? 'is-open' : ''}`}
        aria-label={isRtl ? 'إشعارات الإدارة' : 'Admin notifications'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-bell-fill" />
        {unreadCount > 0 && (
          <span className="admin-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="admin-bell-dropdown" role="menu">
          <div className="admin-bell-header">
            <div>
              <strong>{isRtl ? 'الإشعارات الفورية' : 'Notifications'}</strong>
              {unreadCount > 0 && (
                <span className="admin-bell-unread-chip">
                  {unreadCount} {isRtl ? 'غير مقروء' : 'unread'}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="admin-bell-markall"
                onClick={onMarkAllRead}
              >
                {isRtl ? 'تحديد الكل كمقروء' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="admin-bell-list">
            {notifications.length === 0 ? (
              <div className="admin-bell-empty">
                <i className="bi bi-bell-slash" />
                <span>{isRtl ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</span>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-bell-item ${!item.isRead ? 'is-unread' : ''}`}
                  onClick={() => {
                    if (!item.isRead) onMarkRead?.(item.id);
                    onSelectNotification?.(item);
                    setOpen(false);
                  }}
                >
                  <span className="admin-bell-item-icon">
                    <i className={`bi ${getIconForEvent(item.type, item.relatedEntityType)}`} />
                  </span>
                  <span className="admin-bell-item-body">
                    <span className="admin-bell-item-top">
                      <strong>{item.title}</strong>
                      <small>{formatTimeAgo(item.createdAt, isRtl)}</small>
                    </span>
                    <span className="admin-bell-item-msg">{item.message}</span>
                  </span>
                  {!item.isRead && <span className="admin-bell-unread-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

