import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import './Toast.css';

const ToastContext = createContext(null);
let nextId = 1;

const ICONS = {
  success: 'bi-check-circle-fill',
  error: 'bi-exclamation-octagon-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

const DEFAULT_TITLES = {
  success: 'Success',
  error: 'Action Required',
  warning: 'Notice',
  info: 'Information',
};

function ToastItem({ toast, onDismiss }) {
  const { id, message, variant, title, ms = 4200 } = toast;
  const icon = ICONS[variant] || ICONS.info;
  const heading = title || DEFAULT_TITLES[variant] || 'Notice';

  return (
    <div
      className={`toast-item toast-${variant}`}
      role="status"
      style={{ '--toast-ms': `${ms}ms` }}
    >
      {/* Glowing Icon Badge */}
      <div className={`toast-icon-wrap ${variant}`}>
        <i className={`bi ${icon}`}></i>
      </div>

      {/* Content Meta */}
      <div className="toast-text-wrap">
        <strong className="toast-heading">{heading}</strong>
        <p className="toast-paragraph">{message}</p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        className="toast-dismiss-btn"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <i className="bi bi-x"></i>
      </button>

      {/* Countdown Timer Line */}
      {ms > 0 && (
        <div className="toast-timer-track">
          <div className={`toast-timer-line ${variant}`}></div>
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, variant = 'info', ms = 4200, title = null) => {
    const id = nextId++;
    setToasts((list) => [...list, { id, message, variant, ms, title }]);
    if (ms > 0) setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m, title) => push(m, 'success', 4200, title),
    error: (m, title) => push(m, 'error', 5000, title),
    info: (m, title) => push(m, 'info', 4200, title),
    warning: (m, title) => push(m, 'warning', 4500, title),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
