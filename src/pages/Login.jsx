// src/pages/Login.jsx
// FIXED: Responsive login with proper field handling + error display
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { getRoleHome } from "../utils/roleHome";
import { withAudit } from "../utils/auditAction";
import bgImage from "../assets/bg.jpg";

const ROLE_LOGIN_HINTS = [
  { role: "admin", email: "admin@resort.com", label: "Admin" },
  { role: "manager", email: "manager@resort.com", label: "Manager" },
  { role: "receptionist", email: "reception@resort.com", label: "Reception" },
  { role: "accountant", email: "accounts@resort.com", label: "Accounts" },
  { role: "housekeeping", email: "tarun@resort.com", label: "Housekeeping" },
  { role: "waiter", email: "waiter@resort.com", label: "Waiter" },
  { role: "chef", email: "chef@resort.com", label: "Chef" },
];

const LOGIN_EMAIL_ALIASES = {
  "admin@resort.com": "admin@test.com",
  "admin@test.com": "admin@resort.com",
  "manager@resort.com": "manager@test.com",
  "manager@test.com": "manager@resort.com",
  "reception@resort.com": "reception@test.com",
  "reception@test.com": "reception@resort.com",
  "accounts@resort.com": "accounts@test.com",
  "accounts@test.com": "accounts@resort.com",
  "tarun@resort.com": "hk@test.com",
  "hk@test.com": "tarun@resort.com",
  "waiter@resort.com": "waiter@test.com",
  "waiter@test.com": "waiter@resort.com",
  "chef@resort.com": "chef@test.com",
  "chef@test.com": "chef@resort.com",
};

const Login = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const loginBody = { email: normalizedEmail, password };

      let res;
      try {
        res = await API.post(
          "/auth/login",
          loginBody,
          withAudit("login"),
        );
      } catch (err) {
        const aliasEmail = LOGIN_EMAIL_ALIASES[normalizedEmail];
        const shouldRetryWithAlias =
          aliasEmail &&
          err.response?.status === 400 &&
         /invalid email/i.test(String(err.response?.data?.message || "").toLowerCase());

        if (!shouldRetryWithAlias) {
          throw err;
        }

        res = await API.post(
          "/auth/login",
          { email: aliasEmail, password },
          withAudit("login"),
        );
      }

      const data = res.data;

      // Backend now sets httpOnly cookie for auth.
      // We only keep minimal non-sensitive state.
      if (setIsAuthenticated) setIsAuthenticated(true);
      navigate(getRoleHome(data.role), { replace: true });
    } catch (err) {
      const base =
        (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "") ||
        "backend";
      if (err.message === "Network Error") {
        setError(
          `Cannot reach server. Make sure backend is running at ${base}`,
        );
      } else {
        setError(err.response?.data?.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const applyLoginHint = (credential) => {
    setEmail(credential.email);
    setPassword("");
    setError("");
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-8 sm:px-6"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
      }}
    >
      {/* Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.3)]">
          {/* Header stripe */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-800 px-8 py-7 text-center text-white">
            <div className="text-2xl font-black tracking-wide">
              Maa BAGLAMUKHI RESORT
            </div>
            <div className="mt-1.5 text-sm font-semibold text-white/75">
              Hotel Management System
            </div>
          </div>

          <div className="px-8 py-7">
            <h2 className="mb-6 text-center text-xl font-black text-slate-900">
              Staff Login
            </h2>

            {/* Error banner */}
            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="email@resort.com"
                  required
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-700 to-teal-600 py-3 text-sm font-bold text-white shadow-lg transition hover:from-blue-800 hover:to-teal-700 disabled:opacity-60"
              >
                {loading ? "Signing In…" : "Sign In"}
              </button>
            </form>

            {/* Role email shortcuts */}
            <div className="mt-6">
              <p className="mb-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Role Email Shortcuts
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {ROLE_LOGIN_HINTS.map((rc) => (
                  <button
                    key={rc.role}
                    type="button"
                    onClick={() => applyLoginHint(rc)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:border-slate-300"
                  >
                    {rc.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                These buttons only fill the email. Enter the current password manually.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;