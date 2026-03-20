import {
  FaBed,
  FaBroom,
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardCheck,
  FaDoorOpen,
  FaExclamationTriangle,
  FaKey,
  FaRupeeSign,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

import API from "../api";
import FoodSalesChart from "../components/Dashboard/Charts/FoodSalesChart";
import MonthlyRevenueChart from "../components/Dashboard/Charts/MonthlyRevenueChart";
import RoomOccupancyChart from "../components/Dashboard/Charts/RoomOccupancyChart";
import MetricCard from "../components/Dashboard/MetricCard/MetricCard";
import HomePage from "../components/HomePage/HomePage";
import {
  addDays,
  BOARD_BUCKET_META,
  buildStaySummary,
  expandBookings,
  formatDateLabel,
  formatCurrency,
  formatShortDate,
  getRoomBookingReference,
  mergeBookingsWithRooms,
  normalizeRooms,
  todayISO,
} from "../components/Dashboard/stayoverUtils";

const boardOrder = ["available", "confirmed", "pencil", "blocked", "checked_in"];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(localStorage.getItem("freshLogin") === "true");
  const [blurBg, setBlurBg] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [apiMetrics, setApiMetrics] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    todayRevenue: 0,
    todayCheckins: 0,
  });
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  const loadDashboardData = async () => {
    const [metricsRes, roomsRes, bookingsRes] = await Promise.all([
      API.get("/dashboard/metrics"),
      API.get("/housekeeping"),
      API.get("/hotel/all-bookings"),
    ]);

    setApiMetrics({
      totalRooms: metricsRes.data.totalRooms || 0,
      occupiedRooms: metricsRes.data.occupiedRooms || 0,
      todayRevenue: metricsRes.data.todayRevenue || 0,
      todayCheckins: metricsRes.data.todayCheckins || 0,
    });
    setRooms(normalizeRooms(roomsRes.data));
    setBookings(expandBookings(bookingsRes.data));
  };

  useEffect(() => {
    const freshLoginFlag = localStorage.getItem("freshLogin");
    if (freshLoginFlag !== "true") {
      setLoading(false);
      return;
    }

    setBlurBg(true);
    const blurTimer = setTimeout(() => setBlurBg(false), 500);
    const loaderTimer = setTimeout(() => {
      setLoading(false);
      localStorage.removeItem("freshLogin");
    }, 1000);

    return () => {
      clearTimeout(blurTimer);
      clearTimeout(loaderTimer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        if (!isMounted) return;
        await loadDashboardData();
      } catch (error) {
        console.error(error);
        if (isMounted) {
          toast.error("Dashboard data load nahi ho paaya.", {
            position: "bottom-right",
          });
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const mergedBookings = useMemo(() => mergeBookingsWithRooms(bookings, rooms), [bookings, rooms]);

  const stayOverview = useMemo(
    () => buildStaySummary(rooms, mergedBookings, selectedDate),
    [mergedBookings, rooms, selectedDate],
  );

  const selectedBoardDay = stayOverview[0] || null;
  const selectedDaySnapshot = selectedBoardDay?.board || {
    available: [],
    confirmed: [],
    pencil: [],
    blocked: [],
    checked_in: [],
  };

  const attentionCount = useMemo(
    () =>
      rooms.filter((room) => {
        const status = String(room.housekeepingLabel || room.status || "").toLowerCase();
        return status.includes("dirty") || !room.assignee || room.assignee === "No Housekeeper";
      }).length,
    [rooms],
  );

  const metrics = [
    {
      title: "Total Rooms",
      value: apiMetrics.totalRooms.toString(),
      subtitle: "Calm inventory overview",
      icon: FaBed,
      gradient: "bg-[linear-gradient(135deg,#14978F_0%,#22B4A6_44%,#5ED9CF_100%)]",
      route: "/hotel",
    },
    {
      title: "Occupied Rooms",
      value: apiMetrics.occupiedRooms.toString(),
      subtitle: "Live stay activity",
      icon: FaKey,
      gradient: "bg-[linear-gradient(135deg,#2452D6_0%,#2E67E7_50%,#5B9AF1_100%)]",
      route: "/hotel",
    },
    {
      title: "Today's Revenue",
      value: `Rs. ${apiMetrics.todayRevenue.toLocaleString()}`,
      subtitle: "Front office and F&B earnings",
      icon: FaRupeeSign,
      gradient: "bg-[linear-gradient(135deg,#C96800_0%,#E18908_48%,#F4BD21_100%)]",
      route: "/accounts",
    },
    {
      title: "Today's Check-ins",
      value: apiMetrics.todayCheckins.toString(),
      subtitle: "Guest arrival momentum",
      icon: FaCheckCircle,
      gradient: "bg-[linear-gradient(135deg,#D61B79_0%,#E43288_52%,#EB67AD_100%)]",
      route: "/hotel",
    },
  ];

  const occupancyRate = apiMetrics.totalRooms
    ? `${Math.round((apiMetrics.occupiedRooms / apiMetrics.totalRooms) * 100)}%`
    : "0%";

  const heroStats = [
    { label: "Occupancy", value: occupancyRate },
    { label: "Today's Revenue", value: `Rs. ${apiMetrics.todayRevenue.toLocaleString()}` },
    { label: "Check-ins", value: apiMetrics.todayCheckins.toString() },
  ];

  const quickActions = [
    {
      label: "New Booking",
      helper: "Front desk guest entry",
      icon: FaDoorOpen,
      route: "/hotel/guest",
      tone: "from-cyan-500 to-blue-500",
    },
    {
      label: "Cleaning Log",
      helper: "Review room readiness",
      icon: FaBroom,
      route: "/housekeeping",
      tone: "from-emerald-500 to-teal-500",
    },
    {
      label: "Settlement Review",
      helper: "Track billing movement",
      icon: FaClipboardCheck,
      route: "/accounts",
      tone: "from-amber-500 to-orange-500",
    },
  ];

  const roomPreviewStats = selectedRoom
    ? [
        {
          label: "Room Status",
          value: selectedRoom.roomData?.status || selectedRoom.roomData?.hotelStatus || "Unknown",
        },
        {
          label: "Check-In",
          value: selectedRoom.booking?.checkIn ? formatShortDate(selectedRoom.booking.checkIn) : "--",
        },
        {
          label: "Check-Out",
          value: selectedRoom.booking?.checkOut ? formatShortDate(selectedRoom.booking.checkOut) : "--",
        },
        {
          label: "Remaining",
          value: formatCurrency(selectedRoom.booking?.remainingAmount || 0),
        },
      ]
    : [];

  const openRoomPreview = (item) => {
    const fallbackBooking =
      item.booking ||
      getRoomBookingReference(item.roomNumber, selectedDate, mergedBookings);

    setSelectedRoom({
      ...item,
      booking: fallbackBooking,
    });
  };

  const handleBookingLifecycle = async (action) => {
    if (!selectedRoom?.booking?.bookingId || String(selectedRoom.booking.bookingId).startsWith("room-")) {
      alert("Is room ke liye valid booking record nahi mila.");
      return;
    }

    try {
      await API.put(`/hotel/${action}/${selectedRoom.booking.bookingId}`);
      if (action === "check-out" && selectedRoom.roomNumber) {
        await API.put(`/housekeeping/status/${selectedRoom.roomData?.id || selectedRoom.roomNumber}`, {
          status: "Vacant Dirty",
        });
      }
      await loadDashboardData();
      setSelectedRoom(null);
      toast.success(action === "check-in" ? "Guest checked in." : "Guest checked out. Room cleaning me chala gaya.");
    } catch (error) {
      console.error(error);
      toast.error(action === "check-in" ? "Check-in failed" : "Check-out failed");
    }
  };

  return (
    <>
      <ToastContainer theme="dark" />

      {loading ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <p className="text-lg font-semibold text-white">Loading Dashboard...</p>
          </div>
        </div>
      ) : null}

      <div
        className={`relative isolate min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 transition-all duration-300 sm:p-6 lg:p-8 ${
          blurBg ? "blur-[6px]" : ""
        }`}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
          <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
          <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
        </div>

        <div className="mx-auto max-w-[1280px] space-y-7">
          <section className="overflow-hidden rounded-[26px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-4 py-5 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-6 sm:py-6 lg:px-8">
            <div className="relative z-[1] grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] lg:items-center">
              <div className="space-y-3">
                <p className="text-[7px] font-semibold uppercase tracking-[0.26em] text-cyan-200 sm:text-[10px]">
                  Resort Command Center
                </p>
                <div className="space-y-1">
                  <h1 className="text-[1.25rem] font-black leading-[1.02] text-white sm:text-[2.4rem]">
                    Operational snapshot for today
                  </h1>
                  <p className="max-w-3xl text-[12px] leading-5 text-slate-100/88 sm:text-[14px] sm:leading-6">
                    Track rooms, revenue, arrivals, and restaurant activity from one cleaner dashboard built for daily hotel operations.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {heroStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[20px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                  >
                    <span className="text-[11px] text-slate-100/78 sm:text-xs">{item.label}</span>
                    <div className="mt-3 text-[1.55rem] font-bold leading-none sm:text-[1.8rem]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                subtitle={metric.subtitle}
                icon={metric.icon}
                gradient={metric.gradient}
                onClick={() => navigate(metric.route)}
              />
            ))}
          </div>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.78fr)]">
            <div className="rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-700">
                    Stay Overview
                  </p>
                  <h2 className="mt-1 text-[1.15rem] font-bold text-slate-900">
                    Booking master inspired main dashboard
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Selected date ke liye available, confirmed, pencil, blocked aur checked-in rooms ek saath.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
                      className="rounded-full bg-white p-2 text-slate-600 shadow-sm transition hover:text-slate-900"
                    >
                      <FaCalendarAlt className="text-cyan-600" />
                    </button>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
                      className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-900"
                    >
                      +1 Day
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
                    >
                      Main Dashboard
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500"
                    >
                      Room Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/stayover")}
                      className="rounded-full bg-gradient-to-r from-cyan-600 to-blue-500 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)]"
                    >
                      Stay Overview
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[1060px] space-y-3">
                  <div className="grid grid-cols-[150px_repeat(5,minmax(0,1fr))] overflow-hidden rounded-[22px] border border-slate-200">
                    <div className="border-r border-slate-200 bg-slate-100 px-4 py-4 text-sm font-bold text-slate-700">
                      {selectedBoardDay ? formatDateLabel(selectedBoardDay.date) : "Selected Date"}
                    </div>
                    {boardOrder.map((key) => {
                      const meta = BOARD_BUCKET_META[key];
                      const items = selectedDaySnapshot[key] || [];
                      return (
                        <div key={key} className="border-r border-slate-200 bg-white last:border-r-0">
                          <div className={`h-1.5 w-full ${meta.bar}`} />
                          <div className="px-3 py-3">
                            <div className="text-sm font-bold text-slate-900">
                              {meta.label} ({items.length})
                            </div>
                            <div className="mt-3 space-y-2">
                              {items.length ? (
                                items.slice(0, 6).map((item) => (
                                  <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => openRoomPreview(item)}
                                    className={`w-full rounded-[16px] border px-3 py-2 text-left text-xs shadow-sm ${meta.soft}`}
                                  >
                                    <div className="font-black">Room {item.roomNumber}</div>
                                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                                      {item.roomType || "Room Type"} | ID {item.roomId || "--"}
                                    </div>
                                    <div className="mt-1 line-clamp-2">{item.title}</div>
                                  </button>
                                ))
                              ) : (
                                <div className="rounded-[16px] border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                                  No rooms
                                </div>
                              )}
                              {items.length > 6 ? (
                                <div className="text-xs font-semibold text-slate-500">
                                  +{items.length - 6} more rooms
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {stayOverview.slice(1).map((day) => (
                    <button
                      type="button"
                      key={day.date}
                      onClick={() => setSelectedDate(day.date)}
                      className="grid w-full grid-cols-[150px_repeat(5,minmax(0,1fr))] overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="border-r border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                        {formatDateLabel(day.date)}
                      </div>
                      {boardOrder.map((key) => (
                        <div key={`${day.date}-${key}`} className="border-r border-slate-200 px-3 py-3 text-center text-sm last:border-r-0">
                        <div className="font-bold text-slate-900">{BOARD_BUCKET_META[key].label}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {day.board[key].length} rooms
                          </div>
                        </div>
                      ))}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-600">
                      Quick Actions
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">Daily shortcuts</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:text-slate-900"
                  >
                    <FaSyncAlt />
                  </button>
                </div>
                <div className="space-y-3">
                  {quickActions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => navigate(item.route)}
                        className="flex w-full items-center justify-between rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r ${item.tone} text-white`}>
                            <Icon />
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                            <div className="text-xs text-slate-500">{item.helper}</div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Open</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-rose-500">
                  Front Office Alert
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Actionable room issues</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <FaExclamationTriangle className="mt-0.5 text-rose-500" />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{attentionCount} rooms need attention</div>
                        <div className="text-xs text-slate-600">
                          Dirty rooms ya unassigned housekeeping rooms ko review karein.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">
                    Confirmed for {formatDateLabel(selectedDate)}:
                    <span className="ml-2 font-semibold text-amber-700">{selectedDaySnapshot.confirmed.length}</span>
                  </div>
                  <div className="rounded-[18px] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-slate-700">
                    Checked in on {formatDateLabel(selectedDate)}:
                    <span className="ml-2 font-semibold text-cyan-700">{selectedDaySnapshot.checked_in.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.52fr)_minmax(290px,0.82fr)]">
            <div className="w-full rounded-[24px] border border-white/70 bg-white/82 px-4 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5 sm:py-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-300">
                    Revenue Trend
                  </p>
                  <h2 className="mt-1 text-[1.1rem] font-bold text-slate-900">Reservation statistics</h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/accounts")}
                  className="rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_12px_30px_rgba(13,148,136,0.24)] transition hover:-translate-y-0.5"
                >
                  Open Accounts
                </button>
              </div>
              <div className="h-[280px] w-full sm:h-[320px] lg:h-[340px]">
                <MonthlyRevenueChart />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="min-h-[290px] rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-300">
                  Room Mix
                </p>
                <div className="mb-3 mt-1 text-[1.05rem] font-bold text-slate-900">Occupancy overview</div>
                <RoomOccupancyChart />
              </div>

              <div className="flex min-h-[230px] items-center rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <FoodSalesChart />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/60 bg-white/72 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-4">
            <HomePage />
          </div>
        </div>
      </div>

      {selectedRoom ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSelectedRoom(null)}
        >
          <div
            className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,#fbfdff_0%,#f5faf8_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-700">Room Preview</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">Room {selectedRoom.roomNumber}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedRoom.roomType || "Room Type"} | ID {selectedRoom.roomId || "--"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {roomPreviewStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm"
                  >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{item.value}</div>
                </div>
              ))}
            </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Booking snapshot</div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Room Type</span>
                    <span className="font-semibold text-slate-900">{selectedRoom.roomType || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Room ID</span>
                    <span className="font-semibold text-slate-900">{selectedRoom.roomId || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Guest Name</span>
                    <span className="font-semibold text-slate-900">{selectedRoom.booking?.guestName || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Contact</span>
                    <span className="font-semibold text-slate-900">{selectedRoom.booking?.mobile || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Company</span>
                    <span className="font-semibold text-slate-900">{selectedRoom.booking?.company || "--"}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {selectedRoom.booking?.bookingId && !String(selectedRoom.booking.bookingId).startsWith("room-") ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleBookingLifecycle(
                        String(selectedRoom.booking?.bookingStatus || "").toLowerCase().includes("checked in")
                          ? "check-out"
                          : "check-in",
                      )
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    {String(selectedRoom.booking?.bookingStatus || "").toLowerCase().includes("checked in")
                      ? "Check Out"
                      : "Check In"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    navigate("/restaurant/room-items", {
                      state: {
                        focusRoomNo: selectedRoom.roomNumber,
                        roomData: selectedRoom.roomData,
                      },
                    })
                  }
                  className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Order Book
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/stayover")}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Stay Overview
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate("/hotel/guest", {
                      state: {
                        roomNumber: selectedRoom.roomNumber,
                        category: selectedRoom.roomData?.categoryName,
                      },
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Book / Update Room
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Dashboard;
