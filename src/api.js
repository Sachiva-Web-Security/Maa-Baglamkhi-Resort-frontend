import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_ORIGIN || "/api",
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  const method = String(req.method || "get").toLowerCase();
  const inferredAction =
    req.auditAction ||
    (req.url?.includes("/login")
      ? "login"
      : method === "delete"
      ? "delete"
      : method === "put" || method === "patch"
      ? "update"
      : method === "post"
      ? "create"
      : "read");

  req.headers["X-Audit-Action"] = inferredAction;
  req.headers["X-Audit-Source"] = "frontend";

  const email = localStorage.getItem("email");
  if (email) {
    req.headers["X-Audit-User-Email"] = email;
  }

  return req;
});

// On 401 (expired/invalid token), clear auth and redirect to login
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.skipAuthRedirect) {
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
