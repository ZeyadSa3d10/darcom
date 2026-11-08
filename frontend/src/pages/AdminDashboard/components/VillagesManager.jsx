import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { adminService } from '../../../services/adminService.js';

export default function VillagesManager() {
  const { isRtl } = useSettings();
  const toast = useToast();

  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Village Modal (Add / Edit)
  const [villageModal, setVillageModal] = useState(false);
  const [editingVillage, setEditingVillage] = useState(null);
  const [villageForm, setVillageForm] = useState({ name: '', nameAr: '', slug: '', imageUrl: '', isActive: true });
  const [savingVillage, setSavingVillage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Zones Management for Selected Village
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [zoneModal, setZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({ name: '', nameAr: '', slug: '', isActive: true });
  const [savingZone, setSavingZone] = useState(false);

  const loadVillages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getVillages(true);
      setVillages(res.data ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVillages();
  }, [loadVillages]);

  const loadZones = async (v) => {
    setSelectedVillage(v);
    setLoadingZones(true);
    try {
      const res = await adminService.getZones(v.id, true);
      setZones(res.data ?? []);
    } catch {
      setZones([]);
    } finally {
      setLoadingZones(false);
    }
  };

  const openAddVillage = () => {
    setEditingVillage(null);
    setVillageForm({ name: '', nameAr: '', slug: '', imageUrl: '', isActive: true });
    setVillageModal(true);
  };

  const openEditVillage = (v) => {
    setEditingVillage(v);
    setVillageForm({
      name: v.name,
      nameAr: v.nameAr || '',
      slug: v.slug || '',
      imageUrl: v.imageUrl || '',
      isActive: v.isActive ?? true,
    });
    setVillageModal(true);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editingVillage) {
      setUploadingImage(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await adminService.uploadVillageImage(editingVillage.id, fd);
        const newUrl = res.data?.imageUrl;
        if (newUrl) {
          setVillageForm((prev) => ({ ...prev, imageUrl: newUrl }));
          toast.success(isRtl ? 'تم رفع صورة القرية بنجاح' : 'Village image uploaded.');
          loadVillages();
        }
      } catch (err) {
        toast.error(err.message || 'Failed to upload image.');
      } finally {
        setUploadingImage(false);
      }
    } else {
      toast.info(isRtl ? 'احفظ القرية أولاً ثم يمكنك رفع الصورة' : 'Please save the village first, or enter an image URL.');
    }
  };

  const handleSaveVillage = async (e) => {
    e.preventDefault();
    setSavingVillage(true);
    try {
      if (editingVillage) {
        await adminService.updateVillage(editingVillage.id, villageForm);
        toast.success(isRtl ? 'تم تحديث القرية بنجاح' : 'Village updated successfully.');
      } else {
        await adminService.createVillage(villageForm);
        toast.success(isRtl ? 'تمت إضافة القرية بنجاح' : 'Village created successfully.');
      }
      setVillageModal(false);
      loadVillages();
    } catch (err) {
      toast.error(err.message || 'Failed to save village.');
    } finally {
      setSavingVillage(false);
    }
  };

  const handleDeleteVillage = async (id) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذه القرية؟' : 'Are you sure you want to delete this village?')) {
      return;
    }
    try {
      await adminService.deleteVillage(id);
      toast.success(isRtl ? 'تم حذف القرية' : 'Village deleted.');
      if (selectedVillage?.id === id) setSelectedVillage(null);
      loadVillages();
    } catch (err) {
      toast.error(err.message || 'Failed to delete village.');
    }
  };

  const openAddZone = () => {
    setEditingZone(null);
    setZoneForm({ name: '', nameAr: '', slug: '', isActive: true });
    setZoneModal(true);
  };

  const openEditZone = (z) => {
    setEditingZone(z);
    setZoneForm({ name: z.name, nameAr: z.nameAr || '', slug: z.slug || '', isActive: z.isActive ?? true });
    setZoneModal(true);
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    if (!selectedVillage) return;
    setSavingZone(true);
    try {
      if (editingZone) {
        await adminService.updateZone(selectedVillage.id, editingZone.id, zoneForm);
        toast.success(isRtl ? 'تم تحديث المنطقة بنجاح' : 'Zone updated successfully.');
      } else {
        await adminService.createZone(selectedVillage.id, zoneForm);
        toast.success(isRtl ? 'تمت إضافة المنطقة بنجاح' : 'Zone created successfully.');
      }
      setZoneModal(false);
      loadZones(selectedVillage);
      loadVillages(); // refresh zone counts
    } catch (err) {
      toast.error(err.message || 'Failed to save zone.');
    } finally {
      setSavingZone(false);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!selectedVillage) return;
    if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذه المنطقة؟' : 'Are you sure you want to delete this zone?')) {
      return;
    }
    try {
      await adminService.deleteZone(selectedVillage.id, zoneId);
      toast.success(isRtl ? 'تم حذف المنطقة' : 'Zone deleted.');
      loadZones(selectedVillage);
      loadVillages();
    } catch (err) {
      toast.error(err.message || 'Failed to delete zone.');
    }
  };

  return (
    <div className="villages-manager-panel">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 font-display">
            {isRtl ? 'إدارة قرى ومناطق الساحل الشمالي' : 'North Coast Villages & Zones'}
          </h3>
          <p className="text-muted m-0 small">
            {isRtl
              ? 'إضافة وتعديل القرى الشاطئية والمناطق التابعة لها (مثل Bay، Walk، Lagoon)'
              : 'Add and organize North Coast villages and their zones.'}
          </p>
        </div>
        <button type="button" className="btn btn-brand btn-sm" onClick={openAddVillage}>
          <i className="bi bi-plus-lg me-1"></i>
          {isRtl ? 'إضافة قرية جديدة' : 'Add Village'}
        </button>
      </div>

      {loading && <LoadingSkeleton count={4} />}
      {error && <ErrorState error={error} onRetry={loadVillages} />}

      {!loading && !error && (
        <div className="row g-4">
          {/* Villages Column */}
          <div className={selectedVillage ? 'col-lg-6' : 'col-12'}>
            <div className="table-responsive bg-white rounded shadow-sm border">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>{isRtl ? 'الصورة' : 'Photo'}</th>
                    <th>{isRtl ? 'اسم القرية' : 'Village Name'}</th>
                    <th>Slug</th>
                    <th>{isRtl ? 'المناطق' : 'Zones'}</th>
                    <th>{isRtl ? 'الوحدات' : 'Listings'}</th>
                    <th>{isRtl ? 'الحالة' : 'Status'}</th>
                    <th>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {villages.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">
                        No villages configured yet.
                      </td>
                    </tr>
                  ) : (
                    villages.map((v) => {
                      const isSelected = selectedVillage?.id === v.id;
                      return (
                        <tr key={v.id} className={isSelected ? 'table-warning' : ''}>
                          <td><strong>#{v.id}</strong></td>
                          <td>
                            <img
                              src={v.imageUrl || '/images/hero-sahel.svg'}
                              alt={v.name}
                              style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 4 }}
                            />
                          </td>
                          <td>
                            <strong>{v.name}</strong>
                            {v.nameAr && <div className="text-muted small">{v.nameAr}</div>}
                          </td>
                          <td className="text-meta small">{v.slug}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-info"
                              onClick={() => loadZones(v)}
                            >
                              <i className="bi bi-diagram-3 me-1"></i>
                              {v.zoneCount ?? v.zones?.length ?? 0} {isRtl ? 'مناطق' : 'Zones'}
                            </button>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {v.propertiesCount ?? 0} {isRtl ? 'وحدة' : 'units'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${v.isActive ? 'bg-success' : 'bg-secondary'}`}>
                              {v.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => openEditVillage(v)}
                                title="Edit"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteVillage(v.id)}
                                title="Delete"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zones Column (When a village is selected) */}
          {selectedVillage && (
            <div className="col-lg-6">
              <div className="card shadow-sm border">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="m-0">
                      Zones in <strong>{selectedVillage.name}</strong>
                    </h5>
                    <small className="text-muted">Manage zones, bays, walks, and lagoons</small>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-brand btn-sm" onClick={openAddZone}>
                      <i className="bi bi-plus-lg me-1"></i>
                      Add Zone
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setSelectedVillage(null)}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
                <div className="card-body p-0">
                  {loadingZones ? (
                    <div className="p-3"><LoadingSkeleton count={3} /></div>
                  ) : zones.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      No zones found for this village. Click "Add Zone" to create one.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>ID</th>
                            <th>Zone Name</th>
                            <th>Slug</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zones.map((z) => (
                            <tr key={z.id}>
                              <td>#{z.id}</td>
                              <td>
                                <strong>{z.name}</strong>
                                {z.nameAr && <div className="text-muted small">{z.nameAr}</div>}
                              </td>
                              <td className="text-meta small">{z.slug}</td>
                              <td>
                                <span className={`badge ${z.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                  {z.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => openEditZone(z)}
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => handleDeleteZone(z.id)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Village Modal */}
      {villageModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingVillage ? `Edit Village #${editingVillage.id}` : 'Add New Village'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setVillageModal(false)}></button>
              </div>
              <form onSubmit={handleSaveVillage}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Village Name (English) *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={villageForm.name}
                      onChange={(e) => setVillageForm({ ...villageForm, name: e.target.value })}
                      placeholder="e.g. Marassi, Hacienda Bay, Telal"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">{isRtl ? 'اسم القرية (بالعربية)' : 'Village Name (Arabic)'}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={villageForm.nameAr}
                      onChange={(e) => setVillageForm({ ...villageForm, nameAr: e.target.value })}
                      placeholder="مثال: مراسي، هاسيندا باي، تلال الساحل"
                      dir="rtl"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">URL Slug (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={villageForm.slug}
                      onChange={(e) => setVillageForm({ ...villageForm, slug: e.target.value })}
                      placeholder="e.g. marassi"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">{isRtl ? 'رابط صورة القرية (URL)' : 'Village Image URL'}</label>
                    <input
                      type="url"
                      className="form-control"
                      value={villageForm.imageUrl}
                      onChange={(e) => setVillageForm({ ...villageForm, imageUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  {editingVillage && (
                    <div className="mb-3 p-2 bg-light rounded border">
                      <label className="form-label small fw-bold mb-1">
                        <i className="bi bi-cloud-arrow-up me-1"></i>
                        {isRtl ? 'أو ارفع صورة من جهازك' : 'Or Upload Image File'}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control form-control-sm"
                        onChange={handleImageFileChange}
                        disabled={uploadingImage}
                      />
                      {uploadingImage && <small className="text-info mt-1 d-block">Uploading image…</small>}
                    </div>
                  )}
                  <div className="form-check form-switch mb-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="v-active"
                      checked={villageForm.isActive}
                      onChange={(e) => setVillageForm({ ...villageForm, isActive: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="v-active">Active</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setVillageModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-brand" disabled={savingVillage || uploadingImage}>
                    {savingVillage ? 'Saving…' : 'Save Village'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Zone Modal */}
      {zoneModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingZone ? `Edit Zone in ${selectedVillage?.name}` : `Add Zone to ${selectedVillage?.name}`}
                </h5>
                <button type="button" className="btn-close" onClick={() => setZoneModal(false)}></button>
              </div>
              <form onSubmit={handleSaveZone}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Zone Name (English) *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                      placeholder="e.g. Marina 1, Greek Village, Silver Beach"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">{isRtl ? 'اسم المنطقة / المرحلة (بالعربية)' : 'Zone Name (Arabic)'}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={zoneForm.nameAr}
                      onChange={(e) => setZoneForm({ ...zoneForm, nameAr: e.target.value })}
                      placeholder="مثال: مارينا ١، القرية اليونانية"
                      dir="rtl"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">URL Slug (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={zoneForm.slug}
                      onChange={(e) => setZoneForm({ ...zoneForm, slug: e.target.value })}
                      placeholder="e.g. marina-1"
                    />
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="z-active"
                      checked={zoneForm.isActive}
                      onChange={(e) => setZoneForm({ ...zoneForm, isActive: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="z-active">Active</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setZoneModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-brand" disabled={savingZone}>
                    {savingZone ? 'Saving…' : 'Save Zone'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

