import { useCallback, useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Thumbs } from 'swiper/modules';
import 'swiper/css';
import './PropertyGallery.css';

const CURATED_GALLERY_SETS = {
  villa: [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1400&q=85',
  ],
  chalet: [
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85',
  ],
  penthouse: [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1400&q=85',
  ],
  apartment: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=85',
  ],
  townhouse: [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85',
  ],
  duplex: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1400&q=85',
  ],
};

export default function PropertyGallery({ images = [], videos = [], title = '', propertyType = 'villa' }) {
  const [mainSwiper, setMainSwiper] = useState(null);
  const [thumbs, setThumbs] = useState(null);
  const [lightbox, setLightbox] = useState(-1);
  const [activeIndex, setActiveIndex] = useState(0);

  // Normalize property type key
  const typeKey = (propertyType || 'villa').toLowerCase().replace(/\s+/g, '-');
  const curatedSet = CURATED_GALLERY_SETS[typeKey] || CURATED_GALLERY_SETS.villa;

  // Check if original images are empty or contain picsum placeholders
  const isPicsumOrEmpty = !images.length || images.some((img) => img.url && img.url.includes('picsum.photos'));

  // Build resolved slide items
  let resolvedImages = [];
  if (isPicsumOrEmpty) {
    resolvedImages = curatedSet.map((url, idx) => ({
      kind: 'image',
      url,
      alt: `${title} — view ${idx + 1}`,
    }));
  } else {
    resolvedImages = images.map((i) => ({
      kind: 'image',
      url: i.url,
      alt: i.altText || title,
    }));
  }

  const slides = [
    ...resolvedImages,
    ...videos.map((v) => ({ kind: 'video', url: v.url, alt: v.altText || `${title} — video` })),
  ];

  const poster = slides[0]?.url;

  const close = useCallback(() => setLightbox(-1), []);
  const step = useCallback(
    (d) => setLightbox((i) => (i + d + slides.length) % slides.length),
    [slides.length]
  );

  useEffect(() => {
    if (lightbox < 0) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, close, step]);

  if (!slides.length) return null;

  return (
    <div className="gallery-wrapper">
      {/* Main Feature Gallery */}
      <div className="gallery-main-container">
        <Swiper
          modules={[Keyboard, Thumbs]}
          keyboard={{ enabled: true }}
          thumbs={{ swiper: thumbs && !thumbs.destroyed ? thumbs : null }}
          onSwiper={setMainSwiper}
          onSlideChange={(s) => setActiveIndex(s.activeIndex)}
          className="gallery-main"
        >
          {slides.map((s, i) => (
            <SwiperSlide key={i}>
              {s.kind === 'image' ? (
                <button
                  type="button"
                  className="slide-btn"
                  onClick={() => setLightbox(i)}
                  aria-label={`Open photo ${i + 1} fullscreen`}
                >
                  <img
                    src={s.url}
                    alt={s.alt}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchpriority={i === 0 ? 'high' : undefined}
                  />
                  <div className="gallery-slide-overlay"></div>
                </button>
              ) : (
                <video src={s.url} poster={poster} controls preload="none" aria-label={s.alt} />
              )}
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Floating Desktop Prev/Next Buttons */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow-btn prev-btn"
              onClick={() => mainSwiper?.slidePrev()}
              aria-label="Previous photo"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <button
              type="button"
              className="gallery-arrow-btn next-btn"
              onClick={() => mainSwiper?.slideNext()}
              aria-label="Next photo"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </>
        )}

        {/* Gallery Status Badges */}
        <div className="gallery-overlay-badges">
          <span className="gallery-badge-counter">
            <i className="bi bi-camera-fill me-1"></i>
            <span>{activeIndex + 1} / {slides.length}</span>
          </span>

          <button
            type="button"
            className="gallery-badge-fullscreen"
            onClick={() => setLightbox(activeIndex)}
            title="Expand Fullscreen"
          >
            <i className="bi bi-arrows-fullscreen me-1"></i>
            <span>View All ({slides.length})</span>
          </button>
        </div>
      </div>

      {/* Thumbnail Carousel */}
      {slides.length > 1 && (
        <Swiper
          modules={[Thumbs]}
          onSwiper={setThumbs}
          watchSlidesProgress
          slidesPerView={4}
          spaceBetween={10}
          breakpoints={{
            576: { slidesPerView: 5, spaceBetween: 12 },
            768: { slidesPerView: 6, spaceBetween: 14 },
          }}
          className="gallery-thumbs"
        >
          {slides.map((s, i) => (
            <SwiperSlide key={i} className={i === activeIndex ? 'active-thumb' : ''}>
              {s.kind === 'image' ? (
                <img src={s.url} alt="" loading="lazy" aria-hidden="true" />
              ) : (
                <span className="thumb-video" aria-hidden="true">
                  <i className="bi bi-play-circle-fill"></i>
                </span>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {/* Luxury Fullscreen Lightbox Modal */}
      {lightbox >= 0 && (
        <div className="lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Media viewer" onClick={close}>
          <button type="button" className="lb-close" onClick={close} aria-label="Close viewer">
            <i className="bi bi-x-lg"></i>
          </button>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                className="lb-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous photo"
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <button
                type="button"
                className="lb-next"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next photo"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </>
          )}

          <div className="lb-stage" onClick={(e) => e.stopPropagation()}>
            {slides[lightbox].kind === 'image' ? (
              <img src={slides[lightbox].url} alt={slides[lightbox].alt} />
            ) : (
              <video src={slides[lightbox].url} poster={poster} controls autoPlay />
            )}
            <div className="lb-footer-info">
              <span className="lb-title">{title}</span>
              <span className="lb-count">{lightbox + 1} of {slides.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
