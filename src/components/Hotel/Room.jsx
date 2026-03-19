import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const rooms = [
  { id: 1, name: "AC ROOM", price: "₹2000 PER NIGHT" },
  { id: 2, name: "NON-AC ROOM", price: "₹1500 PER NIGHT" },
  { id: 3, name: "DELUXE ROOM", price: "₹3000 PER NIGHT" },
  { id: 4, name: "SUPER DELUXE ROOM", price: "₹4000 PER NIGHT" },
  { id: 5, name: "SUITE ROOM", price: "₹5000 PER NIGHT" },
  { id: 6, name: "DELUXE DORMITORY", price: "₹800 PER BED" }
];

const Room = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingId = location.state?.bookingId;

  const [activeRoom, setActiveRoom] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState({});
  const [roomOptions, setRoomOptions] = useState({});
  const [inputValue, setInputValue] = useState({});

  const handleAvailability = (index) => {
    setActiveRoom(activeRoom === index ? null : index);
  };

  const normalize = (val) => val.trim().toLowerCase();

  const findExistingRoom = (value) => {
    for (let [roomId, options] of Object.entries(roomOptions)) {
      if (options.some((item) => normalize(item) === normalize(value))) {
        const roomName = rooms.find(
          (r) => r.id === Number(roomId)
        )?.name;
        return roomName;
      }
    }
    return null;
  };

  const handleAddOption = (roomId) => {
    const value = inputValue[roomId];

    if (!value?.trim()) return;

    const existingRoom = findExistingRoom(value);

    if (existingRoom) {
      alert(`Room already exists in ${existingRoom}`);
      return;
    }

    setRoomOptions((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), value]
    }));

    setInputValue((prev) => ({ ...prev, [roomId]: "" }));
  };

  const handleSelect = (roomId, value) => {
    setSelectedRooms((prev) => {
      const current = prev[roomId] || [];

      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      return { ...prev, [roomId]: updated };
    });
  };

  const isAlreadySelected = (value) => {
    return Object.values(selectedRooms).flat().includes(value);
  };

  // ✅ UPDATED HANDLE
  const handleProceed = () => {
    if (!Object.keys(selectedRooms).length) {
      alert("Please select at least one room");
      return;
    }

    navigate("/hotel/pax", {
      state: {
        bookingId,
        roomOptions,
        selectedRooms
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-6">
          Room Details »
        </h2>

        <div className="space-y-5">

          {rooms.map((room, index) => (
            <div key={room.id} className="border rounded-lg p-4">

              <div className="flex justify-between items-center">

                <div>
                  <h3 className="text-blue-600 font-semibold">
                    ⚡ {room.name} ({selectedRooms[room.id]?.length || 0})
                    <span className="text-gray-600 ml-2">
                      × {room.price}
                    </span>
                  </h3>
                </div>

                <button
                  onClick={() => handleAvailability(index)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded"
                >
                  Check Availability
                </button>

              </div>

              {activeRoom === index && (
                <div className="mt-4 border-t pt-4">

                  <div className="flex gap-2 mb-3">
                    <input
                      value={inputValue[room.id] || ""}
                      onChange={(e) =>
                        setInputValue({
                          ...inputValue,
                          [room.id]: e.target.value
                        })
                      }
                      placeholder="Enter Room Number"
                      className="border p-2 rounded w-full"
                    />
                    <button
                      onClick={() => handleAddOption(room.id)}
                      className="bg-green-500 text-white px-3 rounded"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex gap-4 flex-wrap">
                    {(roomOptions[room.id] || []).map((item) => {
                      const disabled =
                        isAlreadySelected(item) &&
                        !selectedRooms[room.id]?.includes(item);

                      return (
                        <label key={item} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              selectedRooms[room.id]?.includes(item) || false
                            }
                            disabled={disabled}
                            onChange={() => handleSelect(room.id, item)}
                          />
                          {item}
                        </label>
                      );
                    })}
                  </div>

                </div>
              )}

            </div>
          ))}

        </div>

        <div className="flex justify-end gap-4 mt-6">

          <button
            onClick={() => navigate("/hotel/company")}
            className="bg-gray-300 px-5 py-2 rounded-lg"
          >
            ← Go Back
          </button>

          <button
            onClick={handleProceed}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg"
          >
            Save & Proceed →
          </button>

        </div>

      </div>
    </div>
  );
};

export default Room;