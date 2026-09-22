import './ErrorState.css';

function firstMessage(error) {
  if (!error) return 'Something went wrong.';
  if (typeof error === 'string') return error;
  return error.message || 'Something went wrong.';
}

export default function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="state-block" role="alert">
      <div className="state-icon error">
        <i className="bi bi-exclamation-triangle"></i>
      </div>
      <h3>{title}</h3>
      <p>{firstMessage(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-brand mt-3" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1"></i>Retry
        </button>
      )}
    </div>
  );
}
