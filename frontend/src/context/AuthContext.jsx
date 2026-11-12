import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';
import { userService } from '../services/userService.js';
import { SESSION_EXPIRED_EVENT, clearTokens, getAccessToken, refreshAccessToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      // If no in-memory access token yet (e.g. page reload), silently restore via HttpOnly refresh cookie.
      if (!getAccessToken()) {
        const refreshed = await refreshAccessToken();
        if (refreshed?.user) {
          setUser(refreshed.user);
          return;
        }
        if (!refreshed?.accessToken) {
          setUser(null);
          return;
        }
      }

      const res = await userService.me();
      setUser(res.data ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [loadMe]);

  const sendEmailOtp = useCallback((email) => authService.sendEmailOtp(email), []);

  const verifyEmailOtp = useCallback(async (payload) => {
    const res = await authService.verifyEmailOtp(payload);
    setUser(res.data?.user ?? null);
    return res;
  }, []);

  const googleLogin = useCallback(async (idToken) => {
    const res = await authService.googleLogin(idToken);
    setUser(res.data?.user ?? null);
    return res;
  }, []);

  const login = useCallback(async (payload) => {
    const res = await authService.login(payload);
    setUser(res.data?.user ?? null);
    return res;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await authService.register(payload);
    setUser(res.data?.user ?? null);
    return res;
  }, []);

  const registerBroker = useCallback(async (payload) => {
    const res = await authService.registerBroker(payload);
    setUser(res.data?.user ?? null);
    return res;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    clearTokens();
    setUser(null);
  }, []);

  const revokeAll = useCallback(async () => {
    await authService.revokeAll();
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'Admin',
      isBroker: user?.role === 'Broker',
      sendEmailOtp,
      verifyEmailOtp,
      googleLogin,
      login,
      register,
      registerBroker,
      logout,
      revokeAll,
      reloadUser: loadMe,
      refreshUser: loadMe,
    }),
    [user, loading, sendEmailOtp, verifyEmailOtp, googleLogin, login, register, registerBroker, logout, revokeAll, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider.');
  return ctx;
}
