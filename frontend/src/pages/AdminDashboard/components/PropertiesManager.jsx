import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { adminService } from '../../../services/adminService.js';
import { propertyService } from '../../../services/propertyService.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import './PropertiesManager.css';

const STATUSES = ['', 'Draft', 'PendingReview', 'Published', 'Featured', 'Reserved', 'Sold', 'Rented', 'Archived', 'Rejected'];
const LIFECYCLE = ['Draft', 'Published', 'Featured', 'Reserved', 'Sold', 'Rented', 'Archived'];

export default function PropertiesManager({ onChanged }) {
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
    } catch (e) {
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
    try {
      const res = await propertyService.getById(row.id);
      setSelected(res.data);
      const m = await propertyService.media(row.id);
      setMedia(m.data ?? []);
    } catch (e) {
      toast.error('Could not load property details.');
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

  const afterMutation = async (id, message) => {
    toast.success(message);
    closeConfirm();
    load(page, q, status);
    onChanged?.();
    if (selected) await refreshDrawer(id).catch(() => setSelected(null));
  };

  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const id = confirm.item.id;
      if (confirm.mode === 'approve') {
        await adminService.approveProperty(id);
        await afterMutation(id, 'Published. Owner notified.');
      } else if (confirm.mode === 'reject') {
        await adminService.rejectProperty(id, reason.trim());
        await afterMutation(id, 'Rejected with reason.');
      } else if (confirm.mode === 'status') {
        await propertyService.update(id, { status: confirm.to });
        await afterMutation(id, `Status set to ${confirm.to}.`);
      } else if (confirm.mode === 'feature') {
        await propertyService.update(id, { isFeatured: !selected.isFeatured });
        await afterMutation(id, selected.isFeatured ? 'Removed from featured.' : 'Marked as featured.');
      } else if (confirm.mode === 'verify') {
        await propertyService.update(id, { isVerified: !selected.isVerified });
        await afterMutation(id, 'Verification updated.');
      } else if (confirm.mode === 'archive') {
        await propertyService.remove(id);
        setSelected(null);
        await afterMutation(id, 'Archived.');
      }
    } catch (e) {
      toast.error(e.message || 'Action failed.');
      setBusy(false);
    }
  };

  const deleteMedia = async (kind, mediaId) => {
    if (!selected) return;
    try {
      await propertyService.deleteMedia(selected.id, kind, mediaId);
      const m = await propertyService.media(selected.id);
      setMedia(m.data ?? []);
      toast.success('Media deleted.');
    } catch (e) {
      toast.error(e.message || 'Could not delete media.');
    }
  };

  return (
    <div>
      <form className="admin-toolbar" onSubmit={search}>
        <div className="search-input">
          <i className="bi bi-search"></i>
          <input
            type="search" placeholder="Search title, reference…" value={q}
            onChange={(e) => setQ(e.target.value)} aria-label="Search properties"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); load(1, q, e.target.value); }} aria-label="Filter by status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-brand btn-sm">Search</button>
      </form>

      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && <ErrorState error="Could not load properties." onRetry={() => load(page, q, status)} />}
      {state === 'done' && total === 0 && (
        <EmptyState icon="bi-buildings" title="No properties match." message="Adjust search or status filter." />
      )}
      {state === 'done' && total > 0 && (
        <>
          <p className="text-meta">{total} properties</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Ref</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td className="text-meta">{p.referenceNumber}</td>
                    <td>{Number(p.price).toLocaleString()} {p.currency}</td>
                    <td><span className="badge-status">{p.status}</span></td>
                    <td className="text-meta">{p.propertyType}</td>
                    <td><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openDrawer(p)}>Manage</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(n) => load(n, q, status)} />
        </>
      )}

      {selected && (
        <Modal title={`Manage — ${selected.title}`} onClose={() => setSelected(null)}>
          <p className="text-meta">{selected.referenceNumber} · {selected.status} · {selected.purpose}</p>
          <div className="drawer-actions">
            {selected.status === 'PendingReview' && (
              <>
                <button type="button" className="btn btn-brand btn-sm" onClick={() => setConfirm({ mode: 'approve', item: selected })}>Approve</button>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirm({ mode: 'reject', item: selected })}>Reject</button>
              </>
            )}
            <select
              value={selected.status}
              onChange={(e) => setConfirm({ mode: 'status', item: selected, to: e.target.value })}
              aria-label="Change status"
            >
              {[...new Set([...LIFECYCLE, selected.status])].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setConfirm({ mode: 'feature', item: selected })}>
              {selected.isFeatured ? 'Unfeature' : 'Feature'}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setConfirm({ mode: 'verify', item: selected })}>
              {selected.isVerified ? 'Unverify' : 'Verify'}
            </button>
            <Link to={`/properties/${selected.slug}`} className="btn btn-outline-secondary btn-sm" target="_blank" rel="noreferrer">
              View live
            </Link>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirm({ mode: 'archive', item: selected })}>
              Archive
            </button>
          </div>
          <h6 className="mt-4">Media ({media.length})</h6>
          <div className="drawer-media">
            {media.map((m) => (
              <div key={`${m.kind}-${m.id}`} className="drawer-media-item">
                {m.kind === 'image' ? (
                  <img src={m.url} alt={m.altText || ''} loading="lazy" />
                ) : (
                  <span className="badge-status">{m.kind}</span>
                )}
                <button type="button" className="btn btn-link btn-sm text-danger" onClick={() => deleteMedia(m.kind, m.id)}>
                  Delete
                </button>
              </div>
            ))}
            {media.length === 0 && <p className="text-meta">No media attached.</p>}
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.mode === 'approve' ? 'Approve property?' :
            confirm.mode === 'reject' ? 'Reject property?' :
            confirm.mode === 'archive' ? 'Archive property?' :
            `Set status to ${confirm.to || ''}?`
          }
          message={
            confirm.mode === 'archive'
              ? `“${confirm.item.title}” will be archived and hidden everywhere. History is preserved. Type ARCHIVE to confirm.`
              : undefined
          }
          confirmLabel={confirm.mode === 'archive' ? 'Archive' : confirm.mode === 'reject' ? 'Reject' : 'Confirm'}
          danger={confirm.mode === 'reject' || confirm.mode === 'archive'}
          requireReason={confirm.mode === 'reject'}
          requireTyped={confirm.mode === 'archive' ? 'ARCHIVE' : undefined}
          reason={reason} setReason={setReason}
          typed={typed} setTyped={setTyped}
          busy={busy}
          onConfirm={doConfirm}
          onClose={closeConfirm}
        />
      )}
    </div>
  );
}

