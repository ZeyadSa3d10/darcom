import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSkeleton from '../../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../../../components/ErrorState/ErrorState.jsx';
import EmptyState from '../../../components/EmptyState/EmptyState.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { listingRequestService } from '../../../services/listingRequestService.js';
import AdminPropertyForm from './AdminPropertyForm.jsx';

const STATUSES = [
  { value: '', label: 'جميع الحالات / All' },
  { value: 'Pending', label: 'قيد المراجعة / Pending' },
  { value: 'Contacted', label: 'تم التواصل / Contacted' },
  { value: 'InspectionScheduled', label: 'موعد المعاينة محدد / Scheduled' },
  { value: 'Inspected', label: 'تمت المعاينة / Inspected' },
  { value: 'Completed', label: 'تم النشر / Completed' },
  { value: 'Rejected', label: 'مرفوض / Rejected' },
];

const STATUS_BADGES = {
  Pending: { text: 'قيد المراجعة', class: 'badge-pending' },
  Contacted: { text: 'تم التواصل', class: 'badge-contacted' },
  InspectionScheduled: { text: 'موعد المعاينة محدد', class: 'badge-scheduled' },
  Inspected: { text: 'تمت المعاينة', class: 'badge-inspected' },
  Completed: { text: 'تم النشر', class: 'badge-completed' },
  Rejected: { text: 'مرفوض', class: 'badge-rejected' },
};

