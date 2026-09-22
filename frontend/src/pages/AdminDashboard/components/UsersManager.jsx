import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { adminService } from '../../../services/adminService.js';
import ConfirmDialog from './ConfirmDialog.jsx';

const ROLES = ['Admin', 'Agent', 'Seller', 'Buyer'];

export default function UsersManager({ onChanged }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('loading');
  const [confirm, setConfirm] = useState(null); // { user, role }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p = 1, query = '') => {
    setState('loading');
    try {
      const res = await adminService.users(query ? { search: query, page: p, pageSize: 15 } : { page: p, pageSize: 15 });
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
    load(1, '');
  }, [load]);

  const search = (e) => {
    e.preventDefault();
    load(1, q);
  };

  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await adminService.setUserRole(confirm.user.id, confirm.role);
      toast.success(`${confirm.user.fullName} is now ${confirm.role}.`);
      setConfirm(null);
      load(page, q);
      onChanged?.();
    } catch (e) {
      toast.error(e.message || 'Role change failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form className="admin-toolbar" onSubmit={search}>
        <div className="search-input">
          <i className="bi bi-search"></i>
          <input
            type="search" placeholder="Search name or email…" value={q}
            onChange={(e) => setQ(e.target.value)} aria-label="Search users"
          />
        </div>
        <button type="submit" className="btn btn-brand btn-sm">Search</button>
      </form>

      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && <ErrorState error="Could not load users." onRetry={() => load(page, q)} />}
      {state === 'done' && total === 0 && (
        <EmptyState icon="bi-people" title="No users found." message="Adjust the search." />
      )}
      {state === 'done' && total > 0 && (
        <>
          <p className="text-meta">{total} users</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.fullName}</td>
                    <td className="text-meta">{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => {
                          if (e.target.value !== u.role) setConfirm({ user: u, role: e.target.value });
                        }}
                        aria-label={`Role for ${u.fullName}`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-meta">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>{!u.isActive && <span className="badge-status">inactive</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(n) => load(n, q)} />
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title="Change user role?"
          message={`${confirm.user.fullName} (${confirm.user.email}) moves to ${confirm.role}. The user is notified and the change is audited.`}
          confirmLabel={`Set ${confirm.role}`}
          busy={busy}
          onConfirm={doConfirm}
          onClose={() => { setConfirm(null); setBusy(false); }}
        />
      )}
    </div>
  );
}
