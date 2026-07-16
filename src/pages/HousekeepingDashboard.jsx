import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBroom,
  FaCheckCircle,
  FaClipboardList,
  FaTasks,
  FaUserClock,
  FaArrowRight,
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

  // ─── Premium Inner Components ───

  const GlassStatCard = ({ label, value }) => (
    <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/20 p-4 shadow-lg">
      <span className="text-[11px] font-semibold text-white/70">{label}</span>
      <div className="mt-2 text-[28px] font-bold text-white leading-none">{value ?? "--"}</div>
    </div>
  );

  const StatCard = ({ label, value, note, icon: Icon, tone }) => {
    const toneConfig = {
      emerald: { border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600", shadow: "hover:shadow-emerald-500/10" },
      rose: { border: "border-l-rose-500", bg: "bg-rose-50", text: "text-rose-600", shadow: "hover:shadow-rose-500/10" },
      amber: { border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-600", shadow: "hover:shadow-amber-500/10" },
      cyan: { border: "border-l-cyan-500", bg: "bg-cyan-50", text: "text-cyan-600", shadow: "hover:shadow-cyan-500/10" },
      violet: { border: "border-l-violet-500", bg: "bg-violet-50", text: "text-violet-600", shadow: "hover:shadow-violet-500/10" },
    };
    const t = toneConfig[tone] || toneConfig.emerald;
    return (
      <div className={`rounded-[24px] bg-white border-l-[4px] ${t.border} border border-slate-100 p-6 shadow-lg ${t.shadow} hover:-translate-y-1 hover:shadow-xl transition-all duration-300`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-3 text-[40px] sm:text-[42px] font-black text-slate-900 leading-none">{value ?? "--"}</p>
            <p className="mt-2 text-[17px] text-slate-500">{note}</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl ${t.bg} flex items-center justify-center ${t.text} flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  };

  const InsightCard = ({ label, value, note }) => (
    <div className="rounded-[22px] bg-slate-50 border border-slate-100 p-5 hover:shadow-md transition-shadow">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-3 text-[34px] sm:text-[38px] font-black text-slate-900 leading-none">{value ?? "--"}</p>
      <p className="mt-2 text-[17px] text-slate-500">{note}</p>
    </div>
  );

  const PremiumTableWrapper = ({ sectionLabel, sectionLabelColor, title, description, countLabel, count, accentColor, children }) => (
    <div className="rounded-[24px] bg-white shadow-lg border border-slate-100 overflow-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-5 sm:px-6 py-5">
        <div>
          <div className={`text-[10px] font-bold uppercase tracking-[0.24em] ${sectionLabelColor}`}>{sectionLabel}</div>
          <h2 className="mt-1.5 text-[22px] sm:text-[24px] font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-[17px] text-slate-500">{description}</p>
        </div>
        <div className={`rounded-full px-4 py-2 text-[15px] font-bold whitespace-nowrap self-start sm:self-auto ${
          accentColor === "emerald"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
            : "bg-slate-100 text-slate-600"
        }`}>
          {count} {countLabel}
        </div>
      </div>
      {children}
    </div>
  );

  const AssignmentTable = () => (
    <PremiumTableWrapper
      sectionLabel="Room Assignments"
      sectionLabelColor="text-blue-500"
      title="Full Assignment List"
      description="Kisko room assign hua, room type, duration, assigned by, aur real status."
      countLabel="rooms"
      count={assignmentEntries.length}
      accentColor="slate"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Room No</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Room Type</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Assigned To (Housekeeper)</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Assigned By</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Task</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Duration Given</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Time Remaining</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Real Status</th>
            </tr>
          </thead>
          <tbody>
            {assignmentEntries.length ? (
              assignmentEntries.map((row, index) => (
                <tr key={row.id || index} className="border-t border-slate-100 hover:bg-blue-50/60 transition-colors">
                  <td className="px-5 py-4 text-[17px] font-bold text-slate-900 whitespace-nowrap">{row.roomNo}</td>
                  <td className="px-5 py-4 text-[17px] text-slate-700 whitespace-nowrap">{row.roomType}</td>
                  <td className="px-5 py-4 text-[17px] text-slate-700 whitespace-nowrap">{row.assignedTo}</td>
                  <td className="px-5 py-4 text-[17px] text-slate-700 whitespace-nowrap">{row.assignedBy}</td>
                  <td className="px-5 py-4 text-[17px] text-slate-700 whitespace-nowrap">{row.taskLabel}</td>
                  <td className="px-5 py-4 text-[17px] text-slate-700 whitespace-nowrap">{row.duration}</td>
                  <td className="px-5 py-4 text-[17px] whitespace-nowrap">
                    {row.timeLeft ? <span className={row.timeLeft.cls}>{row.timeLeft.text}</span> : fallback}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[15px] font-medium ${row.statusPill.cls}`}>
                      {row.statusPill.label}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <FaClipboardList className="w-12 h-12 text-slate-300" />
                    <p className="text-[20px] sm:text-[22px] font-bold text-slate-500">No room assignments found.</p>
                    <p className="text-[17px] text-slate-400">Assignments will appear here once rooms are mapped to housekeepers.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PremiumTableWrapper>
  );

  const CheckoutTable = () => (
    <PremiumTableWrapper
      sectionLabel="Checkout Availability"
      sectionLabelColor="text-emerald-500"
      title="Rooms Ready for New Booking"
      description="Cleaned rooms jo abhi book nahi hue — checkout ke baad naye guest ke liye taiyaar."
      countLabel="rooms"
      count={checkoutReadyRooms.length}
      accentColor="emerald"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Room No</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Room Type</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Floor</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Status</th>
              <th className="px-5 py-4 text-left text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.15em] text-slate-500">Last Assignee</th>
            </tr>
          </thead>
          <tbody>
            {checkoutReadyRooms.length ? (
              checkoutReadyRooms.map((row, index) => (
                <tr key={row.id || index} className="border-t border-slate-100 hover:bg-emerald-50/40 transition-colors">
                  <td className="px-5 py-4 text-[17px] font-bold text-slate-900">{row.roomNo}</td>
                  <td className="px-5 py-4 text-[17px] text-slate-700">{row.roomType}</td>
                  <td className="px-5 py-4 text-[17px] text-slate-700">{row.floor}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[15px] font-medium ${row.statusPill.cls}`}>
                      {row.statusPill.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[17px] text-slate-700">{row.assignee}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <FaCheckCircle className="w-12 h-12 text-slate-300" />
                    <p className="text-[20px] sm:text-[22px] font-bold text-slate-500">No rooms currently available for checkout.</p>
                    <p className="text-[17px] text-slate-400">Clean rooms ready for new bookings will appear here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PremiumTableWrapper>
  );

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
      `}</style>

      <div className="min-h-screen bg-white relative">
        {/* Soft background decoration */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-100/60 blur-[120px]" />
          <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-sky-100/50 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-100/40 blur-[80px]" />
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8">

          {/* ═══════════ HERO SECTION ═══════════ */}
          <section className="animate-fade-in-up relative rounded-[28px] overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-sky-600 shadow-2xl shadow-blue-900/20">
            {/* Abstract decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/[0.04] -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full bg-white/[0.04] translate-y-1/2" />
            <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-sky-400/10" />

            {/* Wave overlays */}
            <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: "40px" }} aria-hidden="true">
              <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,15 1440,25 L1440,60 L0,60 Z" fill="rgba(255,255,255,0.07)" />
              <path d="M0,45 C480,70 960,20 1440,45 L1440,60 L0,60 Z" fill="rgba(255,255,255,0.04)" />
            </svg>

            <div className="relative px-5 sm:px-8 lg:px-10 pt-8 pb-16">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.5fr)] lg:items-center">
                {/* Left — Title & Subtitle */}
                <div>
                  <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200 backdrop-blur-sm">
                    Housekeeping Control
                  </span>
                  <h1 className="mt-5 text-[42px] sm:text-[46px] font-bold leading-[1.1] text-white">
                    Room Assignment & Status Tracker
                  </h1>
                  <p className="mt-4 max-w-2xl text-[17px] sm:text-[18px] leading-relaxed text-slate-200/90">
                    Har room ka assignment status, housekeeper detail, duration, assigned by, aur real status — sab list format mein. Checkout ke liye available rooms bhi yahan dikhti hain.
                  </p>
                </div>

                {/* Right — Glass stat cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <GlassStatCard label="Dirty" value={dirtyCount} />
                  <GlassStatCard label="Ready" value={cleanCount} />
                  <GlassStatCard label="In Progress" value={inProgressCount} />
                  <GlassStatCard label="Assigned" value={assignedCount} />
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════ ERROR STATE ═══════════ */}
          {error ? (
            <div className="animate-fade-in-up rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-[17px] font-semibold text-rose-700">{error}</div>
          ) : null}

          {/* ═══════════ LOADING STATE ═══════════ */}
          {loading ? (
            <div className="animate-fade-in-up rounded-[22px] border border-blue-200 bg-blue-50 px-5 py-4 text-[17px] font-semibold text-blue-700">
              Dashboard data loading...
            </div>
          ) : null}

          {/* ═══════════ STATISTICS CARDS ═══════════ */}
          <section className="animate-fade-in-up delay-100 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Dirty Rooms" value={dirtyCount} note="Cleaning attention needed." icon={FaBroom} tone="rose" />
            <StatCard label="Cleaned / Ready" value={cleanCount} note="Ready to check out or rebook." icon={FaCheckCircle} tone="emerald" />
            <StatCard label="In Progress" value={inProgressCount} note="Currently being cleaned." icon={FaTasks} tone="amber" />
            <StatCard label="Assigned" value={assignedCount} note="Rooms mapped to a housekeeper." icon={FaUserClock} tone="cyan" />
          </section>

          {/* ═══════════ QUICK ACTIONS + SNAPSHOT ═══════════ */}
          <section className="animate-fade-in-up delay-200 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
            {/* Quick Actions */}
            <div className="rounded-[24px] bg-white shadow-lg border border-slate-100 p-6 sm:p-8">
              <div className="mb-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-500">Quick Actions</div>
                <h2 className="mt-1.5 text-[30px] sm:text-[34px] font-bold text-slate-900">Jump to active workflow</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
                    <a key={action.label} href={action.route} className="group block rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${toneGradient} shadow-lg text-white`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="mt-4 text-[22px] font-bold text-slate-900">{action.label}</h3>
                      <p className="mt-1.5 text-[17px] text-slate-500 leading-relaxed">{action.helper}</p>
                      <div className="mt-4 flex items-center text-slate-400 group-hover:text-blue-600 transition-colors">
                        <span className="text-[15px] font-medium">Open</span>
                        <FaArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Snapshot / Operational Highlights */}
            <div className="rounded-[24px] bg-white shadow-lg border border-slate-100 p-6 sm:p-8">
              <div className="mb-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-500">Snapshot</div>
                <h2 className="mt-1.5 text-[30px] sm:text-[34px] font-bold text-slate-900">Operational highlights</h2>
              </div>
              <div className="space-y-3">
                <InsightCard label="Ready for Checkout" value={cleanCount} note="Vacant clean rooms ready for new booking." />
                {Array.from(floorMap.entries()).slice(0, 3).map(([label, value]) => (
                  <InsightCard key={label} label={label} value={value} note="Rooms currently mapped on this floor." />
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════ FULL ASSIGNMENT LIST ═══════════ */}
          <section className="animate-fade-in-up delay-300">
            <AssignmentTable />
          </section>

          {/* ═══════════ CHECKOUT AVAILABILITY ═══════════ */}
          <section className="animate-fade-in-up delay-400">
            <CheckoutTable />
          </section>

        </div>
      </div>
    </>
  );
};

export default HousekeepingDashboard;
