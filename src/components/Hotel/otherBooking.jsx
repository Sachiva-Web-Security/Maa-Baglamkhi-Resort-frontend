import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Select } from "antd";
import { GetCity, GetCountries, GetState } from "react-country-state-city";
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

const OtherBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = location.state?.bookingId || getStoredBookingId();
  const bookingCode = getStoredBookingCode();

  const [formData, setFormData] = useState(
    getBookingDraft("otherBooking") || {
      bookingType: "",
      bookingSource: "",
      bookingReference: "",
      address: "",
      country: "",
      state: "",
      city: "",
      pincode: "",
    },
  );
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    const loadCountries = async () => {
      const countriesData = await GetCountries();
      setCountries(
        countriesData.map((country) => ({
          label: country.name,
          value: country.id,
        })),
      );
    };

    loadCountries();
  }, []);

  useEffect(() => {
    if (bookingId) {
      setStoredBookingId(bookingId);
    }
  }, [bookingId]);

  const updateForm = (patch) => {
    const next = { ...formData, ...patch };
    setFormData(next);
    setBookingDraft("otherBooking", next);
  };

  const onCountrySelect = async (countryId, option) => {
    const statesData = await GetState(countryId);
    updateForm({ country: option.label, state: "", city: "" });
    setStates(
      statesData.map((state) => ({
        label: state.name,
        value: state.id,
        countryId,
      })),
    );
    setCities([]);
  };

  const onStateSelect = async (stateId, option) => {
    const citiesData = await GetCity(option.countryId, stateId);
    updateForm({ state: option.label, city: "" });
    setCities(
      citiesData.map((city) => ({
        label: city.name,
        value: city.name,
      })),
    );
  };

  const handleSubmit = async () => {
    try {
      await API.post(`/hotel/other-booking/${bookingId}`, formData);
      setBookingDraft("otherBooking", formData);
      navigate("/hotel/reference", { state: { bookingId, bookingCode } });
    } catch (err) {
      console.error(err);
      alert("Error saving other booking");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f5fbff_0%,#f8fff8_42%,#fffaf3_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#08253d_0%,#0e5b6a_55%,#0f3f67_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-center">
            

            <div className="space-y-3 rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                  Booking ID
                </div>
                <div className="mt-1 text-2xl font-black">{bookingCode || bookingId || "Pending"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                  Source
                </div>
                <div className="mt-1 text-lg font-bold">
                  {formData.bookingSource || "Not selected"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="rounded-[26px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="grid gap-6">
              <div className="rounded-[24px] border border-slate-200/80 bg-white p-5">
                <div className="mb-4 text-lg font-bold text-slate-900">
                  Booking Source Details
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Booking Type</label>
                    <select
                      value={formData.bookingType}
                      onChange={(e) => updateForm({ bookingType: e.target.value })}
                      className={fieldCls}
                    >
                      <option value="">Select</option>
                      <option value="Solo">Solo</option>
                      <option value="Family/Couple">Family/Couple</option>
                      <option value="FIT">FIT</option>
                      <option value="Group">Group</option>
                      <option value="Corporate">Corporate</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Booking Source</label>
                    <select
                      value={formData.bookingSource}
                      onChange={(e) => updateForm({ bookingSource: e.target.value })}
                      className={fieldCls}
                    >
                      <option value="">Select</option>
                      <option value="Front Office">Front Office</option>
                      <option value="Walk in">Walk in</option>
                    
                      <option value="Office">Office</option>
                      <option value="Go ibibo">Go ibibo</option>
                      <option value="Makemytrip">Makemytrip</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>Booking Reference</label>
                    <input
                      type="text"
                      value={formData.bookingReference}
                      onChange={(e) => updateForm({ bookingReference: e.target.value })}
                      placeholder="Enter booking reference"
                      className={fieldCls}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-white p-5">
                <div className="mb-4 text-lg font-bold text-slate-900">
                  Address Details
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Address</label>
                    <textarea
                      rows={4}
                      value={formData.address}
                      onChange={(e) => updateForm({ address: e.target.value })}
                      placeholder="Enter full address"
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Country</label>
                    <Select options={countries} 
                     showSearch
                    onChange={onCountrySelect}
                     placeholder="Select country"
                      className="w-full"
                   filterOption={(input, option) =>
  (option?.label ?? "")
    .toString()
    .toLowerCase()
    .includes(input.toLowerCase())
}
                      />
                  </div>

                  <div>
                    <label className={labelCls}>State</label>
                    <Select options={states} 
                     showSearch
                    onChange={onStateSelect} 
                    placeholder="Select state"
                     className="w-full" 
                 filterOption={(input, option) =>
  (option?.label ?? "")
    .toString()
    .toLowerCase()
    .includes(input.toLowerCase())
}
                     />
                  </div>

                  <div>
                    <label className={labelCls}>City</label>
                    <Select
                     showSearch
                      options={cities}
                      onChange={(value) => updateForm({ city: value })}
                      placeholder="Select city"
                      className="w-full"
                   filterOption={(input, option) =>
  (option?.label ?? "")
    .toString()
    .toLowerCase()
    .includes(input.toLowerCase())
}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>PIN Code</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => updateForm({ pincode: e.target.value })}
                      placeholder="Enter pin code"
                      className={fieldCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                Quick Summary
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Type</div>
                  <div className="mt-1 font-bold text-slate-900">
                    {formData.bookingType || "Not selected"}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Location</div>
                  <div className="mt-1 font-bold text-slate-900">
                    {[formData.city, formData.state, formData.country].filter(Boolean).join(", ") || "Pending"}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {formData.pincode ? `PIN Code: ${formData.pincode}` : "PIN Code pending"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,#f8fdff_0%,#eff8ff_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="mt-1 text-xl font-black text-slate-900">Continue Booking</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Source aur address details save karke next reference section par move karein.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={handleSubmit}
                  className="inline-flex w-full items-center justify-center rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
                >
                  Save & Next
                </button>
                <button
                  onClick={() => navigate("/hotel/guest", { state: { resetBookingDraft: true } })}
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

export default OtherBooking;
