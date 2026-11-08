import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { adminService } from '../../../services/adminService.js';
import { propertyService } from '../../../services/propertyService.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import AdminPropertyForm from './AdminPropertyForm.jsx';
import './PropertiesManager.css';

const STATUSES = ['', 'Draft', 'PendingReview', 'Published', 'Featured', 'Reserved', 'Sold', 'Rented', 'Archived', 'Rejected'];
const LIFECYCLE = ['Draft', 'Published', 'Featured', 'Reserved', 'Sold', 'Rented', 'Archived'];

export default function PropertiesManager({ onChanged }) {
  const { t, isRtl } = useSettings();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('loading');
  const [selected, setSelected] = useState(null); // details DTO for the drawer
  const [media, setMedia] = useState([]);
  const [confirm, setConfirm] = useState(null); // { mode, ... }
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  // Add-property flow
  const [showAdd, setShowAdd] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addErrors, setAddErrors] = useState({});
  const [created, setCreated] = useState(null);
  // Edit-details flow (inside the Manage drawer)
  const [editing, setEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  // Media upload (drawer + add flow)
  const [uploadKind, setUploadKind] = useState('image');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [rentalModal, setRentalModal] = useState(null);
  const [newPeriod, setNewPeriod] = useState({ startDate: '', endDate: '', renterName: '', renterPhone: '', notes: '' });
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [showAddPeriod, setShowAddPeriod] = useState(false);

  const openRentalPeriods = async (p) => {
    setRentalModal({ prop: p, loading: true, periods: [] });
    setShowAddPeriod(false);
    setNewPeriod({ startDate: '', endDate: '', renterName: '', renterPhone: '', notes: '' });
    try {
      const res = await adminService.propertyRentalPeriods(p.id);
      setRentalModal({ prop: p, loading: false, periods: res.data ?? [] });
    } catch {
      toast.error(isRtl ? 'تعذر جلب فترات الإيجار' : 'Failed to load rental periods.');
      setRentalModal(null);
    }
  };

  const handleAddPeriod = async (e) => {
    e.preventDefault();
    if (!rentalModal?.prop?.id) return;
    setAddingPeriod(true);
    try {
      await adminService.createRentalPeriod(rentalModal.prop.id, {
        startDate: new Date(newPeriod.startDate).toISOString(),
        endDate: new Date(newPeriod.endDate).toISOString(),
        renterName: newPeriod.renterName.trim(),
        renterPhone: newPeriod.renterPhone.trim() || null,
        notes: newPeriod.notes.trim() || null,
      });
      toast.success(isRtl ? 'تمت إضافة فترة الإيجار بنجاح.' : 'Rental period added.');
      setNewPeriod({ startDate: '', endDate: '', renterName: '', renterPhone: '', notes: '' });
      setShowAddPeriod(false);
      const res = await adminService.propertyRentalPeriods(rentalModal.prop.id);
      setRentalModal((prev) => ({ ...prev, periods: res.data ?? [] }));
    } catch (err) {
      toast.error(err.message || (isRtl ? 'فشلت إضافة فترة الإيجار (ربما يوجد تداخل في التواريخ).' : 'Failed to add rental period (possible overlap).'));
    } finally {
      setAddingPeriod(false);
    }
  };

  const handleDeletePeriod = async (periodId) => {
    if (!rentalModal?.prop?.id) return;
    try {
      await adminService.deleteRentalPeriod(rentalModal.prop.id, periodId);
      toast.success(isRtl ? 'تم حذف فترة الإيجار.' : 'Rental period removed.');
      const res = await adminService.propertyRentalPeriods(rentalModal.prop.id);
      setRentalModal((prev) => ({ ...prev, periods: res.data ?? [] }));
    } catch (err) {
      toast.error(err.message || (isRtl ? 'فشل حذف فترة الإيجار.' : 'Failed to remove rental period.'));
    }
  };

  const getStatusLabel = (st) => {
    if (!st) return isRtl ? 'كافة الحالات' : 'All statuses';
    const map = {
      Draft: isRtl ? 'مسودة' : 'Draft',
      PendingReview: isRtl ? 'بانتظار المراجعة' : 'Pending Review',
      Published: isRtl ? 'معروض' : 'Published',
      Featured: isRtl ? 'مميز' : 'Featured',
      Reserved: isRtl ? 'محجوز' : 'Reserved',
      Sold: isRtl ? 'تم البيع' : 'Sold',
      Rented: isRtl ? 'مؤجر' : 'Rented',
      Archived: isRtl ? 'مؤرشف' : 'Archived',
      Rejected: isRtl ? 'مرفوض' : 'Rejected',
    };
    return map[st] || st;
  };

  const load = useCallback(async (p = 1, query = '', st = '') => {
    setState('loading');
    try {
      const params = { page: p, pageSize: 12 };
      if (query.trim()) params.q = query.trim();
      if (st) params.status = st;
      const res = await adminService.properties(params);
      setItems(res.data?.data ?? []);
      setTotal(res.data?.totalCount ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
      setPage(res.data?.page ?? p);
      setState('done');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = (e) => {
    e.preventDefault();
    load(1, q, status);
  };

  const openDrawer = async (row) => {
    setEditing(false);
    setEditErrors({});
    setUploadUrl('');
    try {
      const res = await propertyService.getById(row.id);
      setSelected(res.data);
      const m = await propertyService.media(row.id);
      setMedia(m.data ?? []);
    } catch {
      toast.error(isRtl ? 'تعذر تحميل تفاصيل العقار.' : 'Could not load property details.');
    }
  };

  const refreshDrawer = async (id) => {
    const res = await propertyService.getById(id);
    setSelected(res.data);
  };

  const closeConfirm = () => {
    setConfirm(null);
    setReason('');
    setTyped('');
    setBusy(false);
  };

  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const { mode, item, to } = confirm;
      if (mode === 'approve') {
        await adminService.approveProperty(item.id);
        toast.success(isRtl ? 'تم اعتماد ونشر العقار.' : 'Property published.');
      } else if (mode === 'reject') {
        await adminService.rejectProperty(item.id, reason.trim());
        toast.success(isRtl ? 'تم رفض إدراج العقار.' : 'Property rejected.');
      } else if (mode === 'status') {
        await adminService.setPropertyStatus(item.id, to);
        toast.success(isRtl ? `تم تحديث الحالة إلى ${getStatusLabel(to)}.` : `Status updated to ${to}.`);
      } else if (mode === 'feature') {
        await adminService.toggleFeatured(item.id, !item.isFeatured);
        toast.success(
          item.isFeatured
            ? (isRtl ? 'تمت إزالة العقار من القائمة المميزة.' : 'Unfeatured.')
            : (isRtl ? 'تم تمييز العقار بنجاح.' : 'Featured.')
        );
      } else if (mode === 'verify') {
        await adminService.toggleVerified(item.id, !item.isVerified);
        toast.success(
          item.isVerified
            ? (isRtl ? 'تمت إزالة شارة التوثيق.' : 'Unverified.')
            : (isRtl ? 'تم توثيق العقار بنجاح.' : 'Verified.')
        );
      } else if (mode === 'archive') {
        await adminService.archiveProperty(item.id);
        toast.success(isRtl ? 'تمت أرشفة العقار بنجاح.' : 'Property archived.');
        setSelected(null);
      }
      closeConfirm();
      load(page, q, status);
      if (selected && selected.id === item.id && mode !== 'archive') {
        refreshDrawer(item.id);
      }
      onChanged?.();
    } catch (e) {
      toast.error(e.message || (isRtl ? 'فشلت العملية.' : 'Action failed.'));
      setBusy(false);
    }
  };

  const handleAdd = async (payload) => {
    setAddSaving(true);
    setAddErrors({});
    try {
      const res = await propertyService.create(payload);
      setCreated(res.data);
      toast.success(isRtl ? 'تم إنشاء العقار بنجاح. يمكنك الآن رفع الصور.' : 'Property created. Add media below.');
      load(1, q, status);
      onChanged?.();
    } catch (err) {
      setAddErrors(err.errors || {});
      toast.error(err.message || (isRtl ? 'تعذر إنشاء العقار.' : 'Could not create property.'));
    } finally {
      setAddSaving(false);
    }
  };

  const handleEditSave = async (payload) => {
    if (!selected) return;
    setEditSaving(true);
    setEditErrors({});
    try {
      await propertyService.update(selected.id, payload);
      toast.success(isRtl ? 'تم حفظ التعديلات بنجاح.' : 'Details updated.');
      setEditing(false);
      refreshDrawer(selected.id);
      load(page, q, status);
      onChanged?.();
    } catch (err) {
      setEditErrors(err.errors || {});
      toast.error(err.message || (isRtl ? 'تعذر حفظ التعديلات.' : 'Could not update property.'));
    } finally {
      setEditSaving(false);
    }
  };

  const closeAdd = () => {
    setShowAdd(false);
    setCreated(null);
    setAddErrors({});
  };

  const uploadFiles = async (propId, files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        await propertyService.uploadMedia(propId, uploadKind, f);
      }
      toast.success(isRtl ? `تم رفع ${files.length} ملفات بنجاح.` : `Uploaded ${files.length} file(s).`);
      const m = await propertyService.media(propId);
      setMedia(m.data ?? []);
    } catch (e) {
      toast.error(e.message || (isRtl ? 'فشل رفع الملفات.' : 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const attachUrl = async (propId) => {
    if (!uploadUrl.trim()) return;
    setUploading(true);
    try {
      await propertyService.attachMediaUrl(propId, uploadKind, { url: uploadUrl.trim() });
      toast.success(isRtl ? 'تم ربط الرابط بنجاح.' : 'Attached.');
      setUploadUrl('');
      const m = await propertyService.media(propId);
      setMedia(m.data ?? []);
    } catch (e) {
      toast.error(e.message || (isRtl ? 'فشل ربط الرابط.' : 'Attach failed.'));
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (kind, id) => {
    if (!selected) return;
    try {
      await propertyService.deleteMedia(selected.id, kind, id);
      toast.success(isRtl ? 'تم حذف الملف.' : 'Deleted.');
      const m = await propertyService.media(selected.id);
      setMedia(m.data ?? []);
    } catch (e) {
      toast.error(e.message || (isRtl ? 'فشل حذف الملف.' : 'Delete failed.'));
    }
  };

  const setPrimaryImage = async (mediaId) => {
    if (!selected) return;
    try {
      await propertyService.setPrimaryMedia(selected.id, mediaId);
      toast.success(isRtl ? 'تم تعيين الصورة كغلاف رئيسي.' : 'Primary cover image updated.');
      const m = await propertyService.media(selected.id);
      setMedia(m.data ?? []);
      load(page, q, status);
    } catch (e) {
      toast.error(e.message || (isRtl ? 'فشل تعيين صورة الغلاف.' : 'Failed to set cover image.'));
    }
  };

  return (
    <div>
      <form className="admin-toolbar" onSubmit={search}>
        <div className="search-input">
          <i className="bi bi-search"></i>
          <input
            type="search"
            placeholder={isRtl ? 'بحث باسم العقار، الكود، أو المطور…' : 'Search title, reference…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search properties"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            load(1, q, e.target.value);
          }}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {getStatusLabel(s)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-brand btn-sm">
          <i className="bi bi-search me-1"></i>
          <span>{t('admin.table.searchBtn', isRtl ? 'بحث' : 'Search')}</span>
        </button>
        <span className="admin-toolbar-spacer" />
        <button type="button" className="btn btn-brand btn-sm" onClick={() => setShowAdd(true)}>
          <i className="bi bi-plus-lg me-1"></i>
          <span>{t('admin.table.addProperty', isRtl ? 'إضافة عقار جديد' : 'Add property')}</span>
        </button>
      </form>

      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && (
        <ErrorState
          error={isRtl ? 'تعذر تحميل قائمة العقارات.' : 'Could not load properties.'}
          onRetry={() => load(page, q, status)}
        />
      )}
      {state === 'done' && total === 0 && (
        <EmptyState
          icon="bi-buildings"
          title={isRtl ? 'لا توجد عقارات مطابقة' : 'No properties match.'}
          message={isRtl ? 'يرجى تجربة معايير بحث أخرى أو إزالة الفلاتر.' : 'Adjust search or status filter.'}
        />
      )}
      {state === 'done' && total > 0 && (
        <>
          <p className="text-meta">
            {total} {isRtl ? 'عقار مسجل' : 'properties'}
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.table.property', isRtl ? 'اسم العقار' : 'Title')}</th>
                  <th>{isRtl ? 'الكود المرجعي' : 'Ref'}</th>
                  <th>{t('admin.table.price', isRtl ? 'السعر' : 'Price')}</th>
                  <th>{t('admin.table.status', isRtl ? 'الحالة' : 'Status')}</th>
                  <th>{isRtl ? 'نوع العقار' : 'Type'}</th>
                  <th>{t('admin.table.actions', isRtl ? 'الإجراءات' : 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.title}</strong>
                      {p.isFeatured && (
                        <span className="badge-featured ms-2" title="Featured">
                          ★ {isRtl ? 'مميز' : 'Featured'}
                        </span>
                      )}
                    </td>
                    <td className="text-meta">{p.referenceNumber}</td>
                    <td>
                      {Number(p.price).toLocaleString('en-US')} {p.currency || t('common.egp', 'EGP')}
                    </td>
                    <td>
                      <span className="badge-status">{getStatusLabel(p.status)}</span>
                    </td>
                    <td className="text-meta">{p.propertyType}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => openDrawer(p)}
                      >
                        <i className="bi bi-sliders me-1"></i>
                        <span>{isRtl ? 'إدارة' : 'Manage'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(n) => load(n, q, status)} />
        </>
      )}

      {showAdd && (
        <Modal
          title={created ? (isRtl ? `تم النشر — ${created.title}` : `Published — ${created.title}`) : (isRtl ? 'إضافة عقار جديد' : 'Add property')}
          onClose={closeAdd}
        >
          {!created ? (
            <>
              <p className="text-meta">
                {isRtl
                  ? 'العقارات التي يضيفها المدير تُنشر مباشرة للجمهور، ويمكنك إضافة الصور ومقاطع الفيديو فوراً.'
                  : 'Created by an admin goes live immediately (Published). Add photos right after.'}
              </p>
              <AdminPropertyForm
                idPrefix="add"
                submitLabel={isRtl ? 'نشر العقار' : 'Publish property'}
                saving={addSaving}
                serverErrors={addErrors}
                onSubmit={handleAdd}
              />
            </>
          ) : (
            <div>
              <p className="text-meta">
                {created.referenceNumber} · {getStatusLabel(created.status)} · {created.purpose}
              </p>
              <h6 className="mt-3">{isRtl ? 'الصور ومقاطع الفيديو' : 'Photos & videos'}</h6>
              <div className="adm-upload-row">
                <select
                  value={uploadKind}
                  onChange={(e) => setUploadKind(e.target.value)}
                  aria-label="Media kind"
                >
                  <option value="image">{isRtl ? 'صورة' : 'Image'}</option>
                  <option value="video">{isRtl ? 'فيديو' : 'Video'}</option>
                </select>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
                  multiple
                  onChange={(e) => {
                    uploadFiles(created.id, [...e.target.files]);
                    e.target.value = '';
                  }}
                  disabled={uploading}
                  aria-label="Upload media files"
                />
              </div>
              <div className="adm-upload-row">
                <input
                  className="form-control"
                  placeholder={isRtl ? '…أو الصق رابط صورة/فيديو مباشر' : '…or paste an image/video URL'}
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  disabled={uploading}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={uploading || !uploadUrl.trim()}
                  onClick={() => attachUrl(created.id)}
                >
                  {isRtl ? 'ربط' : 'Attach'}
                </button>
              </div>
              {uploading && <p className="text-meta">{isRtl ? 'جارٍ الرفع…' : 'Working…'}</p>}
              <div className="adm-upload-actions">
                <Link
                  to={`/properties/${created.slug}`}
                  className="btn btn-outline-secondary btn-sm"
                  target="_blank"
                  rel="noreferrer"
                >
                  {isRtl ? 'معاينة على الموقع' : 'View live'}
                </Link>
                <button type="button" className="btn btn-brand btn-sm" onClick={() => setCreated(null)}>
                  {isRtl ? 'إضافة عقار آخر' : 'Add another'}
                </button>
                <button type="button" className="btn btn-link btn-sm" onClick={closeAdd}>
                  {isRtl ? 'تم' : 'Done'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {selected && (
        <Modal
          title={isRtl ? `إدارة: ${selected.title}` : `Manage — ${selected.title}`}
          onClose={() => setSelected(null)}
        >
          <p className="text-meta">
            {selected.referenceNumber} · {getStatusLabel(selected.status)} · {selected.purpose}
          </p>

          {/* Owner Information Block (Admin-Only Visibility) */}
          <div className="card mb-3 border-0 bg-light p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-semibold text-secondary small">
                <i className="bi bi-person-badge me-1"></i>
                {isRtl ? 'بيانات المالك والمسؤولية' : 'Property Owner & Responsibility'}
              </span>
              <span className={`badge ${selected.ownerType === 'RegisteredUser' ? 'bg-primary' : selected.ownerType === 'Broker' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                {selected.ownerType === 'RegisteredUser'
                  ? (isRtl ? 'مستخدم مسجل' : 'Registered User')
                  : selected.ownerType === 'Broker'
                  ? (isRtl ? 'وسيط عقاري' : 'Broker')
                  : selected.ownerType === 'Independent'
                  ? (isRtl ? 'مالك مستقل' : 'Independent Owner')
                  : (isRtl ? 'إدارة داركم المباشرة' : 'Direct Management')}
              </span>
            </div>

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <strong className="fs-6 d-block text-dark">
                  {selected.ownerName || (isRtl ? 'غير محدد' : 'Not specified')}
                </strong>
                {selected.ownerPhone ? (
                  <span className="text-muted small" dir="ltr">
                    <i className="bi bi-telephone me-1"></i>
                    {selected.ownerPhone}
                  </span>
                ) : (
                  <span className="text-muted small">{isRtl ? 'لا يوجد رقم هاتف' : 'No phone provided'}</span>
                )}
              </div>

              {selected.ownerPhone && (
                <div className="d-flex gap-2">
                  <a
                    href={`https://wa.me/${selected.ownerPhone.replace(/\D/g, '').replace(/^01/, '201')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                    title="WhatsApp"
                  >
                    <i className="bi bi-whatsapp"></i>
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${selected.ownerPhone}`}
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                    title="Call"
                  >
                    <i className="bi bi-telephone"></i>
                    <span>{isRtl ? 'اتصال' : 'Call'}</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="drawer-actions">
            {selected.status === 'PendingReview' && (
              <>
                <button
                  type="button"
                  className="btn btn-brand btn-sm"
                  onClick={() => setConfirm({ mode: 'approve', item: selected })}
                >
                  {isRtl ? 'موافقة ونشر' : 'Approve'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setConfirm({ mode: 'reject', item: selected })}
                >
                  {isRtl ? 'رفض' : 'Reject'}
                </button>
              </>
            )}
            <select
              value={selected.status}
              onChange={(e) => setConfirm({ mode: 'status', item: selected, to: e.target.value })}
              aria-label="Change status"
            >
              {[...new Set([...LIFECYCLE, selected.status])].map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setConfirm({ mode: 'feature', item: selected })}
            >
              {selected.isFeatured ? (isRtl ? 'إلغاء التمييز' : 'Unfeature') : (isRtl ? 'تعيين كمميز' : 'Feature')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setConfirm({ mode: 'verify', item: selected })}
            >
              {selected.isVerified ? (isRtl ? 'إلغاء التوثيق' : 'Unverify') : (isRtl ? 'توثيق العقار' : 'Verify')}
            </button>
            <Link
              to={`/properties/${selected.slug}`}
              className="btn btn-outline-secondary btn-sm"
              target="_blank"
              rel="noreferrer"
            >
              {isRtl ? 'معاينة حية' : 'View live'}
            </Link>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => setConfirm({ mode: 'archive', item: selected })}
            >
              {isRtl ? 'أرشفة' : 'Archive'}
            </button>
            <button
              type="button"
              className="btn btn-outline-info btn-sm"
              onClick={() => openRentalPeriods(selected)}
            >
              <i className="bi bi-calendar2-range me-1"></i>
              <span>{isRtl ? 'فترات الإيجار' : 'Rental Periods'}</span>
            </button>
          </div>
          <div className="apf-drawer-edit">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                setEditing((v) => !v);
                setEditErrors({});
              }}
            >
              <i className={`bi ${editing ? 'bi-chevron-up' : 'bi-pencil'} me-1`}></i>
              <span>{editing ? (isRtl ? 'إخفاء استمارة التعديل' : 'Hide edit form') : (isRtl ? 'تعديل البيانات' : 'Edit details')}</span>
            </button>
            {editing && (
              <div className="mt-3">
                <AdminPropertyForm
                  initial={selected}
                  idPrefix={`edit-${selected.id}`}
                  submitLabel={isRtl ? 'حفظ التغييرات' : 'Save changes'}
                  saving={editSaving}
                  serverErrors={editErrors}
                  onSubmit={handleEditSave}
                />
              </div>
            )}
          </div>
          <h6 className="mt-4">
            {isRtl ? `الوسائط والصور (${media.length})` : `Media (${media.length})`}
          </h6>
          <div className="adm-upload-row">
            <select
              value={uploadKind}
              onChange={(e) => setUploadKind(e.target.value)}
              aria-label="Media kind"
            >
              <option value="image">{isRtl ? 'صورة' : 'Image'}</option>
              <option value="video">{isRtl ? 'فيديو' : 'Video'}</option>
            </select>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
              multiple
              onChange={(e) => {
                uploadFiles(selected.id, [...e.target.files]);
                e.target.value = '';
              }}
              disabled={uploading}
              aria-label="Upload media files"
            />
          </div>
          <div className="adm-upload-row">
            <input
              className="form-control"
              placeholder={isRtl ? '…أو الصق رابط صورة/فيديو مباشر' : '…or paste an image/video URL'}
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              disabled={uploading}
            />
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={uploading || !uploadUrl.trim()}
              onClick={() => attachUrl(selected.id)}
            >
              {isRtl ? 'ربط' : 'Attach'}
            </button>
          </div>
          {uploading && <p className="text-meta">{isRtl ? 'جارٍ العمل…' : 'Working…'}</p>}
          <div className="drawer-media">
            {media.map((m) => (
              <div key={`${m.kind}-${m.id}`} className="drawer-media-item position-relative">
                {m.kind === 'image' ? (
                  <>
                    <img src={m.url} alt={m.altText || ''} loading="lazy" />
                    {m.isPrimary ? (
                      <span className="badge bg-warning text-dark position-absolute top-0 start-0 m-1" style={{ fontSize: '0.72rem' }}>
                        ★ {isRtl ? 'صورة الغلاف' : 'Cover'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning py-0 px-1 position-absolute top-0 start-0 m-1"
                        style={{ fontSize: '0.7rem', backgroundColor: 'rgba(0,0,0,0.65)', color: '#d4af37', borderColor: '#d4af37' }}
                        onClick={() => setPrimaryImage(m.id)}
                        title={isRtl ? 'تعيين كغلاف' : 'Set as cover'}
                      >
                        {isRtl ? 'تعيين كغلاف' : 'Set Cover'}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="badge-status">{m.kind}</span>
                )}
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger"
                  onClick={() => deleteMedia(m.kind, m.id)}
                >
                  {isRtl ? 'حذف' : 'Delete'}
                </button>
              </div>
            ))}
            {media.length === 0 && (
              <p className="text-meta">{isRtl ? 'لا توجد وسائط مرفقة حتى الآن.' : 'No media attached.'}</p>
            )}
          </div>
        </Modal>
      )}

      {rentalModal && (
        <Modal
          title={isRtl ? `فترات إيجار: ${rentalModal.prop.title}` : `Rental Periods: ${rentalModal.prop.title}`}
          onClose={() => setRentalModal(null)}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-meta small">
              {isRtl ? 'الفترات المؤكدة تُحجب فوراً من التقويم العام.' : 'Confirmed periods are blocked on the public calendar.'}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-brand"
              onClick={() => setShowAddPeriod((v) => !v)}
            >
              <i className={`bi ${showAddPeriod ? 'bi-dash' : 'bi-plus-lg'} me-1`}></i>
              <span>{showAddPeriod ? (isRtl ? 'إلغاء' : 'Cancel') : (isRtl ? 'إضافة فترة إيجار' : 'Add Period')}</span>
            </button>
          </div>

          {showAddPeriod && (
            <form onSubmit={handleAddPeriod} className="card p-3 mb-3 bg-light-subtle border">
              <h6 className="mb-2 fs-6">{isRtl ? 'إضافة فترة حجز مؤكدة' : 'Add Confirmed Booking Period'}</h6>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small">{isRtl ? 'تاريخ البدء' : 'Start Date'}</label>
                  <input
                    type="date"
                    required
                    className="form-control form-control-sm"
                    value={newPeriod.startDate}
                    onChange={(e) => setNewPeriod((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small">{isRtl ? 'تاريخ الانتهاء' : 'End Date'}</label>
                  <input
                    type="date"
                    required
                    className="form-control form-control-sm"
                    value={newPeriod.endDate}
                    onChange={(e) => setNewPeriod((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small">{isRtl ? 'اسم المستأجر' : 'Renter Name'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ahmed Ali"
                    className="form-control form-control-sm"
                    value={newPeriod.renterName}
                    onChange={(e) => setNewPeriod((p) => ({ ...p, renterName: e.target.value }))}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small">{isRtl ? 'رقم الهاتف' : 'Renter Phone'}</label>
                  <input
                    type="tel"
                    placeholder="01012345678"
                    className="form-control form-control-sm"
                    value={newPeriod.renterPhone}
                    onChange={(e) => setNewPeriod((p) => ({ ...p, renterPhone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label small">{isRtl ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}</label>
                <input
                  type="text"
                  placeholder="Direct booking / Paid deposit"
                  className="form-control form-control-sm"
                  value={newPeriod.notes}
                  onChange={(e) => setNewPeriod((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <div className="text-end">
                <button type="submit" className="btn btn-sm btn-brand" disabled={addingPeriod}>
                  {addingPeriod ? (isRtl ? 'جارٍ الحفظ…' : 'Saving…') : (isRtl ? 'حفظ وتأكيد' : 'Save Period')}
                </button>
              </div>
            </form>
          )}

          {rentalModal.loading ? (
            <LoadingSkeleton count={3} />
          ) : rentalModal.periods.length === 0 ? (
            <p className="text-muted text-center py-4">{isRtl ? 'لا توجد فترات إيجار مؤكدة لهذا العقار.' : 'No confirmed rental periods for this property.'}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>{isRtl ? 'المستأجر' : 'Renter'}</th>
                    <th>{isRtl ? 'الهاتف' : 'Phone'}</th>
                    <th>{isRtl ? 'تاريخ البدء' : 'Start Date'}</th>
                    <th>{isRtl ? 'تاريخ الانتهاء' : 'End Date'}</th>
                    <th>{isRtl ? 'ملاحظات' : 'Notes'}</th>
                    <th>{isRtl ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rentalModal.periods.map((rp) => (
                    <tr key={rp.id}>
                      <td><strong>{rp.renterName}</strong></td>
                      <td dir="ltr">{rp.renterPhone || '—'}</td>
                      <td>{new Date(rp.startDate).toLocaleDateString()}</td>
                      <td>{new Date(rp.endDate).toLocaleDateString()}</td>
                      <td className="text-muted small">{rp.notes || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-0"
                          onClick={() => handleDeletePeriod(rp.id)}
                          title={isRtl ? 'حذف فترة الإيجار' : 'Delete period'}
                        >
                          <i className="bi bi-trash3"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.mode === 'approve'
              ? (isRtl ? 'الموافقة على العقار ونشره؟' : 'Approve property?')
              : confirm.mode === 'reject'
              ? (isRtl ? 'رفض إدراج العقار؟' : 'Reject property?')
              : confirm.mode === 'archive'
              ? (isRtl ? 'أرشفة العقار؟' : 'Archive property?')
              : (isRtl ? `تغيير الحالة إلى ${getStatusLabel(confirm.to)}؟` : `Set status to ${confirm.to || ''}?`)
          }
          message={
            confirm.mode === 'archive'
              ? (isRtl
                  ? `سيتم أرشفة “${confirm.item.title}” وإخفاؤه من العرض العام مع حفظ السجل. اكتب ARCHIVE للتأكيد.`
                  : `“${confirm.item.title}” will be archived and hidden everywhere. History is preserved. Type ARCHIVE to confirm.`)
              : undefined
          }
          confirmLabel={
            confirm.mode === 'archive'
              ? (isRtl ? 'أرشفة' : 'Archive')
              : confirm.mode === 'reject'
              ? (isRtl ? 'رفض' : 'Reject')
              : (isRtl ? 'تأكيد' : 'Confirm')
          }
          danger={confirm.mode === 'reject' || confirm.mode === 'archive'}
          requireReason={confirm.mode === 'reject'}
          requireTyped={confirm.mode === 'archive' ? 'ARCHIVE' : undefined}
          reason={reason}
          setReason={setReason}
          typed={typed}
          setTyped={setTyped}
          busy={busy}
          onConfirm={doConfirm}
          onClose={closeConfirm}
        />
      )}
    </div>
  );
}
