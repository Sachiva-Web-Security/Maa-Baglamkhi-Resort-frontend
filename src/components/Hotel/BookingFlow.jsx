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
// -----------------------------------------------------------------------------
// PRINT-INVOICE FIX (this revision):
//  - The "Print" button on the Booking Details screen used to call
//    window.print(), which printed the ENTIRE Booking Details page (Guest
//    Info / Stay Info / Payment Info cards, buttons, everything visible).
//  - It now calls handlePrintInvoiceDirect(), which opens a separate print
//    window containing ONLY a properly formatted A4 tax invoice, built from
//    the SAME live data already on screen (room charges from bookingDetail.rooms,
//    folio/extra charges from folioCharges, advance paid from payment history).
//    This guarantees the printed total always matches what's shown on screen
//    (Room + Folio), instead of a possibly-stale backend invoice.total_amount.
// -----------------------------------------------------------------------------
//
// -----------------------------------------------------------------------------
// BOOKING HISTORY / PAYMENT HISTORY FIX (this revision):
//  - The FlowBar already had "Booking History" and "Payment History" steps,
//    and handleJumpStep already set view to "history" / "payments" and called
//    fetchHistory() / fetchAllPayments() — but there was NO renderHistory() /
//    renderPayments() function, and the final render block never checked for
//    those views. So clicking those tabs changed `view` but rendered nothing.
//  - Added renderHistory() and renderPayments() below, and wired them into the
//    final render block so both tabs now actually display their tables.
// -----------------------------------------------------------------------------

import axios from "axios";
import { getBackendBaseURL } from "../../api";

const bookingAPI = axios.create({
  baseURL: getBackendBaseURL() + "/api",
  timeout: 60_000,
  withCredentials: true,
});

bookingAPI.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  const method = String(req.method || "get").toLowerCase();
  const inferredAction =
    req.auditAction ||
    (req.url?.includes("/login")
      ? "login"
      : method === "delete"
      ? "delete"
      : method === "put" || method === "patch"
      ? "update"
      : method === "post"
      ? "create"
      : "read");
  req.headers["X-Audit-Action"] = inferredAction;
  req.headers["X-Audit-Source"] = "frontend";
  return req;
});

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
  FaWhatsapp,
  FaPaperPlane,
  FaUser,
  FaPhone,
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
  FaHotel,
  FaMapMarkerAlt,
  FaCreditCard,
} from "react-icons/fa";

import API from "../../api";
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

const cardTitleCls =
  "text-[22px] sm:text-2xl md:text-[28px] font-bold text-slate-900 leading-tight";

const heroTitleCls =
  "text-[30px] sm:text-4xl md:text-[42px] font-black text-slate-900 leading-tight";

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

/* Full-width variant of rowActionBtn used inside mobile card layouts (Booking
   History / Payment History) so every action button in a card footer shares
   equal width. Desktop table rows keep using rowActionBtn(tone) unchanged. */
const cardActionBtn = (tone = "neutral") => `${rowActionBtn(tone)} flex-1 min-w-[0] justify-center text-[13px] h-10 px-2`;

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
const RESORT_PHONE_INVOICE = "9522238777 / 9522239777";
const RESORT_EMAIL_INVOICE = "maabaglamukhiresort@gmail.com";
const RESORT_GSTIN_INVOICE = "23AVDPR292811ZG";
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

