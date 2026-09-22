import api from './api.js';

export const adminService = {
  ping: () => api.get('/admin/ping').then((r) => r.data),
  dashboard: () => api.get('/admin/dashboard').then((r) => r.data),
  properties: (params = {}) => api.get('/admin/properties', { params }).then((r) => r.data),
  purchaseRequests: (params = {}) =>
    api.get('/admin/purchase-requests', { params }).then((r) => r.data),
  setPurchaseStatus: (id, payload) =>
    api.put(`/admin/purchase-requests/${id}/status`, payload).then((r) => r.data),
  bookingRequests: (params = {}) =>
    api.get('/admin/booking-requests', { params }).then((r) => r.data),
  setBookingStatus: (id, payload) =>
    api.put(`/admin/booking-requests/${id}/status`, payload).then((r) => r.data),
  approveProperty: (id) => api.put(`/admin/properties/${id}/approve`).then((r) => r.data),
  rejectProperty: (id, reason) =>
    api.put(`/admin/properties/${id}/reject`, { reason }).then((r) => r.data),
  inquiries: (params = {}) => api.get('/inquiries', { params }).then((r) => r.data),
  markInquiryRead: (id) => api.put(`/admin/inquiries/${id}/read`).then((r) => r.data),
  auditLogs: (params = {}) => api.get('/admin/audit-logs', { params }).then((r) => r.data),
  users: (params = {}) => api.get('/admin/users', { params }).then((r) => r.data),
  setUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  agents: () => api.get('/admin/agents').then((r) => r.data),
  reviews: (params = {}) => api.get('/admin/reviews', { params }).then((r) => r.data),
  setReviewApproval: (id, approved) =>
    api.put(`/admin/reviews/${id}/approval`, { approved }).then((r) => r.data),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`).then((r) => r.data),
};
