import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Advance from "../components/Hotel/Advance";
import AllBooking from "../components/Hotel/AllBooking";
import BookingHistory from "../components/Hotel/BookingHistory";
import BookingSteps from "../components/Hotel/BookingSteps";
import CollectPayment from "../components/Hotel/CollectPayment";
import Communication from "../components/Hotel/Communication";
import Company from "../components/Hotel/company";
import EditBooking from "../components/Hotel/EditBooking";
import Guest from "../components/Hotel/Guest";
import OtherBooking from "../components/Hotel/otherBooking";
import Pax from "../components/Hotel/Pax";
import PaymentHistory from "../components/Hotel/PaymentHistroy";
import Reference from "../components/Hotel/Reference";
import Room from "../components/Hotel/Room";
import RoomTariff from "../components/Hotel/RoomTariff";

import FolioView from "../components/Hotel/FolioView";
import GroupBooking from "../components/Hotel/GroupBooking";
import GuestProfile from "../components/Hotel/GuestProfile";
import OccupancyForecast from "../components/Hotel/OccupancyForecast";
import RoomMaintenance from "../components/Hotel/RoomMaintenance";

const getStepLabel = (pathname) => {
  if (pathname.includes("/all-bookings"))       return "All Bookings";
  if (pathname.includes("/booking-history"))    return "Booking History";
  if (pathname.includes("/edit-booking"))       return "Edit Booking";
  if (pathname.includes("/other-booking"))      return "Other Booking";
  if (pathname.includes("/reference"))          return "Reference";
  if (pathname.includes("/company"))            return "Company";
  if (pathname.includes("/room-tariff"))        return "Room Tariff";
  if (pathname.includes("/room"))               return "Room";
  if (pathname.includes("/pax"))                return "Pax";
  if (pathname.includes("/advance"))            return "Advance";
  if (pathname.includes("/communication"))      return "Communication";
  if (pathname.includes("/payment-history"))    return "Payment History";
  if (pathname.includes("/folio"))              return "Guest Folio";
  if (pathname.includes("/room-maintenance"))   return "Room Maintenance";
  if (pathname.includes("/guest-profile"))      return "Guest Profile";
  if (pathname.includes("/occupancy-forecast")) return "Occupancy Forecast";
  if (pathname.includes("/group-booking"))      return "Group Booking";
  return "Guest";
};

const Hotel = () => {
  const location = useLocation();
  const currentStep = getStepLabel(location.pathname);
  const isAllBookingsPage = location.pathname.includes("/all-bookings");

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_24%),linear-gradient(180deg,#eef3fb_0%,#f7fbff_48%,#fffaf1_100%)] p-4 sm:p-6">
      <div className="w-full space-y-5">
    

        <div className="rounded-[28px] border border-white/70 bg-white/82 p-4 shadow-[0_15px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <BookingSteps />
        </div>

        <div
          className={
            isAllBookingsPage
              ? "w-full"
              : "rounded-[30px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur"
          }
        >
          <Routes>
            {/* Existing booking wizard */}
            <Route index element={<Navigate to="guest" />} />
            <Route path="guest"          element={<Guest />} />
            <Route path="other-booking"  element={<OtherBooking />} />
            <Route path="reference"      element={<Reference />} />
            <Route path="company"        element={<Company />} />
            <Route path="room"           element={<Room />} />
            <Route path="pax"            element={<Pax />} />
            <Route path="room-tariff"    element={<RoomTariff />} />
            <Route path="advance"        element={<Advance />} />
            <Route path="communication"  element={<Communication />} />
            <Route path="collect-payment" element={<CollectPayment />} />
            <Route path="payment-history" element={<PaymentHistory />} />
            <Route path="booking-history" element={<BookingHistory />} />
            <Route path="all-bookings"   element={<AllBooking />} />
            <Route path="edit-booking"   element={<EditBooking />} />

            {/* â”€â”€ NEW MISSING FEATURE ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {/* Guest Folio / Night Audit */}
            <Route path="folio"              element={<FolioView />} />

            {/* Room Blocking & Maintenance Scheduling */}
            <Route path="room-maintenance"   element={<RoomMaintenance />} />

            {/* Guest Profile & Past Stay History */}
            <Route path="guest-profile"      element={<GuestProfile />} />

            {/* Occupancy Forecast Calendar */}
            <Route path="occupancy-forecast" element={<OccupancyForecast />} />

            {/* Group Booking (multi-room, single payment) */}
            <Route path="group-booking"      element={<GroupBooking />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Hotel;
