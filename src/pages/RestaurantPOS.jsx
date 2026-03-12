import React from "react";
import { Link, Outlet } from "react-router-dom";

const RestaurantPOS = () => {
  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar */}
      <div className="w-64 bg-white border-r">

        <div className="p-4 font-bold text-lg border-b">
          Restaurant POS
        </div>

        <ul className="p-2 space-y-2 text-sm">

          <li><Link to="/restaurant/dashboard">Dashboard</Link></li>

          <li><Link to="/restaurant/tables">Tables</Link></li>

          <li><Link to="/restaurant/tokens">Tokens</Link></li>

          <li><Link to="/restaurant/deleted-tokens">Deleted Token Items</Link></li>

          <li><Link to="/restaurant/transfer-token">Transfer Token</Link></li>

          <li><Link to="/restaurant/invoices">Invoices</Link></li>

          <li><Link to="/restaurant/nc-statements">NC Statements</Link></li>

          <li><Link to="/restaurant/settlement">Settlement Report</Link></li>

          <li><Link to="/restaurant/item-consumption">Item Consumption Report</Link></li>

          <li><Link to="/restaurant/daily-roomwise">Daily Roomwise Food Sale Report</Link></li>

          <li><Link to="/restaurant/daywise-food">Daywise Food Report</Link></li>

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