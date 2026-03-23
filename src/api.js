import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_ORIGIN || "/api",
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// On 401 (expired/invalid token), clear auth and redirect to login
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
      localStorage.removeItem("isAuthenticated");
      window.location.href = `${window.location.origin}/login`;
    }
    return Promise.reject(err);
  }
);

/** Base URL of the backend server (no /api) for building upload URLs */
export function getBackendBaseURL() {
  const base = API.defaults.baseURL || "";
  return base.replace(/\/api\/?$/, "") || window.location.origin;
}

export default API;
