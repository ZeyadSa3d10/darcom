import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useCompare } from '../../context/CompareContext.jsx';
import FavoriteButton from '../FavoriteButton/FavoriteButton.jsx';
import './PropertyCard.css';

// Self-hosted launch placeholders (public/images/*.svg).
// TODO(launch): replace with licensed WebP photos per type, same filenames.
const REAL_ESTATE_CURATED_IMAGES = {
  penthouse: '/images/hero-cairo.svg',
  villa: '/images/hero-sahel.svg',
  chalet: '/images/hero-sokhna.svg',
  apartment: '/images/hero-cairo.svg',
  duplex: '/images/hero-gouna.svg',
  townhouse: '/images/hero-cairo.svg',
  studio: '/images/hero-gouna.svg',
  'twin-house': '/images/hero-sahel.svg',
  'standalone-villa': '/images/hero-gouna.svg',
};

function formatPriceAmount(price) {
  if (price == null) return '—';
  return Number(price).toLocaleString('en-US');
}

export default function PropertyCard({ property, layout = 'grid', onFavoriteChange, favInitial = false }) {
  const { t, isRtl } = useSettings();
  const purpose = (property.purpose || 'sale').toLowerCase();
  const purposeLabel = purpose === 'rent'
    ? t('common.forRent', 'For Rent')
    : purpose === 'investment'
    ? t('common.investment', 'Investment')
    : t('common.forSale', 'For Sale');
  const isRental = purpose === 'rent';

  const typeKey = (property.propertyTypeSlug || property.propertyType || '').toLowerCase().replace(/\s+/g, '-');
  const curatedFallback = REAL_ESTATE_CURATED_IMAGES[typeKey] || REAL_ESTATE_CURATED_IMAGES.chalet;

  // If primaryImageUrl is a legacy picsum placeholder from the dev seed, use the local fallback instead
  const hasPicsumPlaceholder = property.primaryImageUrl && property.primaryImageUrl.includes('picsum.photos');
  const displayImage = hasPicsumPlaceholder ? curatedFallback : (property.primaryImageUrl || curatedFallback);

  const { isInCompare, toggleCompare } = useCompare();
  const inCompare = isInCompare(property.id);

  const localizedPropertyType = property.propertyType
    ? t(`types.${typeKey}`, property.propertyType)
    : null;

  return (
    <article className={`property-card ${layout === 'list' ? 'as-list' : ''}`}>
      {/* Media Box */}
      <div className="property-card-media">
        <Link to={`/properties/${property.slug}`} className="property-media-link" tabIndex={-1} aria-hidden="true">
          <img
            src={displayImage}
            alt={property.title}
            loading="lazy"
            className="property-card-img"
            onError={(e) => {
              if (e.target.src !== curatedFallback) {
                e.target.src = curatedFallback;
              }
            }}
          />
          <div className="property-media-overlay"></div>
        </Link>

        {/* Top Badges Bar */}
        <div className="property-badges-top">
          {property.isFeatured && (
            <span className="badge-luxury-featured">
              <i className="bi bi-star-fill me-1 text-gold-icon"></i>
              <span>{t('common.featured', 'Featured')}</span>
            </span>
          )}
          <span className={`badge-purpose-pill ${purpose}`}>
            {purposeLabel}
          </span>
        </div>

        {/* Top Actions: Compare & Favorite */}
        <div className="property-top-actions">
          <button
            type="button"
            className={`property-compare-action-btn ${inCompare ? 'is-active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCompare(property);
            }}
            title={inCompare ? (isRtl ? 'إزالة من المقارنة' : 'Remove from comparison') : (isRtl ? 'إضافة للمقارنة' : 'Compare property')}
            aria-label={inCompare ? 'Remove from comparison' : 'Compare property'}
          >
            <i className={`bi bi-arrow-left-right ${inCompare ? 'text-gold' : ''}`}></i>
          </button>
          <FavoriteButton propertyId={property.id} initial={favInitial} onChange={onFavoriteChange} />
        </div>

        {/* Bottom Property Type Pill on Image */}
        {localizedPropertyType && (
          <div className="property-type-tag">
            <span>{localizedPropertyType}</span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="property-card-body">
        {/* Price Row */}
        <div className="property-price-header">
          <div className="property-price-tag">
            <span className="price-num">{formatPriceAmount(property.price)}</span>
            <span className="price-curr">{t('common.egp', property.currency || 'EGP')}</span>
            {isRental && <span className="price-period">{t('common.perMonth', '/ mo')}</span>}
          </div>
          {property.referenceNumber && (
            <span className="property-ref-badge">{property.referenceNumber}</span>
          )}
        </div>

        {/* Property Title */}
        <Link to={`/properties/${property.slug}`} className="property-card-title" title={property.title}>
          {property.title}
        </Link>

        {/* Location Line */}
        <div className="property-card-location">
          <i className="bi bi-geo-alt-fill pin-icon"></i>
          <span>{property.location}{property.city ? `, ${property.city}` : ''}</span>
        </div>

        {/* Amenity Badges (Sea View, Pool, Beach Access) if available */}
        {(property.seaView || property.pool || property.beachAccess) && (
          <div className="property-chips-bar">
            {property.seaView && (
              <span className="amenity-chip"><i className="bi bi-water"></i> {t('propertiesPage.seaView', 'Sea View')}</span>
            )}
            {property.pool && (
              <span className="amenity-chip"><i className="bi bi-droplet-half"></i> {t('propertiesPage.pool', 'Pool')}</span>
            )}
            {property.beachAccess && (
              <span className="amenity-chip"><i className="bi bi-umbrella"></i> {t('propertiesPage.beachAccess', 'Beach')}</span>
            )}
          </div>
        )}

        {/* Specs Row (Bedrooms, Bathrooms, Area) + Arrow Action */}
        <div className="property-card-specs">
          <div className="specs-items-wrap">
            {property.bedrooms != null && (
              <div className="spec-unit" title={`${property.bedrooms} ${t('common.beds', 'Bedrooms')}`}>
                <i className="bi bi-door-closed"></i>
                <span><strong>{property.bedrooms}</strong> {t('common.beds', 'bd')}</span>
              </div>
            )}
            {property.bathrooms != null && (
              <div className="spec-unit" title={`${property.bathrooms} ${t('common.baths', 'Bathrooms')}`}>
                <i className="bi bi-droplet"></i>
                <span><strong>{property.bathrooms}</strong> {t('common.baths', 'ba')}</span>
              </div>
            )}
            {property.area != null && (
              <div className="spec-unit" title={`${property.area} ${t('common.sqm', 'm²')}`}>
                <i className="bi bi-aspect-ratio"></i>
                <span><strong>{property.area}</strong> {t('common.sqm', 'm²')}</span>
              </div>
            )}
          </div>

          <div className="explore-arrow-btn" aria-hidden="true">
            <i className={`bi ${isRtl ? 'bi-arrow-up-left' : 'bi-arrow-up-right'}`}></i>
          </div>
        </div>
      </div>
    </article>
  );
}
