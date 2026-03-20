import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";
import { getStoredBookingId, setStoredBookingId } from "./bookingSession";

const EditBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId || getStoredBookingId();

  const [data, setData] = useState({
    guest_name: "",
    mobile: "",
    company_name: "",
    paidAmount: 0,
  });

  const [rooms, setRooms] = useState([]); // 🔥 NEW

  useEffect(() => {
    if (!bookingId) return;

    setStoredBookingId(bookingId);

    API.get(`/hotel/full-booking/${bookingId}`)
      .then((res) => {
        setData(res.data);
        setRooms(res.data.rooms || []);
      })
      .catch((err) => console.log(err));
  }, [bookingId]);

  const handleRoomChange = (index, field, value) => {
    const updated = [...rooms];
    updated[index][field] = value;
    setRooms(updated);
  };

  const calculateTotal = (room) => {
    const base = Number(room.tariff || 0) * (Number(room.adults || 0) + Number(room.children || 0));
    const gstAmount = (base * Number(room.gst || 0)) / 100;
    return base + gstAmount;
  };

  const handleUpdate = async () => {
    try {
      const updatedRooms = rooms.map((room) => ({
        ...room,
        total: calculateTotal(room),
      }));

      await API.put(`/hotel/full-booking/${bookingId}`, {
        ...data,
        rooms: updatedRooms,
      });

      alert("Updated Successfully");
      navigate("/hotel/all-bookings");
    } catch (err) {
      console.error(err);
      alert("Update Failed");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Edit Booking</h2>

      {/* Guest */}
      <input
        placeholder="Guest Name"
        value={data.guest_name}
        onChange={(e) => setData({ ...data, guest_name: e.target.value })}
      />

      <input
        placeholder="Mobile"
        value={data.mobile}
        onChange={(e) => setData({ ...data, mobile: e.target.value })}
      />

      {/* 🔥 MULTIPLE ROOMS */}
      {rooms.map((room, index) => (
        <div key={index} style={{ border: "1px solid #ccc", margin: 10, padding: 10 }}>
          <h4>Room {room.room_number}</h4>

          <input
            type="number"
            value={room.adults}
            onChange={(e) => handleRoomChange(index, "adults", e.target.value)}
            placeholder="Adults"
          />

          <input
            type="number"
            value={room.children}
            onChange={(e) => handleRoomChange(index, "children", e.target.value)}
            placeholder="Children"
          />

          <input
            type="number"
            value={room.tariff}
            onChange={(e) => handleRoomChange(index, "tariff", e.target.value)}
            placeholder="Tariff"
          />

          <select
            value={room.gst}
            onChange={(e) => handleRoomChange(index, "gst", e.target.value)}
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={12}>12%</option>
            <option value={18}>18%</option>
          </select>

          <div>
            Total: ₹{calculateTotal(room).toFixed(2)}
          </div>
        </div>
      ))}

      <button onClick={handleUpdate}>Save</button>
    </div>
  );
};

export default EditBooking;
