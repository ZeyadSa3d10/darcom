import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { adminService } from '../../../services/adminService.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import './ApprovalQueue.css';

export default function ApprovalQueue({ onChanged }) {
  const { t, isRtl } = useSettings();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState('loading');
  const [confirm, setConfirm] = useState(null); // { mode: 'approve'|'reject', item }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p = 1) => {
    setState('loading');
    try {
      const res = await adminService.properties({ status: 'PendingReview', page: p, pageSize: 10 });
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

  const closeConfirm = () => {
    setConfirm(null);
    setReason('');
    setBusy(false);
  };

  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.mode === 'approve') {
        await adminService.approveProperty(confirm.item.id);
        toast.success(
          isRtl
            ? `تم اعتماد ونشر “${confirm.item.title}” بنجاح وإشعار المالك.`
            : `“${confirm.item.title}” published. Owner notified.`
        );
      } else {
        await adminService.rejectProperty(confirm.item.id, reason.trim());
        toast.success(
          isRtl
            ? `تم رفض إدراج “${confirm.item.title}” وإرسال السبب للمالك.`
            : `“${confirm.item.title}” rejected with reason.`
        );
      }
      closeConfirm();
      load(page);
      onChanged?.();
    } catch (e) {
      toast.error(e.message || (isRtl ? 'تعذر تنفيذ الإجراء.' : 'Action failed.'));
      setBusy(false);
    }
  };

  if (state === 'loading') return <LoadingSkeleton count={3} />;
  if (state === 'error') {
    return (
      <ErrorState
        error={isRtl ? 'تعذر تحميل قائمة طلبات المراجعة.' : 'Could not load the approval queue.'}
        onRetry={() => load(page)}
      />
    );
  }
  if (!items.length) {
    return (
      <div className="approval-empty-wrap">
        <EmptyState
          icon="bi-check2-circle"
          title={t('admin.queue.emptyTitle', isRtl ? 'قائمة المراجعة فارغة' : 'Queue is clear')}
          message={t(
            'admin.queue.emptyMessage',
            isRtl
              ? 'لا توجد عقارات بانتظار المراجعة أو الاعتماد حالياً.'
              : 'No properties waiting for review.'
          )}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="queue-list">
        {items.map((p) => (
          <div key={p.id} className="queue-row">
            <img src={p.primaryImageUrl || '/placeholder-property.svg'} alt={p.title} loading="lazy" />
            <div className="queue-info">
              <strong>{p.title}</strong>
              <span className="text-meta">
                {p.referenceNumber} · {p.propertyType} · {p.location}
                {p.city ? `, ${p.city}` : ''}
              </span>
              <span className="text-meta">
                {Number(p.price).toLocaleString('en-US')} {p.currency || t('common.egp', 'EGP')} · {p.purpose}
              </span>
            </div>
            <div className="queue-actions">
              <Link
                to={`/properties/${p.slug}`}
                className="btn btn-outline-secondary btn-sm"
                target="_blank"
                rel="noreferrer"
              >
                <i className="bi bi-eye me-1"></i>
                <span>{t('admin.queue.preview', isRtl ? 'معاينة' : 'Preview')}</span>
              </Link>
              <button
                type="button"
                className="btn btn-brand btn-sm"
                onClick={() => setConfirm({ mode: 'approve', item: p })}
              >
                <i className="bi bi-check2 me-1"></i>
                <span>{t('admin.queue.approve', isRtl ? 'موافقة ونشر' : 'Approve')}</span>
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => setConfirm({ mode: 'reject', item: p })}
              >
                <i className="bi bi-x-lg me-1"></i>
                <span>{t('admin.queue.reject', isRtl ? 'رفض' : 'Reject')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={(next) => load(next)} />

      {confirm && (
        <ConfirmDialog
          title={
            confirm.mode === 'approve'
              ? t('admin.queue.approveTitle', isRtl ? 'الموافقة على العقار ونشره؟' : 'Approve property?')
              : t('admin.queue.rejectTitle', isRtl ? 'رفض إدراج العقار؟' : 'Reject property?')
          }
          message={
            confirm.mode === 'approve'
              ? isRtl
                ? `سيتم نشر “${confirm.item.title}” ليصبح متاحاً للجمهور على موقع داركم، وإشعار المالك بالاعتماد.`
                : `“${confirm.item.title}” goes Published and becomes publicly visible. The owner is notified.`
              : isRtl
                ? `سيبقى “${confirm.item.title}” مخفياً، وسيصل سبب الرفض إلى المالك لتعديل البيانات.`
                : `“${confirm.item.title}” stays hidden. The owner receives your reason.`
          }
          confirmLabel={
            confirm.mode === 'approve'
              ? t('admin.queue.approve', isRtl ? 'موافقة ونشر' : 'Approve & publish')
              : t('admin.queue.reject', isRtl ? 'تأكيد الرفض' : 'Reject')
          }
          danger={confirm.mode === 'reject'}
          requireReason={confirm.mode === 'reject'}
          reason={reason}
          setReason={setReason}
          busy={busy}
          onConfirm={doConfirm}
          onClose={closeConfirm}
        />
      )}
    </div>
  );
}
