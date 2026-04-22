import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePendingOrdersCount } from "../hooks/usePendingOrdersCount";
import {
  FaConciergeBell,
  FaCashRegister,
  FaClipboardList,
  FaLayerGroup,
  FaExternalLinkAlt,
  FaPlusCircle,
  FaReceipt,
  FaRegCreditCard,
  FaStar,
  FaThLarge,
  FaUtensils,
} from "react-icons/fa";
import { getCurrentActor } from "../utils/currentActor";

const RestaurantPOS = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const actor = getCurrentActor();

  const links = actor.isWaiter
    ? [
        { label: "My Tables", path: "/restaurant", icon: FaThLarge },
        { label: "Payment", path: "/restaurant/payment", icon: FaRegCreditCard },
        { label: "Bills", path: "/restaurant/payment-bills", icon: FaClipboardList },
      ]
    : [
        { label: "Tables", path: "/restaurant", icon: FaThLarge },
        { label: "Payment", path: "/restaurant/payment", icon: FaRegCreditCard },
        { label: "Bills", path: "/restaurant/payment-bills", icon: FaClipboardList },
        { label: "Room Orders", path: "/restaurant/room-items", icon: FaStar },
        { label: "Add Menu", path: "/restaurant/add-menu-item", icon: FaPlusCircle },
      ];

  const isLinkActive = (path) =>
    location.pathname === path ||
    (path !== "/restaurant" && location.pathname.startsWith(`${path}/`));

  const activeLink =
    links.find((link) => isLinkActive(link.path)) ||
    links[0];

  const pendingCount = usePendingOrdersCount();
  const heroStats = [
    {
      label: actor.isWaiter ? "WAITER STATION" : "RESTAURANT + POS",
      value: actor.isWaiter ? "Active Service" : "Active Station",
      icon: FaConciergeBell,
    },
    {
      label: "LIVE QUEUE",
      value: actor.isWaiter ? "Orders In Motion" : `${pendingCount} Pending`,
      icon: FaLayerGroup,
    },
    {
      label: actor.isWaiter ? "BILLING FLOW" : "TABLES TO BILLING",
      value: "Ready to Close",
      icon: FaCashRegister,
    },
  ];

  const heroTitle = actor.isWaiter
    ? "Operational snapshot for waiter"
    : "Operational snapshot for restaurant";

  const heroCopy = actor.isWaiter
    ? "Manage live table activity, kitchen sync, and point-of-sale handoff from one unified waiter workspace."
    : "Manage live floor activity, kitchen sync, and point-of-sale transactions from one unified resort sanctuary.";

  const activeSectionLabel = activeLink?.label || (actor.isWaiter ? "My Tables" : "Tables");

  return (
    <div className="relative isolate w-full overflow-x-hidden bg-[#f5f7fb] p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-blue-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-12%] top-[3%] h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[10%] left-[22%] h-60 w-60 rounded-full bg-sky-100/50 blur-3xl sm:h-80 sm:w-80" />
      </div>

      <div className="w-full space-y-5">
        <section className="overflow-hidden rounded-[26px] border border-stone-200 bg-[linear-gradient(100deg,#fffdf8_0%,#fffaf2_45%,#fdf7ed_100%)] px-6 py-6 shadow-[0_20px_40px_rgba(120,113,108,0.14)] sm:px-7 sm:py-7">
          <div className="space-y-5">
            <div className="max-w-3xl space-y-3">
              <div className="space-y-2">
                <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-slate-900 sm:text-[46px]">
                  {heroTitle}
                </h1>
                <p className="max-w-3xl text-base font-medium leading-7 text-slate-700 sm:text-[19px] sm:leading-8">
                  {heroCopy}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(activeLink.path)}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-base font-bold text-slate-900 shadow-[0_10px_24px_rgba(120,113,108,0.12)] transition hover:-translate-y-0.5"
                >
                  <FaExternalLinkAlt className="text-[15px]" />
                  Open Active Section
                </button>

                {!actor.isWaiter ? (
                  <button
                    type="button"
                    onClick={() => navigate("/kitchen")}
                    className="inline-flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-base font-bold text-slate-900 transition hover:border-stone-300 hover:bg-stone-50"
                  >
                    <FaUtensils className="text-[15px]" />
                    Go To Kitchen
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {heroStats.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-[16px] border border-stone-200 bg-white/90 px-5 py-5 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-[20px] text-slate-700">
                        <Icon />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                          {item.label}
                        </div>
                        <div className="mt-1.5 text-[30px] font-bold leading-tight text-slate-900">
                          {item.value}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[22px] bg-white/86 p-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 backdrop-blur-sm">
          <div className="flex flex-wrap gap-2">
            {links.map((link) => {
              const Icon = link.icon || FaUtensils;
              const active = isLinkActive(link.path);

              return (
                <button
                  key={`${link.path}-${link.label}`}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={`inline-flex items-center gap-2.5 rounded-[14px] px-5 py-3.5 text-base font-bold transition ${
                    active
                      ? "bg-[#1f67df] text-white shadow-[0_12px_20px_rgba(31,103,223,0.22)]"
                      : "bg-[#eef3fb] text-[#36435d] hover:bg-[#e3ebf9]"
                  }`}
                >
                  <Icon className={`text-[16px] ${active ? "text-white" : "text-[#37558a]"}`} />
                  {link.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="rounded-[22px] border border-white/60 bg-white/88 p-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-3">
            <div className="mb-3 flex items-center justify-between rounded-[18px] bg-[linear-gradient(180deg,#f8fbff_0%,#f1f6ff_100%)] px-4 py-3 ring-1 ring-slate-200/70">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6a7a96]">
                  Restaurant Command Center
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#1f2a44]">
                  {activeSectionLabel}
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf2ff] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#1f67df]">
                <FaReceipt className="text-[11px]" />
                Live workspace
              </span>
            </div>
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
};

export default RestaurantPOS;
