import api from './api.js';

// Mirrors GET /api/properties query contract (PHASE-03).
export const propertyService = {
  list: (params = {}) => api.get('/properties', { params }).then((r) => r.data),
  // Alias used by the listing page (spec deliverable name).
  listProperties: (params = {}) => api.get('/properties', { params }).then((r) => r.data),
  getById: (id) => api.get(`/properties/${id}`).then((r) => r.data),
  getBySlug: (slug) => api.get(`/properties/slug/${slug}`).then((r) => r.data),
  related: (id, count = 4) =>
    api.get(`/properties/${id}/related`, { params: { count } }).then((r) => r.data),
  featured: (count = 8) => api.get('/properties/featured', { params: { count } }).then((r) => r.data),
  search: (q, page = 1, pageSize = 12) =>
    api.get('/properties/search', { params: { q, page, pageSize } }).then((r) => r.data),
  create: (payload) => api.post('/properties', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/properties/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/properties/${id}`).then((r) => r.data),

  // Owner-managed media (PHASE-04). Uploads use multipart; URL attaches use JSON.
  media: (propertyId) => api.get(`/properties/${propertyId}/media`).then((r) => r.data),
  uploadMedia: (propertyId, kind, file, altText) => {
    const form = new FormData();
    form.append('file', file);
    if (altText) form.append('altText', altText);
    return api
      .post(`/properties/${propertyId}/media/${kind}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      .then((r) => r.data);
  },
  attachMediaUrl: (propertyId, kind, payload) =>
    api.post(`/properties/${propertyId}/media/${kind}/by-url`, payload).then((r) => r.data),
  deleteMedia: (propertyId, kind, mediaId) =>
    api.delete(`/properties/${propertyId}/media/${kind}/${mediaId}`).then((r) => r.data),
};
