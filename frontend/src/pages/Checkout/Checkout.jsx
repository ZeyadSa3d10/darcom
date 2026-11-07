import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
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
  useSeo({ title: 'Request Property | Darcom Luxury Real Estate' });
  const { slug } = useParams();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
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

  const setC = (key) => (e) =>
    setCustomer((c) => ({ ...c, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setD = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDetails((d) => ({ ...d, [key]: v }));
  };

  const customerValid = customer.fullName.trim() && /.+@.+\..+/.test(customer.email) && customer.phone.trim();

  const validateStep2 = () => {
    const errs = {};
    if (isRental) {
      if (!details.startDate) {
        errs.startDate = 'Please select a preferred start date.';
      }
      if (!details.endDate) {
        errs.endDate = 'Please select a preferred end date.';
      }
      if (details.startDate && details.endDate) {
        if (new Date(details.endDate) <= new Date(details.startDate)) {
          errs.endDate = 'End date must be strictly after the start date.';
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
      if (isRental) {
        res = await purchaseService.createBooking({
          propertyId: property.id,
          fullName: customer.fullName.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
          startDate: details.startDate ? new Date(details.startDate).toISOString() : null,
          endDate: details.endDate ? new Date(details.endDate).toISOString() : null,
          duration: details.duration || null,
          notes: customer.notes || null,
        });
      } else {
        res = await purchaseService.createPurchase({
          propertyId: property.id,
          fullName: customer.fullName.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
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
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'active' : i < step ? 'done' : ''}>
              <span className="step-num">{i < step ? <i className="bi bi-check"></i> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}

      {step === 0 && (
        <section className="wizard-card">
          <h2>Confirm the property</h2>
          <div className="confirm-box">
            <img src={property.images?.[0]?.url || '/images/hero-sahel.svg'} alt={property.title} loading="lazy" />
            <div>
              <strong>{property.title}</strong>
              <p className="text-meta">{locationDisplay}</p>
              <p className="confirm-price">
                {formatPrice(property.price, property.currency)}
                {isRental && <span className="text-muted fs-6"> / month</span>}
              </p>
              <p className="text-meta">
                Ref: {property.referenceNumber} · {property.purpose} · {property.propertyType}
              </p>
            </div>
          </div>
          <div className="wizard-nav">
            <Link to={`/properties/${property.slug}`} className="btn btn-outline-secondary">Back to details</Link>
            <button type="button" className="btn btn-brand" onClick={() => setStep(1)}>Continue</button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="wizard-card">
          <h2>Your contact details</h2>
          <div className="form-grid">
            <FormField id="co-name" label="Full name" required error={fieldErrors.fullName}>
              <input id="co-name" className={`form-control ${fieldErrors.fullName ? 'is-invalid' : ''}`} value={customer.fullName} onChange={setC('fullName')} autoComplete="name" />
            </FormField>
            <FormField id="co-email" label="Email" required error={fieldErrors.email}>
              <input id="co-email" type="email" className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`} value={customer.email} onChange={setC('email')} autoComplete="email" />
            </FormField>
            <FormField id="co-phone" label="Phone" required error={fieldErrors.phone}>
              <input id="co-phone" type="tel" className={`form-control ${fieldErrors.phone ? 'is-invalid' : ''}`} value={customer.phone} onChange={setC('phone')} autoComplete="tel" />
            </FormField>
            <FormField id="co-country" label="Country" error={fieldErrors.country}>
              <input id="co-country" className="form-control" value={customer.country} onChange={setC('country')} autoComplete="country-name" />
            </FormField>
            <FormField id="co-city" label="City" error={fieldErrors.city}>
              <input id="co-city" className="form-control" value={customer.city} onChange={setC('city')} autoComplete="address-level2" />
            </FormField>
            <FormField id="co-contact" label="Preferred contact" error={fieldErrors.preferredContact}>
              <select id="co-contact" className="form-select" value={customer.preferredContact} onChange={setC('preferredContact')}>
                <option>Phone</option>
                <option>WhatsApp</option>
                <option>Email</option>
              </select>
            </FormField>
            <FormField id="co-address" label="Address" error={fieldErrors.address}>
              <input id="co-address" className="form-control" value={customer.address} onChange={setC('address')} autoComplete="street-address" />
            </FormField>
          </div>
          <FormField id="co-notes" label="Notes / Special Requests" error={fieldErrors.notes}>
            <textarea id="co-notes" rows="3" className="form-control" value={customer.notes} onChange={setC('notes')} />
          </FormField>
          <div className="wizard-nav">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(0)}>Back</button>
            <button type="button" className="btn btn-brand" disabled={!customerValid} onClick={() => setStep(2)}>Continue</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="wizard-card">
          <h2>{isRental ? 'Rental Booking Request' : 'Purchase details'}</h2>
          {!isRental ? (
            <div className="form-grid">
              <FormField id="co-pay" label="Payment method" error={fieldErrors.paymentMethod}>
                <select id="co-pay" className="form-select" value={details.paymentMethod} onChange={setD('paymentMethod')}>
                  <option>Cash</option>
                  <option>Mortgage</option>
                  <option>Installments</option>
                </select>
              </FormField>
              <FormField id="co-timeline" label="Expected timeline" error={fieldErrors.timeline}>
                <select id="co-timeline" className="form-select" value={details.timeline} onChange={setD('timeline')}>
                  <option>ASAP</option>
                  <option>1-3 months</option>
                  <option>3-6 months</option>
                  <option>6+ months</option>
                </select>
              </FormField>
              <FormField id="co-appt" label="Preferred appointment" error={fieldErrors.preferredAppointment}>
                <input id="co-appt" type="datetime-local" className="form-control" value={details.preferredAppointment} onChange={setD('preferredAppointment')} />
              </FormField>
              <div className="check-line">
                <input id="co-fin" type="checkbox" checked={details.financingRequired} onChange={setD('financingRequired')} />
                <label htmlFor="co-fin">I need financing</label>
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <FormField id="co-start" label="Rental start date" required error={fieldErrors.startDate}>
                <input
                  id="co-start"
                  type="date"
                  className={`form-control ${fieldErrors.startDate ? 'is-invalid' : ''}`}
                  value={details.startDate}
                  onChange={setD('startDate')}
                  required
                />
              </FormField>
              <FormField id="co-end" label="Rental end date" required error={fieldErrors.endDate}>
                <input
                  id="co-end"
                  type="date"
                  className={`form-control ${fieldErrors.endDate ? 'is-invalid' : ''}`}
                  value={details.endDate}
                  onChange={setD('endDate')}
                  required
                />
              </FormField>
              <FormField id="co-duration" label="Intended stay duration" error={fieldErrors.duration}>
                <select id="co-duration" className="form-select" value={details.duration} onChange={setD('duration')}>
                  <option>Weekend (2-3 days)</option>
                  <option>1 Week</option>
                  <option>2 Weeks</option>
                  <option>1 Month</option>
                  <option>Full Summer Season (3 months)</option>
                  <option>Annual / Long Term</option>
                  <option>Flexible</option>
                </select>
              </FormField>
            </div>
          )}
          <div className="wizard-nav">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn btn-brand" onClick={validateStep2}>Review request</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="wizard-card">
          <h2>Review your request</h2>
          <dl className="review-list">
            <div><dt>Property</dt><dd>{property.title} ({property.referenceNumber})</dd></div>
            <div><dt>Location</dt><dd>{locationDisplay}</dd></div>
            <div><dt>Price</dt><dd>{formatPrice(property.price, property.currency)}{isRental ? ' / mo' : ''}</dd></div>
            <div><dt>Name</dt><dd>{customer.fullName}</dd></div>
            <div><dt>Email</dt><dd>{customer.email}</dd></div>
            <div><dt>Phone</dt><dd>{customer.phone}</dd></div>
            {!isRental && <div><dt>Payment</dt><dd>{details.paymentMethod}{details.financingRequired ? ' · financing needed' : ''}</dd></div>}
            {!isRental && <div><dt>Timeline</dt><dd>{details.timeline}</dd></div>}
            {isRental && (
              <>
                <div><dt>Start Date</dt><dd>{details.startDate}</dd></div>
                <div><dt>End Date</dt><dd>{details.endDate}</dd></div>
                <div><dt>Duration</dt><dd>{details.duration}</dd></div>
              </>
            )}
          </dl>

          <div className="alert alert-info d-flex align-items-center mt-3" role="alert">
            <i className="bi bi-info-circle-fill me-2 fs-5"></i>
            <div>
              <strong>Important Notice:</strong> Submitting this request sends an official inquiry to Darcom.
              {isRental
                ? ' This does not immediately confirm your booking; our team will review availability with the owner and contact you.'
                : ' Our sales team will verify details and reach out to arrange viewings and contracts.'}
            </div>
          </div>

          {submitError && <div className="alert alert-danger" role="alert">{submitError}</div>}
          <div className="wizard-nav">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(2)} disabled={submitting}>Back</button>
            <button type="button" className="btn btn-brand" onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </section>
      )}

      {step === 4 && result && (
        <section className="wizard-card success">
          <img src="/logo-dark.png" alt="Darcom Real Estate" style={{ height: '52px', width: 'auto', marginBottom: '1rem' }} />
          <i className="bi bi-check-circle"></i>
          <h2>Your request has been submitted.</h2>
          <p className="text-meta">
            This is an official request, not a confirmed {isRental ? 'rental' : 'sale'}.
            Our North Coast team will review availability and contact you shortly.
          </p>
          <dl className="review-list">
            <div><dt>Request number</dt><dd><strong>{result.requestNumber}</strong></dd></div>
            <div><dt>Date</dt><dd>{new Date(result.createdAt).toLocaleString()}</dd></div>
            <div><dt>Property</dt><dd>{result.property?.title}</dd></div>
            <div><dt>Status</dt><dd><span className="badge bg-warning text-dark">{result.status || 'Pending'}</span></dd></div>
          </dl>
          <div className="wizard-nav center">
            <Link to="/profile" className="btn btn-brand">Track in my account</Link>
            <Link to="/properties" className="btn btn-outline-secondary">Browse more</Link>
          </div>
        </section>
      )}
    </main>
  );
}
