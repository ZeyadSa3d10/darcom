import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';
import { userService } from '../services/userService.js';
import { SESSION_EXPIRED_EVENT, clearTokens, getAccessToken } from '../services/api.js';

const AuthContext = createContext(null);

// Shared auth session only (website.md #51). Forms, gallery and UI toggles stay local.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    try {
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

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'Admin',
      isBroker: user?.role === 'Broker',
      login,
      register,
      registerBroker,
      logout,
      reloadUser: loadMe,
    }),
    [user, loading, login, register, registerBroker, logout, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider.');
  return ctx;
}
