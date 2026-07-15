import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaBell,
  FaCheck,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaClock,
  FaRedo,
  FaSearch,
  FaStickyNote,
  FaTasks,
  FaUser,
  FaUserCheck,
  FaUserShield,
} from "react-icons/fa";
import API from "../api";

const PRIVILEGED_ROLES = ["admin", "manager", "receptionist"];

const STATUS_CONFIG = {
  Pending: { badge: "bg-amber-100 text-amber-700 border-amber-200" },
  "In Progress": { badge: "bg-blue-100 text-blue-700 border-blue-200" },
  Completed: { badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Cancelled: { badge: "bg-slate-100 text-slate-500 border-slate-200" },
};

const PRIORITY_CONFIG = {
  Urgent: "bg-rose-100 text-rose-700 border-rose-200",
  High: "bg-amber-100 text-amber-700 border-amber-200",
  Normal: "bg-blue-100 text-blue-700 border-blue-200",
  Low: "bg-slate-100 text-slate-500 border-slate-200",
};

const PAGE_SIZES = [5, 10, 20, 50];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeAssignment = (row) => ({
  id: row.id ?? row._id,
  staffName:
    row.staffName ||
    row.staff_name ||
    row.assignedTo ||
    row.assigned_to ||
    "Unassigned",
  roomNumber: row.roomNumber || row.room_number || row.room || "",
  task: row.task || row.message || row.taskLabel || "Assigned task",
  priority: row.priority || "Normal",
  status: row.status || "Pending",
  assignedBy:
    row.assignedBy || row.assigned_by || row.receptionist || "Reception",
  dueTime: row.dueTime || row.due_time || row.dueAt || "",
  notes: row.notes || "",
  createdAt: row.createdAt || row.created_at || row.sentAt || row.sent_at,
  completedAt: row.completedAt || row.completed_at || null,
});

const AssignmentNotification = () => {
  const currentUser = (localStorage.getItem("name") || "").trim();
  const currentRole = String(localStorage.getItem("role") || "").toLowerCase();
  const isPrivileged = PRIVILEGED_ROLES.includes(currentRole);

  const [allAssignments, setAllAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/assignments");
      const rows = Array.isArray(res.data) ? res.data : [];
      setAllAssignments(rows.map(normalizeAssignment));
      setCurrentPage(1);
    } catch {
      setError("Assignments load nahi ho paaye. Please retry.");
      setAllAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    const intervalId = setInterval(fetchAssignments, 30000);
    const onFocus = () => fetchNotifications_safe(fetchAssignments);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAssignments]);

  const canComplete = (item) => {
    if (isPrivileged) return true;
    if (!currentUser) return false;
    return String(item.staffName || "").toLowerCase() === currentUser.toLowerCase();
  };

  const handleComplete = async (item) => {
    if (!canComplete(item) || item.status === "Completed") return;
    const previous = allAssignments;
    setActionId(item.id);
    setAllAssignments((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? { ...row, status: "Completed", completedAt: new Date().toISOString() }
          : row,
      ),
    );
    try {
      await API.put(`/assignments/${item.id}`, { status: "Completed" });
    } catch {
      setAllAssignments(previous);
      setError("Task complete update nahi ho paaya. Please retry.");
    } finally {
      setActionId(null);
    }
  };

  const filtered = useMemo(() => {
    return allAssignments.filter((item) => {
      const matchSearch =
        !search ||
        String(item.staffName).toLowerCase().includes(search.toLowerCase()) ||
        String(item.roomNumber).toLowerCase().includes(search.toLowerCase()) ||
        String(item.task).toLowerCase().includes(search.toLowerCase()) ||
        String(item.assignedBy).toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || item.status === filterStatus;
      const matchPriority = !filterPriority || item.priority === filterPriority;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [allAssignments, search, filterStatus, filterPriority]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterPriority, pageSize]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const stats = useMemo(() => {
    const total = allAssignments.length;
    const pending = allAssignments.filter((a) => a.status !== "Completed").length;
    const completed = allAssignments.filter((a) => a.status === "Completed").length;
    const mine = allAssignments.filter(
      (a) =>
        currentUser &&
        String(a.staffName).toLowerCase() === currentUser.toLowerCase(),
    ).length;
    return { total, pending, completed, mine };
  }, [allAssignments, currentUser]);

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  const getPageRange = () => {
    const delta = 2;
    const range = [];
    const left = Math.max(1, safePage - delta);
    const right = Math.min(totalPages, safePage + delta);

    for (let i = left; i <= right; i++) range.push(i);
    return range;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-700 to-sky-500 p-6 text-white shadow-xl lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold">
              <FaBell className="h-4 w-4" /> Assignment Notifications
            </div>
            <h1 className="mt-4 text-3xl font-extrabold lg:text-4xl">
              Service Provider Tasks
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100 lg:text-base">
              Live tasks assigned by reception, manager and admin. Everyone can
              see every task, but the &quot;Mark Complete&quot; button only
              shows up for the assigned staff member or for reception / manager /
              admin.
            </p>
          </div>
          <button
            onClick={fetchAssignments}
            className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
          >
            <FaRedo className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Tasks", value: stats.total, icon: FaTasks, tone: "indigo" },
          { label: "Pending", value: stats.pending, icon: FaClock, tone: "amber" },
          { label: "Completed", value: stats.completed, icon: FaCheckCircle, tone: "emerald" },
          { label: "Assigned To You", value: stats.mine, icon: FaUser, tone: "sky" },
        ].map((s) => {
          const Icon = s.icon;
          const toneBg = {
            indigo: "bg-indigo-100",
            amber: "bg-amber-100",
            emerald: "bg-emerald-100",
            sky: "bg-sky-100",
          };
          const toneText = {
            indigo: "text-indigo-600",
            amber: "text-amber-600",
            emerald: "text-emerald-600",
            sky: "text-sky-600",
          };
          return (
            <div
              key={s.label}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {s.label}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {s.value}
                  </p>
                </div>
                <div className={`rounded-2xl p-3 ${toneBg[s.tone]}`}>
                  <Icon className={`h-6 w-6 ${toneText[s.tone]}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <label className="flex flex-1 min-w-64 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <FaSearch className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by staff, room, task, assigned by..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none"
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_CONFIG).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none"
        >
          <option value="">All Priorities</option>
          {Object.keys(PRIORITY_CONFIG).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Results info */}
      {!loading && filtered.length > 0 && (
        <p className="mb-4 text-sm font-medium text-slate-500">
          Showing {Math.min((safePage - 1) * pageSize + 1, filtered.length)} –{" "}
          {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}{" "}
          assignments
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center rounded-3xl bg-white py-16 text-slate-500 shadow-sm">
          <FaRedo className="mr-2 animate-spin" /> Loading assignments...
        </div>
      ) : pageItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500 shadow-sm">
          <FaClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold">
            No assignments found for the current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pageItems.map((item) => {
            const sConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending;
            const pConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.Normal;
            const allowed = canComplete(item);
            const isMine =
              Boolean(currentUser) &&
              String(item.staffName).toLowerCase() === currentUser.toLowerCase();
            const hasNotes = Boolean(item.notes && item.notes.trim());

            return (
              <div
                key={item.id}
                className={`rounded-3xl border bg-white shadow-sm transition hover:shadow-md lg:p-6 ${
                  isMine
                    ? "border-sky-300 ring-1 ring-sky-200"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left content */}
                  <div className="flex flex-1 gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-900 to-sky-500 text-white shadow-md">
                      <FaClipboardList className="h-6 w-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {item.task}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${pConfig}`}
                        >
                          {item.priority}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sConfig.badge}`}
                        >
                          {item.status}
                        </span>
                        {isMine && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                            <FaUserCheck className="h-3 w-3" /> Assigned To You
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-800">
                            Staff:
                          </span>{" "}
                          {item.staffName}
                        </p>
                        {item.roomNumber && (
                          <p>
                            <span className="font-semibold text-slate-800">
                              Room:
                            </span>{" "}
                            {item.roomNumber}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold text-slate-800">
                            Assigned By:
                          </span>{" "}
                          {item.assignedBy}
                        </p>
                        {item.dueTime && (
                          <p>
                            <span className="font-semibold text-slate-800">
                              Due:
                            </span>{" "}
                            {formatDate(item.dueTime)}{" "}
                            {formatTime(item.dueTime)}
                          </p>
                        )}
                      </div>

                      {/* Notes / Message – prominent callout */}
                      {hasNotes && (
                        <div className="mt-3 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <FaStickyNote className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                          <p className="text-sm leading-relaxed text-amber-800">
                            {item.notes}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>
                          Created: {formatDate(item.createdAt)}{" "}
                          {formatTime(item.createdAt)}
                        </span>
                        {item.completedAt && (
                          <span className="font-semibold text-emerald-600">
                            Completed: {formatDate(item.completedAt)}{" "}
                            {formatTime(item.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action area – role-based */}
                  <div className="flex flex-col items-stretch gap-2 lg:items-end">
                    {item.status === "Completed" ? (
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-5 py-2.5 text-sm font-semibold text-emerald-700">
                        <FaCheckCircle /> Completed
                      </div>
                    ) : allowed ? (
                      <button
                        onClick={() => handleComplete(item)}
                        disabled={actionId === item.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-700 to-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] disabled:opacity-60"
                      >
                        <FaCheck /> Mark Complete
                      </button>
                    ) : (
                      <div className="rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-500">
                        Assigned to {item.staffName}
                      </div>
                    )}

                    {isPrivileged && !isMine && (
                      <div className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                        <FaUserShield className="h-3 w-3" />
                        You can override as {currentRole}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row">
          {/* Page-size selector */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Page number buttons */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {/* First */}
            <button
              type="button"
              onClick={() => goToPage(1)}
              disabled={safePage === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40"
              title="First page"
            >
              <FaAngleDoubleLeft className="text-xs" />
            </button>

            {/* Prev */}
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40"
              title="Previous page"
            >
              <FaChevronLeft className="text-xs" />
            </button>

            {/* Page numbers */}
            {getPageRange().map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => goToPage(p)}
                className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-2 text-sm font-bold transition ${
                  p === safePage
                    ? "border border-indigo-600 bg-indigo-600 text-white shadow-md"
                    : "border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                {p}
              </button>
            ))}

            {/* Next */}
            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40"
              title="Next page"
            >
              <FaChevronRight className="text-xs" />
            </button>

            {/* Last */}
            <button
              type="button"
              onClick={() => goToPage(totalPages)}
              disabled={safePage === totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40"
              title="Last page"
            >
              <FaAngleDoubleRight className="text-xs" />
            </button>
          </div>

          {/* Page indicator */}
          <p className="text-sm font-medium text-slate-500">
            Page {safePage} of {totalPages}
          </p>
        </div>
      )}
    </div>
  );
};

export default AssignmentNotification;

// helper kept top-level so the focus listener has a stable reference
function fetchNotifications_safe(fn) {
  try {
    fn();
  } catch {
    /* swallow – fetchAssignments already handles its own errors */
  }
}
