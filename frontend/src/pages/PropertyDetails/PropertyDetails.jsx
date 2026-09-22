import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import PropertyGallery from '../../components/PropertyGallery/PropertyGallery.jsx';
import PropertyHeader from '../../components/PropertyHeader/PropertyHeader.jsx';
import PropertyStats from '../../components/PropertyStats/PropertyStats.jsx';
import PropertyDescription from '../../components/PropertyDescription/PropertyDescription.jsx';
import PropertyAmenities from '../../components/PropertyAmenities/PropertyAmenities.jsx';
import PropertyLocation from '../../components/PropertyLocation/PropertyLocation.jsx';
import AgentCard from '../../components/AgentCard/AgentCard.jsx';
import InquiryForm from '../../components/InquiryForm/InquiryForm.jsx';
import PropertyCard from '../../components/PropertyCard/PropertyCard.jsx';
import { SkeletonGallery, SkeletonDetails } from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import { useSeo, propertyJsonLd } from '../../hooks/useSeo.js';
import { useRevealScope } from '../../hooks/useRevealScope.js';
import { propertyService } from '../../services/propertyService.js';
import './PropertyDetails.css';

function toWhatsAppUrl(phone, title, ref) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('01')) digits = `2${digits}`;
  if (digits.startsWith('0020')) digits = digits.slice(2);
  const text = encodeURIComponent(`Hello, I am inquiring about "${title || 'Property'}" (Ref: ${ref || ''}) on Darcom.`);
  return `https://wa.me/${digits}?text=${text}`;
}

