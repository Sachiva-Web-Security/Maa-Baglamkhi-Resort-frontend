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

const Company = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = location.state?.bookingId || getStoredBookingId();
  const bookingCode = location.state?.bookingCode || getStoredBookingCode();
  const bookingRef = bookingCode || bookingId;

  const [formData, setFormData] = useState(
    getBookingDraft("company") || {
      companyName: "Direct Booking",
      gst: "",
    },
  );
  const [companies, setCompanies] = useState(["Direct Booking", "Tata", "Infosys", "Reliance"]);
  const [selectedCompany, setSelectedCompany] = useState(getBookingDraft("company")?.companyName || "Direct Booking");
  const [showInput, setShowInput] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bookingId) {
      setStoredBookingId(bookingId);
    }
  }, [bookingId]);

  const syncCompany = (companyName) => {
    const next = { ...formData, companyName };
    setFormData(next);
    setBookingDraft("company", next);
  };

  const handleAddCompany = () => {
    const trimmed = newCompany.trim();
    if (!trimmed) return;
    setCompanies((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setSelectedCompany(trimmed);
    syncCompany(trimmed);
    setNewCompany("");
    setShowInput(false);
  };

// company.jsx

const handleSubmit = async () => {
  if (isSubmitting) return;

  try {
    setIsSubmitting(true);
    const companyName = (formData.companyName || selectedCompany || "Direct Booking").trim() || "Direct Booking";
    const payload = {
      companyName,
      gst: formData.gst,
    };

    const next = { ...formData, companyName };
    setFormData(next);
    setBookingDraft("company", next);

    await API.post(`/hotel/company/${bookingId}`, payload);

    navigate("/hotel/room", { state: { bookingId, bookingCode } });

  } catch (err) {
    console.error("❌ FRONTEND ERROR:", err.response?.data || err);
    alert("Error saving company");
  } finally {
    setIsSubmitting(false);
  }
};

const handleSkip = () => {
  const next = {
    ...formData,
    companyName: formData.companyName || selectedCompany || "Direct Booking",
  };

  setFormData(next);
  setBookingDraft("company", next);
  navigate("/hotel/room", { state: { bookingId, bookingCode } });
};

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4fbff_0%,#fbfff8_42%,#fffaf1_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
      

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="rounded-[26px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5">
              <div className="mb-4 text-lg font-bold text-slate-900">Company Information</div>
              <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Booking Ref: <span className="font-black text-slate-900">{bookingRef || "Pending"}</span>
              </div>
              <div className="grid gap-4">
                <div>
                  <label className={labelCls}>Company Name</label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        syncCompany(e.target.value);
                      }}
                      className={fieldCls}
                    >
                      <option value="">Select</option>
                      {companies.map((company, index) => (
                        <option key={`${company}-${index}`} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowInput(true)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-sky-700 transition hover:bg-slate-100"
                    >
                      Add New
                    </button>
                  </div>
                </div>

                {showInput ? (
                  <div className="rounded-[20px] bg-slate-50 p-4">
                    <label className={labelCls}>New Company</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        placeholder="Enter company name"
                        className={fieldCls}
                      />
                      <button
                        onClick={handleAddCompany}
                        className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className={labelCls}>GSTIN</label>
                  <input
                    type="text"
                    value={formData.gst}
                    onChange={(e) => {
                      const next = { ...formData, gst: e.target.value };
                      setFormData(next);
                      setBookingDraft("company", next);
                    }}
                    placeholder="Enter GSTIN"
                    className={fieldCls}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
                Snapshot
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Selected Company
                  </div>
                  <div className="mt-1 font-black text-slate-900">
                    {formData.companyName || "Direct Booking"}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    GSTIN
                  </div>
                  <div className="mt-1 font-black text-slate-900">
                    {formData.gst || "Not added"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,#fffaf0_0%,#fff6e5_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="text-xl font-black text-slate-900">Go to Room Selection</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
              “After saving the company data, open the room inventory section.”
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-[22px] bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(245,158,11,0.24)] transition hover:-translate-y-0.5"
                >
                  {isSubmitting ? "Saving..." : "Save & Next"}
                </button>
                <button
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-white px-5 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Skip
                </button>
                <button
                  onClick={() => navigate("/hotel/reference")}
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

export default Company;