export default function ListingRequestsManager({ refreshTrigger = 0 }) {
  const { isRtl } = useSettings();
  const toast = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Status & Notes Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newStatus, setNewStatus] = useState('Pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [updating, setUpdating] = useState(false);

  // Create Property from Request Modal
  const [createPropRequest, setCreatePropRequest] = useState(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listingRequestService.adminList({
        status: filterStatus || undefined,
        page,
        pageSize: 15,
      });
      const data = res.data;
      setRequests(data?.data || []);
      setTotalPages(data?.totalPages || 1);
      setTotalCount(data?.totalCount || 0);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests, refreshTrigger]);

  const openStatusModal = (req) => {
    setSelectedRequest(req);
    setNewStatus(req.status || 'Pending');
    setAdminNotes(req.adminNotes || '');
    if (req.inspectionDate) {
      // Format to YYYY-MM-DDTHH:MM for input datetime-local
      const d = new Date(req.inspectionDate);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setInspectionDate(iso);
    } else {
      setInspectionDate('');
    }
  };

  const closeStatusModal = () => {
    setSelectedRequest(null);
    setUpdating(false);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setUpdating(true);
    try {
      const payload = {
        status: newStatus,
        adminNotes: adminNotes.trim() || null,
        inspectionDate: inspectionDate ? new Date(inspectionDate).toISOString() : null,
      };
      await listingRequestService.adminUpdateStatus(selectedRequest.id, payload);
      toast.success(isRtl ? 'تم تحديث حالة الطلب بنجاح' : 'Status updated successfully');
      closeStatusModal();
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل تحديث الحالة');
    } finally {
      setUpdating(false);
    }
  };

  const openCreatePropModal = (req) => {
    setCreatePropRequest(req);
    setServerErrors({});
  };

  const closeCreatePropModal = () => {
    setCreatePropRequest(null);
    setCreateSaving(false);
    setServerErrors({});
  };

  const handleCreatePropertySubmit = async (propertyData) => {
    if (!createPropRequest) return;
    setCreateSaving(true);
    setServerErrors({});
    try {
      const payload = {
        ...propertyData,
        villageId: createPropRequest.villageId,
        zoneId: createPropRequest.zoneId,
        buildingNumber: createPropRequest.buildingNumber,
        ownerId: createPropRequest.userId,
        propertyListingRequestId: createPropRequest.id,
      };

      await listingRequestService.adminCreateProperty(createPropRequest.id, payload);
      toast.success(
        isRtl
          ? 'تم إنشاء العقار وربطه بطلب المالك بنجاح، وتحويل حالة الطلب إلى مكتمل.'
          : 'Property created, linked to request, and marked completed.'
      );
      closeCreatePropModal();
      loadRequests();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors && Array.isArray(errors)) {
        const errMap = {};
        errors.forEach((e) => {
          if (e.field) errMap[e.field] = e.message;
        });
        setServerErrors(errMap);
      }
      toast.error(err.response?.data?.message || 'فشل إنشاء العقار');
    } finally {
      setCreateSaving(false);
    }
  };

  // Filter requests by search term locally if entered
  const displayedRequests = requests.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.requestNumber?.toLowerCase().includes(term) ||
      r.ownerName?.toLowerCase().includes(term) ||
      r.phoneNumber?.toLowerCase().includes(term) ||
      r.buildingNumber?.toLowerCase().includes(term) ||
      r.unitNumber?.toLowerCase().includes(term) ||
      r.villageName?.toLowerCase().includes(term) ||
      r.villageNameAr?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="listing-requests-manager">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="mb-1">{isRtl ? 'طلبات عرض العقارات من الملاك' : 'Owner Property Listing Requests'}</h2>
          <p className="text-muted mb-0">
            {isRtl
              ? 'مراجعة طلبات المعاينة المقدمة من ملاك الشاليهات والوحدات وتنسيق الزيارة ونشر العقار.'
              : 'Review owner inspection requests, schedule site visits, and publish properties.'}
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className="badge bg-primary fs-6">
            {totalCount} {isRtl ? 'طلب' : 'requests'}
          </span>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadRequests}>
            <i className="bi bi-arrow-clockwise me-1" />
            {isRtl ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card mb-4 p-3 bg-light border-0">
        <div className="row g-3 align-items-center">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder={isRtl ? 'بحث برقم الطلب، اسم المالك، الهاتف، المبنى...' : 'Search request #, owner, phone...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton count={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={loadRequests} />
      ) : displayedRequests.length === 0 ? (
        <EmptyState
          icon="bi-houses"
          title={isRtl ? 'لا توجد طلبات عرض مطابقة' : 'No listing requests found'}
          message={isRtl ? 'ستظهر هنا طلبات الملاك الجدد لمعاينة وحداتهم.' : 'New inspection requests will appear here.'}
        />
      ) : (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>{isRtl ? 'رقم الطلب' : 'Request #'}</th>
                <th>{isRtl ? 'المالك والتواصل' : 'Owner & Contact'}</th>
                <th>{isRtl ? 'الموقع' : 'Location'}</th>
                <th>{isRtl ? 'الوحدة والمبنى' : 'Unit & Building'}</th>
                <th>{isRtl ? 'الحالة' : 'Status'}</th>
                <th>{isRtl ? 'موعد المعاينة' : 'Inspection Date'}</th>
                <th>{isRtl ? 'تاريخ التقديم' : 'Submitted At'}</th>
                <th className="text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {displayedRequests.map((req) => {
                const statusMeta = STATUS_BADGES[req.status] || { text: req.status, class: '' };
                return (
                  <tr key={req.id}>
                    <td>
                      <strong className="text-primary font-monospace">{req.requestNumber}</strong>
                    </td>
                    <td>
                      <div className="fw-bold">{req.ownerName}</div>
                      <div>
                        <a
                          href={`tel:${req.phoneNumber}`}
                          className="text-decoration-none text-success small d-inline-flex align-items-center gap-1"
                          dir="ltr"
                        >
                          <i className="bi bi-telephone-fill" />
                          <span>{req.phoneNumber}</span>
                        </a>
                      </div>
                    </td>
                    <td>
                      <div>{req.villageNameAr || req.villageName}</div>
                      <small className="text-muted">{req.zoneNameAr || req.zoneName}</small>
                    </td>
                    <td>
                      <div>
                        <span className="badge bg-light text-dark border me-1">
                          {isRtl ? 'مبنى' : 'Bldg'}: {req.buildingNumber}
                        </span>
                        <span className="badge bg-light text-dark border">
                          {isRtl ? 'وحدة' : 'Unit'}: {req.unitNumber}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-status ${statusMeta.class}`}>{statusMeta.text}</span>
                    </td>
                    <td>
                      {req.inspectionDate ? (
                        <div className="small text-primary">
                          <i className="bi bi-calendar-check me-1" />
                          {new Date(req.inspectionDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td>
                      <small className="text-muted">
                        {new Date(req.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                      </small>
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => openStatusModal(req)}
                          title={isRtl ? 'تحديث الحالة وملاحظات المعاينة' : 'Update status & notes'}
                        >
                          <i className="bi bi-pencil-square me-1" />
                          {isRtl ? 'الحالة' : 'Status'}
                        </button>

                        {req.status !== 'Completed' && (
                          <button
                            type="button"
                            className="btn btn-brand"
                            onClick={() => openCreatePropModal(req)}
                            title={isRtl ? 'إنشاء العقار من هذا الطلب' : 'Create property from request'}
                          >
                            <i className="bi bi-plus-circle me-1" />
                            {isRtl ? 'إنشاء عقار' : 'Create Property'}
                          </button>
                        )}

                        {req.status === 'Completed' && req.propertyId && (
                          <Link
                            to={`/properties/${req.propertyId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-success"
                            title={isRtl ? 'معاينة العقار المنشور' : 'View published property'}
                          >
                            <i className="bi bi-box-arrow-up-right me-1" />
                            {isRtl ? 'عرض العقار' : 'View'}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {isRtl ? 'السابق' : 'Previous'}
          </button>
          <span className="mx-2 small">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {isRtl ? 'التالي' : 'Next'}
          </button>
        </div>
      )}

      {/* MODAL 1: Update Status, Set Inspection Date & Private Admin Notes */}
      {selectedRequest && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSaveStatus}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {isRtl ? 'تحديث حالة طلب العرض' : 'Update Listing Request Status'} —{' '}
                    <span className="font-monospace text-primary">{selectedRequest.requestNumber}</span>
                  </h5>
                  <button type="button" className="btn-close" onClick={closeStatusModal} />
                </div>
                <div className="modal-body">
                  <div className="mb-3 p-3 bg-light rounded">
                    <div>
                      <strong>{isRtl ? 'المالك:' : 'Owner:'}</strong> {selectedRequest.ownerName}
                    </div>
                    <div>
                      <strong>{isRtl ? 'الهاتف:' : 'Phone:'}</strong>{' '}
                      <a href={`tel:${selectedRequest.phoneNumber}`} dir="ltr">
                        {selectedRequest.phoneNumber}
                      </a>
                    </div>
                    <div>
                      <strong>{isRtl ? 'الموقع:' : 'Location:'}</strong>{' '}
                      {selectedRequest.villageNameAr || selectedRequest.villageName} -{' '}
                      {selectedRequest.zoneNameAr || selectedRequest.zoneName} (مبنى: {selectedRequest.buildingNumber} ·
                      وحدة: {selectedRequest.unitNumber})
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{isRtl ? 'الحالة' : 'Status'}</label>
                    <select
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      required
                    >
                      <option value="Pending">قيد المراجعة / Pending</option>
                      <option value="Contacted">تم التواصل مع المالك / Contacted</option>
                      <option value="InspectionScheduled">تحديد موعد المعاينة / Inspection Scheduled</option>
                      <option value="Inspected">تمت المعاينة والتصوير / Inspected</option>
                      <option value="Completed">مكتمل وتم النشر / Completed</option>
                      <option value="Rejected">مرفوض / Rejected</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">
                      {isRtl ? 'موعد المعاينة الميدانية' : 'Inspection Date & Time'}
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                    />
                    <small className="text-muted">
                      {isRtl
                        ? 'سيظهر هذا الموعد للمالك في حسابه لمتابعة وصول فريق المعاينة.'
                        : 'Visible to the owner in their account.'}
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">
                      {isRtl ? 'ملاحظات الإدارة الداخلية (خاصة بالفريق)' : 'Internal Admin Notes'}
                    </label>
                    <textarea
                      rows="3"
                      className="form-control"
                      placeholder={
                        isRtl
                          ? 'ملاحظات الفحص، حالة الوحدة، تفاصيل الاتصال بالمالك (لا تظهر للمالك)...'
                          : 'Notes from inspection, unit condition, internal instructions...'
                      }
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                    <small className="text-muted">
                      {isRtl ? 'ملاحظات سرية لفريق داركم فقط.' : 'Confidential for company staff only.'}
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeStatusModal}>
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button type="submit" className="btn btn-brand" disabled={updating}>
                    {updating ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        {isRtl ? 'جاري الحفظ…' : 'Saving…'}
                      </span>
                    ) : (
                      isRtl ? 'حفظ التعديلات' : 'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Property Directly from Request */}
      {createPropRequest && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <div>
                  <h5 className="modal-title mb-1">
                    {isRtl ? 'إنشاء عقار ونشره من طلب المالك' : 'Create Property From Listing Request'}
                  </h5>
                  <div className="small text-muted">
                    {isRtl ? 'مرتبط بالطلب:' : 'Linked to Request:'}{' '}
                    <strong className="text-primary font-monospace">{createPropRequest.requestNumber}</strong> ·{' '}
                    {isRtl ? 'المالك:' : 'Owner:'} <strong>{createPropRequest.ownerName}</strong> (
                    <span dir="ltr">{createPropRequest.phoneNumber}</span>)
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={closeCreatePropModal} />
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-info d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-info-circle-fill fs-5" />
                  <div>
                    {isRtl
                      ? 'تم ملء بيانات القرية والمنطقة ورقم المبنى تلقائيًا وربط المالك. بعد الحفظ، سيتم نشر العقار وتحويل حالة الطلب تلقائيًا إلى مكتمل.'
                      : 'Village, zone, building number and owner have been pre-injected. Saving will publish the property and mark the request Completed.'}
                  </div>
                </div>

                <AdminPropertyForm
                  initial={{
                    villageId: createPropRequest.villageId,
                    zoneId: createPropRequest.zoneId,
                    buildingNumber: createPropRequest.buildingNumber,
                  }}
                  submitLabel={isRtl ? 'إنشاء العقار وربطه بالطلب' : 'Create Property & Complete Request'}
                  saving={createSaving}
                  serverErrors={serverErrors}
                  onSubmit={handleCreatePropertySubmit}
                  idPrefix="cplr"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

