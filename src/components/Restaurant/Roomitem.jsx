import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiFileText, FiHome, FiPlusCircle } from "react-icons/fi";

import API from "../../api";
import { RestaurantContext } from "../../Context/RestaurantContext";
import {
  expandBookings,
  getRoomBookingReference,
  mergeBookingsWithRooms,
  normalizeRooms,
  todayISO,
} from "../Dashboard/stayoverUtils";

const Roomitem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedTable } = useContext(RestaurantContext);
  const [roomNo, setRoomNo] = useState("");
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const focusRoomNo = String(location.state?.focusRoomNo || "");

  const loadRooms = async () => {
    try {
      setLoading(true);
      const [roomsResponse, bookingsResponse] = await Promise.all([
        API.get("/housekeeping"),
        API.get("/hotel/all-bookings"),
      ]);
      setRooms(normalizeRooms(roomsResponse.data));
      setBookings(expandBookings(bookingsResponse.data));
    } catch (error) {
      console.error(error);
      alert("Hotel room data load nahi ho paaya.");
      setRooms([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const addRoom = async () => {
    if (!roomNo.trim()) {
      alert("Enter Room Number");
      return;
    }

    const exists = rooms.some((room) => String(room.roomNo) === String(roomNo));
    if (exists) {
      alert("Room already exists");
      return;
    }

    try {
      await API.post("/housekeeping", {
        roomNumber: roomNo,
        roomNo,
        status: "Vacant Dirty",
        assignee: "No Housekeeper",
      });
      setRoomNo("");
      loadRooms();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Room add nahi ho paaya.");
    }
  };

  const occupiedCount = useMemo(
    () => rooms.filter((room) => String(room.hotelStatus || "").toLowerCase() === "occupied").length,
    [rooms],
  );
  const mergedBookings = useMemo(() => mergeBookingsWithRooms(bookings, rooms), [bookings, rooms]);
  const today = todayISO();

  const openRoomFlow = (room, target = "token") => {
    setSelectedTable(room.roomNo);
    const state = {
      entityType: "Room",
      roomData: room,
    };

    if (target === "items") {
      navigate(`/restaurant/token-items/${room.roomNo}`, { state });
      return;
    }

    navigate(`/restaurant/token/${room.roomNo}`, { state });
  };

  return (
    <div className="bg-gradient-to-br from-slate-100 via-white to-slate-100 min-h-screen p-6">
      <div className="rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-900 via-blue-800 to-cyan-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="uppercase text-xs tracking-[0.28em] text-white/70">Front Office</p>
            <h2 className="text-2xl font-bold">Room Dashboard</h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-white/80">
            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25">Rooms - Tokens - Billing</span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter Room No"
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
              className="flex-1 border border-slate-200 p-3 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={addRoom}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition"
            >
              <FiPlusCircle />
              Add Room
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl border border-slate-200 bg-blue-50 p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white text-blue-600 flex items-center justify-center text-xl border border-blue-100">
                <FiHome />
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Total Rooms</p>
                <p className="text-2xl font-bold text-slate-900">{rooms.length}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white text-amber-600 flex items-center justify-center text-xl border border-amber-100">
                <FiFileText />
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Occupied Hotel Rooms</p>
                <p className="text-2xl font-bold text-slate-900">{occupiedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? <div className="mt-6 text-sm text-slate-500">Loading hotel rooms...</div> : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mt-6">
        {rooms.map((room) => {
          const hotelStatus = String(room.hotelStatus || room.status || "");
          const isFocused = focusRoomNo && String(room.roomNo) === focusRoomNo;
          const bookingReference = getRoomBookingReference(room.roomNo, today, mergedBookings);
          const guestName = room.guest || bookingReference?.guestName || "No active guest";
          const stayCheckIn = room.checkIn || bookingReference?.checkIn || "--";
          const stayCheckOut = room.checkOut || bookingReference?.checkOut || "--";
          return (
            <div
              key={`${room.roomId}-${room.roomNo}`}
              className={`rounded-3xl border bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition ${
                isFocused
                  ? "border-blue-400 ring-2 ring-blue-200 shadow-[0_18px_44px_rgba(59,130,246,0.18)]"
                  : "border-slate-100 hover:shadow-[0_18px_44px_rgba(59,130,246,0.18)]"
              }`}
            >
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 text-lg">Room {room.roomNo}</div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {room.categoryName || "Hotel Room"}
                    </div>
                    <div className="text-xs text-slate-500">ID {room.roomId || "--"}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${
                      hotelStatus.toLowerCase() === "occupied"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {hotelStatus || "Available"}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                  <div>Guest: {guestName}</div>
                  <div>Stay: {stayCheckIn} to {stayCheckOut}</div>
                </div>
              </div>

              <div className="px-4 pb-4 flex flex-col gap-2.5">
                <button
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                  onClick={() => openRoomFlow(room, "token")}
                >
                  + Token
                </button>

                <button
                  className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                  onClick={() => openRoomFlow(room, "token")}
                >
                  + NC Token
                </button>

                <button
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                  onClick={() => openRoomFlow(room, "items")}
                >
                  Room Items
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Roomitem;
