import React, { useState, useEffect } from "react";
import API from "../api";
import SummaryCard from '../components/Hotel/SummaryCard';
import RoomCard from '../components/Hotel/RoomCard';
import BookingRow from '../components/Hotel/BookingRow';
import Modal from '../components/Hotel/Modal';
import BookingForm from '../components/Hotel/BookingForm';
import './Hotel.css';

const Hotel = () => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [modals, setModals] = useState({
    newBooking: false,
    expressCheckIn: false,
    checkOut: false,
    nightAudit: false,
    extend: false,
    shiftRoom: false,
    addRoom: false,
  });

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/hotel");
        setRooms(res.data.rooms || []);
        setBookings(res.data.bookings || []);
      } catch (err) {
        console.error("Error loading hotel data", err);
        alert("Error loading hotel data from server");
      }
    };

    fetchData();
  }, []);

  // Calculate summary statistics
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(r => r.status === 'Available').length;
  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
  const cleaningRooms = rooms.filter(r => r.status === 'Cleaning').length;

  const openModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    setSelectedBooking(null);
    setSelectedRoom(null);
  };

  const handleNewBooking = async (formData) => {
    const payload = {
      guestName: formData.guestName,
      room: formData.room,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
    };

    try {
      const res = await API.post("/hotel/book", payload);

      const newBooking = {
        id: res.data.bookingId,
        guestName: formData.guestName,
        room: formData.room,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        status: "Occupied",
      };

      setBookings((prev) => [newBooking, ...prev]);

      setRooms((prev) =>
        prev.map((room) =>
          room.number === formData.room
            ? {
              ...room,
              status: "Occupied",
              guest: formData.guestName,
              checkIn: formData.checkIn,
              checkOut: formData.checkOut,
            }
            : room
        )
      );

      alert(`Booking created for ${formData.guestName} in Room ${formData.room}`);
      closeModal("newBooking");
    } catch (err) {
      console.error("Error creating booking", err);
      alert("Error creating booking");
    }
  };

  const handleExpressCheckIn = (formData) => {
    handleNewBooking(formData);
    closeModal('expressCheckIn');
  };

  const handleCheckOut = async (booking) => {
    if (!window.confirm(`Check out ${booking.guestName} from Room ${booking.room}?`)) {
      return;
    }

    try {
      await API.post("/hotel/checkout", {
        id: booking.id,
        room: booking.room,
      });

      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
      setRooms((prev) =>
        prev.map((room) =>
          room.number === booking.room
            ? {
              ...room,
              status: "Cleaning",
              guest: null,
              checkIn: null,
              checkOut: null,
            }
            : room
        )
      );

      alert(`${booking.guestName} checked out successfully`);
      closeModal("checkOut");
    } catch (err) {
      console.error("Error during checkout", err);
      alert("Error during checkout");
    }
  };

  const handleNightAudit = async () => {
    if (window.confirm('Run Night Audit? This will process all check-ins and check-outs for today.')) {
      try {
        await API.post("/hotel/night-audit");
        alert('Night Audit completed successfully!');
        closeModal('nightAudit');
      } catch (err) {
        console.error("Error running night audit", err);
        alert("Error during night audit");
      }
    }
  };

  const handleAddNewRoom = async (formData) => {
    try {
      if (!formData.roomNumber) return alert("Please enter a room number");

      const res = await API.post("/hotel/room", { roomNumber: formData.roomNumber });

      const newRoom = {
        id: res.data.id || Date.now(),
        number: Number(formData.roomNumber) || formData.roomNumber,
        status: "Available",
        guest: null,
        checkIn: null,
        checkOut: null
      };

      setRooms(prev => [...prev, newRoom].sort((a, b) => String(a.number).localeCompare(String(b.number))));

      alert(`Room ${formData.roomNumber} added successfully!`);
      closeModal('addRoom');
    } catch (err) {
      console.error("Error adding room", err);
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert("Error adding new room");
      }
    }
  };

  const handleExtend = (booking) => {
    setSelectedBooking(booking);
    openModal('extend');
  };

  const handleExtendSubmit = async (formData) => {
    try {
      await API.post("/hotel/extend", {
        id: selectedBooking.id,
        checkOut: formData.checkOut,
      });

      // Optimistic update
      setBookings(prev => prev.map(b =>
        b.id === selectedBooking.id
          ? { ...b, checkOut: formData.checkOut }
          : b
      ));

      setRooms(prev => prev.map(room =>
        room.number === selectedBooking.room
          ? { ...room, checkOut: formData.checkOut }
          : room
      ));

      alert(`Booking extended for ${selectedBooking.guestName}`);
      closeModal('extend');
    } catch (err) {
      console.error("Error extending booking", err);
      alert("Error extending booking");
    }
  };

  const handleShiftRoom = (booking) => {
    setSelectedBooking(booking);
    openModal('shiftRoom');
  };

  const handleShiftRoomSubmit = async (formData) => {
    try {
      await API.post("/hotel/shift", {
        id: selectedBooking.id,
        oldRoom: selectedBooking.room,
        newRoom: formData.room,
        guestName: selectedBooking.guestName,
        checkIn: selectedBooking.checkIn,
        checkOut: selectedBooking.checkOut,
      });

      // Optimistic Update
      setRooms(prev => prev.map(room =>
        room.number === selectedBooking.room
          ? { ...room, status: 'Cleaning', guest: null, checkIn: null, checkOut: null }
          : room
      ));

      setRooms(prev => prev.map(room =>
        room.number === formData.room
          ? { ...room, status: 'Occupied', guest: selectedBooking.guestName, checkIn: selectedBooking.checkIn, checkOut: selectedBooking.checkOut }
          : room
      ));

      setBookings(prev => prev.map(b =>
        b.id === selectedBooking.id
          ? { ...b, room: formData.room }
          : b
      ));

      alert(`${selectedBooking.guestName} shifted to Room ${formData.room}`);
      closeModal('shiftRoom');
    } catch (err) {
      console.error("Error shifting room", err);
      alert("Error shifting room");
    }
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
  };

  const handleRoomCheckIn = (room) => {
    setSelectedRoom(room);
    openModal('expressCheckIn');
  };

  const handleRoomCheckOut = (room) => {
    const booking = bookings.find(b => b.room === room.number);
    if (booking) {
      handleCheckOut(booking);
    }
  };

  const handleMarkCleaning = async (room) => {
    try {
      await API.put(`/hotel/room/${room.number}/status`, { status: 'Cleaning' });
      setRooms(prev => prev.map(r =>
        r.number === room.number
          ? { ...r, status: 'Cleaning', guest: null, checkIn: null, checkOut: null }
          : r
      ));

      setBookings(prev => prev.filter(b => b.room !== room.number));
      alert(`Room ${room.number} marked for cleaning`);
    } catch (err) {
      console.error("Error setting room to cleaning", err);
      alert("Error marking room for cleaning");
    }
  };

  const handleMarkAvailable = async (room) => {
    try {
      await API.put(`/hotel/room/${room.number}/status`, { status: 'Available' });
      setRooms(prev => prev.map(r =>
        r.number === room.number
          ? { ...r, status: 'Available' }
          : r
      ));
      alert(`Room ${room.number} is now available`);
    } catch (err) {
      console.error("Error setting room to available", err);
      alert("Error marking room as available");
    }
  };

  return (

    <div className="min-h-screen w-280 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 p-6">
      {/* Page Title */}
      <h1 className="text-amber-50 text-2xl font-bold mb-10 w-full pl-110">Hotel Management</h1>

      {/* Top Action Buttons */}
      <div className="action-buttons justify-between ">
        <button
          className="h-12 w-60 bg-slate-700 hover:bg-slate-600
             text-white rounded-full"
          onClick={() => openModal('newBooking')}
        >
          + New Booking
        </button>
        <button
          className="h-12 w-60 bg-slate-700 hover:bg-slate-600
             text-white rounded-full"
          onClick={() => openModal('expressCheckIn')}
        >
          Express Check-In
        </button>

        <button
          className="h-12 w-60 bg-slate-700 hover:bg-slate-600
             text-white rounded-full"
          onClick={() => {
            if (bookings.length > 0) {
              setSelectedBooking(bookings[0]);
              openModal('checkOut');
            } else {
              alert('No active bookings to check out');
            }
          }}
        >
          Check-Out
        </button>

        <button
          className="h-12 w-60 bg-slate-700 hover:bg-slate-600
             text-white rounded-full"
          onClick={() => openModal('nightAudit')}
        >
          Night Audit
        </button>

        <button
          className="h-12 w-60 bg-green-600 hover:bg-green-500
             text-white rounded-full ml-4"
          onClick={() => openModal('addRoom')}
        >
          + Add New Room
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards bg-slate-900">
        <SummaryCard
          label="Total Rooms"
          value={totalRooms}
          onClick={() => alert(`Total Rooms: ${totalRooms}`)}
        />
        <SummaryCard
          label="Available"
          value={availableRooms}
          color="green"
          bgColor="green"
          onClick={() => alert(`Available Rooms: ${availableRooms}`)}
        />
        <SummaryCard
          label="Occupied"
          value={occupiedRooms}
          color="red"
          bgColor="red"
          onClick={() => alert(`Occupied Rooms: ${occupiedRooms}`)}
        />
        <SummaryCard
          label="Cleaning"
          value={cleaningRooms}
          color="yellow"
          bgColor="yellow"
          onClick={() => alert(`Rooms in Cleaning: ${cleaningRooms}`)}
        />
      </div>

      {/* Room Grid */}
      <h2 className="section-title">Room Status</h2>

      <div className="room-grid">
        {rooms.map((room) => (
          <RoomCard
            key={room.number}
            room={room}
            onRoomClick={handleRoomClick}
            onCheckIn={handleRoomCheckIn}
            onCheckOut={handleRoomCheckOut}
            onMarkCleaning={handleMarkCleaning}
            onMarkAvailable={handleMarkAvailable}
          />
        ))}
      </div>

      {/* Booking Table */}
      <div className="w-full max-w-6xl
                bg-white/10
                backdrop-blur-xl
                border border-white/20
                rounded-2xl
                shadow-2xl
                p-6 h-38 ht-96 -mt-4
                transition duration-300">

        <h2 className="text-2xl font-semibold text-white mb-6">
          Active Bookings
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-200">

            <thead className="border-b border-white/20 text-gray-300 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Guest Name</th>
                <th className="px-4 py-3 text-left">Room</th>
                <th className="px-4 py-3 text-left">Check-In</th>
                <th className="px-4 py-3 text-left">Check-Out</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10 gradiendt-to-r from-green-300">
              {bookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onExtend={handleExtend}
                  onShiftRoom={handleShiftRoom}
                  onCheckOut={handleCheckOut}
                />
              ))}
            </tbody>

          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={modals.newBooking}
        onClose={() => closeModal('newBooking')}
        title="New Booking"
      >
        <BookingForm
          onSubmit={handleNewBooking}
          onCancel={() => closeModal('newBooking')}
          availableRooms={rooms.filter(r => r.status === 'Available' || r.status === 'Cleaning')}
        />
      </Modal>

      <Modal
        isOpen={modals.expressCheckIn}
        onClose={() => closeModal('expressCheckIn')}
        title="Express Check-In"
      >
        <BookingForm
          onSubmit={handleExpressCheckIn}
          onCancel={() => closeModal('expressCheckIn')}
          initialData={selectedRoom ? { room: selectedRoom.number } : {}}
          availableRooms={rooms.filter(r => r.status === 'Available' || r.status === 'Cleaning')}
        />
      </Modal>

      <Modal
        isOpen={modals.checkOut}
        onClose={() => closeModal('checkOut')}
        title="Check-Out"
      >
        {selectedBooking && (
          <div>
            <p>Guest: <strong>{selectedBooking.guestName}</strong></p>
            <p>Room: <strong>{selectedBooking.room}</strong></p>
            <p>Check-In: <strong>{selectedBooking.checkIn}</strong></p>
            <p>Check-Out: <strong>{selectedBooking.checkOut}</strong></p>
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button className="btn-cancel" onClick={() => closeModal('checkOut')}>
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={() => handleCheckOut(selectedBooking)}
              >
                Confirm Check-Out
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={modals.nightAudit}
        onClose={() => closeModal('nightAudit')}
        title="Night Audit"
      >
        <div>
          <p>This will process all check-ins and check-outs for today.</p>
          <p><strong>Summary:</strong></p>
          <ul>
            <li>Total Rooms: {totalRooms}</li>
            <li>Occupied: {occupiedRooms}</li>
            <li>Available: {availableRooms}</li>
            <li>Cleaning: {cleaningRooms}</li>
          </ul>
          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button className="btn-cancel" onClick={() => closeModal('nightAudit')}>
              Cancel
            </button>
            <button className="btn-submit" onClick={handleNightAudit}>
              Run Night Audit
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modals.extend}
        onClose={() => closeModal('extend')}
        title="Extend Booking"
      >
        {selectedBooking && (
          <BookingForm
            onSubmit={handleExtendSubmit}
            onCancel={() => closeModal('extend')}
            initialData={{
              guestName: selectedBooking.guestName,
              room: selectedBooking.room,
              checkIn: selectedBooking.checkIn,
              checkOut: selectedBooking.checkOut,
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={modals.shiftRoom}
        onClose={() => closeModal('shiftRoom')}
        title="Shift Room"
      >
        {selectedBooking && (
          <BookingForm
            onSubmit={handleShiftRoomSubmit}
            onCancel={() => closeModal('shiftRoom')}
            initialData={{
              guestName: selectedBooking.guestName,
              room: selectedBooking.room,
              checkIn: selectedBooking.checkIn,
              checkOut: selectedBooking.checkOut,
            }}
            availableRooms={rooms.filter(r => r.status === 'Available' || r.status === 'Cleaning')}
          />
        )}
      </Modal>

      <Modal
        isOpen={modals.addRoom}
        onClose={() => closeModal('addRoom')}
        title="Add New Room"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handleAddNewRoom({ roomNumber: formData.get('roomNumber') });
        }}>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number:</label>
            <input
              type="text"
              name="roomNumber"
              required
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g. 101"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300" onClick={() => closeModal('addRoom')}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Add Room
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Hotel;
