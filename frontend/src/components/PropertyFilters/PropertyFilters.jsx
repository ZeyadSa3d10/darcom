import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { locationService } from '../../services/locationService.js';
import './PropertyFilters.css';

export const EMPTY_FILTERS = {
  purpose: '',
  type: '',
  propertyTypeId: '',
  villageId: '',
  zoneId: '',
  village: '',
  zone: '',
  buildingNumber: '',
  minPrice: '',
  maxPrice: '',
  maxDownPayment: '',
  installmentYears: '',
  deliveryStatus: '',
  developer: '',
  bedrooms: '',
  bathrooms: '',
  minArea: '',
  maxArea: '',
  floor: '',
  finishingStatus: '',
  furnishedStatus: '',
  amenityIds: [],
  furnished: false,
  pool: false,
  garden: false,
  seaView: false,
  beachAccess: false,
  parking: false,
  featured: false,
};

// Draft-based panel: edits stay local until Apply. Used as desktop sidebar
// and inside the mobile bottom sheet.
export default function PropertyFilters({ applied, onApply, onClear }) {
  const { t, isRtl } = useSettings();
  const [draft, setDraft] = useState({ ...EMPTY_FILTERS, ...applied });
  const [types, setTypes] = useState([]);
  const [villages, setVillages] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]);

  // Re-sync when applied filters change from outside (chips, clear, back/forward).
  useEffect(() => {
    setDraft({ ...EMPTY_FILTERS, ...applied });
  }, [applied]);

  useEffect(() => {
    locationService.getPropertyTypes().then((r) => setTypes(r.data ?? []));
    locationService.getVillages().then((r) => setVillages(r.data ?? []));
    locationService.getAmenities().then((r) => setAmenitiesList(r.data ?? []));
  }, []);

  // Compute available zones for currently selected village
  const availableZones = useMemo(() => {
    if (!draft.villageId && !draft.village) return [];
    const selectedV = villages.find(
      (v) =>
        (draft.villageId && String(v.id) === String(draft.villageId)) ||
        (draft.village && (
          (v.slug && v.slug.toLowerCase() === String(draft.village).toLowerCase()) ||
          (v.name && v.name.toLowerCase() === String(draft.village).toLowerCase()) ||
          String(v.id) === String(draft.village)
        ))
    );
    return selectedV?.zones ?? [];
  }, [draft.villageId, draft.village, villages]);

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDraft((d) => ({ ...d, [key]: v }));
  };

  const handleVillageChange = (e) => {
    const nextVal = e.target.value;
    const selectedV = villages.find(
      (v) => String(v.id) === String(nextVal) || v.slug === nextVal
    );
    setDraft((d) => ({
      ...d,
      villageId: selectedV ? selectedV.id : '',
      village: selectedV ? selectedV.slug : '',
      zoneId: '',
      zone: '',
    }));
  };

  const handleZoneChange = (e) => {
    const nextVal = e.target.value;
    const selectedZ = availableZones.find(
      (z) => String(z.id) === String(nextVal) || z.slug === nextVal
    );
    setDraft((d) => ({
      ...d,
      zoneId: selectedZ ? selectedZ.id : '',
      zone: selectedZ ? selectedZ.slug : '',
    }));
  };

  const toggleAmenity = (id) => {
    setDraft((d) => {
      const current = Array.isArray(d.amenityIds) ? d.amenityIds : [];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return { ...d, amenityIds: next };
    });
  };

  const dirtyCount = Object.keys(EMPTY_FILTERS).filter((k) => {
    const a = draft[k];
    if (Array.isArray(a)) return a.length > 0;
    return a !== '' && a !== false && a != null;
  }).length;

  const checks = [
    { key: 'seaView', label: isRtl ? 'إطلالة بحرية' : t('propertiesPage.seaView', 'Sea View') },
    { key: 'beachAccess', label: isRtl ? 'وصول مباشر للشاطئ' : t('propertiesPage.beachAccess', 'Beach Access') },
    { key: 'pool', label: isRtl ? 'حمام سباحة' : t('propertiesPage.pool', 'Swimming Pool') },
    { key: 'garden', label: isRtl ? 'حديقة خاصة' : t('propertiesPage.garden', 'Garden') },
    { key: 'parking', label: isRtl ? 'موقف سيارات' : t('propertiesPage.parking', 'Parking') },
    { key: 'furnished', label: isRtl ? 'مفروش' : t('propertiesPage.furnished', 'Furnished') },
    { key: 'featured', label: isRtl ? 'الوحدات المميزة فقط' : t('propertiesPage.featuredOnly', 'Featured only') },
  ];

  return (
    <div className="filters-panel">
      {/* 1. Purpose */}
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

      {/* 2. Property Type */}
      <div className="filters-group">
        <label htmlFor="f-type">{t('propertiesPage.propertyType', 'Property Type')}</label>
        <select id="f-type" value={draft.type} onChange={set('type')}>
          <option value="">{t('search.allTypes', 'All types')}</option>
          {types.map((tItem) => (
            <option key={tItem.slug} value={tItem.slug}>
              {t(`types.${tItem.slug}`, tItem.name)}
            </option>
          ))}
        </select>
      </div>

      {/* 3. North Coast Village & Cascading Zone */}
      <div className="filters-row">
        <div className="filters-group">
          <label htmlFor="f-village">{isRtl ? 'قرية الساحل الشمالي' : t('propertiesPage.village', 'North Coast Village')}</label>
          <select id="f-village" value={draft.villageId || draft.village} onChange={handleVillageChange}>
            <option value="">{isRtl ? 'كافة القرى' : t('propertiesPage.allVillages', 'All Villages')}</option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {isRtl ? (v.nameAr || v.name) : (v.name || v.nameAr)}
              </option>
            ))}
          </select>
        </div>
        <div className="filters-group">
          <label htmlFor="f-zone">{isRtl ? 'المنطقة / المرحلة' : t('propertiesPage.zone', 'Zone / Bay')}</label>
          <select
            id="f-zone"
            value={draft.zoneId || draft.zone}
            onChange={handleZoneChange}
            disabled={(!draft.villageId && !draft.village) || availableZones.length === 0}
          >
            <option value="">
              {(!draft.villageId && !draft.village)
                ? (isRtl ? 'اختر القرية أولاً' : 'Select Village first')
                : (isRtl ? 'كافة المناطق' : t('propertiesPage.allZones', 'All Zones'))}
            </option>
            {availableZones.map((z) => (
              <option key={z.id} value={z.id}>
                {isRtl ? (z.nameAr || z.name) : (z.name || z.nameAr)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Building Number */}
      <div className="filters-group">
        <label htmlFor="f-buildingNumber">{isRtl ? 'رقم المبنى / العمارة' : t('propertiesPage.buildingNumber', 'Building Number')}</label>
        <input
          id="f-buildingNumber"
          type="text"
          placeholder={t('propertiesPage.buildingNumberPlaceholder', 'e.g. B-12')}
          value={draft.buildingNumber}
          onChange={set('buildingNumber')}
        />
      </div>

      {/* 5. Bedrooms & Bathrooms */}
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
      </div>

      {/* 6. Area Range (m²) */}
      <div className="filters-row">
        <div className="filters-group">
          <label htmlFor="f-minArea">{isRtl ? 'أقل مساحة م²' : t('detailsPage.specsArea', 'Min area m²')}</label>
          <input
            id="f-minArea"
            type="number"
            min="0"
            placeholder={t('common.sqm', 'm²')}
            value={draft.minArea}
            onChange={set('minArea')}
          />
        </div>
        <div className="filters-group">
          <label htmlFor="f-maxArea">{isRtl ? 'أقصى مساحة م²' : 'Max area m²'}</label>
          <input
            id="f-maxArea"
            type="number"
            min="0"
            placeholder={t('common.sqm', 'm²')}
            value={draft.maxArea}
            onChange={set('maxArea')}
          />
        </div>
      </div>

      {/* 7. Price Range (EGP) */}
      <div className="filters-row">
        <div className="filters-group">
          <label htmlFor="f-minPrice">{t('propertiesPage.minPrice', 'Min price')}</label>
          <input
            id="f-minPrice"
            type="number"
            min="0"
            placeholder={t('common.egp', 'EGP')}
            value={draft.minPrice}
            onChange={set('minPrice')}
          />
        </div>
        <div className="filters-group">
          <label htmlFor="f-maxPrice">{t('propertiesPage.maxPrice', 'Max price')}</label>
          <input
            id="f-maxPrice"
            type="number"
            min="0"
            placeholder={t('common.egp', 'EGP')}
            value={draft.maxPrice}
            onChange={set('maxPrice')}
          />
        </div>
      </div>

      {/* 8. Floor & Finishing Status */}
      <div className="filters-row">
        <div className="filters-group">
          <label htmlFor="f-floor">{isRtl ? 'الطابق' : 'Floor'}</label>
          <select id="f-floor" value={draft.floor} onChange={set('floor')}>
            <option value="">{isRtl ? 'أي طابق' : 'Any Floor'}</option>
            <option value="0">{isRtl ? 'أرضي (Ground)' : 'Ground'}</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5+</option>
          </select>
        </div>
        <div className="filters-group">
          <label htmlFor="f-finishing">{isRtl ? 'حالة التشطيب' : 'Finishing'}</label>
          <select id="f-finishing" value={draft.finishingStatus} onChange={set('finishingStatus')}>
            <option value="">{isRtl ? 'أي تشطيب' : 'Any Finishing'}</option>
            <option value="Core & Shell">{isRtl ? 'بدون تشطيب (طوب أحمر)' : 'Core & Shell'}</option>
            <option value="Semi-Finished">{isRtl ? 'نصف تشطيب' : 'Semi-Finished'}</option>
            <option value="Fully Finished">{isRtl ? 'تشطيب كامل' : 'Fully Finished'}</option>
            <option value="Ultra Super Lux">{isRtl ? 'ألترا سوبر لوكس' : 'Ultra Super Lux'}</option>
            <option value="Furnished">{isRtl ? 'مفروش فاخر' : 'Furnished'}</option>
          </select>
        </div>
      </div>

      {/* 9. Payment & Handover Filters */}
      <div className="filters-row">
        <div className="filters-group">
          <label htmlFor="f-maxDownPayment">{t('propertiesPage.maxDownPayment', 'Max Down Payment')}</label>
          <input
            id="f-maxDownPayment"
            type="number"
            min="0"
            step="50000"
            placeholder={t('common.egp', 'EGP')}
            value={draft.maxDownPayment}
            onChange={set('maxDownPayment')}
          />
        </div>
        <div className="filters-group">
          <label htmlFor="f-installmentYears">{t('propertiesPage.installmentYears', 'Installment Period')}</label>
          <select id="f-installmentYears" value={draft.installmentYears} onChange={set('installmentYears')}>
            <option value="">{t('common.all', 'Any Duration')}</option>
            <option value="3">3+ {t('common.years', 'Years')}</option>
            <option value="5">5+ {t('common.years', 'Years')}</option>
            <option value="7">7+ {t('common.years', 'Years')}</option>
            <option value="8">8+ {t('common.years', 'Years')}</option>
            <option value="10">10+ {t('common.years', 'Years')}</option>
          </select>
        </div>
      </div>

      {/* 10. Handover & Developer */}
      <div className="filters-row">
        <div className="filters-group">
          <label htmlFor="f-deliveryStatus">{t('propertiesPage.deliveryStatus', 'Handover Status')}</label>
          <select id="f-deliveryStatus" value={draft.deliveryStatus} onChange={set('deliveryStatus')}>
            <option value="">{t('common.all', 'All Handover Dates')}</option>
            <option value="ready">{t('propertiesPage.readyToMove', 'Ready to Move (فوري)')}</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027+</option>
          </select>
        </div>
        <div className="filters-group">
          <label htmlFor="f-developer">{t('propertiesPage.developer', 'Premier Developer')}</label>
          <select id="f-developer" value={draft.developer} onChange={set('developer')}>
            <option value="">{t('common.all', 'All Developers')}</option>
            <option value="Emaar Misr">Emaar Misr (إعمار مصر)</option>
            <option value="Palm Hills">Palm Hills Developments (بالم هيلز)</option>
            <option value="Mountain View">Mountain View (ماونتن فيو)</option>
            <option value="SODIC">SODIC (سوديك)</option>
            <option value="TMG">Talaat Moustafa Group (طلعت مصطفى)</option>
            <option value="Hassan Allam">Hassan Allam Properties (حسن علام)</option>
            <option value="Tatweer Misr">Tatweer Misr (تطوير مصر)</option>
            <option value="Ora Developers">Ora Developers (أورا ديفلوبرز)</option>
          </select>
        </div>
      </div>

      {/* 11. Key Features Checkboxes */}
      <div className="filters-group">
        <span className="filters-label">{isRtl ? 'المزايا والإطلالة' : t('propertiesPage.amenities', 'Features & Views')}</span>
        <div className="filters-checks">
          {checks.map((c) => (
            <label key={c.key} className="check-item">
              <input type="checkbox" checked={!!draft[c.key]} onChange={set(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      {/* 12. Dynamic Amenities Multi-select */}
      {amenitiesList.length > 0 && (
        <div className="filters-group">
          <span className="filters-label">{isRtl ? 'المرافق والخدمات (متعدد)' : 'Resort Amenities'}</span>
          <div className="amenities-pills">
            {amenitiesList.map((a) => {
              const isSelected = Array.isArray(draft.amenityIds) && draft.amenityIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`amenity-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleAmenity(a.id)}
                >
                  <i className={`bi ${a.icon || 'bi-check2'}`}></i>
                  <span>{isRtl ? (a.nameAr || a.name) : a.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 13. Actions */}
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
