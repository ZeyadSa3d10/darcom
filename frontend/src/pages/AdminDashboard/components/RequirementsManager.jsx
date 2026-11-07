import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { adminService } from '../../../services/adminService.js';

export default function RequirementsManager() {
  const { isRtl } = useSettings();
  const toast = useToast();

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Status Modal
  const [activeReq, setActiveReq] = useState(null);
  const [newStatus, setNewStatus] = useState('Contacted');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getRequirements({
        status: statusFilter || undefined,
        pageSize: 50,
      });
      setRequirements(res.data?.data ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openStatusModal = (req) => {
    setActiveReq(req);
    setNewStatus(req.status || 'Contacted');
    setAssignedStaffId(req.assignedStaffId ? String(req.assignedStaffId) : '');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!activeReq) return;
    setSaving(true);
    try {
      await adminService.setRequirementStatus(activeReq.id, {
        status: newStatus,
        assignedStaffId: assignedStaffId ? Number(assignedStaffId) : null,
      });
      toast.success(isRtl ? 'تم تحديث حالة طلب العميل بنجاح' : 'Requirement lead updated successfully.');
      setActiveReq(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update requirement status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="requirements-manager-panel">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <label className="fw-bold fs-6">{isRtl ? 'تصفية حسب الحالة:' : 'Filter status:'}</label>
          <select
            className="form-select form-select-sm w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="Pending">Pending (جديد)</option>
            <option value="Contacted">Contacted (تم التواصل)</option>
            <option value="Qualified">Qualified (مؤهل وجاد)</option>
            <option value="Closed">Closed (تم الاتفاق)</option>
            <option value="Rejected">Rejected (مرفوض)</option>
          </select>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadData}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          {isRtl ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {loading && <LoadingSkeleton count={4} />}
      {error && <ErrorState error={error} onRetry={loadData} />}

      {!loading && !error && (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Lead #</th>
                <th>Client</th>
                <th>Phone / Email</th>
                <th>Purpose</th>
                <th>Village / Zone</th>
                <th>Budget / Specs</th>
                <th>Status</th>
                <th>Assigned Staff</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requirements.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-4 text-muted">
                    No customer requirement leads found.
                  </td>
                </tr>
              ) : (
                requirements.map((r) => (
                  <tr key={r.id}>
                    <td><strong>REQ-{r.id}</strong></td>
                    <td>
                      <strong>{r.customerName}</strong>
                      {r.userId && <span className="badge bg-light text-dark ms-1">User #{r.userId}</span>}
                    </td>
                    <td>
                      <div dir="ltr"><strong>{r.customerPhone}</strong></div>
                      <small className="text-muted">{r.customerEmail}</small>
                    </td>
                    <td><span className="badge bg-light text-dark">{r.purpose}</span></td>
                    <td>
                      <div><strong>{r.villageName || 'Any Village'}</strong></div>
                      {r.zoneName && <small className="text-muted">{r.zoneName}</small>}
                    </td>
                    <td className="small">
                      {r.minPrice || r.maxPrice ? (
                        <div>
                          {r.minPrice ? `≥ ${r.minPrice.toLocaleString()}` : ''}
                          {r.maxPrice ? ` ≤ ${r.maxPrice.toLocaleString()} EGP` : ''}
                        </div>
                      ) : (
                        <div className="text-muted">Any Budget</div>
                      )}
                      {r.bedrooms && <div>{r.bedrooms}+ Beds</div>}
                      {r.notes && <div className="text-truncate text-muted" style={{ maxWidth: '160px' }} title={r.notes}>{r.notes}</div>}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'Closed' ? 'bg-success' : r.status === 'Qualified' ? 'bg-primary' : r.status === 'Contacted' ? 'bg-info text-dark' : r.status === 'Pending' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="small">{r.assignedStaffName || 'Unassigned'}</td>
                    <td className="small text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-brand btn-sm"
                        onClick={() => openStatusModal(r)}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Update Modal */}
      {activeReq && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Lead REQ-{activeReq.id}</h5>
                <button type="button" className="btn-close" onClick={() => setActiveReq(null)}></button>
              </div>
              <form onSubmit={handleUpdateStatus}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Customer</label>
                    <p className="m-0 text-muted">{activeReq.customerName} ({activeReq.customerPhone})</p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Status</label>
                    <select
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="Pending">Pending (قيد الانتظار)</option>
                      <option value="Contacted">Contacted (تم التواصل الأولي)</option>
                      <option value="Qualified">Qualified (مؤهل وجاد)</option>
                      <option value="Closed">Closed (تم الاتفاق والتعاقد)</option>
                      <option value="Rejected">Rejected (غير مناسب / ملغي)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Assign Staff User ID (Optional)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={assignedStaffId}
                      onChange={(e) => setAssignedStaffId(e.target.value)}
                      placeholder="e.g. 1"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveReq(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-brand" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Status'}
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

