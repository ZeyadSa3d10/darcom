import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import FavoriteButton from '../FavoriteButton/FavoriteButton.jsx';
import './PropertyCard.css';

const REAL_ESTATE_CURATED_IMAGES = {
  penthouse: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
  villa: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
  chalet: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
  apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
  duplex: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
  townhouse: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80',
  studio: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
  'twin-house': 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1000&q=80',
  'standalone-villa': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
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

  // If primaryImageUrl is a placeholder from picsum, use curated luxury architecture photo
  const hasPicsumPlaceholder = property.primaryImageUrl && property.primaryImageUrl.includes('picsum.photos');
  const displayImage = hasPicsumPlaceholder ? curatedFallback : (property.primaryImageUrl || curatedFallback);

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

        {/* Favorite Heart Button */}
        <div className="property-fav-wrapper">
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
