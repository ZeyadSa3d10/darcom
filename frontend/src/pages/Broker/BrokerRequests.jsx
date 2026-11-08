import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { brokerService } from '../../services/brokerService.js';
import BrokerCustomRequirementModal from './components/BrokerCustomRequirementModal.jsx';
import './BrokerRequests.css';

function getStatusBadge(status, isRtl) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'pending':
      return (
        <span className="badge" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', color: '#d4af37', border: '1px solid #d4af37' }}>
          <i className="bi bi-clock-history me-1"></i>
          {isRtl ? 'قيد المراجعة' : 'Pending'}
        </span>
      );
    case 'approved':
    case 'completed':
    case 'listed':
      return (
        <span className="badge" style={{ backgroundColor: 'rgba(40, 167, 69, 0.2)', color: '#5cdb7a', border: '1px solid #28a745' }}>
          <i className="bi bi-check-circle-fill me-1"></i>
          {isRtl ? 'معتمد / مكتمل' : 'Approved'}
        </span>
      );
    case 'contacted':
    case 'inreview':
      return (
        <span className="badge" style={{ backgroundColor: 'rgba(23, 162, 184, 0.2)', color: '#6edff6', border: '1px solid #17a2b8' }}>
          <i className="bi bi-telephone-outbound me-1"></i>
          {isRtl ? 'تم التواصل / جاري المعاينة' : 'Contacted / Inspecting'}
        </span>
      );
    case 'rejected':
      return (
        <span className="badge" style={{ backgroundColor: 'rgba(220, 53, 69, 0.2)', color: '#ff737d', border: '1px solid #dc3545' }}>
          <i className="bi bi-x-circle-fill me-1"></i>
          {isRtl ? 'مرفوض' : 'Rejected'}
        </span>
      );
    default:
      return (
        <span className="badge bg-secondary">
          {status}
        </span>
      );
  }
}

