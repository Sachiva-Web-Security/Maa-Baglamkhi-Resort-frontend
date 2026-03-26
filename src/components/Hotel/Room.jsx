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
    classes:  "bg-orange-100 text-orange-700",
    pill:     "border-orange-200 bg-orange-50 text-orange-700",
    disabled: true,
  },
  occupied: {
    label:    "Occupied",
    classes:  "bg-rose-100 text-rose-700",
    pill:     "border-rose-200 bg-rose-50 text-rose-700",
    disabled: true,
  },
  booked: {
    label:    "Booked",
    classes:  "bg-rose-100 text-rose-700",
    pill:     "border-rose-200 bg-rose-50 text-rose-700",
    disabled: true,
  },
  available: {
    label:    "Available",
    classes:  "bg-emerald-100 text-emerald-700",
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
        alert("Room setup load nahi ho paaya.");
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
      roomTypeMap: roomCatalog.reduce((acc, room) => {
        acc[String(room.id)] = room.name;
        return acc;
      }, {}),
      roomCatalog,
    });
  }, [activeRoom, selectedRooms, roomOptions, inputValue, priceInputs, pickerValues, roomCatalog]);

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
      alert(`Room ${value} is blocked for maintenance aur book nahi ho sakta.`);
      return;
    }
    if (roomState === "occupied" || roomState === "booked") {
      alert(`Room ${value} already booked hai. Checkout ke baad hi dobara select hoga.`);
      return;
    }

    const existingRoom = findExistingRoom(value);
    if (existingRoom) {
      alert(`Room already exists in ${existingRoom}`);
      return;
    }

    try {
      await API.post("/hotel/rooms", { categoryId: roomId, roomNumber: value });
      setRoomOptions((prev) => ({
        ...prev,
        [roomId]: [...(prev[roomId] || []), value],
      }));
      setInputValue((prev) => ({ ...prev, [roomId]: "" }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Room add nahi ho paaya");
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
      alert(err.response?.data?.message || "Price update nahi ho paaya");
    }
  };

  const handleSelect = (roomId, value) => {
    const roomState = getRoomState(value);
    if (roomState === "blocked") {
      alert(`Room ${value} maintenance ke liye blocked hai.`);
      return;
    }
    if (roomState === "occupied" || roomState === "booked") {
      alert(`Room ${value} already booked hai.`);
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
          alert(
            `Room ${value} already selected in ${roomTypeName}.`,
          );
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
      alert("Please select at least one room");
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
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4fbff_0%,#f8fff9_42%,#fffaf1_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#08253d_0%,#0e5b6a_48%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                Room Selection
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Pick available rooms for this booking
              </h1>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[20px] border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/75">Booking ID</div>
                <div className="mt-2 text-xl font-black">{bookingRef || "—"}</div>
              </div>
              <div className="rounded-[20px] border border-white/15 bg-emerald-900/40 p-4 text-center backdrop-blur">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">Available</div>
                <div className="mt-2 text-xl font-black text-emerald-100">{availableCount}</div>
              </div>
              <div className="rounded-[20px] border border-rose-400/30 bg-rose-900/30 p-4 text-center backdrop-blur">
                <div className="text-[10px] uppercase tracking-[0.2em] text-rose-200">Unavailable</div>
                <div className="mt-2 text-xl font-black text-rose-100">{blockedCount}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 rounded-[18px] border border-white/70 bg-white/80 px-5 py-3 text-xs font-semibold shadow-sm backdrop-blur">
          <span className="text-slate-400 self-center">Legend:</span>
          {Object.entries(AVAILABILITY_BADGE).map(([state, meta]) => (
            <span
              key={state}
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${meta.classes}`}
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
                className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-black text-slate-900">{room.name}</h3>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700">
                        {selectedRooms[room.id]?.length || 0} selected
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                        {formatPriceText(room.defaultPrice, room.unitLabel)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[180px_140px]">
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
                        className={fieldCls}
                        placeholder="Enter price"
                      />
                      <button
                        type="button"
                        onClick={() => handlePriceSave(room.id)}
                        className="rounded-[20px] bg-sky-500 px-4 py-3 text-sm font-bold text-white"
                      >
                        Save Price
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAvailability(index)}
                    className="rounded-[20px] bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(245,158,11,0.24)] transition hover:-translate-y-0.5"
                  >
                    {activeRoom === index ? "Hide Rooms" : "Check Availability"}
                  </button>
                </div>

                {/* Expanded availability panel */}
                {activeRoom === index && (
                  <div className="mt-5 border-t border-slate-200 pt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Room Availability
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {getAvailableRoomsForType(room.id).length} room(s) ready for booking
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {room.name}
                      </span>
                    </div>

                    {/* Quick-pick available rooms dropdown */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenPickers((prev) => ({ ...prev, [room.id]: !prev[room.id] }))
                          }
                          className={pickerButtonCls}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                                Available room picker
                              </div>
                              <div className="mt-1 text-sm font-bold text-slate-900">
                                {pickerValues[room.id] || "Select available room"}
                              </div>
                            </div>
                            <span className="text-lg text-cyan-700">
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

                      <input
                        value={inputValue[room.id] || ""}
                        onChange={(e) =>
                          setInputValue((prev) => ({
                            ...prev,
                            [room.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter room number"
                        className={fieldCls}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddOption(room.id)}
                        className="rounded-[20px] bg-emerald-500 px-5 py-3 text-sm font-bold text-white"
                      >
                        Add Room
                      </button>
                    </div>

                    {/* Room checkbox grid — BUG FIX: proper state-based badge */}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {(roomOptions[room.id] || []).map((item) => {
                        const roomState  = getRoomState(item);
                        const meta       = AVAILABILITY_BADGE[roomState];
                        const isSelected = selectedRooms[room.id]?.includes(item);
                        const isLocked   = meta.disabled;

                        return (
                          <label
                            key={item}
                            className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition
                              ${isLocked ? "cursor-not-allowed opacity-70" : "hover:border-sky-300"}
                              ${isSelected ? "border-sky-200 bg-sky-50 text-sky-700" : meta.pill}
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected || false}
                              disabled={isLocked}
                              onChange={() => handleSelect(room.id, item)}
                            />
                            {item}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${meta.classes}`}
                            >
                              {meta.label}
                            </span>
                          </label>
                        );
                      })}

                      {!(roomOptions[room.id] || []).length && (
                        <p className="text-sm text-slate-400 italic">
                          No rooms added yet — add room number above.
                        </p>
                      )}
                    </div>
                  </div>
                )}
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
      </div>
    </div>
  );
};

export default Room;
