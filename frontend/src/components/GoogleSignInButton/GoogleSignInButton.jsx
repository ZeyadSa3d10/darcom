import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { authService } from '../../services/authService.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import './GoogleSignInButton.css';

let gsiScriptPromise = null;

function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);

  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[data-darcom-gsi="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(!!window.google?.accounts?.id));
        existing.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.darcomGsi = 'true';
      script.onload = () => resolve(!!window.google?.accounts?.id);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  return gsiScriptPromise;
}

export default function GoogleSignInButton({
  onSuccessToken,
  onError,
  returnUrl = '/',
  disabled = false,
}) {
  const { isRtl } = useSettings();
  const btnContainerRef = useRef(null);
  const callbackRef = useRef(onSuccessToken);
  const [authConfig, setAuthConfig] = useState(() => ({
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    googleRedirectEnabled: false,
    loaded: false,
  }));
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    callbackRef.current = onSuccessToken;
  }, [onSuccessToken]);

  useEffect(() => {
    let active = true;
    authService
      .getConfig()
      .then((res) => {
        if (!active) return;
        const data = res?.data;
        setAuthConfig({
          googleClientId: data?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          googleRedirectEnabled: !!data?.googleRedirectEnabled,
          loaded: true,
        });
      })
      .catch(() => {
        if (active) {
          setAuthConfig((prev) => ({ ...prev, loaded: true }));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Only load Google GIS client-side button if redirect flow isn't preferred/configured
  useEffect(() => {
    if (!authConfig.loaded || authConfig.googleRedirectEnabled || !authConfig.googleClientId) return;
    let active = true;

    loadGoogleIdentityScript().then((loaded) => {
      if (!active || !loaded || !btnContainerRef.current || !window.google?.accounts?.id) return;

      try {
        window.google.accounts.id.initialize({
          client_id: authConfig.googleClientId,
          callback: (response) => {
            if (response?.credential) {
              callbackRef.current?.(response.credential);
            } else {
              onError?.(isRtl ? 'لم يتم استلام رمز المصادقة من Google.' : 'No Google credential received.');
            }
          },
        });

        btnContainerRef.current.innerHTML = '';
        const containerWidth = Math.min(390, Math.max(260, btnContainerRef.current.offsetWidth || 360));
        window.google.accounts.id.renderButton(btnContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          locale: isRtl ? 'ar' : 'en',
          width: containerWidth,
        });
        setSdkReady(true);
      } catch {
        setSdkReady(false);
      }
    });

    return () => {
      active = false;
    };
  }, [authConfig, isRtl, onError]);

  if (!authConfig.loaded) {
    return null;
  }

  const startRedirectFlow = () => {
    const base = (api.defaults.baseURL || '/api').replace(/\/$/, '');
    const safeReturn = typeof returnUrl === 'string' && returnUrl.startsWith('/') ? returnUrl : '/';
    window.location.href = `${base}/auth/google/login?returnUrl=${encodeURIComponent(safeReturn)}`;
  };

  // Prefer OAuth 2.0 Authorization Code Redirect Flow when ClientSecret is configured
  const showDirectGsi = !authConfig.googleRedirectEnabled && !!authConfig.googleClientId;

  return (
    <div className={`google-auth-wrap ${disabled ? 'is-disabled' : ''}`}>
      {showDirectGsi && <div ref={btnContainerRef} className="google-gsi-slot" />}

      {(!showDirectGsi || !sdkReady) && (
        <button
          type="button"
          className="btn-google-fallback"
          disabled={disabled}
          onClick={() => {
            if (authConfig.googleRedirectEnabled) {
              startRedirectFlow();
            } else if (!authConfig.googleClientId) {
              onError?.(
                isRtl
                  ? 'تسجيل الدخول عبر Google غير مفعّل بعد على هذا الخادم (يرجى إضافة GoogleAuth:ClientId وClientSecret).'
                  : 'Google Sign-In is not configured yet (GoogleAuth:ClientId / ClientSecret missing).'
              );
            } else {
              onError?.(
                isRtl
                  ? 'تعذر تحميل خدمة Google Sign-In. يرجى التحقق من الاتصال بالإنترنت.'
                  : 'Could not load Google Sign-In service. Please check your connection.'
              );
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
            <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
          </svg>
          <span>{isRtl ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
        </button>
      )}
    </div>
  );
}
