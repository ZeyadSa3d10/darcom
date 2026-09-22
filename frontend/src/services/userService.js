import api from './api.js';

export const userService = {
  me: () => api.get('/users/me').then((r) => r.data),
  updateMe: (payload) => api.put('/users/me', payload).then((r) => r.data),
  changePassword: (payload) => api.post('/users/change-password', payload).then((r) => r.data),
};
