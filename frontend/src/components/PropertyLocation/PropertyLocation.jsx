import { useSettings } from '../../context/SettingsContext.jsx';
import './PropertyLocation.css';

// Map architecture: keyless OpenStreetMap embed when coordinates exist,
// graceful address block otherwise. Owner-private data is never rendered
// (the API simply does not return it).
export default function PropertyLocation({ property }) {
  const { t } = useSettings();
  const { latitude, longitude } = property;
  const hasCoords = latitude != null && longitude != null;

  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.03}%2C${latitude - 0.02}%2C${longitude + 0.03}%2C${latitude + 0.02}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null;

  const highlights = [
    property.beachAccess && t('propertiesPage.beachAccess', 'Beach access on site'),
    property.seaView && t('propertiesPage.seaView', 'Sea view'),
    property.pool && t('propertiesPage.pool', 'Community pool nearby'),
  ].filter(Boolean);

  return (
    <section className="prop-section" aria-label="Location">
      <h2>{t('detailsPage.locationTitle', 'Location')}</h2>
      <div className="location-lines">
        {property.address && <p><i className="bi bi-geo-alt me-1"></i>{property.address}</p>}
        <p className="text-meta">
          {[property.location, property.area, property.city].filter(Boolean).join(' · ')}
        </p>
        {highlights.length > 0 && (
          <ul className="location-highlights">
            {highlights.map((h) => (
              <li key={h}><i className="bi bi-check-lg me-1"></i>{h}</li>
            ))}
          </ul>
        )}
      </div>
      {mapSrc && (
        <iframe
          title={`Map of ${property.location}`}
          src={mapSrc}
          className="location-map"
          loading="lazy"
        />
      )}
    </section>
  );
}
