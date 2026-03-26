import React, { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaExclamationTriangle,
  FaFilter,
  FaHistory,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
  FaUserShield,
} from "react-icons/fa";
import API from "../../api";

const ACTION_OPTIONS = ["", "login", "login_failed", "create", "update", "delete", "update_profile", "update_profile_avatar", "change_password", "update_user", "delete_user"];
const STATUS_OPTIONS = ["", "200", "201", "400", "401", "403", "404", "500"];

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatJsonInline(value) {
  if (!value || (typeof value === "object" && !Object.keys(value).length)) {
    return "--";
  }

  const text = JSON.stringify(value);
  if (!text) return "--";
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

function formatJsonPreview(value) {
  if (!value || typeof value !== "object" || !Object.keys(value).length) {
    return "--";
  }

  const keys = Object.keys(value).slice(0, 2);
  if (!keys.length) return "--";

  return `${keys.join(", ")} ...`;
}

function ExpandableJsonCell({ value }) {
  if (!value || (typeof value === "object" && !Object.keys(value).length)) {
    return <span className="text-slate-400">--</span>;
  }

  return (
    <details className="group max-w-[240px] rounded-2xl border border-slate-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-slate-700">
        <span className="truncate">{formatJsonPreview(value)}</span>
        <FaChevronDown className="shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-200 px-3 py-2">
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </details>
  );
}

export default function AuditReport() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    successCount: 0,
    errorCount: 0,
    uniqueUsers: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    search: "",
    action: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async (page = pagination.page) => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/audit-logs", {
        params: {
          ...filters,
          page,
          limit: pagination.limit,
        },
      });

      setLogs(Array.isArray(res.data?.rows) ? res.data.rows : []);
      setSummary(res.data?.summary || { total: 0, successCount: 0, errorCount: 0, uniqueUsers: 0 });
      setPagination((current) => ({
        ...current,
        ...(res.data?.pagination || {}),
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Audit logs load nahi ho paaye.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, []);

  const successRate = useMemo(() => {
    if (!summary.total) return "0%";
    return `${Math.round((summary.successCount / summary.total) * 100)}%`;
  }, [summary]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applyFilters = () => {
    loadLogs(1);
  };

  const clearFilters = () => {
    const next = {
      search: "",
      action: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(next);
    setPagination((current) => ({ ...current, page: 1 }));
    setTimeout(() => {
      loadLogs(1);
    }, 0);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f6fbff_0%,#eef6f8_28%,#fff8ef_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/35 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.52)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1380px] space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#1d4ed8_100%)] px-5 py-6 shadow-[0_28px_70px_rgba(15,23,42,0.16)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)] lg:items-end">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
                Security And Compliance
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-white sm:text-4xl">
                  Audit log dashboard
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                  Login, update, delete, and system API activity ko ek jagah trace karo with user, endpoint, request metadata, status codes, and old/new values.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadLogs(pagination.page)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.14)] transition hover:-translate-y-0.5"
              >
                <FaSyncAlt className={loading ? "animate-spin text-cyan-600" : "text-cyan-600"} />
                Refresh Logs
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total Events", value: summary.total, tone: "bg-white/10 text-white border-white/12" },
                { label: "Success", value: summary.successCount, tone: "bg-emerald-500/18 text-emerald-100 border-emerald-300/20" },
                { label: "Errors", value: summary.errorCount, tone: "bg-rose-500/18 text-rose-100 border-rose-300/20" },
                { label: "Unique Users", value: summary.uniqueUsers, tone: "bg-cyan-500/18 text-cyan-100 border-cyan-300/20" },
              ].map((item) => (
                <div key={item.label} className={`rounded-[22px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl ${item.tone}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">{item.label}</div>
                  <div className="mt-3 text-2xl font-black">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-500">
                  Filters
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Search audit events</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-[0_14px_30px_rgba(14,165,233,0.22)] transition hover:-translate-y-0.5"
                >
                  <FaFilter />
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm xl:col-span-2">
                <FaSearch className="text-cyan-500" />
                <input
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search action, endpoint, user"
                  className="w-full bg-transparent outline-none placeholder:text-slate-400"
                />
              </label>

              <select
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
              >
                <option value="">All actions</option>
                {ACTION_OPTIONS.filter(Boolean).map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
              >
                <option value="">All status</option>
                {STATUS_OPTIONS.filter(Boolean).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 xl:col-span-5">
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                  <FaCalendarAlt className="text-cyan-500" />
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                  <FaCalendarAlt className="text-cyan-500" />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-500">
                  Snapshot
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Live audit health</h2>
              </div>
              <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <FaCheckCircle />
                  <span className="text-sm font-bold">Success rate</span>
                </div>
                <div className="mt-3 text-3xl font-black text-emerald-800">{successRate}</div>
              </div>
              <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-rose-700">
                  <FaExclamationTriangle />
                  <span className="text-sm font-bold">Failed / blocked calls</span>
                </div>
                <div className="mt-3 text-3xl font-black text-rose-800">{summary.errorCount}</div>
              </div>
              <div className="rounded-[22px] border border-cyan-200 bg-cyan-50 p-4">
                <div className="flex items-center gap-2 text-cyan-700">
                  <FaUserShield />
                  <span className="text-sm font-bold">Traced users</span>
                </div>
                <div className="mt-3 text-3xl font-black text-cyan-800">{summary.uniqueUsers}</div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center rounded-[28px] border border-white/70 bg-white/90 py-20 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                <p className="mt-3 text-sm text-slate-500">Loading audit logs...</p>
              </div>
            </div>
          ) : logs.length ? (
            <>
              <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-4 py-4">Log ID</th>
                        <th className="px-4 py-4">User</th>
                        <th className="px-4 py-4">Action</th>
                        <th className="px-4 py-4">Endpoint</th>
                        <th className="px-4 py-4">Method</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">IP</th>
                        <th className="px-4 py-4">Request Data</th>
                        <th className="px-4 py-4">Old Value</th>
                        <th className="px-4 py-4">New Value</th>
                        <th className="px-4 py-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        const isSuccess = Number(log.response_status) >= 200 && Number(log.response_status) < 300;
                        return (
                          <tr key={log.id} className="border-t border-slate-100 align-top transition hover:bg-cyan-50/35">
                            <td className="px-4 py-4 font-bold text-slate-900">#{log.id}</td>
                            <td className="px-4 py-4">
                              <div className="min-w-[180px]">
                                <div className="font-semibold text-slate-900">
                                  {log.user_name || `User #${log.user_id || "--"}`}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">{log.user_email || "--"}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="min-w-[220px] break-words font-semibold text-slate-800">{log.endpoint}</div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">
                                {log.http_method}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSuccess ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                {log.response_status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-600">{log.ip_address || "--"}</td>
                            <td className="px-4 py-4">
                              <ExpandableJsonCell value={log.request_data} />
                            </td>
                            <td className="px-4 py-4">
                              <ExpandableJsonCell value={log.old_value} />
                            </td>
                            <td className="px-4 py-4">
                              <ExpandableJsonCell value={log.new_value} />
                            </td>
                            <td className="px-4 py-4">
                              <div className="min-w-[150px] text-sm font-semibold text-slate-700">
                                {formatDateTime(log.created_at)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-[24px] border border-white/70 bg-white/88 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Page <span className="font-bold text-slate-900">{pagination.page}</span> of{" "}
                  <span className="font-bold text-slate-900">{pagination.totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => loadLogs(pagination.page - 1)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => loadLogs(pagination.page + 1)}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/75 p-12 text-center text-slate-500">
              <FaHistory className="mx-auto mb-3 text-3xl text-slate-400" />
              <div className="text-lg font-bold text-slate-900">No audit logs found</div>
              <div className="mt-2 text-sm">Filters change karke ya kuch actions perform karke phir refresh karo.</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
