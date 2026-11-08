import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import RentalCalendar from '../../components/RentalCalendar/RentalCalendar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { cleanPhoneNumber, normalizeDigits } from '../../utils/phoneUtils.js';
import { propertyService } from '../../services/propertyService.js';
import { purchaseService } from '../../services/purchaseService.js';
import './Checkout.css';
import { useSeo } from '../../hooks/useSeo.js';

const STEPS = ['Property', 'Your details', 'Request info', 'Review'];

function formatPrice(price, currency = 'EGP') {
  if (price == null) return '—';
  return `${Number(price).toLocaleString('en-US')} ${currency}`;
}

export default function Checkout() {
  const { t, isRtl } = useSettings();
  useSeo({ title: `${isRtl ? 'طلب وحدة' : 'Request Property'} | Darcom Luxury Real Estate` });
  const { slug } = useParams();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [rentalPeriods, setRentalPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);

  const [customer, setCustomer] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: 'Egypt',
    city: '',
    nationalId: '',
    preferredContact: 'Phone',
    address: '',
    notes: '',
  });

  const [details, setDetails] = useState({
    paymentMethod: 'Cash',
    financingRequired: false,
    preferredAppointment: '',
    timeline: '1-3 months',
    startDate: '',
    endDate: '',
    duration: '12 months',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await propertyService.getBySlug(slug);
      setProperty(res.data);
    } catch (e) {
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (property && (property.purpose || '').toLowerCase() === 'rent') {
      propertyService.rentalPeriods(property.id)
        .then((r) => setRentalPeriods(r.data ?? []))
        .catch(() => setRentalPeriods([]));
    }
  }, [property]);

  useEffect(() => {
    if (user) {
      setCustomer((c) => ({
        ...c,
        fullName: c.fullName || user.fullName || '',
        email: c.email || user.email || '',
        phone: c.phone || user.phoneNumber || '',
      }));
    }
  }, [user]);

  if (loading) {
    return (
      <main id="main-content" className="container checkout-page">
        <LoadingSkeleton count={6} />
      </main>
    );
  }

  if (loadError || !property) {
    return (
      <main className="container checkout-page">
        <ErrorState error={loadError} onRetry={load} title="Could not load this property" />
        <div className="text-center">
          <Link to="/properties" className="btn btn-brand">Browse properties</Link>
        </div>
      </main>
    );
  }

  const purpose = (property.purpose || 'sale').toLowerCase();
  const isRental = purpose === 'rent';
  const locked = property.status === 'Sold' || property.status === 'Rented';

  if (locked) {
    return (
      <main className="container checkout-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Properties', to: '/properties' }, { label: 'Request' }]} />
        <ErrorState
          title={`This property is ${property.status.toLowerCase()}`}
          error="It is no longer available for new requests, but here are similar options."
        />
        <div className="text-center">
          <Link to="/properties" className="btn btn-brand">Browse similar</Link>
        </div>
      </main>
    );
  }

  const setC = (key) => (e) => {
    let val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (key === 'phone') {
      val = cleanPhoneNumber(val);
    }
    setCustomer((c) => ({ ...c, [key]: val }));
  };
  const setD = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDetails((d) => ({ ...d, [key]: v }));
  };

  const customerValid = customer.fullName.trim() && /.+@.+\..+/.test(customer.email.trim()) && customer.phone.trim().length >= 10;

  const validateStep2 = () => {
    const errs = {};
    if (isRental) {
      if (!details.startDate) {
        errs.startDate = isRtl ? 'يرجى اختيار تاريخ بدء الإيجار.' : 'Please select a preferred start date.';
      }
      if (!details.endDate) {
        errs.endDate = isRtl ? 'يرجى اختيار تاريخ انتهاء الإيجار.' : 'Please select a preferred end date.';
      }
      if (details.startDate && details.endDate) {
        const s = new Date(details.startDate);
        const e = new Date(details.endDate);
        if (e <= s) {
          errs.endDate = isRtl ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.' : 'End date must be strictly after the start date.';
        } else {
          // Central backend rental interval overlap check
          const hasOverlap = rentalPeriods.some((p) => {
            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            return s < pEnd && e > pStart;
          });
          if (hasOverlap) {
            const overlapMsg = isRtl
              ? 'الفترة المحددة تتعارض مع حجز مؤكد مسبقاً في تقويم الوحدة.'
              : 'Selected dates conflict with an existing confirmed rental period.';
            errs.startDate = overlapMsg;
            errs.endDate = overlapMsg;
          }
        }
      }
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length === 0) {
      setStep(3);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setFieldErrors({});
    setSubmitError('');
    try {
      let res;
      const cleanPhone = cleanPhoneNumber(customer.phone);
      if (isRental) {
        res = await purchaseService.createBooking({
          propertyId: property.id,
          fullName: customer.fullName.trim(),
          email: customer.email.trim().toLowerCase(),
          phone: cleanPhone,
          startDate: details.startDate ? new Date(details.startDate).toISOString() : null,
          endDate: details.endDate ? new Date(details.endDate).toISOString() : null,
          duration: details.duration || null,
          notes: customer.notes || null,
        });
      } else {
        res = await purchaseService.createPurchase({
          propertyId: property.id,
          fullName: customer.fullName.trim(),
          email: customer.email.trim().toLowerCase(),
          phone: cleanPhone,
          country: customer.country || null,
          city: customer.city || null,
          nationalId: customer.nationalId || null,
          preferredContact: customer.preferredContact,
          address: customer.address || null,
          notes: customer.notes || null,
          paymentMethod: details.paymentMethod,
          financingRequired: details.financingRequired,
          preferredAppointment: details.preferredAppointment || null,
          timeline: details.timeline,
        });
      }
      setResult(res.data);
      setStep(4);
      window.scrollTo(0, 0);
    } catch (err) {
      const fields = mapFieldErrors(err);
      setFieldErrors(fields);
      setSubmitError(err.message || 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  const locationDisplay = property.villageName
    ? `${property.villageName}${property.zoneName ? ` · ${property.zoneName}` : ''}${
        property.buildingNumber ? ` (Bldg ${property.buildingNumber})` : ''
      }`
    : `${property.location}${property.city ? `, ${property.city}` : ''}`;

  return (
    <main className="container checkout-page">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Properties', to: '/properties' },
          { label: property.title, to: `/properties/${property.slug}` },
          { label: isRental ? 'Rental Booking Request' : 'Purchase Request' },
        ]}
      />

      {step < 4 && (
        <ol className="wizard-steps">
          {STEPS.map((s, i) => {
            const stepLabelsAr = ['العقار', 'بياناتك', 'تفاصيل الطلب', 'مراجعة وتأكيد'];
            return (
              <li key={s} className={i === step ? 'active' : i < step ? 'done' : ''}>
                <span className="step-num">{i < step ? <i className="bi bi-check"></i> : i + 1}</span>
                {isRtl ? stepLabelsAr[i] : s}
              </li>
            );
          })}
        </ol>
      )}

      {step === 0 && (
        <section className="wizard-card">
          <h2>{isRtl ? 'تأكيد بيانات الوحدة' : 'Confirm the property'}</h2>
          <div className="confirm-box">
            <img src={property.images?.[0]?.url || '/images/hero-sahel.svg'} alt={property.title} loading="lazy" />
            <div>
              <strong>{property.title}</strong>
              <p className="text-meta">{locationDisplay}</p>
              <p className="confirm-price">
                {formatPrice(property.price, property.currency)}
                {isRental && <span className="text-muted fs-6"> / {isRtl ? 'شهرياً' : 'month'}</span>}
              </p>
              <p className="text-meta">
                Ref: {property.referenceNumber} · {property.purpose} · {property.propertyType}
              </p>
            </div>
          </div>
          <div className="wizard-nav">
            <Link to={`/properties/${property.slug}`} className="btn btn-outline-secondary">
              {isRtl ? 'العودة لصفحة الوحدة' : 'Back to details'}
            </Link>
            <button type="button" className="btn btn-brand" onClick={() => setStep(1)}>
              {isRtl ? 'متابعة' : 'Continue'}
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="wizard-card">
          <h2>{isRtl ? 'بيانات التواصل الخاصة بك' : 'Your contact details'}</h2>
          <div className="form-grid">
            <FormField id="co-name" label={isRtl ? 'الاسم بالكامل' : 'Full name'} required error={fieldErrors.fullName}>
              <input id="co-name" className={`form-control ${fieldErrors.fullName ? 'is-invalid' : ''}`} value={customer.fullName} onChange={setC('fullName')} autoComplete="name" />
            </FormField>
            <FormField id="co-email" label={isRtl ? 'البريد الإلكتروني' : 'Email'} required error={fieldErrors.email}>
              <input id="co-email" type="email" className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`} value={customer.email} onChange={setC('email')} autoComplete="email" />
            </FormField>
            <FormField id="co-phone" label={isRtl ? 'رقم الهاتف المحمول' : 'Phone'} required error={fieldErrors.phone}>
              <input id="co-phone" type="tel" className={`form-control ${fieldErrors.phone ? 'is-invalid' : ''}`} value={customer.phone} onChange={setC('phone')} autoComplete="tel" />
            </FormField>
            <FormField id="co-country" label={isRtl ? 'الدولة' : 'Country'} error={fieldErrors.country}>
              <input id="co-country" className="form-control" value={customer.country} onChange={setC('country')} autoComplete="country-name" />
            </FormField>
            <FormField id="co-city" label={isRtl ? 'المدينة' : 'City'} error={fieldErrors.city}>
              <input id="co-city" className="form-control" value={customer.city} onChange={setC('city')} autoComplete="address-level2" />
            </FormField>
            <FormField id="co-contact" label={isRtl ? 'طريقة التواصل المفضلة' : 'Preferred contact'} error={fieldErrors.preferredContact}>
              <select id="co-contact" className="form-select" value={customer.preferredContact} onChange={setC('preferredContact')}>
                <option value="Phone">{isRtl ? 'هاتف' : 'Phone'}</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">{isRtl ? 'بريد إلكتروني' : 'Email'}</option>
              </select>
            </FormField>
            <FormField id="co-address" label={isRtl ? 'العنوان' : 'Address'} error={fieldErrors.address}>
              <input id="co-address" className="form-control" value={customer.address} onChange={setC('address')} autoComplete="street-address" />
            </FormField>
          </div>
          <FormField id="co-notes" label={isRtl ? 'ملاحظات أو طلبات خاصة' : 'Notes / Special Requests'} error={fieldErrors.notes}>
            <textarea id="co-notes" rows="3" className="form-control" value={customer.notes} onChange={setC('notes')} />
          </FormField>
          <div className="wizard-nav">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(0)}>
              {isRtl ? 'رجوع' : 'Back'}
            </button>
            <button type="button" className="btn btn-brand" disabled={!customerValid} onClick={() => setStep(2)}>
              {isRtl ? 'متابعة' : 'Continue'}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="wizard-card">
          <h2>{isRental ? (isRtl ? 'تفاصيل طلب حجز الإيجار' : 'Rental Booking Request') : (isRtl ? 'تفاصيل خطة الشراء' : 'Purchase details')}</h2>
          {!isRental ? (
            <div className="form-grid">
              <FormField id="co-pay" label={isRtl ? 'طريقة الدفع' : 'Payment method'} error={fieldErrors.paymentMethod}>
                <select id="co-pay" className="form-select" value={details.paymentMethod} onChange={setD('paymentMethod')}>
                  <option value="Cash">{isRtl ? 'كاش (نقداً)' : 'Cash'}</option>
                  <option value="Mortgage">{isRtl ? 'تمويل عقاري' : 'Mortgage'}</option>
                  <option value="Installments">{isRtl ? 'تقسيط' : 'Installments'}</option>
                </select>
              </FormField>
              <FormField id="co-timeline" label={isRtl ? 'الجدول الزمني للشراء' : 'Expected timeline'} error={fieldErrors.timeline}>
                <select id="co-timeline" className="form-select" value={details.timeline} onChange={setD('timeline')}>
                  <option value="ASAP">{isRtl ? 'في أقرب وقت' : 'ASAP'}</option>
                  <option value="1-3 months">{isRtl ? '1 - 3 أشهر' : '1-3 months'}</option>
                  <option value="3-6 months">{isRtl ? '3 - 6 أشهر' : '3-6 months'}</option>
                  <option value="6+ months">{isRtl ? 'أكثر من 6 أشهر' : '6+ months'}</option>
                </select>
              </FormField>
              <FormField id="co-appt" label={isRtl ? 'الموعد المفضل للمعاينة' : 'Preferred appointment'} error={fieldErrors.preferredAppointment}>
                <input id="co-appt" type="datetime-local" className="form-control" value={details.preferredAppointment} onChange={setD('preferredAppointment')} />
              </FormField>
              <div className="check-line">
                <input id="co-fin" type="checkbox" checked={details.financingRequired} onChange={setD('financingRequired')} />
                <label htmlFor="co-fin">{isRtl ? 'أرغب في خطة تمويل أو تسهيلات' : 'I need financing'}</label>
              </div>
            </div>
          ) : (
            <div>
              {/* Interactive Rental Calendar for Tenant */}
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-semibold m-0 d-flex align-items-center gap-2">
                    <i className="bi bi-calendar2-range text-gold"></i>
                    <span>{isRtl ? 'تقويم إتاحة الشاليه وفترات الحجز' : 'Rental Availability Calendar'}</span>
                  </h6>
                  <span className="text-muted small">
                    {isRtl ? 'الأحمر = محجوز · الأخضر = متاح' : 'Red = Booked · Green = Available'}
                  </span>
                </div>
                <RentalCalendar
                  periods={rentalPeriods}
                  selectedRange={{ startDate: details.startDate, endDate: details.endDate }}
                />
              </div>

              <div className="form-grid">
                <FormField id="co-start" label={isRtl ? 'تاريخ بدء الإيجار' : 'Rental start date'} required error={fieldErrors.startDate}>
                  <input
                    id="co-start"
                    type="date"
                    className={`form-control ${fieldErrors.startDate ? 'is-invalid' : ''}`}
                    value={details.startDate}
                    onChange={setD('startDate')}
                    required
                  />
                </FormField>
                <FormField id="co-end" label={isRtl ? 'تاريخ انتهاء الإيجار' : 'Rental end date'} required error={fieldErrors.endDate}>
                  <input
                    id="co-end"
                    type="date"
                    className={`form-control ${fieldErrors.endDate ? 'is-invalid' : ''}`}
                    value={details.endDate}
                    onChange={setD('endDate')}
                    required
                  />
                </FormField>
                <FormField id="co-duration" label={isRtl ? 'مدة الإقامة المتوقعة' : 'Intended stay duration'} error={fieldErrors.duration}>
                  <select id="co-duration" className="form-select" value={details.duration} onChange={setD('duration')}>
                    <option value="Weekend (2-3 days)">{isRtl ? 'عطلة نهاية أسبوع (2-3 أيام)' : 'Weekend (2-3 days)'}</option>
                    <option value="1 Week">{isRtl ? 'أسبوع واحد' : '1 Week'}</option>
                    <option value="2 Weeks">{isRtl ? 'أسبوعان' : '2 Weeks'}</option>
                    <option value="1 Month">{isRtl ? 'شهر كامل' : '1 Month'}</option>
                    <option value="Full Summer Season (3 months)">{isRtl ? 'موسم الصيف بالكامل (3 أشهر)' : 'Full Summer Season (3 months)'}</option>
                    <option value="Annual / Long Term">{isRtl ? 'سنوي / مدة طويلة' : 'Annual / Long Term'}</option>
                    <option value="Flexible">{isRtl ? 'مرن' : 'Flexible'}</option>
                  </select>
                </FormField>
              </div>
            </div>
          )}
          <div className="wizard-nav">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(1)}>
              {isRtl ? 'رجوع' : 'Back'}
            </button>
            <button type="button" className="btn btn-brand" onClick={validateStep2}>
              {isRtl ? 'مراجعة وتأكيد الطلب' : 'Review request'}
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="wizard-card">
          <h2>{isRtl ? 'مراجعة وتأكيد الطلب' : 'Review your request'}</h2>
          <dl className="review-list">
            <div><dt>{isRtl ? 'الوحدة' : 'Property'}</dt><dd>{property.title} ({property.referenceNumber})</dd></div>
            <div><dt>{isRtl ? 'الموقع' : 'Location'}</dt><dd>{locationDisplay}</dd></div>
            <div><dt>{isRtl ? 'السعر' : 'Price'}</dt><dd>{formatPrice(property.price, property.currency)}{isRental ? (isRtl ? ' / شهرياً' : ' / mo') : ''}</dd></div>
            <div><dt>{isRtl ? 'الاسم' : 'Name'}</dt><dd>{customer.fullName}</dd></div>
            <div><dt>{isRtl ? 'البريد' : 'Email'}</dt><dd>{customer.email}</dd></div>
            <div><dt>{isRtl ? 'الهاتف' : 'Phone'}</dt><dd>{customer.phone}</dd></div>
            {!isRental && <div><dt>{isRtl ? 'طريقة الدفع' : 'Payment'}</dt><dd>{details.paymentMethod}{details.financingRequired ? (isRtl ? ' · مع تسهيلات' : ' · financing needed') : ''}</dd></div>}
            {!isRental && <div><dt>{isRtl ? 'الجدول الزمني' : 'Timeline'}</dt><dd>{details.timeline}</dd></div>}
            {isRental && (
              <>
                <div><dt>{isRtl ? 'تاريخ البدء' : 'Start Date'}</dt><dd>{details.startDate}</dd></div>
                <div><dt>{isRtl ? 'تاريخ الانتهاء' : 'End Date'}</dt><dd>{details.endDate}</dd></div>
                <div><dt>{isRtl ? 'المدة' : 'Duration'}</dt><dd>{details.duration}</dd></div>
              </>
            )}
          </dl>

          <div className="alert alert-info d-flex align-items-center mt-3" role="alert">
            <i className="bi bi-info-circle-fill me-2 fs-5"></i>
            <div>
              <strong>{isRtl ? 'تنويه رسمي:' : 'Important Notice:'}</strong>{' '}
              {isRtl
                ? isRental
                  ? 'تقديم هذا الطلب يُرسل إشعاراً رسمياً لفريق داركم لمراجعة الإتاحة وتأكيد الحجز معك هاتفياً؛ ولا يعتبر حجوزاً نهائياً إلا بعد موافقة الإدارة.'
                  : 'تقديم هذا الطلب يسجل اهتمامك الرسمي لدى فريق داركم؛ وسيتواصل معك مستشارك العقاري لترتيب المعاينة وتفاصيل العقد.'
                : isRental
                ? 'Submitting this request sends an official inquiry to Darcom. This does not immediately confirm your booking; our team will review availability with the owner and contact you.'
                : 'Our sales team will verify details and reach out to arrange viewings and contracts.'}
            </div>
          </div>

          {submitError && <div className="alert alert-danger" role="alert">{submitError}</div>}
          <div className="wizard-nav">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(2)} disabled={submitting}>
              {isRtl ? 'رجوع' : 'Back'}
            </button>
            <button type="button" className="btn btn-brand" onClick={submit} disabled={submitting}>
              {submitting ? (isRtl ? 'جارٍ الإرسال…' : 'Submitting…') : (isRtl ? 'تأكيد وإرسال الطلب' : 'Submit request')}
            </button>
          </div>
        </section>
      )}

      {step === 4 && result && (
        <section className="wizard-card success">
          <img src="/logo-dark.png" alt="Darcom Real Estate" style={{ height: '52px', width: 'auto', marginBottom: '1rem' }} />
          <i className="bi bi-check-circle"></i>
          <h2>{isRtl ? 'تم إرسال طلبك بنجاح' : 'Your request has been submitted.'}</h2>
          <p className="text-meta">
            {isRtl
              ? `هذا طلب رسمي لـ ${isRental ? 'إيجار' : 'شراء'} الوحدة. سيقوم فريق داركم بالساحل الشمالي بالتواصل معك سريعاً.`
              : `This is an official request, not a confirmed ${isRental ? 'rental' : 'sale'}. Our North Coast team will review availability and contact you shortly.`}
          </p>
          <dl className="review-list">
            <div><dt>{isRtl ? 'رقم الطلب' : 'Request number'}</dt><dd><strong>{result.requestNumber}</strong></dd></div>
            <div><dt>{isRtl ? 'التاريخ' : 'Date'}</dt><dd>{new Date(result.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}</dd></div>
            <div><dt>{isRtl ? 'الوحدة' : 'Property'}</dt><dd>{result.property?.title}</dd></div>
            <div><dt>{isRtl ? 'حالة الطلب' : 'Status'}</dt><dd><span className="badge bg-warning text-dark">{result.status || 'Pending'}</span></dd></div>
          </dl>
          <div className="wizard-nav center flex-column flex-sm-row gap-2">
            <a
              href={`https://wa.me/201001234500?text=${encodeURIComponent(
                isRtl
                  ? `السلام عليكم، قمت بتقديم طلب ${isRental ? 'إيجار' : 'شراء'} لوحدة (${result.property?.title}) برقم ${result.requestNumber} على داركم.`
                  : `Hello Darcom, I submitted a ${isRental ? 'rental' : 'purchase'} request for (${result.property?.title}) with reference ${result.requestNumber}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-success d-inline-flex align-items-center justify-content-center gap-2"
            >
              <i className="bi bi-whatsapp"></i>
              <span>{isRtl ? 'تأكيد الحجز فوراً عبر واتساب' : 'Chat on WhatsApp to confirm'}</span>
            </a>
            <Link to="/profile" className="btn btn-brand">
              {isRtl ? 'متابعة في حسابي' : 'Track in my account'}
            </Link>
            <Link to="/properties" className="btn btn-outline-secondary">
              {isRtl ? 'استعراض المزيد' : 'Browse more'}
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
