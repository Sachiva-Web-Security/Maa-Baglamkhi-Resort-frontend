import React, { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBed,
  FaBroom,
  FaCalendarAlt,
  FaChevronUp,
  FaDoorOpen,
  FaEdit,
  FaExclamationCircle,
  FaHotel,
  FaPlus,
  FaTimes,
} from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

import API from "../../api";
import EditBooking from "../Hotel/EditBooking";
import { pushDashboardNotification } from "./dashboardNotifications";
import {
  addDays,
  buildStaySummary,
  BOARD_BUCKET_META,
  expandBookings,
  formatCurrency,
  formatDateKey,
  formatHeaderDate,
  formatShortDate,
  getBookingContact,
  getRoomBookingReference,
  getBookingTimelineStatus,
  getRoomBookingForDate,
  mergeBookingsWithRooms,
  normalizeRooms,
  roomSort,
  STATUS_META,
  todayISO,
} from "./stayoverUtils";
import {
  getCleaningTasks,
  removeCleaningTask,
  upsertCleaningTask,
} from "../Hotel/bookingSession";

const getHousekeepingUsers = (users) =>
  (Array.isArray(users) ? users : [])
    .filter((user) => String(user.role || "").toLowerCase().includes("housekeeping"))
    .map((user) => user.name)
    .filter(Boolean);

const normalizeStaffName = (value) =>
  String(value || "")
    .replace(/\s*\((busy|available)\)\s*$/i, "")
    .trim()
    .toLowerCase();

const Stayover = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const today = todayISO();
  const initialStartDate = location.state?.startDate || today;
  const [selectedDate, setSelectedDate] = useState(initialStartDate);
  const [dateWindowStart, setDateWindowStart] = useState(initialStartDate);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingRecords, setBookingRecords] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [dropdownRoom, setDropdownRoom] = useState(null); 
  const [expandedDay, setExpandedDay] = useState(selectedDate);
  const [expandedBucket, setExpandedBucket] = useState(null);
  const [editBookingModal, setEditBookingModal] = useState(null);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedCleaningMinutes, setSelectedCleaningMinutes] = useState(30);
  const [assigningCleaning, setAssigningCleaning] = useState(false);
  const [cleaningTaskStamp, setCleaningTaskStamp] = useState(0);
// format: `${room.id}-${date}`
  const loadData = React.useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [bookingResponse, roomResponse, usersResponse] = await Promise.all([
        API.get("/hotel/all-bookings"),
        API.get("/housekeeping"),
        API.get("/users"),
      ]);
      setBookingRecords(Array.isArray(bookingResponse.data) ? bookingResponse.data : []);
      setBookings(expandBookings(bookingResponse.data));
      setRooms(normalizeRooms(roomResponse.data));
      setHousekeepers(getHousekeepingUsers(usersResponse.data));
      setError("");
      setHasLoadedOnce(true);
    } catch (err) {
      console.error(err);
      setError("Stay overview load nahi ho paaya.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleFocus = () => {
      loadData(true);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData(true);
      }
    };

    const intervalId = window.setInterval(() => {
      loadData(true);
    }, 30000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [loadData]);

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

          removeCleaningTask(roomKey);
          setCleaningTaskStamp((value) => value + 1);
          changed = true;
        }
      }

      if (!mounted) return;

      if (changed) {
        await loadData(true);
      }
    };

    syncExpiredCleaningTasks();
    const timer = window.setInterval(syncExpiredCleaningTasks, 60000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [loadData]);

  useEffect(() => {
    if (!location.state?.startDate) return;
    const nextDate = location.state.startDate;
    setSelectedDate(nextDate);
    setDateWindowStart(nextDate);
    setExpandedDay(nextDate);
  }, [location.state?.startDate]);

  const mergedBookings = useMemo(() => mergeBookingsWithRooms(bookings, rooms), [bookings, rooms]);
  const visibleDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(dateWindowStart, index)),
    [dateWindowStart],
  );

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((left, right) => {
        const categoryOrder = String(left.categoryName || "").localeCompare(String(right.categoryName || ""));
        return categoryOrder || roomSort(left.roomNumber, right.roomNumber);
      }),
    [rooms],
  );

  useEffect(() => {
    setExpandedDay(selectedDate);
  }, [selectedDate]);

  const shiftDateWindow = (days) => {
    const nextStart = addDays(dateWindowStart, days);
    setDateWindowStart(nextStart);
    setSelectedDate(nextStart);
    setExpandedDay(nextStart);
  };

  const staySummary = useMemo(
    () => buildStaySummary(rooms, mergedBookings, dateWindowStart, 7, today),
    [mergedBookings, rooms, dateWindowStart, today],
  );

  useEffect(() => {
    const currentDay = staySummary.find((day) => day.date === expandedDay);
    const firstOpenBucket = Object.entries(currentDay?.board || {}).find(([, items]) => Array.isArray(items) && items.length > 0)?.[0];
    setExpandedBucket(firstOpenBucket ? `${expandedDay}:${firstOpenBucket}` : null);
  }, [expandedDay, staySummary]);



