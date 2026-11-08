import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { usePurpose } from '../../context/PurposeContext.jsx';
import { locationService } from '../../services/locationService.js';
import './SearchBar.css';

const SALE_PRICE_RANGES = [
  { labelAr: 'كافة الميزانيات', labelEn: 'Any Budget', min: '', max: '' },
  { labelAr: 'أقل من 5 مليون ج.م', labelEn: 'Under 5M EGP', min: '', max: '5000000' },
  { labelAr: '5 – 10 مليون ج.م', labelEn: '5M – 10M EGP', min: '5000000', max: '10000000' },
  { labelAr: '10 – 25 مليون ج.م', labelEn: '10M – 25M EGP', min: '10000000', max: '25000000' },
  { labelAr: '25 مليون ج.م فما فوق', labelEn: '25M+ EGP', min: '25000000', max: '' },
];

const RENT_PRICE_RANGES = [
  { labelAr: 'كافة الميزانيات', labelEn: 'Any Budget', min: '', max: '' },
  { labelAr: 'حتى 30 ألف / شهر', labelEn: 'Up to 30K / mo', min: '', max: '30000' },
  { labelAr: '30 – 60 ألف / شهر', labelEn: '30K – 60K / mo', min: '30000', max: '60000' },
  { labelAr: '60 – 120 ألف / شهر', labelEn: '60K – 120K / mo', min: '60000', max: '120000' },
  { labelAr: 'أكثر من 120 ألف / شهر', labelEn: '120K+ / mo', min: '120000', max: '' },
];

const NORTH_COAST_TAGS = [
  { labelAr: 'شاليهات مراسي', labelEn: 'Marassi Chalets', params: { village: 'marassi', type: 'chalet' } },
  { labelAr: 'فلل هاسيندا باي', labelEn: 'Hacienda Bay Villas', params: { village: 'hacienda-bay', type: 'villa' } },
  { labelAr: 'رأس الحكمة', labelEn: 'Ras El Hekma', params: { village: 'mountain-view-ras-el-hekma' } },
  { labelAr: 'تلال الساحل', labelEn: 'Telal Shoreline', params: { village: 'telal' } },
  { labelAr: 'سيلفرساندز', labelEn: 'Silversands', params: { village: 'silversands' } },
];

export default function SearchBar({ compact = false }) {
  const navigate = useNavigate();
  const { isRtl } = useSettings();
  const { purpose, isRental } = usePurpose();
  const [types, setTypes] = useState([]);
  const [villages, setVillages] = useState([]);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);

  const priceRanges = isRental ? RENT_PRICE_RANGES : SALE_PRICE_RANGES;

  const [form, setForm] = useState({
    villageId: '',
    type: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
  });

  useEffect(() => {
    locationService.getPropertyTypes().then((r) => setTypes(r.data ?? []));
    locationService.getVillages().then((r) => setVillages(r.data ?? []));
  }, []);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handlePriceRangeChange = (e) => {
    const idx = Number(e.target.value);
    setSelectedRangeIndex(idx);
    const range = priceRanges[idx];
    setForm((f) => ({
      ...f,
      minPrice: range?.min || '',
      maxPrice: range?.max || '',
    }));
  };

  const executeSearch = (paramsObj) => {
    const params = new URLSearchParams();
    params.set('purpose', purpose);
    for (const [k, v] of Object.entries(paramsObj)) {
      if (v !== '' && v != null) params.set(k, v);
    }
    navigate(`/properties?${params.toString()}`);
  };

  const submit = (e) => {
    e.preventDefault();
    executeSearch(form);
  };

  const onTagClick = (tagParams) => {
    const next = { ...form, ...tagParams };
    setForm(next);
    executeSearch(next);
  };

  return (
    <div className={`luxe-search-container ${compact ? 'compact' : ''}`}>
      {/* Glassmorphic Console Form */}
      <form className="luxe-search-console" onSubmit={submit} role="search">
        {/* Field 1: North Coast Village */}
        <div className="search-field-group">
          <div className="field-icon-box">
            <i className="bi bi-geo-alt-fill"></i>
          </div>
          <div className="field-inputs">
            <label htmlFor="search-loc">{isRtl ? 'القرية' : 'Village'}</label>
            <select
              id="search-loc"
              value={form.villageId}
              onChange={(e) => setField('villageId', e.target.value)}
              aria-label="North Coast Village"
            >
              <option value="">{isRtl ? 'كافة قرى الساحل' : 'All North Coast Villages'}</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {isRtl ? (v.nameAr || v.name) : (v.name || v.nameAr)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-field-divider"></div>

        {/* Field 2: Property Type */}
        <div className="search-field-group">
          <div className="field-icon-box">
            <i className="bi bi-buildings-fill"></i>
          </div>
          <div className="field-inputs">
            <label htmlFor="search-type">{isRtl ? 'نوع العقار' : 'Property Type'}</label>
            <select
              id="search-type"
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              aria-label="Property Type"
            >
              <option value="">{isRtl ? 'كافة الأنواع' : 'All Types'}</option>
              {types.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-field-divider"></div>

        {/* Field 3: Budget Range */}
        <div className="search-field-group">
          <div className="field-icon-box">
            <i className="bi bi-cash-stack"></i>
          </div>
          <div className="field-inputs">
            <label htmlFor="search-budget">{isRental ? (isRtl ? 'الميزانية / شهر' : 'Budget / mo') : (isRtl ? 'الميزانية' : 'Budget')}</label>
            <select
              id="search-budget"
              value={selectedRangeIndex}
              onChange={handlePriceRangeChange}
              aria-label="Price range"
            >
              {priceRanges.map((r, i) => (
                <option key={i} value={i}>{isRtl ? r.labelAr : r.labelEn}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-field-divider"></div>

        {/* Field 4: Bedrooms */}
        <div className="search-field-group">
          <div className="field-icon-box">
            <i className="bi bi-door-closed-fill"></i>
          </div>
          <div className="field-inputs">
            <label htmlFor="search-beds">{isRtl ? 'عدد الغرف' : 'Bedrooms'}</label>
            <select
              id="search-beds"
              value={form.bedrooms}
              onChange={(e) => setField('bedrooms', e.target.value)}
              aria-label="Bedrooms count"
            >
              <option value="">{isRtl ? 'أي عدد' : 'Any Beds'}</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}+ {isRtl ? 'غرف' : 'Beds'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Search Button */}
        <div className="search-cta-box">
          <button type="submit" className="btn-luxe-search" aria-label="Search properties">
            <i className="bi bi-search me-2"></i>
            <span>{isRtl ? 'بحث' : 'Search'}</span>
          </button>
        </div>
      </form>

      {/* Quick Popular Filter Tags */}
      {!compact && (
        <div className="search-tags-row">
          <span className="tags-label">{isRtl ? 'الأكثر بحثاً:' : 'Trending:'}</span>
          <div className="tags-carousel">
            {NORTH_COAST_TAGS.map((tag) => (
              <button
                key={tag.labelEn}
                type="button"
                className="search-quick-tag"
                onClick={() => onTagClick(tag.params)}
              >
                <span>{isRtl ? tag.labelAr : tag.labelEn}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
    </div>
  );
}
