import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";
import { FiPlusCircle, FiHome, FiFileText } from "react-icons/fi";
import { roomService } from "../../services/roomService";

const Roomitem = () => {
  const navigate = useNavigate();
  const { setSelectedTable } = useContext(RestaurantContext);
  const [roomNo, setRoomNo] = useState("");

  const [rooms, setRooms] = useState([]);

  // load rooms from backend
  useEffect(() => {
    const load = async () => {
      try {
        const data = await roomService.getRooms();
        const normalized = (data || []).map((r) => ({
          id: r.number || r.id,
          status: r.status || "Available",
        }));
        setRooms(normalized);
      } catch (err) {
        console.error("Failed to load rooms", err);
      }
    };
    load();
  }, []);

  const addRoom = () => {
    if (!roomNo) {
      alert("Enter Room Number");
      return;
    }

    // prevent duplicates
    if (rooms.some((r) => String(r.id) === String(roomNo))) {
      alert("Room already exists");
      return;
    }

    const newRoom = {
      id: roomNo,
      status: "Available",
    };

    const persist = async () => {
      try {
        await roomService.addRoom(roomNo);
        setRooms([...rooms, newRoom]);
        setRoomNo("");
      } catch (err) {
        alert(err?.response?.data?.message || "Failed to add room");
      }
    };
    persist();
  };

  const occupiedCount = rooms.filter((r) => r.status === "Occupied").length;

  return (
    <div className="bg-gradient-to-br from-slate-100 via-white to-slate-100 min-h-screen p-6">
      {/* Hero header */}
      <div className="rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-900 via-blue-800 to-cyan-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="uppercase text-xs tracking-[0.28em] text-white/70">Front Office</p>
            <h2 className="text-2xl font-bold">Room Dashboard</h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-white/80">
            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25">
              Rooms · Tokens · Billing
            </span>
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

          {/* Stats */}
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
                <p className="text-xs uppercase text-slate-500">Invoice Pending</p>
                <p className="text-2xl font-bold text-slate-900">{occupiedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Room Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mt-6">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="rounded-3xl border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] hover:shadow-[0_18px_44px_rgba(59,130,246,0.18)] transition"
          >
            <div className="p-4 flex justify-between items-center">
              <div className="font-semibold text-slate-900 text-lg">Room {room.id}</div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${
                  room.status === "Occupied"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {room.status}
              </span>
            </div>

            <div className="px-4 pb-4 flex flex-col gap-2.5">
              <button
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                onClick={() => {
                  setRooms((prev) =>
                    prev.map((r) =>
                      r.id === room.id ? { ...r, status: "Occupied" } : r
                    )
                  );
                  localStorage.setItem(`entityType:${room.id}`, "Room");
                  setSelectedTable(room.id);
                  navigate(`/restaurant/token/${room.id}`, {
                    state: { entityType: "Room" },
                  });
                }}
              >
                + Token
              </button>

              <button className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition">
                + NC Token
              </button>

              <button
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                onClick={() =>
                  navigate(`/restaurant/token-items/${room.id}`, {
                    state: { entityType: "Room" },
                  })
                }
              >
                Room Items
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Roomitem;
