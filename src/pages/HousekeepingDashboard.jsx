import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBroom,
  FaCheckCircle,
  FaClipboardList,
  FaTasks,
  FaUserClock,
} from "react-icons/fa";

import useDashboardAutoRefresh from "../hooks/useDashboardAutoRefresh";
import { housekeepingService } from "../services/housekeepingService";
import API from "../api";

const floorFromRoom = (roomNo) => {
  const match = /^(\d)/.exec(String(roomNo || ""));
  return match ? `Floor ${match[1]}` : "Ground / Other";
};

const normalizeNotification = (row) => ({
  id: row.id,
  roomId: row.roomId || row.room_id,
  roomNo: row.roomNo || row.room_no || row.room,
  assignedTo: row.assignedTo || row.assigned_to || "No Housekeeper",
  assignedBy: row.receptionist || "Front Desk",
  task: row.message || row.taskLabel || row.task_label || "Room Cleaning",
  taskLabel: row.taskLabel || row.task_label || "Room Cleaning",
  sentAt: row.sentAt || row.sent_at,
  dueAt: row.dueAt || row.due_at,
  completedAt: row.completedAt || row.completed_at,
  status: row.status || "New",
});

const normalizeStatus = (raw) =>
  String(raw || "").trim().replaceAll("_", " ");

const fallback = "--";

