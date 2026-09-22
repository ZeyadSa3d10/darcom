import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import './Register.css';

export default function Register() {
  const { t, isRtl } = useSettings();
  useSeo({ title: `${t('auth.registerTitle', 'Create Account')} | Darcom` });

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', password: '', phoneNumber: '' });
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
      const payload = { ...form };
      if (!payload.phoneNumber.trim()) delete payload.phoneNumber;
      await register(payload);
      toast.success(t('auth.registerSuccess', isRtl ? 'تم إنشاء الحساب بنجاح. أهلاً بك في داركم!' : 'Account created. Welcome to Darcom.'));
      navigate('/', { replace: true });
    } catch (err) {
      const fields = mapFieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) {
        setGeneral(err.message || (isRtl ? 'فشل إنشاء الحساب. يرجى مراجعة البيانات المدخلة.' : 'Registration failed.'));
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
          <h1 className="font-display auth-title">{t('auth.registerTitle', 'إنشاء حساب جديد')}</h1>
          <p className="auth-subtitle">
            {t('auth.registerSubtitle', 'انضم لمنصة داركم لحفظ العقارات ومتابعة المعاينات والتواصل المباشر مع المستشارين.')}
          </p>
        </div>

        {general && (
          <div className="alert alert-danger auth-alert" role="alert">
            <i className="bi bi-exclamation-octagon-fill me-2"></i>
            <span>{general}</span>
          </div>
        )}

        <form onSubmit={submit} noValidate className="auth-form">
          {/* Full Name */}
          <FormField
            id="reg-name"
            label={t('auth.fullNameLabel', 'الاسم بالكامل')}
            required
            error={errors.fullName}
          >
            <div className="auth-input-wrapper">
              <i className="bi bi-person auth-input-icon"></i>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                placeholder={t('auth.fullNamePlaceholder', 'مثال: أحمد محمود')}
                className={`form-control auth-input ${errors.fullName ? 'is-invalid' : ''}`}
                value={form.fullName}
                onChange={set('fullName')}
                required
              />
            </div>
          </FormField>

          {/* Email */}
          <FormField
            id="reg-email"
            label={t('auth.emailLabel', 'البريد الإلكتروني')}
            required
            error={errors.email}
          >
            <div className="auth-input-wrapper">
              <i className="bi bi-envelope auth-input-icon"></i>
              <input
                id="reg-email"
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

          {/* Password */}
          <FormField
            id="reg-password"
            label={t('auth.passwordLabel', 'كلمة المرور')}
            required
            error={errors.password}
            hint={t('auth.passwordHint', '8 أحرف على الأقل تحتوي أحرفاً وأرقاماً.')}
          >
            <div className="auth-input-wrapper">
              <i className="bi bi-shield-lock auth-input-icon"></i>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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

          {/* Phone (Optional) */}
          <FormField
            id="reg-phone"
            label={t('auth.phoneLabel', 'رقم الهاتف (اختياري)')}
            error={errors.phoneNumber}
          >
            <div className="auth-input-wrapper">
              <i className="bi bi-telephone auth-input-icon"></i>
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder={t('auth.phonePlaceholder', '+20 100 000 0000')}
                className={`form-control auth-input ${errors.phoneNumber ? 'is-invalid' : ''}`}
                value={form.phoneNumber}
                onChange={set('phoneNumber')}
              />
            </div>
          </FormField>

          {/* Submit Button */}
          <button type="submit" className="btn-auth-submit" disabled={busy}>
            {busy ? (
              <span className="btn-loading-flex">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                <span>{t('auth.creatingAccount', 'جارٍ إنشاء الحساب…')}</span>
              </span>
            ) : (
              <span className="btn-label-flex">
                <span>{t('auth.registerBtn', 'إنشاء الحساب')}</span>
                <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
              </span>
            )}
          </button>
        </form>

        {/* Elegant Divider */}
        <div className="auth-divider">
          <span className="divider-text">{isRtl ? 'أو' : 'or'}</span>
        </div>

        {/* Back to Login Prompt */}
        <div className="auth-footer-prompt">
          <span className="prompt-label">{t('auth.alreadyRegistered', 'لديك حساب بالفعل في داركم؟')}</span>
          <Link to="/login" className="btn-auth-create">
            <span>{t('auth.backToLogin', 'تسجيل الدخول')}</span>
            <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
          </Link>
        </div>
      </div>
    </main>
  );
}
