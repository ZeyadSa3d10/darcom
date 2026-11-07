import { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal/Modal.jsx';
import FormField from '../FormField/FormField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { locationService } from '../../services/locationService.js';
import { requirementService } from '../../services/requirementService.js';
import './PropertyRequirementModal.css';

export default function PropertyRequirementModal({
  isOpen,
  onClose,
  initialPurpose = 'Sale',
  initialVillage = '',
}) {
  const { user } = useAuth();
  const { t, isRtl } = useSettings();

  const [villages, setVillages] = useState([]);
  const [types, setTypes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [submittedLead, setSubmittedLead] = useState(null);

  const [form, setForm] = useState({
    purpose: initialPurpose || 'Sale',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    propertyTypeId: '',
    villageId: '',
    zoneId: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    startDate: '',
    endDate: '',
    desiredAmenities: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      locationService.getVillages().then((r) => setVillages(r.data ?? []));
      locationService.getPropertyTypes().then((r) => setTypes(r.data ?? []));
      setSuccess(false);
      setErrorMsg('');
      setSubmittedLead(null);
      setForm((prev) => ({
        ...prev,
        purpose: initialPurpose || 'Sale',
        customerName: user?.fullName || prev.customerName || '',
        customerEmail: user?.email || prev.customerEmail || '',
        customerPhone: user?.phoneNumber || prev.customerPhone || '',
      }));
    }
  }, [isOpen, initialPurpose, user]);

  const selectedVillage = useMemo(() => {
    if (!form.villageId) return null;
    return villages.find((v) => String(v.id) === String(form.villageId)) || null;
  }, [form.villageId, villages]);

  const availableZones = selectedVillage?.zones ?? [];

  const setField = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
  };

  const handleVillageSelect = (e) => {
    const vId = e.target.value;
    setForm((f) => ({
      ...f,
      villageId: vId,
      zoneId: '', // Reset zone when village changes
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.customerName.trim() || !form.customerEmail.trim() || !form.customerPhone.trim()) {
      setErrorMsg(t('leads.fillRequired', 'Please fill in your name, email, and phone number.'));
      return;
    }

    if (form.purpose.toLowerCase() === 'rent' && form.startDate && form.endDate) {
      if (new Date(form.endDate) <= new Date(form.startDate)) {
        setErrorMsg(t('leads.invalidDateRange', 'Rental end date must be after start date.'));
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        purpose: form.purpose,
        propertyTypeId: form.propertyTypeId ? Number(form.propertyTypeId) : null,
        villageId: form.villageId ? Number(form.villageId) : null,
        zoneId: form.zoneId ? Number(form.zoneId) : null,
        minPrice: form.minPrice ? Number(form.minPrice) : null,
        maxPrice: form.maxPrice ? Number(form.maxPrice) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        desiredAmenities: form.desiredAmenities.trim() || null,
        notes: form.notes.trim() || null,
      };

      const res = await requirementService.submit(payload);
      setSubmittedLead(res.data);
      setSuccess(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || t('leads.submitFailed', 'Failed to submit request.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      title={
        success
          ? t('leads.successTitle', 'Request Received')
          : t('leads.modalTitle', 'Request a Custom Property in North Coast')
      }
      onClose={onClose}
    >
      {success ? (
        <div className="req-success-box">
          <i className="bi bi-check-circle-fill req-success-icon"></i>
          <h3>{t('leads.thankYou', 'Thank You!')}</h3>
          <p className="text-muted">
            {t(
              'leads.successDesc',
              'We have received your custom property specifications. Our North Coast luxury property specialists will contact you with matching exclusive opportunities.'
            )}
          </p>
          {submittedLead && (
            <p className="text-meta">
              {t('leads.reference', 'Reference')}: #{submittedLead.id} · {submittedLead.customerName}
            </p>
          )}
          <div className="mt-4">
            <button type="button" className="btn btn-brand px-4" onClick={onClose}>
              {t('common.done', 'Done')}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="req-modal-form" noValidate>
          {/* Purpose Toggle */}
          <div className="req-purpose-toggle" role="group" aria-label="Requirement Purpose">
            <button
              type="button"
              className={form.purpose.toLowerCase() === 'sale' ? 'active' : ''}
              onClick={() => setForm((f) => ({ ...f, purpose: 'Sale' }))}
            >
              {t('purposes.sale', 'Buy')}
            </button>
            <button
              type="button"
              className={form.purpose.toLowerCase() === 'rent' ? 'active' : ''}
              onClick={() => setForm((f) => ({ ...f, purpose: 'Rent' }))}
            >
              {t('purposes.rent', 'Rent')}
            </button>
          </div>

          <div className="req-section-title">
            {t('leads.propertySpecs', '1. Desired Property Specifications')}
          </div>

          <div className="req-grid-2">
            <FormField id="req-village" label={t('propertiesPage.village', 'North Coast Village')}>
              <select id="req-village" className="form-select" value={form.villageId} onChange={handleVillageSelect}>
                <option value="">{t('propertiesPage.anyVillage', 'Any Village / Open')}</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="req-zone" label={t('propertiesPage.zone', 'Zone / Bay')}>
              <select
                id="req-zone"
                className="form-select"
                value={form.zoneId}
                onChange={setField('zoneId')}
                disabled={!form.villageId || availableZones.length === 0}
              >
                <option value="">{t('propertiesPage.anyZone', 'Any Zone')}</option>
                {availableZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="req-grid-2">
            <FormField id="req-type" label={t('propertiesPage.propertyType', 'Property Type')}>
              <select id="req-type" className="form-select" value={form.propertyTypeId} onChange={setField('propertyTypeId')}>
                <option value="">{t('search.allTypes', 'Any Type (Villa, Chalet…)')}</option>
                {types.map((tItem) => (
                  <option key={tItem.id} value={tItem.id}>
                    {tItem.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="req-beds" label={t('propertiesPage.bedrooms', 'Bedrooms')}>
              <select id="req-beds" className="form-select" value={form.bedrooms} onChange={setField('bedrooms')}>
                <option value="">{t('propertiesPage.anyBeds', 'Any')}</option>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}+ {t('common.beds', 'Beds')}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="req-grid-2">
            <FormField id="req-min-price" label={t('propertiesPage.minPrice', 'Min Budget (EGP)')}>
              <input
                id="req-min-price"
                type="number"
                min="0"
                className="form-control"
                placeholder="e.g. 5,000,000"
                value={form.minPrice}
                onChange={setField('minPrice')}
              />
            </FormField>
            <FormField id="req-max-price" label={t('propertiesPage.maxPrice', 'Max Budget (EGP)')}>
              <input
                id="req-max-price"
                type="number"
                min="0"
                className="form-control"
                placeholder="e.g. 15,000,000"
                value={form.maxPrice}
                onChange={setField('maxPrice')}
              />
            </FormField>
          </div>

          {form.purpose.toLowerCase() === 'rent' && (
            <div className="req-grid-2">
              <FormField id="req-start-date" label={t('detailsPage.startDate', 'Rental Start Date')}>
                <input
                  id="req-start-date"
                  type="date"
                  className="form-control"
                  value={form.startDate}
                  onChange={setField('startDate')}
                />
              </FormField>
              <FormField id="req-end-date" label={t('detailsPage.endDate', 'Rental End Date')}>
                <input
                  id="req-end-date"
                  type="date"
                  className="form-control"
                  value={form.endDate}
                  onChange={setField('endDate')}
                />
              </FormField>
            </div>
          )}

          <FormField id="req-amenities" label={t('leads.amenities', 'Preferred Amenities & Views')}>
            <input
              id="req-amenities"
              type="text"
              className="form-control"
              placeholder="e.g. Sea View, Private Pool, Ground Floor with Garden"
              value={form.desiredAmenities}
              onChange={setField('desiredAmenities')}
            />
          </FormField>

          <div className="req-section-title">
            {t('leads.contactInfo', '2. Your Contact Information')}
          </div>

          <div className="req-grid-3">
            <FormField id="req-name" label={t('leads.fullName', 'Full Name')} required>
              <input
                id="req-name"
                type="text"
                className="form-control"
                value={form.customerName}
                onChange={setField('customerName')}
                placeholder="e.g. Omar Mansour"
                required
              />
            </FormField>
            <FormField id="req-email" label={t('leads.email', 'Email')} required>
              <input
                id="req-email"
                type="email"
                className="form-control"
                value={form.customerEmail}
                onChange={setField('customerEmail')}
                placeholder="e.g. omar@example.com"
                required
              />
            </FormField>
            <FormField id="req-phone" label={t('leads.phone', 'Phone / WhatsApp')} required>
              <input
                id="req-phone"
                type="tel"
                className="form-control"
                value={form.customerPhone}
                onChange={setField('customerPhone')}
                placeholder="e.g. 01012345678"
                required
              />
            </FormField>
          </div>

          <FormField id="req-notes" label={t('leads.notes', 'Additional Notes')}>
            <textarea
              id="req-notes"
              rows="2"
              className="form-control"
              placeholder="Any other specifications or timing details…"
              value={form.notes}
              onChange={setField('notes')}
            />
          </FormField>

          {errorMsg && <div className="alert alert-danger py-2">{errorMsg}</div>}

          <div className="d-flex justify-content-end gap-2 mt-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-brand px-4" disabled={submitting}>
              {submitting ? t('common.submitting', 'Submitting…') : t('leads.submitRequest', 'Submit Property Request')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

