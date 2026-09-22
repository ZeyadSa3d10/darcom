import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import './Login.css';

export default function Login() {
  const { t, isRtl } = useSettings();
  useSeo({ title: `${t('auth.loginTitle', 'Log In')} | Darcom` });

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setGeneral('');
    try {
      await login(form);
      toast.success(t('auth.loginSuccess', isRtl ? 'تم تسجيل الدخول بنجاح. مرحباً بعودتك!' : 'Welcome back.'));
      navigate(from, { replace: true });
    } catch (err) {
      const fields = mapFieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) {
        setGeneral(err.message || (isRtl ? 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.' : 'Login failed. Please verify your credentials.'));
      }
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
          <h1 className="font-display auth-title">{t('auth.loginTitle', 'مرحباً بعودتك')}</h1>
          <p className="auth-subtitle">
            {t('auth.loginSubtitle', 'سجل الدخول لإدارة عقاراتك المفضلة وطلبات المعاينة الخاصة.')}
          </p>
        </div>

        {general && (
          <div className="alert alert-danger auth-alert" role="alert">
            <i className="bi bi-exclamation-octagon-fill me-2"></i>
            <span>{general}</span>
          </div>
        )}

        <form onSubmit={submit} noValidate className="auth-form">
          <FormField
            id="login-email"
            label={t('auth.emailLabel', 'البريد الإلكتروني')}
            required
            error={errors.email}
          >
            <div className="auth-input-wrapper">
              <i className="bi bi-envelope auth-input-icon"></i>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                dir="ltr"
                placeholder={t('auth.emailPlaceholder', 'name@example.com')}
                className={`form-control auth-input ${errors.email ? 'is-invalid' : ''}`}
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>
          </FormField>

          <FormField
            id="login-password"
            label={t('auth.passwordLabel', 'كلمة المرور')}
            required
            error={errors.password}
          >
            <div className="auth-input-wrapper">
              <i className="bi bi-shield-lock auth-input-icon"></i>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                dir="ltr"
                placeholder="••••••••"
                className={`form-control auth-input ${errors.password ? 'is-invalid' : ''}`}
                value={form.password}
                onChange={set('password')}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </FormField>

          {/* Dedicated Forgot Password Row */}
          <div className="auth-forgot-row">
            <Link to="/forgot-password" className="auth-forgot-link">
              <i className="bi bi-key me-1"></i>
              <span>{t('auth.forgotPassword', 'نسيت كلمة المرور؟')}</span>
            </Link>
          </div>

          <button type="submit" className="btn-auth-submit" disabled={busy}>
            {busy ? (
              <span className="btn-loading-flex">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                <span>{t('auth.loggingIn', 'جارٍ تسجيل الدخول…')}</span>
              </span>
            ) : (
              <span className="btn-label-flex">
                <span>{t('auth.loginBtn', 'تسجيل الدخول')}</span>
                <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
              </span>
            )}
          </button>
        </form>

        {/* Elegant Divider */}
        <div className="auth-divider">
          <span className="divider-text">{isRtl ? 'أو' : 'or'}</span>
        </div>

        {/* Create Account Prompt Section */}
        <div className="auth-footer-prompt">
          <span className="prompt-label">{t('auth.noAccountPrompt', 'ليس لديك حساب في داركم؟')}</span>
          <Link to="/register" className="btn-auth-create">
            <span>{t('auth.createAccountLink', 'إنشاء حساب جديد')}</span>
            <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
          </Link>
        </div>
      </div>
    </main>
  );
}
