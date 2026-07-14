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
        { label: "Room Orders", path: "/restaurant/room-items", icon: FaStar },
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
    ? "Operational snapshot for Waiter"
    : "Operational snapshot for Restaurant";

  const heroCopy = actor.isWaiter      
    ? "Manage live table activity, kitchen sync, and point-of-sale handoff from one unified waiter workspace."
    : "Manage live floor activity, kitchen sync, and point-of-sale transactions from one unified resort sanctuary.";

  const activeSectionLabel = activeLink?.label || (actor.isWaiter ? "My Tables" : "Tables");

  return (
    <div className="relative isolate w-full overflow-x-hidden bg-[#f4f7fc] p-3 sm:p-5 lg:p-6">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-blue-200/40 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-12%] top-[3%] h-80 w-80 rounded-full bg-sky-200/40 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[10%] left-[22%] h-60 w-60 rounded-full bg-blue-100/50 blur-3xl sm:h-80 sm:w-80" />
      </div>

      <div className="w-full space-y-6">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-950 via-blue-900 via-blue-700 to-sky-500 px-6 py-8 shadow-[0_25px_50px_-12px_rgba(23,54,120,0.35)] sm:px-9 sm:py-9">
          {/* subtle background pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "26px 26px",
            }}
          />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

          <div className="relative space-y-6">
            <div className="max-w-3xl space-y-3">
              <div className="space-y-2.5">
                <h1 className="text-[32px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[46px]">
                  {heroTitle}
                </h1>
                <p className="max-w-3xl text-[18px] font-medium leading-8 text-blue-50/90 sm:text-[20px] sm:leading-8">
                  {heroCopy}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => navigate(activeLink.path)}
                  className="inline-flex h-[52px] items-center gap-2.5 rounded-2xl bg-white px-6 text-[17px] font-bold text-[#1155b6] shadow-[0_12px_28px_rgba(7,23,65,0.20)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(7,23,65,0.26)] active:translate-y-0"
                >
                  <FaExternalLinkAlt className="text-[16px]" />
                  Open Active Section
                </button>

                {!actor.isWaiter ? (
                  <button
                    type="button"
                    onClick={() => navigate("/kitchen")}
                    className="inline-flex h-[52px] items-center gap-2.5 rounded-2xl border border-white/25 bg-white/10 px-6 text-[17px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:bg-white/18"
                  >
                    <FaUtensils className="text-[16px]" />
                    Go To Kitchen
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {heroStats.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-[20px] border border-white/15 bg-white/10 px-5 py-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition hover:bg-white/[0.13]"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[20px] text-white ring-1 ring-white/10">
                        <Icon />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold uppercase tracking-[0.1em] text-blue-50/80">
                          {item.label}
                        </div>
                        <div className="mt-1.5 text-[28px] font-bold leading-tight text-white sm:text-[30px]">
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

        {/* NAV TABS */}
        <section className="rounded-[24px] bg-white/90 p-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-blue-100/70 backdrop-blur-sm">
          <div className="flex flex-wrap gap-2.5">
            {links.map((link) => {
              const Icon = link.icon || FaUtensils;
              const active = isLinkActive(link.path);

              return (
                <button
                  key={`${link.path}-${link.label}`}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={`inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-[16px] font-bold transition duration-200 sm:text-[17px] ${
                    active
                      ? "bg-gradient-to-r from-blue-700 to-sky-500 text-white shadow-[0_10px_22px_rgba(31,103,223,0.28)]"
                      : "bg-[#eef3fb] text-[#3c4a68] hover:bg-[#e2ebfa] hover:text-[#1f2a44]"
                  }`}
                >
                  <Icon className={`text-[16px] ${active ? "text-white" : "text-[#3f6099]"}`} />
                  {link.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* COMMAND CENTER / OUTLET */}
        <section>
          <div className="rounded-[26px] border border-blue-100/60 bg-white/90 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-gradient-to-b from-[#f8fbff] to-[#eef4ff] px-5 py-4 ring-1 ring-blue-100/70">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#6a7a96]">
                  Restaurant Command Center
                </p>
                <h2 className="mt-1 text-[30px] font-bold leading-tight text-[#1f2a44] sm:text-[32px]">
                  {activeSectionLabel}
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf2ff] px-4 py-2 text-[15px] font-bold uppercase tracking-[0.08em] text-[#1f67df] ring-1 ring-blue-100 sm:text-[16px]">
                <FaReceipt className="text-[13px]" />
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