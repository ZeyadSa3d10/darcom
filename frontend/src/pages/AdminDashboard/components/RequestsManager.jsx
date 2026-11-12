import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { adminService } from '../../../services/adminService.js';
import './RequestsManager.css';

const STATUSES = ['', 'Pending', 'UnderReview', 'Contacted', 'Negotiation', 'Approved', 'Rejected', 'Completed', 'Cancelled'];

// kind: 'purchase' | 'booking'
export default function RequestsManager({ kind, onChanged, refreshTrigger = 0 }) {
  const { t, isRtl } = useSettings();
  const toast = useToast();
  const isPurchase = kind === 'purchase';
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('loading');
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const getStatusLabel = (st) => {
    if (!st) return isRtl ? 'كافة الحالات' : 'All statuses';
    const map = {
      Pending: isRtl ? 'قيد الانتظار' : 'Pending',
      UnderReview: isRtl ? 'قيد المراجعة' : 'Under Review',
      Contacted: isRtl ? 'تم التواصل' : 'Contacted',
      Negotiation: isRtl ? 'قيد التفاوض' : 'Negotiation',
      Approved: isRtl ? 'تمت الموافقة' : 'Approved',
      Rejected: isRtl ? 'مرفوض' : 'Rejected',
      Completed: isRtl ? 'مكتمل بنجاح' : 'Completed',
      Cancelled: isRtl ? 'ملغي' : 'Cancelled',
    };
    return map[st] || st;
  };

  const load = useCallback(async (p = 1, st = '') => {
    setState('loading');
    try {
      const fn = isPurchase ? adminService.purchaseRequests : adminService.bookingRequests;
      const res = await fn(st ? { status: st, page: p, pageSize: 12 } : { page: p, pageSize: 12 });
      setItems(res.data?.data ?? []);
      setTotal(res.data?.totalCount ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
      setPage(res.data?.page ?? p);
      setState('done');
    } catch {
      setState('error');
    }
  }, [isPurchase]);

  useEffect(() => {
    load(1, '');
  }, [load, kind]);

  useEffect(() => {
    if (refreshTrigger > 0) load(page, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const openRow = (row) => {
    setSelected(row);
    setNextStatus('');
    setNotes('');
  };

  const applyStatus = async () => {
    if (!selected || !nextStatus) return;
    setBusy(true);
    try {
      const payload = { status: nextStatus };
      if (isPurchase) payload.adminNotes = notes || null;
      if (isPurchase) {
        await adminService.setPurchaseStatus(selected.id, payload);
      } else {
        await adminService.setBookingStatus(selected.id, { status: nextStatus });
      }
      toast.success(
        isRtl
          ? `تم تحديث حالة المعاملة إلى (${getStatusLabel(nextStatus)}) وإشعار العميل.`
          : `Request ${nextStatus.toLowerCase()}. Customer notified.`
      );
      setSelected(null);
      load(page, status);
      onChanged?.();
    } catch (e) {
      toast.error(e.message || (isRtl ? 'فشل تغيير الحالة.' : 'Status change failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            load(1, e.target.value);
          }}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {getStatusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && (
        <ErrorState
          error={isRtl ? 'تعذر تحميل قائمة الطلبات.' : 'Could not load requests.'}
          onRetry={() => load(page, status)}
        />
      )}
      {state === 'done' && total === 0 && (
        <EmptyState
          icon="bi-inbox"
          title={isRtl ? 'لا توجد طلبات مسجلة' : 'No requests.'}
          message={isRtl ? 'ستظهر هنا كافة طلبات العملاء الجديدة فور وصولها.' : 'New customer requests appear here.'}
        />
      )}
      {state === 'done' && total > 0 && (
        <>
          <p className="text-meta">
            {total} {isRtl ? 'معاملة مسجلة' : 'requests'}
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.table.number', isRtl ? 'رقم المعاملة' : 'Number')}</th>
                  <th>{t('admin.table.property', isRtl ? 'العقار' : 'Property')}</th>
                  <th>{t('admin.table.customer', isRtl ? 'العميل' : 'Customer')}</th>
                  <th>{t('admin.table.status', isRtl ? 'الحالة' : 'Status')}</th>
                  <th>{t('admin.table.date', isRtl ? 'التاريخ' : 'Date')}</th>
                  <th>{t('admin.table.actions', isRtl ? 'الإجراءات' : 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.requestNumber}</strong>
                    </td>
                    <td>{r.property?.title}</td>
                    <td>
                      <strong>{r.fullName}</strong>
                      <br />
                      <span className="text-meta">{r.email}</span>
                    </td>
                    <td>
                      <span className="badge-status">{getStatusLabel(r.status)}</span>
                    </td>
                    <td className="text-meta">
                      {new Date(r.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => openRow(r)}
                      >
                        <i className="bi bi-pencil-square me-1"></i>
                        <span>{isRtl ? 'مراجعة وتعديل' : 'Review'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(n) => load(n, status)} />
        </>
      )}

      {selected && (
        <Modal
          title={isRtl ? `طلب رقم: ${selected.requestNumber}` : `Request ${selected.requestNumber}`}
          onClose={() => setSelected(null)}
        >
          <dl className="review-list">
            <div>
              <dt>{isRtl ? 'العقار المطلوب' : 'Property'}</dt>
              <dd>{selected.property?.title}</dd>
            </div>
            <div>
              <dt>{isRtl ? 'سعر العقار' : 'Price'}</dt>
              <dd>
                {Number(selected.property?.price).toLocaleString('en-US')} {selected.property?.currency || t('common.egp', 'EGP')}
              </dd>
            </div>
            <div>
              <dt>{isRtl ? 'اسم العميل ورقم الهاتف' : 'Customer'}</dt>
              <dd>
                {selected.fullName} · <span dir="ltr">{selected.phone}</span>
              </dd>
            </div>
            <div>
              <dt>{isRtl ? 'البريد الإلكتروني' : 'Email'}</dt>
              <dd>{selected.email}</dd>
            </div>
            {selected.paymentMethod && (
              <div>
                <dt>{isRtl ? 'طريقة السداد' : 'Payment'}</dt>
                <dd>
                  {selected.paymentMethod}
                  {selected.financingRequired ? (isRtl ? ' · تمويل عقاري' : ' · financing') : ''}
                </dd>
              </div>
            )}
            {selected.timeline && (
              <div>
                <dt>{isRtl ? 'الجدول الزمني المستهدف' : 'Timeline'}</dt>
                <dd>{selected.timeline}</dd>
              </div>
            )}
            <div>
              <dt>{isRtl ? 'الحالة الحالية' : 'Status'}</dt>
              <dd>
                <span className="badge-status">{getStatusLabel(selected.status)}</span>
              </dd>
            </div>
          </dl>
          <div className="darcom-field mt-3">
            <label htmlFor="req-status">{isRtl ? 'تحديث حالة المعاملة' : 'Change status'}</label>
            <select
              id="req-status"
              className="form-select"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              <option value="">{isRtl ? 'اختر الحالة الجديدة…' : 'Select…'}</option>
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          {isPurchase && (
            <div className="darcom-field">
              <label htmlFor="req-notes">{isRtl ? 'ملاحظات الإدارة الداخلية' : 'Admin notes'}</label>
              <textarea
                id="req-notes"
                rows="2"
                className="form-control"
                placeholder={isRtl ? 'اكتب ملاحظات للمتابعة الداخلية…' : 'Internal notes…'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setSelected(null)}>
              {t('common.close', isRtl ? 'إغلاق' : 'Close')}
            </button>
            <button
              type="button"
              className="btn btn-brand"
              disabled={!nextStatus || busy}
              onClick={applyStatus}
            >
              {busy ? (isRtl ? 'جارٍ الحفظ…' : 'Saving…') : (isRtl ? 'تطبيق وتحديث' : 'Apply')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
