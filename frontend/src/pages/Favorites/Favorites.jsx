import { useCallback, useEffect, useState } from 'react';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import PropertyGrid from '../../components/PropertyGrid/PropertyGrid.jsx';
import PropertyCard from '../../components/PropertyCard/PropertyCard.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton/LoadingSkeleton.jsx';
import Pagination from '../../components/Pagination/Pagination.jsx';
import { favoriteService } from '../../services/favoriteService.js';
import './Favorites.css';
import { useSeo } from '../../hooks/useSeo.js';

export default function Favorites() {
  useSeo({ title: 'My favorites | Darcom' });
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async (p = 1) => {
    setState('loading');
    setError(null);
    try {
      const res = await favoriteService.my(p, 12);
      setItems(res.data?.data ?? []);
      setTotalPages(res.data?.totalPages ?? 1);
      setPage(res.data?.page ?? p);
      setState('done');
    } catch (e) {
      setError(e);
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const onUnfavorite = (id) => {
    setItems((list) => list.filter((p) => p.id !== id));
  };

  return (
    <main id="main-content" className="container favorites-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Favorites' }]} />
      <h1 className="font-display">My favorites</h1>

      {state === 'loading' && <LoadingSkeleton variant="card" count={6} />}
      {state === 'error' && <ErrorState error={error} onRetry={() => load(page)} />}
      {state === 'done' && items.length === 0 && (
        <EmptyState
          icon="bi-heart"
          title="No favorites yet."
          message="Tap the heart on any property to keep it here."
          actionLabel="Browse properties"
          actionTo="/properties"
        />
      )}
      {state === 'done' && items.length > 0 && (
        <>
          <div className="property-grid">
            {items.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                favInitial
                onFavoriteChange={(active) => {
                  if (!active) onUnfavorite(p.id);
                }}
              />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(next) => load(next)} />
        </>
      )}
    </main>
  );
}
