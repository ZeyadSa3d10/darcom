import { useSettings } from '../../context/SettingsContext.jsx';
import './PropertyStats.css';

export default function PropertyStats({ property }) {
  const { t } = useSettings();
  const stats = [
    property.bedrooms != null && { icon: 'bi-door-closed', value: property.bedrooms, label: t('common.beds', 'Bedrooms') },
    property.bathrooms != null && { icon: 'bi-droplet', value: property.bathrooms, label: t('common.baths', 'Bathrooms') },
    property.area != null && { icon: 'bi-rulers', value: `${property.area} ${t('common.sqm', 'm²')}`, label: t('detailsPage.specsArea', 'Area') },
    property.floor != null && {
      icon: 'bi-layers',
      value: property.totalFloors ? `${property.floor} / ${property.totalFloors}` : property.floor,
      label: t('detailsPage.floor', 'Floor'),
    },
    { icon: 'bi-p-square', value: property.parking ? t('common.yes', 'Yes') : t('common.no', 'No'), label: t('propertiesPage.parking', 'Parking') },
    property.builtYear != null && { icon: 'bi-calendar3', value: property.builtYear, label: t('detailsPage.built', 'Built') },
    property.furnishedStatus && { icon: 'bi-lamp', value: property.furnishedStatus, label: t('propertiesPage.furnished', 'Furnished') },
    property.finishingStatus && { icon: 'bi-gem', value: property.finishingStatus, label: t('detailsPage.finishing', 'Finishing') },
  ].filter(Boolean);

  if (!stats.length) return null;

  return (
    <section className="prop-stats" aria-label="Property facts">
      {stats.map((s) => (
        <div key={s.label} className="stat-item">
          <i className={`bi ${s.icon}`}></i>
          <span>
            <strong>{s.value}</strong>
            <em>{s.label}</em>
          </span>
        </div>
      ))}
    </section>
  );
}
