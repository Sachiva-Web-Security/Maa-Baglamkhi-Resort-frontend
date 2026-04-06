// src/components/Hotel/Room.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import API from "../../api";
import { expandBookings } from "../Dashboard/stayoverUtils";
import BookingCancelAction from "./BookingCancelAction";
import {
  getBookingDraft,
  getStoredBookingCode,
  getStoredBookingId,
  setBookingDraft,
  setStoredBookingId,
} from "./bookingSession";

// ─── Default categories (used as fallback if API is slow) ─────────────────────
const DEFAULT_ROOMS = [
  { id: 1, name: "AC ROOM",           defaultPrice: 2000, unitLabel: "PER NIGHT" },
  { id: 2, name: "NON-AC ROOM",       defaultPrice: 1500, unitLabel: "PER NIGHT" },
  { id: 3, name: "DELUXE ROOM",       defaultPrice: 3000, unitLabel: "PER NIGHT" },
  { id: 4, name: "SUPER DELUXE ROOM", defaultPrice: 4000, unitLabel: "PER NIGHT" },
  { id: 5, name: "SUITE ROOM",        defaultPrice: 5000, unitLabel: "PER NIGHT" },
  { id: 6, name: "DELUXE DORMITORY",  defaultPrice: 800,  unitLabel: "PER BED"   },
];

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";
const pickerButtonCls =
  "w-full rounded-2xl border border-cyan-200 bg-[linear-gradient(135deg,#f8fdff_0%,#eefaff_100%)] px-4 py-3 text-left text-sm text-slate-900 shadow-[0_10px_24px_rgba(6,182,212,0.08)] outline-none transition hover:border-cyan-300 hover:shadow-[0_14px_30px_rgba(6,182,212,0.14)] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const formatPriceText = (price, unitLabel) => `Rs ${price} ${unitLabel}`;
const ROOM_LIST_PAGE_SIZE = 8;

// ─── Room status helpers ───────────────────────────────────────────────────────
// Returns "blocked" | "occupied" | "booked" | "available"
// Priority: blocked > occupied > booked (active booking) > available

const getRoomAvailabilityState = (
  roomNo,
  bookedRoomNumbers,    // Set — rooms from active bookings (room_tariff)
  blockedRoomNumbers,   // Set — rooms blocked for maintenance
  inventoryStatusMap,   // Map roomNumber → status string from hotel_room_inventory
) => {
  const key = String(roomNo || "").trim().toLowerCase();
  if (!key) return "available";

  // 1. Check maintenance block (highest priority)
  if (blockedRoomNumbers.has(key)) return "blocked";

  // 2. Check inventory operational status
  const inventoryStatus = String(
    inventoryStatusMap.get(key) || "",
  ).toLowerCase();

  if (inventoryStatus.includes("blocked") || inventoryStatus.includes("out of service"))
    return "blocked";
  if (inventoryStatus.includes("occupied"))
    return "occupied";

  // 3. Check active bookings
  if (bookedRoomNumbers.has(key)) return "booked";

  return "available";
};

