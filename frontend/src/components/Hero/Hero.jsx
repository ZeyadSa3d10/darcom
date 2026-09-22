import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import './Hero.css';

const HERO_SLIDE_CONFIGS = [
  {
    id: 1,
    key: 'sokhna',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1920&q=80',
    fallback: 'https://picsum.photos/seed/darcom-sokhna/1920/1080',
    defaultKicker: 'Ain Sokhna · Red Sea',
    defaultBadge: 'Porto Sokhna & Galala',
    defaultTagline: 'Waterfront chalets with private beach access & year-round sun',
    tint: '20, 110, 120',
  },
  {
    id: 2,
    key: 'sahel',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80',
    fallback: 'https://picsum.photos/seed/darcom-sahel/1920/1080',
    defaultKicker: 'North Coast · Mediterranean',
    defaultBadge: 'Ras El Hekma & Marassi',
    defaultTagline: 'Signature villas with private infinity pools & turquoise waters',
    tint: '18, 90, 145',
  },
  {
    id: 3,
    key: 'gouna',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80',
    fallback: 'https://picsum.photos/seed/darcom-gouna/1920/1080',
    defaultKicker: 'El Gouna · Red Sea Riviera',
    defaultBadge: 'Abu Tig Marina & Fanadir',
    defaultTagline: 'Lagoon-side residences with private yacht berths & resort lifestyle',
    tint: '15, 120, 110',
  },
  {
    id: 4,
    key: 'cairo',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80',
    fallback: 'https://picsum.photos/seed/darcom-cairo/1920/1080',
    defaultKicker: 'New Cairo · Prime Compounds',
    defaultBadge: 'Golden Square & Palm Hills',
    defaultTagline: 'Ultra-luxury sky penthouses with panoramic private rooftop terraces',
    tint: '120, 95, 40',
  },
];

const SLIDE_DURATION = 6500;

