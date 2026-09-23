import { useEffect, useState } from 'react';
import { cmsService } from '../services/cmsService.js';

// CMS-driven SEO overrides (admin: Website Content → SEO tab).
// Fetched once per session and shared across pages; missing/empty values
// fall back to each page's hardcoded defaults.
let cache = null;
let inflight = null;

function loadAll() {
  if (cache !== null) return Promise.resolve(cache);
  if (!inflight) {
    inflight = cmsService
      .get('site.seo')
      .then((res) => {
        try {
          cache = res?.data?.contentValue ? JSON.parse(res.data.contentValue) : {};
        } catch {
          cache = {};
        }
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

function pick(override) {
  if (!override || typeof override !== 'object') return null;
  const title = (override.title || '').trim();
  const description = (override.description || '').trim();
  const image = (override.image || '').trim();
  if (!title && !description && !image) return null;
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
  };
}

export function useCmsSeo(page) {
  const [override, setOverride] = useState(null);
  useEffect(() => {
    let alive = true;
    loadAll().then((all) => {
      if (alive) setOverride(pick(all?.[page]));
    });
    return () => {
      alive = false;
    };
  }, [page]);
  return override;
}
