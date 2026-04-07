import { useState } from "react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaBoxes,
  FaBroom,
  FaChartBar,
  FaClipboardList,
  FaFire,
  FaGlassCheers,
  FaHistory,
  FaHome,
  FaHotel,
  FaTasks,
  FaUser,
  FaUserCheck,
  FaUtensils,
  FaWallet,
} from "react-icons/fa";

import { getRoleHome } from "../../utils/roleHome";

const Sidebar = ({ isMobile, sidebarOpen, setSidebarOpen, footerOverlap = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredControl, setHoveredControl] = useState(null);

  const clearHoveredStates = () => {
    setHoveredItem(null);
    setHoveredControl(null);
  };

  const isControlHighlighted = (control) => hoveredControl === control;
  const isItemHighlighted = (id, active) => active || hoveredItem === id;

  const handlePointerHover = (value) => (event) => {
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      value === "menu" || value === "avatar"
        ? setHoveredControl(value)
        : setHoveredItem(value);
    }
  };

  const clearPointerHover = (value) => (event) => {
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      value === "menu" || value === "avatar"
        ? setHoveredControl((current) => (current === value ? null : current))
        : setHoveredItem((current) => (current === value ? null : current));
    }
  };

  const role = (localStorage.getItem("role") || "").toLowerCase();
  const userName = localStorage.getItem("name") || "User";
  const avatarUrl = localStorage.getItem("avatarUrl") || "";
  const dashboardPath = getRoleHome(role);

  const roleMenuMap = {
    admin: [
      { id: 2, name: "Attendance", icon: FaUserCheck, path: "/attendance" },
      { id: 3, name: "Hotel", icon: FaHotel, path: "/hotel" },
      { id: 4, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 5, name: "Kitchen", icon: FaFire, path: "/kitchen" },
      { id: 6, name: "Accounts", icon: FaWallet, path: "/accounts" },
      { id: 7, name: "Inventory", icon: FaBoxes, path: "/inventory" },
      { id: 8, name: "Housekeeping", icon: FaBroom, path: "/housekeeping" },
      { id: 9, name: "Assignments", icon: FaTasks, path: "/assignments" },
      { id: 10, name: "Banquet", icon: FaGlassCheers, path: "/banquet" },
      { id: 11, name: "Reports", icon: FaChartBar, path: "/reports" },
      { id: 12, name: "Audit Logs", icon: FaHistory, path: "/reports/audit" },
      { id: 13, name: "User Management", icon: FaUserCheck, path: "/user" },
    ],
    manager: [
      { id: 2, name: "All Bookings", icon: FaHotel, path: "/hotel/all-bookings" },
      { id: 3, name: "Accounts", icon: FaWallet, path: "/accounts" },
      { id: 4, name: "Reports", icon: FaChartBar, path: "/reports" },
      { id: 5, name: "Inventory", icon: FaBoxes, path: "/inventory" },
      { id: 6, name: "Housekeeping", icon: FaBroom, path: "/housekeeping" },
      { id: 7, name: "Banquet", icon: FaGlassCheers, path: "/banquet" },
      { id: 8, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 14, name: "Audit Logs", icon: FaHistory, path: "/reports/audit" },
    ],
    receptionist: [
      { id: 2, name: "Guest Booking", icon: FaHotel, path: "/hotel/guest" },
      { id: 3, name: "All Bookings", icon: FaClipboardList, path: "/hotel/all-bookings" },
      { id: 4, name: "Check-In / Out", icon: FaTasks, path: "/hotel/communication" },
      { id: 5, name: "Guest List", icon: FaUserCheck, path: "/hotel/booking-history" },
      { id: 6, name: "Inventory", icon: FaBoxes, path: "/inventory" },
      { id: 7, name: "Banquet", icon: FaGlassCheers, path: "/banquet" },
      { id: 8, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
    ],
    housekeeping: [
      { id: 2, name: "Room Status", icon: FaBroom, path: "/housekeeping" },
      { id: 3, name: "Dirty Rooms", icon: FaTasks, path: "/housekeeping" },
      { id: 4, name: "Assignments", icon: FaClipboardList, path: "/assignments" },
      { id: 5, name: "Cleaned Rooms", icon: FaUserCheck, path: "/housekeeping" },
    ],
    accountant: [
      { id: 2, name: "Accounts", icon: FaWallet, path: "/accounts" },
      { id: 3, name: "Assignments", icon: FaTasks, path: "/assignments" },
      { id: 4, name: "Reports", icon: FaChartBar, path: "/reports" },
      { id: 5, name: "Inventory", icon: FaBoxes, path: "/inventory" },
      { id: 6, name: "Audit Logs", icon: FaHistory, path: "/reports/audit" },
    ],
    kitchen: [
      { id: 2, name: "Kitchen Orders", icon: FaFire, path: "/kitchen" },
      { id: 3, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 4, name: "Inventory", icon: FaBoxes, path: "/inventory" },
    ],
    waiter: [
      { id: 2, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 3, name: "Tables", icon: FaClipboardList, path: "/restaurant" },
      { id: 4, name: "Orders", icon: FaTasks, path: "/restaurant" },
      { id: 5, name: "Billing", icon: FaWallet, path: "/restaurant/payment-bills" },
    ],
    staff: [
      { id: 2, name: "Assignments", icon: FaTasks, path: "/assignments" },
    ],
  };

  const menuItems = [
    { id: 1, name: "Dashboard", icon: FaHome, path: dashboardPath },
    ...(roleMenuMap[role] || []),
    { id: 99, name: "My Profile", icon: FaUser, path: "/profile" },
  ];

  const handleNavClick = (path) => {
    navigate(path);

    if (isMobile) {
      setSidebarOpen(false);
      return;
    }

    if (!sidebarOpen && setSidebarOpen) {
      setSidebarOpen(true);
    }
  };

  const isActive = (path) => {
    if (location.pathname === path) {
      return true;
    }

    return Boolean(matchPath({ path: `${path}/*`, end: false }, location.pathname));
  };

  const showLabels = sidebarOpen;

  return (
    <>
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 left-[88px] top-[70px] z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          desktop-scale-sidebar
          fixed left-0 top-[70px] z-40
          flex translate-x-0 flex-col
          border-r border-slate-800/80 bg-[linear-gradient(180deg,#07111f_0%,#0b1728_52%,#09101b_100%)]
          text-gray-800 shadow-[0_18px_40px_rgba(2,8,23,0.45)]
          transition-all duration-300 ease-in-out
          overflow-hidden
          ${sidebarOpen ? "w-[250px]" : "w-[88px]"}
        `}
        style={{
          height: isMobile
            ? "145vh"
            : `calc(100dvh - 70px - ${Math.max(0, footerOverlap)}px)`,
        }}
      >
        <style>{`
          .sidebar-scroll::-webkit-scrollbar { width: 6px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: #0f172a; }
          .sidebar-scroll::-webkit-scrollbar-thumb { background: #192034; border-radius: 10px; }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #1d4ed8; }
        `}</style>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_30%)]" />

        <div className={`relative mt-4 shrink-0 border-b border-white/10 ${showLabels ? "px-4 pt-2 pb-3" : "px-3 py-4"}`}>
          <button
            type="button"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            onClick={() => setSidebarOpen((prev) => !prev)}
            onMouseEnter={() => setHoveredControl("menu")}
            onMouseMove={() => setHoveredControl("menu")}
            onMouseLeave={() => setHoveredControl(null)}
            onPointerEnter={handlePointerHover("menu")}
            onPointerMove={handlePointerHover("menu")}
            onPointerLeave={clearPointerHover("menu")}
            onFocus={() => setHoveredControl("menu")}
            onBlur={() => setHoveredControl(null)}
            onTouchStart={() => setHoveredControl("menu")}
            onTouchEnd={clearHoveredStates}
            onTouchCancel={clearHoveredStates}
            className={`flex items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-all duration-300 hover:border-blue-400 hover:bg-blue-600 active:border-blue-400 active:bg-blue-600 focus-visible:border-blue-400 focus-visible:bg-blue-600 ${
              showLabels ? "w-full justify-start gap-3 px-4 py-3" : "w-full justify-center px-3 py-3"
            } ${
              isControlHighlighted("menu")
                ? "border-blue-400 bg-blue-600 shadow-[0_14px_28px_rgba(37,99,235,0.3)]"
                : ""
            }`}
          >
            <span className="text-xl text-blue-300">
              <FaBars />
            </span>
            {showLabels ? <span className="text-sm font-semibold tracking-wide leading-none">Menu</span> : null}
          </button>
        </div>

        <nav className={`sidebar-scroll relative min-h-0 flex-1 space-y-2.5 overflow-y-auto font-bold ${showLabels ? "px-4 py-3" : "px-3 py-3"}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const hovered = hoveredItem === item.id;
            const highlighted = isItemHighlighted(item.id, active);

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseMove={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onPointerEnter={handlePointerHover(item.id)}
                onPointerMove={handlePointerHover(item.id)}
                onPointerLeave={clearPointerHover(item.id)}
                onFocus={() => setHoveredItem(item.id)}
                onBlur={() => setHoveredItem(null)}
                onTouchStart={() => setHoveredItem(item.id)}
                onTouchEnd={clearHoveredStates}
                onTouchCancel={clearHoveredStates}
                title={!showLabels ? item.name : undefined}
                  className={`
                  group flex w-full cursor-pointer items-center rounded-2xl border transition-all duration-300
                  ${showLabels ? "justify-start gap-3 px-4 py-3" : "justify-center px-3 py-3"}
                  ${
                    highlighted
                      ? "border-blue-400/60 bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.3)]"
                      : "border-transparent bg-white/[0.03] text-slate-200 hover:border-blue-400/40 hover:bg-blue-600 hover:text-white hover:shadow-[0_14px_28px_rgba(37,99,235,0.25)]"
                  }
                  ${hovered && !active ? "scale-[1.01] border-blue-400/40 bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.3)]" : ""}
                `}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                    highlighted
                      ? "bg-white/18 text-white"
                      : "bg-slate-800/80 text-slate-100 group-hover:bg-white/18 group-hover:text-white"
                  }`}
                >
                  <Icon className="text-base" />
                </span>
                {showLabels ? (
                  <span className="text-left text-base font-semibold leading-tight text-white">
                    {item.name}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className={`relative mt-6 shrink-0 bg-transparent px-3 pb-3 pt-2 ${showLabels ? "" : "flex justify-center"}`}>
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            onMouseEnter={() => setHoveredControl("avatar")}
            onMouseMove={() => setHoveredControl("avatar")}
            onMouseLeave={() => setHoveredControl(null)}
            onPointerEnter={handlePointerHover("avatar")}
            onPointerMove={handlePointerHover("avatar")}
            onPointerLeave={clearPointerHover("avatar")}
            onFocus={() => setHoveredControl("avatar")}
            onBlur={() => setHoveredControl(null)}
            onTouchStart={() => setHoveredControl("avatar")}
            onTouchEnd={clearHoveredStates}
            onTouchCancel={clearHoveredStates}
            title={!showLabels ? userName : undefined}
            className={`flex w-full items-center rounded-2xl border border-white/10 transition-all duration-300 ${
              showLabels
                ? "cursor-pointer gap-3 bg-white/[0.04] p-2.5 text-left hover:bg-blue-600"
                : "cursor-pointer justify-center bg-white/[0.04] p-2 hover:bg-blue-600"
            } ${
              isControlHighlighted("avatar")
                ? "border-blue-400 bg-blue-600 shadow-[0_14px_28px_rgba(37,99,235,0.3)]"
                : ""
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white ring-1 ring-white/10">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                (userName || "U").charAt(0).toUpperCase()
              )}
            </div>
            {showLabels ? (
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-tight text-white">{userName}</p>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-blue-200/90">
                  {role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}
                </p>
              </div>
            ) : null}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
