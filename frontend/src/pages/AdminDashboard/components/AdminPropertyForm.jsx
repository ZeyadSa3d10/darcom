import { useEffect, useMemo, useState } from 'react';
import FormField from '../../../components/FormField/FormField.jsx';
import { locationService } from '../../../services/locationService.js';

const PURPOSES = ['Sale', 'Rent', 'Investment'];
const FURNISHED = ['Fully Furnished', 'Semi Furnished', 'Unfurnished'];
const FINISHING = ['Super Lux', 'Ultra Super Lux', 'Lux', 'Semi Finished', 'Core & Shell'];
const FLAGS = [
  ['parking', 'Parking'],
  ['garden', 'Garden'],
  ['pool', 'Pool'],
  ['seaView', 'Sea view'],
  ['beachAccess', 'Beach access'],
];

const BLANK = {
  title: '', description: '', propertyTypeId: '', purpose: 'Sale', price: '', currency: 'EGP',
  area: '', bedrooms: '', bathrooms: '', floor: '', totalFloors: '', builtYear: '',
  furnishedStatus: '', finishingStatus: '',
  parking: false, garden: false, pool: false, seaView: false, beachAccess: false,
  locationId: '', address: '', developer: '',
};

const numOrNull = (v) => (v === '' || v == null ? null : Number(v));
const strOrNull = (v) => {
  const s = (v ?? '').toString().trim();
  return s ? s : null;
};

// Details DTO carries names/slugs (no ids) — resolve back to lookup ids.
function fromDetails(d, types, locations) {
  if (!d) return { ...BLANK };
  const typeId = types.find((t) =>
    (t.slug && d.propertyTypeSlug && t.slug.toLowerCase() === d.propertyTypeSlug.toLowerCase()) ||
    (t.name && d.propertyType && t.name.toLowerCase() === d.propertyType.toLowerCase())
  )?.id ?? '';
  const locId = locations.find((l) =>
    l.name && d.location && l.name.toLowerCase() === d.location.toLowerCase() &&
    (!d.city || !l.city || l.city.toLowerCase() === d.city.toLowerCase())
  )?.id ?? '';
  const purpose = PURPOSES.find((p) => p.toLowerCase() === (d.purpose || '').toLowerCase()) ?? 'Sale';
  return {
    title: d.title ?? '', description: d.description ?? '', propertyTypeId: typeId === '' ? '' : String(typeId),
    purpose, price: d.price ?? '', currency: d.currency ?? 'EGP',
    area: d.area ?? '', bedrooms: d.bedrooms ?? '', bathrooms: d.bathrooms ?? '',
    floor: d.floor ?? '', totalFloors: d.totalFloors ?? '', builtYear: d.builtYear ?? '',
    furnishedStatus: d.furnishedStatus ?? '', finishingStatus: d.finishingStatus ?? '',
    parking: !!d.parking, garden: !!d.garden, pool: !!d.pool, seaView: !!d.seaView, beachAccess: !!d.beachAccess,
    locationId: locId === '' ? '' : String(locId), address: d.address ?? '', developer: d.developer ?? '',
  };
}

/**
 * Shared admin property form (Add + Edit). Same contract as
 * POST/PUT /api/properties: numbers-or-null, trimmed strings-or-null.
 */
