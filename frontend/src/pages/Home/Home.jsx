import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import Hero from '../../components/Hero/Hero.jsx';
import PropertyGrid from '../../components/PropertyGrid/PropertyGrid.jsx';
import PropertyCard from '../../components/PropertyCard/PropertyCard.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import { propertyService } from '../../services/propertyService.js';
import { locationService } from '../../services/locationService.js';
import { cmsService } from '../../services/cmsService.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useCmsSeo } from '../../hooks/useCmsSeo.js';
import { useRevealScope } from '../../hooks/useRevealScope.js';
import './Home.css';

// Self-hosted launch poster (public/images/hero-sokhna.svg).
// TODO(launch): replace SVGs under public/images with licensed WebP photos.
const HERO_POSTER = '/images/hero-sokhna.svg';

const TYPE_ICONS = {
  chalet: 'bi-water',
  apartment: 'bi-buildings',
  villa: 'bi-house-heart-fill',
  townhouse: 'bi-houses-fill',
  duplex: 'bi-layers-fill',
  penthouse: 'bi-building',
  studio: 'bi-box-seam',
  'twin-house': 'bi-houses',
  'standalone-villa': 'bi-house-add',
  commercial: 'bi-shop',
  land: 'bi-map',
};

const TYPE_METADATA = {
  chalet: {
    image: '/images/hero-sokhna.svg',
    fallback: '/images/property-fallback.svg',
    icon: 'bi-water',
    accentTag: 'Beachfront Living',
    accentTagAr: 'شواطئ خاصة',
    defaultTagline: 'Direct beachfront living & private coastal escapes',
    arTagline: 'إطلالات بحرية مباشرة وملاذات شاطئية خاصة',
  },
  villa: {
    image: '/images/hero-sahel.svg',
    fallback: '/images/property-fallback.svg',
    icon: 'bi-house-heart-fill',
    accentTag: 'Private Estates',
    accentTagAr: 'حمامات سباحة',
    defaultTagline: 'Private infinity pools & expansive estate grounds',
    arTagline: 'حمامات سباحة خاصة وحدائق واسعة راقية',
  },
  penthouse: {
    image: '/images/hero-cairo.svg',
    fallback: '/images/property-fallback.svg',
    icon: 'bi-building',
    accentTag: 'Sky Penthouses',
    accentTagAr: 'تراس وبانوراما',
    defaultTagline: 'Panoramic private rooftop sky terraces',
    arTagline: 'تراسات بانورامية وإطلالات سحابية واسعة',
  },
  townhouse: {
    image: '/images/hero-cairo.svg',
    fallback: '/images/property-fallback.svg',
    icon: 'bi-houses-fill',
    accentTag: 'Gated Compounds',
    accentTagAr: 'مجتمعات راقية',
    defaultTagline: 'Contemporary family residences in gated compounds',
    arTagline: 'خصوصية عائلية عصرية داخل أرقى الكمبوندات',
  },
  duplex: {
    image: '/images/hero-gouna.svg',
    fallback: '/images/property-fallback.svg',
    icon: 'bi-layers-fill',
    accentTag: 'Multi-level Space',
    accentTagAr: 'طابقان فخمان',
    defaultTagline: 'Two-level open-concept architectural residences',
    arTagline: 'طابقان بتصميم عصري وأسقف مرتفعة فخمة',
  },
  apartment: {
    image: '/images/hero-cairo.svg',
    fallback: '/images/property-fallback.svg',
    icon: 'bi-building-check',
    accentTag: 'Prime Addresses',
    accentTagAr: 'مواقع استراتيجية',
    defaultTagline: 'Serviced luxury homes & prime urban addresses',
    arTagline: 'شقق فندقية راقية بمواقع حيوية متميزة',
  },
  studio: {
    image: '/images/hero-gouna.svg',
    fallback: '/images/property-fallback.svg',
    icon: 'bi-box-seam',
    accentTag: 'Smart Investment',
    accentTagAr: 'عوائد استثمارية',
    defaultTagline: 'Smart luxury pieds-à-terre & high-yield retreats',
    arTagline: 'استوديوهات ذكية وعوائد استثمارية مرتفعة',
  },
};

