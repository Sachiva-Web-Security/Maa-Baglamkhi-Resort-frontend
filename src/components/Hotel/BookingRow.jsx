import { useState, useEffect } from "react";
import InvoiceForm from '../Accounts/forms/InvoiceForm';
import BillViewModal from './BillViewModal';
import API from '../../api';

// Safely converts any date value to YYYY-MM-DD without timezone offset shifts
const toDateInput = (val) => {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const BookingRow = ({ booking, onExtend, onShiftRoom, onCheckOut, onBillGenerated, onOpenInvoice }) => {
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState("generate"); // "generate" | "edit"
  const [showBillView, setShowBillView] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);

  useEffect(() => {
    if (booking.billGenerated && booking.id) {
      API.get(`/invoices/by-booking/${booking.id}`)
        .then(res => setSavedInvoice(res.data))
        .catch(() => { });
    }
  }, [booking.billGenerated, booking.id]);

  const getInvoiceInitialData = () => ({
    customerName: booking.guestName,
    phone: booking.phone || "",
    roomNo: booking.room || "",
    checkIn: toDateInput(booking.checkIn),
    checkOut: toDateInput(booking.checkOut),
    pricePerDay: booking.pricePerDay || "",
    foodCharge: "0",
    extraCharge: "0",
    gst: "18",
    discount: "0",
    paymentMode: "UPI",
    status: "Paid",
    notes: ""
  });

  const handleGenerateBill = () => {
    setInvoiceMode("generate");
    setShowInvoice(true);
  };

  const handleEditBill = () => {
    setInvoiceMode("edit");
    setShowInvoice(true);
  };

  const handleViewBill = () => {
    setShowBillView(true);
  };

  const handleInvoiceSuccess = (invoiceData) => {
    setSavedInvoice(invoiceData);
    setShowInvoice(false);
    setShowBillView(true);
    if (onBillGenerated) onBillGenerated(booking.id);
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
  };

  const isBillGenerated = !!booking.billGenerated;

  // Format date gracefully: 2026-03-04 → 04 Mar
  const fmtDate = (val) => {
    if (!val) return "—";
    const d = new Date(typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val) ? val + "T12:00:00" : val);
    if (isNaN(d)) return val;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
  };

  const statusBadge = booking.status === "Occupied" ? "badge-green" :
    booking.status === "CheckedOut" ? "badge-gray" : "badge-blue";

  return (
    <>
      <tr>
        <td style={{ fontWeight: 600 }}>{booking.guestName}</td>
        <td><span className="simple-badge badge-blue">Rm {booking.room}</span></td>
        <td>{fmtDate(booking.checkIn)}</td>
        <td>{fmtDate(booking.checkOut)}</td>
        <td><span className={`simple-badge ${statusBadge}`}>{booking.status}</span></td>
        <td>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {!isBillGenerated ? (
              <Btn onClick={handleGenerateBill} cls="simple-btn-primary">Generate Bill</Btn>
            ) : (
              <>
                <Btn onClick={handleViewBill} cls="simple-btn-success">View Bill</Btn>
                <Btn onClick={handleEditBill} cls="simple-btn-warning">Edit Bill</Btn>
              </>
            )}
            {onOpenInvoice && <Btn onClick={() => onOpenInvoice(booking)} cls="simple-btn-outline">Invoice</Btn>}
            <Btn onClick={() => onExtend(booking)} cls="simple-btn-info">Extend</Btn>
            <Btn onClick={() => onShiftRoom(booking)} cls="simple-btn-gray">Shift</Btn>
            <Btn onClick={() => onCheckOut(booking)} cls="simple-btn-danger">Check-Out</Btn>
          </div>
        </td>
      </tr>

      {showInvoice && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <div className="simple-modal-overlay">
              <div className="simple-modal" style={{ maxWidth: 720 }}>
                <InvoiceForm
                  initialData={invoiceMode === "edit" && savedInvoice
                    ? { invoiceNo: savedInvoice.invoice_no, customerName: savedInvoice.customer_name, phone: savedInvoice.phone, roomNo: savedInvoice.room_no, checkIn: toDateInput(savedInvoice.check_in), checkOut: toDateInput(savedInvoice.check_out), pricePerDay: savedInvoice.price_per_day, foodCharge: savedInvoice.food_charge, extraCharge: savedInvoice.extra_charge, gst: savedInvoice.gst, discount: savedInvoice.discount, paymentMode: savedInvoice.payment_mode, status: savedInvoice.status, notes: savedInvoice.notes }
                    : getInvoiceInitialData()
                  }
                  bookingId={booking.id}
                  invoiceId={invoiceMode === "edit" ? savedInvoice?.id : null}
                  onCancel={handleCloseInvoice}
                  onSuccess={handleInvoiceSuccess}
                />
              </div>
            </div>
          </td>
        </tr>
      )}

      {showBillView && (
        <BillViewModal invoice={savedInvoice} onClose={() => setShowBillView(false)}
          onEdit={() => { setShowBillView(false); handleEditBill(); }} />
      )}
    </>
  );
};

const Btn = ({ children, onClick, cls }) => (
  <button onClick={onClick} className={`simple-btn simple-btn-sm ${cls}`} style={{ whiteSpace: "nowrap" }}>
    {children}
  </button>
);

export default BookingRow;
