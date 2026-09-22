import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { locationService } from '../../services/locationService.js';
import './PropertyFilters.css';

export const EMPTY_FILTERS = {
  purpose: '',
  type: '',
  location: '',
  minPrice: '',
  maxPrice: '',
  bedrooms: '',
  bathrooms: '',
  minArea: '',
  furnished: false,
  pool: false,
  seaView: false,
  beachAccess: false,
  parking: false,
  featured: false,
};

// Draft-based panel: edits stay local until Apply. Used as desktop sidebar
// and inside the mobile bottom sheet.
export default function PropertyFilters({ applied, onApply, onClear }) {
  const { t } = useSettings();
  const [draft, setDraft] = useState({ ...EMPTY_FILTERS, ...applied });
  const [types, setTypes] = useState([]);
  const [cities, setCities] = useState([]);

  // Re-sync when applied filters change from outside (chips, clear, back/forward).
  useEffect(() => {
    setDraft({ ...EMPTY_FILTERS, ...applied });
  }, [applied]);

  useEffect(() => {
    locationService.getPropertyTypes().then((r) => setTypes(r.data ?? []));
    locationService.getCities().then((r) => setCities(r.data ?? []));
  }, []);

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDraft((d) => ({ ...d, [key]: v }));
  };

  const dirtyCount = Object.keys(EMPTY_FILTERS).filter((k) => {
    const a = draft[k];
    return a !== '' && a !== false && a != null;
  }).length;

  const checks = [
    { key: 'furnished', label: t('propertiesPage.furnished', 'Furnished') },
    { key: 'pool', label: t('propertiesPage.pool', 'Swimming Pool') },
    { key: 'seaView', label: t('propertiesPage.seaView', 'Sea View') },
    { key: 'beachAccess', label: t('propertiesPage.beachAccess', 'Beach Access') },
    { key: 'parking', label: t('propertiesPage.parking', 'Parking') },
    { key: 'featured', label: t('propertiesPage.featuredOnly', 'Featured only') },
  ];

  return (
    <div className="filters-panel">
      <div className="filters-group">
        <span className="filters-label">{t('propertiesPage.purpose', 'Purpose')}</span>
        <div className="search-segment" role="group" aria-label="Purpose">
          {[
            { v: '', l: t('common.all', 'All') },
            { v: 'sale', l: t('purposes.sale', 'Buy') },
            { v: 'rent', l: t('purposes.rent', 'Rent') },
            { v: 'investment', l: t('purposes.investment', 'Invest') },
          ].map((p) => (
            <button
              key={p.v || 'all'}
              type="button"
              className={draft.purpose === p.v ? 'active' : ''}
              onClick={() => setDraft((d) => ({ ...d, purpose: p.v }))}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      <div className="filters-row">
        <div className="filters-group">
          <label htmlFor="f-type">{t('propertiesPage.propertyType', 'Type')}</label>
          <select id="f-type" value={draft.type} onChange={set('type')}>
            <option value="">{t('search.allTypes', 'All types')}</option>
            {types.map((tItem) => (
              <option key={tItem.slug} value={tItem.slug}>
                {t(`types.${tItem.slug}`, tItem.name)}
              </option>
            ))}
          </select>
        </div>
        <div className="filters-group">
          <label htmlFor="f-location">{t('propertiesPage.destination', 'Location')}</label>
          <select id="f-location" value={draft.location} onChange={set('location')}>
            <option value="">{t('destinations.all', 'All locations')}</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {t(`destinations.${c.slug}`, c.name)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="filters-row">
        <div className="filters-group">
          <label htmlFor="f-minPrice">{t('propertiesPage.minPrice', 'Min price')}</label>
          <input id="f-minPrice" type="number" min="0" placeholder={t('common.egp', 'EGP')} value={draft.minPrice} onChange={set('minPrice')} />
        </div>
        <div className="filters-group">
          <label htmlFor="f-maxPrice">{t('propertiesPage.maxPrice', 'Max price')}</label>
          <input id="f-maxPrice" type="number" min="0" placeholder={t('common.egp', 'EGP')} value={draft.maxPrice} onChange={set('maxPrice')} />
        </div>
      </div>

      <div className="filters-row">
        <div className="filters-group">
          <label htmlFor="f-bedrooms">{t('propertiesPage.bedrooms', 'Bedrooms')}</label>
          <select id="f-bedrooms" value={draft.bedrooms} onChange={set('bedrooms')}>
            <option value="">{t('propertiesPage.anyBeds', 'Any')}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{t('search.bedsPlus', { n })}</option>
            ))}
          </select>
        </div>
        <div className="filters-group">
          <label htmlFor="f-bathrooms">{t('detailsPage.specsBathrooms', 'Bathrooms')}</label>
          <select id="f-bathrooms" value={draft.bathrooms} onChange={set('bathrooms')}>
            <option value="">{t('propertiesPage.anyBeds', 'Any')}</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </div>
        <div className="filters-group">
          <label htmlFor="f-minArea">{t('detailsPage.specsArea', 'Min area m²')}</label>
          <input id="f-minArea" type="number" min="0" placeholder={t('common.sqm', 'm²')} value={draft.minArea} onChange={set('minArea')} />
        </div>
      </div>

      <div className="filters-group">
        <span className="filters-label">{t('propertiesPage.amenities', 'Features')}</span>
        <div className="filters-checks">
          {checks.map((c) => (
            <label key={c.key} className="check-item">
              <input type="checkbox" checked={!!draft[c.key]} onChange={set(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div className="filters-actions">
        <button type="button" className="btn btn-brand flex-fill" onClick={() => onApply(draft)}>
          {t('propertiesPage.applyFilters', 'Apply')}{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onClear}>
          {t('propertiesPage.resetFilters', 'Clear')}
        </button>
      </div>
    </div>
  );
}
