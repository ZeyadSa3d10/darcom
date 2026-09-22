import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import FormField, { mapFieldErrors } from '../FormField/FormField.jsx';
import { useToast } from '../Toast/Toast.jsx';
import { purchaseService } from '../../services/purchaseService.js';
import './InquiryForm.css';

export default function InquiryForm({ propertyId, propertyTitle }) {
  const toast = useToast();
  const { t } = useSettings();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setErrors({});
    try {
      await purchaseService.inquire(propertyId, form);
      setSent(true);
      toast.success(t('detailsPage.inquirySent', 'Inquiry sent. The agent will contact you shortly.'));
    } catch (err) {
      setErrors(mapFieldErrors(err));
      if (!err?.errors?.length) toast.error(err.message || t('common.error', 'Could not send inquiry.'));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <section className="inquiry-form sent" id="inquiry" aria-label={t('detailsPage.inquirySent', 'Inquiry sent')}>
        <i className="bi bi-check-circle"></i>
        <h3>{t('detailsPage.inquirySent', 'Inquiry sent')}</h3>
        <p className="text-meta">{t('detailsPage.inquirySentDesc', 'Thanks — the listing agent will reach out shortly.')}</p>
      </section>
    );
  }

  return (
    <section className="inquiry-form" id="inquiry" aria-label={t('detailsPage.inquireTitle', 'Send inquiry')}>
      <h3>{t('detailsPage.inquireTitle', 'Ask about this property')}</h3>
      <form onSubmit={submit} noValidate>
        <FormField id="inq-name" label={t('detailsPage.fullName', 'Full name')} required error={errors.name}>
          <input id="inq-name" className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={set('name')} autoComplete="name" />
        </FormField>
        <FormField id="inq-email" label={t('detailsPage.emailAddress', 'Email')} required error={errors.email}>
          <input id="inq-email" type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={form.email} onChange={set('email')} autoComplete="email" />
        </FormField>
        <FormField id="inq-phone" label={t('detailsPage.phoneNumber', 'Phone')} error={errors.phone}>
          <input id="inq-phone" type="tel" className={`form-control ${errors.phone ? 'is-invalid' : ''}`} value={form.phone} onChange={set('phone')} autoComplete="tel" />
        </FormField>
        <FormField id="inq-message" label={t('detailsPage.message', 'Message')} required error={errors.message}>
          <textarea
            id="inq-message"
            rows="4"
            className={`form-control ${errors.message ? 'is-invalid' : ''}`}
            value={form.message}
            onChange={set('message')}
            placeholder={t('detailsPage.messagePlaceholder', 'I would like to schedule a private viewing…')}
          />
        </FormField>
        <button type="submit" className="btn btn-brand w-100" disabled={sending}>
          {sending ? t('common.loading', 'Sending…') : t('detailsPage.submitInquiry', 'Send inquiry')}
        </button>
      </form>
    </section>
  );
}
