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
import { useLocation, useNavigate } from "react-router-dom";
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
} from "react-icons/fa";

import API, { getBackendBaseURL } from "../../api";
import { todayISO } from "../Dashboard/stayoverUtils";
import { setStoredBookingId, setStoredBookingCode } from "./bookingSession";

/* ─────────────────────────── shared style tokens ─────────────────────────── */
/* One scale, used everywhere on the page (list, form, confirmation, details,
   manage, modals) so typography, spacing and sizing never drift between
   sections. This is intentionally the same scale the old "New Booking"
   section used for its main columns, just applied consistently. */

const fieldCls =
  "w-full h-12 sm:h-13 md:h-14 rounded-2xl border border-blue-200 bg-white px-4 sm:px-5 text-base sm:text-lg font-medium text-slate-800 shadow-sm transition-all duration-300 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:shadow-lg outline-none";

const labelCls =
  "mb-2 block text-sm sm:text-base md:text-lg font-semibold text-slate-700";

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
text-lg sm:text-xl md:text-2xl
font-bold
text-blue-900
`;

const btnBase =
  `
inline-flex
items-center
justify-center
gap-2
rounded-2xl
px-5 sm:px-7 md:px-8
py-3
sm:py-3.5
text-base
sm:text-lg
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

const softBtn = (active) =>
  `
inline-flex
items-center
justify-center
gap-2
rounded-2xl
px-4 sm:px-5
py-2.5 sm:py-3
text-sm sm:text-base md:text-lg
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

const DOCUMENT_TYPE_LABELS = {
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
  `inline-block rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-bold ${statusStyle(status)}`;

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
              <h3 className="mt-1 text-xl sm:text-2xl font-black leading-tight text-slate-900">
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
        <div className="text-base sm:text-lg leading-relaxed text-slate-600">{children}</div>
        {actions && (
          <div className="mt-7 sm:mt-8 flex flex-wrap justify-end gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────── top flow bar (image-1 style) ─────────────────────────── */

const FLOW_STEPS = [
  { view: "form", num: 1, icon: FaUserPlus, title: "New Booking", desc: "Fill all booking details and create a new reservation" },
  { view: "confirmed", num: 2, icon: FaCheckCircle, title: "Booking Confirmed", desc: "Booking is confirmed and reference number generated" },
  { view: "list", num: 3, icon: FaListUl, title: "All Bookings", desc: "View all bookings in a list with status and details" },
  { view: "details", num: 4, icon: FaEye, title: "Booking Details", desc: "View full details of any specific booking" },
  { view: "manage", num: 5, icon: FaCogs, title: "Manage Booking", desc: "Edit, Cancel, Check-in / Check-out or Update payment" },
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
                className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full text-base sm:text-lg transition ${
                  isActive
                    ? "bg-sky-500 text-white shadow-[0_8px_18px_rgba(14,165,233,0.35)]"
                    : "bg-sky-50 text-sky-600 group-hover:bg-sky-100"
                }`}
              >
                <Icon />
              </span>
              <span className={`text-xs sm:text-sm font-bold leading-snug ${isActive ? "text-sky-700" : "text-slate-700"}`}>
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

const rowTotal = (row) => {
  const base = Number(row.price || 0) * Number(row.quantity || 0);
  return base + (base * Number(row.gst || 0)) / 100;
};

/* ─────────────────────────── main component ─────────────────────────── */

