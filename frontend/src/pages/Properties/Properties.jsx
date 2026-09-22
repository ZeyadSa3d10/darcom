import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import PropertyFilters, { EMPTY_FILTERS } from '../../components/PropertyFilters/PropertyFilters.jsx';
import PropertyGrid from '../../components/PropertyGrid/PropertyGrid.jsx';
import PropertyCard from '../../components/PropertyCard/PropertyCard.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import Pagination from '../../components/Pagination/Pagination.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { propertyService } from '../../services/propertyService.js';
import { locationService } from '../../services/locationService.js';
import './Properties.css';

// URL <-> filters. Accepts legacy aliases (beds, area) on read; writes canonical names.
function parseParams(params) {
  const pick = (...keys) => {
    for (const k of keys) {
      const v = params.get(k);
      if (v !== null && v !== '') return v;
    }
    return '';
  };
  const bool = (k) => params.get(k) === 'true';
  return {
    q: pick('q'),
    purpose: pick('purpose'),
    type: pick('type'),
    location: pick('location'),
    minPrice: pick('minPrice'),
    maxPrice: pick('maxPrice'),
    bedrooms: pick('bedrooms', 'beds'),
    bathrooms: pick('bathrooms'),
    minArea: pick('minArea', 'area'),
    furnished: bool('furnished'),
    pool: bool('pool'),
    seaView: bool('seaView'),
    beachAccess: bool('beachAccess'),
    parking: bool('parking'),
    featured: bool('featured'),
    sort: pick('sort'),
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
  };
}

function toQuery(applied) {
  const q = {};
  if (applied.q) q.q = applied.q;
  if (applied.purpose) q.purpose = applied.purpose;
  if (applied.type) q.type = applied.type;
  if (applied.location) q.location = applied.location;
  if (applied.minPrice !== '') q.minPrice = applied.minPrice;
  if (applied.maxPrice !== '') q.maxPrice = applied.maxPrice;
  if (applied.bedrooms !== '') q.bedrooms = applied.bedrooms;
  if (applied.bathrooms !== '') q.bathrooms = applied.bathrooms;
  if (applied.minArea !== '') q.minArea = applied.minArea;
  for (const k of ['furnished', 'pool', 'seaView', 'beachAccess', 'parking', 'featured']) {
    if (applied[k]) q[k] = 'true';
  }
  if (applied.sort) q.sort = applied.sort;
  if (applied.page > 1) q.page = String(applied.page);
  return q;
}

