import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const rooms = [
  {
    name: "AC DELUXE ROOM",
    price: "₹2232 PER NIGHT"
  },
  {
    name: "BANQUET HALL",
    price: "₹1830 PER NIGHT"
  },
  {
    name: "DELUXE DORMITORY",
    price: "₹3000 PER NIGHT"
  },
  {
    name: "SUITE ROOM",
    price: "₹4911 PER NIGHT"
  }
];

const Room = () => {

  const navigate = useNavigate();   // ✅ hook यहाँ होना चाहिए

  const [activeRoom, setActiveRoom] = useState(null);

  const handleAvailability = (index) => {
    setActiveRoom(activeRoom === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">

      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-6">
          Room Details »
        </h2>

        <div className="space-y-5">

          {rooms.map((room, index) => (
            <div key={index} className="border rounded-lg p-4">

              <div className="flex justify-between items-center">

                <div>
                  <h3 className="text-blue-600 font-semibold">
                    ⚡ {room.name} (0)
                    <span className="text-gray-600 ml-2">
                      × {room.price}
                    </span>
                  </h3>

                  {activeRoom !== index && (
                    <p className="text-sm text-gray-500 mt-2">
                      Please check for availability...
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleAvailability(index)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow"
                >
                  Check Availability
                </button>

              </div>

              {activeRoom === index && (
                <div className="mt-4 border-t pt-4 text-sm text-gray-700">

                  <p className="font-semibold mb-2">ALL DATES</p>

                  <label className="flex items-center gap-2 mb-2">
                    <input type="checkbox" className="accent-red-500"/>
                    402
                  </label>

                  <p className="font-semibold mt-3">JUL 8, 2024</p>

                  <div className="flex gap-6 mt-1">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-red-500"/>
                      402
                    </label>

                    <label className="flex items-center gap-2">
                      <input type="checkbox"/>
                      502
                    </label>
                  </div>

                  <p className="font-semibold mt-3">JUL 9, 2024</p>

                  <div className="flex gap-6 mt-1">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-red-500"/>
                      402
                    </label>

                    <label className="flex items-center gap-2">
                      <input type="checkbox"/>
                      501
                    </label>
                  </div>

                </div>
              )}

            </div>
          ))}

        </div>

        {/* Bottom Buttons */}

        <div className="flex justify-end gap-4 mt-6">

          <button
            onClick={() => navigate("/hotel/company")}
            className="bg-gray-300 px-5 py-2 rounded-lg"
          >
            ← Go Back
          </button>

          <button
            onClick={() => navigate("/hotel/pax")}
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