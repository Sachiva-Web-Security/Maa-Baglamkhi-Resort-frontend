import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5002/api/hotel";

const AllBooking = () => {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  // 🔥 FETCH DATA (WITH ERROR HANDLING)
  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API}/all-bookings`);
      setBookings(res.data);
    } catch (err) {
      console.error("Fetch Error 👉", err);
      alert("Server connection error ❌");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // 🔥 DELETE
  

  // 🔥 REFUND
  const handleRefund = async (id) => {
    const amount = prompt("Enter refund amount");

    if (!amount || isNaN(amount)) {
      alert("Invalid amount ❌");
      return;
    }

    try {
      await axios.post(`${API}/refund/${id}`, { amount });
      alert("Refund Done 💸");
      fetchBookings();
    } catch (err) {
      console.error(err);
      alert("Refund Failed ❌");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">

      <h2 className="text-3xl font-bold mb-8 text-gray-800">
        🏨 All Bookings
      </h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        {bookings.map((b) => {

          const refund = b.refundAmount || 0;
          const paid = b.paidAmount || 0;

          return (
            <div
              key={b.bookingId}
              className="bg-white rounded-2xl shadow-lg p-5 border hover:shadow-xl transition"
            >

              <h3 className="text-lg font-bold text-blue-600">
                {b.guest_name}
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                📞 {b.mobile}
              </p>

              <p className="text-sm">🆔 ID: {b.bookingId}</p>

              <p className="text-sm">
                🏢 {b.company_name || "N/A"}
              </p>

              <p className="text-sm">
                🛏 {b.rooms || "Not Assigned"}
              </p>

              {/* 💰 AMOUNT */}
              <div className="mt-3 space-y-1 text-sm">

                <p className="text-green-600 font-semibold">
                  Total: ₹ {b.totalAmount || 0}
                </p>

                <p className="text-blue-600">
                  Paid: ₹ {paid}
                </p>

                <p className="text-purple-600">
                  Refund: ₹ {refund}
                </p>

                <p className="text-red-500">
                  Remaining: ₹ {b.remainingAmount || 0}
                </p>

              </div>

              {/* STATUS */}
              <div className="mt-3">
                {refund > 0 ? (
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                    Refunded ₹ {refund}
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                    Active
                  </span>
                )}
              </div>

              {/* BUTTONS */}
              <div className="flex flex-wrap gap-2 mt-4">

                <button
                  onClick={() =>
                    navigate("/hotel/communication", {
                      state: {
                        bookingId: b.bookingId,
                        totalAmount: b.totalAmount || 0,
                        paidAmount: paid,
                        remainingAmount: b.remainingAmount || 0,
                      },
                    })
                  }
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  View
                </button>

                <button
                  onClick={() =>
                    navigate("/hotel/edit-booking", {
                      state: { bookingId: b.bookingId },
                    })
                  }
                  className="bg-yellow-400 text-black px-3 py-1 rounded text-sm"
                >
                  Edit
                </button>

               

                <button
                  onClick={() => handleRefund(b.bookingId)}
                  className="bg-purple-500 text-white px-3 py-1 rounded text-sm"
                >
                  Refund
                </button>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
};

export default AllBooking;