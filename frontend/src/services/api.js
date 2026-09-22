import axios from 'axios';

// Token storage keys (single source of truth — AuthContext uses the same).
export const ACCESS_KEY = 'darcom.accessToken';
export const REFRESH_KEY = 'darcom.refreshToken';

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setTokens = (access, refresh) => {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
};
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

// Fired when the session cannot be recovered (expired refresh, revoked, ...).
// AuthContext subscribes and resets user state.
export const SESSION_EXPIRED_EVENT = 'darcom:session-expired';
export const notifySessionExpired = () => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5153/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh-once retry: on 401 (non-auth endpoints) try the refresh token a single
// time, replay the original request, else clear the session and notify.
let refreshPromise = null;
async function tryRefresh() {
  if (!refreshPromise) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    refreshPromise = axios
      .post(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken },
        { timeout: 10000 }
      )
      .then((res) => {
        const data = res.data?.data;
        if (data?.accessToken) {
          setTokens(data.accessToken, data.refreshToken);
          return data.accessToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const url = original.url || '';

    const isAuthEndpoint = url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (status === 401 && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      const fresh = await tryRefresh();
      if (fresh) {
        original.headers = { ...original.headers, Authorization: `Bearer ${fresh}` };
        return api(original);
      }
      clearTokens();
      notifySessionExpired();
    }

    // Normalize to the backend envelope { success:false, message, errors }.
    // Network failures (no response) get a synthetic offline-friendly shape.
    if (error.response?.data) return Promise.reject(error.response.data);
    return Promise.reject({
      success: false,
      message: error.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : 'Cannot reach the server. Check your connection and retry.',
      errors: [],
      networkError: true,
    });
  }
);

export default api;
