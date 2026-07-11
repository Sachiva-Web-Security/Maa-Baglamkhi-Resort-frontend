import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  FaBuilding,
  FaBed,
  FaUserPlus,
  FaBolt,
  FaSignInAlt,
  FaSignOutAlt,
  FaEye,
  FaDownload,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";

import API from "../api";
import BookingFlow from "../components/Hotel/BookingFlow";
import BookingHistory from "../components/Hotel/BookingHistory";
import BookingSteps from "../components/Hotel/BookingSteps";
import PaymentHistory from "../components/Hotel/PaymentHistroy";
import { setStoredBookingId } from "../components/Hotel/bookingSession";

import FolioView from "../components/Hotel/FolioView";
import GroupBooking from "../components/Hotel/GroupBooking";
import GuestProfile from "../components/Hotel/GuestProfile";
import OccupancyForecast from "../components/Hotel/OccupancyForecast";
import Room from "../components/Hotel/Room";
import RoomMaintenance from "../components/Hotel/RoomMaintenance";

// ── All of these paths now render the SAME single-page BookingFlow component.
// Nothing here navigates between them internally anymore — BookingFlow handles
// New Booking / Booking Confirmed / All Bookings / Booking Details / Manage
// Booking as one page using local state, not routing.
const BOOKING_FLOW_PATHS = [
  "guest",
  "other-booking",
  "reference",
  "company",
  "room",
  "pax",
  "room-tariff",
  "advance",
  "communication",
  "collect-payment",
  "all-bookings",
  "edit-booking",
];

// Full-width pages that draw their own page chrome (no extra rounded-card
// wrapper from this router) — the booking flow pages, plus the new Dashboard.
const FULL_WIDTH_PATHS = [...BOOKING_FLOW_PATHS, "dashboard"];

const getStepLabel = (pathname) => {
  if (pathname.includes("/dashboard"))          return "Dashboard";
  if (pathname.includes("/booking-history"))    return "Booking History";
  if (pathname.includes("/payment-history"))    return "Payment History";
  if (pathname.includes("/folio"))              return "Guest Folio";
  if (pathname.includes("/room-maintenance"))   return "Room Maintenance";
  if (pathname.includes("/guest-profile"))      return "Guest Profile";
  if (pathname.includes("/occupancy-forecast")) return "Occupancy Forecast";
  if (pathname.includes("/group-booking"))      return "Group Booking";
  return "Booking";
};

/* ═══════════════════════════════════════════════════════════════════════
   Dashboard (Home) — redesigned overview page.
   Everything below is fetched live from the existing backend — nothing is
   hardcoded or mocked.

   Data sources (all already used elsewhere in this project):
     GET  /hotel/rooms/setup         -> room categories, room numbers, total inventory
     GET  /hotel/room-blocks         -> maintenance/blocked rooms (Out of Service)
     GET  /hotel/all-bookings        -> live bookings (Check-in/out today, All Bookings table)
     GET  /hotel/booking-history     -> Booking History table
     GET  /hotel/payment-history/:id -> Payment History table (aggregated across recent bookings)
     POST /hotel/guest               -> Quick "Book Now" guest booking
   ═══════════════════════════════════════════════════════════════════════ */

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const statusPill = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("checked in")) return "bg-sky-100 text-sky-700";
  if (s.includes("checked out")) return "bg-slate-100 text-slate-600";
  if (s.includes("cancel")) return "bg-rose-100 text-rose-700";
  if (s.includes("pending") || s.includes("tentative")) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700"; // Confirmed / default
};

