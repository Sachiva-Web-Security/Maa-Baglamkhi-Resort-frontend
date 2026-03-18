import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const Communication = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    const savedData = JSON.parse(
      localStorage.getItem("advancePaymentData")
    );

    if (savedData) {
      setData(savedData);
    }
  }, []);

  // 🔥 100% WORKING PRINT FUNCTION
  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;

    window.location.reload(); // restore React
  };

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">

      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-6">

        {/* NORMAL UI */}
        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Communication Details »
        </h2>

        <div className="bg-green-100 text-green-700 text-sm p-3 rounded mb-6">
          Advance Payment successfully updated for Booking ID -
          <span className="font-semibold"> BX567BE6142DD </span>.
        </div>

        {/* SUMMARY */}
        <div className="mb-6 text-sm text-gray-700 space-y-2">
          <div><b>Total:</b> ₹ {data.totalAmount}</div>
          <div><b>Advance Paid:</b> ₹ {data.paidAmount}</div>
          <div><b>Remaining:</b> ₹ {data.remainingAmount}</div>
        </div>

        {/* ACTIONS */}
        <div className="space-y-3 text-blue-600 text-sm">

          <button
            className="block hover:underline"
            onClick={handlePrint}
          >
            🖨 Print Booking Slip »
          </button>

          <button
            className="block hover:underline"
            onClick={() => {
              const phone = prompt("Enter WhatsApp Number");
              if (!phone) return;

              const msg = `🏨 Booking Invoice

Total: ₹${data.totalAmount}
Advance: ₹${data.paidAmount}
Remaining: ₹${data.remainingAmount}`;

              window.open(
                `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
              );
            }}
          >
            💬 WhatsApp Booking Slip »
          </button>

          <button
            className="block hover:underline"
            onClick={() => {
              const email = prompt("Enter Email");
              if (!email) return;

              const subject = "Booking Invoice";

              const body = `🏨 Booking Invoice

Total: ₹${data.totalAmount}
Advance: ₹${data.paidAmount}
Remaining: ₹${data.remainingAmount}`;

              window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }}
          >
            ✉ Email Booking Slip »
          </button>

        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={() => navigate("/hotel/advance")}
            className="bg-gray-200 px-4 py-2 rounded"
          >
            ← Back
          </button>

          <button onClick={() => navigate("/hotel/guest")}>
            Add New Booking →
          </button>

        </div>

        {/* 🔥 HIDDEN PRINT INVOICE */}
        <div ref={printRef} className="hidden">

          <div className="p-6">

            <h1 className="text-2xl font-bold text-center mb-4">
              🏨 HOTEL INVOICE
            </h1>

            <div className="mb-4">
              <b>Booking ID:</b> BX567BE6142DD <br />
              <b>Date:</b> {new Date().toLocaleDateString()}
            </div>

            <hr className="my-2" />

            <h3 className="font-semibold mt-3">Room Details:</h3>

            {data.rooms.map((room, i) => (
              <div key={i}>
                {room.name} - {room.quantity} Pax
              </div>
            ))}

            <hr className="my-2" />

            <div className="mt-3">
              <div><b>Total:</b> ₹ {data.totalAmount}</div>
              <div><b>Advance Paid:</b> ₹ {data.paidAmount}</div>
              <div><b>Remaining:</b> ₹ {data.remainingAmount}</div>
            </div>

            <div className="mt-6 text-center">
              Thank you for your booking 🙏
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Communication;