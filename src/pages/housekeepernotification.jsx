import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock3,
  User,
  BedDouble,
  Sparkles,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import API from "../api";

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

const normalizeNotification = (row) => ({
  id: row.id,
  room: row.roomNo || row.room_no || row.room || "-",
  assignedTo: row.assignedTo || row.assigned_to || "No Housekeeper",
  receptionist: row.receptionist || "Reception",
  task: row.message || row.taskLabel || row.task_label || "Room Cleaning",
  taskLabel: row.taskLabel || row.task_label || "Room Cleaning",
  sentAt: row.sentAt || row.sent_at,
  dueAt: row.dueAt || row.due_at,
  completedAt: row.completedAt || row.completed_at,
  status: row.status || "New",
});

export default function HousekeeperNotification() {
  const currentUser = localStorage.getItem("name") || "";
  const currentRole = String(localStorage.getItem("role") || "").toLowerCase();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      // Admins/managers see everything; regular housekeepers only see their own.
      // The backend supports `?assignee=` so we don't pull rows we'll have to hide.
      const isPrivileged = ["admin", "manager"].includes(currentRole);
      const params = isPrivileged ? {} : currentUser ? { assignee: currentUser } : { status: "None" };
      const response = await API.get("/housekeeping/notifications", { params });
      const rows = Array.isArray(response.data) ? response.data : [];
      // Default: hide Completed unless the user is privileged and the call returned the full set.
      const filtered = isPrivileged
        ? rows
        : rows.filter((row) => String(row.status).toLowerCase() !== "completed");
      setNotifications(filtered.map(normalizeNotification));
      setCurrentPage(1);
    } catch {
      setError("Housekeeping notifications load nahi ho paaye.");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [currentRole, currentUser]);

  useEffect(() => {
    fetchNotifications();

    // Auto-refresh so newly-assigned tasks from /stayover or /dashboard
    // surface without a manual reload.
    const intervalId = globalThis.setInterval(fetchNotifications, 30000);
    const onFocus = () => fetchNotifications();
    globalThis.addEventListener("focus", onFocus);

    return () => {
      globalThis.clearInterval(intervalId);
      globalThis.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifications]);

  const canComplete = (item) => {
    if (["admin", "manager"].includes(currentRole)) return true;
    return Boolean(currentUser) && item.assignedTo === currentUser;
  };

  const completeTask = async (id) => {
    const previous = notifications;
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "Completed", completedAt: new Date().toISOString() }
          : item,
      ),
    );

    try {
      await API.put(`/housekeeping/notifications/${id}/complete`);

      // Small pause so the housekeeper sees the confirmation message
      // before the card is removed by the Completed filter below.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Re-fetch so the row is either refreshed or vanishes from the
      // housekeeper's list (Completed items are filtered out for them).
      await fetchNotifications();
    } catch {
      setNotifications(previous);
      setError("Task complete update nahi ho paaya. Please retry.");
    }
  };

  const total = notifications.length;
  const completed = notifications.filter((n) => n.status === "Completed").length;
  const pending = notifications.filter((n) => n.status !== "Completed").length;
  const assignedToYou = useMemo(
    () => notifications.filter((n) => currentUser && n.assignedTo === currentUser).length,
    [currentUser, notifications],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return notifications.slice(start, start + pageSize);
  }, [notifications, safePage, pageSize]);

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
    <div className="min-h-screen bg-slate-100 p-6 lg:p-10">
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-blue-700 to-sky-500 p-8 text-white shadow-2xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full bg-white/20 px-5 py-2">
              <Bell className="h-5 w-5" />
              <span className="text-sm font-semibold">Housekeeping Notifications</span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold">Task Assignment Center</h1>

            <p className="mt-3 max-w-2xl text-lg text-blue-100">
              Real room assignments sent from reception and the cleaning log panel.
            </p>
          </div>

          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/15 backdrop-blur-xl">
            <Bell className="h-16 w-16 text-white" />
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500">Total Notifications</p>
              <h2 className="mt-2 text-4xl font-bold text-blue-900">{total}</h2>
            </div>
            <div className="rounded-2xl bg-blue-100 p-4">
              <Bell className="h-8 w-8 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500">Pending Tasks</p>
              <h2 className="mt-2 text-4xl font-bold text-orange-500">{pending}</h2>
            </div>
            <div className="rounded-2xl bg-orange-100 p-4">
              <Clock3 className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500">Completed</p>
              <h2 className="mt-2 text-4xl font-bold text-green-600">{completed}</h2>
            </div>
            <div className="rounded-2xl bg-green-100 p-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500">Assigned To You</p>
              <h2 className="mt-2 text-4xl font-bold text-sky-600">{assignedToYou}</h2>
            </div>
            <div className="rounded-2xl bg-sky-100 p-4">
              <User className="h-8 w-8 text-sky-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Results info */}
      {!loading && total > 0 && (
        <p className="mt-6 text-sm font-medium text-slate-500">
          Showing {Math.min((safePage - 1) * pageSize + 1, total)} –{" "}
          {Math.min(safePage * pageSize, total)} of {total} notifications
        </p>
      )}

      <div className="mt-4 space-y-6">
        {loading ? (
          <div className="rounded-3xl bg-white p-10 text-center text-lg font-semibold text-slate-500 shadow-xl">
            Loading housekeeping notifications...
          </div>
        ) : pageItems.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
            {currentUser ? (
              <>
                <p className="text-lg font-semibold text-slate-700">
                  No housekeeping tasks assigned to {currentUser} yet.
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Tasks assigned from the Stay Overview or Dashboard will show up here automatically.
                </p>
              </>
            ) : (
              <p className="text-lg font-semibold text-slate-700">
                Please log in to view your housekeeping tasks.
              </p>
            )}
          </div>
        ) : (
          pageItems.map((item) => {
            const isMine = Boolean(currentUser) && item.assignedTo === currentUser;
            const allowedToComplete = canComplete(item);

            return (
              <div
                key={item.id}
                className="rounded-3xl border border-blue-100 bg-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="p-6 lg:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 gap-5">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-sky-500 text-white shadow-lg">
                        <BedDouble className="h-8 w-8" />
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-bold text-slate-900">Room {item.room}</h2>

                          <span
                            className={`rounded-full px-4 py-1 text-sm font-semibold ${
                              item.status === "Completed"
                                ? "bg-green-100 text-green-700"
                                : item.status === "In Progress"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <p className="mt-3 text-slate-600">
                          <span className="font-semibold text-blue-800">Receptionist:</span> {item.receptionist}
                        </p>

                        <p className="mt-1 text-slate-600">
                          <span className="font-semibold text-blue-800">Assigned To:</span> {item.assignedTo}
                        </p>

                        <p className="mt-1 text-slate-600">
                          <span className="font-semibold text-blue-800">Message:</span> {item.task}
                        </p>

                        <p className="mt-1 text-slate-600">
                          <span className="font-semibold text-blue-800">Task:</span> {item.taskLabel}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <CalendarDays size={18} />
                            Sent {formatDate(item.sentAt)}
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock3 size={18} />
                            {formatTime(item.sentAt)}
                          </div>

                          <div className="flex items-center gap-2 font-semibold text-orange-600">
                            <Clock3 size={18} />
                            Due {formatDate(item.dueAt)} {formatTime(item.dueAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-4 lg:items-end">
                      {allowedToComplete ? (
                        item.status === "Completed" ? (
                          <div className="flex flex-col items-start gap-2 lg:items-end">
                            <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 px-5 py-3 font-semibold text-emerald-700">
                              <CheckCircle2 size={20} />
                              Marked Clean
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 font-semibold text-emerald-700 shadow-sm">
                              This room is ready to book now.
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => completeTask(item.id)}
                            className="rounded-2xl bg-gradient-to-r from-blue-900 via-blue-700 to-sky-500 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105"
                          >
                            <span className="flex items-center gap-2">
                              <Check size={18} />
                              Mark Clean
                            </span>
                          </button>
                        )
                      ) : (
                        <div className="rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-500">
                          Assigned to another housekeeper
                        </div>
                      )}

                      {isMine && (
                        <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                          <Sparkles className="mr-2 inline h-4 w-4" />
                          Assigned to You
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row">
          {/* Page-size selector */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-40"
              title="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>

            {/* Prev */}
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-40"
              title="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Page numbers */}
            {getPageRange().map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => goToPage(p)}
                className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-2 text-sm font-bold transition ${
                  p === safePage
                    ? "border border-blue-600 bg-blue-600 text-white shadow-md"
                    : "border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-40"
              title="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

              <button
                type="button"
                onClick={() => goToPage(totalPages)}
                disabled={safePage === totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-40"
                title="Last page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
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
}