import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import BookingFlow from "../components/Hotel/BookingFlow";
import BookingHistory from "../components/Hotel/BookingHistory";
import BookingSteps from "../components/Hotel/BookingSteps";
import PaymentHistory from "../components/Hotel/PaymentHistroy";

import FolioView from "../components/Hotel/FolioView";
import GroupBooking from "../components/Hotel/GroupBooking";
import GuestProfile from "../components/Hotel/GuestProfile";
import OccupancyForecast from "../components/Hotel/OccupancyForecast";
import RoomMaintenance from "../components/Hotel/RoomMaintenance";

// ── All of these paths now render the SAME single-page BookingFlow component.
// Nothing here navigates between them internally anymore — BookingFlow handles
// New Booking / Booking Confirmed / All Bookings / Booking Details / Manage
// Booking as one page using local state, not routing.
const BOOKING_FLOW_PATHS = [
  "guest",
  "other-booking",
  "reference",
  "company",
  "room",
  "pax",
  "room-tariff",
  "advance",
  "communication",
  "collect-payment",
  "all-bookings",
  "edit-booking",
];

const getStepLabel = (pathname) => {
  if (pathname.includes("/booking-history"))    return "Booking History";
  if (pathname.includes("/payment-history"))    return "Payment History";
  if (pathname.includes("/folio"))              return "Guest Folio";
  if (pathname.includes("/room-maintenance"))   return "Room Maintenance";
  if (pathname.includes("/guest-profile"))      return "Guest Profile";
  if (pathname.includes("/occupancy-forecast")) return "Occupancy Forecast";
  if (pathname.includes("/group-booking"))      return "Group Booking";
  return "Booking";
};

const Hotel = () => {
  const location = useLocation();

  // True for every URL that used to be a separate wizard step / All Bookings /
  // Edit Booking page — these all now render <BookingFlow />, which draws its
  // own flow bar, so we skip the old BookingSteps top bar + extra wrapper card
  // for these paths and let BookingFlow use the full width.
  const isBookingFlowPage =
    location.pathname === "/hotel" ||
    location.pathname === "/hotel/" ||
    BOOKING_FLOW_PATHS.some((p) => location.pathname.includes(`/hotel/${p}`));

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f7fffb_55%,#fff8ef_100%)] p-4 sm:p-6">
      <div className="w-full space-y-5">
        {!isBookingFlowPage ? (
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_15px_45px_rgba(15,23,42,0.08)] backdrop-blur">
            <BookingSteps />
          </div>
        ) : null}

        <div
          className={
            isBookingFlowPage
              ? "w-full"
              : "rounded-[30px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur"
          }
        >
          <Routes>
            {/* Landing on /hotel goes straight to All Bookings inside BookingFlow */}
            <Route index element={<Navigate to="all-bookings" replace />} />

            {/* Every old wizard step + all-bookings + edit-booking -> ONE component.
                Sidebar links like /hotel/guest and /hotel/all-bookings keep working
                unchanged; BookingFlow just opens on the right internal view. */}
            <Route path="guest"           element={<BookingFlow />} />
            <Route path="other-booking"   element={<BookingFlow />} />
            <Route path="reference"       element={<BookingFlow />} />
            <Route path="company"         element={<BookingFlow />} />
            <Route path="room"            element={<BookingFlow />} />
            <Route path="pax"             element={<BookingFlow />} />
            <Route path="room-tariff"     element={<BookingFlow />} />
            <Route path="advance"         element={<BookingFlow />} />
            <Route path="communication"   element={<BookingFlow />} />
            <Route path="collect-payment" element={<BookingFlow />} />
            <Route path="all-bookings"    element={<BookingFlow />} />
            <Route path="edit-booking"    element={<BookingFlow />} />

            {/* ── Features kept separate from the booking flow (unchanged) ── */}
            <Route path="booking-history"    element={<BookingHistory />} />
            <Route path="payment-history"    element={<PaymentHistory />} />
            <Route path="folio"              element={<FolioView />} />
            <Route path="room-maintenance"   element={<RoomMaintenance />} />
            <Route path="guest-profile"      element={<GuestProfile />} />
            <Route path="occupancy-forecast" element={<OccupancyForecast />} />
            <Route path="group-booking"      element={<GroupBooking />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Hotel;