useEffect(() => {
  const closeDropdown = () => setDropdownRoom(null);
  window.addEventListener("click", closeDropdown);
  return () => window.removeEventListener("click", closeDropdown);
}, []);


  const dailySummary = useMemo(
    () =>
      staySummary.map((day) => ({
        date: day.date,
        available: day.availableCount,
        occupied: day.checkedInCount,
        arrivals: day.arrivals.length,
        departures: day.departures.length,
      })),
    [staySummary],
  );

  const upcomingBookings = useMemo(
    () =>
      [...mergedBookings]
        .filter((booking) => booking.checkIn)
        .sort((left, right) => left.checkIn.localeCompare(right.checkIn))
        .slice(0, 8),
    [mergedBookings],
  );

  const activeBookingRecords = useMemo(
    () =>
      [...bookingRecords].sort((left, right) =>
        String(right.bookingId || "").localeCompare(String(left.bookingId || ""), undefined, { numeric: true }),
      ),
    [bookingRecords],
  );

  const activeCleaningTasks = useMemo(() => {
    const tasks = getCleaningTasks();
    return Object.entries(tasks)
      .map(([roomKey, task]) => ({
        roomKey,
        ...task,
      }))
      .filter((task) => task?.assignee || task?.dueAt || task?.minutes);
  }, [loading, refreshing, hasLoadedOnce, cleaningTaskStamp]);

  const busyHousekeepers = useMemo(() => {
    const busy = new Set();
    activeCleaningTasks.forEach((task) => {
      if (task?.assignee) {
        busy.add(normalizeStaffName(task.assignee));
      }
    });
    return busy;
  }, [activeCleaningTasks]);

  const currentCleaningTask = useMemo(() => {
    if (!selectedRoom) return null;
    const candidateKeys = new Set(
      [
        selectedRoom.roomData?.id,
        selectedRoom.roomData?.roomId,
        selectedRoom.roomId,
        selectedRoom.roomNumber,
        selectedRoom.booking?.roomId,
        selectedRoom.booking?.roomNumber,
      ]
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
        .map((value) => String(value).trim()),
    );

    return (
      activeCleaningTasks.find((task) => {
        const taskKeys = [task?.roomId, task?.roomKey, task?.roomNumber]
          .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
          .map((value) => String(value).trim());
        return taskKeys.some((key) => candidateKeys.has(key));
      }) || null
    );
  }, [activeCleaningTasks, selectedRoom]);

  const selectedAssigneeBusy = useMemo(() => {
    const activeAssignee = currentCleaningTask?.assignee || selectedRoom?.roomData?.assignee || "";
    const normalizedActiveAssignee = normalizeStaffName(activeAssignee);
    const normalizedSelected = normalizeStaffName(selectedAssignee);
    const roomUnderCleaning = Boolean(currentCleaningTask || selectedRoom?.roomData?.status === "cleaning");

    if (!roomUnderCleaning) {
      return busyHousekeepers.has(normalizedSelected);
    }

    if (!normalizedSelected) {
      return true;
    }

    return (
      busyHousekeepers.has(normalizedSelected) ||
      normalizedSelected === normalizedActiveAssignee ||
      normalizedSelected === normalizeStaffName(selectedRoom?.roomData?.assignee)
    );
  }, [busyHousekeepers, currentCleaningTask, selectedAssignee, selectedRoom]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Occupied / Reserved",
        value: rooms.filter((room) => ["occupied", "reserved", "check_in_confirmed"].includes(room.status)).length,
        helper: "Current booked inventory",
        icon: FaBed,
        tone: "from-sky-600 to-cyan-500",
      },
      {
        label: "Available Rooms",
        value: rooms.filter((room) => room.status === "available").length,
        helper: "Ready for booking",
        icon: FaHotel,
        tone: "from-emerald-600 to-lime-500",
      },
      {
        label: "Cleaning Queue",
        value: rooms.filter((room) => room.status === "cleaning").length,
        helper: "Housekeeping pending",
        icon: FaBroom,
        tone: "from-violet-600 to-fuchsia-500",
      },
    ],
    [rooms],
  );

  const handleRoomStatus = async (room, status) => {
    try {
      const housekeepingStatus = status === "available" ? "Vacant Clean" : "Vacant Dirty";
      await API.put(`/housekeeping/status/${room.id}`, { status: housekeepingStatus });
      await loadData(true);
    } catch (err) {
      console.error(err);
      alert("Room status update nahi ho paaya.");
    }
  };

  const normalizeBookingPreview = (booking) => ({
    ...booking,
    bookingId: booking?.bookingId || booking?.id || "",
    bookingCode: booking?.bookingCode || booking?.booking_code || "",
    guestName: booking?.guestName || booking?.guest_name || "Walk-in Guest",
    mobile: getBookingContact(booking) || "-",
    company: booking?.company || booking?.company_name || booking?.companyName || "Direct",
    bookingStatus: booking?.bookingStatus || booking?.booking_status || "",
    checkIn: formatDateKey(booking?.checkIn || booking?.check_in || ""),
    checkOut: formatDateKey(booking?.checkOut || booking?.check_out || ""),
    totalAmount: booking?.totalAmount || 0,
    paidAmount: booking?.paidAmount || 0,
    discountAmount: booking?.discountAmount || 0,
    remainingAmount: booking?.remainingAmount || 0,
  });

  const getCellData = (room, date) => {
    const isHistoricalDate = date < today;
    const booking = getRoomBookingForDate(room.roomNumber, date, mergedBookings, !isHistoricalDate);
    if (room.status === "blocked" && date === today) return { status: "blocked", booking: null };
    if (room.status === "cleaning" && date === today) return { status: "cleaning", booking: null };
    if (isHistoricalDate && !booking) return { status: "no_booking", booking: null };
    return booking
      ? { status: getBookingTimelineStatus(booking, date, today), booking }
      : { status: "available", booking: null };
  };

  const openRoomPreview = (room, booking) => {
    const fallbackBooking =
      booking ||
      getRoomBookingReference(room.roomNumber, selectedDate, mergedBookings);

    setSelectedRoom({
      roomNumber: room.roomNumber,
      roomData: room,
      booking: fallbackBooking ? normalizeBookingPreview(fallbackBooking) : null,
    });
  };

  useEffect(() => {
    if (!selectedRoom) return;

    const roomId = selectedRoom.roomData?.id || selectedRoom.roomId || selectedRoom.roomNumber;
    const assignee = selectedRoom.roomData?.assignee;

    try {
      const tasks = getCleaningTasks();
      const task = tasks[String(roomId)];
      setSelectedAssignee(task?.assignee || (assignee && assignee !== "No Housekeeper" ? assignee : housekeepers[0] || ""));
      setSelectedCleaningMinutes(task?.minutes ? Number(task.minutes) || 30 : 30);
    } catch {
      setSelectedAssignee(assignee && assignee !== "No Housekeeper" ? assignee : housekeepers[0] || "");
      setSelectedCleaningMinutes(30);
    }
  }, [selectedRoom, housekeepers]);

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
      setCleaningTaskStamp((value) => value + 1);
      pushDashboardNotification({
        title: `Cleaning assigned - Room ${selectedRoom.roomNumber}`,
        message: `Assigned to ${selectedAssignee} for ${selectedCleaningMinutes} min`,
        type: "info",
        route: "/housekeeping",
      });
      await loadData(true);
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
      alert("Cleaning assigned.");
    } catch (err) {
      console.error(err);
      alert("Cleaning assign nahi ho paaya.");
    } finally {
      setAssigningCleaning(false);
    }
  };

  const handleMarkClean = async () => {
    const roomId = selectedRoom?.roomData?.id || selectedRoom?.roomId || selectedRoom?.roomNumber;
    if (!roomId) {
      alert("Room record missing hai.");
      return;
    }

    try {
      setAssigningCleaning(true);
      await API.put(`/housekeeping/status/${roomId}`, { status: "Vacant Clean" });
      removeCleaningTask(roomId);
      setCleaningTaskStamp((value) => value + 1);
      await loadData(true);
      setSelectedRoom((prev) =>
        prev
          ? {
              ...prev,
              roomData: {
                ...prev.roomData,
                status: "available",
                housekeepingLabel: "Vacant Clean",
              },
            }
          : prev,
      );
      alert("Room marked clean.");
    } catch (err) {
      console.error(err);
      alert("Mark clean failed.");
    } finally {
      setAssigningCleaning(false);
    }
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
      await loadData(true);
      setSelectedRoom(null);
      alert(action === "check-in" ? "Guest checked in." : "Guest checked out. Room cleaning me chala gaya.");
    } catch (error) {
      console.error(error);
      alert(action === "check-in" ? "Check-in failed" : "Check-out failed");
    }
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
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                Category-wise room inventory with live booking status
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Stayoverview open karte hi aapko room-wise strip milegi, aur main dashboard ka data bhi isi live source se aayega.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <FaDoorOpen />
                  Main Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/stayover")}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_12px_30px_rgba(255,255,255,0.2)] transition hover:-translate-y-0.5"
                >
                  <FaCalendarAlt className="text-sky-600" />
                  Stay Overview
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/hotel/guest", { state: { resetBookingDraft: true } })}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <FaPlus />
                  New Booking
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-[22px] border border-white/12 bg-white/10 p-4 backdrop-blur-md">
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r ${card.tone} text-white`}>
                      <Icon />
                    </div>
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
              <h2 className="mt-2 text-2xl font-black text-slate-900">Room-number stay overview board</h2>
              <p className="mt-2 text-sm text-slate-500">
                Room rows aur next 7 din ki booking strip booking master style me.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => shiftDateWindow(-7)}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-sky-700"
                >
                  <FaArrowLeft />
                  Previous
                </button>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  <FaCalendarAlt className="text-sky-600" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      setSelectedDate(nextDate);
                      setDateWindowStart(nextDate);
                      setExpandedDay(nextDate);
                    }}
                    className="bg-transparent outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => shiftDateWindow(7)}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-sky-700"
                >
                  Next
                  <FaArrowRight />
                </button>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                  7 day pagination
                </div>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                {formatShortDate(dateWindowStart)} - {formatShortDate(addDays(dateWindowStart, 6))}
              </div>
              <button
                type="button"
                onClick={() => navigate("/hotel/guest", { state: { resetBookingDraft: true } })}
                className="rounded-full bg-gradient-to-r from-sky-600 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5"
              >
                Start With Guest
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(STATUS_META).map(([key, value]) => (
              <div key={key} className={`rounded-full px-3 py-1 text-xs font-bold ${value.badge}`}>
                {value.label}
              </div>
            ))}
          </div>

          {loading && !hasLoadedOnce ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-slate-500">
              Stay overview load ho raha hai...
            </div>
          ) : error ? (
            <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-5 text-sm text-rose-700">
              <FaExclamationCircle />
              {error}
            </div>
          ) : (
            <>
              {refreshing ? (
                <div className="mt-4 rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700">
                  Refreshing live booking data...
                </div>
              ) : null}
              <div className="mt-6">
                <div className="min-w-[1260px] overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                  <div className="grid grid-cols-[220px_repeat(7,minmax(0,1fr))]">
                    <div className="sticky left-0 z-30 border-r border-b border-slate-200 bg-slate-700 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
                      Rooms
                    </div>
                    {visibleDates.map((date, index) => (
                      <button
                        type="button"
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setExpandedDay(date);
                        }}
                        className={`relative border-r border-b border-slate-200 px-2 py-2 text-left last:border-r-0 transition hover:opacity-95 ${
                          index === 0
                            ? "bg-gradient-to-b from-orange-500 to-orange-400 text-white"
                            : "bg-gradient-to-b from-slate-100 to-white text-slate-900"
                        }`}
                      >
                        <div
                          className={`rounded-[18px] px-2 py-1.5 ${
                            expandedDay === date ? "bg-white/20 ring-1 ring-white/60" : ""
                          }`}
                        >
                          <div className="pr-10 text-left text-sm font-black leading-tight sm:text-base">
                            {formatHeaderDate(date)}
                          </div>
                        </div>
                        <span
                          className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-black shadow-sm ${
                            expandedDay === date
                              ? "bg-white text-slate-900"
                              : "bg-white/85 text-slate-700"
                          }`}
                        >
                          <FaChevronUp className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    ))}

                    <div className="sticky left-0 z-30 border-r border-b border-slate-200 bg-[#6b8d92] px-4 py-2.5 text-sm font-bold text-white">
                      Total
                    </div>
                    {dailySummary.map((day) => (
                      <div
                        key={day.date}
                        className="border-r border-b border-slate-200 bg-[#86a7aa] px-3 py-2.5 text-center text-white last:border-r-0"
                      >
                        <div className="text-lg font-black">{day.available}</div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">Available</div>
                        <div className="mt-2 text-[11px] text-white/80">
                          {day.occupied} occupied | {day.arrivals} arr | {day.departures} dep
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="max-h-[52vh] overflow-y-auto">
                    <div className="grid grid-cols-[220px_repeat(7,minmax(0,1fr))]">
                      {sortedRooms.map((room) => (
                        <React.Fragment key={room.id}>
                          <div className="sticky left-0 z-20 border-r border-b border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <button type="button" onClick={() => openRoomPreview(room, null)} className="text-left">
                                <div className="text-xl font-black text-slate-900">{room.roomNumber}</div>
                                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                  ID {room.roomId || room.id || "--"}
                                </div>
                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  {room.categoryName || "Uncategorized"}
                                </div>
                                <div
                                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${
                                    STATUS_META[room.status]?.badge || STATUS_META.available.badge
                                  }`}
                                >
                                  {STATUS_META[room.status]?.label || "Available"}
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate("/hotel/room", { state: { editRoomId: room.id } })}
                                className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
                              >
                                <FaEdit />
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {room.status === "cleaning" ? (
                                <button
                                  type="button"
                                  onClick={() => handleRoomStatus(room, "available")}
                                  className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white"
                                >
                                  Mark Clean
                                </button>
                              ) : null}
                              {room.status === "available" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate("/hotel/guest", {
                                      state: {
                                        roomNumber: room.roomNumber,
                                        category: room.categoryName,
                                        resetBookingDraft: true,
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
                            return (
                              <div
                                key={`${room.id}-${date}`}
                                className="relative min-h-[84px] border-r border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbfd_0%,#eef5f8_100%)] p-2 last:border-r-0"
                              >
                                <div className="absolute right-1 top-1 z-40">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const key = `${room.id}-${date}`;
                                      setDropdownRoom(dropdownRoom === key ? null : key);
                                    }}
                                    className="text-gray-600 hover:text-black"
                                  >
                                    <FaBroom />
                                  </button>
                                </div>

                                {dropdownRoom === `${room.id}-${date}` && (
                                  <div
                                    className="absolute right-2 top-8 z-50 w-44 rounded-lg border bg-white p-2 shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {room.status !== "cleaning" && (
                                      <button
                                        onClick={() => {
                                          handleRoomStatus(room, "cleaning");
                                          setDropdownRoom(null);
                                        }}
                                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                      >
                                        Send to Cleaning
                                      </button>
                                    )}

                                    {room.status === "cleaning" && (
                                      <button
                                        onClick={() => {
                                          handleRoomStatus(room, "available");
                                          setDropdownRoom(null);
                                        }}
                                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                      >
                                        Mark Clean
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        openRoomPreview(room, cell.booking);
                                        setDropdownRoom(null);
                                      }}
                                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                    >
                                      View Details
                                    </button>
                                  </div>
                                )}

                                {cell.booking ? (
                                  <button
                                    type="button"
                                    onClick={() => openRoomPreview(room, cell.booking)}
                                    className={`h-full w-full rounded-[16px] border px-3 py-2 text-left shadow-sm ${meta.cell}`}
                                  >
                                    <div className="text-sm font-black uppercase">{cell.booking.guestName}</div>
                                    <div className="mt-1 text-xs font-medium">
                                      Room {room.roomNumber} | {room.categoryName}
                                    </div>
                                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                                      {meta.label}
                                    </div>
                                    <div className="mt-2 text-[11px] font-semibold">
                                      {formatShortDate(cell.booking.checkIn)} to {formatShortDate(cell.booking.checkOut)}
                                    </div>
                                    <div className="mt-1 text-[11px] font-medium opacity-80">
                                      {cell.booking.bookingCode || cell.booking.bookingId || "--"}
                                    </div>
                                    <div className="mt-1 text-[11px] font-medium opacity-80">
                                      {getBookingContact(cell.booking) || "No contact"}
                                    </div>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openRoomPreview(room, null)}
                                    className={`flex h-full w-full items-center justify-center rounded-[16px] border text-xs font-semibold uppercase tracking-[0.16em] ${meta.cell}`}
                                  >
                                    {meta.label}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Showing {sortedRooms.length} rooms in the current 7-day view
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftDateWindow(-7)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Previous 7 Days
                  </button>
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                    {formatShortDate(dateWindowStart)} - {formatShortDate(addDays(dateWindowStart, 6))}
                  </div>
                  <button
                    type="button"
                    onClick={() => shiftDateWindow(7)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Next 7 Days
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="grid gap-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-6">
            <div className="h-[650px] rounded-[28px]  border-slate-200/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl ">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600">Active Booking Data</p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">{formatShortDate(selectedDate)} ke live stays</h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/hotel/all-bookings")}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  View All
                </button>
              </div>
              <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {activeBookingRecords.length ? (
                  activeBookingRecords.map((booking) => {
                    const roomNumber = String(booking.rooms || "").split(",")[0]?.trim() || booking.rooms || "";
                    const room =
                      rooms.find((item) => String(item.roomNumber) === String(roomNumber)) || {
                        roomNumber,
                        categoryName: booking.company_name || "Direct",
                      };

                    return (
                      <button
                        type="button"
                        key={booking.bookingId}
                        onClick={() => openRoomPreview(room, booking)}
                        className="w-full rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_100%)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Booking #{booking.bookingId}
                            </div>
                            <div className="mt-1 text-lg font-black text-slate-900">
                              {booking.guest_name || booking.guestName || "Walk-in Guest"}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              Room {booking.rooms || "Not assigned yet"} | {getBookingContact(booking) || "--"} |{" "}
                              {booking.company_name || booking.company || "Direct"}
                            </div>
                            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {booking.booking_status || "Confirmed"}
                            </div>
                          </div>
                          <div className="rounded-[18px] bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
                            {formatShortDate(booking.check_in || booking.checkIn)} to{" "}
                            {formatShortDate(booking.check_out || booking.checkOut)}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Total Bill
                            <div className="mt-1 text-lg font-black text-slate-900">
                              {formatCurrency(booking.totalAmount)}
                            </div>
                          </div>
                          <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            Paid
                            <div className="mt-1 text-lg font-black text-emerald-900">
                              {formatCurrency(booking.paidAmount)}
                            </div>
                          </div>
                          <div className="rounded-[18px] bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            Remaining
                            <div className="mt-1 text-lg font-black text-amber-900">
                              {formatCurrency(booking.remainingAmount)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                    Backend se abhi koi active booking record nahi mila.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,#f8fdff_0%,#eff8ff_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700 ">Quick Direction</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Front desk shortcuts</h3>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="flex w-full items-center justify-between rounded-[20px] bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5"
                >
                  <span>
                    <span className="block text-sm font-black text-slate-900">Open Main Dashboard</span>
                    <span className="block text-xs text-slate-500">Booking master style overview wapas dekhne ke liye</span>
                  </span>
                  <FaArrowRight className="text-sky-600" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/hotel/room")}
                  className="flex w-full items-center justify-between rounded-[20px] bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5"
                >
                  <span>
                    <span className="block text-sm font-black text-slate-900">Manage Room Inventory</span>
                    <span className="block text-xs text-slate-500">Category wise rooms add aur edit karne ke liye</span>
                  </span>
                  <FaArrowRight className="text-sky-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600">Upcoming Bookings</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Recent booking feed with dates</h3>
              <div className="mt-5 space-y-3">
                {upcomingBookings.length ? (
                  upcomingBookings.map((booking) => (
                    <div
                      key={`feed-${booking.bookingId}-${booking.roomNumber}-${booking.checkIn}`}
                      className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">{booking.guestName}</div>
                          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Room {booking.roomNumber}
                          </div>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-sky-700 shadow-sm">
                          #{booking.bookingId}
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-slate-600">
                        {formatShortDate(booking.checkIn)} to {formatShortDate(booking.checkOut)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Booking feed abhi empty hai.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
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
                  {selectedRoom.roomData?.categoryName || "Room Type"} | ID {selectedRoom.roomData?.roomId || selectedRoom.roomData?.id || "--"}
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
                <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedRoom.roomData?.status || selectedRoom.roomData?.hotelStatus || "Unknown"}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Category</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{selectedRoom.roomData?.categoryName || "--"}</div>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Room ID</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedRoom.roomData?.roomId || selectedRoom.roomData?.id || "--"}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Check-In</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedRoom.booking?.checkIn ? formatShortDate(selectedRoom.booking.checkIn) : "--"}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Check-Out</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedRoom.booking?.checkOut ? formatShortDate(selectedRoom.booking.checkOut) : "--"}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Booking snapshot</div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Room Type</span>
                    <span className="font-semibold text-slate-900">{selectedRoom.roomData?.categoryName || selectedRoom.roomType || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Room ID</span>
                    <span className="font-semibold text-slate-900">{selectedRoom.roomData?.roomId || selectedRoom.roomData?.id || "--"}</span>
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
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Remaining</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(selectedRoom.booking?.remainingAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Cleaning Task</div>
                    <p className="mt-1 text-xs text-slate-600">
                      Housekeeper assign karein aur estimated cleaning time set karein.
                    </p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700 shadow-sm">
                    {currentCleaningTask || selectedRoom.roomData?.status === "cleaning" ? "Busy" : "Available"}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Assign Housekeeper
                    </span>
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      <option value="">Select housekeeper</option>
                      {housekeepers.map((name) => {
                        const isBusy = busyHousekeepers.has(normalizeStaffName(name));
                        return (
                          <option key={name} value={name} disabled={isBusy && selectedAssignee !== name}>
                            {name} {isBusy ? "(Busy)" : "(Available)"}
                          </option>
                        );
                      })}
                    </select>
                    <div className="text-[11px] text-slate-500">
                      Busy housekeeper dobara assign nahi hogi jab tak current task complete na ho.
                    </div>
                    <div className="text-[11px] font-semibold text-violet-700">
                      Current task status: {selectedAssigneeBusy ? "Busy" : "Available"}
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Cleaning Time
                    </span>
                    <select
                      value={selectedCleaningMinutes}
                      onChange={(e) => setSelectedCleaningMinutes(Number(e.target.value) || 30)}
                      className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      {[15, 30, 45, 60, 90, 120].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={selectedRoom.roomData?.status === "cleaning" ? handleMarkClean : handleAssignCleaning}
                    disabled={assigningCleaning}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
                      selectedRoom.roomData?.status === "cleaning"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-violet-600 hover:bg-violet-700"
                    } ${assigningCleaning ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    {assigningCleaning
                      ? "Saving..."
                      : selectedRoom.roomData?.status === "cleaning"
                        ? "Mark Clean"
                        : "Assign Cleaning"}
                  </button>
                  <div className="rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm text-slate-700">
                    ETA: <span className="font-semibold text-slate-900">{selectedCleaningMinutes} min</span>
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
                  onClick={() =>
                    navigate("/hotel/guest", {
                      state: {
                        roomNumber: selectedRoom.roomNumber,
                        category: selectedRoom.roomData?.categoryName,
                        resetBookingDraft: true,
                      },
                    })
                  }
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Create / Update Booking
                </button>
                {selectedRoom.booking?.bookingId && !String(selectedRoom.booking.bookingId).startsWith("room-") ? (
                  <button
                    type="button"
                    onClick={() =>
                      setEditBookingModal({
                        bookingId: selectedRoom.booking.bookingId,
                        bookingCode: selectedRoom.booking.bookingCode,
                        focusRoomNo: selectedRoom.roomNumber,
                      })
                    }
                    className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
                  >
                    Extend Booking
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open Main Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editBookingModal ? (
        <EditBooking
          embedded
          bookingId={editBookingModal.bookingId}
          bookingCode={editBookingModal.bookingCode}
          focusRoomNo={editBookingModal.focusRoomNo}
          onSaved={(savedBooking) => {
            if (savedBooking) {
              setSelectedRoom((current) =>
                current && String(current.booking?.bookingId) === String(savedBooking.bookingId)
                  ? {
                      ...current,
                      booking: {
                        ...current.booking,
                        guestName: savedBooking.guest_name || savedBooking.guestName || current.booking?.guestName,
                        mobile: savedBooking.mobile || current.booking?.mobile,
                        checkIn: savedBooking.checkIn || current.booking?.checkIn,
                        checkOut: savedBooking.checkOut || current.booking?.checkOut,
                        bookingCode: savedBooking.bookingCode || current.booking?.bookingCode,
                      },
                    }
                  : current,
              );
            }
            loadData(true);
          }}
          onClose={() => setEditBookingModal(null)}
        />
      ) : null}
    </div>
  );
};

export default Stayover;
