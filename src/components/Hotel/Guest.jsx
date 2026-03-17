import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const labelCls =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

const Guest = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
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
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  return (
    <div className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,#fafdff_0%,#ffffff_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
          Guest Details
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-900">
          Start hotel booking
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Guest information aur booking basics yahan se fill karein.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5">
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
                <label className={labelCls}>Booking Point</label>
                <select
                  name="bookingPoint"
                  value={formData.bookingPoint}
                  onChange={handleChange}
                  className={fieldCls}
                >
                  <option>Select</option>
                  <option>Booking.com (ID:16)</option>
                  <option>Go Ibibo (ID:15)</option>
                  <option>Make My Trip (ID:14)</option>
                  <option>Cleartrip (ID:17)</option>
                  <option>Sumit Test (ID:53)</option>
                </select>
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
                  placeholder="Type or select"
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
                  placeholder="Enter email"
                  className={fieldCls}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5">
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
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5">
            <div className="text-sm font-bold text-slate-900">Booking preview</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Guest</span>
                <span className="font-semibold text-slate-900">
                  {formData.guestName || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Booking Point</span>
                <span className="font-semibold text-slate-900">
                  {formData.bookingPoint || "--"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <span className="font-semibold text-slate-900">
                  {formData.bookingStatus || "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Stay Window</span>
                <span className="font-semibold text-slate-900">
                  {formData.checkIn || "--"} to {formData.checkOut || "--"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/hotel/other-booking")}
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
