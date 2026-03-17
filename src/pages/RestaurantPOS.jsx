import React from "react";
import { FaChartPie, FaClipboardList, FaReceipt, FaUtensils } from "react-icons/fa";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/restaurant", icon: FaChartPie },
  { label: "Tables", path: "/restaurant", icon: FaUtensils },
  { label: "Payment", path: "/restaurant/payment", icon: FaReceipt },
  { label: "Item Consumption", path: "/restaurant/item-consumption", icon: FaClipboardList },
  { label: "Daily Roomwise Food", path: "/restaurant/daily-room-food", icon: FaClipboardList },
  { label: "Daywise Food", path: "/restaurant/daywise-food", icon: FaClipboardList },
  { label: "Transfer Token", path: "/restaurant/transfer-token", icon: FaClipboardList },
];

const RestaurantPOS = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1260px] space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Restaurant Command
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  Restaurant POS with dashboard style theme
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                  Tables, orders, billing aur reports ko ek attractive responsive
                  restaurant workspace se manage karein.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: "Module", value: "Restaurant" },
                { label: "Navigation", value: "Sidebar + Cards" },
                { label: "View", value: "Responsive" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Restaurant Menu
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Quick navigation
              </h2>
            </div>

            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;

                return (
                  <button
                    key={`${item.label}-${item.path}`}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`flex w-full items-start gap-3 rounded-[20px] border px-4 py-3 text-left transition ${
                      active
                        ? "border-cyan-400 bg-[linear-gradient(135deg,#0b2748_0%,#103b4d_55%,#18465a_100%)] text-white shadow-[0_16px_35px_rgba(14,165,233,0.16)]"
                        : "border-slate-200/80 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-cyan-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 rounded-2xl p-2 ${
                        active ? "bg-white/10 text-white" : "bg-cyan-50 text-cyan-700"
                      }`}
                    >
                      <Icon />
                    </span>
                    <span className="text-sm font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="rounded-[26px] border border-white/60 bg-white/72 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-4">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPOS;
