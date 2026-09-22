import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import './LanguageTransitionOverlay.css';

export default function LanguageTransitionOverlay() {
  const { isSwitchingLang, targetLang, lang } = useSettings();
  const [active, setActive] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let fadeTimer;
    let hideTimer;

    if (isSwitchingLang) {
      setActive(true);
      setFading(false);

      // Start fade-out slightly before unmounting
      fadeTimer = setTimeout(() => {
        setFading(true);
      }, 620);
    } else {
      // When context says done, fade out then hide
      setFading(true);
      hideTimer = setTimeout(() => {
        setActive(false);
        setFading(false);
      }, 280);
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [isSwitchingLang]);

  if (!active) return null;

  // Determine source and target for display
  const effectiveTarget = targetLang || (lang === 'ar' ? 'en' : 'ar');
  const isGoingToArabic = effectiveTarget === 'ar';

  const fromLabel = isGoingToArabic ? 'English' : 'العربية';
  const toLabel = isGoingToArabic ? 'العربية' : 'English';

  return (
    <div
      className={`darcom-lang-overlay ${fading ? 'fade-out' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={
        isGoingToArabic
          ? 'جاري تحويل لغة الموقع إلى العربية'
          : 'Switching site language to English'
      }
    >
      {/* Ambient background glow */}
      <div className="lang-ambient-mesh" aria-hidden="true" />

      {/* Floating Luxe Glass Card */}
      <div className="lang-modal-card">
        {/* 3D Rotating Logo with Orbital Rings */}
        <div className="lang-crest-wrap">
          <div className="lang-orbit-ring" aria-hidden="true" />
          <div className="lang-orbit-dashed" aria-hidden="true" />
          <div className="lang-logo-center">
            <img
              src="/logo-white.png"
              alt="Darcom Logo"
              className="lang-logo-img"
            />
          </div>
        </div>

        {/* Dynamic Transition Pills: [ Current ] ➔ [ Target ] */}
        <div className="lang-badge-track">
          <span className="lang-chip chip-from">{fromLabel}</span>
          <span className="lang-arrow-icon" aria-hidden="true">
            <i className="bi bi-arrow-right"></i>
          </span>
          <span className="lang-chip chip-to">{toLabel}</span>
        </div>

        {/* Informative Status Text */}
        <div className="lang-text-content">
          <h3 className="lang-process-title">
            {isGoingToArabic
              ? 'جاري تحويل الواجهة إلى العربية...'
              : 'Switching interface to English...'}
          </h3>
          <p className="lang-process-subtitle">
            {isGoingToArabic
              ? 'تجهيز التنسيقات والخطوط وتحديث المحتوى'
              : 'Updating layouts, typography, and listings'}
          </p>
        </div>

        {/* Smooth Glowing Progress Bar */}
        <div className="lang-progress-track">
          <div className="lang-progress-bar" />
        </div>
      </div>
    </div>
  );
}
