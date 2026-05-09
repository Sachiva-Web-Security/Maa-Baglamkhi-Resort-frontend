import { useEffect, useMemo, useState } from 'react';
import BanquetStepper from '../components/Banquet/BanquetStepper';
import BanquetHallCard from '../components/Banquet/BanquetHallCard';
import BanquetBookingRow from '../components/Banquet/BanquetBookingRow';
import BanquetBill from '../components/Banquet/BanquetBill';
import Modal from '../components/Hotel/Modal';
import API from "../api";

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const menuPackages = [
  { id: 'standard', name: 'Standard', perGuest: 650 },
  { id: 'premium', name: 'Premium', perGuest: 950 },
  { id: 'royal', name: 'Royal', perGuest: 1250 },
];

const steps = [
  'Select Banquet Hall',
  'Add Event Details',
  'Assign Date & Time',
  'Confirm Booking',
  'Event Completed',
  'Generate Bill',
];

function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diff = endMin - startMin;
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / 60));
}

const defaultHalls = [
  { id: 'grand', name: 'Grand Ballroom', capacity: 500, ratePerHour: 12000, status: 'Available' },
  { id: 'garden', name: 'Garden Banquet', capacity: 300, ratePerHour: 9000, status: 'Available' },
  { id: 'crystal', name: 'Crystal Hall', capacity: 200, ratePerHour: 6500, status: 'Available' },
  { id: 'board', name: 'Board Room', capacity: 60, ratePerHour: 2500, status: 'Available' },
];