export default function PropertyDetails() {
  const { slug } = useParams();
  const { t, isRtl } = useSettings();
  const [property, setProperty] = useState(null);
  const [related, setRelated] = useState([]);
  const scopeRef = useRevealScope(
    ':scope .details-main > *, :scope .details-aside > *, :scope .related-section',
    [property?.id]
  );
  const [state, setState] = useState('loading');
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    setNotFound(false);
    try {
      const res = await propertyService.getBySlug(slug);
      const data = res.data;
      setProperty(data);
      setState('done');
      try {
        const rel = await propertyService.related(data.id, 4);
        setRelated(rel.data ?? []);
      } catch {
        setRelated([]);
      }
    } catch (e) {
      setState(e?.networkError ? 'error' : 'missing');
      if (!e?.networkError) setNotFound(true);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const scrollToInquiry = () => {
    document.getElementById('inquiry')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useSeo({
    title: property ? `${property.title} | Darcom Luxury Real Estate` : 'Property Details | Darcom',
    description: property?.description?.slice(0, 160) || 'Verified luxury property listing on Darcom.',
    image: property?.images?.[0]?.url,
    canonical: property ? `${window.location.origin}/properties/${property.slug}` : undefined,
    jsonLd: property ? propertyJsonLd(property, `${window.location.origin}/properties/${property.slug}`) : null,
    type: 'article',
  });

  if (state === 'loading') {
    return (
      <main id="main-content" className="container details-page">
        <SkeletonGallery />
        <div className="mt-4"><SkeletonDetails /></div>
      </main>
    );
  }

  if (state === 'error') {
    return (
      <main className="container details-page">
        <ErrorState error={t('common.error', 'Could not load this property.')} onRetry={load} />
      </main>
    );
  }

  if (notFound || !property) {
    return (
      <main className="container details-page">
        <ErrorState title={t('detailsPage.propertyNotFound', 'Property not found')} error={t('detailsPage.propertyNotFoundDesc', 'This listing may have been removed or is no longer public.')} />
        <div className="text-center">
          <Link to="/properties" className="btn btn-brand">{t('detailsPage.backToProperties', 'Browse properties')}</Link>
        </div>
      </main>
    );
  }

  const purpose = (property.purpose || 'sale').toLowerCase();
  const locked = property.status === 'Sold' || property.status === 'Rented';
  const waUrl = toWhatsAppUrl(property.agent?.phone, property.title, property.referenceNumber);

  const pricePerM2 = property.area && property.price
    ? `${Math.round(property.price / property.area).toLocaleString('en-US')} ${t('common.egp', property.currency || 'EGP')} / ${t('common.sqm', 'm²')}`
    : null;

  const reserveCtaLabel = purpose === 'rent'
    ? t('detailsPage.rentNow', 'Rent Property Now')
    : purpose === 'investment'
    ? t('purposes.investment', 'Invest in Property')
    : t('detailsPage.reserveNow', 'Buy Property Now');

  return (
    <main id="main-content" className="container details-page" ref={scopeRef}>
      {/* Top Breadcrumb row */}
      <div className="details-breadcrumbs-wrap">
        <Breadcrumbs
          items={[
            { label: t('common.darcom', 'Home'), to: '/' },
            { label: t('nav.properties', 'Properties'), to: '/properties' },
            { label: property.title },
          ]}
        />
        <Link to="/properties" className="back-link">
          <i className={`bi ${isRtl ? 'bi-arrow-right' : 'bi-arrow-left'} me-1`}></i>
          <span>{t('detailsPage.backToProperties', 'All Properties')}</span>
        </Link>
      </div>

      {/* Luxury Title, Location & Prominent Price Header */}
      <PropertyHeader property={property} />

      {locked && (
        <div className="locked-banner" role="status">
          <i className="bi bi-info-circle-fill text-gold me-2"></i>
          <span>This property is currently <strong>{property.status.toLowerCase()}</strong> and is shown for architectural reference.</span>
        </div>
      )}

      {/* Main 2-Column Luxury Layout */}
      <div className="details-layout">
        {/* Left Column: Media & Specifications */}
        <div className="details-main">
          <PropertyGallery
            images={property.images}
            videos={property.videos}
            title={property.title}
            propertyType={property.propertyType}
          />

          <PropertyStats property={property} />
          <PropertyDescription property={property} />
          <PropertyAmenities property={property} />
          <PropertyLocation property={property} />
        </div>

        {/* Right Column: Sticky Luxury Reservation Console */}
        <aside className="details-aside">
          {/* Reservation Card */}
          <div className="luxury-reservation-card">
            <div className="reservation-card-header">
              <span className="price-tag-caption">{t('detailsPage.reserveTitle', 'Official Listing Price')}</span>
              <strong className="reservation-price">
                {property.price ? `${Number(property.price).toLocaleString('en-US')} ${t('common.egp', property.currency || 'EGP')}` : '—'}
              </strong>
              {pricePerM2 && <span className="reservation-unit-price">{pricePerM2}</span>}
            </div>

            <div className="reservation-actions">
              {locked ? (
                <button type="button" className="btn btn-secondary w-100" disabled>
                  {property.status}
                </button>
              ) : (
                <Link to={`/checkout/${property.slug}`} className="btn-luxury-reserve">
                  <span className="btn-reserve-shimmer"></span>
                  <span>{reserveCtaLabel}</span>
                  <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-2`}></i>
                </Link>
              )}

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-whatsapp-consultation"
                >
                  <i className="bi bi-whatsapp me-2"></i>
                  <span>{t('detailsPage.whatsappConsultation', 'WhatsApp Consultation')}</span>
                </a>
              )}
            </div>

            {/* Trust Points */}
            <div className="reservation-trust-box">
              <div className="trust-item">
                <i className="bi bi-shield-check text-gold"></i>
                <span>{t('detailsPage.trustDeed', 'Verified Title Deed & Complete Legal Audit')}</span>
              </div>
              <div className="trust-item">
                <i className="bi bi-patch-check text-gold"></i>
                <span>{t('detailsPage.trustDirect', 'Direct Developer Pricing & Exclusive Terms')}</span>
              </div>
              <div className="trust-item">
                <i className="bi bi-percent text-gold"></i>
                <span>{t('detailsPage.trustCommission', '0% Commission on Off-Plan & Primary Sales')}</span>
              </div>
              <div className="trust-item">
                <i className="bi bi-lock-fill text-gold"></i>
                <span>{t('detailsPage.trustEscrow', 'Secure Escrow & Certified Payment Guidance')}</span>
              </div>
            </div>

            {/* Meta tags */}
            <div className="reservation-meta-footer">
              <div className="meta-footer-item">
                <span className="meta-label">{t('detailsPage.reference', 'Reference')}</span>
                <strong>{property.referenceNumber}</strong>
              </div>
              <div className="meta-footer-item">
                <span className="meta-label">{t('detailsPage.status', 'Status')}</span>
                <span className="status-indicator-dot"></span>
                <strong>{property.status}</strong>
              </div>
            </div>
          </div>

          {/* Agent Card with WhatsApp Integration */}
          <AgentCard agent={property.agent} onInquire={scrollToInquiry} propertyTitle={property.title} propertyRef={property.referenceNumber} />

          {/* Quick Inquiry Form */}
          <InquiryForm propertyId={property.id} propertyTitle={property.title} />
        </aside>
      </div>

      {/* Similar Properties Showcase */}
      {related.length > 0 && (
        <section className="related-section" aria-label="Similar properties">
          <div className="related-header">
            <div>
              <span className="section-pre-title">{t('home.featuredKicker', 'Curated For You')}</span>
              <h2 className="related-title">{t('detailsPage.similarTitle', 'Similar Luxury Properties')}</h2>
            </div>
            <Link to="/properties" className="btn btn-outline-secondary btn-sm">
              {t('home.browseAll', 'Explore All')} <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-1`}></i>
            </Link>
          </div>
          <div className="related-rail">
            {related.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Floating Sticky Action Bar */}
      <div className="mobile-sticky-action-bar d-lg-none">
        <div className="mobile-bar-price-col">
          <span className="mobile-bar-label">{t('detailsPage.totalPrice', 'Total Price')}</span>
          <strong className="mobile-bar-price">
            {property.price ? `${Number(property.price).toLocaleString('en-US')} ${t('common.egp', property.currency || 'EGP')}` : '—'}
          </strong>
        </div>

        <div className="mobile-bar-buttons">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="mobile-action-circle whatsapp"
              aria-label="Chat on WhatsApp"
              title="WhatsApp"
            >
              <i className="bi bi-whatsapp"></i>
            </a>
          )}

          {property.agent?.phone && (
            <a
              href={`tel:${property.agent.phone}`}
              className="mobile-action-circle call"
              aria-label="Call Agent"
              title="Call"
            >
              <i className="bi bi-telephone-fill"></i>
            </a>
          )}

          {locked ? (
            <span className="mobile-locked-badge">{property.status}</span>
          ) : (
            <Link to={`/checkout/${property.slug}`} className="btn-mobile-reserve">
              <span>{purpose === 'rent' ? t('purposes.rent', 'Rent') : t('detailsPage.buyNow', 'Buy Now')}</span>
              <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-1`}></i>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
