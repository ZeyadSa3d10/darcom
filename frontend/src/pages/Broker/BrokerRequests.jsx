import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { brokerService } from '../../services/brokerService.js';
import BrokerClientRequestModal from './components/BrokerClientRequestModal.jsx';
import './BrokerRequests.css';

export default function BrokerRequests() {
  const { isRtl, t } = useSettings();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'client-requests';
  const currentPage = Number(searchParams.get('page') || 1);

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState({ items: [], total: 0, totalPages: 1 });
  const [clientRequests, setClientRequests] = useState({ items: [], total: 0, totalPages: 1 });
  const [showClientModal, setShowClientModal] = useState(false);

  useSeo({
    title: `${isRtl ? 'طلباتي ومتابعة الاعتماد' : 'Submissions & Requests'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'متابعة حالة مراجعة الشاليهات وطلبات العملاء المقدمة من قبل الوسيط العقاري'
      : 'Track chalet submission reviews and client booking requests.',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'submissions') {
        const res = await brokerService.myProperties({ page: currentPage, pageSize: 12 });
        setSubmissions(res.data || { items: [], total: 0, totalPages: 1 });
      } else {
        const res = await brokerService.myRequests(currentPage, 12);
        setClientRequests(res.data || { items: [], total: 0, totalPages: 1 });
      }
    } catch (err) {
      toast.error(err.message || (isRtl ? 'فشل تحميل البيانات' : 'Failed to load data'));
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
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/broker/dashboard" className="text-gold text-decoration-none" style={{ fontSize: '0.9rem' }}>
              <i className={`bi ${isRtl ? 'bi-arrow-right' : 'bi-arrow-left'} me-1`}></i>
              {isRtl ? 'العودة للوحة تحكم البروكر' : 'Back to Dashboard'}
            </Link>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
            <i className="bi bi-card-checklist me-2 text-gold"></i>
            {isRtl ? 'طلباتي ومتابعة الاعتماد' : 'Submissions & Requests'}
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
            {isRtl
              ? 'متابعة شاليهاتك المرسلة لمراجعة الإدارة، وسجل طلبات عملائك'
              : 'Track submitted chalet listings and client inquiries.'}
          </p>
        </div>

        <div className="d-flex gap-2">
          {activeTab === 'client-requests' ? (
            <button
              type="button"
              className="btn btn-brand"
              onClick={() => setShowClientModal(true)}
              style={{
                background: 'linear-gradient(135deg, #d4af37, #aa8214)',
                border: 'none',
                color: '#121212',
                fontWeight: 600,
              }}
            >
              <i className="bi bi-person-plus me-1"></i>
              {isRtl ? 'تقديم طلب جديد لعميل' : 'Submit Client Request'}
            </button>
          ) : (
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
              {isRtl ? 'طلب إضافة شاليه' : 'Submit Chalet'}
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="broker-status-tabs">
        <button
          type="button"
          className={`broker-tab-btn ${activeTab === 'client-requests' ? 'active' : ''}`}
          onClick={() => handleTabChange('client-requests')}
        >
          <i className="bi bi-people-fill me-1"></i>
          {isRtl ? 'طلبات العملاء (Client Requests)' : 'Client Requests'}
        </button>

        <button
          type="button"
          className={`broker-tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => handleTabChange('submissions')}
        >
          <i className="bi bi-file-earmark-check-fill me-1"></i>
          {isRtl ? 'مراجعة واعتماد الشاليهات (Chalet Submissions)' : 'Chalet Submissions'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-gold" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : activeTab === 'client-requests' ? (
        /* Tab 1: Client Requests */
        clientRequests.items.length === 0 ? (
          <div className="text-center py-5 broker-form-card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
            <i className="bi bi-inbox text-gold" style={{ fontSize: '3.5rem' }}></i>
            <h3 className="mt-3 text-white">{isRtl ? 'لا توجد طلبات عملاء حتى الآن' : 'No client requests yet'}</h3>
            <p className="text-muted">
              {isRtl
                ? 'يمكنك تقديم طلب حجز أو شراء نيابة عن عملائك على أي شاليه من شاليهات داركوم لتوثيق عمولتك.'
                : 'You can submit booking or purchase requests for your clients on any Darcom listing.'}
            </p>
            <button
              type="button"
              className="btn btn-brand mt-2"
              onClick={() => setShowClientModal(true)}
            >
              <i className="bi bi-plus-lg me-1"></i>
              {isRtl ? 'تقديم أول طلب لعميل' : 'Submit First Client Request'}
            </button>
          </div>
        ) : (
          <div className="broker-requests-table-card">
            <div className="table-responsive">
              <table className="broker-requests-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>{isRtl ? 'الشاليه / الوحدة' : 'Property / Chalet'}</th>
                    <th>{isRtl ? 'اسم العميل' : 'Client Name'}</th>
                    <th>{isRtl ? 'هاتف العميل' : 'Phone'}</th>
                    <th>{isRtl ? 'الغرض والتواريخ' : 'Purpose & Dates'}</th>
                    <th>{isRtl ? 'الحالة' : 'Status'}</th>
                    <th>{isRtl ? 'تاريخ التقديم' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {clientRequests.items.map((r) => (
                    <tr key={r.id}>
                      <td><strong>BR-{r.id}</strong></td>
                      <td>
                        <strong>{r.propertyTitle}</strong>
                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>ID: #{r.propertyId}</div>
                      </td>
                      <td>{r.clientName}</td>
                      <td>{r.clientPhone}</td>
                      <td>
                        <span className="badge bg-secondary me-1">{r.purpose}</span>
                        {r.startDate && r.endDate && (
                          <small className="text-muted d-block mt-1">
                            {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${r.status?.toLowerCase() === 'confirmed' ? 'bg-success' : r.status?.toLowerCase() === 'cancelled' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Tab 2: Chalet Submissions */
        submissions.items.length === 0 ? (
          <div className="text-center py-5 broker-form-card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
            <i className="bi bi-file-earmark-x text-gold" style={{ fontSize: '3.5rem' }}></i>
            <h3 className="mt-3 text-white">{isRtl ? 'لم يتم تقديم شاليهات للمراجعة بعد' : 'No submitted chalets yet'}</h3>
            <p className="text-muted">
              {isRtl
                ? 'قدم شاليهاتك الجديدة ليتم تدقيقها من مسؤولي داركوم ونشرها للعملاء.'
                : 'Submit new chalets to be reviewed by Darcom admins and published.'}
            </p>
            <Link to="/broker/submit-property" className="btn btn-brand mt-2">
              <i className="bi bi-plus-lg me-1"></i>
              {isRtl ? 'تقديم شاليه للمراجعة' : 'Submit a Chalet'}
            </Link>
          </div>
        ) : (
          <div className="broker-requests-table-card">
            <div className="table-responsive">
              <table className="broker-requests-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>{isRtl ? 'عنوان الشاليه' : 'Chalet Title'}</th>
                    <th>{isRtl ? 'الموقع' : 'Location'}</th>
                    <th>{isRtl ? 'الغرض والسعر' : 'Purpose & Price'}</th>
                    <th>{isRtl ? 'حالة الاعتماد' : 'Review Status'}</th>
                    <th>{isRtl ? 'ملاحظات الإدارة' : 'Admin Feedback'}</th>
                    <th>{isRtl ? 'تاريخ التقديم' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.items.map((p) => {
                    const statusKey = p.status?.toLowerCase();
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.referenceNumber}</strong></td>
                        <td>
                          <strong>{p.title}</strong>
                          {p.buildingNumber && (
                            <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                              B: {p.buildingNumber}
                            </div>
                          )}
                        </td>
                        <td>
                          {p.villageName || 'North Coast'}
                          {p.zoneName ? ` · ${p.zoneName}` : ''}
                        </td>
                        <td>
                          <span className="badge bg-secondary me-1">{p.purpose}</span>
                          <span>{p.price?.toLocaleString()} {p.currency}</span>
                        </td>
                        <td>
                          <span className={`broker-status-pill ${statusKey}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          {p.status === 'Rejected' && p.rejectionReason ? (
                            <span className="text-danger" style={{ fontSize: '0.85rem' }}>
                              <i className="bi bi-exclamation-circle me-1"></i>
                              {p.rejectionReason}
                            </span>
                          ) : p.status === 'PendingReview' ? (
                            <span className="text-warning" style={{ fontSize: '0.85rem' }}>
                              <i className="bi bi-hourglass me-1"></i>
                              {isRtl ? 'قيد التدقيق الداخلي' : 'Under Review'}
                            </span>
                          ) : (
                            <span className="text-success" style={{ fontSize: '0.85rem' }}>
                              <i className="bi bi-check2-all me-1"></i>
                              {isRtl ? 'معتمد ومنشور' : 'Published'}
                            </span>
                          )}
                        </td>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Pagination */}
      {((activeTab === 'client-requests' && clientRequests.totalPages > 1) ||
        (activeTab === 'submissions' && submissions.totalPages > 1)) && (
        <div className="d-flex justify-content-center gap-2 mt-4">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            {isRtl ? 'السابق' : 'Previous'}
          </button>
          <span className="align-self-center text-muted px-2" style={{ fontSize: '0.9rem' }}>
            {currentPage} / {activeTab === 'client-requests' ? clientRequests.totalPages : submissions.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={
              currentPage >=
              (activeTab === 'client-requests' ? clientRequests.totalPages : submissions.totalPages)
            }
            onClick={() => handlePageChange(currentPage + 1)}
          >
            {isRtl ? 'التالي' : 'Next'}
          </button>
        </div>
      )}

      {/* Modal for Client Request */}
      <BrokerClientRequestModal
        show={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSuccess={loadData}
      />
    </main>
  );
}