const statusPill = (status) => {
  const s = normalizeStatus(status).toLowerCase();
  if (s.includes("clean") && !s.includes("dirty")) return { label: status, cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  if (s.includes("dirty")) return { label: status, cls: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (s.includes("progress") || s.includes("cleaning")) return { label: status, cls: "bg-violet-50 text-violet-700 border border-violet-200" };
  if (s.includes("occupied")) return { label: status, cls: "bg-rose-50 text-rose-700 border border-rose-200" };
  if (s.includes("block") || s.includes("service")) return { label: status, cls: "bg-slate-50 text-slate-600 border border-slate-200" };
  return { label: status || "Unknown", cls: "bg-slate-50 text-slate-600 border border-slate-200" };
};

const durationFromTimestamps = (sentAt, dueAt) => {
  const start = sentAt ? new Date(sentAt) : null;
  const end = dueAt ? new Date(dueAt) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "--";
  const diffMs = end.getTime() - start.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins <= 0) return "< 1 min";
  return `${mins} min`;
};

const timeLeftLabel = (dueAt) => {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  const diffMs = due.getTime() - Date.now();
  if (diffMs < 0) return { text: "Overdue", cls: "text-rose-600 font-semibold" };
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return { text: `${mins} min left`, cls: "text-amber-600 font-semibold" };
  const hrs = Math.round(mins / 60);
  return { text: `${hrs} hr left`, cls: "text-slate-600" };
};

const HousekeepingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const [roomsResponse, notificationsResponse] = await Promise.allSettled([
        housekeepingService.getAllRooms(),
        API.get("/housekeeping/notifications"),
      ]);

      const roomsData =
        roomsResponse.status === "fulfilled" && Array.isArray(roomsResponse.value)
          ? roomsResponse.value
          : [];
      const notificationsData =
        notificationsResponse.status === "fulfilled" &&
        Array.isArray(notificationsResponse.value?.data)
          ? notificationsResponse.value.data
          : [];

      setRooms(roomsData);
      setNotifications(notificationsData.map(normalizeNotification));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useDashboardAutoRefresh(load);

  const dirtyCount = useMemo(() => rooms.filter((room) => String(room.status || "").toLowerCase().includes("dirty")).length, [rooms]);
  const cleanCount = useMemo(() => rooms.filter((room) => {
    const s = String(room.status || "").toLowerCase();
    return s.includes("clean") && !s.includes("dirty");
  }).length, [rooms]);
  const inProgressCount = useMemo(() => rooms.filter((room) => String(room.status || "").toLowerCase().includes("progress")).length, [rooms]);
  const assignedCount = useMemo(() => rooms.filter((room) => {
    const a = String(room.assignee || "");
    return a && a.toLowerCase() !== "no housekeeper";
  }).length, [rooms]);

  const floorMap = useMemo(() => {
    const map = new Map();
    rooms.forEach((room) => {
      const floor = floorFromRoom(room.roomNo || room.roomNumber);
      map.set(floor, (map.get(floor) || 0) + 1);
    });
    return map;
  }, [rooms]);

  // Build one entry per room: the most recent active notification per room
  // is joined in so we get assignee, duration, assigned-by, and time left.
  const assignmentEntries = useMemo(() => {
    const notifMap = new Map();
    notifications.forEach((n) => {
      const key = String(n.roomNo || n.roomId || "").trim();
      if (!key) return;
      const existing = notifMap.get(key);
      if (!existing || (n.sentAt && (!existing.sentAt || new Date(n.sentAt) > new Date(existing.sentAt)))) {
        notifMap.set(key, n);
      }
    });

    return rooms
      .map((room, index) => {
        const roomKey = String(room.roomNo || room.roomNumber || "").trim();
        const notification = notifMap.get(roomKey) || null;

        return {
          id: room.id || `row-${index}-${roomKey}`,
          roomNo: room.roomNo || room.roomNumber || fallback,
          roomType: room.roomType || room.type || "Accommodation",
          status: room.status || "Unknown",
          statusPill: statusPill(room.status),
          assignedTo: notification?.assignedTo || room.assignee || "No Housekeeper",
          assignedBy: notification?.assignedBy || "Front Desk",
          duration: durationFromTimestamps(notification?.sentAt, notification?.dueAt),
          timeLeft: timeLeftLabel(notification?.dueAt),
          taskLabel: notification?.taskLabel || "Room Cleaning",
          sentAt: notification?.sentAt,
          dueAt: notification?.dueAt,
          isCompleted: String(room.status || "").toLowerCase().includes("clean") && !String(room.status || "").toLowerCase().includes("dirty"),
        };
      })
      .filter((entry) => entry.roomNo !== fallback)
      .sort((a, b) => {
        const aScore = a.isCompleted ? 2 : String(a.status).toLowerCase().includes("dirty") ? 0 : 1;
        const bScore = b.isCompleted ? 2 : String(b.status).toLowerCase().includes("dirty") ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true });
      });
  }, [rooms, notifications]);

  const checkoutReadyRooms = useMemo(() => {
    return rooms
      .filter((room) => {
        const s = normalizeStatus(room.status).toLowerCase();
        return s.includes("clean") && !s.includes("dirty") && !s.includes("progress");
      })
      .map((room) => ({
        id: room.id || room.roomNo || room.roomNumber,
        roomNo: room.roomNo || room.roomNumber || fallback,
        roomType: room.roomType || room.type || "Accommodation",
        assignee: room.assignee || "No Housekeeper",
        status: room.status || "Unknown",
        statusPill: statusPill(room.status),
        floor: floorFromRoom(room.roomNo || room.roomNumber),
      }))
      .sort((a, b) => String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true }));
  }, [rooms]);

  // -- render helpers --

  const StatCard = ({ label, value, note, icon: Icon, tone }) => (
    <div className="rounded-[24px] border border-white/60 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{value ?? fallback}</div>
          <div className="mt-2 text-sm text-slate-500">{note}</div>
        </div>
        <span className={`rounded-2xl border p-3 ${
          tone === "emerald" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
          tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-700" :
          tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-700" :
          tone === "cyan" ? "border-cyan-200 bg-cyan-50 text-cyan-700" :
          "border-slate-200 bg-slate-50 text-slate-600"
        }`}>
          {Icon ? <Icon /> : null}
        </span>
      </div>
    </div>
  );

  const InsightCard = ({ item }) => (
    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {item.label}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-900">{item.value ?? fallback}</div>
      <div className="mt-2 text-sm text-slate-500">{item.note}</div>
    </div>
  );

  const AssignmentTable = () => (
    <div className="rounded-[26px] border border-white/60 bg-white/88 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 px-5 py-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Room Assignments
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Full Assignment List</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kisko room assign hua, room type, duration, assigned by, aur real status.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 whitespace-nowrap">
          {assignmentEntries.length} rooms
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Room No</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Room Type</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Assigned To (Housekeeper)</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Assigned By</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Task</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Duration Given</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Time Remaining</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Real Status</th>
            </tr>
          </thead>
          <tbody>
            {assignmentEntries.length ? (
              assignmentEntries.map((row, index) => (
                <tr key={row.id || index} className="border-t border-slate-200/80 hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5 text-sm font-bold text-slate-900 whitespace-nowrap">{row.roomNo}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap">{row.roomType}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap">{row.assignedTo}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap">{row.assignedBy}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap">{row.taskLabel}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap">{row.duration}</td>
                  <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                    {row.timeLeft ? <span className={row.timeLeft.cls}>{row.timeLeft.text}</span> : fallback}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${row.statusPill.cls}`}>
                      {row.statusPill.label}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
                  No room assignments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const CheckoutTable = () => (
    <div className="rounded-[26px] border border-white/60 bg-white/88 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 px-5 py-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Checkout Availability
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Rooms Ready for New Booking
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cleaned rooms jo abhi book nahi hue — checkout ke baad naye guest ke liye taiyaar.
          </p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 whitespace-nowrap">
          {checkoutReadyRooms.length} rooms
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Room No</th>
              <th className="px-4 py-3.5 font-semibold">Room Type</th>
              <th className="px-4 py-3.5 font-semibold">Floor</th>
              <th className="px-4 py-3.5 font-semibold">Status</th>
              <th className="px-4 py-3.5 font-semibold">Last Assignee</th>
            </tr>
          </thead>
          <tbody>
            {checkoutReadyRooms.length ? (
              checkoutReadyRooms.map((row, index) => (
                <tr key={row.id || index} className="border-t border-slate-200/80 hover:bg-emerald-50/40 transition">
                  <td className="px-4 py-3.5 text-sm font-bold text-slate-900">{row.roomNo}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">{row.roomType}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">{row.floor}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${row.statusPill.cls}`}>
                      {row.statusPill.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">{row.assignee}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
                  No rooms currently available for checkout.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
      </div>

      <div className="w-full space-y-7">
        {/* Header */}
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">Housekeeping Control</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
                Room Assignment & Status Tracker
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Har room ka assignment status, housekeeper detail, duration, assigned by, aur real status — sab list format mein.
                Checkout ke liye available rooms bhi yahan dikhti hain.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                <span className="text-[11px] text-slate-100/75">Dirty</span>
                <div className="mt-3 text-2xl font-bold leading-none">{dirtyCount}</div>
              </div>
              <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                <span className="text-[11px] text-slate-100/75">Ready</span>
                <div className="mt-3 text-2xl font-bold leading-none">{cleanCount}</div>
              </div>
              <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                <span className="text-[11px] text-slate-100/75">In Progress</span>
                <div className="mt-3 text-2xl font-bold leading-none">{inProgressCount}</div>
              </div>
              <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                <span className="text-[11px] text-slate-100/75">Assigned</span>
                <div className="mt-3 text-2xl font-bold leading-none">{assignedCount}</div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-[22px] border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm font-semibold text-cyan-700">
            Dashboard data loading...
          </div>
        ) : null}

        {/* Stat cards */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Dirty Rooms" value={dirtyCount} note="Cleaning attention needed." icon={FaBroom} tone="rose" />
          <StatCard label="Cleaned / Ready" value={cleanCount} note="Ready to check out or rebook." icon={FaCheckCircle} tone="emerald" />
          <StatCard label="In Progress" value={inProgressCount} note="Currently being cleaned." icon={FaTasks} tone="amber" />
          <StatCard label="Assigned" value={assignedCount} note="Rooms mapped to a housekeeper." icon={FaUserClock} tone="cyan" />
        </section>

        {/* Insights */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-[26px] border border-white/60 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">Quick Actions</div>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Jump to active workflow</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: "Open Housekeeping", helper: "Full cleaning workflow aur room updates manage karein.", route: "/housekeeping", icon: FaBroom, tone: "cyan" },
                { label: "Open Assignments", helper: "Assigned tasks aur completion status review karein.", route: "/assignments", icon: FaTasks, tone: "emerald" },
                { label: "Stay Overview", helper: "Room booking status aur cleaning assign karein.", route: "/stayover", icon: FaClipboardList, tone: "amber" },
                { label: "My Profile", helper: "User profile aur session details dekhein.", route: "/profile", icon: FaCheckCircle, tone: "violet" },
              ].map((action) => {
                const Icon = action.icon;
                const toneGradient =
                  action.tone === "cyan" ? "from-cyan-500 to-sky-500" :
                  action.tone === "emerald" ? "from-emerald-500 to-teal-500" :
                  action.tone === "amber" ? "from-amber-500 to-orange-500" :
                  "from-violet-500 to-fuchsia-500";
                return (
                  <a key={action.label} href={action.route} className="group rounded-[24px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-1">
                    <div className={`inline-flex rounded-2xl bg-gradient-to-r ${toneGradient} p-3 text-white shadow-lg`}>
                      <Icon />
                    </div>
                    <div className="mt-4 text-lg font-bold text-slate-900">{action.label}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-500">{action.helper}</div>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/60 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">Snapshot</div>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Operational highlights</h2>
            </div>
            <div className="space-y-3">
              <InsightCard label="Ready for Checkout" value={cleanCount} note="Vacant clean rooms ready for new booking." />
              {Array.from(floorMap.entries()).slice(0, 3).map(([label, value]) => (
                <InsightCard key={label} label={label} value={value} note="Rooms currently mapped on this floor." />
              ))}
            </div>
          </div>
        </section>

        {/* Full Assignment List Table */}
        <AssignmentTable />

        {/* Checkout Available Rooms Table */}
        <CheckoutTable />
      </div>
    </div>
  );
};

export default HousekeepingDashboard;