const QuickActionCard = ({ icon: Icon, iconTone, title, description, buttonLabel, onClick }) => (
  <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${iconTone}`}>
      <Icon className="text-lg" />
    </div>
    <div className="text-base font-bold text-slate-900">{title}</div>
    <p className="mt-1 flex-1 text-sm text-slate-500">{description}</p>
    <button
      type="button"
      onClick={onClick}
      className="mt-4 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
    >
      {buttonLabel}
    </button>
  </div>
);

const OccupancyDonut = ({ occupied, available, outOfService, occupiedPct }) => {
  const total = occupied + available + outOfService;
  const R = 60;
  const C = 2 * Math.PI * R;
  const segs = [
    { value: occupied, color: "#6366f1" },
    { value: available, color: "#22c55e" },
    { value: outOfService, color: "#f59e0b" },
  ];
  let offset = 0;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="16" />
        {total > 0 &&
          segs.map((seg, i) => {
            if (seg.value <= 0) return null;
            const frac = seg.value / total;
            const dash = frac * C;
            const circle = (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return circle;
          })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="text-2xl font-black text-slate-900">{occupiedPct}%</div>
        <div className="text-xs font-semibold text-slate-400">Occupied</div>
      </div>
    </div>
  );
};

const HotelDashboardHome = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]); // /hotel/rooms/setup
  const [roomBlocks, setRoomBlocks] = useState([]); // /hotel/room-blocks
  const [bookings, setBookings] = useState([]); // /hotel/all-bookings
  const [history, setHistory] = useState([]); // /hotel/booking-history
  const [payments, setPayments] = useState([]); // aggregated payment history
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const [quickForm, setQuickForm] = useState({ guestName: "", checkIn: "", checkOut: "", roomType: "" });
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickMsg, setQuickMsg] = useState(null);
  const [showOccupancyForecast, setShowOccupancyForecast] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showGuestProfile, setShowGuestProfile] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState(null);

  // Handle escape key to close modals
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowOccupancyForecast(false);
        setShowRoomModal(false);
        setShowGuestProfile(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ---------- navigation wiring for the quick-action buttons ---------- */
  const onAddRoom = () => setShowRoomModal(true);
  const onViewOccupancy = () => setShowOccupancyForecast(true);
  const onGuestBooking = () => navigate("/hotel/guest");
  const onViewAllBookings = () => navigate("/hotel/all-bookings");
  const onViewBookingHistory = () => navigate("/hotel/booking-history");
  const onViewPaymentHistory = () => navigate("/hotel/payment-history");
  const onOpenBooking = (booking) => {
    if (booking?.bookingId) setStoredBookingId(booking.bookingId);
    navigate("/hotel/all-bookings");
  };

  const handleCloseOccupancyForecast = () => {
    setShowOccupancyForecast(false);
  };

  /* ---------- load dashboard data ---------- */

  const loadCore = useCallback(async () => {
    setLoading(true);
    try {
      const [categoriesRes, blocksRes, bookingsRes, historyRes] = await Promise.all([
        API.get("/hotel/rooms/setup"),
        API.get("/hotel/room-blocks").catch(() => ({ data: [] })),
        API.get("/hotel/all-bookings"),
        API.get("/hotel/booking-history").catch(() => ({ data: [] })),
      ]);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      setRoomBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : []);
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  // Aggregate payment history dynamically from the most recent bookings
  // (there's no single "all payments" endpoint in the backend, so we combine
  // /hotel/payment-history/:bookingId across the latest bookings).
  useEffect(() => {
    if (!bookings.length) {
      setPaymentsLoading(false);
      return;
    }
    let cancelled = false;
    const loadPayments = async () => {
      setPaymentsLoading(true);
      try {
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
            amount: entry.amount || 0,
            paymentMode: entry.payment_mode || "-",
            createdAt: entry.created_at || booking.check_in,
            status: Number(booking.remainingAmount) > 0 ? "Pending" : "Paid",
          })),
        );

        flattened.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (!cancelled) setPayments(flattened.slice(0, 6));
      } catch (err) {
        console.error("Failed to load payment history:", err);
        if (!cancelled) setPayments([]);
      } finally {
        if (!cancelled) setPaymentsLoading(false);
      }
    };
    loadPayments();
    return () => {
      cancelled = true;
    };
  }, [bookings]);

  /* ---------- derived occupancy numbers (all computed from real data) ---------- */

  const totalRooms = useMemo(
    () =>
      categories.reduce((sum, cat) => {
        const count = Array.isArray(cat.roomDetails)
          ? cat.roomDetails.length
          : Array.isArray(cat.rooms)
          ? cat.rooms.length
          : 0;
        return sum + count;
      }, 0),
    [categories],
  );

  const outOfServiceCount = useMemo(() => {
    const set = new Set();
    roomBlocks.forEach((b) => {
      if (String(b.status || "").toLowerCase() === "active" && b.roomNumber) {
        set.add(String(b.roomNumber).trim().toLowerCase());
      }
    });
    return set.size;
  }, [roomBlocks]);

  const occupiedCount = useMemo(() => {
    const set = new Set();
    bookings.forEach((b) => {
      if (String(b.booking_status || "").toLowerCase().includes("checked in")) {
        String(b.rooms || "")
          .split(",")
          .map((r) => r.trim().toLowerCase())
          .filter(Boolean)
          .forEach((r) => set.add(r));
      }
    });
    return Math.min(set.size, Math.max(totalRooms - outOfServiceCount, 0));
  }, [bookings, totalRooms, outOfServiceCount]);

  const availableCount = Math.max(totalRooms - occupiedCount - outOfServiceCount, 0);
  const occupiedPct = totalRooms ? Math.round((occupiedCount / totalRooms) * 100) : 0;
  const availablePct = totalRooms ? Math.round((availableCount / totalRooms) * 100) : 0;
  const outOfServicePct = totalRooms ? Math.max(0, 100 - occupiedPct - availablePct) : 0;

  const today = todayISO();
  const checkInToday = useMemo(
    () => bookings.filter((b) => String(b.check_in || "").slice(0, 10) === today).length,
    [bookings, today],
  );
  const checkOutToday = useMemo(
    () => bookings.filter((b) => String(b.check_out || "").slice(0, 10) === today).length,
    [bookings, today],
  );

  // room number -> room type/category name, for the All Bookings table
  const roomTypeByNumber = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      const list = Array.isArray(cat.roomDetails) && cat.roomDetails.length
        ? cat.roomDetails.map((rd) => rd.roomNumber)
        : cat.rooms || [];
      list.forEach((rn) => {
        if (rn) map[String(rn).trim().toLowerCase()] = cat.name;
      });
    });
    return map;
  }, [categories]);

  const getRoomType = (roomsStr) => {
    const first = String(roomsStr || "").split(",")[0]?.trim().toLowerCase();
    return (first && roomTypeByNumber[first]) || "-";
  };

  const recentBookings = useMemo(
    () => [...bookings].sort((a, b) => Number(b.bookingId || 0) - Number(a.bookingId || 0)).slice(0, 4),
    [bookings],
  );

  const recentHistory = useMemo(
    () => [...history].sort((a, b) => Number(b.bookingId || 0) - Number(a.bookingId || 0)).slice(0, 4),
    [history],
  );

  /* ---------- quick guest booking ---------- */

  const submitQuickBooking = async () => {
    setQuickMsg(null);
    if (!quickForm.guestName.trim() || !quickForm.checkIn || !quickForm.checkOut) {
      setQuickMsg({ type: "error", text: "Please fill guest name, check-in and check-out date." });
      return;
    }
    if (quickForm.checkOut < quickForm.checkIn) {
      setQuickMsg({ type: "error", text: "Check-out date cannot be before check-in date." });
      return;
    }
    setQuickSaving(true);
    try {
      await API.post("/hotel/guest", {
        agentBooking: false,
        bookingPoint: "Dashboard Quick Book",
        mobile: "",
        guestName: quickForm.guestName.trim(),
        guestEmail: "",
        checkIn: quickForm.checkIn,
        checkOut: quickForm.checkOut,
        arrival: "12:00",
        departure: "12:00",
        bookingStatus: "Confirmed",
        roomType: quickForm.roomType || undefined,
      });
      setQuickMsg({ type: "success", text: "Booking created successfully." });
      setQuickForm({ guestName: "", checkIn: "", checkOut: "", roomType: "" });
      loadCore();
    } catch (err) {
      console.error(err);
      setQuickMsg({ type: "error", text: err.response?.data?.error || "Could not create booking. Please try again." });
    } finally {
      setQuickSaving(false);
    }
  };

  /* ─────────────────────────── render ─────────────────────────── */

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Quick action cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            icon={FaBuilding}
            iconTone="bg-indigo-50 text-indigo-600"
            title="Occupancy"
            description="View current occupancy and room status"
            buttonLabel="View Occupancy"
            onClick={onViewOccupancy}
          />
          <QuickActionCard
            icon={FaBed}
            iconTone="bg-sky-50 text-sky-600"
            title="Add Room"
            description="Add new room to inventory"
            buttonLabel="Add Room"
            onClick={onAddRoom}
          />
          <QuickActionCard
            icon={FaUserPlus}
            iconTone="bg-emerald-50 text-emerald-600"
            title="Guest Profile"
            description="View and manage guest profiles"
            buttonLabel="View Profiles"
            onClick={() => setShowGuestProfile(true)}
          />
          <QuickActionCard
            icon={FaBolt}
            iconTone="bg-violet-50 text-violet-600"
            title="Book Now"
            description="Quick booking for walk-in guest"
            buttonLabel="Book Now"
            onClick={onGuestBooking}
          />
        </div>

        {/* Occupancy overview */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">Occupancy Overview</h2>
          {loading ? (
            <div className="py-10 text-center text-slate-400">Loading occupancy…</div>
          ) : (
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[auto_1fr_auto]">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <OccupancyDonut
                  occupied={occupiedCount}
                  available={availableCount}
                  outOfService={outOfServiceCount}
                  occupiedPct={occupiedPct}
                />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <span className="text-slate-600">Occupied Rooms</span>
                    <span className="font-bold text-slate-900">{occupiedCount} ({occupiedPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Available Rooms</span>
                    <span className="font-bold text-slate-900">{availableCount} ({availablePct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-600">Out of Service</span>
                    <span className="font-bold text-slate-900">{outOfServiceCount} ({outOfServicePct}%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 rounded-2xl bg-indigo-50/60 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <FaBuilding />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">Total Rooms</div>
                  <div className="text-2xl font-black text-slate-900">{totalRooms}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <FaSignInAlt className="text-sm" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-700">Check-in Today</div>
                    <div className="text-xl font-black text-emerald-900">{checkInToday}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500 text-white">
                    <FaSignOutAlt className="text-sm" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-rose-700">Check-out Today</div>
                    <div className="text-xl font-black text-rose-900">{checkOutToday}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* All Bookings */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">All Bookings</h2>
            <button type="button" onClick={onViewAllBookings} className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              View All <FaChevronRight className="text-xs" />
            </button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-400">Loading bookings…</div>
          ) : recentBookings.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No bookings found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs font-bold uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 pr-4">Booking ID</th>
                    <th className="py-2.5 pr-4">Guest Name</th>
                    <th className="py-2.5 pr-4">Room No.</th>
                    <th className="py-2.5 pr-4">Room Type</th>
                    <th className="py-2.5 pr-4">Check-in</th>
                    <th className="py-2.5 pr-4">Check-out</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 pr-4">Amount</th>
                    <th className="py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBookings.map((b) => (
                    <tr key={b.bookingId} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-4 font-bold text-slate-800">{b.bookingCode || `BK-${b.bookingId}`}</td>
                      <td className="py-3 pr-4 text-slate-700">{b.guest_name || "Walk-in Guest"}</td>
                      <td className="py-3 pr-4 text-slate-600">{b.rooms || "-"}</td>
                      <td className="py-3 pr-4 text-slate-600">{getRoomType(b.rooms)}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatDate(b.check_in)}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatDate(b.check_out)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusPill(b.booking_status)}`}>
                          {b.booking_status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-800">{formatCurrency(b.totalAmount)}</td>
                      <td className="py-3">
                        <button type="button" onClick={() => onOpenBooking(b)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                          <FaEye className="text-xs" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Booking History */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Booking History</h2>
            <button type="button" onClick={onViewBookingHistory} className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              View All <FaChevronRight className="text-xs" />
            </button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-400">Loading history…</div>
          ) : recentHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No booking history yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs font-bold uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 pr-4">Booking ID</th>
                    <th className="py-2.5 pr-4">Guest Name</th>
                    <th className="py-2.5 pr-4">Room Type</th>
                    <th className="py-2.5 pr-4">Check-in</th>
                    <th className="py-2.5 pr-4">Check-out</th>
                    <th className="py-2.5 pr-4">Total Amount</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentHistory.map((row) => (
                    <tr key={row.bookingId} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-4 font-bold text-slate-800">{row.bookingCode || `BK-${row.bookingId}`}</td>
                      <td className="py-3 pr-4 text-slate-700">{row.guest_name || "Guest"}</td>
                      <td className="py-3 pr-4 text-slate-600">{getRoomType(row.rooms || row.roomDetails)}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatDate(row.check_in)}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatDate(row.check_out)}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-800">{formatCurrency(row.totalAmount)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${Number(row.remainingAmount) > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {Number(row.remainingAmount) > 0 ? "Balance Due" : "Completed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Payment History</h2>
            <button type="button" onClick={onViewPaymentHistory} className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              View All <FaChevronRight className="text-xs" />
            </button>
          </div>
          {paymentsLoading ? (
            <div className="py-8 text-center text-slate-400">Loading payments…</div>
          ) : payments.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No payment records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs font-bold uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 pr-4">Payment ID</th>
                    <th className="py-2.5 pr-4">Booking ID</th>
                    <th className="py-2.5 pr-4">Guest Name</th>
                    <th className="py-2.5 pr-4">Amount</th>
                    <th className="py-2.5 pr-4">Payment Method</th>
                    <th className="py-2.5 pr-4">Payment Date</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-4 font-bold text-slate-800">PAY-{String(p.id).slice(-4)}</td>
                      <td className="py-3 pr-4 text-slate-600">{p.bookingCode}</td>
                      <td className="py-3 pr-4 text-slate-700">{p.guestName}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-800">{formatCurrency(p.amount)}</td>
                      <td className="py-3 pr-4 text-slate-600">{p.paymentMode}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatDate(p.createdAt)}</td>
                      <td className="py-3 flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {p.status}
                        </span>
                        <FaDownload className="text-xs text-slate-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Occupancy Forecast Modal */}
        {showOccupancyForecast && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Occupancy Forecast</h3>
                  <p className="mt-1 text-sm text-slate-500">Detailed room occupancy analysis and forecast</p>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowOccupancyForecast(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="p-4 sm:p-5">
                <OccupancyForecast onClose={() => setShowOccupancyForecast(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Room Modal */}
        {showRoomModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Add Room</h3>
                  <p className="mt-1 text-sm text-slate-500">Add new room to inventory</p>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowRoomModal(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="p-4 sm:p-5">
                <Room />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════════════ */

const Hotel = () => {
  const location = useLocation();

  // True for every URL that used to be a separate wizard step / All Bookings /
  // Edit Booking page — these all now render <BookingFlow />, which draws its
  // own flow bar, so we skip the old BookingSteps top bar + extra wrapper card
  // for these paths and let BookingFlow use the full width. The new Dashboard
  // page is full-width too, so it's included via FULL_WIDTH_PATHS.
  const isBookingFlowPage =
    location.pathname === "/hotel" ||
    location.pathname === "/hotel/" ||
    FULL_WIDTH_PATHS.some((p) => location.pathname.includes(`/hotel/${p}`));

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f7fffb_55%,#fff8ef_100%)] p-4 sm:p-6">
      <div className="w-full space-y-5">
        {!isBookingFlowPage ? (
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_15px_45px_rgba(15,23,42,0.08)] backdrop-blur">
            <BookingSteps />
          </div>
        ) : null}

        <div
          className={
            isBookingFlowPage
              ? "w-full"
              : "rounded-[30px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur"
          }
        >
          <Routes>
            {/* Landing on /hotel now goes to the Dashboard first */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* Redesigned overview/dashboard page (matches the shared UI) */}
            <Route path="dashboard" element={<HotelDashboardHome />} />

            {/* Every old wizard step + all-bookings + edit-booking -> ONE component.
                Sidebar links like /hotel/guest and /hotel/all-bookings keep working
                unchanged; BookingFlow just opens on the right internal view. */}
            <Route path="guest"           element={<BookingFlow />} />
            <Route path="other-booking"   element={<BookingFlow />} />
            <Route path="reference"       element={<BookingFlow />} />
            <Route path="company"         element={<BookingFlow />} />
            <Route path="room"            element={<BookingFlow />} />
            <Route path="pax"             element={<BookingFlow />} />
            <Route path="room-tariff"     element={<BookingFlow />} />
            <Route path="advance"         element={<BookingFlow />} />
            <Route path="communication"   element={<BookingFlow />} />
            <Route path="collect-payment" element={<BookingFlow />} />
            <Route path="all-bookings"    element={<BookingFlow />} />
            <Route path="edit-booking"    element={<BookingFlow />} />
            {/* ── Features kept separate from the booking flow (unchanged) ── */}
            <Route path="booking-history"    element={<BookingHistory />} />
            <Route path="payment-history"    element={<PaymentHistory />} />
            <Route path="folio"              element={<FolioView />} />
            <Route path="room-maintenance"   element={<RoomMaintenance />} />
            <Route path="guest-profile"      element={<GuestProfile />} />
            <Route path="occupancy-forecast" element={<OccupancyForecast />} />
            <Route path="group-booking"      element={<GroupBooking />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Hotel;