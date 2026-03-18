import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Advance = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("0");
  const [rooms, setRooms] = useState([]);
  const [paidAmount, setPaidAmount] = useState(""); // 🔥 NEW

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("roomTariffData"));

    if (data) {
      setAmount(data.grandTotal);
      setRooms(data.rooms);
    }
  }, []);

  // 🔥 REMAINING CALCULATION
  const remainingAmount = (
    Number(amount) - Number(paidAmount || 0)
  ).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">

      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Advance Payment Details »
        </h2>

        <div className="bg-green-100 text-green-700 text-sm p-3 rounded mb-6">
          Room Tariff successfully updated for Booking ID -
          <span className="font-semibold"> BX567BE6142DD </span>
        </div>

        {/* ROOM DETAILS */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-600 mb-2">
            Room Details:
          </h3>

          {rooms.map((room, index) => (
            <div key={index} className="text-sm text-gray-700">
              {room.name} - {room.quantity} Pax
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">

          {/* TOTAL AMOUNT */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Total Amount
            </label>

            <input
              type="text"
              value={amount}
              readOnly
              className="w-full border rounded-md p-2 bg-gray-100"
            />
          </div>

          <div></div>

          {/* 🔥 ADVANCE PAID */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Advance Paid
            </label>

            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="Enter advance amount"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* 🔥 REMAINING */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Remaining Amount
            </label>

            <input
              type="text"
              value={remainingAmount}
              readOnly
              className="w-full border rounded-md p-2 bg-gray-100"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Payment Mode
            </label>

            <select className="w-full border rounded-md p-2">
              <option>Select</option>
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
          </div>

          {/* Receipt Account */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Receipt Account
            </label>

            <select className="w-full border rounded-md p-2">
              <option>Hotel Cash</option>
              <option>Restaurant Cash</option>
              <option>Cash Hotel</option>
              <option>Fo cash</option>
              <option>Sujay</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Transaction Details
            </label>

            <input
              type="text"
              className="w-full border rounded-md p-2"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Remarks
            </label>

            <input
              type="text"
              className="w-full border rounded-md p-2"
            />
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-8">

          <button onClick={() => navigate("/hotel/room-tariff")}>
            ← Go Back
          </button>

         <button
  onClick={() => {
    const dataToSave = {
      totalAmount: amount,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      rooms: rooms
    };

    localStorage.setItem(
      "advancePaymentData",
      JSON.stringify(dataToSave)
    );

    navigate("/hotel/communication");
  }}
>
  Save & Proceed →
</button>

        </div>

      </div>
    </div>
  );
};

export default Advance;