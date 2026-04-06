import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FaCashRegister,
  FaReceipt,
  FaStore,
  FaUtensils,
  FaBed,
} from "react-icons/fa";

const links = [
  { label: "Tables", path: "/restaurant", icon: FaUtensils },
  { label: "Payment", path: "/restaurant/payment", icon: FaReceipt },
  { label: "Bills", path: "/restaurant/payment-bills", icon: FaCashRegister },
  { label: "Room Orders", path: "/restaurant/room-items", icon: FaBed },
  { label: "Add Menu", path: "/restaurant/add-menu-item", icon: FaStore },
];

const RestaurantPOS = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeLink =
    links.find((link) => location.pathname === link.path) ||
    links.find(
      (link) =>
        location.pathname.startsWith(link.path) && link.path !== "/restaurant",
    ) ||
    links[0];

  const heroStats = [
    { label: "Service Zone", value: "Restaurant + POS" },
    { label: "Kitchen Sync", value: "Live Queue" },
    { label: "Action Flow", value: "Tables to Billing" },
  ];
  return (
    <div className="relative isolate w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-3 transition-all duration-300 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="w-full space-y-3">
        <section className="overflow-hidden rounded-[20px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-3 py-2.5 shadow-[0_14px_32px_rgba(15,23,42,0.10)] sm:px-4 sm:py-3">
          <div className="relative z-[1] space-y-2.5">
            <div className="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-200 sm:text-base">
                Resort Command Center
                </p>
                <div className="space-y-1">
                  <h1 className="text-2xl font-black leading-tight text-white sm:text-4xl">
                  Operational snapshot for restaurant
                  </h1>
                  <p className="max-w-3xl text-base leading-6 text-slate-100/88 sm:text-xl sm:leading-8">
                  Track tables, billing flow, room orders, and menu activity
                  from the same dashboard theme used across hotel operations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(activeLink.path)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-bold text-slate-900 shadow-[0_10px_22px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5"
                  >
                    <FaUtensils className="text-cyan-600" />
                    Open Active Section
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/kitchen")}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-base font-semibold text-white backdrop-blur-md"
                  >
                    Go To Kitchen
                  </button>
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:w-[480px]">
                {heroStats.map((item) => (
                  <div
                    key={item.label}
                    className="min-w-0 rounded-[14px] border border-white/12 bg-white/10 px-3 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                  >
                    <span className="block text-xs font-medium text-slate-100/75 sm:text-sm">
                      {item.label}
                    </span>
                    <div className="mt-2 break-words text-lg font-bold leading-snug sm:text-xl xl:text-2xl">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[16px] border border-white/12 bg-white/10 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-base font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Quick Sections
                </p>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {links.map((link) => {
                    const Icon = link.icon || FaUtensils;
                    const active = location.pathname === link.path;

                    return (
                      <button
                        key={`${link.path}-${link.label}`}
                        type="button"
                        onClick={() => navigate(link.path)}
                        className={`flex items-center gap-2 rounded-[12px] border px-3 py-2 text-left transition hover:-translate-y-0.5 ${
                          active
                            ? "border-cyan-300 bg-cyan-50/90 text-slate-900 shadow-[0_12px_28px_rgba(8,145,178,0.10)]"
                            : "border-white/12 bg-white/90 text-slate-900 hover:border-cyan-300"
                        }`}
                      >
                        <span
                          className={`mt-0.5 rounded-2xl p-2 ${
                            active
                              ? "bg-cyan-100 text-cyan-700"
                              : "bg-cyan-50 text-cyan-700"
                          }`}
                        >
                          <Icon />
                        </span>
                        <span>
                          <span className="block text-xl font-bold leading-tight">
                            {link.label}
                          </span>
                          <span className="block text-base text-slate-500">
                            {active ? "Currently open" : "Open this section"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-[22px] border border-white/60 bg-white/80 p-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-3">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
};

export default RestaurantPOS;
