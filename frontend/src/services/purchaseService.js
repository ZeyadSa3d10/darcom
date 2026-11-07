import api from './api.js';

export const purchaseService = {
  // Purchase (sale / investment) requests
  createPurchase: (payload) => api.post('/purchase-requests', payload).then((r) => r.data),
  myPurchases: (page = 1, pageSize = 12) =>
    api.get('/purchase-requests/my', { params: { page, pageSize } }).then((r) => r.data),
  // Rental requests
  createBooking: (payload) => api.post('/booking-requests', payload).then((r) => r.data),
  myBookings: (page = 1, pageSize = 12) =>
    api.get('/booking-requests/my', { params: { page, pageSize } }).then((r) => r.data),
  // Seller / Owner pipeline & rental periods
  submitProperty: (payload) => api.post('/seller/properties', payload).then((r) => r.data),
  submitForReview: (id) => api.post(`/seller/properties/${id}/submit`).then((r) => r.data),
  myProperties: (page = 1, pageSize = 12) =>
    api.get('/seller/properties/my', { params: { page, pageSize } }).then((r) => r.data),
  myRentalPeriods: (propertyId) =>
    api
      .get('/seller/properties/rental-periods', {
        params: propertyId ? { propertyId } : {},
      })
      .then((r) => r.data),
  // Agent contact form (public, rate-limited server-side)
  inquire: (propertyId, payload) =>
    api.post(`/inquiries/properties/${propertyId}`, payload).then((r) => r.data),
  contact: (payload) => api.post('/contact', payload).then((r) => r.data),
  // Notifications
  notifications: (page = 1, pageSize = 12) =>
    api.get('/notifications/my', { params: { page, pageSize } }).then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data),
  markRead: (id) => api.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/notifications/read-all').then((r) => r.data),
};
