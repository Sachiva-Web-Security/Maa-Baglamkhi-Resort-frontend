/**
 * GroupBooking.jsx
 * Multi-room group booking — one master guest, multiple rooms, single payment.
 *
 * Flow:
 *   1. Enter master guest details + dates
 *   2. Pick multiple rooms from inventory
 *   3. Set tariff/GST per room
 *   4. Enter advance payment
 *   5. Confirm → creates booking with all rooms linked
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import {
  clearBookingSession,
  setStoredBookingCode,
  setStoredBookingId,
} from "./bookingSession";

const formatCurrency = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const today = () => new Date().toISOString().slice(0, 10);

const STEPS = ["Guest", "Rooms", "Tariff", "Payment", "Confirm"];
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer"];
const GST_RATES = [0, 5, 12, 18];

const inputCls =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
const labelCls =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500";

// ─── Step indicator ─────────────────────────────────────────────────────────
const StepBar = ({ current }) => (
  <div className="flex items-center justify-center gap-0">
    {STEPS.map((s, i) => (
      <React.Fragment key={s}>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition ${
            i < current
              ? "bg-emerald-500 text-white"
              : i === current
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {i < current ? "✓" : i + 1}
        </div>
        <div
          className={`text-[11px] font-bold mx-1 hidden sm:block ${
            i === current ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {s}
        </div>
        {i < STEPS.length - 1 && (
          <div
            className={`mx-1 h-0.5 w-8 rounded-full ${
              i < current ? "bg-emerald-400" : "bg-slate-200"
            }`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────
const GroupBooking = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resultBooking, setResultBooking] = useState(null);

  // Step 1 — Guest
  const [guest, setGuest] = useState({
    guestName: "",
    mobile: "",
    guestEmail: "",
    checkIn: today(),
    checkOut: today(),
    bookingStatus: "Confirmed",
    groupLabel: "",
  });

  // Step 2 — Room selection
  const [inventory, setInventory] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);

  // Step 3 — Tariff per room
  const [tariffs, setTariffs] = useState([]);

  // Step 4 — Payment
  const [payment, setPayment] = useState({
    amount: "",
    discount: "",
    paymentMode: "Cash",
    remarks: "",
  });

  useEffect(() => {
    API.get("/hotel/rooms/setup")
      .then((res) => setInventory(Array.isArray(res.data) ? res.data : []))
      .catch(console.error);
  }, []);

  // When rooms are selected, seed tariff rows
  useEffect(() => {
    setTariffs(
      selectedRooms.map((room) => ({
        roomNumber: room.roomNumber,
        categoryName: room.categoryName,
        tariff: room.defaultPrice || 0,
        gst: 12,
        adults: 1,
        children: 0,
        nights: 1,
      })),
    );
  }, [selectedRooms]);

  // Compute nights from dates
  const nightsFromDates = useMemo(() => {
    if (!guest.checkIn || !guest.checkOut) return 1;
    const diff =
      (new Date(guest.checkOut) - new Date(guest.checkIn)) /
      (1000 * 60 * 60 * 24);
    return Math.max(Math.round(diff), 1);
  }, [guest.checkIn, guest.checkOut]);

  // Room totals
  const roomTotals = useMemo(
    () =>
      tariffs.map((t) => {
        const nights = Number(t.nights || nightsFromDates);
        const base = Number(t.tariff || 0) * nights;
        const gstAmt = (base * Number(t.gst || 0)) / 100;
        return { ...t, nights, base, gstAmt, total: base + gstAmt };
      }),
    [tariffs, nightsFromDates],
  );

  const grandTotal = useMemo(
    () => roomTotals.reduce((s, r) => s + r.total, 0),
    [roomTotals],
  );

  const paidAmount = Number(payment.amount || 0);
  const discountAmount = Number(payment.discount || 0);
  const remainingAmount = Math.max(grandTotal - paidAmount - discountAmount, 0);

  // Toggle room selection
  const toggleRoom = (room) => {
    setSelectedRooms((prev) => {
      const exists = prev.find((r) => r.roomNumber === room.roomNumber);
      if (exists) return prev.filter((r) => r.roomNumber !== room.roomNumber);
      return [...prev, room];
    });
  };

  const updateTariff = (index, field, value) => {
    setTariffs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // ─── Validation per step ─────────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) {
      return (
        guest.guestName.trim() &&
        guest.mobile.trim() &&
        guest.checkIn &&
        guest.checkOut &&
        guest.checkIn <= guest.checkOut
      );
    }
    if (step === 1) return selectedRooms.length > 0;
    if (step === 2) return tariffs.every((t) => Number(t.tariff) > 0);
    if (step === 3) return true;
    return true;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        guest: {
          ...guest,
          groupBooking: true,
        },
        rooms: roomTotals.map((r) => ({
          roomNumber: r.roomNumber,
          categoryName: r.categoryName,
          tariff: r.tariff,
          gst: r.gst,
          adults: r.adults,
          children: r.children,
          nights: r.nights,
          total: r.total,
        })),
        payment: {
          amount: paidAmount,
          discount: discountAmount,
          paymentMode: payment.paymentMode,
          remarks: payment.remarks,
          totalAmount: grandTotal,
        },
      };

      const res = await API.post("/hotel/group-booking", payload);
      const bookingId = res.data?.bookingId || res.data?.insertId;
      const bookingCode = res.data?.bookingCode;

      setStoredBookingId(bookingId);
      if (bookingCode) setStoredBookingCode(bookingCode);
      setResultBooking({ bookingId, bookingCode, grandTotal, rooms: selectedRooms });
      setStep(4);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Booking creation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_30%),linear-gradient(135deg,#f8fbff_0%,#f5f3ff_50%,#fff8ef_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,#020617_0%,#4f46e5_48%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_70px_rgba(15,23,42,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-violet-200">
            Group Booking
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Multi-Room Group Reservation
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100/80">
            “Book multiple rooms at once for a master guest — within a single payment flow.”
          </p>
        </section>

        {/* Step Bar */}
        {step < 4 && (
          <div className="rounded-[22px] border border-white/70 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
            <StepBar current={step} />
          </div>
        )}

        {/* ── Step 0: Guest Details ────────────────────────────────────────── */}
        {step === 0 && (
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <h2 className="mb-5 text-2xl font-black text-slate-900">
              Master Guest Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Guest Name *</label>
                <input
                  className={inputCls}
                  placeholder="Full name of group leader"
                  value={guest.guestName}
                  onChange={(e) =>
                    setGuest((p) => ({ ...p, guestName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Mobile *</label>
                <input
                  className={inputCls}
                  placeholder="10 digit mobile"
                  value={guest.mobile}
                  onChange={(e) =>
                    setGuest((p) => ({ ...p, mobile: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  className={inputCls}
                  type="email"
                  placeholder="group@example.com"
                  value={guest.guestEmail}
                  onChange={(e) =>
                    setGuest((p) => ({ ...p, guestEmail: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Group / Event Label</label>
                <input
                  className={inputCls}
                  placeholder="Wedding party, Corporate retreat…"
                  value={guest.groupLabel}
                  onChange={(e) =>
                    setGuest((p) => ({ ...p, groupLabel: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Check-In *</label>
                <input
                  type="date"
                  className={inputCls}
                  min={today()}
                  value={guest.checkIn}
                  onChange={(e) =>
                    setGuest((p) => ({ ...p, checkIn: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Check-Out *</label>
                <input
                  type="date"
                  className={inputCls}
                  min={guest.checkIn || today()}
                  value={guest.checkOut}
                  onChange={(e) =>
                    setGuest((p) => ({ ...p, checkOut: e.target.value }))
                  }
                />
              </div>
            </div>
            {nightsFromDates > 0 && (
              <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
                📅 {nightsFromDates} night{nightsFromDates > 1 ? "s" : ""} ka stay
              </p>
            )}
          </div>
        )}

        {/* ── Step 1: Room Selection ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">
                Select Rooms
              </h2>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
                {selectedRooms.length} selected
              </span>
            </div>

            <div className="space-y-4">
              {inventory.map((cat) => (
                <div key={cat.id}>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {cat.name} — ₹{cat.defaultPrice}/night
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(cat.rooms || []).map((roomNo) => {
                      const isSelected = selectedRooms.some(
                        (r) => r.roomNumber === roomNo,
                      );
                      return (
                        <button
                          key={roomNo}
                          type="button"
                          onClick={() =>
                            toggleRoom({
                              roomNumber: roomNo,
                              categoryName: cat.name,
                              defaultPrice: cat.defaultPrice,
                            })
                          }
                          className={`rounded-[14px] border px-4 py-2.5 text-sm font-bold transition ${
                            isSelected
                              ? "border-indigo-400 bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                              : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                          }`}
                        >
                          {roomNo}
                          {isSelected && " ✓"}
                        </button>
                      );
                    })}
                    {(!cat.rooms || cat.rooms.length === 0) && (
                      <span className="text-xs text-slate-400 italic">
                        No rooms in this category
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedRooms.length > 0 && (
              <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
                Selected: {selectedRooms.map((r) => r.roomNumber).join(", ")}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Tariff per room ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-900 px-1">
              Set Tariff for Each Room
            </h2>
            {tariffs.map((t, i) => (
              <div
                key={t.roomNumber}
                className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Room {t.roomNumber}
                    </h3>
                    <p className="text-xs text-slate-500">{t.categoryName}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-4 py-2 text-right">
                    <div className="text-[10px] text-emerald-600">Room Total</div>
                    <div className="text-lg font-black text-emerald-800">
                      {formatCurrency(roomTotals[i]?.total || 0)}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className={labelCls}>Tariff/Night (₹)</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={t.tariff}
                      onChange={(e) => updateTariff(i, "tariff", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Nights</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={t.nights || nightsFromDates}
                      onChange={(e) => updateTariff(i, "nights", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>GST %</label>
                    <select
                      className={inputCls}
                      value={t.gst}
                      onChange={(e) => updateTariff(i, "gst", e.target.value)}
                    >
                      {GST_RATES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Adults</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={t.adults}
                      onChange={(e) => updateTariff(i, "adults", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-right">
              <span className="text-sm font-bold text-emerald-700">
                Grand Total:
              </span>{" "}
              <span className="text-2xl font-black text-emerald-900">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        )}

        {/* ── Step 3: Payment ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <h2 className="mb-5 text-2xl font-black text-slate-900">
              Advance Payment
            </h2>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-[20px] bg-slate-900 p-4 text-white">
                <div className="text-[10px] uppercase tracking-wide text-white/60">
                  Total
                </div>
                <div className="mt-2 text-xl font-black">
                  {formatCurrency(grandTotal)}
                </div>
              </div>
              <div className="rounded-[20px] bg-amber-50 p-4">
                <div className="text-[10px] uppercase tracking-wide text-amber-600">
                  Discount
                </div>
                <div className="mt-2 text-xl font-black text-amber-900">
                  {formatCurrency(discountAmount)}
                </div>
              </div>
              <div
                className={`rounded-[20px] p-4 ${
                  remainingAmount > 0 ? "bg-rose-50" : "bg-emerald-50"
                }`}
              >
                <div
                  className={`text-[10px] uppercase tracking-wide ${
                    remainingAmount > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  Remaining
                </div>
                <div
                  className={`mt-2 text-xl font-black ${
                    remainingAmount > 0 ? "text-rose-900" : "text-emerald-900"
                  }`}
                >
                  {formatCurrency(remainingAmount)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Advance Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  placeholder="0"
                  value={payment.amount}
                  onChange={(e) =>
                    setPayment((p) => ({ ...p, amount: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  placeholder="0"
                  value={payment.discount}
                  onChange={(e) =>
                    setPayment((p) => ({ ...p, discount: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Payment Mode</label>
                <select
                  className={inputCls}
                  value={payment.paymentMode}
                  onChange={(e) =>
                    setPayment((p) => ({ ...p, paymentMode: e.target.value }))
                  }
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Remarks</label>
                <input
                  className={inputCls}
                  placeholder="Optional notes…"
                  value={payment.remarks}
                  onChange={(e) =>
                    setPayment((p) => ({ ...p, remarks: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirmed ────────────────────────────────────────────── */}
        {step === 4 && resultBooking && (
          <div className="rounded-[32px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center shadow-[0_22px_60px_rgba(16,185,129,0.12)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white">
              ✓
            </div>
            <h2 className="mt-5 text-3xl font-black text-emerald-900">
              Group Booking Confirmed!
            </h2>
            <p className="mt-3 text-slate-600">
              Booking #{resultBooking.bookingId} — {selectedRooms.length} room
              {selectedRooms.length > 1 ? "s" : ""} reserved for{" "}
              {guest.guestName}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Total: {formatCurrency(grandTotal)} · Advance: {formatCurrency(paidAmount)}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate("/hotel/communication", {
                    state: { bookingId: resultBooking.bookingId },
                  })
                }
                className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white"
              >
                View Invoice
              </button>
              <button
                type="button"
                onClick={() => {
                  clearBookingSession();
                  navigate("/hotel/all-bookings");
                }}
                className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700"
              >
                All Bookings
              </button>
              <button
                type="button"
                onClick={() => {
                  clearBookingSession();
                  setStep(0);
                  setGuest({ guestName: "", mobile: "", guestEmail: "", checkIn: today(), checkOut: today(), bookingStatus: "Confirmed", groupLabel: "" });
                  setSelectedRooms([]);
                  setResultBooking(null);
                }}
                className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700"
              >
                New Group Booking
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                step === 0 ? navigate("/hotel/all-bookings") : setStep((s) => s - 1)
              }
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {step === 0 ? "← Cancel" : "← Back"}
            </button>

            {step < 3 ? (
              <button
                type="button"
                disabled={!canNext()}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {saving ? "Booking…" : "Confirm Group Booking"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupBooking;
