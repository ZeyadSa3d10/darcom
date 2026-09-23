import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { userService } from '../../services/userService.js';
import { purchaseService } from '../../services/purchaseService.js';
import { useSeo } from '../../hooks/useSeo.js';
import './Profile.css';

export default function Profile() {
  const { t, isRtl } = useSettings();
  const { user, refreshUser, logout, isAdmin } = useAuth();
  const toast = useToast();

  useSeo({
    title: `${t('profile.title', 'My Account')} | ${t('common.darcom', 'Darcom')}`,
    description: t('profile.subtitle', 'Manage your luxury property requests and account settings.'),
  });

  const [tab, setTab] = useState('requests');

  // Personal Info Form
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Sync profile when user updates
  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user]);

  // Password Form
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwMsg, setPwMsg] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Requests
  const [purchases, setPurchases] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reqKind, setReqKind] = useState('purchases');
  const [reqLoading, setReqLoading] = useState(true);

  // Notifications
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
      // Non-fatal; keep lists empty
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
      // Non-fatal
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
      toast.success(t('profile.settings.savedSuccess', 'Profile updated successfully.'));
    } catch (err) {
      setProfileErrors(mapFieldErrors(err));
      toast.error(err.message || t('common.error', 'Could not save profile.'));
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
      setPwMsg(t('profile.settings.passwordSuccess', 'Password changed successfully.'));
      toast.success(t('profile.settings.passwordSuccess', 'Password changed successfully.'));
    } catch (err) {
      const fields = mapFieldErrors(err);
      setPwErrors(fields);
      if (!Object.keys(fields).length) {
        setPwMsg(err.message || t('common.error', 'Could not change password.'));
      }
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

  // Helper: Initials
  const getInitials = (name) => {
    if (!name) return 'DA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper: Role Info
  const getRoleInfo = (role) => {
    const r = (role || 'Buyer').toLowerCase();
    if (r === 'admin') {
      return {
        label: t('profile.roles.admin', 'System Administrator'),
        cls: 'badge-role-admin',
        icon: 'bi-shield-check',
      };
    }
    if (r === 'agent') {
      return {
        label: t('profile.roles.agent', 'Real Estate Advisor'),
        cls: 'badge-role-agent',
        icon: 'bi-briefcase-fill',
      };
    }
    if (r === 'seller') {
      return {
        label: t('profile.roles.seller', 'Property Owner'),
        cls: 'badge-role-seller',
        icon: 'bi-house-fill',
      };
    }
    return {
      label: t('profile.roles.buyer', 'Darcom Member'),
      cls: 'badge-role-buyer',
      icon: 'bi-person-fill',
    };
  };

  // Helper: Status Info
  const getStatusInfo = (status) => {
    const s = (status || '').toLowerCase();
    const map = {
      pending: { label: t('profile.statuses.pending', 'Pending Review'), cls: 'status-pending', icon: 'bi-clock' },
      approved: { label: t('profile.statuses.approved', 'Approved'), cls: 'status-approved', icon: 'bi-check-circle' },
      contacted: { label: t('profile.statuses.contacted', 'Contacted'), cls: 'status-contacted', icon: 'bi-chat-dots' },
      completed: { label: t('profile.statuses.completed', 'Completed'), cls: 'status-completed', icon: 'bi-patch-check-fill' },
      cancelled: { label: t('profile.statuses.cancelled', 'Cancelled'), cls: 'status-cancelled', icon: 'bi-x-circle' },
      rejected: { label: t('profile.statuses.rejected', 'Rejected'), cls: 'status-rejected', icon: 'bi-slash-circle' },
      published: { label: t('profile.statuses.published', 'Published'), cls: 'status-published', icon: 'bi-check2' },
      sold: { label: t('profile.statuses.sold', 'Sold'), cls: 'status-sold', icon: 'bi-lock-fill' },
      rented: { label: t('profile.statuses.rented', 'Rented'), cls: 'status-rented', icon: 'bi-key-fill' },
    };
    return map[s] || { label: status || '—', cls: 'status-default', icon: 'bi-info-circle' };
  };

  // Helper: Date Format
  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      });
    } catch {
      return dateString;
    }
  };

  const rows = reqKind === 'purchases' ? purchases : bookings;
  const roleInfo = getRoleInfo(user?.role);
  const totalRequestsCount = purchases.length + bookings.length;

  const breadcrumbs = [
    { label: t('nav.home', isRtl ? 'الرئيسية' : 'Home'), to: '/' },
    { label: t('profile.breadcrumb', isRtl ? 'حسابي' : 'My Account') },
  ];

  return (
    <main id="main-content" className="darcom-profile-page">
      <div className="container">
        {/* Breadcrumb Row */}
        <div className="profile-breadcrumb-wrap">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        {/* 1. Profile Hero Identity Card */}
        <header className="profile-hero-card">
          <div className="profile-hero-main">
            {/* User Avatar */}
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-circle" aria-hidden="true">
                {getInitials(user?.fullName)}
              </div>
              <span className="profile-avatar-status-dot" title="Active"></span>
            </div>

            {/* User Details */}
            <div className="profile-user-info">
              <div className="profile-user-title-row">
                <h1 className="profile-user-name font-display">{user?.fullName || t('common.darcom', 'Darcom')}</h1>
                <div className="profile-badge-group">
                  <span className={`profile-role-badge ${roleInfo.cls}`}>
                    <i className={`bi ${roleInfo.icon}`}></i>
                    <span>{roleInfo.label}</span>
                  </span>
                  <span className="profile-verified-badge">
                    <i className="bi bi-patch-check-fill text-gold"></i>
                    <span>{t('profile.verifiedBadge', isRtl ? 'حساب موثق ومفعل' : 'Verified Account')}</span>
                  </span>
                </div>
              </div>

              <div className="profile-meta-list">
                <span className="profile-meta-item">
                  <i className="bi bi-envelope"></i>
                  <span>{user?.email}</span>
                </span>
                {user?.phoneNumber && (
                  <span className="profile-meta-item">
                    <i className="bi bi-telephone"></i>
                    <span dir="ltr">{user.phoneNumber}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="profile-hero-actions">
              <Link to="/favorites" className="profile-action-btn favorites-btn" title={t('profile.actions.favorites', 'Saved Properties')}>
                <i className="bi bi-heart-fill"></i>
                <span>{t('profile.actions.favorites', isRtl ? 'العقارات المفضلة' : 'Saved Properties')}</span>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="profile-action-btn admin-btn" title={t('profile.actions.adminPanel', 'Admin Dashboard')}>
                  <i className="bi bi-shield-lock-fill"></i>
                  <span>{t('profile.actions.adminPanel', isRtl ? 'لوحة الإدارة' : 'Admin Panel')}</span>
                </Link>
              )}
              <button
                type="button"
                className="profile-action-btn logout-btn"
                onClick={logout}
                title={t('profile.actions.logout', 'Log Out')}
              >
                <i className="bi bi-box-arrow-right"></i>
                <span>{t('profile.actions.logout', isRtl ? 'تسجيل الخروج' : 'Log Out')}</span>
              </button>
            </div>
          </div>

          {/* Stats Ribbon */}
          <div className="profile-stats-ribbon">
            <div className="profile-stat-box">
              <div className="stat-icon-bubble">
                <i className="bi bi-file-earmark-text-fill"></i>
              </div>
              <div className="stat-meta">
                <strong>{totalRequestsCount}</strong>
                <span>{t('profile.stats.totalRequests', isRtl ? 'إجمالي الطلبات' : 'Total Inquiries')}</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-icon-bubble">
                <i className="bi bi-house-check-fill"></i>
              </div>
              <div className="stat-meta">
                <strong>{purchases.length}</strong>
                <span>{t('profile.stats.purchases', isRtl ? 'طلبات الشراء' : 'Purchase Inquiries')}</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-icon-bubble">
                <i className="bi bi-key-fill"></i>
              </div>
              <div className="stat-meta">
                <strong>{bookings.length}</strong>
                <span>{t('profile.stats.rentals', isRtl ? 'طلبات الإيجار' : 'Rental Bookings')}</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-icon-bubble">
                <i className="bi bi-bell-fill"></i>
              </div>
              <div className="stat-meta">
                <strong>{notifications.length}</strong>
                <span>{t('profile.stats.notifications', isRtl ? 'الإشعارات' : 'Notifications')}</span>
                {unread > 0 && <span className="stat-unread-pill">{unread}</span>}
              </div>
            </div>
          </div>
        </header>

        {/* 2. Navigation Tabs */}
        <div className="profile-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'requests'}
            className={`profile-tab-btn ${tab === 'requests' ? 'active' : ''}`}
            onClick={() => setTab('requests')}
          >
            <i className="bi bi-card-checklist"></i>
            <span>{t('profile.tabs.requests', isRtl ? 'طلباتي والمعاملات' : 'My Requests')}</span>
            <span className="tab-counter-badge">{totalRequestsCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'notifications'}
            className={`profile-tab-btn ${tab === 'notifications' ? 'active' : ''}`}
            onClick={() => setTab('notifications')}
          >
            <i className="bi bi-bell"></i>
            <span>{t('profile.tabs.notifications', isRtl ? 'الإشعارات' : 'Notifications')}</span>
            {unread > 0 ? (
              <span className="tab-counter-badge unread">{unread}</span>
            ) : (
              <span className="tab-counter-badge">{notifications.length}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'settings'}
            className={`profile-tab-btn ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
          >
            <i className="bi bi-person-gear"></i>
            <span>{t('profile.tabs.settings', isRtl ? 'البيانات والأمان' : 'Profile & Security')}</span>
          </button>
        </div>

        {/* 3. Tab Contents */}

        {/* TAB 1: REQUESTS */}
        {tab === 'requests' && (
          <section className="profile-tab-panel" aria-label={t('profile.tabs.requests', 'My Requests')}>
            {/* Kind Switcher Pills */}
            <div className="req-kind-bar">
              <button
                type="button"
                className={`req-kind-pill ${reqKind === 'purchases' ? 'active' : ''}`}
                onClick={() => setReqKind('purchases')}
              >
                <i className="bi bi-house-check"></i>
                <span>{t('profile.reqKind.purchases', isRtl ? 'طلبات الشراء' : 'Purchases')}</span>
                <span className="pill-badge">{purchases.length}</span>
              </button>
              <button
                type="button"
                className={`req-kind-pill ${reqKind === 'bookings' ? 'active' : ''}`}
                onClick={() => setReqKind('bookings')}
              >
                <i className="bi bi-key"></i>
                <span>{t('profile.reqKind.rentals', isRtl ? 'طلبات الإيجار' : 'Rentals')}</span>
                <span className="pill-badge">{bookings.length}</span>
              </button>
            </div>

            {reqLoading ? (
              <div className="profile-loading-box">
                <LoadingSkeleton count={4} />
              </div>
            ) : rows.length === 0 ? (
              <div className="profile-empty-card">
                <EmptyState
                  icon={reqKind === 'purchases' ? 'bi-house-slash' : 'bi-key'}
                  title={
                    reqKind === 'purchases'
                      ? t('profile.emptyPurchases.title', isRtl ? 'لا توجد طلبات شراء مسجلة حتى الآن' : 'No purchase inquiries yet')
                      : t('profile.emptyRentals.title', isRtl ? 'لا توجد طلبات إيجار مسجلة حتى الآن' : 'No rental requests yet')
                  }
                  message={
                    reqKind === 'purchases'
                      ? t(
                          'profile.emptyPurchases.message',
                          isRtl
                            ? 'عند تقديم طلب شراء أو استفسار عن أي عقار، سيظهر هنا مع رقم المعاملة وحالتها للمتابعة المباشرة.'
                            : 'When you inquire or request to purchase a property, it appears here with its tracking reference and status.'
                        )
                      : t(
                          'profile.emptyRentals.message',
                          isRtl
                            ? 'حجوزات الإيجار الموسمي أو السنوي للوحدات والفلل الشاطئية ستظهر هنا فور تسجيلها.'
                            : 'Your seasonal and annual rental booking requests will appear here with confirmation dates.'
                        )
                  }
                  actionLabel={
                    reqKind === 'purchases'
                      ? t('profile.emptyPurchases.action', isRtl ? 'تصفح نخبة العقارات' : 'Browse Premier Residences')
                      : t('profile.emptyRentals.action', isRtl ? 'استكشف شاليهات وفلل الإيجار' : 'Explore Rental Chalets & Villas')
                  }
                  actionTo={reqKind === 'purchases' ? '/properties?purpose=sale' : '/properties?purpose=rent'}
                />
              </div>
            ) : (
              <div className="request-cards-grid">
                {rows.map((r) => {
                  const statusObj = getStatusInfo(r.status);
                  const propLink = r.property?.slug
                    ? `/properties/${r.property.slug}`
                    : r.propertyId
                    ? `/properties/${r.propertyId}`
                    : null;

                  return (
                    <article key={r.id} className="request-item-card">
                      <div className="request-card-header">
                        <div className="req-ref-box">
                          <i className="bi bi-hash text-gold"></i>
                          <strong>{r.requestNumber || `DAR-${r.id}`}</strong>
                        </div>
                        <span className={`badge-status-pill ${statusObj.cls}`}>
                          <i className={`bi ${statusObj.icon}`}></i>
                          <span>{statusObj.label}</span>
                        </span>
                      </div>

                      <div className="request-card-body">
                        <h3 className="request-prop-name">
                          {propLink ? (
                            <Link to={propLink}>{r.property?.title || t('profile.requests.property', 'Property')}</Link>
                          ) : (
                            r.property?.title || t('profile.requests.property', 'Property')
                          )}
                        </h3>

                        <div className="request-card-meta">
                          <span className="req-meta-item">
                            <i className="bi bi-calendar3"></i>
                            <span>{formatDate(r.createdAt)}</span>
                          </span>
                          {r.property?.price && (
                            <span className="req-meta-item">
                              <i className="bi bi-tag"></i>
                              <span>{Number(r.property.price).toLocaleString('en-US')} {t('common.egp', 'EGP')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {propLink && (
                        <div className="request-card-footer">
                          <Link to={propLink} className="btn-view-property">
                            <span>{t('profile.requests.viewProperty', isRtl ? 'معاينة العقار' : 'View Property')}</span>
                            <i className={`bi ${isRtl ? 'bi-arrow-left-short' : 'bi-arrow-right-short'}`}></i>
                          </Link>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: NOTIFICATIONS */}
        {tab === 'notifications' && (
          <section className="profile-tab-panel" aria-label={t('profile.tabs.notifications', 'Notifications')}>
            <div className="notifications-header-row">
              <div className="notifications-title-box">
                <h2>{t('profile.notifications.title', isRtl ? 'سجل الإشعارات والتحديثات' : 'Activity Notifications')}</h2>
                {unread > 0 && (
                  <span className="unread-counter-tag">
                    {unread} {t('profile.notifications.unreadBadge', isRtl ? 'غير مقروء' : 'Unread')}
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button type="button" className="btn-mark-all" onClick={markAll}>
                  <i className="bi bi-check2-all"></i>
                  <span>{t('profile.notifications.markAll', isRtl ? 'تحديد الكل كمقروء' : 'Mark All as Read')}</span>
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="profile-empty-card">
                <EmptyState
                  icon="bi-bell-slash"
                  title={t('profile.notifications.emptyTitle', isRtl ? 'لا توجد إشعارات حالياً' : 'No notifications yet')}
                  message={t(
                    'profile.notifications.emptyMessage',
                    isRtl
                      ? 'ستظهر هنا كافة الإشعارات الرسمية المتعلقة بمواعيد المعاينات وتحديثات طلباتك العقارية.'
                      : 'Official updates about your inquiries, property inspections, and agreements will appear here.'
                  )}
                />
              </div>
            ) : (
              <div className="notifications-cards-stack">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`notification-item-card ${n.isRead ? 'read' : 'unread'}`}
                    onClick={() => markOne(n.id)}
                  >
                    <div className="notification-icon-bubble">
                      <i className={`bi ${n.isRead ? 'bi-bell' : 'bi-bell-fill'}`}></i>
                    </div>
                    <div className="notification-content">
                      <div className="notification-headline-row">
                        <strong className="notification-title">{n.title}</strong>
                        <span className="notification-time">
                          <i className="bi bi-clock"></i>
                          <span>{formatDate(n.createdAt, true)}</span>
                        </span>
                      </div>
                      <p className="notification-body">{n.body}</p>
                    </div>
                    {!n.isRead && (
                      <span
                        className="notification-unread-dot"
                        title={t('profile.notifications.unreadBadge', 'Unread')}
                      ></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: SETTINGS & SECURITY */}
        {tab === 'settings' && (
          <section className="profile-tab-panel" aria-label={t('profile.tabs.settings', 'Profile & Security')}>
            <div className="settings-cards-grid">
              {/* Form 1: Personal Details */}
              <form onSubmit={saveProfile} noValidate className="settings-card-surface">
                <div className="settings-card-header">
                  <div className="settings-icon-bubble">
                    <i className="bi bi-person-bounding-box"></i>
                  </div>
                  <div>
                    <h2 className="settings-card-title">
                      {t('profile.settings.personalTitle', isRtl ? 'البيانات الشخصية' : 'Personal Profile')}
                    </h2>
                    <p className="settings-card-subtitle">
                      {t(
                        'profile.settings.personalSubtitle',
                        isRtl
                          ? 'تأكد من دقة بيانات الاتصال لتسهيل التواصل المباشر مع كبار المستشارين وتوثيق العقود.'
                          : 'Keep your contact information up-to-date for prompt advisory assistance and official contracts.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="settings-form-fields">
                  <FormField
                    id="pf-name"
                    label={t('profile.settings.fullNameLabel', isRtl ? 'الاسم الكامل' : 'Full Name')}
                    required
                    error={profileErrors.fullName}
                  >
                    <div className="input-with-icon">
                      <i className="bi bi-person input-icon"></i>
                      <input
                        id="pf-name"
                        className={`form-control ${profileErrors.fullName ? 'is-invalid' : ''}`}
                        value={profile.fullName}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                        placeholder={isRtl ? 'أدخل اسمك الكامل' : 'Enter full name'}
                      />
                    </div>
                  </FormField>

                  <FormField
                    id="pf-phone"
                    label={t('profile.settings.phoneLabel', isRtl ? 'رقم الهاتف للتواصل' : 'Phone Number')}
                    error={profileErrors.phoneNumber}
                  >
                    <div className="input-with-icon">
                      <i className="bi bi-telephone input-icon"></i>
                      <input
                        id="pf-phone"
                        type="tel"
                        dir="ltr"
                        className={`form-control ${profileErrors.phoneNumber ? 'is-invalid' : ''}`}
                        value={profile.phoneNumber || ''}
                        onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                        placeholder="+20 100 000 0000"
                      />
                    </div>
                  </FormField>

                  <FormField
                    id="pf-email"
                    label={t('profile.settings.emailLabel', isRtl ? 'البريد الإلكتروني للحساب' : 'Account Email')}
                    hint={t('profile.settings.emailLockedHint', isRtl ? 'البريد الإلكتروني موثق ومقفل لضمان أمان حسابك.' : 'Your account email is verified and locked for security.')}
                  >
                    <div className="input-with-icon disabled">
                      <i className="bi bi-lock-fill input-icon text-muted"></i>
                      <input
                        id="pf-email"
                        type="email"
                        disabled
                        className="form-control"
                        value={user?.email || ''}
                      />
                    </div>
                  </FormField>
                </div>

                <div className="settings-form-actions">
                  <button type="submit" className="btn btn-brand" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <span>{t('profile.settings.saving', isRtl ? 'جارٍ الحفظ…' : 'Saving…')}</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2 me-1"></i>
                        <span>{t('profile.settings.saveBtn', isRtl ? 'حفظ التغييرات' : 'Save Changes')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Form 2: Change Password */}
              <form onSubmit={changePassword} noValidate className="settings-card-surface">
                <div className="settings-card-header">
                  <div className="settings-icon-bubble">
                    <i className="bi bi-shield-lock-fill"></i>
                  </div>
                  <div>
                    <h2 className="settings-card-title">
                      {t('profile.settings.passwordTitle', isRtl ? 'أمان الحساب وكلمة المرور' : 'Account Security')}
                    </h2>
                    <p className="settings-card-subtitle">
                      {t(
                        'profile.settings.passwordSubtitle',
                        isRtl
                          ? 'قم بتعيين كلمة مرور قوية لحماية معاملاتك وسجلاتك العقارية الخاصة.'
                          : 'Update your password regularly to protect your confidential property transactions.'
                      )}
                    </p>
                  </div>
                </div>

                {pwMsg && (
                  <div className="alert alert-info d-flex align-items-center gap-2 mb-4" role="status">
                    <i className="bi bi-info-circle-fill flex-shrink-0"></i>
                    <span>{pwMsg}</span>
                  </div>
                )}

                <div className="settings-form-fields">
                  <FormField
                    id="pw-current"
                    label={t('profile.settings.currentPasswordLabel', isRtl ? 'كلمة المرور الحالية' : 'Current Password')}
                    required
                    error={pwErrors.currentPassword}
                  >
                    <div className="input-with-icon password-toggle-box">
                      <i className="bi bi-key input-icon"></i>
                      <input
                        id="pw-current"
                        type={showCurrentPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`form-control ${pwErrors.currentPassword ? 'is-invalid' : ''}`}
                        value={pw.currentPassword}
                        onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowCurrentPw((v) => !v)}
                        aria-label="Toggle current password visibility"
                      >
                        <i className={`bi ${showCurrentPw ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </FormField>

                  <FormField
                    id="pw-new"
                    label={t('profile.settings.newPasswordLabel', isRtl ? 'كلمة المرور الجديدة' : 'New Password')}
                    required
                    error={pwErrors.newPassword}
                    hint={t('profile.settings.passwordHint', isRtl ? 'يجب ألا تقل عن 8 أحرف وأرقام مع مراعاة قوة التشفير.' : 'Minimum 8 characters with a mix of letters and numbers.')}
                  >
                    <div className="input-with-icon password-toggle-box">
                      <i className="bi bi-lock input-icon"></i>
                      <input
                        id="pw-new"
                        type={showNewPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        className={`form-control ${pwErrors.newPassword ? 'is-invalid' : ''}`}
                        value={pw.newPassword}
                        onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowNewPw((v) => !v)}
                        aria-label="Toggle new password visibility"
                      >
                        <i className={`bi ${showNewPw ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </FormField>
                </div>

                <div className="settings-form-actions">
                  <button type="submit" className="btn btn-outline-brand" disabled={pwBusy}>
                    {pwBusy ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <span>{t('profile.settings.changing', isRtl ? 'جارٍ التحديث…' : 'Updating…')}</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-shield-check me-1"></i>
                        <span>{t('profile.settings.changePasswordBtn', isRtl ? 'تحديث كلمة المرور' : 'Update Password')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
