import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../../api";
import BookingCancelAction from "./BookingCancelAction";
import {
  getBookingDraft,
  getStoredBookingCode,
  getStoredBookingId,
  setBookingDraft,
  setStoredBookingId,
} from "./bookingSession";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const labelCls =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

const Reference = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = location.state?.bookingId || getStoredBookingId();
  const bookingCode = location.state?.bookingCode || getStoredBookingCode();
  const bookingRef = bookingCode || bookingId;

  const [formData, setFormData] = useState(
    getBookingDraft("reference") || {
      guestType: "",
      guestNotes: "",
      internalNotes: "",
    },
  );

  useEffect(() => {
    if (bookingId) {
      setStoredBookingId(bookingId);
    }
  }, [bookingId]);

  const updateForm = (patch) => {
    const next = { ...formData, ...patch };
    setFormData(next);
    setBookingDraft("reference", next);
  };

  const handleSubmit = async () => {
    try {
      await API.post(`/hotel/reference/${bookingId}`, formData);
      setBookingDraft("reference", formData);
      navigate("/hotel/company", { state: { bookingId, bookingCode } });
    } catch (err) {
      console.error(err);
      alert("Error saving reference");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f6fbff_0%,#fcfff8_45%,#fff9f3_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
      

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="rounded-[26px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="grid gap-6">
              <div className="rounded-[24px] border border-slate-200/80 bg-white p-5">
                <div className="mb-4 text-lg font-bold text-slate-900">
                  Guest Classification
                </div>
                <div>
                  <label className={labelCls}>Guest Type</label>
                  <select
                    value={formData.guestType}
                    onChange={(e) => updateForm({ guestType: e.target.value })}
                    className={fieldCls}
                  >
                    <option value="">Select</option>
                    <option value="General">General</option>
                    <option value="VIP Guest">VIP Guest</option>
                    <option value="VVIP Guest">VVIP Guest</option>
                    <option value="Scanty Baggage">Scanty Baggage</option>
                  </select>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-white p-5">
                <div className="mb-4 text-lg font-bold text-slate-900">Notes</div>
                <div className="grid gap-4">
                  <div>
                    <label className={labelCls}>Guest Notes</label>
                    <textarea
                      rows={5}
                      value={formData.guestNotes}
                      onChange={(e) => updateForm({ guestNotes: e.target.value })}
                      placeholder="Preferences, requests, special arrangements..."
                      className={fieldCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Internal Notes</label>
                    <textarea
                      rows={5}
                      value={formData.internalNotes}
                      onChange={(e) => updateForm({ internalNotes: e.target.value })}
                      placeholder="Internal reminders for front desk or operations..."
                      className={fieldCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">
                Snapshot
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Booking ID</div>
                  <div className="mt-1 font-black text-slate-900">{bookingRef || "Pending"}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Guest Type</div>
                  <div className="mt-1 font-black text-slate-900">
                    {formData.guestType || "Not selected"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,#fdf9ff_0%,#f7f3ff_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="text-xl font-black text-slate-900">Move to Company</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
“Save guest classification and notes, then open the company section.”
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={handleSubmit}
                  className="inline-flex w-full items-center justify-center rounded-[22px] bg-gradient-to-r from-indigo-600 to-violet-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(99,102,241,0.24)] transition hover:-translate-y-0.5"
                >
                  Save & Next
                </button>
                <button
                  onClick={() => navigate("/hotel/other-booking")}
                  className="inline-flex w-full items-center justify-center rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Go Back
                </button>
                <BookingCancelAction
                  bookingId={bookingId}
                  bookingCode={bookingCode}
                  fullWidth
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Reference;
