import { useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService.js';
import { useSettings } from '../../../context/SettingsContext.jsx';

export default function BrokerIdViewerModal({ broker, onClose }) {
  const { isRtl } = useSettings();
  const [frontUrl, setFrontUrl] = useState(null);
  const [backUrl, setBackUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!broker) return;
    let active = true;
    let frontObj = null;
    let backObj = null;

    const loadImages = async () => {
      setLoading(true);
      setError(null);
      try {
        if (broker.idCardFrontPath) {
          const resFront = await adminService.getBrokerIdDocumentBlob(broker.id, 'front');
          if (active) {
            frontObj = URL.createObjectURL(resFront.data);
            setFrontUrl(frontObj);
          }
        }
        if (broker.idCardBackPath) {
          const resBack = await adminService.getBrokerIdDocumentBlob(broker.id, 'back');
          if (active) {
            backObj = URL.createObjectURL(resBack.data);
            setBackUrl(backObj);
          }
        }
      } catch (err) {
        if (active) setError(err.message || (isRtl ? 'تعذر تحميل صور بطاقة الرقم القومي.' : 'Failed to stream ID document.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadImages();

    return () => {
      active = false;
      if (frontObj) URL.revokeObjectURL(frontObj);
      if (backObj) URL.revokeObjectURL(backObj);
    };
  }, [broker, isRtl]);

  if (!broker) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1070 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-dark text-white border border-secondary shadow-lg">
          <div className="modal-header border-bottom border-secondary">
            <h5 className="modal-title d-flex align-items-center gap-2">
              <i className="bi bi-person-vcard text-warning"></i>
              <span>{isRtl ? 'بطاقة الرقم القومي للوسيط' : 'Broker National ID Card'} - {broker.fullName}</span>
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
          </div>

          <div className="modal-body p-4">
            <div className="d-flex flex-wrap gap-3 mb-3 p-3 bg-black rounded border border-secondary">
              <div>
                <small className="text-muted d-block">{isRtl ? 'اسم الوسيط' : 'Broker Name'}</small>
                <strong>{broker.fullName}</strong>
              </div>
              <div>
                <small className="text-muted d-block">{isRtl ? 'رقم الهاتف' : 'Phone'}</small>
                <span dir="ltr">{broker.phoneNumber || '—'}</span>
                {broker.isPhoneVerified && (
                  <span className="badge bg-success ms-2" style={{ fontSize: '0.75rem' }}>
                    <i className="bi bi-patch-check-fill me-1"></i>{isRtl ? 'مؤكد برمز OTP' : 'OTP Verified'}
                  </span>
                )}
              </div>
              <div>
                <small className="text-muted d-block">{isRtl ? 'البريد' : 'Email'}</small>
                <span>{broker.email}</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-2">{isRtl ? 'جارٍ جلب مستندات الهوية المشفرة بأمان...' : 'Streaming encrypted ID documents securely...'}</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger">{error}</div>
            ) : !frontUrl && !backUrl ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-file-earmark-x" style={{ fontSize: '2.5rem' }}></i>
                <p className="mt-2">{isRtl ? 'لم يقم هذا الوسيط برفع بطاقة الرقم القومي (حساب قديم).' : 'No National ID images uploaded.'}</p>
              </div>
            ) : (
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="card bg-black border border-secondary h-100">
                    <div className="card-header bg-transparent border-bottom border-secondary text-warning small fw-bold">
                      <i className="bi bi-credit-card-2-front me-1"></i>
                      {isRtl ? 'الوجه الأمامي للبطاقة' : 'National ID - Front Side'}
                    </div>
                    <div className="card-body p-2 d-flex align-items-center justify-content-center" style={{ minHeight: '220px' }}>
                      {frontUrl ? (
                        <a href={frontUrl} target="_blank" rel="noreferrer" title={isRtl ? 'فتح الصورة بالحجم الكامل' : 'Open full size'}>
                          <img
                            src={frontUrl}
                            alt="National ID Front"
                            className="img-fluid rounded border border-dark"
                            style={{ maxHeight: '260px', objectFit: 'contain' }}
                          />
                        </a>
                      ) : (
                        <span className="text-muted small">{isRtl ? 'غير متوفر' : 'Not available'}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="card bg-black border border-secondary h-100">
                    <div className="card-header bg-transparent border-bottom border-secondary text-warning small fw-bold">
                      <i className="bi bi-credit-card-2-back me-1"></i>
                      {isRtl ? 'الوجه الخلفي للبطاقة' : 'National ID - Back Side'}
                    </div>
                    <div className="card-body p-2 d-flex align-items-center justify-content-center" style={{ minHeight: '220px' }}>
                      {backUrl ? (
                        <a href={backUrl} target="_blank" rel="noreferrer" title={isRtl ? 'فتح الصورة بالحجم الكامل' : 'Open full size'}>
                          <img
                            src={backUrl}
                            alt="National ID Back"
                            className="img-fluid rounded border border-dark"
                            style={{ maxHeight: '260px', objectFit: 'contain' }}
                          />
                        </a>
                      ) : (
                        <span className="text-muted small">{isRtl ? 'غير متوفر' : 'Not available'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer border-top border-secondary">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

