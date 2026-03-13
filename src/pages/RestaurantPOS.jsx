import React from "react";
import { Outlet, useNavigate } from "react-router-dom";

const RestaurantPOS = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar */}
      <div className="w-64 bg-white border-r">

        <div className="p-4 font-bold text-lg border-b">
          Restaurant POS
        </div>

        <ul className="p-2 space-y-2 text-sm">

          <li
            className="cursor-pointer hover:bg-gray-200 p-2 rounded"
            onClick={() => navigate("/restaurant")}
          >
            Dashboard
          </li>

          <li
            className="cursor-pointer hover:bg-gray-200 p-2 rounded"
            onClick={() => navigate("/restaurant")}
          >
            Tables
          </li>

          <li
            className="cursor-pointer hover:bg-gray-200 p-2 rounded"
            onClick={() => navigate("/restaurant/payment")}
          >
            Payment
          </li>

        </ul>

      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <Outlet />
      </div>

    </div>
  );
};

export default RestaurantPOS;