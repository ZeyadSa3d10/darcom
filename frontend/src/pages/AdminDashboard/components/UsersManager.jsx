import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { adminService } from '../../../services/adminService.js';
import ConfirmDialog from './ConfirmDialog.jsx';

const ROLES = ['Admin', 'Agent', 'Seller', 'Buyer'];

export default function UsersManager({ onChanged, refreshTrigger = 0 }) {
  const { t, isRtl } = useSettings();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('loading');
  const [confirm, setConfirm] = useState(null); // { user, role }
  const [busy, setBusy] = useState(false);

  const getRoleLabel = (role) => {
    const map = {
      Admin: isRtl ? 'مدير النظام (Admin)' : 'Admin',
      Agent: isRtl ? 'مستشار عقاري (Agent)' : 'Agent',
      Seller: isRtl ? 'مالك عقار (Seller)' : 'Seller',
      Buyer: isRtl ? 'عميل (Buyer)' : 'Buyer',
    };
    return map[role] || role;
  };

  const load = useCallback(async (p = 1, query = '') => {
    setState('loading');
    try {
      const res = await adminService.users(
        query ? { search: query, page: p, pageSize: 15 } : { page: p, pageSize: 15 }
      );
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
    load(1, '');
  }, [load]);

  useEffect(() => {
    if (refreshTrigger > 0) load(page, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const search = (e) => {
    e.preventDefault();
    load(1, q);
  };

  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await adminService.setUserRole(confirm.user.id, confirm.role);
      toast.success(
        isRtl
          ? `تم تحديث صلاحية ${confirm.user.fullName} إلى ${getRoleLabel(confirm.role)}.`
          : `${confirm.user.fullName} is now ${confirm.role}.`
      );
      setConfirm(null);
      load(page, q);
      onChanged?.();
    } catch (e) {
      toast.error(e.message || (isRtl ? 'فشل تغيير الصلاحية.' : 'Role change failed.'));
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
            type="search"
            placeholder={isRtl ? 'بحث بالاسم أو البريد الإلكتروني…' : 'Search name or email…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <button type="submit" className="btn btn-brand btn-sm">
          <i className="bi bi-search me-1"></i>
          <span>{t('admin.table.searchBtn', isRtl ? 'بحث' : 'Search')}</span>
        </button>
      </form>

      {state === 'loading' && <LoadingSkeleton count={4} />}
      {state === 'error' && (
        <ErrorState
          error={isRtl ? 'تعذر تحميل قائمة المستخدمين.' : 'Could not load users.'}
          onRetry={() => load(page, q)}
        />
      )}
      {state === 'done' && total === 0 && (
        <EmptyState
          icon="bi-people"
          title={isRtl ? 'لم يتم العثور على مستخدمين' : 'No users found.'}
          message={isRtl ? 'يرجى تغيير كلمة البحث والمحاولة مرة أخرى.' : 'Adjust the search.'}
        />
      )}
      {state === 'done' && total > 0 && (
        <>
          <p className="text-meta">
            {total} {isRtl ? 'مستخدم مسجل' : 'users'}
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.table.name', isRtl ? 'الاسم الكامل' : 'Name')}</th>
                  <th>{t('admin.table.email', isRtl ? 'البريد الإلكتروني' : 'Email')}</th>
                  <th>{t('admin.table.role', isRtl ? 'الصلاحية / الدور' : 'Role')}</th>
                  <th>{t('admin.table.joined', isRtl ? 'تاريخ الانضمام' : 'Joined')}</th>
                  <th>{t('admin.table.actions', isRtl ? 'الإجراءات' : '')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.fullName}</strong>
                    </td>
                    <td className="text-meta">{u.email}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={u.role}
                        onChange={(e) => setConfirm({ user: u, role: e.target.value })}
                        aria-label={`Role for ${u.fullName}`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {getRoleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-meta">
                      {new Date(u.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                    </td>
                    <td>{!u.isActive && <span className="badge-status">{isRtl ? 'معطل' : 'inactive'}</span>}</td>
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
          title={isRtl ? 'تأكيد تغيير الصلاحية' : `Change role for ${confirm.user.fullName}?`}
          message={
            isRtl
              ? `هل أنت متأكد من تغيير دور “${confirm.user.fullName}” إلى (${getRoleLabel(confirm.role)})؟ سيتأثر نطاق وصول المستخدم فوراً.`
              : `Change ${confirm.user.fullName}’s role from ${confirm.user.role} to ${confirm.role}. They will immediately get the permissions of the new role.`
          }
          confirmLabel={isRtl ? 'تأكيد التغيير' : `Change to ${confirm.role}`}
          busy={busy}
          onConfirm={doConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
