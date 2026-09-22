import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { locationService } from '../../services/locationService.js';
import './SearchBar.css';

const PRICE_RANGES = [
  { label: 'Any Budget', min: '', max: '' },
  { label: 'Under 10M EGP', min: '', max: '10000000' },
  { label: '10M – 25M EGP', min: '10000000', max: '25000000' },
  { label: '25M – 50M EGP', min: '25000000', max: '50000000' },
  { label: '50M+ EGP', min: '50000000', max: '' },
];

const POPULAR_TAGS = [
  { label: 'Beachfront Chalets', params: { type: 'chalet', location: 'ain-sokhna' } },
  { label: 'Infinity Pool Villas', params: { type: 'villa', location: 'north-coast' } },
  { label: 'New Cairo Penthouses', params: { type: 'penthouse', location: 'new-cairo' } },
  { label: 'El Gouna Lagoons', params: { location: 'el-gouna' } },
  { label: 'Investment Opportunities', params: { purpose: 'investment' } },
];

export default function SearchBar({ compact = false }) {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);

  const [form, setForm] = useState({
    purpose: '',
    type: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
  });

  useEffect(() => {
    locationService.getPropertyTypes().then((r) => setTypes(r.data ?? []));
    locationService.getCities().then((r) => setCities(r.data ?? []));
  }, []);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handlePriceRangeChange = (e) => {
    const idx = Number(e.target.value);
    setSelectedRangeIndex(idx);
    const range = PRICE_RANGES[idx];
    setForm((f) => ({
      ...f,
      minPrice: range.min,
      maxPrice: range.max,
    }));
  };

  const executeSearch = (paramsObj) => {
    const params = new URLSearchParams();
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
        {/* Field 1: Location */}
        <div className="search-field-group">
          <div className="field-icon-box">
            <i className="bi bi-geo-alt-fill"></i>
          </div>
          <div className="field-inputs">
            <label htmlFor="search-loc">Destination</label>
            <select
              id="search-loc"
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
              aria-label="Location in Egypt"
            >
              <option value="">All Destinations</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
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
            <label htmlFor="search-type">Property Type</label>
            <select
              id="search-type"
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              aria-label="Property Type"
            >
              <option value="">All Types</option>
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
            <label htmlFor="search-budget">Budget</label>
            <select
              id="search-budget"
              value={selectedRangeIndex}
              onChange={handlePriceRangeChange}
              aria-label="Price range"
            >
              {PRICE_RANGES.map((r, i) => (
                <option key={r.label} value={i}>{r.label}</option>
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
            <label htmlFor="search-beds">Bedrooms</label>
            <select
              id="search-beds"
              value={form.bedrooms}
              onChange={(e) => setField('bedrooms', e.target.value)}
              aria-label="Bedrooms count"
            >
              <option value="">Any Beds</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}+ Beds</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Search Button */}
        <div className="search-cta-box">
          <button type="submit" className="btn-luxe-search" aria-label="Search properties">
            <i className="bi bi-search me-2"></i>
            <span>Search</span>
          </button>
        </div>
      </form>

      {/* 3. Quick Popular Filter Tags */}
      {!compact && (
        <div className="search-tags-row">
          <span className="tags-label">Trending:</span>
          <div className="tags-carousel">
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag.label}
                type="button"
                className="search-quick-tag"
                onClick={() => onTagClick(tag.params)}
              >
                <span>{tag.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
