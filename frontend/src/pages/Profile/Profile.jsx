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
import { brokerService } from '../../services/brokerService.js';
import { requirementService } from '../../services/requirementService.js';
import { listingRequestService } from '../../services/listingRequestService.js';
import Modal from '../../components/Modal/Modal.jsx';
import RentalCalendar from '../../components/RentalCalendar/RentalCalendar.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import './Profile.css';

function getInitials(name) {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Profile() {
  const { t, isRtl } = useSettings();
  const { user, refreshUser, logout, isAdmin } = useAuth();
  const toast = useToast();

  useSeo({
    title: `${t('profile.title', 'My Account')} | ${t('common.darcom', 'Darcom')}`,
    description: t('profile.subtitle', 'Manage your luxury property requests, owner rental periods, and broker portal.'),
  });

  const [tab, setTab] = useState('requests');

  // Personal Info Form
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [saving, setSaving] = useState(false);

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
  const [requirements, setRequirements] = useState([]);
  const [listingRequests, setListingRequests] = useState([]);
  const [reqKind, setReqKind] = useState('purchases');
  const [reqLoading, setReqLoading] = useState(true);

  // Owner Area (My Properties & Confirmed Rental Periods)
  const [ownerProperties, setOwnerProperties] = useState([]);
  const [rentalPeriods, setRentalPeriods] = useState([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [viewCalendarProperty, setViewCalendarProperty] = useState(null);

  // Broker Area
  const [brokerProfile, setBrokerProfile] = useState(null);
  const [brokerRequests, setBrokerRequests] = useState([]);
  const [brokerLoading, setBrokerLoading] = useState(false);
  const [brokerRegistering, setBrokerRegistering] = useState(false);
  const [brokerRegErrors, setBrokerRegErrors] = useState({});
  const [brokerRegForm, setBrokerRegForm] = useState({
    agencyName: '',
    licenseNumber: '',
    nationalId: '',
    documentUrl: '',
  });

  // Broker Client Request Form
  const [submittingClientReq, setSubmittingClientReq] = useState(false);
  const [showClientReqModal, setShowClientReqModal] = useState(false);
  const [clientReqForm, setClientReqForm] = useState({
    propertyId: '',
    clientName: '',
    clientPhone: '',
    purpose: 'Sale',
    startDate: '',
    endDate: '',
    notes: '',
  });

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const [p, b, r, l] = await Promise.all([
        purchaseService.myPurchases(1, 20),
        purchaseService.myBookings(1, 20),
        requirementService.myRequirements(1, 20).catch(() => ({ data: { data: [] } })),
        listingRequestService.myRequests(1, 20).catch(() => ({ data: { data: [] } })),
      ]);
      setPurchases(p.data?.data ?? []);
      setBookings(b.data?.data ?? []);
      setRequirements(r.data?.data ?? []);
      setListingRequests(l.data?.data ?? []);
    } catch {
      // Non-fatal
    } finally {
      setReqLoading(false);
    }
  }, []);

  const loadOwnerData = useCallback(async () => {
    setOwnerLoading(true);
    try {
      const [props, periods] = await Promise.all([
        purchaseService.myProperties(1, 20).catch(() => ({ data: { data: [] } })),
        purchaseService.myRentalPeriods().catch(() => ({ data: [] })),
      ]);
      setOwnerProperties(props.data?.data ?? []);
      setRentalPeriods(periods.data ?? []);
    } catch {
      // Non-fatal
    } finally {
      setOwnerLoading(false);
    }
  }, []);

  const loadBrokerData = useCallback(async () => {
    setBrokerLoading(true);
    try {
      const prof = await brokerService.getProfile().catch(() => null);
      if (prof && prof.data) {
        setBrokerProfile(prof.data);
        if (prof.data.status?.toLowerCase() === 'approved') {
          const reqs = await brokerService.myRequests(1, 20).catch(() => ({ data: { data: [] } }));
          setBrokerRequests(reqs.data?.data ?? []);
        }
      } else {
        setBrokerProfile(null);
      }
    } catch {
      setBrokerProfile(null);
    } finally {
      setBrokerLoading(false);
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
    loadOwnerData();
    loadBrokerData();
  }, [loadRequests, loadNotifications, loadOwnerData, loadBrokerData]);

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

  const handleRegisterBroker = async (e) => {
    e.preventDefault();
    setBrokerRegistering(true);
    setBrokerRegErrors({});
    try {
      await brokerService.register(brokerRegForm);
      toast.success(isRtl ? 'تم تقديم طلب اعتماد الوسيط بنجاح' : 'Broker registration submitted successfully.');
      loadBrokerData();
    } catch (err) {
      setBrokerRegErrors(mapFieldErrors(err));
      toast.error(err.message || (isRtl ? 'فشل تسجيل الوسيط' : 'Failed to submit broker application.'));
    } finally {
      setBrokerRegistering(false);
    }
  };

  const handleCreateBrokerRequest = async (e) => {
    e.preventDefault();
    setSubmittingClientReq(true);
    try {
      await brokerService.createRequest({
        propertyId: Number(clientReqForm.propertyId),
        clientName: clientReqForm.clientName.trim(),
        clientPhone: clientReqForm.clientPhone.trim(),
        purpose: clientReqForm.purpose,
        startDate: clientReqForm.startDate ? new Date(clientReqForm.startDate).toISOString() : null,
        endDate: clientReqForm.endDate ? new Date(clientReqForm.endDate).toISOString() : null,
        notes: clientReqForm.notes.trim() || null,
      });
      toast.success(isRtl ? 'تم تقديم طلب العميل بنجاح' : 'Client request submitted successfully.');
      setShowClientReqModal(false);
      setClientReqForm({
        propertyId: '',
        clientName: '',
        clientPhone: '',
        purpose: 'Sale',
        startDate: '',
        endDate: '',
        notes: '',
      });
      loadBrokerData();
    } catch (err) {
      toast.error(err.message || (isRtl ? 'فشل تقديم طلب العميل' : 'Failed to submit client request.'));
    } finally {
      setSubmittingClientReq(false);
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

  const getStatusInfo = (status) => {
    const s = (status || '').toLowerCase();
    const map = {
      pending: { label: isRtl ? 'قيد المراجعة' : 'Pending Review', cls: 'status-pending', icon: 'bi-clock' },
      approved: { label: isRtl ? 'تمت الموافقة' : 'Approved', cls: 'status-approved', icon: 'bi-check-circle' },
      contacted: { label: isRtl ? 'تم التواصل' : 'Contacted', cls: 'status-contacted', icon: 'bi-chat-dots' },
      inspectionscheduled: { label: isRtl ? 'موعد المعاينة محدد' : 'Inspection Scheduled', cls: 'status-approved', icon: 'bi-calendar-check' },
      inspected: { label: isRtl ? 'تمت المعاينة' : 'Inspected', cls: 'status-contacted', icon: 'bi-camera' },
      qualified: { label: isRtl ? 'مؤهل وجارٍ التنسيق' : 'Qualified', cls: 'status-contacted', icon: 'bi-check-all' },
      completed: { label: isRtl ? 'مكتمل' : 'Completed', cls: 'status-completed', icon: 'bi-patch-check-fill' },
      closed: { label: isRtl ? 'تم الإغلاق بنجاح' : 'Closed', cls: 'status-completed', icon: 'bi-patch-check' },
      cancelled: { label: isRtl ? 'ملغي' : 'Cancelled', cls: 'status-cancelled', icon: 'bi-x-circle' },
      rejected: { label: isRtl ? 'مرفوض' : 'Rejected', cls: 'status-rejected', icon: 'bi-slash-circle' },
      published: { label: isRtl ? 'منشور' : 'Published', cls: 'status-published', icon: 'bi-check2' },
      sold: { label: isRtl ? 'تم البيع' : 'Sold', cls: 'status-sold', icon: 'bi-lock-fill' },
      rented: { label: isRtl ? 'مؤجر' : 'Rented', cls: 'status-rented', icon: 'bi-key-fill' },
    };
    return map[s] || { label: status || '—', cls: 'status-default', icon: 'bi-info-circle' };
  };

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

  const rows = reqKind === 'purchases' ? purchases : reqKind === 'bookings' ? bookings : reqKind === 'requirements' ? requirements : listingRequests;
  const roleInfo = getRoleInfo(user?.role);
  const totalRequestsCount = purchases.length + bookings.length + requirements.length + listingRequests.length;

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
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-circle" aria-hidden="true">
                {getInitials(user?.fullName)}
              </div>
              <span className="profile-avatar-status-dot" title="Active"></span>
            </div>

            <div className="profile-user-info">
              <div className="profile-user-title-row">
                <h1 className="profile-user-name font-display">{user?.fullName || 'Darcom Member'}</h1>
                <div className="profile-badge-group">
                  <span className={`profile-role-badge ${roleInfo.cls}`}>
                    <i className={`bi ${roleInfo.icon}`}></i>
                    <span>{roleInfo.label}</span>
                  </span>
                  {brokerProfile && (
                    <span className={`profile-role-badge status-${brokerProfile.status?.toLowerCase()}`}>
                      <i className="bi bi-briefcase"></i>
                      <span>Broker: {brokerProfile.status}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="profile-meta-list">
                <span className="profile-meta-item">
                  <i className="bi bi-envelope"></i>
                  <span>{user?.email}</span>
                </span>
                {user?.phoneNumber && (
                  <span className="profile-meta-item" dir="ltr">
                    <i className="bi bi-telephone"></i>
                    <span>{user?.phoneNumber}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="profile-hero-actions">
              <Link to="/favorites" className="profile-action-btn favorites-btn" title="Saved Properties">
                <i className="bi bi-heart-fill"></i>
                <span>{isRtl ? 'المفضلة' : 'Saved'}</span>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="profile-action-btn admin-btn" title="Admin Dashboard">
                  <i className="bi bi-shield-lock-fill"></i>
                  <span>{isRtl ? 'لوحة الإدارة' : 'Admin'}</span>
                </Link>
              )}
              <button
                type="button"
                className="profile-action-btn logout-btn"
                onClick={logout}
                title="Log Out"
              >
                <i className="bi bi-box-arrow-right"></i>
                <span>{isRtl ? 'خروج' : 'Log Out'}</span>
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
                <span>{isRtl ? 'إجمالي الطلبات' : 'Total Inquiries'}</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-icon-bubble">
                <i className="bi bi-house-check-fill"></i>
              </div>
              <div className="stat-meta">
                <strong>{purchases.length}</strong>
                <span>{isRtl ? 'طلبات الشراء' : 'Purchases'}</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-icon-bubble">
                <i className="bi bi-key-fill"></i>
              </div>
              <div className="stat-meta">
                <strong>{bookings.length}</strong>
                <span>{isRtl ? 'طلبات الإيجار' : 'Rentals'}</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-icon-bubble">
                <i className="bi bi-calendar2-range"></i>
              </div>
              <div className="stat-meta">
                <strong>{rentalPeriods.length}</strong>
                <span>{isRtl ? 'فترات الإيجار المؤكدة' : 'Confirmed Stays'}</span>
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
            <span>{isRtl ? 'طلباتي والمعاملات' : 'My Requests'}</span>
            <span className="tab-counter-badge">{totalRequestsCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'owner'}
            className={`profile-tab-btn ${tab === 'owner' ? 'active' : ''}`}
            onClick={() => setTab('owner')}
          >
            <i className="bi bi-house-heart"></i>
            <span>{isRtl ? 'بوابة المالك والإيجارات' : 'Owner Area & Rentals'}</span>
            {rentalPeriods.length > 0 && <span className="tab-counter-badge">{rentalPeriods.length}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'broker'}
            className={`profile-tab-btn ${tab === 'broker' ? 'active' : ''}`}
            onClick={() => setTab('broker')}
          >
            <i className="bi bi-briefcase"></i>
            <span>{isRtl ? 'بوابة الوسطاء' : 'Broker Portal'}</span>
            {brokerProfile && <span className="tab-counter-badge">{brokerProfile.status}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'notifications'}
            className={`profile-tab-btn ${tab === 'notifications' ? 'active' : ''}`}
            onClick={() => setTab('notifications')}
          >
            <i className="bi bi-bell"></i>
            <span>{isRtl ? 'الإشعارات' : 'Notifications'}</span>
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
            <span>{isRtl ? 'البيانات والأمان' : 'Profile & Security'}</span>
          </button>
        </div>

        {/* 3. Tab Contents */}

        {/* TAB 1: REQUESTS */}
        {tab === 'requests' && (
          <section className="profile-tab-panel" aria-label="My Requests">
            <div className="req-kind-bar">
              <button
                type="button"
                className={`req-kind-pill ${reqKind === 'purchases' ? 'active' : ''}`}
                onClick={() => setReqKind('purchases')}
              >
                <i className="bi bi-house-check"></i>
                <span>{isRtl ? 'طلبات الشراء' : 'Purchases'}</span>
                <span className="pill-badge">{purchases.length}</span>
              </button>
              <button
                type="button"
                className={`req-kind-pill ${reqKind === 'bookings' ? 'active' : ''}`}
                onClick={() => setReqKind('bookings')}
              >
                <i className="bi bi-key"></i>
                <span>{isRtl ? 'طلبات الإيجار' : 'Rentals'}</span>
                <span className="pill-badge">{bookings.length}</span>
              </button>
              <button
                type="button"
                className={`req-kind-pill ${reqKind === 'requirements' ? 'active' : ''}`}
                onClick={() => setReqKind('requirements')}
              >
                <i className="bi bi-file-earmark-text"></i>
                <span>{isRtl ? 'مواصفاتي العقارية المطلوبة' : 'Custom Requirements'}</span>
                <span className="pill-badge">{requirements.length}</span>
              </button>
              <button
                type="button"
                className={`req-kind-pill ${reqKind === 'listing-requests' ? 'active' : ''}`}
                onClick={() => setReqKind('listing-requests')}
              >
                <i className="bi bi-houses"></i>
                <span>{isRtl ? 'طلباتي لعرض العقارات' : 'Listing Requests'}</span>
                <span className="pill-badge">{listingRequests.length}</span>
              </button>
            </div>

            {reqLoading ? (
              <div className="profile-loading-box">
                <LoadingSkeleton count={4} />
              </div>
            ) : rows.length === 0 ? (
              <div className="profile-empty-card">
                <EmptyState
                  icon={
                    reqKind === 'purchases'
                      ? 'bi-house-slash'
                      : reqKind === 'bookings'
                      ? 'bi-key'
                      : reqKind === 'requirements'
                      ? 'bi-file-earmark-plus'
                      : 'bi-houses'
                  }
                  title={
                    reqKind === 'purchases'
                      ? 'لا توجد طلبات شراء مسجلة حتى الآن'
                      : reqKind === 'bookings'
                      ? 'لا توجد طلبات إيجار مسجلة حتى الآن'
                      : reqKind === 'requirements'
                      ? 'لم ترسل مواصفات طلب عقار مخصص بعد'
                      : 'لا توجد طلبات عرض عقار مسجلة'
                  }
                  message={
                    reqKind === 'purchases'
                      ? 'عند تقديم طلب شراء أو استفسار عن أي عقار، سيظهر هنا للمتابعة المباشرة.'
                      : reqKind === 'bookings'
                      ? 'طلبات استئجار الوحدات الشاطئية ستظهر هنا فور تسجيلها.'
                      : reqKind === 'requirements'
                      ? 'إذا لم تجد العقار المناسب بالساحل الشمالي، يمكنك إرسال مواصفاتك وسيتواصل معك مستشارونا.'
                      : 'يمكنك تقديم طلب لعرض وحدتك أو شاليهك بالساحل الشمالي وسيتواصل معك فريق داركم لمعاينتها وتصويرها.'
                  }
                  actionLabel={
                    reqKind === 'listing-requests'
                      ? (isRtl ? 'اعرض عقارك الآن' : 'List Property Now')
                      : (isRtl ? 'تصفح العقارات المتاحة' : 'Browse Properties')
                  }
                  actionTo={reqKind === 'listing-requests' ? '/sell' : '/properties'}
                />
              </div>
            ) : reqKind === 'listing-requests' ? (
              <div className="request-cards-grid">
                {listingRequests.map((req) => {
                  const statusObj = getStatusInfo(req.status);
                  return (
                    <article key={req.id} className="request-item-card">
                      <div className="request-card-header">
                        <div className="request-ref-box">
                          <span className="request-ref-label">{isRtl ? 'رقم الطلب' : 'Request #'}</span>
                          <strong className="request-ref-value">{req.requestNumber}</strong>
                        </div>
                        <span className={`request-status-pill ${statusObj.cls}`}>
                          <i className={`bi ${statusObj.icon}`}></i>
                          <span>{statusObj.label}</span>
                        </span>
                      </div>
                      <div className="request-card-body">
                        <h3 className="request-prop-title">
                          {req.villageNameAr || req.villageName}
                          <small className="text-muted d-block fs-6 mt-1">
                            {req.zoneNameAr || req.zoneName}
                          </small>
                        </h3>
                        <p className="request-meta-line">
                          <i className="bi bi-geo-alt"></i>
                          <span>
                            مبنى: {req.buildingNumber} · وحدة: {req.unitNumber}
                          </span>
                        </p>
                        <div className="request-dates-box mt-2">
                          <div>
                            <i className="bi bi-telephone me-1" />
                            <strong>الهاتف:</strong> <span dir="ltr">{req.phoneNumber}</span>
                          </div>
                          {req.inspectionDate && (
                            <div className="text-primary mt-1">
                              <i className="bi bi-calendar-check me-1" />
                              <strong>موعد المعاينة:</strong> {formatDate(req.inspectionDate)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="request-card-footer">
                        <span className="text-meta">{formatDate(req.createdAt)}</span>
                        {req.status === 'Completed' && req.propertyId && (
                          <Link to={`/properties/${req.propertyId}`} className="btn btn-outline-secondary btn-sm">
                            {isRtl ? 'عرض العقار المنشور' : 'View Property'}
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : reqKind === 'requirements' ? (
              <div className="request-cards-grid">
                {requirements.map((req) => {
                  const statusObj = getStatusInfo(req.status);
                  return (
                    <article key={req.id} className="request-item-card">
                      <div className="request-card-header">
                        <div className="request-ref-box">
                          <span className="request-ref-label">{isRtl ? 'رقم الطلب' : 'Request #'}</span>
                          <strong className="request-ref-value">REQ-{req.id}</strong>
                        </div>
                        <span className={`request-status-pill ${statusObj.cls}`}>
                          <i className={`bi ${statusObj.icon}`}></i>
                          <span>{statusObj.label}</span>
                        </span>
                      </div>
                      <div className="request-card-body">
                        <h3 className="request-prop-title">
                          {req.purpose} · {req.propertyTypeName || 'Any Type'}
                        </h3>
                        <p className="request-meta-line">
                          <i className="bi bi-geo-alt"></i>
                          <span>
                            {req.villageName || 'North Coast'}
                            {req.zoneName ? ` (${req.zoneName})` : ''}
                          </span>
                        </p>
                        <div className="request-dates-box mt-2">
                          {req.minPrice && <div>Budget: ≥ {req.minPrice.toLocaleString()} EGP</div>}
                          {req.maxPrice && <div>Budget: ≤ {req.maxPrice.toLocaleString()} EGP</div>}
                          {req.bedrooms && <div>Bedrooms: {req.bedrooms}+</div>}
                          {req.desiredAmenities && <div>Notes: {req.desiredAmenities}</div>}
                        </div>
                      </div>
                      <div className="request-card-footer">
                        <span className="text-meta">{formatDate(req.createdAt)}</span>
                        {req.assignedStaffName && (
                          <span className="badge bg-light text-dark">Advisor: {req.assignedStaffName}</span>
                        )}
                      </div>
                    </article>
                  );
                })}
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
                        <div className="request-ref-box">
                          <span className="request-ref-label">{isRtl ? 'رقم المعاملة' : 'Reference'}</span>
                          <strong className="request-ref-value">{r.requestNumber || `#${r.id}`}</strong>
                        </div>
                        <span className={`request-status-pill ${statusObj.cls}`}>
                          <i className={`bi ${statusObj.icon}`}></i>
                          <span>{statusObj.label}</span>
                        </span>
                      </div>

                      <div className="request-card-body">
                        {r.property?.title && (
                          <h3 className="request-prop-title">
                            {propLink ? (
                              <Link to={propLink} className="request-prop-link">
                                {r.property.title}
                              </Link>
                            ) : (
                              r.property.title
                            )}
                          </h3>
                        )}
                        <p className="request-meta-line">
                          <i className="bi bi-clock"></i>
                          <span>{formatDate(r.createdAt, true)}</span>
                        </p>
                        {r.startDate && (
                          <div className="request-dates-box">
                            <span className="rental-date-badge">
                              <i className="bi bi-calendar-event"></i>
                              <span>
                                {formatDate(r.startDate)} → {r.endDate ? formatDate(r.endDate) : r.duration || 'Flexible'}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>

                      {propLink && (
                        <div className="request-card-footer">
                          <Link to={propLink} className="btn-view-prop">
                            <span>{isRtl ? 'عرض تفاصيل العقار' : 'View Property'}</span>
                            <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'}`}></i>
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

        {/* TAB 2: OWNER PORTAL & RENTAL PERIODS */}
        {tab === 'owner' && (
          <section className="profile-tab-panel owner-portal-panel" aria-label="Owner Area">
            {/* 1. My Properties Section */}
            <div className="portal-subhead mb-3">
              <div>
                <h3>{isRtl ? 'عقاراتي ووحداتي المسجلة' : 'My Registered Properties'}</h3>
                <p className="text-muted m-0 fs-6">
                  {isRtl
                    ? 'قائمة الشاليهات والوحدات المربوطة بحسابك، يمكنك متابعة حالتها وتقويم إتاحة الإيجار.'
                    : 'Manage your owned properties, track listing status, and inspect rental calendars.'}
                </p>
              </div>
            </div>

            {ownerLoading ? (
              <LoadingSkeleton count={3} />
            ) : ownerProperties.length === 0 ? (
              <div className="profile-empty-card mb-4">
                <EmptyState
                  icon="bi-building"
                  title={isRtl ? 'لا توجد وحدات مسجلة باسمك حالياً' : 'No properties registered yet'}
                  message={
                    isRtl
                      ? 'عندما يتم اعتماد وربط شاليهاتك بواسطة فريق داركم، ستظهر جميع تفاصيلها هنا.'
                      : 'When Darcom links your chalets, their details and confirmed rental records will appear here.'
                  }
                />
              </div>
            ) : (
              <div className="row g-3 mb-5">
                {ownerProperties.map((p) => (
                  <div key={p.id} className="col-12 col-md-6 col-lg-4">
                    <div className="card h-100 shadow-sm border-0 rounded-3 overflow-hidden bg-white" style={{ border: '1px solid #e2e8f0' }}>
                      <div className="position-relative" style={{ height: '170px' }}>
                        <img
                          src={p.primaryImageUrl || '/images/hero-sahel.svg'}
                          alt={p.title}
                          className="w-100 h-100 object-fit-cover"
                          loading="lazy"
                        />
                        <span className="badge bg-dark bg-opacity-75 position-absolute top-0 start-0 m-2">
                          {p.purpose}
                        </span>
                        <span className={`badge position-absolute top-0 end-0 m-2 ${p.status === 'Published' ? 'bg-success' : 'bg-secondary'}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="card-body p-3 d-flex flex-column justify-content-between">
                        <div>
                          <strong className="d-block text-truncate fs-6 mb-1 text-dark" title={p.title}>
                            {p.title}
                          </strong>
                          <span className="text-muted small d-block mb-2">
                            <i className="bi bi-geo-alt me-1 text-gold"></i>
                            {p.villageName || p.location || 'North Coast'}
                            {p.zoneName ? ` · ${p.zoneName}` : ''}
                            {p.buildingNumber ? ` · Bldg ${p.buildingNumber}` : ''}
                          </span>
                          <span className="fw-bold text-dark d-block">
                            {Number(p.price).toLocaleString()} {p.currency || 'EGP'}
                          </span>
                        </div>

                        <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top">
                          <Link
                            to={`/properties/${p.slug}`}
                            className="btn btn-sm btn-outline-secondary flex-grow-1"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i>
                            <span>{isRtl ? 'عرض' : 'View'}</span>
                          </Link>
                          {p.purpose?.toLowerCase() === 'rent' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning d-inline-flex align-items-center gap-1"
                              style={{ color: '#b8972e', borderColor: '#d4af37' }}
                              onClick={() => setViewCalendarProperty(p)}
                              title={isRtl ? 'تقويم الإتاحة' : 'Availability Calendar'}
                            >
                              <i className="bi bi-calendar2-range"></i>
                              <span>{isRtl ? 'التقويم' : 'Calendar'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Confirmed Rental Periods Section */}
            <div className="portal-subhead">
              <div>
                <h3>{isRtl ? 'فترات الإيجار المؤكدة لوحداتك' : 'Confirmed Rental Periods For Your Properties'}</h3>
                <p className="text-muted m-0 fs-6">
                  {isRtl
                    ? 'جدول تفصيلي بفترات الحجز المؤكدة والمعتمدة من داركم لمتابعة إشغال وحداتك.'
                    : 'Track occupied dates and confirmed rental agreements on your properties.'}
                </p>
              </div>
            </div>

            {ownerLoading ? (
              <LoadingSkeleton count={3} />
            ) : rentalPeriods.length === 0 ? (
              <div className="profile-empty-card">
                <EmptyState
                  icon="bi-calendar-check"
                  title={isRtl ? 'لا توجد فترات إيجار مؤكدة حالياً' : 'No confirmed rental periods'}
                  message={
                    isRtl
                      ? 'عندما يعتمد فريق داركم حجوزات إيجار لوحداتك، ستظهر مواعيد البداية والنهاية هنا مباشرة.'
                      : 'When Darcom confirms tenant bookings for your property, the exact rental periods appear here.'
                  }
                />
              </div>
            ) : (
              <div className="rental-periods-table-wrap">
                <table className="rental-periods-table">
                  <thead>
                    <tr>
                      <th>{isRtl ? 'رقم العقار' : 'Property'}</th>
                      <th>{isRtl ? 'تاريخ البدء' : 'Start Date'}</th>
                      <th>{isRtl ? 'تاريخ الانتهاء' : 'End Date'}</th>
                      <th>{isRtl ? 'اسم المستأجر' : 'Renter'}</th>
                      <th>{isRtl ? 'ملاحظات' : 'Notes'}</th>
                      <th>{isRtl ? 'تاريخ التسجيل' : 'Confirmed At'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentalPeriods.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>Property #{p.propertyId}</strong>
                        </td>
                        <td>
                          <span className="rental-date-badge">
                            <i className="bi bi-calendar-check"></i>
                            {formatDate(p.startDate)}
                          </span>
                        </td>
                        <td>
                          <span className="rental-date-badge">
                            <i className="bi bi-calendar-x"></i>
                            {formatDate(p.endDate)}
                          </span>
                        </td>
                        <td>{p.renterName}</td>
                        <td className="text-meta">{p.notes || '—'}</td>
                        <td>{formatDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: BROKER PORTAL */}
        {tab === 'broker' && (
          <section className="profile-tab-panel broker-portal-panel" aria-label="Broker Portal">
            {brokerLoading ? (
              <LoadingSkeleton count={3} />
            ) : !brokerProfile ? (
              /* Registration Form */
              <div className="settings-card-surface">
                <div className="settings-card-header">
                  <div className="settings-icon-bubble">
                    <i className="bi bi-briefcase-fill"></i>
                  </div>
                  <div>
                    <h2 className="settings-card-title">
                      {isRtl ? 'التسجيل كوسيط عقاري معتمد' : 'Register as an Accredited Broker'}
                    </h2>
                    <p className="settings-card-subtitle">
                      {isRtl
                        ? 'انضم لشبكة وسطاء داركم بالساحل الشمالي وقدم طلبات الشراء والإيجار لعملائك بعد مراجعة واعتماد الإدارة.'
                        : 'Join the Darcom North Coast broker network. Submit requests on behalf of your clients once approved by admin.'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRegisterBroker} className="settings-form-fields mt-3" noValidate>
                  <FormField id="br-agency" label={isRtl ? 'اسم الشركة / المكتب' : 'Agency / Company Name'} required error={brokerRegErrors.agencyName}>
                    <input
                      id="br-agency"
                      className="form-control"
                      value={brokerRegForm.agencyName}
                      onChange={(e) => setBrokerRegForm({ ...brokerRegForm, agencyName: e.target.value })}
                      placeholder="e.g. Coastline Real Estate"
                      required
                    />
                  </FormField>

                  <FormField id="br-license" label={isRtl ? 'رقم السجل التجاري / الترخيص' : 'License / Registration Number'} required error={brokerRegErrors.licenseNumber}>
                    <input
                      id="br-license"
                      className="form-control"
                      value={brokerRegForm.licenseNumber}
                      onChange={(e) => setBrokerRegForm({ ...brokerRegForm, licenseNumber: e.target.value })}
                      placeholder="e.g. CR-89472"
                      required
                    />
                  </FormField>

                  <FormField id="br-national" label={isRtl ? 'الرقم القومي للمسؤول' : 'National ID'} error={brokerRegErrors.nationalId}>
                    <input
                      id="br-national"
                      className="form-control"
                      value={brokerRegForm.nationalId}
                      onChange={(e) => setBrokerRegForm({ ...brokerRegForm, nationalId: e.target.value })}
                      placeholder="14-digit National ID"
                    />
                  </FormField>

                  <FormField id="br-doc" label={isRtl ? 'رابط المستند / الملف الرسمي' : 'Document / Profile URL'} error={brokerRegErrors.documentUrl}>
                    <input
                      id="br-doc"
                      type="url"
                      className="form-control"
                      value={brokerRegForm.documentUrl}
                      onChange={(e) => setBrokerRegForm({ ...brokerRegForm, documentUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </FormField>

                  <div className="mt-3">
                    <button type="submit" className="btn btn-brand" disabled={brokerRegistering}>
                      {brokerRegistering ? (isRtl ? 'جارٍ الإرسال…' : 'Submitting…') : (isRtl ? 'إرسال طلب اعتماد الوسيط' : 'Submit Broker Application')}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Already Registered -> Status and Requests */
              <div>
                <div className={`broker-status-banner ${brokerProfile.status?.toLowerCase()}`}>
                  <div className="broker-status-info">
                    <h4>
                      {brokerProfile.agencyName}
                      <span className="ms-2 text-muted fs-6">({brokerProfile.licenseNumber})</span>
                    </h4>
                    <p>
                      {isRtl ? 'حالة الاعتماد' : 'Approval Status'}:{' '}
                      <strong>{brokerProfile.status}</strong>
                      {brokerProfile.approvedAt && ` · Approved on ${formatDate(brokerProfile.approvedAt)}`}
                    </p>
                    {brokerProfile.adminNotes && (
                      <p className="mt-1 text-info">
                        <strong>Admin Note:</strong> {brokerProfile.adminNotes}
                      </p>
                    )}
                  </div>
                  <span className={`broker-status-badge ${brokerProfile.status?.toLowerCase()}`}>
                    {brokerProfile.status}
                  </span>
                </div>

                {brokerProfile.status?.toLowerCase() === 'pending' && (
                  <div className="alert alert-warning mt-3">
                    <i className="bi bi-clock-history me-2"></i>
                    {isRtl
                      ? 'طلبك قيد المراجعة والتدقيق بواسطة إدارة داركم. ستتمكن من تقديم طلبات العملاء فور اعتماد الحساب.'
                      : 'Your broker application is under review by Darcom administration. You will be able to submit client requests once approved.'}
                  </div>
                )}

                {brokerProfile.status?.toLowerCase() === 'approved' && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <h4>{isRtl ? 'طلبات العملاء المسجلة باسمك' : 'Client Requests Submitted'}</h4>
                      <div className="d-flex gap-2">
                        <Link to="/broker/dashboard" className="btn btn-outline-warning btn-sm">
                          <i className="bi bi-briefcase-fill me-1"></i>
                          {isRtl ? 'لوحة تحكم البروكر المتكاملة' : 'Full Broker Dashboard'}
                        </Link>
                        <button
                          type="button"
                          className="btn btn-brand btn-sm"
                          onClick={() => setShowClientReqModal(true)}
                        >
                          <i className="bi bi-plus-lg me-1"></i>
                          {isRtl ? 'تقديم طلب جديد لعميل' : 'Submit Client Request'}
                        </button>
                      </div>
                    </div>

                    {brokerRequests.length === 0 ? (
                      <p className="text-muted">{isRtl ? 'لم تقدم أي طلبات عملاء حتى الآن.' : 'No client requests submitted yet.'}</p>
                    ) : (
                      <div className="rental-periods-table-wrap">
                        <table className="rental-periods-table">
                          <thead>
                            <tr>
                              <th>Ref</th>
                              <th>Property</th>
                              <th>Client</th>
                              <th>Phone</th>
                              <th>Purpose</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {brokerRequests.map((br) => (
                              <tr key={br.id}>
                                <td><strong>BR-{br.id}</strong></td>
                                <td>{br.propertyTitle || `#${br.propertyId}`}</td>
                                <td>{br.clientName}</td>
                                <td>{br.clientPhone}</td>
                                <td>{br.purpose}</td>
                                <td><span className="badge bg-warning text-dark">{br.status}</span></td>
                                <td>{formatDate(br.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modal for creating a broker request */}
            {showClientReqModal && (
              <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content" style={{ background: '#1c1b18', border: '1px solid #b8860b', color: '#fff' }}>
                    <div className="modal-header border-bottom border-secondary">
                      <h5 className="modal-title">{isRtl ? 'تقديم طلب نيابة عن عميل' : 'Submit Client Request'}</h5>
                      <button type="button" className="btn-close btn-close-white" onClick={() => setShowClientReqModal(false)}></button>
                    </div>
                    <form onSubmit={handleCreateBrokerRequest}>
                      <div className="modal-body d-flex flex-direction-column gap-3">
                        <div>
                          <label className="form-label">{isRtl ? 'معرف العقار (Property ID)' : 'Property ID'} *</label>
                          <input
                            type="number"
                            required
                            className="form-control"
                            value={clientReqForm.propertyId}
                            onChange={(e) => setClientReqForm({ ...clientReqForm, propertyId: e.target.value })}
                            placeholder="e.g. 1"
                          />
                        </div>
                        <div>
                          <label className="form-label">{isRtl ? 'اسم العميل' : 'Client Name'} *</label>
                          <input
                            type="text"
                            required
                            className="form-control"
                            value={clientReqForm.clientName}
                            onChange={(e) => setClientReqForm({ ...clientReqForm, clientName: e.target.value })}
                            placeholder="e.g. Ahmed Fouad"
                          />
                        </div>
                        <div>
                          <label className="form-label">{isRtl ? 'هاتف العميل' : 'Client Phone'} *</label>
                          <input
                            type="tel"
                            required
                            className="form-control"
                            value={clientReqForm.clientPhone}
                            onChange={(e) => setClientReqForm({ ...clientReqForm, clientPhone: e.target.value })}
                            placeholder="010..."
                          />
                        </div>
                        <div>
                          <label className="form-label">{isRtl ? 'نوع الطلب' : 'Purpose'}</label>
                          <select
                            className="form-select"
                            value={clientReqForm.purpose}
                            onChange={(e) => setClientReqForm({ ...clientReqForm, purpose: e.target.value })}
                          >
                            <option value="Sale">Sale (شراء)</option>
                            <option value="Rent">Rent (إيجار)</option>
                          </select>
                        </div>
                        {clientReqForm.purpose === 'Rent' && (
                          <div className="row g-2">
                            <div className="col-6">
                              <label className="form-label">Start Date</label>
                              <input
                                type="date"
                                className="form-control"
                                value={clientReqForm.startDate}
                                onChange={(e) => setClientReqForm({ ...clientReqForm, startDate: e.target.value })}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label">End Date</label>
                              <input
                                type="date"
                                className="form-control"
                                value={clientReqForm.endDate}
                                onChange={(e) => setClientReqForm({ ...clientReqForm, endDate: e.target.value })}
                              />
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="form-label">{isRtl ? 'ملاحظات' : 'Notes'}</label>
                          <textarea
                            className="form-control"
                            rows="2"
                            value={clientReqForm.notes}
                            onChange={(e) => setClientReqForm({ ...clientReqForm, notes: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="modal-footer border-top border-secondary">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowClientReqModal(false)}>
                          {isRtl ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button type="submit" className="btn btn-brand" disabled={submittingClientReq}>
                          {submittingClientReq ? (isRtl ? 'جارٍ الإرسال…' : 'Submitting…') : (isRtl ? 'إرسال الطلب' : 'Submit')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {tab === 'notifications' && (
          <section className="profile-tab-panel" aria-label="Notifications">
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
                      : 'Official updates about your inquiries and agreements will appear here.'
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
                      <span className="notification-unread-dot" title="Unread"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 5: SETTINGS & SECURITY */}
        {tab === 'settings' && (
          <section className="profile-tab-panel" aria-label="Profile & Security">
            <div className="settings-cards-grid">
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
                          ? 'تأكد من دقة بيانات الاتصال لتسهيل التواصل المباشر وتوثيق العقود.'
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

        {viewCalendarProperty && (
          <Modal
            title={isRtl ? `تقويم الإشغال: ${viewCalendarProperty.title}` : `Availability: ${viewCalendarProperty.title}`}
            onClose={() => setViewCalendarProperty(null)}
          >
            <p className="text-meta small mb-3">
              {isRtl
                ? 'يوضح التقويم الفترات المؤكدة باللون الأحمر والمتاحة باللون الأخضر وفقاً لسجل الحجوزات المركزي لدى داركم.'
                : 'The calendar reflects confirmed periods in red and open availability in green from Darcom central backend records.'}
            </p>
            <RentalCalendar
              periods={rentalPeriods.filter((rp) => rp.propertyId === viewCalendarProperty.id)}
            />
          </Modal>
        )}
      </div>
    </main>
  );
}
