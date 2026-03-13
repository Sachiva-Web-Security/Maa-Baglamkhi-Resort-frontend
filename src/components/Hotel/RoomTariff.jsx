import React from "react";
import { useNavigate } from "react-router-dom";
const RoomTariff = () => {

    const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">

      <div className="w-full max-w-5xl bg-white shadow-lg rounded-xl p-6">

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Room Tariff Details »
        </h2>

        {/* Success Message */}
        <div className="bg-green-100 text-green-700 text-sm p-3 rounded mb-6">
          PAX and Meal Plan successfully updated for Booking ID -
          <span className="font-semibold"> BX567BE6142DD </span>
          Continue adding Room Tariff Details below.
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-gray-600 mb-3">
          <div>Item Name</div>
          <div>Quantity</div>
          <div>Tariff</div>
          <div>GST (%)</div>
          <div>Total</div>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-5 gap-4 mb-3">

          <div className="bg-gray-100 p-2 rounded text-sm">
            8th Jul 2024 - Suite Room #402
          </div>

          <input
            type="number"
            defaultValue="1"
            className="border rounded-md p-2"
          />

          <input
            type="text"
            defaultValue="4911.00"
            className="border rounded-md p-2"
          />

          <select className="border rounded-md p-2">
            <option>12%</option>
            <option>18%</option>
          </select>

          <input
            type="text"
            defaultValue="5500.32"
            className="border rounded-md p-2"
            readOnly
          />

        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-5 gap-4 mb-6">

          <div className="bg-gray-100 p-2 rounded text-sm">
            9th Jul 2024 - Suite Room #402
          </div>

          <input
            type="number"
            defaultValue="1"
            className="border rounded-md p-2"
          />

          <input
            type="text"
            defaultValue="4911.00"
            className="border rounded-md p-2"
          />

          <select className="border rounded-md p-2">
            <option>12%</option>
            <option>18%</option>
          </select>

          <input
            type="text"
            defaultValue="5500.32"
            className="border rounded-md p-2"
            readOnly
          />

        </div>

        {/* Bulk Price Edit */}
        <h3 className="text-sm font-semibold text-gray-600 mb-2">
          Bulk Price Edit by Room Category
        </h3>

        <div className="grid grid-cols-4 gap-4 mb-6">

          <div className="bg-gray-100 p-2 rounded text-sm">
            Suite Room
          </div>

          <input
            type="text"
            placeholder="Tariff"
            className="border rounded-md p-2"
          />

          <select className="border rounded-md p-2">
            <option>Select</option>
            <option>12%</option>
            <option>18%</option>
          </select>

          <input
            type="text"
            placeholder="Total"
            className="border rounded-md p-2"
          />

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">

          <button onClick={() => navigate("/hotel/pax")}>
← Go Back
</button>

<button onClick={() => navigate("/hotel/advance")}>
Save & Proceed →
</button>

        </div>

      </div>

    </div>
  );
};

export default RoomTariff;