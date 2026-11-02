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
    location: pick('location'),
    minPrice: pick('minPrice'),
    maxPrice: pick('maxPrice'),
    bedrooms: pick('bedrooms'),
    bathrooms: pick('bathrooms'),
    minArea: pick('minArea'),
    furnished: bool('furnished'),
    pool: bool('pool'),
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
  if (applied.location) q.location = applied.location;
  if (applied.minPrice !== '') q.minPrice = applied.minPrice;
  if (applied.maxPrice !== '') q.maxPrice = applied.maxPrice;
  if (applied.bedrooms !== '') q.bedrooms = applied.bedrooms;
  if (applied.bathrooms !== '') q.bathrooms = applied.bathrooms;
  if (applied.minArea !== '') q.minArea = applied.minArea;
  for (const k of ['furnished', 'pool', 'seaView', 'beachAccess', 'parking']) {
    if (applied[k]) q[k] = 'true';
  }
  if (applied.sort) q.sort = applied.sort;
  if (applied.page > 1) q.page = String(applied.page);
  return q;
}

export default function Rent() {
  const { t } = useSettings();
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
    { v: '', l: 'الاحدث' },
    { v: 'price_asc', l: 'السعر: من الاقل للاعلى' },
    { v: 'price_desc', l: 'السعر: من الاعلى للاقل' },
    { v: 'area_desc', l: 'الاكبر مساحة' },
  ];

  const popularDestinations = [
    { name: 'كل المناطق', slug: '', icon: 'bi-grid' },
    { name: 'الساحل الشمالي', slug: 'north-coast', icon: 'bi-umbrella' },
    { name: 'الجونة', slug: 'el-gouna', icon: 'bi-compass' },
    { name: 'العين السخنة', slug: 'ain-sokhna', icon: 'bi-water' },
    { name: 'القاهرة الجديدة', slug: 'new-cairo', icon: 'bi-building' },
    { name: 'الغردقة', slug: 'hurghada', icon: 'bi-sun' },
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

  useEffect(() => { setInput(applied.q); }, [applied.q]);

  const fetchList = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const params = { ...toQuery(applied), purpose: 'rent', pageSize: 12 };
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

  useEffect(() => { fetchList(); }, [fetchList]);

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
    const { purpose: _p, ...rest } = draft;
    push({ ...rest, page: 1 }, false);
    setSheetOpen(false);
  };

  const clearAll = () => { setSearchParams({}); setSheetOpen(false); };

  const removeChip = (key) => {
    push({ [key]: typeof applied[key] === 'boolean' ? false : '', page: 1 }, false);
  };

  const getChipLabel = useCallback((key, v) => {
    const labels = {
      q: 'بحث: "' + v + '"',
      type: maps.types[v] || v,
      location: maps.cities[v] || v,
      minPrice: 'من ' + Number(v).toLocaleString() + ' ج.م',
      maxPrice: 'حتى ' + Number(v).toLocaleString() + ' ج.م',
      bedrooms: v + '+ غرف',
      bathrooms: v + '+ حمامات',
      minArea: '>= ' + v + ' م2',
      furnished: 'مفروش',
      pool: 'حمام سباحة',
      seaView: 'اطلالة بحرية',
      beachAccess: 'شاطئ خاص',
      parking: 'موقف سيارات',
    };
    return labels[key] || v;
  }, [maps]);

  const chips = useMemo(() => {
    const filterKeys = ['q','type','location','minPrice','maxPrice','bedrooms','bathrooms','minArea','furnished','pool','seaView','beachAccess','parking'];
    return filterKeys
      .filter(key => { const v = applied[key]; return v !== '' && v !== false && v != null; })
      .map(key => ({ key, label: getChipLabel(key, applied[key]) }));
  }, [applied, getChipLabel]);

  const changePage = (p) => {
    push({ page: p }, false);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const appliedFilters = { ...EMPTY_FILTERS, purpose: 'rent', ...applied };

  useSeo({
    title: 'وحدات للايجار | داركوم',
    description: 'تصفح وحدات للايجار - شاليهات، شقق، فيلات بأسعار شفافة على منصة داركوم.',
  });

  return (
    <main id="main-content" className="container rent-page">
      <Breadcrumbs items={[{ label: 'الرئيسية', to: '/' }, { label: 'وحدات للايجار' }]} />

      <div className="rent-hero-header">
        <div className="rent-hero-badge">
          <i className="bi bi-key-fill" />
          <span>ايجار</span>
        </div>
        <h1 className="rent-hero-title">اعثر على منزل احلامك للايجار</h1>
        <p className="rent-hero-subtitle">
          شاليهات، شقق وفيلات متحقق منها بأسعار شفافة عبر اجمل مناطق مصر
        </p>
        <div className="properties-destinations-bar">
          {popularDestinations.map((loc) => (
            <button
              key={loc.slug}
              type="button"
              className={'destination-quick-btn' + ((applied.location || '') === loc.slug ? ' active' : '')}
              onClick={() => push({ location: loc.slug })}
            >
              {loc.icon && <i className={'bi ' + loc.icon + ' me-1'} />}
              <span>{loc.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="listing-toolbar-luxury">
        <div className="toolbar-count-col">
          {state === 'done' && (
            <div className="results-count-badge">
              <span className="count-num">{total}</span>
              <span className="count-text">وحدة للايجار</span>
            </div>
          )}
        </div>
        <div className="toolbar-controls">
          <div className="search-input-luxury">
            <i className="bi bi-search search-icon" />
            <input type="search" placeholder="ابحث عن كمبوند، مدينة..." value={input} onChange={onSearchInput} aria-label="بحث" />
            {input && (
              <button type="button" className="search-clear-btn" onClick={() => { setInput(''); push({ q: '' }); }}>
                <i className="bi bi-x-circle-fill" />
              </button>
            )}
          </div>
          <div className="sort-wrapper-luxury">
            <i className="bi bi-arrow-down-up sort-icon" />
            <select value={applied.sort} onChange={(e) => push({ sort: e.target.value })} className="sort-select-luxury">
              {sortOptions.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div className="view-toggle-luxury" role="group">
            <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="شبكي"><i className="bi bi-grid-fill" /></button>
            <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="قائمة"><i className="bi bi-view-list" /></button>
          </div>
          <button type="button" className="btn-mobile-filters-trigger d-lg-none" onClick={() => setSheetOpen(true)}>
            <i className="bi bi-sliders2 me-1" />
            <span>فلاتر</span>
            {chips.length > 0 && <span className="filters-count-pill">{chips.length}</span>}
          </button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="chips-row-luxury">
          <span className="chips-label">الفلاتر النشطة:</span>
          {chips.map((c) => (
            <button key={c.key} type="button" className="chip-luxury" onClick={() => removeChip(c.key)}>
              <span>{c.label}</span><i className="bi bi-x" />
            </button>
          ))}
          <button type="button" className="chip-clear-all" onClick={clearAll}>
            <i className="bi bi-trash3 me-1" /><span>مسح الكل</span>
          </button>
        </div>
      )}

      <div className="listing-layout" ref={resultsRef}>
        <aside className="d-none d-lg-block listing-sidebar-luxury">
          <PropertyFilters applied={appliedFilters} onApply={applyFilters} onClear={clearAll} hidePurpose />
        </aside>
        <div className="listing-results">
          {state === 'loading' && <LoadingSkeleton variant="card" count={6} />}
          {state === 'error' && <ErrorState error={error} onRetry={fetchList} />}
          {state === 'done' && items.length === 0 && (
            <EmptyState icon="bi-house-search" title="لا توجد وحدات للايجار بهذه المعايير" message="جرب توسيع نطاق البحث او تغيير الفلاتر" actionLabel="اعادة ضبط الفلاتر" onAction={clearAll} />
          )}
          {state === 'done' && items.length > 0 && view === 'grid' && <PropertyGrid items={items} />}
          {state === 'done' && items.length > 0 && view === 'list' && (
            <div className="results-list">{items.map((p) => <PropertyCard key={p.id} property={p} layout="list" />)}</div>
          )}
          {state === 'done' && <Pagination page={applied.page} totalPages={totalPages} onChange={changePage} />}
        </div>
      </div>

      {sheetOpen && (
        <Modal title="فلترة الوحدات" onClose={() => setSheetOpen(false)} variant="sheet">
          <PropertyFilters applied={appliedFilters} onApply={applyFilters} onClear={clearAll} hidePurpose />
        </Modal>
      )}
    </main>
  );
}
