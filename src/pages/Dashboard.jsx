import {
  FaBed,
  FaBroom,
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardCheck,
  FaChevronDown,
  FaDoorOpen,
  FaExclamationTriangle,
  FaBell,
  FaKey,
  FaRupeeSign,
  FaSearch,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

import API from "../api";
import FoodSalesChart from "../components/Dashboard/Charts/FoodSalesChart";
import MonthlyRevenueChart from "../components/Dashboard/Charts/MonthlyRevenueChart";
import RoomOccupancyChart from "../components/Dashboard/Charts/RoomOccupancyChart";
import MetricCard from "../components/Dashboard/MetricCard/MetricCard";
import {
  getCleaningTasks,
  setCleaningTasks,
  upsertCleaningTask,
} from "../components/Hotel/bookingSession";
import { pushDashboardNotification } from "../components/Dashboard/dashboardNotifications";
import {
  addDays,
  BOARD_BUCKET_META,
  buildStaySummary,
  expandBookings,
  formatDateLabel,
  formatCurrency,
  getBookingContact,
  getRoomBookingReference,
  formatShortDate,
  mergeBookingsWithRooms,
  normalizeBookingPreview,
  normalizeRooms,
  todayISO,
} from "../components/Dashboard/stayoverUtils";

const boardOrder = ["available", "confirmed", "cleaning", "pencil", "blocked", "checked_in"];
const CLEANING_TIME_OPTIONS = [15, 30, 45, 60, 90, 120];
const AVAILABLE_ROOM_TYPE_ORDER = [
  "AC ROOM",
  "NON-AC ROOM",
  "DELUXE ROOM",
  "SUPER DELUXE ROOM",
  "SUITE ROOM",
  "DELUXE DORMITORY",
];

const DASHBOARD_SEARCH_TARGETS = [
  { label: "Dashboard", route: "/dashboard", helper: "Operational snapshot", keywords: ["dashboard", "home", "snapshot"] },
  { label: "Stay Overview", route: "/stayover", helper: "Room status board", keywords: ["stayover", "stay overview", "room board", "availability"] },
  { label: "Housekeeping", route: "/housekeeping", helper: "Cleaning log and assignments", keywords: ["housekeeping", "cleaning", "timer", "cleaning log"] },
  { label: "All Bookings", route: "/hotel/all-bookings", helper: "Active booking list", keywords: ["all booking", "all bookings", "booking", "active booking"] },
  { label: "Booking History", route: "/hotel/booking-history", helper: "Past booking records", keywords: ["history", "booking history", "past booking"] },
  { label: "Guest Booking", route: "/hotel/guest", helper: "New booking entry", keywords: ["guest", "new booking", "book room", "booking steps"] },
  { label: "Communication", route: "/hotel/communication", helper: "Invoice and guest communication", keywords: ["communication", "message", "invoice", "check in", "check out"] },
  { label: "Attendance", route: "/attendance", helper: "Staff attendance tracker", keywords: ["attendance", "staff", "punch"] },
  { label: "Accounts", route: "/accounts", helper: "Revenue and finance", keywords: ["accounts", "finance", "revenue", "income"] },
  { label: "Inventory", route: "/inventory", helper: "Stock and item control", keywords: ["inventory", "stock", "item"] },
  { label: "Users", route: "/user", helper: "User management", keywords: ["user", "users", "staff", "employee"] },
  { label: "Reports", route: "/reports", helper: "Summary and analytics", keywords: ["reports", "report", "analytics"] },
  { label: "Kitchen", route: "/kitchen", helper: "Kitchen status", keywords: ["kitchen", "food", "prep"] },
  { label: "Restaurant", route: "/restaurant", helper: "Restaurant dashboard", keywords: ["restaurant", "table", "menu"] },
  { label: "Banquet", route: "/banquet", helper: "Event and hall ops", keywords: ["banquet", "hall", "event"] },
];

const getHousekeepingUsers = (users) =>
  Array.from(
    new Set(
      (Array.isArray(users) ? users : [])
        .filter((user) => String(user.role || "").toLowerCase().includes("housekeeping"))
        .map((user) => String(user.name || "").trim())
        .filter(Boolean),
    ),
  );

const normalizeAvailableRoomType = (value) => {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();

  if (lower.includes("super deluxe")) return "SUPER DELUXE ROOM";
  if (lower.includes("deluxe dormitory")) return "DELUXE DORMITORY";
  if (lower.includes("suite")) return "SUITE ROOM";
  if (lower.includes("non ac") || lower.includes("non-ac") || lower.includes("hotel room") || lower.includes("standard")) {
    return "NON-AC ROOM";
  }
  if (lower.includes("ac") && !lower.includes("non")) return "AC ROOM";
  if (lower.includes("deluxe")) return "DELUXE ROOM";
  return raw ? raw.toUpperCase() : "ROOM TYPE";
};

const groupRoomsByType = (items = []) => {
  const buckets = AVAILABLE_ROOM_TYPE_ORDER.reduce((acc, label) => {
    acc[label] = [];
    return acc;
  }, {});
  const extras = {};

  (items || []).forEach((item) => {
    const roomTypeLabel = normalizeAvailableRoomType(item.roomType);
    if (Object.prototype.hasOwnProperty.call(buckets, roomTypeLabel)) {
      buckets[roomTypeLabel].push(item);
      return;
    }

    if (!extras[roomTypeLabel]) extras[roomTypeLabel] = [];
    extras[roomTypeLabel].push(item);
  });

  return [
    ...AVAILABLE_ROOM_TYPE_ORDER.map((label) => ({
      label,
      items: buckets[label].sort((left, right) => String(left.roomNumber).localeCompare(String(right.roomNumber), undefined, { numeric: true })),
    })),
    ...Object.entries(extras).map(([label, items]) => ({
      label,
      items: items.sort((left, right) => String(left.roomNumber).localeCompare(String(right.roomNumber), undefined, { numeric: true })),
    })),
  ].filter((group) => AVAILABLE_ROOM_TYPE_ORDER.includes(group.label) || group.items.length > 0);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(localStorage.getItem("freshLogin") === "true");
  const [blurBg, setBlurBg] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [boardStartDate, setBoardStartDate] = useState(todayISO());
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bucketOpen, setBucketOpen] = useState(() =>
    boardOrder.reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {}),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [availableTypeOpen, setAvailableTypeOpen] = useState("");
  const [housekeepers, setHousekeepers] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedCleaningMinutes, setSelectedCleaningMinutes] = useState(30);
  const [assigningCleaning, setAssigningCleaning] = useState(false);
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [apiMetrics, setApiMetrics] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    todayRevenue: 0,
    todayCheckins: 0,
  });
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  const loadDashboardData = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshingDashboard(true);

      const [metricsRes, roomsRes, bookingsRes, usersRes] = await Promise.all([
        API.get("/dashboard/metrics"),
        API.get("/housekeeping"),
        API.get("/hotel/all-bookings"),
        API.get("/users"),
      ]);

      setApiMetrics({
        totalRooms: metricsRes.data.totalRooms || 0,
        occupiedRooms: metricsRes.data.occupiedRooms || 0,
        todayRevenue: metricsRes.data.todayRevenue || 0,
        todayCheckins: metricsRes.data.todayCheckins || 0,
      });
      setRooms(normalizeRooms(roomsRes.data));
      setBookings(expandBookings(bookingsRes.data));
      setHousekeepers(getHousekeepingUsers(usersRes.data));
    } finally {
      if (silent) setRefreshingDashboard(false);
    }
  }, []);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return DASHBOARD_SEARCH_TARGETS.slice(0, 6);

    const tokens = query.split(/\s+/).filter(Boolean);
    return DASHBOARD_SEARCH_TARGETS.filter((item) => {
      const haystack = [item.label, item.route, item.helper, ...(item.keywords || [])]
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    }).slice(0, 8);
  }, [searchQuery]);

  const openSearchTarget = (target) => {
    setSearchQuery("");
    setSearchFocused(false);
    if (!target?.route) return;
    navigate(target.route);
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
  }, [loadDashboardData]);

  useEffect(() => {
    const refreshDashboard = () => {
      loadDashboardData(true).catch((error) => {
        console.error("Dashboard refresh failed", error);
      });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshDashboard();
      }
    };

    const intervalId = window.setInterval(refreshDashboard, 30000);
    window.addEventListener("focus", refreshDashboard);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshDashboard);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    let mounted = true;

    const syncExpiredCleaningTasks = async () => {
      const tasks = getCleaningTasks();
      const now = Date.now();
      let changed = false;

      for (const [roomKey, task] of Object.entries(tasks)) {
        const dueAt = task?.dueAt ? new Date(task.dueAt).getTime() : 0;
        if (dueAt && now >= dueAt) {
          try {
            await API.put(`/housekeeping/status/${task.roomId || roomKey}`, {
              status: "Vacant Clean",
            });
          } catch (error) {
            console.error("Auto release failed", error);
          }
          pushDashboardNotification({
            title: `Cleaning completed - Room ${task.roomNumber || roomKey}`,
            message: `Room ${task.roomNumber || roomKey} is available again.`,
            type: "success",
            route: "/housekeeping",
          });
          delete tasks[roomKey];
          changed = true;
        }
      }

      if (!mounted) return;

      if (changed) {
        setCleaningTasks(tasks);
        await loadDashboardData();
      }
    };

    syncExpiredCleaningTasks();
    const timer = setInterval(syncExpiredCleaningTasks, 60000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [loadDashboardData]);

  const mergedBookings = useMemo(() => mergeBookingsWithRooms(bookings, rooms), [bookings, rooms]);

  const stayOverview = useMemo(
    () => buildStaySummary(rooms, mergedBookings, boardStartDate),
    [boardStartDate, mergedBookings, rooms],
  );

  const selectedBoardDay = stayOverview.find((day) => day.date === selectedDate) || stayOverview[0] || null;
  const selectedDaySnapshot = selectedBoardDay?.board || {
    available: [],
    confirmed: [],
    cleaning: [],
    pencil: [],
    blocked: [],
    checked_in: [],
  };

  const availableRoomGroups = useMemo(() => groupRoomsByType(selectedDaySnapshot.available), [selectedDaySnapshot.available]);
  const confirmedRoomGroups = useMemo(() => groupRoomsByType(selectedDaySnapshot.confirmed), [selectedDaySnapshot.confirmed]);
  const cleaningRoomGroups = useMemo(() => groupRoomsByType(selectedDaySnapshot.cleaning), [selectedDaySnapshot.cleaning]);
  const pencilRoomGroups = useMemo(() => groupRoomsByType(selectedDaySnapshot.pencil), [selectedDaySnapshot.pencil]);
  const blockedRoomGroups = useMemo(() => groupRoomsByType(selectedDaySnapshot.blocked), [selectedDaySnapshot.blocked]);
  const checkedInRoomGroups = useMemo(() => groupRoomsByType(selectedDaySnapshot.checked_in), [selectedDaySnapshot.checked_in]);

  const attentionCount = useMemo(
    () =>
      rooms.filter((room) => {
        const status = String(room.housekeepingLabel || room.status || "").toLowerCase();
        return status.includes("dirty") || !room.assignee || room.assignee === "No Housekeeper";
      }).length,
    [rooms],
  );
  const dirtyRoomCount = useMemo(
    () =>
      rooms.filter((room) =>
        String(room.housekeepingLabel || room.status || "").toLowerCase().includes("dirty"),
      ).length,
    [rooms],
  );
  const unassignedHousekeepingCount = useMemo(
    () =>
      rooms.filter((room) => {
        const assignee = String(room.assignee || "").trim().toLowerCase();
        return !assignee || assignee === "no housekeeper";
      }).length,
    [rooms],
  );
  const actionableAlerts = useMemo(
    () => [
      {
        key: "attention",
        tone: "border-rose-200 bg-rose-50",
        iconClass: "text-rose-500",
        title: `${attentionCount} live room issue${attentionCount === 1 ? "" : "s"}`,
        detail: `${dirtyRoomCount} dirty room, ${unassignedHousekeepingCount} unassigned housekeeping room.`,
      },
      {
        key: "confirmed",
        tone: "border-amber-200 bg-amber-50",
        iconClass: "text-amber-500",
        title: `${selectedDaySnapshot.confirmed.length} confirmed room${selectedDaySnapshot.confirmed.length === 1 ? "" : "s"}`,
        detail: `Confirmed for ${formatDateLabel(selectedDate)} from live booking board.`,
      },
      {
        key: "cleaning",
        tone: "border-violet-200 bg-violet-50",
        iconClass: "text-violet-500",
        title: `${selectedDaySnapshot.cleaning.length} cleaning room${selectedDaySnapshot.cleaning.length === 1 ? "" : "s"}`,
        detail: `Cleaning queue for ${formatDateLabel(selectedDate)} from housekeeping feed.`,
      },
      {
        key: "checked-in",
        tone: "border-cyan-200 bg-cyan-50",
        iconClass: "text-cyan-500",
        title: `${selectedDaySnapshot.checked_in.length} checked-in room${selectedDaySnapshot.checked_in.length === 1 ? "" : "s"}`,
        detail: `In-house rooms for ${formatDateLabel(selectedDate)} from active stay data.`,
      },
    ],
    [
      attentionCount,
      dirtyRoomCount,
      selectedDate,
      selectedDaySnapshot.checked_in.length,
      selectedDaySnapshot.cleaning.length,
      selectedDaySnapshot.confirmed.length,
      unassignedHousekeepingCount,
    ],
  );
  const pendingSettlementAmount = useMemo(
    () =>
      bookings.reduce((sum, booking) => sum + Number(booking.remainingAmount || 0), 0),
    [bookings],
  );
  const pendingSettlementCount = useMemo(
    () => bookings.filter((booking) => Number(booking.remainingAmount || 0) > 0).length,
    [bookings],
  );
  const dashboardNotifications = useMemo(
    () =>
      [
        {
          id: `notif-attention-${selectedDate}`,
          title: `${attentionCount} rooms need attention`,
          message: `${dirtyRoomCount} dirty room and ${unassignedHousekeepingCount} room without housekeeper assignment.`,
          route: "/housekeeping",
          createdAt: `${selectedDate}T09:00:00`,
        },
        {
          id: `notif-confirmed-${selectedDate}`,
          title: `${selectedDaySnapshot.confirmed.length} confirmed rooms`,
          message: `Confirmed arrivals for ${formatDateLabel(selectedDate)} from live booking board.`,
          route: "/stayover",
          createdAt: `${selectedDate}T08:00:00`,
        },
        {
          id: `notif-cleaning-${selectedDate}`,
          title: `${selectedDaySnapshot.cleaning.length} rooms in cleaning`,
          message: `Housekeeping queue for ${formatDateLabel(selectedDate)} from live room feed.`,
          route: "/housekeeping",
          createdAt: `${selectedDate}T07:00:00`,
        },
        {
          id: `notif-checkin-${selectedDate}`,
          title: `${selectedDaySnapshot.checked_in.length} checked-in rooms`,
          message: `In-house occupied rooms for ${formatDateLabel(selectedDate)} from active stay data.`,
          route: "/hotel/all-bookings",
          createdAt: `${selectedDate}T06:00:00`,
        },
        {
          id: `notif-settlement-${selectedDate}`,
          title: `${pendingSettlementCount} bookings pending settlement`,
          message: `${formatCurrency(pendingSettlementAmount)} still due across active bookings.`,
          route: "/accounts",
          createdAt: `${selectedDate}T05:00:00`,
        },
      ].filter((item) => {
        const digits = item.title.match(/\d+/g);
        const total = digits ? digits.reduce((sum, value) => sum + Number(value || 0), 0) : 0;
        return total > 0;
      }),
    [
      attentionCount,
      dirtyRoomCount,
      pendingSettlementAmount,
      pendingSettlementCount,
      selectedDate,
      selectedDaySnapshot.checked_in.length,
      selectedDaySnapshot.cleaning.length,
      selectedDaySnapshot.confirmed.length,
      unassignedHousekeepingCount,
    ],
  );

  const liveTotalRooms = rooms.length || apiMetrics.totalRooms || 0;
  const liveOccupiedRooms = rooms.filter((room) => {
    const status = String(room.status || room.hotelStatus || "").toLowerCase();
    return status.includes("occupied") || status.includes("in house") || status.includes("checked in");
  }).length;
  const liveCheckins = selectedBoardDay?.arrivals?.length || apiMetrics.todayCheckins || 0;
  const liveRevenue = (selectedBoardDay?.arrivals || []).reduce(
    (sum, booking) => {
      const paid = Number(booking.paidAmount || 0);
      if (paid > 0) return sum + paid;

      const total = Number(booking.totalAmount || 0);
      const remaining = Number(booking.remainingAmount || 0);
      const collected = Math.max(total - remaining, 0);
      return sum + collected;
    },
    0,
  );
  const occupancyRate = liveTotalRooms ? `${Math.round((liveOccupiedRooms / liveTotalRooms) * 100)}%` : "0%";
  const displayRevenue = liveRevenue || apiMetrics.todayRevenue || 0;

  const metrics = [
    {
      title: "Total Rooms",
      value: String(liveTotalRooms),
      subtitle: "Calm inventory overview",
      icon: FaBed,
      gradient: "bg-[linear-gradient(135deg,#14978F_0%,#22B4A6_44%,#5ED9CF_100%)]",
      route: "/hotel",
    },
    {
      title: "Occupied Rooms",
      value: String(liveOccupiedRooms || apiMetrics.occupiedRooms || 0),
      subtitle: "Live stay activity",
      icon: FaKey,
      gradient: "bg-[linear-gradient(135deg,#2452D6_0%,#2E67E7_50%,#5B9AF1_100%)]",
      route: "/hotel",
    },
    {
      title: "Today's Revenue",
      value: `Rs. ${Number(displayRevenue || 0).toLocaleString()}`,
      subtitle: "Front office and F&B earnings",
      icon: FaRupeeSign,
      gradient: "bg-[linear-gradient(135deg,#C96800_0%,#E18908_48%,#F4BD21_100%)]",
      route: "/accounts",
    },
    {
      title: "Today's Check-ins",
      value: String(liveCheckins),
      subtitle: "Guest arrival momentum",
      icon: FaCheckCircle,
      gradient: "bg-[linear-gradient(135deg,#D61B79_0%,#E43288_52%,#EB67AD_100%)]",
      route: "/hotel",
    },
  ];

  const heroStats = [
    { label: "Occupancy", value: occupancyRate },
    { label: "Today's Revenue", value: `Rs. ${Number(displayRevenue || 0).toLocaleString()}` },
    { label: "Check-ins", value: String(liveCheckins) },
  ];
  const quickActions = [
    {
      label: "New Booking",
      helper: "Front desk guest entry",
      liveValue: `${liveCheckins}`,
      liveLabel: "today check-ins",
      detail: `${selectedDaySnapshot.confirmed.length} confirmed room(s) for ${formatDateLabel(selectedDate)}`,
      icon: FaDoorOpen,
      route: "/hotel/guest",
      tone: "from-cyan-500 to-blue-500",
    },
    {
      label: "Cleaning Log",
      helper: "Review room readiness",
      liveValue: `${selectedDaySnapshot.cleaning.length}`,
      liveLabel: "rooms in queue",
      detail: `${selectedDaySnapshot.cleaning.length} live housekeeping room(s) need readiness review`,
      icon: FaBroom,
      route: "/housekeeping?view=cleaning-log",
      tone: "from-emerald-500 to-teal-500",
    },
    {
      label: "Settlement Review",
      helper: "Track billing movement",
      liveValue: formatCurrency(pendingSettlementAmount),
      liveLabel: "balance due",
      detail: `${pendingSettlementCount} booking(s) still waiting for settlement`,
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

  const isRoomInStay = (booking) => {
    if (!booking) return false;

    const status = String(booking.bookingStatus || "").toLowerCase();
    if (
      status.includes("checked in") ||
      status.includes("check in") ||
      status.includes("occupied") ||
      status.includes("in house")
    ) {
      return true;
    }

    if (!booking.checkIn || !booking.checkOut) return false;
    const today = selectedDate || todayISO();
    return today >= booking.checkIn && today < booking.checkOut;
  };

  const openRoomPreview = (item) => {
    const roomNumber =
      item?.roomNumber ||
      item?.roomNo ||
      item?.room ||
      item?.roomData?.roomNumber ||
      item?.roomData?.roomNo ||
      item?.booking?.roomNumber ||
      item?.booking?.roomNo ||
      "";
    const roomId =
      item?.roomId ||
      item?.roomData?.roomId ||
      item?.roomData?.id ||
      item?.booking?.roomId ||
      item?.booking?.roomId ||
      "";
    const roomType =
      item?.roomType ||
      item?.roomData?.categoryName ||
      item?.roomData?.roomType ||
      item?.roomData?.housekeepingLabel ||
      "Room";

    const fallbackBooking =
      item?.booking || getRoomBookingReference(roomNumber, selectedDate || todayISO(), mergedBookings);

    const booking = fallbackBooking ? normalizeBookingPreview(fallbackBooking) : null;

    setSelectedRoom({
      ...item,
      roomNumber,
      roomId,
      roomType,
      roomData: item?.roomData || item,
      booking,
    });

    const bookingId = booking?.bookingId;
    if (!bookingId || String(bookingId).startsWith("room-")) return;

    if (getBookingContact(booking)) return;

    API.get(`/hotel/full-booking/${bookingId}`)
      .then((response) => {
        const fullBooking = response?.data || {};
        const normalizedFullBooking = normalizeBookingPreview(fullBooking);

        setSelectedRoom((current) =>
          current && String(current.booking?.bookingId) === String(bookingId)
            ? {
                ...current,
                booking: {
                  ...current.booking,
                  ...normalizedFullBooking,
                },
              }
            : current,
        );
      })
      .catch((error) => {
        console.error("Full booking hydrate failed", error);
      });
  };

  useEffect(() => {
    if (!stayOverview.length) return;

    const isSelectedDateVisible = stayOverview.some((day) => day.date === selectedDate);
    if (!isSelectedDateVisible) {
      setSelectedDate(stayOverview[0].date);
      setAvailableTypeOpen("");
    }
  }, [selectedDate, stayOverview]);

  const jumpBoardWindow = (nextDate) => {
    setBoardStartDate(nextDate);
    setSelectedDate(nextDate);
    setAvailableTypeOpen("");
  };

  const toggleBoardDay = (date) => {
    setSelectedDate(date);
    setAvailableTypeOpen("");
  };

  const renderBoardColumnContent = (day, key) => {
    const items = day?.board?.[key] || [];
    const groups = groupRoomsByType(items);

    if (["available", "confirmed", "cleaning", "pencil", "blocked", "checked_in"].includes(key)) {
      const toneMap = {
        available: {
          border: "border-emerald-200",
          soft: "bg-emerald-50/70",
          badge: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.18)]",
          title: "text-emerald-900",
          sub: "text-emerald-700",
          button: "border-emerald-100",
          dot: "border-emerald-200 bg-emerald-50 text-emerald-600",
          empty: "border-dashed border-emerald-200 bg-white text-emerald-500",
          pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
        },
        confirmed: {
          border: "border-orange-200",
          soft: "bg-orange-50/70",
          badge: "border-orange-200 bg-orange-50 text-orange-700 shadow-[0_8px_20px_rgba(249,115,22,0.18)]",
          title: "text-orange-900",
          sub: "text-orange-700",
          button: "border-orange-100",
          dot: "border-orange-200 bg-orange-50 text-orange-600",
          empty: "border-dashed border-orange-200 bg-white text-orange-500",
          pill: "border-orange-200 bg-orange-50 text-orange-700",
        },
        cleaning: {
          border: "border-violet-200",
          soft: "bg-violet-50/70",
          badge: "border-violet-200 bg-violet-50 text-violet-700 shadow-[0_8px_20px_rgba(124,58,237,0.18)]",
          title: "text-violet-900",
          sub: "text-violet-700",
          button: "border-violet-100",
          dot: "border-violet-200 bg-violet-50 text-violet-600",
          empty: "border-dashed border-violet-200 bg-white text-violet-500",
          pill: "border-violet-200 bg-violet-50 text-violet-700",
        },
        pencil: {
          border: "border-amber-200",
          soft: "bg-amber-50/70",
          badge: "border-amber-200 bg-amber-50 text-amber-700 shadow-[0_8px_20px_rgba(245,158,11,0.18)]",
          title: "text-amber-900",
          sub: "text-amber-700",
          button: "border-amber-100",
          dot: "border-amber-200 bg-amber-50 text-amber-600",
          empty: "border-dashed border-amber-200 bg-white text-amber-500",
          pill: "border-amber-200 bg-amber-50 text-amber-700",
        },
        blocked: {
          border: "border-slate-200",
          soft: "bg-slate-50/80",
          badge: "border-slate-200 bg-slate-50 text-slate-700 shadow-[0_8px_20px_rgba(100,116,139,0.18)]",
          title: "text-slate-900",
          sub: "text-slate-600",
          button: "border-slate-100",
          dot: "border-slate-200 bg-slate-50 text-slate-600",
          empty: "border-dashed border-slate-200 bg-white text-slate-500",
          pill: "border-slate-200 bg-slate-50 text-slate-700",
        },
        checked_in: {
          border: "border-sky-200",
          soft: "bg-sky-50/70",
          badge: "border-sky-200 bg-sky-50 text-sky-700 shadow-[0_8px_20px_rgba(14,165,233,0.18)]",
          title: "text-sky-900",
          sub: "text-sky-700",
          button: "border-sky-100",
          dot: "border-sky-200 bg-sky-50 text-sky-600",
          empty: "border-dashed border-sky-200 bg-white text-sky-500",
          pill: "border-sky-200 bg-sky-50 text-sky-700",
        },
      };

      const subtitleMap = {
        available: "available",
        confirmed: "confirmed",
        cleaning: "cleaning",
        pencil: "pencil",
        blocked: "blocked",
        checked_in: "checked in",
      };

      const tone = toneMap[key];

      return (
        <div className="max-h-[270px] space-y-3 overflow-y-auto pr-1">
          {groups.length ? (
            groups.map((group) => {
              const typeKey = `${day?.date || "today"}-${key}-${group.label}`;
              const isTypeOpen = availableTypeOpen === typeKey;

              return (
                <div key={group.label} className="relative w-full overflow-visible">
                  <span className={`absolute -right-1 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-black ${tone.badge}`}>
                    {group.items.length}
                  </span>
                  <div className={`overflow-hidden rounded-[18px] border bg-white shadow-sm ${tone.border}`}>
                    <button
                      type="button"
                      onClick={() => toggleAvailableType(typeKey)}
                      className={`flex w-full items-center justify-between gap-3 border-b px-3 py-3 text-left ${tone.button}`}
                    >
                      <div className="min-w-0">
                        <div className={`text-sm font-black uppercase tracking-[0.12em] ${tone.title}`}>
                          {group.label}
                        </div>
                        <div className={`mt-1 text-[11px] font-medium ${tone.sub}`}>
                          {group.items.length} room(s) {subtitleMap[key]}
                        </div>
                      </div>
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-transform duration-500 ease-out ${
                          isTypeOpen ? "rotate-180" : "rotate-0"
                        } ${tone.dot}`}
                      >
                        <FaChevronDown className="text-xs" />
                      </span>
                    </button>

                    <div
                      style={{ gridTemplateRows: isTypeOpen ? "1fr" : "0fr" }}
                      className="grid transition-[grid-template-rows] duration-500 ease-out"
                    >
                      <div
                        className={`overflow-hidden px-3 pb-3 transition-all duration-500 ease-out ${
                          isTypeOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                        }`}
                      >
                        <div className="space-y-2 pt-2">
                          {group.items.length ? (
                            group.items.map((item) => (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => openRoomPreview(item)}
                                className={`w-full rounded-[14px] border px-2.5 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone.border} ${tone.soft}`}
                              >
                                {item.statusLabel ? (
                                  <div className="mb-1 flex justify-end">
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.pill}`}>
                                      {item.statusLabel}
                                    </span>
                                  </div>
                                ) : null}
                                <div className={`font-black ${tone.title}`}>
                                  {key === "confirmed" || key === "pencil"
                                    ? item.booking?.guestName || `Room ${item.roomNumber}`
                                    : `Room ${item.roomNumber}`}
                                </div>
                                <div className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.sub}`}>
                                  {key === "confirmed" || key === "pencil"
                                    ? `Room ${item.roomNumber} | ID ${item.roomId || "--"}`
                                    : `ID ${item.roomId || "--"}`}
                                </div>
                                {key === "confirmed" || key === "pencil" ? (
                                  <div className={`mt-1 text-[11px] ${tone.title}`}>
                                    {item.booking?.mobile || item.subtitle || item.statusLabel || "Booking details"}
                                  </div>
                                ) : null}
                              </button>
                            ))
                          ) : (
                            <div className={`rounded-[14px] border px-3 py-4 text-center text-xs ${tone.empty}`}>
                              No rooms
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[16px] border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
              No rooms
            </div>
          )}
        </div>
      );
    }

    const meta = BOARD_BUCKET_META[key];
    return (
      <div className="space-y-2">
        {items.length ? (
          items.slice(0, 6).map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => openRoomPreview(item)}
              className={`w-full rounded-[16px] border px-3 py-2 text-left text-xs shadow-sm ${meta.soft}`}
            >
              {item.statusLabel ? (
                <div className="mb-1 flex justify-end">
                  <span className="rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {item.statusLabel}
                  </span>
                </div>
              ) : null}
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
    );
  };

  const renderExpandedBoard = (day) => (
    <div className="grid grid-cols-[150px_minmax(230px,1.25fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)] border-t border-slate-200">
      <div className="border-r border-slate-200 bg-slate-50" />
      {boardOrder.map((key) => {
        const meta = BOARD_BUCKET_META[key];
        const items = day?.board?.[key] || [];
        const isOpen = bucketOpen[key] !== false;

        return (
          <div key={`${day.date}-${key}`} className="border-r border-slate-200 bg-white last:border-r-0">
            <div className={`h-1.5 w-full ${meta.bar}`} />
            <div className="flex h-[320px] flex-col px-3 py-3">
              <button
                type="button"
                onClick={() => toggleBucket(key)}
                className="flex items-center justify-between gap-2 text-left"
              >
                <div className="text-sm font-bold text-slate-900">
                  {meta.label} ({items.length})
                </div>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-transform duration-500 ease-out ${
                    isOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  <FaChevronDown className="text-xs transition-transform duration-500 ease-out" />
                </span>
              </button>

              <div
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                className="mt-3 grid min-h-0 flex-1 transition-[grid-template-rows] duration-500 ease-out"
              >
                <div
                  className={`min-h-0 overflow-hidden transition-all duration-500 ease-out ${
                    isOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                  }`}
                >
                  {renderBoardColumnContent(day, key)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  useEffect(() => {
    if (!selectedRoom) return;

    const roomId = selectedRoom.roomData?.id || selectedRoom.roomId || selectedRoom.roomNumber;
    const assignee = selectedRoom.roomData?.assignee;
    setSelectedAssignee(assignee && assignee !== "No Housekeeper" ? assignee : "");

    try {
      const tasks = getCleaningTasks();
      const task = tasks[String(roomId)];
      setSelectedCleaningMinutes(task?.minutes ? Number(task.minutes) || 30 : 30);
    } catch {
      setSelectedCleaningMinutes(30);
    }
  }, [selectedRoom]);

  const handleAssignCleaning = async () => {
    const roomId = selectedRoom?.roomData?.id || selectedRoom?.roomId || selectedRoom?.roomNumber;
    if (!roomId) {
      alert("Room record missing hai.");
      return;
    }

    if (!selectedAssignee) {
      alert("Please housekeeper select karein.");
      return;
    }

    try {
      setAssigningCleaning(true);
      await API.put(`/housekeeping/assignee/${roomId}`, { assignee: selectedAssignee });
      await API.put(`/housekeeping/status/${roomId}`, { status: "Vacant Dirty" });
      upsertCleaningTask(roomId, {
        roomId,
        roomNumber: selectedRoom.roomNumber,
        roomType: selectedRoom.roomData?.categoryName || selectedRoom.roomType || "Room",
        assignee: selectedAssignee,
        minutes: selectedCleaningMinutes,
        status: "dirty",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        dueAt: new Date(Date.now() + Number(selectedCleaningMinutes || 30) * 60000).toISOString(),
      });
      pushDashboardNotification({
        title: `Cleaning assigned - Room ${selectedRoom.roomNumber}`,
        message: `Assigned to ${selectedAssignee} for ${selectedCleaningMinutes} min`,
        type: "info",
        route: "/housekeeping",
      });
      await loadDashboardData();
      setSelectedRoom((prev) =>
        prev
          ? {
              ...prev,
              roomData: {
                ...prev.roomData,
                assignee: selectedAssignee,
                status: "cleaning",
                housekeepingLabel: "Vacant Dirty",
              },
            }
          : prev,
      );
      toast.success("Housekeeper assign ho gaya aur cleaning time save ho gaya.");
    } catch (error) {
      console.error(error);
      toast.error("Housekeeping assignment save nahi ho paaya.");
    } finally {
      setAssigningCleaning(false);
    }
  };

  const handleBlockedRoom = async (mode) => {
    const roomNumber = selectedRoom?.roomNumber;
    if (!roomNumber) {
      alert("Room number missing hai.");
      return;
    }

    try {
      if (mode === "block") {
        const blockReason = window.prompt("Block reason likhiye", selectedRoom?.roomData?.blockReason || "Maintenance");
        if (blockReason === null) return;
        const blockFrom = window.prompt("Block from date (YYYY-MM-DD)", selectedDate || todayISO());
        if (blockFrom === null) return;
        const blockTo = window.prompt(
          "Block to date (YYYY-MM-DD)",
          selectedRoom?.roomData?.blockTo || blockFrom || selectedDate || todayISO(),
        );
        if (blockTo === null) return;
        const blockNotes = window.prompt("Notes", selectedRoom?.roomData?.blockNotes || "") ?? "";

        await API.put(`/hotel/rooms/state/${roomNumber}`, {
          status: "Blocked",
          blockReason,
          blockFrom,
          blockTo,
          blockNotes,
          blockedBy: "Front Desk",
        });
      } else {
        await API.put(`/hotel/rooms/state/${roomNumber}`, {
          status: "Available",
        });
      }

      await loadDashboardData();
      setSelectedRoom(null);
      toast.success(mode === "block" ? "Room blocked successfully." : "Room unblocked successfully.");
    } catch (error) {
      console.error(error);
      toast.error(mode === "block" ? "Room block nahi ho paaya." : "Room unblock nahi ho paaya.");
    }
  };

  const toggleBucket = (key) => {
    setBucketOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAvailableType = (typeKey) => {
    setAvailableTypeOpen((prev) => (prev === typeKey ? "" : typeKey));
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
      pushDashboardNotification({
        title: action === "check-out" ? `Guest checked out - Room ${selectedRoom.roomNumber}` : `Guest checked in - Room ${selectedRoom.roomNumber}`,
        message: action === "check-out" ? "Booking history me move ho gaya." : "Current stay active ho gaya.",
        type: action === "check-out" ? "warning" : "success",
        route: action === "check-out" ? "/hotel/booking-history" : "/hotel/all-bookings",
      });
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

              <div className="relative rounded-[22px] border border-white/15 bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                <label className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-slate-950/20 px-4 py-3">
                  <FaSearch className="text-cyan-200" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && searchResults.length) {
                        openSearchTarget(searchResults[0]);
                      }
                    }}
                    placeholder="Search page, file, room module or report..."
                    className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-300/70"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/15"
                    >
                      Clear
                    </button>
                  ) : null}
                </label>
                {searchFocused && (searchQuery || searchResults.length) ? (
                  <div className="absolute left-3 right-3 top-[84px] z-20 overflow-hidden rounded-[18px] border border-white/10 bg-slate-950/90 shadow-[0_20px_40px_rgba(0,0,0,0.28)] backdrop-blur-md">
                    <div className="max-h-[280px] overflow-y-auto p-2">
                      {searchResults.length ? (
                        searchResults.map((target) => (
                          <button
                            key={target.route}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => openSearchTarget(target)}
                            className="flex w-full items-center justify-between rounded-[14px] border border-white/10 px-3 py-2.5 text-left transition hover:bg-white/10"
                          >
                            <div>
                              <div className="text-sm font-semibold text-white">{target.label}</div>
                              <div className="text-[11px] text-slate-200/80">{target.helper}</div>
                            </div>
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                              Open
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-[14px] border border-dashed border-white/15 px-3 py-4 text-sm text-slate-200/80">
                          No page found. Try keywords like <span className="font-semibold text-white">housekeeping</span>,
                          <span className="font-semibold text-white"> booking</span>, <span className="font-semibold text-white">accounts</span>.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
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

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.62fr)_minmax(280px,0.68fr)]">
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

              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[1700px] space-y-3">
                  {stayOverview.map((day) => {
                    const isExpanded = selectedDate === day.date;

                    return (
                      <div
                        key={`inline-${day.date}`}
                        className={`overflow-hidden rounded-[20px] border shadow-sm transition ${
                          isExpanded
                            ? "border-cyan-300 bg-cyan-50/40 shadow-[0_14px_30px_rgba(8,145,178,0.12)]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleBoardDay(day.date)}
                          className="grid w-full grid-cols-[150px_minmax(230px,1.25fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)] text-left"
                        >
                          <div
                            className={`flex items-center justify-between gap-3 border-r px-4 py-4 text-sm font-bold ${
                              isExpanded
                                ? "border-cyan-200 bg-cyan-100/80 text-cyan-900"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span>{formatDateLabel(day.date)}</span>
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white text-slate-500 shadow-sm transition-transform duration-500 ease-out ${
                                isExpanded ? "rotate-180 border-cyan-200 text-cyan-700" : "rotate-0 border-slate-200"
                              }`}
                            >
                              <FaChevronDown className="text-xs" />
                            </span>
                          </div>

                          {boardOrder.map((key) => (
                            <div
                              key={`inline-${day.date}-${key}`}
                              className={`border-r px-3 py-3 text-center text-sm last:border-r-0 ${
                                isExpanded ? "border-cyan-200 bg-cyan-50/40" : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="font-bold text-slate-900">{BOARD_BUCKET_META[key].label}</div>
                              <div className={`mt-1 text-xs ${isExpanded ? "text-cyan-700" : "text-slate-500"}`}>
                                {day.board[key].length} rooms
                              </div>
                            </div>
                          ))}
                        </button>

                        <div
                          style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                          className="grid transition-[grid-template-rows] duration-500 ease-out"
                        >
                          <div
                            className={`overflow-hidden transition-all duration-500 ease-out ${
                              isExpanded ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2"
                            }`}
                          >
                            {renderExpandedBoard(day)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="hidden mt-5 overflow-x-auto">
                <div className="min-w-[1700px] space-y-3">
                  <div className="grid grid-cols-[150px_minmax(230px,1.25fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)] overflow-hidden rounded-[22px] border border-slate-200">
                    <div className="border-r border-slate-200 bg-slate-100 px-4 py-4 text-sm font-bold text-slate-700">
                      {selectedBoardDay ? formatDateLabel(selectedBoardDay.date) : "Selected Date"}
                    </div>
                    {boardOrder.map((key) => {
                      const meta = BOARD_BUCKET_META[key];
                      const items = selectedDaySnapshot[key] || [];
                      const isOpen = bucketOpen[key] !== false;
                      return (
                        <div key={key} className="border-r border-slate-200 bg-white last:border-r-0">
                          <div className={`h-1.5 w-full ${meta.bar}`} />
                          <div className="flex h-[320px] flex-col px-3 py-3">
                            <button
                              type="button"
                              onClick={() => toggleBucket(key)}
                              className="flex items-center justify-between gap-2 text-left"
                            >
                              <div className="text-sm font-bold text-slate-900">
                                {meta.label} ({items.length})
                              </div>
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-transform duration-500 ease-out ${
                                  isOpen ? "rotate-180" : "rotate-0"
                                }`}
                              >
                                <FaChevronDown className="text-xs transition-transform duration-500 ease-out" />
                              </span>
                            </button>

                            <div
                              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                              className="mt-3 grid min-h-0 flex-1 transition-[grid-template-rows] duration-500 ease-out"
                            >
                              <div
                                className={`min-h-0 overflow-hidden transition-all duration-500 ease-out ${
                                  isOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                                }`}
                              >
                                {key === "available" ? (
                                  <div className="max-h-[270px] space-y-3 overflow-y-auto pr-1">
                                    {availableRoomGroups.length ? (
                                      availableRoomGroups.map((group) => {
                                        const typeKey = `${selectedBoardDay?.date || "today"}-available-${group.label}`;
                                        const isTypeOpen = availableTypeOpen === typeKey;

                                        return (
                                          <div key={group.label} className="relative w-full overflow-visible">
                                            <span className="absolute -right-1 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-black text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.18)]">
                                              {group.items.length}
                                            </span>
                                            <div className="overflow-hidden rounded-[18px] border border-emerald-200 bg-white shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
                                            <button
                                              type="button"
                                              onClick={() => toggleAvailableType(typeKey)}
                                              className="flex w-full items-center justify-between gap-3 border-b border-emerald-100 px-3 py-3 text-left"
                                            >
                                              <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-[0.12em] text-emerald-900">
                                                  {group.label}
                                                </div>
                                                <div className="mt-1 text-[11px] font-medium text-emerald-700">
                                                  {group.items.length} room(s) available
                                                </div>
                                              </div>
                                              <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm transition-transform duration-500 ease-out ${
                                                  isTypeOpen ? "rotate-180" : "rotate-0"
                                                }`}
                                              >
                                                <FaChevronDown className="text-xs" />
                                              </span>
                                            </button>

                                            <div
                                              style={{ gridTemplateRows: isTypeOpen ? "1fr" : "0fr" }}
                                              className="grid transition-[grid-template-rows] duration-500 ease-out"
                                            >
                                              <div
                                                className={`overflow-hidden px-3 pb-3 transition-all duration-500 ease-out ${
                                                  isTypeOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                                                }`}
                                              >
                                                <div className="space-y-2 pt-2">
                                                  {group.items.length ? (
                                                    group.items.map((item) => (
                                                      <button
                                                        type="button"
                                                        key={item.id}
                                                        onClick={() => openRoomPreview(item)}
                                                        className="w-full rounded-[14px] border border-emerald-200 bg-emerald-50/70 px-2.5 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                                      >
                                                        {item.statusLabel ? (
                                                          <div className="mb-1 flex justify-end">
                                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                                              {item.statusLabel}
                                                            </span>
                                                          </div>
                                                        ) : null}
                                                        <div className="font-black text-emerald-900">Room {item.roomNumber}</div>
                                                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                                          ID {item.roomId || "--"}
                                                        </div>
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="rounded-[14px] border border-dashed border-emerald-200 bg-white px-3 py-4 text-center text-xs text-emerald-500">
                                                      No rooms
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="rounded-[16px] border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                                        No rooms
                                      </div>
                                    )}
                                  </div>
                                ) : key === "confirmed" ? (
                                  <div className="max-h-[270px] space-y-3 overflow-y-auto pr-1">
                                    {confirmedRoomGroups.length ? (
                                      confirmedRoomGroups.map((group) => {
                                        const typeKey = `${selectedBoardDay?.date || "today"}-confirmed-${group.label}`;
                                        const isTypeOpen = availableTypeOpen === typeKey;

                                        return (
                                          <div key={group.label} className="relative w-full overflow-visible">
                                            <span className="absolute -right-1 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-[11px] font-black text-orange-700 shadow-[0_8px_20px_rgba(249,115,22,0.18)]">
                                              {group.items.length}
                                            </span>
                                            <div className="overflow-hidden rounded-[18px] border border-orange-200 bg-white shadow-[0_10px_24px_rgba(249,115,22,0.08)]">
                                            <button
                                              type="button"
                                              onClick={() => toggleAvailableType(typeKey)}
                                              className="flex w-full items-center justify-between gap-3 border-b border-orange-100 px-3 py-3 text-left"
                                            >
                                              <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-[0.12em] text-orange-900">
                                                  {group.label}
                                                </div>
                                                <div className="mt-1 text-[11px] font-medium text-orange-700">
                                                  {group.items.length} room(s) confirmed
                                                </div>
                                              </div>
                                              <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600 shadow-sm transition-transform duration-500 ease-out ${
                                                  isTypeOpen ? "rotate-180" : "rotate-0"
                                                }`}
                                              >
                                                <FaChevronDown className="text-xs" />
                                              </span>
                                            </button>

                                            <div
                                              style={{ gridTemplateRows: isTypeOpen ? "1fr" : "0fr" }}
                                              className="grid transition-[grid-template-rows] duration-500 ease-out"
                                            >
                                              <div
                                                className={`overflow-hidden px-3 pb-3 transition-all duration-500 ease-out ${
                                                  isTypeOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                                                }`}
                                              >
                                                <div className="space-y-2 pt-2">
                                                  {group.items.length ? (
                                                    group.items.map((item) => (
                                                      <button
                                                        type="button"
                                                        key={item.id}
                                                        onClick={() => openRoomPreview(item)}
                                                        className="w-full rounded-[14px] border border-orange-200 bg-orange-50/70 px-2.5 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                                      >
                                                        {item.statusLabel ? (
                                                          <div className="mb-1 flex justify-end">
                                                            <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-700">
                                                              {item.statusLabel}
                                                            </span>
                                                          </div>
                                                        ) : null}
                                                        <div className="font-black text-orange-900">
                                                          {item.booking?.guestName || `Room ${item.roomNumber}`}
                                                        </div>
                                                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700">
                                                          Room {item.roomNumber} | ID {item.roomId || "--"}
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-orange-800">
                                                          {item.booking?.mobile || item.subtitle || "Confirmed booking"}
                                                        </div>
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="rounded-[14px] border border-dashed border-orange-200 bg-white px-3 py-4 text-center text-xs text-orange-500">
                                                      No rooms
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="rounded-[16px] border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                                        No rooms
                                      </div>
                                    )}
                                  </div>
                                ) : key === "cleaning" ? (
                                  <div className="max-h-[270px] space-y-3 overflow-y-auto pr-1">
                                    {cleaningRoomGroups.length ? (
                                      cleaningRoomGroups.map((group) => {
                                        const typeKey = `${selectedBoardDay?.date || "today"}-cleaning-${group.label}`;
                                        const isTypeOpen = availableTypeOpen === typeKey;

                                        return (
                                          <div key={group.label} className="relative w-full overflow-visible">
                                            <span className="absolute -right-1 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-[11px] font-black text-violet-700 shadow-[0_8px_20px_rgba(124,58,237,0.18)]">
                                              {group.items.length}
                                            </span>
                                            <div className="overflow-hidden rounded-[18px] border border-violet-200 bg-white shadow-[0_10px_24px_rgba(124,58,237,0.08)]">
                                            <button
                                              type="button"
                                              onClick={() => toggleAvailableType(typeKey)}
                                              className="flex w-full items-center justify-between gap-3 border-b border-violet-100 px-3 py-3 text-left"
                                            >
                                              <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-[0.12em] text-violet-900">
                                                  {group.label}
                                                </div>
                                                <div className="mt-1 text-[11px] font-medium text-violet-700">
                                                  {group.items.length} room(s) cleaning
                                                </div>
                                              </div>
                                              <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-600 shadow-sm transition-transform duration-500 ease-out ${
                                                  isTypeOpen ? "rotate-180" : "rotate-0"
                                                }`}
                                              >
                                                <FaChevronDown className="text-xs" />
                                              </span>
                                            </button>

                                            <div
                                              style={{ gridTemplateRows: isTypeOpen ? "1fr" : "0fr" }}
                                              className="grid transition-[grid-template-rows] duration-500 ease-out"
                                            >
                                              <div
                                                className={`overflow-hidden px-3 pb-3 transition-all duration-500 ease-out ${
                                                  isTypeOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                                                }`}
                                              >
                                                <div className="space-y-2 pt-2">
                                                  {group.items.length ? (
                                                    group.items.map((item) => (
                                                      <button
                                                        type="button"
                                                        key={item.id}
                                                        onClick={() => openRoomPreview(item)}
                                                        className="w-full rounded-[14px] border border-violet-200 bg-violet-50/70 px-2.5 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                                      >
                                                        {item.statusLabel ? (
                                                          <div className="mb-1 flex justify-end">
                                                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">
                                                              {item.statusLabel}
                                                            </span>
                                                          </div>
                                                        ) : null}
                                                        <div className="font-black text-violet-900">Room {item.roomNumber}</div>
                                                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">
                                                          ID {item.roomId || "--"}
                                                        </div>
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="rounded-[14px] border border-dashed border-violet-200 bg-white px-3 py-4 text-center text-xs text-violet-500">
                                                      No rooms
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="rounded-[16px] border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                                        No rooms
                                      </div>
                                    )}
                                  </div>
                                ) : key === "pencil" ? (
                                  <div className="max-h-[270px] space-y-3 overflow-y-auto pr-1">
                                    {pencilRoomGroups.length ? (
                                      pencilRoomGroups.map((group) => {
                                        const typeKey = `${selectedBoardDay?.date || "today"}-pencil-${group.label}`;
                                        const isTypeOpen = availableTypeOpen === typeKey;

                                        return (
                                          <div key={group.label} className="relative w-full overflow-visible">
                                            <span className="absolute -right-1 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-[11px] font-black text-amber-700 shadow-[0_8px_20px_rgba(245,158,11,0.18)]">
                                              {group.items.length}
                                            </span>
                                            <div className="overflow-hidden rounded-[18px] border border-amber-200 bg-white shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
                                            <button
                                              type="button"
                                              onClick={() => toggleAvailableType(typeKey)}
                                              className="flex w-full items-center justify-between gap-3 border-b border-amber-100 px-3 py-3 text-left"
                                            >
                                              <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-[0.12em] text-amber-900">
                                                  {group.label}
                                                </div>
                                                <div className="mt-1 text-[11px] font-medium text-amber-700">
                                                  {group.items.length} room(s) pencil
                                                </div>
                                              </div>
                                              <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 shadow-sm transition-transform duration-500 ease-out ${
                                                  isTypeOpen ? "rotate-180" : "rotate-0"
                                                }`}
                                              >
                                                <FaChevronDown className="text-xs" />
                                              </span>
                                            </button>

                                            <div
                                              style={{ gridTemplateRows: isTypeOpen ? "1fr" : "0fr" }}
                                              className="grid transition-[grid-template-rows] duration-500 ease-out"
                                            >
                                              <div
                                                className={`overflow-hidden px-3 pb-3 transition-all duration-500 ease-out ${
                                                  isTypeOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                                                }`}
                                              >
                                                <div className="space-y-2 pt-2">
                                                  {group.items.length ? (
                                                    group.items.map((item) => (
                                                      <button
                                                        type="button"
                                                        key={item.id}
                                                        onClick={() => openRoomPreview(item)}
                                                        className="w-full rounded-[14px] border border-amber-200 bg-amber-50/70 px-2.5 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                                      >
                                                        {item.statusLabel ? (
                                                          <div className="mb-1 flex justify-end">
                                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                                              {item.statusLabel}
                                                            </span>
                                                          </div>
                                                        ) : null}
                                                        <div className="font-black text-amber-900">
                                                          {item.booking?.guestName || `Room ${item.roomNumber}`}
                                                        </div>
                                                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                                          Room {item.roomNumber} | ID {item.roomId || "--"}
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-amber-800">
                                                          {item.booking?.mobile || item.statusLabel || "Awaiting confirmation"}
                                                        </div>
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="rounded-[14px] border border-dashed border-amber-200 bg-white px-3 py-4 text-center text-xs text-amber-500">
                                                      No rooms
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="rounded-[16px] border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                                        No rooms
                                      </div>
                                    )}
                                  </div>
                                ) : key === "blocked" ? (
                                  <div className="max-h-[270px] space-y-3 overflow-y-auto pr-1">
                                    {blockedRoomGroups.length ? (
                                      blockedRoomGroups.map((group) => {
                                        const typeKey = `${selectedBoardDay?.date || "today"}-blocked-${group.label}`;
                                        const isTypeOpen = availableTypeOpen === typeKey;

                                        return (
                                          <div key={group.label} className="relative w-full overflow-visible">
                                            <span className="absolute -right-1 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-black text-slate-700 shadow-[0_8px_20px_rgba(71,85,105,0.18)]">
                                              {group.items.length}
                                            </span>
                                            <div className="overflow-hidden rounded-[18px] border border-slate-300 bg-white shadow-[0_10px_24px_rgba(71,85,105,0.08)]">
                                            <button
                                              type="button"
                                              onClick={() => toggleAvailableType(typeKey)}
                                              className="flex w-full items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 text-left"
                                            >
                                              <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">
                                                  {group.label}
                                                </div>
                                                <div className="mt-1 text-[11px] font-medium text-slate-600">
                                                  {group.items.length} blocked room(s)
                                                </div>
                                              </div>
                                              <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-transform duration-500 ease-out ${
                                                  isTypeOpen ? "rotate-180" : "rotate-0"
                                                }`}
                                              >
                                                <FaChevronDown className="text-xs" />
                                              </span>
                                            </button>

                                            <div
                                              style={{ gridTemplateRows: isTypeOpen ? "1fr" : "0fr" }}
                                              className="grid transition-[grid-template-rows] duration-500 ease-out"
                                            >
                                              <div
                                                className={`overflow-hidden px-3 pb-3 transition-all duration-500 ease-out ${
                                                  isTypeOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                                                }`}
                                              >
                                                <div className="space-y-2 pt-2">
                                                  {group.items.length ? (
                                                    group.items.map((item) => (
                                                      <button
                                                        type="button"
                                                        key={item.id}
                                                        onClick={() => openRoomPreview(item)}
                                                        className="w-full rounded-[14px] border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                                      >
                                                        {item.statusLabel ? (
                                                          <div className="mb-1 flex justify-end">
                                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                                                              {item.statusLabel}
                                                            </span>
                                                          </div>
                                                        ) : null}
                                                        <div className="font-black text-slate-900">Room {item.roomNumber}</div>
                                                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                                          ID {item.roomId || "--"}
                                                        </div>
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="rounded-[14px] border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
                                                      No rooms
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="rounded-[16px] border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                                        No rooms
                                      </div>
                                    )}
                                  </div>
                                ) : key === "checked_in" ? (
                                  <div className="max-h-[270px] space-y-3 overflow-y-auto pr-1">
                                    {checkedInRoomGroups.length ? (
                                      checkedInRoomGroups.map((group) => {
                                        const typeKey = `${selectedBoardDay?.date || "today"}-checked-in-${group.label}`;
                                        const isTypeOpen = availableTypeOpen === typeKey;

                                        return (
                                          <div key={group.label} className="relative w-full overflow-visible">
                                            <span className="absolute -right-1 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-black text-sky-700 shadow-[0_8px_20px_rgba(14,165,233,0.18)]">
                                              {group.items.length}
                                            </span>
                                            <div className="overflow-hidden rounded-[18px] border border-sky-200 bg-white shadow-[0_10px_24px_rgba(14,165,233,0.08)]">
                                            <button
                                              type="button"
                                              onClick={() => toggleAvailableType(typeKey)}
                                              className="flex w-full items-center justify-between gap-3 border-b border-sky-100 px-3 py-3 text-left"
                                            >
                                              <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-[0.12em] text-sky-900">
                                                  {group.label}
                                                </div>
                                                <div className="mt-1 text-[11px] font-medium text-sky-700">
                                                  {group.items.length} room(s) checked in
                                                </div>
                                              </div>
                                              <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 shadow-sm transition-transform duration-500 ease-out ${
                                                  isTypeOpen ? "rotate-180" : "rotate-0"
                                                }`}
                                              >
                                                <FaChevronDown className="text-xs" />
                                              </span>
                                            </button>

                                            <div
                                              style={{ gridTemplateRows: isTypeOpen ? "1fr" : "0fr" }}
                                              className="grid transition-[grid-template-rows] duration-500 ease-out"
                                            >
                                              <div
                                                className={`overflow-hidden px-3 pb-3 transition-all duration-500 ease-out ${
                                                  isTypeOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
                                                }`}
                                              >
                                                <div className="space-y-2 pt-2">
                                                  {group.items.length ? (
                                                    group.items.map((item) => (
                                                      <button
                                                        type="button"
                                                        key={item.id}
                                                        onClick={() => openRoomPreview(item)}
                                                        className="w-full rounded-[14px] border border-sky-200 bg-sky-50/70 px-2.5 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                                      >
                                                        {item.statusLabel ? (
                                                          <div className="mb-1 flex justify-end">
                                                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                                              {item.statusLabel}
                                                            </span>
                                                          </div>
                                                        ) : null}
                                                        <div className="font-black text-sky-900">Room {item.roomNumber}</div>
                                                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                                          ID {item.roomId || "--"}
                                                        </div>
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="rounded-[14px] border border-dashed border-sky-200 bg-white px-3 py-4 text-center text-xs text-sky-500">
                                                      No rooms
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="rounded-[16px] border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                                        No rooms
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {items.length ? (
                                      items.slice(0, 6).map((item) => (
                                        <button
                                          type="button"
                                          key={item.id}
                                          onClick={() => openRoomPreview(item)}
                                          className={`w-full rounded-[16px] border px-3 py-2 text-left text-xs shadow-sm ${meta.soft}`}
                                        >
                                          {item.statusLabel ? (
                                            <div className="mb-1 flex justify-end">
                                              <span className="rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                                {item.statusLabel}
                                              </span>
                                            </div>
                                          ) : null}
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
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {stayOverview.slice(1).map((day) => {
                    const isExpanded = selectedDate === day.date;

                    return (
                      <button
                        type="button"
                        key={day.date}
                        onClick={() => toggleBoardDay(day.date)}
                        className={`grid w-full grid-cols-[150px_minmax(230px,1.25fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)] overflow-hidden rounded-[18px] border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                          isExpanded
                            ? "border-cyan-300 bg-cyan-50/70 shadow-[0_14px_30px_rgba(8,145,178,0.12)]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-between gap-3 border-r px-4 py-3 text-sm font-bold ${
                            isExpanded
                              ? "border-cyan-200 bg-cyan-100/70 text-cyan-900"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span>{formatDateLabel(day.date)}</span>
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white text-slate-500 shadow-sm transition-transform duration-500 ease-out ${
                              isExpanded ? "rotate-180 border-cyan-200 text-cyan-700" : "rotate-0 border-slate-200"
                            }`}
                          >
                            <FaChevronDown className="text-xs" />
                          </span>
                        </div>
                        {boardOrder.map((key) => (
                          <div
                            key={`${day.date}-${key}`}
                            className={`border-r px-3 py-3 text-center text-sm last:border-r-0 ${
                              isExpanded ? "border-cyan-200" : "border-slate-200"
                            }`}
                          >
                            <div className="font-bold text-slate-900">{BOARD_BUCKET_META[key].label}</div>
                            <div className={`mt-1 text-xs ${isExpanded ? "text-cyan-700" : "text-slate-500"}`}>
                              {day.board[key].length} rooms
                            </div>
                          </div>
                        ))}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                  <button
                    type="button"
                    onClick={() => jumpBoardWindow(addDays(boardStartDate, -1))}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-cyan-700"
                  >
                    Previous
                  </button>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700">
                    <FaCalendarAlt className="text-cyan-600" />
                    <input
                      type="date"
                      value={boardStartDate}
                      onChange={(event) => jumpBoardWindow(event.target.value)}
                      className="bg-transparent outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpBoardWindow(addDays(boardStartDate, 1))}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-cyan-700"
                  >
                    Next
                  </button>
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Selected date: {formatDateLabel(selectedDate)}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-500">
                      Notifications
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">Messages and updates</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationOpen(true)}
                    className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <FaBell />
                    {dashboardNotifications.length}
                  </button>
                </div>

                <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
                  {dashboardNotifications.length ? (
                    dashboardNotifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => item.route && navigate(item.route)}
                        className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">{item.message}</div>
                          </div>
                          <div className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {new Date(item.createdAt || Date.now()).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No notifications yet. Booking, cleaning aur messages yahan show honge.
                    </div>
                  )}
                </div>
              </div>

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
                    onClick={() => loadDashboardData(true)}
                    className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:text-slate-900"
                  >
                    <FaSyncAlt className={refreshingDashboard ? "animate-spin" : ""} />
                  </button>
                </div>
                <div className="space-y-3">
                  {quickActions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() =>
                          navigate(
                            item.route,
                            item.route === "/hotel/guest"
                              ? { state: { resetBookingDraft: true } }
                              : item.route === "/housekeeping" && item.label === "Cleaning Log"
                                ? { state: { openOption: "cleaning-log" } }
                                : undefined,
                          )
                        }
                        className="relative flex w-full items-center justify-between overflow-visible rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        {item.label === "Cleaning Log" ? (
                          <span className="absolute -right-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-black text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.18)]">
                            {selectedDaySnapshot.cleaning.length}
                          </span>
                        ) : null}
                        <div className="flex items-center gap-3">
                          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r ${item.tone} text-white`}>
                            <Icon />
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                            <div className="text-xs text-slate-500">{item.helper}</div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-700">
                              {item.detail}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900">{item.liveValue}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {item.liveLabel}
                          </div>
                        </div>
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
                  {actionableAlerts.map((item) => (
                    <div
                      key={item.key}
                      className={`rounded-[18px] border px-4 py-3 ${item.tone}`}
                    >
                      <div className="flex items-start gap-3">
                        <FaExclamationTriangle className={`mt-0.5 ${item.iconClass}`} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                          <div className="text-xs text-slate-600">{item.detail}</div>
                        </div>
                      </div>
                    </div>
                  ))}
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
              <div className="min-h-[290px] min-w-0 rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-300">
                  Room Mix
                </p>
                <div className="mb-3 mt-1 text-[1.05rem] font-bold text-slate-900">Occupancy overview</div>
                <RoomOccupancyChart />
              </div>

              <div className="flex min-h-[230px] min-w-0 items-center rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <FoodSalesChart />
              </div>
            </div>
          </div>

        </div>
      </div>

      {notificationOpen ? (
        <div
          className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          onClick={() => setNotificationOpen(false)}
        >
          <div
            className="mt-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,#fbfdff_0%,#f6f9ff_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-600">Notification Center</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">All messages</h3>
              </div>
              <button
                type="button"
                onClick={() => setNotificationOpen(false)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900"
              >
                <FaTimes />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5 sm:p-6">
              {dashboardNotifications.length ? (
                dashboardNotifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.route) navigate(item.route);
                      setNotificationOpen(false);
                    }}
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{item.message}</div>
                      </div>
                      <div className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {new Date(item.createdAt || Date.now()).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Abhi koi notification nahi hai.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

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
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  Room {selectedRoom.roomNumber || selectedRoom.roomNo || "--"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedRoom.roomType || "Room Type"} | Room No {selectedRoom.roomNumber || selectedRoom.roomNo || "--"}
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
                    <span className="font-semibold text-slate-900">{selectedRoom.roomId || selectedRoom.roomData?.id || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Guest Name</span>
                    <span className="font-semibold text-slate-900">{selectedRoom.booking?.guestName || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Contact</span>
                    <span className="font-semibold text-slate-900">
                      {getBookingContact(selectedRoom.booking) || selectedRoom.booking?.mobile || "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Company</span>
                    <span className="font-semibold text-slate-900">{selectedRoom.booking?.company || "--"}</span>
                  </div>
                  {String(selectedRoom.roomData?.hotelStatus || selectedRoom.roomData?.status || "").toLowerCase().includes("block") ? (
                    <>
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <span>Block Reason</span>
                        <span className="font-semibold text-slate-900">{selectedRoom.roomData?.blockReason || "--"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <span>Block Dates</span>
                        <span className="font-semibold text-slate-900">
                          {selectedRoom.roomData?.blockFrom || "--"} to {selectedRoom.roomData?.blockTo || "--"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <span>Blocked By</span>
                        <span className="font-semibold text-slate-900">{selectedRoom.roomData?.blockedBy || "Front Desk"}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {(String(selectedRoom.roomData?.status || "").toLowerCase().includes("clean") ||
                String(selectedRoom.roomData?.housekeepingLabel || "").toLowerCase().includes("dirty")) && (
                <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Cleaning Task</div>
                      <div className="text-xs text-slate-500">
                        Housekeeper assign karein aur estimated cleaning time set karein.
                      </div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                      {selectedRoom.roomData?.assignee && selectedRoom.roomData?.assignee !== "No Housekeeper"
                        ? `Assigned: ${selectedRoom.roomData.assignee}`
                        : "Unassigned"}
                    </div>
                  </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Assign Housekeeper
                      </span>
                      <select
                        value={selectedAssignee}
                        onChange={(e) => setSelectedAssignee(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                      >
                        <option value="">Select housekeeper</option>
                        {housekeepers.length ? (
                          housekeepers.map((name, index) => (
                            <option key={`${name}-${index}`} value={name}>
                              {name}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No housekeeping users found
                          </option>
                        )}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Cleaning Time
                      </span>
                      <select
                        value={selectedCleaningMinutes}
                        onChange={(e) => setSelectedCleaningMinutes(Number(e.target.value) || 30)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                      >
                        {CLEANING_TIME_OPTIONS.map((mins) => (
                          <option key={mins} value={mins}>
                            {mins} minutes
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleAssignCleaning}
                      disabled={assigningCleaning}
                      className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {assigningCleaning ? "Saving..." : "Assign Cleaning"}
                    </button>
                    <div className="rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm text-slate-700">
                      ETA: <span className="font-semibold text-slate-900">{selectedCleaningMinutes} min</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {selectedRoom.booking?.bookingId && !String(selectedRoom.booking.bookingId).startsWith("room-") ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleBookingLifecycle(isRoomInStay(selectedRoom.booking) ? "check-out" : "check-in")
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    {isRoomInStay(selectedRoom.booking)
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
                  onClick={() =>
                    navigate("/stayover", {
                      state: {
                        startDate: selectedRoom.booking?.checkIn || selectedDate,
                        focusRoomNumber: selectedRoom.roomNumber,
                      },
                    })
                  }
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Stay Overview
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate("/hotel/edit-booking", {
                      state: {
                        bookingId: selectedRoom.booking?.bookingId,
                        bookingCode: selectedRoom.booking?.bookingCode,
                        focusRoomNo: selectedRoom.roomNumber,
                      },
                    })
                  }
                  className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  Extend Booking
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate("/hotel/guest", {
                      state: {
                        roomNumber: selectedRoom.roomNumber,
                        category: selectedRoom.roomData?.categoryName,
                        resetBookingDraft: true,
                      },
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Book / Update Room
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleBlockedRoom(
                      String(selectedRoom.roomData?.hotelStatus || selectedRoom.roomData?.status || "").toLowerCase().includes("block")
                        ? "unblock"
                        : "block",
                    )
                  }
                  className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {String(selectedRoom.roomData?.hotelStatus || selectedRoom.roomData?.status || "").toLowerCase().includes("block")
                    ? "Unblock Room"
                    : "Block Room"}
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
