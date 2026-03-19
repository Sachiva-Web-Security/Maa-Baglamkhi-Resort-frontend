import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const EditBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId;

  const [data, setData] = useState({
    guest_name: "",
    mobile: "",
    company_name: "",
    adults: 0,
    children: 0,
    room_number: "",
    tariff: 0,
    gst: 12,
    paidAmount: 0
  });

  useEffect(() => {
    if (!bookingId) return;

    axios
      .get(`http://localhost:5002/api/hotel/full-booking/${bookingId}`)
      .then((res) => setData(res.data))
      .catch((err) => console.log(err));
  }, [bookingId]);

  const handleChange = (field, value) => {
    setData({ ...data, [field]: value });
  };

  const calculateTotal = () => {
    const base = data.tariff * (data.adults + data.children);
    const gstAmount = (base * data.gst) / 100;
    return base + gstAmount;
  };

  const handleUpdate = async () => {
    try {
      const total = calculateTotal();

      await axios.put(
        `http://localhost:5002/api/hotel/full-booking/${bookingId}`,
        { ...data, total }
      );

      alert("Updated Successfully ✅");
      navigate("/hotel/all-bookings");

    } catch (err) {
      alert("Update Failed ❌");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-8">

        {/* HEADER */}
        <div className="mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            ✨ Edit Booking
          </h2>
          <p className="text-sm text-gray-500">
            Update all booking details in one place
          </p>
        </div>

        {/* GRID */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* GUEST */}
          <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3 text-blue-600">Guest Details</h3>

            <input
              className="border p-2 mb-3 w-full rounded-md focus:ring-2 focus:ring-blue-400"
              placeholder="Guest Name"
              value={data.guest_name}
              onChange={(e) => handleChange("guest_name", e.target.value)}
            />

            <input
              className="border p-2 w-full rounded-md focus:ring-2 focus:ring-blue-400"
              placeholder="Mobile"
              value={data.mobile}
              onChange={(e) => handleChange("mobile", e.target.value)}
            />
          </div>

          {/* COMPANY */}
          <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3 text-blue-600">Company</h3>

            <input
              className="border p-2 w-full rounded-md focus:ring-2 focus:ring-blue-400"
              placeholder="Company Name"
              value={data.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
            />
          </div>

          {/* PAX */}
          <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3 text-blue-600">Pax Details</h3>

            <div className="flex gap-3">
              <input
                type="number"
                className="border p-2 w-full rounded-md"
                placeholder="Adults"
                value={data.adults}
                onChange={(e) => handleChange("adults", e.target.value)}
              />

              <input
                type="number"
                className="border p-2 w-full rounded-md"
                placeholder="Children"
                value={data.children}
                onChange={(e) => handleChange("children", e.target.value)}
              />
            </div>
          </div>

          {/* ROOM */}
          <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3 text-blue-600">Room</h3>

            <input
              className="border p-2 w-full rounded-md"
              placeholder="Room Number"
              value={data.room_number}
              onChange={(e) => handleChange("room_number", e.target.value)}
            />
          </div>

          {/* TARIFF */}
          <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3 text-blue-600">Tariff</h3>

            <input
              type="number"
              className="border p-2 w-full mb-3 rounded-md"
              placeholder="Tariff"
              value={data.tariff}
              onChange={(e) => handleChange("tariff", e.target.value)}
            />

            <select
              className="border p-2 w-full rounded-md"
              value={data.gst}
              onChange={(e) => handleChange("gst", e.target.value)}
            >
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
            </select>

            <div className="mt-3 text-green-600 font-bold">
              Total: ₹ {calculateTotal().toFixed(2)}
            </div>
          </div>

          {/* ADVANCE */}
          <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3 text-blue-600">Advance</h3>

            <input
              type="number"
              className="border p-2 w-full rounded-md"
              placeholder="Paid Amount"
              value={data.paidAmount}
              onChange={(e) => handleChange("paidAmount", e.target.value)}
            />
          </div>

        </div>

        {/* BUTTON */}
        <div className="mt-8 text-right">
          <button
            onClick={handleUpdate}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition"
          >
            💾 Save Booking
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditBooking;