import api from './api.js';

export const requirementService = {
  // Submit a customer property requirement lead (public or authenticated)
  submit: (payload) => api.post('/requirements', payload).then((r) => r.data),

  // Authenticated user views their submitted property requirements
  myRequirements: (page = 1, pageSize = 12) =>
    api.get('/requirements/my', { params: { page, pageSize } }).then((r) => r.data),
};

