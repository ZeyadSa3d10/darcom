import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { adminService } from '../../../services/adminService.js';

export default function BrokersManager() {
  const { isRtl } = useSettings();
  const toast = useToast();

  const [subTab, setSubTab] = useState('brokers'); // 'brokers' | 'requests'
  const [brokers, setBrokers] = useState([]);
  const [brokerRequests, setBrokerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status Action Modal
  const [activeItem, setActiveItem] = useState(null); // item being updated
  const [actionType, setActionType] = useState('broker'); // 'broker' | 'request'
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (subTab === 'brokers') {
        const res = await adminService.getBrokers();
        setBrokers(res.data?.data ?? []);
      } else {
        const res = await adminService.getBrokerRequests();
        setBrokerRequests(res.data?.data ?? []);
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [subTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openStatusModal = (item, type) => {
    setActiveItem(item);
    setActionType(type);
    setNewStatus(type === 'broker' ? 'Approved' : 'Approved');
    setAdminNotes(item.adminNotes || '');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!activeItem) return;
    setUpdating(true);
    try {
      if (actionType === 'broker') {
        await adminService.setBrokerStatus(activeItem.id, {
          status: newStatus,
          adminNotes: adminNotes.trim() || null,
        });
        toast.success(isRtl ? 'تم تحديث حالة الوسيط بنجاح' : 'Broker status updated successfully.');
      } else {
        await adminService.setBrokerRequestStatus(activeItem.id, {
          status: newStatus,
          adminNotes: adminNotes.trim() || null,
        });
        toast.success(isRtl ? 'تم تحديث حالة طلب العميل بنجاح' : 'Client request status updated.');
      }
      setActiveItem(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="brokers-manager-panel">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="req-kind">
          <button
            type="button"
            className={subTab === 'brokers' ? 'active' : ''}
            onClick={() => setSubTab('brokers')}
          >
            {isRtl ? 'طلبات تسجيل الوسطاء' : 'Broker Registrations'} ({brokers.length})
          </button>
          <button
            type="button"
            className={subTab === 'requests' ? 'active' : ''}
            onClick={() => setSubTab('requests')}
          >
            {isRtl ? 'طلبات العملاء المقدمة من الوسطاء' : 'Broker Client Requests'} ({brokerRequests.length})
          </button>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadData}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          {isRtl ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {loading && <LoadingSkeleton count={4} />}
      {error && <ErrorState error={error} onRetry={loadData} />}

      {!loading && !error && subTab === 'brokers' && (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Agency / Company</th>
                <th>Broker Name</th>
                <th>Contact</th>
                <th>License / CR</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {brokers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    No brokers registered yet.
                  </td>
                </tr>
              ) : (
                brokers.map((b) => (
                  <tr key={b.id}>
                    <td><strong>#{b.id}</strong></td>
                    <td><strong>{b.agencyName}</strong></td>
                    <td>{b.fullName}</td>
                    <td>
                      <div>{b.email}</div>
                      {b.phoneNumber && <small className="text-muted" dir="ltr">{b.phoneNumber}</small>}
                    </td>
                    <td>
                      <code>{b.licenseNumber}</code>
                      {b.documentUrl && (
                        <div>
                          <a href={b.documentUrl} target="_blank" rel="noreferrer" className="small text-primary">
                            <i className="bi bi-file-earmark-arrow-down me-1"></i>Document
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${b.status === 'Approved' ? 'bg-success' : b.status === 'Pending' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="small text-muted">{b.adminNotes || '—'}</td>
                    <td className="small text-muted">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-brand btn-sm"
                        onClick={() => openStatusModal(b, 'broker')}
                      >
                        Change Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && subTab === 'requests' && (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Req #</th>
                <th>Broker</th>
                <th>Property</th>
                <th>Client</th>
                <th>Phone</th>
                <th>Purpose</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {brokerRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    No broker client requests submitted yet.
                  </td>
                </tr>
              ) : (
                brokerRequests.map((br) => (
                  <tr key={br.id}>
                    <td><strong>BR-{br.id}</strong></td>
                    <td>{br.brokerName}</td>
                    <td>{br.propertyTitle || `#${br.propertyId}`}</td>
                    <td><strong>{br.clientName}</strong></td>
                    <td dir="ltr">{br.clientPhone}</td>
                    <td><span className="badge bg-light text-dark">{br.purpose}</span></td>
                    <td className="small text-muted">
                      {br.startDate ? `${new Date(br.startDate).toLocaleDateString()} → ${br.endDate ? new Date(br.endDate).toLocaleDateString() : '—'}` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${br.status === 'Approved' ? 'bg-success' : br.status === 'Pending' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                        {br.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-brand btn-sm"
                        onClick={() => openStatusModal(br, 'request')}
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

      {/* Status Modal */}
      {activeItem && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {actionType === 'broker' ? `Update Broker #${activeItem.id}` : `Update Request #${activeItem.id}`}
                </h5>
                <button type="button" className="btn-close" onClick={() => setActiveItem(null)}></button>
              </div>
              <form onSubmit={handleUpdateStatus}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Status</label>
                    <select
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      {actionType === 'broker' ? (
                        <>
                          <option value="Approved">Approved (معتمد)</option>
                          <option value="Pending">Pending (قيد المراجعة)</option>
                          <option value="Rejected">Rejected (مرفوض)</option>
                          <option value="Suspended">Suspended (موقوف)</option>
                        </>
                      ) : (
                        <>
                          <option value="Approved">Approved</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Completed">Completed</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Cancelled">Cancelled</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Admin Notes / Reason</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add administrative notes regarding this decision…"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveItem(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-brand" disabled={updating}>
                    {updating ? 'Saving…' : 'Save Status'}
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