export default function Hero({ poster, title, subtitle, children }) {
  const { t, isRtl } = useSettings();
  const rotatingWords = t('hero.words', ['Home.', 'Sanctuary.', 'Paradise.', 'an Investment.']);
  const wordsArray = Array.isArray(rotatingWords) ? rotatingWords : ['Home.', 'Sanctuary.', 'Paradise.', 'an Investment.'];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordFading, setWordFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);
  const sectionRef = useRef(null);

  // Single orchestrated entrance: everything reveals together on first paint
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Rotate hero words every 3.2 seconds
  useEffect(() => {
    const wordInterval = setInterval(() => {
      setWordFading(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % wordsArray.length);
        setWordFading(false);
      }, 300);
    }, 3200);

    return () => clearInterval(wordInterval);
  }, [wordsArray.length]);

  // Slide autoplay every 6.5 seconds
  const nextSlide = useCallback(() => {
    setCurrentSlide((curr) => (curr + 1) % HERO_SLIDE_CONFIGS.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((curr) => (curr - 1 + HERO_SLIDE_CONFIGS.length) % HERO_SLIDE_CONFIGS.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(nextSlide, SLIDE_DURATION);
    return () => clearInterval(timerRef.current);
  }, [nextSlide, isPaused]);

  // Subtle cinematic parallax: background drifts opposite the cursor
  const handlePointerMove = useCallback((e) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: relX, y: relY });
  }, []);

  const resetTilt = useCallback(() => {
    setIsPaused(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  const getSlideTexts = (slide) => ({
    kicker: t(`hero.slides.${slide.key}Kicker`, slide.defaultKicker),
    badge: t(`hero.slides.${slide.key}Badge`, slide.defaultBadge),
    tagline: t(`hero.slides.${slide.key}Tagline`, slide.defaultTagline),
  });

  const activeSlideConfig = HERO_SLIDE_CONFIGS[currentSlide];
  const activeSlide = getSlideTexts(activeSlideConfig);

  return (
    <section
      ref={sectionRef}
      className="hero"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={resetTilt}
      onMouseMove={handlePointerMove}
      aria-label="Darcom Premier Properties"
    >
      {/* Background Slides with Ken Burns Zoom, Cross-fade & Parallax Drift */}
      <div
        className="hero-slides-track"
        aria-hidden="true"
        style={{
          transform: `translate3d(${tilt.x * -22}px, ${tilt.y * -14}px, 0) scale(1.035)`,
        }}
      >
        {HERO_SLIDE_CONFIGS.map((slide, index) => (
          <div
            key={slide.id}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ '--slide-tint': slide.tint }}
          >
            <img
              className="hero-slide-img"
              src={slide.image}
              alt=""
              onError={(e) => {
                // Graceful fallback if unsplash is unreachable
                if (e.target.src !== slide.fallback) {
                  e.target.src = slide.fallback;
                }
              }}
              fetchpriority={index === 0 ? 'high' : 'auto'}
            />
            <div className="hero-slide-gradient"></div>
          </div>
        ))}
      </div>

      {/* Ambient Vignette & Mesh Overlay */}
      <div className="hero-ambient-mesh" aria-hidden="true"></div>

      {/* Fine film-grain texture for a cinematic finish */}
      <div className="hero-grain" aria-hidden="true"></div>

      {/* Main Container Content */}
      <div className={`container hero-content ${mounted ? 'mounted' : ''}`}>
        {/* Floating Trust Pill */}
        <div className="hero-badges-row hero-fade-up" style={{ '--fade-delay': '0s' }}>
          <div className="hero-pill-badge">
            {/* <span className="badge-pulse-dot"></span> */}
            <i className="bi bi-shield-check me-1 text-gold"></i>
            <span>{t('hero.verifiedBadge', 'Verified Luxury Properties')}</span>
          </div>

          <div className="hero-slide-location-pill">
            <i className="bi bi-geo-alt-fill text-gold me-1"></i>
            <span>{activeSlide.badge}</span>
          </div>
        </div>

        {/* Dynamic Animated Headline */}
        <div className="hero-headline-wrap">
          <p className="hero-kicker hero-fade-up" style={{ '--fade-delay': '0.08s' }}>
            <span className="kicker-line"></span>
            {activeSlide.kicker}
          </p>
          <h1 className="font-display hero-title hero-fade-up" style={{ '--fade-delay': '0.16s' }}>
            {t('hero.titleStart', 'Find a Place Worth Calling ')}
            <span className={`hero-dynamic-word ${wordFading ? 'fading' : ''}`}>
              {wordsArray[wordIndex % wordsArray.length]}
            </span>
          </h1>
          <p className="hero-sub hero-fade-up" style={{ '--fade-delay': '0.24s' }}>
            {subtitle || activeSlide.tagline}
          </p>
        </div>



        {/* Search Bar Slot */}
        {children && (
          <div className="hero-search-wrapper hero-fade-up" style={{ '--fade-delay': '0.4s' }}>
            {children}
          </div>
        )}
      </div>

      {/* Bottom Floating Bar: Slide Indicators & Scroll Down */}
      <div className="hero-bottom-controls container">
        {/* Thumbnail Progress Indicators */}
        <div className="hero-progress-bars">
          {HERO_SLIDE_CONFIGS.map((slide, idx) => {
            const slideTexts = getSlideTexts(slide);
            return (
              <button
                key={slide.id}
                type="button"
                className={`hero-progress-tab ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}: ${slideTexts.kicker}`}
                style={{
                  '--tab-duration': idx === currentSlide && !isPaused ? `${SLIDE_DURATION}ms` : '0ms',
                }}
              >
                <span className="tab-thumb">
                  <svg className="tab-thumb-ring" viewBox="0 0 44 44" aria-hidden="true">
                    <circle className="tab-ring-track" cx="22" cy="22" r="19" />
                    <circle className="tab-ring-fill" cx="22" cy="22" r="19" />
                  </svg>
                  <img
                    className="tab-thumb-img"
                    src={slide.image}
                    alt=""
                    onError={(e) => {
                      if (e.target.src !== slide.fallback) {
                        e.target.src = slide.fallback;
                      }
                    }}
                  />
                </span>
                <span className="tab-meta">
                  <span className="progress-number">0{idx + 1}</span>
                  <span className="progress-label">{slideTexts.kicker.split('·')[0].trim()}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Arrow Navigation */}
        <div className="hero-nav-arrows">
          <button
            type="button"
            className="hero-arrow-btn"
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <i className={`bi ${isRtl ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
          </button>
          <button
            type="button"
            className="hero-arrow-btn"
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
          </button>
        </div>
      </div>
    </section>
  );
}