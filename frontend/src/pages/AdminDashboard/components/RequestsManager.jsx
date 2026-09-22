import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { adminService } from '../../../services/adminService.js';
import './RequestsManager.css';

const STATUSES = ['', 'Pending', 'UnderReview', 'Contacted', 'Negotiation', 'Approved', 'Rejected', 'Completed', 'Cancelled'];

// kind: 'purchase' | 'booking'
export default function RequestsManager({ kind, onChanged }) {
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
    } catch (e) {
      setState('error');
    }
  }, [isPurchase]);

  useEffect(() => {
    load(1, '');
  }, [load, kind]);

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
      toast.success(`Request ${nextStatus.toLowerCase()}. Customer notified.`);
      setSelected(null);
      load(page, status);
      onChanged?.();
    } catch (e) {
      toast.error(e.message || 'Status change failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); load(1, e.target.value); }} aria-label="Filter by status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
      </div>

      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && <ErrorState error="Could not load requests." onRetry={() => load(page, status)} />}
      {state === 'done' && total === 0 && (
        <EmptyState icon="bi-inbox" title="No requests." message="New customer requests appear here." />
      )}
      {state === 'done' && total > 0 && (
        <>
          <p className="text-meta">{total} requests</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Property</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.requestNumber}</strong></td>
                    <td>{r.property?.title}</td>
                    <td>{r.fullName}<br /><span className="text-meta">{r.email}</span></td>
                    <td><span className="badge-status">{r.status}</span></td>
                    <td className="text-meta">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openRow(r)}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(n) => load(n, status)} />
        </>
      )}

      {selected && (
        <Modal title={`Request ${selected.requestNumber}`} onClose={() => setSelected(null)}>
          <dl className="review-list">
            <div><dt>Property</dt><dd>{selected.property?.title}</dd></div>
            <div><dt>Price</dt><dd>{Number(selected.property?.price).toLocaleString()} {selected.property?.currency}</dd></div>
            <div><dt>Customer</dt><dd>{selected.fullName} · {selected.phone}</dd></div>
            <div><dt>Email</dt><dd>{selected.email}</dd></div>
            {selected.paymentMethod && <div><dt>Payment</dt><dd>{selected.paymentMethod}{selected.financingRequired ? ' · financing' : ''}</dd></div>}
            {selected.timeline && <div><dt>Timeline</dt><dd>{selected.timeline}</dd></div>}
            <div><dt>Status</dt><dd>{selected.status}</dd></div>
          </dl>
          <div className="darcom-field mt-3">
            <label htmlFor="req-status">Change status</label>
            <select id="req-status" className="form-select" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              <option value="">Select…</option>
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {isPurchase && (
            <div className="darcom-field">
              <label htmlFor="req-notes">Admin notes</label>
              <textarea id="req-notes" rows="2" className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
          <div className="d-flex justify-content-end gap-2 mt-3">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setSelected(null)}>Close</button>
            <button type="button" className="btn btn-brand" disabled={!nextStatus || busy} onClick={applyStatus}>
              {busy ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
