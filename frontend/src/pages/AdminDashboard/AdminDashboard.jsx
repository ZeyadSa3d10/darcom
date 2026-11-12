import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import { adminService } from '../../services/adminService.js';
import AdminStats from './components/AdminStats.jsx';
import ApprovalQueue from './components/ApprovalQueue.jsx';
import PropertiesManager from './components/PropertiesManager.jsx';
import RequestsManager from './components/RequestsManager.jsx';
import UsersManager from './components/UsersManager.jsx';
import VillagesManager from './components/VillagesManager.jsx';
import BrokersManager from './components/BrokersManager.jsx';
import RequirementsManager from './components/RequirementsManager.jsx';
import ListingRequestsManager from './components/ListingRequestsManager.jsx';
import { InquiriesManager, ReviewsManager, CatalogManager, AuditViewer } from './components/MiscManagers.jsx';
import CmsManager from './components/CmsManager.jsx';
import AdminNotificationBell from './components/AdminNotificationBell.jsx';
import { useAdminNotifications } from '../../hooks/useAdminNotifications.js';
import { useSeo } from '../../hooks/useSeo.js';
import './AdminDashboard.css';

function resolveTargetTab(eventType, entityType) {
  const key = `${eventType || ''}|${entityType || ''}`.toLowerCase();
  if (key.includes('booking')) return 'rentals';
  if (key.includes('purchase')) return 'purchases';
  if (key.includes('listing-request') || key.includes('propertylistingrequest')) return 'listing-requests';
  if (key.includes('broker')) return 'brokers';
  if (key.includes('viewing') || key.includes('requirement')) return 'requirements';
  if (key.includes('inquiry') || key.includes('contact')) return 'inquiries';
  if (key.includes('user')) return 'users';
  if (key.includes('property')) return key.includes('pending') ? 'approvals' : 'properties';
  return 'overview';
}

