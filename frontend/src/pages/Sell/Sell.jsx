import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import FormField from '../../components/FormField/FormField.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { locationService } from '../../services/locationService.js';
import { listingRequestService } from '../../services/listingRequestService.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useCmsSeo } from '../../hooks/useCmsSeo.js';
import './Sell.css';

const STATUS_LABELS = {
  Pending: { text: 'قيد المراجعة', class: 'badge-pending' },
  Contacted: { text: 'تم التواصل', class: 'badge-contacted' },
  InspectionScheduled: { text: 'موعد المعاينة محدد', class: 'badge-scheduled' },
  Inspected: { text: 'تمت المعاينة', class: 'badge-inspected' },
  Completed: { text: 'تم نشر الوحدة', class: 'badge-completed' },
  Rejected: { text: 'مرفوض', class: 'badge-rejected' },
};

export default function Sell() {
  const cmsSeo = useCmsSeo('sell');
  useSeo({
    title: cmsSeo?.title || 'اعرض عقارك في الساحل الشمالي | Darcom',
    description: cmsSeo?.description || 'اعرض وحدتك أو شاليهك في الساحل الشمالي مع داركم للمعاينة والتسويق الاحترافي.',
    image: cmsSeo?.image || undefined,
  });

  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [villages, setVillages] = useState([]);
  const [zones, setZones] = useState([]);
  const [loadingVillages, setLoadingVillages] = useState(true);
  const [loadingZones, setLoadingZones] = useState(false);

  const [form, setForm] = useState({
    villageId: '',
    zoneId: '',
    buildingNumber: '',
    unitNumber: '',
    phoneNumber: user?.phoneNumber || '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Load villages on mount
  useEffect(() => {
    let active = true;
    locationService.getVillages()
      .then((res) => {
        if (active) {
          setVillages(res.data || []);
          setLoadingVillages(false);
        }
      })
      .catch(() => {
        if (active) setLoadingVillages(false);
      });
    return () => { active = false; };
  }, []);

  // Sync phone number when user logs in
  useEffect(() => {
    if (user?.phoneNumber && !form.phoneNumber) {
      setForm((prev) => ({ ...prev, phoneNumber: user.phoneNumber }));
    }
  }, [user]);

  // Load zones when villageId changes
  useEffect(() => {
    if (!form.villageId) {
      setZones([]);
      return;
    }
    setLoadingZones(true);
    locationService.getZones(form.villageId)
      .then((res) => {
        setZones(res.data || []);
      })
      .catch(() => {
        setZones([]);
      })
      .finally(() => {
        setLoadingZones(false);
      });
  }, [form.villageId]);

  // Load user's submitted requests
  const loadMyRequests = useCallback(async () => {
    if (!isAuthenticated) return;
    setRequestsLoading(true);
    try {
      const res = await listingRequestService.myRequests(1, 20);
      setMyRequests(res.data?.data || []);
    } catch {
      setMyRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  const handleVillageChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      villageId: val,
      zoneId: '', // Clear zone whenever village changes
    }));
    setErrors((prev) => ({ ...prev, villageId: '', zoneId: '' }));
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.villageId) newErrors.villageId = 'يرجى اختيار القرية';
    if (!form.zoneId) newErrors.zoneId = 'يرجى اختيار المنطقة داخل القرية';
    if (!form.buildingNumber?.trim()) newErrors.buildingNumber = 'يرجى إدخال رقم العمارة / المبنى';
    if (!form.unitNumber?.trim()) newErrors.unitNumber = 'يرجى إدخال رقم الشاليه / الوحدة';
    if (!form.phoneNumber?.trim()) {
      newErrors.phoneNumber = 'يرجى إدخال رقم الهاتف';
    } else if (!/^\+?[0-9\s\-()]{8,20}$/.test(form.phoneNumber.trim())) {
      newErrors.phoneNumber = 'يرجى إدخال رقم هاتف صحيح';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('يرجى تسجيل الدخول أولاً لتقديم طلب عرض عقارك');
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        villageId: parseInt(form.villageId, 10),
        zoneId: parseInt(form.zoneId, 10),
        buildingNumber: form.buildingNumber.trim(),
        unitNumber: form.unitNumber.trim(),
        phoneNumber: form.phoneNumber.trim(),
      };

      const res = await listingRequestService.submit(payload);
      const created = res.data;
      setSubmittedRequest(created);
      toast.success(res.message || 'تم إرسال طلبك بنجاح!');
      loadMyRequests();
    } catch (err) {
      const msg = err.response?.data?.message || 'فشل إرسال الطلب. يرجى المحاولة مرة أخرى.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedRequest(null);
    setForm({
      villageId: '',
      zoneId: '',
      buildingNumber: '',
      unitNumber: '',
      phoneNumber: user?.phoneNumber || '',
    });
    setErrors({});
  };

  return (
    <main className="sell-page container">
      <Breadcrumbs
        items={[
          { label: 'الرئيسية', to: '/' },
          { label: 'اعرض عقارك' },
        ]}
      />

      <header className="sell-header">
        <h1>اعرض عقارك في الساحل الشمالي</h1>
        <p className="text-muted">
          خطوة واحدة تفصلك عن تسويق وحدتك. املأ بيانات الموقع، وسيقوم فريق داركم بالتواصل معك لتحديد موعد المعاينة وتصوير الوحدة مجانًا ونشرها.
        </p>
      </header>

      {/* How it works simple 3 steps */}
      <section className="listing-steps-bar">
        <div className="listing-step">
          <div className="step-icon"><i className="bi bi-geo-alt-fill" /></div>
          <div className="step-content">
            <h4>1. قدّم بيانات الوحدة</h4>
            <p>حدّد القرية والمنطقة ورقم الشاليه ورقم هاتفك للتواصل.</p>
          </div>
        </div>
        <div className="listing-step">
          <div className="step-icon"><i className="bi bi-camera-fill" /></div>
          <div className="step-content">
            <h4>2. المعاينة والتصوير</h4>
            <p>فريقنا هيزور الوحدة ويعاينها ويصورها بأعلى جودة احترافية.</p>
          </div>
        </div>
        <div className="listing-step">
          <div className="step-icon"><i className="bi bi-rocket-takeoff-fill" /></div>
          <div className="step-content">
            <h4>3. النشر وجلب المشترين</h4>
            <p>هننشر وحدتك على المنصة ونتولى التواصل والتسويق لعملاء داركم.</p>
          </div>
        </div>
      </section>

      {!isAuthenticated ? (
        <div className="sell-card auth-prompt-card text-center">
          <i className="bi bi-person-lock fs-1 text-primary mb-3 d-block" />
          <h3>تسجيل الدخول مطلوب</h3>
          <p className="text-muted mb-4">
            يرجى تسجيل الدخول بحسابك لمتابعة حالة طلب عرض العقار ومواعيد المعاينة مع فريق داركم.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/login?redirect=/sell" className="btn btn-brand">تسجيل الدخول</Link>
            <Link to="/register" className="btn btn-outline-secondary">إنشاء حساب جديد</Link>
          </div>
        </div>
      ) : submittedRequest ? (
        <section className="sell-card success-card text-center">
          <div className="success-icon mb-3">
            <i className="bi bi-check-circle-fill text-success fs-1" />
          </div>
          <h2>تم استلام طلبك بنجاح!</h2>
          <div className="request-number-pill">
            رقم الطلب: <strong>{submittedRequest.requestNumber}</strong>
          </div>
          <p className="success-message mt-3">
            فريق Darcom هيتواصل معاك قريبًا على الرقم{' '}
            <strong dir="ltr">{submittedRequest.phoneNumber}</strong> لتحديد موعد المعاينة وزيارة الوحدة.
          </p>
          <div className="request-summary-box text-start my-4">
            <div><strong>القرية:</strong> {submittedRequest.villageNameAr || submittedRequest.villageName}</div>
            <div><strong>المنطقة:</strong> {submittedRequest.zoneNameAr || submittedRequest.zoneName}</div>
            <div><strong>رقم المبنى:</strong> {submittedRequest.buildingNumber}</div>
            <div><strong>رقم الوحدة:</strong> {submittedRequest.unitNumber}</div>
          </div>
          <div className="d-flex justify-content-center gap-3">
            <button type="button" className="btn btn-brand" onClick={handleReset}>
              تقديم طلب لوحدة أخرى
            </button>
            <Link to="/profile" className="btn btn-outline-secondary">
              عرض كل طلباتي
            </Link>
          </div>
        </section>
      ) : (
        <section className="sell-card">
          <h2>بيانات الوحدة والموقع</h2>
          <p className="text-muted mb-4">
            أدخل فقط الموقع ورقم هاتفك؛ فريقنا سيتولى تسجيل كافة المواصفات والأسعار والصور خلال المعاينة.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid-2">
              <FormField id="req-village" label="القرية بالساحل الشمالي" required error={errors.villageId}>
                <select
                  id="req-village"
                  className={`form-select ${errors.villageId ? 'is-invalid' : ''}`}
                  value={form.villageId}
                  onChange={handleVillageChange}
                  disabled={loadingVillages}
                >
                  <option value="">{loadingVillages ? 'جاري تحميل القرى…' : 'اختر القرية…'}</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nameAr ? `${v.nameAr} (${v.name})` : v.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="req-zone" label="المنطقة داخل القرية" required error={errors.zoneId}>
                <select
                  id="req-zone"
                  className={`form-select ${errors.zoneId ? 'is-invalid' : ''}`}
                  value={form.zoneId}
                  onChange={handleChange('zoneId')}
                  disabled={!form.villageId || loadingZones}
                >
                  <option value="">
                    {!form.villageId
                      ? 'اختر القرية أولاً'
                      : loadingZones
                      ? 'جاري تحميل المناطق…'
                      : zones.length === 0
                      ? 'لا توجد مناطق متاحة لهذه القرية'
                      : 'اختر المنطقة…'}
                  </option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nameAr ? `${z.nameAr} (${z.name})` : z.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="form-grid-2">
              <FormField id="req-building" label="رقم العمارة / المبنى" required error={errors.buildingNumber}>
                <input
                  id="req-building"
                  type="text"
                  placeholder="مثال: عمارة 14 أو مبنى B"
                  className={`form-control ${errors.buildingNumber ? 'is-invalid' : ''}`}
                  value={form.buildingNumber}
                  onChange={handleChange('buildingNumber')}
                />
              </FormField>

              <FormField id="req-unit" label="رقم الشاليه / الوحدة" required error={errors.unitNumber}>
                <input
                  id="req-unit"
                  type="text"
                  placeholder="مثال: شاليه 204 أو وحدة 5"
                  className={`form-control ${errors.unitNumber ? 'is-invalid' : ''}`}
                  value={form.unitNumber}
                  onChange={handleChange('unitNumber')}
                />
              </FormField>
            </div>

            <FormField id="req-phone" label="رقم الهاتف للتواصل وتنسيق المعاينة" required error={errors.phoneNumber}>
              <input
                id="req-phone"
                type="tel"
                dir="ltr"
                placeholder="01XXXXXXXXX"
                className={`form-control ${errors.phoneNumber ? 'is-invalid' : ''}`}
                value={form.phoneNumber}
                onChange={handleChange('phoneNumber')}
              />
              <small className="text-muted d-block mt-1">
                سيتصل بك منسق المعاينات من داركم على هذا الرقم.
              </small>
            </FormField>

            <div className="mt-4">
              <button
                type="submit"
                className="btn btn-brand btn-lg w-100"
                disabled={submitting}
              >
                {submitting ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    جاري إرسال الطلب…
                  </span>
                ) : (
                  'إرسال طلب المعاينة'
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* User previous listing requests */}
      {isAuthenticated && (
        <section className="tracker">
          <h2>طلباتي السابقة لعرض العقارات</h2>
          {requestsLoading ? (
            <LoadingSkeleton count={3} />
          ) : myRequests.length === 0 ? (
            <EmptyState
              icon="bi-houses"
              title="لا توجد طلبات سابقة"
              message="ستظهر طلباتك المقدمة ومواعيد المعاينة وحالة النشر هنا."
            />
          ) : (
            <div className="tracker-list">
              {myRequests.map((req) => {
                const statusMeta = STATUS_LABELS[req.status] || { text: req.status, class: '' };
                return (
                  <div key={req.id} className="tracker-row">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <strong>{req.villageNameAr || req.villageName}</strong>
                        <span className="text-muted">· {req.zoneNameAr || req.zoneName}</span>
                      </div>
                      <div className="text-meta">
                        <span>مبنى: {req.buildingNumber} · وحدة: {req.unitNumber}</span>
                        <span className="mx-2">·</span>
                        <span dir="ltr">رقم الطلب: {req.requestNumber}</span>
                      </div>
                      {req.inspectionDate && (
                        <div className="inspection-notice mt-1 text-primary">
                          <i className="bi bi-calendar-event me-1" />
                          موعد المعاينة: {new Date(req.inspectionDate).toLocaleDateString('ar-EG', { dateStyle: 'full' })}
                        </div>
                      )}
                    </div>
                    <div className="tracker-actions">
                      <span className={`badge-status ${statusMeta.class}`}>
                        {statusMeta.text}
                      </span>
                      {req.status === 'Completed' && req.propertyId && (
                        <Link to={`/properties/${req.propertyId}`} className="btn btn-outline-secondary btn-sm">
                          عرض العقار
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
