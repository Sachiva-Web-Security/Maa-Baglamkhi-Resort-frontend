import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from "../api";
import "./Banquet.css";

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const floorOptions = [
  { id: 'ground', name: 'Ground Floor', color: '#1565c0' },
  { id: 'basement', name: 'Basement', color: '#7b1fa2' },
  { id: 'second', name: '2nd Floor', color: '#00838f' },
];

const Banquet = () => {
  const navigate = useNavigate();
  const [halls, setHalls] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('ground');
  const [wizard, setWizard] = useState({
    hallId: '',
    customerName: '',
    phone: '',
    eventType: 'SEMINAR',
    guests: 50,
    date: '',
    startTime: '10:00',
    endTime: '18:00',
    notes: '',
  });
  const [activeStep, setActiveStep] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings'); // 'quotations' | 'bookings'

  const steps = [
    'Select Hall',
    'Event Details',
    'Date & Time',
    'Confirm',
  ];

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const hall = halls.find(h => h.id === b.hall_id || h.id === b.hallId);
      if (!hall) return false;
      return true;
    });
  }, [bookings, halls]);

  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === 'Confirmed').length;
    const completed = bookings.filter(b => b.status === 'Completed').length;
    const pending = bookings.filter(b => b.status === 'Pending').length;
    return { confirmed, completed, pending, total: bookings.length };
  }, [bookings]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/banquet");
        if (res.data?.halls) {
          setHalls(res.data.halls.map(h => ({
            id: h.id,
            name: h.name,
            capacity: h.capacity,
            ratePerHour: h.ratePerHour,
            status: h.status,
          })));
        }
        if (res.data?.bookings) {
          setBookings(res.data.bookings);
        }
      } catch (err) {
        console.error("Error loading banquet data", err);
      }
    };
    fetchData();
  }, []);

  const handleConfirmBooking = async () => {
    if (!wizard.hallId || !wizard.customerName || !wizard.date) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const payload = {
        hallId: wizard.hallId,
        customerName: wizard.customerName,
        phone: wizard.phone,
        eventType: wizard.eventType,
        guests: Number(wizard.guests) || 0,
        date: wizard.date,
        startTime: wizard.startTime,
        endTime: wizard.endTime,
        notes: wizard.notes,
      };

      const res = await API.post("/banquet", payload);
      const newId = res.data?.id || Date.now();
      const hall = halls.find(h => h.id === wizard.hallId);

      setBookings(prev => [{
        id: newId,
        hallId: wizard.hallId,
        hallName: hall?.name || 'Hall',
        customer_name: wizard.customerName,
        phone: wizard.phone,
        event_type: wizard.eventType,
        guests: Number(wizard.guests) || 0,
        date: wizard.date,
        start_time: wizard.startTime,
        end_time: wizard.endTime,
        status: 'Confirmed',
        ...wizard,
      }, ...prev]);

      resetWizard();
      alert(`Booking Confirmed for ${wizard.customerName}`);
    } catch (err) {
      console.error("Error creating booking", err);
      alert("Error creating booking");
    }
  };

  const handleStatusChange = async (booking, newStatus) => {
    try {
      await API.put(`/banquet/${booking.id}`, { status: newStatus });
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: newStatus } : b));
      alert(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating status", err);
    }
  };

  const resetWizard = () => {
    setWizard({
      hallId: '',
      customerName: '',
      phone: '',
      eventType: 'SEMINAR',
      guests: 50,
      date: '',
      startTime: '10:00',
      endTime: '18:00',
      notes: '',
    });
    setActiveStep(0);
  };

  const canProceed = () => {
    if (activeStep === 0) return !!wizard.hallId;
    if (activeStep === 1) return !!wizard.customerName && !!wizard.phone;
    if (activeStep === 2) return !!wizard.date;
    return true;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const openWizard = () => {
    setActiveTab('quotations');
    resetWizard();
  };

  return (
    <div className="banquet-page">
      {/* Top Navigation Bar */}
      <div className="banquet-nav">
        <div className="banquet-nav-brand" onClick={() => navigate('/dashboard')}>
          <div className="banquet-logo">Q</div>
          <span className="banquet-brand-name">urbanPOS</span>
        </div>

        <div className="banquet-nav-tabs">
          <div className="banquet-nav-tab" onClick={() => navigate('/dashboard')}>Dashboard</div>
          <div className={`banquet-nav-tab ${activeTab === 'quotations' ? 'active' : ''}`}
            onClick={() => { setActiveTab('quotations'); openWizard(); }}>Quotation</div>
          <div className={`banquet-nav-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}>Bookings</div>
          <div className="banquet-nav-tab dropdown">
            Manage ▾
            <div className="dropdown-menu">
              <div onClick={() => navigate('/banquet')}>Banquet</div>
              <div>Restaurant</div>
              <div>Rooms</div>
            </div>
          </div>
          <div className="banquet-nav-tab">Guests</div>
          <div className="banquet-nav-tab">Cash Book</div>
          <div className="banquet-nav-tab dropdown">
            Reports ▾
            <div className="dropdown-menu">
              <div>Daily</div>
              <div>Monthly</div>
            </div>
          </div>
        </div>

        <div className="banquet-nav-user">
          <span className="user-avatar">AR</span>
          <span>ABHISHEK RATHORE</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="banquet-layout">
        {/* Left Sidebar */}
        <div className="banquet-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-heading">
              <span className="sidebar-heading-line"></span>
              <span className="sidebar-heading-text">Hall</span>
            </div>
            {floorOptions.map(floor => (
              <div
                key={floor.id}
                className={`sidebar-item ${selectedFloor === floor.id ? 'active' : ''}`}
                onClick={() => setSelectedFloor(floor.id)}
                style={{ '--accent': floor.color }}
              >
                <span className="sidebar-dot"></span>
                {floor.name}
              </div>
            ))}
          </div>

          <div className="sidebar-stats">
            <div className="sidebar-heading">
              <span className="sidebar-heading-line"></span>
              <span className="sidebar-heading-text">Quick Stats</span>
            </div>
            <div className="stat-item">
              <span>Total</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span>Confirmed</span>
              <span className="stat-value green">{stats.confirmed}</span>
            </div>
            <div className="stat-item">
              <span>Completed</span>
              <span className="stat-value blue">{stats.completed}</span>
            </div>
            <div className="stat-item">
              <span>Pending</span>
              <span className="stat-value orange">{stats.pending}</span>
            </div>
          </div>

          <button className="new-booking-btn" onClick={openWizard}>
            + New Booking
          </button>
        </div>

        {/* Main Content */}
        <div className="banquet-content">
          {activeTab === 'quotations' ? (
            /* Quotation / Booking Wizard */
            <div className="simple-card">
              <div className="simple-card-title">New Booking — Step {activeStep + 1} of {steps.length}: {steps[activeStep]}</div>
              <div className="simple-tabs" style={{ marginBottom: 16 }}>
                {steps.map((s, i) => (
                  <div key={i} className={`simple-tab ${i === activeStep ? 'simple-tab-active' : ''}`}
                    style={{ cursor: i < activeStep ? 'pointer' : 'default' }}
                    onClick={() => i < activeStep && setActiveStep(i)}>
                    {i + 1}. {s}
                  </div>
                ))}
              </div>

              {activeStep === 0 && (
                <div>
                  <div className="simple-section-title">Select Banquet Hall</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                    {halls.map((hall) => (
                      <div key={hall.id}
                        onClick={() => setWizard(p => ({ ...p, hallId: hall.id }))}
                        style={{ border: `2px solid ${wizard.hallId === hall.id ? '#1565c0' : '#ddd'}`, borderRadius: 6, padding: 12, cursor: "pointer", background: wizard.hallId === hall.id ? '#e3f0ff' : '#fff' }}>
                        <div style={{ fontWeight: 700, color: "#1565c0", marginBottom: 4 }}>{hall.name}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>Capacity: {hall.capacity} | ₹{hall.ratePerHour}/hr</div>
                        <span className={`simple-badge ${hall.status === 'Available' ? 'badge-green' : 'badge-red'}`} style={{ marginTop: 4 }}>{hall.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                <div className="simple-form-grid">
                  <div className="simple-form-group"><label className="simple-label">Customer Name *</label><input className="simple-input" value={wizard.customerName} onChange={e => setWizard(p => ({ ...p, customerName: e.target.value }))} placeholder="Customer name" /></div>
                  <div className="simple-form-group"><label className="simple-label">Phone *</label><input className="simple-input" value={wizard.phone} onChange={e => setWizard(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" /></div>
                  <div className="simple-form-group"><label className="simple-label">Event Type</label><select className="simple-select" value={wizard.eventType} onChange={e => setWizard(p => ({ ...p, eventType: e.target.value }))}><option>SEMINAR</option><option>WEDDING</option><option>RECEPTION</option><option>BIRTHDAY</option><option>ENGAGEMENT</option><option>CORPORATE</option></select></div>
                  <div className="simple-form-group"><label className="simple-label">Guests</label><input type="number" className="simple-input" value={wizard.guests} min={1} onChange={e => setWizard(p => ({ ...p, guests: e.target.value }))} /></div>
                  <div className="simple-form-group" style={{ gridColumn: "span 2" }}><label className="simple-label">Notes</label><textarea className="simple-textarea" value={wizard.notes} onChange={e => setWizard(p => ({ ...p, notes: e.target.value }))} placeholder="Special instructions..." /></div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="simple-form-grid">
                  <div className="simple-form-group"><label className="simple-label">Event Date *</label><input type="date" className="simple-input" value={wizard.date} onChange={e => setWizard(p => ({ ...p, date: e.target.value }))} /></div>
                  <div className="simple-form-group"><label className="simple-label">Start Time *</label><input type="time" className="simple-input" value={wizard.startTime} onChange={e => setWizard(p => ({ ...p, startTime: e.target.value }))} /></div>
                  <div className="simple-form-group"><label className="simple-label">End Time *</label><input type="time" className="simple-input" value={wizard.endTime} onChange={e => setWizard(p => ({ ...p, endTime: e.target.value }))} /></div>
                </div>
              )}

              {activeStep === 3 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="simple-summary">
                    <div style={{ fontWeight: 700, marginBottom: 8, color: "#1565c0" }}>Booking Details</div>
                    {[["Hall", halls.find(h => h.id === wizard.hallId)?.name || '-'], ["Customer", wizard.customerName], ["Event", wizard.eventType], ["Guests", wizard.guests], ["Date", formatDate(wizard.date)], ["Time", `${wizard.startTime} – ${wizard.endTime}`]].map(([k, v]) => (
                      <div key={k} className="simple-summary-row"><span>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
                    ))}
                  </div>
                  <div style={{ gridColumn: "span 2", textAlign: "right" }}>
                    <button className="simple-btn simple-btn-success" onClick={handleConfirmBooking}>Confirm Booking</button>
                  </div>
                </div>
              )}

              <div className="simple-btn-row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
                <button className="simple-btn simple-btn-gray" onClick={() => setActiveStep(prev => Math.max(0, prev - 1))} disabled={activeStep === 0}>Back</button>
                <button className="simple-btn simple-btn-primary" onClick={() => setActiveStep(prev => prev + 1)} disabled={activeStep >= 3 || !canProceed()}>Next</button>
              </div>
            </div>
          ) : (
            /* Bookings Grid */
            <>
              <div className="content-header">
                <h1 className="content-title">Banquet Bookings</h1>
                <div className="floor-badge" style={{ background: floorOptions.find(f => f.id === selectedFloor)?.color }}>
                  {floorOptions.find(f => f.id === selectedFloor)?.name}
                </div>
              </div>

              <div className="bookings-grid">
                {filteredBookings.length === 0 && (
                  <div className="empty-state">No bookings found. Click "New Booking" to add one.</div>
                )}

                {filteredBookings.map((booking) => {
                  return (
                    <div key={booking.id} className="booking-card">
                      <div className="card-header">
                        <span className="floor-tag">{floorOptions.find(f => f.id === selectedFloor)?.name}</span>
                        <span className={`status-badge ${booking.status?.toLowerCase()}`}>
                          {booking.status || 'Pending'}
                        </span>
                      </div>

                      <div className="card-client">
                        {booking.customer_name || booking.customerName || booking.event_title || 'Client Name'}
                      </div>

                      <div className="card-details">
                        <div className="detail-row">
                          <span className="detail-icon">📞</span>
                          <span>{booking.phone || '-'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-icon">📅</span>
                          <span>{formatDate(booking.date)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-icon">🎯</span>
                          <span>{booking.event_type || 'EVENT'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-icon">👥</span>
                          <span>Total Pax: {booking.guests || 0}</span>
                        </div>
                      </div>

                      <div className="card-actions">
                        {booking.status === 'Confirmed' && (
                          <button
                            className="btn-confirm"
                            onClick={() => handleStatusChange(booking, 'Completed')}
                          >
                            Confirm
                          </button>
                        )}
                        <button
                          className="btn-details"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowDetails(true);
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedBooking && (
        <div className="details-overlay" onClick={() => setShowDetails(false)}>
          <div className="details-modal" onClick={e => e.stopPropagation()}>
            <div className="details-header">
              <h2>Booking Details</h2>
              <button className="details-close" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="details-body">
              <div className="detail-section">
                <h3>Client Information</h3>
                <div className="detail-row-full">
                  <span className="label">Name:</span>
                  <span className="value">{selectedBooking.customer_name || selectedBooking.customerName}</span>
                </div>
                <div className="detail-row-full">
                  <span className="label">Phone:</span>
                  <span className="value">{selectedBooking.phone || '-'}</span>
                </div>
                <div className="detail-row-full">
                  <span className="label">Email:</span>
                  <span className="value">{selectedBooking.guest_email || '-'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Event Details</h3>
                <div className="detail-row-full">
                  <span className="label">Event Type:</span>
                  <span className="value">{selectedBooking.event_type || '-'}</span>
                </div>
                <div className="detail-row-full">
                  <span className="label">Guests:</span>
                  <span className="value">{selectedBooking.guests || 0}</span>
                </div>
                <div className="detail-row-full">
                  <span className="label">Hall:</span>
                  <span className="value">{selectedBooking.hallName || halls.find(h => h.id === selectedBooking.hall_id)?.name || '-'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Schedule</h3>
                <div className="detail-row-full">
                  <span className="label">Date:</span>
                  <span className="value">{formatDate(selectedBooking.date)}</span>
                </div>
                <div className="detail-row-full">
                  <span className="label">Time:</span>
                  <span className="value">{selectedBooking.start_time} - {selectedBooking.end_time}</span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="detail-section">
                  <h3>Notes</h3>
                  <p className="notes-text">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
            <div className="details-footer">
              <button className="btn-secondary" onClick={() => setShowDetails(false)}>Close</button>
              {selectedBooking.status === 'Confirmed' && (
                <button
                  className="btn-confirm-wizard"
                  onClick={() => {
                    handleStatusChange(selectedBooking, 'Completed');
                    setShowDetails(false);
                  }}
                >
                  Mark Completed
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banquet;
