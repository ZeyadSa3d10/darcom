import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import FormField, { mapFieldErrors } from '../FormField/FormField.jsx';
import { useToast } from '../Toast/Toast.jsx';
import { purchaseService } from '../../services/purchaseService.js';
import './InquiryForm.css';

export default function InquiryForm({ propertyId, propertyTitle }) {
  const toast = useToast();
  const { t, isRtl } = useSettings();
  const { user, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    name: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: user?.phoneNumber || user?.phone || '',
    message: '',
  });

  const [showManualFields, setShowManualFields] = useState(false);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phoneNumber || user.phone || '',
      }));
    }
  }, [user]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
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

  const hasCompleteProfile = isAuthenticated && Boolean(user?.fullName || user?.name) && Boolean(user?.email);
  const hasPhone = Boolean(form.phone || user?.phoneNumber || user?.phone);

  return (
    <section className="inquiry-form" id="inquiry" aria-label={t('detailsPage.inquireTitle', 'Send inquiry')}>
      <h3>{t('detailsPage.inquireTitle', 'Ask about this property')}</h3>

      {isAuthenticated && (
        <div className="inquiry-auth-badge mb-3 d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-check text-gold fs-5"></i>
            <div className="auth-badge-meta small">
              <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                {isRtl ? 'إرسال الاستفسار كحساب موثق' : 'Submitting verified inquiry'}
              </span>
              <strong>{user?.fullName || user?.name || user?.email}</strong>
              {form.phone && <span className="ms-2 text-muted" dir="ltr">({form.phone})</span>}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-decoration-none"
            style={{ fontSize: '0.78rem' }}
            onClick={() => setShowManualFields((prev) => !prev)}
          >
            {showManualFields
              ? (isRtl ? 'إخفاء البيانات' : 'Hide details')
              : (isRtl ? 'تعديل البيانات' : 'Edit details')}
          </button>
        </div>
      )}

      <form onSubmit={submit} noValidate>
        {(!hasCompleteProfile || showManualFields) && (
          <>
            <FormField id="inq-name" label={t('detailsPage.fullName', 'Full name')} required error={errors.name}>
              <input
                id="inq-name"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                value={form.name}
                onChange={set('name')}
                autoComplete="name"
              />
            </FormField>
            <FormField id="inq-email" label={t('detailsPage.emailAddress', 'Email')} required error={errors.email}>
              <input
                id="inq-email"
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
            </FormField>
          </>
        )}

        {(!hasPhone || showManualFields) && (
          <FormField
            id="inq-phone"
            label={t('detailsPage.phoneNumber', 'Phone')}
            required={!isAuthenticated}
            error={errors.phone}
          >
            <input
              id="inq-phone"
              type="tel"
              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
              placeholder={isRtl ? 'أدخل رقم الهاتف للتواصل' : 'Enter phone number for follow-up'}
            />
          </FormField>
        )}

        <FormField id="inq-message" label={t('detailsPage.message', 'Message')} required error={errors.message}>
          <textarea
            id="inq-message"
            rows="3"
            className={`form-control ${errors.message ? 'is-invalid' : ''}`}
            value={form.message}
            onChange={set('message')}
            placeholder={t('detailsPage.messagePlaceholder', 'I would like to schedule a private viewing…')}
          />
        </FormField>

        <button type="submit" className="btn btn-brand w-100" disabled={sending}>
          {sending
            ? t('common.loading', 'Sending…')
            : (isAuthenticated && hasCompleteProfile
                ? (isRtl ? 'إرسال طلب الاستفسار بنقرة واحدة' : 'Send One-Click Inquiry')
                : t('detailsPage.submitInquiry', 'Send inquiry'))}
        </button>
      </form>
    </section>
  );
}
