import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaChevronDown,
  FaCog,
  FaSearch,
  FaSignOutAlt,
  FaTimes,
  FaUserCircle,
} from "react-icons/fa";

import { getDashboardNotifications } from "../Dashboard/dashboardNotifications";
import { getDashboardSearchResults } from "../../utils/dashboardSearch";

const Header = ({ setIsAuthenticated, sidebarOffset = 0, isMobile = false }) => {
  const navigate = useNavigate();
  const headerActionsRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const userName = localStorage.getItem("name") || "Admin User";
  const userRole = localStorage.getItem("role") || "admin";
  const avatarUrl = localStorage.getItem("avatarUrl") || "";

  useEffect(() => {
    const syncNotifications = () => {
      setNotifications(getDashboardNotifications());
    };

    syncNotifications();
    window.addEventListener("dashboard-notifications-updated", syncNotifications);
    window.addEventListener("storage", syncNotifications);

    return () => {
      window.removeEventListener("dashboard-notifications-updated", syncNotifications);
      window.removeEventListener("storage", syncNotifications);
    };
  }, []);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (headerActionsRef.current && !headerActionsRef.current.contains(event.target)) {
        setNotificationMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setNotificationMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("avatarUrl");

    if (setIsAuthenticated) {
      setIsAuthenticated(false);
    }

    navigate("/login");
  };

  const handleMenuAction = (path, options) => {
    setNotificationMenuOpen(false);
    setProfileMenuOpen(false);
    navigate(path, options);
  };

  const handleNotificationClick = (item) => {
    setNotificationMenuOpen(false);
    if (item?.route) {
      navigate(item.route);
    }
  };

  const unreadCount = notifications.length;
  const searchResults = useMemo(() => getDashboardSearchResults(searchQuery), [searchQuery]);

  const openSearchTarget = (target) => {
    setSearchQuery("");
    setSearchFocused(false);
    if (!target?.route) return;
    navigate(target.route);
  };

  return (
    <header
      className="fixed top-0 z-50 flex h-[92px] items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(246,249,252,0.96))] px-5 py-4 text-slate-900 shadow-[0_10px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 lg:px-7"
      style={{
        left: isMobile ? 0 : sidebarOffset,
        width: isMobile ? "100%" : `calc(100% - ${sidebarOffset}px)`,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-1 ring-slate-900/10">
            <img
              className="h-full w-full object-cover"
              src="https://www.maabaglamukhinalkehda.com/assets/images/maa2.jpg"
              alt="Logo"
            />
          </div>
          <div className="min-w-0 leading-tight">
            
            <h1 className="truncate text-[19px] font-bold text-slate-900 sm:text-[20px]">
              Maa Baglamukhi Resort
            </h1>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 md:flex md:justify-center">
          <div className="relative w-full max-w-3xl">
            <label className="group relative block">
              <span className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex items-center pl-5 text-slate-400 transition group-focus-within:text-sky-600">
                <FaSearch className="text-base" />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults.length) {
                    openSearchTarget(searchResults[0]);
                  }
                }}
                placeholder="Search..."
                className="h-16 w-full rounded-full border border-slate-200/90 bg-white/96 pl-12 pr-12 text-[14px] font-semibold text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.06)] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  <FaTimes className="text-[13px]" />
                </button>
              ) : null}
            </label>

            {searchFocused && (searchQuery || searchResults.length) ? (
              <div className="absolute left-0 right-0 top-full z-[90] mt-3 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_60px_rgba(15,23,42,0.2)]">
                <div className="max-h-[320px] overflow-y-auto p-2.5">
                  {searchResults.length ? (
                    searchResults.map((target) => (
                      <button
                        key={target.route}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => openSearchTarget(target)}
                        className="flex w-full items-center justify-between rounded-[20px] border border-slate-200/80 px-4 py-3.5 text-left transition hover:border-sky-200 hover:bg-sky-50/60"
                      >
                        <div>
                          <div className="text-[16px] font-black text-black">{target.label}</div>
                          <div className="mt-1 text-[14px] font-semibold text-slate-700">{target.helper}</div>
                        </div>
                        <span className="rounded-full border border-slate-300 px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-black">
                          Open
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-slate-300 px-4 py-4 text-[14px] font-semibold text-slate-700">
                      No page found. Try keywords like <span className="font-semibold text-slate-900">housekeeping</span>,
                      <span className="font-semibold text-slate-900"> booking</span>, <span className="font-semibold text-slate-900">accounts</span>.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center gap-3 sm:gap-4" ref={headerActionsRef}>
        <div className="relative md:hidden">
          <label className="group relative block">
            <span className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex items-center pl-4 text-slate-400 transition group-focus-within:text-sky-600">
              <FaSearch className="text-sm" />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults.length) {
                  openSearchTarget(searchResults[0]);
                }
              }}
              placeholder="Search..."
              className="h-11 w-[150px] rounded-full border border-slate-200/90 bg-white/96 pl-10 pr-10 text-[14px] font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            />
            {searchQuery ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 z-[1] flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <FaTimes className="text-[10px]" />
              </button>
            ) : null}
          </label>

          {searchFocused && (searchQuery || searchResults.length) ? (
            <div className="absolute right-0 top-full z-[90] mt-3 w-[min(88vw,360px)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.2)]">
              <div className="max-h-[320px] overflow-y-auto p-2.5">
                {searchResults.length ? (
                  searchResults.map((target) => (
                    <button
                      key={target.route}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => openSearchTarget(target)}
                      className="flex w-full items-center justify-between rounded-[18px] border border-slate-200/80 px-4 py-3 text-left transition hover:border-sky-200 hover:bg-sky-50/60"
                    >
                      <div>
                        <div className="text-[16px] font-black text-black">{target.label}</div>
                        <div className="mt-1 text-[14px] font-semibold text-slate-700">{target.helper}</div>
                      </div>
                      <span className="rounded-full border border-slate-300 px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-black">
                        Open
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-4 text-[14px] font-semibold text-slate-700">
                    No page found. Try keywords like <span className="font-semibold text-slate-900">housekeeping</span>,
                    <span className="font-semibold text-slate-900"> booking</span>, <span className="font-semibold text-slate-900">accounts</span>.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationMenuOpen((open) => !open);
              setProfileMenuOpen(false);
            }}
            className="group relative inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-slate-200/80 bg-white/95 text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-[0_16px_36px_rgba(14,165,233,0.16)] focus:outline-none focus:ring-4 focus:ring-sky-100"
            aria-haspopup="menu"
            aria-expanded={notificationMenuOpen}
            aria-label="Open notifications"
          >
            <FaBell className="text-[24px]" />
            {unreadCount ? (
              <span className="absolute right-2 top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_8px_18px_rgba(244,63,94,0.35)]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
            )}
          </button>

          {notificationMenuOpen ? (
            <div className="absolute right-0 top-[calc(100%+12px)] w-[min(94vw,520px)] overflow-hidden rounded-[30px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,247,255,0.94)_100%)] p-4 shadow-[0_24px_58px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[16px] font-semibold uppercase tracking-[0.26em] text-violet-500">
                    Notifications
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-900">Messages and updates</h3>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xl font-semibold text-violet-700">
                  <FaBell />
                  {unreadCount}
                </span>
              </div>

              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {notifications.length ? (
                  notifications.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      role="menuitem"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xl font-semibold text-slate-900">
                            {item.title || "Notification"}
                          </div>
                          <div className="mt-1 text-[14px] leading-5 text-slate-500">
                            {item.message || "New update available."}
                          </div>
                        </div>
                        <div className="rounded-full bg-slate-50 px-2.5 py-1 text-[15px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {new Date(item.createdAt || Date.now()).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No notifications yet. Booking, cleaning aur messages yahan show honge.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileMenuOpen((open) => !open);
              setNotificationMenuOpen(false);
            }}
            className="group inline-flex items-center gap-3 rounded-[24px] border border-slate-200/80 bg-white/95 px-3 py-2.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_36px_rgba(14,165,233,0.16)] focus:outline-none focus:ring-4 focus:ring-sky-100"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
          >
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-700 text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] ring-2 ring-white">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt={`${userName} avatar`}
                  className="h-full w-full object-cover"
                  onError={() => {
                    setAvatarError(true);
                  }}
                />
              ) : (
                (userName || "A").charAt(0).toUpperCase()
              )}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-[14px] font-semibold text-slate-900">{userName}</p>
              <p className="text-[14px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {userRole}
              </p>
            </div>
            <span
              className={`text-slate-400 transition-transform duration-200 ${profileMenuOpen ? "rotate-180 text-sky-600" : "group-hover:text-sky-600"}`}
            >
              <FaChevronDown className="text-sm" />
            </span>
          </button>

          {profileMenuOpen ? (
            <div className="absolute right-0 top-[calc(100%+12px)] w-60 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/98 p-2 shadow-[0_22px_55px_rgba(15,23,42,0.16)] backdrop-blur-xl">
              <div className="mb-2 rounded-[18px] bg-slate-50 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Manage your profile, preferences, and session.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleMenuAction("/profile")}
                className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
                role="menuitem"
              >
                <FaUserCircle className="text-base" />
                <span>View Profile</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleMenuAction("/profile", {
                    state: { focusSection: "security" },
                  })
                }
                className="mt-1 flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
                role="menuitem"
              >
                <FaCog className="text-base" />
                <span>Settings</span>
              </button>

              <div className="my-2 h-px bg-slate-200" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                role="menuitem"
              >
                <FaSignOutAlt className="text-base" />
                <span>Logout</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
