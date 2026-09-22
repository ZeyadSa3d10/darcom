import { useState } from 'react';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { purchaseService } from '../../services/purchaseService.js';
import './Contact.css';

export default function Contact() {
  const { t, isRtl } = useSettings();
  useSeo({
    title: `${t('contact.title', 'Contact Us')} | Darcom`,
    description: t('contact.subtitle', 'Talk to the Darcom team about buying, selling, renting or investing.'),
  });

  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const payload = { ...form };
      if (!payload.phone.trim()) delete payload.phone;
      if (!payload.subject.trim()) delete payload.subject;
      await purchaseService.contact(payload);
      setSent(true);
      toast.success(t('contact.successAlert', isRtl ? 'تم استلام استفسارك بنجاح. سنتواصل معك قريباً.' : 'Message received. We will be in touch shortly.'));
    } catch (err) {
      setErrors(mapFieldErrors(err));
      if (!err?.errors?.length) {
        toast.error(err.message || (isRtl ? 'تعذر إرسال الرسالة. يرجى المحاولة مرة أخرى.' : 'Could not send message. Please try again.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const breadcrumbItems = [
    { label: t('contact.breadcrumbHome', 'Home'), to: '/' },
    { label: t('contact.breadcrumbContact', 'Contact Us') },
  ];

  return (
    <main id="main-content" className="container contact-page">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Hero Header */}
      <div className="contact-header-wrap">
        <div className="contact-kicker-badge">
          <span className="kicker-gem">✦</span>
          <span>{t('contact.kicker', 'استشارات وخدمة النخبة')}</span>
          <span className="kicker-gem">✦</span>
        </div>
        <h1 className="font-display contact-main-title">
          {t('contact.title', 'تواصل مع مستشاري داركم المعتمدين')}
        </h1>
        <p className="contact-main-subtitle">
          {t(
            'contact.subtitle',
            'سواء كنت ترغب في الشراء، البيع، الاستئجار، أو الاستثمار — نضع بين يديك خبرة استشارية موثوقة مع عناية فورية وسرية تامة.'
          )}
        </p>
      </div>

      <div className="contact-layout-grid">
        {/* Left Column: Direct Concierge & Verified Channels */}
        <aside className="contact-info-panel">
          <div className="concierge-brand-card">
            <div className="concierge-brand-row">
              <img src="/logo-dark.png" alt="Darcom Real Estate" className="concierge-logo" />
              <div className="broker-seal-pill">
                <i className="bi bi-patch-check-fill text-gold"></i>
                <span>{isRtl ? 'وساطة معتمدة رسمياً' : 'Licensed Brokerage'}</span>
              </div>
            </div>
            <p className="concierge-brand-bio">
              {isRtl
                ? 'فريق من كبار المستشارين المتخصصين في الوجهات الساحلية الفاخرة وكمبوندات القاهرة الجديدة.'
                : 'Senior real estate advisory team dedicated to prime coastal retreats and prestigious Cairo compounds.'}
            </p>
          </div>

          {/* Contact Cards List */}
          <div className="contact-cards-stack">
            {/* Phone Card */}
            <a href="tel:+201001234500" className="contact-action-card">
              <div className="card-icon-bubble">
                <i className="bi bi-telephone-fill"></i>
              </div>
              <div className="card-details">
                <span className="card-label">{t('contact.phoneTitle', 'مكتب خدمة كبار العملاء')}</span>
                <strong className="card-main-val" dir="ltr">+20 100 123 4500</strong>
                <span className="card-sub-val">{t('contact.phoneHours', 'السبت – الخميس: 10:00 ص – 7:00 م')}</span>
              </div>
              <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} card-chevron`}></i>
            </a>

            {/* WhatsApp Concierge Card */}
            <a
              href="https://wa.me/201001234500?text=مرحباً%20داركم،%20أرغب%20في%20استشارة%20عقارية%20بخصوص%20عقاراتكم"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-action-card whatsapp-highlight"
            >
              <div className="card-icon-bubble whatsapp-bubble">
                <i className="bi bi-whatsapp"></i>
              </div>
              <div className="card-details">
                <span className="card-label">{t('contact.whatsappTitle', 'مستشار واتساب فوري')}</span>
                <strong className="card-main-val whatsapp-val">{isRtl ? 'بدء محادثة فورية' : 'Start Instant Chat'}</strong>
                <span className="card-sub-val">{t('contact.whatsappSub', 'الأسرع لحجز مواعيد المعاينات الخاصة')}</span>
              </div>
              <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} card-chevron`}></i>
            </a>

            {/* Email Card */}
            <a href="mailto:concierge@darcom.eg" className="contact-action-card">
              <div className="card-icon-bubble">
                <i className="bi bi-envelope-fill"></i>
              </div>
              <div className="card-details">
                <span className="card-label">{t('contact.emailTitle', 'البريد الإلكتروني الرسمي')}</span>
                <strong className="card-main-val" dir="ltr">concierge@darcom.eg</strong>
                <span className="card-sub-val">{t('contact.emailSub', 'رد رسمي خلال ساعتي عمل')}</span>
              </div>
              <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} card-chevron`}></i>
            </a>

            {/* Office Location Card */}
            <div className="contact-action-card static-card">
              <div className="card-icon-bubble">
                <i className="bi bi-geo-alt-fill"></i>
              </div>
              <div className="card-details">
                <span className="card-label">{t('contact.officeTitle', 'المقر الرئيسي')}</span>
                <strong className="card-main-val">{t('contact.officeSub', 'التجمع الخامس، القاهرة الجديدة')}</strong>
                <span className="card-sub-val">{isRtl ? 'خدمة كافة الوجهات الساحلية والمدن' : 'Serving all coastal & city destinations'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Luxury Inquiry Form Card */}
        <section className="contact-form-panel">
          <div className="contact-form-card">
            <div className="form-card-header">
              <h2 className="form-card-title">{t('contact.formTitle', 'أرسل استفسارك أو طلب استشارتك')}</h2>
              <p className="form-card-desc">
                {isRtl
                  ? 'يرجى تعبئة النموذج التالي وسيقوم مستشارنا المختص بمراجعة طلبك والتواصل معك شخصياً.'
                  : 'Please complete the form below and our dedicated advisor will review your request and reply promptly.'}
              </p>
            </div>

            {sent ? (
              <div className="contact-success-state">
                <div className="success-icon-circle">
                  <i className="bi bi-check-lg"></i>
                </div>
                <h3 className="success-title">{isRtl ? 'تم إرسال رسالتك بنجاح' : 'Message Sent Successfully'}</h3>
                <p className="success-desc">
                  {t(
                    'contact.successAlert',
                    'تم استلام استفسارك بنجاح. سيتواصل معك مستشار النخبة خلال ساعتي عمل.'
                  )}
                </p>
                <button
                  type="button"
                  className="btn-send-another"
                  onClick={() => {
                    setSent(false);
                    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
                  }}
                >
                  <i className="bi bi-arrow-repeat me-2"></i>
                  <span>{isRtl ? 'إرسال استفسار آخر' : 'Send Another Message'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="contact-actual-form">
                <div className="form-row-pair">
                  {/* Full Name */}
                  <FormField
                    id="c-name"
                    label={t('contact.nameLabel', 'الاسم بالكامل')}
                    required
                    error={errors.name}
                  >
                    <div className="contact-input-wrapper">
                      <i className="bi bi-person contact-input-icon"></i>
                      <input
                        id="c-name"
                        className={`form-control contact-input ${errors.name ? 'is-invalid' : ''}`}
                        value={form.name}
                        onChange={set('name')}
                        autoComplete="name"
                        placeholder={t('contact.namePlaceholder', 'مثال: أحمد محمود')}
                        required
                      />
                    </div>
                  </FormField>

                  {/* Email */}
                  <FormField
                    id="c-email"
                    label={t('contact.emailLabel', 'البريد الإلكتروني')}
                    required
                    error={errors.email}
                  >
                    <div className="contact-input-wrapper">
                      <i className="bi bi-envelope contact-input-icon"></i>
                      <input
                        id="c-email"
                        type="email"
                        dir="ltr"
                        className={`form-control contact-input ${errors.email ? 'is-invalid' : ''}`}
                        value={form.email}
                        onChange={set('email')}
                        autoComplete="email"
                        placeholder={t('contact.emailPlaceholder', 'name@example.com')}
                        required
                      />
                    </div>
                  </FormField>
                </div>

                <div className="form-row-pair">
                  {/* Phone */}
                  <FormField
                    id="c-phone"
                    label={t('contact.phoneLabel', 'رقم الهاتف')}
                    error={errors.phone}
                  >
                    <div className="contact-input-wrapper">
                      <i className="bi bi-telephone contact-input-icon"></i>
                      <input
                        id="c-phone"
                        type="tel"
                        dir="ltr"
                        className="form-control contact-input"
                        value={form.phone}
                        onChange={set('phone')}
                        autoComplete="tel"
                        placeholder={t('contact.phonePlaceholder', '+20 100 000 0000')}
                      />
                    </div>
                  </FormField>

                  {/* Subject */}
                  <FormField
                    id="c-subject"
                    label={t('contact.subjectLabel', 'نوع الاستشارة / الموضوع')}
                    error={errors.subject}
                  >
                    <div className="contact-input-wrapper">
                      <i className="bi bi-tag contact-input-icon"></i>
                      <input
                        id="c-subject"
                        className="form-control contact-input"
                        value={form.subject}
                        onChange={set('subject')}
                        placeholder={t('contact.subjectPlaceholder', 'شراء، بيع، طلب معاينة خاصة…')}
                      />
                    </div>
                  </FormField>
                </div>

                {/* Message */}
                <FormField
                  id="c-message"
                  label={t('contact.messageLabel', 'تفاصيل الاستفسار')}
                  required
                  error={errors.message}
                >
                  <div className="contact-input-wrapper textarea-wrapper">
                    <textarea
                      id="c-message"
                      rows="5"
                      className={`form-control contact-textarea ${errors.message ? 'is-invalid' : ''}`}
                      value={form.message}
                      onChange={set('message')}
                      placeholder={t(
                        'contact.messagePlaceholder',
                        'أخبرنا بتفاصيل متطلباتك، الوجهة المفضلة، أو الموعد المقترح للمعاينة…'
                      )}
                      required
                    />
                  </div>
                </FormField>

                {/* Submit & Trust Strip */}
                <div className="contact-submit-row">
                  <button type="submit" className="btn-contact-submit" disabled={busy}>
                    {busy ? (
                      <span className="btn-loading-flex">
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <span>{t('contact.submitting', 'جارٍ الإرسال…')}</span>
                      </span>
                    ) : (
                      <span className="btn-label-flex">
                        <span>{t('contact.submitBtn', 'إرسال الرسالة')}</span>
                        <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
                      </span>
                    )}
                  </button>

                  <div className="contact-confidentiality-badge">
                    <i className="bi bi-shield-lock-fill text-gold"></i>
                    <span>{t('contact.confidentialityNotice', 'بياناتك مشمولة بالسرية التامة.')}</span>
                  </div>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
