import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../../api";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const BookingHistory = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await API.get("/hotel/booking-history");
        setRows(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error(error);
        alert("Booking history load nahi ho paayi.");
      }
    };

    loadHistory();
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fbff_0%,#f8fffc_45%,#fff9f2_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1e40af_55%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_60px_rgba(15,23,42,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Booking History</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Checked-out bookings archive</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
            Yahan checkout ho chuki sari bookings ka complete record milega, including guest details, room id/type/no, email aur billing snapshot.
          </p>
        </section>

        <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">History Grid</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Archived guest stays</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">{rows.length} records</div>
          </div>

          {rows.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <article
                  key={row.bookingId}
                  className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_35px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Booking #{row.bookingId}
                      </div>
                      <h3 className="mt-2 text-xl font-black text-slate-900">{row.guest_name || "Walk-in Guest"}</h3>
                      <p className="mt-1 text-sm text-slate-500">{row.company_name || "Direct"}</p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                      {row.booking_status || "Checked Out"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 rounded-[22px] bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between"><span>Mobile</span><span className="font-semibold text-slate-900">{row.mobile || "--"}</span></div>
                    <div className="flex items-center justify-between"><span>Email</span><span className="font-semibold text-slate-900">{row.guest_email || "--"}</span></div>
                    <div className="flex items-center justify-between"><span>Check-In</span><span className="font-semibold text-slate-900">{row.check_in || "--"}</span></div>
                    <div className="flex items-center justify-between"><span>Check-Out</span><span className="font-semibold text-slate-900">{row.check_out || "--"}</span></div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Room Details</div>
                    <div className="mt-3 text-sm font-semibold text-slate-900 whitespace-pre-line">
                      {String(row.roomDetails || row.rooms || "--").split(" || ").join("\n")}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[18px] bg-slate-950 px-4 py-3 text-white">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">Total</div>
                      <div className="mt-1 text-lg font-black">{formatCurrency(row.totalAmount)}</div>
                    </div>
                    <div className="rounded-[18px] bg-emerald-50 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-600">Remaining</div>
                      <div className="mt-1 text-lg font-black text-emerald-900">{formatCurrency(row.remainingAmount)}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate("/hotel/payment-history", { state: { bookingId: row.bookingId } })}
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      Payment History
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/hotel/all-bookings")}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Back
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center text-slate-500">
              Abhi tak koi checked-out booking history me nahi hai.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BookingHistory;
