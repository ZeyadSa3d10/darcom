import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { purchaseService } from '../../services/purchaseService.js';
import { propertyService } from '../../services/propertyService.js';
import { locationService } from '../../services/locationService.js';
import PropertyValuation from '../../components/PropertyValuation/PropertyValuation.jsx';
import './Sell.css';
import { useSeo } from '../../hooks/useSeo.js';
import { useCmsSeo } from '../../hooks/useCmsSeo.js';

const STATUS_CLASS = {
  Draft: '', PendingReview: '', Published: 'featured', Rejected: '', Archived: '', Sold: 'sold', Rented: 'rented',
};

const BLANK_FORM = {
  title: '', description: '', propertyTypeId: '', purpose: 'Sale', price: '', area: '',
  bedrooms: '', bathrooms: '', floor: '', totalFloors: '', builtYear: '',
  furnishedStatus: '', finishingStatus: '', parking: false, garden: false, pool: false,
  seaView: false, beachAccess: false, locationId: '', address: '', developer: '', contactPhone: '',
};

export default function Sell() {
  const cmsSeo = useCmsSeo('sell');
  useSeo({
    title: cmsSeo?.title || 'Sell your property | Darcom',
    description: cmsSeo?.description || undefined,
    image: cmsSeo?.image || undefined,
  });
  const { user } = useAuth();
  const toast = useToast();
  const canSell = user?.role === 'Seller' || user?.role === 'Agent' || user?.role === 'Admin';

  const [types, setTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [locations, setLocations] = useState([]);

  const [form, setForm] = useState(BLANK_FORM);
  const [amenityIds, setAmenityIds] = useState([]);
  const [features, setFeatures] = useState([{ title: '', value: '' }]);
  const [imageUrls, setImageUrls] = useState([{ url: '', altText: '' }]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [created, setCreated] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mine, setMine] = useState([]);
  const [mineLoading, setMineLoading] = useState(true);

  useEffect(() => {
    locationService.getPropertyTypes().then((r) => setTypes(r.data ?? []));
    locationService.getAmenities().then((r) => setAmenities(r.data ?? []));
    locationService.getLocations().then((r) => setLocations(r.data ?? []));
  }, []);

  const loadMine = useCallback(async () => {
    setMineLoading(true);
    try {
      const res = await purchaseService.myProperties(1, 20);
      setMine(res.data?.data ?? []);
    } catch {
      setMine([]);
    } finally {
      setMineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canSell) loadMine();
    else setMineLoading(false);
  }, [canSell, loadMine]);

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
  };

  const num = (v) => (v === '' ? null : Number(v));

  const handleApplyValuation = ({ price, area, finishing }) => {
    setForm((prev) => ({
      ...prev,
      price: price ? String(price) : prev.price,
      area: area ? String(area) : prev.area,
      finishingStatus: finishing || prev.finishingStatus,
    }));
    toast.success('تم تطبيق التقييم التقديري على نموذج إضافة العقار.');
  };

  const submitDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        propertyTypeId: Number(form.propertyTypeId),
        purpose: form.purpose,
        price: Number(form.price),
        area: num(form.area),
        bedrooms: form.bedrooms === '' ? null : Number(form.bedrooms),
        bathrooms: form.bathrooms === '' ? null : Number(form.bathrooms),
        floor: form.floor === '' ? null : Number(form.floor),
        totalFloors: form.totalFloors === '' ? null : Number(form.totalFloors),
        builtYear: form.builtYear === '' ? null : Number(form.builtYear),
        furnishedStatus: form.furnishedStatus || null,
        finishingStatus: form.finishingStatus || null,
        parking: form.parking, garden: form.garden, pool: form.pool,
        seaView: form.seaView, beachAccess: form.beachAccess,
        locationId: Number(form.locationId),
        address: form.address || null,
        developer: form.developer || null,
        contactPhone: form.contactPhone || null,
        amenityIds,
        features: features.filter((f) => f.title.trim()).map((f) => ({ title: f.title.trim(), value: f.value || null })),
        images: imageUrls.filter((i) => i.url.trim()).map((i) => ({ url: i.url.trim(), altText: i.altText || null })),
        videos: [],
      };
      const res = await purchaseService.submitProperty(payload);
      setCreated(res.data);
      toast.success('Draft created. Add photos, then submit for review.');
      window.scrollTo(0, 0);
    } catch (err) {
      setErrors(mapFieldErrors(err));
      toast.error(err.message || 'Could not save the draft.');
    } finally {
      setSaving(false);
    }
  };

  const uploadFiles = async (e) => {
    const files = [...e.target.files];
    if (!files.length || !created) return;
    setUploading(true);
    try {
      for (const f of files) {
        await propertyService.uploadMedia(created.id, 'image', f);
      }
      toast.success(`${files.length} photo(s) uploaded.`);
      const refreshed = await propertyService.getById(created.id);
      setCreated(refreshed.data);
    } catch (err) {
      toast.error(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const sendForReview = async (id) => {
    try {
      await purchaseService.submitForReview(id);
      toast.success('Submitted for review. Approval usually takes 48 hours.');
      setCreated(null);
      setForm(BLANK_FORM);
      setAmenityIds([]);
      setFeatures([{ title: '', value: '' }]);
      setImageUrls([{ url: '', altText: '' }]);
      loadMine();
    } catch (err) {
      toast.error(err.message || 'Could not submit for review.');
    }
  };

  if (!canSell) {
    return (
      <main id="main-content" className="container sell-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Sell' }]} />
        <EmptyState
          icon="bi-shop"
          title="Seller access needed"
          message="Your account is a buyer account. Contact our team to activate seller access, then list properties with photo uploads and review tracking."
          actionLabel="Contact us"
          actionTo="/contact"
        />
      </main>
    );
  }

  return (
    <main className="container sell-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Sell' }]} />
      <h1 className="font-display">Sell your property</h1>
      <p className="text-meta">Free submission · review within 48 hours · live to thousands of buyers after approval.</p>

      {created ? (
        <section className="sell-card">
          <h2>Draft created: {created.title}</h2>
          <p className="text-meta">Ref {created.referenceNumber} · {created.status}</p>
          <FormField id="sell-upload" label="Upload photos" hint="JPG, PNG or WebP up to 10 MB each.">
            <input id="sell-upload" type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="form-control" onChange={uploadFiles} disabled={uploading} />
          </FormField>
          {uploading && <p className="text-meta">Uploading…</p>}
          <div className="sell-actions">
            <button type="button" className="btn btn-brand" onClick={() => sendForReview(created.id)}>
              Submit for review
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setCreated(null)}>
              Add another property
            </button>
          </div>
        </section>
      ) : (
        <>
          <PropertyValuation onApplyPrice={handleApplyValuation} />

          <form onSubmit={submitDetails} noValidate className="sell-card">
            <h2>Property details</h2>
          <div className="form-grid-2">
            <FormField id="s-title" label="Title" required error={errors.title}>
              <input id="s-title" className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={form.title} onChange={set('title')} />
            </FormField>
            <FormField id="s-price" label="Price (EGP)" required error={errors.price}>
              <input id="s-price" type="number" min="1" className={`form-control ${errors.price ? 'is-invalid' : ''}`} value={form.price} onChange={set('price')} />
            </FormField>
          </div>
          <FormField id="s-desc" label="Description" error={errors.description}>
            <textarea id="s-desc" rows="4" className="form-control" value={form.description} onChange={set('description')} />
          </FormField>
          <div className="form-grid-3">
            <FormField id="s-type" label="Type" required error={errors.propertyTypeId}>
              <select id="s-type" className="form-select" value={form.propertyTypeId} onChange={set('propertyTypeId')}>
                <option value="">Select…</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </FormField>
            <FormField id="s-purpose" label="Purpose" required error={errors.purpose}>
              <select id="s-purpose" className="form-select" value={form.purpose} onChange={set('purpose')}>
                <option>Sale</option>
                <option>Rent</option>
                <option>Investment</option>
              </select>
            </FormField>
            <FormField id="s-location" label="Location" required error={errors.locationId}>
              <select id="s-location" className="form-select" value={form.locationId} onChange={set('locationId')}>
                <option value="">Select…</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.city}</option>)}
              </select>
            </FormField>
          </div>
          <div className="form-grid-3">
            <FormField id="s-area" label="Area (m²)" error={errors.area}>
              <input id="s-area" type="number" min="0" className="form-control" value={form.area} onChange={set('area')} />
            </FormField>
            <FormField id="s-beds" label="Bedrooms" error={errors.bedrooms}>
              <input id="s-beds" type="number" min="0" className="form-control" value={form.bedrooms} onChange={set('bedrooms')} />
            </FormField>
            <FormField id="s-baths" label="Bathrooms" error={errors.bathrooms}>
              <input id="s-baths" type="number" min="0" className="form-control" value={form.bathrooms} onChange={set('bathrooms')} />
            </FormField>
          </div>
          <div className="form-grid-3">
            <FormField id="s-floor" label="Floor" error={errors.floor}>
              <input id="s-floor" type="number" className="form-control" value={form.floor} onChange={set('floor')} />
            </FormField>
            <FormField id="s-tfloors" label="Total floors" error={errors.totalFloors}>
              <input id="s-tfloors" type="number" className="form-control" value={form.totalFloors} onChange={set('totalFloors')} />
            </FormField>
            <FormField id="s-year" label="Built year" error={errors.builtYear}>
              <input id="s-year" type="number" className="form-control" value={form.builtYear} onChange={set('builtYear')} />
            </FormField>
          </div>
          <div className="form-grid-2">
            <FormField id="s-furn" label="Furnished status" error={errors.furnishedStatus}>
              <select id="s-furn" className="form-select" value={form.furnishedStatus} onChange={set('furnishedStatus')}>
                <option value="">Select…</option>
                <option>Fully Furnished</option>
                <option>Semi Furnished</option>
                <option>Unfurnished</option>
              </select>
            </FormField>
            <FormField id="s-fin" label="Finishing" error={errors.finishingStatus}>
              <select id="s-fin" className="form-select" value={form.finishingStatus} onChange={set('finishingStatus')}>
                <option value="">Select…</option>
                <option>Super Lux</option>
                <option>Ultra Super Lux</option>
                <option>Lux</option>
                <option>Semi Finished</option>
                <option>Core & Shell</option>
              </select>
            </FormField>
          </div>

          <span className="filters-label">Features</span>
          <div className="check-grid">
            {[['parking', 'Parking'], ['garden', 'Garden'], ['pool', 'Pool'], ['seaView', 'Sea view'], ['beachAccess', 'Beach access']].map(([k, l]) => (
              <label key={k} className="check-item">
                <input type="checkbox" checked={form[k]} onChange={set(k)} />{l}
              </label>
            ))}
          </div>

          <span className="filters-label">Amenities</span>
          <div className="check-grid">
            {amenities.map((a) => (
              <label key={a.id} className="check-item">
                <input
                  type="checkbox" checked={amenityIds.includes(a.id)}
                  onChange={() => setAmenityIds((ids) => ids.includes(a.id) ? ids.filter((x) => x !== a.id) : [...ids, a.id])}
                />{a.name}
              </label>
            ))}
          </div>

          <span className="filters-label">Extra facts (optional)</span>
          {features.map((f, i) => (
            <div key={i} className="form-grid-2">
              <input className="form-control" placeholder="Fact (e.g. Orientation)" value={f.title} onChange={(e) => setFeatures((list) => list.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <input className="form-control" placeholder="Value (e.g. Sea facing)" value={f.value} onChange={(e) => setFeatures((list) => list.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
            </div>
          ))}
          <button type="button" className="btn btn-link btn-sm" onClick={() => setFeatures((l) => [...l, { title: '', value: '' }])}>
            + Add fact
          </button>

          <span className="filters-label">Photo URLs (optional — uploads come next)</span>
          {imageUrls.map((img, i) => (
            <div key={i} className="form-grid-2">
              <input className="form-control" placeholder="https://…" value={img.url} onChange={(e) => setImageUrls((list) => list.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
              <input className="form-control" placeholder="Alt text" value={img.altText} onChange={(e) => setImageUrls((list) => list.map((x, j) => j === i ? { ...x, altText: e.target.value } : x))} />
            </div>
          ))}
          <button type="button" className="btn btn-link btn-sm" onClick={() => setImageUrls((l) => [...l, { url: '', altText: '' }])}>
            + Add photo URL
          </button>

          <div className="form-grid-2" style={{ marginTop: '1rem' }}>
            <FormField id="s-address" label="Address" error={errors.address}>
              <input id="s-address" className="form-control" value={form.address} onChange={set('address')} />
            </FormField>
            <FormField id="s-dev" label="Developer" error={errors.developer}>
              <input id="s-dev" className="form-control" value={form.developer} onChange={set('developer')} />
            </FormField>
          </div>
          <FormField id="s-contact" label="Contact phone" error={errors.contactPhone}>
            <input id="s-contact" type="tel" className="form-control" value={form.contactPhone} onChange={set('contactPhone')} />
          </FormField>

          <button type="submit" className="btn btn-brand" disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
        </form>
        </>
      )}

      <section className="tracker">
        <h2>My listings</h2>
        {mineLoading ? (
          <LoadingSkeleton count={3} />
        ) : mine.length === 0 ? (
          <EmptyState icon="bi-shop" title="No listings yet." message="Your submissions and their review status appear here." />
        ) : (
          <div className="tracker-list">
            {mine.map((p) => (
              <div key={p.id} className="tracker-row">
                <div>
                  <strong>{p.title}</strong>
                  <span className="text-meta"> · {p.referenceNumber} · {Number(p.price).toLocaleString()} {p.currency}</span>
                </div>
                <div className="tracker-actions">
                  <span className={`badge-status ${STATUS_CLASS[p.status] || ''}`}>{p.status}</span>
                  {p.status === 'Draft' && (
                    <button type="button" className="btn btn-brand btn-sm" onClick={() => sendForReview(p.id)}>
                      Submit
                    </button>
                  )}
                  {(p.status === 'Published' || p.status === 'Featured') && (
                    <Link to={`/properties/${p.slug}`} className="btn btn-outline-secondary btn-sm">View</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
