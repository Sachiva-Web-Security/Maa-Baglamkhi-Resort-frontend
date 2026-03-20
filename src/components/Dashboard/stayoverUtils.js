export const DAY_COUNT = 7;

export const STATUS_META = {
  available: {
    label: "Available",
    cell: "border-emerald-200 bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  occupied: {
    label: "Occupied",
    cell: "border-rose-200 bg-rose-50 text-rose-700",
    badge: "bg-rose-100 text-rose-700",
  },
  reserved: {
    label: "Reserved",
    cell: "border-amber-200 bg-amber-50 text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  check_in_confirmed: {
    label: "Check-In Confirmed",
    cell: "border-sky-200 bg-sky-50 text-sky-700",
    badge: "bg-sky-100 text-sky-700",
  },
  cleaning: {
    label: "Cleaning",
    cell: "border-violet-200 bg-violet-50 text-violet-700",
    badge: "bg-violet-100 text-violet-700",
  },
  blocked: {
    label: "Blocked",
    cell: "border-slate-300 bg-slate-200 text-slate-700",
    badge: "bg-slate-200 text-slate-700",
  },
};

export const BOARD_BUCKET_META = {
  available: {
    label: "Available",
    tone: "border-emerald-300",
    bar: "bg-emerald-500",
    soft: "bg-emerald-50 text-emerald-700",
  },
  confirmed: {
    label: "Confirmed",
    tone: "border-orange-300",
    bar: "bg-orange-500",
    soft: "bg-orange-50 text-orange-700",
  },
  pencil: {
    label: "Pencil",
    tone: "border-amber-300",
    bar: "bg-amber-400",
    soft: "bg-amber-50 text-amber-700",
  },
  blocked: {
    label: "Blocked",
    tone: "border-slate-300",
    bar: "bg-slate-400",
    soft: "bg-slate-100 text-slate-700",
  },
  checked_in: {
    label: "Checked In",
    tone: "border-sky-300",
    bar: "bg-sky-500",
    soft: "bg-sky-50 text-sky-700",
  },
};

export const formatDateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

export const todayISO = () => formatDateKey(new Date());

export const addDays = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const formatDateLabel = (dateString) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  });

export const formatHeaderDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });

export const formatShortDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const roomSort = (left, right) =>
  String(left).localeCompare(String(right), undefined, { numeric: true });

const toRoomList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const normalizeRoomStatus = (room) => {
  const status = String(room.hotelStatus || room.status || "").toLowerCase();
  const housekeepingStatus = String(room.housekeepingLabel || room.status || "").toLowerCase();

  if (status.includes("blocked") || status.includes("out of service")) return "blocked";
  if (status.includes("reserved")) return "reserved";
  if (status.includes("confirmed")) return "check_in_confirmed";
  if (status.includes("occupied")) return "occupied";
  if (status.includes("cleaning") || housekeepingStatus.includes("dirty")) return "cleaning";
  return "available";
};

export const normalizeRooms = (rawRooms) =>
  (Array.isArray(rawRooms) ? rawRooms : []).map((room) => ({
    ...room,
    roomId: room.roomId || room.id || room.roomNo || room.roomNumber,
    roomNumber: room.roomNumber || room.roomNo,
    roomNo: room.roomNo || room.roomNumber,
    categoryName: room.categoryName || room.roomType || "Hotel Room",
    housekeepingLabel: room.status,
    status: normalizeRoomStatus(room),
  }));

export const expandBookings = (rawBookings) =>
  (Array.isArray(rawBookings) ? rawBookings : []).flatMap((booking) =>
    toRoomList(booking.rooms).map((roomNumber) => ({
      bookingId: booking.bookingId,
      guestName: booking.guest_name || booking.guestName || "Walk-in Guest",
      mobile: booking.mobile || "-",
      company: booking.company_name || booking.companyName || "Direct",
      roomNumber,
      roomNo: roomNumber,
      bookingStatus: booking.booking_status || booking.bookingStatus || "",
      checkIn: formatDateKey(booking.check_in || booking.checkIn),
      checkOut: formatDateKey(booking.check_out || booking.checkOut),
      totalAmount: booking.totalAmount || 0,
      remainingAmount: booking.remainingAmount || 0,
    })),
  );

