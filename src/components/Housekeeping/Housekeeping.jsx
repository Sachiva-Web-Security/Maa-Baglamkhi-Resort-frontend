import { useEffect, useState, useMemo, useCallback } from "react";
import { FaSyncAlt, FaCheckCircle } from "react-icons/fa";
import API from "../../api";

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

export default function Housekeeping() {
  const [rooms, setRooms] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, notifRes] = await Promise.allSettled([
        API.get("/housekeeping"),
        API.get("/housekeeping/notifications"),
      ]);

      const roomsData =
        roomsRes.status === "fulfilled" && Array.isArray(roomsRes.data)
          ? roomsRes.data
          : [];
      const notifData =
        notifRes.status === "fulfilled" && Array.isArray(notifRes.data?.data)
          ? notifRes.data.data
          : [];

      setRooms(roomsData);
      setNotifications(notifData.map(normalizeNotification));
    } catch {
      // silently ignore — empty state shown below
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 s so the list stays live.
  useEffect(() => {
    const id = globalThis.setInterval(fetchData, 30000);
    return () => globalThis.clearInterval(id);
  }, [fetchData]);

  const stats = useMemo(() => ({
    total:    rooms.length,
    clean:    rooms.filter(r => String(r.status || "").toLowerCase().includes("clean") && !String(r.status || "").toLowerCase().includes("dirty")).length,
    dirty:    rooms.filter(r => String(r.status || "").toLowerCase().includes("dirty")).length,
    occupied: rooms.filter(r => String(r.status || "").toLowerCase().includes("occupied")).length,
    oos:      rooms.filter(r => String(r.status || "").toLowerCase().includes("out of service") || String(r.status || "").toLowerCase().includes("block")).length,
  }), [rooms]);

  // Index the most-recent notification per room.
  const notifMap = useMemo(() => {
    const map = new Map();
    notifications.forEach((n) => {
      const key = String(n.roomNo || n.roomId || "").trim();
      if (!key) return;
      const existing = map.get(key);
      if (!existing || (n.sentAt && (!existing.sentAt || new Date(n.sentAt) > new Date(existing.sentAt)))) {
        map.set(key, n);
      }
    });
    return map;
  }, [notifications]);

  // Build one table row per room — joined with its most-recent notification
  // so we get: assigned to, assigned by (receptionist), task label, duration, time left.
  const assignmentEntries = useMemo(() => {
    return rooms
      .map((room, index) => {
        const roomKey = String(room.roomNo || room.roomNumber || "").trim();
        const n = notifMap.get(roomKey) || null;
        return {
          id: room.id || `row-${index}-${roomKey}`,
          roomNo: room.roomNo || room.roomNumber || fallback,
          roomType: room.roomType || room.type || "Accommodation",
          status: room.status || "Unknown",
          statusPill: statusPill(room.status),
          assignedTo: n?.assignedTo || room.assignee || "No Housekeeper",
          assignedBy: n?.assignedBy || "Front Desk",
          taskLabel: n?.taskLabel || "Room Cleaning",
          duration: durationFromTimestamps(n?.sentAt, n?.dueAt),
          timeLeft: timeLeftLabel(n?.dueAt),
        };
      })
      .filter((e) => e.roomNo !== fallback)
      .sort((a, b) => {
        const aScore = a.status.toLowerCase().includes("clean") && !a.status.toLowerCase().includes("dirty") ? 2 : a.status.toLowerCase().includes("dirty") ? 0 : 1;
        const bScore = b.status.toLowerCase().includes("clean") && !b.status.toLowerCase().includes("dirty") ? 2 : b.status.toLowerCase().includes("dirty") ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true });
      });
  }, [rooms, notifMap]);

  // Rooms that are clean — available for checkout / new booking.
  const checkoutReadyRooms = useMemo(() => {
    return rooms
      .filter((room) => {
        const s = normalizeStatus(room.status).toLowerCase();
        return s.includes("clean") && !s.includes("dirty") && !s.includes("progress");
      })
      .sort((a, b) => String(a.roomNo || a.roomNumber).localeCompare(String(b.roomNo || b.roomNumber), undefined, { numeric: true }));
  }, [rooms]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black text-slate-900">Housekeeping</h1>
          <p className="text-xl text-slate-500">Room assignments, status, aur checkout-available rooms — sab list format mein.</p>
        </div>
        <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <FaSyncAlt className="text-xl" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total Rooms", value: stats.total, color: "text-slate-900" },
          { label: "Clean / Ready", value: stats.clean, color: "text-emerald-600" },
          { label: "Dirty", value: stats.dirty, color: "text-amber-600" },
          { label: "Occupied", value: stats.occupied, color: "text-blue-600" },
          { label: "Out of Service", value: stats.oos, color: "text-rose-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">{s.label}</div>
            <div className={`mt-1 text-3xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Full Assignment List */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-2xl font-black text-slate-900">Room Assignment List</h2>
          <p className="text-base text-slate-500">
            Kisko room assign hua, room type, duration, kisne assign kiya h, aur real status — sab yahan.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Room No</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Room Type</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Assigned To (Housekeeper)</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Assigned By</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Task</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Duration Given</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Real Status</th>
              </tr>
            </thead>
            <tbody>
              {assignmentEntries.length ? (
                assignmentEntries.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-sm text-slate-700 transition hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-[16px] font-bold text-slate-900 whitespace-nowrap">{row.roomNo}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{row.roomType}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{row.assignedTo}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{row.assignedBy}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{row.taskLabel}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{row.duration}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${row.statusPill.cls}`}>
                        {row.statusPill.label}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                    No room assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checkout Available Rooms */}
      <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-emerald-100 bg-emerald-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-2xl text-emerald-600" />
            <div>
              <h2 className="text-2xl font-black text-slate-900">Rooms Available for Checkout / New Booking</h2>
              <p className="text-base text-slate-500">
                Total {checkoutReadyRooms.length} cleaned rooms jo abhi book nahi hue — checkout ke baad naye guest ke liye taiyaar.
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-emerald-50/80 text-xs uppercase tracking-[0.18em] text-emerald-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Room No</th>
                <th className="px-4 py-3 font-semibold">Room Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {checkoutReadyRooms.length ? (
                checkoutReadyRooms.map((room, index) => (
                  <tr key={room.id || index} className="border-t border-emerald-50 text-sm text-slate-700 transition hover:bg-emerald-50/40">
                    <td className="px-4 py-3 text-[16px] font-bold text-slate-900">{room.roomNo || room.roomNumber}</td>
                    <td className="px-4 py-3">{room.roomType || room.type || "Accommodation"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPill(room.status).cls}`}>
                        {statusPill(room.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3">{room.assignee || "No Housekeeper"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                    No rooms currently available for checkout.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
