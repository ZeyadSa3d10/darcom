import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../Toast/Toast.jsx';
import { favoriteService } from '../../services/favoriteService.js';
import './FavoriteButton.css';

export default function FavoriteButton({ propertyId, initial = false, onChange, inline = false }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [active, setActive] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Log in to save favorites.');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (active) {
        await favoriteService.remove(propertyId);
        setActive(false);
        onChange?.(false);
      } else {
        await favoriteService.add(propertyId);
        setActive(true);
        toast.success('Added to favorites.');
        onChange?.(true);
      }
    } catch {
      toast.error('Could not update favorites. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`fav-btn ${active ? 'active' : ''} ${inline ? 'inline' : ''}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
    >
      <i className={`bi ${active ? 'bi-heart-fill' : 'bi-heart'}`}></i>
    </button>
  );
}
