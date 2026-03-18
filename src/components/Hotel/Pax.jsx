import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Pax = () => {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [paxData, setPaxData] = useState({});

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("roomsData")) || {};
    const selected = JSON.parse(localStorage.getItem("selectedRooms")) || {};

    let finalRooms = [];

    for (let roomId in selected) {
      const roomList = data[roomId] || [];

      selected[roomId].forEach((roomName) => {
        const found = roomList.find(
          (r) => r === roomName || r.name === roomName
        );

        if (found) {
          if (typeof found === "string") {
            finalRooms.push({ name: found, roomType: roomId });
          } else {
            finalRooms.push({ ...found, roomType: roomId });
          }
        }
      });
    }

    setRooms(finalRooms);
  }, []);

  // ✅ handle change
  const handleChange = (roomName, field, value) => {
    setPaxData((prev) => ({
      ...prev,
      [roomName]: {
        ...prev[roomName],
        [field]: Number(value)
      }
    }));
  };

  // ✅ total
  const getTotal = (roomName) => {
    const adults = paxData[roomName]?.adults || 0;
    const children = paxData[roomName]?.children || 0;
    return adults + children;
  };

  // ✅ save for tariff (meal removed)
  const handleProceed = () => {
    let finalData = [];

    rooms.forEach((room) => {
      const pax = paxData[room.name] || {};

      finalData.push({
        name: room.name,
        roomType: room.roomType,
        adults: pax.adults || 0,
        children: pax.children || 0,
        total: (pax.adults || 0) + (pax.children || 0)
      });
    });

    localStorage.setItem("finalPaxData", JSON.stringify(finalData));
    navigate("/hotel/room-tariff");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          PAX Details »
        </h2>

        <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-gray-600 mb-2">
          <div>Room No.</div>
          <div>Adults</div>
          <div>Children</div>
          <div>Total</div>
        </div>

        {rooms.map((room, index) => (
          <div key={index} className="grid grid-cols-4 gap-4 items-center mb-3">

            <div className="font-medium text-gray-700">
              {room.name}
            </div>

            <input
              type="number"
              min="0"
              placeholder="Adults"
              value={paxData[room.name]?.adults || ""}
              onChange={(e) =>
                handleChange(room.name, "adults", e.target.value)
              }
              className="border rounded-md p-2"
            />

            <input
              type="number"
              min="0"
              placeholder="Children"
              value={paxData[room.name]?.children || ""}
              onChange={(e) =>
                handleChange(room.name, "children", e.target.value)
              }
              className="border rounded-md p-2"
            />

            <div className="font-semibold text-blue-600">
              {getTotal(room.name)}
            </div>

          </div>
        ))}

        <div className="flex justify-end gap-3 mt-8">

          <button onClick={() => navigate("/hotel/room")}>
            ← Go Back
          </button>

          <button onClick={handleProceed}>
            Save & Proceed →
          </button>

        </div>

      </div>
    </div>
  );
};

export default Pax;