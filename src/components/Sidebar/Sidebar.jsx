import { useState } from "react";
import { matchPath, useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaUserCheck,
  FaHotel,
  FaUtensils,
  FaWallet,
  FaBoxes,
  FaBroom,
  FaGlassCheers,
  FaChartBar,
  FaUser,
  FaFire,
  FaTasks,
  FaBars,
  FaHistory,
} from "react-icons/fa";

const Sidebar = ({ isMobile, sidebarOpen, setSidebarOpen }) => {
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

  let roleMenus = [];

  if (role === "admin") {
    roleMenus = [
      { id: 2, name: "Attendance", icon: FaUserCheck, path: "/attendance" },
      { id: 3, name: "Hotel", icon: FaHotel, path: "/hotel" },
      { id: 4, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 12, name: "Kitchen", icon: FaFire, path: "/kitchen" },
      { id: 5, name: "Accounts", icon: FaWallet, path: "/accounts" },
      { id: 6, name: "Inventory", icon: FaBoxes, path: "/inventory" },
      { id: 7, name: "Housekeeping", icon: FaBroom, path: "/housekeeping" },
      { id: 13, name: "Assignments", icon: FaTasks, path: "/assignments" },
      { id: 8, name: "Banquet", icon: FaGlassCheers, path: "/banquet" },
      { id: 9, name: "Reports", icon: FaChartBar, path: "/reports" },
      { id: 14, name: "Audit Logs", icon: FaHistory, path: "/reports/audit" },
      { id: 11, name: "User Management", icon: FaUserCheck, path: "/user" },
    ];
  } else if (role === "waiter") {
    roleMenus = [
      { id: 2, name: "Attendance", icon: FaUserCheck, path: "/attendance" },
      { id: 3, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
    ];
  } else if (role === "receptionist") {
    roleMenus = [
      { id: 2, name: "Attendance", icon: FaUserCheck, path: "/attendance" },
      { id: 3, name: "Hotel", icon: FaHotel, path: "/hotel" },
      { id: 4, name: "Banquet", icon: FaGlassCheers, path: "/banquet" },
    ];
  } else if (role === "housekeeping") {
    roleMenus = [
      { id: 2, name: "Housekeeping", icon: FaBroom, path: "/housekeeping" },
      { id: 13, name: "Assignments", icon: FaTasks, path: "/assignments" },
    ];
  } else if (role === "accountant") {
    roleMenus = [
      { id: 2, name: "Accounts", icon: FaWallet, path: "/accounts" },
      { id: 3, name: "Reports", icon: FaChartBar, path: "/reports" },
    ];
  } else if (role === "kitchen") {
    roleMenus = [
      { id: 12, name: "Kitchen", icon: FaFire, path: "/kitchen" },
      { id: 2, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 3, name: "Inventory", icon: FaBoxes, path: "/inventory" },
    ];
  } else if (role === "manager" || role === "staff") {
    roleMenus = [
      { id: 2, name: "Attendance", icon: FaUserCheck, path: "/attendance" },
      { id: 3, name: "Hotel", icon: FaHotel, path: "/hotel" },
      { id: 4, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 12, name: "Kitchen", icon: FaFire, path: "/kitchen" },
      { id: 5, name: "Accounts", icon: FaWallet, path: "/accounts" },
      { id: 6, name: "Inventory", icon: FaBoxes, path: "/inventory" },
      { id: 7, name: "Housekeeping", icon: FaBroom, path: "/housekeeping" },
      { id: 13, name: "Assignments", icon: FaTasks, path: "/assignments" },
    ];

    if (role === "manager") {
      roleMenus.push({ id: 14, name: "Audit Logs", icon: FaHistory, path: "/reports/audit" });
    }
  }

  const menuItems = [
    { id: 1, name: "Dashboard", icon: FaHome, path: "/dashboard" },
    { id: 99, name: "My Profile", icon: FaUser, path: "/profile" },
    ...roleMenus,
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

    return Boolean(
      matchPath({ path: `${path}/*`, end: false }, location.pathname),
    );
  };
  const showLabels = sidebarOpen;

  return (
    <>
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 top-[70px] left-[88px] bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
      fixed top-[70px] left-0
      h-[calc(100vh-70px)]
      flex flex-col justify-between
      text-gray-800
      bg-[linear-gradient(180deg,#081225_0%,#0b1730_55%,#09101f_100%)]
      border-r border-white/10
      shadow-[0_18px_40px_rgba(2,8,23,0.45)] 
      z-40
      transition-all duration-300 ease-in-out
      ${sidebarOpen ? "w-[250px]" : "w-[88px]"}
      translate-x-0
    `}
      >
        <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #192034;
          border-radius: 10px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #1d4ed8;
        }
      `}</style>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_30%)]"></div>
        <div
          className={`relative border-b border-white/10 ${
            showLabels ? "px-4 py-4" : "px-3 py-4"
          }`}
        >
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
            className={`flex items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-all duration-300 hover:bg-blue-600 hover:border-blue-400 active:bg-blue-600 active:border-blue-400 focus-visible:bg-blue-600 focus-visible:border-blue-400 ${
              showLabels
                ? "w-full gap-3 justify-start px-4 py-3"
                : "w-full justify-center px-3 py-3"
            } ${
              isControlHighlighted("menu")
                ? "bg-blue-600 border-blue-400 shadow-[0_14px_28px_rgba(37,99,235,0.3)]"
                : ""
            }`}
          >
            <span className="text-xl text-blue-300">
              <FaBars />
            </span>
            {showLabels && (
              <span className="text-sm font-semibold tracking-wide leading-none">
                Menu
              </span>
            )}
          </button>
        </div>
        {/* Menu */}
        <nav
          className={`relative flex-1 space-y-2 overflow-y-auto font-bold sidebar-scroll ${
            showLabels ? "px-4 py-4" : "px-3 py-4"
          }`}
        >
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
                className={`
            group w-full flex items-center rounded-2xl border
          cursor-pointer transition-all duration-300
          ${
            showLabels
              ? "gap-3 px-4 py-3 justify-start"
              : "justify-center px-3 py-3"
          }
      ${
        highlighted
          ? "border-blue-400/60 bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.3)]"
          : "border-transparent bg-white/[0.03] text-slate-200 hover:border-blue-400/40 hover:bg-blue-600 hover:text-white hover:shadow-[0_14px_28px_rgba(37,99,235,0.25)] active:border-blue-400/40 active:bg-blue-600 active:text-white active:shadow-[0_14px_28px_rgba(37,99,235,0.25)] focus-visible:border-blue-400/40 focus-visible:bg-blue-600 focus-visible:text-white focus-visible:shadow-[0_14px_28px_rgba(37,99,235,0.25)]"
      }
      ${hovered && !active ? "border-blue-400/40 bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.3)] scale-[1.01]" : ""}
   `}
                title={!showLabels ? item.name : undefined}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                    highlighted
                      ? "bg-white/18 text-white"
                      : "bg-slate-800/80 text-slate-100 group-hover:bg-white/18 group-hover:text-white group-active:bg-white/18 group-active:text-white"
                  }`}
                >
                  <Icon className="text-base" />
                </span>
                {showLabels && (
                  <span className="text-base font-semibold text-white text-left leading-tight">
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div
          className={`relative p-3 border-t border-white/10 bg-black/10 backdrop-blur-md ${
            showLabels ? "" : "flex justify-center"
          }`}
        >
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
            className={`w-full flex items-center rounded-2xl border border-white/10 transition-all duration-300 ${
              showLabels
                ? "gap-3 text-left cursor-pointer bg-white/[0.04] hover:bg-blue-600 active:bg-blue-600 focus-visible:bg-blue-600 p-2.5"
                : "justify-center cursor-pointer bg-white/[0.04] hover:bg-blue-600 active:bg-blue-600 focus-visible:bg-blue-600 p-2"
            } ${
              isControlHighlighted("avatar")
                ? "bg-blue-600 border-blue-400 shadow-[0_14px_28px_rgba(37,99,235,0.3)]"
                : ""
            }`}
            title={!showLabels ? userName : undefined}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 ring-1 ring-white/10 flex items-center justify-center text-white overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // fallback if saved URL is no longer valid
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                (userName || "U").charAt(0).toUpperCase()
              )}
            </div>
            {showLabels && (
              <div>
                <p className="text-lg font-semibold text-white leading-tight">
                  {userName}
                </p>
                <p className="text-sm font-medium uppercase tracking-[0.08em] text-blue-200/90">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </p>
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
