import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import GoogleSignInButton from '../../components/GoogleSignInButton/GoogleSignInButton.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { normalizeDigits } from '../../utils/phoneUtils.js';
import { useSeo } from '../../hooks/useSeo.js';
import './Login.css';

export default function Login() {
  const { t, isRtl } = useSettings();
  useSeo({ title: `${t('auth.loginTitle', 'تسجيل الدخول')} | Darcom` });

  const { sendEmailOtp, verifyEmailOtp, googleLogin, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || searchParams.get('returnUrl');
  const from = location.state?.from || redirectTarget || '/';
  const authErrorCode = searchParams.get('authError');

  // 'otp' (default passwordless) | 'password' (admin/broker legacy fallback)
  const [authMode, setAuthMode] = useState('otp');
  const [otpStep, setOtpStep] = useState('email'); // 'email' | 'code'
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpFullName, setOtpFullName] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Password fallback state
  const [pwForm, setPwForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState(() => {
    if (!authErrorCode) return '';
    const map = {
      google_cancelled: isRtl ? 'تم إلغاء تسجيل الدخول عبر Google.' : 'Google sign-in was cancelled.',
      google_not_configured: isRtl ? 'إعدادات Google OAuth غير مكتملة على الخادم.' : 'Google OAuth is not configured on the server.',
      google_account_disabled: isRtl ? 'هذا الحساب غير نشط.' : 'This account is disabled.',
    };
    return map[authErrorCode] || (isRtl ? 'تعذر إكمال تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.' : 'Google sign-in failed. Please try again.');
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrors({ email: isRtl ? 'يرجى إدخال البريد الإلكتروني.' : 'Email is required.' });
      return;
    }

    setBusy(true);
    setErrors({});
    setGeneral('');
    try {
      const res = await sendEmailOtp(cleanEmail);
      const data = res?.data;
      setOtpStep('code');
      setCountdown(data?.cooldownSeconds ?? 60);
      setDebugOtp(data?.debugCode || '');
      toast.success(isRtl ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.' : 'Verification code sent to your email.');
    } catch (err) {
      const fields = mapFieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) {
        setGeneral(err.message || (isRtl ? 'تعذر إرسال رمز التحقق.' : 'Failed to send verification code.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    const cleanCode = normalizeDigits(otpCode).trim();
    if (!cleanCode) {
      setErrors({ code: isRtl ? 'يرجى إدخال رمز التحقق.' : 'Verification code is required.' });
      return;
    }

    setBusy(true);
    setErrors({});
    setGeneral('');
    try {
      await verifyEmailOtp({
        email: cleanEmail,
        code: cleanCode,
        ...(otpFullName.trim() ? { fullName: otpFullName.trim() } : {}),
      });
      toast.success(isRtl ? 'تم تسجيل الدخول بنجاح. مرحباً بك في داركم!' : 'Signed in successfully. Welcome to Darcom!');
      navigate(from, { replace: true });
    } catch (err) {
      const fields = mapFieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) {
        setGeneral(err.message || (isRtl ? 'رمز التحقق غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired verification code.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleCredential = async (idToken) => {
    setBusy(true);
    setErrors({});
    setGeneral('');
    try {
      await googleLogin(idToken);
      toast.success(isRtl ? 'تم تسجيل الدخول عبر Google بنجاح!' : 'Signed in with Google successfully!');
      navigate(from, { replace: true });
    } catch (err) {
      setGeneral(err.message || (isRtl ? 'فشل تسجيل الدخول عبر Google.' : 'Google Sign-In failed.'));
    } finally {
      setBusy(false);
    }
  };

  const submitPasswordLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setGeneral('');
    try {
      const cleanIdentifier = normalizeDigits(pwForm.email).trim();
      await login({ email: cleanIdentifier, password: pwForm.password });
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
        <div className="auth-brand">
          <Link to="/" title="Darcom Home" className="auth-brand-link">
            <img src="/logo-dark.png" alt="Darcom Real Estate" className="auth-logo" />
          </Link>
        </div>

        <div className="auth-header">
          <h1 className="font-display auth-title">
            {authMode === 'password'
              ? (isRtl ? 'دخول الإدارة والوسطاء' : 'Admin & Broker Sign In')
              : t('auth.loginTitle', isRtl ? 'تسجيل الدخول إلى داركم' : 'Sign In to Darcom')}
          </h1>
          <p className="auth-subtitle">
            {authMode === 'password'
              ? (isRtl ? 'استخدم بيانات الحساب وكلمة المرور الخاصة بك.' : 'Enter your account credentials and password.')
              : (isRtl ? 'سجّل الدخول بسرعة وأمان عبر Google أو رمز التحقق على بريدك الإلكتروني.' : 'Sign in securely with Google or a one-time verification code sent to your email.')}
          </p>
        </div>

        {general && (
          <div className="alert alert-danger auth-alert" role="alert">
            <i className="bi bi-exclamation-octagon-fill me-2"></i>
            <span>{general}</span>
          </div>
        )}

        {authMode === 'otp' ? (
          <>
            {/* Google Sign-In */}
            <GoogleSignInButton
              onSuccessToken={handleGoogleCredential}
              onError={(msg) => setGeneral(msg)}
              returnUrl={from}
              disabled={busy}
            />

            <div className="auth-divider">
              <span className="divider-text">
                {isRtl ? 'أو باستخدام البريد الإلكتروني (OTP)' : 'or via Email OTP'}
              </span>
            </div>

            {otpStep === 'email' ? (
              <form onSubmit={handleSendOtp} noValidate className="auth-form">
                <FormField
                  id="otp-email"
                  label={isRtl ? 'البريد الإلكتروني (يفضل Gmail)' : 'Email Address (Gmail recommended)'}
                  required
                  error={errors.email}
                >
                  <div className="auth-input-wrapper">
                    <i className="bi bi-envelope auth-input-icon"></i>
                    <input
                      id="otp-email"
                      type="email"
                      autoComplete="email"
                      dir="ltr"
                      placeholder="name@gmail.com"
                      className={`form-control auth-input ${errors.email ? 'is-invalid' : ''}`}
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      required
                    />
                  </div>
                </FormField>

                <button type="submit" className="btn-auth-submit mt-2" disabled={busy}>
                  {busy ? (
                    <span className="btn-loading-flex">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>{isRtl ? 'جارٍ الإرسال…' : 'Sending code…'}</span>
                    </span>
                  ) : (
                    <span className="btn-label-flex">
                      <span>{isRtl ? 'إرسال رمز التحقق' : 'Send Verification Code'}</span>
                      <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
                    </span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} noValidate className="auth-form">
                <div className="otp-target-banner mb-3">
                  <div>
                    <small className="text-muted d-block">
                      {isRtl ? 'تم إرسال الرمز إلى:' : 'Code sent to:'}
                    </small>
                    <strong dir="ltr">{otpEmail}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={() => {
                      setOtpStep('email');
                      setOtpCode('');
                      setDebugOtp('');
                      setErrors({});
                      setGeneral('');
                    }}
                  >
                    {isRtl ? 'تغيير البريد' : 'Change'}
                  </button>
                </div>

                {debugOtp && (
                  <div className="alert alert-info py-2 px-3 small mb-3" role="status">
                    <i className="bi bi-code-square me-1"></i>
                    <span>{isRtl ? 'رمز التطوير (Dev Mode):' : 'Dev Verification Code:'} </span>
                    <strong dir="ltr" className="ms-1">{debugOtp}</strong>
                  </div>
                )}

                <FormField
                  id="otp-code"
                  label={isRtl ? 'رمز التحقق (6 أرقام)' : '6-Digit Verification Code'}
                  required
                  error={errors.code}
                >
                  <div className="auth-input-wrapper">
                    <i className="bi bi-shield-check auth-input-icon"></i>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      dir="ltr"
                      placeholder="123456"
                      className={`form-control auth-input otp-code-input ${errors.code ? 'is-invalid' : ''}`}
                      value={otpCode}
                      onChange={(e) => setOtpCode(normalizeDigits(e.target.value))}
                      autoFocus
                      required
                    />
                  </div>
                </FormField>

                <FormField
                  id="otp-fullname"
                  label={isRtl ? 'الاسم الكامل (اختياري للحسابات الجديدة)' : 'Full Name (optional for new accounts)'}
                  error={errors.fullName}
                >
                  <div className="auth-input-wrapper">
                    <i className="bi bi-person auth-input-icon"></i>
                    <input
                      id="otp-fullname"
                      type="text"
                      autoComplete="name"
                      placeholder={isRtl ? 'الاسم الكامل' : 'Your full name'}
                      className={`form-control auth-input ${errors.fullName ? 'is-invalid' : ''}`}
                      value={otpFullName}
                      onChange={(e) => setOtpFullName(e.target.value)}
                    />
                  </div>
                </FormField>

                <button type="submit" className="btn-auth-submit mt-2" disabled={busy}>
                  {busy ? (
                    <span className="btn-loading-flex">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>{isRtl ? 'جارٍ التحقق…' : 'Verifying…'}</span>
                    </span>
                  ) : (
                    <span className="btn-label-flex">
                      <span>{isRtl ? 'تحقق وسجّل الدخول' : 'Verify & Sign In'}</span>
                      <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
                    </span>
                  )}
                </button>

                <div className="otp-resend-row mt-3 text-center">
                  {countdown > 0 ? (
                    <span className="text-muted small">
                      {isRtl
                        ? `يمكنك إعادة إرسال الرمز خلال ${countdown} ثانية`
                        : `Resend available in ${countdown}s`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 fw-semibold"
                      onClick={handleSendOtp}
                      disabled={busy}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      {isRtl ? 'إعادة إرسال رمز التحقق' : 'Resend verification code'}
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link btn-sm text-muted text-decoration-none"
                onClick={() => {
                  setAuthMode('password');
                  setErrors({});
                  setGeneral('');
                }}
              >
                <i className="bi bi-key me-1"></i>
                {isRtl ? 'دخول الإدارة أو الوسيط بكلمة المرور' : 'Admin / Broker password login'}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submitPasswordLogin} noValidate className="auth-form">
            <FormField
              id="login-email"
              label={t('auth.emailLabel', isRtl ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone')}
              required
              error={errors.email}
            >
              <div className="auth-input-wrapper">
                <i className="bi bi-envelope auth-input-icon"></i>
                <input
                  id="login-email"
                  type="text"
                  autoComplete="email"
                  dir="ltr"
                  placeholder={t('auth.emailPlaceholder', 'admin@darcom.local')}
                  className={`form-control auth-input ${errors.email ? 'is-invalid' : ''}`}
                  value={pwForm.email}
                  onChange={(e) => setPwForm((f) => ({ ...f, email: normalizeDigits(e.target.value) }))}
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
                  value={pwForm.password}
                  onChange={(e) => setPwForm((f) => ({ ...f, password: e.target.value }))}
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

            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none"
                onClick={() => {
                  setAuthMode('otp');
                  setErrors({});
                  setGeneral('');
                }}
              >
                <i className="bi bi-envelope-check me-1"></i>
                {isRtl ? 'العودة للدخول عبر Google أو رمز البريد (OTP)' : 'Back to Google / Email OTP login'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-divider">
          <span className="divider-text">{isRtl ? 'وسيط عقاري؟' : 'Real Estate Broker?'}</span>
        </div>

        <div className="auth-footer-prompt">
          <span className="prompt-label">{isRtl ? 'سجّل كوسيط عقاري معتمد في الساحل الشمالي' : 'Join as a verified North Coast broker'}</span>
          <Link to="/register" className="btn-auth-create">
            <span>{t('auth.createAccountLink', isRtl ? 'تسجيل حساب / وسيط جديد' : 'Create Account / Broker')}</span>
            <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
          </Link>
        </div>
      </div>
    </main>
  );
}
