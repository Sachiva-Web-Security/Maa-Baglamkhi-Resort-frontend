// src/components/Hotel/BookingFlow.jsx
//
// ✅ SINGLE-PAGE BOOKING MODULE
// -----------------------------------------------------------------------------
// This ONE file replaces the old multi-route wizard (Guest.jsx -> otherBooking.jsx
// -> Reference.jsx -> company.jsx -> Room.jsx -> Pax.jsx -> RoomTariff.jsx ->
// Advance.jsx -> Communication.jsx) plus AllBooking.jsx / EditBooking.jsx /
// BookingCancelAction.jsx / CollectPayment.jsx.
//
// Everything now lives in ONE component. Nothing here calls `navigate()` to move
// between booking steps — moving between "New Booking / Confirmed / All Bookings /
// Booking Details / Manage Booking" is just a local React state change (`view`),
// so the browser never leaves this page and no data is lost in transit.
//
// HOW TO WIRE THIS INTO YOUR ROUTER (see chat message for full explanation):
//   <Route path="/hotel"              element={<BookingFlow />} />
//   <Route path="/hotel/guest"        element={<BookingFlow />} />   // old link -> opens "New Booking"
//   <Route path="/hotel/all-bookings" element={<BookingFlow />} />   // old link -> opens "All Bookings"
// The component itself looks at the current pathname only ONCE, on first mount,
// to decide whether to land on the list or the form — after that, everything is
// internal state, so your existing Sidebar links keep working unchanged.
//
// -----------------------------------------------------------------------------
// UI PASS NOTES (this revision only touches presentation, not logic):
//  - One shared typographic scale (fieldCls / labelCls / sectionTitleCls / panelCls)
//    is now used everywhere, including inside "New Booking", so every section of
//    the page reads at the same, larger, premium size.
//  - One shared <Modal> primitive now powers the Toast, Cancel, Collect Payment
//    and Refund popups, so every popup shares the same width, radius, padding,
//    spacing and button sizing as the "Booking Confirmed" screen.
//  - Everything is responsive from 320px phones up to 4K, with no horizontal
//    scroll anywhere (tables scroll internally with a sticky header instead).
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaDownload,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle,
  FaPrint,
  FaEnvelope,
  FaCommentDots,
  FaListUl,
  FaUserPlus,
  FaCogs,
  FaSignInAlt,
  FaSignOutAlt,
  FaBan,
  FaMoneyBillWave,
  FaUndo,
  FaChevronLeft,
  FaChevronRight,
  FaBook,
  FaHistory,
  FaFileUpload,
  FaFileAlt,
  FaUsers,
  FaUserFriends,
  FaChartBar,
  FaChartLine,
  FaIdCard,
  FaDoorOpen,
  FaSync,
  FaArrowLeft,
} from "react-icons/fa";

import API, { getBackendBaseURL } from "../../api";
import { todayISO } from "../Dashboard/stayoverUtils";
import {
  setStoredBookingId,
  setStoredBookingCode,
} from "./bookingSession";
import FolioView from "./FolioView";
import GroupBooking from "./GroupBooking";
import OccupancyForecast from "./OccupancyForecast";
import GuestProfile from "./GuestProfile";
import Room from "./Room";
/* ─────────────────────────── shared style tokens ─────────────────────────── */
/* One scale, used everywhere on the page (list, form, confirmation, details,
   manage, modals) so typography, spacing and sizing never drift between
   sections. This matches the premium typography scale used on Guest Profile,
   Occupancy Forecast and Add Room:
     Hero Title   : 30px mobile / 36px tablet / 42px desktop
     Section Title: 24px mobile / 30px tablet / 34px desktop
     Card Title   : 22px mobile / 24px tablet / 28px desktop
     Labels       : 17px / weight 600 / dark slate
     Inputs / Dropdowns / Radio labels / Date-Time text: 17px / weight 500
     Placeholder text: 16px / weight 500 / light gray
     Table Header : 16px   Table Body: 17px
     Buttons / Pagination: 17px / weight 600
     Status Badges: 14px
     Modal Title  : 28px   Modal Content: 16-17px
*/

const fieldCls =
  "w-full h-[52px] sm:h-[54px] md:h-14 rounded-2xl border border-blue-200 bg-white px-4 sm:px-5 text-[17px] font-medium text-slate-800 shadow-sm transition-all duration-300 placeholder:text-base placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:shadow-lg outline-none";

const labelCls =
  "mb-2 block text-[17px] font-semibold text-slate-700";

const panelCls =
  `
rounded-[24px] sm:rounded-[30px]
bg-white
border
border-blue-100
p-5 sm:p-6 md:p-8 lg:p-10
shadow-xl
shadow-blue-100/60
transition-all
duration-300
w-full
max-w-full
overflow-hidden
`;

const sectionTitleCls =
  `
mb-5 sm:mb-6
flex
items-center
gap-3
border-b-2
border-blue-100
pb-3 sm:pb-4
text-2xl sm:text-3xl md:text-[34px]
font-bold
text-blue-900
leading-tight
`;

/* Card title scale (28/24/22) — used for the biggest heading inside a card
   (e.g. "New Booking" / "Edit Booking", "All Bookings"). */
const cardTitleCls =
  "text-[22px] sm:text-2xl md:text-[28px] font-bold text-slate-900 leading-tight";

/* Hero title scale (42/36/30) — used for the top-level page/screen heading,
   e.g. the "Booking Confirmed!" screen title. */
const heroTitleCls =
  "text-[30px] sm:text-4xl md:text-[42px] font-black text-slate-900 leading-tight";

/* Modal title scale (28px, all breakpoints) */
const modalTitleCls = "text-[28px] font-black leading-tight text-slate-900";

const btnBase =
  `
inline-flex
items-center
justify-center
gap-2
rounded-xl
px-5 sm:px-7 md:px-8
h-[52px]
sm:h-[54px]
md:h-14
text-[17px]
font-semibold
transition-all
duration-300
active:scale-[0.98]
disabled:opacity-50
disabled:cursor-not-allowed
disabled:hover:translate-y-0
disabled:active:scale-100
whitespace-nowrap
`;

const primaryBtn =
  `
${btnBase}
bg-gradient-to-r
from-blue-600
to-blue-700
text-white
shadow-xl
shadow-blue-200
hover:-translate-y-1
hover:shadow-2xl
hover:from-blue-700
hover:to-blue-800
`;

const ghostBtn =
  `
${btnBase}
border
border-blue-200
bg-white
text-blue-700
shadow-sm
hover:bg-blue-50
hover:border-blue-400
hover:-translate-y-0.5
`;

const dangerBtn =
  `
${btnBase}
border
border-red-200
bg-red-50
text-red-700
hover:bg-red-100
hover:-translate-y-0.5
`;

/* Compact "action pill" used inside table rows — icon + text label, same
   height/padding for every action so the row of buttons stays visually even.
   Blue & white premium theme, rounded-xl, shadow + hover lift, exactly like
   the primary/ghost/danger buttons elsewhere on the page — just sized to sit
   inline in a table cell. */
const rowActionBtn = (tone = "neutral") => {
  const toneCls =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300"
      : tone === "primary"
      ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300";
  return `
inline-flex
items-center
justify-center
gap-1.5
sm:gap-2
rounded-xl
border
px-3
sm:px-3.5
h-10
sm:h-11
text-[17px]
font-semibold
shadow-sm
transition-all
duration-300
hover:-translate-y-0.5
hover:shadow-md
active:scale-[0.98]
whitespace-nowrap
${toneCls}
`;
};

const softBtn = (active) =>
  `
inline-flex
items-center
justify-center
gap-2
rounded-2xl
px-4 sm:px-5
h-11
sm:h-12
text-[17px]
font-semibold
transition-all
duration-300
active:scale-[0.98]
${
active
?
"bg-blue-600 text-white border-blue-600 shadow-lg"
:
"bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
}
`;

const cardTileCls =
  "rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5";

/* ─────────────────────────── helpers ─────────────────────────── */

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const uid = () => Math.random().toString(36).slice(2, 9);

// Normalize a free-form room-type label into a comparable key:
//   "AC ROOM"     -> "AC ROOM"
//   "ac-room "    -> "AC ROOM"
//   " Deluxe "    -> "DELUXE"
// Used by the dashboard deep-link prefill to match the dashboard's roomType
// (e.g. "AC ROOM") against the real backend category names from /hotel/rooms/setup.
const normalizeRoomTypeName = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");

const DOCUMENT_TYPE_LABELS = {
  checkin_form: "Check-in Form",
  guest_photo: "Guest Photo",
  signature: "Signature",
  id_proof: "ID Proof",
};

// ── Hotel resort constants (used by all invoice renders) ────────────────
const RESORT_NAME_INVOICE = "Maa Baglamukhi Resort";
const RESORT_ADDRESS_LINE_1 = "Maa Baglamukhi Mandir Road, Hatkana";
const RESORT_ADDRESS_LINE_2 = "Agar Malwa-465445";
const RESORT_PHONE_INVOICE = "+91-957279272/73";
const RESORT_EMAIL_INVOICE = "maabaglamukhiresort@gmail.com";
const RESORT_GSTIN_INVOICE = "23AABCM1234A1Z5";
const RESORT_STATE_CODE_INVOICE = "Madhya Pradesh (23)";
const RESORT_STATE_SHORT_INVOICE = "23";
const RESORT_WEBSITE = "www.maabaglamukhiresort.com";

const toNumber = (value) => Number(value) || 0;

const formatTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
const buildUploadUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${getBackendBaseURL()}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const STATUS_STYLES = {
  confirmed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  "checked-in": "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  "checked-out": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};

const statusStyle = (status) => {
  const key = String(status || "").toLowerCase().trim();
  return STATUS_STYLES[key] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
};

const statusBadgeCls = (status) =>
  `inline-block rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-sm font-bold ${statusStyle(status)}`;

/* ─────────────────────────── shared modal primitive ─────────────────────────── */
/* Every popup on the page (Toast, Cancel Booking, Collect Payment, Refund) is
   built from this one component, so they all share the same width, radius,
   padding, spacing, and button sizing as the "Booking Confirmed" screen. */

const Modal = ({
  open,
  onClose,
  icon: Icon,
  iconTone = "bg-blue-500",
  title,
  children,
  actions,
  closeOnBackdrop = true,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="max-h-[90vh] w-full max-w-md sm:max-w-lg overflow-y-auto rounded-[24px] sm:rounded-[30px] border border-white/70 bg-white p-6 sm:p-8 md:p-10 shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        {(Icon || title) && (
          <div className="mb-4 flex items-start gap-4">
            {Icon && (
              <span
                className={`flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full ${iconTone} text-2xl sm:text-3xl text-white shadow-lg`}
              >
                <Icon />
              </span>
            )}
            {title && (
              <h3 className={`mt-1 ${modalTitleCls}`}>
                {title}
              </h3>
            )}
            <button
              onClick={onClose}
              className="ml-auto shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
              type="button"
            >
              <FaTimes />
            </button>
          </div>
        )}
        <div className="text-[17px] leading-relaxed text-slate-600">{children}</div>
        {actions && (
          <div className="mt-7 sm:mt-8 flex flex-wrap justify-end gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────── top flow bar (image-1 style) ─────────────────────────── */

const FLOW_STEPS = [
  {
    view: "form",
    num: 1,
    icon: FaUserPlus,
    title: "New Booking",
    desc: "Fill all booking details and create a new reservation",
  },
  {
    view: "confirmed",
    num: 2,
    icon: FaCheckCircle,
    title: "Booking Confirmed",
    desc: "Booking is confirmed and reference number generated",
  },
 
  {
    view: "details",
    num: 3,
    icon: FaEye,
    title: "Booking Details",
    desc: "View full details of any specific booking",
  },
  {
    view: "manage",
    num: 4,
    icon: FaCogs,
    title: "Manage Booking",
    desc: "Edit, Cancel, Check-in / Check-out or Update payment",
  },
    {
    view: "list",
    num: 5,
    icon: FaListUl,
    title: "All Bookings",
    desc: "View all bookings in a list with status and details",
  },
];

const FlowBar = ({ view, onJump }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-2 sm:flex-nowrap">
      {FLOW_STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.view === view;
        return (
          <React.Fragment key={step.view}>
            <button
              type="button"
              onClick={() => onJump(step.view)}
              className="group flex min-w-[104px] sm:min-w-[110px] flex-1 flex-col items-center gap-2 rounded-xl px-2 py-1 text-center transition hover:bg-slate-50"
              title={step.desc}
            >
              <span
                className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full text-lg sm:text-xl transition ${
                  isActive
                    ? "bg-sky-500 text-white shadow-[0_8px_18px_rgba(14,165,233,0.35)]"
                    : "bg-sky-50 text-sky-600 group-hover:bg-sky-100"
                }`}
              >
                <Icon />
              </span>
              <span className={`text-[17px] font-bold leading-snug ${isActive ? "text-sky-700" : "text-slate-700"}`}>
                {step.num}. {step.title}
              </span>
            </button>
            {idx < FLOW_STEPS.length - 1 && (
              <div className="hidden h-px flex-1 bg-slate-200 sm:block" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

/* ─────────────────────────── initial form shape ─────────────────────────── */

const emptyForm = () => ({
  bookingId: null,
  bookingCode: "",
  firstName: "",
  lastName: "",
  guestEmail: "",
  mobile: "",
  checkIn: "",
  checkOut: "",
  arrival: "12:00",
  departure: "12:00",
  bookingType: "Walk-In",
  referralBy: "",
  company: "",
  reference: "",
  roomCategory: "",
  noOfRooms: 1,
  guestCapacity: "",
  roomMobile: "",
  owner: "",
  address: "",
  rooms: [],
  comingFrom: "",
  goingTo: "",
  purposeOfVisit: "",
  pickupFrom: "",
  pickup: false,
  packageDetails: "",
  remarks: "",
  amount: "",
  paymentMode: "",
  paymentStatus: "",
  paidBy: "",
  paymentNote: "",
});

const rowTotal = (row, nights = 0) => {
  const base = Number(row.price || 0) * Number(nights || 0) * Number(row.quantity || 0);
  return base + (base * Number(row.gst || 0)) / 100;
};

// ─────────────────────────────────────────────────────────────────────────
// normalizeBooking
// -----------------------------------------------------------------------
// The "All Bookings" list renders straight off whatever `/hotel/all-bookings`
// returns (b.totalAmount, b.bookingType, b.rooms). The problem: different
// endpoints on the backend save/return these under different key names
// (snake_case vs camelCase, or a differently-named column altogether), so a
// freshly created booking can come back with e.g. `total_amount` instead of
// `totalAmount`, or `booking_type` instead of `bookingType` — the table then
// reads `undefined` and shows 0 / "-". This normalizer runs once, right
// after the list is fetched, and maps every alias we know the backend might
// use onto the single set of keys the rest of this file already expects
// (the same "try every alias" pattern already used for room numbers in
// extractRoomNumbersFromBooking / openEditBooking above).
const normalizeBooking = (b) => {
  if (!b || typeof b !== "object") return b;

  // ---- amount -------------------------------------------------------
  let totalAmount = Number(
    b.totalAmount ??
      b.total_amount ??
      b.grandTotal ??
      b.grand_total ??
      b.finalTotal ??
      b.final_total ??
      b.invoiceTotal ??
      b.invoice_total ??
      b.amount ??
      b.bookingAmount ??
      b.booking_amount ??
      0,
  );
  if (!Number.isFinite(totalAmount)) totalAmount = 0;

  // Nothing usable came back at all (0 / missing) — fall back to summing the
  // room/tariff rows if the backend included them on this row.
  if (!totalAmount && Array.isArray(b.rooms) && b.rooms.length) {
    totalAmount = b.rooms.reduce((sum, r) => {
      if (!r || typeof r !== "object") return sum;
      const rowT = Number(r.total ?? r.amount ?? 0);
      if (rowT) return sum + rowT;
      const tariff = Number(r.tariff ?? r.price ?? 0);
      const qty = Number(r.quantity ?? 1);
      const gst = Number(r.gst ?? r.gstPercent ?? 0);
      const base = tariff * qty;
      return sum + base + (base * gst) / 100;
    }, 0);
  }

  // ---- booking type ---------------------------------------------------
  const bookingType =
    b.bookingType ||
    b.booking_type ||
    b.bookingSource ||
    b.booking_source ||
    b.booking_Type ||
    b.type ||
    b.source ||
    "";

  // ---- rooms (keep string/array display-friendly, just fill in aliases) ---
  let rooms = b.rooms ?? b.room_numbers ?? b.roomNumbers ?? b.room_no ?? b.roomNo ?? "";
  if (Array.isArray(rooms)) {
    // Render-safe: turn an array of room objects/strings into a comma list,
    // same shape extractRoomNumbersFromBooking already expects elsewhere.
    rooms = rooms
      .map((r) => (typeof r === "string" ? r : r?.room_number || r?.roomNumber || r?.roomNo || r?.roomId || ""))
      .filter(Boolean)
      .join(", ");
  }

  return {
    ...b,
    totalAmount,
    bookingType,
    rooms,
  };
};

/* ─────────────────────────── main component ─────────────────────────── */

const FeatureModal = ({ title, subtitle, size = "max-w-6xl", onClose, children }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:px-6"
      onClick={onClose}
    >
      <div
        className={`relative max-h-[140vh] w-full ${size} overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <h3 className={modalTitleCls}>{title}</h3>
            {subtitle && <p className="mt-1 text-[17px] text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <FaTimes />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
};

const documentTypeOptions = [
  { value: "checkin_form", label: "Check-in Form" },
  { value: "guest_photo", label: "Guest Photo" },
  { value: "signature", label: "Signature" },
  { value: "id_proof", label: "ID Proof" },
];

const PaymentHistoryModal = ({ booking, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPaymentHistory = async () => {
    if (!booking?.bookingId) return;
    setLoading(true);
    try {
      const res = await API.get(`/hotel/payment-history/${booking.bookingId}`);
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load payment history:", err);
      alert("Could not load payment history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentHistory();
  }, [booking?.bookingId]);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  return (
    <FeatureModal
      title="Payment History"
      subtitle={`${booking?.guest_name || "Guest"} - ${booking?.bookingCode || `BK-${booking?.bookingId}`}`}
      size="max-w-4xl"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h3 className={cardTitleCls}>All Payment Transactions</h3>
          <button onClick={loadPaymentHistory} disabled={loading} className={ghostBtn}>
            <FaSync className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading payment history...</div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
            No payment history found for this booking.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[600px] text-left">
              <thead className="bg-slate-50 text-base font-bold uppercase text-slate-400">
                <tr>
                  <th className="px-4 sm:px-5 py-3">Date & Time</th>
                  <th className="px-4 sm:px-5 py-3">Type</th>
                  <th className="px-4 sm:px-5 py-3">Amount</th>
                  <th className="px-4 sm:px-5 py-3">Mode</th>
                  <th className="px-4 sm:px-5 py-3">Status</th>
                  <th className="px-4 sm:px-5 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[17px]">
                {history.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 sm:px-5 py-3 text-slate-700">{formatDate(payment.created_at)}</td>
                    <td className="px-4 sm:px-5 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${
                        payment.payment_type === "Advance" ? "bg-blue-50 text-blue-700" :
                        payment.payment_type === "Refund" ? "bg-amber-50 text-amber-700" :
                        "bg-emerald-50 text-emerald-700"
                      }`}>
                        {payment.payment_type || "Payment"}
                      </span>
                    </td>
                    <td className={`px-4 sm:px-5 py-3 font-bold ${
                      payment.payment_type === "Refund" ? "text-rose-600" : "text-emerald-600"
                    }`}>
                      {payment.payment_type === "Refund" ? "-" : "+"}{formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-slate-700">{payment.payment_mode || "-"}</td>
                    <td className="px-4 sm:px-5 py-3">
                      <span className={statusBadgeCls(payment.payment_status)}>
                        {payment.payment_status || "Pending"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-slate-600 font-mono text-[17px]">
                      {payment.transaction_id || payment.reference_id || "-"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                  <td className="px-4 sm:px-5 py-3 font-bold text-slate-800" colSpan={2}>Total</td>
                  <td className="px-4 sm:px-5 py-3 font-black text-xl text-slate-900">
                    {formatCurrency(history.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}
                  </td>
                  <td className="px-4 sm:px-5 py-3" colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-slate-200">
          <div className="text-[17px] text-slate-500">
            Showing {history.length} transaction{history.length !== 1 ? "s" : ""}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className={primaryBtn}>Close</button>
          </div>
        </div>
      </div>
    </FeatureModal>
  );
};

const DocumentUploadModal = ({ booking, onClose }) => {
  const bookingId = booking?.bookingId;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ documentType: "id_proof", notes: "", termsAccepted: true });
  const [file, setFile] = useState(null);

  const loadDocuments = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await API.get(`/hotel/guest-documents/${bookingId}`);
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleUpload = async () => {
    if (!file || !bookingId) return;
    const data = new FormData();
    data.append("document", file);
    data.append("documentType", form.documentType);
    data.append("notes", form.notes);
    data.append("termsAccepted", form.termsAccepted ? "true" : "false");
    data.append("uploadedBy", localStorage.getItem("name") || "Front Desk");

    setUploading(true);
    try {
      await API.post(`/hotel/guest-documents/${bookingId}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      setForm((prev) => ({ ...prev, notes: "" }));
      await loadDocuments();
    } catch (err) {
      alert(err.response?.data?.message || "Document upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm("Delete this document?")) return;
    await API.delete(`/hotel/guest-documents/${bookingId}/${documentId}`);
    await loadDocuments();
  };

  return (
    <FeatureModal
      title="Document Upload"
      subtitle={`${booking?.guest_name || "Guest"} - ${booking?.bookingCode || `BK-${bookingId}`}`}
      size="max-w-5xl"
      onClose={onClose}
    >
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <div className={sectionTitleCls}>Upload Guest Document</div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Document Type</label>
              <select
                className={fieldCls}
                value={form.documentType}
                onChange={(event) => setForm((prev) => ({ ...prev, documentType: event.target.value }))}
              >
                {documentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Image / PDF</label>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                className={fieldCls}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                rows={3}
                className={fieldCls}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Aadhaar, passport, signed check-in form..."
              />
            </div>
            <label className="flex items-center gap-2 text-[17px] font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(event) => setForm((prev) => ({ ...prev, termsAccepted: event.target.checked }))}
              />
              Guest consent / terms accepted
            </label>
            <button type="button" onClick={handleUpload} disabled={!file || uploading} className={primaryBtn}>
              <FaFileUpload className="text-xs" /> {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className={sectionTitleCls}>Uploaded Documents</div>
          {loading ? (
            <div className="py-10 text-center text-slate-400">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400">
              No documents uploaded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const url = buildUploadUrl(doc.file_url);
                const label = documentTypeOptions.find((item) => item.value === doc.document_type)?.label || doc.document_type;
                return (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div>
                      <div className="font-black text-slate-900">{label}</div>
                      <div className="mt-1 text-[17px] text-slate-500">{doc.notes || "No notes"} - {formatDate(doc.uploaded_at)}</div>
                    </div>
                    <div className="flex gap-2">
                      <a href={url} target="_blank" rel="noreferrer" className={ghostBtn}>
                        <FaEye className="text-xs" /> View
                      </a>
                      <button type="button" onClick={() => handleDelete(doc.id)} className={dangerBtn}>
                        <FaTrash className="text-xs" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </FeatureModal>
  );
};

const InvoiceModal = ({ booking, roomChargesTotal = 0, folioCharges = [], paidAmount = 0, onClose }) => {
  const bookingId = booking?.bookingId;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // {type:'success'|'error', message:string}

  const loadInvoice = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const existing = await API.get(`/invoice/by-booking/${bookingId}`);
      if (existing.data?.id) {
        setInvoice(existing.data);
      } else {
        const generated = await API.get(`/invoice/${bookingId}`);
        setInvoice(generated.data || null);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Invoice load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const folioChargesTotal = folioCharges.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  // Fallback total = Room Charges + Folio Charges, used only if the backend invoice
  // response doesn't already carry a computed total.
  const fallbackTotal = roomChargesTotal + folioChargesTotal;

  // Prefer real, itemized data from the backend invoice. If the backend hasn't
  // itemized folio charges yet, fall back to the live room + folio breakdown we
  // already fetched from /hotel/full-booking and /hotel/folio, so the invoice
  // always shows full detail instead of a single lump-sum line.
  const items = Array.isArray(invoice?.items) && invoice.items.length > 0
    ? invoice.items
    : [
        { name: "Room Charges", description: "Total room / tariff charges", quantity: 1, price: roomChargesTotal, total: roomChargesTotal },
        ...folioCharges.map((e) => ({
          name: e.category || "Extra Charge",
          description: e.description || "-",
          quantity: 1,
          price: e.amount,
          total: e.amount,
        })),
      ];

  const invoiceNo = invoice?.invoiceNo || invoice?.invoice_no || `INV-${bookingId}`;
  const guestName = invoice?.customerName || invoice?.customer_name || booking?.guest_name || "Guest";
  // IMPORTANT: prioritize the live Room + Folio total (fallbackTotal) over the backend's
  // stored invoice.totalAmount, because the stored value can be stale if folio charges
  // were added AFTER the invoice was last generated. Only fall back to the backend value
  // when we have no live breakdown to compute from at all.
  const invoiceTotal = fallbackTotal > 0 ? fallbackTotal : (invoice?.totalAmount || invoice?.final_total || booking?.totalAmount || 0);
  const paid = Number(paidAmount || invoice?.paidAmount || invoice?.paid_amount) || 0;
  // Remaining logic: if an advance has been paid, show Total - Paid (folio included);
  // if nothing has been paid yet, show the full actual Total (folio included).
  const remainingAmount = paid > 0 ? Math.max(invoiceTotal - paid, 0) : invoiceTotal;

  // ── Tax split (used by both Print + PDF) ─────────────────────────
  const invoiceSubtotal = toNumber(invoice?.subtotal) || invoiceTotal;
  const invoiceTax = toNumber(invoice?.tax) || 0;
  const invoiceSgst = invoiceTax / 2;
  const invoiceCgst = invoiceTax / 2;
  const invoiceDiscount = toNumber(invoice?.discount) || 0;

  const buildLines = () => [
    ["Invoice No", invoiceNo],
    ["Guest", guestName],
    ["Phone", invoice?.phone || booking?.mobile || "-"],
    ["Rooms", invoice?.roomNumber || invoice?.room_no || booking?.rooms || "-"],
    ["Stay", `${formatDate(invoice?.checkIn || invoice?.check_in || booking?.check_in)} to ${formatDate(invoice?.checkOut || invoice?.check_out || booking?.check_out)}`],
    ["Subtotal", formatCurrency(invoice?.subtotal)],
    ["GST", formatCurrency(invoice?.tax || invoice?.gst)],
    ["Discount", formatCurrency(invoice?.discount)],
    ["Total", formatCurrency(invoiceTotal)],
    ["Advance Paid", formatCurrency(paid)],
    ["Remaining / Balance Due", formatCurrency(remainingAmount)],
    ["Payment Status", invoice?.paymentStatus || invoice?.payment_status || (remainingAmount > 0 ? "Pending" : "Paid")],
  ];

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    win.document.write(`
      <html>
      <head>
        <title>${invoiceNo} - ${RESORT_NAME_INVOICE}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            padding: 28px;
            font-size: 13px;
            line-height: 1.5;
          }
          .resort-header {
            text-align: center;
            padding: 12px 0 10px;
            border-bottom: 2px solid #0f172a;
            margin-bottom: 4px;
          }
          .resort-header h1 { font-size: 20px; font-weight: 800; letter-spacing: 0.02em; }
          .resort-header .sub { font-size: 11px; color: #475569; margin-top: 2px; }
          .resort-header .meta { font-size: 10px; color: #64748b; margin-top: 2px; }
          .resort-header .gst-line { font-size: 10px; color: #475569; margin-top: 1px; }

          .invoice-meta {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #94a3b8;
            margin-bottom: 8px;
          }
          .invoice-meta .left { font-weight: 700; font-size: 14px; letter-spacing: 0.05em; }
          .invoice-meta .right { text-align: right; font-size: 12px; }
          .invoice-meta .right .label { color: #64748b; font-size: 10px; }

          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            margin-bottom: 8px;
          }
          .meta-card {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            font-size: 12px;
          }
          .meta-card .card-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #64748b;
            margin-bottom: 3px;
          }
          .meta-card .card-value { font-weight: 600; font-size: 12px; }
          .meta-card .card-sub { font-size: 11px; color: #475569; margin-top: 1px; }

          table.items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
          }
          table.items thead th {
            background: #0f172a;
            color: #ffffff;
            padding: 7px 10px;
            font-weight: 700;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          table.items tbody td {
            padding: 6px 10px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          .text-right { text-align: right; }

          .totals-area {
            display: grid;
            grid-template-columns: 1fr 160px;
            gap: 8px;
            margin-top: 8px;
          }
          .payment-info-box {
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            border-radius: 3px;
            font-size: 11px;
          }
          .payment-info-box .pi-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.08em;
            margin-bottom: 3px;
          }

          .totals-box {
            border: 1px solid #0f172a;
            background: #0f172a;
            color: #ffffff;
            padding: 10px 12px;
            border-radius: 3px;
          }
          .totals-box .t-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
            font-size: 11px;
          }
          .totals-box .t-row.grand {
            border-top: 1px solid rgba(255,255,255,0.25);
            margin-top: 5px;
            padding-top: 6px;
            font-size: 14px;
            font-weight: 800;
          }
          .totals-box .t-row .t-label { color: #cbd5e1; }
          .totals-box .t-row.grand .t-label { color: #ffffff; }

          .bank-box {
            margin-top: 8px;
            border: 1px solid #e2e8f0;
            padding: 7px 10px;
            border-radius: 3px;
            font-size: 10px;
          }
          .bank-box .b-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
          }

          .footer-area {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
          }
          .sig-line {
            margin-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .sig-box {
            text-align: right;
          }
          .sig-line-text {
            display: inline-block;
            border-top: 1px solid #0f172a;
            padding-top: 3px;
            min-width: 120px;
            font-size: 10px;
            font-weight: 600;
            color: #334155;
          }
        </style>
      </head>
      <body>
        <!-- Resort Header -->
        <div class="resort-header">
          <h1>${RESORT_NAME_INVOICE}</h1>
          <div class="sub">${RESORT_ADDRESS_LINE_1} | ${RESORT_ADDRESS_LINE_2}</div>
          <div class="meta">Ph: ${RESORT_PHONE_INVOICE} | Email: ${RESORT_EMAIL_INVOICE} | ${RESORT_WEBSITE || ""}</div>
          <div class="gst-line">GSTIN: ${RESORT_GSTIN_INVOICE} | State: ${RESORT_STATE_CODE_INVOICE}</div>
        </div>

        <!-- Invoice Meta Bar -->
        <div class="invoice-meta">
          <div class="left">TAX INVOICE</div>
          <div class="right">
            <div class="label">Invoice No</div>
            <div style="font-weight:700;font-size:13px">${invoiceNo}</div>
          </div>
          <div class="right">
            <div class="label">Date</div>
            <div style="font-weight:600">${formatDate(invoice?.date || new Date())}</div>
          </div>
          <div class="right">
            <div class="label">Table / Room</div>
            <div style="font-weight:600">${invoice?.roomNumber || (invoice?.bookingId ? "ROOM-" + invoice.bookingId : "-")}</div>
          </div>
        </div>

        <!-- Bill To + Stay Details -->
        <div class="meta-grid">
          <div class="meta-card">
            <div class="card-label">Bill To</div>
            <div class="card-value">${invoice?.customerName || guestName || "Guest"}</div>
            <div class="card-sub">Phone: ${invoice?.phone || booking?.mobile || "-"}</div>
            <div class="card-sub">Booking ID: ${invoice?.bookingId || "-"}</div>
          </div>
          <div class="meta-card">
            <div class="card-label">Stay Details</div>
            <div class="card-sub">Room: <strong>${invoice?.roomNumber || "-"}</strong></div>
            <div class="card-sub">Check-In: ${formatDate(invoice?.checkIn || invoice?.check_in || booking?.check_in)}</div>
            <div class="card-sub">Check-Out: ${formatDate(invoice?.checkOut || invoice?.check_out || booking?.check_out)}</div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items">
          <thead>
            <tr>
              <th style="width:38%">Description</th>
              <th style="width:10%;text-align:center">Qty</th>
              <th style="width:22%;text-align:right">Rate</th>
              <th style="width:22%;text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td>
                  <div style="font-weight:600">${item.name || item.description || "Item"}</div>
                  ${item.category ? `<div style="font-size:10px;color:#64748b">${item.category}</div>` : ""}
                </td>
                <td style="text-align:center">${item.quantity || 1}</td>
                <td class="text-right">${formatCurrency(item.price)}</td>
                <td class="text-right" style="font-weight:700">${formatCurrency(item.total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- Totals + Payment -->
        <div class="totals-area">
          <div class="payment-info-box">
            <div class="pi-label">Payment Summary</div>
            <div style="margin-top:3px">Status: <strong>${invoice?.paymentStatus || invoice?.payment_status || (remainingAmount > 0 ? "Pending" : "Paid")}</strong></div>
            <div>Mode: ${invoice?.paymentMode || invoice?.payment_method || "Front Desk"}</div>
            ${invoice?.paymentReference ? `<div>Reference: ${invoice.paymentReference}</div>` : ""}
            <div style="margin-top:4px;font-size:9px;color:#64748b;font-style:italic">Invoice issued under section 31 of CGST Act, 2017</div>
          </div>
          <div class="totals-box">
            <div class="t-row"><span class="t-label">Subtotal</span><span>${formatCurrency(invoiceSubtotal)}</span></div>
            <div class="t-row"><span class="t-label">SGST @ 2.5%</span><span>${formatCurrency(invoiceSgst)}</span></div>
            <div class="t-row"><span class="t-label">CGST @ 2.5%</span><span>${formatCurrency(invoiceCgst)}</span></div>
            ${invoiceDiscount > 0 ? `<div class="t-row"><span class="t-label">Discount</span><span>- ${formatCurrency(invoiceDiscount)}</span></div>` : ""}
            <div class="t-row grand"><span class="t-label">GRAND TOTAL</span><span>${formatCurrency(invoiceTotal)}</span></div>
            <div class="t-row" style="margin-top:3px"><span class="t-label" style="font-size:9px">(inclusive of all taxes)</span><span></span></div>
          </div>
        </div>

        <!-- Bank Details -->
        <div class="bank-box">
          <div class="b-label">Bank Details (for refund / credit)</div>
          <div style="margin-top:2px;color:#334155">A/C: 1234567890 | IFSC: SBIN0001234 | Bank: SBI | Branch: Baglamukhi</div>
        </div>

        <!-- Footer + Signature -->
        <div class="footer-area">
          <div>
            <div style="font-style:italic">This is a computer generated invoice. No physical signature required.</div>
            <div style="margin-top:2px">Thank you for staying with ${RESORT_NAME_INVOICE}.</div>
          </div>
          <div>For ${RESORT_NAME_INVOICE}</div>
        </div>
        <div class="sig-line">
          <div style="font-size:9px;color:#94a3b8">Generated: ${formatDate(new Date())} ${formatTime(new Date())}</div>
          <div class="sig-box">
            <div class="sig-line-text">Authorized Signatory</div>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownloadPdf = () => {
    if (!invoice) return;

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const rightEdge = pageWidth - margin;
    const center = pageWidth / 2;
    let y = margin;

    const ensureSpace = (needed) => {
      if (y + needed <= pageHeight - margin) return;
      doc.addPage();
      y = margin;
    };

    // ── Resort Header ────────────────────────────────────────────
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(RESORT_NAME_INVOICE, center, y + 9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${RESORT_ADDRESS_LINE_1}  |  ${RESORT_ADDRESS_LINE_2}`, center, y + 14, { align: "center" });
    doc.text(`Ph: ${RESORT_PHONE_INVOICE}  |  ${RESORT_EMAIL_INVOICE}`, center, y + 18, { align: "center" });
    doc.text(`GSTIN: ${RESORT_GSTIN_INVOICE}  |  State: ${RESORT_STATE_CODE_INVOICE}`, center, y + 22, { align: "center" });

    y = 32;
    doc.setTextColor(15, 23, 42);

    // ── Tax Invoice Title Bar ─────────────────────────────────────
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TAX INVOICE", margin + 3, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`#${invoiceNo}`, center, y + 5.5, { align: "center" });
    doc.text(`Date: ${formatDate(invoice?.date || new Date())}`, rightEdge - 3, y + 5.5, { align: "right" });
    y += 12;

    // ── Bill To + Stay Details ────────────────────────────────────
    const cardW = (pageWidth - margin * 2 - 6) / 2;
    const cardH = 24;

    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, cardW, cardH, 1.5, 1.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("BILL TO", margin + 3, y + 4.5);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(invoice?.customerName || guestName || "Guest", margin + 3, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Phone: ${invoice?.phone || booking?.mobile || "-"}`, margin + 3, y + 15);
    doc.text(`Booking ID: ${invoice?.bookingId || "-"}`, margin + 3, y + 19);
    doc.text(`Guest Email: ${invoice?.customerEmail || invoice?.guestEmail || booking?.guest_email || "-"}`, margin + 3, y + 23);

    const rightX = margin + cardW + 6;
    doc.roundedRect(rightX, y, cardW, cardH, 1.5, 1.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("STAY DETAILS", rightX + 3, y + 4.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Room: ${invoice?.roomNumber || "-"}`, rightX + 3, y + 10);
    doc.text(`Check-In: ${formatDate(invoice?.checkIn || invoice?.check_in || booking?.check_in)}`, rightX + 3, y + 15);
    doc.text(`Check-Out: ${formatDate(invoice?.checkOut || invoice?.check_out || booking?.check_out)}`, rightX + 3, y + 19);
    doc.text(`Payment Mode: ${invoice?.paymentMode || invoice?.payment_method || "Front Desk"}`, rightX + 3, y + 23);
    y += cardH + 4;

    // ── Items Table ───────────────────────────────────────────────
    const colX = [margin + 2, margin + 50, margin + 120, margin + 145, rightEdge - 3];
    const headerRow = ["#", "Description", "Qty", "Rate", "Amount"];

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    headerRow.forEach((label, i) => {
      doc.text(label, colX[i], y + 5);
    });
    y += 7;

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    items.forEach((item, index) => {
      const nameLines = doc.splitTextToSize(String(item.name || item.description || "Charge"), colX[2] - colX[1] - 2);
      const rowH = Math.max(7, nameLines.length * 4 + 2);
      ensureSpace(rowH + 3);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, y, rightEdge, y);
      y += 1.5;

      doc.text(String(index + 1), colX[0], y + 3.5);
      doc.text(nameLines, colX[1], y + 3.5);
      doc.text(String(item.quantity || 1), colX[2], y + 3.5, { align: "center" });
      doc.text(formatCurrency(item.price), colX[3], y + 3.5, { align: "right" });
      doc.text(formatCurrency(item.total), colX[4], y + 3.5, { align: "right" });
      y += rowH;
    });

    y += 1;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(margin, y, rightEdge, y);
    y += 4;

    // ── Totals + Payment Info ─────────────────────────────────────
    ensureSpace(42);
    const totalsW = 72;
    const totalsX = rightEdge - totalsW;

    // Payment info on left
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    doc.text("Payment Summary", margin, y);
    doc.setFontSize(8);
    doc.text(`Status: ${invoice?.paymentStatus || invoice?.payment_status || (remainingAmount > 0 ? "Pending" : "Paid")}`, margin, y + 5);
    doc.text(`Mode: ${invoice?.paymentMode || invoice?.payment_method || "Front Desk"}`, margin, y + 10);
    if (invoice?.paymentReference) {
      doc.text(`Ref: ${invoice.paymentReference}`, margin, y + 15);
    }
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Invoice issued u/s 31 of CGST Act, 2017", margin, y + 20);

    // Totals box on right
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(totalsX, y, totalsW, 34, 1.5, 1.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    const tx = totalsX + 4;
    const tv = rightEdge - 4;

    doc.text("Subtotal", tx, y + 6);
    doc.text(formatCurrency(invoiceSubtotal), tv, y + 6, { align: "right" });

    doc.text(`SGST @ 2.5%`, tx, y + 11);
    doc.text(formatCurrency(invoiceSgst), tv, y + 11, { align: "right" });

    doc.text(`CGST @ 2.5%`, tx, y + 16);
    doc.text(formatCurrency(invoiceCgst), tv, y + 16, { align: "right" });

    if (invoiceDiscount > 0) {
      doc.text("Discount", tx, y + 21);
      doc.text(`- ${formatCurrency(invoiceDiscount)}`, tv, y + 21, { align: "right" });
    }

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(tx, y + (invoiceDiscount > 0 ? 26 : 23), tv, y + (invoiceDiscount > 0 ? 26 : 23));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("GRAND TOTAL", tx, y + (invoiceDiscount > 0 ? 31 : 28));
    doc.text(formatCurrency(invoiceTotal), tv, y + (invoiceDiscount > 0 ? 31 : 28), { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text("(inclusive of all taxes)", tv, y + (invoiceDiscount > 0 ? 34 : 31), { align: "right" });

    y += 40;

    // ── Bank Details ──────────────────────────────────────────────
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Bank Details (for refund / credit):", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("A/C: 1234567890  |  IFSC: SBIN0001234  |  Bank: SBI  |  Branch: Baglamukhi", margin, y + 5);

    y += 12;

    // ── Footer + Signature ────────────────────────────────────────
    ensureSpace(16);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, rightEdge, y);
    y += 4;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("This is a computer generated invoice. No physical signature required.", margin, y);
    doc.text(`Generated: ${formatDate(new Date())} ${formatTime(new Date())}`, rightEdge, y, { align: "right" });

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(`Thank you for staying with ${RESORT_NAME_INVOICE}.`, margin, y);

    // Signature line
    const sigX = rightEdge - 50;
    doc.setDrawColor(15, 23, 42);
    doc.line(sigX, y + 8, rightEdge, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Authorized Signatory", rightEdge, y + 12, { align: "right" });
    doc.text(`For ${RESORT_NAME_INVOICE}`, rightEdge, y + 16, { align: "right" });

    doc.save(`${invoiceNo}.pdf`);
  };

  // ── Send invoice via WhatsApp + SMS to customer AND admin ────
  const handleSendNotification = async () => {
    if (!bookingId || !invoice) {
      setSendStatus({ type: "error", message: "Invoice not ready yet. Please wait or Regenerate." });
      return;
    }
    setSending(true);
    setSendStatus(null);
    console.group("[Invoice] Send WhatsApp + SMS", { bookingId, invoiceNo: invoice?.invoiceNo });
    try {
      // Step 0: resolve the admin phone — try multiple sources in order
      let adminNumber = "";

      // a) localStorage (set during login)
      const localStoragePhone = localStorage.getItem("phone") || "";
      console.log("[Invoice] localStorage phone:", localStoragePhone || "(empty)");
      if (localStoragePhone) {
        adminNumber = localStoragePhone;
      }

      // b) API profile endpoint
      if (!adminNumber) {
        try {
          const meRes = await API.get("/users/me");
          adminNumber = meRes.data?.phone || meRes.data?.user?.phone || "";
          console.log("[Invoice] /users/me phone:", adminNumber || "(empty)", "full response:", meRes.data);
        } catch (err) {
          console.warn("[Invoice] /users/me failed:", err.message);
        }
      }

      console.log("[Invoice] Final adminNumber to send:", adminNumber || "(empty — backend will DB-fallback)");

      // c) Fallback to the env-defined ADMIN_WHATSAPP_NUMBER baked at build time.
      //    Ensures the admin still gets notified even when no one's filled in
      //    their Profile phone yet.
      if (!adminNumber) {
        const envAdmin =
          (import.meta && import.meta.env && import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER) || "";
        if (envAdmin) {
          adminNumber = envAdmin;
          console.log("[Invoice] using VITE_ADMIN_WHATSAPP_NUMBER from env:", envAdmin);
        }
      }

      console.log("[Invoice] Final adminNumber to send:", adminNumber || "(empty — backend will DB-fallback)");

      // Step 1: send to both customer and admin
      const payload = {
        adminNumber,
        customerNumber: invoice?.phone || booking?.mobile || "",
      };
      console.log("[Invoice] POST payload:", payload);

      const pdfRes = await API.post(`/hotel/invoice/send-whatsapp/${bookingId}`, payload);
      console.log("[Invoice] API response status:", pdfRes.status);
      const data = pdfRes.data || {};
      console.log("[Invoice] API response data:", JSON.stringify(data, null, 2));

      const customerWa  = data?.customer?.whatsapp;
      const customerSms = data?.customer?.sms;
      const adminWa     = data?.admin?.whatsapp;
      const adminSms    = data?.admin?.sms;

      console.log("[Invoice] customer.wa:", customerWa);
      console.log("[Invoice] customer.sms:", customerSms);
      console.log("[Invoice] admin.wa:", adminWa);
      console.log("[Invoice] admin.sms:", adminSms);

      const channels = [];
      if (customerWa?.ok)  channels.push("customer WhatsApp");
      if (customerSms?.ok) channels.push("customer SMS");
      if (adminWa?.ok)     channels.push("admin WhatsApp");
      if (adminSms?.ok)    channels.push("admin SMS");

      const skipped = [];
      if (customerWa?.skipped)  skipped.push(`customer WhatsApp (${customerWa.reason || "no number"})`);
      if (customerSms?.skipped) skipped.push(`customer SMS (${customerSms.reason || "no number"})`);
      if (adminWa?.skipped)     skipped.push(`admin WhatsApp (${adminWa.reason || "no number"})`);
      if (adminSms?.skipped)    skipped.push(`admin SMS (${adminSms.reason || "no number"})`);

      console.log("[Invoice] Channels succeeded:", channels);
      console.log("[Invoice] Channels skipped:", skipped);
      console.groupEnd();

      if (channels.length > 0) {
        setSendStatus({
          type: "success",
          message: `Invoice sent via: ${channels.join(", ")}${skipped.length ? ". Skipped: " + skipped.join(", ") : ""}`,
        });
      } else {
        const adminSkip = skipped.find((s) => s.startsWith("admin"));
        if (adminSkip) {
          setSendStatus({
            type: "error",
            message: `Could not send. ${adminSkip}. Go to Profile and set your phone number.`,
          });
        } else {
          setSendStatus({
            type: "error",
            message: `Could not send. Skipped: ${skipped.join(", ")}`,
          });
        }
      }
    } catch (err) {
      console.error("[Invoice] Send failed:", err);
      console.groupEnd();
      setSendStatus({
        type: "error",
        message: err.response?.data?.error || err.message || "Send failed",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <FeatureModal
      title="Invoice"
      subtitle={`${guestName} - ${booking?.bookingCode || `BK-${bookingId}`}`}
      size="max-w-5xl"
      onClose={onClose}
    >
      {loading ? (
        <div className="py-16 text-center text-slate-400">Preparing invoice...</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-500">Invoice Actions:</span>
              {sendStatus ? (
                <div
                  className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                    sendStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  }`}
                >
                  {sendStatus.message}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleSendNotification} disabled={sending || loading || !invoice} className={`${primaryBtn} bg-gradient-to-r from-emerald-600 to-teal-500`}>
                <FaCommentDots className="text-xs" />
                {sending ? "Sending..." : "Send WhatsApp + SMS"}
              </button>
              <button type="button" onClick={loadInvoice} className={ghostBtn}>Regenerate</button>
              <button type="button" onClick={handlePrint} className={ghostBtn}><FaPrint className="text-xs" /> Print</button>
              <button type="button" onClick={handleDownloadPdf} className={primaryBtn}><FaDownload className="text-xs" /> PDF</button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-sm font-bold uppercase text-slate-400">Invoice No</div>
                <div className="text-2xl font-black text-slate-900">{invoiceNo}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold uppercase text-slate-400">Total</div>
                <div className="text-3xl font-black text-emerald-600">{formatCurrency(invoiceTotal)}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {buildLines().slice(1, 6).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-slate-50 p-3">
                  <div className="text-sm font-bold uppercase text-slate-400">{key}</div>
                  <div className="font-bold text-slate-800">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[560px] text-left text-[17px]">
                <thead className="bg-slate-50 text-base font-bold uppercase text-slate-400">
                  <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.name || item.description || "Item"}</td>
                      <td className="px-4 py-3">{item.quantity || 1}</td>
                      <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-right font-black">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </FeatureModal>
  );
};

const BookingFlow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const today = todayISO();

  // Pull any room prefill data the dashboard may have passed along.
  // Accepts both router state (location.state) and URL query params (?roomNo=..&roomType=..)
  // so links from anywhere (preview modal, query string, future email/SMS deep-links)
  // all land on a ready-to-go booking form with the room already locked in.
  const prefillRoomNumber =
    (location.state && (location.state.roomNumber || location.state.roomNo)) ||
    searchParams.get("roomNo") ||
    searchParams.get("roomNumber") ||
    "";
  const prefillCategory =
    (location.state && (location.state.category || location.state.roomType)) ||
    searchParams.get("roomType") ||
    searchParams.get("category") ||
    "";
  const prefillCheckIn =
    (location.state && location.state.checkIn) || searchParams.get("checkIn") || today;
  const prefillCheckOut =
    (location.state && location.state.checkOut) || searchParams.get("checkOut") || "";
  const shouldResetDraft =
    (location.state && location.state.resetBookingDraft) || searchParams.get("reset") === "true";

  // "view" controls which screen of the flow we're on — this is the ONLY thing
  // that changes when the user moves between steps. No route change happens.
  const [view, setView] = useState(() =>
    location.pathname.includes("guest") ? "form" : "list",
  );
  const [isEdit, setIsEdit] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [categorySetup, setCategorySetup] = useState([]);

  const [selectedBooking, setSelectedBooking] = useState(null); // row from list
  const [bookingDetail, setBookingDetail] = useState(null); // full detail payload
  const [detailLoading, setDetailLoading] = useState(false);
  const [folioCharges, setFolioCharges] = useState([]); // admin-added folio (extra) charges for the details page
  const [folioLoading, setFolioLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });
  const [cancelModal, setCancelModal] = useState({ open: false, reason: "", submitting: false });
  const [collectModal, setCollectModal] = useState({ open: false, amount: "", mode: "Cash", submitting: false });
  const [refundModal, setRefundModal] = useState({ open: false, amount: "", submitting: false });
  const [manageStatus, setManageStatus] = useState("");
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);

  const showToast = (type, title, message) => setToast({ open: true, type, title, message });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  /* ---------- data loading ---------- */

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/hotel/all-bookings");
      const raw = Array.isArray(res.data) ? res.data : [];
      setBookings(raw.map(normalizeBooking));
    } catch (err) {
      console.error("Failed to load bookings:", err);
      showToast("error", "Could not load bookings", "Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    API.get("/hotel/rooms/setup")
      .then((res) => setCategorySetup(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to load room categories:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill from dashboard deep link (?roomNo=&roomType=) or location.state.
  // Runs after categorySetup so we can map the incoming room type string to a
  // real categoryId and seed a fully populated room row in one shot.
  useEffect(() => {
    if (!prefillRoomNumber) return;

    // Always land on the booking form when a deep link carries room data.
    setView("form");

    setFormData((prev) => {
      const base = shouldResetDraft ? emptyForm() : prev;
      return {
        ...base,
        checkIn: prefillCheckIn || base.checkIn,
        checkOut: prefillCheckOut || base.checkOut,
      };
    });

    // Match the incoming room-type string (e.g. "AC ROOM") to a real category
    // by normalized name. Falls back to the first matching room's category if
    // a direct name match isn't found.
    const resolveCategoryId = () => {
      if (!prefillCategory || !categorySetup.length) return "";
      const wanted = normalizeRoomTypeName(prefillCategory);

      const exact = categorySetup.find(
        (c) => normalizeRoomTypeName(c.name) === wanted,
      );
      if (exact) return String(exact.id);

      // Soft match: any category whose name contains a key token from the input
      const tokens = wanted.split(/\s+/).filter(Boolean);
      const fuzzy = categorySetup.find((c) =>
        tokens.every((t) => normalizeRoomTypeName(c.name).includes(t)),
      );
      if (fuzzy) return String(fuzzy.id);

      // Last resort: find the category that actually owns this room number
      const ownerByRoom = categorySetup.find((c) =>
        (Array.isArray(c.rooms) ? c.rooms : []).some(
          (rn) => String(rn).trim() === String(prefillRoomNumber).trim(),
        ),
      );
      return ownerByRoom ? String(ownerByRoom.id) : "";
    };

    const categoryId = resolveCategoryId();
    const owningCategory = categorySetup.find(
      (c) => String(c.id) === String(categoryId),
    );
    const defaultPrice = owningCategory ? Number(owningCategory.defaultPrice || 0) : 0;

    setFormData((prev) => {
      // If the deep link didn't ask for a reset, leave any existing rows alone.
      // If it did, drop in a single ready-to-go row.
      if (!shouldResetDraft && prev.rooms.length > 0) {
        return prev;
      }
      return {
        ...prev,
        roomCategory: categoryId,
        noOfRooms: 1,
        rooms: [
          {
            id: uid(),
            categoryId,
            roomNo: String(prefillRoomNumber).trim(),
            price: defaultPrice,
            gst: 0,
            quantity: 1,
          },
        ],
      };
    });

    // Clear the router state so a page refresh / re-render doesn't keep
    // re-applying the same prefill forever.
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySetup.length, prefillRoomNumber, prefillCategory]);

  // NOTE: There used to be a useEffect here that rewrote every row's price
  // whenever `formData.roomCategory` changed. That was the root cause of the
  // "AC room gets overwritten by Non-AC room" bug: `roomCategory` is a single
  // shared field, so switching it re-ran that effect against the WHOLE
  // `rooms` array. It's been removed — each row now snapshots its own
  // `categoryId` at the moment it's added/edited (see addRoomRow / updateRoomRow
  // below), so rows are fully isolated from each other and from this field.


  /* ---------- derived ---------- */

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      [b.guest_name, b.bookingCode, b.bookingId, b.mobile, b.rooms]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [bookings, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
  const pagedBookings = filteredBookings.slice((page - 1) * pageSize, page * pageSize);

  const guestFullName = `${formData.firstName} ${formData.lastName}`.trim();

  const stayNights = useMemo(() => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const inD = new Date(formData.checkIn);
    const outD = new Date(formData.checkOut);
    const diff = Math.round((outD - inD) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [formData.checkIn, formData.checkOut]);

  const grandTotal = useMemo(
    () => formData.rooms.reduce((sum, row) => sum + rowTotal(row, stayNights), 0),
    [formData.rooms, stayNights],
  );


// this is a folio page 
const [showFolio, setShowFolio] = useState(false);
const [showGroupBooking, setShowGroupBooking] = useState(false);
const [showOccupancyForecast, setShowOccupancyForecast] = useState(false);
const [showGuestProfile, setShowGuestProfile] = useState(false);
const [showAddRoom, setShowAddRoom] = useState(false);

const [selectedBookingId, setSelectedBookingId] = useState(null);

  /* ---------- navigation between the 5 "screens" (all local state) ---------- */

  const goToList = () => {
    setView("list");
    fetchBookings();
  };

  const openNewBooking = () => {
    setFormData(emptyForm());
    setIsEdit(false);
    setSelectedBooking(null);
    setView("form");
  };

  const openEditBooking = async (booking) => {
    try {
      setSelectedBooking(booking);
      setStoredBookingId(booking.bookingId);
      const res = await API.get(`/hotel/full-booking/${booking.bookingId}`);
      const data = res.data || {};
      const nameParts = String(data.guest_name || data.guestName || "").trim().split(" ");
      setFormData({
        ...emptyForm(),
        bookingId: booking.bookingId,
        bookingCode: data.booking_code || data.bookingCode || booking.bookingCode || "",
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        guestEmail: data.guest_email || data.guestEmail || "",
        mobile: data.mobile || "",
        checkIn: (data.check_in || data.checkIn || "").slice(0, 10),
        checkOut: (data.check_out || data.checkOut || "").slice(0, 10),
        company: data.company_name || data.companyName || "",
        rooms: (Array.isArray(data.rooms) ? data.rooms : []).map((r) => {
          const roomNo = r.room_number || r.roomNumber || r.roomNo || "";
          // Best-effort: find which category this room number actually
          // belongs to in the real backend room-setup data, so each edited
          // row starts with its own correct category instead of a blank one.
          const ownerCategory = categorySetup.find((c) =>
            (Array.isArray(c.rooms) ? c.rooms : []).some((rn) => String(rn).trim() === String(roomNo).trim()),
          );
          return {
            id: uid(),
            categoryId: ownerCategory ? String(ownerCategory.id) : "",
            roomNo,
            price: r.tariff || r.price || 0,
            gst: r.gst || r.gstPercent || 0,
            quantity: r.quantity || 1,
          };
        }),
      });
      setIsEdit(true);
      setView("form");
    } catch (err) {
      console.error(err);
      showToast("error", "Could not load booking", "We couldn't fetch this booking's details for editing.");
    }
  };

  const openDetails = async (booking) => {
    setSelectedBooking(booking);
    setView("details");
    setDetailLoading(true);
    setFolioLoading(true);
    try {
      const res = await API.get(`/hotel/full-booking/${booking.bookingId}`);
      setBookingDetail(res.data || null);
    } catch (err) {
      console.error(err);
      setBookingDetail(null);
    } finally {
      setDetailLoading(false);
    }
    try {
      // Dynamically fetch folio entries added by the admin (Extra Charges) for this booking
      const folioRes = await API.get(`/hotel/folio/${booking.bookingId}`);
      const allEntries = Array.isArray(folioRes.data) ? folioRes.data : [];
      setFolioCharges(allEntries.filter((e) => e.entry_type === "Extra Charge"));
    } catch (err) {
      console.error("Failed to load folio charges:", err);
      setFolioCharges([]);
    } finally {
      setFolioLoading(false);
    }
  };

  const openManage = (booking) => {
    setSelectedBooking(booking);
    setManageStatus(booking.booking_status || "");
    setView("manage");
  };
const handleJumpStep = (stepView) => {

  if (stepView === "form") {
    openNewBooking();
    return;
  }

  if (stepView === "list") {
    goToList();
    return;
  }

  if (stepView === "confirmed") {
    if (!formData.bookingId) {
      showToast(
        "error",
        "No booking found",
        "Please create a booking first."
      );
      return;
    }

    setView("confirmed");
    return;
  }

  //----------------------------
  // POPUP SCREENS
  //----------------------------

  if (stepView === "group-booking") {
    setShowGroupBooking(true);
    return;
  }

  if (stepView === "guest-booking") {
    setShowGuestProfile(true);
    return;
  }

  if (stepView === "occupancy-forecast") {
    setShowOccupancyForecast(true);
    return;
  }

  if (stepView === "add-room") {
    setShowAddRoom(true);
    return;
  }

  //----------------------------
  // Booking Detail
  //----------------------------

  if (stepView === "details") {

    if (!selectedBooking) {
      showToast(
        "error",
        "Select a booking first",
        "Please select any booking."
      );
      return;
    }

    openDetails(selectedBooking);
    return;
  }

  //----------------------------
  // Manage
  //----------------------------

  if (stepView === "manage") {

    if (!selectedBooking) {
      showToast(
        "error",
        "Select a booking first",
        "Please select any booking."
      );
      return;
    }

    openManage(selectedBooking);
  }

};

  /* ---------- form field handlers ---------- */

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setField(name, type === "checkbox" ? checked : value);
  };

  const addRoomRow = () => {
    const cat = categorySetup.find((c) => String(c.id) === String(formData.roomCategory));
    // A brand-new, fully independent object — no shared references with any
    // other row. Its category is a SNAPSHOT of whatever is currently selected
    // above; changing that selector afterwards will never touch this row again.
    const newRow = {
      id: uid(),
      categoryId: formData.roomCategory || "",
      roomNo: "",
      price: cat ? Number(cat.defaultPrice || 0) : 0,
      gst: 0,
      quantity: Number(formData.noOfRooms) || 1,
    };
    setFormData((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRow],
    }));
  };

  // Updates exactly one row, by id, and only that row. Every other row object
  // in the array keeps its original reference/values untouched — this is what
  // guarantees editing/selecting in one row can never leak into another.
  const updateRoomRow = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id !== id) return r; // leave every other row exactly as-is

        if (field === "categoryId") {
          // Category changed for THIS row only: fetch that category's own
          // default tariff from the already-loaded backend data and reset
          // just this row's room number (its old room belonged to a
          // different category's inventory, so it's no longer valid here).
          const cat = categorySetup.find((c) => String(c.id) === String(value));
          return {
            ...r,
            categoryId: value,
            roomNo: "",
            price: cat ? Number(cat.defaultPrice || 0) : r.price,
          };
        }

        return { ...r, [field]: value }; // new object, this row only
      }),
    }));
  };

  // Room numbers for a SPECIFIC row's category, sourced from the same
  // "/hotel/rooms/setup" categorySetup data that powers Room.jsx (real
  // backend availability/tariff — nothing hardcoded). Each row calls this
  // with its OWN categoryId, so AC rows and Non-AC rows each see only their
  // own category's real room list, independently of one another.
  const getRoomNumbersForCategory = (categoryId, currentRoomNo = "") => {
    const cat = categorySetup.find((c) => String(c.id) === String(categoryId));
    if (!cat) return [];

    const statusByRoom = new Map();
    (Array.isArray(cat.roomDetails) ? cat.roomDetails : []).forEach((rd) => {
      if (rd.roomNumber) {
        statusByRoom.set(String(rd.roomNumber).trim(), rd.status || "Available");
      }
    });

    // Only exclude room numbers already picked by OTHER rows within this
    // SAME category — a room number picked in an AC row should never block
    // a same-numbered-but-different room in another category's dropdown.
    const roomsAlreadyPicked = new Set(
      formData.rooms
        .filter((r) => String(r.categoryId || "") === String(categoryId))
        .map((r) => String(r.roomNo || "").trim())
        .filter((rn) => rn && rn !== String(currentRoomNo || "").trim()),
    );

    return (Array.isArray(cat.rooms) ? cat.rooms : [])
      .map((rn) => String(rn).trim())
      .filter(Boolean)
      .map((rn) => ({
        roomNo: rn,
        status: statusByRoom.get(rn) || "Available",
        alreadyPicked: roomsAlreadyPicked.has(rn),
      }));
  };

  const removeRoomRow = (id) => {
    setFormData((prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r.id !== id) }));
  };

  /* ---------- save booking (creates OR updates, all from this one page) ---------- */

  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      showToast("error", "Guest name required", "Please enter the guest's first and last name.");
      return false;
    }
    const email = formData.guestEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("error", "Valid email required", "Please enter a valid guest email address.");
      return false;
    }
    if (!formData.mobile.trim() || !/^\d{10}$/.test(formData.mobile.trim())) {
      showToast("error", "Mobile number required", "Please enter a valid 10-digit mobile number.");
      return false;
    }
    if (!formData.guestCapacity.trim()) {
      showToast("error", "Guest capacity required", "Please enter the guest capacity (adults + children).");
      return false;
    }
    if (!formData.address.trim()) {
      showToast("error", "Address required", "Please enter the guest's address.");
      return false;
    }
    if (!formData.checkIn || !formData.checkOut) {
      showToast("error", "Stay dates required", "Please select both check-in and check-out dates.");
      return false;
    }
    if (formData.checkOut < formData.checkIn) {
      showToast("error", "Invalid dates", "Check-out date cannot be before check-in date.");
      return false;
    }
    return true;
  };

  const handleSaveBooking = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      let bookingId = formData.bookingId;
      let bookingCode = formData.bookingCode;

      if (!isEdit) {
        // 1) Guest + stay
        const guestRes = await API.post("/hotel/guest", {
          agentBooking: false,
          bookingPoint: "",
          mobile: formData.mobile,
          guestName: guestFullName,
          guestEmail: formData.guestEmail,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          arrival: formData.arrival,
          departure: formData.departure,
          bookingStatus: "Confirmed",
        });
        bookingId = guestRes.data.bookingId;
        bookingCode = guestRes.data.bookingCode || "";
        setStoredBookingId(bookingId);
        setStoredBookingCode(bookingCode);

        // 2) Booking type / source / address
        await API.post(`/hotel/other-booking/${bookingId}`, {
          bookingType: formData.bookingType,
          bookingSource: formData.bookingType,
          bookingReference: formData.reference,
          address: formData.address,
          country: "",
          state: "",
          city: "",
          pincode: "",
        });

        // 3) Reference / notes
        await API.post(`/hotel/reference/${bookingId}`, {
          guestType: "",
          guestNotes: formData.remarks,
          internalNotes: formData.purposeOfVisit,
        });

        // 4) Company
        await API.post(`/hotel/company/${bookingId}`, {
          companyName: formData.company || "Direct Booking",
          gst: "",
        });

        // 5) Room & tariff rows
        for (const row of formData.rooms) {
          await API.post(`/hotel/room-tariff/${bookingId}`, {
            roomNumber: row.roomNo,
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            quantity: row.quantity,
            tariff: row.price,
            gstPercent: row.gst,
            total: rowTotal(row, stayNights),
          });
        }

        // 6) Pax / occupancy
        await API.post(`/hotel/pax/${bookingId}`, {
          guestCapacity: formData.guestCapacity,
          owner: formData.owner,
          rooms: formData.rooms,
        });

        // 7) Advance payment (only if an amount was entered)
        if (Number(formData.amount) > 0) {
          await API.post(`/hotel/advance/${bookingId}`, {
            amount: Number(formData.amount),
            discount: 0,
            paymentMode: formData.paymentMode || "Cash",
            notes: formData.paymentNote,
          });
        }
      } else {
        // Edit mode: one consolidated update call
        await API.put(`/hotel/full-booking/${bookingId}`, {
          guest_name: guestFullName,
          mobile: formData.mobile,
          company_name: formData.company,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          rooms: formData.rooms.map((r) => ({
            roomNumber: r.roomNo,
            tariff: r.price,
            gst: r.gst,
            quantity: r.quantity,
            total: rowTotal(r, stayNights),
          })),
        });
      }

      setFormData((prev) => ({ ...prev, bookingId, bookingCode }));
      setSelectedBooking((prev) => ({ ...(prev || {}), bookingId, bookingCode, guest_name: guestFullName }));
      showToast(
        "success",
        isEdit ? "Booking Updated" : "Booking Confirmed",
        isEdit ? "The booking has been updated successfully." : "Your booking has been created successfully.",
      );
      await fetchBookings();
      setView("confirmed");
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        "Save Failed",
        err.response?.data?.message || "We could not save this booking. Please check the required fields and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- manage-booking actions ---------- */

  // Parse room numbers from a booking's `rooms` field, which the backend may
  // return as either a comma-separated string ("101, 102") or an array of
  // room objects / room number strings.
  const extractRoomNumbersFromBooking = (booking) => {
    if (!booking) return [];
    const raw = booking.rooms;
    if (Array.isArray(raw)) {
      return raw
        .map((r) => {
          if (!r) return "";
          if (typeof r === "string") return r;
          return r.room_number || r.roomNumber || r.roomNo || r.roomId || "";
        })
        .map((v) => String(v).trim())
        .filter(Boolean);
    }
    return String(raw || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  };

  // After a guest checks out we want the room(s) to appear in the Dashboard's
  // "Cleaning" section. Everything is now stored in MySQL (no localStorage):
  //   1. PUT /housekeeping/status/<room> with `Vacant Dirty` flips the
  //      `housekeeping.status` row AND syncs `hotel_room_inventory.status =
  //      "Cleaning"` (see Housekeeping.syncOperationalStatus), so the
  //      Dashboard's GET /housekeeping surfaces the room in the cleaning
  //      bucket on its next refresh.
  //   2. POST /housekeeping/message creates a row in `hk_messages` so the
  //      housekeeping team sees the cleaning job in their queue — assignee,
  //      task label, and due_at all live in the DB.
  const queueRoomsForCleaning = async (booking) => {
    const roomNumbers = extractRoomNumbersFromBooking(booking);
    if (!roomNumbers.length) return;

    const guestName = booking?.guest_name || booking?.guestName || "";
    const bookingCode = booking?.bookingCode || booking?.booking_code || "";

    for (const roomNumber of roomNumbers) {
      const roomKey = String(roomNumber).trim();
      if (!roomKey) continue;

      // 1. Flip the housekeeping row to "Vacant Dirty". The backend also
      //    mirrors this into hotel_room_inventory.status = "Cleaning" via
      //    Housekeeping.syncOperationalStatus, so GET /housekeeping returns
      //    the room in the cleaning bucket on the next refresh.
      try {
        await API.put(`/housekeeping/status/${roomKey}`, { status: "Vacant Dirty" });
      } catch (error) {
        console.warn(`Failed to mark room ${roomKey} dirty after checkout`, error);
      }

      // 2. Create a DB-backed cleaning task in the hk_messages table so the
      //    housekeeping team sees the job in their queue (status, assignee,
      //    due_at — all stored in MySQL, no localStorage).
      try {
        const dueAt = new Date(Date.now() + 30 * 60000).toISOString();
        await API.post("/housekeeping/message", {
          roomId: roomKey,
          roomNo: roomKey,
          assignedTo: "Unassigned",
          message: `Cleaning required after check-out${bookingCode ? ` (Booking ${bookingCode})` : ""}${guestName ? ` • Guest: ${guestName}` : ""}`,
          taskLabel: "Post Check-Out Cleaning",
          dueAt,
        });
      } catch (error) {
        console.warn(`Failed to create cleaning task message for room ${roomKey}`, error);
      }
    }
  };

  const handleLifecycle = async (action) => {
    if (!selectedBooking?.bookingId) return;
    try {
      await API.put(`/hotel/${action}/${selectedBooking.bookingId}`);
      if (action === "check-out") {
        await queueRoomsForCleaning(selectedBooking);
      }
      showToast(
        "success",
        action === "check-out" ? "Checked Out" : "Checked In",
        action === "check-out"
          ? "Guest has been checked out. Room moved to Cleaning on the Dashboard."
          : "Guest has been checked in successfully.",
      );
      await fetchBookings();
      openManage({ ...selectedBooking, booking_status: action === "check-out" ? "Checked-Out" : "Checked-In" });
    } catch (err) {
      console.error(err);
      showToast("error", "Action Failed", "We could not update this booking's status. Please try again.");
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking?.bookingId) return;
    const reason = cancelModal.reason.trim();
    if (!reason) {
      showToast("error", "Reason required", "Please enter a cancellation reason.");
      return;
    }
    try {
      setCancelModal((c) => ({ ...c, submitting: true }));
      await API.put(`/hotel/cancel/${selectedBooking.bookingId}`, { reason });
      setCancelModal({ open: false, reason: "", submitting: false });
      showToast("success", "Booking Cancelled", `Booking #${selectedBooking.bookingCode || selectedBooking.bookingId} has been cancelled.`);
      await fetchBookings();
      goToList();
    } catch (err) {
      console.error(err);
      setCancelModal((c) => ({ ...c, submitting: false }));
      showToast("error", "Cancellation Failed", err.response?.data?.message || "Could not cancel this booking.");
    }
  };

  const handleCollectPayment = async () => {
    if (!selectedBooking?.bookingId) return;
    const amount = Number(collectModal.amount);
    if (!amount || amount <= 0) {
      showToast("error", "Enter a valid amount", "Payment amount must be greater than zero.");
      return;
    }
    try {
      setCollectModal((c) => ({ ...c, submitting: true }));
      await API.post(`/hotel/advance/${selectedBooking.bookingId}`, {
        amount,
        discount: 0,
        paymentMode: collectModal.mode,
      });
      setCollectModal({ open: false, amount: "", mode: "Cash", submitting: false });
      showToast("success", "Payment Collected", `${formatCurrency(amount)} recorded against this booking.`);
      await fetchBookings();
    } catch (err) {
      console.error(err);
      setCollectModal((c) => ({ ...c, submitting: false }));
      showToast("error", "Payment Failed", err.response?.data?.message || "Could not record this payment.");
    }
  };

  const handleRefund = async () => {
    if (!selectedBooking?.bookingId) return;
    const amount = Number(refundModal.amount);
    if (!amount || amount <= 0) {
      showToast("error", "Enter a valid amount", "Refund amount must be greater than zero.");
      return;
    }
    try {
      setRefundModal((r) => ({ ...r, submitting: true }));
      await API.post(`/hotel/refund/${selectedBooking.bookingId}`, { amount });
      setRefundModal({ open: false, amount: "", submitting: false });
      showToast("success", "Refund Processed", `${formatCurrency(amount)} has been refunded.`);
      await fetchBookings();
    } catch (err) {
      console.error(err);
      setRefundModal((r) => ({ ...r, submitting: false }));
      showToast("error", "Refund Failed", "Could not process this refund.");
    }
  };

  // Folio / Night-Audit and Payment History are now available as modals
 const handleOpenFolio = (booking) => {
    if (!booking?.bookingId) return;

    setStoredBookingId(booking.bookingId);
    setStoredBookingCode(booking.bookingCode || "");
    setSelectedBookingId(booking.bookingId);
    setShowFolio(true);
  };

  const handleCloseFolio = () => {
    setShowFolio(false);
    setSelectedBookingId(null);
  };

  const handleOpenPaymentHistory = (booking) => {
    if (!booking?.bookingId) return;
    setShowPaymentHistory(true);
  };

  const handleClosePaymentHistory = () => {
    setShowPaymentHistory(false);
    setPaymentHistory([]);
  };

  const handleOpenGroupBooking = (booking) => {
    if (!booking?.bookingId) return;
    setSelectedBookingId(booking.bookingId);
    setShowGroupBooking(true);
  };

  const handleCloseGroupBooking = () => {
    setShowGroupBooking(false);
    setSelectedBookingId(null);
  };

  const handleOpenGuestProfile = (booking) => {
    if (!booking?.bookingId) return;
    setSelectedBookingId(booking.bookingId);
    setShowGuestProfile(true);
  };

  const handleCloseGuestProfile = () => {
    setShowGuestProfile(false);
    setSelectedBookingId(null);
  };

  const handleCloseOccupancyForecast = () => {
    setShowOccupancyForecast(false);
  };

  const handleCloseAddRoom = () => {
    setShowAddRoom(false);
    // room categories/rooms may have changed while the popup was open — refresh
    // the same categorySetup data source the Room No dropdown below reads from
    API.get("/hotel/rooms/setup")
      .then((res) => setCategorySetup(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to refresh room categories:", err));
  };

  const handleNotify = async (channel) => {
    if (!selectedBooking?.bookingId) return;
    try {
      await API.post(`/hotel/notify/${selectedBooking.bookingId}`, { channel });
      showToast(
        "success",
        channel === "email" ? "Email Sent" : "SMS Sent",
        `Booking details were sent to the guest via ${channel === "email" ? "email" : "SMS"}.`,
      );
    } catch (err) {
      console.error(err);
      showToast("error", "Notification Failed", "This needs a /hotel/notify endpoint on your backend — please add it, or hook this button to your existing notification service.");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Booking No", "Guest Name", "Check-In", "Check-Out", "Rooms", "Amount", "Status", "Booking Type"];
    const rows = filteredBookings.map((b) => [
      b.bookingCode || b.bookingId,
      b.guest_name || "",
      formatDate(b.check_in),
      formatDate(b.check_out),
      b.rooms || "",
      b.totalAmount || 0,
      b.booking_status || "",
      b.bookingType || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─────────────────────────── render: All Bookings (list) ─────────────────────────── */

  const renderList = () => (
    <div className={panelCls}>
      <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={cardTitleCls}>All Bookings</h2>
          <p className="mt-1 text-[17px] text-slate-500">View and manage all your hotel reservations</p>
        </div>
        <button type="button" onClick={openNewBooking} className={primaryBtn}>
          <FaPlus className="text-lg" /> New Booking
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative min-w-[220px] flex-1">
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by booking no, guest name, email or phone..."
            className={`${fieldCls} pl-11`}
          />
        </div>
        <button type="button" className={ghostBtn}>
          <FaFilter className="text-sm" /> Filter
        </button>
        <button type="button" onClick={handleExportCSV} className={ghostBtn}>
          <FaDownload className="text-sm" /> Export
        </button>
      </div>

      <div className="max-w-full overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[860px] text-left">
          <thead className="sticky top-0 z-10 bg-slate-50 text-base font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Booking No</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Guest Name</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Check-In</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Check-Out</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Rooms</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Amount</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Status</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Booking Type</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[17px]">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  Loading bookings...
                </td>
              </tr>
            ) : pagedBookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  No bookings found.
                </td>
              </tr>
            ) : (
              pagedBookings.map((b) => (
                <tr key={b.bookingId} className="hover:bg-slate-50/70">
                  <td className="px-4 sm:px-5 py-3 sm:py-4 font-bold text-slate-800">{b.bookingCode || `BK-${b.bookingId}`}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-700">{b.guest_name || "Walk-in Guest"}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">{formatDate(b.check_in)}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">{formatDate(b.check_out)}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">{b.rooms || "-"}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 font-semibold text-slate-800">{formatCurrency(b.totalAmount)}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4">
                    <span className={statusBadgeCls(b.booking_status)}>
                      {b.booking_status || "Pending"}
                    </span>
                  </td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">{b.bookingType || "-"}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        title="View details"
                        onClick={() => openDetails(b)}
                        className={rowActionBtn("neutral")}
                      >
                        <FaEye className="text-[18px] sm:text-xl" />
                        <span>View</span>
                      </button>
                      <button
                        title="Edit booking"
                        onClick={() => openEditBooking(b)}
                        className={rowActionBtn("neutral")}
                      >
                        <FaEdit className="text-[18px] sm:text-xl" />
                        <span>Edit</span>
                      </button>
                      <button
                        title="Guest folio"
                        onClick={() => handleOpenFolio(b)}
                        className={rowActionBtn("primary")}
                      >
                        <FaBook className="text-[18px] sm:text-xl" />
                        <span>Folio</span>
                      </button>
                      <button
                        title="Manage booking"
                        onClick={() => openManage(b)}
                        className={rowActionBtn("danger")}
                      >
                        <FaTrash className="text-[18px] sm:text-xl" />
                        <span>Delete</span>
                      </button>
                      {/* <button
                        title="Group Booking"
                        onClick={() => handleOpenGroupBooking(b)}
                        className={rowActionBtn("neutral")}
                      >
                        <FaUsers className="text-[18px] sm:text-xl" />
                        <span>Group Booking</span>
                      </button> */}
                      <button
                        title="Guest Profile"
                        onClick={() => handleOpenGuestProfile(b)}
                        className={rowActionBtn("neutral")}
                      >
                        <FaIdCard className="text-[18px] sm:text-xl" />
                        <span>Guest Profile</span>
                      </button>

                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row flex-wrap items-center justify-center sm:justify-between gap-3 text-[17px] text-slate-500">
        <span className="text-center sm:text-left">
          Showing {pagedBookings.length ? (page - 1) * pageSize + 1 : 0}
          {" "}to {(page - 1) * pageSize + pagedBookings.length} of {filteredBookings.length} entries
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition disabled:opacity-40"
          >
            <FaChevronLeft className="text-sm" />
          </button>
          {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-lg text-[17px] font-bold transition ${
                page === i + 1 ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition disabled:opacity-40"
          >
            <FaChevronRight className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────── render: New / Edit Booking (single page, no tab-navigation) ─────────────────────────── */

  const renderForm = () => (
    <div className={panelCls}>
      <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 sm:pb-6">
        <div>
          <h2 className={cardTitleCls}>{isEdit ? "Edit Booking" : "New Booking"}</h2>
          <p className="mt-1 text-[17px] text-slate-500">
            {isEdit ? "Update the booking details below." : "Fill all details below to create a new booking — everything happens on this one page."}
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button type="button" onClick={goToList} className={ghostBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleSaveBooking} disabled={saving} className={primaryBtn}>
            {saving ? "Saving..." : "Save Booking"}
          </button>
        </div>
      </div>

      {/* section anchors — purely visual / scroll cues, all sections are already on screen below */}
      <div className="mb-6 sm:mb-8 flex flex-wrap gap-2 sm:gap-3">
        {[
          { id: "sec-guest", label: "Guest Information" },
          { id: "sec-booking", label: "Booking Details" },
          { id: "sec-room", label: "Room & Tariff" },
          { id: "sec-other", label: "Other Details" },
          { id: "sec-payment", label: "Payment Details" },
        ].map((s) => (
          <a key={s.id} href={`#${s.id}`} className={softBtn(false)}>
            {s.label}
          </a>
        ))}
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        {/* column 1: guest + stay */}
        <div className="space-y-5 sm:space-y-6">
          <div id="sec-guest" className={cardTileCls}>
            <div className={sectionTitleCls}>Guest Information</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={fieldCls}
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={fieldCls}
                  placeholder="Enter last name"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Email Address <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  name="guestEmail"
                  value={formData.guestEmail}
                  onChange={handleChange}
                  className={fieldCls}
                  placeholder="Enter guest email"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
                <input
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className={fieldCls}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="mt-5 sm:mt-6 border-t border-slate-200 pt-5 sm:pt-6">
              <div className="mb-3 text-xl font-bold text-blue-900">
                Stay Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className={labelCls}>Check-In</label>
                  <input
                    type="date"
                    name="checkIn"
                    min={today}
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
                    min={formData.checkIn || today}
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
              </div>
            </div>
          </div>
        </div>

        {/* column 2: booking info + room & tariff */}
        <div className="space-y-5 sm:space-y-6">
          <div id="sec-booking" className={cardTileCls}>
            <div className={sectionTitleCls}>Booking Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelCls}>Booking No</label>
                <input disabled value={formData.bookingCode || "Auto-generated on save"} className={`${fieldCls} bg-slate-100 text-slate-500`} />
              </div>
              <div>
                <label className={labelCls}>Booking Date</label>
                <input disabled value={formatDate(today)} className={`${fieldCls} bg-slate-100 text-slate-500`} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Booking Type</label>
                <div className="flex flex-wrap gap-4 sm:gap-5 pt-1">
                  {["Walk-In", "VIA", "Online"].map((t) => (
                    <label key={t} className="flex items-center gap-2 text-[17px] font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="bookingType"
                        checked={formData.bookingType === t}
                        onChange={() => setField("bookingType", t)}
                        className="h-5 w-5 sm:h-6 sm:w-6 accent-blue-600"
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Referral By</label>
                <input name="referralBy" value={formData.referralBy} onChange={handleChange} className={fieldCls} placeholder="Enter referral name" />
              </div>
              <div>
                <label className={labelCls}>Company</label>
                <input name="company" value={formData.company} onChange={handleChange} className={fieldCls} placeholder="Enter company name" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Reference</label>
                <input name="reference" value={formData.reference} onChange={handleChange} className={fieldCls} placeholder="Enter reference details" />
              </div>
            </div>
          </div>

          <div id="sec-room" className={cardTileCls}>
            <div className={sectionTitleCls}>Room &amp; Tariff Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelCls}>Room Category</label>
                <select name="roomCategory" value={formData.roomCategory} onChange={handleChange} className={fieldCls}>
                  <option value="">Select Category</option>
                  {categorySetup.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>No. Of Rooms</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    name="noOfRooms"
                    value={formData.noOfRooms}
                    onChange={handleChange}
                    className={fieldCls}
                  />
                  <button type="button" onClick={addRoomRow} className="shrink-0 h-[52px] sm:h-[54px] md:h-14 rounded-xl bg-sky-500 px-4 sm:px-5 text-[17px] font-bold text-white transition hover:bg-sky-600 active:scale-95">
                    + Add
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Guest Capacity <span className="text-red-500">*</span></label>
                <input name="guestCapacity" value={formData.guestCapacity} onChange={handleChange} className={fieldCls} placeholder="Adults + Children" />
              </div>
              <div>
                <label className={labelCls}>Mobile Number</label>
                <input name="roomMobile" value={formData.roomMobile} onChange={handleChange} className={fieldCls} placeholder="Primary mobile number" />
              </div>
              <div>
                <label className={labelCls}>Owner</label>
                <input name="owner" value={formData.owner} onChange={handleChange} className={fieldCls} placeholder="Enter owner name" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address <span className="text-red-500">*</span></label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className={`${fieldCls} h-auto py-3`} placeholder="Enter address" />
              </div>
            </div>

            {formData.rooms.length > 0 && (
              <div className="mt-4 sm:mt-5 max-w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-base font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Room No</th>
                      <th className="px-3 py-2.5">Price</th>
                      <th className="px-3 py-2.5">GST %</th>
                      <th className="px-3 py-2.5">Qty</th>
                      <th className="px-3 py-2.5">Total</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-[17px]">
                    {formData.rooms.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <select
                            value={row.categoryId || ""}
                            onChange={(e) => updateRoomRow(row.id, "categoryId", e.target.value)}
                            className="w-28 sm:w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-[17px]"
                          >
                            <option value="">Select category</option>
                            {categorySetup.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.roomNo}
                            onChange={(e) => updateRoomRow(row.id, "roomNo", e.target.value)}
                            disabled={!row.categoryId}
                            className="w-24 sm:w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-[17px] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">
                              {row.categoryId ? "Select room" : "Pick category first"}
                            </option>
                            {getRoomNumbersForCategory(row.categoryId, row.roomNo).map((r) => (
                              <option key={r.roomNo} value={r.roomNo} disabled={r.alreadyPicked}>
                                {r.roomNo}
                                {r.status && r.status.toLowerCase() !== "available"
                                  ? ` (${r.status})`
                                  : ""}
                                {r.alreadyPicked ? " — already added" : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => updateRoomRow(row.id, "price", e.target.value)}
                            className="w-20 sm:w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-[17px]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.gst}
                            onChange={(e) => updateRoomRow(row.id, "gst", e.target.value)}
                            className="w-16 sm:w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-[17px]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) => updateRoomRow(row.id, "quantity", e.target.value)}
                            className="w-16 sm:w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-[17px]"
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{formatCurrency(rowTotal(row, stayNights))}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeRoomRow(row.id)} className="text-rose-500 transition hover:text-rose-700 active:scale-95">
                            <FaTimes className="text-lg" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* column 3: other details + payment */}
        <div className="space-y-5 sm:space-y-6">
          <div id="sec-other" className={cardTileCls}>
           
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            </div>
          </div>

          <div id="sec-payment" className={cardTileCls}>
            <div className={sectionTitleCls}>Advance Payment Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelCls}>Amount (₹)</label>
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} className={fieldCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Payment Mode</label>
                <select name="paymentMode" value={formData.paymentMode} onChange={handleChange} className={fieldCls}>
                  <option value="">Select Mode</option>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Status</label>
                <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className={fieldCls}>
                  <option value="">Select Status</option>
                  <option>Paid</option>
                  <option>Partial</option>
                  <option>Pending</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Paid By</label>
                <input name="paidBy" value={formData.paidBy} onChange={handleChange} className={fieldCls} placeholder="Enter paid by name" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Payment Note</label>
                <textarea name="paymentNote" value={formData.paymentNote} onChange={handleChange} rows={2} className={`${fieldCls} h-auto py-3`} placeholder="Enter payment note (optional)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* booking summary footer */}
      <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-between gap-5 sm:gap-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-wrap gap-6 sm:gap-8 text-[17px]">
          <div>
            <div className="text-sm font-bold uppercase text-slate-400">Guest Name</div>
            <div className="font-bold text-slate-800">{guestFullName || "-"}</div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase text-slate-400">Stay Duration</div>
            <div className="font-bold text-slate-800">{stayNights} Night{stayNights === 1 ? "" : "s"}</div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase text-slate-400">Check-In</div>
            <div className="font-bold text-slate-800">{formData.checkIn ? formatDate(formData.checkIn) : "-"}</div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase text-slate-400">Check-Out</div>
            <div className="font-bold text-slate-800">{formData.checkOut ? formatDate(formData.checkOut) : "-"}</div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase text-slate-400">Total Rooms</div>
            <div className="font-bold text-slate-800">{formData.rooms.length || "-"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold uppercase text-slate-400">Total Amount</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{formatCurrency(grandTotal)}</div>
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────── render: Booking Confirmed ─────────────────────────── */

  const renderConfirmed = () => (
    <div
      className={`
        ${panelCls}
        mx-auto
        max-w-2xl
        p-5
        sm:p-8
        md:p-12
        lg:p-16
        xl:p-20
        text-center
        flex
        flex-col
        items-center
      `}
    >
      {/* Success Icon */}
      <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-emerald-500 text-3xl sm:text-4xl text-white shadow-[0_14px_30px_rgba(16,185,129,0.35)]">
        <FaCheckCircle />
      </div>

      {/* Heading */}
      <h2 className={`mt-5 ${heroTitleCls} text-center`}>
        Booking Confirmed!
      </h2>

      <p className="mt-2 text-[17px] sm:text-lg text-slate-500 text-center">
        Your booking has been confirmed successfully.
      </p>

      {/* Booking Reference */}
      <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-emerald-50 px-5 py-4 shadow-sm text-center">
        <div className="text-sm font-bold uppercase text-emerald-600">
          Booking Reference
        </div>

        <div className="mt-1 text-2xl font-black text-emerald-700 break-all">
          {formData.bookingCode || formData.bookingId}
        </div>
      </div>

      {/* Details */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 text-center w-full max-w-xl mx-auto justify-items-center">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Guest Name
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-800 break-words">
            {guestFullName}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Rooms
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-800 break-words">
            {formData.rooms.length}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Check-In
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-800 break-words">
            {formatDate(formData.checkIn)}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Check-Out
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-800 break-words">
            {formatDate(formData.checkOut)}
          </div>
        </div>

        <div className="col-span-2 border-t border-slate-200 pt-5 text-center">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Total Amount
          </div>

          <div className="mt-1 text-2xl sm:text-3xl font-black text-blue-700">
            {formatCurrency(grandTotal)}
            <div className="text-[17px] text-emerald-600">
              ({formData.rooms.length} room{formData.rooms.length > 1 ? 's' : ''} × {stayNights} night{stayNights > 1 ? 's' : ''})
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-10 flex justify-center w-full">
        <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => window.print()}
            className={`${ghostBtn} w-full`}
          >
            <FaPrint className="text-lg" />
            Print Receipt
          </button>

          <button
            type="button"
            onClick={() => handleNotify("email")}
            className={`${ghostBtn} w-full`}
          >
            <FaEnvelope className="text-lg" />
            Send Email
          </button>

          <button
            type="button"
            onClick={goToList}
            className={`${primaryBtn} w-full sm:col-span-2`}
          >
            View All Bookings
          </button>
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────── render: Booking Details ─────────────────────────── */

  const renderDetails = () => {
    const d = bookingDetail || {};
    const b = selectedBooking || {};

    // Room charges total (from live room/tariff data, falling back to the booking's stored total)
    const roomChargesTotal = Array.isArray(d.rooms) && d.rooms.length > 0
      ? d.rooms.reduce((sum, r) => sum + (Number(r.total) || 0), 0)
      : Number(b.totalAmount) || 0;

    // Folio (extra) charges added by the admin, fetched dynamically for this booking
    const folioChargesTotal = folioCharges.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Updated total = Room Charges + Folio Charges (always folio-inclusive)
    const updatedTotalAmount = roomChargesTotal + folioChargesTotal;

    // Remaining/Balance logic:
    //  - If an advance has been paid -> Remaining = Updated Total (Room+Folio) - Advance Paid
    //  - If nothing has been paid yet -> Remaining = the full actual Updated Total (Room+Folio)
    const advancePaid = Number(b.paidAmount) || 0;
    const remainingAmount = advancePaid > 0
      ? Math.max(updatedTotalAmount - advancePaid, 0)
      : updatedTotalAmount;

    return (
      <div className={panelCls}>
        <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 sm:pb-5">
          <div>
            <div className="text-sm font-bold uppercase text-slate-400">Booking Reference</div>
            <h2 className={cardTitleCls}>{d.booking_code || b.bookingCode || `BK-${b.bookingId}`}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className={statusBadgeCls(d.booking_status || b.booking_status)}>
              {d.booking_status || b.booking_status || "Pending"}
            </span>
            <button onClick={() => window.print()} className={ghostBtn}>
              <FaPrint className="text-sm" /> Print
            </button>
            <button onClick={() => openEditBooking(b)} className={ghostBtn}>
              <FaEdit className="text-sm" /> Edit
            </button>
            <button onClick={() => setShowInvoiceModal(true)} className={primaryBtn}>
              <FaFileAlt className="text-sm" /> Generate Invoice
            </button>
          </div>
        </div>

        {detailLoading ? (
          <div className="py-10 text-center text-lg text-slate-400">Loading booking details...</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            <div className={cardTileCls}>
              <div className={sectionTitleCls}>Guest Information</div>
              <dl className="space-y-2.5 text-[17px]">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Name</dt><dd className="font-bold text-slate-800">{d.guest_name || b.guest_name || "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="font-bold text-slate-800">{d.guest_email || "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Mobile</dt><dd className="font-bold text-slate-800">{d.mobile || b.mobile || "-"}</dd></div>
              </dl>
            </div>

            <div className={cardTileCls}>
              <div className={sectionTitleCls}>Stay Information</div>
              <dl className="space-y-2.5 text-[17px]">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Check-In</dt><dd className="font-bold text-slate-800">{formatDate(d.check_in || b.check_in)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Check-Out</dt><dd className="font-bold text-slate-800">{formatDate(d.check_out || b.check_out)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Rooms</dt><dd className="font-bold text-slate-800">{b.rooms || (d.rooms || []).length || "-"}</dd></div>
              </dl>
            </div>

            <div className={cardTileCls}>
              <div className={sectionTitleCls}>Payment Information</div>
              <dl className="space-y-2.5 text-[17px]">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Room Charges</dt><dd className="font-bold text-slate-800">{formatCurrency(roomChargesTotal)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Folio Charges</dt><dd className="font-bold text-slate-800">{formatCurrency(folioChargesTotal)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Total (Room + Folio)</dt><dd className="font-bold text-slate-800">{formatCurrency(updatedTotalAmount)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Advance Paid</dt><dd className="font-bold text-emerald-600">{formatCurrency(advancePaid)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Remaining (incl. Folio)</dt><dd className="font-bold text-rose-600">{formatCurrency(remainingAmount)}</dd></div>
              </dl>
            </div>

            {Array.isArray(d.rooms) && d.rooms.length > 0 && (
              <div className={`md:col-span-3 ${cardTileCls}`}>
                <div className={sectionTitleCls}>Room &amp; Tariff Information</div>
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left">
                    <thead className="text-base font-bold uppercase text-slate-400">
                      <tr>
                        <th className="py-2 pr-4">Room No</th>
                        <th className="py-2 pr-4">Tariff</th>
                        <th className="py-2 pr-4">GST %</th>
                        <th className="py-2 pr-4">Qty</th>
                        <th className="py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[17px]">
                      {d.rooms.map((r, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-4 font-semibold text-slate-800">{r.room_number || r.roomNumber || r.roomNo}</td>
                          <td className="py-2 pr-4">{formatCurrency(r.tariff || r.price)}</td>
                          <td className="py-2 pr-4">{r.gst || r.gstPercent || 0}%</td>
                          <td className="py-2 pr-4">{r.quantity || 1}</td>
                          <td className="py-2 font-semibold">{formatCurrency(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Folio (extra) charges added by the admin — fetched dynamically for this booking */}
            <div className={`md:col-span-3 ${cardTileCls}`}>
              <div className={sectionTitleCls}>Folio (Extra) Charges</div>
              {folioLoading ? (
                <div className="py-6 text-center text-slate-400">Loading folio charges...</div>
              ) : folioCharges.length === 0 ? (
                <div className="py-6 text-center text-slate-400">No extra folio charges added for this booking.</div>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left">
                    <thead className="text-base font-bold uppercase text-slate-400">
                      <tr>
                        <th className="py-2 pr-4">Charge Name</th>
                        <th className="py-2 pr-4">Description</th>
                        <th className="py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[17px]">
                      {folioCharges.map((entry) => (
                        <tr key={entry.id}>
                          <td className="py-2 pr-4 font-semibold text-slate-800">{entry.category || "Extra Charge"}</td>
                          <td className="py-2 pr-4 text-slate-600">{entry.description || "-"}</td>
                          <td className="py-2 font-semibold">{formatCurrency(entry.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td className="py-2 pr-4 font-bold text-slate-800" colSpan={2}>Folio Charges Total</td>
                        <td className="py-2 font-bold text-slate-900">{formatCurrency(folioChargesTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Updated grand total: Room Charges + Folio Charges, plus Remaining charge */}
            <div className={`md:col-span-3 ${cardTileCls} flex flex-wrap items-center justify-between gap-4`}>
              <div>
                <div className={sectionTitleCls + " !mb-0 !border-none !pb-0"}>Updated Total Amount</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600">{formatCurrency(updatedTotalAmount)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold uppercase text-slate-400">Remaining Charge</div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600">{formatCurrency(remainingAmount)}</div>
              </div>
            </div>
          </div>
        )}

        {showInvoiceModal && (
          <InvoiceModal
            booking={{ ...b, totalAmount: updatedTotalAmount }}
            roomChargesTotal={roomChargesTotal}
            folioCharges={folioCharges}
            paidAmount={advancePaid}
            onClose={() => setShowInvoiceModal(false)}
          />
        )}

        <div className="mt-6 sm:mt-8 flex flex-wrap justify-end gap-2 sm:gap-3 border-t border-slate-100 pt-5 sm:pt-6">
          <button onClick={goToList} className={ghostBtn}>Back to All Bookings</button>
          <button onClick={() => openManage(b)} className={primaryBtn}>Manage This Booking</button>
        </div>
      </div>
    );
  };

  /* ─────────────────────────── render: Manage Booking ─────────────────────────── */

  const renderManage = () => {
    const b = selectedBooking || {};
    return (
      <div className={panelCls}>
        <div className="mb-5 sm:mb-6 border-b border-slate-100 pb-4 sm:pb-5">
          <div className="text-sm font-bold uppercase text-slate-400">Managing Booking</div>
          <h2 className={cardTitleCls}>{b.bookingCode || `BK-${b.bookingId}`}</h2>
          <span className={`mt-2 ${statusBadgeCls(b.booking_status)}`}>
            {b.booking_status || "Pending"}
          </span>
        </div>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          <div className={cardTileCls}>
            <div className={sectionTitleCls}>Update Status</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={manageStatus} onChange={(e) => setManageStatus(e.target.value)} className={fieldCls}>
                <option value="">Select New Status</option>
                <option value="Checked-In">Checked-In</option>
                <option value="Checked-Out">Checked-Out</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (manageStatus === "Checked-In") handleLifecycle("check-in");
                  else if (manageStatus === "Checked-Out") handleLifecycle("check-out");
                  else if (manageStatus === "Cancelled") setCancelModal({ open: true, reason: "", submitting: false });
                  else showToast("error", "Select a status", "Please choose a status to update to.");
                }}
                className={primaryBtn}
              >
                Update
              </button>
            </div>

            <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => openEditBooking(b)} className={ghostBtn}><FaEdit className="text-sm" /> Edit Booking</button>
              <button onClick={() => handleLifecycle("check-in")} className={ghostBtn}><FaSignInAlt className="text-sm" /> Check-In</button>
              <button onClick={() => handleLifecycle("check-out")} className={ghostBtn}><FaSignOutAlt className="text-sm" /> Check-Out</button>
              <button onClick={() => setCancelModal({ open: true, reason: "", submitting: false })} className={dangerBtn}><FaBan className="text-sm" /> Cancel Booking</button>
            </div>

            <div className="mt-5 sm:mt-6 border-t border-slate-200 pt-5 sm:pt-6">
              <div className={sectionTitleCls}>Folio &amp; History</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => handleOpenFolio(b)} className={ghostBtn}>
                  <FaBook className="text-sm" /> Guest Folio
                </button>
                <button onClick={() => setShowDocumentUpload(true)} className={ghostBtn}>
                  <FaFileUpload className="text-sm" /> Upload Document
                </button>
                <button onClick={() => handleOpenPaymentHistory(b)} className={ghostBtn}>
                  <FaHistory className="text-sm" /> Payment History
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5 sm:space-y-6">
            <div className={cardTileCls}>
              <div className={sectionTitleCls}>Payment Actions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => setCollectModal({ open: true, amount: "", mode: "Cash", submitting: false })} className={ghostBtn}>
                  <FaMoneyBillWave className="text-sm" /> Collect Payment
                </button>
                <button onClick={() => setRefundModal({ open: true, amount: "", submitting: false })} className={ghostBtn}>
                  <FaUndo className="text-sm" /> Refund Payment
                </button>
              </div>
            </div>

            <div className={cardTileCls}>
              <div className={sectionTitleCls}>Send Notification</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => handleNotify("email")} className={ghostBtn}>
                  <FaEnvelope className="text-sm" /> Send Email to Guest
                </button>
                <button onClick={() => handleNotify("sms")} className={ghostBtn}>
                  <FaCommentDots className="text-sm" /> Send SMS to Guest
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex justify-end border-t border-slate-100 pt-5 sm:pt-6">
          <button onClick={goToList} className={ghostBtn}>Back to All Bookings</button>
        </div>
      </div>
    );
  };

  /* ─────────────────────────── page shell ─────────────────────────── */

  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 space-y-6 sm:space-y-8 p-3 sm:p-6 md:p-8 lg:p-10 xl:p-12"
      style={{ fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' }}
    >
    <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate("/hotel")}
          className="flex items-center gap-2 rounded-lg bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-white hover:text-blue-700 active:scale-[0.98] transition"
          title="Back to Hotel"
        >
          <FaArrowLeft className="text-base" />
          Back
        </button>
      </div>

      <FlowBar view={view} onJump={handleJumpStep} />

      {view === "list" && renderList()}
      {view === "form" && renderForm()}
      {view === "confirmed" && renderConfirmed()}
      {view === "details" && renderDetails()}
      {view === "manage" && renderManage()}

      {/* guest folio popup */}
      {showFolio && (
        <FeatureModal title="Guest Folio" size="max-w-[95vw]" onClose={handleCloseFolio}>
          <FolioView bookingId={selectedBookingId} onClose={handleCloseFolio} />
        </FeatureModal>
      )}

      {/* group booking popup */}
      {showGroupBooking && (
        <FeatureModal title="Group Booking" onClose={handleCloseGroupBooking}>
          <GroupBooking bookingId={selectedBookingId} onClose={handleCloseGroupBooking} />
        </FeatureModal>
      )}

      {/* guest profile popup */}
      {showGuestProfile && (
        <FeatureModal title="Guest Profile" size="max-w-[95vw]" onClose={handleCloseGuestProfile}>
          <GuestProfile bookingId={selectedBookingId} onClose={handleCloseGuestProfile} />
        </FeatureModal>
      )}

      {/* occupancy forecast popup */}
      {showOccupancyForecast && (
        <FeatureModal title="Occupancy Forecast" onClose={handleCloseOccupancyForecast}>
          <OccupancyForecast onClose={handleCloseOccupancyForecast} />
        </FeatureModal>
      )}

      {/* payment history popup */}
      {showPaymentHistory && (
        <PaymentHistoryModal
          booking={selectedBooking}
          onClose={handleClosePaymentHistory}
        />
      )}

      {/* add room popup — opens the existing Room.jsx page as a modal instead of navigating */}
      {showAddRoom && (
        <FeatureModal title="Add Room" onClose={handleCloseAddRoom}>
          <Room />
        </FeatureModal>
      )}


      {/* toast popup — shares the Modal primitive with every other popup below */}
      <Modal
        open={toast.open}
        onClose={closeToast}
        icon={toast.type === "success" ? FaCheckCircle : FaExclamationTriangle}
        iconTone={toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}
        title={toast.title}
        actions={
          <button onClick={closeToast} className={primaryBtn}>
            Continue
          </button>
        }
      >
        {toast.message}
      </Modal>

      {/* cancel booking popup */}
      <Modal
        open={cancelModal.open}
        onClose={() => setCancelModal({ open: false, reason: "", submitting: false })}
        icon={FaBan}
        iconTone="bg-rose-500"
        title="Cancel this booking?"
        actions={
          <>
            <button onClick={() => setCancelModal({ open: false, reason: "", submitting: false })} className={ghostBtn}>Close</button>
            <button onClick={handleConfirmCancel} disabled={cancelModal.submitting} className={dangerBtn}>
              {cancelModal.submitting ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </>
        }
      >
        <p>This will release the assigned room(s). This action cannot be undone.</p>
        <label className="mt-4 block text-left">
          <span className={labelCls}>Cancellation Reason</span>
          <textarea
            value={cancelModal.reason}
            onChange={(e) => setCancelModal((c) => ({ ...c, reason: e.target.value }))}
            rows={3}
            className={`${fieldCls} h-auto py-3`}
            placeholder="Guest changed mind, wrong date, pricing issue..."
          />
        </label>
      </Modal>

      {/* collect payment popup */}
      <Modal
        open={collectModal.open}
        onClose={() => setCollectModal({ open: false, amount: "", mode: "Cash", submitting: false })}
        icon={FaMoneyBillWave}
        iconTone="bg-emerald-500"
        title="Collect Payment"
        actions={
          <>
            <button onClick={() => setCollectModal({ open: false, amount: "", mode: "Cash", submitting: false })} className={ghostBtn}>Close</button>
            <button onClick={handleCollectPayment} disabled={collectModal.submitting} className={primaryBtn}>
              {collectModal.submitting ? "Saving..." : "Collect"}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input
              type="number"
              value={collectModal.amount}
              onChange={(e) => setCollectModal((c) => ({ ...c, amount: e.target.value }))}
              className={fieldCls}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelCls}>Payment Mode</label>
            <select value={collectModal.mode} onChange={(e) => setCollectModal((c) => ({ ...c, mode: e.target.value }))} className={fieldCls}>
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* refund payment popup */}
      <Modal
        open={refundModal.open}
        onClose={() => setRefundModal({ open: false, amount: "", submitting: false })}
        icon={FaUndo}
        iconTone="bg-blue-500"
        title="Refund Payment"
        actions={
          <>
            <button onClick={() => setRefundModal({ open: false, amount: "", submitting: false })} className={ghostBtn}>Close</button>
            <button onClick={handleRefund} disabled={refundModal.submitting} className={primaryBtn}>
              {refundModal.submitting ? "Processing..." : "Refund"}
            </button>
          </>
        }
      >
        <div className="text-left">
          <label className={labelCls}>Refund Amount (₹)</label>
          <input
            type="number"
            value={refundModal.amount}
            onChange={(e) => setRefundModal((r) => ({ ...r, amount: e.target.value }))}
            className={fieldCls}
            placeholder="0.00"
          />
        </div>
      </Modal>
    </div>
  );
};

export default BookingFlow;