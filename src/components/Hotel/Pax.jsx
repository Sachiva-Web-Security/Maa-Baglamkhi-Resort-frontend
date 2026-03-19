import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const Pax = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ GET FROM ROOM PAGE
  const bookingId = location.state?.bookingId;
  const roomOptions = location.state?.roomOptions;
  const selectedRooms = location.state?.selectedRooms;

  const [rooms, setRooms] = useState([]);
  const [paxData, setPaxData] = useState({});

  // ✅ CONVERT ROOM DATA
  useEffect(() => {
    let finalRooms = [];

    for (let roomId in selectedRooms) {
      selectedRooms[roomId].forEach((roomName) => {
        finalRooms.push({
          name: roomName,
          roomType: roomId
        });
      });
    }

    setRooms(finalRooms);
  }, [selectedRooms]);

  // ✅ INPUT CHANGE
  const handleChange = (roomName, field, value) => {
    setPaxData((prev) => ({
      ...prev,
      [roomName]: {
        ...prev[roomName],
        [field]: Number(value)
      }
    }));
  };

  // ✅ TOTAL
  const getTotal = (roomName) => {
    const adults = paxData[roomName]?.adults || 0;
    const children = paxData[roomName]?.children || 0;
    return adults + children;
  };

  // ✅ SAVE PAX + MOVE NEXT
  const handleProceed = async () => {
    try {
      // 🔥 PAX SAVE (backend call)
      await axios.post(
        `http://localhost:5002/api/hotel/pax/${bookingId}`,
        {
          adults: Object.values(paxData).reduce(
            (sum, r) => sum + (r.adults || 0),
            0
          ),
          children: Object.values(paxData).reduce(
            (sum, r) => sum + (r.children || 0),
            0
          ),
          mealPlan: "EP"
        }
      );

      // 👉 next page
      navigate("/hotel/room-tariff", {
        state: {
          bookingId,
          rooms,
          paxData
        }
      });

    } catch (err) {
      console.error(err);
      alert("Error saving pax ❌");
    }
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