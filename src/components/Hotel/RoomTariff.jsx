import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import API from "../../api";
import {
  getBookingDraft,
  getStoredBookingId,
  setBookingDraft,
  setStoredBookingId,
} from "./bookingSession";

const RoomTariff = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingId = location.state?.bookingId || getStoredBookingId();
  const rooms = location.state?.rooms || getBookingDraft("pax")?.rooms || [];
  const paxData = location.state?.paxData || getBookingDraft("pax")?.paxData || {};
  const roomDraft = getBookingDraft("room") || {};
  const [categorySetup, setCategorySetup] = useState([]);
  const [rows, setRows] = useState(getBookingDraft("roomTariff")?.rows || []);

  useEffect(() => {
    if (bookingId) {
      setStoredBookingId(bookingId);
    }
  }, [bookingId]);

  useEffect(() => {
    const loadSetup = async () => {
      try {
        const response = await API.get("/hotel/rooms/setup");
        setCategorySetup(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to load room setup:", error);
      }
    };

    loadSetup();
  }, []);

  const categoryMap = useMemo(() => {
    const map = {};

    categorySetup.forEach((category) => {
      map[String(category.id)] = {
        id: category.id,
        name: category.name,
        defaultPrice: Number(category.defaultPrice || 0),
        unitLabel: category.unitLabel || "PER NIGHT",
      };
    });

    return map;
  }, [categorySetup]);

  useEffect(() => {
    if (!rooms.length || rows.length) {
      return;
    }

    const priceInputs = roomDraft.priceInputs || {};

    const nextRows = rooms.map((room) => {
      const category = categoryMap[String(room.roomType)] || {};
      const adults = Number(paxData[room.name]?.adults || 0);
      const children = Number(paxData[room.name]?.children || 0);
      const quantity = Math.max(adults + children, 1);
      const fallbackPrice = Number(priceInputs[room.roomType] || 0);
      const tariff = Number(category.defaultPrice || fallbackPrice || 0);

      return {
        roomNo: room.name,
        roomType: category.name || `Room Type ${room.roomType}`,
        quantity,
        price: tariff,
        gst: 12,
        unitLabel: category.unitLabel || "PER NIGHT",
      };
    });

    setRows(nextRows);
  }, [categoryMap, paxData, roomDraft.priceInputs, rooms, rows.length]);

  useEffect(() => {
    setBookingDraft("roomTariff", { rows });
  }, [rows]);

  const handleChange = (index, field, value) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: Number(value) || 0,
      };
      return updated;
    });
  };

  const calculateBase = (row) => Number(row.price || 0) * Number(row.quantity || 0);

  const calculateTotal = (row) => {
    const base = calculateBase(row);
    const gstAmount = (base * Number(row.gst || 0)) / 100;
    return base + gstAmount;
  };

  const grandTotal = rows.reduce((sum, row) => sum + calculateTotal(row), 0);
const handleProceed = async () => {
  if (!bookingId) {
    alert("Booking ID missing hai.");
    return;
  }

  if (!rows.length) {
    alert("Room tariff data missing hai.");
    return;
  }

  try {
    for (const row of rows) {
      const payload = {
        roomNumber: row.roomNo,
        date: new Date().toISOString().slice(0, 19).replace("T", " "), // ✅ FIX
        quantity: row.quantity,
        tariff: row.price,
        gstPercent: row.gst,
        total: calculateTotal(row),
      };

      console.log("🚀 SENDING:", payload); // debug

      await API.post(`/hotel/room-tariff/${bookingId}`, payload);
    }

    navigate("/hotel/advance", {
      state: {
        bookingId,
        rows,
        totalAmount: grandTotal,
      },
    });
  } catch (error) {
    console.error("❌ ERROR:", error.response?.data || error);
    alert(error.response?.data?.message || "Error saving room tariff");
  }
};

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="border-b pb-3 text-xl font-bold text-gray-800">
          Room Tariff
        </h2>

        {rows.length ? (
          <>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full overflow-hidden rounded-xl border border-slate-200">
                <thead className="bg-slate-100 text-left text-sm text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Room No.</th>
                    <th className="px-4 py-3">Room Type</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Tariff</th>
                    <th className="px-4 py-3">GST %</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.roomNo}-${index}`} className="border-t border-slate-200">
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {row.roomNo}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div className="font-medium">{row.roomType}</div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          {row.unitLabel}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(event) =>
                            handleChange(index, "quantity", event.target.value)
                          }
                          className="w-24 rounded-md border border-slate-300 p-2"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          value={row.price}
                          onChange={(event) =>
                            handleChange(index, "price", event.target.value)
                          }
                          className="w-32 rounded-md border border-slate-300 p-2"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={row.gst}
                          onChange={(event) =>
                            handleChange(index, "gst", event.target.value)
                          }
                          className="w-24 rounded-md border border-slate-300 p-2"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 font-bold text-emerald-700">
                        Rs. {calculateTotal(row).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Booking Total
                </div>
                <div className="mt-1 text-3xl font-black text-slate-900">
                  Rs. {grandTotal.toFixed(2)}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/hotel/pax")}
                  className="rounded-lg bg-gray-300 px-5 py-2 text-slate-800"
                >
                  Go Back
                </button>
                <button
                  onClick={handleProceed}
                  className="rounded-lg bg-blue-500 px-6 py-2 text-white"
                >
                  Save & Proceed
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
            Room tariff ke liye selected room data nahi mila.
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomTariff;
