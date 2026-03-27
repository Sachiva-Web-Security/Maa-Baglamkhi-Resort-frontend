import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";
import BookingCancelAction from "./BookingCancelAction";
import {
  clearBookingSession,
  getBookingDraft,
  getStoredBookingCode,
  getStoredBookingId,
} from "./bookingSession";
import { pushDashboardNotification } from "../Dashboard/dashboardNotifications";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const Communication = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const printRef = useRef(null);
  const guestDraft = getBookingDraft("guest") || {};
  const advanceDraft = getBookingDraft("advance") || {};
  const tariffDraft = getBookingDraft("roomTariff") || {};
  const paxDraft = getBookingDraft("pax") || {};
  const [liveBooking, setLiveBooking] = useState(null);

  const bookingId = location.state?.bookingId || getStoredBookingId();
  const bookingCode = location.state?.bookingCode || getStoredBookingCode();
  const bookingRef = liveBooking?.bookingCode || bookingCode || bookingId;
  const totalAmount = Number(
    liveBooking?.totalAmount || location.state?.totalAmount || advanceDraft.totalAmount || 0,
  );
  const paidAmount = Number(
    liveBooking?.paidAmount || location.state?.paidAmount || advanceDraft.paidAmount || 0,
  );
  const discountAmount = Number(
    liveBooking?.discountAmount || location.state?.discountAmount || advanceDraft.discountAmount || 0,
  );
  const remainingAmount = Number(
    liveBooking?.remainingAmount ||
      location.state?.remainingAmount ||
      advanceDraft.remainingAmount ||
      Math.max(totalAmount - paidAmount - discountAmount, 0),
  );

  useEffect(() => {
    if (!bookingId) return;

    let ignore = false;

    const loadBooking = async () => {
      try {
        const response = await API.get(`/hotel/full-booking/${bookingId}`);
        if (!ignore) {
          setLiveBooking(response.data || null);
        }
      } catch (error) {
        console.error("Failed to load booking invoice data:", error);
      }
    };

    loadBooking();

    return () => {
      ignore = true;
    };
  }, [bookingId]);

  const rooms = useMemo(() => {
    if (Array.isArray(liveBooking?.rooms) && liveBooking.rooms.length) {
      return liveBooking.rooms.map((room) => ({
        roomNo: room.room_number,
        roomType: room.room_type || "Booked Room",
        quantity: room.quantity,
        price: Number(room.tariff || 0),
        gst: Number(room.gst || 0),
        total: Number(room.total || 0),
      }));
    }

    const stateRooms = location.state?.rooms;

    if (Array.isArray(stateRooms) && stateRooms.length) {
      return stateRooms;
    }

    if (Array.isArray(tariffDraft.rows) && tariffDraft.rows.length) {
      return tariffDraft.rows;
    }

    return paxDraft.rooms || [];
  }, [liveBooking?.rooms, location.state?.rooms, paxDraft.rooms, tariffDraft.rows]);
  const guestName = liveBooking?.guest_name || guestDraft.guestName || "Walk-in Guest";
  const guestEmail = liveBooking?.guest_email || guestDraft.guestEmail || "-";
  const guestMobile = liveBooking?.mobile || guestDraft.mobile || "-";
  const checkIn = liveBooking?.check_in || guestDraft.checkIn || "-";
  const checkOut = liveBooking?.check_out || guestDraft.checkOut || "-";
  const paymentMode = liveBooking?.payment_mode || advanceDraft.paymentMode || "-";
  const remarks = liveBooking?.remarks || advanceDraft.notes || "-";
  const bookingPoint = guestDraft.bookingPoint || liveBooking?.booking_point || "-";
  const bookingStatus = liveBooking?.booking_status || guestDraft.bookingStatus || "Pending";
  const arrivalTime = liveBooking?.arrival || guestDraft.arrival || "-";
  const departureTime = liveBooking?.departure || guestDraft.departure || "-";
  const roomNumbers = rooms
    .map((room) => room.roomNo || room.name || "-")
    .filter(Boolean)
    .join(", ");

  const totalGuests = Object.values(paxDraft.paxData || {}).reduce(
    (sum, row) => sum + Number(row.adults || 0) + Number(row.children || 0),
    0,
  );

  if (!bookingId) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
          Booking data available nahi hai.
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Booking Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1,h2,h3,p { margin: 0; }
            .header { margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>${printRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleSubmitBooking = () => {
    clearBookingSession();
    navigate("/hotel/all-bookings");
  };

  const refreshBooking = async () => {
    if (!bookingId) return;
    const response = await API.get(`/hotel/full-booking/${bookingId}`);
    setLiveBooking(response.data || null);
  };

  const handleLifecycle = async (action) => {
    try {
      await API.put(`/hotel/${action}/${bookingId}`);
      alert(action === "check-out" ? "Guest checked out successfully." : "Guest checked in successfully.");
      pushDashboardNotification({
        title: action === "check-out" ? `Guest checked out - ${bookingRef}` : `Guest checked in - ${bookingRef}`,
        message: action === "check-out" ? "Booking history me move ho gaya." : "Guest stay active hai.",
        type: action === "check-out" ? "warning" : "success",
        route: action === "check-out" ? "/hotel/booking-history" : "/hotel/all-bookings",
      });
      if (action === "check-out") {
        clearBookingSession();
        navigate("/hotel/booking-history");
        return;
      }
      await refreshBooking();
    } catch (error) {
      console.error(error);
      alert(action === "check-out" ? "Check-out failed" : "Check-in failed");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fbff_0%,#f8fffc_45%,#fff9f2_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1e40af_55%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_60px_rgba(15,23,42,0.22)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
                Communication & Invoice
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Final booking summary ready for guest communication
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Yahan booking ki final invoice details, payment snapshot aur room
                summary ready format me show ho rahi hai.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-sky-100/80">
                  Booking ID
                </div>
                <div className="mt-2 text-2xl font-black">{bookingRef}</div>
              </div>
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-sky-100/80">
                  Guest Count
                </div>
                <div className="mt-2 text-2xl font-black">{totalGuests || 0}</div>
              </div>
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-sky-100/80">
                  Rooms
                </div>
                <div className="mt-2 text-2xl font-black">{rooms.length}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              handleLifecycle(
                String(bookingStatus || "").toLowerCase().includes("checked in") ? "check-out" : "check-in",
              )
            }
            className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            {String(bookingStatus || "").toLowerCase().includes("checked in") ? "Check Out" : "Check In"}
          </button>
          {!String(bookingStatus || "").toLowerCase().includes("checked in") ? (
            <BookingCancelAction
              bookingId={bookingId}
              bookingCode={bookingRef}
              buttonClassName="rounded-full"
            />
          ) : null}
          <button
            type="button"
            onClick={() => navigate(`/invoice/${bookingId}`)}
            className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Generate Invoice
          </button>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Final Invoice
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Booking billing preview
                </h2>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Print Invoice
              </button>
            </div>

            <div ref={printRef} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Guest Details
                  </div>
                  <div className="mt-3 text-xl font-black text-slate-900">
                    {guestName}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Mobile: {guestMobile}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Email: {guestEmail}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Check-In: {checkIn}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Check-Out: {checkOut}
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Payment Snapshot
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-blue-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-blue-700">
                        Total
                      </div>
                      <div className="mt-1 text-lg font-black text-blue-900">
                        {formatCurrency(totalAmount)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-emerald-700">
                        Paid
                      </div>
                      <div className="mt-1 text-lg font-black text-emerald-900">
                        {formatCurrency(paidAmount)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-amber-700">
                        Discount
                      </div>
                      <div className="mt-1 text-lg font-black text-amber-900">
                        {formatCurrency(discountAmount)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-orange-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-orange-700">
                        Remaining
                      </div>
                      <div className="mt-1 text-lg font-black text-orange-900">
                        {formatCurrency(remainingAmount)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    Payment Mode: {paymentMode}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Notes: {remarks}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[22px] border border-slate-200">
                <table className="min-w-full bg-white">
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
                    {rooms.map((room, index) => (
                      <tr
                        key={`${room.roomNo || room.name || index}-${index}`}
                        className="border-t border-slate-200"
                      >
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {room.roomNo || room.name || "-"}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {room.roomType || "-"}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {room.quantity || 1}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatCurrency(room.price || 0)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{room.gst || 0}%</td>
                        <td className="px-4 py-4 font-bold text-emerald-700">
                          {formatCurrency(room.total || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600">
                Communication Snapshot
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Guest-ready highlights
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-[20px] bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Booking Point
                  </div>
                  <div className="mt-1 font-bold text-slate-900">
                    {bookingPoint}
                  </div>
                </div>

                <div className="rounded-[20px] bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Mobile Number
                  </div>
                  <div className="mt-1 font-bold text-slate-900">
                    {guestMobile}
                  </div>
                </div>

                <div className="rounded-[20px] bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Room Numbers
                  </div>
                  <div className="mt-1 font-bold text-slate-900">
                    {roomNumbers || "-"}
                  </div>
                </div>

                <div className="rounded-[20px] bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Status
                  </div>
                  <div className="mt-1 font-bold text-slate-900">
                    {bookingStatus}
                  </div>
                </div>

                <div className="rounded-[20px] bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Arrival / Departure
                  </div>
                  <div className="mt-1 font-bold text-slate-900">
                    {arrivalTime} / {departureTime}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,#f8fdff_0%,#eff8ff_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                Actions
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-900">
                Next front-desk steps
              </h3>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleSubmitBooking}
                  className="rounded-full bg-gradient-to-r from-sky-600 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5"
                >
                  Submit Booking
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Print Invoice
                </button>
                <button
                  type="button"
                  onClick={handleSubmitBooking}
                  className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Open All Bookings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearBookingSession();
                    navigate("/hotel/guest", { state: { resetBookingDraft: true } });
                  }}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Start New Booking
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Communication;
