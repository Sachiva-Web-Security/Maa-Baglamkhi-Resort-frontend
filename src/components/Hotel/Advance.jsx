import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import API from "../../api";
import {
  getBookingDraft,
  getStoredBookingId,
  setBookingDraft,
  setStoredBookingId,
} from "./bookingSession";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const PAYMENT_MODES = ["Cash", "Card", "UPI", "Bank Transfer", "Mixed"];

const Advance = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingId = location.state?.bookingId || getStoredBookingId();
  const rows = location.state?.rows || getBookingDraft("roomTariff")?.rows || [];
  const savedAdvance = getBookingDraft("advance") || {};
  const paxDraft = getBookingDraft("pax") || {};
  const guestDraft = getBookingDraft("guest") || {};

  const [paidAmount, setPaidAmount] = useState(savedAdvance.paidAmount || "");
  const [discountAmount] = useState(savedAdvance.discountAmount || 0);
  const [paymentMode, setPaymentMode] = useState(savedAdvance.paymentMode || "Cash");
  const [notes, setNotes] = useState(savedAdvance.notes || "");

  useEffect(() => {
    if (bookingId) {
      setStoredBookingId(bookingId);
    }
  }, [bookingId]);

  const roomSummary = useMemo(
    () =>
      rows.map((row) => {
        const base = Number(row.price || 0) * Number(row.quantity || 0);
        const gstAmount = (base * Number(row.gst || 0)) / 100;
        const total = base + gstAmount;

        return {
          ...row,
          base,
          gstAmount,
          total,
        };
      }),
    [rows],
  );

  const totalAmount = useMemo(
    () => roomSummary.reduce((sum, row) => sum + row.total, 0),
    [roomSummary],
  );

  const safePaidAmount = Math.min(Number(paidAmount || 0), totalAmount);
  const remainingAmount = Math.max(totalAmount - safePaidAmount, 0);
  const totalGuests = Object.values(paxDraft.paxData || {}).reduce(
    (sum, row) => sum + Number(row.adults || 0) + Number(row.children || 0),
    0,
  );

  useEffect(() => {
    setBookingDraft("advance", {
      totalAmount,
      paidAmount: safePaidAmount,
      discountAmount,
      remainingAmount,
      paymentMode,
      notes,
    });
  }, [discountAmount, notes, paymentMode, remainingAmount, safePaidAmount, totalAmount]);

  const handleProceed = async () => {
    if (!bookingId) {
      alert("Booking ID missing hai.");
      return;
    }

    try {
      await API.post(`/hotel/advance/${bookingId}`, {
        amount: safePaidAmount,
        discount: discountAmount,
        totalAmount,
        paidAmount: safePaidAmount,
        discountAmount,
        remainingAmount,
        paymentMode,
        remarks: notes,
        notes,
      });

      navigate("/hotel/communication", {
        state: {
          bookingId,
          totalAmount,
          paidAmount: safePaidAmount,
          discountAmount,
          remainingAmount,
          rooms: roomSummary,
        },
      });
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Error saving advance");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fbff_0%,#fdfbf6_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_60px_rgba(15,23,42,0.22)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
                Advance Collection
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Real booking amount summary and payment collection
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Front desk ke liye clean billing view jahan room-wise tariff, guest
                count, received amount aur balance ek jagah par dikhe.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-sky-100/80">
                  Booking ID
                </div>
                <div className="mt-2 text-2xl font-black">
                  {bookingId || "Pending"}
                </div>
              </div>

              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-sky-100/80">
                  Guests
                </div>
                <div className="mt-2 text-2xl font-black">{totalGuests || 0}</div>
              </div>

              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-sky-100/80">
                  Rooms
                </div>
                <div className="mt-2 text-2xl font-black">{roomSummary.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Billing Breakdown
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Room-wise advance summary
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/hotel/room-tariff")}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Edit Tariff
              </button>
            </div>

            {roomSummary.length ? (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full overflow-hidden rounded-[22px] border border-slate-200">
                  <thead className="bg-slate-100 text-left text-sm text-slate-700">
                    <tr>
                      <th className="px-4 py-3">Room</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Tariff</th>
                      <th className="px-4 py-3">GST</th>
                      <th className="px-4 py-3">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {roomSummary.map((row, index) => (
                      <tr
                        key={`${row.roomNo || row.name}-${index}`}
                        className="border-t border-slate-200 bg-white"
                      >
                        <td className="px-4 py-4 font-bold text-slate-900">
                          {row.roomNo || row.name}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {row.roomType || "-"}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{row.quantity}</td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatCurrency(row.price)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{row.gst}%</td>
                        <td className="px-4 py-4 font-bold text-emerald-700">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-slate-500">
                Room tariff data abhi available nahi hai.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
                Payment Collection
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Advance receive karein
              </h2>

              <div className="mt-5 grid gap-4">
                <div className="rounded-[22px] bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Guest
                  </div>
                  <div className="mt-1 text-lg font-black text-slate-900">
                    {guestDraft.guest_name || "Walk-in Guest"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {guestDraft.mobile || "No mobile"} | {guestDraft.city || "No city"}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] bg-blue-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      Total
                    </div>
                    <div className="mt-2 text-2xl font-black text-blue-900">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-emerald-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Received
                    </div>
                    <div className="mt-2 text-2xl font-black text-emerald-900">
                      {formatCurrency(safePaidAmount)}
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-amber-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Balance
                    </div>
                    <div className="mt-2 text-2xl font-black text-amber-900">
                      {formatCurrency(remainingAmount)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Paid Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={paidAmount}
                    onChange={(event) => setPaidAmount(event.target.value)}
                    placeholder="Enter received amount"
                    className="w-full rounded-[18px] border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(event) => setPaymentMode(event.target.value)}
                    className="w-full rounded-[18px] border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    placeholder="Payment reference, remarks, partial advance reason..."
                    className="w-full rounded-[18px] border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,#f8fdff_0%,#eff8ff_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                Next Step
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-900">
                Invoice aur communication preview
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Advance save hone ke baad communication page par final amount,
                paid amount aur remaining balance show hoga.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/hotel/room-tariff")}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleProceed}
                  className="rounded-full bg-gradient-to-r from-sky-600 to-blue-500 px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5"
                >
                  Save Advance & Continue
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Advance;
