import Modal from '../../../components/Modal/Modal.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';

// Destructive-action confirmation. Optional reason input (reject flows)
// and optional typed confirmation for the most dangerous actions.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  requireReason = false,
  requireTyped,
  reason,
  setReason,
  typed,
  setTyped,
  busy,
  onConfirm,
  onClose,
}) {
  const { t, isRtl } = useSettings();
  const typedOk = !requireTyped || (typed || '').trim().toLowerCase() === requireTyped.toLowerCase();
  const reasonOk = !requireReason || (reason || '').trim().length >= 3;

  const defaultConfirmLabel = confirmLabel || t('common.confirm', isRtl ? 'تأكيد' : 'Confirm');

  return (
    <Modal title={title} onClose={onClose}>
      <p>{message}</p>
      {requireReason && (
        <div className="darcom-field">
          <label htmlFor="confirm-reason">
            {isRtl ? 'سبب الرفض / التوضيح' : 'Reason'} <span className="required">*</span>
          </label>
          <textarea
            id="confirm-reason"
            rows="3"
            className="form-control"
            placeholder={isRtl ? 'وضح السبب بالتفصيل ليتم إخطار الطرف المعني…' : 'Explain the reason in detail…'}
            value={reason || ''}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}
      {requireTyped && (
        <div className="darcom-field">
          <label htmlFor="confirm-typed">
            {isRtl ? (
              <>
                اكتب <strong>{requireTyped}</strong> للتأكيد <span className="required">*</span>
              </>
            ) : (
              <>
                Type <strong>{requireTyped}</strong> to confirm <span className="required">*</span>
              </>
            )}
          </label>
          <input
            id="confirm-typed"
            className="form-control"
            value={typed || ''}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
      )}
      <div className="d-flex justify-content-end gap-2 mt-4">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
          {t('common.cancel', isRtl ? 'إلغاء' : 'Cancel')}
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger' : 'btn-brand'}`}
          onClick={onConfirm}
          disabled={busy || !typedOk || !reasonOk}
        >
          {busy ? (isRtl ? 'جارٍ التنفيذ…' : 'Working…') : defaultConfirmLabel}
        </button>
      </div>
    </Modal>
  );
}
