import { useEffect, useState, useMemo, useCallback } from "react";
import { FaSyncAlt } from "react-icons/fa";
import API from "../../api";

export default function Housekeeping() {
  const [rooms, setRooms] = useState([]);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await API.get("/housekeeping");
      setRooms(res.data.map(r => ({ ...r, selected: false })));
    } catch {
      // ignore — page will just show empty state
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const stats = useMemo(() => ({
    total:    rooms.length,
    clean:    rooms.filter(r => r.status?.toLowerCase().includes("clean")).length,
    dirty:    rooms.filter(r => r.status?.toLowerCase().includes("dirty")).length,
    occupied: rooms.filter(r => r.status?.toLowerCase().includes("occupied")).length,
    oos:      rooms.filter(r => r.status === "Out of Service").length,
  }), [rooms]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black text-slate-900">Housekeeping</h1>
          <p className="text-xl text-slate-500">Manage rooms, assignments, amenities, inspections & more</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchRooms} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <FaSyncAlt className="text-xl" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total Rooms", value: stats.total, color: "text-slate-900 text-4xl" },
          { label: "Clean", value: stats.clean, color: "text-emerald-600" },
          { label: "Dirty", value: stats.dirty, color: "text-amber-600" },
          { label: "Occupied", value: stats.occupied, color: "text-blue-600" },
          { label: "Out of Service", value: stats.oos, color: "text-rose-600" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">{s.label}</div>
            <div className={`mt-1 text-3xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
