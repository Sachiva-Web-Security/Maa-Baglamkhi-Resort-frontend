import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Guest = () => {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    agentBooking:false,
    bookingPoint:"Sumit Test (ID:53)",
    mobile:"",
    guestName:"",
    guestEmail:"",
    checkIn:"",
    checkOut:"",
    arrival:"12:00",
    departure:"10:00",
    bookingStatus:""
  })

  const handleChange = (e)=>{
    const {name,value,type,checked} = e.target

    setFormData({
      ...formData,
      [name]: type==="checkbox" ? checked : value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex justify-center items-center p-6">

      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-8 transition hover:shadow-3xl">

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-6">
          Guest Details »
        </h2>


        {/* ===== Guest Details ===== */}

        <div className="grid grid-cols-2 gap-6">

          {/* Agent Booking */}

          <div className="flex items-center gap-3">
            <label className="text-gray-600 font-medium">
              Agent Booking
            </label>

            <input
              type="checkbox"
              name="agentBooking"
              checked={formData.agentBooking}
              onChange={handleChange}
              className="w-4 h-4 accent-blue-500"
            />
          </div>


          {/* Booking Point */}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Booking Point *
            </label>

            <select
              name="bookingPoint"
              value={formData.bookingPoint}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 transition"
            >
              <option>Select</option>
              <option>Booking.com (ID:16)</option>
              <option>Go Ibibo (ID:15)</option>
              <option>Make My Trip (ID:14)</option>
              <option>Cleartrip (ID:17)</option>
              <option>Sumit Test (ID:53)</option>
            </select>
          </div>


          {/* Mobile */}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Mobile No.
            </label>

            <input
              type="text"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Enter mobile number"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>


          {/* Guest Name */}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Guest Name
            </label>

            <input
              type="text"
              name="guestName"
              value={formData.guestName}
              onChange={handleChange}
              placeholder="Type or Select"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>


          {/* Email */}

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Guest Email
            </label>

            <input
              type="email"
              name="guestEmail"
              value={formData.guestEmail}
              onChange={handleChange}
              placeholder="Enter email"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>

        </div>



        {/* ===== Booking Details ===== */}

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mt-8 mb-5">
          Booking Details »
        </h2>

        <div className="grid grid-cols-2 gap-6">

          {/* Check In */}

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Check-In *
            </label>

            <input
              type="date"
              name="checkIn"
              value={formData.checkIn}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>


          {/* Check Out */}

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Check-Out *
            </label>

            <input
              type="date"
              name="checkOut"
              value={formData.checkOut}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>


          {/* Arrival */}

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Expected Arrival *
            </label>

            <input
              type="time"
              name="arrival"
              value={formData.arrival}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>


          {/* Departure */}

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Expected Departure *
            </label>

            <input
              type="time"
              name="departure"
              value={formData.departure}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>


          {/* Booking Status */}

          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Booking Status *
            </label>

            <select
              name="bookingStatus"
              value={formData.bookingStatus}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400 transition"
            >
              <option>Select</option>
              <option>Confirmed</option>
              <option>Pending</option>
              <option>Cancelled</option>
            </select>
          </div>

        </div>



        {/* Button */}

        <div className="flex justify-center mt-10">

          <button
            onClick={() => navigate("/hotel/other-booking")}
            className="bg-blue-500 hover:bg-blue-600 transition text-white px-10 py-3 rounded-lg shadow-lg hover:scale-105"
          >
            Next →
          </button>

        </div>

      </div>

    </div>
  );
};

export default Guest;