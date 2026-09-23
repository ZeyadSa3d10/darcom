import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { cmsService } from '../../../services/cmsService.js';
import './CmsManager.css';

const getCmsTabs = (isRtl) => [
  { id: 'hero', label: isRtl ? 'سلايدر الرئيسية' : 'Hero Slides', icon: 'bi-images' },
  { id: 'cities', label: isRtl ? 'الوجهات والمدن' : 'Cities', icon: 'bi-geo-alt' },
  { id: 'types', label: isRtl ? 'الأنماط المعمارية' : 'Arch Types', icon: 'bi-house' },
  { id: 'premium', label: isRtl ? 'المجموعة الحصرية' : 'Premium', icon: 'bi-gem' },
  { id: 'whyus', label: isRtl ? 'لماذا داركم' : 'Why Us', icon: 'bi-trophy' },
  { id: 'seller', label: isRtl ? 'استشارات الملاك' : 'Seller Advisory', icon: 'bi-megaphone' },
  { id: 'footer', label: isRtl ? 'تذييل الموقع' : 'Footer', icon: 'bi-layout-text-window-reverse' },
  { id: 'settings', label: isRtl ? 'بيانات الموقع' : 'Site Settings', icon: 'bi-gear' },
  { id: 'seo', label: isRtl ? 'تهيئة محركات البحث' : 'SEO', icon: 'bi-search' },
];

// --- Default data structures ---
const DEFAULT_SLIDE = {
  key: '', image: '', fallback: '', kicker: '', badge: '', tagline: '', tint: '20, 110, 120',
};
const DEFAULT_CITY = { name: '', slug: '', blurb: '', img: '' };
const DEFAULT_PREMIUM = {
  image: '', kicker: 'Exclusive', kickerAr: 'حصري ومميز', title: 'The premium collection', titleAr: 'المجموعة الحصرية',
  subtitle: '', subtitleAr: '', points: ['', '', ''],
};
const DEFAULT_SELLER = {
  headline: '', headlineEn: '', lead: '', leadEn: '',
  stats: [{ icon: 'bi-clock-history', value: '', label: '', labelEn: '' }],
  primaryBtn: { text: '', link: '/sell' },
  secondaryBtn: { text: '', link: '/contact' },
};
const DEFAULT_SETTINGS = {
  siteName: 'Darcom', phone: '', email: '', whatsapp: '', address: '', addressEn: '',
  socials: { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' },
};
const DEFAULT_SEO = {
  home: { title: '', description: '', image: '' },
  properties: { title: '', description: '' },
  contact: { title: '', description: '' },
  sell: { title: '', description: '' },
};
const DEFAULT_FOOTER = {
  aboutAr: '', aboutEn: '', verifiedBadgeAr: '', verifiedBadgeEn: '',
};

// --- Field component ---
function Field({ label, value, onChange, type = 'text', placeholder = '', dir }) {
  return (
    <div className="cms-field">
      {label && <label>{label}</label>}
      {type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
        />
      )}
    </div>
  );
}

