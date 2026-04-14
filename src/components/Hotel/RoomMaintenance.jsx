import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const today = () => new Date().toISOString().slice(0, 10);

const BLOCK_TYPES = [
  "Maintenance",
  "Deep Clean",
  "Renovation",
  "Inspection",
  "Pest Control",
  "Other",
];

const STATUS_COLORS = {
  Active:    "bg-rose-100 text-rose-700 border-rose-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

const BLOCK_ICONS = {
  Maintenance:  "🔧",
  "Deep Clean": "🧹",
  Renovation:   "🏗️",
  Inspection:   "🔍",
  "Pest Control": "🪲",
  Other:        "📌",
};

// ─── Block Room Modal ──────────────────────────────────────────────────────────
const BlockModal = ({ rooms, onClose, onSaved }) => {
  const [form, setForm] = useState({
    room_number: rooms[0]?.roomNumber || "",
    block_type: "Maintenance",
    reason: "",
    blocked_from: today(),
    blocked_until: today(),
    blocked_by: "Manager",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.room_number) {
      alert("Room number required");
      return;
    }
    if (form.blocked_from > form.blocked_until) {
      alert("End date, start date se pehle nahi ho sakti");
      return;
    }
    try {
      setSaving(true);
      await API.post("/hotel/room-block", form);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[linear-gradient(135deg,#1e1b4b_0%,#4f46e5_55%,#0f766e_100%)] px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-200">
            Room Block
          </p>
          <h2 className="mt-2 text-2xl font-black">Schedule Maintenance</h2>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Room Number
            </label>
            {rooms.length > 0 ? (
              <select
                value={form.room_number}
                onChange={(e) => set("room_number", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                {rooms.map((r) => (
                  <option key={r.roomNumber} value={r.roomNumber}>
                    {r.roomNumber} — {r.categoryName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Room Number (e.g. 101)"
                value={form.room_number}
                onChange={(e) => set("room_number", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Block Type
            </label>
            <select
              value={form.block_type}
              onChange={(e) => set("block_type", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              {BLOCK_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                From Date
              </label>
              <input
                type="date"
                value={form.blocked_from}
                min={today()}
                onChange={(e) => set("blocked_from", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Until Date
              </label>
              <input
                type="date"
                value={form.blocked_until}
                min={form.blocked_from || today()}
                onChange={(e) => set("blocked_until", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Reason / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Water pipe leaking, AC servicing, etc."
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Blocked By
            </label>
            <input
              type="text"
              value={form.blocked_by}
              onChange={(e) => set("blocked_by", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? "Blocking…" : "Block Room"}
            </button>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const RoomMaintenance = () => {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("Active");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [blocksRes, setupRes] = await Promise.all([
        API.get("/hotel/room-blocks"),
        API.get("/hotel/rooms/setup"),
      ]);
      setBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : []);
      // Flatten categories → rooms
      const allRooms = [];
      if (Array.isArray(setupRes.data)) {
        for (const cat of setupRes.data) {
          for (const rn of cat.rooms || []) {
            allRooms.push({ roomNumber: rn, categoryName: cat.name });
          }
        }
      }
      setRooms(allRooms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (blockId, newStatus) => {
    try {
      await API.put(`/hotel/room-block/${blockId}`, { status: newStatus });
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, status: newStatus } : b,
        ),
      );
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  const filteredBlocks = blocks.filter(
    (b) => filterStatus === "All" || b.status === filterStatus,
  );

  const activeCount = blocks.filter((b) => b.status === "Active").length;

  return (
    <>
      {showModal && (
        <BlockModal
          rooms={rooms}
          onClose={() => setShowModal(false)}
          onSaved={loadData}
        />
      )}

      <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.12),_transparent_30%),linear-gradient(135deg,#f8fbff_0%,#f7f5ff_50%,#fff8ef_100%)] p-4 sm:p-6">
        <div className="w-full space-y-5">
          {/* Header */}
          <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,#1e1b4b_0%,#4338ca_45%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_70px_rgba(15,23,42,0.22)]">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-violet-200 sm:text-base">
                  Maintenance Scheduler
                </p>
                <h1 className="mt-3 text-4xl font-black sm:text-5xl">
                  Room Blocking & Maintenance
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-100/80 sm:text-lg">
                 Block rooms during the maintenance window to avoid any booking conflicts.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[20px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65 sm:text-sm">
                    Total Rooms
                  </div>
                  <div className="mt-2 text-4xl font-black sm:text-5xl">{rooms.length}</div>
                </div>
                <div className="rounded-[20px] border border-rose-400/30 bg-rose-900/40 p-4 backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-200 sm:text-sm">
                    Currently Blocked
                  </div>
                  <div className="mt-2 text-4xl font-black sm:text-5xl">{activeCount}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {["All", "Active", "Completed", "Cancelled"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`rounded-full px-4 py-2.5 text-sm font-bold transition sm:px-5 ${
                    filterStatus === s
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-3 text-base font-bold text-white shadow-[0_8px_20px_rgba(79,70,229,0.2)] transition hover:-translate-y-0.5"
            >
              + Block Room
            </button>
          </div>

          {/* Blocks Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading…</div>
          ) : filteredBlocks.length === 0 ? (
            <div className="rounded-[28px] border-2 border-dashed border-slate-200 p-14 text-center">
              <div className="text-4xl">🔧</div>
              <p className="mt-4 text-lg font-bold text-slate-500 sm:text-xl">
                {filterStatus === "Active"
                  ? "There is no active maintenance block."
                  : "No records found."}
              </p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="mt-5 rounded-full bg-violet-600 px-7 py-3.5 text-base font-bold text-white"
              >
                Schedule First Block
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredBlocks.map((block) => (
                <article
                  key={block.id}
                  className="group relative overflow-hidden rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-violet-50 text-2xl">
                        {BLOCK_ICONS[block.block_type] || "🔧"}
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">
                          Room {block.room_number}
                        </div>
                        <div className="text-xs font-semibold text-violet-600">
                          {block.block_type}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                        STATUS_COLORS[block.status] ||
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {block.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[16px] bg-slate-50 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        From
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-800">
                        {formatDate(block.blocked_from)}
                      </div>
                    </div>
                    <div className="rounded-[16px] bg-slate-50 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Until
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-800">
                        {formatDate(block.blocked_until)}
                      </div>
                    </div>
                  </div>

                  {block.reason && (
                    <p className="mt-3 rounded-[14px] bg-violet-50 px-3 py-2 text-xs text-violet-700">
                      📝 {block.reason}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>By: {block.blocked_by || "—"}</span>
                  </div>

                  {block.status === "Active" && (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(block.id, "Completed")}
                        className="flex-1 rounded-full bg-emerald-600 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                      >
                        Mark Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(block.id, "Cancelled")}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/hotel/all-bookings")}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ← All Bookings
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomMaintenance;
