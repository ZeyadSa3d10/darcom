import { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { brokerService } from '../../../services/brokerService.js';

export default function BrokerDirectRequestModal({ show, onClose, property }) {
  const { isRtl } = useSettings();
  const { user } = useAuth();
  const toast = useToast();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!show || !property) return null;

  const isRent = (property.purpose || '').toLowerCase() === 'rent';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRent) {
      if (!startDate || !endDate) {
        setError(isRtl ? 'يرجى تحديد تاريخ البداية والنهاية للإيجار.' : 'Please select start and end dates.');
        return;
      }
      if (new Date(endDate) <= new Date(startDate)) {
        setError(isRtl ? 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية.' : 'End date must be after start date.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await brokerService.createPropertyRequest({
        propertyId: property.id,
        purpose: property.purpose || (isRent ? 'Rent' : 'Sale'),
        startDate: isRent ? startDate : null,
        endDate: isRent ? endDate : null,
        notes: notes?.trim() || null,
      });

      toast.success(
        isRtl
          ? 'تم تقديم طلبك بنجاح! سيتواصل معك مسؤولو داركم هاتفياً لإتمام التفاصيل.'
          : 'Request submitted successfully! Our team will contact you shortly.',
      );
      onClose();
    } catch (err) {
      setError(err.message || (isRtl ? 'تعذر إرسال الطلب. يرجى المحاولة لاحقاً.' : 'Failed to submit request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '540px' }}>
        <div className="modal-content bg-dark text-white border border-secondary border-opacity-50 shadow-lg rounded-4">
          <div className="modal-header border-secondary border-opacity-25 pb-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className={`bi ${isRent ? 'bi-calendar-check' : 'bi-bag-check'} text-gold`} style={{ color: '#d4af37' }}></i>
              <span>{isRent ? (isRtl ? 'طلب إيجار شاليه' : 'Chalet Rental Request') : (isRtl ? 'طلب شراء شاليه' : 'Chalet Purchase Request')}</span>
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body py-3">
              {error && (
                <div className="alert alert-danger py-2 px-3 text-sm mb-3">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {/* Property Summary Pill */}
              <div className="p-3 rounded-3 bg-secondary bg-opacity-25 border border-secondary border-opacity-25 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="text-white text-sm">{property.title}</strong>
                  <span className="badge bg-gold text-dark fw-bold" style={{ background: '#d4af37' }}>
                    {property.price ? `${Number(property.price).toLocaleString()} ${property.currency || 'EGP'}` : ''}
                  </span>
                </div>
                <div className="text-muted text-xs d-flex gap-3">
                  <span><i className="bi bi-geo-alt me-1"></i>{property.village?.name || property.location?.name || 'الساحل الشمالي'}</span>
                  <span>Ref: {property.referenceNumber}</span>
                </div>
              </div>

              {/* Auto Broker Profile Info */}
              <div className="p-2 px-3 rounded-2 bg-dark border border-secondary border-opacity-25 text-xs text-muted mb-3 d-flex align-items-center justify-content-between">
                <span>
                  <i className="bi bi-person-badge me-1 text-gold"></i>
                  {isRtl ? 'مقدم الطلب (الوسيط): ' : 'Applicant (Broker): '}
                  <strong className="text-white">{user?.fullName || 'حساب الوسيط'}</strong>
                </span>
                <span className="badge bg-success bg-opacity-25 text-success border border-success">
                  {isRtl ? 'معتمد' : 'Verified'}
                </span>
              </div>

              {/* If Rental: Start & End Dates */}
              {isRent && (
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label text-sm fw-bold mb-1">
                      {isRtl ? 'تاريخ بدء الإيجار' : 'Start Date'}
                      <span className="text-danger ms-1">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      value={startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-sm fw-bold mb-1">
                      {isRtl ? 'تاريخ نهاية الإيجار' : 'End Date'}
                      <span className="text-danger ms-1">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      value={endDate}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div className="mb-2">
                <label className="form-label text-sm fw-bold mb-1">
                  {isRtl ? 'ملاحظات إضافية أو استفسارات (اختياري)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  className="form-control form-control-sm bg-dark text-white border-secondary"
                  rows={3}
                  placeholder={isRtl ? 'اكتب أي متطلبات خاصة أو استفسارات حول موعد المعاينة...' : 'Any special requirements or inquiries...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <p className="text-muted text-xs mb-0 mt-2">
                <i className="bi bi-telephone-outbound me-1 text-gold"></i>
                {isRtl
                  ? 'بمجرد الضغط على إرسال، سيقوم فريق عمليات داركم بالتواصل معك هاتفياً لترتيب وتأكيد المعاملة.'
                  : 'Our operations team will contact you by phone to confirm the request.'}
              </p>
            </div>

            <div className="modal-footer border-secondary border-opacity-25 pt-2">
              <button type="button" className="btn btn-sm btn-outline-secondary px-3" onClick={onClose} disabled={submitting}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="btn btn-sm px-4 fw-bold"
                style={{ background: 'linear-gradient(135deg, #d4af37, #aa8214)', color: '#121212' }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    {isRtl ? 'جارٍ الإرسال…' : 'Submitting…'}
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill me-1"></i>
                    {isRtl ? 'إرسال الطلب الآن' : 'Submit Request'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

