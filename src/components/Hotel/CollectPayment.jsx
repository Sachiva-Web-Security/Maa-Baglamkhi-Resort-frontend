import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";

const PAYMENT_MODES = ["Cash", "Card", "UPI", "Bank Transfer"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const CollectPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { bookingId, remainingAmount } = location.state || {};

  // 🔥 IMPORTANT GUARD (ADD THIS HERE)
  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-10 text-center bg-white rounded-xl shadow">
          <h2 className="text-xl font-bold text-red-600">
            Invalid Access ❌
          </h2>
          <button
            onClick={() => navigate("/hotel/all-bookings")}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [loading, setLoading] = useState(false);

  const safeRemaining = Number(remainingAmount || 0);
  const enteredAmount = Number(amount || 0);
  const newRemaining = Math.max(safeRemaining - enteredAmount, 0);

  const handleSubmit = async () => {
    if (!enteredAmount || enteredAmount <= 0) {
      alert("Enter valid amount");
      return;
    }

    if (enteredAmount > safeRemaining) {
      alert("Amount cannot exceed remaining balance");
      return;
    }

    try {
      setLoading(true);

      await API.post(`/hotel/advance/${bookingId}`, {
        amount: enteredAmount,
        paymentMode,
      });

      alert("Payment Received ✅");

      navigate("/hotel/all-bookings");
    } catch (err) {
      console.error(err);
      alert("Payment Failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6">

        {/* HEADER */}
        <div className="mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Collect Payment
          </h2>
          <p className="text-sm text-gray-500">
            Booking ID: #{bookingId}
          </p>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="text-xs text-blue-600">Remaining</div>
            <div className="text-xl font-bold text-blue-900">
              {formatCurrency(safeRemaining)}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-xl">
            <div className="text-xs text-green-600">After Payment</div>
            <div className="text-xl font-bold text-green-900">
              {formatCurrency(newRemaining)}
            </div>
          </div>
        </div>

        {/* INPUT */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">
            Enter Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter payment amount"
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* PAYMENT MODE */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-1">
            Payment Mode
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full border rounded-lg p-3"
          >
            {PAYMENT_MODES.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/hotel/all-bookings")}
            className="w-full bg-gray-300 text-gray-800 py-3 rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
          >
            {loading ? "Processing..." : "Receive Payment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollectPayment;