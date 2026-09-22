import Modal from '../../../components/Modal/Modal.jsx';

// Destructive-action confirmation. Optional reason input (reject flows)
// and optional typed confirmation for the most dangerous actions.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
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
  const typedOk = !requireTyped || (typed || '').trim().toLowerCase() === requireTyped.toLowerCase();
  const reasonOk = !requireReason || (reason || '').trim().length >= 3;

  return (
    <Modal title={title} onClose={onClose}>
      <p>{message}</p>
      {requireReason && (
        <div className="darcom-field">
          <label htmlFor="confirm-reason">Reason <span className="required">*</span></label>
          <textarea
            id="confirm-reason" rows="3" className="form-control"
            value={reason || ''} onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}
      {requireTyped && (
        <div className="darcom-field">
          <label htmlFor="confirm-typed">
            Type <strong>{requireTyped}</strong> to confirm <span className="required">*</span>
          </label>
          <input
            id="confirm-typed" className="form-control"
            value={typed || ''} onChange={(e) => setTyped(e.target.value)}
          />
        </div>
      )}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger' : 'btn-brand'}`}
          onClick={onConfirm}
          disabled={busy || !typedOk || !reasonOk}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
