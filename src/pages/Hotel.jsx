import { FaBed, FaClipboardList, FaUserFriends } from "react-icons/fa";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Advance from "../components/Hotel/Advance";
import BookingSteps from "../components/Hotel/BookingSteps";
import Communication from "../components/Hotel/Communication";
import Company from "../components/Hotel/company";
import Guest from "../components/Hotel/Guest";
import OtherBooking from "../components/Hotel/otherBooking";
import Pax from "../components/Hotel/Pax";
import Reference from "../components/Hotel/Reference";
import Room from "../components/Hotel/Room";
import RoomTariff from "../components/Hotel/RoomTariff";
import AllBooking from "../components/Hotel/AllBooking";
import EditBooking from "../components/Hotel/EditBooking";

// STEP LABEL
const getStepLabel = (pathname) => {
  if (pathname.includes("/all-bookings")) return "All Bookings";
  if (pathname.includes("/edit-booking")) return "Edit Booking";
  if (pathname.includes("/other-booking")) return "Other Booking";
  if (pathname.includes("/reference")) return "Reference";
  if (pathname.includes("/company")) return "Company";
  if (pathname.includes("/room-tariff")) return "Room Tariff";
  if (pathname.includes("/room")) return "Room";
  if (pathname.includes("/pax")) return "Pax";
  if (pathname.includes("/advance")) return "Advance";
  if (pathname.includes("/communication")) return "Communication";
  return "Guest";
};

const Hotel = () => {
  const location = useLocation();
  const currentStep = getStepLabel(location.pathname);

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-4">
        Hotel Booking System
      </h1>

      <p className="mb-4">Current Step: {currentStep}</p>

      <BookingSteps />

      <div className="bg-white p-4 rounded shadow mt-4">

        <Routes>
          <Route index element={<Navigate to="guest" />} />
          <Route path="guest" element={<Guest />} />
          <Route path="other-booking" element={<OtherBooking />} />
          <Route path="reference" element={<Reference />} />
          <Route path="company" element={<Company />} />
          <Route path="room" element={<Room />} />
          <Route path="pax" element={<Pax />} />
          <Route path="room-tariff" element={<RoomTariff />} />
          <Route path="advance" element={<Advance />} />
          <Route path="communication" element={<Communication />} />

          {/* 🔥 NEW */}
          <Route path="all-bookings" element={<AllBooking />} />
          <Route path="edit-booking" element={<EditBooking />} />

        </Routes>

      </div>
    </div>
  );
};

export default Hotel;