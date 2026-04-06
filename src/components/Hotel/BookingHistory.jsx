import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../../api";

const BOOKING_HISTORY_PAGE_SIZE = 9;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "--";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const dedupeBookings = (rows) => {
  const map = new Map();

  rows.forEach((row) => {
    const key = [
      String(row.guest_name || "").trim().toLowerCase(),
      String(row.mobile || "").trim(),
      String(row.check_in || "").trim(),
      String(row.check_out || "").trim(),
    ].join("|");

    const current = map.get(key);
    if (!current || Number(row.bookingId || 0) > Number(current.bookingId || 0)) {
      map.set(key, row);
    }
  });

  return Array.from(map.values());
};

const BookingHistory = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await API.get("/hotel/booking-history");
        setRows(dedupeBookings(Array.isArray(response.data) ? response.data : []));
      } catch (error) {
        console.error(error);
        alert("Booking history load nahi ho paayi.");
      }
    };

    loadHistory();
  }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / BOOKING_HISTORY_PAGE_SIZE));
  const paginatedRows = rows.slice(
    (page - 1) * BOOKING_HISTORY_PAGE_SIZE,
    page * BOOKING_HISTORY_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [rows]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(135deg,#f8fbff_0%,#f8fffc_45%,#fff9f2_100%)] p-4 sm:p-6">
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1e40af_55%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_60px_rgba(15,23,42,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Booking History</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Checked-out bookings archive</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
            Review past stays, guest details, room allocation, and payment balance in one clean table.
          </p>
        </section>

        <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">History Table</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Archived guest stays</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              {rows.length} records
            </div>
          </div>

          {rows.length ? (
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1380px] text-left">
                  <thead className="bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]">
                    <tr className="text-xs font-bold uppercase tracking-[0.24em] text-slate-600 xl:text-sm">
                      <th className="px-6 py-5">Booking</th>
                      <th className="px-6 py-5">Guest</th>
                      <th className="px-6 py-5">Contact</th>
                      <th className="px-6 py-5">Stay Dates</th>
                      <th className="px-6 py-5">Room Details</th>
                      <th className="px-6 py-5">Total</th>
                      <th className="px-6 py-5">Remaining</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => {
                      const remaining = Number(row.remainingAmount || 0);
                      const roomDetails = String(row.roomDetails || row.rooms || "--")
                        .split(" || ")
                        .join("\n");

                      return (
                        <tr
                          key={row.bookingId}
                          className="border-t border-slate-200 align-top text-base text-slate-800 transition hover:bg-slate-50/70 xl:text-lg"
                        >
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 xl:text-sm">
                                Booking Ref
                              </div>
                              <div className="text-lg font-black text-slate-900 xl:text-2xl">
                                #{row.bookingCode || row.bookingId}
                              </div>
                              <div className="text-sm text-slate-600 xl:text-base">
                                {row.company_name || "Direct booking"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="text-lg font-black text-slate-900 xl:text-2xl">
                                {row.guest_name || "Walk-in Guest"}
                              </div>
                              <div className="text-sm text-slate-600 xl:text-base">
                                {row.booking_source || row.bookingPoint || "--"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="font-semibold text-slate-900 xl:text-xl">{row.mobile || "--"}</div>
                              <div className="max-w-[260px] break-words text-sm text-slate-600 xl:text-base">
                                {row.guest_email || "--"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-900 xl:text-xl">{formatDate(row.check_in)}</div>
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 xl:text-sm">to</div>
                              <div className="font-semibold text-slate-900 xl:text-xl">{formatDate(row.check_out)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="max-w-[320px] whitespace-pre-line font-semibold leading-7 text-slate-900 xl:text-xl">
                              {roomDetails}
                            </div>
                          </td>
                          <td className="px-6 py-6 text-lg font-black text-slate-900 xl:text-2xl">
                            {formatCurrency(row.totalAmount)}
                          </td>
                          <td className={`px-6 py-6 text-lg font-black xl:text-2xl ${remaining > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                            {formatCurrency(row.remainingAmount)}
                          </td>
                          <td className="px-6 py-6">
                            <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white xl:text-sm">
                              {row.booking_status || "Checked Out"}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex min-w-[220px] flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate("/hotel/payment-history", {
                                    state: { bookingId: row.bookingId, bookingCode: row.bookingCode },
                                  })
                                }
                                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 xl:text-base"
                              >
                                Payment History
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate("/hotel/all-bookings")}
                                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 xl:text-base"
                              >
                                Back
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center text-slate-500">
              Abhi tak koi checked-out booking history me nahi hai.
            </div>
          )}

          {rows.length ? (
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 lg:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {(page - 1) * BOOKING_HISTORY_PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(page * BOOKING_HISTORY_PAGE_SIZE, rows.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-900">{rows.length}</span> records
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="inline-flex min-w-[96px] items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white/80"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`h-10 min-w-[44px] rounded-full border px-3 text-xs font-bold transition ${
                      pageNumber === page
                        ? "border-blue-600 bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="inline-flex min-w-[96px] items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-white/80"
                >
                  Next
                </button>
              </div>
            </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default BookingHistory;