export default function AdminDashboard() {
  const { t, isRtl } = useSettings();
  const { user } = useAuth();

  const tabs = useMemo(
    () => [
      { id: 'overview', label: t('admin.tabs.overview', isRtl ? 'نظرة عامة' : 'Overview'), icon: 'bi-speedometer2' },
      { id: 'approvals', label: t('admin.tabs.approvals', isRtl ? 'الموافقات' : 'Approvals'), icon: 'bi-check2-square' },
      { id: 'properties', label: t('admin.tabs.properties', isRtl ? 'إدارة العقارات' : 'Properties'), icon: 'bi-buildings' },
      { id: 'listing-requests', label: t('admin.tabs.listingRequests', isRtl ? 'طلبات عرض العقارات' : 'Listing Requests'), icon: 'bi-houses' },
      { id: 'villages', label: t('admin.tabs.villages', isRtl ? 'قرى ومناطق الساحل' : 'Villages & Zones'), icon: 'bi-geo-alt' },
      { id: 'purchases', label: t('admin.tabs.purchases', isRtl ? 'طلبات الشراء' : 'Purchases'), icon: 'bi-bag' },
      { id: 'rentals', label: t('admin.tabs.rentals', isRtl ? 'طلبات الإيجار' : 'Rentals'), icon: 'bi-key' },
      { id: 'brokers', label: t('admin.tabs.brokers', isRtl ? 'الوسطاء العقاريون' : 'Brokers'), icon: 'bi-briefcase' },
      { id: 'requirements', label: t('admin.tabs.requirements', isRtl ? 'طلبات العملاء (Leads)' : 'Client Leads'), icon: 'bi-person-lines-fill' },
      { id: 'users', label: t('admin.tabs.users', isRtl ? 'المستخدمون' : 'Users'), icon: 'bi-people' },
      { id: 'inquiries', label: t('admin.tabs.inquiries', isRtl ? 'الاستفسارات' : 'Inquiries'), icon: 'bi-envelope' },
      { id: 'reviews', label: t('admin.tabs.reviews', isRtl ? 'التقييمات' : 'Reviews'), icon: 'bi-star' },
      { id: 'catalog', label: t('admin.tabs.catalog', isRtl ? 'المصنفات والدليل' : 'Catalog'), icon: 'bi-tags' },
      { id: 'cms', label: t('admin.tabs.cms', isRtl ? 'محتوى الموقع' : 'Website Content'), icon: 'bi-palette' },
      { id: 'audit', label: t('admin.tabs.audit', isRtl ? 'سجل العمليات' : 'Audit Logs'), icon: 'bi-journal-text' },
    ],
    [t, isRtl]
  );

  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [state, setState] = useState('loading');
  const [menuOpen, setMenuOpen] = useState(false);

  const activeTab = tabs.find((x) => x.id === tab);

  useSeo({
    title: `${activeTab?.label || t('admin.title', 'Admin')} | ${t('common.darcom', 'Darcom')}`,
  });

  const loadStats = useCallback(async () => {
    try {
      const res = await adminService.dashboard();
      setStats(res.data);
      setState('done');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const [tabRefresh, setTabRefresh] = useState({});
  const [liveAlert, setLiveAlert] = useState(null);

  const handleRealtimeNotification = useCallback((payload) => {
    loadStats();
    const target = resolveTargetTab(payload?.eventType, payload?.relatedEntityType);
    setTabRefresh((prev) => {
      const next = { ...prev, [target]: (prev[target] || 0) + 1 };
      if (target === 'approvals' || target === 'properties') {
        next.approvals = (prev.approvals || 0) + 1;
        next.properties = (prev.properties || 0) + 1;
      }
      return next;
    });
    if (payload?.title) {
      setLiveAlert({
        id: payload.notificationId || Date.now(),
        title: payload.title,
        message: payload.message || '',
        targetTab: target,
      });
    }
  }, [loadStats]);

  useEffect(() => {
    if (!liveAlert) return undefined;
    const timer = setTimeout(() => setLiveAlert(null), 6000);
    return () => clearTimeout(timer);
  }, [liveAlert]);

  const {
    notifications,
    unreadCount,
    connectionState,
    markRead,
    markAllRead,
  } = useAdminNotifications({
    enabled: true,
    onNotification: handleRealtimeNotification,
  });

  const go = (next) => {
    setTab(next);
    setMenuOpen(false);
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <img src="/logo-white.png" alt="Darcom" className="admin-brand-logo" />
          <span>
            <strong>{t('admin.brand', isRtl ? 'إدارة داركم' : 'Darcom Admin')}</strong>
            <em>{user?.fullName}</em>
          </span>
        </div>
        <nav aria-label="Admin sections">
          {tabs.map((tItem) => (
            <button
              key={tItem.id}
              type="button"
              className={tab === tItem.id ? 'active' : ''}
              onClick={() => go(tItem.id)}
            >
              <i className={`bi ${tItem.icon}`}></i>
              <span>{tItem.label}</span>
              {tItem.id === 'approvals' && stats?.pendingProperties > 0 && (
                <span className="tab-badge">{stats.pendingProperties}</span>
              )}
            </button>
          ))}
        </nav>
        <a href="/" className="admin-exit">
          <i className={`bi ${isRtl ? 'bi-arrow-right' : 'bi-arrow-left'} me-1`}></i>
          <span>{t('admin.backToSite', isRtl ? 'العودة للموقع' : 'Back to site')}</span>
        </a>
      </aside>

      <main id="main-content" className="admin-main">
        <div className="admin-topbar">
          <button
            type="button"
            className="d-lg-none btn btn-outline-secondary btn-sm"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <i className="bi bi-list me-1"></i>
            <span>{t('admin.menu', isRtl ? 'القائمة' : 'Menu')}</span>
          </button>
          <h1 className="font-display">{activeTab?.label}</h1>
          <AdminNotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            connectionState={connectionState}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onSelectNotification={(item) => {
              const target = resolveTargetTab(item.type, item.relatedEntityType);
              setTab(target);
            }}
          />
        </div>

        {liveAlert && (
          <div className="admin-live-toast" role="status">
            <div>
              <strong>{liveAlert.title}</strong>
              {liveAlert.message && <span className="ms-2 opacity-75">{liveAlert.message}</span>}
            </div>
            <div className="d-flex align-items-center gap-2">
              {liveAlert.targetTab && liveAlert.targetTab !== tab && (
                <button
                  type="button"
                  className="admin-live-toast-action"
                  onClick={() => {
                    setTab(liveAlert.targetTab);
                    setLiveAlert(null);
                  }}
                >
                  {isRtl ? 'عرض' : 'View'}
                </button>
              )}
              <button
                type="button"
                className="admin-live-toast-close"
                aria-label="Close"
                onClick={() => setLiveAlert(null)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
          </div>
        )}

        {tab === 'overview' && (
          <>
            {state === 'loading' && <LoadingSkeleton count={4} />}
            {state === 'error' && (
              <ErrorState
                error={t('admin.metricsError', 'Could not load dashboard metrics.')}
                onRetry={loadStats}
              />
            )}
            {state === 'done' && (
              <>
                <AdminStats stats={stats} onJump={go} />
                <h2 className="admin-subhead font-display">
                  {t('admin.needsAttention', isRtl ? 'تتطلب المراجعة والاعتماد' : 'Needs attention')}
                </h2>
                <ApprovalQueue onChanged={loadStats} refreshTrigger={tabRefresh.approvals || 0} />
              </>
            )}
          </>
        )}

        {tab === 'approvals' && <ApprovalQueue onChanged={loadStats} refreshTrigger={tabRefresh.approvals || 0} />}
        {tab === 'properties' && <PropertiesManager onChanged={loadStats} refreshTrigger={tabRefresh.properties || 0} />}
        {tab === 'listing-requests' && <ListingRequestsManager refreshTrigger={tabRefresh['listing-requests'] || 0} />}
        {tab === 'villages' && <VillagesManager />}
        {tab === 'purchases' && <RequestsManager kind="purchase" onChanged={loadStats} refreshTrigger={tabRefresh.purchases || 0} />}
        {tab === 'rentals' && <RequestsManager kind="booking" onChanged={loadStats} refreshTrigger={tabRefresh.rentals || 0} />}
        {tab === 'brokers' && <BrokersManager refreshTrigger={tabRefresh.brokers || 0} />}
        {tab === 'requirements' && <RequirementsManager refreshTrigger={tabRefresh.requirements || 0} />}
        {tab === 'users' && <UsersManager onChanged={loadStats} refreshTrigger={tabRefresh.users || 0} />}
        {tab === 'inquiries' && <InquiriesManager refreshTrigger={tabRefresh.inquiries || 0} />}
        {tab === 'reviews' && <ReviewsManager onChanged={loadStats} />}
        {tab === 'catalog' && <CatalogManager />}
        {tab === 'cms' && <CmsManager />}
        {tab === 'audit' && <AuditViewer />}
      </main>
    </div>
  );
}
