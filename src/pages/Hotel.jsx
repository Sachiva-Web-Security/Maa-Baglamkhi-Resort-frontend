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
      pricePerDay: formData.pricePerDay || null,
      phone: formData.phone || null,
    };

    try {
      const res = await API.post("/hotel/book", payload);

      const newBooking = {
        id: res.data.bookingId,
        guestName: formData.guestName,
        room: formData.room,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        pricePerDay: formData.pricePerDay || "",
        phone: formData.phone || "",
        status: "Occupied",
        billGenerated: 0,
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

        // Refresh all data
        const [roomsRes, bookingsRes] = await Promise.all([
          API.get("/hotel/rooms"),
          API.get("/hotel/bookings")
        ]);
        setRooms(roomsRes.data);
        setBookings(bookingsRes.data);

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
    const bookingId = formData.bookingId;
    const guestName = formData.guestName;
    const room = formData.room;
    try {
      await API.post("/hotel/extend", {
        id: bookingId,
        checkOut: formData.checkOut,
      });

      // Optimistic update
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, checkOut: formData.checkOut } : b
      ));
      setRooms(prev => prev.map(r =>
        r.number === room ? { ...r, checkOut: formData.checkOut } : r
      ));

      closeModal('extend');
      alert(`Booking extended for ${guestName}`);
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
    const { bookingId, newRoom, guestName, oldRoom, checkIn, checkOut } = formData;
    try {
      await API.post("/hotel/shift", {
        id: bookingId,
        oldRoom: oldRoom,
        newRoom: newRoom,
        guestName: guestName,
        checkIn: checkIn,
        checkOut: checkOut,
      });

      // Update bookings
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, room: newRoom } : b))
      );

      // Update room statuses
      setRooms((prev) =>
        prev.map((r) => {
          if (r.number === oldRoom) return { ...r, status: "Cleaning", guest: null, checkIn: null, checkOut: null };
          if (r.number === newRoom) {
            const booking = bookings.find(b => b.id === bookingId);
            return { ...r, status: "Occupied", guest: guestName, checkIn: booking?.checkIn, checkOut: booking?.checkOut };
          }
          return r;
        })
      );

      alert(`Room shifted for ${guestName} to Room ${newRoom}`);
      closeModal("shiftRoom");
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

  const handleBillGenerated = (bookingId) => {
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, billGenerated: 1 } : b
    ));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 p-6">
      {/* Page Title */}
      <h1 className="text-amber-50 text-2xl font-bold mb-10 w-full text-center">Hotel Management</h1>

      {/* Top Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-10 justify-center">
        <button
          className="h-12 w-60 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition shadow-lg"
          onClick={() => openModal('newBooking')}
        >
          + New Booking
        </button>
        <button
          className="h-12 w-60 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition shadow-lg"
          onClick={() => openModal('expressCheckIn')}
        >
          Express Check-In
        </button>

        <button
          className="h-12 w-60 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition shadow-lg"
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
          className="h-12 w-60 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition shadow-lg"
          onClick={() => openModal('nightAudit')}
        >
          Night Audit
        </button>

        <button
          className="h-12 w-60 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition shadow-lg"
          onClick={() => { setSelectedBooking(null); openModal('extend'); }}
        >
          Extend
        </button>

        <button
          className="h-12 w-60 bg-yellow-600 hover:bg-yellow-500 text-white rounded-full transition shadow-lg"
          onClick={() => { setSelectedBooking(null); openModal('shiftRoom'); }}
        >
          Shift Room
        </button>

        <button
          className="h-12 w-60 bg-green-600 hover:bg-green-500 text-white rounded-full transition shadow-lg"
          onClick={() => openModal('addRoom')}
        >
          + Add New Room
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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


      {/* Booking Table */}
      <div className="w-full max-w-7xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 transition duration-300">
        <h2 className="text-xl font-semibold text-white mb-6">Active Bookings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">Guest Name</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Room</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Check-In</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Check-Out</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left whitespace-nowrap min-w-[300px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onExtend={handleExtend}
                  onShiftRoom={handleShiftRoom}
                  onCheckOut={handleCheckOut}
                  onBillGenerated={handleBillGenerated}
                />
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500 italic">No active bookings found.</td>
                </tr>
              )}
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
          availableRooms={rooms.filter(r => r.status === 'Available')}
        />
      </Modal>

      <Modal isOpen={modals.checkOut} onClose={() => closeModal('checkOut')} title="Check-Out">
        <CheckOutPanel
          bookings={bookings}
          onConfirm={handleCheckOut}
          onCancel={() => closeModal('checkOut')}
        />
      </Modal>

      <Modal isOpen={modals.nightAudit} onClose={() => closeModal('nightAudit')} title="Night Audit">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Process all check-ins and check-outs for today and generate a daily summary.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Rooms", value: totalRooms, color: "bg-indigo-50 text-indigo-700" },
              { label: "Occupied", value: occupiedRooms, color: "bg-red-50 text-red-600" },
              { label: "Available", value: availableRooms, color: "bg-green-50 text-green-600" },
              { label: "Cleaning", value: cleaningRooms, color: "bg-yellow-50 text-yellow-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl p-4 ${color} text-center`}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">Active Bookings: <strong>{bookings.filter(b => b.status === 'Occupied').length}</strong></p>
          <div className="flex justify-end gap-3 pt-2">
            <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => closeModal('nightAudit')}>Cancel</button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold" onClick={handleNightAudit}>Run Night Audit</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modals.extend} onClose={() => closeModal('extend')} title="Extend Booking">
        <ExtendPanel
          bookings={bookings}
          selectedBooking={selectedBooking}
          onSubmit={handleExtendSubmit}
          onCancel={() => closeModal('extend')}
        />
      </Modal>

      <Modal isOpen={modals.shiftRoom} onClose={() => closeModal('shiftRoom')} title="Shift Room">
        <ShiftPanel
          bookings={bookings}
          rooms={rooms}
          selectedBooking={selectedBooking}
          onSubmit={handleShiftRoomSubmit}
          onCancel={() => closeModal('shiftRoom')}
        />
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
        }} className="space-y-4">
          <div className="form-group mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Room Number *</label>
            <input
              type="text"
              name="roomNumber"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800"
              placeholder="e.g. 201"
            />
            <p className="text-xs text-gray-400 mt-1">Enter a unique room number. Room will be set as Available.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            📊 Currently <strong>{totalRooms}</strong> rooms — Available: <strong>{availableRooms}</strong>, Occupied: <strong>{occupiedRooms}</strong>, Cleaning: <strong>{cleaningRooms}</strong>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200" onClick={() => closeModal('addRoom')}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition">
              Add Room
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ─── Helper Sub-Components ─────────────────────────────────────────────────

