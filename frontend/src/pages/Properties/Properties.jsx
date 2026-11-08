import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import PropertyFilters, { EMPTY_FILTERS } from '../../components/PropertyFilters/PropertyFilters.jsx';
import PropertyGrid from '../../components/PropertyGrid/PropertyGrid.jsx';
import PropertyCard from '../../components/PropertyCard/PropertyCard.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import Pagination from '../../components/Pagination/Pagination.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import PropertyRequirementModal from '../../components/PropertyRequirementModal/PropertyRequirementModal.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { useCmsSeo } from '../../hooks/useCmsSeo.js';
import { propertyService } from '../../services/propertyService.js';
import { locationService } from '../../services/locationService.js';
import './Properties.css';

// URL <-> filters. Accepts legacy aliases on read; writes canonical names.
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
    propertyTypeId: pick('propertyTypeId') ? parseInt(pick('propertyTypeId'), 10) : '',
    location: pick('location'),
    villageId: pick('villageId') ? parseInt(pick('villageId'), 10) : '',
    zoneId: pick('zoneId') ? parseInt(pick('zoneId'), 10) : '',
    village: pick('village'),
    zone: pick('zone'),
    buildingNumber: pick('buildingNumber'),
    minPrice: pick('minPrice'),
    maxPrice: pick('maxPrice'),
    bedrooms: pick('bedrooms', 'beds'),
    bathrooms: pick('bathrooms'),
    minArea: pick('minArea', 'area'),
    maxArea: pick('maxArea'),
    floor: pick('floor'),
    finishingStatus: pick('finishingStatus'),
    furnishedStatus: pick('furnishedStatus'),
    amenityIds: params.getAll('amenityIds').length > 0
      ? params.getAll('amenityIds').map(Number)
      : (params.get('amenityIds') ? params.get('amenityIds').split(',').map(Number).filter(Boolean) : []),
    furnished: bool('furnished'),
    pool: bool('pool'),
    garden: bool('garden'),
    seaView: bool('seaView'),
    beachAccess: bool('beachAccess'),
    parking: bool('parking'),
    featured: bool('featured'),
    maxDownPayment: pick('maxDownPayment'),
    installmentYears: pick('installmentYears'),
    deliveryStatus: pick('deliveryStatus'),
    developer: pick('developer'),
    sort: pick('sort'),
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
  };
}

function toQuery(applied) {
  const q = {};
  if (applied.q) q.q = applied.q;
  if (applied.purpose) q.purpose = applied.purpose;
  if (applied.type) q.type = applied.type;
  if (applied.propertyTypeId) q.propertyTypeId = String(applied.propertyTypeId);
  if (applied.location) q.location = applied.location;
  if (applied.villageId) q.villageId = String(applied.villageId);
  if (applied.zoneId) q.zoneId = String(applied.zoneId);
  if (applied.village) q.village = applied.village;
  if (applied.zone) q.zone = applied.zone;
  if (applied.buildingNumber) q.buildingNumber = applied.buildingNumber;
  if (applied.minPrice !== '') q.minPrice = applied.minPrice;
  if (applied.maxPrice !== '') q.maxPrice = applied.maxPrice;
  if (applied.maxDownPayment !== '') q.maxDownPayment = applied.maxDownPayment;
  if (applied.installmentYears !== '') q.installmentYears = applied.installmentYears;
  if (applied.deliveryStatus !== '') q.deliveryStatus = applied.deliveryStatus;
  if (applied.developer !== '') q.developer = applied.developer;
  if (applied.bedrooms !== '') q.bedrooms = applied.bedrooms;
  if (applied.bathrooms !== '') q.bathrooms = applied.bathrooms;
  if (applied.minArea !== '') q.minArea = applied.minArea;
  if (applied.maxArea !== '') q.maxArea = applied.maxArea;
  if (applied.floor !== '') q.floor = applied.floor;
  if (applied.finishingStatus !== '') q.finishingStatus = applied.finishingStatus;
  if (applied.furnishedStatus !== '') q.furnishedStatus = applied.furnishedStatus;
  if (Array.isArray(applied.amenityIds) && applied.amenityIds.length > 0) {
    q.amenityIds = applied.amenityIds.join(',');
  }
  for (const k of ['furnished', 'pool', 'garden', 'seaView', 'beachAccess', 'parking', 'featured']) {
    if (applied[k]) q[k] = 'true';
  }
  if (applied.sort) q.sort = applied.sort;
  if (applied.page > 1) q.page = String(applied.page);
  return q;
}

