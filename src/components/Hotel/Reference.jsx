import React from "react";
import { useNavigate } from "react-router-dom";
const Reference = () => {

    const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">

      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6">

        {/* Reference Notes */}
        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Reference Notes »
        </h2>

        <div className="grid grid-cols-2 gap-4">

          {/* Guest Type */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Guest Type *
            </label>

            <select className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400">
              <option>General</option>
              <option>VIP Guest</option>
              <option>VVIP Guest</option>
              <option>Scanty Baggage</option>
            </select>
          </div>

          {/* Guest Notes */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Guest Notes
              <span className="text-xs text-gray-400 ml-2">
                (Visible in Booking Slip)
              </span>
            </label>

            <textarea
              rows="3"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400"
            ></textarea>
          </div>

          {/* Internal Notes */}
          <div className="col-span-2">
            <label className="block text-sm text-red-500 mb-1">
              Internal Notes
              <span className="text-xs text-gray-400 ml-2">
                (For Internal Use Only)
              </span>
            </label>

            <textarea
              rows="3"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400"
            ></textarea>
          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
  

  {/* Skip */}
  <button
    onClick={() => navigate("/hotel/other-booking")}
    className="px-6 py-2 rounded-full text-white font-medium 
               bg-gradient-to-r from-indigo-600 to-pink-500
               shadow-lg hover:scale-105 hover:shadow-xl 
               transition-all duration-300"
  >
    ← Go Back
  </button>

  {/* Skip */}
  <button
    onClick={() => navigate("/hotel/company")}
    className="px-6 py-2 rounded-full text-white font-medium 
               bg-gradient-to-r from-orange-400 to-pink-500
               shadow-lg hover:scale-105 hover:shadow-xl 
               transition-all duration-300"
  >
    Skip
  </button>

  {/* Next */}
  <button
    onClick={() => navigate("/hotel/company")}
    className="px-6 py-2 rounded-full text-white font-semibold 
               bg-gradient-to-r from-blue-500 to-cyan-400
               shadow-lg hover:scale-105 hover:shadow-xl 
               transition-all duration-300"
  >
    Next →
  </button>
         

        </div>

      </div>
    </div>
  );
};

export default Reference;