export default function BrokerRequests() {
  const { isRtl, t } = useSettings();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // tabs: 'submissions' (Workflow 1), 'requests' (Workflow 2), 'requirements' (Workflow 3)
  const activeTab = searchParams.get('tab') || 'submissions';
  const currentPage = Number(searchParams.get('page') || 1);

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState({ items: [], total: 0, totalPages: 1 });
  const [propertyRequests, setPropertyRequests] = useState({ items: [], total: 0, totalPages: 1 });
  const [requirements, setRequirements] = useState({ items: [], total: 0, totalPages: 1 });

  const [showRequirementModal, setShowRequirementModal] = useState(false);

  useSeo({
    title: `${isRtl ? 'طلباتي ومتابعة العمليات' : 'My Requests & Submissions'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'لوحة متابعة طلبات إضافة الشاليهات، طلبات الإيجار والشراء، ومواصفات الشاليهات الخاصة للوسيط العقاري.'
      : 'Track your chalet submissions, rental/purchase requests, and custom requirements.',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'submissions') {
        const res = await brokerService.mySubmissions(currentPage, 12);
        const data = res?.data || res;
        setSubmissions(data?.items ? data : { items: [], total: 0, totalPages: 1 });
      } else if (activeTab === 'requests') {
        const res = await brokerService.myPropertyRequests(currentPage, 12);
        const data = res?.data || res;
        setPropertyRequests(data?.items ? data : { items: [], total: 0, totalPages: 1 });
      } else if (activeTab === 'requirements') {
        const res = await brokerService.myRequirements(currentPage, 12);
        const data = res?.data || res;
        setRequirements(data?.items ? data : { items: [], total: 0, totalPages: 1 });
      }
    } catch (err) {
      toast.error(err.message || (isRtl ? 'فشل تحميل البيانات' : 'Failed to load requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, currentPage]);

  const handleTabChange = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handlePageChange = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
  };

  return (
    <main className="container broker-requests-page" id="main-content">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/broker/dashboard" className="text-gold text-decoration-none" style={{ fontSize: '0.9rem' }}>
              <i className={`bi ${isRtl ? 'bi-arrow-right' : 'bi-arrow-left'} me-1`}></i>
              {isRtl ? 'العودة للوحة تحكم البروكر' : 'Back to Dashboard'}
            </Link>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
            <i className="bi bi-card-checklist me-2 text-gold"></i>
            {isRtl ? 'متابعة كافة طلباتي' : 'All My Requests'}
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
            {isRtl
              ? 'متابعة فورية لحالة شاليهاتك المعروضة للمعاينة، طلبات الإيجار والشراء، ومواصفات الوحدات الخاصة'
              : 'Real-time tracking for your unit submissions, rent/buy requests, and custom requirements.'}
          </p>
        </div>

        {/* Action Button based on context */}
        <div className="d-flex gap-2">
          {activeTab === 'submissions' && (
            <Link
              to="/broker/submit-property"
              className="btn btn-brand"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #aa8214)',
                border: 'none',
                color: '#121212',
                fontWeight: 600,
                padding: '0.6rem 1.25rem',
              }}
            >
              <i className="bi bi-plus-circle-fill me-1"></i>
              {isRtl ? 'طلب إضافة شاليه للمعاينة' : 'Submit Chalet'}
            </Link>
          )}

          {activeTab === 'requests' && (
            <Link
              to="/properties"
              className="btn btn-brand"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #aa8214)',
                border: 'none',
                color: '#121212',
                fontWeight: 600,
                padding: '0.6rem 1.25rem',
              }}
            >
              <i className="bi bi-search me-1"></i>
              {isRtl ? 'تصفح الشاليهات لتقديم طلب' : 'Browse Chalets'}
            </Link>
          )}

          {activeTab === 'requirements' && (
            <button
              type="button"
              className="btn btn-brand"
              onClick={() => setShowRequirementModal(true)}
              style={{
                background: 'linear-gradient(135deg, #d4af37, #aa8214)',
                border: 'none',
                color: '#121212',
                fontWeight: 600,
                padding: '0.6rem 1.25rem',
              }}
            >
              <i className="bi bi-search-heart me-1"></i>
              {isRtl ? 'طلب وحدة بمواصفات خاصة' : 'New Custom Requirement'}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="broker-status-tabs mb-4">
        <button
          type="button"
          className={`broker-tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => handleTabChange('submissions')}
        >
          <i className="bi bi-houses-fill me-2"></i>
          {isRtl ? 'طلبات إضافة الشاليهات (للمعاينة)' : 'Chalet Submissions'}
        </button>

        <button
          type="button"
          className={`broker-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => handleTabChange('requests')}
        >
          <i className="bi bi-bag-check-fill me-2"></i>
          {isRtl ? 'طلبات الإيجار والشراء' : 'Rent & Buy Requests'}
        </button>

        <button
          type="button"
          className={`broker-tab-btn ${activeTab === 'requirements' ? 'active' : ''}`}
          onClick={() => handleTabChange('requirements')}
        >
          <i className="bi bi-sliders2 me-2"></i>
          {isRtl ? 'طلبات بمواصفات خاصة' : 'Custom Requirements'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-gold" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : activeTab === 'submissions' ? (
        /* TAB 1: SUBMISSIONS (Workflow 1) */
        submissions.items.length === 0 ? (
          <div className="broker-requests-table-card p-5 text-center">
            <i className="bi bi-houses text-gold d-block mb-3" style={{ fontSize: '3rem' }}></i>
            <h4 style={{ color: '#fff' }}>{isRtl ? 'لا توجد طلبات إضافة شاليهات حتى الآن' : 'No chalet submissions yet'}</h4>
            <p className="text-muted mb-4" style={{ maxWidth: '520px', margin: '0 auto' }}>
              {isRtl
                ? 'عندما يكون لديك شاليه وتريد عرضه عبر داركم، املأ 4 حقول فقط وسيقوم مسؤولو الشركة بمعاينته وتصويره تمهيداً لنشره.'
                : 'Got a chalet to list? Fill 4 simple fields and our team will inspect and photograph it.'}
            </p>
            <Link to="/broker/submit-property" className="btn btn-brand" style={{ background: '#d4af37', color: '#121212', fontWeight: 600 }}>
              <i className="bi bi-plus-circle-fill me-1"></i>
              {isRtl ? 'إضافة أول شاليه للمعاينة' : 'Submit First Chalet'}
            </Link>
          </div>
        ) : (
          <div className="broker-requests-table-card">
            <div className="table-responsive">
              <table className="broker-requests-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{isRtl ? 'القرية' : 'Village'}</th>
                    <th>{isRtl ? 'المنطقة' : 'Zone'}</th>
                    <th>{isRtl ? 'رقم الوحدة' : 'Unit No.'}</th>
                    <th>{isRtl ? 'المساحة' : 'Area'}</th>
                    <th>{isRtl ? 'تاريخ التقديم' : 'Date'}</th>
                    <th>{isRtl ? 'الحالة' : 'Status'}</th>
                    <th>{isRtl ? 'ملاحظات الإدارة' : 'Admin Notes'}</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: '#888' }}>{item.id || idx + 1}</td>
                      <td>
                        <strong className="text-white">
                          <i className="bi bi-geo-alt-fill text-gold me-1"></i>
                          {item.villageName}
                        </strong>
                      </td>
                      <td>{item.zoneName || '—'}</td>
                      <td>
                        <span className="badge bg-dark border border-secondary px-2 py-1">
                          {item.unitNumber}
                        </span>
                      </td>
                      <td>{item.area} {t('common.sqm', 'م²')}</td>
                      <td style={{ fontSize: '0.85rem', color: '#999' }}>
                        {new Date(item.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                      </td>
                      <td>{getStatusBadge(item.status, isRtl)}</td>
                      <td style={{ fontSize: '0.88rem', color: item.adminNotes ? '#ffc107' : '#777' }}>
                        {item.adminNotes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {submissions.totalPages > 1 && (
              <div className="d-flex justify-content-center p-3">
                <nav>
                  <ul className="pagination mb-0">
                    {Array.from({ length: submissions.totalPages }, (_, i) => i + 1).map((p) => (
                      <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(p)}>
                          {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            )}
          </div>
        )
      ) : activeTab === 'requests' ? (
        /* TAB 2: PROPERTY REQUESTS (Workflow 2) */
        propertyRequests.items.length === 0 ? (
          <div className="broker-requests-table-card p-5 text-center">
            <i className="bi bi-bag-x text-gold d-block mb-3" style={{ fontSize: '3rem' }}></i>
            <h4 style={{ color: '#fff' }}>{isRtl ? 'لا توجد طلبات إيجار أو شراء مسجلة' : 'No rent/buy requests yet'}</h4>
            <p className="text-muted mb-4" style={{ maxWidth: '520px', margin: '0 auto' }}>
              {isRtl
                ? 'تصفح شاليهات الساحل الشمالي المعروضة على داركم، واضغط على "طلب إيجار" أو "طلب شراء" لتقديم طلب مباشر باسمك دون دفع.'
                : 'Browse our North Coast catalog and click Rent/Buy to request units directly without online payment.'}
            </p>
            <Link to="/properties" className="btn btn-brand" style={{ background: '#d4af37', color: '#121212', fontWeight: 600 }}>
              <i className="bi bi-search me-1"></i>
              {isRtl ? 'تصفح الشاليهات الآن' : 'Browse Chalets Now'}
            </Link>
          </div>
        ) : (
          <div className="broker-requests-table-card">
            <div className="table-responsive">
              <table className="broker-requests-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{isRtl ? 'الشاليه المطلوب' : 'Property'}</th>
                    <th>{isRtl ? 'النوع' : 'Purpose'}</th>
                    <th>{isRtl ? 'فترة الإيجار' : 'Rental Period'}</th>
                    <th>{isRtl ? 'تاريخ الطلب' : 'Date'}</th>
                    <th>{isRtl ? 'الحالة' : 'Status'}</th>
                    <th>{isRtl ? 'ملاحظاتك' : 'Your Notes'}</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyRequests.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: '#888' }}>{item.id || idx + 1}</td>
                      <td>
                        <strong className="text-white">
                          <i className="bi bi-building text-gold me-1"></i>
                          {item.propertyTitle || `Chalet #${item.propertyId}`}
                        </strong>
                      </td>
                      <td>
                        <span className="badge bg-dark border border-secondary px-2 py-1">
                          {item.purpose === 'Rent' ? (isRtl ? 'إيجار' : 'Rent') : (isRtl ? 'شراء' : 'Sale')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {item.startDate && item.endDate ? (
                          <span>
                            {new Date(item.startDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                            {' '}&rarr;{' '}
                            {new Date(item.endDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#999' }}>
                        {new Date(item.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                      </td>
                      <td>{getStatusBadge(item.status, isRtl)}</td>
                      <td style={{ fontSize: '0.88rem', color: '#aaa', maxWidth: '200px' }} className="text-truncate">
                        {item.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {propertyRequests.totalPages > 1 && (
              <div className="d-flex justify-content-center p-3">
                <nav>
                  <ul className="pagination mb-0">
                    {Array.from({ length: propertyRequests.totalPages }, (_, i) => i + 1).map((p) => (
                      <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(p)}>
                          {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            )}
          </div>
        )
      ) : (
        /* TAB 3: CUSTOM REQUIREMENTS (Workflow 3) */
        requirements.items.length === 0 ? (
          <div className="broker-requests-table-card p-5 text-center">
            <i className="bi bi-search-heart text-gold d-block mb-3" style={{ fontSize: '3rem' }}></i>
            <h4 style={{ color: '#fff' }}>{isRtl ? 'لم تسجل أي طلبات خاصة حتى الآن' : 'No custom requirements yet'}</h4>
            <p className="text-muted mb-4" style={{ maxWidth: '520px', margin: '0 auto' }}>
              {isRtl
                ? 'مش لاقي الشاليه المناسب لعميلك؟ اضغط على الزر بالأسفل وسجل مواصفات الشاليه المطلوب وسيتولى فريق داركم البحث والتنسيق معك.'
                : 'Need a specific unit not listed in the catalog? Tell us the specs and we will find it.'}
            </p>
            <button
              type="button"
              className="btn btn-brand"
              onClick={() => setShowRequirementModal(true)}
              style={{ background: '#d4af37', color: '#121212', fontWeight: 600 }}
            >
              <i className="bi bi-search-heart me-1"></i>
              {isRtl ? 'طلب وحدة بمواصفات خاصة' : 'Request Custom Chalet'}
            </button>
          </div>
        ) : (
          <div className="broker-requests-table-card">
            <div className="table-responsive">
              <table className="broker-requests-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{isRtl ? 'الغرض' : 'Purpose'}</th>
                    <th>{isRtl ? 'القرية / المنطقة' : 'Village / Zone'}</th>
                    <th>{isRtl ? 'المواصفات' : 'Specs'}</th>
                    <th>{isRtl ? 'الميزانية' : 'Budget'}</th>
                    <th>{isRtl ? 'الفترة المطلوبة' : 'Period'}</th>
                    <th>{isRtl ? 'الحالة' : 'Status'}</th>
                    <th>{isRtl ? 'تاريخ الطلب' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: '#888' }}>{item.id || idx + 1}</td>
                      <td>
                        <span className="badge bg-dark border border-secondary px-2 py-1">
                          {item.purpose === 'Rent' ? (isRtl ? 'إيجار' : 'Rent') : (isRtl ? 'شراء' : 'Sale')}
                        </span>
                      </td>
                      <td>
                        <strong className="text-white">
                          {item.villageName || (isRtl ? 'أي قرية' : 'Any Village')}
                        </strong>
                        {item.zoneName && <span className="text-muted ms-1">({item.zoneName})</span>}
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>
                        {item.area ? `${item.area} م²` : ''}
                        {item.bedrooms ? ` • ${item.bedrooms} ${isRtl ? 'غرف' : 'beds'}` : ''}
                        {!item.area && !item.bedrooms ? '—' : ''}
                      </td>
                      <td style={{ color: '#d4af37', fontWeight: 600 }}>
                        {item.maxPrice ? `${Number(item.maxPrice).toLocaleString('en-US')} ج.م` : '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {item.startDate && item.endDate ? (
                          <span>
                            {new Date(item.startDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                            {' '}&rarr;{' '}
                            {new Date(item.endDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{getStatusBadge(item.status, isRtl)}</td>
                      <td style={{ fontSize: '0.85rem', color: '#999' }}>
                        {new Date(item.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {requirements.totalPages > 1 && (
              <div className="d-flex justify-content-center p-3">
                <nav>
                  <ul className="pagination mb-0">
                    {Array.from({ length: requirements.totalPages }, (_, i) => i + 1).map((p) => (
                      <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(p)}>
                          {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            )}
          </div>
        )
      )}

      {/* Custom Requirement Modal */}
      <BrokerCustomRequirementModal
        show={showRequirementModal}
        onClose={() => setShowRequirementModal(false)}
        onSuccess={loadData}
      />
    </main>
  );
}
