import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { useSeo } from '../../hooks/useSeo.js';
import { locationService } from '../../services/locationService.js';
import { brokerService } from '../../services/brokerService.js';
import { propertyService } from '../../services/propertyService.js';
import './BrokerSubmitProperty.css';

export default function BrokerSubmitProperty() {
  const { isRtl, t } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();

  useSeo({
    title: `${isRtl ? 'طلب إضافة شاليه للمراجعة' : 'Submit Chalet for Review'} | ${t('common.darcom', 'Darcom')}`,
    description: isRtl
      ? 'تقديم تفاصيل شاليه بالساحل الشمالي لمراجعة إدارة داركوم قبل النشر'
      : 'Submit North Coast chalet details for Darcom company review.',
  });

  const [villages, setVillages] = useState([]);
  const [zones, setZones] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingZones, setLoadingZones] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    title: '',
    purpose: 'Rent',
    propertyTypeId: '',
    villageId: '',
    zoneId: '',
    buildingNumber: '',
    floor: '',
    totalFloors: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    price: '',
    currency: 'EGP',
    furnishedStatus: 'Furnished',
    finishingStatus: 'Super Lux',
    parking: false,
    garden: false,
    pool: false,
    seaView: false,
    beachAccess: false,
    contactPhone: '',
    description: '',
  });

  const [imageUrls, setImageUrls] = useState([{ url: '', altText: '' }]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  useEffect(() => {
    async function loadLookups() {
      setLoadingLookups(true);
      try {
        const [villagesRes, typesRes] = await Promise.all([
          locationService.getVillages().catch(() => ({ data: [] })),
          locationService.getPropertyTypes().catch(() => ({ data: [] })),
        ]);
        setVillages(villagesRes.data || []);
        setPropertyTypes(typesRes.data || []);
      } finally {
        setLoadingLookups(false);
      }
    }
    loadLookups();
  }, []);

  const handleVillageChange = async (e) => {
    const vId = e.target.value;
    setForm((prev) => ({ ...prev, villageId: vId, zoneId: '' }));
    setZones([]);

    if (!vId) return;
    setLoadingZones(true);
    try {
      const res = await locationService.getZones(vId);
      setZones(res.data || []);
    } catch {
      setZones([]);
    } finally {
      setLoadingZones(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSelectedFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!form.title.trim()) newErrors.title = isRtl ? 'عنوان الشاليه مطلوب' : 'Title is required';
    if (!form.propertyTypeId) newErrors.propertyTypeId = isRtl ? 'يرجى اختيار نوع العقار' : 'Property type is required';
    if (!form.villageId) newErrors.villageId = isRtl ? 'يرجى اختيار القرية في الساحل الشمالي' : 'Village is required';
    if (!form.price || Number(form.price) <= 0) newErrors.price = isRtl ? 'السعر يجب أن يكون أكبر من 0' : 'Price must be greater than 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const validUrls = imageUrls
        .filter((img) => img.url.trim())
        .map((img) => ({ url: img.url.trim(), altText: img.altText || null }));

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        propertyTypeId: Number(form.propertyTypeId),
        purpose: form.purpose,
        price: Number(form.price),
        currency: form.currency,
        area: form.area ? Number(form.area) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        floor: form.floor ? Number(form.floor) : null,
        totalFloors: form.totalFloors ? Number(form.totalFloors) : null,
        furnishedStatus: form.furnishedStatus || null,
        finishingStatus: form.finishingStatus || null,
        parking: !!form.parking,
        garden: !!form.garden,
        pool: !!form.pool,
        seaView: !!form.seaView,
        beachAccess: !!form.beachAccess,
        villageId: Number(form.villageId),
        zoneId: form.zoneId ? Number(form.zoneId) : null,
        buildingNumber: form.buildingNumber.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        images: validUrls,
        ownerId: null, // Explicitly not required for broker submissions!
      };

      const res = await brokerService.submitProperty(payload);
      const createdProperty = res.data;

      // Upload files if selected
      if (selectedFiles.length > 0 && createdProperty?.id) {
        setUploadProgress(isRtl ? 'جاري رفع صور الشاليه...' : 'Uploading chalet photos...');
        for (let i = 0; i < selectedFiles.length; i++) {
          await propertyService.uploadMedia(createdProperty.id, 'image', selectedFiles[i]).catch(() => null);
        }
      }

      toast.success(
        isRtl
          ? 'تم إرسال الشاليه بنجاح وهو الآن قيد مراجعة وتدقيق إدارة داركوم.'
          : 'Chalet submitted successfully and is now under review by Darcom administration.'
      );

      navigate('/broker/properties');
    } catch (err) {
      toast.error(err.message || (isRtl ? 'فشل إرسال الشاليه للمراجعة' : 'Failed to submit chalet'));
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <main className="container broker-submit-page" id="main-content">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/broker/dashboard" className="text-gold text-decoration-none" style={{ fontSize: '0.9rem' }}>
              <i className={`bi ${isRtl ? 'bi-arrow-right' : 'bi-arrow-left'} me-1`}></i>
              {isRtl ? 'العودة للوحة تحكم البروكر' : 'Back to Dashboard'}
            </Link>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
            <i className="bi bi-file-earmark-plus me-2 text-gold"></i>
            {isRtl ? 'طلب إضافة شاليه لمراجعة الإدارة' : 'Submit Chalet for Review'}
          </h1>
        </div>
      </div>

      <div className="broker-review-notice">
        <i className="bi bi-shield-lock-fill"></i>
        <div>
          <strong>{isRtl ? 'ملاحظة مهمة للاعتماد:' : 'Important Review Notice:'}</strong>
          <div>
            {isRtl
              ? 'بمجرد الضغط على إرسال، سيتم حفظ الشاليه بحالة "قيد المراجعة" وإرسال إشعار لإدارة داركوم لتدقيق البيانات والصور قبل نشره على الموقع.'
              : 'Once submitted, the property will be saved in "Pending Review" status and notified to Darcom admins for verification before being published.'}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="broker-form-card">
        {/* Section 1: Basic Specifications */}
        <div className="broker-form-section-title">
          <i className="bi bi-info-circle-fill"></i>
          <span>{isRtl ? '1. البيانات الأساسية والغرض' : '1. Basic Specifications'}</span>
        </div>

        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <label className="broker-field-label">{isRtl ? 'عنوان الشاليه / الوصف المختصر' : 'Chalet Title'} *</label>
            <input
              type="text"
              className={`form-control ${errors.title ? 'is-invalid' : ''}`}
              placeholder={isRtl ? 'مثال: شاليه أرضي بحديقة في مراسي - مارينا فيو بحري' : 'e.g. Ground Chalet with Garden in Marassi'}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              disabled={submitting}
            />
            {errors.title && <div className="invalid-feedback">{errors.title}</div>}
          </div>

          <div className="col-12 col-md-6 col-lg-4">
            <label className="broker-field-label">{isRtl ? 'الغرض (إيجار أم بيع)' : 'Purpose'} *</label>
            <select
              className="form-select"
              value={form.purpose}
              onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
              disabled={submitting}
            >
              <option value="Rent">{isRtl ? 'إيجار مصيفي (Rent)' : 'Rent'}</option>
              <option value="Sale">{isRtl ? 'بيع (Sale)' : 'Sale'}</option>
            </select>
          </div>

          <div className="col-12 col-md-6 col-lg-4">
            <label className="broker-field-label">{isRtl ? 'نوع العقار' : 'Property Type'} *</label>
            <select
              className={`form-select ${errors.propertyTypeId ? 'is-invalid' : ''}`}
              value={form.propertyTypeId}
              onChange={(e) => setForm((p) => ({ ...p, propertyTypeId: e.target.value }))}
              disabled={loadingLookups || submitting}
            >
              <option value="">{isRtl ? '-- اختر النوع --' : '-- Select Type --'}</option>
              {propertyTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name}
                </option>
              ))}
            </select>
            {errors.propertyTypeId && <div className="invalid-feedback">{errors.propertyTypeId}</div>}
          </div>

          <div className="col-12 col-md-6 col-lg-4">
            <label className="broker-field-label">
              {isRtl ? (form.purpose === 'Rent' ? 'السعر (لليلة / الشهر)' : 'سعر البيع الإجمالي') : 'Price (EGP)'} *
            </label>
            <div className="input-group">
              <input
                type="number"
                className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                placeholder="15000"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                disabled={submitting}
              />
              <span className="input-group-text">EGP</span>
              {errors.price && <div className="invalid-feedback">{errors.price}</div>}
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-4">
            <label className="broker-field-label">{isRtl ? 'المساحة (م²)' : 'Area (sqm)'}</label>
            <input
              type="number"
              className="form-control"
              placeholder="120"
              value={form.area}
              onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Section 2: North Coast Village & Zone Location */}
        <div className="broker-section-divider"></div>
        <div className="broker-form-section-title">
          <i className="bi bi-geo-alt-fill"></i>
          <span>{isRtl ? '2. القرية والمنطقة في الساحل الشمالي' : '2. North Coast Village & Zone Location'}</span>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="broker-field-label">{isRtl ? 'القرية (Village)' : 'Village'} *</label>
            <select
              className={`form-select ${errors.villageId ? 'is-invalid' : ''}`}
              value={form.villageId}
              onChange={handleVillageChange}
              disabled={loadingLookups || submitting}
            >
              <option value="">{isRtl ? '-- اختر القرية --' : '-- Select Village --'}</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {errors.villageId && <div className="invalid-feedback">{errors.villageId}</div>}
          </div>

          <div className="col-12 col-md-4">
            <label className="broker-field-label">
              {isRtl ? 'المنطقة (Zone داخل القرية)' : 'Zone (Optional)'}
              {loadingZones && <span className="ms-2 spinner-border spinner-border-sm text-gold"></span>}
            </label>
            <select
              className="form-select"
              value={form.zoneId}
              onChange={(e) => setForm((p) => ({ ...p, zoneId: e.target.value }))}
              disabled={!form.villageId || loadingZones || submitting}
            >
              <option value="">{isRtl ? '-- كل مناطق القرية --' : '-- All Village Zones --'}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label className="broker-field-label">{isRtl ? 'رقم المبنى / الشاليه' : 'Building / Chalet Number'}</label>
            <input
              type="text"
              className="form-control"
              placeholder={isRtl ? 'مثال: B-12 أو شاليه 45' : 'e.g. B-12'}
              value={form.buildingNumber}
              onChange={(e) => setForm((p) => ({ ...p, buildingNumber: e.target.value }))}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Section 3: Interior and Units specs */}
        <div className="broker-section-divider"></div>
        <div className="broker-form-section-title">
          <i className="bi bi-door-open-fill"></i>
          <span>{isRtl ? '3. مواصفات الغرف والأدوار' : '3. Interior & Unit Details'}</span>
        </div>

        <div className="row g-3">
          <div className="col-6 col-md-3">
            <label className="broker-field-label">{isRtl ? 'عدد الغرف' : 'Bedrooms'}</label>
            <input
              type="number"
              className="form-control"
              placeholder="2"
              value={form.bedrooms}
              onChange={(e) => setForm((p) => ({ ...p, bedrooms: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="broker-field-label">{isRtl ? 'عدد الحمامات' : 'Bathrooms'}</label>
            <input
              type="number"
              className="form-control"
              placeholder="2"
              value={form.bathrooms}
              onChange={(e) => setForm((p) => ({ ...p, bathrooms: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="broker-field-label">{isRtl ? 'الدور' : 'Floor'}</label>
            <input
              type="number"
              className="form-control"
              placeholder="0 (أرضي) أو 1"
              value={form.floor}
              onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="broker-field-label">{isRtl ? 'إجمالي الأدوار' : 'Total Floors'}</label>
            <input
              type="number"
              className="form-control"
              placeholder="3"
              value={form.totalFloors}
              onChange={(e) => setForm((p) => ({ ...p, totalFloors: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="broker-field-label">{isRtl ? 'حالة الفرش' : 'Furnished Status'}</label>
            <select
              className="form-select"
              value={form.furnishedStatus}
              onChange={(e) => setForm((p) => ({ ...p, furnishedStatus: e.target.value }))}
              disabled={submitting}
            >
              <option value="Furnished">{isRtl ? 'مفروش بالكامل (Furnished)' : 'Furnished'}</option>
              <option value="SemiFurnished">{isRtl ? 'نصف مفروش (Semi Furnished)' : 'Semi-Furnished'}</option>
              <option value="Unfurnished">{isRtl ? 'بدون فرش (Unfurnished)' : 'Unfurnished'}</option>
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="broker-field-label">{isRtl ? 'حالة التشطيب' : 'Finishing Status'}</label>
            <select
              className="form-select"
              value={form.finishingStatus}
              onChange={(e) => setForm((p) => ({ ...p, finishingStatus: e.target.value }))}
              disabled={submitting}
            >
              <option value="Super Lux">{isRtl ? 'سوبر لوكس (Super Lux)' : 'Super Lux'}</option>
              <option value="Ultra Lux">{isRtl ? 'الترا لوكس (Ultra Lux)' : 'Ultra Lux'}</option>
              <option value="Finished">{isRtl ? 'تشطيب كامل (Finished)' : 'Finished'}</option>
              <option value="Semi Finished">{isRtl ? 'نصف تشطيب (Semi Finished)' : 'Semi Finished'}</option>
            </select>
          </div>
        </div>

        {/* Section 4: Features & Amenities */}
        <div className="broker-section-divider"></div>
        <div className="broker-form-section-title">
          <i className="bi bi-stars"></i>
          <span>{isRtl ? '4. المميزات والخدمات' : '4. Amenities & Features'}</span>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-6 col-md-4 col-lg-2">
            <div
              className={`broker-amenity-card ${form.garden ? 'checked' : ''}`}
              onClick={() => setForm((p) => ({ ...p, garden: !p.garden }))}
            >
              <input type="checkbox" className="form-check-input" checked={form.garden} readOnly />
              <span>{isRtl ? 'حديقة خاصة' : 'Garden'}</span>
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg-2">
            <div
              className={`broker-amenity-card ${form.pool ? 'checked' : ''}`}
              onClick={() => setForm((p) => ({ ...p, pool: !p.pool }))}
            >
              <input type="checkbox" className="form-check-input" checked={form.pool} readOnly />
              <span>{isRtl ? 'حمام سباحة' : 'Pool'}</span>
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg-2">
            <div
              className={`broker-amenity-card ${form.seaView ? 'checked' : ''}`}
              onClick={() => setForm((p) => ({ ...p, seaView: !p.seaView }))}
            >
              <input type="checkbox" className="form-check-input" checked={form.seaView} readOnly />
              <span>{isRtl ? 'إطلالة بحر' : 'Sea View'}</span>
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg-2">
            <div
              className={`broker-amenity-card ${form.beachAccess ? 'checked' : ''}`}
              onClick={() => setForm((p) => ({ ...p, beachAccess: !p.beachAccess }))}
            >
              <input type="checkbox" className="form-check-input" checked={form.beachAccess} readOnly />
              <span>{isRtl ? 'نزول للشاطئ' : 'Beach Access'}</span>
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg-2">
            <div
              className={`broker-amenity-card ${form.parking ? 'checked' : ''}`}
              onClick={() => setForm((p) => ({ ...p, parking: !p.parking }))}
            >
              <input type="checkbox" className="form-check-input" checked={form.parking} readOnly />
              <span>{isRtl ? 'موقف سيارات' : 'Parking'}</span>
            </div>
          </div>
        </div>

        {/* Section 5: Photos & Media */}
        <div className="broker-section-divider"></div>
        <div className="broker-form-section-title">
          <i className="bi bi-images"></i>
          <span>{isRtl ? '5. صور الشاليه' : '5. Chalet Photos'}</span>
        </div>

        {/* File upload drag/click zone */}
        <div className="mb-3">
          <label className="broker-field-label">{isRtl ? 'رفع صور من جهازك (JPG, PNG, WebP حتى 10 ميجا)' : 'Upload Photos'}</label>
          <label className="broker-photo-upload-zone d-block w-100">
            <i className="bi bi-cloud-arrow-up text-gold" style={{ fontSize: '2.5rem' }}></i>
            <h5 className="mt-2 mb-1" style={{ color: '#fff' }}>
              {isRtl ? 'اضغط لاختيار الصور أو اسحبها هنا' : 'Click or Drag photos here'}
            </h5>
            <small className="text-muted">{isRtl ? 'يمكنك تحديد عدة صور دفعة واحدة' : 'Select multiple images'}</small>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              className="d-none"
              onChange={handleFileSelect}
              disabled={submitting}
            />
          </label>

          {filePreviews.length > 0 && (
            <div className="broker-photo-preview-grid">
              {filePreviews.map((p, i) => (
                <div key={i} className="broker-photo-thumb">
                  <img src={p.url} alt={`Upload ${i + 1}`} />
                  <button type="button" className="broker-photo-remove" onClick={() => removeFile(i)}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional Image URLs */}
        <div className="mb-3">
          <label className="broker-field-label">{isRtl ? 'روابط صور خارجية (اختياري)' : 'External Image URLs (Optional)'}</label>
          {imageUrls.map((img, i) => (
            <div key={i} className="row g-2 mb-2">
              <div className="col-8">
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://images.example.com/chalet-1.jpg"
                  value={img.url}
                  onChange={(e) =>
                    setImageUrls((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x))
                    )
                  }
                  disabled={submitting}
                />
              </div>
              <div className="col-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder={isRtl ? 'نص بديل' : 'Alt text'}
                  value={img.altText}
                  onChange={(e) =>
                    setImageUrls((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, altText: e.target.value } : x))
                    )
                  }
                  disabled={submitting}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-link btn-sm text-gold text-decoration-none"
            onClick={() => setImageUrls((p) => [...p, { url: '', altText: '' }])}
            disabled={submitting}
          >
            + {isRtl ? 'إضافة رابط صورة إضافي' : 'Add another URL'}
          </button>
        </div>

        {/* Section 6: Description & Contact */}
        <div className="broker-section-divider"></div>
        <div className="broker-form-section-title">
          <i className="bi bi-card-text"></i>
          <span>{isRtl ? '6. الوصف والتواصل' : '6. Description & Contact'}</span>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="broker-field-label">{isRtl ? 'هاتف التواصل مع البروكر للاستفسارات' : 'Broker Contact Phone'}</label>
            <input
              type="tel"
              className="form-control"
              placeholder="+2010..."
              value={form.contactPhone}
              onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div className="col-12">
            <label className="broker-field-label">{isRtl ? 'الوصف الكامل للشاليه' : 'Full Description'}</label>
            <textarea
              className="form-control"
              rows="4"
              placeholder={isRtl ? 'اكتب تفاصيل ومزايا الشاليه، الخدمات القريبة، شروط الإيجار أو البيع...' : 'Describe chalet amenities, views, rental terms...'}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              disabled={submitting}
            ></textarea>
          </div>
        </div>

        {uploadProgress && (
          <div className="alert alert-info mt-3 d-flex align-items-center gap-2">
            <div className="spinner-border spinner-border-sm text-gold" role="status"></div>
            <span>{uploadProgress}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <Link to="/broker/dashboard" className="btn btn-outline-secondary" disabled={submitting}>
            {isRtl ? 'إلغاء' : 'Cancel'}
          </Link>

          <button
            type="submit"
            className="btn btn-brand btn-lg"
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #d4af37, #aa8214)',
              border: 'none',
              color: '#121212',
              fontWeight: 700,
              padding: '0.75rem 2.5rem',
            }}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                {isRtl ? 'جاري إرسال الشاليه...' : 'Submitting Chalet...'}
              </>
            ) : (
              <>
                <i className="bi bi-send-check me-2"></i>
                {isRtl ? 'إرسال الشاليه لمراجعة الإدارة' : 'Submit Chalet for Review'}
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

