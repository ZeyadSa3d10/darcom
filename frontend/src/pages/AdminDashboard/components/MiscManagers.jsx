import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { adminService } from '../../../services/adminService.js';
import { locationService } from '../../../services/locationService.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import './MiscManagers.css';

export function InquiriesManager() {
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
    } catch (e) {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const markRead = async (id) => {
    try {
      await adminService.markInquiryRead(id);
      load(page);
    } catch (e) {
      toast.error('Could not update inquiry.');
    }
  };

  if (state === 'loading') return <LoadingSkeleton count={4} />;
  if (state === 'error') return <ErrorState error="Could not load inquiries." onRetry={() => load(page)} />;
  if (!items.length) return <EmptyState icon="bi-envelope" title="No inquiries." message="Customer messages appear here." />;

  return (
    <div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>From</th>
              <th>Message</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className={m.isRead ? '' : 'row-unread'}>
                <td>{m.name}<br /><span className="text-meta">{m.email}{m.phone ? ` · ${m.phone}` : ''}</span></td>
                <td className="wrap-cell">{m.message}</td>
                <td className="text-meta">{new Date(m.createdAt).toLocaleDateString()}</td>
                <td>
                  {!m.isRead && (
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => markRead(m.id)}>
                      Mark read
                    </button>
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
    } catch (e) {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(1, '');
  }, [load]);

  const setApproval = async (id, approved) => {
    try {
      await adminService.setReviewApproval(id, approved);
      toast.success(approved ? 'Review approved.' : 'Review hidden.');
      load(page, filter);
      onChanged?.();
    } catch (e) {
      toast.error('Could not update review.');
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await adminService.deleteReview(confirmDelete.id);
      toast.success('Review deleted.');
      setConfirmDelete(null);
      load(page, filter);
      onChanged?.();
    } catch (e) {
      toast.error('Could not delete review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <select value={filter} onChange={(e) => { setFilter(e.target.value); load(1, e.target.value); }} aria-label="Filter reviews">
          <option value="">All reviews</option>
          <option value="true">Approved</option>
          <option value="false">Pending</option>
        </select>
      </div>
      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && <ErrorState error="Could not load reviews." onRetry={() => load(page, filter)} />}
      {state === 'done' && !items.length && (
        <EmptyState icon="bi-star" title="No reviews." message="Customer reviews appear here for moderation." />
      )}
      {state === 'done' && items.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>User</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.propertyTitle}</td>
                    <td className="text-meta">{r.userName}</td>
                    <td>{'★'.repeat(r.rating)}{'☆'.repeat(Math.max(0, 5 - r.rating))}</td>
                    <td className="wrap-cell">{r.comment || '—'}</td>
                    <td>{r.isApproved ? <span className="badge-status">live</span> : <span className="badge-status">pending</span>}</td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setApproval(r.id, !r.isApproved)}>
                        {r.isApproved ? 'Hide' : 'Approve'}
                      </button>
                      <button type="button" className="btn btn-link btn-sm text-danger" onClick={() => setConfirmDelete(r)}>
                        Delete
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
          title="Delete review?"
          message="This permanently removes the review. Type DELETE to confirm."
          confirmLabel="Delete"
          danger
          requireTyped="DELETE"
          busy={busy}
          onConfirm={doDelete}
          onClose={() => { setConfirmDelete(null); setBusy(false); }}
        />
      )}
    </div>
  );
}

export function CatalogManager() {
  const [tab, setTab] = useState('types');
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');

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

  const renderRow = (r) => {
    if (tab === 'locations') return (<tr key={r.id}><td>{r.name}</td><td className="text-meta">{r.city}{r.area ? ` · ${r.area}` : ''}</td><td className="text-meta">#{r.id}</td></tr>);
    if (tab === 'agents') {
      return (
        <tr key={r.id}>
          <td>{r.name}</td>
          <td className="text-meta">{r.title || '—'}{r.agency ? ` · ${r.agency}` : ''}</td>
          <td>{r.isVerified ? <span className="badge-verified">Verified</span> : <span className="badge-status">unverified</span>}</td>
        </tr>
      );
    }
    return (<tr key={r.id || r.slug}><td>{r.name}</td><td className="text-meta">{r.slug || `#${r.id}`}</td><td>{r.icon ? <i className={`bi ${r.icon}`}></i> : '—'}</td></tr>);
  };

  return (
    <div>
      <p className="text-meta">Reference data (read-only here — edits via data seeding and property forms).</p>
      <div className="req-kind">
        {[['types', 'Property types'], ['amenities', 'Amenities'], ['locations', 'Locations'], ['agents', 'Agents']].map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && <ErrorState error="Could not load catalog." onRetry={() => load(tab)} />}
      {state === 'done' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Detail</th><th>{tab === 'agents' ? 'Status' : 'Icon'}</th></tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AuditViewer() {
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
    } catch (err) {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(1, '');
  }, [load]);

  return (
    <div>
      <div className="admin-toolbar">
        <select value={entity} onChange={(e) => { setEntity(e.target.value); load(1, e.target.value); }} aria-label="Filter by entity">
          <option value="">All entities</option>
          <option>Property</option>
          <option>PurchaseRequest</option>
          <option>BookingRequest</option>
          <option>User</option>
          <option>Review</option>
          <option>PropertyInquiry</option>
        </select>
      </div>
      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && <ErrorState error="Could not load audit logs." onRetry={() => load(page, entity)} />}
      {state === 'done' && !items.length && (
        <EmptyState icon="bi-journal-text" title="No audit entries." message="Admin actions are recorded here." />
      )}
      {state === 'done' && items.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Old → New</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="text-meta">{new Date(a.timestamp).toLocaleString()}</td>
                    <td><strong>{a.action}</strong><br /><span className="text-meta">user #{a.userId ?? '—'}</span></td>
                    <td>{a.entity} #{a.entityId}</td>
                    <td className="wrap-cell text-meta">{a.oldValue || '—'} → {a.newValue || '—'}</td>
                    <td className="text-meta">{a.ipAddress || '—'}</td>
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
