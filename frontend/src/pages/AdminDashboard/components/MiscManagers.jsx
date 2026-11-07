import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { adminService } from '../../../services/adminService.js';
import { locationService } from '../../../services/locationService.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import './MiscManagers.css';

export function InquiriesManager() {
  const { t, isRtl } = useSettings();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState('loading');

  const load = useCallback(async (p = 1) => {
    setState('loading');
    try {
      const res = await adminService.inquiries({ page: p, pageSize: 15 });
      setItems(res.data?.data ?? []);
      setTotalPages(res.data?.totalPages ?? 1);
      setPage(res.data?.page ?? p);
      setState('done');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const markRead = async (id) => {
    try {
      await adminService.markInquiryRead(id);
      toast.success(isRtl ? 'تم تحديد الاستفسار كمقروء.' : 'Inquiry marked as read.');
      load(page);
    } catch {
      toast.error(isRtl ? 'تعذر تحديث الاستفسار.' : 'Could not update inquiry.');
    }
  };

  if (state === 'loading') return <LoadingSkeleton count={4} />;
  if (state === 'error') {
    return (
      <ErrorState
        error={isRtl ? 'تعذر تحميل استفسارات العملاء.' : 'Could not load inquiries.'}
        onRetry={() => load(page)}
      />
    );
  }
  if (!items.length) {
    return (
      <EmptyState
        icon="bi-envelope"
        title={isRtl ? 'لا توجد استفسارات مسجلة' : 'No inquiries.'}
        message={isRtl ? 'ستظهر هنا كافة رسائل واستفسارات العملاء الواردة من الموقع.' : 'Customer messages appear here.'}
      />
    );
  }

  return (
    <div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.table.from', isRtl ? 'المرسل' : 'From')}</th>
              <th>{t('admin.table.message', isRtl ? 'نص الاستفسار' : 'Message')}</th>
              <th>{t('admin.table.date', isRtl ? 'التاريخ' : 'Date')}</th>
              <th>{t('admin.table.actions', isRtl ? 'الإجراءات' : '')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className={m.isRead ? '' : 'row-unread'}>
                <td>
                  <strong>{m.name}</strong>
                  <br />
                  <span className="text-meta">
                    {m.email}
                    {m.phone ? ` · ${m.phone}` : ''}
                  </span>
                </td>
                <td className="wrap-cell">{m.message}</td>
                <td className="text-meta">
                  {new Date(m.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                </td>
                <td>
                  {!m.isRead ? (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => markRead(m.id)}
                    >
                      <i className="bi bi-check2 me-1"></i>
                      <span>{isRtl ? 'تحديد كمقروء' : 'Mark read'}</span>
                    </button>
                  ) : (
                    <span className="text-meta">{isRtl ? 'مقروء' : 'Read'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={(n) => load(n)} />
    </div>
  );
}

export function ReviewsManager({ onChanged }) {
  const { isRtl } = useSettings();
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState('loading');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p = 1, f = '') => {
    setState('loading');
    try {
      const params = { page: p, pageSize: 15 };
      if (f !== '') params.approved = f;
      const res = await adminService.reviews(params);
      setItems(res.data?.data ?? []);
      setTotalPages(res.data?.totalPages ?? 1);
      setPage(res.data?.page ?? p);
      setState('done');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(1, '');
  }, [load]);

  const setApproval = async (id, approved) => {
    try {
      await adminService.setReviewApproval(id, approved);
      toast.success(isRtl ? 'تم تحديث حالة التقييم.' : 'Review status updated.');
      onChanged?.();
      load(page, filter);
    } catch {
      toast.error(isRtl ? 'تعذر تحديث حالة التقييم.' : 'Could not update review.');
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await adminService.deleteReview(confirmDelete.id);
      toast.success(isRtl ? 'تم حذف التقييم.' : 'Review deleted.');
      setConfirmDelete(null);
      onChanged?.();
      load(page, filter);
    } catch {
      toast.error(isRtl ? 'تعذر حذف التقييم.' : 'Could not delete review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            load(1, e.target.value);
          }}
          aria-label="Filter reviews"
        >
          <option value="">{isRtl ? 'كافة التقييمات' : 'All reviews'}</option>
          <option value="false">{isRtl ? 'قيد المراجعة فقط' : 'Pending only'}</option>
          <option value="true">{isRtl ? 'المعتمدة والمعروضة' : 'Approved only'}</option>
        </select>
      </div>
      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && (
        <ErrorState
          error={isRtl ? 'تعذر تحميل التقييمات.' : 'Could not load reviews.'}
          onRetry={() => load(page, filter)}
        />
      )}
      {state === 'done' && !items.length && (
        <EmptyState
          icon="bi-star"
          title={isRtl ? 'لا توجد تقييمات' : 'No reviews.'}
          message={isRtl ? 'ستظهر هنا تقييمات العملاء للعقارات لمراجعتها واعتمادها.' : 'Customer reviews appear here for moderation.'}
        />
      )}
      {state === 'done' && items.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{isRtl ? 'العقار' : 'Property'}</th>
                  <th>{isRtl ? 'صاحب التقييم' : 'User'}</th>
                  <th>{isRtl ? 'التقييم' : 'Rating'}</th>
                  <th>{isRtl ? 'نص التعليق' : 'Comment'}</th>
                  <th>{isRtl ? 'الحالة' : 'Status'}</th>
                  <th>{isRtl ? 'الإجراءات' : ''}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.propertyTitle}</strong></td>
                    <td className="text-meta">{r.userName}</td>
                    <td>
                      <span className="text-warning">
                        {'★'.repeat(r.rating)}
                      </span>
                      <span className="text-muted">
                        {'☆'.repeat(Math.max(0, 5 - r.rating))}
                      </span>
                    </td>
                    <td className="wrap-cell">{r.comment || '—'}</td>
                    <td>
                      {r.isApproved ? (
                        <span className="badge-status">{isRtl ? 'معروض' : 'live'}</span>
                      ) : (
                        <span className="badge-status">{isRtl ? 'معلق' : 'pending'}</span>
                      )}
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setApproval(r.id, !r.isApproved)}
                      >
                        {r.isApproved ? (isRtl ? 'إخفاء' : 'Hide') : (isRtl ? 'موافقة' : 'Approve')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger"
                        onClick={() => setConfirmDelete(r)}
                      >
                        {isRtl ? 'حذف' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(n) => load(n, filter)} />
        </>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={isRtl ? 'حذف التقييم نهائياً؟' : 'Delete review?'}
          message={
            isRtl
              ? 'سيؤدي هذا الإجراء إلى حذف التقييم نهائياً من قاعدة البيانات. اكتب DELETE للتأكيد.'
              : 'This permanently removes the review. Type DELETE to confirm.'
          }
          confirmLabel={isRtl ? 'تأكيد الحذف' : 'Delete'}
          danger
          requireTyped="DELETE"
          busy={busy}
          onConfirm={doDelete}
          onClose={() => {
            setConfirmDelete(null);
            setBusy(false);
          }}
        />
      )}
    </div>
  );
}

export function CatalogManager() {
  const { isRtl } = useSettings();
  const toast = useToast();
  const [tab, setTab] = useState('types');
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');

  // Add Type Modal
  const [showAddType, setShowAddType] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', slug: '', icon: 'bi-building' });
  const [savingType, setSavingType] = useState(false);

  const subTabs = [
    ['types', isRtl ? 'أنواع العقارات' : 'Property types'],
    ['amenities', isRtl ? 'المميزات والمرافق' : 'Amenities'],
    ['locations', isRtl ? 'الوجهات والمواقع' : 'Locations'],
    ['agents', isRtl ? 'المستشارون العقاريون' : 'Agents'],
  ];

  const load = useCallback(async (t) => {
    setState('loading');
    try {
      let data = [];
      if (t === 'types') data = (await locationService.getPropertyTypes()).data ?? [];
      else if (t === 'amenities') data = (await locationService.getAmenities()).data ?? [];
      else if (t === 'locations') data = (await locationService.getLocations()).data ?? [];
      else if (t === 'agents') data = (await adminService.agents()).data ?? [];
      setRows(data);
      setState('done');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [load, tab]);

  const handleCreateType = async (e) => {
    e.preventDefault();
    setSavingType(true);
    try {
      await adminService.createPropertyType(typeForm);
      toast.success(isRtl ? 'تمت إضافة نوع العقار' : 'Property type created.');
      setShowAddType(false);
      setTypeForm({ name: '', slug: '', icon: 'bi-building' });
      load('types');
    } catch (err) {
      toast.error(err.message || 'Failed to create type.');
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا النوع؟' : 'Delete this property type?')) return;
    try {
      await adminService.deletePropertyType(id);
      toast.success(isRtl ? 'تم حذف نوع العقار' : 'Property type deleted.');
      load('types');
    } catch (err) {
      toast.error(err.message || 'Failed to delete type.');
    }
  };

  const renderRow = (r) => {
    if (tab === 'locations') {
      return (
        <tr key={r.id}>
          <td><strong>{r.name}</strong></td>
          <td className="text-meta">
            {r.city}
            {r.area ? ` · ${r.area}` : ''}
          </td>
          <td className="text-meta">#{r.id}</td>
        </tr>
      );
    }
    if (tab === 'agents') {
      return (
        <tr key={r.id}>
          <td><strong>{r.name}</strong></td>
          <td className="text-meta">
            {r.title || '—'}
            {r.agency ? ` · ${r.agency}` : ''}
          </td>
          <td>
            {r.isVerified ? (
              <span className="badge-verified">{isRtl ? 'معتمد وموثق' : 'Verified'}</span>
            ) : (
              <span className="badge-status">{isRtl ? 'غير موثق' : 'unverified'}</span>
            )}
          </td>
        </tr>
      );
    }
    if (tab === 'types') {
      return (
        <tr key={r.id || r.slug}>
          <td><strong>{r.name}</strong></td>
          <td className="text-meta">{r.slug || `#${r.id}`}</td>
          <td>{r.icon ? <i className={`bi ${r.icon}`}></i> : '—'}</td>
          <td>
            <button
              type="button"
              className="btn btn-link btn-sm text-danger"
              onClick={() => handleDeleteType(r.id)}
            >
              <i className="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      );
    }
    return (
      <tr key={r.id || r.slug}>
        <td><strong>{r.name}</strong></td>
        <td className="text-meta">{r.slug || `#${r.id}`}</td>
        <td>{r.icon ? <i className={`bi ${r.icon}`}></i> : '—'}</td>
      </tr>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <p className="text-meta m-0">
          {isRtl
            ? 'البيانات المرجعية والمصنفات للنظام.'
            : 'Reference catalog and lookups.'}
        </p>
        {tab === 'types' && (
          <button type="button" className="btn btn-brand btn-sm" onClick={() => setShowAddType(true)}>
            <i className="bi bi-plus-lg me-1"></i>
            {isRtl ? 'إضافة نوع عقار' : 'Add Property Type'}
          </button>
        )}
      </div>
      <div className="req-kind">
        {subTabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && (
        <ErrorState
          error={isRtl ? 'تعذر تحميل بيانات الدليل.' : 'Could not load catalog.'}
          onRetry={() => load(tab)}
        />
      )}
      {state === 'done' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{isRtl ? 'الاسم' : 'Name'}</th>
                <th>{isRtl ? 'التفاصيل / الرمز' : 'Detail'}</th>
                <th>{tab === 'agents' ? (isRtl ? 'الحالة' : 'Status') : (isRtl ? 'الأيقونة' : 'Icon')}</th>
                {tab === 'types' && <th>{isRtl ? 'الإجراء' : 'Action'}</th>}
              </tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      )}

      {showAddType && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{isRtl ? 'إضافة نوع عقار جديد' : 'Add Property Type'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddType(false)}></button>
              </div>
              <form onSubmit={handleCreateType}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Name *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={typeForm.name}
                      onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                      placeholder="e.g. Studio, Townhouse, Standalone Villa"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Slug (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={typeForm.slug}
                      onChange={(e) => setTypeForm({ ...typeForm, slug: e.target.value })}
                      placeholder="e.g. studio"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Bootstrap Icon (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={typeForm.icon}
                      onChange={(e) => setTypeForm({ ...typeForm, icon: e.target.value })}
                      placeholder="e.g. bi-house"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddType(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-brand" disabled={savingType}>
                    {savingType ? 'Saving…' : 'Save Type'}
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

export function AuditViewer() {
  const { isRtl } = useSettings();
  const [entity, setEntity] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState('loading');

  const load = useCallback(async (p = 1, e = '') => {
    setState('loading');
    try {
      const params = { page: p, pageSize: 20 };
      if (e) params.entity = e;
      const res = await adminService.auditLogs(params);
      setItems(res.data?.data ?? []);
      setTotalPages(res.data?.totalPages ?? 1);
      setPage(res.data?.page ?? p);
      setState('done');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(1, '');
  }, [load]);

  return (
    <div>
      <div className="admin-toolbar">
        <select
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            load(1, e.target.value);
          }}
          aria-label="Filter by entity"
        >
          <option value="">{isRtl ? 'كافة العمليات والكيانات' : 'All entities'}</option>
          <option value="Property">{isRtl ? 'العقارات (Property)' : 'Property'}</option>
          <option value="PurchaseRequest">{isRtl ? 'طلبات الشراء (PurchaseRequest)' : 'PurchaseRequest'}</option>
          <option value="BookingRequest">{isRtl ? 'طلبات الإيجار (BookingRequest)' : 'BookingRequest'}</option>
          <option value="User">{isRtl ? 'المستخدمون (User)' : 'User'}</option>
          <option value="Review">{isRtl ? 'التقييمات (Review)' : 'Review'}</option>
          <option value="PropertyInquiry">{isRtl ? 'الاستفسارات (PropertyInquiry)' : 'PropertyInquiry'}</option>
        </select>
      </div>
      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && (
        <ErrorState
          error={isRtl ? 'تعذر تحميل سجل العمليات.' : 'Could not load audit logs.'}
          onRetry={() => load(page, entity)}
        />
      )}
      {state === 'done' && !items.length && (
        <EmptyState
          icon="bi-journal-text"
          title={isRtl ? 'لا توجد عمليات مسجلة' : 'No audit entries.'}
          message={isRtl ? 'يتم توثيق وتسجيل كافة إجراءات المديرين تلقائياً هنا.' : 'Admin actions are recorded here.'}
        />
      )}
      {state === 'done' && items.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{isRtl ? 'الوقت والتاريخ' : 'Time'}</th>
                  <th>{isRtl ? 'نوع الإجراء' : 'Action'}</th>
                  <th>{isRtl ? 'الكيان المستهدف' : 'Entity'}</th>
                  <th>{isRtl ? 'التغيير (السابق → الحالي)' : 'Old → New'}</th>
                  <th>{isRtl ? 'عنوان IP' : 'IP'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="text-meta">
                      {new Date(a.timestamp).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                    </td>
                    <td>
                      <strong>{a.action}</strong>
                      <br />
                      <span className="text-meta">
                        {isRtl ? 'مستخدم' : 'user'} #{a.userId ?? '—'}
                      </span>
                    </td>
                    <td>
                      {a.entity} #{a.entityId}
                    </td>
                    <td className="wrap-cell text-meta">
                      {a.oldValue || '—'} → {a.newValue || '—'}
                    </td>
                    <td className="text-meta" dir="ltr">{a.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(n) => load(n, entity)} />
        </>
      )}
    </div>
  );
}