export const mergeBookingsWithRooms = (bookings, rooms) => {
  const seen = new Set(
    bookings.map((booking) => `${booking.roomNumber}-${booking.checkIn}-${booking.checkOut}-${booking.guestName}`),
  );

  const roomDerivedBookings = rooms
    .filter((room) => room.guest || (room.checkIn && room.checkOut))
    .map((room) => ({
      bookingId: `room-${room.id}`,
      guestName: room.guest || "In-house Guest",
      mobile: room.mobile || "-",
      company: room.categoryName || "Direct",
      roomNumber: room.roomNumber,
      roomNo: room.roomNumber,
      bookingStatus: room.hotelStatus || room.status || "Checked In",
      checkIn: formatDateKey(room.checkIn),
      checkOut: formatDateKey(room.checkOut),
      totalAmount: 0,
      remainingAmount: 0,
    }))
    .filter((booking) => {
      const key = `${booking.roomNumber}-${booking.checkIn}-${booking.checkOut}-${booking.guestName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return [...bookings, ...roomDerivedBookings];
};

export const getBookingTimelineStatus = (booking, date, today) => {
  if (!booking.checkIn || !booking.checkOut || date < booking.checkIn || date >= booking.checkOut) {
    return "available";
  }

  if (today < booking.checkIn) return "reserved";
  if (today === booking.checkIn && date === booking.checkIn) return "check_in_confirmed";
  return "occupied";
};

export const getBookingBoardBucket = (booking, date, today) => {
  if (!booking.checkIn || !booking.checkOut || date < booking.checkIn || date >= booking.checkOut) {
    return null;
  }

  const bookingStatus = String(booking.bookingStatus || "").toLowerCase();

  if (bookingStatus.includes("cancel")) return null;
  if (bookingStatus.includes("pencil") || bookingStatus.includes("tentative") || bookingStatus.includes("pending")) {
    return "pencil";
  }
  if (today >= booking.checkIn && today < booking.checkOut) {
    return "checked_in";
  }
  return "confirmed";
};

export const getRoomBookingForDate = (roomNumber, date, mergedBookings) =>
  mergedBookings.find(
    (booking) =>
      String(booking.roomNumber) === String(roomNumber) &&
      date >= booking.checkIn &&
      date < booking.checkOut,
  );

export const getRoomBookingReference = (roomNumber, date, mergedBookings) => {
  const roomBookings = mergedBookings
    .filter((booking) => String(booking.roomNumber) === String(roomNumber))
    .sort((left, right) => {
      const leftStart = left.checkIn || "9999-12-31";
      const rightStart = right.checkIn || "9999-12-31";
      return leftStart.localeCompare(rightStart);
    });

  if (!roomBookings.length) return null;

  const activeBooking = getRoomBookingForDate(roomNumber, date, mergedBookings);
  if (activeBooking) return activeBooking;

  const upcomingBooking = roomBookings.find((booking) => booking.checkIn && booking.checkIn >= date);
  if (upcomingBooking) return upcomingBooking;

  return roomBookings[roomBookings.length - 1];
};

export const buildDailyBoard = (rooms, mergedBookings, date, today) => {
  const buckets = {
    available: [],
    confirmed: [],
    pencil: [],
    blocked: [],
    checked_in: [],
  };

  const blockedRooms = rooms.filter((room) => room.status === "blocked");
  blockedRooms.forEach((room) => {
    buckets.blocked.push({
      id: `blocked-${room.id}`,
      roomId: room.roomId,
      roomNumber: room.roomNumber,
      room: room.roomNumber,
      roomType: room.categoryName,
      title: room.categoryName,
      subtitle: room.housekeepingLabel || "Blocked",
      roomData: room,
    });
  });

  rooms.forEach((room) => {
    if (room.status === "blocked") return;

    const booking = getRoomBookingForDate(room.roomNumber, date, mergedBookings);
    if (!booking) {
      buckets.available.push({
        id: `available-${room.id}`,
        roomId: room.roomId,
        roomNumber: room.roomNumber,
        room: room.roomNumber,
        roomType: room.categoryName,
        title: room.categoryName,
        subtitle: room.status === "cleaning" ? "Cleaning" : "Ready to sell",
        roomData: room,
      });
      return;
    }

    const bucket = getBookingBoardBucket(booking, date, today);
    if (!bucket) return;

    buckets[bucket].push({
      id: `${bucket}-${booking.bookingId}-${room.roomNumber}-${date}`,
      roomId: room.roomId,
      roomNumber: room.roomNumber,
      room: room.roomNumber,
      roomType: room.categoryName,
      title: booking.guestName,
      subtitle: `${booking.mobile} | ${booking.company}`,
      booking,
      roomData: room,
    });
  });

  Object.values(buckets).forEach((items) =>
    items.sort((left, right) => roomSort(left.roomNumber, right.roomNumber)),
  );

  return buckets;
};

export const buildStaySummary = (rooms, mergedBookings, startDate, dayCount = DAY_COUNT, today = todayISO()) =>
  Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(startDate, index);
    const board = buildDailyBoard(rooms, mergedBookings, date, today);
    return {
      date,
      label: formatDateLabel(date),
      availableCount: board.available.length,
      confirmedCount: board.confirmed.length,
      pencilCount: board.pencil.length,
      blockedCount: board.blocked.length,
      checkedInCount: board.checked_in.length,
      board,
      arrivals: mergedBookings.filter((booking) => booking.checkIn === date),
      departures: mergedBookings.filter((booking) => booking.checkOut === date),
    };
  });