export default function Properties() {
  const { t, isRtl } = useSettings();
  const { isBroker } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => parseParams(searchParams), [searchParams]);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [view, setView] = useState('grid');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [maps, setMaps] = useState({ types: {}, cities: {}, villages: {}, zones: {} });
  const [input, setInput] = useState(applied.q);
  const debounce = useRef(null);
  const resultsRef = useRef(null);

  const sortOptions = [
    { v: '', l: t('propertiesPage.sortNewest', 'Newest Arrivals') },
    { v: 'price_asc', l: t('propertiesPage.sortPriceAsc', 'Price: Low to High') },
    { v: 'price_desc', l: t('propertiesPage.sortPriceDesc', 'Price: High to Low') },
    { v: 'area_desc', l: t('propertiesPage.sortAreaDesc', 'Largest Area') },
  ];

  const northCoastVillages = [
    { name: isRtl ? 'كافة قرى الساحل' : 'All North Coast', id: '', slug: '', icon: 'bi-grid' },
    { name: isRtl ? 'مراسي' : 'Marassi', id: 1, slug: 'marassi', icon: 'bi-water' },
    { name: isRtl ? 'هاسيندا باي' : 'Hacienda Bay', id: 2, slug: 'hacienda-bay', icon: 'bi-compass' },
    { name: isRtl ? 'تلال الساحل' : 'Telal', id: 3, slug: 'telal', icon: 'bi-umbrella' },
    { name: isRtl ? 'أمواج' : 'Amwaj', id: 4, slug: 'amwaj', icon: 'bi-sun' },
    { name: isRtl ? 'ماونتن فيو رأس الحكمة' : 'Mountain View Ras El Hekma', id: 5, slug: 'mountain-view-ras-el-hekma', icon: 'bi-houses' },
    { name: isRtl ? 'سيلفرساندز' : 'Silversands', id: 6, slug: 'silversands', icon: 'bi-building' },
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
    locationService.getVillages().then((r) => {
      const vMap = {};
      const zMap = {};
      for (const v of r.data ?? []) {
        vMap[v.id] = isRtl ? (v.nameAr || v.name) : (v.name || v.nameAr);
        vMap[v.slug] = vMap[v.id];
        for (const z of v.zones ?? []) {
          zMap[z.id] = isRtl ? (z.nameAr || z.name) : (z.name || z.nameAr);
          zMap[z.slug] = zMap[z.id];
        }
      }
      setMaps((prev) => ({ ...prev, villages: vMap, zones: zMap }));
    });
  }, [isRtl]);

  // Keep the search box in sync with back/forward navigation.
  useEffect(() => {
    setInput(applied.q);
  }, [applied.q]);

  const fetchList = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const params = { ...toQuery(applied), pageSize: 12 };
      if (applied.maxDownPayment && !applied.maxPrice) {
        params.maxPrice = Number(applied.maxDownPayment) * 10;
      }
      const res = await propertyService.list(params);
      const list = res.data?.data ?? [];

      setItems(list);
      setTotal(res.data?.totalCount ?? list.length);
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
      case 'village':
      case 'villageId':
        return `${isRtl ? 'القرية' : t('propertiesPage.village', 'Village')}: ${maps.villages[v] || v}`;
      case 'zone':
      case 'zoneId':
        return `${isRtl ? 'المنطقة' : t('propertiesPage.zone', 'Zone')}: ${maps.zones[v] || v}`;
      case 'buildingNumber':
        return `${t('propertiesPage.buildingNumber', 'Building')}: ${v}`;
      case 'minPrice':
        return `≥ ${Number(v).toLocaleString()} ${t('common.egp', 'EGP')}`;
      case 'maxPrice':
        return `≤ ${Number(v).toLocaleString()} ${t('common.egp', 'EGP')}`;
      case 'maxDownPayment':
        return `${t('propertiesPage.maxDownPayment', 'Down Payment')} ≤ ${Number(v).toLocaleString()} ${t('common.egp', 'EGP')}`;
      case 'installmentYears':
        return `${v}+ ${t('common.years', 'Years')} ${t('propertiesPage.installments', 'Installments')}`;
      case 'deliveryStatus':
        return `${t('propertiesPage.deliveryStatus', 'Handover')}: ${v === 'ready' ? t('propertiesPage.readyToMove', 'Ready to Move') : v}`;
      case 'developer':
        return `${t('propertiesPage.developer', 'Developer')}: ${v}`;
      case 'bedrooms':
        return t('search.bedsPlus', { n: v });
      case 'bathrooms':
        return `${v}+ ${t('detailsPage.specsBathrooms', 'Bathrooms')}`;
      case 'minArea':
        return `≥ ${v} ${t('common.sqm', 'm²')}`;
      case 'maxArea':
        return `≤ ${v} ${t('common.sqm', 'm²')}`;
      case 'floor':
        return `${isRtl ? 'الطابق' : 'Floor'}: ${v === '0' ? (isRtl ? 'أرضي' : 'Ground') : v}`;
      case 'finishingStatus':
        return `${isRtl ? 'التشطيب' : 'Finishing'}: ${v}`;
      case 'furnishedStatus':
        return `${isRtl ? 'الفرش' : 'Furnishing'}: ${v}`;
      case 'furnished':
        return t('propertiesPage.furnished', 'Furnished');
      case 'pool':
        return t('propertiesPage.pool', 'Swimming Pool');
      case 'garden':
        return t('propertiesPage.garden', 'Garden');
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
    const filterKeys = [
      'q',
      'purpose',
      'type',
      'villageId',
      'zoneId',
      'village',
      'zone',
      'buildingNumber',
      'minPrice',
      'maxPrice',
      'maxDownPayment',
      'installmentYears',
      'deliveryStatus',
      'developer',
      'bedrooms',
      'bathrooms',
      'minArea',
      'maxArea',
      'floor',
      'finishingStatus',
      'furnishedStatus',
      'furnished',
      'pool',
      'garden',
      'seaView',
      'beachAccess',
      'parking',
      'featured',
    ];
    for (const key of filterKeys) {
      const v = applied[key];
      if (typeof v === 'boolean') {
        if (v) list.push({ key, label: getChipLabel(key, true) });
      } else if (v !== '' && v != null) {
        list.push({ key, label: getChipLabel(key, v) });
      }
    }
    return list;
  }, [applied, getChipLabel]);

  const appliedFilters = useMemo(() => {
    const res = { ...EMPTY_FILTERS };
    for (const k of Object.keys(EMPTY_FILTERS)) {
      if (applied[k] !== undefined) res[k] = applied[k];
    }
    return res;
  }, [applied]);

  const changePage = (p) => {
    push({ page: p }, false);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const seoTitle = useMemo(() => {
    const bits = [];
    if (applied.type) bits.push(maps.types[applied.type] || applied.type);
    if (applied.purpose) bits.push(`for ${applied.purpose}`);
    if (applied.villageId && maps.villages[applied.villageId]) bits.push(`in ${maps.villages[applied.villageId]}`);
    else if (applied.village) bits.push(`in ${applied.village}`);
    const head = bits.length ? bits.join(' ') : 'North Coast Properties';
    return `${head[0].toUpperCase()}${head.slice(1)} | Darcom`;
  }, [applied, maps.types, maps.villages]);

  // CMS override applies to the unfiltered view only; filtered views keep dynamic titles.
  const cmsSeo = useCmsSeo('properties');
  const isDefaultView = !applied.purpose && !applied.type && !applied.villageId && !applied.village && !applied.q;
  useSeo({
    title: (isDefaultView && cmsSeo?.title) || seoTitle,
    description: (isDefaultView && cmsSeo?.description) || `Browse ${total || ''} verified luxury properties across Egypt's North Coast on Darcom — transparent pricing, direct developer partnerships.`.trim(),
    image: (isDefaultView && cmsSeo?.image) || undefined,
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
            {isRtl ? 'عقارات وقرى الساحل الشمالي الفاخرة' : t('propertiesPage.title', 'Distinguished Residences & Coastal Havens')}
          </h1>
          <p className="properties-sub-title">
            {isRtl ? 'استكشف شاليهات وفلل وبنتهاوس موثقة بالكامل في أرقى قرى الساحل الشمالي برأس الحكمة وسيدي عبد الرحمن.' : t('propertiesPage.subtitle', "Explore verified luxury villas, sea-view chalets, and signature penthouses across Egypt's premier North Coast.")}
          </p>
        </div>

        {/* Quick North Coast Villages Bar */}
        <div className="properties-destinations-bar">
          {northCoastVillages.map((vItem) => {
            const isSelected = (!applied.villageId && !applied.village && !vItem.id) ||
              (applied.villageId && String(applied.villageId) === String(vItem.id)) ||
              (applied.village && applied.village === vItem.slug);
            return (
              <button
                key={vItem.slug || 'all'}
                type="button"
                className={`destination-quick-btn ${isSelected ? 'active' : ''}`}
                onClick={() => push({
                  villageId: vItem.id || '',
                  village: vItem.slug || '',
                  zoneId: '',
                  zone: '',
                  location: '',
                })}
              >
                {vItem.icon && <i className={`bi ${vItem.icon} me-1`}></i>}
                <span>{vItem.name}</span>
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
              placeholder={t('propertiesPage.searchPlaceholder', 'Search compounds, villages, keywords…')}
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

          {/* Request Custom Property Lead Button */}
          <button
            type="button"
            className="btn btn-outline-gold d-none d-md-inline-flex align-items-center"
            onClick={() => setLeadModalOpen(true)}
            title="Request a Custom Property in North Coast"
          >
            <i className="bi bi-send me-1"></i>
            <span>{t('leads.requestPropertyBtn', 'Request Property')}</span>
          </button>

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

          {isBroker && (
            <button
              type="button"
              className="btn btn-sm btn-outline-warning d-none d-md-inline-flex align-items-center gap-1"
              onClick={() => setLeadModalOpen(true)}
              style={{ borderColor: '#d4af37', color: '#d4af37', borderRadius: '20px', padding: '0.35rem 0.85rem' }}
              title={isRtl ? 'اطلب وحدة بمواصفات خاصة' : 'Request Custom Chalet'}
            >
              <i className="bi bi-search-heart"></i>
              <span>{isRtl ? 'مش لاقي الوحدة؟ اطلب مواصفات خاصة' : 'Custom Specs'}</span>
            </button>
          )}

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
            <div className="empty-results-container">
              <EmptyState
                icon="bi-house-search"
                title={t('propertiesPage.noPropertiesFound', 'No properties match your criteria.')}
                message={t('propertiesPage.noPropertiesSub', 'Try broadening your village, adjusting your budget range, or clearing current filters.')}
                actionLabel={t('propertiesPage.resetAllFilters', 'Reset All Filters')}
                onAction={clearAll}
              />
              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-brand"
                  onClick={() => setLeadModalOpen(true)}
                >
                  <i className="bi bi-file-earmark-plus me-1"></i>
                  <span>{t('leads.emptyRequestCta', 'Submit a Custom Property Request')}</span>
                </button>
              </div>
            </div>
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

      {/* Customer Property Requirement Lead Modal */}
      <PropertyRequirementModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        initialPurpose={applied.purpose || 'Sale'}
      />
    </main>
  );
}
