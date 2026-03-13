import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";

const TablePage = () => {

  const { tables } = useContext(RestaurantContext);
  const navigate = useNavigate();

  const getColor = (status) => {
    if (status === "running") return "bg-green-200";
    if (status === "due") return "bg-red-200";
    return "bg-gray-100";
  };

  return (
    <div className="space-y-6">

      {/* Title */}
      <h2 className="text-xl font-bold">
        Restaurant Dashboard
      </h2>

      {/* Top Summary */}
      <div className="grid grid-cols-2 gap-4">

        <div className="bg-blue-100 rounded p-4">
          <h3 className="font-semibold mb-2">Table</h3>

          <div className="flex justify-between">
            <span>Running Tables</span>
            <span>
              {tables.filter((t) => t.status === "running").length}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Blank Tables</span>
            <span>
              {tables.filter((t) => t.status === "blank").length}
            </span>
          </div>

        </div>

        <div className="bg-yellow-200 rounded p-4">

          <h3 className="font-semibold mb-2">
            Room
          </h3>

          <div className="flex justify-between">
            <span>Invoice Pending</span>
            <span>
              {tables.filter((t) => t.status === "due").length}
            </span>
          </div>

        </div>

      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b pb-2 text-sm">

        <button className="font-semibold text-blue-600">
          All Tables
        </button>

        <button>In Room Dining</button>
        <button>Foods of Heaven</button>
        <button>POOL SIDE CAFE</button>
        <button>Restaurant</button>
        <button>House keeping</button>
        <button>pvt</button>

      </div>

      {/* Table Grid */}

      <div className="grid grid-cols-6 gap-4">

        {tables.map((table, i) => (

          <div
            key={i}
            onClick={() => navigate(`/restaurant/menu/${table.name}`)}
            className={`p-3 rounded border cursor-pointer ${getColor(table.status)}`}
          >

            <div className="font-semibold mb-2 text-center">
              {table.name}
            </div>

            {table.status === "due" && (
              <div className="text-xs text-center mb-2">
                Due : ₹{table.amount}
              </div>
            )}

            {/* Buttons */}

            <div className="flex flex-wrap gap-1 justify-center text-xs">

              <button
                className="bg-teal-500 text-white px-2 py-1 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/restaurant/token/${table.name}`);
                }}
              >
                + Token
              </button>

              <button className="bg-purple-500 text-white px-2 py-1 rounded">
                + NC Token
              </button>

              {table.status === "running" && (
                <>
                  <button className="bg-blue-500 text-white px-2 py-1 rounded">
                    Token Items
                  </button>

                  <button className="bg-red-500 text-white px-2 py-1 rounded">
                    Create Invoice
                  </button>
                </>
              )}

              {table.status === "due" && (
                <>
                  <button className="bg-yellow-500 text-white px-2 py-1 rounded">
                    Print
                  </button>

                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/restaurant/payment`);
                    }}
                  >
                    Payment
                  </button>

                  <button className="bg-gray-500 text-white px-2 py-1 rounded">
                    Transfer
                  </button>
                </>
              )}

            </div>

          </div>

        ))}

      </div>

    </div>
  );
};

export default TablePage;