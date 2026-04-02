// src/components/Hotel/AllBooking.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { setStoredBookingId } from "./bookingSession";

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

// ─── BUG FIX: Booking status → colour mapping ─────────────────────────────────
// "Pending" was showing for payment balance AND for booking status — now separated.
const getBookingStatusMeta = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("checked in"))  return { label: "Checked In",  classes: "bg-sky-100 text-sky-700"      };
  if (s.includes("confirmed"))   return { label: "Confirmed",   classes: "bg-blue-100 text-blue-700"    };
  if (s.includes("pencil") ||
      s.includes("tentative"))   return { label: "Tentative",   classes: "bg-amber-100 text-amber-700"  };
  if (s.includes("cancel"))      return { label: "Cancelled",   classes: "bg-rose-100 text-rose-700"    };
  if (s.includes("checked out")) return { label: "Checked Out", classes: "bg-slate-100 text-slate-500"  };
  return                                { label: "Confirmed",   classes: "bg-blue-100 text-blue-700"    };
};

// ─── BUG FIX: Payment status — "Pending" renamed to "Balance Due" ─────────────
// Previously "Pending" was used for payment balance, confusing users who thought
// the booking itself was pending. Now shows "Balance Due" vs "Fully Paid".
const getPaymentStatusMeta = (remaining) => {
  if (Number(remaining) <= 0)
    return { label: "Fully Paid",   classes: "bg-emerald-100 text-emerald-700" };
  return   { label: "Balance Due",  classes: "bg-rose-100 text-rose-700"       };
};

const SUMMARY_CARDS = [
  { key: "totalBookings", label: "Total Bookings", tone: "from-slate-950 to-slate-700" },
  { key: "totalRevenue",  label: "Total Revenue",  tone: "from-blue-700 to-cyan-500"   },
  { key: "totalReceived", label: "Received",        tone: "from-emerald-600 to-teal-500"},
  { key: "totalBalance",  label: "Balance Due",     tone: "from-amber-500 to-orange-500"},
];