export default function Properties() {
  const { t, isRtl } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => parseParams(searchParams), [searchParams]);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [view, setView] = useState('grid');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [maps, setMaps] = useState({ types: {}, cities: {} });
  const [input, setInput] = useState(applied.q);
  const debounce = useRef(null);
  const resultsRef = useRef(null);

  const sortOptions = [
    { v: '', l: t('propertiesPage.sortNewest', 'Newest Arrivals') },
    { v: 'price_asc', l: t('propertiesPage.sortPriceAsc', 'Price: Low to High') },
    { v: 'price_desc', l: t('propertiesPage.sortPriceDesc', 'Price: High to Low') },
    { v: 'area_desc', l: t('propertiesPage.sortAreaDesc', 'Largest Area') },
  ];

  const popularDestinations = [
    { name: t('destinations.all', 'All Locations'), slug: '', icon: 'bi-grid' },
    { name: t('destinations.north-coast', 'North Coast'), slug: 'north-coast', icon: 'bi-umbrella' },
    { name: t('destinations.el-gouna', 'El Gouna'), slug: 'el-gouna', icon: 'bi-compass' },
    { name: t('destinations.ain-sokhna', 'Ain Sokhna'), slug: 'ain-sokhna', icon: 'bi-water' },
    { name: t('destinations.new-cairo', 'New Cairo'), slug: 'new-cairo', icon: 'bi-building' },
    { name: t('destinations.hurghada', 'Hurghada'), slug: 'hurghada', icon: 'bi-sun' },
  ];

  useEffect(() => {
    locationService.getPropertyTypes().then((r) => {
      const m = {};
      for (const tItem of r.data ?? []) m[tItem.slug] = tItem.name;
      setMaps((prev) => ({ ...prev, types: m }));
    });
    locationService.getCities().then((r) => {
      const m = {};
      for (const c of r.data ?? []) m[c.slug] = c.name;
      setMaps((prev) => ({ ...prev, cities: m }));
    });
  }, []);

  // Keep the search box in sync with back/forward navigation.
  useEffect(() => {
    setInput(applied.q);
  }, [applied.q]);

  const fetchList = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const params = { ...toQuery(applied), pageSize: 12 };
      const res = await propertyService.list(params);
      setItems(res.data?.data ?? []);
      setTotal(res.data?.totalCount ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
      setState('done');
    } catch (e) {
      setError(e);
      setState('error');
    }
  }, [applied]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const push = useCallback(
    (next, resetPage = true) => {
      const merged = { ...applied, ...next };
      if (resetPage) merged.page = 1;
      setSearchParams(toQuery(merged));
    },
    [applied, setSearchParams]
  );

  const onSearchInput = (e) => {
    const v = e.target.value;
    setInput(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push({ q: v }), 400);
  };

  const applyFilters = (draft) => {
    push({ ...draft, page: 1 }, false);
    setSheetOpen(false);
  };

  const clearAll = () => {
    setSearchParams({});
    setSheetOpen(false);
  };

  const removeChip = (key) => {
    push({ [key]: typeof applied[key] === 'boolean' ? false : '', page: 1 }, false);
  };

  const getChipLabel = useCallback((key, v) => {
    switch (key) {
      case 'q':
        return `${t('common.search', 'Search')}: "${v}"`;
      case 'purpose':
        return t(`purposes.${v}`, v);
      case 'type':
        return t(`types.${v}`, maps.types[v] || v);
      case 'location':
        return t(`destinations.${v}`, maps.cities[v] || v);
      case 'minPrice':
        return `≥ ${Number(v).toLocaleString()} ${t('common.egp', 'EGP')}`;
      case 'maxPrice':
        return `≤ ${Number(v).toLocaleString()} ${t('common.egp', 'EGP')}`;
      case 'bedrooms':
        return t('search.bedsPlus', { n: v });
      case 'bathrooms':
        return `${v}+ ${t('detailsPage.specsBathrooms', 'Bathrooms')}`;
      case 'minArea':
        return `≥ ${v} ${t('common.sqm', 'm²')}`;
      case 'furnished':
        return t('propertiesPage.furnished', 'Furnished');
      case 'pool':
        return t('propertiesPage.pool', 'Swimming Pool');
      case 'seaView':
        return t('propertiesPage.seaView', 'Sea View');
      case 'beachAccess':
        return t('propertiesPage.beachAccess', 'Beach Access');
      case 'parking':
        return t('propertiesPage.parking', 'Parking');
      case 'featured':
        return t('propertiesPage.featuredOnly', 'Featured Only');
      default:
        return v;
    }
  }, [maps, t]);

  const chips = useMemo(() => {
    const list = [];
    const filterKeys = ['q', 'purpose', 'type', 'location', 'minPrice', 'maxPrice', 'bedrooms', 'bathrooms', 'minArea', 'furnished', 'pool', 'seaView', 'beachAccess', 'parking', 'featured'];
    for (const key of filterKeys) {
      const v = applied[key];
      if (v === '' || v === false || v == null) continue;
      list.push({ key, label: getChipLabel(key, v) });
    }
    return list;
  }, [applied, getChipLabel]);

  const changePage = (p) => {
    push({ page: p }, false);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const appliedFilters = { ...EMPTY_FILTERS, ...applied };

  const seoTitle = useMemo(() => {
    const bits = [];
    if (applied.type) bits.push(applied.type.replace(/-/g, ' '));
    if (applied.purpose === 'sale') bits.push('for sale');
    else if (applied.purpose) bits.push(`for ${applied.purpose}`);
    if (applied.location) bits.push(`in ${applied.location.replace(/-/g, ' ')}`);
    const head = bits.length ? bits.join(' ') : 'Luxury Properties';
    return `${head[0].toUpperCase()}${head.slice(1)} | Darcom`;
  }, [applied]);

  useSeo({
    title: seoTitle,
    description: `Browse ${total || ''} verified luxury properties on Darcom — transparent pricing, direct developer partnerships.`.trim(),
  });

  return (
    <main id="main-content" className="container properties-page">
      {/* Breadcrumbs Row */}
      <Breadcrumbs items={[{ label: t('common.darcom', 'Home'), to: '/' }, { label: t('nav.properties', 'Properties') }]} />

      {/* Luxury Hero Header */}
      <div className="properties-hero-header">
        <div className="properties-hero-text">
          <span className="properties-kicker">
            <i className="bi bi-gem text-gold me-1"></i>
            {t('propertiesPage.kicker', 'Premier Portfolio')}
          </span>
          <h1 className="properties-main-title">
            {t('propertiesPage.title', 'Distinguished Residences & Coastal Havens')}
          </h1>
          <p className="properties-sub-title">
            {t('propertiesPage.subtitle', "Explore verified luxury villas, sea-view chalets, and signature penthouses across Egypt's most coveted coastal and metropolitan destinations.")}
          </p>
        </div>

        {/* Quick Destinations Navigation Bar */}
        <div className="properties-destinations-bar">
          {popularDestinations.map((loc) => {
            const isSelected = (applied.location || '') === loc.slug;
            return (
              <button
                key={loc.slug}
                type="button"
                className={`destination-quick-btn ${isSelected ? 'active' : ''}`}
                onClick={() => push({ location: loc.slug })}
              >
                {loc.icon && <i className={`bi ${loc.icon} me-1`}></i>}
                <span>{loc.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Toolbar & Search Controls */}
      <div className="listing-toolbar-luxury">
        <div className="toolbar-count-col">
          {state === 'done' && (
            <div className="results-count-badge">
              <span className="count-num">{total}</span>
              <span className="count-text">{t('nav.properties', 'Properties Available')}</span>
            </div>
          )}
        </div>

        <div className="toolbar-controls">
          {/* Expanded Search Bar with Clear Button */}
          <div className="search-input-luxury">
            <i className="bi bi-search search-icon"></i>
            <input
              type="search"
              placeholder={t('propertiesPage.searchPlaceholder', 'Search compounds, cities, keywords…')}
              value={input}
              onChange={onSearchInput}
              aria-label={t('common.search', 'Search properties')}
            />
            {input && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setInput('');
                  push({ q: '' });
                }}
                aria-label={t('common.clear', 'Clear search')}
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="sort-wrapper-luxury">
            <i className="bi bi-arrow-down-up sort-icon"></i>
            <select
              value={applied.sort}
              onChange={(e) => push({ sort: e.target.value })}
              aria-label={t('common.sort', 'Sort properties')}
              className="sort-select-luxury"
            >
              {sortOptions.map((s) => (
                <option key={s.v} value={s.v}>{s.l}</option>
              ))}
            </select>
          </div>

          {/* View Mode Segmented Pill */}
          <div className="view-toggle-luxury" role="group" aria-label="View mode">
            <button
              type="button"
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
              aria-label={t('propertiesPage.gridView', 'Grid view')}
              title={t('propertiesPage.gridView', 'Grid View')}
            >
              <i className="bi bi-grid-fill"></i>
            </button>
            <button
              type="button"
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              aria-label={t('propertiesPage.listView', 'List view')}
              title={t('propertiesPage.listView', 'List View')}
            >
              <i className="bi bi-view-list"></i>
            </button>
          </div>

          {/* Mobile Filters Trigger Button */}
          <button
            type="button"
            className="btn-mobile-filters-trigger d-lg-none"
            onClick={() => setSheetOpen(true)}
          >
            <i className="bi bi-sliders2 me-1"></i>
            <span>{t('propertiesPage.filters', 'Filters')}</span>
            {chips.length > 0 && <span className="filters-count-pill">{chips.length}</span>}
          </button>
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {chips.length > 0 && (
        <div className="chips-row-luxury">
          <span className="chips-label">{t('propertiesPage.filters', 'Active Filters')}:</span>
          {chips.map((c) => (
            <button key={c.key} type="button" className="chip-luxury" onClick={() => removeChip(c.key)}>
              <span>{c.label}</span>
              <i className="bi bi-x"></i>
            </button>
          ))}
          <button type="button" className="chip-clear-all" onClick={clearAll}>
            <i className="bi bi-trash3 me-1"></i>
            <span>{t('propertiesPage.clearAll', 'Clear All')}</span>
          </button>
        </div>
      )}

      {/* Main Listing Layout: Sidebar + Results Grid */}
      <div className="listing-layout" ref={resultsRef}>
        <aside className="d-none d-lg-block listing-sidebar-luxury">
          <PropertyFilters applied={appliedFilters} onApply={applyFilters} onClear={clearAll} />
        </aside>

        <div className="listing-results">
          {state === 'loading' && <LoadingSkeleton variant="card" count={6} />}
          {state === 'error' && <ErrorState error={error} onRetry={fetchList} />}
          {state === 'done' && items.length === 0 && (
            <EmptyState
              icon="bi-house-search"
              title={t('propertiesPage.noPropertiesFound', 'No properties match your criteria.')}
              message={t('propertiesPage.noPropertiesSub', 'Try broadening your destination, adjusting your budget range, or clearing current filters.')}
              actionLabel={t('propertiesPage.resetAllFilters', 'Reset All Filters')}
              onAction={clearAll}
            />
          )}
          {state === 'done' && items.length > 0 && view === 'grid' && (
            <PropertyGrid items={items} />
          )}
          {state === 'done' && items.length > 0 && view === 'list' && (
            <div className="results-list">
              {items.map((p) => (
                <PropertyCard key={p.id} property={p} layout="list" />
              ))}
            </div>
          )}
          {state === 'done' && (
            <Pagination page={applied.page} totalPages={totalPages} onChange={changePage} />
          )}
        </div>
      </div>

      {/* Mobile Filters Bottom Sheet */}
      {sheetOpen && (
        <Modal title={t('propertiesPage.filterSidebarTitle', 'Filter Properties')} onClose={() => setSheetOpen(false)} variant="sheet">
          <PropertyFilters applied={appliedFilters} onApply={applyFilters} onClear={clearAll} />
        </Modal>
      )}
    </main>
  );
}
