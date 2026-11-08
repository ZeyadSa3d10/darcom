import { useEffect, useState } from 'react';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { brokerService } from '../../../services/brokerService.js';
import { locationService } from '../../../services/locationService.js';

export default function BrokerCustomRequirementModal({ show, onClose, onSuccess }) {
  const { isRtl } = useSettings();
  const toast = useToast();

  const [purpose, setPurpose] = useState('Rent');
  const [villages, setVillages] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [area, setArea] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const [loadingVillages, setLoadingVillages] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load villages
  useEffect(() => {
    if (!show) return;
    let active = true;
    const fetchVillages = async () => {
      setLoadingVillages(true);
      try {
        const res = await locationService.getVillages();
        if (active) {
          const list = Array.isArray(res) ? res : res?.data || [];
          setVillages(list);
        }
      } catch {
        if (active) setVillages([]);
      } finally {
        if (active) setLoadingVillages(false);
      }
    };
    fetchVillages();
    return () => {
      active = false;
    };
  }, [show]);

  // Load zones on village change
  useEffect(() => {
    if (!selectedVillage) {
      setZones([]);
      setSelectedZone('');
      return;
    }
    let active = true;
    const fetchZones = async () => {
      setLoadingZones(true);
      try {
        const res = await locationService.getZones(selectedVillage);
        if (active) {
          const list = Array.isArray(res) ? res : res?.data || [];
          setZones(list);
        }
      } catch {
        if (active) setZones([]);
      } finally {
        if (active) setLoadingZones(false);
      }
    };
    fetchZones();
    return () => {
      active = false;
    };
  }, [selectedVillage]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (purpose === 'Rent' && startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setError(isRtl ? 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول.' : 'End date must be after start date.');
      return;
    }

    setSubmitting(true);
    try {
      await brokerService.createRequirement({
        purpose,
        villageId: selectedVillage ? Number(selectedVillage) : null,
        zoneId: selectedZone ? Number(selectedZone) : null,
        area: area ? Number(area) : null,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        maxPrice: budget ? Number(budget) : null,
        startDate: purpose === 'Rent' && startDate ? startDate : null,
        endDate: purpose === 'Rent' && endDate ? endDate : null,
        notes: notes?.trim() || null,
      });

      toast.success(
        isRtl
          ? 'تم تسجيل طلبك الخاص بنجاح! سيبحث فريق داركم عن الوحدة المناسبة ويتواصل معك.'
          : 'Custom requirement submitted! Our team will search and contact you soon.',
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || (isRtl ? 'فشل تسجيل الطلب' : 'Failed to submit requirement'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div
          className="modal-content"
          style={{
            backgroundColor: '#161616',
            color: '#fff',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          }}
        >
          <div
            className="modal-header"
            style={{
              borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
              padding: '1.25rem 1.5rem',
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-search-heart text-gold" style={{ fontSize: '1.5rem' }}></i>
              <h5 className="modal-title mb-0" style={{ fontWeight: 700, color: '#fff' }}>
                {isRtl ? 'طلب وحدة بمواصفات خاصة' : 'Custom Property Requirement'}
              </h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
              disabled={submitting}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <p className="text-muted mb-4" style={{ fontSize: '0.92rem' }}>
                {isRtl
                  ? 'مش لاقي الشاليه المناسب لعميلك في المعروض؟ اكتب لنا مواصفاته وسيتولى فريق داركم البحث والتنسيق معك مباشرة.'
                  : 'Cannot find the right chalet? Tell us your client specifications and our team will source it for you.'}
              </p>

              {error && (
                <div
                  className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3"
                  style={{ backgroundColor: 'rgba(220, 53, 69, 0.15)', borderColor: '#dc3545', color: '#ff858d' }}
                >
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{error}</span>
                </div>
              )}

              {/* Purpose */}
              <div className="mb-3">
                <label className="form-label text-gold" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {isRtl ? 'الغرض المطلوبة له الوحدة *' : 'Purpose *'}
                </label>
                <div className="d-flex gap-3">
                  <div
                    className={`p-3 rounded flex-grow-1 text-center cursor-pointer ${purpose === 'Rent' ? 'border-gold' : 'border-secondary'}`}
                    style={{
                      backgroundColor: purpose === 'Rent' ? 'rgba(212, 175, 55, 0.15)' : '#1e1e1e',
                      border: purpose === 'Rent' ? '1px solid #d4af37' : '1px solid #333',
                      cursor: 'pointer',
                    }}
                    onClick={() => setPurpose('Rent')}
                  >
                    <i className="bi bi-key-fill d-block mb-1 text-gold" style={{ fontSize: '1.2rem' }}></i>
                    <strong>{isRtl ? 'إيجار مصيفي' : 'Rent (Summer Vacation)'}</strong>
                  </div>
                  <div
                    className={`p-3 rounded flex-grow-1 text-center cursor-pointer ${purpose === 'Sale' ? 'border-gold' : 'border-secondary'}`}
                    style={{
                      backgroundColor: purpose === 'Sale' ? 'rgba(212, 175, 55, 0.15)' : '#1e1e1e',
                      border: purpose === 'Sale' ? '1px solid #d4af37' : '1px solid #333',
                      cursor: 'pointer',
                    }}
                    onClick={() => setPurpose('Sale')}
                  >
                    <i className="bi bi-house-door-fill d-block mb-1 text-gold" style={{ fontSize: '1.2rem' }}></i>
                    <strong>{isRtl ? 'شراء وتمليك' : 'Purchase / Sale'}</strong>
                  </div>
                </div>
              </div>

              {/* Village and Zone */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>
                    {isRtl ? 'القرية المطلوبة (الساحل الشمالي)' : 'Desired Village (North Coast)'}
                  </label>
                  <select
                    className="form-select"
                    value={selectedVillage}
                    onChange={(e) => setSelectedVillage(e.target.value)}
                    style={{ backgroundColor: '#1e1e1e', color: '#fff', borderColor: '#333' }}
                    disabled={loadingVillages}
                  >
                    <option value="">{isRtl ? '-- أي قرية في الساحل --' : '-- Any Village in North Coast --'}</option>
                    {villages.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>
                    {isRtl ? 'المنطقة داخل القرية (اختياري)' : 'Zone (Optional)'}
                  </label>
                  <select
                    className="form-select"
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    style={{ backgroundColor: '#1e1e1e', color: '#fff', borderColor: '#333' }}
                    disabled={!selectedVillage || loadingZones}
                  >
                    <option value="">{isRtl ? '-- غير محدد --' : '-- Any Zone --'}</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Area, Bedrooms & Budget */}
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>
                    {isRtl ? 'المساحة المطلوبة (م²)' : 'Desired Area (m²)'}
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="5000"
                    className="form-control"
                    placeholder="مثال: 120"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    style={{ backgroundColor: '#1e1e1e', color: '#fff', borderColor: '#333' }}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>
                    {isRtl ? 'عدد الغرف' : 'Bedrooms'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="form-control"
                    placeholder="مثال: 3"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    style={{ backgroundColor: '#1e1e1e', color: '#fff', borderColor: '#333' }}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>
                    {isRtl ? 'الميزانية التقريبية (جنيه)' : 'Approx Budget (EGP)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    placeholder={purpose === 'Rent' ? (isRtl ? 'مثال: 5000 لليوم' : 'e.g. 5000/day') : (isRtl ? 'مثال: 4500000' : 'e.g. 4500000')}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    style={{ backgroundColor: '#1e1e1e', color: '#fff', borderColor: '#333' }}
                  />
                </div>
              </div>

              {/* Rental Dates if Rent */}
              {purpose === 'Rent' && (
                <div className="row g-3 mb-3 p-3 rounded" style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)', border: '1px dashed rgba(212, 175, 55, 0.3)' }}>
                  <div className="col-md-6">
                    <label className="form-label text-gold" style={{ fontSize: '0.85rem' }}>
                      {isRtl ? 'تاريخ الوصول المتوقع' : 'Expected Check-in'}
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ backgroundColor: '#1e1e1e', color: '#fff', borderColor: '#333' }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-gold" style={{ fontSize: '0.85rem' }}>
                      {isRtl ? 'تاريخ المغادرة المتوقع' : 'Expected Check-out'}
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ backgroundColor: '#1e1e1e', color: '#fff', borderColor: '#333' }}
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mb-2">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  {isRtl ? 'ملاحظات أو مواصفات إضافية (فيو بحر، حديقة، دور معين...)' : 'Additional Notes / Preferences'}
                </label>
                <textarea
                  rows="3"
                  className="form-control"
                  placeholder={isRtl ? 'اكتب أي تفاصيل إضافية عن رغبة العميل...' : 'Any specific requirements...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ backgroundColor: '#1e1e1e', color: '#fff', borderColor: '#333' }}
                />
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                padding: '1rem 1.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="btn btn-brand"
                disabled={submitting}
                style={{
                  background: 'linear-gradient(135deg, #d4af37, #aa8214)',
                  border: 'none',
                  color: '#121212',
                  fontWeight: 600,
                  padding: '0.55rem 1.75rem',
                }}
              >
                {submitting ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    {isRtl ? 'جارٍ الإرسال...' : 'Submitting...'}
                  </span>
                ) : (
                  <span>
                    <i className="bi bi-send-fill me-1"></i>
                    {isRtl ? 'إرسال المواصفات المطلوبة' : 'Submit Requirement'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

