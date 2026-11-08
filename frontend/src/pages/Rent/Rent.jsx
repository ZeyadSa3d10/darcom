import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import PropertyRequirementModal from '../../components/PropertyRequirementModal/PropertyRequirementModal.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { propertyService } from '../../services/propertyService.js';
import { locationService } from '../../services/locationService.js';
import './Rent.css';

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
    bedrooms: pick('bedrooms'),
    bathrooms: pick('bathrooms'),
    minArea: pick('minArea'),
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
    sort: pick('sort'),
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
  };
}

function toQuery(applied) {
  const q = {};
  if (applied.q) q.q = applied.q;
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
  for (const k of ['furnished', 'pool', 'garden', 'seaView', 'beachAccess', 'parking']) {
    if (applied[k]) q[k] = 'true';
  }
  if (applied.sort) q.sort = applied.sort;
  if (applied.page > 1) q.page = String(applied.page);
  return q;
}

export default function Rent() {
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
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [maps, setMaps] = useState({ types: {}, cities: {}, villages: {}, zones: {} });
  const [input, setInput] = useState(applied.q);
  const debounce = useRef(null);
  const resultsRef = useRef(null);

  const sortOptions = [
    { v: '', l: isRtl ? 'الأحدث' : 'Newest' },
    { v: 'price_asc', l: isRtl ? 'السعر: من الأقل للأعلى' : 'Price: Low to High' },
    { v: 'price_desc', l: isRtl ? 'السعر: من الأعلى للأقل' : 'Price: High to Low' },
    { v: 'area_desc', l: isRtl ? 'الأكبر مساحة' : 'Largest Area' },
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

  useEffect(() => {
    setInput(applied.q);
  }, [applied.q]);

  const fetchList = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const res = await propertyService.list({
        ...toQuery(applied),
        purpose: 'rent',
        pageSize: 12,
      });
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

  const getChipLabel = useCallback(
    (key, v) => {
      switch (key) {
        case 'q':
          return `بحث: "${v}"`;
        case 'type':
          return maps.types[v] || v;
        case 'location':
          return maps.cities[v] || v;
        case 'village':
        case 'villageId':
          return `القرية: ${maps.villages[v] || v}`;
        case 'zone':
        case 'zoneId':
          return `المنطقة: ${maps.zones[v] || v}`;
        case 'buildingNumber':
          return `مبنى: ${v}`;
        case 'minPrice':
          return `≥ ${Number(v).toLocaleString()} ج.م`;
        case 'maxPrice':
          return `≤ ${Number(v).toLocaleString()} ج.م`;
        case 'bedrooms':
          return `${v}+ غرف`;
        case 'bathrooms':
          return `${v}+ حمامات`;
        case 'minArea':
          return `≥ ${v} م²`;
        case 'maxArea':
          return `≤ ${v} م²`;
        case 'floor':
          return `الطابق: ${v === '0' ? 'أرضي' : v}`;
        case 'finishingStatus':
          return `التشطيب: ${v}`;
        case 'furnishedStatus':
          return `الفرش: ${v}`;
        case 'furnished':
          return 'مفروش';
        case 'pool':
          return 'حمام سباحة';
        case 'garden':
          return 'حديقة';
        case 'seaView':
          return 'إطلالة بحر';
        case 'beachAccess':
          return 'دخول الشاطئ';
        case 'parking':
          return 'موقف سيارات';
        default:
          return v;
      }
    },
    [maps]
  );

  const chips = useMemo(() => {
    const list = [];
    const filterKeys = [
      'q',
      'type',
      'villageId',
      'zoneId',
      'village',
      'zone',
      'buildingNumber',
      'minPrice',
      'maxPrice',
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
    const res = { ...EMPTY_FILTERS, purpose: 'rent' };
    for (const k of Object.keys(EMPTY_FILTERS)) {
      if (applied[k] !== undefined) res[k] = applied[k];
    }
    return res;
  }, [applied]);

  const changePage = (p) => {
    push({ page: p }, false);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useSeo({
    title: 'وحدات للايجار في الساحل الشمالي | Darcom Luxury Rentals',
    description: `تصفح ${total || ''} وحدة سياحية وعقارية للايجار في الساحل الشمالي.`,
  });

  return (
    <main id="main-content" className="container rent-page">
      <Breadcrumbs items={[{ label: isRtl ? 'الرئيسية' : 'Home', to: '/' }, { label: isRtl ? 'إيجار' : 'Rent' }]} />

      <div className="rent-hero-header">
        <div className="rent-hero-badge">
          <i className="bi bi-key-fill" />
          <span>{isRtl ? 'إيجار سياحي وفاخر' : 'Luxury Rentals'}</span>
        </div>
        <h1 className="rent-hero-title">
          {isRtl ? 'اعثر على منزل أحلامك للإيجار في الساحل الشمالي' : 'Find Your Dream Rental on the North Coast'}
        </h1>
        <p className="rent-hero-subtitle">
          {isRtl
            ? 'شاليهات، شقق وفيلات متحقق منها ومسجلة رسمياً بأرقى قرى الساحل الشمالي'
            : 'Verified chalets, apartments, and villas across premier North Coast villages.'}
        </p>
        <div className="properties-destinations-bar">
          {northCoastVillages.map((vItem) => {
            const isSelected = (!applied.villageId && !applied.village && !vItem.id) ||
              (applied.villageId && String(applied.villageId) === String(vItem.id)) ||
              (applied.village && applied.village === vItem.slug);
            return (
              <button
                key={vItem.slug || 'all'}
                type="button"
                className={'destination-quick-btn' + (isSelected ? ' active' : '')}
                onClick={() => push({
                  villageId: vItem.id || '',
                  village: vItem.slug || '',
                  zoneId: '',
                  zone: '',
                  location: '',
                })}
              >
                {vItem.icon && <i className={'bi ' + vItem.icon + ' me-1'} />}
                <span>{vItem.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="listing-toolbar-luxury">
        <div className="toolbar-count-col">
          {state === 'done' && (
            <div className="results-count-badge">
              <span className="count-num">{total}</span>
              <span className="count-text">{isRtl ? 'وحدة للإيجار' : 'Rentals Available'}</span>
            </div>
          )}
        </div>
        <div className="toolbar-controls">
          <div className="search-input-luxury">
            <i className="bi bi-search search-icon" />
            <input
              type="search"
              placeholder={isRtl ? 'ابحث عن قرية، كمبوند، كلمة دلالية…' : 'Search village, compound…'}
              value={input}
              onChange={onSearchInput}
              aria-label="بحث"
            />
            {input && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setInput('');
                  push({ q: '' });
                }}
              >
                <i className="bi bi-x-circle-fill" />
              </button>
            )}
          </div>

          {/* Request Custom Rental Lead Button */}
          <button
            type="button"
            className="btn btn-outline-gold d-none d-md-inline-flex align-items-center"
            onClick={() => setLeadModalOpen(true)}
            title="طلب وحدة للإيجار بالساحل"
          >
            <i className="bi bi-send me-1"></i>
            <span>{isRtl ? 'طلب وحدة للإيجار' : 'Request Rental'}</span>
          </button>

          <div className="sort-wrapper-luxury">
            <i className="bi bi-arrow-down-up sort-icon" />
            <select value={applied.sort} onChange={(e) => push({ sort: e.target.value })} className="sort-select-luxury">
              {sortOptions.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </select>
          </div>
          <div className="view-toggle-luxury" role="group">
            <button
              type="button"
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
              title={isRtl ? 'شبكي' : 'Grid'}
            >
              <i className="bi bi-grid-fill" />
            </button>
            <button
              type="button"
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              title={isRtl ? 'قائمة' : 'List'}
            >
              <i className="bi bi-view-list" />
            </button>
          </div>
          <button
            type="button"
            className="btn-mobile-filters-trigger d-lg-none"
            onClick={() => setSheetOpen(true)}
          >
            <i className="bi bi-sliders2 me-1" />
            <span>{isRtl ? 'فلاتر' : 'Filters'}</span>
            {chips.length > 0 && <span className="filters-count-pill">{chips.length}</span>}
          </button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="chips-row-luxury">
          <span className="chips-label">{isRtl ? 'الفلاتر النشطة:' : 'Active Filters:'}</span>
          {chips.map((c) => (
            <button key={c.key} type="button" className="chip-luxury" onClick={() => removeChip(c.key)}>
              <span>{c.label}</span>
              <i className="bi bi-x" />
            </button>
          ))}
          <button type="button" className="chip-clear-all" onClick={clearAll}>
            <i className="bi bi-trash3 me-1" />
            <span>{isRtl ? 'مسح الكل' : 'Clear All'}</span>
          </button>
        </div>
      )}

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
                title={isRtl ? 'لا توجد وحدات للإيجار بهذه المعايير' : 'No rental units match your criteria'}
                message={
                  isRtl
                    ? 'جرب اختيار قرية أخرى أو توسيع الميزانية أو إرسال طلب خاص لفريقنا'
                    : 'Try selecting a different village or submitting a custom rental request.'
                }
                actionLabel={isRtl ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                onAction={clearAll}
              />
              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-brand"
                  onClick={() => setLeadModalOpen(true)}
                >
                  <i className="bi bi-file-earmark-plus me-1"></i>
                  <span>{isRtl ? 'إرسال مواصفات طلب إيجار خاص' : 'Submit Rental Requirement'}</span>
                </button>
              </div>
            </div>
          )}
          {state === 'done' && items.length > 0 && view === 'grid' && <PropertyGrid items={items} />}
          {state === 'done' && items.length > 0 && view === 'list' && (
            <div className="results-list">
              {items.map((p) => (
                <PropertyCard key={p.id} property={p} layout="list" />
              ))}
            </div>
          )}
          {state === 'done' && <Pagination page={applied.page} totalPages={totalPages} onChange={changePage} />}
        </div>
      </div>

      {sheetOpen && (
        <Modal title={isRtl ? 'فلترة الوحدات' : 'Filter Rentals'} onClose={() => setSheetOpen(false)} variant="sheet">
          <PropertyFilters applied={appliedFilters} onApply={applyFilters} onClear={clearAll} />
        </Modal>
      )}

      {/* Customer Property Requirement Lead Modal (for Rent) */}
      <PropertyRequirementModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        initialPurpose="Rent"
      />
    </main>
  );
}
