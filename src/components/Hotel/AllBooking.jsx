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
      }
    );
  }, [bookings]);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f5fbff_0%,#f9fff7_45%,#fffaf2_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] px-6 py-7 text-white">
          <h1 className="text-3xl font-black">All Bookings</h1>
        </section>

        {/* BOOKINGS */}
        <section className="rounded-[28px] bg-white p-5 shadow">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {bookings.map((booking) => {
              const paid = Number(booking.paidAmount || 0);
              const remaining = Number(booking.remainingAmount || 0);
              const total = Number(booking.totalAmount || 0);
              const isSettled = remaining <= 0;

              return (
                <div
                  key={booking.bookingId}
                  className="rounded-xl border p-4 shadow-sm"
                >
                  <h3 className="font-bold text-lg">
                    {booking.guest_name}
                  </h3>

                  <p>Room: {booking.rooms}</p>

                  <p>Total: {formatCurrency(total)}</p>
                  <p>Paid: {formatCurrency(paid)}</p>
                  <p>Remaining: {formatCurrency(remaining)}</p>

                  <div className="mt-3 flex gap-2 flex-wrap">

                    {/* VIEW */}
                    <button
                      onClick={() => {
                        setStoredBookingId(booking.bookingId);
                        navigate("/hotel/communication", {
                          state: { bookingId: booking.bookingId },
                        });
                      }}
                      className="bg-black text-white px-3 py-1 rounded"
                    >
                      View
                    </button>

                    {/* EDIT */}
                    <button
                      onClick={() => {
                        setStoredBookingId(booking.bookingId);
                        navigate("/hotel/edit-booking", {
                          state: { bookingId: booking.bookingId },
                        });
                      }}
                      className="border px-3 py-1 rounded"
                    >
                      Edit
                    </button>

                    {/* REFUND */}
                    <button
                      onClick={() => handleRefund(booking.bookingId)}
                      className="bg-purple-600 text-white px-3 py-1 rounded"
                    >
                      Refund
                    </button>

                    {/* COLLECT PAYMENT */}
                    {remaining > 0 && (
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
                        className="bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Collect Payment
                      </button>
                    )}

                    {/* 🔥 NEW: HISTORY BUTTON */}
                    <button
                      onClick={() =>
                        navigate("/hotel/payment-history", {
                          state: { bookingId: booking.bookingId },
                        })
                      }
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      History
                    </button>

                  </div>

                  <div className="mt-2">
                    Status:{" "}
                    <b className={isSettled ? "text-green-600" : "text-red-500"}>
                      {isSettled ? "Settled" : "Pending"}
                    </b>
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