const DEFAULT_ARCH_TYPES = [
  { name: 'Chalet', slug: 'chalet' },
  { name: 'Villa', slug: 'villa' },
  { name: 'Penthouse', slug: 'penthouse' },
  { name: 'Townhouse', slug: 'townhouse' },
  { name: 'Duplex', slug: 'duplex' },
  { name: 'Apartment', slug: 'apartment' },
  { name: 'Studio', slug: 'studio' },
];

const CITIES = [
  { name: 'Ain Sokhna', slug: 'ain-sokhna', blurb: 'Red Sea weekends, 1h from Cairo', img: '/images/hero-sokhna.svg' },
  { name: 'New Cairo', slug: 'new-cairo', blurb: 'Family living, schools & clubs', img: '/images/hero-cairo.svg' },
  { name: 'North Coast', slug: 'north-coast', blurb: 'Summer capital of the Med', img: '/images/hero-sahel.svg' },
  { name: 'Hurghada', slug: 'hurghada', blurb: 'Year-round sun & diving', img: '/images/hero-sokhna.svg' },
  { name: 'El Gouna', slug: 'el-gouna', blurb: 'Lagoon town, marina life', img: '/images/hero-gouna.svg' },
];

function SectionHead({ kicker, title, linkTo, linkLabel, isRtl }) {
  return (
    <div className="section-head">
      <div>
        {kicker && <p className="section-kicker">{kicker}</p>}
        <h2 className="font-display">{title}</h2>
      </div>
      {linkTo && (
        <Link to={linkTo} className="section-link">
          {linkLabel || 'View all'} <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-1`}></i>
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const { t, isRtl } = useSettings();
  const scopeRef = useRevealScope(':scope > section:not(.hero)');
  const cmsSeo = useCmsSeo('home');
  useSeo({
    title: cmsSeo?.title || 'Darcom — Find a Place Worth Calling Home',
    description: cmsSeo?.description || 'Chalets, villas and apartments across Ain Sokhna, New Cairo, North Coast, Hurghada and El Gouna. Verified listings, transparent prices.',
    image: cmsSeo?.image || HERO_POSTER,
  });
  const [featured, setFeatured] = useState([]);
  const [featuredState, setFeaturedState] = useState('loading');
  const [investment, setInvestment] = useState([]);
  const [investmentState, setInvestmentState] = useState('loading');
  const [types, setTypes] = useState([]);
  const [counts, setCounts] = useState({});

  // CMS dynamic content states with default fallbacks
  const [heroSlides, setHeroSlides] = useState(null);
  const [cities, setCities] = useState(CITIES);
  const [typesMeta, setTypesMeta] = useState(TYPE_METADATA);
  const [premiumContent, setPremiumContent] = useState(null);
  const [whyUsItems, setWhyUsItems] = useState(null);
  const [sellerContent, setSellerContent] = useState(null);

  const typesScrollRef = useRef(null);
  const scrollTypes = (offset) => {
    if (typesScrollRef.current) {
      typesScrollRef.current.scrollBy({ left: isRtl ? -offset : offset, behavior: 'smooth' });
    }
  };

  const displayTypes = types && types.length > 0
    ? types.filter((tItem) => (typesMeta[tItem.slug] || TYPE_METADATA[tItem.slug]))
    : DEFAULT_ARCH_TYPES;
  const renderedTypes = displayTypes.length > 0 ? displayTypes : DEFAULT_ARCH_TYPES;

  const loadFeatured = useCallback(async () => {
    setFeaturedState('loading');
    try {
      const res = await propertyService.featured(6);
      setFeatured(res.data ?? []);
      setFeaturedState('done');
    } catch (e) {
      setFeaturedState('error');
    }
  }, []);

  const loadInvestment = useCallback(async () => {
    setInvestmentState('loading');
    try {
      const res = await propertyService.list({ purpose: 'investment', pageSize: 4 });
      setInvestment(res.data?.data ?? []);
      setInvestmentState('done');
    } catch (e) {
      setInvestmentState('error');
    }
  }, []);

  useEffect(() => {
    loadFeatured();
    loadInvestment();
    locationService.getPropertyTypes().then((r) => setTypes(r.data ?? []));

    // Fetch CMS content for homepage
    cmsService.getAll().then((res) => {
      if (res?.data && Array.isArray(res.data)) {
        const map = {};
        for (const item of res.data) {
          try {
            map[item.contentKey] = JSON.parse(item.contentValue);
          } catch (_) {}
        }
        if (map['hero.slides'] && Array.isArray(map['hero.slides']) && map['hero.slides'].length > 0) {
          setHeroSlides(map['hero.slides']);
        }
        if (map['home.cities'] && Array.isArray(map['home.cities']) && map['home.cities'].length > 0) {
          setCities(map['home.cities']);
        }
        if (map['home.types'] && typeof map['home.types'] === 'object') {
          setTypesMeta((prev) => ({ ...prev, ...map['home.types'] }));
        }
        if (map['home.premium']) setPremiumContent(map['home.premium']);
        if (map['home.whyus'] && Array.isArray(map['home.whyus']) && map['home.whyus'].length > 0) {
          setWhyUsItems(map['home.whyus']);
        }
        if (map['home.seller']) setSellerContent(map['home.seller']);
      }
    }).catch(() => {});
  }, [loadFeatured, loadInvestment]);

  // Per-city counts (pageSize=1 keeps payloads tiny); tiles render regardless.
  useEffect(() => {
    cities.forEach(async (c) => {
      try {
        const res = await propertyService.list({ location: c.slug, page: 1, pageSize: 1 });
        setCounts((m) => ({ ...m, [c.slug]: res.data?.totalCount ?? null }));
      } catch {
        setCounts((m) => ({ ...m, [c.slug]: null }));
      }
    });
  }, [cities]);

  return (
    <main id="main-content" className="home" ref={scopeRef}>
      {/* 1 — HERO */}
      <Hero poster={HERO_POSTER} slides={heroSlides} />

      {/* 2 — FEATURED (card grid) */}
      <section className="container home-section" id="featured-properties">
        <SectionHead
          kicker={t('home.featuredKicker', 'Handpicked')}
          title={t('home.featuredTitle', 'Featured properties')}
          linkTo="/properties"
          linkLabel={t('home.browseAll', 'Browse all')}
          isRtl={isRtl}
        />
        {featuredState === 'error' ? (
          <ErrorState error={t('common.error', 'Could not load featured properties.')} onRetry={loadFeatured} />
        ) : (
          <PropertyGrid items={featured} loading={featuredState === 'loading'} />
        )}
      </section>

      {/* 3 — ARCHITECTURAL STYLES (Curated Showcase) */}
      <section className="home-architecture-section">
        <div className="container">
          <div className="architecture-header">
            <div className="architecture-title-group">
              <div className="architecture-kicker">

                <span>{t('home.typesKicker', 'Architectural Portfolio')}</span>
              </div>
              <h2 className="architecture-headline font-display">
                {t('home.typesTitle', 'Browse by Architectural Style')}
              </h2>
              <p className="architecture-sub">
                {t(
                  'home.typesSubtitle',
                  'Curated architectural typologies crafted for distinguished living across Egypt’s premier coasts and prime cities.'
                )}
              </p>
            </div>

            <div className="architecture-controls">
              <button
                type="button"
                className="arch-nav-arrow"
                onClick={() => scrollTypes(-340)}
                aria-label="Previous styles"
              >
                <i className={`bi ${isRtl ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
              </button>
              <button
                type="button"
                className="arch-nav-arrow"
                onClick={() => scrollTypes(340)}
                aria-label="Next styles"
              >
                <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
              </button>
              <Link to="/properties" className="btn-explore-all-arch">
                <span>{t('home.browseAll', 'View all')}</span>
                <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-1`}></i>
              </Link>
            </div>
          </div>

          <div className="architecture-track" ref={typesScrollRef}>
            {renderedTypes.map((tItem) => {
              const meta = typesMeta[tItem.slug] || TYPE_METADATA[tItem.slug] || {
                image: '/images/property-fallback.svg',
                fallback: '/images/property-fallback.svg',
                icon: 'bi-house',
                accentTag: 'Exclusive Living',
                accentTagAr: 'طراز حصري',
                defaultTagline: 'Curated architectural property portfolio',
                arTagline: 'تصميم معماري فاخر وتشطيبات راقية',
              };

              return (
                <Link
                  key={tItem.slug}
                  to={`/properties?type=${tItem.slug}`}
                  className="arch-card"
                >
                  <div className="arch-card-media">
                    <img
                      src={meta.image}
                      alt={t(`types.${tItem.slug}`, tItem.name)}
                      className="arch-card-img"
                      loading="lazy"
                      onError={(e) => {
                        if (meta.fallback && e.target.src !== meta.fallback) {
                          e.target.src = meta.fallback;
                        }
                      }}
                    />
                    <div className="arch-card-overlay"></div>
                  </div>

                  <div className="arch-card-top">
                    <div className="arch-icon-jewel">
                      <i className={`bi ${meta.icon || 'bi-house'}`}></i>
                    </div>
                    <span className="arch-accent-pill">
                      {isRtl ? (meta.accentTagAr || meta.accentTag) : meta.accentTag}
                    </span>
                  </div>

                  <div className="arch-card-content">
                    <h3 className="arch-card-title">
                      {t(`types.${tItem.slug}`, tItem.name)}
                    </h3>
                    <p className="arch-card-desc">
                      {isRtl ? (meta.arTagline || meta.defaultTagline) : (meta.defaultTagline || meta.tagline)}
                    </p>
                    <div className="arch-card-action">
                      <span>{t('home.exploreType', 'Explore residences')}</span>
                      <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} arch-arrow`}></i>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4 — LOCATIONS (image mosaic) */}
      <section className="container home-section">
        <SectionHead
          kicker={t('nav.topDestinations', 'Where to')}
          title={t('nav.popularDestinations', 'Popular locations')}
          linkTo="/properties"
          linkLabel={t('home.browseAll', 'Explore all')}
          isRtl={isRtl}
        />
        <div className="location-mosaic">
          {cities.map((c, i) => (
            <Link
              key={c.slug}
              to={`/properties?location=${c.slug}`}
              className={`location-tile ${i === 0 ? 'large' : ''}`}
            >
              <img src={c.img} alt={c.name} loading="lazy" />
              <span className="location-shade" aria-hidden="true"></span>
              <span className="location-meta">
                <strong>{t(`destinations.${c.slug}`, c.name)}</strong>
                <span>{c.blurb}</span>
                {counts[c.slug] != null && (
                  <em>{counts[c.slug]} {t('nav.properties', 'listings')}</em>
                )}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 5 — PREMIUM (dark split) */}
      <section className="premium-split">
        <div className="container premium-grid">
          <div className="premium-copy">
            <p className="section-kicker light">
              {isRtl ? (premiumContent?.kickerAr || premiumContent?.kicker || t('common.verified', 'Exclusive')) : (premiumContent?.kicker || t('common.verified', 'Exclusive'))}
            </p>
            <h2 className="font-display">
              {isRtl ? (premiumContent?.titleAr || premiumContent?.title || t('propertiesPage.kicker', 'The premium collection')) : (premiumContent?.title || t('propertiesPage.kicker', 'The premium collection'))}
            </h2>
            <p>
              {isRtl
                ? (premiumContent?.subtitleAr || premiumContent?.subtitle || premiumContent?.description || t('propertiesPage.subtitle', 'Sea-facing villas, private beaches and architect-designed penthouses — inspected, verified and presented with full documentation.'))
                : (premiumContent?.subtitle || premiumContent?.description || t('propertiesPage.subtitle', 'Sea-facing villas, private beaches and architect-designed penthouses — inspected, verified and presented with full documentation.'))}
            </p>
            <ul className="premium-points">
              {premiumContent?.points && Array.isArray(premiumContent.points) ? (
                premiumContent.points.map((pt, idx) => (
                  <li key={idx}>
                    <i className={`bi ${pt.icon || 'bi-patch-check'}`}></i>{' '}
                    {typeof pt === 'string' ? pt : (isRtl ? (pt.textAr || pt.text) : pt.text)}
                  </li>
                ))
              ) : (
                <>
                  <li><i className="bi bi-patch-check"></i> {t('detailsPage.trustDeed', 'Verified ownership & papers')}</li>
                  <li><i className="bi bi-camera-video"></i> {t('detailsPage.trustDirect', 'Direct developer terms')}</li>
                  <li><i className="bi bi-person-badge"></i> {t('detailsPage.advisorTitle', 'Dedicated senior advisor')}</li>
                </>
              )}
            </ul>
            <Link to="/properties?featured=true" className="btn btn-gold">
              {t('home.browseAll', 'View premium listings')} <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-1`}></i>
            </Link>
          </div>
          <div className="premium-media">
            <img src={premiumContent?.image || '/images/premium-villa.svg'} alt="Premium seaside villa" loading="lazy" />
          </div>
        </div>
      </section>

      {/* 6 — INVESTMENT (sticky text + horizontal snap) */}
      <section className="container home-section invest-layout">
        <div className="invest-copy">
          <p className="section-kicker">{t('purposes.investment', 'Numbers first')}</p>
          <h2 className="font-display">{t('purposes.investment', 'Investment opportunities')}</h2>
          <p>
            {t('propertiesPage.subtitle', 'Rental-pool chalets, high-occupancy villas and zoned land — each with the yield math spelled out before you visit.')}
          </p>
          <Link to="/properties?purpose=investment" className="section-link">
            {t('home.browseAll', 'All investments')} <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'}`}></i>
          </Link>
        </div>
        <div className="invest-rail">
          {investmentState === 'error' ? (
            <ErrorState error={t('common.error', 'Could not load investments.')} onRetry={loadInvestment} />
          ) : investmentState === 'loading' ? (
            <PropertyGrid loading items={[]} />
          ) : (
            investment.map((p) => <PropertyCard key={p.id} property={p} />)
          )}
        </div>
      </section>

      {/* 7 — WHY US (numbered editorial) */}
      <section className="home-band">
        <div className="container">
          <SectionHead kicker={t('home.whyKicker', 'Why Darcom')} title={t('home.whyTitle', 'Built for serious buyers')} />
          <ol className="why-list">
            {whyUsItems && whyUsItems.length > 0 ? (
              whyUsItems.map((item, idx) => (
                <li key={idx}>
                  <span className="why-num">{item.num || `0${idx + 1}`}</span>
                  <div>
                    <h3>{isRtl ? (item.titleAr || item.title) : item.title}</h3>
                    <p>{isRtl ? (item.descAr || item.description || item.desc) : (item.description || item.desc)}</p>
                  </div>
                </li>
              ))
            ) : (
              <>
                <li>
                  <span className="why-num">01</span>
                  <div>
                    <h3>{t('home.why1Title', 'Verified before published')}</h3>
                    <p>{t('home.why1Desc', 'Ownership, papers and availability are checked by our team. Rejected listings never go public.')}</p>
                  </div>
                </li>
                <li>
                  <span className="why-num">02</span>
                  <div>
                    <h3>{t('home.why2Title', 'One dedicated advisor')}</h3>
                    <p>{t('home.why2Desc', 'From initial search to contract signing and keys handover.')}</p>
                  </div>
                </li>
                <li>
                  <span className="why-num">03</span>
                  <div>
                    <h3>{t('home.why3Title', 'Direct developer terms')}</h3>
                    <p>{t('home.why3Desc', 'Exclusive payment schedules and official launch allocations.')}</p>
                  </div>
                </li>
              </>
            )}
          </ol>
        </div>
      </section>

      {/* 8 — LIFESTYLE (full-bleed break) */}


      {/* 9 — PRIVATE RESIDENCE SELLER ADVISORY (Elevated Quiet Luxury) */}
      <section className="home-estate-advisory">
        <div className="container">
          <div className="estate-advisory-frame">
            <div className="estate-header-wrap">
              <h2 className="estate-headline font-display">
                {sellerContent?.headline
                  ? (isRtl ? sellerContent.headline : (sellerContent.headlineEn || sellerContent.headline))
                  : t('home.sellTitle', 'هل تمتلك عقاراً فاخراً ترغب في بيعه بمصر؟')}
              </h2>

              <p className="estate-lead">
                {sellerContent?.lead
                  ? (isRtl ? sellerContent.lead : (sellerContent.leadEn || sellerContent.lead))
                  : t(
                      'home.sellDesc',
                      'نمنح عقارك الحضور الذي يستحقه أمام دائرة مغلقة من المستثمرين الجادين ونخبة المشترين، مع عناية استشارية متكاملة وفحص دقيق خلال 48 ساعة.'
                    )}
              </p>
            </div>

            {/* 3 Luxury Stat Pedestals */}
            <div className="estate-pedestals-grid">
              {sellerContent?.stats && Array.isArray(sellerContent.stats) && sellerContent.stats.length > 0 ? (
                sellerContent.stats.map((st, idx) => (
                  <div key={idx} className="estate-pedestal-card">
                    <div className="pedestal-icon-circle">
                      <i className={`bi ${st.icon || (idx === 0 ? 'bi-clock-history' : idx === 1 ? 'bi-patch-check' : 'bi-shield-check')}`}></i>
                    </div>
                    <div className="pedestal-body">
                      <span className="pedestal-num">{st.value}</span>
                      <span className="pedestal-label">{isRtl ? (st.label || st.labelEn) : (st.labelEn || st.label)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="estate-pedestal-card">
                    <div className="pedestal-icon-circle">
                      <i className="bi bi-clock-history"></i>
                    </div>
                    <div className="pedestal-body">
                      <span className="pedestal-num">{t('home.sellStat1Val', '48 ساعة')}</span>
                      <span className="pedestal-label">{t('home.sellStat1Label', 'فحص واعتماد رسمي')}</span>
                    </div>
                  </div>

                  <div className="estate-pedestal-card">
                    <div className="pedestal-icon-circle">
                      <i className="bi bi-patch-check"></i>
                    </div>
                    <div className="pedestal-body">
                      <span className="pedestal-num">{t('home.sellStat2Val', '0%')}</span>
                      <span className="pedestal-label">{t('home.sellStat2Label', 'عمولة على طرح العقار')}</span>
                    </div>
                  </div>

                  <div className="estate-pedestal-card">
                    <div className="pedestal-icon-circle">
                      <i className="bi bi-shield-check"></i>
                    </div>
                    <div className="pedestal-body">
                      <span className="pedestal-num">{t('home.sellStat3Val', 'نخبة حصرية')}</span>
                      <span className="pedestal-label">{t('home.sellStat3Label', 'من كبار المستثمرين')}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Elevated Actions Row */}
            <div className="estate-actions-row">
              <Link to={sellerContent?.primaryBtn?.link || '/sell'} className="btn-estate-primary">
                <span>{sellerContent?.primaryBtn?.text || t('home.sellBtn', 'اعرض عقارك الآن')}</span>
                <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
              </Link>
              <Link to={sellerContent?.secondaryBtn?.link || '/contact'} className="btn-estate-secondary">
                <i className="bi bi-headset me-2"></i>
                <span>{sellerContent?.secondaryBtn?.text || t('home.sellBrowseLink', 'تواصل مع مستشار خاص')}</span>
              </Link>
            </div>

            {/* Trust Micro-Footer */}
            <div className="estate-trust-strip">
              <div className="trust-item">
                <i className="bi bi-lock-fill text-gold"></i>
                <span>{isRtl ? 'سرية تامة لبيانات المالك' : 'Strict Confidentiality'}</span>
              </div>
              <span className="trust-dot">·</span>
              <div className="trust-item">
                <i className="bi bi-file-earmark-check-fill text-gold"></i>
                <span>{isRtl ? 'عقود موثقة رسمياً' : 'Legally Audited Deeds'}</span>
              </div>
              <span className="trust-dot">·</span>
              <div className="trust-item">
                <i className="bi bi-person-check-fill text-gold"></i>
                <span>{isRtl ? 'مستشار عقاري خاص مخصص' : 'Dedicated Private Advisor'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
