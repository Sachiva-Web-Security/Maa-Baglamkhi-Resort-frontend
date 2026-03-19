import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const Advance = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingId = location.state?.bookingId;
  const rows = location.state?.rows || [];

  const [amount, setAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("");

  useEffect(() => {
    const total = rows.reduce((sum, row) => {
      const base = row.price * row.quantity;
      const gstAmount = (base * row.gst) / 100;
      return sum + base + gstAmount;
    }, 0);

    setAmount(total.toFixed(2));
  }, [rows]);

  const remainingAmount =
    (Number(amount) - Number(paidAmount || 0)).toFixed(2);

  const handleProceed = async () => {
    try {
      await axios.post(
        `http://localhost:5002/api/hotel/advance/${bookingId}`,
        {
          totalAmount: amount,
          paidAmount,
          remainingAmount,
          paymentMode
        }
      );

      navigate("/hotel/communication", {
        state: {
          bookingId,
          totalAmount: amount,
          paidAmount,
          remainingAmount,
          rooms: rows
        }
      });

    } catch (err) {
      alert("Error ❌");
    }
  };

  return (
    <div className="p-6">
      <h3>Total: {amount}</h3>

      <input
        placeholder="Paid"
        onChange={(e)=>setPaidAmount(e.target.value)}
      />

      <button onClick={handleProceed}>Next</button>
    </div>
  );
};

export default Advance;