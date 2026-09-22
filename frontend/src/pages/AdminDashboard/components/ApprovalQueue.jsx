import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { adminService } from '../../../services/adminService.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import './ApprovalQueue.css';

export default function ApprovalQueue({ onChanged }) {
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
    } catch (e) {
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
        toast.success(`“${confirm.item.title}” published. Owner notified.`);
      } else {
        await adminService.rejectProperty(confirm.item.id, reason.trim());
        toast.success(`“${confirm.item.title}” rejected with reason.`);
      }
      closeConfirm();
      load(page);
      onChanged?.();
    } catch (e) {
      toast.error(e.message || 'Action failed.');
      setBusy(false);
    }
  };

  if (state === 'loading') return <LoadingSkeleton count={3} />;
  if (state === 'error') {
    return <ErrorState error="Could not load the approval queue." onRetry={() => load(page)} />;
  }
  if (!items.length) {
    return (
      <EmptyState icon="bi-check2-circle" title="Queue is clear." message="No properties waiting for review." />
    );
  }

  return (
    <div>
      <div className="queue-list">
        {items.map((p) => (
          <div key={p.id} className="queue-row">
            <img src={p.primaryImageUrl || `https://picsum.photos/seed/darcom-${p.id}/160/120`} alt="" loading="lazy" />
            <div className="queue-info">
              <strong>{p.title}</strong>
              <span className="text-meta">{p.referenceNumber} · {p.propertyType} · {p.location}{p.city ? `, ${p.city}` : ''}</span>
              <span className="text-meta">{Number(p.price).toLocaleString()} {p.currency} · {p.purpose}</span>
            </div>
            <div className="queue-actions">
              <Link to={`/properties/${p.slug}`} className="btn btn-outline-secondary btn-sm" target="_blank" rel="noreferrer">
                Preview
              </Link>
              <button type="button" className="btn btn-brand btn-sm" onClick={() => setConfirm({ mode: 'approve', item: p })}>
                Approve
              </button>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirm({ mode: 'reject', item: p })}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={(next) => load(next)} />

      {confirm && (
        <ConfirmDialog
          title={confirm.mode === 'approve' ? 'Approve property?' : 'Reject property?'}
          message={
            confirm.mode === 'approve'
              ? `“${confirm.item.title}” goes Published and becomes publicly visible. The owner is notified.`
              : `“${confirm.item.title}” stays hidden. The owner receives your reason.`
          }
          confirmLabel={confirm.mode === 'approve' ? 'Approve & publish' : 'Reject'}
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
