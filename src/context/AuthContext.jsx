import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import API from '../api';

// Storage keys — single source of truth, shared with api.js / ProtectedRoute.
const KEY_TOKEN = 'token';
const KEY_ROLE = 'role';
const KEY_NAME = 'userName';
const KEY_EMAIL = 'email';
const KEY_AUTH = 'isAuthenticated';
const KEY_PERMS = 'permissions';

const AuthContext = createContext(null);

function readUser() {
  return {
    token: localStorage.getItem(KEY_TOKEN) || null,
    role: (localStorage.getItem(KEY_ROLE) || '').toLowerCase() || null,
    name: localStorage.getItem(KEY_NAME) || null,
    email: localStorage.getItem(KEY_EMAIL) || null,
    isAuthenticated: localStorage.getItem(KEY_AUTH) === 'true',
    permissions: (() => {
      const raw = localStorage.getItem(KEY_PERMS);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);
  // Hydration flag — true once we've consulted the backend at least once.
  // Used by ProtectedRoute to avoid bouncing a real session back to /login
  // just because the initial localStorage read was racing the boot.
  const [ready, setReady] = useState(false);

  // On mount, if we have a token, validate it against the backend. If the
  // server says 401 we treat the session as expired.
  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (user.token) {
        try {
          await API.get('/auth/me', { _noAuthRedirect: true });
        } catch {
          if (cancelled) return;
          // Token rejected. Clear and rely on the response interceptor's
          // redirect for the browser-level bounce; here we just sync state.
          setUser({
            token: null,
            role: null,
            name: null,
            isAuthenticated: false,
            permissions: null,
          });
        }
      }
      if (!cancelled) setReady(true);
    }
    verify();
    return () => {
      cancelled = true;
    };
    // We intentionally only run this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((payload) => {
    // payload = { token, role, name, email?, permissions? }
    if (payload.token) localStorage.setItem(KEY_TOKEN, payload.token);
    if (payload.role) localStorage.setItem(KEY_ROLE, payload.role.toLowerCase());
    if (payload.name) localStorage.setItem(KEY_NAME, payload.name);
    if (payload.email) localStorage.setItem(KEY_EMAIL, payload.email);
    if (payload.permissions) {
      localStorage.setItem(KEY_PERMS, JSON.stringify(payload.permissions));
    }
    localStorage.setItem(KEY_AUTH, 'true');
    setUser(readUser());
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_ROLE);
    localStorage.removeItem(KEY_NAME);
    localStorage.removeItem(KEY_EMAIL);
    localStorage.removeItem(KEY_AUTH);
    localStorage.removeItem(KEY_PERMS);
    setUser({
      token: null,
      role: null,
      name: null,
      email: null,
      isAuthenticated: false,
      permissions: null,
    });
  }, []);

  const value = useMemo(
    () => ({ ...user, ready, login, logout }),
    [user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;