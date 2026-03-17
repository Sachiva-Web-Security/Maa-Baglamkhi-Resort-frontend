import { Routes, Route, Navigate } from "react-router-dom";

import BookingSteps from "../components/Hotel/BookingSteps";

import Guest from "../components/Hotel/Guest";
import OtherBooking from "../components/Hotel/otherBooking";
import Reference from "../components/Hotel/Reference";
import Company from "../components/Hotel/company";
import Room from "../components/Hotel/Room";
import Pax from "../components/Hotel/Pax";
import RoomTariff from "../components/Hotel/RoomTariff";
import Advance from "../components/Hotel/Advance";
import Communication from "../components/Hotel/Communication";

const Hotel = () => {
  return (
    <div className="p-4">
      {/* ================= STEP HEADER ================= */}
      <BookingSteps />

      {/* ================= STEP ROUTES ================= */}
      <Routes>

        {/* Default redirect (BEST PRACTICE) */}
        <Route index element={<Navigate to="guest" replace />} />

        {/* Step Pages */}
        <Route path="guest" element={<Guest />} />
        <Route path="other-booking" element={<OtherBooking />} />
        <Route path="reference" element={<Reference />} />
        <Route path="company" element={<Company />} />
        <Route path="room" element={<Room />} />
        <Route path="pax" element={<Pax />} />
        <Route path="room-tariff" element={<RoomTariff />} />
        <Route path="advance" element={<Advance />} />
        <Route path="communication" element={<Communication />} />

        {/* Fallback (optional but recommended) */}
        <Route path="*" element={<Navigate to="guest" replace />} />

      </Routes>
    </div>
  );
};

export default Hotel;