import React, { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";
import {
  clearBookingSession,
  getBookingDraft,
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
  bookingPoint: "Sumit Test (ID:53)",
  mobile: "",
  guestName: "",
  guestEmail: "",
  checkIn: "",
  checkOut: "",
  arrival: "12:00",
  departure: "10:00",
  bookingStatus: "",
};

const Guest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const today = todayISO();
  const [popup, setPopup] = useState({ open: false, type: "error", title: "", message: "" });
  const freshStart = Boolean(location.state?.resetBookingDraft);

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

      const res = await API.post("/hotel/guest", formData);

      console.log(res.data);

      const bookingId = res.data.bookingId;
      const bookingCode = res.data.bookingCode || "";
      setStoredBookingId(bookingId);
      setStoredBookingCode(bookingCode);
      setBookingDraft("guest", { ...formData, bookingCode });

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

  return (
    <div className="space-y-6">
      {popup.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-popup-title"
          aria-describedby="guest-popup-message"
          onClick={closePopup}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`flex items-start gap-4 bg-gradient-to-r ${modalToneClasses[popup.type].accent} px-6 py-5 text-white`}>
              <div className="rounded-2xl bg-white/15 p-3">
                {popup.type === "success" ? (
                  <FaCheckCircle className="text-xl" />
                ) : (
                  <FaExclamationTriangle className="text-xl" />
                )}
              </div>
              <div className="min-w-0 flex-1">
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
                className="rounded-full p-2 text-white/85 transition hover:bg-white/10 hover:text-white"
                aria-label="Close popup"
              >
                <FaTimes />
              </button>
            </div>

            <div className="px-6 py-6">
              <p id="guest-popup-message" className="text-sm leading-6 text-slate-600">
                {popup.message}
              </p>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closePopup}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#08253d_0%,#0e5b6a_52%,#0f3f67_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        
      </section>

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
                <select
                  name="bookingStatus"
                  value={formData.bookingStatus}
                  onChange={handleChange}
                  className={fieldCls}
                >
                  <option>Select</option>
                  <option>Confirmed</option>
                  <option>Pending</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              Quick Snapshot
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
        </div>
      </div>
    </div>
  );
};

export default Guest;