const BookingFlow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const today = todayISO();

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

  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });
  const [cancelModal, setCancelModal] = useState({ open: false, reason: "", submitting: false });
  const [collectModal, setCollectModal] = useState({ open: false, amount: "", mode: "Cash", submitting: false });
  const [refundModal, setRefundModal] = useState({ open: false, amount: "", submitting: false });
  const [manageStatus, setManageStatus] = useState("");

  const showToast = (type, title, message) => setToast({ open: true, type, title, message });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  /* ---------- data loading ---------- */

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/hotel/all-bookings");
      setBookings(Array.isArray(res.data) ? res.data : []);
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

  const grandTotal = useMemo(
    () => formData.rooms.reduce((sum, row) => sum + rowTotal(row), 0),
    [formData.rooms],
  );

  const guestFullName = `${formData.firstName} ${formData.lastName}`.trim();

  const stayNights = useMemo(() => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const inD = new Date(formData.checkIn);
    const outD = new Date(formData.checkOut);
    const diff = Math.round((outD - inD) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [formData.checkIn, formData.checkOut]);

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
        rooms: (Array.isArray(data.rooms) ? data.rooms : []).map((r) => ({
          id: uid(),
          roomNo: r.room_number || r.roomNumber || r.roomNo || "",
          price: r.tariff || r.price || 0,
          gst: r.gst || r.gstPercent || 0,
          quantity: r.quantity || 1,
        })),
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
    try {
      const res = await API.get(`/hotel/full-booking/${booking.bookingId}`);
      setBookingDetail(res.data || null);
    } catch (err) {
      console.error(err);
      setBookingDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openManage = (booking) => {
    setSelectedBooking(booking);
    setManageStatus(booking.booking_status || "");
    setView("manage");
  };

  const handleJumpStep = (stepView) => {
    if (stepView === "list") return goToList();
    if (stepView === "form") return openNewBooking();
    if (stepView === "confirmed") {
      if (!formData.bookingId) {
        showToast("error", "No booking yet", "Create or open a booking first — this screen shows the confirmation of a booking you just saved.");
        return;
      }
      setView("confirmed");
      return;
    }
    if (stepView === "details" || stepView === "manage") {
      if (!selectedBooking) {
        showToast("error", "Select a booking first", "Open a booking from “All Bookings” to view its details or manage it.");
        return;
      }
      if (stepView === "details") openDetails(selectedBooking);
      else openManage(selectedBooking);
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
    setFormData((prev) => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          id: uid(),
          roomNo: "",
          price: cat ? Number(cat.defaultPrice || 0) : 0,
          gst: 0,
          quantity: Number(prev.noOfRooms) || 1,
        },
      ],
    }));
  };

  const updateRoomRow = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
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
            total: rowTotal(row),
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
            total: rowTotal(r),
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

  const handleLifecycle = async (action) => {
    if (!selectedBooking?.bookingId) return;
    try {
      await API.put(`/hotel/${action}/${selectedBooking.bookingId}`);
      showToast(
        "success",
        action === "check-out" ? "Checked Out" : "Checked In",
        action === "check-out" ? "Guest has been checked out successfully." : "Guest has been checked in successfully.",
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

  // Folio / Night-Audit and Payment History are still separate, standalone
  // pages in your app (not part of this consolidated flow), so opening them
  // is a normal route navigation — same as your old AllBooking.jsx did.
  const handleOpenFolio = (booking) => {
    if (!booking?.bookingId) return;
    setStoredBookingId(booking.bookingId);
    navigate("/hotel/folio", { state: { bookingId: booking.bookingId } });
  };

  const handleOpenPaymentHistory = (booking) => {
    if (!booking?.bookingId) return;
    setStoredBookingId(booking.bookingId);
    navigate("/hotel/payment-history", { state: { bookingId: booking.bookingId } });
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
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">All Bookings</h2>
          <p className="mt-1 text-base sm:text-lg text-slate-500">View and manage all your hotel reservations</p>
        </div>
        <button type="button" onClick={openNewBooking} className={primaryBtn}>
          <FaPlus className="text-lg sm:text-xl" /> New Booking
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
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500">
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
          <tbody className="divide-y divide-slate-100 text-sm sm:text-base md:text-lg">
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
                    <div className="flex items-center justify-end gap-2">
                      <button title="View details" onClick={() => openDetails(b)} className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 active:scale-95">
                        <FaEye className="text-sm sm:text-base" />
                      </button>
                      <button title="Edit booking" onClick={() => openEditBooking(b)} className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 active:scale-95">
                        <FaEdit className="text-sm sm:text-base" />
                      </button>
                      <button title="Guest folio" onClick={() => handleOpenFolio(b)} className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 active:scale-95">
                        <FaBook className="text-sm sm:text-base" />
                      </button>
                      <button title="Manage booking" onClick={() => openManage(b)} className="rounded-lg border border-rose-200 p-2.5 text-rose-600 transition hover:bg-rose-50 active:scale-95">
                        <FaTrash className="text-sm sm:text-base" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base text-slate-500">
        <span>
          Showing {pagedBookings.length ? (page - 1) * pageSize + 1 : 0}
          {" "}to {(page - 1) * pageSize + pagedBookings.length} of {filteredBookings.length} entries
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 p-2.5 text-slate-500 transition disabled:opacity-40"
          >
            <FaChevronLeft className="text-sm" />
          </button>
          {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg text-sm sm:text-base font-bold transition ${
                page === i + 1 ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-slate-200 p-2.5 text-slate-500 transition disabled:opacity-40"
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
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{isEdit ? "Edit Booking" : "New Booking"}</h2>
          <p className="mt-1 text-base sm:text-lg text-slate-500">
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
                <label className={labelCls}>First Name</label>
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={fieldCls}
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className={labelCls}>Last Name</label>
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={fieldCls}
                  placeholder="Enter last name"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Email Address</label>
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
                <label className={labelCls}>Phone Number</label>
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
              <div className="mb-3 text-base sm:text-lg md:text-xl font-bold text-blue-900">
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
                    <label key={t} className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="bookingType"
                        checked={formData.bookingType === t}
                        onChange={() => setField("bookingType", t)}
                        className="h-4 w-4 sm:h-5 sm:w-5 accent-blue-600"
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
                  <button type="button" onClick={addRoomRow} className="shrink-0 rounded-2xl bg-sky-500 px-4 sm:px-5 text-base sm:text-lg font-bold text-white transition hover:bg-sky-600 active:scale-95">
                    + Add
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Guest Capacity</label>
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
                <label className={labelCls}>Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className={`${fieldCls} h-auto py-3`} placeholder="Enter address" />
              </div>
            </div>

            {formData.rooms.length > 0 && (
              <div className="mt-4 sm:mt-5 max-w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[420px] text-left">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs sm:text-sm font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Room No</th>
                      <th className="px-3 py-2.5">Price</th>
                      <th className="px-3 py-2.5">GST %</th>
                      <th className="px-3 py-2.5">Qty</th>
                      <th className="px-3 py-2.5">Total</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-sm sm:text-base md:text-lg">
                    {formData.rooms.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <input
                            value={row.roomNo}
                            onChange={(e) => updateRoomRow(row.id, "roomNo", e.target.value)}
                            className="w-20 sm:w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:text-base"
                            placeholder="e.g. 101"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => updateRoomRow(row.id, "price", e.target.value)}
                            className="w-20 sm:w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:text-base"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.gst}
                            onChange={(e) => updateRoomRow(row.id, "gst", e.target.value)}
                            className="w-16 sm:w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:text-base"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) => updateRoomRow(row.id, "quantity", e.target.value)}
                            className="w-16 sm:w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:text-base"
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{formatCurrency(rowTotal(row))}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeRoomRow(row.id)} className="text-rose-500 transition hover:text-rose-700 active:scale-95">
                            <FaTimes className="text-base sm:text-lg" />
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
            <div className={sectionTitleCls}>Other Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelCls}>Coming From</label>
                <input name="comingFrom" value={formData.comingFrom} onChange={handleChange} className={fieldCls} placeholder="Please enter coming from" />
              </div>
              <div>
                <label className={labelCls}>Going To</label>
                <input name="goingTo" value={formData.goingTo} onChange={handleChange} className={fieldCls} placeholder="Please enter going to" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Purpose of Visit</label>
                <input name="purposeOfVisit" value={formData.purposeOfVisit} onChange={handleChange} className={fieldCls} placeholder="Please enter purpose of visit" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Pickup From</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <input name="pickupFrom" value={formData.pickupFrom} onChange={handleChange} className={fieldCls} placeholder="Enter pickup point" />
                  <label className="flex shrink-0 items-center gap-2 text-base sm:text-lg font-semibold text-slate-600">
                    <input type="checkbox" name="pickup" checked={formData.pickup} onChange={handleChange} className="h-4 w-4 sm:h-5 sm:w-5 accent-blue-600" /> Pickup?
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Package Details</label>
                <input name="packageDetails" value={formData.packageDetails} onChange={handleChange} className={fieldCls} placeholder="Enter package details" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={2} className={`${fieldCls} h-auto py-3`} placeholder="Enter any remarks..." />
              </div>
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
        <div className="flex flex-wrap gap-6 sm:gap-8 text-base sm:text-lg">
          <div>
            <div className="text-xs sm:text-sm font-bold uppercase text-slate-400">Guest Name</div>
            <div className="font-bold text-slate-800">{guestFullName || "-"}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold uppercase text-slate-400">Stay Duration</div>
            <div className="font-bold text-slate-800">{stayNights} Night{stayNights === 1 ? "" : "s"}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold uppercase text-slate-400">Check-In</div>
            <div className="font-bold text-slate-800">{formData.checkIn ? formatDate(formData.checkIn) : "-"}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold uppercase text-slate-400">Check-Out</div>
            <div className="font-bold text-slate-800">{formData.checkOut ? formatDate(formData.checkOut) : "-"}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold uppercase text-slate-400">Total Rooms</div>
            <div className="font-bold text-slate-800">{formData.rooms.length || "-"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs sm:text-sm font-bold uppercase text-slate-400">Total Amount</div>
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
      `}
    >
      {/* Success Icon */}
      <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-emerald-500 text-3xl sm:text-4xl text-white shadow-[0_14px_30px_rgba(16,185,129,0.35)]">
        <FaCheckCircle />
      </div>

      {/* Heading */}
      <h2 className="mt-5 text-3xl sm:text-4xl font-black text-slate-900">
        Booking Confirmed!
      </h2>

      <p className="mt-2 text-base sm:text-lg md:text-xl text-slate-500">
        Your booking has been confirmed successfully.
      </p>

      {/* Booking Reference */}
      <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl bg-emerald-50 px-5 py-4 shadow-sm">
        <div className="text-xs sm:text-sm font-bold uppercase text-emerald-600">
          Booking Reference
        </div>

        <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-700 break-all">
          {formData.bookingCode || formData.bookingId}
        </div>
      </div>

      {/* Details */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 text-left">
        <div>
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-400">
            Guest Name
          </div>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-slate-800 break-words">
            {guestFullName}
          </div>
        </div>

        <div>
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-400">
            Rooms
          </div>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-slate-800 break-words">
            {formData.rooms.length}
          </div>
        </div>

        <div>
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-400">
            Check-In
          </div>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-slate-800 break-words">
            {formatDate(formData.checkIn)}
          </div>
        </div>

        <div>
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-400">
            Check-Out
          </div>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-slate-800 break-words">
            {formatDate(formData.checkOut)}
          </div>
        </div>

        <div className="col-span-2 border-t border-slate-200 pt-5">
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-400">
            Total Amount
          </div>

          <div className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-black text-blue-700">
            {formatCurrency(grandTotal)}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-10 flex justify-center">
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
    return (
      <div className={panelCls}>
        <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 sm:pb-5">
          <div>
            <div className="text-xs sm:text-sm font-bold uppercase text-slate-400">Booking Reference</div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{d.booking_code || b.bookingCode || `BK-${b.bookingId}`}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className={statusBadgeCls(d.booking_status || b.booking_status)}>
              {d.booking_status || b.booking_status || "Pending"}
            </span>
            <button onClick={() => window.print()} className={ghostBtn}>
              <FaPrint className="text-sm" /> Print
            </button>
            <button onClick={() => openEditBooking(b)} className={primaryBtn}>
              <FaEdit className="text-sm" /> Edit
            </button>
          </div>
        </div>

        {detailLoading ? (
          <div className="py-10 text-center text-lg text-slate-400">Loading booking details...</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            <div className={cardTileCls}>
              <div className={sectionTitleCls}>Guest Information</div>
              <dl className="space-y-2.5 text-base sm:text-lg">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Name</dt><dd className="font-bold text-slate-800">{d.guest_name || b.guest_name || "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="font-bold text-slate-800">{d.guest_email || "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Mobile</dt><dd className="font-bold text-slate-800">{d.mobile || b.mobile || "-"}</dd></div>
              </dl>
            </div>

            <div className={cardTileCls}>
              <div className={sectionTitleCls}>Stay Information</div>
              <dl className="space-y-2.5 text-base sm:text-lg">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Check-In</dt><dd className="font-bold text-slate-800">{formatDate(d.check_in || b.check_in)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Check-Out</dt><dd className="font-bold text-slate-800">{formatDate(d.check_out || b.check_out)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Rooms</dt><dd className="font-bold text-slate-800">{b.rooms || (d.rooms || []).length || "-"}</dd></div>
              </dl>
            </div>

            <div className={cardTileCls}>
              <div className={sectionTitleCls}>Payment Information</div>
              <dl className="space-y-2.5 text-base sm:text-lg">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Total</dt><dd className="font-bold text-slate-800">{formatCurrency(b.totalAmount)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Paid</dt><dd className="font-bold text-emerald-600">{formatCurrency(b.paidAmount)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Balance</dt><dd className="font-bold text-rose-600">{formatCurrency(b.remainingAmount)}</dd></div>
              </dl>
            </div>

            {Array.isArray(d.rooms) && d.rooms.length > 0 && (
              <div className={`md:col-span-3 ${cardTileCls}`}>
                <div className={sectionTitleCls}>Room &amp; Tariff Information</div>
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left">
                    <thead className="text-xs sm:text-sm font-bold uppercase text-slate-400">
                      <tr>
                        <th className="py-2 pr-4">Room No</th>
                        <th className="py-2 pr-4">Tariff</th>
                        <th className="py-2 pr-4">GST %</th>
                        <th className="py-2 pr-4">Qty</th>
                        <th className="py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm sm:text-base md:text-lg">
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
          </div>
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
          <div className="text-xs sm:text-sm font-bold uppercase text-slate-400">Managing Booking</div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">{b.bookingCode || `BK-${b.bookingId}`}</h2>
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
      <FlowBar view={view} onJump={handleJumpStep} />

      {view === "list" && renderList()}
      {view === "form" && renderForm()}
      {view === "confirmed" && renderConfirmed()}
      {view === "details" && renderDetails()}
      {view === "manage" && renderManage()}

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