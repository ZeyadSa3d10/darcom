import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { brokerService } from '../../services/brokerService.js';
import './BrokerProperties.css';

export default function BrokerProperties() {
  const { isRtl, t } = useSettings();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get('status') || '';
  const currentPage = Number(searchParams.get('page') || 1);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 });

  // Rental Periods modal state
  const [selectedPropForRental, setSelectedPropForRental] = useState(null);
  const [rentalPeriods, setRentalPeriods] = useState([]);
  const [loadingRentals, setLoadingRentals] = useState(false);

  useSeo({
    title: `${isRtl ? 'شاليهاتي المعروضة' : 'My Chalets'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'استعراض وإدارة الشاليهات الخاصة بالوسيط العقاري وحالات اعتمادها وفترات الحجز'
      : 'Browse and manage your broker chalet listings and confirmed rental reservations.',
  });

  const loadProperties = async () => {
    setLoading(true);
    try {
      const res = await brokerService.myProperties({
        status: currentStatus || undefined,
        page: currentPage,
        pageSize: 12,
      });
      setData(res.data || { items: [], total: 0, totalPages: 1 });
    } catch (err) {
      toast.error(err.message || (isRtl ? 'فشل تحميل الشاليهات' : 'Failed to load properties'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, [currentStatus, currentPage]);

  const handleStatusTab = (status) => {
    const next = new URLSearchParams(searchParams);
    if (status) next.set('status', status);
    else next.delete('status');
    next.set('page', '1');
    setSearchParams(next);
  };

  const handlePageChange = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const openRentalPeriods = async (property) => {
    setSelectedPropForRental(property);
    setLoadingRentals(true);
    try {
      const res = await brokerService.propertyRentalPeriods(property.id);
      setRentalPeriods(res.data || []);
    } catch {
      setRentalPeriods([]);
    } finally {
      setLoadingRentals(false);
    }
  };

  return (
    <main className="container broker-properties-page" id="main-content">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/broker/dashboard" className="text-gold text-decoration-none" style={{ fontSize: '0.9rem' }}>
              <i className={`bi ${isRtl ? 'bi-arrow-right' : 'bi-arrow-left'} me-1`}></i>
              {isRtl ? 'العودة للوحة تحكم البروكر' : 'Back to Dashboard'}
            </Link>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
            <i className="bi bi-houses-fill me-2 text-gold"></i>
            {isRtl ? 'شاليهاتي ووحداتي' : 'My Properties'}
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
            {isRtl
              ? `إجمالي الوحدات: ${data.total} شاليه مربوط بحسابك`
              : `Total Units: ${data.total} listings associated with your account`}
          </p>
        </div>

        <div>
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
            {isRtl ? 'طلب إضافة شاليه جديد' : 'Submit New Chalet'}
          </Link>
        </div>
      </div>

      {/* Filter Tabs by Status */}
      <div className="broker-status-tabs">
        <button
          type="button"
          className={`broker-tab-btn ${currentStatus === '' ? 'active' : ''}`}
          onClick={() => handleStatusTab('')}
        >
          {isRtl ? 'كافة الشاليهات' : 'All Properties'}
        </button>
        <button
          type="button"
          className={`broker-tab-btn ${currentStatus === 'Published' ? 'active' : ''}`}
          onClick={() => handleStatusTab('Published')}
        >
          <i className="bi bi-check-circle-fill text-success me-1"></i>
          {isRtl ? 'المعتمدة والمنشورة' : 'Active / Published'}
        </button>
        <button
          type="button"
          className={`broker-tab-btn ${currentStatus === 'PendingReview' ? 'active' : ''}`}
          onClick={() => handleStatusTab('PendingReview')}
        >
          <i className="bi bi-clock-history text-warning me-1"></i>
          {isRtl ? 'قيد مراجعة الإدارة' : 'Pending Review'}
        </button>
        <button
          type="button"
          className={`broker-tab-btn ${currentStatus === 'Rejected' ? 'active' : ''}`}
          onClick={() => handleStatusTab('Rejected')}
        >
          <i className="bi bi-x-circle-fill text-danger me-1"></i>
          {isRtl ? 'مرفوضة / بحاجة لتعديل' : 'Rejected'}
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-gold" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">{isRtl ? 'جاري تحميل شاليهاتك...' : 'Loading your chalets...'}</p>
        </div>
      ) : data.items.length === 0 ? (
        /* Empty State */
        <div className="text-center py-5 broker-form-card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
          <i className="bi bi-house-slash text-gold" style={{ fontSize: '3.5rem' }}></i>
          <h3 className="mt-3 text-white">
            {isRtl ? 'لا توجد شاليهات في هذا التبويب' : 'No properties found'}
          </h3>
          <p className="text-muted">
            {isRtl
              ? 'لم تقم بإضافة شاليهات بهذه الحالة حتى الآن، أو لم يتم تقديم شاليهات بعد.'
              : 'You have no listings under this status yet.'}
          </p>
          <Link to="/broker/submit-property" className="btn btn-brand mt-2">
            <i className="bi bi-plus-lg me-1"></i>
            {isRtl ? 'تقديم شاليه لمراجعة الإدارة' : 'Submit a Chalet'}
          </Link>
        </div>
      ) : (
        /* Grid of Properties */
        <>
          <div className="row g-4">
            {data.items.map((prop) => {
              const statusKey = prop.status?.toLowerCase();
              return (
                <div key={prop.id} className="col-12 col-md-6 col-lg-4">
                  <div className="broker-property-card h-100">
                    <div className="broker-card-img-wrap">
                      <img
                        src={prop.primaryImageUrl || '/placeholder.jpg'}
                        alt={prop.title}
                        className="broker-card-img"
                        onError={(e) => {
                          e.target.src = '/placeholder.jpg';
                        }}
                      />
                      <span className="broker-card-purpose-badge">
                        {prop.purpose === 'Rent' ? (isRtl ? 'إيجار' : 'Rent') : (isRtl ? 'بيع' : 'Sale')}
                      </span>
                      <span className={`broker-card-status-badge ${statusKey}`}>
                        {prop.status}
                      </span>
                    </div>

                    <div className="broker-card-body">
                      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                        Ref: {prop.referenceNumber}
                      </div>

                      <h3 className="broker-card-title" title={prop.title}>
                        {prop.title}
                      </h3>

                      <div className="broker-card-location">
                        <i className="bi bi-geo-alt-fill"></i>
                        <span>
                          {prop.villageName || 'North Coast'}
                          {prop.zoneName ? ` · ${prop.zoneName}` : ''}
                          {prop.buildingNumber ? ` · B:${prop.buildingNumber}` : ''}
                        </span>
                      </div>

                      <div className="broker-card-specs">
                        {prop.bedrooms != null && (
                          <span>
                            <i className="bi bi-door-closed me-1"></i>
                            {prop.bedrooms} {isRtl ? 'غرف' : 'Beds'}
                          </span>
                        )}
                        {prop.bathrooms != null && (
                          <span>
                            <i className="bi bi-droplet me-1"></i>
                            {prop.bathrooms} {isRtl ? 'حمام' : 'Baths'}
                          </span>
                        )}
                        {prop.area != null && (
                          <span>
                            <i className="bi bi-aspect-ratio me-1"></i>
                            {prop.area} م²
                          </span>
                        )}
                      </div>

                      {/* Display Admin Rejection Feedback clearly if rejected */}
                      {prop.status === 'Rejected' && prop.rejectionReason && (
                        <div className="broker-rejection-alert">
                          <strong>
                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                            {isRtl ? 'سبب الرفض من الإدارة:' : 'Admin Rejection Reason:'}
                          </strong>
                          {prop.rejectionReason}
                        </div>
                      )}

                      <div className="broker-card-price">
                        {prop.price?.toLocaleString()} <small>{prop.currency || 'EGP'}</small>
                      </div>

                      <div className="broker-card-actions">
                        {prop.status === 'Published' && prop.slug && (
                          <Link
                            to={`/properties/${prop.slug}`}
                            target="_blank"
                            className="btn btn-outline-secondary btn-sm flex-fill"
                          >
                            <i className="bi bi-eye me-1"></i>
                            {isRtl ? 'عرض الإعلان' : 'View Listing'}
                          </Link>
                        )}

                        {prop.purpose === 'Rent' && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm flex-fill"
                            onClick={() => openRentalPeriods(prop)}
                          >
                            <i className="bi bi-calendar3 me-1"></i>
                            {isRtl ? 'الحجوزات' : 'Rental Periods'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="d-flex justify-content-center gap-2 mt-5">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <i className={`bi ${isRtl ? 'bi-chevron-right' : 'bi-chevron-left'} me-1`}></i>
                {isRtl ? 'السابق' : 'Previous'}
              </button>
              <span className="align-self-center text-muted px-2" style={{ fontSize: '0.9rem' }}>
                {currentPage} / {data.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={currentPage >= data.totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                {isRtl ? 'التالي' : 'Next'}
                <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} ms-1`}></i>
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal for Confirmed Rental Periods */}
      {selectedPropForRental && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ background: '#1c1b18', border: '1px solid #d4af37', color: '#fff', borderRadius: '16px' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'rgba(212, 175, 55, 0.25)' }}>
                <div>
                  <h5 className="modal-title" style={{ color: '#d4af37', fontWeight: 600 }}>
                    <i className="bi bi-calendar-check me-2"></i>
                    {isRtl ? 'فترات الحجز المؤكدة للشاليه' : 'Confirmed Rental Periods'}
                  </h5>
                  <small className="text-muted">{selectedPropForRental.title} (Ref: {selectedPropForRental.referenceNumber})</small>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedPropForRental(null)}></button>
              </div>

              <div className="modal-body">
                {loadingRentals ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-gold" role="status"></div>
                  </div>
                ) : rentalPeriods.length === 0 ? (
                  <p className="text-muted text-center py-4 mb-0">
                    {isRtl ? 'لا توجد فترات حجز مؤكدة لهذا الشاليه حالياً.' : 'No confirmed rental periods for this chalet yet.'}
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-dark table-hover mb-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <thead>
                        <tr>
                          <th>{isRtl ? 'من تاريخ' : 'Start Date'}</th>
                          <th>{isRtl ? 'إلى تاريخ' : 'End Date'}</th>
                          <th>{isRtl ? 'اسم المستأجر' : 'Renter Name'}</th>
                          <th>{isRtl ? 'ملاحظات' : 'Notes'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rentalPeriods.map((rp) => (
                          <tr key={rp.id}>
                            <td>{new Date(rp.startDate).toLocaleDateString()}</td>
                            <td>{new Date(rp.endDate).toLocaleDateString()}</td>
                            <td>{rp.renterName}</td>
                            <td className="text-muted">{rp.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top" style={{ borderColor: 'rgba(212, 175, 55, 0.25)' }}>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setSelectedPropForRental(null)}>
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

