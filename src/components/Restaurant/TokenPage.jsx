import React from "react";
import { useNavigate, useParams } from "react-router-dom";

const TokenPage = () => {

  const navigate = useNavigate();
  const { table } = useParams();

  return (

    <div className="bg-gray-100 min-h-screen p-6">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-3">
        Home &gt; Restaurant Tokens
      </div>

      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-2 rounded-t">
        Add Token
      </div>

      {/* Form Card */}
      <div className="bg-white border p-6">

        <h3 className="text-sm font-semibold mb-4">
          Token Details
        </h3>

        <div className="grid grid-cols-2 gap-6">

          {/* Token Type */}
          <div>
            <label className="text-sm font-medium">
              Token Type *
            </label>

            <select className="w-full border p-2 rounded mt-1">
              <option>Table</option>
              <option>Room</option>
            </select>
          </div>

          {/* Waiter */}
          <div>
            <label className="text-sm font-medium">
              Waiter *
            </label>

            <input
              value="shilpi"
              className="w-full border p-2 rounded mt-1"
            />
          </div>

          {/* Reference */}
          <div>
            <label className="text-sm font-medium">
              Reference *
            </label>

            <select className="w-full border p-2 rounded mt-1">
              <option>{table}</option>
            </select>

            <p className="text-xs text-gray-500 mt-1">
              Table No / Room No / Phone No.
            </p>
          </div>

          {/* POS */}
          <div>
            <label className="text-sm font-medium">
              POS *
            </label>

            <input
              value="Foods of Heaven"
              className="w-full border p-2 rounded mt-1"
            />
          </div>

        </div>

        {/* Buttons */}
        <div className="flex gap-2 mt-4">

          <button className="bg-green-500 text-white px-4 py-2 rounded text-sm">
            Add Item +
          </button>

          <button
            className="bg-red-500 text-white px-4 py-2 rounded text-sm"
            onClick={() => navigate(`/restaurant/menu/${table}`)}
          >
            Menu Card
          </button>

        </div>

        {/* Items Table */}
        <div className="mt-6 border-t pt-4">

          <div className="grid grid-cols-5 text-sm font-semibold text-gray-600">

            <div>Item</div>
            <div>Quantity</div>
            <div>Rate</div>
            <div>Amount</div>
            <div>Notes</div>

          </div>

          <div className="text-gray-400 text-sm mt-3">
            No items added yet
          </div>

        </div>

        {/* Bottom Buttons */}
        <div className="mt-6 flex gap-2">

          <button className="bg-green-600 text-white px-6 py-2 rounded">
            Submit
          </button>

          <button
            className="bg-gray-300 px-6 py-2 rounded"
            onClick={() => navigate("/restaurant")}
          >
            Back to Dashboard
          </button>

        </div>

      </div>

    </div>

  );
};

export default TokenPage;