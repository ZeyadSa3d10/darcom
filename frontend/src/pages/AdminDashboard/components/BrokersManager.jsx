import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { adminService } from '../../../services/adminService.js';
import BrokerIdViewerModal from './BrokerIdViewerModal.jsx';

export default function BrokersManager({ refreshTrigger = 0 }) {
  const { isRtl } = useSettings();
  const toast = useToast();

  // Sub tabs: 'brokers' | 'submissions' | 'requests' | 'requirements'
  const [subTab, setSubTab] = useState('brokers');
  const [brokers, setBrokers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [brokerRequests, setBrokerRequests] = useState([]);
  const [requirements, setRequirements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ID Document Viewer Modal
  const [idViewerBroker, setIdViewerBroker] = useState(null);

  // Status Action Modal
  const [activeItem, setActiveItem] = useState(null);
  const [actionType, setActionType] = useState('broker'); // 'broker' | 'submission' | 'request' | 'requirement'
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (subTab === 'brokers') {
        const res = await adminService.getBrokers();
        setBrokers(res.data?.data ?? res.data ?? []);
      } else if (subTab === 'submissions') {
        const res = await adminService.getBrokerSubmissions();
        setSubmissions(res.data?.data ?? res.data ?? []);
      } else if (subTab === 'requests') {
        const res = await adminService.getBrokerRequests();
        setBrokerRequests(res.data?.data ?? res.data ?? []);
      } else if (subTab === 'requirements') {
        const res = await adminService.getRequirements();
        setRequirements(res.data?.data ?? res.data ?? []);
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [subTab]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const openStatusModal = (item, type) => {
    setActiveItem(item);
    setActionType(type);
    if (type === 'broker') setNewStatus(item.status || 'Approved');
    else if (type === 'submission') setNewStatus(item.status || 'Contacted');
    else if (type === 'request') setNewStatus(item.status || 'Approved');
    else setNewStatus(item.status || 'Approved');
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
        toast.success(isRtl ? 'تم تحديث حالة الوسيط بنجاح' : 'Broker status updated.');
      } else if (actionType === 'submission') {
        await adminService.setBrokerSubmissionStatus(activeItem.id, {
          status: newStatus,
          adminNotes: adminNotes.trim() || null,
        });
        toast.success(isRtl ? 'تم تحديث حالة معاينة الشاليه بنجاح' : 'Chalet submission status updated.');
      } else if (actionType === 'request') {
        await adminService.setBrokerRequestStatus(activeItem.id, {
          status: newStatus,
          adminNotes: adminNotes.trim() || null,
        });
        toast.success(isRtl ? 'تم تحديث حالة طلب الإيجار/الشراء بنجاح' : 'Request status updated.');
      } else if (actionType === 'requirement') {
        await adminService.setRequirementStatus(activeItem.id, {
          status: newStatus,
          notes: adminNotes.trim() || null,
        });
        toast.success(isRtl ? 'تم تحديث حالة الطلب الخاص بنجاح' : 'Requirement status updated.');
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
      {/* Sub Tabs Navigation */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="nav nav-pills gap-2 p-1 bg-light rounded border">
          <button
            type="button"
            className={`nav-link border-0 ${subTab === 'brokers' ? 'active bg-dark text-white fw-bold' : 'text-dark'}`}
            onClick={() => setSubTab('brokers')}
          >
            <i className="bi bi-person-badge-fill me-1"></i>
            {isRtl ? 'طلبات تسجيل الوسطاء' : 'Broker Accounts'} ({brokers.length})
          </button>

          <button
            type="button"
            className={`nav-link border-0 ${subTab === 'submissions' ? 'active bg-dark text-white fw-bold' : 'text-dark'}`}
            onClick={() => setSubTab('submissions')}
          >
            <i className="bi bi-houses-fill me-1"></i>
            {isRtl ? 'معاينة الشاليهات (4 حقول)' : 'Chalet Submissions'} ({submissions.length})
          </button>

          <button
            type="button"
            className={`nav-link border-0 ${subTab === 'requests' ? 'active bg-dark text-white fw-bold' : 'text-dark'}`}
            onClick={() => setSubTab('requests')}
          >
            <i className="bi bi-bag-check-fill me-1"></i>
            {isRtl ? 'طلبات الإيجار والشراء' : 'Rent & Buy Requests'} ({brokerRequests.length})
          </button>

          <button
            type="button"
            className={`nav-link border-0 ${subTab === 'requirements' ? 'active bg-dark text-white fw-bold' : 'text-dark'}`}
            onClick={() => setSubTab('requirements')}
          >
            <i className="bi bi-sliders2 me-1"></i>
            {isRtl ? 'مواصفات خاصة' : 'Custom Specs'} ({requirements.length})
          </button>
        </div>

        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadData}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          {isRtl ? 'تحديث البيانات' : 'Refresh'}
        </button>
      </div>

      {loading && <LoadingSkeleton count={4} />}
      {error && <ErrorState error={error} onRetry={loadData} />}

      {/* TAB 1: BROKER REGISTRATIONS */}
      {!loading && !error && subTab === 'brokers' && (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>{isRtl ? 'اسم الوسيط' : 'Broker Name'}</th>
                <th>{isRtl ? 'رقم الهاتف' : 'Phone'}</th>
                <th>{isRtl ? 'بطاقة الرقم القومي' : 'National ID'}</th>
                <th>{isRtl ? 'الحالة' : 'Status'}</th>
                <th>{isRtl ? 'ملاحظات الإدارة' : 'Notes'}</th>
                <th>{isRtl ? 'تاريخ التسجيل' : 'Date'}</th>
                <th>{isRtl ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {brokers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    {isRtl ? 'لا يوجد طلبات تسجيل وسطاء حتى الآن.' : 'No brokers registered yet.'}
                  </td>
                </tr>
              ) : (
                brokers.map((b) => (
                  <tr key={b.id}>
                    <td><strong>#{b.id}</strong></td>
                    <td>
                      <strong>{b.fullName}</strong>
                      {b.agencyName && <div className="small text-muted">{b.agencyName}</div>}
                    </td>
                    <td>
                      <div dir="ltr">{b.phoneNumber || b.email}</div>
                      {b.isPhoneVerified && (
                        <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-patch-check-fill me-1"></i>{isRtl ? 'مؤكد بـ OTP' : 'OTP Verified'}
                        </span>
                      )}
                    </td>
                    <td>
                      {b.idCardFrontPath || b.idCardBackPath ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1"
                          onClick={() => setIdViewerBroker(b)}
                          title={isRtl ? 'عرض بطاقة الرقم القومي المشفرة' : 'View Secure ID Documents'}
                        >
                          <i className="bi bi-person-vcard text-warning"></i>
                          <span>{isRtl ? 'فحص البطاقة' : 'View ID'}</span>
                        </button>
                      ) : (
                        <span className="text-muted small">{isRtl ? 'غير مرفوعة' : 'No ID'}</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          b.status === 'Approved'
                            ? 'bg-success'
                            : b.status === 'Pending'
                            ? 'bg-warning text-dark'
                            : 'bg-danger'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="small text-muted" style={{ maxWidth: '200px' }}>
                      {b.adminNotes || '—'}
                    </td>
                    <td className="small text-muted">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-brand btn-sm"
                        onClick={() => openStatusModal(b, 'broker')}
                      >
                        {isRtl ? 'تعديل الحالة' : 'Change Status'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: CHALET SUBMISSIONS (Workflow 1: 4-Field Submissions) */}
      {!loading && !error && subTab === 'submissions' && (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>{isRtl ? 'الوسيط ومقدم الطلب' : 'Broker'}</th>
                <th>{isRtl ? 'القرية (الساحل الشمالي)' : 'Village'}</th>
                <th>{isRtl ? 'المنطقة' : 'Zone'}</th>
                <th>{isRtl ? 'رقم الوحدة' : 'Unit No.'}</th>
                <th>{isRtl ? 'المساحة' : 'Area'}</th>
                <th>{isRtl ? 'الحالة' : 'Status'}</th>
                <th>{isRtl ? 'ملاحظات المعاينة' : 'Notes'}</th>
                <th>{isRtl ? 'تاريخ التقديم' : 'Date'}</th>
                <th>{isRtl ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-4 text-muted">
                    {isRtl ? 'لا توجد طلبات إضافة شاليهات للمعاينة حتى الآن.' : 'No chalet submissions yet.'}
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id}>
                    <td><strong>#{s.id}</strong></td>
                    <td>
                      <strong>{s.brokerName}</strong>
                      {s.brokerPhone && <div className="small text-muted" dir="ltr">{s.brokerPhone}</div>}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                        {s.villageName}
                      </span>
                    </td>
                    <td>{s.zoneName || '—'}</td>
                    <td>
                      <span className="badge bg-secondary">{s.unitNumber}</span>
                    </td>
                    <td>{s.area} م²</td>
                    <td>
                      <span
                        className={`badge ${
                          s.status === 'Approved' || s.status === 'Completed'
                            ? 'bg-success'
                            : s.status === 'Pending'
                            ? 'bg-warning text-dark'
                            : s.status === 'Contacted'
                            ? 'bg-info text-dark'
                            : 'bg-danger'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="small text-muted" style={{ maxWidth: '200px' }}>
                      {s.adminNotes || '—'}
                    </td>
                    <td className="small text-muted">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-brand btn-sm"
                        onClick={() => openStatusModal(s, 'submission')}
                      >
                        {isRtl ? 'تحديث المعاينة' : 'Update Status'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: RENT & BUY REQUESTS (Workflow 2) */}
      {!loading && !error && subTab === 'requests' && (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Req #</th>
                <th>{isRtl ? 'الوسيط' : 'Broker'}</th>
                <th>{isRtl ? 'الشاليه المطلوب' : 'Chalet'}</th>
                <th>{isRtl ? 'الغرض' : 'Purpose'}</th>
                <th>{isRtl ? 'فترة الإيجار' : 'Dates'}</th>
                <th>{isRtl ? 'ملاحظات' : 'Notes'}</th>
                <th>{isRtl ? 'الحالة' : 'Status'}</th>
                <th>{isRtl ? 'تاريخ الطلب' : 'Date'}</th>
                <th>{isRtl ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {brokerRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    {isRtl ? 'لا توجد طلبات إيجار أو شراء مقدمة من الوسطاء.' : 'No broker requests yet.'}
                  </td>
                </tr>
              ) : (
                brokerRequests.map((br) => (
                  <tr key={br.id}>
                    <td><strong>BR-{br.id}</strong></td>
                    <td>
                      <strong>{br.brokerName}</strong>
                      {br.clientPhone && <div className="small text-muted" dir="ltr">{br.clientPhone}</div>}
                    </td>
                    <td>{br.propertyTitle || `#${br.propertyId}`}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{br.purpose}</span>
                    </td>
                    <td className="small text-muted">
                      {br.startDate
                        ? `${new Date(br.startDate).toLocaleDateString()} → ${br.endDate ? new Date(br.endDate).toLocaleDateString() : '—'}`
                        : '—'}
                    </td>
                    <td className="small text-muted" style={{ maxWidth: '180px' }}>
                      {br.notes || '—'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          br.status === 'Approved'
                            ? 'bg-success'
                            : br.status === 'Pending'
                            ? 'bg-warning text-dark'
                            : 'bg-secondary'
                        }`}
                      >
                        {br.status}
                      </span>
                    </td>
                    <td className="small text-muted">{new Date(br.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-brand btn-sm"
                        onClick={() => openStatusModal(br, 'request')}
                      >
                        {isRtl ? 'تحديث' : 'Update'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: CUSTOM REQUIREMENTS (Workflow 3) */}
      {!loading && !error && subTab === 'requirements' && (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>{isRtl ? 'مقدم الطلب' : 'Submitted By'}</th>
                <th>{isRtl ? 'الغرض' : 'Purpose'}</th>
                <th>{isRtl ? 'القرية / المنطقة' : 'Village / Zone'}</th>
                <th>{isRtl ? 'المواصفات' : 'Specs'}</th>
                <th>{isRtl ? 'الميزانية' : 'Budget'}</th>
                <th>{isRtl ? 'الفترة' : 'Dates'}</th>
                <th>{isRtl ? 'الحالة' : 'Status'}</th>
                <th>{isRtl ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {requirements.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    {isRtl ? 'لا توجد طلبات مواصفات خاصة مسجلة.' : 'No custom requirements yet.'}
                  </td>
                </tr>
              ) : (
                requirements.map((req) => (
                  <tr key={req.id}>
                    <td><strong>#{req.id}</strong></td>
                    <td>
                      <strong>{req.customerName || `User #${req.userId}`}</strong>
                      {req.customerPhone && <div className="small text-muted" dir="ltr">{req.customerPhone}</div>}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{req.purpose}</span>
                    </td>
                    <td>
                      <strong>{req.villageName || (isRtl ? 'أي قرية' : 'Any Village')}</strong>
                      {req.zoneName && <div className="small text-muted">{req.zoneName}</div>}
                    </td>
                    <td className="small">
                      {req.bedrooms ? `${req.bedrooms} غرف` : ''}
                      {req.bedrooms && req.area ? ' • ' : ''}
                      {req.area ? `${req.area} م²` : ''}
                    </td>
                    <td>
                      {req.maxPrice ? `${Number(req.maxPrice).toLocaleString('en-US')} ج.م` : '—'}
                    </td>
                    <td className="small text-muted">
                      {req.startDate
                        ? `${new Date(req.startDate).toLocaleDateString()} → ${req.endDate ? new Date(req.endDate).toLocaleDateString() : '—'}`
                        : '—'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          req.status === 'Approved' || req.status === 'Completed'
                            ? 'bg-success'
                            : req.status === 'Pending'
                            ? 'bg-warning text-dark'
                            : 'bg-secondary'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-brand btn-sm"
                        onClick={() => openStatusModal(req, 'requirement')}
                      >
                        {isRtl ? 'تحديث' : 'Update'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Secure ID Document Viewer Modal */}
      {idViewerBroker && (
        <BrokerIdViewerModal
          broker={idViewerBroker}
          onClose={() => setIdViewerBroker(null)}
        />
      )}

      {/* Status Modal */}
      {activeItem && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {actionType === 'broker'
                    ? (isRtl ? `تحديث حالة الوسيط #${activeItem.id}` : `Update Broker #${activeItem.id}`)
                    : actionType === 'submission'
                    ? (isRtl ? `تحديث حالة معاينة الشاليه #${activeItem.id}` : `Update Submission #${activeItem.id}`)
                    : actionType === 'request'
                    ? (isRtl ? `تحديث طلب الإيجار/الشراء #${activeItem.id}` : `Update Request #${activeItem.id}`)
                    : (isRtl ? `تحديث الطلب الخاص #${activeItem.id}` : `Update Requirement #${activeItem.id}`)}
                </h5>
                <button type="button" className="btn-close" onClick={() => setActiveItem(null)}></button>
              </div>
              <form onSubmit={handleUpdateStatus}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">{isRtl ? 'الحالة الجديدة' : 'Status'}</label>
                    <select
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      {actionType === 'broker' ? (
                        <>
                          <option value="Approved">{isRtl ? 'Approved (معتمد)' : 'Approved'}</option>
                          <option value="Pending">{isRtl ? 'Pending (قيد المراجعة)' : 'Pending'}</option>
                          <option value="Rejected">{isRtl ? 'Rejected (مرفوض)' : 'Rejected'}</option>
                          <option value="Suspended">{isRtl ? 'Suspended (موقوف)' : 'Suspended'}</option>
                        </>
                      ) : actionType === 'submission' ? (
                        <>
                          <option value="Contacted">{isRtl ? 'Contacted (تم التواصل للتنسيق)' : 'Contacted'}</option>
                          <option value="Approved">{isRtl ? 'Approved (تمت المعاينة والتصوير)' : 'Approved'}</option>
                          <option value="Completed">{isRtl ? 'Completed (تم النشر على الموقع)' : 'Completed'}</option>
                          <option value="Pending">{isRtl ? 'Pending (قيد الانتظار)' : 'Pending'}</option>
                          <option value="Rejected">{isRtl ? 'Rejected (مرفوض)' : 'Rejected'}</option>
                        </>
                      ) : (
                        <>
                          <option value="Approved">{isRtl ? 'Approved (مقبول)' : 'Approved'}</option>
                          <option value="Contacted">{isRtl ? 'Contacted (تم التواصل)' : 'Contacted'}</option>
                          <option value="Completed">{isRtl ? 'Completed (مكتمل)' : 'Completed'}</option>
                          <option value="Rejected">{isRtl ? 'Rejected (مرفوض)' : 'Rejected'}</option>
                          <option value="Cancelled">{isRtl ? 'Cancelled (ملغي)' : 'Cancelled'}</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">{isRtl ? 'ملاحظات الإدارة' : 'Admin Notes'}</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder={isRtl ? 'اكتب ملاحظات للمتابعة أو سبب الرفض أو موعد المعاينة...' : 'Add notes regarding this action...'}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveItem(null)}>
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button type="submit" className="btn btn-brand" disabled={updating}>
                    {updating ? (isRtl ? 'جارٍ الحفظ...' : 'Saving…') : (isRtl ? 'حفظ الحالة' : 'Save Status')}
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
