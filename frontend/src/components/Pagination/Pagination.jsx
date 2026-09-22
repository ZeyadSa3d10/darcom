import './Pagination.css';

export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const go = (p) => {
    if (p >= 1 && p <= totalPages && p !== page) onChange(p);
  };

  // Compact window: 1 … p-1 p p+1 … N
  const items = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...items].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  return (
    <nav className="darcom-pagination" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Previous page">
        <i className="bi bi-chevron-left"></i>
      </button>
      {pages.map((p, i) => (
        <span key={p} className="page-group">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="page-gap">…</span>}
          <button
            type="button"
            className={p === page ? 'active' : ''}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => go(p)}
          >
            {p}
          </button>
        </span>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => go(page + 1)} aria-label="Next page">
        <i className="bi bi-chevron-right"></i>
      </button>
    </nav>
  );
}
