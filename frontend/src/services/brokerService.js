import api from './api.js';

export const brokerService = {
  // Register as an external broker (pending approval)
  register: (payload) => api.post('/broker/register', payload).then((r) => r.data),

  // Get current user's broker profile & status
  getProfile: () => api.get('/broker/profile').then((r) => r.data),

  // Get real-time dashboard KPIs and counts
  getDashboard: () => api.get('/broker/dashboard').then((r) => r.data),

  // Get broker's associated properties (with optional status filter)
  myProperties: (params = {}) =>
    api.get('/broker/properties', { params }).then((r) => r.data),

  // Submit a property listing for company review (OwnerId optional!)
  submitProperty: (payload) => api.post('/broker/properties', payload).then((r) => r.data),

  // Confirmed rental periods for a broker's rental property
  propertyRentalPeriods: (propertyId) =>
    api.get(`/broker/properties/${propertyId}/rental-periods`).then((r) => r.data),

  // Approved broker submits a client property request
  createRequest: (payload) => api.post('/broker/requests', payload).then((r) => r.data),

  // View client requests submitted by the broker
  myRequests: (page = 1, pageSize = 12) =>
    api.get('/broker/requests', { params: { page, pageSize } }).then((r) => r.data),
};
