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

const AllBooking = () => {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  const fetchBookings = async () => {
    try {
      const res = await API.get("/hotel/all-bookings");
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
      alert("Server connection error");
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
    return bookings.reduce(
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
  }, [bookings]);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f5fbff_0%,#f9fff7_45%,#fffaf2_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-200">
                Booking Register
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                All hotel bookings in one clean dashboard
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Front desk ke liye live booking list, payment status, balance,
                refund aur quick actions ek hi screen par.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-sky-100/80">
                  Total Bookings
                </div>
                <div className="mt-2 text-3xl font-black">{summary.totalBookings}</div>
              </div>
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-sky-100/80">
                  Total Revenue
                </div>
                <div className="mt-2 text-2xl font-black">
                  {formatCurrency(summary.totalRevenue)}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-sky-100/80">
                  Received
                </div>
                <div className="mt-2 text-2xl font-black">
                  {formatCurrency(summary.totalReceived)}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-sky-100/80">
                  Pending Balance
                </div>
                <div className="mt-2 text-2xl font-black">
                  {formatCurrency(summary.totalBalance)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
              Active Revenue
            </div>
            <div className="mt-2 text-3xl font-black text-slate-900">
              {formatCurrency(summary.totalRevenue - summary.totalRefund)}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              Paid Collection
            </div>
            <div className="mt-2 text-3xl font-black text-slate-900">
              {formatCurrency(summary.totalReceived)}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600">
              Outstanding
            </div>
            <div className="mt-2 text-3xl font-black text-slate-900">
              {formatCurrency(summary.totalBalance)}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-600">
              Refunds
            </div>
            <div className="mt-2 text-3xl font-black text-slate-900">
              {formatCurrency(summary.totalRefund)}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                Booking Feed
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Guest bookings with live payment snapshot
              </h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              {bookings.length} records
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {bookings.map((booking) => {
              const refund = Number(booking.refundAmount || 0);
              const paid = Number(booking.paidAmount || 0);
              const remaining = Number(booking.remainingAmount || 0);
              const total = Number(booking.totalAmount || 0);
              const isSettled = remaining <= 0;

              return (
                <div
                  key={booking.bookingId}
                  className="group rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-slate-900">
                        {booking.guest_name || "Walk-in Guest"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {booking.mobile || "No mobile"}
                      </div>
                    </div>

                    <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                      #{booking.bookingId}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {booking.company_name || "Direct Booking"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {booking.rooms || "Room Pending"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] bg-emerald-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-emerald-700">
                        Total
                      </div>
                      <div className="mt-1 text-lg font-black text-emerald-900">
                        {formatCurrency(total)}
                      </div>
                    </div>
                    <div className="rounded-[18px] bg-blue-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-blue-700">
                        Paid
                      </div>
                      <div className="mt-1 text-lg font-black text-blue-900">
                        {formatCurrency(paid)}
                      </div>
                    </div>
                    <div className="rounded-[18px] bg-amber-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-amber-700">
                        Remaining
                      </div>
                      <div className="mt-1 text-lg font-black text-amber-900">
                        {formatCurrency(remaining)}
                      </div>
                    </div>
                    <div className="rounded-[18px] bg-violet-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-violet-700">
                        Refund
                      </div>
                      <div className="mt-1 text-lg font-black text-violet-900">
                        {formatCurrency(refund)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {refund > 0 ? (
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                          Refunded
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isSettled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isSettled ? "Settled" : "Payment Pending"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setStoredBookingId(booking.bookingId);
                        navigate("/hotel/communication", {
                          state: {
                            bookingId: booking.bookingId,
                            totalAmount: total,
                            paidAmount: paid,
                            remainingAmount: remaining,
                            rooms: booking.rooms
                              ? String(booking.rooms).split(",").map((room) => ({
                                  roomNo: room.trim(),
                                }))
                              : [],
                          },
                        });
                      }}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      View Booking
                    </button>

                    <button
                      onClick={() => {
                        setStoredBookingId(booking.bookingId);
                        navigate("/hotel/edit-booking", {
                          state: { bookingId: booking.bookingId },
                        });
                      }}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleRefund(booking.bookingId)}
                      className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700"
                    >
                      Refund
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AllBooking;
