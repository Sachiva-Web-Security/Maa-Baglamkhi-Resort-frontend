import React from "react";
import { useNavigate } from "react-router-dom";
const Company = () => {

const navigate = useNavigate();


  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">

      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6">

        {/* Company Details */}
        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-6">
          Company Details »
        </h2>

        <div className="grid grid-cols-2 gap-4">

          {/* Company Name */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Company Name
            </label>

            <div className="flex gap-3">
              <select className="flex-1 border rounded-md p-2 focus:ring-2 focus:ring-blue-400">
                <option>Select</option>
                <option>Tata</option>
                <option>Infosys</option>
                <option>Reliance</option>
              </select>

              <button className="text-blue-500 text-sm hover:underline">
                + Add New
              </button>
            </div>
          </div>

          {/* GSTIN */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              GSTIN
            </label>

            <input
              type="text"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400"
              placeholder="Enter GSTIN"
            />
          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">

          <button onClick={() => navigate("/hotel/reference")}>
← Go Back
</button>

<button onClick={() => navigate("/hotel/room")}>
Next →
</button>

        </div>

      </div>
    </div>
  );
};

export default Company;