// 1. Hero Carousel Editor
function HeroEditor({ data, setData, isRtl }) {
  const slides = Array.isArray(data) ? data : [];
  const update = (i, key, val) => {
    const next = [...slides];
    next[i] = { ...next[i], [key]: val };
    setData(next);
  };
  const add = () => setData([...slides, { ...DEFAULT_SLIDE, key: `slide-${Date.now()}` }]);
  const remove = (i) => setData(slides.filter((_, idx) => idx !== i));

  return (
    <div className="cms-editor">
      <h3>{isRtl ? 'سلايدر العرض بالصفحة الرئيسية' : 'Hero Carousel Slides'}</h3>
      <p className="editor-desc">
        {isRtl
          ? 'إدارة صور ونصوص وخلفيات العرض التفاعلي في أعلى الصفحة الرئيسية.'
          : 'Manage the homepage hero carousel images, text, and tint colors.'}
      </p>
      {slides.map((s, i) => (
        <div key={i} className="cms-item-card">
          <div className="item-header">
            <span className="item-number">{isRtl ? `شريحة ${i + 1}` : `Slide ${i + 1}`}</span>
            <button type="button" className="cms-remove-btn" onClick={() => remove(i)}>
              <i className="bi bi-trash"></i> {isRtl ? 'حذف الشريحة' : 'Remove'}
            </button>
          </div>
          {s.image && (
            <img
              src={s.image}
              alt="Slide preview"
              className="item-thumb"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="cms-item-grid">
            <Field
              label={isRtl ? 'المعرف الفريد (Key)' : 'Key (unique ID)'}
              value={s.key}
              onChange={(v) => update(i, 'key', v)}
              placeholder="sokhna"
              dir="ltr"
            />
            <Field
              label={isRtl ? 'رابط الصورة الرئيسية' : 'Image URL'}
              value={s.image}
              onChange={(v) => update(i, 'image', v)}
              placeholder="https://..."
              dir="ltr"
            />
            <Field
              label={isRtl ? 'رابط الصورة البديلة (Fallback)' : 'Fallback Image'}
              value={s.fallback}
              onChange={(v) => update(i, 'fallback', v)}
              placeholder="https://..."
              dir="ltr"
            />
            <Field
              label={isRtl ? 'درجة التعتيم اللوني (R,G,B)' : 'Tint (R,G,B)'}
              value={s.tint}
              onChange={(v) => update(i, 'tint', v)}
              placeholder="20, 110, 120"
              dir="ltr"
            />
            <Field
              label={isRtl ? 'العنوان الترويجي الصغير (Kicker)' : 'Kicker'}
              value={s.kicker}
              onChange={(v) => update(i, 'kicker', v)}
              placeholder={isRtl ? 'العين السخنة · البحر الأحمر' : 'Ain Sokhna · Red Sea'}
            />
            <Field
              label={isRtl ? 'الشارة التوضيحية (Badge)' : 'Badge'}
              value={s.badge}
              onChange={(v) => update(i, 'badge', v)}
              placeholder={isRtl ? 'بورتو السخنة والجلالة' : 'Porto Sokhna & Galala'}
            />
          </div>
          <Field
            label={isRtl ? 'النص التعريفي المميز (Tagline)' : 'Tagline'}
            value={s.tagline}
            onChange={(v) => update(i, 'tagline', v)}
            placeholder={isRtl ? 'شاليهات شاطئية مع وصول مباشر للبحر…' : 'Waterfront chalets…'}
          />
        </div>
      ))}
      <button type="button" className="cms-add-btn" onClick={add}>
        <i className="bi bi-plus-circle"></i> {isRtl ? 'إضافة شريحة جديدة' : 'Add Slide'}
      </button>
    </div>
  );
}

// 2. Cities Mosaic Editor
function CitiesEditor({ data, setData, isRtl }) {
  const cities = Array.isArray(data) ? data : [];
  const update = (i, key, val) => {
    const next = [...cities];
    next[i] = { ...next[i], [key]: val };
    setData(next);
  };
  const add = () => setData([...cities, { ...DEFAULT_CITY }]);
  const remove = (i) => setData(cities.filter((_, idx) => idx !== i));

  return (
    <div className="cms-editor">
      <h3>{isRtl ? 'وجهات ومواقع الصفحة الرئيسية' : 'Location Mosaic Cities'}</h3>
      <p className="editor-desc">
        {isRtl
          ? 'تعديل المدن والوجهات المعروضة في شبكة الوجهات المميزة بالرئيسية.'
          : 'Edit the cities shown in the "Popular Locations" mosaic on the homepage.'}
      </p>
      {cities.map((c, i) => (
        <div key={i} className="cms-item-card">
          <div className="item-header">
            <span className="item-number">{isRtl ? `وجهة ${i + 1}` : `City ${i + 1}`}</span>
            <button type="button" className="cms-remove-btn" onClick={() => remove(i)}>
              <i className="bi bi-trash"></i> {isRtl ? 'حذف الوجهة' : 'Remove'}
            </button>
          </div>
          {c.img && (
            <img
              src={c.img}
              alt={c.name}
              className="item-thumb"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="cms-item-grid">
            <Field
              label={isRtl ? 'اسم الوجهة' : 'Name'}
              value={c.name}
              onChange={(v) => update(i, 'name', v)}
              placeholder={isRtl ? 'العين السخنة' : 'Ain Sokhna'}
            />
            <Field
              label={isRtl ? 'الرابط التعريفي (Slug)' : 'Slug (URL)'}
              value={c.slug}
              onChange={(v) => update(i, 'slug', v)}
              placeholder="ain-sokhna"
              dir="ltr"
            />
            <Field
              label={isRtl ? 'الوصف السريع' : 'Blurb'}
              value={c.blurb}
              onChange={(v) => update(i, 'blurb', v)}
              placeholder={isRtl ? 'عطلات نهاية الأسبوع على البحر الأحمر، ساعة من القاهرة' : 'Red Sea weekends...'}
            />
            <Field
              label={isRtl ? 'رابط الصورة' : 'Image URL'}
              value={c.img}
              onChange={(v) => update(i, 'img', v)}
              placeholder="https://..."
              dir="ltr"
            />
          </div>
        </div>
      ))}
      <button type="button" className="cms-add-btn" onClick={add}>
        <i className="bi bi-plus-circle"></i> {isRtl ? 'إضافة وجهة جديدة' : 'Add City'}
      </button>
    </div>
  );
}

// 3. Types Editor
function normalizeTypeRow(t) {
  const m = t && typeof t === 'object' ? t : {};
  return {
    slug: m.slug || '',
    image: m.image || '',
    fallback: m.fallback || '',
    icon: m.icon || 'bi-house',
    accentTag: m.accentTag || '',
    accentTagAr: m.accentTagAr || '',
    defaultTagline: m.defaultTagline || m.tagline || '',
    arTagline: m.arTagline || '',
  };
}

function TypesEditor({ data, setData, isRtl }) {
  const rows = useMemo(() => {
    if (Array.isArray(data)) return data.map(normalizeTypeRow);
    if (data && typeof data === 'object') {
      return Object.entries(data).map(([slug, m]) => normalizeTypeRow({ ...(m || {}), slug }));
    }
    return [];
  }, [data]);

  const commit = (nextRows) => {
    const obj = {};
    for (const r of nextRows) {
      const slug = (r.slug || '').trim().toLowerCase();
      if (!slug) continue;
      obj[slug] = {
        image: r.image || '',
        fallback: r.fallback || '',
        icon: r.icon || 'bi-house',
        accentTag: r.accentTag || '',
        accentTagAr: r.accentTagAr || '',
        defaultTagline: r.defaultTagline || '',
        arTagline: r.arTagline || '',
      };
    }
    setData(obj);
  };

  const update = (i, key, val) => {
    const next = rows.map((r) => ({ ...r }));
    next[i] = { ...next[i], [key]: val };
    commit(next);
  };
  const add = () => commit([...rows, { ...normalizeTypeRow({}), slug: '' }]);
  const remove = (i) => commit(rows.filter((_, idx) => idx !== i));

  return (
    <div className="cms-editor">
      <h3>{isRtl ? 'الأنماط المعمارية في الصفحة الرئيسية' : 'Architectural Types'}</h3>
      <p className="editor-desc">
        {isRtl
          ? 'تعديل كروت الأنماط المعمارية (شاليهات، فلل، بنتهاوس، تاون هاوس، إلخ).'
          : 'Edit property type cards shown on the homepage carousel. Slug must match a real property type.'}
      </p>
      {rows.map((t, i) => (
        <div key={i} className="cms-item-card">
          <div className="item-header">
            <span className="item-number">
              {t.slug ? (isRtl ? `النمط: ${t.slug}` : `Type · ${t.slug}`) : (isRtl ? `النمط ${i + 1}` : `Type ${i + 1}`)}
            </span>
            <button type="button" className="cms-remove-btn" onClick={() => remove(i)}>
              <i className="bi bi-trash"></i> {isRtl ? 'حذف النمط' : 'Remove'}
            </button>
          </div>
          <div className="cms-item-grid">
            <Field
              label={isRtl ? 'المعرف المعماري (Slug) *' : 'Slug *'}
              value={t.slug}
              onChange={(v) => update(i, 'slug', v)}
              placeholder="chalet"
              dir="ltr"
            />
            <Field
              label={isRtl ? 'رابط الصورة' : 'Image URL'}
              value={t.image}
              onChange={(v) => update(i, 'image', v)}
              placeholder="https://..."
              dir="ltr"
            />
            <Field
              label={isRtl ? 'الصورة البديلة' : 'Fallback Image'}
              value={t.fallback}
              onChange={(v) => update(i, 'fallback', v)}
              placeholder="https://..."
              dir="ltr"
            />
            <Field
              label={isRtl ? 'رمز الأيقونة (Bootstrap)' : 'Icon (Bootstrap)'}
              value={t.icon}
              onChange={(v) => update(i, 'icon', v)}
              placeholder="bi-water"
              dir="ltr"
            />
            <Field
              label={isRtl ? 'شارة التمييز (إنجليزي)' : 'Accent Tag (EN)'}
              value={t.accentTag}
              onChange={(v) => update(i, 'accentTag', v)}
              placeholder="Beachfront Living"
            />
            <Field
              label={isRtl ? 'شارة التمييز (عربي)' : 'Accent Tag (AR)'}
              value={t.accentTagAr}
              onChange={(v) => update(i, 'accentTagAr', v)}
              placeholder="شواطئ خاصة"
            />
            <Field
              label={isRtl ? 'النص التسويقي (إنجليزي)' : 'Tagline (EN)'}
              value={t.defaultTagline}
              onChange={(v) => update(i, 'defaultTagline', v)}
            />
            <Field
              label={isRtl ? 'النص التسويقي (عربي)' : 'Tagline (AR)'}
              value={t.arTagline}
              onChange={(v) => update(i, 'arTagline', v)}
            />
          </div>
        </div>
      ))}
      <button type="button" className="cms-add-btn" onClick={add}>
        <i className="bi bi-plus-circle"></i> {isRtl ? 'إضافة نمط معماري' : 'Add Type'}
      </button>
    </div>
  );
}

// 4. Premium Section Editor
function normalizePremiumPoint(p) {
  if (typeof p === 'string') return { icon: 'bi-patch-check', text: p, textAr: '' };
  const o = p && typeof p === 'object' ? p : {};
  return { icon: o.icon || 'bi-patch-check', text: o.text || '', textAr: o.textAr || '' };
}

function PremiumEditor({ data, setData, isRtl }) {
  const d = data && typeof data === 'object' && !Array.isArray(data) ? data : { ...DEFAULT_PREMIUM };
  const set = (key, val) => setData({ ...d, [key]: val });
  const points = (Array.isArray(d.points) ? d.points : []).map(normalizePremiumPoint);
  const updatePoint = (i, key, val) => {
    const next = points.map((p) => ({ ...p }));
    next[i] = { ...next[i], [key]: val };
    set('points', next);
  };
  const addPoint = () => set('points', [...points, { icon: 'bi-patch-check', text: '', textAr: '' }]);
  const removePoint = (i) => set('points', points.filter((_, idx) => idx !== i));

  return (
    <div className="cms-editor">
      <h3>{isRtl ? 'المجموعة الحصرية (Premium Collection)' : 'Premium Section'}</h3>
      <p className="editor-desc">
        {isRtl
          ? 'تعديل نصوص وصور قسم الفخامة الداكن بالصفحة الرئيسية.'
          : 'Edit the dark split "Premium Collection" section content (EN + AR).'}
      </p>
      <div className="cms-item-grid">
        <Field
          label={isRtl ? 'العنوان الصغير (إنجليزي)' : 'Kicker (EN)'}
          value={d.kicker}
          onChange={(v) => set('kicker', v)}
          placeholder="Exclusive"
        />
        <Field
          label={isRtl ? 'العنوان الصغير (عربي)' : 'Kicker (AR)'}
          value={d.kickerAr}
          onChange={(v) => set('kickerAr', v)}
          placeholder="حصري ومميز"
        />
        <Field
          label={isRtl ? 'العنوان الرئيسي (إنجليزي)' : 'Title (EN)'}
          value={d.title}
          onChange={(v) => set('title', v)}
          placeholder="The premium collection"
        />
        <Field
          label={isRtl ? 'العنوان الرئيسي (عربي)' : 'Title (AR)'}
          value={d.titleAr}
          onChange={(v) => set('titleAr', v)}
          placeholder="المجموعة الحصرية الاستثنائية"
        />
      </div>
      <Field
        label={isRtl ? 'الوصف الفرعي (إنجليزي)' : 'Subtitle (EN)'}
        value={d.subtitle || d.description}
        onChange={(v) => set('subtitle', v)}
        type="textarea"
      />
      <Field
        label={isRtl ? 'الوصف الفرعي (عربي)' : 'Subtitle (AR)'}
        value={d.subtitleAr}
        onChange={(v) => set('subtitleAr', v)}
        type="textarea"
      />
      <Field
        label={isRtl ? 'رابط الصورة' : 'Image URL'}
        value={d.image}
        onChange={(v) => set('image', v)}
        placeholder="https://..."
        dir="ltr"
      />
      <h4>{isRtl ? 'نقاط الثقة والضمانات' : 'Trust Points'}</h4>
      {points.map((p, i) => (
        <div key={i} className="cms-item-card">
          <div className="item-header">
            <span className="item-number">{isRtl ? `نقطة ${i + 1}` : `Point ${i + 1}`}</span>
            <button type="button" className="cms-remove-btn" onClick={() => removePoint(i)}>
              <i className="bi bi-trash"></i> {isRtl ? 'حذف' : 'Remove'}
            </button>
          </div>
          <div className="cms-item-grid">
            <Field
              label={isRtl ? 'الأيقونة' : 'Icon'}
              value={p.icon}
              onChange={(v) => updatePoint(i, 'icon', v)}
              placeholder="bi-patch-check"
              dir="ltr"
            />
            <Field
              label={isRtl ? 'النص (إنجليزي)' : 'Text (EN)'}
              value={p.text}
              onChange={(v) => updatePoint(i, 'text', v)}
            />
            <Field
              label={isRtl ? 'النص (عربي)' : 'Text (AR)'}
              value={p.textAr}
              onChange={(v) => updatePoint(i, 'textAr', v)}
            />
          </div>
        </div>
      ))}
      <button type="button" className="cms-add-btn" onClick={addPoint}>
        <i className="bi bi-plus-circle"></i> {isRtl ? 'إضافة نقطة ثقة' : 'Add Point'}
      </button>
    </div>
  );
}

// 5. Why Us Editor
function normalizeWhyItem(item) {
  const o = item && typeof item === 'object' ? item : {};
  return {
    num: o.num || '',
    title: o.title || '',
    titleAr: o.titleAr || '',
    desc: o.desc || o.description || '',
    descAr: o.descAr || '',
  };
}

function WhyUsEditor({ data, setData, isRtl }) {
  const rawItems = Array.isArray(data) ? data : [];
  const items = rawItems.map(normalizeWhyItem);
  const update = (i, key, val) => {
    const next = items.map((x) => ({ ...x }));
    next[i] = { ...next[i], [key]: val };
    setData(next);
  };
  const add = () => setData([...items, { num: `0${items.length + 1}`, title: '', titleAr: '', desc: '', descAr: '' }]);
  const remove = (i) => setData(items.filter((_, idx) => idx !== i));

  return (
    <div className="cms-editor">
      <h3>{isRtl ? 'قسم لماذا داركم (Why Darcom)' : 'Why Darcom'}</h3>
      <p className="editor-desc">
        {isRtl
          ? 'تعديل نقاط التميز والضمانات المعروضة للعملاء بالصفحة الرئيسية.'
          : 'Edit the numbered "Why Us" section items (EN + AR).'}
      </p>
      {items.map((item, i) => (
        <div key={i} className="cms-item-card">
          <div className="item-header">
            <span className="item-number">{item.num || `0${i + 1}`}</span>
            <button type="button" className="cms-remove-btn" onClick={() => remove(i)}>
              <i className="bi bi-trash"></i> {isRtl ? 'حذف العنصر' : 'Remove'}
            </button>
          </div>
          <div className="cms-item-grid">
            <Field
              label={isRtl ? 'الرقم التسلسلي' : 'Number'}
              value={item.num}
              onChange={(v) => update(i, 'num', v)}
              placeholder={`0${i + 1}`}
              dir="ltr"
            />
          </div>
          <div className="cms-item-grid">
            <Field
              label={isRtl ? 'العنوان (إنجليزي)' : 'Title (EN)'}
              value={item.title}
              onChange={(v) => update(i, 'title', v)}
            />
            <Field
              label={isRtl ? 'العنوان (عربي)' : 'Title (AR)'}
              value={item.titleAr}
              onChange={(v) => update(i, 'titleAr', v)}
            />
          </div>
          <Field
            label={isRtl ? 'الوصف (إنجليزي)' : 'Description (EN)'}
            value={item.desc}
            onChange={(v) => update(i, 'desc', v)}
            type="textarea"
          />
          <Field
            label={isRtl ? 'الوصف (عربي)' : 'Description (AR)'}
            value={item.descAr}
            onChange={(v) => update(i, 'descAr', v)}
            type="textarea"
          />
        </div>
      ))}
      <button type="button" className="cms-add-btn" onClick={add}>
        <i className="bi bi-plus-circle"></i> {isRtl ? 'إضافة ميزة جديدة' : 'Add Item'}
      </button>
    </div>
  );
}

// 6. Seller Advisory Editor
function normalizeSellerStat(s) {
  const o = s && typeof s === 'object' ? s : {};
  return { icon: o.icon || 'bi-star', value: o.value || '', label: o.label || '', labelEn: o.labelEn || '' };
}

function SellerEditor({ data, setData, isRtl }) {
  const d = data && typeof data === 'object' ? data : { ...DEFAULT_SELLER };
  const set = (key, val) => setData({ ...d, [key]: val });
  const stats = (Array.isArray(d.stats) ? d.stats : []).map(normalizeSellerStat);
  const updateStat = (i, key, val) => {
    const next = stats.map((s) => ({ ...s }));
    next[i] = { ...next[i], [key]: val };
    set('stats', next);
  };
  const addStat = () => set('stats', [...stats, { icon: 'bi-star', value: '', label: '', labelEn: '' }]);
  const removeStat = (i) => set('stats', stats.filter((_, idx) => idx !== i));

  return (
    <div className="cms-editor">
      <h3>{isRtl ? 'قسم استشارات الملاك والبيع' : 'Seller Advisory Section'}</h3>
      <p className="editor-desc">
        {isRtl
          ? 'تعديل العناوين والإحصائيات الخاصة بخدمات بيع العقارات الفاخرة.'
          : 'Edit the seller CTA section on the homepage (EN + AR).'}
      </p>
      <Field
        label={isRtl ? 'العنوان الرئيسي (عربي)' : 'Headline (AR)'}
        value={d.headline}
        onChange={(v) => set('headline', v)}
        type="textarea"
      />
      <Field
        label={isRtl ? 'العنوان الرئيسي (إنجليزي)' : 'Headline (EN)'}
        value={d.headlineEn}
        onChange={(v) => set('headlineEn', v)}
        type="textarea"
      />
      <Field
        label={isRtl ? 'النص التمهيدي (عربي)' : 'Lead Text (AR)'}
        value={d.lead}
        onChange={(v) => set('lead', v)}
        type="textarea"
      />
      <Field
        label={isRtl ? 'النص التمهيدي (إنجليزي)' : 'Lead Text (EN)'}
        value={d.leadEn}
        onChange={(v) => set('leadEn', v)}
        type="textarea"
      />
      <h4>{isRtl ? 'الإحصائيات والأرقام' : 'Stats'}</h4>
      {stats.map((s, i) => (
        <div key={i} className="cms-item-card">
          <div className="item-header">
            <span className="item-number">{isRtl ? `إحصائية ${i + 1}` : `Stat ${i + 1}`}</span>
            <button type="button" className="cms-remove-btn" onClick={() => removeStat(i)}>
              <i className="bi bi-trash"></i> {isRtl ? 'حذف' : 'Remove'}
            </button>
          </div>
          <div className="cms-item-grid">
            <Field
              label={isRtl ? 'الأيقونة' : 'Icon'}
              value={s.icon}
              onChange={(v) => updateStat(i, 'icon', v)}
              placeholder="bi-clock-history"
              dir="ltr"
            />
            <Field
              label={isRtl ? 'القيمة / الرقم' : 'Value'}
              value={s.value}
              onChange={(v) => updateStat(i, 'value', v)}
              placeholder="48h"
            />
            <Field
              label={isRtl ? 'النص التوضيحي (عربي)' : 'Label (AR)'}
              value={s.label}
              onChange={(v) => updateStat(i, 'label', v)}
              placeholder="فحص وتقييم عقاري فوري"
            />
            <Field
              label={isRtl ? 'النص التوضيحي (إنجليزي)' : 'Label (EN)'}
              value={s.labelEn}
              onChange={(v) => updateStat(i, 'labelEn', v)}
              placeholder="Instant Valuation"
            />
          </div>
        </div>
      ))}
      <button type="button" className="cms-add-btn" onClick={addStat}>
        <i className="bi bi-plus-circle"></i> {isRtl ? 'إضافة إحصائية' : 'Add Stat'}
      </button>
      <h4>{isRtl ? 'أزرار الإجراءات' : 'Buttons'}</h4>
      <div className="cms-item-grid">
        <Field
          label={isRtl ? 'نص الزر الأساسي' : 'Primary Button Text'}
          value={d.primaryBtn?.text}
          onChange={(v) => set('primaryBtn', { ...d.primaryBtn, text: v })}
        />
        <Field
          label={isRtl ? 'رابط الزر الأساسي' : 'Primary Button Link'}
          value={d.primaryBtn?.link}
          onChange={(v) => set('primaryBtn', { ...d.primaryBtn, link: v })}
          dir="ltr"
        />
        <Field
          label={isRtl ? 'نص الزر الثانوي' : 'Secondary Button Text'}
          value={d.secondaryBtn?.text}
          onChange={(v) => set('secondaryBtn', { ...d.secondaryBtn, text: v })}
        />
        <Field
          label={isRtl ? 'رابط الزر الثانوي' : 'Secondary Button Link'}
          value={d.secondaryBtn?.link}
          onChange={(v) => set('secondaryBtn', { ...d.secondaryBtn, link: v })}
          dir="ltr"
        />
      </div>
    </div>
  );
}

// 7. Footer Editor
function FooterEditor({ data, setData, isRtl }) {
  const d = data && typeof data === 'object' ? data : { ...DEFAULT_FOOTER };
  const set = (key, val) => setData({ ...d, [key]: val });

  return (
    <div className="cms-editor">
      <h3>{isRtl ? 'محتوى تذييل الموقع (Footer)' : 'Footer Content'}</h3>
      <p className="editor-desc">
        {isRtl
          ? 'النبذة التعريفية وحقوق الملكية والتراخيص الرسمية المعروضة أسفل الموقع.'
          : 'Brand blurb and license badge shown in the site footer (EN + AR).'}
      </p>
      <Field
        label={isRtl ? 'نبذة عن المنصة (عربي)' : 'About (AR)'}
        value={d.aboutAr}
        onChange={(v) => set('aboutAr', v)}
        type="textarea"
      />
      <Field
        label={isRtl ? 'نبذة عن المنصة (إنجليزي)' : 'About (EN)'}
        value={d.aboutEn}
        onChange={(v) => set('aboutEn', v)}
        type="textarea"
      />
      <div className="cms-item-grid">
        <Field
          label={isRtl ? 'شارة التوثيق والترخيص (عربي)' : 'License Badge (AR)'}
          value={d.verifiedBadgeAr}
          onChange={(v) => set('verifiedBadgeAr', v)}
        />
        <Field
          label={isRtl ? 'شارة التوثيق والترخيص (إنجليزي)' : 'License Badge (EN)'}
          value={d.verifiedBadgeEn}
          onChange={(v) => set('verifiedBadgeEn', v)}
        />
      </div>
    </div>
  );
}

// 8. Settings Editor
const SOCIAL_KEYS = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'];

function normalizeSettings(data) {
  const d = data && typeof data === 'object' ? { ...data } : { ...DEFAULT_SETTINGS };
  const nested = d.socials && typeof d.socials === 'object' ? { ...d.socials } : {};
  for (const k of SOCIAL_KEYS) {
    if ((nested[k] === undefined || nested[k] === '') && d[k]) nested[k] = d[k];
  }
  return { ...d, socials: nested };
}

function SettingsEditor({ data, setData, isRtl }) {
  const d = normalizeSettings(data);
  const commit = (next) => {
    const clean = { ...next };
    for (const k of SOCIAL_KEYS) delete clean[k];
    setData(clean);
  };
  const set = (key, val) => commit({ ...d, [key]: val });
  const setSocial = (key, val) => commit({ ...d, socials: { ...d.socials, [key]: val } });

  return (
    <div className="cms-editor">
      <h3>{isRtl ? 'بيانات الموقع والتواصل العامة' : 'Site Settings'}</h3>
      <p className="editor-desc">
        {isRtl
          ? 'بيانات الاتصال وروابط منصات التواصل الاجتماعي الرسمية المعروضة بالموقع.'
          : 'Global contact info, social links displayed across the site.'}
      </p>
      <div className="cms-settings-grid">
        <Field
          label={isRtl ? 'اسم المنصة' : 'Site Name'}
          value={d.siteName}
          onChange={(v) => set('siteName', v)}
          placeholder="Darcom"
        />
        <Field
          label={isRtl ? 'رقم الهاتف' : 'Phone'}
          value={d.phone}
          onChange={(v) => set('phone', v)}
          placeholder="+20 ..."
          dir="ltr"
        />
        <Field
          label={isRtl ? 'البريد الإلكتروني' : 'Email'}
          value={d.email}
          onChange={(v) => set('email', v)}
          placeholder="concierge@darcom.eg"
          dir="ltr"
        />
        <Field
          label={isRtl ? 'رقم الواتساب' : 'WhatsApp'}
          value={d.whatsapp}
          onChange={(v) => set('whatsapp', v)}
          placeholder="+20 ..."
          dir="ltr"
        />
        <Field
          label={isRtl ? 'المقر الرئيسي (عربي)' : 'Address (AR)'}
          value={d.address}
          onChange={(v) => set('address', v)}
          placeholder="التجمع الخامس، القاهرة الجديدة"
        />
        <Field
          label={isRtl ? 'المقر الرئيسي (إنجليزي)' : 'Address (EN)'}
          value={d.addressEn}
          onChange={(v) => set('addressEn', v)}
          placeholder="Fifth Settlement, New Cairo, Egypt"
        />
      </div>
      <h4>{isRtl ? 'روابط منصات التواصل الاجتماعي' : 'Social Media Links'}</h4>
      <div className="cms-settings-grid">
        <Field
          label="Facebook"
          value={d.socials?.facebook}
          onChange={(v) => setSocial('facebook', v)}
          placeholder="https://facebook.com/..."
          dir="ltr"
        />
        <Field
          label="Instagram"
          value={d.socials?.instagram}
          onChange={(v) => setSocial('instagram', v)}
          placeholder="https://instagram.com/..."
          dir="ltr"
        />
        <Field
          label="Twitter / X"
          value={d.socials?.twitter}
          onChange={(v) => setSocial('twitter', v)}
          placeholder="https://x.com/..."
          dir="ltr"
        />
        <Field
          label="LinkedIn"
          value={d.socials?.linkedin}
          onChange={(v) => setSocial('linkedin', v)}
          placeholder="https://linkedin.com/..."
          dir="ltr"
        />
        <Field
          label="YouTube"
          value={d.socials?.youtube}
          onChange={(v) => setSocial('youtube', v)}
          placeholder="https://youtube.com/..."
          dir="ltr"
        />
      </div>
    </div>
  );
}

// 9. SEO Editor
function SeoEditor({ data, setData, isRtl }) {
  const d = data && typeof data === 'object' ? data : { ...DEFAULT_SEO };
  const pages = Object.keys(DEFAULT_SEO);

  const getPageLabel = (page) => {
    const map = {
      home: isRtl ? 'الصفحة الرئيسية' : 'Home',
      properties: isRtl ? 'صفحة العقارات' : 'Properties',
      contact: isRtl ? 'صفحة تواصل معنا' : 'Contact Us',
      sell: isRtl ? 'صفحة بيع عقارك' : 'Sell Property',
    };
    return map[page] || page;
  };

  const setPage = (page, key, val) => {
    setData({ ...d, [page]: { ...(d[page] || {}), [key]: val } });
  };

  return (
    <div className="cms-editor">
      <h3>{isRtl ? 'تهيئة محركات البحث (SEO Meta Tags)' : 'SEO Defaults'}</h3>
      <p className="editor-desc">
        {isRtl
          ? 'عناوين الصفحات وأوصاف الميتا لتصدر نتائج البحث لكل صفحة.'
          : 'Default meta tags for each page. Leave blank to use defaults.'}
      </p>
      {pages.map((page) => (
        <div key={page} className="cms-item-card">
          <div className="item-header">
            <strong>{getPageLabel(page)}</strong>
          </div>
          <div className="cms-item-grid">
            <Field
              label={isRtl ? 'عنوان الصفحة (Title Tag)' : 'Title'}
              value={d[page]?.title}
              onChange={(v) => setPage(page, 'title', v)}
              placeholder={`${getPageLabel(page)} | Darcom`}
            />
            <Field
              label={isRtl ? 'صورة المشاركة (OG Image)' : 'OG Image'}
              value={d[page]?.image}
              onChange={(v) => setPage(page, 'image', v)}
              placeholder="https://..."
              dir="ltr"
            />
          </div>
          <Field
            label={isRtl ? 'وصف الميتا (Meta Description)' : 'Meta Description'}
            value={d[page]?.description}
            onChange={(v) => setPage(page, 'description', v)}
            type="textarea"
            placeholder={isRtl ? 'اكتب وصفاً جذاباً للصفحة يظهر في نتائج بحث جوجل…' : 'Description…'}
          />
        </div>
      ))}
    </div>
  );
}

// --- Key-to-editor map ---
const KEY_MAP = {
  hero: 'hero.slides',
  cities: 'home.cities',
  types: 'home.types',
  premium: 'home.premium',
  whyus: 'home.whyus',
  seller: 'home.seller',
  footer: 'footer.content',
  settings: 'site.settings',
  seo: 'site.seo',
};

const EDITORS = {
  hero: HeroEditor,
  cities: CitiesEditor,
  types: TypesEditor,
  premium: PremiumEditor,
  whyus: WhyUsEditor,
  seller: SellerEditor,
  footer: FooterEditor,
  settings: SettingsEditor,
  seo: SeoEditor,
};

const DEFAULTS = {
  hero: [],
  cities: [],
  types: [],
  premium: { ...DEFAULT_PREMIUM },
  whyus: [],
  seller: { ...DEFAULT_SELLER },
  footer: { ...DEFAULT_FOOTER },
  settings: { ...DEFAULT_SETTINGS },
  seo: { ...DEFAULT_SEO },
};

export default function CmsManager() {
  const { isRtl } = useSettings();
  const toast = useToast();
  const [tab, setTab] = useState('hero');
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [saving, setSaving] = useState(false);

  const cmsTabs = useMemo(() => getCmsTabs(isRtl), [isRtl]);
  const contentKey = KEY_MAP[tab];

  const load = useCallback(async (key) => {
    setState('loading');
    try {
      const res = await cmsService.get(key);
      const parsed = res.data?.contentValue ? JSON.parse(res.data.contentValue) : null;
      setData(parsed);
      setState('done');
    } catch (e) {
      if (e?.status === 404 || e?.response?.status === 404) {
        setData(null);
        setState('done');
      } else {
        setState('error');
      }
    }
  }, []);

  useEffect(() => {
    load(contentKey);
  }, [contentKey, load]);

  const save = async () => {
    setSaving(true);
    try {
      await cmsService.upsert({
        contentKey,
        contentValue: JSON.stringify(data ?? DEFAULTS[tab]),
        description: cmsTabs.find((t) => t.id === tab)?.label || tab,
      });
      toast.success(isRtl ? 'تم حفظ التعديلات بنجاح!' : 'Content saved successfully!');
    } catch (e) {
      toast.error(e.response?.data?.message || (isRtl ? 'تعذر حفظ التعديلات.' : 'Failed to save content.'));
    } finally {
      setSaving(false);
    }
  };

  const EditorComponent = EDITORS[tab];
  const editorData = data ?? DEFAULTS[tab];

  return (
    <div className="cms-manager">
      <div className="cms-subtabs">
        {cmsTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <i className={`bi ${t.icon}`}></i>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {state === 'loading' && <LoadingSkeleton count={3} />}
      {state === 'error' && (
        <ErrorState
          error={isRtl ? 'تعذر تحميل محتوى الموقع.' : 'Could not load CMS content.'}
          onRetry={() => load(contentKey)}
        />
      )}
      {state === 'done' && (
        <>
          <EditorComponent data={editorData} setData={setData} isRtl={isRtl} />
          <div className="cms-actions-row">
            <button
              type="button"
              className="btn btn-brand btn-save"
              disabled={saving}
              onClick={save}
            >
              {saving ? (
                <>
                  <i className="bi bi-arrow-repeat spinning"></i>
                  <span>{isRtl ? 'جارٍ الحفظ…' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg"></i>
                  <span>{isRtl ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => load(contentKey)}
              disabled={saving}
            >
              <i className="bi bi-arrow-counterclockwise"></i>
              <span>{isRtl ? 'إعادة التعيين' : 'Reset'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
