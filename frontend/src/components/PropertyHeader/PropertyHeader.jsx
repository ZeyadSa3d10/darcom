import { useSettings } from '../../context/SettingsContext.jsx';
import FavoriteButton from '../FavoriteButton/FavoriteButton.jsx';
import { useToast } from '../Toast/Toast.jsx';
import './PropertyHeader.css';

export default function PropertyHeader({ property }) {
  const toast = useToast();
  const { t } = useSettings();
  const purpose = (property.purpose || 'sale').toLowerCase();

  const typeSlug = (property.propertyTypeSlug || property.propertyType || '').toLowerCase().replace(/\s+/g, '-');
  const localizedPropertyType = property.propertyType
    ? t(`types.${typeSlug}`, property.propertyType)
    : null;

  const pricePerM2 = property.area && property.price
    ? `${Math.round(property.price / property.area).toLocaleString('en-US')} ${t('common.egp', property.currency || 'EGP')} / ${t('common.sqm', 'm²')}`
    : null;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t('detailsPage.linkCopied', 'Link copied to clipboard.'));
      }
    } catch {
      // User dismissed the share sheet — not an error.
    }
  };

  return (
    <header className="prop-header-luxury">
      {/* Top Bar: Badges + Action Buttons */}
      <div className="prop-top-bar">
        <div className="prop-badges">
          <span className={`badge-purpose-pill ${purpose}`}>
            {purpose === 'rent' ? t('common.forRent', 'For Rent') : purpose === 'investment' ? t('common.investment', 'Investment') : t('common.forSale', 'For Sale')}
          </span>
          {localizedPropertyType && (
            <span className="badge-type-pill">{localizedPropertyType}</span>
          )}
          {property.status && (
            <span className={`badge-status-pill ${property.status?.toLowerCase()}`}>{property.status}</span>
          )}
          {property.isVerified && (
            <span className="badge-verified-luxury">
              <i className="bi bi-patch-check-fill me-1"></i>
              <span>{t('detailsPage.verifiedBadge', 'Verified Listing')}</span>
            </span>
          )}
        </div>

        <div className="prop-actions-cluster">
          <button
            type="button"
            className="prop-action-circle"
            onClick={share}
            aria-label={t('detailsPage.share', 'Share this property')}
            title={t('detailsPage.share', 'Share Property')}
          >
            <i className="bi bi-share"></i>
          </button>
          <FavoriteButton propertyId={property.id} inline />
        </div>
      </div>

      {/* Main Title & Price Row */}
      <div className="prop-main-info-row">
        <div className="prop-title-col">
          <h1 className="prop-luxury-title">{property.title}</h1>
          <div className="prop-meta-subtitle">
            <span className="prop-geo">
              <i className="bi bi-geo-alt-fill text-gold me-1"></i>
              {property.address ? `${property.address}, ` : ''}{property.location}
              {property.areaName ? `, ${property.areaName}` : ''}{property.city ? `, ${property.city}` : ''}
            </span>
            <span className="prop-ref-badge">Ref: {property.referenceNumber}</span>
          </div>
        </div>

        {/* Prominent Price Display (Always visible on desktop & mobile top) */}
        <div className="prop-price-col">
          <span className="prop-price-label">{t('detailsPage.price', 'Price')}</span>
          <strong className="prop-price-val">
            {property.price ? `${Number(property.price).toLocaleString('en-US')} ${t('common.egp', property.currency || 'EGP')}` : '—'}
          </strong>
          {pricePerM2 && <span className="prop-price-sub">{pricePerM2}</span>}
        </div>
      </div>

      {/* Quick Specs Overview Bar */}
      <div className="prop-quick-specs-bar">
        {property.bedrooms != null && (
          <div className="quick-spec-item">
            <i className="bi bi-door-closed"></i>
            <span><strong>{property.bedrooms}</strong> {t('common.beds', 'Beds')}</span>
          </div>
        )}
        {property.bathrooms != null && (
          <div className="quick-spec-item">
            <i className="bi bi-droplet"></i>
            <span><strong>{property.bathrooms}</strong> {t('common.baths', 'Baths')}</span>
          </div>
        )}
        {property.area != null && (
          <div className="quick-spec-item">
            <i className="bi bi-rulers"></i>
            <span><strong>{property.area}</strong> {t('common.sqm', 'm²')}</span>
          </div>
        )}
        {property.finishingStatus && (
          <div className="quick-spec-item">
            <i className="bi bi-gem"></i>
            <span>{property.finishingStatus}</span>
          </div>
        )}
        {property.developer && (
          <div className="quick-spec-item highlight-developer">
            <i className="bi bi-buildings"></i>
            <span>{t('detailsPage.byDeveloper', 'By')} <strong>{property.developer}</strong></span>
          </div>
        )}
      </div>
    </header>
  );
}
