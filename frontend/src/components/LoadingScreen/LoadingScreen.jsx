import { useEffect, useState } from 'react';
import './LoadingScreen.css';

export default function LoadingScreen({ duration = 1100, onComplete }) {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hasInitialLoader, setHasInitialLoader] = useState(true);

  useEffect(() => {
    const initialEl = document.getElementById('initial-loader');
    if (initialEl) {
      // Smoothly fade out the instant HTML loader that has been animating since 0ms
      const timerFade = setTimeout(() => {
        initialEl.classList.add('fade-out');
      }, duration);

      const timerHide = setTimeout(() => {
        initialEl.remove();
        setHidden(true);
        onComplete?.();
      }, duration + 600);

      return () => {
        clearTimeout(timerFade);
        clearTimeout(timerHide);
      };
    } else {
      setHasInitialLoader(false);
      const timerFade = setTimeout(() => {
        setFading(true);
      }, duration);

      const timerHide = setTimeout(() => {
        setHidden(true);
        onComplete?.();
      }, duration + 600);

      return () => {
        clearTimeout(timerFade);
        clearTimeout(timerHide);
      };
    }
  }, [duration, onComplete]);

  if (hasInitialLoader || hidden) return null;

  return (
    <div
      className={`darcom-splash-loader ${fading ? 'fade-out' : ''}`}
      aria-label="Darcom Loading"
      role="status"
    >
      <div className="splash-ambient-mesh" aria-hidden="true"></div>

      <div className="splash-spin-stage">
        {/* Glowing Orbital Ring */}
        <div className="splash-orbit-ring" aria-hidden="true"></div>
        <div className="splash-orbit-ring-outer" aria-hidden="true"></div>

        {/* 3D Rotating Logo */}
        <div className="splash-logo-wrap">
          <img
            src="/logo-white.png"
            alt="Darcom Logo"
            className="splash-logo-img"
          />
        </div>
      </div>
    </div>
  );
}
