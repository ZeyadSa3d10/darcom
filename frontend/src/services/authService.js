import api, { setAccessToken, clearTokens, refreshAccessToken } from './api.js';

const unwrap = (res) => res.data?.data;

export const authService = {
  async getConfig() {
    const res = await api.get('/auth/config');
    return res.data;
  },

  async sendEmailOtp(email) {
    const res = await api.post('/auth/email-otp/send', { email });
    return res.data;
  },

  async verifyEmailOtp(payload) {
    const res = await api.post('/auth/email-otp/verify', payload);
    const data = unwrap(res);
    if (data?.accessToken) setAccessToken(data.accessToken);
    return res.data;
  },

  async googleLogin(idToken) {
    const res = await api.post('/auth/google', { idToken });
    const data = unwrap(res);
    if (data?.accessToken) setAccessToken(data.accessToken);
    return res.data;
  },

  async register(payload) {
    const res = await api.post('/auth/register', payload);
    const data = unwrap(res);
    if (data?.accessToken) setAccessToken(data.accessToken);
    return res.data;
  },

  async registerBroker(payload) {
    const res = await api.post('/auth/register-broker', payload);
    const data = unwrap(res);
    if (data?.accessToken) setAccessToken(data.accessToken);
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
    if (data?.accessToken) setAccessToken(data.accessToken);
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

  async revokeAll() {
    try {
      await api.post('/auth/revoke-all');
    } finally {
      clearTokens();
    }
  },

  async refresh() {
    const data = await refreshAccessToken();
    if (!data?.accessToken) {
      throw { success: false, message: 'Session expired.', errors: [] };
    }
    return { success: true, data };
  },

  forgotPassword: (payload) => api.post('/auth/forgot-password', payload).then((r) => r.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
};
