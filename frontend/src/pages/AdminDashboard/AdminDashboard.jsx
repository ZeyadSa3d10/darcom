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
import { InquiriesManager, ReviewsManager, CatalogManager, AuditViewer } from './components/MiscManagers.jsx';
import CmsManager from './components/CmsManager.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { t, isRtl } = useSettings();
  const { user } = useAuth();

  const tabs = useMemo(
    () => [
      { id: 'overview', label: t('admin.tabs.overview', isRtl ? 'نظرة عامة' : 'Overview'), icon: 'bi-speedometer2' },
      { id: 'approvals', label: t('admin.tabs.approvals', isRtl ? 'الموافقات' : 'Approvals'), icon: 'bi-check2-square' },
      { id: 'properties', label: t('admin.tabs.properties', isRtl ? 'إدارة العقارات' : 'Properties'), icon: 'bi-buildings' },
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
        </div>

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
                <ApprovalQueue onChanged={loadStats} />
              </>
            )}
          </>
        )}

        {tab === 'approvals' && <ApprovalQueue onChanged={loadStats} />}
        {tab === 'properties' && <PropertiesManager onChanged={loadStats} />}
        {tab === 'villages' && <VillagesManager />}
        {tab === 'purchases' && <RequestsManager kind="purchase" onChanged={loadStats} />}
        {tab === 'rentals' && <RequestsManager kind="booking" onChanged={loadStats} />}
        {tab === 'brokers' && <BrokersManager />}
        {tab === 'requirements' && <RequirementsManager />}
        {tab === 'users' && <UsersManager onChanged={loadStats} />}
        {tab === 'inquiries' && <InquiriesManager />}
        {tab === 'reviews' && <ReviewsManager onChanged={loadStats} />}
        {tab === 'catalog' && <CatalogManager />}
        {tab === 'cms' && <CmsManager />}
        {tab === 'audit' && <AuditViewer />}
      </main>
    </div>
  );
}
