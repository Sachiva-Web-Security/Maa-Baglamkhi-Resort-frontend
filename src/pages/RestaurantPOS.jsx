import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePendingOrdersCount } from "../hooks/usePendingOrdersCount";
import {
  FaClipboardList,
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
  const activeSectionLabel = activeLink?.label || (actor.isWaiter ? "My Tables" : "Tables");
  const isTablesRoute = location.pathname === "/restaurant";

  return (
    <div className="restaurant-workspace relative isolate h-[calc(100dvh-70px)] w-full overflow-hidden bg-[#f5f7fb] p-2 sm:p-3 lg:p-3.5">
      <div className="flex h-full min-h-0 w-full flex-col gap-1.5">
        <section className="rounded-[14px] border border-slate-200 bg-white/92 px-2.5 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:px-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf2ff] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#1f67df]">
              <FaReceipt className="text-[11px]" />
              {activeSectionLabel}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {actor.isWaiter ? "Orders In Motion" : `${pendingCount} Pending`}
            </span>
            <button
              type="button"
              onClick={() => navigate(activeLink.path)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900 transition hover:bg-stone-50"
            >
              <FaExternalLinkAlt className="text-[11px]" />
              Open
            </button>
            {!actor.isWaiter ? (
              <button
                type="button"
                onClick={() => navigate("/kitchen")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900 transition hover:bg-stone-50"
              >
                <FaUtensils className="text-[11px]" />
                Kitchen
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-[14px] bg-white/86 p-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70 backdrop-blur-sm">
          <div className="flex flex-wrap gap-1.5">
            {links.map((link) => {
              const Icon = link.icon || FaUtensils;
              const active = isLinkActive(link.path);

              return (
                <button
                  key={`${link.path}-${link.label}`}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? "bg-[#1f67df] text-white shadow-[0_12px_20px_rgba(31,103,223,0.22)]"
                      : "bg-[#eef3fb] text-[#36435d] hover:bg-[#e3ebf9]"
                  }`}
                >
                  <Icon className={`text-[11px] ${active ? "text-white" : "text-[#37558a]"}`} />
                  {link.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="min-h-0 flex-1">
          <div className="flex h-full min-h-0 flex-col rounded-[16px] border border-white/60 bg-white/88 p-1.5 shadow-[0_10px_20px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-2">
            <div className="mb-1.5 flex items-center justify-between rounded-[12px] bg-[linear-gradient(180deg,#f8fbff_0%,#f1f6ff_100%)] px-2.5 py-1.5 ring-1 ring-slate-200/70">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a7a96]">
                  Restaurant Command Center
                </p>
                <h2 className="text-sm font-bold text-[#1f2a44]">
                  {activeSectionLabel}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf2ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#1f67df]">
                <FaReceipt className="text-[10px]" />
                Live workspace
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <Outlet />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RestaurantPOS;
