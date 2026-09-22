import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { userService } from '../../services/userService.js';
import { purchaseService } from '../../services/purchaseService.js';
import './Profile.css';
import { useSeo } from '../../hooks/useSeo.js';

function RequestRow({ r }) {
  return (
    <div className="request-row">
      <div>
        <strong>{r.requestNumber}</strong>
        <span className="text-meta"> · {r.property?.title}</span>
        <div className="text-meta">{new Date(r.createdAt).toLocaleDateString()}</div>
      </div>
      <span className="badge-status">{r.status}</span>
    </div>
  );
}

export default function Profile() {
  useSeo({ title: 'My account | Darcom' });
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('requests');

  const [profile, setProfile] = useState({ fullName: user?.fullName || '', phoneNumber: user?.phoneNumber || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwMsg, setPwMsg] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const [purchases, setPurchases] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reqKind, setReqKind] = useState('purchases');
  const [reqLoading, setReqLoading] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const [p, b] = await Promise.all([
        purchaseService.myPurchases(1, 20),
        purchaseService.myBookings(1, 20),
      ]);
      setPurchases(p.data?.data ?? []);
      setBookings(b.data?.data ?? []);
    } catch {
      // Lists stay empty; notifications carry the details.
    } finally {
      setReqLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const [n, u] = await Promise.all([
        purchaseService.notifications(1, 20),
        purchaseService.unreadCount(),
      ]);
      setNotifications(n.data?.data ?? []);
      setUnread(u.data ?? 0);
    } catch {
      // Non-fatal.
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadNotifications();
  }, [loadRequests, loadNotifications]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileErrors({});
    try {
      await userService.updateMe(profile);
      await refreshUser();
      toast.success('Profile updated.');
    } catch (err) {
      setProfileErrors(mapFieldErrors(err));
      toast.error(err.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwBusy(true);
    setPwErrors({});
    setPwMsg('');
    try {
      await userService.changePassword(pw);
      setPw({ currentPassword: '', newPassword: '' });
      setPwMsg('Password changed. Other devices were logged out.');
    } catch (err) {
      const fields = mapFieldErrors(err);
      setPwErrors(fields);
      if (!Object.keys(fields).length) setPwMsg(err.message || 'Could not change password.');
    } finally {
      setPwBusy(false);
    }
  };

  const markAll = async () => {
    await purchaseService.markAllRead();
    loadNotifications();
  };

  const markOne = async (id) => {
    await purchaseService.markRead(id);
    loadNotifications();
  };

  const rows = reqKind === 'purchases' ? purchases : bookings;

  return (
    <main id="main-content" className="container profile-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My account' }]} />
      <div className="profile-head">
        <div>
          <h1 className="font-display">{user?.fullName}</h1>
          <p className="text-meta">{user?.email} · {user?.role}</p>
        </div>
        <div className="profile-head-actions">
          <Link to="/favorites" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-heart me-1"></i>My favorites
          </Link>
          <button type="button" className="btn btn-link btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="profile-tabs" role="tablist">
        {[
          { id: 'requests', label: 'My requests' },
          { id: 'notifications', label: `Notifications${unread ? ` (${unread})` : ''}` },
          { id: 'settings', label: 'Profile & password' },
        ].map((t) => (
          <button
            key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <section>
          <div className="req-kind">
            <button type="button" className={reqKind === 'purchases' ? 'active' : ''} onClick={() => setReqKind('purchases')}>
              Purchases ({purchases.length})
            </button>
            <button type="button" className={reqKind === 'bookings' ? 'active' : ''} onClick={() => setReqKind('bookings')}>
              Rentals ({bookings.length})
            </button>
          </div>
          {reqLoading ? (
            <LoadingSkeleton count={4} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="bi-inbox"
              title={reqKind === 'purchases' ? 'No purchase requests yet.' : 'No rental requests yet.'}
              message="When you request a property, it appears here with its reference number and status."
              actionLabel="Browse properties"
              actionTo="/properties"
            />
          ) : (
            <div className="request-list">
              {rows.map((r) => (
                <RequestRow key={r.id} r={r} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'notifications' && (
        <section>
          {notifications.length > 0 && (
            <button type="button" className="btn btn-link btn-sm mb-3" onClick={markAll}>
              Mark all as read
            </button>
          )}
          {notifications.length === 0 ? (
            <EmptyState icon="bi-bell" title="No notifications." message="Updates about your requests will appear here." />
          ) : (
            <div className="request-list">
              {notifications.map((n) => (
                <button
                  key={n.id} type="button"
                  className={`notification-row ${n.isRead ? '' : 'unread'}`}
                  onClick={() => markOne(n.id)}
                >
                  <div>
                    <strong>{n.title}</strong>
                    <p className="text-meta">{n.body}</p>
                    <span className="text-meta">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  {!n.isRead && <span className="dot" aria-label="Unread"></span>}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'settings' && (
        <section className="settings-grid">
          <form onSubmit={saveProfile} noValidate className="settings-card">
            <h3>Profile</h3>
            <FormField id="pf-name" label="Full name" required error={profileErrors.fullName}>
              <input
                id="pf-name" className={`form-control ${profileErrors.fullName ? 'is-invalid' : ''}`}
                value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
            </FormField>
            <FormField id="pf-phone" label="Phone" error={profileErrors.phoneNumber}>
              <input
                id="pf-phone" type="tel" className={`form-control ${profileErrors.phoneNumber ? 'is-invalid' : ''}`}
                value={profile.phoneNumber || ''} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
              />
            </FormField>
            <button type="submit" className="btn btn-brand" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          <form onSubmit={changePassword} noValidate className="settings-card">
            <h3>Change password</h3>
            {pwMsg && <div className="alert alert-info" role="status">{pwMsg}</div>}
            <FormField id="pw-current" label="Current password" required error={pwErrors.currentPassword}>
              <input
                id="pw-current" type="password" autoComplete="current-password"
                className={`form-control ${pwErrors.currentPassword ? 'is-invalid' : ''}`}
                value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              />
            </FormField>
            <FormField id="pw-new" label="New password" required error={pwErrors.newPassword}>
              <input
                id="pw-new" type="password" autoComplete="new-password"
                className={`form-control ${pwErrors.newPassword ? 'is-invalid' : ''}`}
                value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              />
            </FormField>
            <button type="submit" className="btn btn-outline-secondary" disabled={pwBusy}>
              {pwBusy ? 'Changing…' : 'Change password'}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
