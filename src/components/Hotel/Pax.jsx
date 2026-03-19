import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import API from "../../api";
import {
  getBookingDraft,
  getStoredBookingId,
  setBookingDraft,
  setStoredBookingId,
} from "./bookingSession";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const Pax = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingId = location.state?.bookingId || getStoredBookingId();
  const selectedRooms =
    location.state?.selectedRooms || getBookingDraft("room")?.selectedRooms || {};

  const [rooms, setRooms] = useState(getBookingDraft("pax")?.rooms || []);
  const [paxData, setPaxData] = useState(getBookingDraft("pax")?.paxData || {});

  useEffect(() => {
    if (bookingId) {
      setStoredBookingId(bookingId);
    }
  }, [bookingId]);

  useEffect(() => {
    const finalRooms = [];

    Object.keys(selectedRooms || {}).forEach((roomId) => {
      (selectedRooms[roomId] || []).forEach((roomName) => {
        finalRooms.push({
          name: roomName,
          roomType: roomId,
        });
      });
    });

    if (finalRooms.length) {
      setRooms(finalRooms);
    }
  }, [selectedRooms]);

  useEffect(() => {
    setBookingDraft("pax", { rooms, paxData });
  }, [rooms, paxData]);

  const handleChange = (roomName, field, value) => {
    setPaxData((prev) => ({
      ...prev,
      [roomName]: {
        ...prev[roomName],
        [field]: Number(value) || 0,
      },
    }));
  };

  const getTotal = (roomName) => {
    const adults = paxData[roomName]?.adults || 0;
    const children = paxData[roomName]?.children || 0;
    return adults + children;
  };

  const totalGuests = useMemo(
    () => rooms.reduce((sum, room) => sum + getTotal(room.name), 0),
    [rooms, paxData],
  );

  const handleProceed = async () => {
    if (!bookingId) {
      alert("Booking ID missing hai.");
      return;
    }

    try {
      await API.post(`/hotel/pax/${bookingId}`, {
        adults: Object.values(paxData).reduce((sum, row) => sum + (row.adults || 0), 0),
        children: Object.values(paxData).reduce((sum, row) => sum + (row.children || 0), 0),
        mealPlan: "EP",
      });

      navigate("/hotel/room-tariff", {
        state: {
          bookingId,
          rooms,
          paxData,
        },
      });
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Error saving pax");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4fbff_0%,#f8fff9_42%,#fffaf1_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#08253d_0%,#0e7490_55%,#164e63_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-200">
                Pax Details
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Add adults and children room-wise
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85">
                Har selected room ke liye guest count enter karein, taaki tariff aur invoice automatically accurate bane.
              </p>
            </div>

            <div className="space-y-3 rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                  Selected Rooms
                </div>
                <div className="mt-1 text-2xl font-black">{rooms.length}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                  Total Guests
                </div>
                <div className="mt-1 text-2xl font-black">{totalGuests}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="grid gap-4 md:grid-cols-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <div>Room No.</div>
            <div>Adults</div>
            <div>Children</div>
            <div>Total</div>
          </div>

          <div className="mt-4 space-y-4">
            {rooms.map((room, index) => (
              <div
                key={`${room.name}-${index}`}
                className="grid gap-4 rounded-[22px] border border-slate-200/80 bg-white p-4 md:grid-cols-4 md:items-center"
              >
                <div>
                  <div className="text-lg font-black text-slate-900">{room.name}</div>
                  <div className="text-sm text-slate-500">Room Type {room.roomType}</div>
                </div>

                <input
                  type="number"
                  min="0"
                  placeholder="Adults"
                  value={paxData[room.name]?.adults || ""}
                  onChange={(event) => handleChange(room.name, "adults", event.target.value)}
                  className={fieldCls}
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Children"
                  value={paxData[room.name]?.children || ""}
                  onChange={(event) => handleChange(room.name, "children", event.target.value)}
                  className={fieldCls}
                />

                <div className="rounded-[18px] bg-sky-50 px-4 py-4 text-center">
                  <div className="text-xs uppercase tracking-wide text-sky-700">Total</div>
                  <div className="mt-1 text-2xl font-black text-sky-900">
                    {getTotal(room.name)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={() => navigate("/hotel/room")}
              className="rounded-[22px] border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Go Back
            </button>
            <button
              onClick={handleProceed}
              className="rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
            >
              Save & Proceed
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Pax;
