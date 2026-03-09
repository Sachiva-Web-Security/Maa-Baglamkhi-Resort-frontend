import React from "react";
import { Outlet } from "react-router-dom";

const RestaurantPOS = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-gray-200 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Restaurant POS</h1>
      <Outlet />
    </div>
  );
};

export default RestaurantPOS;
