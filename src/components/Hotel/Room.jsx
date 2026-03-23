import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import API from "../../api";
import { expandBookings } from "../Dashboard/stayoverUtils";
import {
  getBookingDraft,
  getStoredBookingCode,
  getStoredBookingId,
  setBookingDraft,
  setStoredBookingId,
} from "./bookingSession";

const defaultRooms = [
  { id: 1, name: "AC ROOM", defaultPrice: 2000, unitLabel: "PER NIGHT" },
  { id: 2, name: "NON-AC ROOM", defaultPrice: 1500, unitLabel: "PER NIGHT" },
  { id: 3, name: "DELUXE ROOM", defaultPrice: 3000, unitLabel: "PER NIGHT" },
  { id: 4, name: "SUPER DELUXE ROOM", defaultPrice: 4000, unitLabel: "PER NIGHT" },
  { id: 5, name: "SUITE ROOM", defaultPrice: 5000, unitLabel: "PER NIGHT" },
  { id: 6, name: "DELUXE DORMITORY", defaultPrice: 800, unitLabel: "PER BED" },
];

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const formatPriceText = (price, unitLabel) => `Rs ${price} ${unitLabel}`;

const Room = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = location.state?.bookingId || getStoredBookingId();
  const bookingCode = location.state?.bookingCode || getStoredBookingCode();
  const bookingRef = bookingCode || bookingId;

  const [roomCatalog, setRoomCatalog] = useState(defaultRooms);
  const roomDraft = getBookingDraft("room") || {};
  const [activeRoom, setActiveRoom] = useState(roomDraft.activeRoom ?? null);
  const [selectedRooms, setSelectedRooms] = useState(roomDraft.selectedRooms || {});
  const [roomOptions, setRoomOptions] = useState(roomDraft.roomOptions || {});
  const [inputValue, setInputValue] = useState(roomDraft.inputValue || {});
  const [priceInputs, setPriceInputs] = useState(roomDraft.priceInputs || {});
  const [pickerValues, setPickerValues] = useState(roomDraft.pickerValues || {});
  const [activeBookings, setActiveBookings] = useState([]);

  useEffect(() => {
    if (bookingId) {
      setStoredBookingId(bookingId);
    }
  }, [bookingId]);

  useEffect(() => {
    let cancelled = false;

    const loadActiveBookings = async () => {
      try {
        const response = await API.get("/hotel/all-bookings");
        const rows = expandBookings(response.data);

        const nextBookings = rows.filter((booking) => {
          const normalizedStatus = String(booking.bookingStatus || "").toLowerCase();
          const isCurrentBooking = bookingId && String(booking.bookingId) === String(bookingId);
          const isClosedBooking =
            normalizedStatus.includes("check out") ||
            normalizedStatus.includes("checked out") ||
            normalizedStatus.includes("cancel");

          return !isCurrentBooking && !isClosedBooking;
        });

        if (!cancelled) {
          setActiveBookings(nextBookings);
        }
      } catch (error) {
        console.error("Failed to load active bookings", error);
      }
    };

    loadActiveBookings();

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        loadActiveBookings();
      }
    };

    const intervalId = window.setInterval(loadActiveBookings, 15000);

    window.addEventListener("focus", loadActiveBookings);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadActiveBookings);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [bookingId]);

  useEffect(() => {
    const loadRoomSetup = async () => {
      try {
        const response = await API.get("/hotel/rooms/setup");
        const setupRows = Array.isArray(response.data) ? response.data : [];

        setRoomCatalog((prev) =>
          prev.map((room) => {
            const backendCategory = setupRows.find(
              (item) => Number(item.id) === Number(room.id) || item.name === room.name,
            );

            return backendCategory
              ? {
                  ...room,
                  defaultPrice: Number(backendCategory.defaultPrice || room.defaultPrice),
                  unitLabel: backendCategory.unitLabel || room.unitLabel,
                }
              : room;
          }),
        );

        const mappedOptions = {};
        const mappedPrices = {};

        setupRows.forEach((category) => {
          mappedOptions[category.id] = Array.isArray(category.rooms) ? category.rooms : [];
          mappedPrices[category.id] = String(Number(category.defaultPrice || 0));
        });

        setRoomOptions((prev) => ({ ...mappedOptions, ...prev }));
        setPriceInputs((prev) => ({ ...mappedPrices, ...prev }));
      } catch (error) {
        console.error("Failed to load room setup", error);
        alert("Room setup load nahi ho paaya.");
      }
    };

    loadRoomSetup();
  }, []);

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

  const selectedRoomCount = useMemo(
    () => Object.values(selectedRooms).reduce((sum, rooms) => sum + rooms.length, 0),
    [selectedRooms],
  );

  const bookedRoomNumbers = useMemo(() => {
    const locked = new Set();

    activeBookings.forEach((booking) => {
      if (booking.roomNumber) {
        locked.add(String(booking.roomNumber).trim().toLowerCase());
      }
    });

    return locked;
  }, [activeBookings]);

  const isRoomBooked = (value) => bookedRoomNumbers.has(String(value || "").trim().toLowerCase());

  const getAvailableRoomsForType = (roomId) =>
    (roomOptions[roomId] || []).filter((item) => !isRoomBooked(item));

  const handleAvailability = (index) => {
    setActiveRoom(activeRoom === index ? null : index);
  };

  const normalize = (val) => val.trim().toLowerCase();

  const findExistingRoom = (value) => {
    for (const [roomId, options] of Object.entries(roomOptions)) {
      if (options.some((item) => normalize(item) === normalize(value))) {
        const roomName = roomCatalog.find((room) => room.id === Number(roomId))?.name;
        return roomName;
      }
    }
    return null;
  };

  const handleAddOption = async (roomId) => {
    const value = inputValue[roomId];

    if (!value?.trim()) return;

    if (isRoomBooked(value)) {
      alert(`Room no ${value} already booked hai. Checkout ke baad hi dobara select hoga.`);
      return;
    }

    const existingRoom = findExistingRoom(value);
    if (existingRoom) {
      alert(`Room already exists in ${existingRoom}`);
      return;
    }

    try {
      await API.post("/hotel/rooms", {
        categoryId: roomId,
        roomNumber: value,
      });

      setRoomOptions((prev) => ({
        ...prev,
        [roomId]: [...(prev[roomId] || []), value],
      }));
      setInputValue((prev) => ({ ...prev, [roomId]: "" }));
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Room add nahi ho paaya");
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
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Price update nahi ho paaya");
    }
  };

  const handleSelect = (roomId, value) => {
    if (isRoomBooked(value)) {
      alert(`Room no ${value} already booked hai.`);
      return;
    }

    setSelectedRooms((prev) => {
      const current = prev[roomId] || [];
      const isCurrentlySelected = current.includes(value);

      if (!isCurrentlySelected) {
        const existingSelection = Object.entries(prev).find(
          ([existingRoomId, values]) =>
            Number(existingRoomId) !== Number(roomId) && values.includes(value),
        );

        if (existingSelection) {
          const roomTypeName =
            roomCatalog.find((room) => Number(room.id) === Number(existingSelection[0]))?.name ||
            `Type ${existingSelection[0]}`;
          alert(`Room no ${value} already selected in ${roomTypeName}. Ek hi booking me same room dobarah select nahi hoga.`);
          return prev;
        }
      }

      const updated = current.includes(value)
        ? current.filter((roomValue) => roomValue !== value)
        : [...current, value];

      return { ...prev, [roomId]: updated };
    });
  };

  const handleProceed = () => {
    if (!Object.keys(selectedRooms).length) {
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
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4fbff_0%,#f8fff9_42%,#fffaf1_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#08253d_0%,#0e5b6a_48%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-center">
          

            <div className="space-y-3 rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                  Booking ID
                </div>
                <div className="mt-1 text-2xl font-black">{bookingRef || "Pending"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                  Selected Rooms
                </div>
                <div className="mt-1 text-2xl font-black">{selectedRoomCount}</div>
              </div>
            </div>
          </div>
        </section>

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
                        onChange={(event) =>
                          setPriceInputs((prev) => ({
                            ...prev,
                            [room.id]: event.target.value,
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
                    onClick={() => handleAvailability(index)}
                    className="rounded-[20px] bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(245,158,11,0.24)] transition hover:-translate-y-0.5"
                  >
                    {activeRoom === index ? "Hide Availability" : "Check Availability"}
                  </button>
                </div>

                {activeRoom === index ? (
                  <div className="mt-5 border-t border-slate-200 pt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Available Rooms
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {getAvailableRoomsForType(room.id).length} room(s) ready for booking
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {room.name}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <select
                        value={pickerValues[room.id] || ""}
                        onChange={(event) => handlePickAvailableRoom(room.id, event.target.value)}
                        className={fieldCls}
                      >
                        <option value="">Select available room</option>
                        {getAvailableRoomsForType(room.id).length ? (
                          getAvailableRoomsForType(room.id).map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No available room in this type
                          </option>
                        )}
                      </select>

                      <input
                        value={inputValue[room.id] || ""}
                        onChange={(event) =>
                          setInputValue((prev) => ({
                            ...prev,
                            [room.id]: event.target.value,
                          }))
                        }
                        placeholder="Enter room number"
                        className={fieldCls}
                      />
                      <button
                        onClick={() => handleAddOption(room.id)}
                        className="rounded-[20px] bg-emerald-500 px-5 py-3 text-sm font-bold text-white"
                      >
                        Add Room
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {(roomOptions[room.id] || []).map((item) => {
                        const locked = isRoomBooked(item);
                        const checked = selectedRooms[room.id]?.includes(item) || locked;

                        return (
                          <label
                            key={item}
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                              checked
                                ? "border-sky-200 bg-sky-50 text-sky-700"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={locked}
                                onChange={() => handleSelect(room.id, item)}
                              />
                              {item}
                            {locked ? (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700">
                                Booked
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                                Available
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={() => navigate("/hotel/company")}
              className="rounded-[22px] border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Go Back
            </button>

            <button
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
