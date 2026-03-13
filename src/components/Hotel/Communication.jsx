import React from "react";
import { useNavigate } from "react-router-dom";



const Communication = () => {

    const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">

      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-6">

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Communication Details »
        </h2>

        {/* Success Message */}
        <div className="bg-green-100 text-green-700 text-sm p-3 rounded mb-6">
          Advance Payment successfully updated for Booking ID -
          <span className="font-semibold"> BX567BE6142DD </span>.
          Print and Share Booking Slip using the links below.
        </div>

        {/* Communication Options */}
        <div className="space-y-3 text-blue-600 text-sm">

          <button className="block hover:underline">
            🖨 Print Booking Slip »
          </button>

          <button className="block hover:underline">
            💬 WhatsApp Booking Slip »
          </button>

          <button className="block hover:underline">
            ✉ Email Booking Slip »
          </button>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-8">

          <button className="bg-gray-300 text-gray-600 px-5 py-2 rounded-lg cursor-not-allowed">
            Go to Stay Overview
          </button>

          <button className="bg-gray-300 text-gray-600 px-5 py-2 rounded-lg cursor-not-allowed">
            Go to Booking Dashboard
          </button>

         <button onClick={() => navigate("/hotel/guest")}>
Add New Booking →
</button>

        </div>

      </div>

    </div>
  );
};

export default Communication;