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

import CollectPayment from "../components/Hotel/CollectPayment";
import PaymentHistory from "../components/Hotel/PaymentHistroy";
import BookingHistory from "../components/Hotel/BookingHistory";
// STEP LABEL
const getStepLabel = (pathname) => {
  if (pathname.includes("/all-bookings")) return "All Bookings";
  if (pathname.includes("/booking-history")) return "Booking History";
  if (pathname.includes("/edit-booking")) return "Edit Booking";
  if (pathname.includes("/other-booking")) return "Other Booking";
  if (pathname.includes("/reference")) return "Reference";
  if (pathname.includes("/company")) return "Company";
  if (pathname.includes("/room-tariff")) return "Room Tariff";
  if (pathname.includes("/room")) return "Room";
  if (pathname.includes("/pax")) return "Pax";
  if (pathname.includes("/advance")) return "Advance";
  if (pathname.includes("/communication")) return "Communication";
  if (pathname.includes("/payment-history")) return "Payment History";
  return "Guest";
};

const Hotel = () => {
  const location = useLocation();
  const currentStep = getStepLabel(location.pathname);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f7fffb_55%,#fff8ef_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,#020617_0%,#1d4ed8_48%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_70px_rgba(15,23,42,0.2)]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
                Hotel Booking System
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Manage reservations with a cleaner workflow
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Guest se communication tak har step ko ek polished front-desk
                dashboard me organize kiya gaya hai.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-100/75">
                Current Step
              </div>
              <div className="mt-2 text-2xl font-black">{currentStep}</div>
            </div>
          </div>
        </section>

        <div className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_15px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <BookingSteps />
        </div>

        <div className="rounded-[30px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur">

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
          <Route path="collect-payment" element={<CollectPayment />} />
          {/* 🔥 NEW */}

           <Route path="payment-history" element={<PaymentHistory />} />
          <Route path="booking-history" element={<BookingHistory />} />
          <Route path="all-bookings" element={<AllBooking />} />
          <Route path="edit-booking" element={<EditBooking />} />
           
        </Routes>
        </div>
      </div>
    </div>
  );
};

export default Hotel;
