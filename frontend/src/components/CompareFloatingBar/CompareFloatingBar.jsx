import { Link } from 'react-router-dom';
import { useCompare } from '../../context/CompareContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import './CompareFloatingBar.css';

export default function CompareFloatingBar() {
  const { items, removeFromCompare, clearCompare, count, maxCount } = useCompare();
  const { isRtl } = useSettings();

  if (count === 0) return null;

  return (
    <div className="compare-floating-bar" role="region" aria-label="Compare properties bar">
      <div className="container compare-bar-container">
        {/* Info & Count */}
        <div className="compare-bar-info">
          <div className="compare-icon-bubble">
            <i className="bi bi-arrow-left-right"></i>
          </div>
          <div>
            <span className="compare-bar-title">
              {isRtl ? 'مقارنة العقارات' : 'Compare Residences'}
            </span>
            <span className="compare-bar-count">
              {count} / {maxCount} {isRtl ? 'وحدات مختارة' : 'selected'}
            </span>
          </div>
        </div>

        {/* Thumbnails Row */}
        <div className="compare-thumbs-row">
          {items.map((item) => (
            <div key={item.id} className="compare-thumb-item">
              <img
                src={item.primaryImageUrl || '/placeholder-property.svg'}
                alt={item.title}
                className="compare-thumb-img"
              />
              <div className="compare-thumb-meta">
                <span className="compare-thumb-price">
                  {Number(item.price).toLocaleString()} EGP
                </span>
              </div>
              <button
                type="button"
                className="compare-thumb-remove"
                onClick={() => removeFromCompare(item.id)}
                title={isRtl ? 'إزالة من المقارنة' : 'Remove'}
                aria-label="Remove"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
          ))}

          {/* Empty Slot Placeholders */}
          {Array.from({ length: maxCount - count }).map((_, idx) => (
            <div key={`empty-${idx}`} className="compare-thumb-empty">
              <i className="bi bi-plus"></i>
              <span>{isRtl ? 'أضف وحدة' : 'Add'}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="compare-bar-actions">
          <Link to="/compare" className="btn-compare-cta">
            <span>{isRtl ? 'قارن الآن' : 'Compare Now'}</span>
            <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'}`}></i>
          </Link>
          <button
            type="button"
            className="btn-compare-clear"
            onClick={clearCompare}
            title={isRtl ? 'إلغاء الكل' : 'Clear all'}
          >
            {isRtl ? 'مسح' : 'Clear'}
          </button>
        </div>
      </div>
    </div>
  );
}
