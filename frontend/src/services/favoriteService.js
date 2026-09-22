import api from './api.js';

export const favoriteService = {
  add: (propertyId) => api.post('/favorites', { propertyId }).then((r) => r.data),
  remove: (propertyId) => api.delete(`/favorites/${propertyId}`).then((r) => r.data),
  my: (page = 1, pageSize = 12) =>
    api.get('/favorites/my', { params: { page, pageSize } }).then((r) => r.data),
};
