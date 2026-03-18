import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RoomTariff = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const paxData = JSON.parse(localStorage.getItem("finalPaxData")) || [];

    const finalRows = paxData.map((item) => ({
      name: item.name,
      quantity: item.total,
      price: 0,
      gst: 12
    }));

    setRows(finalRows);
  }, []);

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = Number(value);
    setRows(updated);
  };

  const calculateTotal = (row) => {
    const base = row.price * row.quantity;
    const gstAmount = (base * row.gst) / 100;
    return (base + gstAmount).toFixed(2);
  };

  // 🔥 SAVE DATA BEFORE NAVIGATE
  const handleProceed = () => {
    const grandTotal = rows.reduce(
      (sum, row) => sum + Number(calculateTotal(row)),
      0
    );

    const dataToSave = {
      rooms: rows,
      grandTotal: grandTotal.toFixed(2)
    };

    localStorage.setItem("roomTariffData", JSON.stringify(dataToSave));

    navigate("/hotel/advance");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Room Tariff Details »
        </h2>

        <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-gray-600 mb-3">
          <div>Room</div>
          <div>Pax</div>
          <div>Tariff / Person</div>
          <div>GST (%)</div>
          <div>Total</div>
        </div>

        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 mb-3">

            <div className="bg-gray-100 p-2 rounded text-sm">
              {row.name}
            </div>

            <input
              type="number"
              value={row.quantity}
              onChange={(e) =>
                handleChange(index, "quantity", e.target.value)
              }
              className="border rounded-md p-2"
            />

            <input
              type="number"
              value={row.price}
              onChange={(e) =>
                handleChange(index, "price", e.target.value)
              }
              className="border rounded-md p-2"
            />

            <select
              value={row.gst}
              onChange={(e) =>
                handleChange(index, "gst", e.target.value)
              }
              className="border rounded-md p-2"
            >
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
            </select>

            <input
              type="text"
              value={calculateTotal(row)}
              readOnly
              className="border rounded-md p-2 bg-gray-100"
            />
          </div>
        ))}

        <div className="mt-6 text-right font-semibold text-lg text-green-700">
          Grand Total: ₹{" "}
          {rows
            .reduce((sum, row) => sum + Number(calculateTotal(row)), 0)
            .toFixed(2)}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => navigate("/hotel/pax")}>
            ← Go Back
          </button>

          {/* 🔥 UPDATED BUTTON */}
          <button onClick={handleProceed}>
            Save & Proceed →
          </button>
        </div>

      </div>
    </div>
  );
};

export default RoomTariff;