import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomeSelector.css';

export default function WelcomeSelector({ onSelect }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem('darcom-mode-selected');
  }, []);

  const particles = Array.from({ length: 22 }, (_, i) => i);

  function handleSelect(type) {
    if (selected) return;
    setSelected(type);
    setTimeout(() => setExiting(true), 350);
    setTimeout(() => {
      sessionStorage.setItem('darcom-mode-selected', type);
      onSelect?.();
      navigate(type === 'rent' ? '/rent' : '/');
    }, 900);
  }

  return (
    <div className={`ws-root${exiting ? ' ws-exit' : ''}`} dir="rtl">
      <div className="ws-particles" aria-hidden="true">
        {particles.map((p) => (
          <span key={p} className={`ws-particle ws-p${p}`} />
        ))}
      </div>

      <div className="ws-blob ws-blob-1" aria-hidden="true" />
      <div className="ws-blob ws-blob-2" aria-hidden="true" />
      <div className="ws-blob ws-blob-3" aria-hidden="true" />

      <header className="ws-header">
        <div className="ws-logo-wrap">
          <img src="/logo-white.png" alt="Darcom" className="ws-logo" />
        </div>
        <h1 className="ws-headline">اهلاً بك في Darcom</h1>
        <p className="ws-subtitle">اختر ما يناسبك للبدء</p>
      </header>

      <main className="ws-cards">
        <button
          id="ws-btn-rent"
          className={['ws-card ws-card-rent', hovered === 'rent' ? 'ws-card-hovered' : '', selected === 'rent' ? 'ws-card-selected' : '', selected && selected !== 'rent' ? 'ws-card-dimmed' : ''].join(' ')}
          onMouseEnter={() => setHovered('rent')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => handleSelect('rent')}
          aria-label="اختر الايجار"
        >
          <div className="ws-card-glow" aria-hidden="true" />
          <div className="ws-card-shimmer" aria-hidden="true" />
          <div className="ws-card-icon-wrap" aria-hidden="true">
            <svg className="ws-card-icon" viewBox="0 0 64 64" fill="none">
              <path d="M32 8L6 28h6v26h16V38h8v16h16V28h6L32 8z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
              <circle cx="32" cy="30" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M32 34v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="ws-card-text">
            <span className="ws-card-label-ar">إيجار</span>
            <span className="ws-card-label-en">Rent</span>
            <p className="ws-card-desc">تصفح الوحدات المتاحة للايجار واعثر على منزل احلامك</p>
          </div>
          <div className="ws-card-cta" aria-hidden="true">
            <span>اختر الان</span>
            <svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </button>

        <div className="ws-divider" aria-hidden="true">
          <span className="ws-div-line" />
          <span className="ws-div-or">او</span>
          <span className="ws-div-line" />
        </div>

        <button
          id="ws-btn-sale"
          className={['ws-card ws-card-sale', hovered === 'sale' ? 'ws-card-hovered' : '', selected === 'sale' ? 'ws-card-selected' : '', selected && selected !== 'sale' ? 'ws-card-dimmed' : ''].join(' ')}
          onMouseEnter={() => setHovered('sale')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => handleSelect('sale')}
          aria-label="اختر البيع والشراء"
        >
          <div className="ws-card-glow" aria-hidden="true" />
          <div className="ws-card-shimmer" aria-hidden="true" />
          <div className="ws-card-icon-wrap" aria-hidden="true">
            <svg className="ws-card-icon" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="24" width="20" height="32" rx="2" stroke="currentColor" strokeWidth="2.5"/>
              <rect x="36" y="12" width="20" height="44" rx="2" stroke="currentColor" strokeWidth="2.5"/>
              <path d="M12 32h4M12 38h4M12 44h4M40 20h4M40 28h4M40 36h4M40 44h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="ws-card-text">
            <span className="ws-card-label-ar">بيع وشراء</span>
            <span className="ws-card-label-en">Buy and Sell</span>
            <p className="ws-card-desc">استعرض العقارات المعروضة للبيع واستثمر في مستقبلك</p>
          </div>
          <div className="ws-card-cta" aria-hidden="true">
            <span>اختر الان</span>
            <svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </button>
      </main>

      <button
        id="ws-btn-skip"
        className="ws-skip"
        onClick={() => {
          sessionStorage.setItem('darcom-mode-selected', 'sale');
          onSelect?.();
          navigate('/');
        }}
      >
        تخطي واستعرض كل العقارات
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