const AllBooking = () => {
  const [bookings,        setBookings]        = useState([]);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [viewMode,        setViewMode]        = useState("active");
  const [loading,         setLoading]         = useState(true);
  const [cancelModal,     setCancelModal]     = useState({ open: false, booking: null, reason: "", submitting: false });
  const navigate = useNavigate();

  // ─── Fetch both active and history bookings ──────────────────────────────────
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const [activeRes, historyRes] = await Promise.all([
        API.get("/hotel/all-bookings"),
        API.get("/hotel/booking-history"),
      ]);
      setBookings(Array.isArray(activeRes.data)  ? activeRes.data  : []);
      setHistoryBookings(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
      alert("Server connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleLifecycle = async (booking, action) => {
    try {
      await API.put(`/hotel/${action}/${booking.bookingId}`);
      if (action === "check-out") {
        alert("Guest checked out. Booking history me move ho gaya aur room cleaning me chala gaya.");
      } else {
        alert("Guest checked in successfully.");
      }
      fetchBookings();
    } catch (err) {
      console.error(err);
      alert(action === "check-out" ? "Check-out failed" : "Check-in failed");
    }
  };

  const handleCancelBooking = async () => {
    const booking = cancelModal.booking;
    const reason = String(cancelModal.reason || "").trim();

    if (!booking?.bookingId) {
      alert("Valid booking nahi mili.");
      return;
    }

    if (!reason) {
      alert("Cancellation reason likhna zaroori hai.");
      return;
    }

    try {
      setCancelModal((current) => ({ ...current, submitting: true }));
      await API.put(`/hotel/cancel/${booking.bookingId}`, { reason });
      setCancelModal({ open: false, booking: null, reason: "", submitting: false });
      fetchBookings();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Booking cancel nahi ho paayi.");
      setCancelModal((current) => ({ ...current, submitting: false }));
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleRefund = async (id) => {
    const amount = prompt("Enter refund amount");
    if (!amount || Number.isNaN(Number(amount))) {
      alert("Invalid amount");
      return;
    }
    try {
      await API.post(`/hotel/refund/${id}`, { amount });
      alert("Refund Done");
      fetchBookings();
    } catch (err) {
      console.error("Refund failed:", err);
      alert("Refund Failed");
    }
  };

  const summary = useMemo(() => {
    const source = viewMode === "history" ? historyBookings : bookings;
    return source.reduce(
      (acc, booking) => {
        acc.totalBookings += 1;
        acc.totalRevenue  += Number(booking.totalAmount    || 0);
        acc.totalReceived += Number(booking.paidAmount     || 0);
        acc.totalBalance  += Number(booking.remainingAmount|| 0);
        acc.totalRefund   += Number(booking.refundAmount   || 0);
        return acc;
      },
      { totalBookings: 0, totalRevenue: 0, totalReceived: 0, totalBalance: 0, totalRefund: 0 },
    );
  }, [bookings, historyBookings, viewMode]);

  const visibleBookings = viewMode === "history" ? historyBookings : bookings;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(135deg,#f8fbff_0%,#f7fffb_50%,#fff8ef_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Header section ─────────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,#020617_0%,#1d4ed8_45%,#0f766e_100%)] px-6 py-8 text-white shadow-[0_25px_70px_rgba(15,23,42,0.22)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
                Reservation Overview
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                All bookings at a glance
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
           “Booking status, received payment, and pending balance in one place.”
              </p>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-2">
                {SUMMARY_CARDS.map((card) => (
                  <div
                    key={card.key}
                    className={`rounded-[22px] bg-gradient-to-br ${card.tone} p-4 shadow-lg`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                      {card.label}
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">
                      {card.key === "totalBookings"
                        ? summary[card.key]
                        : formatCurrency(summary[card.key])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── View toggle + grid ────────────────────────────────────────────── */}
        <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                Booking Grid
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Active and settled stays
              </h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              {visibleBookings.length} records
            </div>
          </div>

          {/* Tab switches */}
          <div className="mb-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setViewMode("active")}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                viewMode === "active"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Active Bookings
            </button>
            <button
              type="button"
              onClick={() => setViewMode("history")}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                viewMode === "history"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Checkout History
            </button>
            <button
              type="button"
              onClick={() => navigate("/hotel/group-booking")}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Group Booking
            </button>
            <button
              type="button"
              onClick={() => navigate("/hotel/occupancy-forecast")}
              className="rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700"
            >
              Occupancy Forecast
            </button>
            <button
              type="button"
              onClick={fetchBookings}
              disabled={loading}
              className="ml-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Loading…" : "↻ Refresh"}
            </button>
          </div>

          {/* Booking cards */}
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading bookings…</div>
          ) : visibleBookings.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleBookings.map((booking) => {
                const paid      = Number(booking.paidAmount      || 0);
                const discount  = Number(booking.discountAmount  || 0);
                const remaining = Number(booking.remainingAmount || 0);
                const total     = Number(booking.totalAmount     || 0);

                // BUG FIX: separate booking status from payment status
                const bookingStatusMeta = getBookingStatusMeta(booking.booking_status);
                const paymentStatusMeta = getPaymentStatusMeta(remaining);

                return (
                  <article
                    key={booking.bookingId}
                    className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_35px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_45px_rgba(15,23,42,0.12)]"
                  >
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-sky-100 to-transparent blur-2xl" />

                    {/* Card header */}
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Booking #{booking.bookingId}
                        </div>
                        <h3 className="mt-1 truncate text-xl font-black text-slate-900">
                          {booking.guest_name || "Walk-in Guest"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Room: {booking.rooms || "Not assigned"}
                        </p>
                      </div>

                      {/* BUG FIX: Shows booking status (Confirmed/Checked In) separately */}
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] ${bookingStatusMeta.classes}`}
                      >
                        {bookingStatusMeta.label}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="relative mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <span>{formatDate(booking.check_in)}</span>
                      <span>→</span>
                      <span>{formatDate(booking.check_out)}</span>
                    </div>

                    {/* Financial grid */}
                    <div className="relative mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-[20px] bg-slate-950 px-4 py-3 text-white">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">Total</div>
                        <div className="mt-1 text-lg font-black">{formatCurrency(total)}</div>
                      </div>
                      <div className="rounded-[20px] bg-emerald-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-600">Paid</div>
                        <div className="mt-1 text-lg font-black text-emerald-900">{formatCurrency(paid)}</div>
                      </div>
                      <div className="rounded-[20px] bg-amber-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-amber-700">Discount</div>
                        <div className="mt-1 text-lg font-black text-amber-900">{formatCurrency(discount)}</div>
                      </div>
                      {/* BUG FIX: "Balance Due" instead of misleading "Pending" */}
                      <div className={`rounded-[20px] px-4 py-3 ${remaining > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
                        <div className={`text-[11px] uppercase tracking-[0.2em] ${remaining > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          Balance Due
                        </div>
                        <div className={`mt-1 text-lg font-black ${remaining > 0 ? "text-rose-900" : "text-emerald-900"}`}>
                          {formatCurrency(remaining)}
                        </div>
                      </div>
                    </div>

                    {/* BUG FIX: Payment status badge — "Balance Due" or "Fully Paid" */}
                    <div className="relative mt-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${paymentStatusMeta.classes}`}
                      >
                        {paymentStatusMeta.label}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="relative mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStoredBookingId(booking.bookingId);
                          navigate("/hotel/communication", {
                            state: { bookingId: booking.bookingId },
                          });
                        }}
                        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/invoice/${booking.bookingId}`)}
                        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >
                        Generate Invoice
                      </button>

                      {viewMode === "active" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleLifecycle(
                              booking,
                              String(booking.booking_status || "")
                                .toLowerCase()
                                .includes("checked in")
                                ? "check-out"
                                : "check-in",
                            )
                          }
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                        >
                          {String(booking.booking_status || "")
                            .toLowerCase()
                            .includes("checked in")
                            ? "Check Out"
                            : "Check In"}
                        </button>
                      )}

                      {viewMode === "active" && (
                        <button
                          type="button"
                          onClick={() => {
                            setStoredBookingId(booking.bookingId);
                            navigate("/hotel/edit-booking", {
                              state: { bookingId: booking.bookingId },
                            });
                          }}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      )}

                      {viewMode === "active" && (
                        <button
                          type="button"
                          onClick={() => handleRefund(booking.bookingId)}
                          className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-fuchsia-700"
                        >
                          Refund
                        </button>
                      )}

                      {viewMode === "active" &&
                      !String(booking.booking_status || "").toLowerCase().includes("checked in") ? (
                        <button
                          type="button"
                          onClick={() =>
                            setCancelModal({ open: true, booking, reason: "", submitting: false })
                          }
                          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
                        >
                          Cancel Booking
                        </button>
                      ) : null}

                      {viewMode === "active" && remaining > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setStoredBookingId(booking.bookingId);
                            navigate("/hotel/collect-payment", {
                              state: {
                                bookingId:       booking.bookingId,
                                remainingAmount: remaining,
                              },
                            });
                          }}
                          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                          Collect Payment
                        </button>
                      )}

                      {/* Folio button — new feature */}
                      {viewMode === "active" && (
                        <button
                          type="button"
                          onClick={() => {
                            setStoredBookingId(booking.bookingId);
                            navigate("/hotel/folio", {
                              state: { bookingId: booking.bookingId },
                            });
                          }}
                          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
                        >
                          Folio
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          navigate("/hotel/payment-history", {
                            state: { bookingId: booking.bookingId },
                          })
                        }
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        History
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center text-slate-500">
              {viewMode === "history"
                ? "Checkout history abhi empty hai."
                : "Abhi koi active booking nahi hai."}
            </div>
          )}
        </section>

        {cancelModal.open ? (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
            onClick={() => setCancelModal({ open: false, booking: null, reason: "", submitting: false })}
          >
            <div
              className="w-full max-w-md rounded-[28px] border border-rose-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700">
                Cancel Booking
              </div>
              <h3 className="mt-3 text-xl font-black text-slate-900">
                Booking #{cancelModal.booking?.bookingId}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {cancelModal.booking?.guest_name || "--"} | Room {cancelModal.booking?.rooms || "--"}
              </p>
              <label className="mt-4 block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Cancellation Reason
                </span>
                <textarea
                  value={cancelModal.reason}
                  onChange={(event) =>
                    setCancelModal((current) => ({ ...current, reason: event.target.value }))
                  }
                  rows={4}
                  placeholder="Guest cancelled, no-show, wrong date, price issue..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-400"
                />
              </label>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelModal({ open: false, booking: null, reason: "", submitting: false })}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={cancelModal.submitting}
                  className={`rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 ${
                    cancelModal.submitting ? "cursor-not-allowed opacity-70" : ""
                  }`}
                >
                  {cancelModal.submitting ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AllBooking;
