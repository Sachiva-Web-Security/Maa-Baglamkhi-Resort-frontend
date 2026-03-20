import React, { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBed,
  FaBroom,
  FaCalendarAlt,
  FaDoorOpen,
  FaEdit,
  FaExclamationCircle,
  FaHotel,
  FaPlus,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import API from "../../api";

const DAY_COUNT = 7;
const ROOMS_PER_PAGE = 10;

const STATUS_META = {
  available: { label: "Available", cell: "border-emerald-200 bg-emerald-50 text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  occupied: { label: "Occupied", cell: "border-rose-200 bg-rose-50 text-rose-700", badge: "bg-rose-100 text-rose-700" },
  reserved: { label: "Reserved", cell: "border-amber-200 bg-amber-50 text-amber-700", badge: "bg-amber-100 text-amber-700" },
  check_in_confirmed: { label: "Check-In Confirmed", cell: "border-sky-200 bg-sky-50 text-sky-700", badge: "bg-sky-100 text-sky-700" },
  cleaning: { label: "Cleaning", cell: "border-violet-200 bg-violet-50 text-violet-700", badge: "bg-violet-100 text-violet-700" },
  blocked: { label: "Blocked", cell: "border-slate-300 bg-slate-200 text-slate-700", badge: "bg-slate-200 text-slate-700" },
};

const formatDateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const addDays = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const formatHeaderDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });

const formatShortDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);

const toRoomList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const roomSort = (left, right) => String(left).localeCompare(String(right), undefined, { numeric: true });

const normalizeRoomStatus = (room) => {
  const status = String(room.hotelStatus || room.status || "").toLowerCase();
  const housekeepingStatus = String(room.housekeepingLabel || room.status || "").toLowerCase();

  if (status.includes("blocked") || status.includes("out of service")) return "blocked";
  if (status.includes("reserved")) return "reserved";
  if (status.includes("confirmed")) return "check_in_confirmed";
  if (status.includes("occupied")) return "occupied";
  if (status.includes("cleaning") || housekeepingStatus.includes("dirty")) return "cleaning";
  return "available";
};

const getBookingStatus = (booking, date, currentDate) => {
  if (!booking.checkIn || !booking.checkOut || date < booking.checkIn || date >= booking.checkOut) {
    return "available";
  }
  if (currentDate < booking.checkIn) return "reserved";
  if (currentDate === booking.checkIn && date === booking.checkIn) return "check_in_confirmed";
  return "occupied";
};