export default function AdminPropertyForm({ initial = null, submitLabel = 'Save', saving = false, serverErrors = {}, onSubmit, idPrefix = 'apf' }) {
  const [types, setTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ ...BLANK });
  const [primed, setPrimed] = useState(false);

  useEffect(() => {
    locationService.getPropertyTypes().then((r) => setTypes(r.data ?? [])).catch(() => setTypes([]));
    locationService.getLocations().then((r) => setLocations(r.data ?? [])).catch(() => setLocations([]));
  }, []);

  // Prefill once lookups arrive (edit mode) so slug→id resolution works.
  useEffect(() => {
    if (!initial || primed) return;
    if (!types.length || !locations.length) return;
    setForm(fromDetails(initial, types, locations));
    setPrimed(true);
  }, [initial, primed, types, locations]);

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
  };

  const errors = useMemo(() => serverErrors || {}, [serverErrors]);
  const id = (k) => `${idPrefix}-${k}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title: form.title.trim(),
      description: strOrNull(form.description),
      propertyTypeId: Number(form.propertyTypeId),
      purpose: form.purpose,
      price: Number(form.price),
      currency: strOrNull(form.currency) || 'EGP',
      area: numOrNull(form.area),
      bedrooms: numOrNull(form.bedrooms),
      bathrooms: numOrNull(form.bathrooms),
      floor: numOrNull(form.floor),
      totalFloors: numOrNull(form.totalFloors),
      builtYear: numOrNull(form.builtYear),
      furnishedStatus: strOrNull(form.furnishedStatus),
      finishingStatus: strOrNull(form.finishingStatus),
      parking: form.parking, garden: form.garden, pool: form.pool,
      seaView: form.seaView, beachAccess: form.beachAccess,
      locationId: Number(form.locationId),
      address: strOrNull(form.address),
      developer: strOrNull(form.developer),
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="apf-form">
      <h6 className="apf-section">Basic info</h6>
      <div className="apf-grid-2">
        <FormField id={id('title')} label="Title" required error={errors.title}>
          <input id={id('title')} className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={form.title} onChange={set('title')} placeholder="Sea-view chalet in Ain Sokhna" />
        </FormField>
        <FormField id={id('price')} label="Price" required error={errors.price}>
          <div className="apf-price-row">
            <input id={id('price')} type="number" min="1" className={`form-control ${errors.price ? 'is-invalid' : ''}`} value={form.price} onChange={set('price')} placeholder="4500000" />
            <select className="form-select" value={form.currency} onChange={set('currency')} aria-label="Currency">
              <option>EGP</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </div>
        </FormField>
      </div>
      <FormField id={id('desc')} label="Description" error={errors.description}>
        <textarea id={id('desc')} rows="3" className="form-control" value={form.description} onChange={set('description')} placeholder="Overview, interior, views, finishing…" />
      </FormField>
      <div className="apf-grid-3">
        <FormField id={id('type')} label="Type" required error={errors.propertyTypeId}>
          <select id={id('type')} className="form-select" value={form.propertyTypeId} onChange={set('propertyTypeId')}>
            <option value="">Select…</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </FormField>
        <FormField id={id('purpose')} label="Purpose" required error={errors.purpose}>
          <select id={id('purpose')} className="form-select" value={form.purpose} onChange={set('purpose')}>
            {PURPOSES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField id={id('location')} label="Location" required error={errors.locationId}>
          <select id={id('location')} className="form-select" value={form.locationId} onChange={set('locationId')}>
            <option value="">Select…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.city}</option>)}
          </select>
        </FormField>
      </div>

      <h6 className="apf-section">Specs</h6>
      <div className="apf-grid-3">
        <FormField id={id('area')} label="Area (m²)" error={errors.area}>
          <input id={id('area')} type="number" min="0" className="form-control" value={form.area} onChange={set('area')} />
        </FormField>
        <FormField id={id('beds')} label="Bedrooms" error={errors.bedrooms}>
          <input id={id('beds')} type="number" min="0" className="form-control" value={form.bedrooms} onChange={set('bedrooms')} />
        </FormField>
        <FormField id={id('baths')} label="Bathrooms" error={errors.bathrooms}>
          <input id={id('baths')} type="number" min="0" className="form-control" value={form.bathrooms} onChange={set('bathrooms')} />
        </FormField>
        <FormField id={id('floor')} label="Floor" error={errors.floor}>
          <input id={id('floor')} type="number" className="form-control" value={form.floor} onChange={set('floor')} />
        </FormField>
        <FormField id={id('tfloors')} label="Total floors" error={errors.totalFloors}>
          <input id={id('tfloors')} type="number" className="form-control" value={form.totalFloors} onChange={set('totalFloors')} />
        </FormField>
        <FormField id={id('year')} label="Built year" error={errors.builtYear}>
          <input id={id('year')} type="number" className="form-control" value={form.builtYear} onChange={set('builtYear')} />
        </FormField>
      </div>
      <div className="apf-grid-2">
        <FormField id={id('furn')} label="Furnished status" error={errors.furnishedStatus}>
          <select id={id('furn')} className="form-select" value={form.furnishedStatus} onChange={set('furnishedStatus')}>
            <option value="">Select…</option>
            {FURNISHED.map((o) => <option key={o}>{o}</option>)}
          </select>
        </FormField>
        <FormField id={id('fin')} label="Finishing" error={errors.finishingStatus}>
          <select id={id('fin')} className="form-select" value={form.finishingStatus} onChange={set('finishingStatus')}>
            <option value="">Select…</option>
            {FINISHING.map((o) => <option key={o}>{o}</option>)}
          </select>
        </FormField>
      </div>
      <span className="apf-label">Features</span>
      <div className="apf-check-grid">
        {FLAGS.map(([k, l]) => (
          <label key={k} className="apf-check-item">
            <input type="checkbox" checked={!!form[k]} onChange={set(k)} />{l}
          </label>
        ))}
      </div>

      <h6 className="apf-section">Contact & extras</h6>
      <div className="apf-grid-2">
        <FormField id={id('address')} label="Address" error={errors.address}>
          <input id={id('address')} className="form-control" value={form.address} onChange={set('address')} />
        </FormField>
        <FormField id={id('developer')} label="Developer / Owner" error={errors.developer}>
          <input id={id('developer')} className="form-control" value={form.developer} onChange={set('developer')} />
        </FormField>
      </div>

      <div className="apf-actions">
        <button type="submit" className="btn btn-brand" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
