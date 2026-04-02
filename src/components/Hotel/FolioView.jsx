import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";
import { getStoredBookingCode, getStoredBookingId } from "./bookingSession";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const TYPE_COLORS = {
  "Room Charge":  "bg-blue-50 text-blue-700 border-blue-100",
  "Extra Charge": "bg-violet-50 text-violet-700 border-violet-100",
  Discount:       "bg-amber-50 text-amber-700 border-amber-100",
  Payment:        "bg-emerald-50 text-emerald-700 border-emerald-100",
  Refund:         "bg-rose-50 text-rose-700 border-rose-100",
  Adjustment:     "bg-slate-100 text-slate-700 border-slate-200",
};

const ENTRY_TYPES = [
  "Room Charge",
  "Extra Charge",
  "Discount",
  "Payment",
  "Refund",
  "Adjustment",
];

const CATEGORIES = [
  "Room Rent",
  "Minibar",
  "Laundry",
  "Restaurant",
  "Room Service",
  "Phone",
  "Business Centre",
  "Spa / Wellness",
  "Parking",
  "Early Check-In",
  "Late Check-Out",
  "Miscellaneous",
];

// ─── Add Entry Modal ───────────────────────────────────────────────────────────
const AddEntryModal = ({ bookingId, onClose, onSaved }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    entry_date: today,
    entry_type: "Extra Charge",
    category: "Minibar",
    description: "",
    amount: "",
    created_by: "Front Desk",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) {
      alert("Description aur amount required hai");
      return;
    }
    try {
      setSaving(true);
      await API.post(`/hotel/folio/${bookingId}`, form);
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
        className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1e40af_55%,#0f766e_100%)] px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
            Folio Entry
          </p>
          <h2 className="mt-2 text-2xl font-black">Add New Charge</h2>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Date
              </label>
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => set("entry_date", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Entry Type
              </label>
              <select
                value={form.entry_type}
                onChange={(e) => set("entry_type", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Description
            </label>
            <input
              type="text"
              placeholder="E.g. 2 Bottles of Water — ₹120 each"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Created By
              </label>
              <input
                type="text"
                value={form.created_by}
                onChange={(e) => set("created_by", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Entry"}
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

// ─── Main FolioView ─────────────────────────────────────────────────────────
const FolioView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId || getStoredBookingId();
  const bookingCode = location.state?.bookingCode || getStoredBookingCode();

  const [booking, setBooking] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState("All");

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const [bookingRes, folioRes] = await Promise.all([
        API.get(`/hotel/full-booking/${bookingId}`),
        API.get(`/hotel/folio/${bookingId}`),
      ]);
      setBooking(bookingRes.data || null);
      setEntries(Array.isArray(folioRes.data) ? folioRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEntries = useMemo(
    () =>
      filterType === "All"
        ? entries
        : entries.filter((e) => e.entry_type === filterType),
    [entries, filterType],
  );

  // Group entries by date for night audit view
  const groupedByDate = useMemo(() => {
    const map = {};
    for (const entry of filteredEntries) {
      const d = entry.entry_date
        ? new Date(entry.entry_date).toISOString().slice(0, 10)
        : "Unknown";
      if (!map[d]) map[d] = [];
      map[d].push(entry);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredEntries]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        const amt = Number(e.amount || 0);
        if (["Room Charge", "Extra Charge", "Adjustment"].includes(e.entry_type))
          acc.charges += amt;
        if (e.entry_type === "Discount") acc.discounts += amt;
        if (e.entry_type === "Payment") acc.payments += amt;
        if (e.entry_type === "Refund") acc.refunds += amt;
        return acc;
      },
      { charges: 0, discounts: 0, payments: 0, refunds: 0 },
    );
  }, [entries]);

  const netBalance =
    totals.charges - totals.discounts - totals.payments + totals.refunds;

  if (!bookingId) {
    return (
      <div className="p-8 text-center text-slate-500">
“Booking ID is missing. Please open it from ‘All Bookings.’”
      </div>
    );
  }

  const bookingRef = booking?.bookingCode || bookingCode || bookingId;

  return (
    <>
      {showAdd && (
        <AddEntryModal
          bookingId={bookingId}
          onClose={() => setShowAdd(false)}
          onSaved={load}
        />
      )}

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(135deg,#f8fbff_0%,#f7fffb_55%,#fff8ef_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Header */}
          <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,#020617_0%,#1e3a8a_45%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_70px_rgba(15,23,42,0.22)]">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
                  Guest Folio — Night Audit
                </p>
                <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                  Booking #{bookingRef}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100/80">
                  Har din ke room charges, extra charges (minibar, laundry, etc.)
                  aur payments ka itemised ledger.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Charges", value: formatCurrency(totals.charges), tone: "bg-blue-900/60" },
                  { label: "Discounts", value: formatCurrency(totals.discounts), tone: "bg-amber-900/50" },
                  { label: "Payments", value: formatCurrency(totals.payments), tone: "bg-emerald-900/60" },
                  {
                    label: "Net Balance",
                    value: formatCurrency(netBalance),
                    tone: netBalance > 0 ? "bg-rose-900/60" : "bg-emerald-900/60",
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className={`${c.tone} rounded-[20px] border border-white/10 p-4 backdrop-blur`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
                      {c.label}
                    </div>
                    <div className="mt-2 text-xl font-black text-white">
                      {c.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Guest Info Bar */}
          {booking && (
            <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-slate-200 bg-white/90 px-5 py-4 text-sm shadow-sm">
              <span className="font-black text-slate-900">{booking.guest_name || "Guest"}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">Room: {booking.rooms?.map((r) => r.room_number).join(", ") || "—"}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">
                {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
              </span>
              <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {booking.booking_status || "Active"}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {["All", ...ENTRY_TYPES].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    filterType === t
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5"
              >
                + Add Charge
              </button>
              <button
                type="button"
                onClick={() => navigate("/hotel/all-bookings")}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                All Bookings
              </button>
            </div>
          </div>

          {/* Folio Ledger */}
          <section className="rounded-[28px] border border-white/70 bg-white/88 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading folio…</div>
            ) : groupedByDate.length === 0 ? (
              <div className="rounded-[28px] border-2 border-dashed border-slate-200 p-14 text-center">
                <div className="text-4xl">📋</div>
                <p className="mt-4 font-bold text-slate-500">
                  Abhi koi folio entry nahi hai.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="mt-5 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white"
                >
                  Add First Entry
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {groupedByDate.map(([date, dayEntries]) => {
                  const dayTotal = dayEntries
                    .filter((e) =>
                      ["Room Charge", "Extra Charge", "Adjustment"].includes(
                        e.entry_type,
                      ),
                    )
                    .reduce((s, e) => s + Number(e.amount || 0), 0);

                  return (
                    <div key={date} className="px-5 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                            {formatDate(date)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {dayEntries.length} entries
                          </span>
                        </div>
                        {dayTotal > 0 && (
                          <span className="text-sm font-bold text-slate-700">
                            Day Charges: {formatCurrency(dayTotal)}
                          </span>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-[20px] border border-slate-100">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-left text-xs text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">
                                Type
                              </th>
                              <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">
                                Category
                              </th>
                              <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">
                                Description
                              </th>
                              <th className="px-4 py-3 text-right font-semibold uppercase tracking-[0.12em]">
                                Amount
                              </th>
                              <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">
                                By
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayEntries.map((entry) => (
                              <tr
                                key={entry.id}
                                className="border-t border-slate-100 hover:bg-slate-50/50"
                              >
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                                      TYPE_COLORS[entry.entry_type] ||
                                      "bg-slate-100 text-slate-600 border-slate-200"
                                    }`}
                                  >
                                    {entry.entry_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {entry.category || "—"}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  {entry.description}
                                </td>
                                <td
                                  className={`px-4 py-3 text-right font-black ${
                                    ["Payment", "Discount", "Refund"].includes(
                                      entry.entry_type,
                                    )
                                      ? "text-emerald-600"
                                      : "text-slate-900"
                                  }`}
                                >
                                  {["Payment", "Discount"].includes(
                                    entry.entry_type,
                                  )
                                    ? "−"
                                    : ""}
                                  {formatCurrency(entry.amount)}
                                </td>
                                <td className="px-4 py-3 text-slate-400">
                                  {entry.created_by || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Balance Summary Footer */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-4 text-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total Charges
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {formatCurrency(totals.charges)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Discounts
                </div>
                <div className="mt-2 text-2xl font-black text-amber-800">
                  − {formatCurrency(totals.discounts)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Payments
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-800">
                  − {formatCurrency(totals.payments)}
                </div>
              </div>
              <div className={`rounded-[18px] p-3 ${netBalance > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
                <div
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    netBalance > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  Net Balance
                </div>
                <div
                  className={`mt-2 text-2xl font-black ${
                    netBalance > 0 ? "text-rose-800" : "text-emerald-800"
                  }`}
                >
                  {formatCurrency(netBalance)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FolioView;
