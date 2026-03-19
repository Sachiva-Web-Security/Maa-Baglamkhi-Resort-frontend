import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const RoomTariff = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingId = location.state?.bookingId;
  const rooms = location.state?.rooms;
  const paxData = location.state?.paxData;

  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!rooms || !paxData) return;

    const finalRows = rooms.map((room) => ({
      name: room.name,
      quantity:
        (paxData[room.name]?.adults || 0) +
        (paxData[room.name]?.children || 0),
      price: 0,
      gst: 12
    }));

    setRows(finalRows);
  }, [rooms, paxData]);

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = Number(value);
    setRows(updated);
  };

  const calculateTotal = (row) => {
    const base = row.price * row.quantity;
    const gstAmount = (base * row.gst) / 100;
    return base + gstAmount;
  };

  const handleProceed = async () => {
    try {
      for (let row of rows) {
        await axios.post(
          `http://localhost:5002/api/hotel/room-tariff/${bookingId}`,
          {
            roomNumber: row.name,
            date: new Date(),
            quantity: row.quantity,
            tariff: row.price,
            gstPercent: row.gst,
            total: calculateTotal(row)
          }
        );
      }

      alert("Room Tariff Saved ✅");

      navigate("/hotel/advance", {
        state: {
          bookingId,
          rows
        }
      });

    } catch (err) {
      console.error(err);
      alert("Error saving ❌");
    }
  };

  return (
    <div className="p-6">
      {rows.map((row, index) => (
        <div key={index}>
          {row.name}
          <input onChange={(e)=>handleChange(index,"price",e.target.value)} />
        </div>
      ))}

      <button onClick={handleProceed}>Next</button>
    </div>
  );
};

export default RoomTariff;