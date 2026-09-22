import { Link } from 'react-router-dom';
import './EmptyState.css';

export default function EmptyState({ icon = 'bi-search', title, message, actionLabel, actionTo, onAction }) {
  return (
    <div className="state-block">
      <div className="state-icon">
        <i className={`bi ${icon}`}></i>
      </div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-brand mt-3">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button type="button" className="btn btn-brand mt-3" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
