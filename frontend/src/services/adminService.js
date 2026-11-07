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

  // Village & Zone CRUD (Requirements 3 & 13)
  getVillages: (includeInactive = true) =>
    api.get('/admin/villages', { params: { includeInactive } }).then((r) => r.data),
  getVillageById: (id) => api.get(`/admin/villages/${id}`).then((r) => r.data),
  createVillage: (payload) => api.post('/admin/villages', payload).then((r) => r.data),
  updateVillage: (id, payload) => api.put(`/admin/villages/${id}`, payload).then((r) => r.data),
  deleteVillage: (id) => api.delete(`/admin/villages/${id}`).then((r) => r.data),

  getZones: (villageId, includeInactive = true) =>
    api.get(`/admin/villages/${villageId}/zones`, { params: { includeInactive } }).then((r) => r.data),
  createZone: (villageId, payload) =>
    api.post(`/admin/villages/${villageId}/zones`, payload).then((r) => r.data),
  updateZone: (villageId, zoneId, payload) =>
    api.put(`/admin/villages/${villageId}/zones/${zoneId}`, payload).then((r) => r.data),
  deleteZone: (villageId, zoneId) =>
    api.delete(`/admin/villages/${villageId}/zones/${zoneId}`).then((r) => r.data),

  // Property Types CRUD (Requirements 5 & 13)
  createPropertyType: (payload) => api.post('/admin/property-types', payload).then((r) => r.data),
  updatePropertyType: (id, payload) =>
    api.put(`/admin/property-types/${id}`, payload).then((r) => r.data),
  deletePropertyType: (id) => api.delete(`/admin/property-types/${id}`).then((r) => r.data),

  // Broker Management (Requirements 7 & 8)
  getBrokers: (params = {}) => api.get('/admin/brokers', { params }).then((r) => r.data),
  setBrokerStatus: (id, payload) =>
    api.put(`/admin/brokers/${id}/status`, payload).then((r) => r.data),
  getBrokerRequests: (params = {}) =>
    api.get('/admin/broker-requests', { params }).then((r) => r.data),
  setBrokerRequestStatus: (id, payload) =>
    api.put(`/admin/broker-requests/${id}/status`, payload).then((r) => r.data),

  // Property Requirement Leads (Requirement 10)
  getRequirements: (params = {}) =>
    api.get('/admin/requirements', { params }).then((r) => r.data),
  setRequirementStatus: (id, payload) =>
    api.put(`/admin/requirements/${id}/status`, payload).then((r) => r.data),

  // Rental Periods Tracking (Requirement 9)
  propertyRentalPeriods: (propertyId) =>
    api
      .get('/admin/properties/rental-periods', {
        params: propertyId ? { propertyId } : {},
      })
      .then((r) => r.data),
};
