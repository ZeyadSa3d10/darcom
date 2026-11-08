import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { authService } from '../../services/authService.js';
import './Register.css';

export default function Register() {
  const { t, isRtl } = useSettings();
  useSeo({ title: `${t('auth.registerTitle', 'إنشاء حساب جديد')} | Darcom` });

  const { register, registerBroker } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Mode: 'user' or 'broker'
  const [accountType, setAccountType] = useState('user');

  // Normal User Form
  const [userForm, setUserForm] = useState({ fullName: '', email: '', password: '', phoneNumber: '' });

  // Broker Form
  const [brokerForm, setBrokerForm] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    otpCode: '',
    agencyName: '',
    idCardFrontBase64: '',
    idCardBackBase64: '',
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [debugOtpCode, setDebugOtpCode] = useState('');

  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submittedBrokerSuccess, setSubmittedBrokerSuccess] = useState(false);

  const setUserField = (key) => (e) => setUserForm((f) => ({ ...f, [key]: e.target.value }));
  const setBrokerField = (key) => (e) => setBrokerForm((f) => ({ ...f, [key]: e.target.value }));

  // Image upload helper to base64
  const handleImageUpload = (side) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(isRtl ? 'يرجى اختيار ملف صورة صالح (JPG أو PNG).' : 'Please choose a valid image file.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الصورة يجب ألا يتجاوز 8 ميجابايت.' : 'Image size cannot exceed 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBrokerForm((prev) => ({
        ...prev,
        [side === 'front' ? 'idCardFrontBase64' : 'idCardBackBase64']: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (side) => () => {
    setBrokerForm((prev) => ({
      ...prev,
      [side === 'front' ? 'idCardFrontBase64' : 'idCardBackBase64']: '',
    }));
  };

  // OTP handlers
  const handleSendOtp = async () => {
    if (!brokerForm.phoneNumber.trim()) {
      toast.error(isRtl ? 'يرجى إدخال رقم الهاتف أولاً.' : 'Please enter your phone number first.');
      return;
    }
    setOtpSending(true);
    setGeneral('');
    try {
      const res = await authService.sendOtp(brokerForm.phoneNumber.trim());
      setOtpSent(true);
      if (res.data?.debugCode) {
        setDebugOtpCode(res.data.debugCode);
      }
      toast.success(isRtl ? 'تم إرسال رمز التحقق عبر رسالة SMS.' : 'Verification code sent via SMS.');
    } catch (err) {
      setGeneral(err.message || (isRtl ? 'تعذر إرسال رمز التحقق. يرجى المحاولة لاحقاً.' : 'Failed to send OTP code.'));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!brokerForm.otpCode.trim()) {
      toast.error(isRtl ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام.' : 'Please enter the 6-digit code.');
      return;
    }
    setOtpVerifying(true);
    setGeneral('');
    try {
      await authService.verifyOtp(brokerForm.phoneNumber.trim(), brokerForm.otpCode.trim());
      setOtpVerified(true);
      toast.success(isRtl ? 'تم التحقق من رقم الهاتف بنجاح!' : 'Phone verified successfully!');
    } catch (err) {
      setGeneral(err.message || (isRtl ? 'رمز التحقق غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired OTP code.'));
    } finally {
      setOtpVerifying(false);
    }
  };

  // Submit User
  const submitUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setGeneral('');
    try {
      const payload = { ...userForm };
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

  // Submit Broker
  const submitBroker = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setGeneral('');

    if (!brokerForm.fullName.trim()) {
      setGeneral(isRtl ? 'يرجى إدخال الاسم الكامل للوسيط.' : 'Please enter full name.');
      setBusy(false);
      return;
    }

    if (!brokerForm.phoneNumber.trim()) {
      setGeneral(isRtl ? 'يرجى إدخال رقم الهاتف المحمول.' : 'Please enter phone number.');
      setBusy(false);
      return;
    }

    if (!otpVerified && !brokerForm.otpCode.trim()) {
      setGeneral(isRtl ? 'يرجى تأكيد رقم الهاتف عبر رمز التحقق (OTP) أولاً.' : 'Please verify your phone number via OTP.');
      setBusy(false);
      return;
    }

    if (!brokerForm.idCardFrontBase64) {
      setGeneral(isRtl ? 'يرجى رفع صورة الوجه الأمامي لبطاقة الرقم القومي.' : 'Please upload front ID card image.');
      setBusy(false);
      return;
    }

    try {
      await registerBroker({
        fullName: brokerForm.fullName.trim(),
        phoneNumber: brokerForm.phoneNumber.trim(),
        password: brokerForm.password,
        otpCode: brokerForm.otpCode.trim(),
        agencyName: brokerForm.agencyName?.trim() || brokerForm.fullName.trim(),
        idCardFrontBase64: brokerForm.idCardFrontBase64,
        idCardBackBase64: brokerForm.idCardBackBase64,
      });

      setSubmittedBrokerSuccess(true);
    } catch (err) {
      const fields = mapFieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) {
        setGeneral(err.message || (isRtl ? 'فشل إرسال طلب تسجيل البروكر.' : 'Broker registration failed.'));
      }
    } finally {
      setBusy(false);
    }
  };

  if (submittedBrokerSuccess) {
    return (
      <main id="main-content" className="container auth-page">
        <div className="auth-card broker-success-card text-center">
          <div className="broker-success-icon">
            <i className="bi bi-patch-check-fill"></i>
          </div>
          <h1 className="font-display auth-title mt-3">
            {isRtl ? 'تم استلام طلب تسجيلك كوسيط بنجاح!' : 'Broker Application Received!'}
          </h1>
          <p className="auth-subtitle mb-4">
            {isRtl
              ? 'شكراً لانضمامك إلى شبكة وسطاء داركم في الساحل الشمالي. طلبك قيد المراجعة والتحقق الأمني من الإدارة، وسيقوم فريقنا بالتواصل معك هاتفياً وتفعيل حسابك خلال وقت قصير.'
              : 'Thank you for applying as a broker in North Coast. Your application is under review. Our team will contact you shortly to activate your account.'}
          </p>

          <div className="p-3 bg-light rounded-3 mb-4 text-start border">
            <div className="d-flex align-items-center mb-2">
              <i className="bi bi-person-check text-primary me-2"></i>
              <strong>{isRtl ? 'الاسم:' : 'Name:'}</strong>
              <span className="ms-2">{brokerForm.fullName}</span>
            </div>
            <div className="d-flex align-items-center">
              <i className="bi bi-telephone text-primary me-2"></i>
              <strong>{isRtl ? 'الهاتف:' : 'Phone:'}</strong>
              <span className="ms-2" dir="ltr">{brokerForm.phoneNumber}</span>
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-center">
            <Link to="/" className="btn btn-primary px-4 py-2">
              <i className="bi bi-house me-2"></i>
              {isRtl ? 'العودة للرئيسية' : 'Return Home'}
            </Link>
            <Link to="/login" className="btn btn-outline-secondary px-4 py-2">
              {isRtl ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
            {accountType === 'user'
              ? (isRtl ? 'تصفح وحدات الساحل الشمالي وحفظ العقارات المفضلة والتواصل مع المستشارين.' : 'Browse North Coast units, save favorites and connect with consultants.')
              : (isRtl ? 'انضم إلى شبكة وسطاء داركم لعرض وإدارة طلبات الشاليهات في الساحل الشمالي.' : 'Join Darcom North Coast broker network to submit and track chalet listings.')}
          </p>
        </div>

        {/* Account Type Selector Tabs */}
        <div className="account-type-tabs mb-4" role="tablist">
          <button
            type="button"
            className={`account-type-tab ${accountType === 'user' ? 'active' : ''}`}
            onClick={() => { setAccountType('user'); setGeneral(''); setErrors({}); }}
          >
            <i className="bi bi-person me-2"></i>
            {isRtl ? 'حساب عميل' : 'Customer Account'}
          </button>
          <button
            type="button"
            className={`account-type-tab ${accountType === 'broker' ? 'active' : ''}`}
            onClick={() => { setAccountType('broker'); setGeneral(''); setErrors({}); }}
          >
            <i className="bi bi-briefcase me-2"></i>
            {isRtl ? 'وسيط عقاري (بروكر)' : 'Broker Account'}
          </button>
        </div>

        {general && (
          <div className="alert alert-danger auth-alert" role="alert">
            <i className="bi bi-exclamation-octagon-fill me-2"></i>
            <span>{general}</span>
          </div>
        )}

        {accountType === 'user' ? (
          /* ================= NORMAL USER FORM ================= */
          <form onSubmit={submitUser} noValidate className="auth-form">
            {/* Full Name */}
            <FormField id="reg-name" label={t('auth.fullNameLabel', 'الاسم بالكامل')} required error={errors.fullName}>
              <div className="auth-input-wrapper">
                <i className="bi bi-person auth-input-icon"></i>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  placeholder={t('auth.fullNamePlaceholder', 'مثال: أحمد محمود')}
                  className={`form-control auth-input ${errors.fullName ? 'is-invalid' : ''}`}
                  value={userForm.fullName}
                  onChange={setUserField('fullName')}
                  required
                />
              </div>
            </FormField>

            {/* Email */}
            <FormField id="reg-email" label={t('auth.emailLabel', 'البريد الإلكتروني')} required error={errors.email}>
              <div className="auth-input-wrapper">
                <i className="bi bi-envelope auth-input-icon"></i>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  placeholder={t('auth.emailPlaceholder', 'name@example.com')}
                  className={`form-control auth-input ${errors.email ? 'is-invalid' : ''}`}
                  value={userForm.email}
                  onChange={setUserField('email')}
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
              hint={t('auth.passwordHint', '6 أحرف على الأقل.')}
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
                  value={userForm.password}
                  onChange={setUserField('password')}
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
            <FormField id="reg-phone" label={t('auth.phoneLabel', 'رقم الهاتف (اختياري)')} error={errors.phoneNumber}>
              <div className="auth-input-wrapper">
                <i className="bi bi-telephone auth-input-icon"></i>
                <input
                  id="reg-phone"
                  type="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder={t('auth.phonePlaceholder', '+20 100 000 0000')}
                  className={`form-control auth-input ${errors.phoneNumber ? 'is-invalid' : ''}`}
                  value={userForm.phoneNumber}
                  onChange={setUserField('phoneNumber')}
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
        ) : (
          /* ================= BROKER REGISTRATION FORM ================= */
          <form onSubmit={submitBroker} noValidate className="auth-form broker-form">
            {/* 1. Full Name */}
            <FormField id="broker-name" label={isRtl ? 'الاسم الكامل للوسيط' : 'Broker Full Name'} required error={errors.fullName}>
              <div className="auth-input-wrapper">
                <i className="bi bi-person auth-input-icon"></i>
                <input
                  id="broker-name"
                  type="text"
                  placeholder={isRtl ? 'مثال: محمد عبد الله' : 'e.g. Mohamed Abdallah'}
                  className={`form-control auth-input ${errors.fullName ? 'is-invalid' : ''}`}
                  value={brokerForm.fullName}
                  onChange={setBrokerField('fullName')}
                  required
                />
              </div>
            </FormField>

            {/* 2. Phone Number + OTP Send Button */}
            <FormField
              id="broker-phone"
              label={isRtl ? 'رقم الهاتف المحمول' : 'Mobile Phone Number'}
              required
              error={errors.phoneNumber}
              hint={isRtl ? 'سيتم إرسال رمز تحقق OTP للتأكد من ملكية الرقم.' : 'An OTP will be sent to verify your phone.'}
            >
              <div className="d-flex gap-2">
                <div className="auth-input-wrapper flex-grow-1">
                  <i className="bi bi-telephone auth-input-icon"></i>
                  <input
                    id="broker-phone"
                    type="tel"
                    dir="ltr"
                    placeholder="010XXXXXXXX"
                    className={`form-control auth-input ${errors.phoneNumber ? 'is-invalid' : ''}`}
                    value={brokerForm.phoneNumber}
                    onChange={(e) => {
                      setBrokerField('phoneNumber')(e);
                      setOtpSent(false);
                      setOtpVerified(false);
                    }}
                    disabled={otpVerified}
                    required
                  />
                </div>
                <button
                  type="button"
                  className={`btn ${otpVerified ? 'btn-success' : 'btn-outline-primary'} text-nowrap px-3`}
                  onClick={handleSendOtp}
                  disabled={otpSending || otpVerified || !brokerForm.phoneNumber.trim()}
                >
                  {otpVerified ? (
                    <><i className="bi bi-check-circle-fill me-1"></i> {isRtl ? 'تم التحقق' : 'Verified'}</>
                  ) : otpSending ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span> {isRtl ? 'إرسال…' : 'Sending…'}</>
                  ) : otpSent ? (
                    <><i className="bi bi-arrow-clockwise me-1"></i> {isRtl ? 'إعادة الإرسال' : 'Resend'}</>
                  ) : (
                    <><i className="bi bi-send me-1"></i> {isRtl ? 'إرسال الرمز' : 'Send Code'}</>
                  )}
                </button>
              </div>
            </FormField>

            {/* 3. OTP Code Input & Verify */}
            {otpSent && !otpVerified && (
              <div className="otp-verification-box p-3 rounded-3 mb-3 border bg-light">
                <label className="form-label text-sm fw-bold mb-1">
                  {isRtl ? 'أدخل رمز التحقق (OTP) المرسل لهاتفك' : 'Enter 6-digit OTP code'}
                </label>
                {debugOtpCode && (
                  <div className="badge bg-warning text-dark mb-2 d-block text-start">
                    {isRtl ? 'رمز الاختبار (وضع التطوير): ' : 'Test Code (Dev): '} <strong>{debugOtpCode}</strong>
                  </div>
                )}
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    dir="ltr"
                    placeholder="123456"
                    className="form-control text-center fw-bold fs-5 tracking-widest"
                    value={brokerForm.otpCode}
                    onChange={setBrokerField('otpCode')}
                  />
                  <button
                    type="button"
                    className="btn btn-primary text-nowrap px-3"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || !brokerForm.otpCode.trim()}
                  >
                    {otpVerifying ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      isRtl ? 'تأكيد الرمز' : 'Verify'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 4. National ID Card Images */}
            <div className="national-id-section mb-3">
              <label className="form-label fw-bold d-block mb-1">
                <i className="bi bi-card-heading me-1 text-primary"></i>
                {isRtl ? 'صورة بطاقة الرقم القومي (حفظ آمن وسري)' : 'National ID Card Images (Secure)'}
                <span className="text-danger ms-1">*</span>
              </label>
              <p className="text-muted text-xs mb-3">
                {isRtl
                  ? 'يتم تخزين صور الهوية بشكل خاص ومشفر، ولا تظهر للعامة إطلاقاً، وتستخدم فقط للتحقق من هوية الوسيط.'
                  : 'ID images are strictly confidential and stored privately for verification.'}
              </p>

              <div className="row g-2">
                {/* Front Side */}
                <div className="col-12 col-sm-6">
                  <div className="id-card-upload-box">
                    <span className="id-box-label">{isRtl ? 'الوجه الأمامي للبطاقة' : 'Front Side'}</span>
                    {brokerForm.idCardFrontBase64 ? (
                      <div className="id-preview-wrapper position-relative">
                        <img src={brokerForm.idCardFrontBase64} alt="ID Front" className="id-img-preview" />
                        <button
                          type="button"
                          className="btn btn-sm btn-danger remove-id-btn"
                          onClick={removeImage('front')}
                          title={isRtl ? 'حذف الصورة' : 'Remove image'}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ) : (
                      <label className="id-upload-label">
                        <i className="bi bi-cloud-arrow-up fs-2 text-primary"></i>
                        <span className="text-xs mt-1">{isRtl ? 'اضغط لرفع الوجه الأمامي' : 'Upload Front Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleImageUpload('front')}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Back Side */}
                <div className="col-12 col-sm-6">
                  <div className="id-card-upload-box">
                    <span className="id-box-label">{isRtl ? 'الوجه الخلفي للبطاقة' : 'Back Side'}</span>
                    {brokerForm.idCardBackBase64 ? (
                      <div className="id-preview-wrapper position-relative">
                        <img src={brokerForm.idCardBackBase64} alt="ID Back" className="id-img-preview" />
                        <button
                          type="button"
                          className="btn btn-sm btn-danger remove-id-btn"
                          onClick={removeImage('back')}
                          title={isRtl ? 'حذف الصورة' : 'Remove image'}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ) : (
                      <label className="id-upload-label">
                        <i className="bi bi-cloud-arrow-up fs-2 text-primary"></i>
                        <span className="text-xs mt-1">{isRtl ? 'اضغط لرفع الوجه الخلفي' : 'Upload Back Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleImageUpload('back')}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Agency Name */}
            <FormField id="broker-agency" label={isRtl ? 'اسم المكتب أو الشركة العقارية (اختياري)' : 'Agency Name (Optional)'}>
              <div className="auth-input-wrapper">
                <i className="bi bi-building auth-input-icon"></i>
                <input
                  id="broker-agency"
                  type="text"
                  placeholder={isRtl ? 'مثال: عقارات الساحل' : 'e.g. Coast Real Estate'}
                  className="form-control auth-input"
                  value={brokerForm.agencyName}
                  onChange={setBrokerField('agencyName')}
                />
              </div>
            </FormField>

            {/* 5. Password */}
            <FormField
              id="broker-password"
              label={t('auth.passwordLabel', 'كلمة المرور')}
              required
              error={errors.password}
              hint={isRtl ? '6 أحرف على الأقل.' : 'At least 6 characters.'}
            >
              <div className="auth-input-wrapper">
                <i className="bi bi-shield-lock auth-input-icon"></i>
                <input
                  id="broker-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  dir="ltr"
                  placeholder="••••••••"
                  className={`form-control auth-input ${errors.password ? 'is-invalid' : ''}`}
                  value={brokerForm.password}
                  onChange={setBrokerField('password')}
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

            {/* Submit Button */}
            <button type="submit" className="btn-auth-submit mt-3" disabled={busy}>
              {busy ? (
                <span className="btn-loading-flex">
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  <span>{isRtl ? 'جارٍ إرسال طلب الانضمام…' : 'Submitting Application…'}</span>
                </span>
              ) : (
                <span className="btn-label-flex">
                  <span>{isRtl ? 'تقديم طلب التسجيل كوسيط' : 'Submit Broker Application'}</span>
                  <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
                </span>
              )}
            </button>
          </form>
        )}

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
