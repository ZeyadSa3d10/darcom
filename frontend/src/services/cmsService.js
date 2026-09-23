import api from './api.js';

export const cmsService = {
  /** Fetch a single CMS content block by key */
  get: (key) => api.get(`/site-content/${key}`).then((r) => r.data),

  /** Fetch multiple CMS content blocks. keys = array of strings */
  getBulk: (keys) =>
    api.get('/site-content', { params: { keys: keys.join(',') } }).then((r) => r.data),

  /** Fetch all CMS content blocks (admin) */
  getAll: () => api.get('/site-content').then((r) => r.data),

  /** Create or update a CMS content block (admin only) */
  upsert: (payload) => api.put('/site-content', payload).then((r) => r.data),

  /** Delete a CMS content block (admin only) */
  remove: (key) => api.delete(`/site-content/${key}`).then((r) => r.data),
};
