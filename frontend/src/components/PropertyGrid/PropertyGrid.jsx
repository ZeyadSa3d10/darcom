import PropertyCard from '../PropertyCard/PropertyCard.jsx';
import LoadingSkeleton from '../LoadingSkeleton/LoadingSkeleton.jsx';
import EmptyState from '../EmptyState/EmptyState.jsx';
import ErrorState from '../ErrorState/ErrorState.jsx';
import Reveal from '../Reveal/Reveal.jsx';
import './PropertyGrid.css';

export default function PropertyGrid({
  items = [],
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No properties found.',
  emptyMessage = 'Try adjusting your search or filters.',
  emptyActionLabel,
  onEmptyAction,
  favInitial = false,
  onFavoriteChange,
}) {
  if (loading) return <LoadingSkeleton variant="card" count={6} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!items.length) {
    return (
      <EmptyState
        icon="bi-house-search"
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }
  return (
    <div className="property-grid">
      {items.map((p, i) => (
        <Reveal key={p.id} delay={Math.min(i, 7) * 60}>
          <PropertyCard property={p} favInitial={favInitial} onFavoriteChange={onFavoriteChange} />
        </Reveal>
      ))}
    </div>
  );
}
