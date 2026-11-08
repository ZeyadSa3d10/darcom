import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const PurposeContext = createContext(null);

const STORAGE_KEY = 'darcom_purpose';
const LEGACY_STORAGE_KEY = 'darcom-mode-selected';

export function PurposeProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [purpose, setPurposeState] = useState(() => {
    // 1. Check URL query param first
    const param = searchParams.get('purpose');
    if (param && (param.toLowerCase() === 'rent' || param.toLowerCase() === 'sale')) {
      return param.toLowerCase();
    }
    // 2. Check localStorage / sessionStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored && (stored.toLowerCase() === 'rent' || stored.toLowerCase() === 'sale')) {
        return stored.toLowerCase();
      }
    }
    return 'sale';
  });

  // Sync state if URL query param changes
  useEffect(() => {
    const urlPurpose = searchParams.get('purpose');
    if (urlPurpose && (urlPurpose.toLowerCase() === 'rent' || urlPurpose.toLowerCase() === 'sale')) {
      const normalized = urlPurpose.toLowerCase();
      if (normalized !== purpose) {
        setPurposeState(normalized);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, normalized);
          sessionStorage.setItem(LEGACY_STORAGE_KEY, normalized);
        }
      }
    }
  }, [searchParams, purpose]);

  // Sync storage whenever purpose changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, purpose);
      sessionStorage.setItem(LEGACY_STORAGE_KEY, purpose);
    }
  }, [purpose]);

  const setPurpose = useCallback((nextPurpose) => {
    const normalized = (nextPurpose || 'sale').toString().trim().toLowerCase();
    const finalPurpose = normalized === 'rent' ? 'rent' : 'sale';

    setPurposeState(finalPurpose);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, finalPurpose);
      sessionStorage.setItem(LEGACY_STORAGE_KEY, finalPurpose);
    }

    // If currently on properties page, sync query params and reset budget
    if (location.pathname === '/properties') {
      const currentParams = new URLSearchParams(location.search);
      currentParams.set('purpose', finalPurpose);
      currentParams.delete('minPrice');
      currentParams.delete('maxPrice');
      currentParams.delete('startDate');
      currentParams.delete('endDate');
      currentParams.set('page', '1');
      navigate(`/properties?${currentParams.toString()}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const switchPurpose = useCallback(() => {
    const next = purpose === 'sale' ? 'rent' : 'sale';
    setPurpose(next);
  }, [purpose, setPurpose]);

  const isRental = purpose === 'rent';
  const isSale = purpose === 'sale';

  const value = useMemo(() => ({
    purpose,
    isRental,
    isSale,
    setPurpose,
    switchPurpose,
    purposeLabelAr: isRental ? 'إيجار' : 'شراء',
    purposeLabelEn: isRental ? 'Rent' : 'Buy',
    otherPurposeLabelAr: isRental ? 'التبديل إلى الشراء' : 'التبديل إلى الإيجار',
    otherPurposeLabelEn: isRental ? 'Switch to Buy' : 'Switch to Rent',
  }), [purpose, isRental, isSale, setPurpose, switchPurpose]);

  return (
    <PurposeContext.Provider value={value}>
      {children}
    </PurposeContext.Provider>
  );
}

export function usePurpose() {
  const ctx = useContext(PurposeContext);
  if (!ctx) {
    throw new Error('usePurpose must be used within a PurposeProvider');
  }
  return ctx;
}

