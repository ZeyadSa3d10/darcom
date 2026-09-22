import { useSettings } from '../../context/SettingsContext.jsx';
import './PropertyAmenities.css';

export default function PropertyAmenities({ property }) {
  const { t } = useSettings();
  const amenities = property.amenities ?? [];
  if (!amenities.length) return null;

  return (
    <section className="prop-section" aria-label="Amenities">
      <h2>{t('detailsPage.amenitiesTitle', 'Amenities')}</h2>
      <ul className="amenities-grid">
        {amenities.map((a) => (
          <li key={a.id}>
            <i className={`bi ${a.icon || 'bi-check-circle'}`}></i>
            {a.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
