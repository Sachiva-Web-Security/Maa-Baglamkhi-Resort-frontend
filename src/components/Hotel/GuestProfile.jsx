import React, { useCallback, useState } from "react";
import { HiOutlineEnvelope, HiOutlinePhone } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import API, { getBackendBaseURL } from "../../api";
import { setStoredBookingId } from "./bookingSession";

const formatCurrency = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const STATUS_COLORS = {
  Confirmed: "bg-blue-100 text-blue-700",
  "Checked In": "bg-emerald-100 text-emerald-700",
  "Checked Out": "bg-slate-100 text-slate-600",
  Cancelled: "bg-rose-100 text-rose-700",
};

const documentTypeLabels = {
  checkin_form: "Check-in Form",
  guest_photo: "Guest Photo",
  signature: "Signature",
  id_proof: "ID Proof",
};

const buildUploadUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${getBackendBaseURL()}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const GuestProfile = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    setProfile(null);
    setError("");

    try {
      const res = await API.get(`/hotel/guest-profile?q=${encodeURIComponent(q)}`);
      if (res.data && (res.data.guest || res.data.bookings?.length)) {
        setProfile(res.data);
      } else {
        setError("Koi guest nahi mila is mobile/naam ke sath. Naya booking karein.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const totalStats = React.useMemo(() => {
    if (!profile?.bookings?.length) {
      return { stays: 0, revenue: 0, nights: 0 };
    }

    return profile.bookings.reduce(
      (acc, b) => {
        acc.stays += 1;
        acc.revenue += Number(b.paidAmount || 0);

        if (b.check_in && b.check_out) {
          const diff = (new Date(b.check_out) - new Date(b.check_in)) / (1000 * 60 * 60 * 24);
          acc.nights += Math.max(Math.round(diff), 1);
        }

        return acc;
      },
      { stays: 0, revenue: 0, nights: 0 },
    );
  }, [profile]);

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.1),_transparent_30%),linear-gradient(135deg,#f8fbff_0%,#f0fdf4_50%,#fff8ef_100%)] p-4 sm:p-6">
      <div className="w-full space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,#052e16_0%,#166534_48%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_70px_rgba(15,23,42,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-200">
            Guest Intelligence
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Guest Profile & Stay History</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100/80">
            "Search by mobile number or name to view all of a guest&apos;s past stays, total spend,
            and booking patterns in one place."
          </p>
        </section>

        <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Search Guest by Mobile or Name
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="9876543210 ya 'Rahul Sharma'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 rounded-[20px] border border-slate-200 px-5 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="rounded-[20px] bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              Warning: {error}
            </p>
          )}
        </div>

        {profile && (
          <>
            <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-18 w-18 items-center justify-center rounded-[22px] bg-emerald-100 text-3xl font-black text-emerald-700">
                    {(profile.guest?.guest_name || "G").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">
                      {profile.guest?.guest_name || "-"}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <HiOutlinePhone className="text-lg text-emerald-600" />
                        {profile.guest?.mobile || "-"}
                      </span>
                      <span className="hidden text-slate-300 sm:inline">|</span>
                      <span className="inline-flex items-center gap-1.5">
                        <HiOutlineEnvelope className="text-lg text-violet-600" />
                        {profile.guest?.guest_email || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
                  <div className="rounded-[18px] bg-emerald-50 p-3 text-center">
                    <div className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                      Stays
                    </div>
                    <div className="mt-1 text-3xl font-black text-emerald-900">{totalStats.stays}</div>
                  </div>
                  <div className="rounded-[18px] bg-blue-50 p-3 text-center">
                    <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                      Nights
                    </div>
                    <div className="mt-1 text-3xl font-black text-blue-900">{totalStats.nights}</div>
                  </div>
                  <div className="rounded-[18px] bg-amber-50 p-3 text-center">
                    <div className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                      Total Spent
                    </div>
                    <div className="mt-1 text-2xl font-black text-amber-900">
                      {formatCurrency(totalStats.revenue)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Uploaded Documents ({profile.documents?.length || 0})
                  </h3>
                  <p className="mt-1 text-base text-slate-500">
                    Hardcopy check-in forms aur guest related images ab table format me available hain.
                  </p>
                </div>
              </div>

              {!profile.documents?.length ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-slate-400">
                  Is guest ke liye abhi koi uploaded document nahi mila.
                </p>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                          <th className="px-4 py-4">Preview</th>
                          <th className="px-4 py-4">Document Type</th>
                          <th className="px-4 py-4">Booking</th>
                          <th className="px-4 py-4">Uploaded On</th>
                          <th className="px-4 py-4">Terms</th>
                          <th className="px-4 py-4">Notes</th>
                          <th className="px-4 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.documents.map((document) => (
                          <tr
                            key={document.id}
                            className="border-t border-slate-200 align-middle text-base text-slate-700"
                          >
                            <td className="px-4 py-4">
                              <img
                                src={buildUploadUrl(document.file_url)}
                                alt={documentTypeLabels[document.document_type] || "Guest document"}
                                className="h-18 w-28 rounded-xl border border-slate-200 object-cover"
                              />
                            </td>
                            <td className="px-4 py-4 text-lg font-semibold text-slate-900">
                              {documentTypeLabels[document.document_type] || "Document"}
                            </td>
                            <td className="px-4 py-4 text-base text-slate-600">
                              {document.booking_code || `#${document.booking_id}`}
                            </td>
                            <td className="px-4 py-4 text-base text-slate-600">
                              {new Date(document.uploaded_at).toLocaleDateString("en-IN")}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] ${
                                  Number(document.terms_accepted)
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {Number(document.terms_accepted) ? "Accepted" : "Pending"}
                              </span>
                            </td>
                            <td className="max-w-[260px] px-4 py-4 text-base text-slate-600">
                              {document.notes || "--"}
                            </td>
                            <td className="px-4 py-4">
                              <a
                                href={buildUploadUrl(document.file_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                              >
                                View
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">
                  Stay History ({profile.bookings?.length || 0} bookings)
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/hotel/guest")}
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-base font-bold text-white transition hover:bg-emerald-700"
                >
                  + New Booking
                </button>
              </div>

              {!profile.bookings?.length ? (
                <p className="py-8 text-center text-slate-400">No past bookings found.</p>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                          <th className="px-4 py-4">Booking</th>
                          <th className="px-4 py-4">Rooms</th>
                          <th className="px-4 py-4">Stay Dates</th>
                          <th className="px-4 py-4">Status</th>
                          <th className="px-4 py-4">Paid</th>
                          <th className="px-4 py-4">Due</th>
                          <th className="px-4 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.bookings.map((b) => (
                          <tr
                            key={b.bookingId}
                            className="border-t border-slate-200 align-middle text-base text-slate-700"
                          >
                            <td className="px-4 py-4 text-lg font-black text-slate-900">#{b.bookingId}</td>
                            <td className="px-4 py-4 text-lg font-semibold text-slate-800">
                              {b.rooms || "Room not set"}
                            </td>
                            <td className="px-4 py-4 text-base text-slate-600">
                              {formatDate(b.check_in)} to {formatDate(b.check_out)}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                                  STATUS_COLORS[b.booking_status] || "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {b.booking_status || "Unknown"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-lg font-black text-emerald-700">
                              {formatCurrency(b.paidAmount)}
                            </td>
                            <td className="px-4 py-4 text-lg font-black text-rose-600">
                              {Number(b.remainingAmount) > 0
                                ? formatCurrency(b.remainingAmount)
                                : formatCurrency(0)}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setStoredBookingId(b.bookingId);
                                  navigate("/hotel/communication", {
                                    state: { bookingId: b.bookingId },
                                  });
                                }}
                                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!profile && !error && !searching && (
          <div className="rounded-[28px] border-2 border-dashed border-slate-200 py-16 text-center">
            <div className="text-4xl">Guest</div>
            <p className="mt-4 text-lg font-bold text-slate-500">Enter a guest mobile no.</p>
            <p className="mt-2 text-sm text-slate-400">
              "Past stays, total spend, and booking history will all be visible in one place."
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/hotel/all-bookings")}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Back to All Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestProfile;
