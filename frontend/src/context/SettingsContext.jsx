import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations.js';

const SettingsContext = createContext(null);
const LANG_KEY = 'darcom.lang';
const DIR_KEY = 'darcom.dir';

export function SettingsProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang === 'ar' || savedLang === 'en') return savedLang;
    const savedDir = localStorage.getItem(DIR_KEY);
    return savedDir === 'rtl' ? 'ar' : 'en';
  });

  const [isSwitchingLang, setIsSwitchingLang] = useState(false);
  const [targetLang, setTargetLang] = useState(null);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isRtl = dir === 'rtl';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
    localStorage.setItem(DIR_KEY, dir);
  }, [lang, dir]);

  const switchLanguage = useCallback(
    (nextLang) => {
      if (isSwitchingLang || nextLang === lang) return;

      setTargetLang(nextLang);
      setIsSwitchingLang(true);

      // 1. Allow overlay to fade in and show progress before swapping content underneath
      const swapTimer = setTimeout(() => {
        setLangState(nextLang);
      }, 300);

      // 2. Hide overlay smoothly after transition completes (~850ms total)
      const completeTimer = setTimeout(() => {
        setIsSwitchingLang(false);
        setTargetLang(null);
      }, 850);

      return () => {
        clearTimeout(swapTimer);
        clearTimeout(completeTimer);
      };
    },
    [isSwitchingLang, lang]
  );

  const toggleLang = useCallback(() => {
    const next = lang === 'ar' ? 'en' : 'ar';
    switchLanguage(next);
  }, [lang, switchLanguage]);

  const setLang = useCallback(
    (newLang) => {
      if ((newLang === 'ar' || newLang === 'en') && newLang !== lang) {
        switchLanguage(newLang);
      }
    },
    [lang, switchLanguage]
  );

  // Safe nested translation lookup
  const t = useCallback(
    (keyPath, paramsOrFallback = {}) => {
      if (!keyPath) return '';
      const isParamObj = typeof paramsOrFallback === 'object' && paramsOrFallback !== null;
      const fallback = typeof paramsOrFallback === 'string' ? paramsOrFallback : keyPath;

      const keys = keyPath.split('.');
      let current = TRANSLATIONS[lang];
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          current = null;
          break;
        }
      }

      // Fallback to English dictionary if missing in current language
      if (current == null) {
        let fallbackCurrent = TRANSLATIONS['en'];
        for (const k of keys) {
          if (fallbackCurrent && typeof fallbackCurrent === 'object' && k in fallbackCurrent) {
            fallbackCurrent = fallbackCurrent[k];
          } else {
            fallbackCurrent = null;
            break;
          }
        }
        current = fallbackCurrent ?? fallback;
      }

      if (typeof current === 'string' && isParamObj) {
        return current.replace(/\{(\w+)\}/g, (_, varName) => {
          return paramsOrFallback[varName] !== undefined ? paramsOrFallback[varName] : `{${varName}}`;
        });
      }

      return current ?? fallback;
    },
    [lang]
  );

  // Format price with locale currency
  const formatPrice = useCallback(
    (amount, frequency = '') => {
      if (amount == null || amount === '') return '';
      const num = Number(amount);
      if (Number.isNaN(num)) return amount;
      const formatted = num.toLocaleString('en-US');
      const currency = t('common.egp', 'EGP');
      const suffix = frequency ? ` / ${frequency}` : '';
      return `${formatted} ${currency}${suffix}`;
    },
    [t]
  );

  const formatArea = useCallback(
    (area) => {
      if (!area) return '';
      return `${Number(area).toLocaleString('en-US')} ${t('common.sqm', 'm²')}`;
    },
    [t]
  );

  const value = useMemo(
    () => ({
      lang,
      dir,
      isRtl,
      isSwitchingLang,
      targetLang,
      setLang,
      toggleLang,
      toggleDir: toggleLang, // Backward compatibility alias
      t,
      formatPrice,
      formatArea,
    }),
    [lang, dir, isRtl, isSwitchingLang, targetLang, setLang, toggleLang, t, formatPrice, formatArea]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
