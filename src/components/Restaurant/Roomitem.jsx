import React, { useState } from "react";

const Roomitem = () => {

  const [roomNo, setRoomNo] = useState("");

  const [rooms, setRooms] = useState([
    { id: 201, status: "Occupied" },
    { id: 202, status: "Available" },
  ]);

  const addRoom = () => {

    if (!roomNo) {
      alert("Enter Room Number");
      return;
    }

    const newRoom = {
      id: roomNo,
      status: "Available",
    };

    setRooms([...rooms, newRoom]);

    setRoomNo("");

  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">

      {/* Header */}
      <h2 className="text-2xl font-bold mb-4">
        Room Dashboard
      </h2>

      {/* Search Bar */}

      <div className="flex gap-3 mb-6">

        <input
          type="text"
          placeholder="Enter Room No"
          value={roomNo}
          onChange={(e) => setRoomNo(e.target.value)}
          className="flex-1 border p-3 rounded"
        />

        <button
          onClick={addRoom}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Room
        </button>

      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-2 gap-4 mb-6">

        <div className="bg-blue-200 p-4 rounded">

          <h3 className="font-semibold">
            Rooms
          </h3>

          <div className="flex justify-between mt-2">
            <span>Total Rooms</span>
            <span>{rooms.length}</span>
          </div>

        </div>

        <div className="bg-yellow-200 p-4 rounded">

          <h3 className="font-semibold">
            Invoice Pending
          </h3>

          <div className="text-right text-lg font-bold">
            1
          </div>

        </div>

      </div>

      {/* Room Cards */}

      <div className="grid grid-cols-4 gap-4">

        {rooms.map((room) => (

          <div
            key={room.id}
            className="bg-green-200 p-4 rounded shadow text-center"
          >

            <h3 className="text-lg font-bold">
              Room {room.id}
            </h3>

            <div className="mt-2">

              {room.status === "Occupied" ? (
                <span className="bg-red-500 text-white px-3 py-1 rounded text-sm">
                  Occupied
                </span>
              ) : (
                <span className="bg-green-500 text-white px-3 py-1 rounded text-sm">
                  Available
                </span>
              )}

            </div>

            <div className="mt-3 space-y-2">

              <button className="w-full bg-teal-600 text-white py-1 rounded">
                + Token
              </button>

              <button className="w-full bg-purple-600 text-white py-1 rounded">
                + NC Token
              </button>

              <button className="w-full bg-orange-500 text-white py-1 rounded">
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