// Badge UI per state
const AVAILABILITY_BADGE = {
  blocked: {
    label:    "Blocked",
    classes:  "bg-red-100 text-red-500",
    pill:     "border-red-200 bg-red-50 text-red-700",
    disabled: true,
  },
  occupied: {
    label:    "Occupied",
    classes:  "bg-pink-200 text-pink-500",
    pill:     "border-pink-200 bg-pink-50 text-pink-700",
    disabled: true,
  },
  booked: {
    label:    "Booked",
    classes:  "bg-white/90 text-[#5676d8]",
    pill:     "border-[#7187cf] bg-[#6d82c7] text-white shadow-[0_10px_24px_rgba(109,130,199,0.18)]",
    disabled: true,
  },
  available: {
    label:    "Available",
    classes:  "bg-green-200 text-green-500",
    pill:     "border-slate-200 bg-slate-50 text-slate-700",
    disabled: false,
  },
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Room = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const bookingId   = location.state?.bookingId   || getStoredBookingId();
  const bookingCode = location.state?.bookingCode || getStoredBookingCode();
  const bookingRef  = bookingCode || bookingId;

  const [roomCatalog,    setRoomCatalog]    = useState(DEFAULT_ROOMS);
  const roomDraft = getBookingDraft("room") || {};

  const [activeRoom,     setActiveRoom]     = useState(roomDraft.activeRoom ?? null);
  const [selectedRooms,  setSelectedRooms]  = useState(roomDraft.selectedRooms || {});
  const [roomOptions,    setRoomOptions]    = useState(roomDraft.roomOptions   || {});
  const [inputValue,     setInputValue]     = useState(roomDraft.inputValue    || {});
  const [priceInputs,    setPriceInputs]    = useState(roomDraft.priceInputs   || {});
  const [pickerValues,   setPickerValues]   = useState(roomDraft.pickerValues  || {});
  const [openPickers,    setOpenPickers]    = useState({});
  const [roomListPages,  setRoomListPages]  = useState(roomDraft.roomListPages || {});
  const [notice,         setNotice]         = useState({
    open: false,
    title: "",
    message: "",
    tone: "info",
  });

  // BUG FIX: separate state for all three unavailability sources
  const [activeBookings,       setActiveBookings]       = useState([]);
  const [inventoryStatusMap,   setInventoryStatusMap]   = useState(new Map()); // roomNumber → status
  const [blockedRoomNumbers,   setBlockedRoomNumbers]   = useState(new Set()); // from hotel_room_blocks

  useEffect(() => {
    if (bookingId) setStoredBookingId(bookingId);
  }, [bookingId]);

  // ─── Load active bookings (to detect rooms in confirmed/checked-in bookings) ──
  useEffect(() => {
    let cancelled = false;

    const loadActiveBookings = async () => {
      try {
        const response = await API.get("/hotel/all-bookings");
        const rows = expandBookings(response.data);

        const next = rows.filter((booking) => {
          const status = String(booking.bookingStatus || "").toLowerCase();
          const isCurrent = bookingId &&
            String(booking.bookingId) === String(bookingId);
          const isClosed  = status.includes("check out")  ||
                            status.includes("checked out") ||
                            status.includes("cancel");
          return !isCurrent && !isClosed;
        });

        if (!cancelled) setActiveBookings(next);
      } catch (err) {
        console.error("Failed to load active bookings", err);
      }
    };

    loadActiveBookings();
    const intervalId = window.setInterval(loadActiveBookings, 15_000);
    window.addEventListener("focus", loadActiveBookings);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadActiveBookings);
    };
  }, [bookingId]);

  // ─── BUG FIX: Load active maintenance blocks ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadBlocks = async () => {
      try {
        const response = await API.get("/hotel/room-blocks?status=Active");
        const blocks = Array.isArray(response.data) ? response.data : [];
        if (!cancelled) {
          setBlockedRoomNumbers(
            new Set(
              blocks.map((b) => String(b.room_number || "").trim().toLowerCase()),
            ),
          );
        }
      } catch (err) {
        // Non-fatal — if route not yet deployed, ignore
        console.warn("Room blocks fetch skipped:", err.message);
      }
    };

    loadBlocks();
    return () => { cancelled = true; };
  }, []);

  // ─── Load room setup from inventory (with status fix) ─────────────────────────
  useEffect(() => {
    const loadRoomSetup = async () => {
      try {
        const response   = await API.get("/hotel/rooms/setup");
        const setupRows  = Array.isArray(response.data) ? response.data : [];

        // Update catalog prices from backend
        setRoomCatalog((prev) =>
          prev.map((room) => {
            const backendCat = setupRows.find(
              (item) =>
                Number(item.id) === Number(room.id) || item.name === room.name,
            );
            return backendCat
              ? {
                  ...room,
                  defaultPrice: Number(backendCat.defaultPrice || room.defaultPrice),
                  unitLabel:    backendCat.unitLabel || room.unitLabel,
                }
              : room;
          }),
        );

        const mappedOptions = {};
        const mappedPrices  = {};

        // BUG FIX: build inventoryStatusMap from roomDetails
        const statusMap = new Map();

        setupRows.forEach((category) => {
          mappedOptions[category.id] = Array.isArray(category.rooms)
            ? category.rooms
            : [];
          mappedPrices[category.id] = String(
            Number(category.defaultPrice || 0),
          );

          // roomDetails is the new field from fixed getRoomSetup
          if (Array.isArray(category.roomDetails)) {
            category.roomDetails.forEach((rd) => {
              if (rd.roomNumber) {
                statusMap.set(
                  String(rd.roomNumber).trim().toLowerCase(),
                  rd.status || "Available",
                );
              }
            });
          } else {
            // Fallback: if backend not yet updated, use basic rooms list
            (category.rooms || []).forEach((rn) => {
              statusMap.set(String(rn).trim().toLowerCase(), "Available");
            });
          }
        });

        setRoomOptions((prev) => ({ ...mappedOptions, ...prev }));
        setPriceInputs((prev) => ({ ...mappedPrices,  ...prev }));
        setInventoryStatusMap(statusMap);
      } catch (err) {
        console.error("Failed to load room setup", err);
        showNotice("Unable to load room setup right now. Please try again.", "Setup Error", "error");
      }
    };

    loadRoomSetup();
  }, []);

  // Persist draft on every change
  useEffect(() => {
    setBookingDraft("room", {
      activeRoom,
      selectedRooms,
      roomOptions,
      inputValue,
      priceInputs,
      pickerValues,
      roomListPages,
      roomTypeMap: roomCatalog.reduce((acc, room) => {
        acc[String(room.id)] = room.name;
        return acc;
      }, {}),
      roomCatalog,
    });
  }, [activeRoom, selectedRooms, roomOptions, inputValue, priceInputs, pickerValues, roomListPages, roomCatalog]);

  // ─── Derived sets ──────────────────────────────────────────────────────────────
  // Set of rooms with active bookings (from room_tariff via getAllBookings)
  const bookedRoomNumbers = useMemo(() => {
    const locked = new Set();
    activeBookings.forEach((booking) => {
      if (booking.roomNumber) {
        locked.add(String(booking.roomNumber).trim().toLowerCase());
      }
    });
    return locked;
  }, [activeBookings]);

  const selectedRoomCount = useMemo(
    () =>
      Object.values(selectedRooms).reduce(
        (sum, rooms) => sum + rooms.length, 0,
      ),
    [selectedRooms],
  );

  // ─── Availability helpers ──────────────────────────────────────────────────────
  const getRoomState = useCallback(
    (roomNo) =>
      getRoomAvailabilityState(
        roomNo,
        bookedRoomNumbers,
        blockedRoomNumbers,
        inventoryStatusMap,
      ),
    [bookedRoomNumbers, blockedRoomNumbers, inventoryStatusMap],
  );

  // A room is "unavailable" if it's blocked, occupied, or already booked
  const isRoomUnavailable = useCallback(
    (roomNo) => getRoomState(roomNo) !== "available",
    [getRoomState],
  );

  const getAvailableRoomsForType = (roomId) =>
    (roomOptions[roomId] || []).filter((item) => !isRoomUnavailable(item));

  const showNotice = useCallback((message, title = "Notice", tone = "info") => {
    setNotice({
      open: true,
      title,
      message,
      tone,
    });
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleAvailability = (index) => {
    setActiveRoom(activeRoom === index ? null : index);
  };

  const normalize = (val) => val.trim().toLowerCase();

  const findExistingRoom = (value) => {
    for (const [roomId, options] of Object.entries(roomOptions)) {
      if (options.some((item) => normalize(item) === normalize(value))) {
        const roomName = roomCatalog.find(
          (room) => room.id === Number(roomId),
        )?.name;
        return roomName;
      }
    }
    return null;
  };

  const handleAddOption = async (roomId) => {
    const value = (inputValue[roomId] || "").trim();
    if (!value) return;

    const roomState = getRoomState(value);
    if (roomState === "blocked") {
      showNotice(`Room ${value} is blocked for maintenance and cannot be booked.`, "Room Unavailable", "error");
      return;
    }
    if (roomState === "occupied" || roomState === "booked") {
      showNotice(`Room ${value} is already booked. It can be selected again after checkout.`, "Room Unavailable", "error");
      return;
    }

    const existingRoom = findExistingRoom(value);
    if (existingRoom) {
      showNotice(`Room ${value} already exists in ${existingRoom}.`, "Duplicate Room", "warning");
      return;
    }

    try {
      await API.post("/hotel/rooms", { categoryId: roomId, roomNumber: value });
      setRoomOptions((prev) => {
        const nextRooms = [...(prev[roomId] || []), value];
        const totalPages = Math.max(1, Math.ceil(nextRooms.length / ROOM_LIST_PAGE_SIZE));
        setRoomListPages((current) => ({ ...current, [roomId]: totalPages }));
        return {
          ...prev,
          [roomId]: nextRooms,
        };
      });
      setInputValue((prev) => ({ ...prev, [roomId]: "" }));
    } catch (err) {
      console.error(err);
      showNotice(err.response?.data?.message || "Unable to add the room right now.", "Add Room Failed", "error");
    }
  };

  const handlePriceSave = async (roomId) => {
    try {
      await API.put(`/hotel/rooms/category/${roomId}/price`, {
        defaultPrice: priceInputs[roomId],
      });
      setRoomCatalog((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? { ...room, defaultPrice: Number(priceInputs[roomId] || 0) }
            : room,
        ),
      );
    } catch (err) {
      console.error(err);
      showNotice(err.response?.data?.message || "Unable to update the room price right now.", "Price Update Failed", "error");
    }
  };

  const handleSelect = (roomId, value) => {
    const roomState = getRoomState(value);
    if (roomState === "blocked") {
      showNotice(`Room ${value} is blocked for maintenance.`, "Room Unavailable", "error");
      return;
    }
    if (roomState === "occupied" || roomState === "booked") {
      showNotice(`Room ${value} is already booked.`, "Room Unavailable", "error");
      return;
    }

    setSelectedRooms((prev) => {
      const current = prev[roomId] || [];
      const isCurrentlySelected = current.includes(value);

      if (!isCurrentlySelected) {
        const existingSelection = Object.entries(prev).find(
          ([existingRoomId, values]) =>
            Number(existingRoomId) !== Number(roomId) &&
            values.includes(value),
        );
        if (existingSelection) {
          const roomTypeName =
            roomCatalog.find(
              (room) => Number(room.id) === Number(existingSelection[0]),
            )?.name || `Type ${existingSelection[0]}`;
          showNotice(`Room ${value} is already selected in ${roomTypeName}.`, "Already Selected", "warning");
          return prev;
        }
      }

      const updated = current.includes(value)
        ? current.filter((rv) => rv !== value)
        : [...current, value];

      return { ...prev, [roomId]: updated };
    });
  };

  const handleProceed = () => {
    if (!Object.values(selectedRooms).some((rooms) => rooms.length > 0)) {
      showNotice("Please select at least one room before proceeding.", "Selection Required", "warning");
      return;
    }

    const roomTypeMap = roomCatalog.reduce((acc, room) => {
      acc[String(room.id)] = room.name;
      return acc;
    }, {});

    navigate("/hotel/pax", {
      state: {
        bookingId,
        bookingCode,
        roomOptions,
        selectedRooms,
        roomTypeMap,
        roomCatalog,
      },
    });
  };

  const handlePickAvailableRoom = (roomId, value) => {
    if (!value) return;
    handleSelect(roomId, value);
    setPickerValues((prev) => ({ ...prev, [roomId]: "" }));
    setOpenPickers((prev) => ({ ...prev, [roomId]: false }));
  };

  // ─── Summary bar stats ─────────────────────────────────────────────────────────
  const allRoomNumbers = useMemo(() => {
    return Object.values(roomOptions).flat();
  }, [roomOptions]);

  const availableCount = useMemo(
    () => allRoomNumbers.filter((rn) => getRoomState(rn) === "available").length,
    [allRoomNumbers, getRoomState],
  );
  const blockedCount = useMemo(
    () => allRoomNumbers.filter((rn) => ["blocked", "occupied"].includes(getRoomState(rn))).length,
    [allRoomNumbers, getRoomState],
  );

  // ─── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(135deg,#f4fbff_0%,#f8fff9_42%,#fffaf1_100%)] p-4 sm:p-6">
      <div className="w-full space-y-6">

        {/* Header */}
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#08253d_0%,#0e5b6a_48%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,500px)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                Room Selection
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Pick available rooms for this booking
              </h1>
            </div>

            <div className="grid grid-cols-3 gap-4 lg:gap-5">
              <div className="min-w-0 rounded-[20px] border border-white/15 bg-white/10 px-4 py-5 text-center backdrop-blur">
                <div className="text-[12px] uppercase tracking-[0.16em] text-cyan-100/80">Booking ID</div>
                <div className="mt-3 text-2xl font-black leading-none">{bookingRef || "—"}</div>
              </div>
              <div className="min-w-0 rounded-[20px] border border-white/15 bg-emerald-900/40 px-4 py-5 text-center backdrop-blur">
                <div className="text-[12px] uppercase tracking-[0.16em] text-emerald-200">Available</div>
                <div className="mt-3 text-2xl font-black leading-none text-emerald-100">{availableCount}</div>
              </div>
              <div className="min-w-0 rounded-[20px] border border-rose-400/30 bg-rose-900/30 px-4 py-5 text-center backdrop-blur">
                <div className="text-[12px] uppercase tracking-[0.16em] text-rose-200">Unavailable</div>
                <div className="mt-3 text-2xl font-black leading-none text-rose-100">{blockedCount}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 rounded-[18px] border border-white/70 bg-white/80 px-5 py-3 text-xs font-semibold shadow-sm backdrop-blur">
          <span className="text-black-400  text-xl font-bold  self-center">Legend:</span>
          {Object.entries(AVAILABILITY_BADGE).map(([state, meta]) => (
            <span
              key={state}
              className={`rounded-full px-3 py-1 text-[18px] font-bold ${meta.classes}`}
            >
              {meta.label}
            </span>
          ))}
        </div>

        {/* Room category cards */}
        <section className="rounded-[26px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="space-y-5">
            {roomCatalog.map((room, index) => (
              <div
                key={room.id}
                className="overflow-hidden rounded-[28px] border border-sky-100/90 bg-[linear-gradient(135deg,#8cc5e3_0%,#90cbe6_58%,#8fd0e7_100%)] p-5 shadow-[0_24px_55px_rgba(143,208,231,0.16)]"
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-[28px] font-black tracking-[0.01em] text-slate-950">{room.name}</h3>
                        <span className="rounded-full border border-white/45 bg-white/28 px-3 py-1 text-sm font-black text-sky-700 backdrop-blur-sm">
                          {selectedRooms[room.id]?.length || 0} selected
                        </span>
                        <span className="rounded-full border border-white/45 bg-white/28 px-3 py-1 text-sm font-black text-slate-700 backdrop-blur-sm">
                          {formatPriceText(room.defaultPrice, room.unitLabel)}
                        </span>
                      </div>
                      <p className="max-w-3xl text-[15px] font-semibold leading-7 text-slate-900/85">
                        Set the room price first, then open availability to select, review, and add room numbers from one place.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAvailability(index)}
                      className="inline-flex items-center justify-center rounded-[20px] bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(245,158,11,0.24)] transition hover:-translate-y-0.5"
                    >
                      {activeRoom === index ? "Hide Rooms" : "Check Availability"}
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[24px] border border-white/45 bg-white/18 p-4 backdrop-blur-sm">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[22px] border border-white/45 bg-white/26 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
                          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-800/70">
                            Total Rooms
                          </div>
                          <div className="mt-3 text-[32px] font-black leading-none text-slate-950">
                            {(roomOptions[room.id] || []).length}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-800/80">
                            Room inventory
                          </div>
                        </div>
                        <div className="rounded-[22px] border border-white/45 bg-white/26 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
                          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-800/70">
                            Available
                          </div>
                          <div className="mt-3 text-[32px] font-black leading-none text-slate-950">
                            {getAvailableRoomsForType(room.id).length}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-800/80">
                            Ready to assign
                          </div>
                        </div>
                        <div className="rounded-[22px] border border-white/45 bg-white/26 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
                          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-800/70">
                            Selected
                          </div>
                          <div className="mt-3 text-[32px] font-black leading-none text-slate-950">
                            {selectedRooms[room.id]?.length || 0}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-800/80">
                            Chosen for booking
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Expanded availability panel */}
                {activeRoom === index && (
                  <div className="mt-1 rounded-[22px] border border-sky-100/90 bg-[linear-gradient(135deg,#8cc5e3_0%,#90cbe6_58%,#8fd0e7_100%)] p-5 shadow-[0_22px_48px_rgba(143,208,231,0.18)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[18px] font-black uppercase tracking-[0.24em] text-slate-950">
                          Room Availability

                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-900/85">
                          {getAvailableRoomsForType(room.id).length} room(s) ready for booking
                        </div>
                      </div>
                      <span className="rounded-full border border-white/45 bg-white/28 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-900">
                        {room.name}
                      </span>
                    </div>

                    {/* Quick-pick available rooms dropdown */}
                    <div className="grid gap-3 xl:max-w-[720px] xl:grid-cols-[minmax(0,1fr)_150px_118px] xl:items-stretch">                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenPickers((prev) => ({ ...prev, [room.id]: !prev[room.id] }))
                          }
                          className={`${pickerButtonCls} h-[52px] overflow-hidden border-slate-200/80 bg-white shadow-none hover:border-cyan-300`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                             
                              <div className="truncate text-xl font-semibold text-slate-900">
                                {pickerValues[room.id] || "Select room"}
                              </div>
                            </div>
                            <span className="shrink-0 text-xl text-cyan-700">
                              {openPickers[room.id] ? "▲" : "▼"}
                            </span>
                          </div>
                        </button>

                        {openPickers[room.id] ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 overflow-hidden rounded-[22px] border border-cyan-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
                            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Select available room
                              </div>
                              <div className="mt-1 text-sm text-slate-600">
                                {getAvailableRoomsForType(room.id).length} room(s) ready to assign
                              </div>
                            </div>

                            {getAvailableRoomsForType(room.id).length ? (
                              <div className="max-h-64 overflow-y-auto p-2">
                                {getAvailableRoomsForType(room.id).map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => {
                                      setPickerValues((prev) => ({ ...prev, [room.id]: item }));
                                      handlePickAvailableRoom(room.id, item);
                                    }}
                                    className="flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left transition hover:bg-cyan-50"
                                  >
                                    <div>
                                      <div className="text-base font-black text-slate-900">{item}</div>
                                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Ready for booking
                                      </div>
                                    </div>
                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                                      Available
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="px-4 py-5 text-sm font-semibold text-slate-500">
                                No available room in this type
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <input
                          value={inputValue[room.id] || ""}
                          onChange={(e) =>
                            setInputValue((prev) => ({
                              ...prev,
                              [room.id]: e.target.value,
                            }))
                          }
                          placeholder="Room no."
                          className="h-[55px] w-full rounded-3xl border border-black-200/80 bg-white px-4 py-3 text-xl text-black-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddOption(room.id)}
                        className="inline-flex min-w-[144px] text-[15px] items-center justify-center rounded-3xl bg-[#3b82f6] px-5 text-[14px] font-bold tracking-[0.01em] text-white shadow-[0_10px_22px_rgba(59,130,246,0.22)] transition hover:bg-[#2563eb]"
                      >
                        Add Room
                      </button>
                    </div>

                    {/* Room checkbox grid — BUG FIX: proper state-based badge */}
                    <div className="mt-5 rounded-[22px] border border-white/45 bg-white/22 p-4 backdrop-blur-sm">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="text-[18px] font-black uppercase tracking-[0.24em] text-slate-950">
                            Room List
                          </div>
                          <div className="mt-2 text-base font-semibold text-slate-900/85">
                            Overall room inventory for this category with price setup.
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[minmax(0,170px)_140px]">
                          <div className="rounded-[18px] border border-white/45 bg-white/24 p-3">
                            <div className="text-[14px] font-black uppercase tracking-[0.22em] text-slate-950">
                              Price Setup
                            </div>
                            <div className="mt-2">
                              <input
                                type="number"
                                min="0"
                                value={priceInputs[room.id] ?? room.defaultPrice}
                                onChange={(e) =>
                                  setPriceInputs((prev) => ({
                                    ...prev,
                                    [room.id]: e.target.value,
                                  }))
                                }
                                className={`${fieldCls} py-2.5`}
                                placeholder="Enter price"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePriceSave(room.id)}
                            className="inline-flex h-[54px] items-center justify-center rounded-[18px] bg-sky-500 px-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(14,165,233,0.18)] transition hover:bg-sky-600"
                          >
                            Save Price
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const rooms = roomOptions[room.id] || [];
                        const totalPages = Math.max(1, Math.ceil(rooms.length / ROOM_LIST_PAGE_SIZE));
                        const currentPage = Math.min(roomListPages[room.id] || 1, totalPages);
                        const startIndex = (currentPage - 1) * ROOM_LIST_PAGE_SIZE;
                        const visibleRooms = rooms.slice(startIndex, startIndex + ROOM_LIST_PAGE_SIZE);
                        const showingFrom = rooms.length ? startIndex + 1 : 0;
                        const showingTo = Math.min(startIndex + visibleRooms.length, rooms.length);

                        return (
                          <>
                            <div className="mt-4 flex flex-wrap gap-3">
                              {visibleRooms.map((item) => {
                                const roomState = getRoomState(item);
                                const meta = AVAILABILITY_BADGE[roomState];
                                const isSelected = selectedRooms[room.id]?.includes(item);
                                const isLocked = meta.disabled;

                                return (
                                  <label
                                    key={item}
                                    className={`flex cursor-pointer items-center gap-2.5 rounded-full border px-5 py-3 text-[15px] font-bold transition
                                      ${isLocked ? "cursor-not-allowed opacity-70" : "hover:border-sky-300"}
                                      ${isSelected ? "border-sky-200 bg-sky-50 text-sky-700" : meta.pill}
                                    `}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected || false}
                                      disabled={isLocked}
                                      onChange={() => handleSelect(room.id, item)}
                                      className="h-4 w-4"
                                    />
                                    {item}
                                    <span
                                      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${meta.classes}`}
                                    >
                                      {meta.label}
                                    </span>
                                  </label>
                                );
                              })}

                              {!rooms.length && (
                                <p className="text-sm italic text-slate-400">
                          No rooms added yet — add room number above.
                                </p>
                              )}
                            </div>

                            {rooms.length > ROOM_LIST_PAGE_SIZE && (
                              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  Showing {showingFrom}-{showingTo} of {rooms.length} rooms
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRoomListPages((prev) => ({
                                        ...prev,
                                        [room.id]: Math.max(1, currentPage - 1),
                                      }))
                                    }
                                    disabled={currentPage === 1}
                                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Prev
                                  </button>
                                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                                    Page {currentPage} / {totalPages}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRoomListPages((prev) => ({
                                        ...prev,
                                        [room.id]: Math.min(totalPages, currentPage + 1),
                                      }))
                                    }
                                    disabled={currentPage === totalPages}
                                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/hotel/company")}
              className="rounded-[22px] border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Go Back
            </button>

            <BookingCancelAction
              bookingId={bookingId}
              bookingCode={bookingCode}
              buttonClassName="sm:min-w-[170px]"
            />

            <button
              type="button"
              onClick={handleProceed}
              className="rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
            >
              Save & Proceed
            </button>
          </div>
        </section>

        {notice.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                    notice.tone === "error"
                      ? "bg-rose-50 text-rose-600"
                      : notice.tone === "warning"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-sky-50 text-sky-600"
                  }`}
                >
                  !
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black text-slate-900">{notice.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{notice.message}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setNotice((prev) => ({
                      ...prev,
                      open: false,
                    }))
                  }
                  className="inline-flex min-w-[96px] items-center justify-center rounded-[16px] bg-gradient-to-r from-sky-600 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;
