import { NavLink } from "react-router-dom";

const steps = [
  { name: "Guest", path: "/hotel/guest" },
  { name: "Other Booking", path: "/hotel/other-booking" },
  { name: "Reference", path: "/hotel/reference" },
  { name: "Company", path: "/hotel/company" },
  { name: "Room", path: "/hotel/room" },
  { name: "Pax", path: "/hotel/pax" },
  { name: "Room Tariff", path: "/hotel/room-tariff" },
  { name: "Advance", path: "/hotel/advance" },
  { name: "Communication", path: "/hotel/communication" },
];

const BookingSteps = () => {
  return (
    <div className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
          Booking Steps
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Navigate hotel workflow
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <NavLink
            key={step.path}
            to={step.path}
            className={({ isActive }) =>
              `rounded-full px-4 py-2.5 text-sm font-bold transition ${
                isActive
                  ? "bg-[linear-gradient(135deg,#0b2748_0%,#103b4d_55%,#18465a_100%)] text-white shadow-[0_14px_30px_rgba(14,165,233,0.16)]"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:text-cyan-700"
              }`
            }
          >
            <span className="mr-2 text-xs opacity-75">{String(index + 1).padStart(2, "0")}</span>
            {step.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default BookingSteps;
