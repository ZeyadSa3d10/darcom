import api from './api.js';

export const listingRequestService = {
  // Normal authenticated user
  submit: (payload) =>
    api.post('/property-listing-requests', payload).then((r) => r.data),

  myRequests: (page = 1, pageSize = 12) =>
    api.get('/property-listing-requests/my', { params: { page, pageSize } }).then((r) => r.data),

  getById: (id) =>
    api.get(`/property-listing-requests/${id}`).then((r) => r.data),

  // Admin endpoints
  adminList: (params = {}) =>
    api.get('/admin/property-listing-requests', { params }).then((r) => r.data),

  adminGetById: (id) =>
    api.get(`/admin/property-listing-requests/${id}`).then((r) => r.data),

  adminUpdateStatus: (id, payload) =>
    api.put(`/admin/property-listing-requests/${id}/status`, payload).then((r) => r.data),

  adminCreateProperty: (id, payload) =>
    api.post(`/admin/property-listing-requests/${id}/create-property`, payload).then((r) => r.data),
};

