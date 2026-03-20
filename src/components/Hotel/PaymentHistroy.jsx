import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";

const PaymentHistory = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { bookingId } = location.state || {};

  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (bookingId) {
      fetchPayments();
    }
  }, [bookingId]);

  const fetchPayments = async () => {
    try {
      const res = await API.get(`/hotel/payment-history/${bookingId}`);
      setPayments(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load payment history");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        Payment History - #{bookingId}
      </h2>

      <table className="w-full border">
        <thead>
  <tr className="bg-gray-100">
    <th className="p-2 border">Guest</th>
    <th className="p-2 border">Room</th>
    <th className="p-2 border">Amount</th>
    <th className="p-2 border">Mode</th>
    <th className="p-2 border">Date</th>
  </tr>
</thead>

        <tbody>
  {payments.map((p) => (
    <tr key={p.id}>
      <td className="p-2 border font-bold">
        {p.guest_name}
      </td>

      <td className="p-2 border">
        {p.rooms}
      </td>

      <td className="p-2 border">₹{p.amount}</td>

      <td className="p-2 border">{p.payment_mode}</td>

      <td className="p-2 border">
        {new Date(p.created_at).toLocaleString()}
      </td>
    </tr>
  ))}
</tbody>
      </table>

      <button
        onClick={() => navigate("/hotel/all-bookings")}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Back
      </button>
    </div>
  );
};

export default PaymentHistory;