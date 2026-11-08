import api, { setTokens, clearTokens, getRefreshToken } from './api.js';

const unwrap = (res) => res.data?.data;

export const authService = {
  async register(payload) {
    const res = await api.post('/auth/register', payload);
    const data = unwrap(res);
    if (data?.accessToken) setTokens(data.accessToken, data.refreshToken);
    return res.data;
  },

  async registerBroker(payload) {
    const res = await api.post('/auth/register-broker', payload);
    const data = unwrap(res);
    if (data?.accessToken) setTokens(data.accessToken, data.refreshToken);
    return res.data;
  },

  async sendOtp(phoneNumber) {
    const res = await api.post('/auth/otp/send', { phoneNumber });
    return res.data;
  },

  async verifyOtp(phoneNumber, code) {
    const res = await api.post('/auth/otp/verify', { phoneNumber, code });
    return res.data;
  },

  async login(payload) {
    const res = await api.post('/auth/login', payload);
    const data = unwrap(res);
    if (data?.accessToken) setTokens(data.accessToken, data.refreshToken);
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Session cleanup must never fail the UX.
    }
    clearTokens();
  },

  async refresh() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw { success: false, message: 'No session to refresh.', errors: [] };
    const res = await api.post('/auth/refresh', { refreshToken });
    const data = unwrap(res);
    if (data?.accessToken) setTokens(data.accessToken, data.refreshToken);
    return res.data;
  },

  forgotPassword: (payload) => api.post('/auth/forgot-password', payload).then((r) => r.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
};
