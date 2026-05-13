import React, { useState, useEffect } from "react";
import API from "../api";
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
  const [hotelView, setHotelView] = useState("rooms");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomStatusFilter, setRoomStatusFilter] = useState("All");
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [invoiceTab, setInvoiceTab] = useState("basic");
  const [paymentDraft, setPaymentDraft] = useState({ amount: "", mode: "Cash", details: "", paidBy: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, bookingsRes] = await Promise.all([
          API.get("/hotel/rooms/setup"),
          API.get("/hotel/all-bookings"),
        ]);

        // Extract rooms from the API response structure
        let extractedRooms = [];
        if (roomsRes.data && Array.isArray(roomsRes.data)) {
          // API returns array of category objects with roomDetails inside
          roomsRes.data.forEach(category => {
            if (category.roomDetails && Array.isArray(category.roomDetails)) {
              category.roomDetails.forEach(room => {
                extractedRooms.push({
                  ...room,
                  categoryName: category.name,
                  defaultPrice: category.defaultPrice,
                });
              });
            }
          });
        }

        setRooms(extractedRooms);
        setBookings(bookingsRes.data?.map(b => ({
          id: b.bookingId || b.id,
          guestName: b.guest_name || b.guestName,
          room: Array.isArray(b.rooms) ? b.rooms[0] : b.rooms || "",
          checkIn: b.check_in || b.checkIn,
          checkOut: b.check_out || b.checkOut,
          pricePerDay: b.default_price || b.pricePerDay || 0,
          phone: b.mobile || b.phone || "",
          status: b.booking_status === "CheckedIn" || b.booking_status === "Checked Out" ? "Occupied" : (b.booking_status || "Occupied"),
          billGenerated: 0,
        })) || []);
      } catch (err) {
        console.error("Error loading hotel data", err);
      }
    };

    fetchData();
  }, []);

  // Calculate summary statistics
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(r => String(r.status || "").toLowerCase().includes("vacant")).length;
  const occupiedRooms = rooms.filter(r => String(r.status || "").toLowerCase().includes("occup")).length;
  const cleaningRooms = rooms.filter(r => String(r.status || "").toLowerCase().includes("dirty")).length;
  const filteredRooms = rooms.filter((room) => {
    const roomNo = String(room.number || "");
    const statusOk = roomStatusFilter === "All" || String(room.status) === roomStatusFilter;
    const searchOk = !roomSearch || roomNo.includes(roomSearch.trim());
    return statusOk && searchOk;
  });

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

  const openInvoiceWorkspace = (booking) => {
    setInvoiceBooking(booking);
    setInvoiceTab("basic");
    setHotelView("invoice");
    setPaymentDraft({ amount: "", mode: "Cash", details: "", paidBy: booking?.guestName || "" });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="simple-page-header">
        <h1 className="simple-page-title">Hotel / PMS</h1>
        <div className="simple-btn-row" style={{ marginTop: 0 }}>
          <button className={`simple-btn ${hotelView === "rooms" ? "simple-btn-primary" : "simple-btn-outline"}`} onClick={() => setHotelView("rooms")}>
            Room Inventory
          </button>
          <button className={`simple-btn ${hotelView === "invoice" ? "simple-btn-primary" : "simple-btn-outline"}`} onClick={() => setHotelView("invoice")}>
            Invoice Workspace
          </button>
          <button className="simple-btn simple-btn-primary" onClick={() => openModal('newBooking')}>
            + New Booking
          </button>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="simple-metrics-grid" style={{ marginBottom: 16 }}>
        <div className="simple-metric-tile tile-blue"><div className="simple-metric-tile-value">{totalRooms}</div><div className="simple-metric-tile-label">Total Rooms</div></div>
        <div className="simple-metric-tile tile-green"><div className="simple-metric-tile-value">{availableRooms}</div><div className="simple-metric-tile-label">Available</div></div>
        <div className="simple-metric-tile tile-red"><div className="simple-metric-tile-value">{occupiedRooms}</div><div className="simple-metric-tile-label">Occupied</div></div>
        <div className="simple-metric-tile tile-orange"><div className="simple-metric-tile-value">{cleaningRooms}</div><div className="simple-metric-tile-label">Housekeeping</div></div>
      </div>

      {/* Action Buttons */}
      <div className="simple-card" style={{ marginBottom: 16 }}>
        <div className="simple-btn-row" style={{ marginTop: 0 }}>
          <button className="simple-btn simple-btn-primary" onClick={() => openModal('newBooking')}>+ New Booking</button>
          <button className="simple-btn simple-btn-success" onClick={() => openModal('expressCheckIn')}>Express Check-In</button>
          <button className="simple-btn simple-btn-danger" onClick={() => {
            if (bookings.length > 0) { setSelectedBooking(bookings[0]); openModal('checkOut'); }
            else alert('No active bookings to check out');
          }}>Check-Out</button>
          <button className="simple-btn simple-btn-warning" onClick={() => openModal('nightAudit')}>Night Audit</button>
          <button className="simple-btn simple-btn-info" onClick={() => { setSelectedBooking(null); openModal('extend'); }}>Extend Stay</button>
          <button className="simple-btn simple-btn-gray" onClick={() => { setSelectedBooking(null); openModal('shiftRoom'); }}>Shift Room</button>
          <button className="simple-btn simple-btn-outline" onClick={() => openModal('addRoom')}>+ Add Room</button>
        </div>
      </div>

      {hotelView === "rooms" && (
        <div className="simple-card" style={{ marginBottom: 16 }}>
          <div className="simple-card-title">Room Inventory</div>
          <div className="hotel-room-toolbar">
            <input
              className="simple-input"
              style={{ maxWidth: 160 }}
              placeholder="Search room no"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
            />
            <select
              className="simple-select"
              style={{ maxWidth: 180 }}
              value={roomStatusFilter}
              onChange={(e) => setRoomStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
          <div className="hotel-room-grid">
            {filteredRooms.map((room) => (
              <div key={room.id || room.number} className={`hotel-room-card ${String(room.status).toLowerCase()}`}>
                <div className="hotel-room-name">Rm {room.number}</div>
                <div className="hotel-room-type">{room.type || room.category || "Executive"}</div>
                <div className="hotel-room-status">{room.status}</div>
                <div className="hotel-room-meta">{room.guest ? `Guest: ${room.guest}` : "No guest assigned"}</div>
                <div className="hotel-room-actions">
                  {room.status === "Available" && (
                    <button className="simple-btn simple-btn-sm simple-btn-success" onClick={() => handleRoomCheckIn(room)}>
                      Check-In
                    </button>
                  )}
                  {room.status === "Occupied" && (
                    <>
                      <button className="simple-btn simple-btn-sm simple-btn-warning" onClick={() => handleRoomCheckOut(room)}>
                        Check-Out
                      </button>
                      <button className="simple-btn simple-btn-sm simple-btn-outline" onClick={() => {
                        const booking = bookings.find((b) => String(b.room) === String(room.number));
                        if (booking) openInvoiceWorkspace(booking);
                      }}>
                        Invoice
                      </button>
                    </>
                  )}
                  {room.status !== "Available" && (
                    <button className="simple-btn simple-btn-sm simple-btn-gray" onClick={() => handleMarkAvailable(room)}>
                      Mark Available
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Bookings Table */}
      <div className="simple-card">
        <div className="simple-card-title">Active Bookings</div>
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Room</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onOpenInvoice={openInvoiceWorkspace}
                  onExtend={handleExtend}
                  onShiftRoom={handleShiftRoom}
                  onCheckOut={handleCheckOut}
                  onBillGenerated={handleBillGenerated}
                />
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#999" }}>No active bookings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hotelView === "invoice" && (
        <HotelInvoiceWorkspace
          booking={invoiceBooking}
          invoiceTab={invoiceTab}
          setInvoiceTab={setInvoiceTab}
          paymentDraft={paymentDraft}
          setPaymentDraft={setPaymentDraft}
          onSelectBooking={openInvoiceWorkspace}
          bookings={bookings}
          onCheckOut={handleCheckOut}
        />
      )}

      {/* Modals */}
      <Modal isOpen={modals.newBooking} onClose={() => closeModal('newBooking')} title="New Booking">
        <BookingForm onSubmit={handleNewBooking} onCancel={() => closeModal('newBooking')}
          availableRooms={rooms.filter(r => r.status === 'Available' || r.status === 'Cleaning')} />
      </Modal>

      <Modal isOpen={modals.expressCheckIn} onClose={() => closeModal('expressCheckIn')} title="Express Check-In">
        <BookingForm onSubmit={handleExpressCheckIn} onCancel={() => closeModal('expressCheckIn')}
          initialData={selectedRoom ? { room: selectedRoom.number } : {}}
          availableRooms={rooms.filter(r => r.status === 'Available')} />
      </Modal>

      <Modal isOpen={modals.checkOut} onClose={() => closeModal('checkOut')} title="Check-Out">
        <CheckOutPanel bookings={bookings} onConfirm={handleCheckOut} onCancel={() => closeModal('checkOut')} />
      </Modal>

      <Modal isOpen={modals.nightAudit} onClose={() => closeModal('nightAudit')} title="Night Audit">
        <div>
          <p style={{ color: "#666", marginBottom: 14, fontSize: 13 }}>Process all check-ins and check-outs for today and generate a daily summary.</p>
          <div className="simple-metrics-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {[
              { label: "Total Rooms", value: totalRooms, cls: "tile-blue" },
              { label: "Occupied", value: occupiedRooms, cls: "tile-red" },
              { label: "Available", value: availableRooms, cls: "tile-green" },
              { label: "Housekeeping", value: cleaningRooms, cls: "tile-orange" },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`simple-metric-tile ${cls}`}>
                <div className="simple-metric-tile-value">{value}</div>
                <div className="simple-metric-tile-label">{label}</div>
              </div>
            ))}
          </div>
          <div className="simple-btn-row" style={{ justifyContent: "flex-end" }}>
            <button className="simple-btn simple-btn-gray" onClick={() => closeModal('nightAudit')}>Cancel</button>
            <button className="simple-btn simple-btn-primary" onClick={handleNightAudit}>Run Night Audit</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modals.extend} onClose={() => closeModal('extend')} title="Extend Booking">
        <ExtendPanel bookings={bookings} selectedBooking={selectedBooking}
          onSubmit={handleExtendSubmit} onCancel={() => closeModal('extend')} />
      </Modal>

      <Modal isOpen={modals.shiftRoom} onClose={() => closeModal('shiftRoom')} title="Shift Room">
        <ShiftPanel bookings={bookings} rooms={rooms} selectedBooking={selectedBooking}
          onSubmit={handleShiftRoomSubmit} onCancel={() => closeModal('shiftRoom')} />
      </Modal>

      <Modal isOpen={modals.addRoom} onClose={() => closeModal('addRoom')} title="Add New Room">
        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleAddNewRoom({ roomNumber: fd.get('roomNumber') }); }}>
          <div className="simple-form-group" style={{ marginBottom: 12 }}>
            <label className="simple-label">Room Number *</label>
            <input type="text" name="roomNumber" required className="simple-input" placeholder="e.g. 201" />
            <span className="simple-text-muted">Room will be set as Available immediately.</span>
          </div>
          <div className="simple-summary" style={{ marginBottom: 14 }}>
            Currently <strong>{totalRooms}</strong> rooms — Available: <strong>{availableRooms}</strong>, Occupied: <strong>{occupiedRooms}</strong>, Housekeeping: <strong>{cleaningRooms}</strong>
          </div>
          <div className="simple-btn-row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="simple-btn simple-btn-gray" onClick={() => closeModal('addRoom')}>Cancel</button>
            <button type="submit" className="simple-btn simple-btn-primary">Add Room</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const HotelInvoiceWorkspace = ({
  booking,
  invoiceTab,
  setInvoiceTab,
  paymentDraft,
  setPaymentDraft,
  onSelectBooking,
  bookings,
  onCheckOut,
}) => {
  const activeBookings = bookings.filter((b) => b.status !== "CheckedOut");
  const pricePerDay = Number(booking?.pricePerDay || 0);
  const checkIn = booking?.checkIn ? new Date(booking.checkIn) : null;
  const checkOut = booking?.checkOut ? new Date(booking.checkOut) : null;
  const nights =
    checkIn && checkOut && checkOut > checkIn
      ? Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
      : 0;
  const roomTotal = nights * pricePerDay;
  const paymentReceived = Number(paymentDraft.amount || 0);
  const balance = Math.max(roomTotal - paymentReceived, 0);

  const actionCheckout = () => {
    if (!booking) return;
    if (balance > 0) {
      alert("Please settle the balance amount before checkout.");
      return;
    }
    onCheckOut(booking);
  };

  const tabs = [
    { id: "basic", label: "Basic Information" },
    { id: "tariff", label: "Tariff Detail" },
    { id: "services", label: "Services" },
    { id: "payment", label: "Payment Detail" },
    { id: "checkout", label: "Checkout & Print Invoice" },
  ];

  return (
    <div className="simple-card" style={{ marginTop: 16 }}>
      <div className="simple-card-title">Invoice Workspace</div>
      {!booking ? (
        <div>
          <p className="simple-text-muted" style={{ marginBottom: 10 }}>
            Select an occupied booking to open invoice workflow.
          </p>
          <div className="simple-btn-row" style={{ marginTop: 0 }}>
            {activeBookings.map((b) => (
              <button key={b.id} className="simple-btn simple-btn-outline" onClick={() => onSelectBooking(b)}>
                Room {b.room} - {b.guestName}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="hotel-invoice-head">
            <div><strong>INVOICE Room No: {booking.room}</strong></div>
            <div className="simple-text-muted">Checkout Type: 24hrs | Grace: 1 Hour</div>
          </div>
          <div className="hotel-invoice-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`hotel-tab ${invoiceTab === tab.id ? "active" : ""}`}
                onClick={() => setInvoiceTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {invoiceTab === "basic" && (
            <div className="hotel-form-grid">
              <div className="simple-summary">
                <div><strong>Invoice Information</strong></div>
                <div>Invoice No: INV-{booking.id}</div>
                <div>Invoice Date: {new Date().toLocaleDateString("en-IN")}</div>
                <div>Walk In</div>
              </div>
              <div className="simple-summary">
                <div><strong>Primary Guest Details</strong></div>
                <div>Name: {booking.guestName}</div>
                <div>Mobile: {booking.phone || "-"}</div>
                <div>Check-In: {booking.checkIn}</div>
                <div>Check-Out: {booking.checkOut}</div>
              </div>
              <div className="simple-summary">
                <div><strong>Room Details</strong></div>
                <div>Room No: {booking.room}</div>
                <div>Nights: {nights}</div>
                <div>Rate: ₹{pricePerDay.toFixed(2)}</div>
              </div>
            </div>
          )}

          {invoiceTab === "tariff" && (
            <div className="simple-table-wrapper">
              <table className="simple-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Room No</th>
                    <th>Particulars</th>
                    <th>Tariff</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{new Date().toLocaleDateString("en-IN")}</td>
                    <td>{booking.room}</td>
                    <td>Room Charges ({nights} nights)</td>
                    <td>₹{pricePerDay.toFixed(2)}</td>
                    <td>₹{roomTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {invoiceTab === "services" && (
            <div className="simple-summary">
              <strong>Services</strong>
              <p className="simple-text-muted">No service found. Add service from restaurant/room service modules.</p>
            </div>
          )}

          {invoiceTab === "payment" && (
            <div className="hotel-form-grid">
              <div className="simple-form-group">
                <label className="simple-label">Amount</label>
                <input
                  className="simple-input"
                  value={paymentDraft.amount}
                  onChange={(e) => setPaymentDraft((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="Enter paid amount"
                />
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Payment Mode</label>
                <select
                  className="simple-select"
                  value={paymentDraft.mode}
                  onChange={(e) => setPaymentDraft((p) => ({ ...p, mode: e.target.value }))}
                >
                  <option>Cash</option>
                  <option>Card</option>
                  <option>UPI</option>
                  <option>Online</option>
                </select>
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Payment Detail</label>
                <input
                  className="simple-input"
                  value={paymentDraft.details}
                  onChange={(e) => setPaymentDraft((p) => ({ ...p, details: e.target.value }))}
                  placeholder="Reference / txn id"
                />
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Paid By</label>
                <input
                  className="simple-input"
                  value={paymentDraft.paidBy}
                  onChange={(e) => setPaymentDraft((p) => ({ ...p, paidBy: e.target.value }))}
                  placeholder="Payer name"
                />
              </div>
            </div>
          )}

          {invoiceTab === "checkout" && (
            <div className="simple-summary">
              <div className="simple-summary-row"><span>Room Total</span><span>₹{roomTotal.toFixed(2)}</span></div>
              <div className="simple-summary-row"><span>Total Received</span><span>₹{paymentReceived.toFixed(2)}</span></div>
              <div className="simple-summary-total"><span>Balance</span><span>₹{balance.toFixed(2)}</span></div>
            </div>
          )}

          <div className="simple-btn-row" style={{ justifyContent: "flex-end" }}>
            <button className="simple-btn simple-btn-success" onClick={() => alert("Saved successfully")}>Save</button>
            <button className="simple-btn simple-btn-primary" onClick={() => window.print()}>Print</button>
            <button className="simple-btn simple-btn-warning" onClick={actionCheckout}>Checkout</button>
          </div>
        </>
      )}
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
  const found = search ? occupied.find(b => String(b.room) === String(search.trim())) : null;

  return (
    <div>
      <div className="simple-form-group" style={{ marginBottom: 12 }}>
        <label className="simple-label">Search by Room Number</label>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="simple-input" placeholder="e.g. 101" autoFocus />
      </div>
      {search && !found && <p style={{ color: "#c62828", fontSize: 13 }}>No active booking found for Room {search}.</p>}
      {found && (
        <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 6, padding: 14, marginBottom: 12 }}>
          <p style={{ fontWeight: 700, color: "#c62828", marginBottom: 8 }}>Confirm Check-Out</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 13 }}>
            <InfoRow label="Guest" value={found.guestName} />
            <InfoRow label="Room" value={`Room ${found.room}`} />
            <InfoRow label="Check-In" value={found.checkIn} />
            <InfoRow label="Check-Out" value={found.checkOut} />
          </div>
          <div className="simple-btn-row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="simple-btn simple-btn-gray" onClick={onCancel}>Cancel</button>
            <button type="button" className="simple-btn simple-btn-danger" onClick={() => onConfirm(found)}>Confirm Check-Out</button>
          </div>
        </div>
      )}
      {!search && (
        <div style={{ maxHeight: 240, overflowY: "auto" }}>
          <p style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: 700 }}>ACTIVE BOOKINGS</p>
          {occupied.map(b => (
            <div key={b.id} onClick={() => setSearch(String(b.room))}
              style={{ padding: "8px 12px", border: "1px solid #eee", borderRadius: 4, marginBottom: 4, cursor: "pointer", background: "#fafafa", fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.background = "#ffebee"}
              onMouseLeave={e => e.currentTarget.style.background = "#fafafa"}>
              <strong>Rm {b.room}</strong> — {b.guestName}
              <span className="simple-badge badge-green" style={{ marginLeft: 8 }}>{b.status}</span>
            </div>
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
    onSubmit({ bookingId: found.id, guestName: found.guestName, room: found.room, checkOut: newCheckOut });
  };

  React.useEffect(() => { if (selectedBooking) setSearch(String(selectedBooking.room)); }, [selectedBooking]);

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: "#e3f0ff", borderRadius: 4, padding: "6px 12px", fontSize: 12, color: "#1565c0", marginBottom: 12 }}>
        {bookings.filter(b => b.status !== 'CheckedOut').length} active booking(s)
      </div>
      <div className="simple-form-group" style={{ marginBottom: 12 }}>
        <label className="simple-label">Search by Room Number</label>
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setNewCheckOut(''); }}
          className="simple-input" placeholder="e.g. 101" />
      </div>
      {search && !found && <p style={{ color: "#c62828", fontSize: 13 }}>No active booking for Room {search}.</p>}
      {found && (
        <div>
          <div className="simple-summary" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#666", marginBottom: 6 }}>Room {found.room} — Current Booking</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 13 }}>
              <InfoRow label="Guest" value={found.guestName} />
              <InfoRow label="Phone" value={found.phone || '—'} />
              <InfoRow label="Check-In" value={found.checkIn} />
              <InfoRow label="Check-Out" value={found.checkOut} />
            </div>
          </div>
          <div className="simple-form-group" style={{ marginBottom: 14 }}>
            <label className="simple-label">New Check-Out Date *</label>
            <input type="date" value={newCheckOut} min={found.checkOut}
              onChange={e => setNewCheckOut(e.target.value)} required className="simple-input" />
          </div>
          <div className="simple-btn-row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="simple-btn simple-btn-gray" onClick={onCancel}>Cancel</button>
            <button type="submit" disabled={!newCheckOut} className="simple-btn simple-btn-primary">Update Check-Out</button>
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
    onSubmit({ bookingId: found.id, newRoom: formData.room, guestName: found.guestName, oldRoom: found.room, checkIn: found.checkIn, checkOut: found.checkOut });
  };

  React.useEffect(() => { if (selectedBooking) setSearch(String(selectedBooking.room)); }, [selectedBooking]);

  return (
    <div>
      <div className="simple-form-group" style={{ marginBottom: 12 }}>
        <label className="simple-label">Search Booking by Room Number</label>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="simple-input" placeholder="e.g. 101" autoFocus />
      </div>
      {search && !found && <p style={{ color: "#c62828", fontSize: 13 }}>No active booking for Room {search}.</p>}
      {found && (
        <div>
          <div className="simple-summary" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#666", marginBottom: 6 }}>Current Booking — Room {found.room}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 13 }}>
              <InfoRow label="Guest" value={found.guestName} />
              <InfoRow label="Phone" value={found.phone || '—'} />
              <InfoRow label="Check-In" value={found.checkIn} />
              <InfoRow label="Check-Out" value={found.checkOut} />
            </div>
          </div>
          <div className="simple-section-title" style={{ marginBottom: 12 }}>Select New Room</div>
          <BookingForm onSubmit={handleShiftSubmit} onCancel={onCancel}
            initialData={{ guestName: found.guestName, room: found.room, checkIn: found.checkIn, checkOut: found.checkOut, phone: found.phone || '', pricePerDay: found.pricePerDay || '' }}
            availableRooms={rooms.filter(r => r.status === 'Available')} shiftMode />
        </div>
      )}
    </div>
  );
};

export default Hotel;
