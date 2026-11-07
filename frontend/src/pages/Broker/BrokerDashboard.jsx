import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { brokerService } from '../../services/brokerService.js';
import BrokerClientRequestModal from './components/BrokerClientRequestModal.jsx';
import './BrokerDashboard.css';

export default function BrokerDashboard() {
  const { user } = useAuth();
  const { isRtl, t } = useSettings();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);

  useSeo({
    title: `${isRtl ? 'لوحة تحكم البروكر' : 'Broker Dashboard'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'لوحة إدارة الوسيط العقاري: شاليهاتي، تقديم طلبات النشر، طلبات العملاء'
      : 'Broker portal for luxury North Coast property listings and client requests.',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await brokerService.getDashboard();
      setDashboard(res.data);
    } catch (err) {
      toast.error(err.message || (isRtl ? 'تعذر تحميل بيانات البروكر' : 'Failed to load broker data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container broker-dashboard-page text-center py-5">
        <div className="spinner-border text-gold" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">{isRtl ? 'جاري تحميل لوحة تحكم البروكر...' : 'Loading broker dashboard...'}</p>
      </div>
    );
  }

  const profile = dashboard?.profile;
  const isApproved = profile?.status?.toLowerCase() === 'approved';
  const isPending = profile?.status?.toLowerCase() === 'pending';
  const isRejected = profile?.status?.toLowerCase() === 'rejected';

  // 1. Unapproved or Pending Approval State
  if (!isApproved) {
    return (
      <main className="container broker-dashboard-page" id="main-content">
        <div className="broker-pending-box">
          <div className="broker-pending-icon">
            <i className={`bi ${isRejected ? 'bi-x-circle-fill text-danger' : 'bi-hourglass-split'}`}></i>
          </div>

          <h1 className="broker-pending-title">
            {isRejected
              ? (isRtl ? 'تم رفض طلب اعتماد حساب البروكر' : 'Broker Application Rejected')
              : (isRtl ? 'طلب حساب البروكر قيد المراجعة والاعتماد' : 'Broker Application Under Review')}
          </h1>

          <p className="broker-pending-desc">
            {isRejected
              ? (isRtl
                ? 'للأسف لم تتم الموافقة على طلب اعتماد حسابك كوسيط عقاري من قبل إدارة داركوم. يمكنك مراجعة ملاحظات الإدارة أدناه أو التواصل معنا.'
                : 'Your broker application was not approved by Darcom administration. Please review the admin notes below or contact support.')
              : (isRtl
                ? 'تم استلام بياناتك بنجاح وجاري تدقيقها ومراجعتها من قبل مسؤولي داركوم في الساحل الشمالي. ستصبح كافة ميزات لوحة تحكم البروكر متاحة بالكامل فور اعتماد الحساب.'
                : 'Your broker application is currently being verified by Darcom administration. All broker features will become accessible immediately upon approval.')}
          </p>

          {profile && (
            <table className="broker-details-table">
              <tbody>
                <tr>
                  <td>{isRtl ? 'اسم الوكالة / المكتب' : 'Agency Name'}</td>
                  <td>{profile.agencyName}</td>
                </tr>
                <tr>
                  <td>{isRtl ? 'رقم السجل / الرخصة' : 'License / Registration'}</td>
                  <td>{profile.licenseNumber}</td>
                </tr>
                {profile.nationalId && (
                  <tr>
                    <td>{isRtl ? 'الرقم القومي' : 'National ID'}</td>
                    <td>{profile.nationalId}</td>
                  </tr>
                )}
                <tr>
                  <td>{isRtl ? 'حالة الطلب' : 'Current Status'}</td>
                  <td>
                    <span className={`broker-status-pill ${profile.status?.toLowerCase()}`}>
                      {profile.status}
                    </span>
                  </td>
                </tr>
                {profile.adminNotes && (
                  <tr>
                    <td>{isRtl ? 'ملاحظات الإدارة' : 'Admin Notes'}</td>
                    <td className="text-warning">{profile.adminNotes}</td>
                  </tr>
                )}
                <tr>
                  <td>{isRtl ? 'تاريخ التقديم' : 'Submitted Date'}</td>
                  <td>{new Date(profile.createdAt).toLocaleDateString()}</td>
                </tr>
              </tbody>
            </table>
          )}

          <div className="d-flex justify-content-center gap-3">
            <button type="button" className="btn btn-outline-secondary" onClick={loadData}>
              <i className="bi bi-arrow-clockwise me-1"></i>
              {isRtl ? 'تحديث الحالة' : 'Refresh Status'}
            </button>
            <Link to="/contact" className="btn btn-brand">
              <i className="bi bi-chat-dots me-1"></i>
              {isRtl ? 'تواصل مع الدعم' : 'Contact Support'}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 2. Approved Broker Dashboard
  return (
    <main className="container broker-dashboard-page" id="main-content">
      {/* Header Banner */}
      <div className="broker-header-card">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="broker-status-pill approved">
                <i className="bi bi-patch-check-fill"></i>
                {isRtl ? 'بروكر معتمد من داركوم' : 'Darcom Certified Broker'}
              </span>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                Ref: {profile?.licenseNumber}
              </span>
            </div>
            <h1 className="broker-header-title">
              {profile?.agencyName || user?.fullName}
            </h1>
            <p className="broker-header-subtitle">
              {isRtl
                ? 'مرحباً بك في لوحة تحكم الوسطاء العقاريين المعتمدين في الساحل الشمالي'
                : 'Welcome to your North Coast certified broker operations dashboard'}
            </p>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowClientModal(true)}
            >
              <i className="bi bi-person-plus me-1"></i>
              {isRtl ? 'تقديم طلب لعميل' : 'Submit Client Request'}
            </button>
            <Link
              to="/broker/submit-property"
              className="btn btn-brand"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #aa8214)',
                border: 'none',
                color: '#121212',
                fontWeight: 600,
              }}
            >
              <i className="bi bi-plus-circle-fill me-1"></i>
              {isRtl ? 'طلب إضافة شاليه' : 'Submit a Chalet'}
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid (Real backend data) */}
      <div className="broker-kpi-grid">
        <Link to="/broker/properties" className="text-decoration-none">
          <div className="broker-kpi-card">
            <div className="broker-kpi-icon gold">
              <i className="bi bi-house-door-fill"></i>
            </div>
            <div>
              <div className="broker-kpi-num">{dashboard.totalProperties}</div>
              <p className="broker-kpi-label">{isRtl ? 'إجمالي شاليهاتي' : 'My Properties'}</p>
            </div>
          </div>
        </Link>

        <Link to="/broker/properties?status=PendingReview" className="text-decoration-none">
          <div className="broker-kpi-card">
            <div className="broker-kpi-icon warning">
              <i className="bi bi-clock-history"></i>
            </div>
            <div>
              <div className="broker-kpi-num">{dashboard.pendingProperties}</div>
              <p className="broker-kpi-label">{isRtl ? 'قيد مراجعة الإدارة' : 'Pending Review'}</p>
            </div>
          </div>
        </Link>

        <Link to="/broker/properties?status=Published" className="text-decoration-none">
          <div className="broker-kpi-card">
            <div className="broker-kpi-icon success">
              <i className="bi bi-check-circle-fill"></i>
            </div>
            <div>
              <div className="broker-kpi-num">{dashboard.approvedProperties}</div>
              <p className="broker-kpi-label">{isRtl ? 'شاليهات معتمدة ومنشورة' : 'Active / Published'}</p>
            </div>
          </div>
        </Link>

        <Link to="/broker/requests" className="text-decoration-none">
          <div className="broker-kpi-card">
            <div className="broker-kpi-icon info">
              <i className="bi bi-people-fill"></i>
            </div>
            <div>
              <div className="broker-kpi-num">{dashboard.clientRequestsCount}</div>
              <p className="broker-kpi-label">{isRtl ? 'طلبات العملاء المسجلة' : 'Client Requests'}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Feature Cards Grid */}
      <h2 className="mb-3" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff' }}>
        <i className="bi bi-grid-fill me-2 text-gold"></i>
        {isRtl ? 'أقسام وإدارة أعمال البروكر' : 'Broker Management Sections'}
      </h2>

      <div className="broker-nav-grid">
        <Link to="/broker/properties" className="broker-action-card">
          <div className="broker-action-icon">
            <i className="bi bi-building"></i>
          </div>
          <h3 className="broker-action-title">{isRtl ? 'شاليهاتي' : 'My Chalets'}</h3>
          <p className="broker-action-desc">
            {isRtl
              ? 'استعراض كافة الشاليهات والوحدات المربوطة بحسابك، والاطلاع على فترات الحجز المؤكدة وحالات الاعتماد.'
              : 'Browse and manage all properties associated with your account, check approval status and rental periods.'}
          </p>
          <span className="broker-action-link-text">
            <span>{isRtl ? 'عرض الشاليهات' : 'View Properties'}</span>
            <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'}`}></i>
          </span>
        </Link>

        <Link to="/broker/submit-property" className="broker-action-card">
          <div className="broker-action-icon">
            <i className="bi bi-file-earmark-plus"></i>
          </div>
          <h3 className="broker-action-title">{isRtl ? 'طلب إضافة شاليه' : 'Submit a Chalet'}</h3>
          <p className="broker-action-desc">
            {isRtl
              ? 'تقديم تفاصيل شاليه للبيع أو الإيجار في قرى الساحل الشمالي لإرساله لمراجعة الشركة واعتماده قبل نشره.'
              : 'Submit a new chalet for sale or rent in North Coast villages for company review and approval.'}
          </p>
          <span className="broker-action-link-text">
            <span>{isRtl ? 'بدء تقديم الشاليه' : 'Start Submission'}</span>
            <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'}`}></i>
          </span>
        </Link>

        <Link to="/broker/requests" className="broker-action-card">
          <div className="broker-action-icon">
            <i className="bi bi-card-checklist"></i>
          </div>
          <h3 className="broker-action-title">{isRtl ? 'طلباتي ومتابعة الاعتماد' : 'Submissions & Requests'}</h3>
          <p className="broker-action-desc">
            {isRtl
              ? 'متابعة حالة مراجعة الشاليهات المرفوعة، وطلبات العملاء المقدمة من طرفك وملاحظات الإدارة.'
              : 'Track submitted chalet review statuses, client booking requests, and admin feedback.'}
          </p>
          <span className="broker-action-link-text">
            <span>{isRtl ? 'متابعة الطلبات' : 'Track Requests'}</span>
            <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'}`}></i>
          </span>
        </Link>

        <div
          role="button"
          tabIndex={0}
          className="broker-action-card cursor-pointer"
          onClick={() => setShowClientModal(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowClientModal(true);
            }
          }}
        >
          <div className="broker-action-icon">
            <i className="bi bi-person-lines-fill"></i>
          </div>
          <h3 className="broker-action-title">{isRtl ? 'تقديم طلب لعميل' : 'Submit Client Request'}</h3>
          <p className="broker-action-desc">
            {isRtl
              ? 'اختر شاليه من عروض داركوم وسجل طلب حجز أو شراء باسم عميلك مباشرة لتوثيق عمولتك.'
              : 'Pick an active company chalet and submit a booking or purchase inquiry on behalf of your client.'}
          </p>
          <span className="broker-action-link-text">
            <span>{isRtl ? 'تسجيل طلب عميل' : 'Register Client'}</span>
            <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'}`}></i>
          </span>
        </div>
      </div>

      {/* Modal for Client Request */}
      <BrokerClientRequestModal
        show={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSuccess={loadData}
      />
    </main>
  );
}

