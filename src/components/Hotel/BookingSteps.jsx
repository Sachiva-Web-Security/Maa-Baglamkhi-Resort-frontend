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
  { name: "All Bookings", path: "/hotel/all-bookings" }
];

const BookingSteps = () => {
  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h2 className="text-lg font-bold mb-4">Booking Steps</h2>

      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <NavLink
            key={step.path}
            to={step.path}
            className={({ isActive }) =>
              `px-4 py-2 rounded-full text-sm ${
                isActive
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }`
            }
          >
            {index + 1}. {step.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default BookingSteps;