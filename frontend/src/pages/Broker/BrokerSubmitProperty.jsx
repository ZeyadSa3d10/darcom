import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { locationService } from '../../services/locationService.js';
import { brokerService } from '../../services/brokerService.js';
import './BrokerSubmitProperty.css';

export default function BrokerSubmitProperty() {
  const { isRtl, t } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();

  useSeo({
    title: `${isRtl ? 'شاليه عندي وعايز أعرضه' : 'Submit Chalet for Listing'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'تقديم بيانات شاليه بالساحل الشمالي لمعاينة وتصوير إدارة داركم ونشره'
      : 'Submit North Coast chalet details for Darcom physical inspection and official listing.',
  });

  const [villages, setVillages] = useState([]);
  const [zones, setZones] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingZones, setLoadingZones] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Workflow 1: ONLY 4 core fields
  const [form, setForm] = useState({
    villageId: '',
    zoneId: '',
    area: '',
    unitNumber: '',
  });

  useEffect(() => {
    async function loadVillages() {
      setLoadingLookups(true);
      try {
        const res = await locationService.getVillages();
        setVillages(res.data || []);
      } catch {
        setVillages([]);
      } finally {
        setLoadingLookups(false);
      }
    }
    loadVillages();
  }, []);

  const handleVillageChange = async (e) => {
    const vId = e.target.value;
    setForm((prev) => ({ ...prev, villageId: vId, zoneId: '' }));
    setZones([]);

    if (!vId) return;
    setLoadingZones(true);
    try {
      const res = await locationService.getZones(vId);
      setZones(res.data || []);
    } catch {
      setZones([]);
    } finally {
      setLoadingZones(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!form.villageId) {
      newErrors.villageId = isRtl ? 'يرجى اختيار القرية.' : 'Please select a village.';
    }
    if (!form.area || Number(form.area) <= 0) {
      newErrors.area = isRtl ? 'يرجى إدخال المساحة بالمتر المربع.' : 'Please enter valid area in m².';
    }
    if (!form.unitNumber.trim()) {
      newErrors.unitNumber = isRtl ? 'يرجى إدخال رقم الشاليه أو الوحدة.' : 'Please enter chalet / unit number.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        villageId: parseInt(form.villageId, 10),
        zoneId: form.zoneId ? parseInt(form.zoneId, 10) : null,
        area: parseFloat(form.area),
        unitNumber: form.unitNumber.trim(),
      };

      await brokerService.submitUnit(payload);
      setSuccess(true);
      toast.success(isRtl ? 'تم إرسال بيانات الشاليه بنجاح!' : 'Unit submitted successfully!');
    } catch (err) {
      toast.error(err.message || (isRtl ? 'تعذر إرسال بيانات الشاليه.' : 'Failed to submit chalet details.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="container broker-submit-page py-5" id="main-content">
        <div className="broker-submission-success-card text-center p-5 rounded-4 border bg-dark text-white mx-auto shadow-lg" style={{ maxWidth: '640px' }}>
          <div className="mb-4">
            <i className="bi bi-patch-check-fill text-gold" style={{ fontSize: '4rem', color: '#d4af37' }}></i>
          </div>
          <h1 className="h3 fw-bold mb-3">
            {isRtl ? 'تم استلام بيانات الشاليه بنجاح!' : 'Chalet Submission Received!'}
          </h1>
          <p className="text-muted mb-4 fs-6">
            {isRtl
              ? 'شكراً لك! تم تسجيل بيانات الشاليه في قائمة المعاينات. سيقوم فريق داركم بالتواصل معك هاتفياً لترتيب موعد معاينة ميدانية والتقاط الصور وتحديد المواصفات لنشر الشاليه رسمياً على المنصة باسمك.'
              : 'Thank you! The unit has been added to our inspection queue. Our team will contact you to arrange a site visit, take professional photos, and list the property under your account.'}
          </p>

          <div className="p-3 rounded-3 mb-4 text-start bg-secondary bg-opacity-25 border border-secondary border-opacity-50">
            <div className="row g-2 text-sm">
              <div className="col-6">
                <span className="text-muted d-block">{isRtl ? 'القرية:' : 'Village:'}</span>
                <strong className="text-white">
                  {villages.find((v) => v.id.toString() === form.villageId.toString())?.name || form.villageId}
                </strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">{isRtl ? 'رقم الوحدة:' : 'Unit Number:'}</span>
                <strong className="text-white">{form.unitNumber}</strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">{isRtl ? 'المساحة:' : 'Area:'}</span>
                <strong className="text-white">{form.area} م²</strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">{isRtl ? 'الحالة:' : 'Status:'}</span>
                <span className="badge bg-warning text-dark">{isRtl ? 'قيد المعاينة والمراجعة' : 'Pending Inspection'}</span>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-center">
            <Link to="/broker/requests" className="btn btn-outline-light px-4 py-2">
              <i className="bi bi-card-checklist me-2"></i>
              {isRtl ? 'متابعة طلباتي' : 'View My Requests'}
            </Link>
            <button
              type="button"
              className="btn btn-brand px-4 py-2"
              style={{ background: 'linear-gradient(135deg, #d4af37, #aa8214)', color: '#121212', fontWeight: 600 }}
              onClick={() => {
                setForm({ villageId: '', zoneId: '', area: '', unitNumber: '' });
                setSuccess(false);
              }}
            >
              <i className="bi bi-plus-circle-fill me-2"></i>
              {isRtl ? 'إضافة شاليه آخر' : 'Submit Another Chalet'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container broker-submit-page py-4" id="main-content">
      {/* Breadcrumb Navigation */}
      <div className="mb-3 d-flex align-items-center gap-2 text-sm">
        <Link to="/broker/dashboard" className="text-gold text-decoration-none">
          <i className="bi bi-arrow-right me-1"></i>
          {isRtl ? 'لوحة تحكم البروكر' : 'Broker Dashboard'}
        </Link>
        <span className="text-muted">/</span>
        <span className="text-muted">{isRtl ? 'شاليه عندي وعايز أعرضه' : 'Submit Chalet'}</span>
      </div>

      <div className="broker-submit-card mx-auto shadow-lg" style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div className="broker-submit-header text-center mb-4 pb-3 border-bottom border-secondary border-opacity-25">
          <div className="d-inline-flex p-3 rounded-circle bg-gold-subtle mb-2">
            <i className="bi bi-house-add-fill text-gold fs-1" style={{ color: '#d4af37' }}></i>
          </div>
          <h1 className="h3 fw-bold text-white mb-2">
            {isRtl ? 'شاليه عندي وعايز أعرضه' : 'Submit a Chalet for Listing'}
          </h1>
          <p className="text-muted fs-6 mb-0">
            {isRtl
              ? 'أدخل بيانات الشاليه الأساسية (4 حقول فقط)، وسيقوم فريق داركم بالتواصل معك لمعاينة الوحدة وتصويرها وتحديد الأسعار والتفاصيل قبل نشرها.'
              : 'Provide only 4 core details. Our team will contact you for a site inspection and professional photography.'}
          </p>
        </div>

        {/* Informative Step Box */}
        <div className="alert alert-dark border-secondary border-opacity-50 p-3 rounded-3 mb-4 d-flex align-items-center gap-3">
          <i className="bi bi-info-circle-fill text-gold fs-4" style={{ color: '#d4af37' }}></i>
          <div className="text-sm">
            <strong className="text-white d-block mb-1">
              {isRtl ? 'كيف يعمل نشر الشاليهات عبر داركم؟' : 'How does listing work?'}
            </strong>
            <span className="text-muted">
              {isRtl
                ? 'لا داعي لكتابة مواصفات معقدة أو رفع صور الآن؛ مستشارو داركم يزورون الوحدة ميدانياً في الساحل الشمالي، ويتم توثيقها بالكامل ونشرها وربطها برقم الوسيط الخاص بك.'
                : 'No complex forms or photos required now. Darcom consultants visit the property in the North Coast, verify all specs, and list it officially linked to your broker profile.'}
            </span>
          </div>
        </div>

        {/* 4-Field Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            {/* 1. Village Selection */}
            <div className="col-12 col-md-6">
              <label htmlFor="submit-village" className="form-label text-white fw-bold">
                {isRtl ? '1. قرية الساحل الشمالي' : '1. North Coast Village'}
                <span className="text-danger ms-1">*</span>
              </label>
              <select
                id="submit-village"
                className={`form-select bg-dark text-white border-secondary ${errors.villageId ? 'is-invalid' : ''}`}
                value={form.villageId}
                onChange={handleVillageChange}
                disabled={loadingLookups}
                required
              >
                <option value="">{isRtl ? 'اختر القرية...' : 'Select Village...'}</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.kmMark ? `(كم ${v.kmMark})` : ''}
                  </option>
                ))}
              </select>
              {errors.villageId && <div className="invalid-feedback">{errors.villageId}</div>}
            </div>

            {/* 2. Zone Selection (Dynamic per Village) */}
            <div className="col-12 col-md-6">
              <label htmlFor="submit-zone" className="form-label text-white fw-bold">
                {isRtl ? '2. المنطقة / المرحلة داخل القرية (اختياري)' : '2. Zone / Phase (Optional)'}
              </label>
              <select
                id="submit-zone"
                className="form-select bg-dark text-white border-secondary"
                value={form.zoneId}
                onChange={(e) => setForm((prev) => ({ ...prev, zoneId: e.target.value }))}
                disabled={!form.villageId || loadingZones}
              >
                <option value="">
                  {loadingZones
                    ? (isRtl ? 'جارٍ تحميل المناطق…' : 'Loading zones…')
                    : (isRtl ? 'كل المناطق / غير محدد' : 'All zones / unspecified')}
                </option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Area in m² */}
            <div className="col-12 col-md-6">
              <label htmlFor="submit-area" className="form-label text-white fw-bold">
                {isRtl ? '3. المساحة بالمتر المربع (م²)' : '3. Area in m²'}
                <span className="text-danger ms-1">*</span>
              </label>
              <div className="input-group">
                <input
                  id="submit-area"
                  type="number"
                  min="10"
                  max="5000"
                  step="1"
                  placeholder={isRtl ? 'مثال: 120' : 'e.g. 120'}
                  className={`form-control bg-dark text-white border-secondary ${errors.area ? 'is-invalid' : ''}`}
                  value={form.area}
                  onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                  required
                />
                <span className="input-group-text bg-secondary border-secondary text-white">م²</span>
                {errors.area && <div className="invalid-feedback">{errors.area}</div>}
              </div>
            </div>

            {/* 4. Unit / Chalet / Villa Number */}
            <div className="col-12 col-md-6">
              <label htmlFor="submit-unit" className="form-label text-white fw-bold">
                {isRtl ? '4. رقم الشاليه / الفيلا / الوحدة' : '4. Chalet / Unit Number'}
                <span className="text-danger ms-1">*</span>
              </label>
              <input
                id="submit-unit"
                type="text"
                placeholder={isRtl ? 'مثال: شاليه 104 - عمارة B' : 'e.g. Chalet 104 - Bldg B'}
                className={`form-control bg-dark text-white border-secondary ${errors.unitNumber ? 'is-invalid' : ''}`}
                value={form.unitNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, unitNumber: e.target.value }))}
                required
              />
              {errors.unitNumber && <div className="invalid-feedback">{errors.unitNumber}</div>}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
            <Link to="/broker/dashboard" className="btn btn-outline-secondary px-4">
              {isRtl ? 'إلغاء' : 'Cancel'}
            </Link>

            <button
              type="submit"
              className="btn btn-brand px-5 py-2 fs-6"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #aa8214)',
                border: 'none',
                color: '#121212',
                fontWeight: 700,
              }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {isRtl ? 'جارٍ الإرسال…' : 'Submitting…'}
                </>
              ) : (
                <>
                  <i className="bi bi-send-fill me-2"></i>
                  {isRtl ? 'إرسال بيانات الشاليه للمعاينة' : 'Submit Chalet Details'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
