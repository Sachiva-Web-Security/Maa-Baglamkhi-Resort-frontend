import React from "react";
import { useNavigate } from "react-router-dom";
const Pax = () => {

    const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">

      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-6">

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          PAX & Meal Plan Details »
        </h2>

        {/* Success Message */}
        <div className="bg-green-100 text-green-700 text-sm p-3 rounded mb-6">
          A new booking with Booking ID - 
          <span className="font-semibold"> BX567BE6142DD </span>
          has been created successfully. Continue adding PAX & Meal Plan Details below.
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-gray-600 mb-2">
          <div>Room No.</div>
          <div>Adults</div>
          <div>Children</div>
          <div>Meal Plan</div>
        </div>

        {/* Row */}
        <div className="grid grid-cols-4 gap-4 items-center">

          {/* Room No */}
          <div className="font-medium text-gray-700">
            402
          </div>

          {/* Adults */}
          <select className="border rounded-md p-2 focus:ring-2 focus:ring-blue-400">
            <option>1</option>
            <option selected>2</option>
            <option>3</option>
          </select>

          {/* Children */}
          <select className="border rounded-md p-2 focus:ring-2 focus:ring-blue-400">
            <option>0</option>
            <option selected>1</option>
            <option>2</option>
          </select>

          {/* Meal Plan */}
          <select className="border rounded-md p-2 focus:ring-2 focus:ring-blue-400">
            <option>AP</option>
            <option>MAP</option>
            <option>CP</option>
            <option>EP</option>
          </select>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-8">

          <button onClick={() => navigate("/hotel/room")}>
← Go Back
</button>

<button onClick={() => navigate("/hotel/room-tariff")}>
Save & Proceed →
</button>

        </div>

      </div>

    </div>
  );
};

export default Pax;