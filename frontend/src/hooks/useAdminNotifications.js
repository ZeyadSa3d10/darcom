import { useCallback, useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { getAccessToken, refreshAccessToken } from '../services/api.js';
import { purchaseService } from '../services/purchaseService.js';

const MAX_ITEMS = 25;

/**
 * Connects AdminDashboard to SignalR /hubs/admin-notifications with JWT auth,
 * loads persisted notifications + unread count for offline catch-up,
 * and invokes onNotification(payload) when live events arrive.
 */
export function useAdminNotifications({ enabled = true, onNotification } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionState, setConnectionState] = useState('disconnected'); // connected | reconnecting | disconnected
  const [loading, setLoading] = useState(false);

  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        purchaseService.notifications(1, MAX_ITEMS),
        purchaseService.unreadCount(),
      ]);
      const page = listRes?.data;
      setNotifications(Array.isArray(page?.data) ? page.data : []);
      if (typeof countRes?.data === 'number') {
        setUnreadCount(countRes.data);
      }
    } catch {
      // Keep existing UI state if initial fetch temporarily fails
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/admin-notifications', {
        accessTokenFactory: async () => {
          const current = getAccessToken();
          if (current) return current;
          return (await refreshAccessToken()) || '';
        },
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('AdminNotification', (payload) => {
      if (cancelled || !payload) return;

      const entry = {
        id: payload.notificationId && payload.notificationId > 0
          ? payload.notificationId
          : Date.now(),
        title: payload.title || 'Admin Update',
        message: payload.message || '',
        type: payload.eventType || 'admin',
        relatedEntityId: payload.relatedEntityId ?? null,
        relatedEntityType: payload.relatedEntityType ?? null,
        isRead: false,
        createdAt: payload.createdAt || new Date().toISOString(),
      };

      setNotifications((prev) => {
        const filtered = entry.id
          ? prev.filter((item) => item.id !== entry.id)
          : prev;
        return [entry, ...filtered].slice(0, MAX_ITEMS);
      });
      setUnreadCount((c) => c + 1);

      if (onNotificationRef.current) {
        onNotificationRef.current(payload);
      }
    });

    connection.onreconnecting(() => {
      if (!cancelled) setConnectionState('reconnecting');
    });

    connection.onreconnected(() => {
      if (!cancelled) {
        setConnectionState('connected');
        refresh();
      }
    });

    connection.onclose(() => {
      if (!cancelled) setConnectionState('disconnected');
    });

    (async () => {
      try {
        await connection.start();
        if (!cancelled) {
          setConnectionState('connected');
        }
      } catch {
        if (!cancelled) setConnectionState('disconnected');
      }
    })();

    return () => {
      cancelled = true;
      connection.stop().catch(() => {});
    };
  }, [enabled, refresh]);

  const markRead = useCallback(async (id) => {
    if (!id) return;
    let wasUnread = false;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          if (!n.isRead) wasUnread = true;
          return { ...n, isRead: true };
        }
        return n;
      })
    );
    if (wasUnread) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    try {
      await purchaseService.markRead(id);
    } catch {
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await purchaseService.markAllRead();
    } catch {
      refresh();
    }
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    connectionState,
    loading,
    markRead,
    markAllRead,
    refresh,
  };
}

