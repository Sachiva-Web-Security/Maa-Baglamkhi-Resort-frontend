import React from "react";
import { useNavigate } from "react-router-dom";

const Payment = ({ totalAmount = 420 }) => {

  const navigate = useNavigate();

  const handlePayment = () => {
    alert("Payment Successful!");
    navigate("/restaurant");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">

      <div className="bg-white p-6 rounded-xl shadow-lg w-96">

        <h2 className="text-2xl font-bold mb-4 text-center">
          Payment
        </h2>

        <div className="text-center mb-4">

          <p className="text-lg font-semibold">
            Total Amount
          </p>

          <p className="text-3xl font-bold text-green-600">
            ₹{totalAmount}
          </p>

        </div>

        <div className="flex justify-between gap-3">

          <button
            onClick={() => navigate("/restaurant")}
            className="w-full bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>

          <button
            onClick={handlePayment}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Pay Now
          </button>

        </div>

      </div>

    </div>
  );
};

export default Payment;