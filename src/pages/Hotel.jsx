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

const getStepLabel = (pathname) => {
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
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1260px] space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Front Office Journey
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  Hotel booking flow with cleaner dashboard style
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                  Guest details se le kar room, tariff, advance aur communication
                  tak pura hotel workflow ek attractive responsive layout mein.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: "Current Step", value: currentStep },
                { label: "Booking Flow", value: "9 Steps" },
                { label: "Mode", value: "Responsive" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <BookingSteps />

          <div className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="space-y-3">
              {[
                {
                  icon: FaClipboardList,
                  title: "Booking Ready",
                  text: "Step-wise hotel booking structure front office team ko fast movement deta hai.",
                },
                {
                  icon: FaUserFriends,
                  title: "Guest Focused",
                  text: "Guest details aur follow-up sections ko cleaner responsive flow mein access karein.",
                },
                {
                  icon: FaBed,
                  title: "Room Planning",
                  text: "Room selection aur tariff journey ko aligned dashboard styling milti hai.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="rounded-2xl bg-white p-3 text-cyan-700 shadow-sm">
                        <Icon />
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">
                          {item.text}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="rounded-[26px] border border-white/60 bg-white/72 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-4">
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
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Hotel;