const InfoRow = ({ label, value }) => (
  <div>
    <span className="text-gray-400 text-xs">{label}: </span>
    <span className="text-gray-800 font-medium text-xs">{value || '—'}</span>
  </div>
);

/** Check-Out Panel: search by room number */
const CheckOutPanel = ({ bookings, onConfirm, onCancel }) => {
  const [search, setSearch] = React.useState('');
  const occupied = bookings.filter(b => b.status === 'Occupied' || b.status !== 'CheckedOut');
  const found = search
    ? occupied.find(b => String(b.room) === String(search.trim()))
    : null;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Search by Room Number</label>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 outline-none text-gray-800"
          placeholder="e.g. 101"
          autoFocus
        />
      </div>

      {search && !found && (
        <p className="text-red-500 text-sm">No active booking found for Room {search}.</p>
      )}

      {found && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-red-700">Confirm Check-Out</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoRow label="Guest" value={found.guestName} />
            <InfoRow label="Room" value={`Room ${found.room}`} />
            <InfoRow label="Check-In" value={found.checkIn} />
            <InfoRow label="Check-Out" value={found.checkOut} />
            <InfoRow label="Status" value={found.status} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200" onClick={onCancel}>Cancel</button>
            <button
              type="button"
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
              onClick={() => onConfirm(found)}
            >
              Confirm Check-Out
            </button>
          </div>
        </div>
      )}

      {!search && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <p className="text-xs text-gray-500 font-semibold uppercase">Active Bookings</p>
          {occupied.map(b => (
            <button
              key={b.id}
              onClick={() => setSearch(String(b.room))}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-red-50 border rounded-lg transition text-sm"
            >
              <span className="font-semibold text-gray-800">Rm {b.room}</span>
              <span className="text-gray-500 ml-3">{b.guestName}</span>
              <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${b.status === 'Occupied' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Extend Panel: search by room number */
const ExtendPanel = ({ bookings, selectedBooking, onSubmit, onCancel }) => {
  const [search, setSearch] = React.useState(selectedBooking ? String(selectedBooking.room) : '');
  const [newCheckOut, setNewCheckOut] = React.useState('');

  const found = search
    ? bookings.find(b => String(b.room) === String(search.trim()) && b.status !== 'CheckedOut')
    : selectedBooking || null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!found || !newCheckOut) return;
    onSubmit({
      bookingId: found.id,
      guestName: found.guestName,
      room: found.room,
      checkOut: newCheckOut
    });
  };

  React.useEffect(() => {
    if (selectedBooking) setSearch(String(selectedBooking.room));
  }, [selectedBooking]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-indigo-50 rounded-lg px-4 py-2 text-xs text-indigo-700 font-medium">
        {bookings.filter(b => b.status !== 'CheckedOut').length} active booking(s) found
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Search by Room Number</label>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setNewCheckOut(''); }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800"
          placeholder="e.g. 101"
        />
      </div>

      {search && !found && (
        <p className="text-red-500 text-sm">No active booking for Room {search}.</p>
      )}

      {found && (
        <div className="space-y-4">
          <div className="bg-gray-50 border rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Current Booking — Room {found.room}</p>
            <div className="grid grid-cols-2 gap-2">
              <InfoRow label="Guest" value={found.guestName} />
              <InfoRow label="Phone" value={found.phone || '—'} />
              <InfoRow label="Check-In" value={found.checkIn} />
              <InfoRow label="Current Check-Out" value={found.checkOut} />
              <InfoRow label="Status" value={found.status} />
              <InfoRow label="Price/Day" value={found.pricePerDay ? `₹${found.pricePerDay}` : '—'} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New Check-Out Date *</label>
            <input
              type="date"
              value={newCheckOut}
              min={found.checkOut}
              onChange={e => setNewCheckOut(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200" onClick={onCancel}>Cancel</button>
            <button type="submit" disabled={!newCheckOut} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Update Check-Out
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

/** Shift Panel: search by room number */
const ShiftPanel = ({ bookings, rooms, selectedBooking, onSubmit, onCancel }) => {
  const [search, setSearch] = React.useState(selectedBooking ? String(selectedBooking.room) : '');
  const found = search
    ? bookings.find(b => String(b.room) === String(search.trim()) && b.status !== 'CheckedOut')
    : selectedBooking || null;

  const handleShiftSubmit = (formData) => {
    onSubmit({
      bookingId: found.id,
      newRoom: formData.room,
      guestName: found.guestName,
      oldRoom: found.room,
      checkIn: found.checkIn,
      checkOut: found.checkOut
    });
  };

  React.useEffect(() => {
    if (selectedBooking) setSearch(String(selectedBooking.room));
  }, [selectedBooking]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Search Booking by Room Number</label>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-gray-800"
          placeholder="e.g. 101"
          autoFocus
        />
      </div>

      {search && !found && (
        <p className="text-red-500 text-sm">No active booking for Room {search}.</p>
      )}

      {found && (
        <div className="space-y-4">
          <div className="bg-gray-50 border rounded-xl p-4 space-y-2 text-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase">Current Booking — Room {found.room}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoRow label="Guest" value={found.guestName} />
              <InfoRow label="Phone" value={found.phone || '—'} />
              <InfoRow label="Check-In" value={found.checkIn} />
              <InfoRow label="Check-Out" value={found.checkOut} />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3 text-yellow-700">Select New Room</p>
            <BookingForm
              onSubmit={handleShiftSubmit}
              onCancel={onCancel}
              initialData={{
                guestName: found.guestName,
                room: found.room,
                checkIn: found.checkIn,
                checkOut: found.checkOut,
                phone: found.phone || '',
                pricePerDay: found.pricePerDay || ''
              }}
              availableRooms={rooms.filter(r => r.status === 'Available')}
              shiftMode
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Hotel;
