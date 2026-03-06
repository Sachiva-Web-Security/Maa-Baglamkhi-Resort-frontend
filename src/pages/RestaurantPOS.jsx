import React from "react";
import { Outlet } from "react-router-dom";

const RestaurantPOS = () => {
  return (
    <div>
      <h1>Restaurant POS</h1>
      <Outlet />
    </div>
  );
};

export default RestaurantPOS;