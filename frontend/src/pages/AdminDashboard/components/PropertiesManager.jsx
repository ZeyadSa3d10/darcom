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
              <div key={`${m.kind}-${m.id}`} className="drawer-media-item">
                {m.kind === 'image' ? (
                  <img src={m.url} alt={m.altText || ''} loading="lazy" />
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