const Banquet = () => {
  const [halls, setHalls] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  const [wizard, setWizard] = useState({
    hallId: '',
    customerName: '',
    phone: '',
    eventType: 'Wedding',
    guests: 150,
    menuPackageId: 'standard',
    decorationFee: 15000,
    notes: '',
    date: '',
    startTime: '18:00',
    endTime: '22:00',
    discount: 0,
    gstPercent: 5,
  });

  const [bookings, setBookings] = useState([]);

  const [modals, setModals] = useState({ viewBill: false });
  const [selectedBooking, setSelectedBooking] = useState(null);

  const selectedHall = useMemo(() => halls.find((h) => h.code === wizard.hallId || h.id === wizard.hallId) || null, [halls, wizard.hallId]);
  const selectedPackage = useMemo(
    () => menuPackages.find((p) => p.id === wizard.menuPackageId) || menuPackages[0],
    [wizard.menuPackageId],
  );

  const wizardHours = useMemo(() => hoursBetween(wizard.startTime, wizard.endTime), [wizard.startTime, wizard.endTime]);

  const wizardTotals = useMemo(() => {
    const hallCharge = selectedHall ? selectedHall.ratePerHour * wizardHours : 0;
    const foodCharge = (Number(wizard.guests) || 0) * (selectedPackage?.perGuest || 0);
    const decoration = Number(wizard.decorationFee) || 0;
    const subTotal = hallCharge + foodCharge + decoration;
    const discount = Math.min(subTotal, Number(wizard.discount) || 0);
    const taxable = Math.max(0, subTotal - discount);
    const gst = Math.round((taxable * (Number(wizard.gstPercent) || 0)) / 100);
    const grandTotal = taxable + gst;
    return { hallCharge, foodCharge, decoration, subTotal, discount, taxable, gst, grandTotal };
  }, [
    selectedHall,
    wizardHours,
    wizard.guests,
    wizard.decorationFee,
    wizard.discount,
    wizard.gstPercent,
    selectedPackage,
  ]);

  const openModal = (name) => setModals((prev) => ({ ...prev, [name]: true }));
  const closeModal = (name) => setModals((prev) => ({ ...prev, [name]: false }));

  const resetWizard = () => {
    setWizard((prev) => ({
      ...prev,
      hallId: '',
      customerName: '',
      phone: '',
      eventType: 'Wedding',
      guests: 150,
      menuPackageId: 'standard',
      decorationFee: 15000,
      notes: '',
      date: '',
      startTime: '18:00',
      endTime: '22:00',
      discount: 0,
      gstPercent: 5,
    }));
    setActiveStep(0);
  };

  const canNext = useMemo(() => {
    if (activeStep === 0) return Boolean(wizard.hallId);
    if (activeStep === 1) return Boolean(wizard.customerName.trim()) && Boolean(wizard.phone.trim());
    if (activeStep === 2) return Boolean(wizard.date) && Boolean(wizard.startTime) && Boolean(wizard.endTime) && wizardHours > 0;
    if (activeStep === 3) return true;
    return false;
  }, [activeStep, wizard.hallId, wizard.customerName, wizard.phone, wizard.date, wizard.startTime, wizard.endTime, wizardHours]);

  const goNext = () => {
    if (!canNext) return;
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => setActiveStep((s) => Math.max(0, s - 1));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/banquet");
        if (res.data?.halls) {
          setHalls(
            res.data.halls.map((h) => ({
              id: h.code || h.id,
              code: h.code,
              name: h.name,
              capacity: h.capacity,
              ratePerHour: h.ratePerHour,
              status: h.status,
            }))
          );
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
    if (!selectedHall) return;

    const payload = {
      hallId: selectedHall.id || selectedHall.code,
      customerName: wizard.customerName,
      phone: wizard.phone,
      eventType: wizard.eventType,
      guests: Number(wizard.guests) || 0,
      menuPackageId: wizard.menuPackageId,
      decorationFee: Number(wizard.decorationFee) || 0,
      notes: wizard.notes,
      date: wizard.date,
      startTime: wizard.startTime,
      endTime: wizard.endTime,
      discount: wizard.discount,
      gstPercent: wizard.gstPercent,
    };

    try {
      const res = await API.post("/banquet", payload);
      const newId = res.data?.id || Date.now();
      const hallName = selectedHall.name;
      setBookings((prev) => [
        {
          id: newId,
          hallId: selectedHall.id || selectedHall.code,
          hallName,
          customerName: wizard.customerName,
          phone: wizard.phone,
          eventType: wizard.eventType,
          guests: Number(wizard.guests) || 0,
          menuPackageId: wizard.menuPackageId,
          decorationFee: Number(wizard.decorationFee) || 0,
          notes: wizard.notes,
          date: wizard.date,
          startTime: wizard.startTime,
          endTime: wizard.endTime,
          status: 'Confirmed',
          invoiceNo: '',
        },
        ...prev,
      ]);
      setActiveStep(4);
      alert(`Booking Confirmed for ${wizard.customerName} (${hallName})`);
    } catch (err) {
      console.error("Error creating banquet booking", err);
      alert("Error creating booking");
    }
  };

  const markCompleted = async (booking) => {
    try {
      await API.put(`/banquet/${booking.id}/complete`);
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: 'Completed' } : b)));
      alert(`Event marked completed: ${booking.hallName}`);
    } catch (err) {
      console.error("Error marking completed", err);
      alert("Error marking completed");
    }
  };

  const generateBill = async (booking) => {
    try {
      const res = await API.put(`/banquet/${booking.id}/bill`, {
        invoiceNo: booking.invoiceNo,
      });
      const invoiceNo = res.data?.invoiceNo || booking.invoiceNo;
      const updated = { ...booking, invoiceNo, status: 'Billed' };
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? updated : b)));
      setSelectedBooking(updated);
      openModal('viewBill');
    } catch (err) {
      console.error("Error billing booking", err);
      alert("Error generating bill");
    }
  };

  const hallStats = useMemo(() => {
    const total = halls.length;
    const upcoming = bookings.filter((b) => b.status === 'Confirmed').length;
    const completed = bookings.filter((b) => b.status === 'Completed' || b.status === 'Billed').length;
    const billed = bookings.filter((b) => b.status === 'Billed').length;
    return { total, upcoming, completed, billed };
  }, [halls.length, bookings]);

  const F = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <div>
      {/* Header */}
      <div className="simple-page-header">
        <h1 className="simple-page-title">Banquet Management</h1>
        <button className="simple-btn simple-btn-primary" onClick={resetWizard}>+ New Booking</button>
      </div>

      {/* Stats */}
      <div className="simple-metrics-grid" style={{ marginBottom: 16 }}>
        <div className="simple-metric-tile tile-blue"><div className="simple-metric-tile-value">{hallStats.total}</div><div className="simple-metric-tile-label">Total Halls</div></div>
        <div className="simple-metric-tile tile-green"><div className="simple-metric-tile-value">{hallStats.upcoming}</div><div className="simple-metric-tile-label">Upcoming</div></div>
        <div className="simple-metric-tile tile-orange"><div className="simple-metric-tile-value">{hallStats.completed}</div><div className="simple-metric-tile-label">Completed</div></div>
        <div className="simple-metric-tile tile-purple"><div className="simple-metric-tile-value">{hallStats.billed}</div><div className="simple-metric-tile-label">Billed</div></div>
      </div>

      {/* Booking Wizard */}
      <div className="simple-card" style={{ marginBottom: 16 }}>
        <div className="simple-card-title">New Booking — Step {activeStep + 1} of {steps.length}: {steps[activeStep]}</div>

        {/* Step indicator */}
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
                  onClick={() => setWizard(p => ({ ...p, hallId: hall.code || hall.id }))}
                  style={{ border: `2px solid ${wizard.hallId === (hall.code || hall.id) ? '#1565c0' : '#ddd'}`, borderRadius: 6, padding: 12, cursor: "pointer", background: wizard.hallId === (hall.code || hall.id) ? '#e3f0ff' : '#fff' }}>
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
            <div className="simple-form-group"><label className="simple-label">Event Type</label><select className="simple-select" value={wizard.eventType} onChange={e => setWizard(p => ({ ...p, eventType: e.target.value }))}><option>Wedding</option><option>Reception</option><option>Birthday</option><option>Engagement</option><option>Conference</option><option>Corporate</option></select></div>
            <div className="simple-form-group"><label className="simple-label">Guests</label><input type="number" className="simple-input" value={wizard.guests} min={1} onChange={e => setWizard(p => ({ ...p, guests: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Menu Package</label><select className="simple-select" value={wizard.menuPackageId} onChange={e => setWizard(p => ({ ...p, menuPackageId: e.target.value }))}>{menuPackages.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.perGuest}/guest)</option>)}</select></div>
            <div className="simple-form-group"><label className="simple-label">Decoration Fee (₹)</label><input type="number" className="simple-input" value={wizard.decorationFee} min={0} onChange={e => setWizard(p => ({ ...p, decorationFee: e.target.value }))} /></div>
            <div className="simple-form-group" style={{ gridColumn: "span 2" }}><label className="simple-label">Notes</label><textarea className="simple-textarea" value={wizard.notes} onChange={e => setWizard(p => ({ ...p, notes: e.target.value }))} placeholder="Special instructions..." /></div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="simple-form-grid">
            <div className="simple-form-group"><label className="simple-label">Event Date *</label><input type="date" className="simple-input" value={wizard.date} onChange={e => setWizard(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Start Time *</label><input type="time" className="simple-input" value={wizard.startTime} onChange={e => setWizard(p => ({ ...p, startTime: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">End Time *</label><input type="time" className="simple-input" value={wizard.endTime} onChange={e => setWizard(p => ({ ...p, endTime: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Duration</label><div className="simple-input" style={{ background: "#f5f5f5" }}>{wizardHours > 0 ? `${wizardHours} hour(s)` : '—'}</div></div>
            <div className="simple-form-group"><label className="simple-label">Discount (₹)</label><input type="number" className="simple-input" value={wizard.discount} min={0} onChange={e => setWizard(p => ({ ...p, discount: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">GST %</label><input type="number" className="simple-input" value={wizard.gstPercent} min={0} onChange={e => setWizard(p => ({ ...p, gstPercent: e.target.value }))} /></div>
          </div>
        )}

        {activeStep === 3 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="simple-summary">
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#1565c0" }}>Booking Details</div>
              {[["Hall", selectedHall?.name || '-'], ["Customer", wizard.customerName], ["Event", wizard.eventType], ["Guests", wizard.guests], ["Date", wizard.date], ["Time", `${wizard.startTime} – ${wizard.endTime}`]].map(([k, v]) => (
                <div key={k} className="simple-summary-row"><span>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
              ))}
            </div>
            <div className="simple-summary">
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#1565c0" }}>Cost Breakdown</div>
              {[["Hall Charges", F(wizardTotals.hallCharge)], ["Food Charges", F(wizardTotals.foodCharge)], ["Decoration", F(wizardTotals.decoration)], ["Discount", `- ${F(wizardTotals.discount)}`], ["GST", F(wizardTotals.gst)]].map(([k, v]) => (
                <div key={k} className="simple-summary-row"><span>{k}</span><span>{v}</span></div>
              ))}
              <div className="simple-summary-total"><span>Grand Total</span><span>{F(wizardTotals.grandTotal)}</span></div>
            </div>
            <div style={{ gridColumn: "span 2", textAlign: "right" }}>
              <button className="simple-btn simple-btn-success" onClick={handleConfirmBooking}>Confirm Booking</button>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div>
            <p style={{ color: "#666", marginBottom: 12, fontSize: 13 }}>Booking confirmed. Mark the event as completed from the list below, then generate the bill.</p>
            <button className="simple-btn simple-btn-primary" onClick={() => setActiveStep(5)}>Go to Generate Bill</button>
          </div>
        )}

        {activeStep === 5 && (
          <p style={{ color: "#666", fontSize: 13 }}>Select a completed/confirmed event from the list below and click "Generate Bill".</p>
        )}

        <div className="simple-btn-row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button className="simple-btn simple-btn-gray" onClick={goBack} disabled={activeStep === 0}>Back</button>
          <button className="simple-btn simple-btn-primary" onClick={goNext} disabled={activeStep >= 3 || !canNext}>Next</button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="simple-card">
        <div className="simple-card-title">All Bookings</div>
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead>
              <tr><th>Hall</th><th>Customer</th><th>Event</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <BanquetBookingRow key={b.id} booking={b}
                  onComplete={() => markCompleted(b)}
                  onGenerateBill={() => generateBill(b)}
                  onView={() => { setSelectedBooking(b); openModal('viewBill'); }} />
              ))}
              {bookings.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "#999" }}>No bookings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modals.viewBill} onClose={() => closeModal('viewBill')} title="Banquet Bill">
        {selectedBooking
          ? <BanquetBill booking={selectedBooking} halls={halls} menuPackages={menuPackages} formatINR={formatINR} />
          : <p style={{ color: "#666" }}>No booking selected.</p>}
      </Modal>
    </div>
  );
};

export default Banquet;


