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

const summaryCards = [
  { key: "totalBookings", label: "Total Bookings", tone: "from-slate-950 to-slate-700" },
  { key: "totalRevenue", label: "Total Revenue", tone: "from-blue-700 to-cyan-500" },
  { key: "totalReceived", label: "Received", tone: "from-emerald-600 to-teal-500" },
  { key: "totalBalance", label: "Balance", tone: "from-amber-500 to-orange-500" },
];

const AllBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [viewMode, setViewMode] = useState("active");
  const navigate = useNavigate();

  const fetchBookings = async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        API.get("/hotel/all-bookings"),
        API.get("/hotel/booking-history"),
      ]);
      setBookings(Array.isArray(activeRes.data) ? activeRes.data : []);
      setHistoryBookings(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
      alert("Server connection error");
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
    } catch (error) {
      console.error(error);
      alert(action === "check-out" ? "Check-out failed" : "Check-in failed");
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
        const total = Number(booking.totalAmount || 0);
        const paid = Number(booking.paidAmount || 0);
        const remaining = Number(booking.remainingAmount || 0);
        const refund = Number(booking.refundAmount || 0);

        acc.totalBookings += 1;
        acc.totalRevenue += total;
        acc.totalReceived += paid;
        acc.totalBalance += remaining;
        acc.totalRefund += refund;

        return acc;
      },
      {
        totalBookings: 0,
        totalRevenue: 0,
        totalReceived: 0,
        totalBalance: 0,
        totalRefund: 0,
      },
    );
  }, [bookings, historyBookings, viewMode]);

  const visibleBookings = viewMode === "history" ? historyBookings : bookings;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(135deg,#f8fbff_0%,#f7fffb_50%,#fff8ef_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
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
                Front desk ke liye ek clean dashboard jahan booking status, received
                payment, discount aur pending balance ek hi jagah clearly dikhe.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-2">
                {summaryCards.map((card) => (
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

          <div className="mb-5 flex gap-3">
            <button
              type="button"
              onClick={() => setViewMode("active")}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                viewMode === "active" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Active Bookings
            </button>
            <button
              type="button"
              onClick={() => setViewMode("history")}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                viewMode === "history" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Checkout History
            </button>
            <button
              type="button"
              onClick={() => navigate("/hotel/booking-history")}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            >
              Open History Page
            </button>
          </div>

          {visibleBookings.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleBookings.map((booking) => {
                const paid = Number(booking.paidAmount || 0);
                const discount = Number(booking.discountAmount || 0);
                const remaining = Number(booking.remainingAmount || 0);
                const total = Number(booking.totalAmount || 0);
                const isSettled = remaining <= 0;

                return (
                  <article
                    key={booking.bookingId}
                    className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_35px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_45px_rgba(15,23,42,0.12)]"
                  >
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-sky-100 to-transparent blur-2xl" />

                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Booking #{booking.bookingId}
                        </div>
                        <h3 className="mt-2 text-xl font-black text-slate-900">
                          {booking.guest_name || "Walk-in Guest"}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          Room {booking.rooms || "Not assigned yet"}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {booking.booking_status || (viewMode === "history" ? "Checked Out" : "Confirmed")}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                          isSettled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {isSettled ? "Settled" : "Pending"}
                      </span>
                    </div>

                    <div className="relative mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-[20px] bg-slate-950 px-4 py-3 text-white">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                          Total
                        </div>
                        <div className="mt-1 text-lg font-black">{formatCurrency(total)}</div>
                      </div>
                      <div className="rounded-[20px] bg-emerald-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-600">
                          Paid
                        </div>
                        <div className="mt-1 text-lg font-black text-emerald-900">
                          {formatCurrency(paid)}
                        </div>
                      </div>
                      <div className="rounded-[20px] bg-amber-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-amber-700">
                          Discount
                        </div>
                        <div className="mt-1 text-lg font-black text-amber-900">
                          {formatCurrency(discount)}
                        </div>
                      </div>
                      <div className="rounded-[20px] bg-sky-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-sky-700">
                          Remaining
                        </div>
                        <div className="mt-1 text-lg font-black text-sky-900">
                          {formatCurrency(remaining)}
                        </div>
                      </div>
                    </div>

                    <div className="relative mt-5 flex flex-wrap gap-2">
                      <button
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

                      {viewMode === "active" ? (
                        <button
                          onClick={() =>
                            handleLifecycle(
                              booking,
                              String(booking.booking_status || "").toLowerCase().includes("checked in")
                                ? "check-out"
                                : "check-in",
                            )
                          }
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                        >
                          {String(booking.booking_status || "").toLowerCase().includes("checked in")
                            ? "Check Out"
                            : "Check In"}
                        </button>
                      ) : null}

                      {viewMode === "active" ? (
                        <button
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
                      ) : null}

                      {viewMode === "active" ? (
                        <button
                          onClick={() => handleRefund(booking.bookingId)}
                          className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-fuchsia-700"
                        >
                          Refund
                        </button>
                      ) : null}

                      {viewMode === "active" && remaining > 0 && (
                        <button
                          onClick={() => {
                            setStoredBookingId(booking.bookingId);
                            navigate("/hotel/collect-payment", {
                              state: {
                                bookingId: booking.bookingId,
                                remainingAmount: remaining,
                              },
                            });
                          }}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                        >
                          Collect Payment
                        </button>
                      )}

                      <button
                        onClick={() =>
                          navigate("/hotel/payment-history", {
                            state: { bookingId: booking.bookingId },
                          })
                        }
                        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
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
              {viewMode === "history" ? "Checkout history abhi empty hai." : "Abhi koi booking available nahi hai."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AllBooking;
