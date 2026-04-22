import { NavLink, useLocation, useNavigate } from "react-router-dom";

const WIZARD_STEPS = [
  { name: "Guest", path: "/hotel/guest" },
  { name: "Booking Type", path: "/hotel/other-booking" },
  { name: "Reference", path: "/hotel/reference" },
  { name: "Company", path: "/hotel/company" },
  { name: "Room", path: "/hotel/room" },
  { name: "Pax", path: "/hotel/pax" },
  { name: "Tariff", path: "/hotel/room-tariff" },
  { name: "Advance", path: "/hotel/advance" },
  { name: "Invoice", path: "/hotel/communication" },
];

const MGMT_LINKS = [
  { name: "All Bookings", path: "/hotel/all-bookings" },
  { name: "Booking History", path: "/hotel/booking-history" },
  { name: "Group Booking", path: "/hotel/group-booking" },
  { name: "Guest Profile", path: "/hotel/guest-profile" },
  { name: "Folio / Audit", path: "/hotel/folio" },
  { name: "Room Maintenance", path: "/hotel/room-maintenance" },
  { name: "Occ Forecast", path: "/hotel/occupancy-forecast" },
];

const linkClassName = ({ isActive }) =>
  `rounded-full px-4 py-2 text-[15px] font-semibold leading-none transition xl:px-4.5 xl:text-[16px] 2xl:text-[17px] ${
    isActive
      ? "bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
      : "text-slate-200 hover:bg-white/10 hover:text-white"
  }`;

const actionButtonClassName = (isActive) =>
  `rounded-full border px-4 py-2 text-[15px] font-bold leading-none shadow-[0_10px_28px_rgba(2,8,23,0.18)] backdrop-blur-md transition xl:px-4.5 xl:py-2.5 xl:text-[16px] 2xl:text-[17px] ${
    isActive
      ? "border-white/20 bg-white text-slate-950 shadow-[0_14px_34px_rgba(2,8,23,0.2)]"
      : "border-white/10 bg-white/8 text-slate-100 hover:border-white/20 hover:bg-white/12 hover:text-white"
  }`;

const BookingSteps = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeQuickAction =
    new URLSearchParams(location.search).get("mode") || location.state?.bookingAction || "";

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-4 rounded-[26px] border border-white/10 bg-[linear-gradient(90deg,#07111f_0%,#0b1728_52%,#09101b_100%)] px-4 py-4 shadow-[0_18px_40px_rgba(2,8,23,0.28)] xl:flex-row xl:flex-wrap xl:items-start xl:gap-4 2xl:gap-5">
      <div className="min-w-0 flex-1 xl:flex-none">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap xl:gap-3 2xl:gap-4">
          {WIZARD_STEPS.map((step) => (
            <NavLink
              key={step.path}
              to={step.path}
              state={location.state}
              className={linkClassName}
            >
              {step.name}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 xl:mx-auto xl:px-4 xl:py-2.5">
        <button
          type="button"
          onClick={() =>
            navigate(
              { pathname: "/hotel/communication", search: "?mode=check-in" },
              { state: { bookingAction: "check-in" } },
            )
          }
          className={actionButtonClassName(activeQuickAction === "check-in")}
        >
          Check In
        </button>
        <button
          type="button"
          onClick={() =>
            navigate(
              { pathname: "/hotel/communication", search: "?mode=check-out" },
              { state: { bookingAction: "check-out" } },
            )
          }
          className={actionButtonClassName(activeQuickAction === "check-out")}
        >
          Check Out
        </button>
      </div>

      <div className="min-w-0 flex-1 xl:flex-none">
        <div className="flex flex-wrap items-center gap-2 overflow-visible whitespace-normal xl:justify-end xl:gap-3 2xl:gap-4">
          {MGMT_LINKS.map((link) => (
            <NavLink key={link.path} to={link.path} state={location.state} className={linkClassName}>
              {link.name}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingSteps;
