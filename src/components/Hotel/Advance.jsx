import React from "react";
import { useNavigate } from "react-router-dom";
const Advance = () => {

const navigate = useNavigate();



  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">

      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-6">

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Advance Payment Details »
        </h2>

        {/* Success Message */}
        <div className="bg-green-100 text-green-700 text-sm p-3 rounded mb-6">
          Room Tariff successfully updated for Booking ID -
          <span className="font-semibold"> BX567BE6142DD </span>
          Continue adding Advance Payment Details below.
        </div>

        {/* Form */}
        <div className="grid grid-cols-2 gap-4">

          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Amount
            </label>

            <input
              type="text"
              defaultValue="11600.00"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div></div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Payment Mode
            </label>

            <select className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400">
              <option>Select</option>
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
          </div>

          {/* Receipt Account */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Receipt Account
            </label>

            <select className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400">
              <option>Hotel Cash</option>
              <option>Restaurant Cash</option>
              <option>Cash Hotel</option>
              <option>Fo cash</option>
              <option>Sujay</option>
              
            </select>
          </div>

          {/* Transaction Details */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Transaction Details
            </label>

            <input
              type="text"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Remarks */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Remarks
            </label>

            <input
              type="text"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-8">

          <button onClick={() => navigate("/hotel/room-tariff")}>
← Go Back
</button>

<button onClick={() => navigate("/hotel/communication")}>
Save & Proceed →
</button>

        </div>

      </div>

    </div>
  );
};

export default Advance;