const Stayover = () => {
  const navigate = useNavigate();
  const today = formatDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingResponse, roomResponse] = await Promise.all([
        API.get("/hotel/all-bookings"),
        API.get("/housekeeping"),
      ]);
      setBookings(Array.isArray(bookingResponse.data) ? bookingResponse.data : []);
      setRooms(
        Array.isArray(roomResponse.data)
          ? roomResponse.data.map((room) => ({
              ...room,
              roomNumber: room.roomNumber || room.roomNo,
              categoryName: room.categoryName || room.roomType || "Hotel Room",
              housekeepingLabel: room.status,
              status: normalizeRoomStatus(room),
            }))
          : [],
      );
      setError("");
    } catch (err) {
      console.error(err);
      setError("Stay overview load nahi ho paaya.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleDates = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, index) => addDays(selectedDate, index)),
    [selectedDate],
  );

  const expandedBookings = useMemo(
    () =>
      bookings.flatMap((booking) =>
        toRoomList(booking.rooms).map((roomNumber) => ({
          bookingId: booking.bookingId,
          guestName: booking.guest_name || "Walk-in Guest",
          mobile: booking.mobile || "-",
          company: booking.company_name || "Direct",
          roomNumber,
          checkIn: formatDateKey(booking.check_in),
          checkOut: formatDateKey(booking.check_out),
          totalAmount: booking.totalAmount || 0,
          remainingAmount: booking.remainingAmount || 0,
        })),
      ),
    [bookings],
  );

  const realRoomBookings = useMemo(() => {
    const seen = new Set(
      expandedBookings.map(
        (booking) => `${booking.roomNumber}-${booking.checkIn}-${booking.checkOut}-${booking.guestName}`,
      ),
    );

    return rooms
      .filter((room) => room.guest || (room.checkIn && room.checkOut))
      .map((room) => ({
        bookingId: `room-${room.id}`,
        guestName: room.guest || "In-house Guest",
        mobile: room.mobile || "-",
        company: room.categoryName || "Direct",
        roomNumber: room.roomNumber,
        checkIn: formatDateKey(room.checkIn),
        checkOut: formatDateKey(room.checkOut),
        totalAmount: 0,
        remainingAmount: 0,
      }))
      .filter((booking) => {
        const key = `${booking.roomNumber}-${booking.checkIn}-${booking.checkOut}-${booking.guestName}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }, [expandedBookings, rooms]);

  const mergedBookings = useMemo(
    () => [...expandedBookings, ...realRoomBookings],
    [expandedBookings, realRoomBookings],
  );

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((left, right) => {
        const categoryOrder = String(left.categoryName || "").localeCompare(String(right.categoryName || ""));
        return categoryOrder || roomSort(left.roomNumber, right.roomNumber);
      }),
    [rooms],
  );

  const totalPages = Math.max(1, Math.ceil(sortedRooms.length / ROOMS_PER_PAGE));
  const paginatedRooms = useMemo(() => sortedRooms.slice((page - 1) * ROOMS_PER_PAGE, page * ROOMS_PER_PAGE), [page, sortedRooms]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const dailySummary = useMemo(
    () =>
      visibleDates.map((date) => {
        const occupied = rooms.filter((room) => {
          const booking = mergedBookings.find((item) => String(item.roomNumber) === String(room.roomNumber) && date >= item.checkIn && date < item.checkOut);
          return booking ? getBookingStatus(booking, date, today) !== "reserved" : room.status === "occupied" && date === today;
        }).length;
        return {
          date,
          available: Math.max(rooms.length - occupied, 0),
          occupied,
          arrivals: mergedBookings.filter((booking) => booking.checkIn === date).length,
          departures: mergedBookings.filter((booking) => booking.checkOut === date).length,
        };
      }),
    [mergedBookings, rooms, today, visibleDates],
  );

  const selectedDateBookings = useMemo(
    () =>
      mergedBookings
        .filter((booking) => selectedDate >= booking.checkIn && selectedDate < booking.checkOut)
        .sort((left, right) => roomSort(left.roomNumber, right.roomNumber)),
    [mergedBookings, selectedDate],
  );

  const upcomingBookings = useMemo(
    () => [...mergedBookings].filter((booking) => booking.checkIn).sort((left, right) => left.checkIn.localeCompare(right.checkIn)).slice(0, 8),
    [mergedBookings],
  );

  const summaryCards = useMemo(
    () => [
      { label: "Occupied / Reserved", value: rooms.filter((room) => ["occupied", "reserved", "check_in_confirmed"].includes(room.status)).length, helper: "Current booked inventory", icon: FaBed, tone: "from-sky-600 to-cyan-500" },
      { label: "Available Rooms", value: rooms.filter((room) => room.status === "available").length, helper: "Ready for booking", icon: FaHotel, tone: "from-emerald-600 to-lime-500" },
      { label: "Cleaning Queue", value: rooms.filter((room) => room.status === "cleaning").length, helper: "Housekeeping pending", icon: FaBroom, tone: "from-violet-600 to-fuchsia-500" },
    ],
    [rooms],
  );

  const handleRoomStatus = async (room, status) => {
    try {
      const housekeepingStatus = status === "available" ? "Vacant Clean" : "Vacant Dirty";
      await API.put(`/housekeeping/status/${room.id}`, { status: housekeepingStatus });
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Room status update nahi ho paaya.");
    }
  };

  const getCellData = (room, date) => {
    const booking = mergedBookings.find((item) => String(item.roomNumber) === String(room.roomNumber) && date >= item.checkIn && date < item.checkOut);
    if (room.status === "blocked" && date === today) return { status: "blocked", booking: null };
    if (room.status === "cleaning" && date === today) return { status: "cleaning", booking: null };
    return booking ? { status: getBookingStatus(booking, date, today), booking } : { status: "available", booking: null };
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#eff8ff_0%,#f6fbf7_42%,#fffaf0_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-cyan-200/60 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-8%] top-[8%] h-72 w-72 rounded-full bg-blue-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[-8%] left-[22%] h-72 w-72 rounded-full bg-amber-200/40 blur-3xl sm:h-[26rem] sm:w-[26rem]" />
      </div>
      <div className="relative mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,#08253d_0%,#0e5b6a_50%,#0f3f67_100%)] px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-7 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">Stay Overview</p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Category-wise room inventory with live booking status</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">Inventory me add hue rooms yahan live status ke saath dikh rahe hain.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => navigate("/hotel/guest")} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_12px_30px_rgba(255,255,255,0.2)] transition hover:-translate-y-0.5"><FaPlus className="text-sky-600" />New Booking</button>
                <button type="button" onClick={() => navigate("/hotel/all-bookings")} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"><FaDoorOpen />Main Booking Dashboard</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-[22px] border border-white/12 bg-white/10 p-4 backdrop-blur-md">
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r ${card.tone} text-white`}><Icon /></div>
                    <div className="mt-4 text-sm text-slate-100/85">{card.label}</div>
                    <div className="mt-1 text-3xl font-black">{card.value}</div>
                    <div className="mt-1 text-xs text-slate-200/70">{card.helper}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section className="rounded-[28px] border border-slate-200/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">Booking Strip</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Inventory based stay matrix</h2>
              <p className="mt-2 text-sm text-slate-500">Available, occupied, reserved, check-in confirmed, cleaning aur blocked.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                <button type="button" onClick={() => setSelectedDate((prev) => addDays(prev, -1))} className="rounded-full bg-white p-2 text-slate-600 transition hover:text-slate-900"><FaArrowLeft /></button>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"><FaCalendarAlt className="text-sky-600" /><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-transparent outline-none" /></div>
                <button type="button" onClick={() => setSelectedDate((prev) => addDays(prev, 1))} className="rounded-full bg-white p-2 text-slate-600 transition hover:text-slate-900"><FaArrowRight /></button>
              </div>
              <button type="button" onClick={() => navigate("/hotel/guest")} className="rounded-full bg-gradient-to-r from-sky-600 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5">Start With Guest</button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(STATUS_META).map(([key, value]) => (
              <div key={key} className={`rounded-full px-3 py-1 text-xs font-bold ${value.badge}`}>{value.label}</div>
            ))}
          </div>
          {loading ? <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-slate-500">Stay overview load ho raha hai...</div> : error ? <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-5 text-sm text-rose-700"><FaExclamationCircle />{error}</div> : <>
            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[1260px] overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                <div className="grid grid-cols-[220px_repeat(7,minmax(0,1fr))]">
                  <div className="border-r border-b border-slate-200 bg-slate-700 px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white">Rooms</div>
                  {visibleDates.map((date, index) => <div key={date} className={`border-r border-b border-slate-200 px-3 py-4 text-center last:border-r-0 ${index === 0 ? "bg-gradient-to-b from-orange-500 to-orange-400 text-white" : "bg-gradient-to-b from-slate-100 to-white text-slate-900"}`}><div className="text-base font-black">{formatHeaderDate(date)}</div></div>)}
                  <div className="border-r border-b border-slate-200 bg-[#6b8d92] px-4 py-3 text-sm font-bold text-white">Total</div>
                  {dailySummary.map((day) => <div key={day.date} className="border-r border-b border-slate-200 bg-[#86a7aa] px-3 py-3 text-center text-white last:border-r-0"><div className="text-lg font-black">{day.available}</div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">Available</div><div className="mt-2 text-[11px] text-white/80">{day.occupied} occupied | {day.arrivals} arr | {day.departures} dep</div></div>)}
                  {paginatedRooms.map((room) => (
                    <React.Fragment key={room.id}>
                      <div className="border-r border-b border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xl font-black text-slate-900">{room.roomNumber}</div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{room.categoryName || "Uncategorized"}</div>
                            <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_META[room.status]?.badge || STATUS_META.available.badge}`}>{STATUS_META[room.status]?.label || "Available"}</div>
                          </div>
                          <button type="button" onClick={() => navigate("/hotel/room", { state: { editRoomId: room.id } })} className="rounded-full bg-white p-2 text-slate-600 shadow-sm"><FaEdit /></button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {room.status === "cleaning" ? <button type="button" onClick={() => handleRoomStatus(room, "available")} className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white">Mark Clean</button> : null}
                          {room.status === "available" ? (
  <button
    type="button"
    onClick={() =>
      navigate("/hotel/guest", {
        state: {
          roomNumber: room.roomNumber,
          category: room.categoryName,
        },
      })
    }
    className="rounded-full bg-sky-600 px-3 py-1 text-[11px] font-bold text-white"
  >
    Book Now
  </button>
) : null}
                        </div>
                      </div>
                      {visibleDates.map((date) => {
                        const cell = getCellData(room, date);
                        const meta = STATUS_META[cell.status] || STATUS_META.available;
                        return <div key={`${room.id}-${date}`} className="min-h-[104px] border-r border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbfd_0%,#eef5f8_100%)] p-2 last:border-r-0">{cell.booking ? <div className={`h-full rounded-[16px] border px-3 py-2 shadow-sm ${meta.cell}`}><div className="text-sm font-black uppercase">{cell.booking.guestName}</div><div className="mt-1 text-xs font-medium">{cell.booking.mobile}</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">{meta.label}</div><div className="mt-2 text-[11px] font-semibold">{formatShortDate(cell.booking.checkIn)} to {formatShortDate(cell.booking.checkOut)}</div></div> : <div className={`flex h-full items-center justify-center rounded-[16px] border text-xs font-semibold uppercase tracking-[0.16em] ${meta.cell}`}>{meta.label}</div>}</div>;
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">Showing {sortedRooms.length ? (page - 1) * ROOMS_PER_PAGE + 1 : 0} to {Math.min(page * ROOMS_PER_PAGE, sortedRooms.length)} of {sortedRooms.length} rooms</div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page === 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Previous</button>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Page {page} / {totalPages}</div>
                <button type="button" disabled={page === totalPages} onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Next</button>
              </div>
            </div>
          </>}
        </section>
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="rounded-[28px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600">Active Booking Data</p>
                <h3 className="mt-2 text-xl font-black text-slate-900">{formatShortDate(selectedDate)} ke live stays</h3>
              </div>
              <button type="button" onClick={() => navigate("/hotel/all-bookings")} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100">View All</button>
            </div>
            <div className="mt-5 space-y-3">
              {selectedDateBookings.length ? selectedDateBookings.map((booking) => <div key={`${booking.bookingId}-${booking.roomNumber}-${booking.checkIn}`} className="rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="text-lg font-black text-slate-900">{booking.guestName}</div><div className="mt-1 text-sm text-slate-500">Room {booking.roomNumber} | {booking.mobile} | {booking.company}</div></div><div className="rounded-[18px] bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">{formatShortDate(booking.checkIn)} to {formatShortDate(booking.checkOut)}</div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-600">Total Bill<div className="mt-1 text-lg font-black text-slate-900">{formatCurrency(booking.totalAmount)}</div></div><div className="rounded-[18px] bg-amber-50 px-4 py-3 text-sm text-amber-700">Remaining<div className="mt-1 text-lg font-black text-amber-900">{formatCurrency(booking.remainingAmount)}</div></div></div></div>) : <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">Selected date par koi active stay nahi mila.</div>}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600">Upcoming Bookings</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Recent booking feed with dates</h3>
              <div className="mt-5 space-y-3">
                {upcomingBookings.length ? upcomingBookings.map((booking) => <div key={`feed-${booking.bookingId}-${booking.roomNumber}-${booking.checkIn}`} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-slate-900">{booking.guestName}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Room {booking.roomNumber}</div></div><div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-sky-700 shadow-sm">#{booking.bookingId}</div></div><div className="mt-3 text-sm text-slate-600">{formatShortDate(booking.checkIn)} to {formatShortDate(booking.checkOut)}</div></div>) : <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Booking feed abhi empty hai.</div>}
              </div>
            </div>
            <div className="rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,#f8fdff_0%,#eff8ff_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">Quick Direction</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Front desk shortcuts</h3>
              <div className="mt-4 space-y-3">
                <button type="button" onClick={() => navigate("/hotel/guest")} className="flex w-full items-center justify-between rounded-[20px] bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5"><span><span className="block text-sm font-black text-slate-900">Open Guest Step</span><span className="block text-xs text-slate-500">Booking flow guest page se start karein</span></span><FaArrowRight className="text-sky-600" /></button>
                <button type="button" onClick={() => navigate("/hotel/room")} className="flex w-full items-center justify-between rounded-[20px] bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5"><span><span className="block text-sm font-black text-slate-900">Manage Room Inventory</span><span className="block text-xs text-slate-500">Category wise rooms add aur edit karne ke liye</span></span><FaArrowRight className="text-sky-600" /></button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Stayover;
