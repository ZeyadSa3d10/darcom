import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { brokerService } from '../../services/brokerService.js';
import './BrokerDashboard.css';

export default function BrokerDashboard() {
  const { user } = useAuth();
  const { isRtl, t } = useSettings();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useSeo({
    title: `${isRtl ? 'لوحة تحكم البروكر' : 'Broker Dashboard'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'لوحة إدارة الوسيط العقاري في الساحل الشمالي: عرض الشاليهات، طلبات الإيجار والشراء، ومتابعة الطلبات'
      : 'Broker portal for North Coast property listings and requests.',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await brokerService.getDashboard();
      setDashboard(res.data);
    } catch (err) {
      toast.error(err.message || (isRtl ? 'تعذر تحميل بيانات لوحة تحكم البروكر' : 'Failed to load broker data'));
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

  return (
    <main className="container broker-dashboard-page" id="main-content">
      {/* Pending / Rejected Notice Banner */}
      {!isApproved && (
        <div className={`alert ${isRejected ? 'alert-danger' : 'alert-warning'} border p-3 mb-4 rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-2`}>
          <div className="d-flex align-items-center gap-3">
            <i className={`bi ${isRejected ? 'bi-x-circle-fill fs-3' : 'bi-clock-history fs-3'}`}></i>
            <div>
              <strong className="d-block">
                {isRejected
                  ? (isRtl ? 'تم رفض طلب اعتماد الحساب' : 'Broker Application Rejected')
                  : (isRtl ? 'طلب حساب البروكر قيد المراجعة والاعتماد' : 'Broker Account Under Review')}
              </strong>
              <span className="text-sm">
                {isRejected
                  ? (profile?.adminNotes || (isRtl ? 'يرجى التواصل مع إدارة داركم للاستفسار.' : 'Please contact support.'))
                  : (isRtl
                    ? 'بياناتك وصور الهوية قيد التدقيق الأمني من إدارة داركم في الساحل الشمالي. يمكنك البدء في تسجيل شاليهاتك ومتابعتها.'
                    : 'Your account is under administrative review. You can already submit listings and track your requests.')}
              </span>
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={loadData}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            {isRtl ? 'تحديث الحالة' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="broker-header-card mb-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className={`broker-status-pill ${profile?.status?.toLowerCase() || 'pending'}`}>
                <i className="bi bi-patch-check-fill me-1"></i>
                {isApproved
                  ? (isRtl ? 'بروكر معتمد في الساحل الشمالي' : 'Certified North Coast Broker')
                  : isPending
                  ? (isRtl ? 'حساب قيد المراجعة' : 'Pending Review')
                  : (isRtl ? 'حساب غير معتمد' : 'Unapproved')}
              </span>
              {profile?.agencyName && (
                <span className="text-muted text-sm">
                  <i className="bi bi-building me-1"></i>
                  {profile.agencyName}
                </span>
              )}
            </div>
            <h1 className="broker-header-title">
              {user?.fullName || profile?.fullName || (isRtl ? 'لوحة تحكم الوسيط العقاري' : 'Broker Dashboard')}
            </h1>
            <p className="broker-header-subtitle mb-0">
              {isRtl
                ? 'إدارة متكاملة لأعمالك العقارية في الساحل الشمالي مع داركم'
                : 'Manage your North Coast chalet listings and requests with Darcom'}
            </p>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <Link
              to="/broker/submit-property"
              className="btn btn-brand px-3 py-2"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #aa8214)',
                border: 'none',
                color: '#121212',
                fontWeight: 700,
              }}
            >
              <i className="bi bi-house-add-fill me-2"></i>
              {isRtl ? 'شاليه عندي وعايز أعرضه' : 'Submit Chalet'}
            </Link>
            <Link to="/properties" className="btn btn-outline-light px-3 py-2">
              <i className="bi bi-search me-2"></i>
              {isRtl ? 'بدور على شاليه' : 'Browse Chalets'}
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Prominent Main Action Cards */}
      <div className="row g-3 mb-4">
        {/* Action 1: شاليه عندي وعايز أعرضه */}
        <div className="col-12 col-md-4">
          <div className="broker-main-feature-card h-100 p-4 rounded-4 border position-relative overflow-hidden">
            <div className="feature-card-glow"></div>
            <div className="feature-icon-badge gold mb-3">
              <i className="bi bi-house-add-fill"></i>
            </div>
            <h2 className="h5 fw-bold text-white mb-2">
              {isRtl ? 'شاليه عندي وعايز أعرضه' : 'List a Chalet'}
            </h2>
            <p className="text-muted text-sm mb-4">
              {isRtl
                ? 'قدم بيانات الشاليه (4 حقول فقط: المساحة، القرية، المرحلة، رقم الوحدة). سنقوم بالمعاينة والتصوير ونشر الوحدة باسمك.'
                : 'Submit unit details with only 4 fields. We inspect, photograph, and list the property under your account.'}
            </p>
            <Link to="/broker/submit-property" className="btn btn-gold-outline w-100 mt-auto">
              <span>{isRtl ? 'أضف شاليهك الآن' : 'Start Submission'}</span>
              <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
            </Link>
          </div>
        </div>

        {/* Action 2: بدور على شاليه */}
        <div className="col-12 col-md-4">
          <div className="broker-main-feature-card h-100 p-4 rounded-4 border position-relative overflow-hidden">
            <div className="feature-card-glow"></div>
            <div className="feature-icon-badge cyan mb-3">
              <i className="bi bi-search-heart-fill"></i>
            </div>
            <h2 className="h5 fw-bold text-white mb-2">
              {isRtl ? 'بدور على شاليه' : 'Find a Chalet'}
            </h2>
            <p className="text-muted text-sm mb-4">
              {isRtl
                ? 'تصفح كافة معروضات داركم في قرى الساحل الشمالي، واطلب حجز إيجار أو شراء أي شاليه مباشرة بنقرة واحدة.'
                : 'Browse all active Darcom North Coast listings and submit a Rent or Buy request with a single click.'}
            </p>
            <Link to="/properties" className="btn btn-cyan-outline w-100 mt-auto">
              <span>{isRtl ? 'تصفح شاليهات الساحل' : 'Browse Listings'}</span>
              <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
            </Link>
          </div>
        </div>

        {/* Action 3: طلباتي */}
        <div className="col-12 col-md-4">
          <div className="broker-main-feature-card h-100 p-4 rounded-4 border position-relative overflow-hidden">
            <div className="feature-card-glow"></div>
            <div className="feature-icon-badge purple mb-3">
              <i className="bi bi-card-checklist"></i>
            </div>
            <h2 className="h5 fw-bold text-white mb-2">
              {isRtl ? 'طلباتي' : 'My Requests'}
            </h2>
            <p className="text-muted text-sm mb-4">
              {isRtl
                ? 'مركز تتبع موحد: طلبات إضافة الشاليهات للمعاينة، طلبات الإيجار والشراء، وطلبات الشاليهات بمواصفات خاصة.'
                : 'Unified tracker for your property submissions, rent/buy requests, and custom requirements.'}
            </p>
            <Link to="/broker/requests" className="btn btn-purple-outline w-100 mt-auto">
              <span>{isRtl ? 'عرض ومتابعة الطلبات' : 'View All Requests'}</span>
              <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid (Real Backend Data) */}
      <h2 className="h5 fw-bold text-white mb-3 d-flex align-items-center gap-2">
        <i className="bi bi-speedometer2 text-gold"></i>
        <span>{isRtl ? 'ملخص النشاط والإحصائيات الحية' : 'Live Activity Summary'}</span>
      </h2>

      <div className="broker-kpi-grid mb-4">
        {/* 1. Listed Properties */}
        <Link to="/broker/properties" className="text-decoration-none">
          <div className="broker-kpi-card">
            <div className="broker-kpi-icon gold">
              <i className="bi bi-building-check"></i>
            </div>
            <div>
              <div className="broker-kpi-num">{dashboard?.totalProperties ?? 0}</div>
              <p className="broker-kpi-label">{isRtl ? 'شاليهاتي المعروضة' : 'My Listed Chalets'}</p>
            </div>
          </div>
        </Link>

        {/* 2. Pending Submissions */}
        <Link to="/broker/requests" className="text-decoration-none">
          <div className="broker-kpi-card">
            <div className="broker-kpi-icon warning">
              <i className="bi bi-clock-history"></i>
            </div>
            <div>
              <div className="broker-kpi-num">{dashboard?.pendingSubmissions ?? 0}</div>
              <p className="broker-kpi-label">{isRtl ? 'شاليهات قيد المعاينة' : 'Pending Inspections'}</p>
            </div>
          </div>
        </Link>

        {/* 3. Rent & Sale Requests */}
        <Link to="/broker/requests" className="text-decoration-none">
          <div className="broker-kpi-card">
            <div className="broker-kpi-icon info">
              <i className="bi bi-arrow-left-right"></i>
            </div>
            <div>
              <div className="broker-kpi-num">{dashboard?.clientRequestsCount ?? 0}</div>
              <p className="broker-kpi-label">{isRtl ? 'طلبات الإيجار والشراء' : 'Rent & Buy Requests'}</p>
            </div>
          </div>
        </Link>

        {/* 4. Custom Requirements */}
        <Link to="/broker/requests" className="text-decoration-none">
          <div className="broker-kpi-card">
            <div className="broker-kpi-icon success">
              <i className="bi bi-sliders"></i>
            </div>
            <div>
              <div className="broker-kpi-num">{dashboard?.propertyRequirementsCount ?? 0}</div>
              <p className="broker-kpi-label">{isRtl ? 'شاليهات بمواصفات خاصة' : 'Custom Specs Requests'}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Navigation to "شاليهاتي" */}
      <div className="broker-properties-section-banner p-4 rounded-4 border bg-dark text-white d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="p-3 rounded-circle bg-secondary bg-opacity-25 text-gold fs-2">
            <i className="bi bi-houses-fill" style={{ color: '#d4af37' }}></i>
          </div>
          <div>
            <h3 className="h5 fw-bold mb-1">{isRtl ? 'شاليهاتي المعتمدة على داركم' : 'My Published Properties'}</h3>
            <p className="text-muted text-sm mb-0">
              {isRtl
                ? 'استعراض وإدارة جميع الوحدات المنشورة باسمك رسمياً ومتابعة فترات الإيجار المحجوزة.'
                : 'View and manage all properties officially published and linked to your broker profile.'}
            </p>
          </div>
        </div>

        <Link to="/broker/properties" className="btn btn-outline-light px-4 text-nowrap">
          <span>{isRtl ? 'عرض شاليهاتي' : 'View My Properties'}</span>
          <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
        </Link>
      </div>
    </main>
  );
}
