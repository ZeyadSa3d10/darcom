import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { authService } from '../../services/authService.js';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const { t, isRtl } = useSettings();
  useSeo({ title: `${t('auth.forgotTitle', 'Forgot Password')} | Darcom` });

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await authService.forgotPassword({ email });
      setDone(true);
    } catch (err) {
      setErrors(mapFieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main-content" className="container auth-page">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand">
          <Link to="/" title="Darcom Home" className="auth-brand-link">
            <img src="/logo-dark.png" alt="Darcom Real Estate" className="auth-logo" />
          </Link>
        </div>

        <div className="auth-header">
          <h1 className="font-display auth-title">{t('auth.forgotTitle', 'استعادة كلمة المرور')}</h1>
          <p className="auth-subtitle">
            {t('auth.forgotSubtitle', 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور.')}
          </p>
        </div>

        {done ? (
          <div className="auth-done-box">
            <div className="alert alert-success auth-alert" role="status">
              <i className="bi bi-check-circle-fill me-2"></i>
              <span>{t('auth.resetSentNotice', 'إذا كان هناك حساب مسجل بهذا البريد، فقد تم إرسال تعليمات الاستعادة إلى صندوق الوارد الخاص بك.')}</span>
            </div>
            <Link to="/login" className="btn-auth-submit text-decoration-none">
              <span>{t('auth.backToLogin', 'العودة لتسجيل الدخول')}</span>
              <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={submit} noValidate className="auth-form">
              <FormField
                id="fp-email"
                label={t('auth.emailLabel', 'البريد الإلكتروني')}
                required
                error={errors.email}
              >
                <div className="auth-input-wrapper">
                  <i className="bi bi-envelope auth-input-icon"></i>
                  <input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    placeholder={t('auth.emailPlaceholder', 'name@example.com')}
                    className={`form-control auth-input ${errors.email ? 'is-invalid' : ''}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </FormField>

              <button type="submit" className="btn-auth-submit" disabled={busy}>
                {busy ? (
                  <span className="btn-loading-flex">
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    <span>{t('auth.sendingReset', 'جارٍ الإرسال…')}</span>
                  </span>
                ) : (
                  <span className="btn-label-flex">
                    <span>{t('auth.sendResetBtn', 'إرسال رابط الاستعادة')}</span>
                    <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
                  </span>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span className="divider-text">{isRtl ? 'أو' : 'or'}</span>
            </div>

            <div className="auth-footer-prompt">
              <Link to="/login" className="btn-auth-create">
                <i className={`bi ${isRtl ? 'bi-arrow-right' : 'bi-arrow-left'} me-2`}></i>
                <span>{t('auth.backToLogin', 'العودة لتسجيل الدخول')}</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
