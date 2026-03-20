import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const links = [
  { label: "Dashboard", path: "/restaurant" },
  { label: "Tables", path: "/restaurant" },
  { label: "Payment", path: "/restaurant/payment" },
  { label: "Recipe Master", path: "/restaurant/recipe-master" },
  { label: "Item Consumption", path: "/restaurant/item-consumption" },
  { label: "Daily Roomwise Food Report", path: "/restaurant/daily-room-food" },
  { label: "Room Items", path: "/restaurant/room-items" },
  { label: "Daywise Food Report", path: "/restaurant/daywise-food" },
  { label: "Transfer Restaurant Token", path: "/restaurant/transfer-token" },
];

const RestaurantPOS = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      
      {/* Top Navbar */}
      <div className="sticky top-0 z-20 backdrop-blur-lg bg-slate-900/70 border-b border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-3">
          
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                Maa Baglamukhi Resort
              </p>
              <h1 className="text-2xl font-bold text-white">
                Restaurant POS
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-2 text-sm text-slate-300">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                Fast Actions
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                Tables · Rooms · Kitchen
              </span>
            </div>

          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap gap-2">
            {links.map((link) => {
              const active = location.pathname === link.path;

              return (
                <button
                  key={`${link.path}-${link.label}`}
                  onClick={() => navigate(link.path)}
                  className={`text-sm px-3 py-2 rounded-full border transition-all duration-200 ${
                    active
                      ? "bg-white text-slate-900 border-white shadow-lg shadow-blue-500/30"
                      : "bg-white/5 text-white border-white/15 hover:border-white/40 hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Page Content */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-3xl bg-white text-slate-900 shadow-2xl shadow-blue-500/10 border border-slate-100/70">
          <div className="p-6 md:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPOS;
