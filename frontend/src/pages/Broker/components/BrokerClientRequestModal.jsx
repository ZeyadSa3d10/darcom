import { useEffect, useState } from 'react';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { brokerService } from '../../../services/brokerService.js';
import { propertyService } from '../../../services/propertyService.js';

export default function BrokerClientRequestModal({ show, onClose, onSuccess }) {
  const { isRtl } = useSettings();
  const toast = useToast();

  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    propertyId: '',
    clientName: '',
    clientPhone: '',
    purpose: 'Rent',
    startDate: '',
    endDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!show) return;
    setLoadingProps(true);
    propertyService
      .search({ pageSize: 40 })
      .then((res) => {
        setProperties(res.data?.items ?? []);
      })
      .catch(() => setProperties([]))
      .finally(() => setLoadingProps(false));
  }, [show]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!form.propertyId) newErrors.propertyId = isRtl ? 'يرجى اختيار الشاليه' : 'Please select a property';
    if (!form.clientName?.trim()) newErrors.clientName = isRtl ? 'اسم العميل مطلوب' : 'Client name is required';
    if (!form.clientPhone?.trim()) newErrors.clientPhone = isRtl ? 'رقم هاتف العميل مطلوب' : 'Client phone is required';

    if (form.purpose === 'Rent') {
      if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
        newErrors.endDate = isRtl ? 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول' : 'End date must be after start date';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await brokerService.createRequest({
        propertyId: Number(form.propertyId),
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone.trim(),
        purpose: form.purpose,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        notes: form.notes?.trim() || null,
      });

      toast.success(
        isRtl
          ? 'تم تسجيل طلب العميل بنجاح وربطه بحسابك كبروكر!'
          : 'Client request submitted successfully under your broker profile!'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || (isRtl ? 'فشل تسجيل الطلب' : 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ background: '#1c1b18', border: '1px solid #d4af37', color: '#fff', borderRadius: '16px' }}>
          <div className="modal-header border-bottom" style={{ borderColor: 'rgba(212, 175, 55, 0.25)' }}>
            <h5 className="modal-title" style={{ color: '#d4af37', fontWeight: 600 }}>
              <i className="bi bi-person-plus me-2"></i>
              {isRtl ? 'تقديم طلب نيابة عن عميل' : 'Submit Request for Client'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body d-flex flex-column gap-3">
              <div>
                <label className="form-label" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  {isRtl ? 'اختر الشاليه / الوحدة' : 'Select Chalet / Unit'} *
                </label>
                <select
                  className={`form-select ${errors.propertyId ? 'is-invalid' : ''}`}
                  style={{ background: '#121212', color: '#fff', borderColor: errors.propertyId ? '#dc3545' : 'rgba(212, 175, 55, 0.35)' }}
                  value={form.propertyId}
                  onChange={(e) => setForm((prev) => ({ ...prev, propertyId: e.target.value }))}
                  disabled={loadingProps || submitting}
                >
                  <option value="">{loadingProps ? (isRtl ? 'جاري التحميل...' : 'Loading...') : (isRtl ? '-- اختر من عقارات داركوم --' : '-- Choose Darcom Listing --')}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.villageName || p.location} {p.buildingNumber ? `- B:${p.buildingNumber}` : ''}) · {p.purpose} · {p.price?.toLocaleString()} EGP
                    </option>
                  ))}
                </select>
                {errors.propertyId && <div className="invalid-feedback">{errors.propertyId}</div>}
              </div>

              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <label className="form-label" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                    {isRtl ? 'اسم العميل' : 'Client Full Name'} *
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.clientName ? 'is-invalid' : ''}`}
                    style={{ background: '#121212', color: '#fff', borderColor: errors.clientName ? '#dc3545' : 'rgba(212, 175, 55, 0.35)' }}
                    placeholder={isRtl ? 'أحمد محمد' : 'Ahmed Mohamed'}
                    value={form.clientName}
                    onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
                    disabled={submitting}
                  />
                  {errors.clientName && <div className="invalid-feedback">{errors.clientName}</div>}
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                    {isRtl ? 'هاتف العميل' : 'Client Phone'} *
                  </label>
                  <input
                    type="tel"
                    className={`form-control ${errors.clientPhone ? 'is-invalid' : ''}`}
                    style={{ background: '#121212', color: '#fff', borderColor: errors.clientPhone ? '#dc3545' : 'rgba(212, 175, 55, 0.35)' }}
                    placeholder="+2010..."
                    value={form.clientPhone}
                    onChange={(e) => setForm((prev) => ({ ...prev, clientPhone: e.target.value }))}
                    disabled={submitting}
                  />
                  {errors.clientPhone && <div className="invalid-feedback">{errors.clientPhone}</div>}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  {isRtl ? 'نوع الطلب' : 'Request Purpose'}
                </label>
                <div className="d-flex gap-3">
                  <label className="form-check-label d-flex align-items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="brokerPurpose"
                      className="form-check-input"
                      checked={form.purpose === 'Rent'}
                      onChange={() => setForm((p) => ({ ...p, purpose: 'Rent' }))}
                    />
                    <span>{isRtl ? 'إيجار مصيفي' : 'Rent'}</span>
                  </label>
                  <label className="form-check-label d-flex align-items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="brokerPurpose"
                      className="form-check-input"
                      checked={form.purpose === 'Sale'}
                      onChange={() => setForm((p) => ({ ...p, purpose: 'Sale' }))}
                    />
                    <span>{isRtl ? 'شراء' : 'Purchase (Sale)'}</span>
                  </label>
                </div>
              </div>

              {form.purpose === 'Rent' && (
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label" style={{ fontSize: '0.85rem', color: '#ccc' }}>
                      {isRtl ? 'تاريخ الوصول' : 'Check-in'}
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ background: '#121212', color: '#fff', borderColor: 'rgba(212, 175, 55, 0.35)' }}
                      value={form.startDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label" style={{ fontSize: '0.85rem', color: '#ccc' }}>
                      {isRtl ? 'تاريخ المغادرة' : 'Check-out'}
                    </label>
                    <input
                      type="date"
                      className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
                      style={{ background: '#121212', color: '#fff', borderColor: errors.endDate ? '#dc3545' : 'rgba(212, 175, 55, 0.35)' }}
                      value={form.endDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      disabled={submitting}
                    />
                    {errors.endDate && <div className="invalid-feedback">{errors.endDate}</div>}
                  </div>
                </div>
              )}

              <div>
                <label className="form-label" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  {isRtl ? 'ملاحظات إضافية أو تفاصيل' : 'Additional Notes / Preferences'}
                </label>
                <textarea
                  className="form-control"
                  rows="2"
                  style={{ background: '#121212', color: '#fff', borderColor: 'rgba(212, 175, 55, 0.35)' }}
                  placeholder={isRtl ? 'أي تفاصيل خاصة برغبة العميل أو الميزانية...' : 'Special requirements, dates, etc...'}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  disabled={submitting}
                ></textarea>
              </div>
            </div>

            <div className="modal-footer border-top" style={{ borderColor: 'rgba(212, 175, 55, 0.25)' }}>
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="btn btn-brand"
                disabled={submitting}
                style={{ background: 'linear-gradient(135deg, #d4af37, #aa8214)', border: 'none', color: '#121212', fontWeight: 600 }}
              >
                {submitting ? (isRtl ? 'جاري الإرسال...' : 'Submitting...') : (isRtl ? 'إرسال طلب العميل' : 'Submit Client Request')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

