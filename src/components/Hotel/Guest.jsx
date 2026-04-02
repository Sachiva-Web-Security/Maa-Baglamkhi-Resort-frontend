import React, { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";
import {
  clearBookingSession,
  getBookingDraft,
  getStoredBookingCode,
  getStoredBookingId,
  setBookingDraft,
  setStoredBookingId,
  setStoredBookingCode,
} from "./bookingSession";
import { todayISO } from "../Dashboard/stayoverUtils";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const labelCls =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

const isValidTime = (value) => /^\d{2}:\d{2}$/.test(value);

const isEarlierTime = (left, right) => {
  if (!isValidTime(left) || !isValidTime(right)) return false;
  return left < right;
};

const timeToMinutes = (value) => {
  if (!isValidTime(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const hasAtLeastOneHourGap = (arrival, departure) => {
  const arrivalMinutes = timeToMinutes(arrival);
  const departureMinutes = timeToMinutes(departure);

  if (arrivalMinutes === null || departureMinutes === null) return true;
  return departureMinutes - arrivalMinutes >= 60;
};

const modalToneClasses = {
  error: {
    accent: "from-rose-500 to-red-500",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  },
  success: {
    accent: "from-emerald-500 to-teal-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  },
};

const initialGuestForm = {
  agentBooking: false,
  bookingPoint: "",
  mobile: "",
  guestName: "",
  guestEmail: "",
  checkIn: "",
  checkOut: "",
  arrival: "12:00",
  departure: "10:00",
  bookingStatus: "Pending",
};

const Guest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const today = todayISO();
  const [popup, setPopup] = useState({ open: false, type: "error", title: "", message: "" });
  const [cancelFlowModal, setCancelFlowModal] = useState({ open: false, reason: "", submitting: false });
  const freshStart = Boolean(location.state?.resetBookingDraft);
  const activeBookingId = location.state?.bookingId || getStoredBookingId();
  const activeBookingCode = location.state?.bookingCode || getStoredBookingCode();

  const [formData, setFormData] = useState(() =>
    freshStart ? initialGuestForm : getBookingDraft("guest") || initialGuestForm,
  );

  useEffect(() => {
    if (!freshStart) return;

    clearBookingSession();
    setFormData(initialGuestForm);
  }, [freshStart]);

  const minCheckOutDate = useMemo(() => {
    if (formData.checkIn && formData.checkIn > today) return formData.checkIn;
    return today;
  }, [formData.checkIn, today]);

  const bookingStatusPreview = useMemo(() => {
    const hasCoreBookingData =
      Boolean(String(formData.mobile || "").trim()) &&
      Boolean(String(formData.guestName || "").trim()) &&
      Boolean(String(formData.checkIn || "").trim()) &&
      Boolean(String(formData.checkOut || "").trim());

    return hasCoreBookingData ? "Confirmed" : "Pending";
  }, [formData.mobile, formData.guestName, formData.checkIn, formData.checkOut]);

  useEffect(() => {
    setFormData((prev) => {
      const next = { ...prev };
      let changed = false;

      if (next.checkIn && next.checkIn < today) {
        next.checkIn = today;
        changed = true;
      }

      const safeCheckOutMin = next.checkIn && next.checkIn > today ? next.checkIn : today;
      if (next.checkOut && next.checkOut < safeCheckOutMin) {
        next.checkOut = safeCheckOutMin;
        changed = true;
      }

      if (next.arrival && next.departure && isEarlierTime(next.departure, next.arrival)) {
        next.departure = next.arrival;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [today]);

  useEffect(() => {
    if (!popup.open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setPopup((prev) => ({ ...prev, open: false }));
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [popup.open]);

  const showPopup = (type, title, message) => {
    setPopup({ open: true, type, title, message });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, open: false }));
  };

  // ✅ SUBMIT FUNCTION (UPDATED)
  const handleSubmit = async () => {
    try {
      if (!formData.checkIn) {
        showPopup("error", "Missing Check-in Date", "Please select a check-in date before continuing.");
        return;
      }

      if (formData.checkIn < today) {
        showPopup("error", "Invalid Check-in Date", "Check-in date cannot be in the past.");
        return;
      }

      if (!formData.checkOut) {
        showPopup("error", "Missing Check-out Date", "Please select a check-out date before continuing.");
        return;
      }

      if (formData.checkOut < minCheckOutDate) {
        showPopup("error", "Invalid Check-out Date", "Check-out date cannot be earlier than today or the check-in date.");
        return;
      }

      if (formData.arrival && formData.departure && isEarlierTime(formData.departure, formData.arrival)) {
        showPopup("error", "Invalid Time Range", "Expected departure cannot be earlier than expected arrival.");
        return;
      }

      if (
        formData.checkIn &&
        formData.checkOut &&
        formData.checkIn === formData.checkOut &&
        formData.arrival &&
        formData.departure &&
        !hasAtLeastOneHourGap(formData.arrival, formData.departure)
      ) {
        showPopup(
          "error",
          "Time Gap Required",
          "For the same date, expected departure must be at least 1 hour after expected arrival.",
        );
        return;
      }

      const payload = {
        ...formData,
        bookingStatus: "Confirmed",
      };

      const res = await API.post("/hotel/guest", payload);

      console.log(res.data);

      const bookingId = res.data.bookingId;
      const bookingCode = res.data.bookingCode || "";
      setStoredBookingId(bookingId);
      setStoredBookingCode(bookingCode);
      setBookingDraft("guest", { ...payload, bookingCode });

      showPopup("success", "Booking Saved", "Guest details have been saved successfully.");

      // ✅ bookingId next page को pass कर रहे हैं
      navigate("/hotel/other-booking", {
        state: { bookingId, bookingCode },
      });

    } catch (err) {
      console.error(err);
      showPopup("error", "Save Failed", "We could not save the guest details. Please try again.");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    const next = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "checkIn") {
      const safeCheckOutMin = value && value > today ? value : today;
      if (next.checkOut && next.checkOut < safeCheckOutMin) {
        next.checkOut = safeCheckOutMin;
      }
    }

    if (name === "arrival" && next.departure && isEarlierTime(next.departure, value)) {
      next.departure = value;
    }

    if (name === "departure" && next.arrival && isEarlierTime(value, next.arrival)) {
      next.departure = next.arrival;
    }

    setFormData(next);
    setBookingDraft("guest", next);
  };

  const handleCancelBookingFlow = async () => {
    const reason = String(cancelFlowModal.reason || "").trim();

    if (activeBookingId) {
      if (!reason) {
        showPopup("error", "Reason Required", "Please enter a cancellation reason before cancelling this saved booking.");
        return;
      }

      try {
        setCancelFlowModal((current) => ({ ...current, submitting: true }));
        await API.put(`/hotel/cancel/${activeBookingId}`, { reason });
        clearBookingSession();
        setFormData(initialGuestForm);
        setCancelFlowModal({ open: false, reason: "", submitting: false });
        navigate("/hotel/all-bookings");
        return;
      } catch (error) {
        console.error(error);
        setCancelFlowModal((current) => ({ ...current, submitting: false }));
        showPopup("error", "Cancellation Failed", error.response?.data?.message || "Booking cancel nahi ho paayi.");
        return;
      }
    }

    clearBookingSession();
    setFormData(initialGuestForm);
    setCancelFlowModal({ open: false, reason: "", submitting: false });
    navigate("/hotel/all-bookings");
  };

  return (
    <div className="space-y-6">
      {popup.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_rgba(15,23,42,0.72)_58%)] px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-popup-title"
          aria-describedby="guest-popup-message"
          onClick={closePopup}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`relative flex items-start gap-4 bg-gradient-to-r ${modalToneClasses[popup.type].accent} px-6 py-6 text-white`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_46%)]" />
              <div className="relative rounded-[20px] border border-white/20 bg-white/15 p-3 shadow-[0_12px_30px_rgba(255,255,255,0.08)]">
                {popup.type === "success" ? (
                  <FaCheckCircle className="text-xl" />
                ) : (
                  <FaExclamationTriangle className="text-xl" />
                )}
              </div>
              <div className="relative min-w-0 flex-1">
                <div className={`mb-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${modalToneClasses[popup.type].badge}`}>
                  {popup.type === "success" ? "Success" : "Validation Error"}
                </div>
                <h2 id="guest-popup-title" className="text-lg font-black leading-tight">
                  {popup.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePopup}
                className="relative rounded-full border border-white/15 p-2 text-white/85 transition hover:bg-white/10 hover:text-white"
                aria-label="Close popup"
              >
                <FaTimes />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Details
                </p>
                <p id="guest-popup-message" className="mt-2 text-sm leading-6 text-slate-600">
                  {popup.message}
                </p>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Review the information above and continue when you are ready.
              </p>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closePopup}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:from-slate-800 hover:to-slate-700"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="mb-4 text-lg font-bold text-slate-900">
              Guest Information
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Agent Booking
                  </div>
                  <div className="text-sm text-slate-500">
                    Toggle if booking is coming from external booking source.
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="agentBooking"
                  checked={formData.agentBooking}
                  onChange={handleChange}
                  className="h-5 w-5 accent-sky-600"
                />
              </div>

              

              <div>
                <label className={labelCls}>Mobile Number</label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  className={fieldCls}
                />
              </div>

              <div>
                <label className={labelCls}>Guest Name</label>
                <input
                  type="text"
                  name="guestName"
                  value={formData.guestName}
                  onChange={handleChange}
                  placeholder="enter your name "
                  className={fieldCls}
                />
              </div>

              <div>
                <label className={labelCls}>Guest Email</label>
                <input
                  type="email"
                  name="guestEmail"
                  value={formData.guestEmail}
                  onChange={handleChange}
                  placeholder="Enter your email "
                  className={fieldCls}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="mb-4 text-lg font-bold text-slate-900">
              Booking Details
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Check-In</label>
                <input
                  type="date"
                  name="checkIn"
                  value={formData.checkIn}
                  onChange={handleChange}
                  min={today}
                  className={fieldCls}
                />
              </div>

              <div>
                <label className={labelCls}>Check-Out</label>
                <input
                  type="date"
                  name="checkOut"
                  value={formData.checkOut}
                  onChange={handleChange}
                  min={minCheckOutDate}
                  className={fieldCls}
                />
              </div>

              <div>
                <label className={labelCls}>Expected Arrival</label>
                <input
                  type="time"
                  name="arrival"
                  value={formData.arrival}
                  onChange={handleChange}
                  className={fieldCls}
                />
              </div>

              <div>
                <label className={labelCls}>Expected Departure</label>
                <input
                  type="time"
                  name="departure"
                  value={formData.departure}
                  onChange={handleChange}
                  min={formData.arrival || undefined}
                  className={fieldCls}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Booking Status</label>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{bookingStatusPreview}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Booking save hone par status automatically confirmed ho jayega. Incomplete draft ko pending maana jayega.
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                        bookingStatusPreview === "Confirmed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {bookingStatusPreview}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              Quick Snapshot
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Booking Ref
              </div>
              <div className="mt-1 font-black text-slate-900">
                {activeBookingCode || activeBookingId || "Draft not saved"}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Mobile
                </div>
                <div className="mt-1 font-black text-slate-900">
                  {formData.mobile || "Not entered"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Stay Window
                </div>
                <div className="mt-1 font-black text-slate-900">
                  {formData.checkIn || "-"} to {formData.checkOut || "-"}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
          >
            Next Step
          </button>

          <button
            type="button"
            onClick={() => setCancelFlowModal({ open: true, reason: "", submitting: false })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
          >
            {activeBookingId ? "Cancel Booking" : "Discard Booking"}
          </button>
        </div>
      </div>

      {cancelFlowModal.open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.18),_rgba(15,23,42,0.78)_60%)] px-4 backdrop-blur-md"
          onClick={() => setCancelFlowModal({ open: false, reason: "", submitting: false })}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f8_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative flex items-start gap-4 bg-gradient-to-r from-rose-500 to-red-500 px-6 py-6 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_48%)]" />
              <div className="relative rounded-[20px] border border-white/20 bg-white/15 p-3 shadow-[0_12px_30px_rgba(255,255,255,0.08)]">
                <FaExclamationTriangle className="text-xl" />
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="mb-2 inline-flex rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-rose-700 ring-1 ring-rose-100">
                  {activeBookingId ? "Cancel Booking" : "Discard Draft"}
                </div>
                <h2 className="text-lg font-black leading-tight">
                  {activeBookingId
                    ? "Do you want to cancel this booking?"
                    : "Do you want to discard this draft booking?"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCancelFlowModal({ open: false, reason: "", submitting: false })}
                className="relative rounded-full border border-white/15 p-2 text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="rounded-[22px] border border-rose-100 bg-rose-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">
                  Action Summary
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                {activeBookingId
                  ? `Booking #${activeBookingCode || activeBookingId} will be cancelled and the assigned room will be released.`
                  : "The unsaved draft will be removed and the current booking flow will be closed."}
                </p>
              </div>

              {activeBookingId ? (
                <label className="mt-4 block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Cancellation Reason
                  </span>
                  <textarea
                    value={cancelFlowModal.reason}
                    onChange={(event) =>
                      setCancelFlowModal((current) => ({ ...current, reason: event.target.value }))
                    }
                    rows={4}
                    placeholder="Guest changed mind, wrong date, pricing issue..."
                    className={fieldCls}
                  />
                </label>
              ) : null}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelFlowModal({ open: false, reason: "", submitting: false })}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCancelBookingFlow}
                  disabled={cancelFlowModal.submitting}
                  className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(244,63,94,0.22)] transition hover:-translate-y-0.5 hover:from-rose-500 hover:to-red-500 ${
                    cancelFlowModal.submitting ? "cursor-not-allowed opacity-70" : ""
                  }`}
                >
                  {cancelFlowModal.submitting
                    ? activeBookingId
                      ? "Cancelling..."
                      : "Discarding..."
                    : activeBookingId
                      ? "Confirm Cancel"
                      : "Discard Booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Guest;
