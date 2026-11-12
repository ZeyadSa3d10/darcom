import axios from 'axios';

// In-memory Access Token ONLY. Refresh Token lives exclusively in an HttpOnly Cookie
// managed by the backend — never persisted in localStorage/sessionStorage.
let inMemoryAccessToken = null;

// Clean up any legacy localStorage tokens from pre-Identity builds.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('darcom.accessToken');
    localStorage.removeItem('darcom.refreshToken');
  } catch {
    // Ignore storage access errors in restricted modes.
  }
}

export const getAccessToken = () => inMemoryAccessToken;
export const setAccessToken = (access) => {
  inMemoryAccessToken = access || null;
};
export const clearTokens = () => {
  inMemoryAccessToken = null;
};

export const SESSION_EXPIRED_EVENT = 'darcom:session-expired';
export const notifySessionExpired = () => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: { indexes: null },
});

// Attach in-memory JWT Access Token to every request and preserve multipart FormData boundaries.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Single-flight refresh promise prevents concurrent token rotation races.
let refreshPromise = null;

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${api.defaults.baseURL}/auth/refresh`,
        {},
        { timeout: 10000, withCredentials: true }
      )
      .then((res) => {
        const data = res.data?.data;
        if (data?.accessToken) {
          setAccessToken(data.accessToken);
          return data;
        }
        clearTokens();
        return null;
      })
      .catch(() => {
        clearTokens();
        return null;
      })
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

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/email-otp') ||
      url.includes('/auth/google');

    if (status === 401 && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      const refreshed = await refreshAccessToken();
      if (refreshed?.accessToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${refreshed.accessToken}` };
        return api(original);
      }
      clearTokens();
      notifySessionExpired();
    }

    if (error.response?.data) {
      const body = error.response.data;
      return Promise.reject(
        body && typeof body === 'object' ? { ...body, status: error.response.status } : body
      );
    }
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
