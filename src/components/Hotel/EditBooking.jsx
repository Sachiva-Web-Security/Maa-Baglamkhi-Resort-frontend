import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";
import { getStoredBookingId, setStoredBookingId } from "./bookingSession";

const EditBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId || getStoredBookingId();

  const [data, setData] = useState({
    guest_name: "",
    mobile: "",
    company_name: "",
    adults: 0,
    children: 0,
    room_number: "",
    tariff: 0,
    gst: 12,
    paidAmount: 0,
  });

  useEffect(() => {
    if (!bookingId) return;

    setStoredBookingId(bookingId);

    API.get(`/hotel/full-booking/${bookingId}`)
      .then((res) => setData(res.data))
      .catch((err) => console.log(err));
  }, [bookingId]);

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    const base = Number(data.tariff || 0) * (Number(data.adults || 0) + Number(data.children || 0));
    const gstAmount = (base * Number(data.gst || 0)) / 100;
    return base + gstAmount;
  };

  const handleUpdate = async () => {
    try {
      const total = calculateTotal();

      await API.put(`/hotel/full-booking/${bookingId}`, {
        ...data,
        total,
      });

      alert("Updated Successfully");
      navigate("/hotel/all-bookings");
    } catch (err) {
      console.error("Update failed:", err);
      alert("Update Failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">Edit Booking</h2>
          <p className="text-sm text-gray-500">
            Update all booking details in one place
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-blue-600">Guest Details</h3>

            <input
              className="mb-3 w-full rounded-md border p-2 focus:ring-2 focus:ring-blue-400"
              placeholder="Guest Name"
              value={data.guest_name}
              onChange={(e) => handleChange("guest_name", e.target.value)}
            />

            <input
              className="w-full rounded-md border p-2 focus:ring-2 focus:ring-blue-400"
              placeholder="Mobile"
              value={data.mobile}
              onChange={(e) => handleChange("mobile", e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-blue-600">Company</h3>

            <input
              className="w-full rounded-md border p-2 focus:ring-2 focus:ring-blue-400"
              placeholder="Company Name"
              value={data.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-blue-600">Pax Details</h3>

            <div className="flex gap-3">
              <input
                type="number"
                className="w-full rounded-md border p-2"
                placeholder="Adults"
                value={data.adults}
                onChange={(e) => handleChange("adults", e.target.value)}
              />

              <input
                type="number"
                className="w-full rounded-md border p-2"
                placeholder="Children"
                value={data.children}
                onChange={(e) => handleChange("children", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-blue-600">Room</h3>

            <input
              className="w-full rounded-md border p-2"
              placeholder="Room Number"
              value={data.room_number}
              onChange={(e) => handleChange("room_number", e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-blue-600">Tariff</h3>

            <input
              type="number"
              className="mb-3 w-full rounded-md border p-2"
              placeholder="Tariff"
              value={data.tariff}
              onChange={(e) => handleChange("tariff", e.target.value)}
            />

            <select
              className="w-full rounded-md border p-2"
              value={data.gst}
              onChange={(e) => handleChange("gst", e.target.value)}
            >
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
            </select>

            <div className="mt-3 font-bold text-green-600">
              Total: Rs. {calculateTotal().toFixed(2)}
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-blue-600">Advance</h3>

            <input
              type="number"
              className="w-full rounded-md border p-2"
              placeholder="Paid Amount"
              value={data.paidAmount}
              onChange={(e) => handleChange("paidAmount", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 text-right">
          <button
            onClick={handleUpdate}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-white shadow-lg transition hover:scale-105"
          >
            Save Booking
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBooking;
