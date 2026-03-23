import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FaBookOpen,
  FaCashRegister,
  FaExchangeAlt,
  FaListAlt,
  FaReceipt,
  FaStore,
  FaUtensils,
} from "react-icons/fa";

const links = [
  { label: "Dashboard", path: "/restaurant", icon: FaStore },
  { label: "Tables", path: "/restaurant", icon: FaUtensils },
  { label: "Payment", path: "/restaurant/payment", icon: FaReceipt },
  { label: "Recipe Master", path: "/restaurant/recipe-master", icon: FaBookOpen },
  { label: "Item Consumption", path: "/restaurant/item-consumption", icon: FaListAlt },
  {
    label: "Daily Roomwise Food Report",
    path: "/restaurant/daily-room-food",
    icon: FaCashRegister,
  },
  { label: "Room Items", path: "/restaurant/room-items", icon: FaUtensils },
  { label: "Daywise Food Report", path: "/restaurant/daywise-food", icon: FaReceipt },
  { label: "Transfer Restaurant Token", path: "/restaurant/transfer-token", icon: FaExchangeAlt },
];

const RestaurantPOS = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeLink =
    links.find((link) => location.pathname === link.path) ||
    links.find((link) => location.pathname.startsWith(link.path) && link.path !== "/restaurant") ||
    links[0];

  const heroStats = [
    { label: "Service Zone", value: "Restaurant + POS" },
    { label: "Kitchen Sync", value: "Live Queue" },
    { label: "Action Flow", value: "Tables to Billing" },
  ];

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 transition-all duration-300 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1280px] space-y-7">
        <section className="overflow-hidden rounded-[26px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-4 py-5 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-6 sm:py-6 lg:px-8">
          <div className="relative z-[1] grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] lg:items-center">
            <div className="space-y-3">
              <p className="text-[7px] font-semibold uppercase tracking-[0.26em] text-cyan-200 sm:text-[10px]">
                Resort Command Center
              </p>
              <div className="space-y-1">
                <h1 className="text-[1.25rem] font-black leading-[1.02] text-white sm:text-[2.4rem]">
                  Operational snapshot for restaurant
                </h1>
                <p className="max-w-3xl text-[12px] leading-5 text-slate-100/88 sm:text-[14px] sm:leading-6">
                  Track tables, billing flow, room orders, and menu activity from the same dashboard theme used across hotel operations.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(activeLink.path)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5"
                >
                  <FaUtensils className="text-cyan-600" />
                  Open Active Section
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/kitchen")}
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md"
                >
                  Go To Kitchen
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[26px] border border-white/60 bg-white/76 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Restaurant Menu
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Quick sections</h2>
            </div>
            <div className="space-y-2">
              {links.map((link) => {
                const Icon = link.icon || FaUtensils;
                const active = location.pathname === link.path;

                return (
                  <button
                    key={`${link.path}-${link.label}`}
                    type="button"
                    onClick={() => navigate(link.path)}
                    className={`flex w-full items-start gap-3 rounded-[20px] border px-4 py-3 text-left transition hover:-translate-y-0.5 ${
                      active
                        ? "border-cyan-300 bg-cyan-50/80 shadow-[0_12px_28px_rgba(8,145,178,0.10)]"
                        : "border-slate-200/80 bg-white hover:border-cyan-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 rounded-2xl p-2 ${
                        active ? "bg-cyan-100 text-cyan-700" : "bg-cyan-50 text-cyan-700"
                      }`}
                    >
                      <Icon />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-900">{link.label}</span>
                      <span className="block text-xs text-slate-500">
                        {active ? "Currently open" : "Open this section"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="rounded-[26px] border border-white/60 bg-white/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
};

export default RestaurantPOS;
