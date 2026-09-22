import './LoadingSkeleton.css';

export function SkeletonCard() {
  return (
    <div className="sk-card" aria-hidden="true">
      <div className="skeleton sk-card-img"></div>
      <div className="sk-card-body">
        <div className="skeleton sk-line sk-w40"></div>
        <div className="skeleton sk-line sk-w80"></div>
        <div className="skeleton sk-line sk-w60"></div>
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton sk-line"></div>
      ))}
    </div>
  );
}

export function SkeletonGallery() {
  return (
    <div className="sk-gallery" aria-hidden="true">
      <div className="skeleton sk-gallery-main"></div>
      <div className="sk-gallery-thumbs">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton sk-gallery-thumb"></div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDetails() {
  return (
    <div aria-hidden="true">
      <div className="skeleton sk-line sk-w60"></div>
      <div className="skeleton sk-line sk-w40"></div>
      <SkeletonText lines={5} />
    </div>
  );
}

export default function LoadingSkeleton({ variant = 'text', count = 6 }) {
  if (variant === 'card') {
    return (
      <div className="sk-grid" role="status" aria-label="Loading">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }
  if (variant === 'gallery') return <SkeletonGallery />;
  if (variant === 'details') return <SkeletonDetails />;
  return <SkeletonText lines={count} />;
}