// Module-level toWords so handlePrintInvoiceDirect (and any other caller)
// outside InvoiceModal can use it without a scope error.
const toWords = (amount) => {
  if (!amount || amount <= 0) return "Rupees Zero Only";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const words = (n) => {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n/10)] + " " + words(n%10);
    if (n < 1000) return ones[Math.floor(n/100)] + " Hundred " + words(n%100);
    if (n < 1e5) return words(Math.floor(n/1000)) + " Thousand " + words(n%1000);
    if (n < 1e7) return words(Math.floor(n/1e5)) + " Lakh " + words(n%1e5);
    return words(Math.floor(n/1e7)) + " Crore " + words(n%1e7);
  };
  const rounded = Math.round(amount * 100) / 100;
  const whole = Math.floor(rounded);
  const paise = Math.round((rounded - whole) * 100);
  let result = "Rupees " + words(whole).trim();
  if (paise > 0) result += " and " + words(paise).trim() + " Paise";
  return result + " Only";
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
  {
    view: "history",
    num: 6,
    icon: FaHistory,
    title: "Booking History",
    desc: "Checked-out bookings archive with history",
  },
  {
    view: "payments",
    num: 7,
    icon: FaMoneyBillWave,
    title: "Payment History",
    desc: "All payment transactions across bookings",
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

const normalizeBooking = (b) => {
  if (!b || typeof b !== "object") return b;

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

  const bookingType =
    b.bookingType ||
    b.booking_type ||
    b.bookingSource ||
    b.booking_source ||
    b.booking_Type ||
    b.type ||
    b.source ||
    "";

  let rooms = b.rooms ?? b.room_numbers ?? b.roomNumbers ?? b.room_no ?? b.roomNo ?? "";
  if (Array.isArray(rooms)) {
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
      window.dispatchEvent(new Event("documentsUpdated"));
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
    window.dispatchEvent(new Event("documentsUpdated"));
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

const InvoiceModal = ({ booking, roomChargesTotal = 0, folioCharges = [], paidAmount = 0, rooms = [], onClose }) => {
  const bookingId = booking?.bookingId;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [folioChargesLocal, setFolioChargesLocal] = useState(folioCharges);
  const [totalPaidLocal, setTotalPaidLocal] = useState(paidAmount);

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

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [folioRes, phRes] = await Promise.all([
          API.get(`/hotel/folio/${bookingId}`),
          API.get(`/hotel/payment-history/${bookingId}`),
        ]);
        if (cancelled) return;
        const folioEntries = Array.isArray(folioRes.data) ? folioRes.data : [];
        setFolioChargesLocal(folioEntries.filter((e) => e.entry_type === "Extra Charge"));
        const history = Array.isArray(phRes.data) ? phRes.data : [];
        const total = history
          .filter((p) => p.payment_type !== "Refund")
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        setTotalPaidLocal(total);
      } catch {
        // best-effort; keep whatever the parent passed in
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bookingId]);

  const folioChargesTotal = folioChargesLocal.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const folioItems = (Array.isArray(folioChargesLocal) ? folioChargesLocal : []).map((e) => ({
    name: e.category || "Extra Charge",
    description: e.description || "Folio entry",
    quantity: 1,
    price: Number(e.amount) || 0,
    total: Number(e.amount) || 0,
    isFolio: true,
  }));

  const liveRoomItems = (Array.isArray(rooms) && rooms.length > 0 ? rooms : []).map((r, idx) => {
    const tariff = Number(r.tariff ?? r.price ?? 0);
    const qty = Number(r.quantity ?? 1);
    const gstPercent = Number(r.gst ?? r.gstPercent ?? 0);
    const total = Number(r.total || 0);
    const baseAmount = gstPercent > 0 ? total / (1 + gstPercent / 100) : total;
    const gstAmount = total - baseAmount;
    return {
      id: `room-${idx}-${r.room_number || r.roomNumber || r.roomNo || idx}`,
      name: `Room ${r.room_number || r.roomNumber || r.roomNo || idx + 1}`,
      description: `${r.room_type || r.category || "Room"} — ${qty} room(s)${gstPercent > 0 ? `, ${gstPercent}% GST` : ""}`,
      quantity: qty,
      price: tariff,
      gst: gstPercent,
      gstAmount: Math.round(gstAmount * 100) / 100,
      total: total,
      isRoom: true,
    };
  });

  let items;
  if (liveRoomItems.length > 0) {
    items = [...liveRoomItems, ...folioItems];
  } else {
    const backendItems = Array.isArray(invoice?.items) && invoice.items.length > 0 ? invoice.items : [
      { name: "Room Charges", description: "Total room / tariff charges", quantity: 1, price: roomChargesTotal, total: roomChargesTotal },
    ];
    const seenKeys = new Set();
    items = [
      ...backendItems.filter((it) => {
        if (!it) return false;
        const key = `${it.name || ""}|${Number(it.total ?? it.price ?? 0)}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      }),
      ...folioItems.filter((it) => {
        const key = `${it.name}|${it.total}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      }),
    ];
  }

  const itemsTotal = items.reduce((sum, it) => sum + (Number(it.total ?? it.price ?? 0) || 0), 0);

  const roomItemsTotal = items
    .filter((it) => it.isRoom)
    .reduce((sum, it) => sum + (Number(it.total ?? 0) || 0), 0);
  const folioOnlyTotal = items
    .filter((it) => it.isFolio)
    .reduce((sum, it) => sum + (Number(it.total ?? 0) || 0), 0);

  const invoiceNo = invoice?.invoiceNo || invoice?.invoice_no || `INV-${bookingId}`;
  const guestName = invoice?.customerName || invoice?.customer_name || booking?.guest_name || "Guest";
  const folioTotalAmount = roomItemsTotal + folioOnlyTotal;
  const invoiceTotal = itemsTotal > 0 ? itemsTotal : folioTotalAmount;
  const paid = Number(totalPaidLocal ?? paidAmount ?? invoice?.paidAmount ?? invoice?.paid_amount) || 0;
  const remainingAmount = paid > 0 ? Math.max(invoiceTotal - paid, 0) : invoiceTotal;

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
    ["Folio Total Amount", formatCurrency(folioTotalAmount)],
    ["Updated Total Amount", formatCurrency(invoiceTotal)],
    ["Advance Paid", formatCurrency(paid)],
    ["Remaining Amount", formatCurrency(remainingAmount)],
    ["Payment Status", invoice?.paymentStatus || invoice?.payment_status || (remainingAmount > 0 ? "Pending" : "Paid")],
  ];

  const handlePrint = () => {
    const d = invoice || {};
    const b = selectedBooking || {};

    const items = Array.isArray(d.items) && d.items.length > 0
      ? d.items
      : invoiceLines.length > 0
        ? invoiceLines.map((l) => ({
            name: l.particulars || l.description || "Charge",
            date: l.date || "",
            qty: l.quantity || 1,
            rate: l.tariff || l.rate || l.price || 0,
            amount: l.amount || l.total || 0,
          }))
        : [];

    const invoiceNo = d.invoiceNo || d.invoice_no || invoice?.invoice_number || b.bookingCode || `INV-${b.bookingId}`;
    const guestName = d.customerName || d.guestName || booking?.guest_name || "Guest";
    const roomType = d.roomType || b.roomType || booking?.roomType || "";
    const noOfNights = d.noOfNights || b.noOfNights || b.nights || booking?.noOfNights || "";

    const totalTariff = invoiceTotal;
    const totalDiscount = invoiceDiscount;
    const totalTaxable = invoiceSubtotal;
    const sgst = invoiceSgst;
    const cgst = invoiceCgst;
    const roundOff = Math.round(totalTariff * 100) / 100 - Math.round((totalTariff) * 100) / 100;
    const finalTotal = invoiceTotal;
    const remaining = Math.max(finalTotal - totalPaid, 0);
    const amountInWords = toWords(finalTotal);
    const paymentMode = d.paymentMode || d.payment_method || booking?.paymentMode || "Front Desk";
    const paymentRef = d.paymentReference || d.payment_reference || "";
    const invoiceDate = d.date ? formatDate(new Date(d.date)) : formatDate(new Date());

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const renderRow = (item) => {
      const dateStr = item.date ? formatDate(new Date(item.date)) : "";
      const name = item.name || item.description || "Charge";
      const qty = item.qty || item.quantity || 1;
      const rate = item.rate || item.price || item.tariff || 0;
      const disc = item.discount || 0;
      const taxable = item.taxable || (rate - disc);
      const sgstAmt = (taxable * 0.025);
      const cgstAmt = (taxable * 0.025);
      const total = item.amount || item.total || (rate * qty);
      return `<tr>
        <td>${dateStr}</td>
        <td>${name}${item.description && item.description !== name ? `<div style="font-size:9px;color:#64748b">${item.description}</div>` : ""}</td>
        <td>${formatCurrency(rate)}</td>
        <td>${disc > 0 ? formatCurrency(disc) : "0.00"}</td>
        <td>${formatCurrency(taxable)}</td>
        <td>${formatCurrency(sgstAmt)}</td>
        <td>${formatCurrency(cgstAmt)}</td>
        <td style="font-weight:700">${formatCurrency(total)}</td>
      </tr>`;
    };

    win.document.write(`
      <html>
      <head>
        <title>${invoiceNo} - ${RESORT_NAME_INVOICE}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          html, body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff !important;
            background-color: #ffffff !important;
            padding: 20px;
            font-size: 11px;
            line-height: 1.4;
          }
          .resort-header {
            text-align: center;
            padding: 10px 0 8px;
            border-bottom: 2px solid #0f172a;
            margin-bottom: 6px;
          }
          .resort-header .logo-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 4px;
          }
          .resort-header .logo-icon {
            width: 28px; height: 28px;
            background: #0f172a;
            color: #fff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; font-weight: 700;
          }
          .resort-header h1 { font-size: 18px; font-weight: 800; letter-spacing: 0.03em; }
          .resort-header .sub { font-size: 10px; color: #475569; margin-top: 2px; }
          .resort-header .gst-line { font-size: 10px; color: #475569; margin-top: 1px; }

          .meta-row {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 0;
            padding: 6px 0;
            border-bottom: 1px dashed #94a3b8;
            margin-bottom: 6px;
            align-items: end;
          }
          .meta-row .left { font-weight: 700; font-size: 13px; letter-spacing: 0.06em; }
          .meta-row .right { text-align: right; font-size: 10px; line-height: 1.6; }
          .meta-row .right .label { color: #64748b; font-size: 9px; font-weight: 600; }
          .meta-row .right .val { font-weight: 700; font-size: 11px; }

          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 6px;
          }
          .info-card {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-size: 10px;
          }
          .info-card .ic-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.08em; color: #64748b; margin-bottom: 2px;
          }
          .info-card .ic-value { font-weight: 700; font-size: 11px; }
          .info-card .ic-sub { font-size: 10px; color: #475569; margin-top: 1px; }

          table.items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            font-size: 10px;
          }
          table.items thead th {
            background: #0f172a;
            color: #ffffff;
            padding: 5px 6px;
            font-weight: 700;
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            border: 1px solid #0f172a;
          }
          table.items tbody td {
            padding: 4px 6px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            font-size: 10px;
          }
          .text-right { text-align: right; }

          .remarks-box {
            border: 1px solid #cbd5e1;
            padding: 4px 8px;
            font-size: 10px;
            margin-top: 4px;
            min-height: 28px;
          }
          .remarks-box .rb-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; color: #64748b;
          }

          .totals-area {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-top: 4px;
          }
          .tariff-box {
            border: 1px solid #cbd5e1;
            padding: 4px 8px;
            font-size: 10px;
          }
          .tariff-box .tb-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; color: #64748b; margin-bottom: 2px;
          }
          .tariff-box .tb-row {
            display: flex; justify-content: space-between;
            padding: 1px 0; font-size: 10px;
          }
          .tariff-box .tb-row .tb-lbl { color: #475569; }
          .tariff-box .tb-row.grand {
            border-top: 1px solid #e2e8f0;
            margin-top: 3px; padding-top: 3px;
            font-weight: 800; font-size: 12px;
          }

          .payment-box {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            color: #0f172a;
            padding: 8px 10px;
            font-size: 10px;
          }
          .payment-box .pb-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; color: #475569; margin-bottom: 2px;
          }
          .payment-box .pb-row {
            display: flex; justify-content: space-between;
            padding: 1px 0; font-size: 10px;
          }
          .payment-box .pb-row .pb-lbl { color: #475569; }
          .payment-box .pb-row.grand {
            border-top: 1px solid #e2e8f0;
            margin-top: 3px; padding-top: 3px;
            font-weight: 800; font-size: 13px;
          }
          .payment-box .pb-row .pb-lbl.grand { color: #0f172a; }

          .words-box {
            border: 1px solid #cbd5e1;
            padding: 3px 8px;
            font-size: 10px;
            margin-top: 4px;
            font-style: italic;
          }
          .words-box .wb-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; color: #64748b;
          }

          .footer-area {
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 9px;
            color: #64748b;
          }
          .sig-line {
            margin-top: 8px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .sig-label {
            font-size: 9px;
            font-weight: 600;
            color: #334155;
          }
        </style>
      </head>
      <body>
        <div class="resort-header">
          <div class="logo-row">
            <div class="logo-icon">M</div>
            <h1>${RESORT_NAME_INVOICE}</h1>
          </div>
          <div class="sub">${RESORT_ADDRESS_LINE_1}, ${RESORT_ADDRESS_LINE_2}</div>
          <div class="sub">Ph: ${RESORT_PHONE_INVOICE} | Email: ${RESORT_EMAIL_INVOICE}</div>
          <div class="gst-line">GSTIN: ${RESORT_GSTIN_INVOICE} | State: ${RESORT_STATE_CODE_INVOICE}</div>
        </div>

        <div class="meta-row">
          <div class="left">TAX INVOICE</div>
          <div class="right">
            <div><span class="label">Invoice No.&nbsp;&nbsp;</span><span class="val">${invoiceNo}</span></div>
            <div><span class="label">Folio No.&nbsp;&nbsp;</span><span class="val">${b.bookingId || "-"}</span></div>
          </div>
          <div class="right">
            <div><span class="label">Invoice Date&nbsp;&nbsp;</span><span class="val">${invoiceDate}</span></div>
            <div><span class="label">Room No.&nbsp;&nbsp;</span><span class="val">104</span></div>
            <div><span class="label">Room Type&nbsp;&nbsp;</span><span class="val">${roomType || "-"}</span></div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="ic-label">Guest Name</div>
            <div class="ic-value">${guestName}</div>
            <div class="ic-sub">Address: ${d.address || b.address || booking?.address || "-"}</div>
            <div class="ic-sub">Contact #: ${d.mobile || b.mobile || booking?.mobile || "-"}</div>
          </div>
          <div class="info-card">
            <div class="ic-label">Stay Details</div>
            <div class="ic-sub">Arrival: ${d.check_in || b.check_in ? formatDate(new Date(d.check_in || b.check_in)) : "-"}</div>
            <div class="ic-sub">Departure: ${d.check_out || b.check_out ? formatDate(new Date(d.check_out || b.check_out)) : "-"}</div>
            <div class="ic-sub">Pax: ${d.noOfGuests || d.guestCapacity || b.noOfGuests || b.guestCapacity || booking?.noOfGuests || "2 Adults, 0"} | No. of Nights: ${noOfNights || "-"}</div>
          </div>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th style="width:8%">Date</th>
              <th style="width:32%">Particulars</th>
              <th style="width:11%" class="text-right">Tariff</th>
              <th style="width:9%" class="text-right">Disc</th>
              <th style="width:11%" class="text-right">Taxable</th>
              <th style="width:10%" class="text-right">SGST 2.50%</th>
              <th style="width:10%" class="text-right">CGST 2.50%</th>
              <th style="width:9%" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.length > 0 ? items.map(renderRow).join("") : `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:12px">No charges recorded</td></tr>`}
          </tbody>
        </table>

        <div class="remarks-box">
          <span class="rb-label">Remarks: </span>
        </div>

        <div class="totals-area">
          <div>
            <div class="tariff-box">
              <div class="tb-label">Tariff Total</div>
              <div class="tb-row"><span class="tb-lbl">Discount</span><span>0.00</span></div>
              <div class="tb-row"><span class="tb-lbl">Taxable Amount</span><span>${formatCurrency(totalTaxable)}</span></div>
              <div class="tb-row"><span class="tb-lbl">SGST</span><span>${formatCurrency(sgst)}</span></div>
              <div class="tb-row"><span class="tb-lbl">CGST</span><span>${formatCurrency(cgst)}</span></div>
              <div class="tb-row"><span class="tb-lbl">Room Total</span><span>${formatCurrency(totalTariff)}</span></div>
              <div class="tb-row"><span class="tb-lbl">Round Off Disc.</span><span>0.00</span></div>
              <div class="tb-row grand"><span class="tb-lbl">Final Total</span><span>${formatCurrency(finalTotal)}</span></div>
              <div class="tb-row"><span class="tb-lbl">Service Total</span><span>0.00</span></div>
            </div>
            <div class="words-box">
              <span class="wb-label">Rupees ${amountInWords.replace("Rupees ", "").replace(" Only", "")} Only</span>
            </div>
          </div>
          <div>
            <div class="payment-box">
              <div class="pb-label">Payment Detail</div>
              <div class="pb-row"><span class="pb-lbl">UPI / Mode</span><span>${paymentMode}${paymentRef ? " (" + paymentRef + ")" : ""}</span></div>
              <div class="pb-row grand"><span class="pb-lbl grand">Final Total</span><span>${formatCurrency(finalTotal)}</span></div>
              <div class="pb-row"><span class="pb-lbl">Service Total</span><span>0.00</span></div>
              <div class="pb-row"><span class="pb-lbl">Balance</span><span>${formatCurrency(remaining)}</span></div>
            </div>
          </div>
        </div>

        <div class="footer-area">
          <div>Invoice issued under section 31 of CGST Act, 2017</div>
          <div style="margin-top:2px">Thank you for staying with ${RESORT_NAME_INVOICE}.</div>
        </div>
        <div class="sig-line">
          <div>
            <div class="sig-label">For MAA BAGLAMUKHI RESORT</div>
            <div style="margin-top:18px;border-top:1px solid #0f172a;display:inline-block;padding-top:3px;font-size:9px;font-weight:600;color:#334155">Authorised Signature</div>
          </div>
          <div style="text-align:right">
            <div class="sig-label">Guest Signature</div>
            <div style="margin-top:18px;border-top:1px solid #0f172a;display:inline-block;padding-top:3px;font-size:9px;font-weight:600;color:#334155"></div>
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

    doc.setFillColor(241, 245, 249);
    doc.rect(0, 0, pageWidth, 26, "F");
    doc.setTextColor(15, 23, 42);
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

    const colX = [margin + 2, margin + 50, margin + 120, margin + 145, rightEdge - 3];
    const headerRow = ["#", "Description", "Qty", "Rate", "Amount"];

    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    doc.setTextColor(15, 23, 42);
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

    ensureSpace(42);
    const totalsW = 72;
    const totalsX = rightEdge - totalsW;

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

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(totalsX, y, totalsW, 34, 1.5, 1.5, "F");
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(totalsX, y, totalsW, 34, 1.5, 1.5, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
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

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(tx, y + (invoiceDiscount > 0 ? 26 : 23), tv, y + (invoiceDiscount > 0 ? 26 : 23));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("GRAND TOTAL", tx, y + (invoiceDiscount > 0 ? 31 : 28));
    doc.text(formatCurrency(invoiceTotal), tv, y + (invoiceDiscount > 0 ? 31 : 28), { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("(inclusive of all taxes)", tv, y + (invoiceDiscount > 0 ? 34 : 31), { align: "right" });

    y += 40;

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Bank Details (for refund / credit):", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("A/C: 1234567890  |  IFSC: SBIN0001234  |  Bank: SBI  |  Branch: Baglamukhi", margin, y + 5);

    y += 12;

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

  const handleSendNotification = async () => {
    if (!bookingId || !invoice) {
      setSendStatus({ type: "error", message: "Invoice not ready yet. Please wait or Regenerate." });
      return;
    }
    setSending(true);
    setSendStatus(null);
    console.group("[Invoice] Send WhatsApp + SMS", { bookingId, invoiceNo: invoice?.invoiceNo });
    try {
      let adminNumber = "";

      const localStoragePhone = localStorage.getItem("phone") || "";
      console.log("[Invoice] localStorage phone:", localStoragePhone || "(empty)");
      if (localStoragePhone) {
        adminNumber = localStoragePhone;
      }

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

      if (!adminNumber) {
        const envAdmin =
          (import.meta && import.meta.env && import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER) || "";
        if (envAdmin) {
          adminNumber = envAdmin;
          console.log("[Invoice] using VITE_ADMIN_WHATSAPP_NUMBER from env:", envAdmin);
        }
      }

      console.log("[Invoice] Final adminNumber to send:", adminNumber || "(empty — backend will DB-fallback)");

      const cleanNumber = (num) => {
        const digits = String(num || "").replace(/\D/g, "");
        if (!digits) return "";
        return digits.length > 10 ? digits : `91${digits}`;
      };

      const payload = {
        adminNumber: cleanNumber(adminNumber),
        customerNumber: cleanNumber(invoice?.phone || booking?.mobile || ""),
      };
      console.log("[Invoice] POST payload:", payload);

      const pdfRes = await API.post(`/hotel/invoice/send-whatsapp/${bookingId}`, payload);
      const data = pdfRes.data || {};
      console.log("[WhatsApp] full response:", JSON.stringify(data, null, 2));
      console.log("[WhatsApp] customer.whatsapp:", data?.customer?.whatsapp);
      console.log("[WhatsApp] admin.whatsapp:", data?.admin?.whatsapp);

      const customerWa = data?.customer?.whatsapp || {};
      const adminWa = data?.admin?.whatsapp || {};

      const channels = [];
      if (customerWa?.ok) channels.push("customer WhatsApp");
      if (adminWa?.ok) channels.push("admin WhatsApp");

      const skipped = [];
      if (customerWa?.skipped) skipped.push(`customer WhatsApp (${customerWa.reason || "no number"})`);
      if (adminWa?.skipped) skipped.push(`admin WhatsApp (${adminWa.reason || "no number"})`);

      if (channels.length > 0) {
        setSendStatus({
          type: "success",
          message: `Invoice sent via: ${channels.join(", ")}${skipped.length ? ". Skipped: " + skipped.join(", ") : ""}`,
        });
      } else {
        setSendStatus({
          type: "error",
          message: `Could not send. Skipped: ${skipped.join(", ") || "Unknown error"}`,
        });
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
      size="max-w-[900px]"
      onClose={onClose}
    >
      {loading ? (
        <div className="py-16 text-center text-slate-400">Preparing invoice...</div>
      ) : (
        <div className="space-y-0">
          {/* ─── Action bar ─── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-400">Invoice Actions</span>
              {sendStatus ? (
                <div className={`rounded-full px-3 py-1.5 text-[13px] font-semibold border ${
                  sendStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {sendStatus.message}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleSendNotification} disabled={sending || loading || !invoice} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 h-12 text-[17px] font-bold text-white shadow-lg shadow-emerald-200 hover:from-emerald-700 hover:to-teal-600 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                <FaWhatsapp className="text-lg" />
                {sending ? "Sending..." : "Send WhatsApp + SMS"}
              </button>
              <button type="button" onClick={loadInvoice} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 h-12 text-[17px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 whitespace-nowrap">
                <FaSync className="text-sm" /> Regenerate
              </button>
              <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 h-12 text-[17px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 whitespace-nowrap">
                <FaPrint className="text-sm" /> Print
              </button>
              <button type="button" onClick={handleDownloadPdf} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 h-12 text-[17px] font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 whitespace-nowrap">
                <FaDownload className="text-sm" /> PDF
              </button>
            </div>
          </div>

          {/* ─── Invoice paper ─── */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

            {/* Brand header */}
            <div className="bg-slate-50 px-5 sm:px-8 py-5 sm:py-6 flex items-center gap-4 border-b border-slate-200">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xl">
                <FaHotel />
              </div>
              <div className="flex-1 text-center">
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide">TAX INVOICE</div>
                <div className="text-[13px] sm:text-sm font-semibold text-slate-600 mt-0.5">{RESORT_NAME_INVOICE}</div>
              </div>
              <div className="hidden sm:block rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-700 tracking-wide">
                GSTIN: {RESORT_GSTIN_INVOICE}
              </div>
            </div>

            {/* Meta strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-200">
              <div className="px-5 sm:px-8 py-4 border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Invoice No</div>
                <div className="text-lg font-black text-slate-900">{invoiceNo}</div>
              </div>
              <div className="px-5 sm:px-8 py-4 border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Invoice Date</div>
                <div className="text-base font-bold text-slate-800">{formatDate(invoice?.date || new Date())}</div>
              </div>
              <div className="px-5 sm:px-8 py-4 bg-slate-50/50">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Payment Status</div>
                <div>
                  <span className={statusBadgeCls(invoice?.paymentStatus || invoice?.payment_status || (remainingAmount > 0 ? "Pending" : "Paid"))}>
                    {invoice?.paymentStatus || invoice?.payment_status || (remainingAmount > 0 ? "Pending" : "Paid")}
                  </span>
                </div>
              </div>
            </div>

            {/* Folio info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200">
              <div className="px-5 sm:px-8 py-5 border-b md:border-b-0 md:border-r border-slate-200">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Bill To</div>
                <div className="space-y-2 text-[15px]">
                  <div className="flex items-start gap-2">
                    <FaUser className="mt-0.5 text-slate-400 text-sm shrink-0" />
                    <span className="font-bold text-slate-900">{invoice?.customerName || guestName || "Guest"}</span>
                  </div>
                  {(invoice?.address || booking?.address) && (
                    <div className="flex items-start gap-2">
                      <FaMapMarkerAlt className="mt-0.5 text-slate-400 text-sm shrink-0" />
                      <span className="text-slate-600">{invoice?.address || booking?.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FaPhone className="text-slate-400 text-sm shrink-0" />
                    <span className="text-slate-600">{invoice?.phone || booking?.mobile || "-"}</span>
                  </div>
                  {(invoice?.customerEmail || booking?.guest_email) && (
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="text-slate-400 text-sm shrink-0" />
                      <span className="text-slate-600">{invoice?.customerEmail || booking?.guest_email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FaIdCard className="text-slate-400 text-sm shrink-0" />
                    <span className="text-slate-600">Booking: {invoice?.bookingId || booking?.bookingId || "-"}</span>
                  </div>
                </div>
              </div>
              <div className="px-5 sm:px-8 py-5">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Stay Details</div>
                <div className="space-y-2 text-[15px]">
                  <div className="flex items-center gap-2">
                    <FaHotel className="text-slate-400 text-sm shrink-0" />
                    <span className="text-slate-600">Room: <strong className="text-slate-800">{invoice?.roomNumber || booking?.rooms || "-"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaBook className="text-slate-400 text-sm shrink-0" />
                    <span className="text-slate-600">Type: <strong className="text-slate-800">{booking?.bookingType || booking?.booking_type || "-"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaDoorOpen className="text-slate-400 text-sm shrink-0" />
                    <span className="text-slate-600">Check-In: <strong className="text-slate-800">{formatDate(invoice?.checkIn || invoice?.check_in || booking?.check_in)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaSignOutAlt className="text-slate-400 text-sm shrink-0" />
                    <span className="text-slate-600">Check-Out: <strong className="text-slate-800">{formatDate(invoice?.checkOut || invoice?.check_out || booking?.check_out)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaCreditCard className="text-slate-400 text-sm shrink-0" />
                    <span className="text-slate-600">Mode: <strong className="text-slate-800">{invoice?.paymentMode || invoice?.payment_method || "Front Desk"}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-[15px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900">
                    <th className="px-5 sm:px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-700">Date</th>
                    <th className="px-5 sm:px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-700">Particulars</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right text-slate-700">Tariff</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right text-slate-700">Disc</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right text-slate-700">Taxable</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right text-slate-700">SGST 2.5%</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right text-slate-700">CGST 2.5%</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right text-slate-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const p = Number(item.price) || 0;
                    const gstAmt = Number(item.gstAmount) || 0;
                    const tot = Number(item.total) || 0;
                    const halfGst = Math.round((gstAmt / 2) * 100) / 100;
                    const hasGst = (Number(item.gst) || 0) > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-5 sm:px-6 py-3 text-slate-600 whitespace-nowrap">
                          {formatDate(invoice?.date || booking?.check_in || new Date())}
                        </td>
                        <td className="px-5 sm:px-6 py-3">
                          <div className="font-bold text-slate-800">{item.name || item.description || "Item"}</div>
                          {item.description && item.description !== item.name && (
                            <div className="text-[13px] text-slate-400 mt-0.5">{item.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700 tabular-nums">{formatCurrency(p)}</td>
                        <td className="px-4 py-3 text-right text-slate-500 tabular-nums">-</td>
                        <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{hasGst ? formatCurrency(p) : formatCurrency(tot)}</td>
                        <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{hasGst ? formatCurrency(halfGst) : "-"}</td>
                        <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{hasGst ? formatCurrency(halfGst) : "-"}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums">{formatCurrency(tot)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals + Payment panel */}
            {(() => {
              const tariffTotal = items.reduce((s, it) => s + (Number(it.price) || 0), 0);
              const sgstTotal = items.reduce((s, it) => s + Math.round(((Number(it.gstAmount) || 0) / 2) * 100) / 100, 0);
              const cgstTotal = sgstTotal;
              const discountTotal = 0;
              const finalTotal = items.reduce((s, it) => s + (Number(it.total) || 0), 0);
              const roundOff = Math.round((finalTotal - tariffTotal - sgstTotal - cgstTotal) * 100) / 100;
              const amountInWords = toWords(finalTotal);
              const paymentMode = invoice?.paymentMode || invoice?.payment_method || "Front Desk";
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 border-t border-slate-200">
                  {/* Left: Remarks + Payment Detail */}
                  <div className="px-5 sm:px-8 py-5 border-b md:border-b-0 md:border-r border-slate-200">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Remarks</div>
                    <div className="text-[15px] text-slate-600 italic min-h-[24px]">
                      {(invoice?.remarks || booking?.remarks || invoice?.notes || "-") !== "-"
                        ? (invoice?.remarks || booking?.remarks || invoice?.notes)
                        : " "}
                    </div>

                    <div className="mt-5">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Payment Detail</div>
                      <div className="space-y-1.5 text-[15px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">UPI / {paymentMode}</span>
                          <span className="font-bold text-slate-800 tabular-nums">{formatCurrency(paid)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5">
                          <span className="text-slate-500 font-semibold">Balance</span>
                          <span className="font-black text-rose-600 tabular-nums">{formatCurrency(Math.max(finalTotal - paid, 0))}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Totals card */}
                  <div className="bg-slate-50 px-5 sm:px-8 py-5 border-l border-slate-200">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-slate-600">Tariff Total</span>
                        <span className="text-slate-900 font-semibold tabular-nums">{formatCurrency(tariffTotal)}</span>
                      </div>
                      {discountTotal > 0 && (
                        <div className="flex justify-between text-[13px]">
                          <span className="text-slate-600">Discount</span>
                          <span className="text-slate-900 font-semibold tabular-nums">- {formatCurrency(discountTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[13px]">
                        <span className="text-slate-600">Taxable</span>
                        <span className="text-slate-900 font-semibold tabular-nums">{formatCurrency(tariffTotal - discountTotal)}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-slate-600">SGST @ 2.5%</span>
                        <span className="text-slate-900 font-semibold tabular-nums">{formatCurrency(sgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-slate-600">CGST @ 2.5%</span>
                        <span className="text-slate-900 font-semibold tabular-nums">{formatCurrency(cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-slate-600">Round Off</span>
                        <span className="text-slate-900 font-semibold tabular-nums">{formatCurrency(roundOff)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 mt-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-700 font-bold uppercase tracking-wider">Final Total</span>
                          <span className="text-slate-900 font-black text-lg tabular-nums">{formatCurrency(finalTotal)}</span>
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100">
                        <div className="text-[12px] text-slate-600 italic leading-relaxed">
                          {amountInWords}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="border-t border-slate-200 px-5 sm:px-8 pt-5 pb-6">
              <div className="text-center">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">For MAA BAGLAMUKHI RESORT</div>
                <div className="flex items-end justify-center gap-8 sm:gap-16">
                  <div className="text-center">
                    <div className="border-t-2 border-slate-400 pt-2 w-28 sm:w-36">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Authorised Signature</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t-2 border-slate-400 pt-2 w-28 sm:w-36">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Guest Signature</div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 text-[11px] text-slate-400">
                  Invoice Generated By: <span className="font-semibold text-slate-500">{invoice?.generatedBy || "ABHISHEK RATHORE"}</span> &nbsp;|&nbsp; {formatDate(new Date())} {formatTime(new Date())}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </FeatureModal>
  );
};

/* ────────────────── WhatsApp Send Modal Component ─────────────────────────── */

const WhatsAppSendModal = ({ booking, detail, sending, result, onSend, onClose }) => {
  const b = booking || {};
  const guestName = detail?.guest_name || b.guest_name || "Guest";
  const customerPhone = detail?.mobile || b.mobile || "—";
  const invoiceNo = detail?.invoice?.invoiceNo || detail?.invoice_no || `BK-${b.bookingId}`;
  const invoiceTotal = detail?.invoice?.total_amount || detail?.invoice?.totalAmount || b.totalAmount || 0;
  const paymentStatus = detail?.invoice?.paymentStatus || detail?.invoice?.payment_status || (invoiceTotal > 0 ? "Pending" : "Paid");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={sending ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-[24px] shadow-[0_30px_80px_rgba(15,23,42,0.35)] overflow-hidden">

        {/* Brand header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 sm:px-6 py-5 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
            <FaWhatsapp className="text-[#25D366] text-3xl" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-black text-lg sm:text-xl leading-tight">Send Invoice via WhatsApp</h3>
            <p className="text-white/75 text-xs sm:text-sm mt-0.5">Invoice will be sent with PDF attachment</p>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4">

          {/* Summary strip */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invoice</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">{invoiceNo}</div>
            </div>
            <div className="flex-1 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Total Amount</div>
              <div className="text-sm font-black text-emerald-700 mt-0.5">{formatCurrency(invoiceTotal)}</div>
            </div>
            <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</div>
              <div className="mt-1">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700" :
                  paymentStatus === "Pending" ? "bg-amber-50 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Guest card */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Guest Information</div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <FaUser className="text-sm" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Guest Name</div>
                <div className="text-[15px] font-black text-slate-900">{guestName}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <FaPhone className="text-sm" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Mobile Number</div>
                <div className="text-[15px] font-black text-slate-900">{customerPhone}</div>
              </div>
            </div>
            {detail?.guest_email || b.guestEmail ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                  <FaEnvelope className="text-sm" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Email</div>
                  <div className="text-[15px] font-black text-slate-900">{detail?.guest_email || b.guestEmail || "-"}</div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Delivery channels */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <FaWhatsapp className="text-emerald-600 text-lg" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Customer</span>
              </div>
              <div className="text-[13px] font-bold text-slate-800">{customerPhone}</div>
              <div className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Will receive PDF</div>
            </div>
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <FaHotel className="text-slate-500 text-lg" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Admin (Resort)</span>
              </div>
              <div className="text-[13px] font-bold text-slate-800">Resort Notification</div>
              <div className="mt-1.5 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">Notification copy</div>
            </div>
          </div>

          {/* Result banner */}
          {result && (
            <div className={`rounded-xl border-l-[4px] p-4 ${
              result.type === "success"
                ? "border-l-emerald-500 bg-emerald-50"
                : result.type === "partial"
                ? "border-l-amber-500 bg-amber-50"
                : "border-l-rose-500 bg-rose-50"
            }`}>
              <div className="flex items-start gap-3">
                {result.type === "success" && <FaCheckCircle className="text-emerald-600 text-lg mt-0.5 shrink-0" />}
                {result.type === "partial" && <FaExclamationTriangle className="text-amber-600 text-lg mt-0.5 shrink-0" />}
                {result.type === "error" && <FaTimes className="text-rose-600 text-lg mt-0.5 shrink-0" />}
                <div>
                  <p className={`font-bold text-[15px] ${
                    result.type === "success" ? "text-emerald-800"
                    : result.type === "partial" ? "text-amber-800"
                    : "text-rose-800"
                  }`}>
                    {result.type === "success" ? "Sent Successfully"
                    : result.type === "partial" ? "Partially Sent"
                    : "Failed to Send"}
                  </p>
                  <p className={`text-[13px] mt-1 ${
                    result.type === "success" ? "text-emerald-600"
                    : result.type === "partial" ? "text-amber-600"
                    : "text-rose-600"
                  }`}>
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer action row */}
        <div className="px-5 sm:px-6 pb-5 pt-1">
          {!sending && !result && (
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 text-[15px]">
                Cancel
              </button>
              <button onClick={onSend} className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl active:scale-[0.98] transition-all duration-200 text-[15px] flex items-center justify-center gap-2">
                <FaPaperPlane className="text-sm" /> Send Now
              </button>
            </div>
          )}
          {sending && (
            <div className="flex items-center justify-center gap-3 py-3">
              <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-slate-500 font-medium text-[15px]">Sending...</span>
            </div>
          )}
          {result && !sending && (
            <button onClick={onClose} className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-[0.98] transition-all duration-200 text-[15px]">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const BookingFlow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const today = todayISO();

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

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [folioCharges, setFolioCharges] = useState([]);
  const [folioLoading, setFolioLoading] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState(null);

  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });
  const [cancelModal, setCancelModal] = useState({ open: false, reason: "", submitting: false });
  const [collectModal, setCollectModal] = useState({ open: false, amount: "", mode: "Cash", submitting: false });
  const [refundModal, setRefundModal] = useState({ open: false, amount: "", submitting: false });
  const [manageStatus, setManageStatus] = useState("");
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);

  // Booking History (view === "history") and Payment History (view === "payments")
  // full-page state — these are the real "Booking History" / "Payment History"
  // steps in the top status bar, separate from the per-booking PaymentHistoryModal.
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 9;

  const [allPayments, setAllPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

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

  // Dedupe booking-history rows by guest+mobile+stay-dates, keeping only the
  // most recent bookingId per unique stay (protects against duplicate rows
  // if the backend returns the same checked-out stay more than once).
  const dedupeHistory = (rows) => {
    const map = new Map();
    rows.forEach((row) => {
      const key = [
        String(row.guest_name || "").trim().toLowerCase(),
        String(row.mobile || "").trim(),
        String(row.check_in || "").trim(),
        String(row.check_out || "").trim(),
      ].join("|");
      const current = map.get(key);
      if (!current || Number(row.bookingId || 0) > Number(current.bookingId || 0)) {
        map.set(key, row);
      }
    });
    return Array.from(map.values());
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await API.get("/hotel/booking-history");
      setHistory(dedupeHistory(Array.isArray(res.data) ? res.data : []));
      setHistoryPage(1);
    } catch (err) {
      console.error("Failed to load booking history:", err);
      showToast("error", "Could not load history", "Please check your connection.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Pulls payment-history for the most recently created bookings and
  // flattens them into one combined, sorted transaction list for the
  // "Payment History" status-bar step (renderPayments).
  const fetchAllPayments = async () => {
    try {
      setPaymentsLoading(true);
      const recent = [...bookings]
        .sort((a, b) => Number(b.bookingId || 0) - Number(a.bookingId || 0))
        .slice(0, 8);

      const results = await Promise.all(
        recent.map((b) =>
          API.get(`/hotel/payment-history/${b.bookingId}`)
            .then((res) => ({ booking: b, entries: Array.isArray(res.data) ? res.data : [] }))
            .catch(() => ({ booking: b, entries: [] })),
        ),
      );

      const flattened = results.flatMap(({ booking, entries }) =>
        entries.map((entry) => ({
          id: entry.id || `${booking.bookingId}-${entry.created_at || Math.random()}`,
          bookingId: booking.bookingId,
          bookingCode: booking.bookingCode || `BK-${booking.bookingId}`,
          guestName: entry.guest_name || booking.guest_name || "Guest",
          amount: Number(entry.amount || 0),
          discount: Number(entry.discount_amount || 0),
          paymentMode: entry.payment_mode || "-",
          paymentType: entry.payment_type || entry.type || "Payment",
          createdAt: entry.created_at || booking.check_in,
          status: Number(booking.remainingAmount) > 0 ? "Pending" : "Paid",
          rooms: entry.rooms || booking.rooms || "-",
        })),
      );

      flattened.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllPayments(flattened);
    } catch (err) {
      console.error("Failed to load payment history:", err);
      showToast("error", "Could not load payment history", "Please try again.");
      setAllPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    API.get("/hotel/rooms/setup")
      .then((res) => setCategorySetup(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to load room categories:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const syncFolio = async () => {
      const bookingId = selectedBooking?.bookingId;
      if (!bookingId) return;
      try {
        const folioRes = await API.get(`/hotel/folio/${bookingId}`);
        const allEntries = Array.isArray(folioRes.data) ? folioRes.data : [];
        setFolioCharges(allEntries.filter((e) => e.entry_type === "Extra Charge"));
      } catch (err) {
        console.error("Failed to reload folio charges after update:", err);
        setFolioCharges([]);
      }
    };

    window.addEventListener("folioUpdated", syncFolio);
    return () => window.removeEventListener("folioUpdated", syncFolio);
  }, [selectedBooking]);

  useEffect(() => {
    if (!prefillRoomNumber) return;

    setView("form");

    setFormData((prev) => {
      const base = shouldResetDraft ? emptyForm() : prev;
      return {
        ...base,
        checkIn: prefillCheckIn || base.checkIn,
        checkOut: prefillCheckOut || base.checkOut,
      };
    });

    const resolveCategoryId = () => {
      if (!prefillCategory || !categorySetup.length) return "";
      const wanted = normalizeRoomTypeName(prefillCategory);

      const exact = categorySetup.find(
        (c) => normalizeRoomTypeName(c.name) === wanted,
      );
      if (exact) return String(exact.id);

      const tokens = wanted.split(/\s+/).filter(Boolean);
      const fuzzy = categorySetup.find((c) =>
        tokens.every((t) => normalizeRoomTypeName(c.name).includes(t)),
      );
      if (fuzzy) return String(fuzzy.id);

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

    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySetup.length, prefillRoomNumber, prefillCategory]);

  useEffect(() => {
    if (!location.state?.autoManage) return;

    const bookingId = location.state.bookingId || null;
    const focusRoomNo = location.state.focusRoomNo || null;
    const guestName = location.state.guestName || "";

    const resolveBooking = () => {
      if (bookingId) {
        const byId = bookings.find(
          (b) =>
            String(b.bookingId) === String(bookingId) ||
            String(b.booking_code) === String(bookingId) ||
            String(b.bookingCode) === String(bookingId),
        );
        if (byId) return byId;
      }

      if (focusRoomNo) {
        const byRoom = bookings.find((b) => {
          const roomTokens = [
            b.rooms,
            b.roomNumber,
            b.roomNo,
          ]
            .filter(Boolean)
            .flatMap((v) =>
              typeof v === "string" ? v.split(",").map((s) => s.trim()) : [String(v)],
            )
            .filter(Boolean);
          return roomTokens.includes(String(focusRoomNo));
        });
        if (byRoom) return byRoom;
      }

      if (guestName) {
        return (
          bookings.find(
            (b) =>
              String(b.guest_name || b.guestName || "")
                .toLowerCase()
                .includes(guestName.toLowerCase()),
          ) || null
        );
      }

      return null;
    };

    const matched = resolveBooking();
    if (matched) {
      openManage(matched);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    setSearch(focusRoomNo || guestName || "");
    setView("list");
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, location.state?.autoManage, location.state?.bookingId, location.state?.focusRoomNo, location.state?.guestName]);


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
      const data = res.data || {};
      setBookingDetail(data);
      if (data.mobile) {
        setSelectedBooking((prev) => ({ ...(prev || {}), mobile: data.mobile }));
      }
    } catch (err) {
      console.error(err);
      setBookingDetail(null);
    } finally {
      setDetailLoading(false);
    }
    try {
      const folioRes = await API.get(`/hotel/folio/${booking.bookingId}`);
      const allEntries = Array.isArray(folioRes.data) ? folioRes.data : [];
      setFolioCharges(allEntries.filter((e) => e.entry_type === "Extra Charge"));
    } catch (err) {
      console.error("Failed to load folio charges:", err);
      setFolioCharges([]);
    } finally {
      setFolioLoading(false);
    }
    try {
      const phRes = await API.get(`/hotel/payment-history/${booking.bookingId}`);
      const history = Array.isArray(phRes.data) ? phRes.data : [];
      const total = history
        .filter((p) => p.payment_type !== "Refund")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      setTotalPaid(total);
    } catch (err) {
      console.error("Failed to load payment history for total paid:", err);
      setTotalPaid(0);
    }
  };

  const openManage = async (booking) => {
    setSelectedBooking(booking);
    setManageStatus(booking.booking_status || "");
    setView("manage");
    try {
      const res = await API.get(`/hotel/full-booking/${booking.bookingId}`);
      const data = res.data || {};
      if (data.mobile) {
        setSelectedBooking((prev) => ({ ...(prev || {}), mobile: data.mobile }));
      }
    } catch { /* best-effort */ }
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

  if (stepView === "history") {
    setView("history");
    fetchHistory();
    return;
  }

  if (stepView === "payments") {
    setView("payments");
    fetchAllPayments();
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

  const updateRoomRow = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id !== id) return r;

        if (field === "categoryId") {
          const cat = categorySetup.find((c) => String(c.id) === String(value));
          return {
            ...r,
            categoryId: value,
            roomNo: "",
            price: cat ? Number(cat.defaultPrice || 0) : r.price,
          };
        }

        return { ...r, [field]: value };
      }),
    }));
  };

  const getRoomNumbersForCategory = (categoryId, currentRoomNo = "") => {
    const cat = categorySetup.find((c) => String(c.id) === String(categoryId));
    if (!cat) return [];

    const statusByRoom = new Map();
    (Array.isArray(cat.roomDetails) ? cat.roomDetails : []).forEach((rd) => {
      if (rd.roomNumber) {
        statusByRoom.set(String(rd.roomNumber).trim(), rd.status || "Available");
      }
    });

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
    if (!Array.isArray(formData.rooms) || formData.rooms.length === 0) {
      showToast("error", "Room required", "Please add at least one room tariff row before saving.");
      return false;
    }
    const missingRoomIndex = formData.rooms.findIndex((row) => !row || !String(row.roomNo || "").trim());
    if (missingRoomIndex !== -1) {
      showToast(
        "error",
        "Room number required",
        `Row ${missingRoomIndex + 1}: room number select karna mandatory hai. Bina room number ke booking save nahi hogi.`,
      );
      return false;
    }
    const duplicateRoom = (() => {
      const seen = new Set();
      for (let i = 0; i < formData.rooms.length; i += 1) {
        const key = String(formData.rooms[i]?.roomNo || "").trim();
        if (!key) continue;
        if (seen.has(key)) return { index: i, roomNo: key };
        seen.add(key);
      }
      return null;
    })();
    if (duplicateRoom) {
      showToast(
        "error",
        "Duplicate room",
        `Room ${duplicateRoom.roomNo} is already added in row ${duplicateRoom.index + 1}. Please select a different room.`,
      );
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
        const guestRes = await bookingAPI.post("/hotel/guest", {
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

        const buildPayload = (row) => ({
          roomNumber: row.roomNo,
          date: new Date().toISOString().slice(0, 19).replace("T", " "),
          quantity: row.quantity,
          tariff: row.price,
          gstPercent: row.gst,
          total: rowTotal(row, stayNights),
        });

        const parallelTasks = [
          bookingAPI.post(`/hotel/other-booking/${bookingId}`, {
            bookingType: formData.bookingType,
            bookingSource: formData.bookingType,
            bookingReference: formData.reference,
            address: formData.address,
            country: "",
            state: "",
            city: "",
            pincode: "",
          }),
          bookingAPI.post(`/hotel/reference/${bookingId}`, {
            guestType: "",
            guestNotes: formData.remarks,
            internalNotes: formData.purposeOfVisit,
          }),
          bookingAPI.post(`/hotel/company/${bookingId}`, {
            companyName: formData.company || "Direct Booking",
            gst: "",
          }),
          bookingAPI.post(`/hotel/pax/${bookingId}`, {
            guestCapacity: formData.guestCapacity,
            owner: formData.owner,
            rooms: formData.rooms,
          }),
          ...formData.rooms.map((row) =>
            bookingAPI.post(`/hotel/room-tariff/${bookingId}`, buildPayload(row)),
          ),
        ];

        if (Number(formData.amount) > 0) {
          parallelTasks.push(
            bookingAPI.post(`/hotel/advance/${bookingId}`, {
              amount: Number(formData.amount),
              discount: 0,
              paymentMode: formData.paymentMode || "Cash",
              notes: formData.paymentNote,
            }),
          );
        }

        await Promise.all(parallelTasks);
      } else {
        await bookingAPI.put(`/hotel/full-booking/${bookingId}`, {
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

  const queueRoomsForCleaning = async (booking) => {
    const roomNumbers = extractRoomNumbersFromBooking(booking);
    if (!roomNumbers.length) return;

    const guestName = booking?.guest_name || booking?.guestName || "";
    const bookingCode = booking?.bookingCode || booking?.booking_code || "";

    for (const roomNumber of roomNumbers) {
      const roomKey = String(roomNumber).trim();
      if (!roomKey) continue;

      try {
        await API.put(`/housekeeping/status/${roomKey}`, { status: "Vacant Dirty" });
      } catch (error) {
        console.warn(`Failed to mark room ${roomKey} dirty after checkout`, error);
      }

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

  const handleLifecycle = async (action, booking = selectedBooking) => {
    if (!booking?.bookingId) return;
    const newStatus = action === "check-out" ? "Checked-Out" : "Checked-In";
    try {
      await API.put(`/hotel/${action}/${booking.bookingId}`);
      if (action === "check-out") {
        await queueRoomsForCleaning(booking);
      }
      showToast(
        "success",
        action === "check-out" ? "Checked Out" : "Checked In",
        action === "check-out"
          ? "Guest has been checked out. Room moved to Cleaning on the Dashboard."
          : "Guest has been checked in successfully.",
      );
      await fetchBookings();
      // Optimistic update: immediately patch the local bookings list
      // so the Check-In / Check-Out button flips instantly in the UI
      // even if the server round-trip is slow or cached.
      setBookings((prev) =>
        prev.map((b) =>
          String(b.bookingId) === String(booking.bookingId) ? { ...b, booking_status: newStatus } : b
        )
      );
      setSelectedBooking((prev) => ({ ...(prev || {}), booking_status: newStatus }));
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

  const handleCloseDocumentUpload = () => {
    setShowDocumentUpload(false);
    window.dispatchEvent(new Event("folioUpdated"));
  };

  const handleOpenGroupBooking = (booking) => {
    if (!booking?.bookingId) return;
    setSelectedBookingId(booking.bookingId);
    setShowGroupBooking(true);
  };

  // Send invoice to customer WhatsApp + admin WhatsApp directly from booking details
  const handleSendWhatsAppFromDetails = async () => {
    const bid = selectedBooking?.bookingId;
    if (!bid) return;
    setWaSending(true);
    setWaResult(null);
    try {
      let invoiceId = null;
      try {
        const existing = await API.get(`/invoice/by-booking/${bid}`);
        if (existing.data?.id) invoiceId = existing.data.id;
      } catch { /* not found, will generate */ }

      if (!invoiceId) {
        const generated = await API.get(`/invoice/${bid}`);
        if (!generated.data) {
          setWaResult({ type: "error", message: "Could not generate invoice." });
          setWaSending(false);
          return;
        }
      }

      const customerMobile = selectedBooking?.mobile || "";
      const res = await API.post(`/hotel/invoice/send-whatsapp/${bid}`, {
        customerNumber: customerMobile,
      });
      const data = res.data || {};
      console.log("[WhatsApp-details] full response:", JSON.stringify(data, null, 2));

      const customerWa = data?.customer?.whatsapp || {};
      const adminWa = data?.admin?.whatsapp || {};

      if (customerWa?.ok && adminWa?.ok) {
        setWaResult({ type: "success", message: "Invoice PDF sent to customer WhatsApp and admin WhatsApp." });
      } else if (customerWa?.ok) {
        setWaResult({ type: "partial", message: "Sent to customer WhatsApp. Admin WhatsApp skipped." });
      } else {
        const waError = customerWa?.error || adminWa?.error || "Unknown error";
        const shortError = waError.length > 80 ? waError.substring(0, 80) + "..." : waError;
        setWaResult({ type: "error", message: shortError });
      }
    } catch (err) {
      setWaResult({ type: "error", message: err.response?.data?.error || err.message || "Send failed." });
    } finally {
      setWaSending(false);
    }
  };

  // ============================================================
  // PRINT-INVOICE: builds a proper A4 tax invoice matching the
  // reference image layout (traditional paper invoice format).
  // Uses live booking/folio data from the Booking Details screen.
  // ============================================================
  const handlePrintInvoiceDirect = () => {
    const d = bookingDetail || {};
    const b = selectedBooking || {};

    const roomChargesTotal = Array.isArray(d.rooms) && d.rooms.length > 0
      ? d.rooms.reduce((sum, r) => sum + (Number(r.total) || 0), 0)
      : Number(b.totalAmount) || 0;

    const folioChargesTotal = folioCharges.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const finalTotal = roomChargesTotal + folioChargesTotal;
    const effectivePaid = totalPaid > 0 ? totalPaid : (Number(b.paidAmount) || 0);
    const remainingAmount = effectivePaid > 0 ? Math.max(finalTotal - effectivePaid, 0) : finalTotal;
    const invoiceNo = d.invoice_no || d.invoiceNo || b.bookingCode || `INV-${b.bookingId}`;
    const guestName = d.guest_name || b.guest_name || "Guest";
    const roomType = d.room_type || b.room_type || b.roomType || "Single";
    const roomNo =
      d.room_no ||
      d.roomNumber ||
      d.room_no_list ||
      (Array.isArray(d.rooms) && d.rooms[0]
        ? d.rooms[0].room_number || d.rooms[0].roomNo || d.rooms[0].room_no
        : null) ||
      b.room_no ||
      b.roomNumber ||
      (Array.isArray(b.rooms) && b.rooms[0]
        ? b.rooms[0].room_number || b.rooms[0].roomNo || b.rooms[0].room_no
        : null) ||
      "104";
    const noOfNights = d.no_of_nights || b.no_of_nights || b.nights || d.nights || 1;
    const pax = d.no_of_guests || d.guest_capacity || b.no_of_guests || "2 Adults, 0";
    const guestAddress = d.address || b.address || "BHOPAL";
    const guestContact = d.mobile || d.contact_no || b.mobile || b.contact_no || "-";
    const checkInDate = d.check_in || b.check_in ? formatDate(new Date(d.check_in || b.check_in)) : "-";
    const checkOutDate = d.check_out || b.check_out ? formatDate(new Date(d.check_out || b.check_out)) : "-";
    const arrivalTime = d.arrival_time || d.arrival || "4:25 pm";
    const departureTime = d.departure_time || d.departure || "10:00 am";
    const amountInWords = toWords(finalTotal);
    const paymentMode = d.payment_mode || d.paymentMode || b.payment_mode || "Front Desk";
    const paymentRef = d.payment_reference || d.paymentReference || "";

    const roomItems = (Array.isArray(d.rooms) ? d.rooms : []).map((r) => ({
      date: d.check_in ? formatDate(new Date(d.check_in)) : "",
      particulars: `Room Charges - ${r.room_type || r.category || "Room"} - ${r.room_number || r.roomNo || ""}`,
      tariff: Number(r.tariff || r.price || 0),
      disc: 0,
      taxable: Number(r.tariff || r.price || 0),
      sgst: Number((Number(r.tariff || r.price || 0) * 0.025).toFixed(2)),
      cgst: Number((Number(r.tariff || r.price || 0) * 0.025).toFixed(2)),
      total: Number(r.total || 0),
    }));

    const folioItems = folioCharges.map((e) => ({
      date: e.date ? formatDate(new Date(e.date)) : "",
      particulars: e.description || e.category || "Extra Charge",
      tariff: Number(e.amount) || 0,
      disc: 0,
      taxable: Number(e.amount) || 0,
      sgst: Number((Number(e.amount || 0) * 0.025).toFixed(2)),
      cgst: Number((Number(e.amount || 0) * 0.025).toFixed(2)),
      total: Number(e.amount || 0),
    }));

    const allItems = [...roomItems, ...folioItems];
    const tariffTotal = allItems.reduce((s, i) => s + i.tariff, 0);
    const totalDiscount = allItems.reduce((s, i) => s + i.disc, 0);
    const totalTaxable = allItems.reduce((s, i) => s + i.taxable, 0);
    const totalSgst = allItems.reduce((s, i) => s + i.sgst, 0);
    const totalCgst = allItems.reduce((s, i) => s + i.cgst, 0);
    const roundOff = 0.00;
    const serviceTotal = 0.00;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const renderInvoiceRow = (item) => `
      <tr>
        <td>${item.date}</td>
        <td>${item.particulars}</td>
        <td class="text-right">${formatCurrency(item.tariff)}</td>
        <td class="text-right">${formatCurrency(item.disc)}</td>
        <td class="text-right">${formatCurrency(item.taxable)}</td>
        <td class="text-right">${formatCurrency(item.sgst)}</td>
        <td class="text-right">${formatCurrency(item.cgst)}</td>
        <td class="text-right" style="font-weight:700">${formatCurrency(item.total)}</td>
      </tr>
    `;

    win.document.write(`
      <html>
      <head>
        <title>${invoiceNo} - ${RESORT_NAME_INVOICE}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          html, body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff !important;
            background-color: #ffffff !important;
            padding: 16px;
            font-size: 10px;
            line-height: 1.35;
          }
          .resort-header {
            text-align: center;
            padding: 8px 0 6px;
            border-bottom: 2px solid #94a3b8;
            margin-bottom: 4px;
          }
          .resort-header .logo-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-bottom: 3px;
          }
          .resort-header .logo-icon {
            width: 22px; height: 22px;
            background: #0f172a;
            color: #fff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700;
          }
          .resort-header h1 { font-size: 16px; font-weight: 800; letter-spacing: 0.03em; }
          .resort-header .sub { font-size: 9px; color: #475569; margin-top: 1px; }
          .resort-header .gst-line { font-size: 9px; color: #475569; margin-top: 1px; }

          .meta-row {
            display: grid;
            grid-template-columns: auto 1fr 1fr;
            gap: 0;
            padding: 5px 0;
            border-bottom: 1px dashed #94a3b8;
            margin-bottom: 4px;
            align-items: start;
          }
          .meta-row .left { font-weight: 700; font-size: 12px; letter-spacing: 0.06em; padding-top: 2px; }
          .meta-row .right { text-align: right; font-size: 9px; line-height: 1.5; }
          .meta-row .right .label { color: #64748b; font-size: 8px; font-weight: 600; }
          .meta-row .right .val { font-weight: 700; font-size: 10px; }

          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin-bottom: 4px;
          }
          .info-card {
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            font-size: 9px;
          }
          .info-card .ic-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.08em; color: #64748b; margin-bottom: 2px;
          }
          .info-card .ic-value { font-weight: 700; font-size: 10px; }
          .info-card .ic-sub { font-size: 9px; color: #475569; margin-top: 1px; }

          table.items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 3px;
            font-size: 9px;
          }
          table.items thead th {
            background: #e2e8f0;
            color: #0f172a;
            padding: 4px 5px;
            font-weight: 700;
            text-align: left;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          table.items tbody td {
            padding: 3px 5px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            font-size: 9px;
          }
          .text-right { text-align: right; }

          .remarks-box {
            border: 1px solid #cbd5e1;
            padding: 3px 7px;
            font-size: 9px;
            margin-top: 3px;
            min-height: 24px;
          }
          .remarks-box .rb-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; color: #64748b;
          }

          .totals-area {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin-top: 3px;
          }
          .tariff-box {
            border: 1px solid #cbd5e1;
            padding: 4px 7px;
            font-size: 9px;
          }
          .tariff-box .tb-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; color: #64748b; margin-bottom: 2px;
          }
          .tariff-box .tb-row {
            display: flex; justify-content: space-between;
            padding: 0.5px 0; font-size: 9px;
          }
          .tariff-box .tb-row .tb-lbl { color: #475569; }
          .tariff-box .tb-row.grand {
            border-top: 1px solid #e2e8f0;
            margin-top: 2px; padding-top: 2px;
            font-weight: 800; font-size: 11px;
          }
          .tariff-box .tb-row.grand .tb-lbl { color: #0f172a; font-weight: 800; }

          .payment-box {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            color: #0f172a;
            padding: 6px 8px;
            font-size: 9px;
          }
          .payment-box .pb-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; color: #475569; margin-bottom: 2px;
          }
          .payment-box .pb-row {
            display: flex; justify-content: space-between;
            padding: 0.5px 0; font-size: 9px;
          }
          .payment-box .pb-row .pb-lbl { color: #475569; }
          .payment-box .pb-row.grand {
            border-top: 1px solid #e2e8f0;
            margin-top: 2px; padding-top: 2px;
            font-weight: 800; font-size: 11px;
          }
          .payment-box .pb-row.grand .pb-lbl { color: #0f172a; font-weight: 800; }

          .words-box {
            border: 1px solid #cbd5e1;
            padding: 2px 7px;
            font-size: 9px;
            margin-top: 3px;
            font-style: italic;
          }
          .words-box .wb-label {
            font-size: 8px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; color: #64748b;
          }

          .footer-area {
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 8px;
            color: #64748b;
          }
          .sig-line {
            margin-top: 6px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .sig-label {
            font-size: 8px;
            font-weight: 600;
            color: #334155;
          }
          .sig-underline {
            display: inline-block;
            border-top: 1px solid #0f172a;
            padding-top: 2px;
            min-width: 100px;
            font-size: 8px;
            font-weight: 600;
            color: #334155;
            margin-top: 14px;
          }
        </style>
      </head>
      <body>
        <div class="resort-header">
          <div class="logo-row">
            <div class="logo-icon">M</div>
            <h1>${RESORT_NAME_INVOICE}</h1>
          </div>
          <div class="sub">${RESORT_ADDRESS_LINE_1}, ${RESORT_ADDRESS_LINE_2}</div>
          <div class="sub">Ph: ${RESORT_PHONE_INVOICE} | Email: ${RESORT_EMAIL_INVOICE}</div>
          <div class="gst-line">GSTIN: ${RESORT_GSTIN_INVOICE} | State: ${RESORT_STATE_CODE_INVOICE}</div>
        </div>

        <div class="meta-row">
          <div class="left">TAX INVOICE</div>
          <div class="right">
            <div><span class="label">Invoice No.&nbsp;&nbsp;</span><span class="val">${invoiceNo}</span></div>
            <div><span class="label">Folio No.&nbsp;&nbsp;</span><span class="val">${b.bookingId || "-"}</span></div>
          </div>
          <div class="right">
            <div><span class="label">Invoice Date&nbsp;&nbsp;</span><span class="val">${formatDate(new Date())}</span></div>
            <div><span class="label">Room No.&nbsp;&nbsp;</span><span class="val">${roomNo}</span></div>
            <div><span class="label">Room Type&nbsp;&nbsp;</span><span class="val">${roomType}</span></div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="ic-label">Guest Name</div>
            <div class="ic-value">${guestName}</div>
            <div class="ic-sub">Address: ${guestAddress}</div>
            <div class="ic-sub">Contact #: ${guestContact}</div>
          </div>
          <div class="info-card">
            <div class="ic-label">Stay Details</div>
            <div class="ic-sub">Arrival: ${checkInDate} ${arrivalTime}</div>
            <div class="ic-sub">Departure: ${checkOutDate} ${departureTime}</div>
            <div class="ic-sub">Pax: ${pax} | No. of Nights: ${noOfNights}</div>
          </div>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th style="width:8%">Date</th>
              <th style="width:32%">Particulars</th>
              <th style="width:11%" class="text-right">Tariff</th>
              <th style="width:9%" class="text-right">Disc</th>
              <th style="width:11%" class="text-right">Taxable</th>
              <th style="width:10%" class="text-right">SGST 2.50%</th>
              <th style="width:10%" class="text-right">CGST 2.50%</th>
              <th style="width:9%" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${allItems.length > 0 ? allItems.map(renderInvoiceRow).join("") : `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:10px">No charges recorded</td></tr>`}
          </tbody>
        </table>

        <div class="remarks-box">
          <span class="rb-label">Remarks</span>
        </div>

        <div class="totals-area">
          <div>
            <div class="tariff-box">
              <div class="tb-label">Tariff Total</div>
              <div class="tb-row"><span class="tb-lbl">Discount</span><span>0.00</span></div>
              <div class="tb-row"><span class="tb-lbl">Taxable Amount</span><span>${formatCurrency(totalTaxable)}</span></div>
              <div class="tb-row"><span class="tb-lbl">SGST</span><span>${formatCurrency(totalSgst)}</span></div>
              <div class="tb-row"><span class="tb-lbl">CGST</span><span>${formatCurrency(totalCgst)}</span></div>
              <div class="tb-row grand"><span class="tb-lbl">Room Total</span><span>${formatCurrency(roomChargesTotal)}</span></div>
              <div class="tb-row"><span class="tb-lbl">Round Off Disc.</span><span>${formatCurrency(roundOff)}</span></div>
              <div class="tb-row grand"><span class="tb-lbl">Final Total</span><span>${formatCurrency(finalTotal)}</span></div>
              <div class="tb-row"><span class="tb-lbl">Service Total</span><span>${formatCurrency(serviceTotal)}</span></div>
            </div>
            <div class="words-box">
              <span class="wb-label">Rupees ${amountInWords.replace("Rupees ", "").replace(" Only", "")} Only</span>
            </div>
          </div>
          <div>
            <div class="payment-box">
              <div class="pb-label">Payment Detail</div>
              <div class="pb-row"><span class="pb-lbl">UPI</span><span>${paymentRef || "-"}</span></div>
              <div class="pb-row grand"><span class="pb-lbl grand">Final Total</span><span>${formatCurrency(finalTotal)}</span></div>
              <div class="pb-row"><span class="pb-lbl">Service Total</span><span>${formatCurrency(serviceTotal)}</span></div>
              <div class="pb-row"><span class="pb-lbl">Balance</span><span>${formatCurrency(remainingAmount)}</span></div>
            </div>
          </div>
        </div>

        <div class="footer-area">
          <div>Invoice issued under section 31 of CGST Act, 2017</div>
          <div style="margin-top:1px">Thank you for staying with ${RESORT_NAME_INVOICE}.</div>
        </div>
        <div class="sig-line">
          <div>
            <div class="sig-label">For MAA BAGLAMUKHI RESORT</div>
            <div class="sig-underline">Authorised Signature</div>
          </div>
          <div style="text-align:right">
            <div class="sig-label">Guest Signature</div>
            <div style="text-align:right"><span class="sig-underline" style="min-width:80px"></span></div>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
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
                      <button
                        title="Guest Profile"
                        onClick={() => handleOpenGuestProfile(b)}
                        className={rowActionBtn("neutral")}
                      >
                        <FaIdCard className="text-[18px] sm:text-xl" />
                        <span>Guest Profile</span>
                      </button>
                      {(b.booking_status === "Pending" || b.booking_status === "Confirmed" || !b.booking_status) && (
                        <button
                          title="Check In"
                          onClick={() => {
                            setSelectedBooking(b);
                            handleLifecycle("check-in", b);
                          }}
                          className={rowActionBtn("primary")}
                        >
                          <FaSignInAlt className="text-[18px] sm:text-xl" />
                          <span>Check-In</span>
                        </button>
                      )}
                      {(b.booking_status === "Checked-In") && (
                        <button
                          title="Check Out"
                          onClick={() => {
                            setSelectedBooking(b);
                            handleLifecycle("check-out", b);
                          }}
                          className={rowActionBtn("primary")}
                        >
                          <FaSignOutAlt className="text-[18px] sm:text-xl" />
                          <span>Check-Out</span>
                        </button>
                      )}

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

  /* ─────────────────────────── render: New / Edit Booking ─────────────────────────── */

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
      <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-emerald-500 text-3xl sm:text-4xl text-white shadow-[0_14px_30px_rgba(16,185,129,0.35)]">
        <FaCheckCircle />
      </div>

      <h2 className={`mt-5 ${heroTitleCls} text-center`}>
        Booking Confirmed!
      </h2>

      <p className="mt-2 text-[17px] sm:text-lg text-slate-500 text-center">
        Your booking has been confirmed successfully.
      </p>

      <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-emerald-50 px-5 py-4 shadow-sm text-center">
        <div className="text-sm font-bold uppercase text-emerald-600">
          Booking Reference
        </div>

        <div className="mt-1 text-2xl font-black text-emerald-700 break-all">
          {formData.bookingCode || formData.bookingId}
        </div>
      </div>

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

      <div className="mt-10 flex justify-center w-full">
        <div className="grid w-full max-w-xl grid-cols-1 gap-4">
          <button
            type="button"
            onClick={goToList}
            className={`${primaryBtn} w-full`}
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

    const roomChargesTotal = Array.isArray(d.rooms) && d.rooms.length > 0
      ? d.rooms.reduce((sum, r) => sum + (Number(r.total) || 0), 0)
      : Number(b.totalAmount) || 0;

    const folioChargesTotal = folioCharges.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const updatedTotalAmount = roomChargesTotal + folioChargesTotal;

    const advancePaid = Number(
      d.paidAmount ??
        d.paid_amount ??
        d.advancePaid ??
        d.advance_paid ??
        d.amountPaid ??
        d.amount_paid ??
        d.totalPaid ??
        d.total_paid ??
        b.paidAmount ??
        b.paid_amount ??
        b.advancePaid ??
        b.advance_paid ??
        0,
    ) || 0;

    const effectivePaid = totalPaid > 0 ? totalPaid : advancePaid;
    const remainingAmount = effectivePaid > 0
      ? Math.max(updatedTotalAmount - effectivePaid, 0)
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
            {/*
              PRINT-INVOICE FIX: this button used to call window.print(),
              which printed the whole Booking Details screen. It now calls
              handlePrintInvoiceDirect(), which opens a separate A4 window
              containing ONLY a real invoice built from live room + folio
              + advance-paid data.
            */}
            <button onClick={handlePrintInvoiceDirect} className={ghostBtn}>
              <FaPrint className="text-sm" /> Print Invoice
            </button>
            <button onClick={() => openEditBooking(b)} className={ghostBtn}>
              <FaEdit className="text-sm" /> Edit
            </button>
            <button onClick={() => setShowInvoiceModal(true)} className={primaryBtn}>
              <FaFileAlt className="text-sm" /> Generate Invoice
            </button>
            <button onClick={() => { setWaResult(null); setShowWhatsAppModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold rounded-lg shadow-md transition-all duration-200 hover:shadow-lg text-sm">
              <FaWhatsapp className="text-lg" /> Send Invoice via WhatsApp
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
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Advance Paid</dt><dd className="font-bold text-emerald-600">{formatCurrency(effectivePaid)}</dd></div>
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
            paidAmount={effectivePaid}
            rooms={d.rooms || []}
            onClose={() => setShowInvoiceModal(false)}
          />
        )}

        {showWhatsAppModal && (
          <WhatsAppSendModal
            booking={b}
            detail={d}
            sending={waSending}
            result={waResult}
            onSend={handleSendWhatsAppFromDetails}
            onClose={() => { if (!waSending) setShowWhatsAppModal(false); }}
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
                  if (manageStatus === "Checked-In") handleLifecycle("check-in", b);
                  else if (manageStatus === "Checked-Out") handleLifecycle("check-out", b);
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
              {(b.booking_status === "Pending" || b.booking_status === "Confirmed" || !b.booking_status) && (
                <button onClick={() => handleLifecycle("check-in", b)} className={ghostBtn}><FaSignInAlt className="text-sm" /> Check-In</button>
              )}
              {b.booking_status === "Checked-In" && (
                <button onClick={() => handleLifecycle("check-out", b)} className={ghostBtn}><FaSignOutAlt className="text-sm" /> Check-Out</button>
              )}
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


          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex justify-end border-t border-slate-100 pt-5 sm:pt-6">
          <button onClick={goToList} className={ghostBtn}>Back to All Bookings</button>
        </div>
      </div>
    );
  };

  /* ─────────────────────────── render: Booking History (view === "history") ─────────────────────────── */
  /* FIX: this render function was MISSING before. The FlowBar tab and         */
  /* handleJumpStep("history") already existed and correctly called            */
  /* fetchHistory(), but nothing rendered for view === "history", so the tab   */
  /* appeared to "not show" anything. This restores that screen using the      */
  /* existing history / historyLoading / historyPage / HISTORY_PAGE_SIZE state.*/

  const renderHistory = () => {
    const totalHistoryPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
    const pagedHistory = history.slice(
      (historyPage - 1) * HISTORY_PAGE_SIZE,
      historyPage * HISTORY_PAGE_SIZE,
    );

    return (
      <div className={panelCls}>
        <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 sm:pb-5">
          <div>
            <h2 className={cardTitleCls}>Booking History</h2>
            <p className="mt-1 text-[17px] text-slate-500">Checked-out bookings archive</p>
          </div>
          <button type="button" onClick={fetchHistory} disabled={historyLoading} className={ghostBtn}>
            <FaSync className={historyLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div className="max-w-full overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[960px] text-left">
            <thead className="bg-slate-50 text-base font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 sm:px-5 py-3 sm:py-4">Booking</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4">Guest</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4">Contact</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4">Stay Dates</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4">Rooms</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4">Total</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4">Remaining</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4">Status</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[17px]">
              {historyLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    Loading history...
                  </td>
                </tr>
              ) : pagedHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    No checked-out bookings yet.
                  </td>
                </tr>
              ) : (
                pagedHistory.map((row) => {
                  const remaining = Number(row.remainingAmount || 0);
                  const roomDetails = String(row.roomDetails || row.rooms || "-")
                    .split(" || ")
                    .join(", ");
                  return (
                    <tr key={row.bookingId} className="hover:bg-slate-50/70">
                      <td className="px-4 sm:px-5 py-3 sm:py-4 font-bold text-slate-800">
                        {row.bookingCode || `BK-${row.bookingId}`}
                        <div className="text-[13px] font-normal text-slate-400">{row.company_name || "Direct booking"}</div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-700">{row.guest_name || "Walk-in Guest"}</td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">
                        {row.mobile || "-"}
                        <div className="text-[13px] text-slate-400 break-words max-w-[200px]">{row.guest_email || "-"}</div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">
                        {formatDate(row.check_in)} → {formatDate(row.check_out)}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">{roomDetails}</td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4 font-semibold text-slate-800">{formatCurrency(row.totalAmount)}</td>
                      <td className={`px-4 sm:px-5 py-3 sm:py-4 font-semibold ${remaining > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {formatCurrency(row.remainingAmount)}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4">
                        <span className={statusBadgeCls(row.booking_status || "Checked-Out")}>
                          {row.booking_status || "Checked-Out"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            title="Payment history"
                            onClick={() => {
                              setSelectedBooking(row);
                              setShowPaymentHistory(true);
                            }}
                            className={rowActionBtn("primary")}
                          >
                            <FaMoneyBillWave className="text-lg" />
                            <span>Payments</span>
                          </button>
                          <button
                            title="View details"
                            onClick={() => openDetails(row)}
                            className={rowActionBtn("neutral")}
                          >
                            <FaEye className="text-lg" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {history.length > 0 && (
          <div className="mt-5 flex flex-col sm:flex-row flex-wrap items-center justify-center sm:justify-between gap-3 text-[17px] text-slate-500">
            <span className="text-center sm:text-left">
              Showing {pagedHistory.length ? (historyPage - 1) * HISTORY_PAGE_SIZE + 1 : 0}
              {" "}to {(historyPage - 1) * HISTORY_PAGE_SIZE + pagedHistory.length} of {history.length} records
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition disabled:opacity-40"
              >
                <FaChevronLeft className="text-sm" />
              </button>
              {Array.from({ length: totalHistoryPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHistoryPage(i + 1)}
                  className={`h-10 w-10 sm:h-11 sm:w-11 rounded-lg text-[17px] font-bold transition ${
                    historyPage === i + 1 ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={historyPage >= totalHistoryPages}
                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition disabled:opacity-40"
              >
                <FaChevronRight className="text-sm" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 sm:mt-8 flex justify-end border-t border-slate-100 pt-5 sm:pt-6">
          <button onClick={goToList} className={ghostBtn}>Back to All Bookings</button>
        </div>
      </div>
    );
  };

  /* ─────────────────────────── render: Payment History (view === "payments") ─────────────────────────── */
  /* FIX: same issue as renderHistory above — this render function was         */
  /* MISSING. handleJumpStep("payments") already called fetchAllPayments()     */
  /* correctly, filling allPayments / paymentsLoading, but the tab had         */
  /* nothing to display. This restores that screen.                           */

  const renderPayments = () => (
    <div className={panelCls}>
      <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 sm:pb-5">
        <div>
          <h2 className={cardTitleCls}>Payment History</h2>
          <p className="mt-1 text-[17px] text-slate-500">Recent payment transactions across bookings</p>
        </div>
        <button type="button" onClick={fetchAllPayments} disabled={paymentsLoading} className={ghostBtn}>
          <FaSync className={paymentsLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="max-w-full overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-slate-50 text-base font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Booking</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Guest</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Rooms</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Amount</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Mode</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Type</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Date</th>
              <th className="px-4 sm:px-5 py-3 sm:py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[17px]">
            {paymentsLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  Loading payments...
                </td>
              </tr>
            ) : allPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No payment transactions found.
                </td>
              </tr>
            ) : (
              allPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="px-4 sm:px-5 py-3 sm:py-4 font-bold text-slate-800">{p.bookingCode}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-700">{p.guestName}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">{p.rooms}</td>
                  <td className={`px-4 sm:px-5 py-3 sm:py-4 font-semibold ${p.paymentType === "Refund" ? "text-rose-600" : "text-emerald-600"}`}>
                    {p.paymentType === "Refund" ? "-" : "+"}{formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">{p.paymentMode}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">{p.paymentType}</td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 sm:px-5 py-3 sm:py-4">
                    <span className={statusBadgeCls(p.status)}>{p.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 sm:mt-8 flex justify-end border-t border-slate-100 pt-5 sm:pt-6">
        <button onClick={goToList} className={ghostBtn}>Back to All Bookings</button>
      </div>
    </div>
  );

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
      {view === "history" && renderHistory()}
      {view === "payments" && renderPayments()}

      {showFolio && (
        <FeatureModal title="Guest Folio" size="max-w-[95vw]" onClose={handleCloseFolio}>
          <FolioView bookingId={selectedBookingId} onClose={handleCloseFolio} />
        </FeatureModal>
      )}

      {showGroupBooking && (
        <FeatureModal title="Group Booking" onClose={handleCloseGroupBooking}>
          <GroupBooking bookingId={selectedBookingId} onClose={handleCloseGroupBooking} />
        </FeatureModal>
      )}

      {showGuestProfile && (
        <FeatureModal title="Guest Profile" size="max-w-[95vw]" onClose={handleCloseGuestProfile}>
          <GuestProfile bookingId={selectedBookingId} onClose={handleCloseGuestProfile} />
        </FeatureModal>
      )}

      {showOccupancyForecast && (
        <FeatureModal title="Occupancy Forecast" onClose={handleCloseOccupancyForecast}>
          <OccupancyForecast onClose={handleCloseOccupancyForecast} />
        </FeatureModal>
      )}

      {showPaymentHistory && (
        <PaymentHistoryModal
          booking={selectedBooking}
          onClose={handleClosePaymentHistory}
        />
      )}

      {showDocumentUpload && (
        <DocumentUploadModal
          booking={selectedBooking}
          onClose={handleCloseDocumentUpload}
        />
      )}

      {showAddRoom && (
        <FeatureModal title="Add Room" onClose={handleCloseAddRoom}>
          <Room />
        </FeatureModal>
      )}


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