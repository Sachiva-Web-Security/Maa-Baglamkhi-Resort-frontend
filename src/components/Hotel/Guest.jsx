import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import {
  getBookingDraft,
  setBookingDraft,
  setStoredBookingId,
} from "./bookingSession";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const labelCls =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

const Guest = () => {
  const navigate = useNavigate();








  const [formData, setFormData] = useState(
    getBookingDraft("guest") || {
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
    },
  );

  // ✅ SUBMIT FUNCTION (UPDATED)
  const handleSubmit = async () => {
    try {
      const res = await API.post("/hotel/guest", formData);

      console.log(res.data);

      const bookingId = res.data.bookingId;
      setStoredBookingId(bookingId);
      setBookingDraft("guest", formData);

      alert("Guest saved successfully");

      // ✅ bookingId next page को pass कर रहे हैं
      navigate("/hotel/other-booking", {
        state: { bookingId },
      });

    } catch (err) {
      console.error(err);
      alert("Error saving guest");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    const next = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };
    setFormData(next);
    setBookingDraft("guest", next);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#08253d_0%,#0e5b6a_52%,#0f3f67_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-200">
              Guest Details
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Start hotel booking with guest profile
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85">
              Guest information, arrival schedule aur booking status ko clean premium form me capture karein.
            </p>
          </div>

          <div className="space-y-3 rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                Booking Point
              </div>
              <div className="mt-1 text-lg font-black">
                {formData.bookingPoint || "Not selected"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                Guest Name
              </div>
              <div className="mt-1 text-lg font-black">
                {formData.guestName || "Walk-in Guest"}
              </div>
            </div>
          </div>
        </div>
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
