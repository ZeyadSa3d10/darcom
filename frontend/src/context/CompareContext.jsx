import { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '../components/Toast/Toast.jsx';
import { useSettings } from './SettingsContext.jsx';

const CompareContext = createContext(null);
const STORAGE_KEY = 'darcom_compare_items';
const MAX_COMPARE = 4;

export function CompareProvider({ children }) {
  const toast = useToast();
  const { isRtl } = useSettings();
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to persist compare list to localStorage', e);
    }
  }, [items]);

  const isInCompare = (id) => items.some((item) => item.id === id);

  const addToCompare = (property) => {
    if (!property || !property.id) return false;

    if (items.some((item) => item.id === property.id)) {
      removeFromCompare(property.id);
      return false;
    }

    if (items.length >= MAX_COMPARE) {
      toast.warning(
        isRtl
          ? `يمكنك مقارنة ${MAX_COMPARE} عقارات كحد أقصى في وقت واحد.`
          : `You can compare up to ${MAX_COMPARE} properties at a time.`
      );
      return false;
    }

    setItems((prev) => [...prev, property]);
    toast.success(
      isRtl
        ? 'تمت إضافة العقار إلى قائمة المقارنة.'
        : 'Property added to comparison list.'
    );
    return true;
  };

  const removeFromCompare = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.info(
      isRtl
        ? 'تمت إزالة العقار من قائمة المقارنة.'
        : 'Property removed from comparison list.'
    );
  };

  const toggleCompare = (property) => {
    if (isInCompare(property.id)) {
      removeFromCompare(property.id);
      return false;
    } else {
      return addToCompare(property);
    }
  };

  const clearCompare = () => {
    setItems([]);
  };

  return (
    <CompareContext.Provider
      value={{
        items,
        count: items.length,
        maxCount: MAX_COMPARE,
        isInCompare,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        clearCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return ctx;
}
