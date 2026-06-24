import axios from 'axios';
import { config } from './config';

const API = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true, // send/receive httpOnly auth cookie
});

API.interceptors.request.use((req) => {
  // Backend uses httpOnly cookie for auth. Authorization header is also
  // accepted for callers that can't use cookies (e.g. server-to-server).
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

API.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    // Auto-redirect on auth failure. The backend uses httpOnly cookies, so
    // a 401 almost always means the session expired and the user must log
    // in again. We don't redirect if a request explicitly opts out via the
    // `_noAuthRedirect` flag (e.g. the login form itself).
    if (status === 401 && !error.config?._noAuthRedirect) {
      // Avoid redirect storms in tests / repeated failures.
      if (!window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('isAuthenticated');
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default API;