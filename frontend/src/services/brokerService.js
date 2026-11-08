import api from './api.js';

export const brokerService = {
  // Register as an external broker (legacy endpoint)
  register: (payload) => api.post('/broker/register', payload).then((r) => r.data),

  // Get current user's broker profile & status
  getProfile: () => api.get('/broker/profile').then((r) => r.data),

  // Get real-time dashboard KPIs and counts
  getDashboard: () => api.get('/broker/dashboard').then((r) => r.data),

  // Get broker's associated properties (with optional status filter)
  myProperties: (params = {}) =>
    api.get('/broker/properties', { params }).then((r) => r.data),

  // Workflow 1: Broker submits unit with ONLY 4 fields (Area, VillageId, ZoneId, UnitNumber)
  submitUnit: (payload) => api.post('/broker/submissions', payload).then((r) => r.data),

  // Broker views their 4-field unit submissions
  mySubmissions: (page = 1, pageSize = 12) =>
    api.get('/broker/submissions', { params: { page, pageSize } }).then((r) => r.data),

  // Workflow 2: Broker requests to rent or buy an existing property listing
  createPropertyRequest: (payload) =>
    api.post('/broker/property-requests', payload).then((r) => r.data),

  // Broker views their rent/sale property requests
  myPropertyRequests: (page = 1, pageSize = 12) =>
    api.get('/broker/property-requests', { params: { page, pageSize } }).then((r) => r.data),

  // Workflow 3: Broker submits custom requirement when suitable unit isn't found
  createRequirement: (payload) =>
    api.post('/broker/requirements', payload).then((r) => r.data),

  // Broker views their custom requirements
  myRequirements: (page = 1, pageSize = 12) =>
    api.get('/broker/requirements', { params: { page, pageSize } }).then((r) => r.data),

  // Confirmed rental periods for a broker's rental property
  propertyRentalPeriods: (propertyId) =>
    api.get(`/broker/properties/${propertyId}/rental-periods`).then((r) => r.data),

  // Legacy endpoints for backward compatibility
  submitProperty: (payload) => api.post('/broker/properties', payload).then((r) => r.data),
  createRequest: (payload) => api.post('/broker/requests', payload).then((r) => r.data),
  myRequests: (page = 1, pageSize = 12) =>
    api.get('/broker/requests', { params: { page, pageSize } }).then((r) => r.data),

  // Admin management endpoints
  adminGetBrokers: (params) => api.get('/admin/brokers', { params }).then((r) => r.data),
  adminSetBrokerStatus: (id, payload) =>
    api.put(`/admin/brokers/${id}/status`, payload).then((r) => r.data),
  adminGetSubmissions: (params) =>
    api.get('/admin/broker-submissions', { params }).then((r) => r.data),
  adminSetSubmissionStatus: (id, payload) =>
    api.put(`/admin/broker-submissions/${id}/status`, payload).then((r) => r.data),
  adminGetBrokerRequests: (params) =>
    api.get('/admin/broker-requests', { params }).then((r) => r.data),
  adminSetBrokerRequestStatus: (id, payload) =>
    api.put(`/admin/broker-requests/${id}/status`, payload).then((r) => r.data),
};
