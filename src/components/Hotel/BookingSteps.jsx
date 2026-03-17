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
    <div className="flex flex-wrap gap-3 mb-6 border-b pb-3">
      {steps.map((step, index) => (
        <NavLink
          key={index}
          to={step.path}
          className={({ isActive }) =>
            `px-4 py-2 rounded-md text-sm font-medium transition
            ${
              isActive
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`
          }
        >
          {step.name}
        </NavLink>
      ))}
    </div>
  );
};

export default BookingSteps;