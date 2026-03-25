import { NavLink, useLocation } from "react-router-dom";

// ─── Booking Wizard Steps (sequential) ─────────────────────────────────────
const WIZARD_STEPS = [
  { name: "Guest",         path: "/hotel/guest",        icon: "👤" },
  { name: "Booking Type",  path: "/hotel/other-booking", icon: "📋" },
  { name: "Reference",     path: "/hotel/reference",    icon: "🔗" },
  { name: "Company",       path: "/hotel/company",      icon: "🏢" },
  { name: "Room",          path: "/hotel/room",         icon: "🛏️" },
  { name: "Pax",           path: "/hotel/pax",          icon: "👥" },
  { name: "Tariff",        path: "/hotel/room-tariff",  icon: "💰" },
  { name: "Advance",       path: "/hotel/advance",      icon: "💳" },
  { name: "Invoice",       path: "/hotel/communication",icon: "🧾" },
];

// ─── Management / Utility Links ─────────────────────────────────────────────
const MGMT_LINKS = [
  { name: "All Bookings",       path: "/hotel/all-bookings",       icon: "📊" },
  { name: "Booking History",    path: "/hotel/booking-history",    icon: "🕘" },
  { name: "Group Booking",      path: "/hotel/group-booking",      icon: "🏨" },
  { name: "Guest Profile",      path: "/hotel/guest-profile",      icon: "👤" },
  { name: "Folio / Audit",      path: "/hotel/folio",              icon: "📒" },
  { name: "Room Maintenance",   path: "/hotel/room-maintenance",   icon: "🔧" },
  { name: "Occupancy Forecast", path: "/hotel/occupancy-forecast", icon: "📅" },
];

const BookingSteps = () => {
  const location = useLocation();

  // Check if currently on wizard steps
  const isWizardActive = WIZARD_STEPS.some((s) =>
    location.pathname.includes(s.path.split("/hotel/")[1]),
  );

  return (
    <div className="space-y-3 rounded-[22px] bg-white p-4">
      {/* Wizard Steps Row */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          New Booking Wizard
        </p>
        <div className="flex flex-wrap gap-1.5">
          {WIZARD_STEPS.map((step, index) => (
            <NavLink
              key={step.path}
              to={step.path}
              state={location.state}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.2)]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`
              }
            >
              <span className="text-sm leading-none">{step.icon}</span>
              <span>
                {index + 1}. {step.name}
              </span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-slate-100" />

      {/* Management Links Row */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Management
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MGMT_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <span className="text-sm leading-none">{link.icon}</span>
              <span>{link.name}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingSteps;
