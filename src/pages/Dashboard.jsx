import {
  FaBed,
  FaKey,
  FaRupeeSign,
  FaCheckCircle,
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaBroom,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaDoorOpen,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useMemo, useState } from "react";

import MetricCard from "../components/Dashboard/MetricCard/MetricCard";
import MonthlyRevenueChart from "../components/Dashboard/Charts/MonthlyRevenueChart";
import RoomOccupancyChart from "../components/Dashboard/Charts/RoomOccupancyChart";
import FoodSalesChart from "../components/Dashboard/Charts/FoodSalesChart";
import HomePage from "../components/HomePage/HomePage";
import API from "../api";
import { housekeepingService } from "../services/housekeepingService";

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const formatDateLabel = (dateString) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  });

const normalizeStatus = (value) => String(value || "").toLowerCase();

const Dashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(
    localStorage.getItem("freshLogin") === "true"
  );
  const [blurBg, setBlurBg] = useState(false);

  const [apiMetrics, setApiMetrics] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    todayRevenue: 0,
    todayCheckins: 0,
  });
  const [rooms, setRooms] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const freshLoginFlag = localStorage.getItem("freshLogin");

    if (freshLoginFlag !== "true") {
      setLoading(false);
      return;
    }

    setBlurBg(true);

    const blurTimer = setTimeout(() => {
      setBlurBg(false);
    }, 500);

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

    const fetchMetrics = async () => {
      try {
        const res = await API.get("/dashboard/metrics");
        if (isMounted) {
          setApiMetrics({
            totalRooms: res.data.totalRooms || 0,
            occupiedRooms: res.data.occupiedRooms || 0,
            todayRevenue: res.data.todayRevenue || 0,
            todayCheckins: res.data.todayCheckins || 0,
          });
        }
      } catch {
        if (isMounted) {
          toast.error("Failed to load metrics", {
            position: "bottom-right",
          });
        }
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchRooms = async () => {
      try {
        const response = await housekeepingService.getAllRooms();
        if (isMounted) {
          setRooms(Array.isArray(response) ? response : []);
        }
      } catch {
        if (isMounted) {
          toast.error("Failed to load room overview", {
            position: "bottom-right",
          });
        }
      }
    };

    fetchRooms();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = [
    {
      title: "Total Rooms",
      value: apiMetrics.totalRooms.toString(),
      subtitle: "Calm inventory overview",
      icon: FaBed,
      gradient:
        "bg-[linear-gradient(135deg,#14978F_0%,#22B4A6_44%,#5ED9CF_100%)]",
      route: "/hotel",
    },
    {
      title: "Occupied Rooms",
      value: apiMetrics.occupiedRooms.toString(),
      subtitle: "Live stay activity",
      icon: FaKey,
      gradient:
        "bg-[linear-gradient(135deg,#2452D6_0%,#2E67E7_50%,#5B9AF1_100%)]",
      route: "/hotel",
    },
    {
      title: "Today's Revenue",
      value: `Rs. ${apiMetrics.todayRevenue.toLocaleString()}`,
      subtitle: "Front office and F&B earnings",
      icon: FaRupeeSign,
      gradient:
        "bg-[linear-gradient(135deg,#C96800_0%,#E18908_48%,#F4BD21_100%)]",
      route: "/accounts",
    },
    {
      title: "Today's Check-ins",
      value: apiMetrics.todayCheckins.toString(),
      subtitle: "Guest arrival momentum",
      icon: FaCheckCircle,
      gradient:
        "bg-[linear-gradient(135deg,#D61B79_0%,#E43288_52%,#EB67AD_100%)]",
      route: "/hotel",
    },
  ];
  const occupancyRate = apiMetrics.totalRooms
    ? `${Math.round((apiMetrics.occupiedRooms / apiMetrics.totalRooms) * 100)}%`
    : "0%";
  const heroStats = [
    { label: "Occupancy", value: occupancyRate },
    {
      label: "Today's Revenue",
      value: `Rs. ${apiMetrics.todayRevenue.toLocaleString()}`,
    },
    { label: "Check-ins", value: apiMetrics.todayCheckins.toString() },
  ];
  const stayOverview = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(selectedDate, index);
      const occupiedRooms = rooms.filter((room) => {
        const checkIn = room.checkIn ? String(room.checkIn).slice(0, 10) : null;
        const checkOut = room.checkOut ? String(room.checkOut).slice(0, 10) : null;
        if (checkIn && checkOut) {
          return checkIn <= date && checkOut >= date;
        }
        return normalizeStatus(room.hotelStatus).includes("occupied");
      });
      const arrivals = rooms.filter(
        (room) => room.checkIn && String(room.checkIn).slice(0, 10) === date
      );
      const departures = rooms.filter(
        (room) => room.checkOut && String(room.checkOut).slice(0, 10) === date
      );
      const blocked = rooms.filter((room) => {
        const status = normalizeStatus(room.status);
        return status.includes("out of service") || status.includes("blocked");
      });
      const availableCount = Math.max(
        rooms.length - occupiedRooms.length - blocked.length,
        0
      );

      return {
        date,
        label: formatDateLabel(date),
        availableCount,
        occupiedRooms,
        arrivals,
        departures,
        blocked,
      };
    });
  }, [rooms, selectedDate]);

  const selectedDaySnapshot = useMemo(() => {
    const day = stayOverview[0] || {
      occupiedRooms: [],
      arrivals: [],
      departures: [],
      blocked: [],
      availableCount: 0,
    };
    const attentionRooms = rooms.filter((room) => {
      const status = normalizeStatus(room.status);
      return status.includes("dirty") || room.assignee === "No Housekeeper";
    });

    return {
      available: rooms.filter(
        (room) =>
          !day.occupiedRooms.some((item) => item.roomNo === room.roomNo) &&
          !day.blocked.some((item) => item.roomNo === room.roomNo)
      ),
      occupied: day.occupiedRooms,
      arrivals: day.arrivals,
      departures: day.departures,
      blocked: day.blocked,
      attention: attentionRooms,
    };
  }, [rooms, stayOverview]);

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

  const statusColumns = [
    {
      title: `Available (${selectedDaySnapshot.available.length})`,
      rooms: selectedDaySnapshot.available,
      accent: "border-emerald-300",
      bar: "bg-emerald-500",
      text: "text-emerald-700",
    },
    {
      title: `Confirmed Stay (${selectedDaySnapshot.occupied.length})`,
      rooms: selectedDaySnapshot.occupied,
      accent: "border-cyan-300",
      bar: "bg-cyan-500",
      text: "text-cyan-700",
    },
    {
      title: `Arrivals (${selectedDaySnapshot.arrivals.length})`,
      rooms: selectedDaySnapshot.arrivals,
      accent: "border-violet-300",
      bar: "bg-violet-500",
      text: "text-violet-700",
    },
    {
      title: `Departures (${selectedDaySnapshot.departures.length})`,
      rooms: selectedDaySnapshot.departures,
      accent: "border-amber-300",
      bar: "bg-amber-500",
      text: "text-amber-700",
    },
    {
      title: `Attention (${selectedDaySnapshot.attention.length})`,
      rooms: selectedDaySnapshot.attention,
      accent: "border-rose-300",
      bar: "bg-rose-500",
      text: "text-rose-700",
    },
  ];
  const roomPreviewStats = selectedRoom
    ? [
        {
          label: "Room Status",
          value: selectedRoom.status || selectedRoom.hotelStatus || "Unknown",
        },
        {
          label: "Check-In",
          value: selectedRoom.checkIn
            ? formatDateLabel(String(selectedRoom.checkIn).slice(0, 10))
            : "--",
        },
        {
          label: "Check-Out",
          value: selectedRoom.checkOut
            ? formatDateLabel(String(selectedRoom.checkOut).slice(0, 10))
            : "--",
        },
        {
          label: "Housekeeper",
          value: selectedRoom.assignee || "Not assigned",
        },
      ]
    : [];

  return (
    <>
      <ToastContainer theme="dark" />

      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
            <p className="text-lg font-semibold text-white">
              Loading Dashboard...
            </p>
          </div>
        </div>
      )}
      

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

        <div className="mx-auto max-w-[1180px] space-y-7">
          <section className="overflow-hidden rounded-[26px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-4 py-5 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-6 sm:py-6 lg:px-8">
            <div className="relative z-[1] grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] lg:items-center">
              <div className="space-y-3">
                <p className="text-[7px] font-semibold uppercase tracking-[0.26em] text-cyan-200 sm:text-[10px]">
                  Resort Command Center
                </p>
                <div className="space-y-1">
                  <h1 className="max-w-l text-[1.25rem] font-black leading-[1.02] text-white sm:text-[2.4rem] xl:text-[0 rem]">
                    Operational snapshot for today
                  </h1>
                  <p className="max-w-3xl text-[12px] leading-5 text-slate-100/88 sm:text-[14px] sm:leading-6">
                    Track rooms, revenue, arrivals, and restaurant activity from
                    one cleaner dashboard built for daily hotel operations.
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
                    <div className="mt-3 text-[1.55rem] font-bold leading-none sm:text-[1.8rem]">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                subtitle={metric.subtitle}
                icon={metric.icon}
                gradient={metric.gradient}
                onClick={() => navigate(metric.route)}
              />
            ))}
          </div>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
            <div className="rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-700">
                    Stay Overview
                  </p>
                  <h2 className="mt-1 text-[1.15rem] font-bold text-slate-900">
                    7 day room strip inspired overview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Selected date se next 7 days ka available, arrival aur departure snapshot.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
                      className="rounded-full bg-white p-2 text-slate-600 shadow-sm transition hover:text-slate-900"
                    >
                      <FaArrowLeft />
                    </button>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                      <FaCalendarAlt className="text-cyan-600" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(event) => setSelectedDate(event.target.value)}
                        className="bg-transparent text-sm outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
                      className="rounded-full bg-white p-2 text-slate-600 shadow-sm transition hover:text-slate-900"
                    >
                      <FaArrowRight />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/stayover")}
                    className="rounded-full bg-gradient-to-r from-cyan-600 to-blue-500 px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5"
                  >
                    Stay Overview
                  </button>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[860px]">
                  <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] overflow-hidden rounded-[20px] border border-slate-200">
                    <div className="border-r border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </div>
                    {stayOverview.map((day) => (
                      <div
                        key={day.date}
                        className="border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white px-3 py-3 last:border-r-0"
                      >
                        <div className="text-sm font-semibold text-slate-900">{day.label}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {day.availableCount} available
                        </div>
                      </div>
                    ))}

                    <div className="border-r border-t border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700">
                      Occupied
                    </div>
                    {stayOverview.map((day) => (
                      <div
                        key={`${day.date}-occupied`}
                        className="min-h-[88px] border-r border-t border-slate-200 bg-white px-3 py-3 last:border-r-0"
                      >
                        <div className="space-y-2">
                          {day.occupiedRooms.length ? (
                            day.occupiedRooms.slice(0, 3).map((room) => (
                              <button
                                type="button"
                                key={`${day.date}-${room.roomNo}`}
                                onClick={() => setSelectedRoom(room)}
                                className="rounded-xl border border-cyan-100 bg-cyan-50 px-2.5 py-2 text-xs text-slate-700"
                              >
                                <div className="font-semibold text-slate-900">Room {room.roomNo}</div>
                                <div>{room.guest || "In-house guest"}</div>
                              </button>
                            ))
                          ) : (
                            <div className="text-xs text-slate-400">No occupied rooms</div>
                          )}
                          {day.occupiedRooms.length > 3 && (
                            <div className="text-xs font-medium text-cyan-700">
                              +{day.occupiedRooms.length - 3} more stays
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="border-r border-t border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700">
                      Movement
                    </div>
                    {stayOverview.map((day) => (
                      <div
                        key={`${day.date}-movement`}
                        className="min-h-[88px] border-r border-t border-slate-200 bg-white px-3 py-3 last:border-r-0"
                      >
                        <div className="space-y-2 text-xs">
                          <div className="rounded-xl bg-emerald-50 px-2.5 py-2 text-emerald-700">
                            Arrivals: <span className="font-semibold">{day.arrivals.length}</span>
                          </div>
                          <div className="rounded-xl bg-amber-50 px-2.5 py-2 text-amber-700">
                            Departures: <span className="font-semibold">{day.departures.length}</span>
                          </div>
                          <div className="rounded-xl bg-rose-50 px-2.5 py-2 text-rose-700">
                            Blocked: <span className="font-semibold">{day.blocked.length}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      Daily shortcuts
                    </h3>
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
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Open
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-rose-500">
                  Front Office Alert
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  Actionable room issues
                </h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <FaExclamationTriangle className="mt-0.5 text-rose-500" />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {selectedDaySnapshot.attention.length} rooms need attention
                        </div>
                        <div className="text-xs text-slate-600">
                          Dirty rooms ya unassigned housekeeping rooms ko review karein.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">
                    Arrivals on {formatDateLabel(selectedDate)}:
                    <span className="ml-2 font-semibold text-amber-700">
                      {selectedDaySnapshot.arrivals.length}
                    </span>
                  </div>
                  <div className="rounded-[18px] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-slate-700">
                    Departures on {formatDateLabel(selectedDate)}:
                    <span className="ml-2 font-semibold text-cyan-700">
                      {selectedDaySnapshot.departures.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-600">
                  Room Dashboard
                </p>
                <h2 className="mt-1 text-[1.15rem] font-bold text-slate-900">
                  Selected day operational buckets
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Available, confirmed stay, arrivals, departures aur attention rooms ko ek saath dekhiye.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
                Focus date: {formatDateLabel(selectedDate)}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
              {statusColumns.map((column) => (
                <div
                  key={column.title}
                  className={`overflow-hidden rounded-[20px] border ${column.accent} bg-white shadow-sm`}
                >
                  <div className={`h-1.5 w-full ${column.bar}`} />
                  <div className="p-4">
                    <div className={`text-sm font-semibold ${column.text}`}>{column.title}</div>
                    <div className="mt-3 space-y-2">
                      {column.rooms.length ? (
                        column.rooms.slice(0, 6).map((room) => (
                          <button
                            type="button"
                            key={`${column.title}-${room.roomNo}`}
                            onClick={() => setSelectedRoom(room)}
                            className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                          >
                            <div className="text-sm font-semibold text-slate-900">
                              Room {room.roomNo}
                            </div>
                            <div className="text-xs text-slate-500">
                              {room.guest || room.assignee || room.status || "Operational room"}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                          No rooms in this bucket
                        </div>
                      )}
                      {column.rooms.length > 6 && (
                        <div className="text-xs font-semibold text-slate-500">
                          +{column.rooms.length - 6} more rooms
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.52fr)_minmax(290px,0.82fr)]">
            <div className="w-full rounded-[24px] border border-white/70 bg-white/82 px-4 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5 sm:py-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-300">
                    Revenue Trend
                  </p>
                  <h2 className="mt-1 text-[1.1rem] font-bold text-slate-900">
                    Reservation statistics
                  </h2>
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
                <div className="mb-3 mt-1 text-[1.05rem] font-bold text-slate-900">
                  Occupancy overview
                </div>
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

      {selectedRoom && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSelectedRoom(null)}
        >
          <div
            className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,#fbfdff_0%,#f5faf8_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-700">
                  Room Preview
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  Room {selectedRoom.roomNo}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedRoom.guest || "No active guest linked for this room."}
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {roomPreviewStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">
                    Booking snapshot
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>Guest Name</span>
                      <span className="font-semibold text-slate-900">
                        {selectedRoom.guest || "--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>Operational Status</span>
                      <span className="font-semibold text-slate-900">
                        {selectedRoom.status || selectedRoom.hotelStatus || "--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>Housekeeping Owner</span>
                      <span className="font-semibold text-slate-900">
                        {selectedRoom.assignee || "No Housekeeper"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>Hotel Status</span>
                      <span className="font-semibold text-slate-900">
                        {selectedRoom.hotelStatus || "--"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] p-4 text-white shadow-sm">
                  <div className="text-sm font-semibold text-white">
                    Quick actions
                  </div>
                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => navigate("/stayover")}
                      className="w-full rounded-xl bg-white/12 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/18"
                    >
                      Open stay overview
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/hotel/guest")}
                      className="w-full rounded-xl bg-white/12 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/18"
                    >
                      Create or update booking
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/housekeeping")}
                      className="w-full rounded-xl bg-white/12 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/18"
                    >
                      Open housekeeping board
                    </button>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-200">
                    Ye mini panel front desk ko room-level context dega bina dashboard chhode.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
