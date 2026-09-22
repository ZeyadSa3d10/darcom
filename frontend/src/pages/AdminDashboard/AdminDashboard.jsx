import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import { adminService } from '../../services/adminService.js';
import AdminStats from './components/AdminStats.jsx';
import ApprovalQueue from './components/ApprovalQueue.jsx';
import PropertiesManager from './components/PropertiesManager.jsx';
import RequestsManager from './components/RequestsManager.jsx';
import UsersManager from './components/UsersManager.jsx';
import { InquiriesManager, ReviewsManager, CatalogManager, AuditViewer } from './components/MiscManagers.jsx';
import './AdminDashboard.css';
import { useSeo } from '../../hooks/useSeo.js';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'bi-speedometer2' },
  { id: 'approvals', label: 'Approvals', icon: 'bi-check2-square' },
  { id: 'properties', label: 'Properties', icon: 'bi-buildings' },
  { id: 'purchases', label: 'Purchases', icon: 'bi-bag' },
  { id: 'rentals', label: 'Rentals', icon: 'bi-key' },
  { id: 'users', label: 'Users', icon: 'bi-people' },
  { id: 'inquiries', label: 'Inquiries', icon: 'bi-envelope' },
  { id: 'reviews', label: 'Reviews', icon: 'bi-star' },
  { id: 'catalog', label: 'Catalog', icon: 'bi-tags' },
  { id: 'audit', label: 'Audit logs', icon: 'bi-journal-text' },
];

export default function AdminDashboard() {
  useSeo({ title: 'Admin | Darcom' });
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [state, setState] = useState('loading');
  const [menuOpen, setMenuOpen] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminService.dashboard();
      setStats(res.data);
      setState('done');
    } catch (e) {
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
            <strong>Darcom Admin</strong>
            <em>{user?.fullName}</em>
          </span>
        </div>
        <nav aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id} type="button"
              className={tab === t.id ? 'active' : ''}
              onClick={() => go(t.id)}
            >
              <i className={`bi ${t.icon}`}></i>
              {t.label}
              {t.id === 'approvals' && stats?.pendingProperties > 0 && (
                <span className="tab-badge">{stats.pendingProperties}</span>
              )}
            </button>
          ))}
        </nav>
        <a href="/" className="admin-exit">
          <i className="bi bi-arrow-left me-1"></i>Back to site
        </a>
      </aside>

      <main id="main-content" className="admin-main">
        <div className="admin-topbar">
          <button type="button" className="d-lg-none btn btn-outline-secondary btn-sm" onClick={() => setMenuOpen((o) => !o)}>
            <i className="bi bi-list me-1"></i>Menu
          </button>
          <h1>{TABS.find((t) => t.id === tab)?.label}</h1>
        </div>

        {tab === 'overview' && (
          <>
            {state === 'loading' && <LoadingSkeleton count={4} />}
            {state === 'error' && <ErrorState error="Could not load dashboard metrics." onRetry={loadStats} />}
            {state === 'done' && (
              <>
                <AdminStats stats={stats} onJump={go} />
                <h2 className="admin-subhead">Needs attention</h2>
                <ApprovalQueue onChanged={loadStats} />
              </>
            )}
          </>
        )}

        {tab === 'approvals' && <ApprovalQueue onChanged={loadStats} />}
        {tab === 'properties' && <PropertiesManager onChanged={loadStats} />}
        {tab === 'purchases' && <RequestsManager kind="purchase" onChanged={loadStats} />}
        {tab === 'rentals' && <RequestsManager kind="booking" onChanged={loadStats} />}
        {tab === 'users' && <UsersManager onChanged={loadStats} />}
        {tab === 'inquiries' && <InquiriesManager />}
        {tab === 'reviews' && <ReviewsManager onChanged={loadStats} />}
        {tab === 'catalog' && <CatalogManager />}
        {tab === 'audit' && <AuditViewer />}
      </main>
    </div>
  );
}
