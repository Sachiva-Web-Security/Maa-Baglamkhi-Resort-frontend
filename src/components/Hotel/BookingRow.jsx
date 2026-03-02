import { useState, useEffect } from "react";
import InvoiceForm from '../Accounts/forms/InvoiceForm';
import BillViewModal from './BillViewModal';
import API from '../../api';

// Safely converts any date value to YYYY-MM-DD without timezone offset shifts
const toDateInput = (val) => {
  if (!val) return "";
  // If it's already YYYY-MM-DD format, return as-is
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // For ISO strings or Date objects, parse as local date
  const d = new Date(val);
  if (isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const BookingRow = ({ booking, onExtend, onShiftRoom, onCheckOut, onBillGenerated }) => {
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState("generate"); // "generate" | "edit"
  const [showBillView, setShowBillView] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);

  // Fetch existing invoice when we know bill was generated
  useEffect(() => {
    if (booking.billGenerated && booking.id) {
      API.get(`/invoices/by-booking/${booking.id}`)
        .then(res => setSavedInvoice(res.data))
        .catch(() => { }); // silently fail if not found
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
    setShowBillView(true); // auto-open bill view after save
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

  return (
    <>
      <tr className="border-b border-white/10 hover:bg-white/5 transition duration-150">
        <td className="px-4 py-3 font-semibold text-white text-sm whitespace-nowrap">{booking.guestName}</td>
        <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">Rm {booking.room}</td>
        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(booking.checkIn)}</td>
        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(booking.checkOut)}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${booking.status === "Occupied" ? "bg-emerald-500/20 text-emerald-400" :
            booking.status === "CheckedOut" ? "bg-gray-500/20 text-gray-400" :
              "bg-blue-500/20 text-blue-400"
            }`}>
            {booking.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1.5 items-center flex-nowrap">

            {!isBillGenerated ? (
              <Btn onClick={handleGenerateBill} color="from-purple-500 to-indigo-600">Generate Bill</Btn>
            ) : (
              <>
                <Btn onClick={handleViewBill} color="from-green-500 to-teal-500">View Bill</Btn>
                <Btn onClick={handleEditBill} color="from-amber-400 to-orange-500" title="Edit Bill">✏️ Edit</Btn>
              </>
            )}

            <Btn onClick={() => onExtend(booking)} color="from-blue-500 to-indigo-500">Extend</Btn>
            <Btn onClick={() => onShiftRoom(booking)} color="from-yellow-400 to-orange-400">Shift</Btn>
            <Btn onClick={() => onCheckOut(booking)} color="from-red-500 to-pink-500">Check-Out</Btn>
          </div>
        </td>
      </tr>

      {/* InvoiceForm Modal (Generate or Edit) */}
      {showInvoice && (
        <tr>
          <td colSpan={6} className="p-0 m-0">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <InvoiceForm
                  initialData={invoiceMode === "edit" && savedInvoice
                    ? {
                      invoiceNo: savedInvoice.invoice_no,
                      customerName: savedInvoice.customer_name,
                      phone: savedInvoice.phone,
                      roomNo: savedInvoice.room_no,
                      checkIn: toDateInput(savedInvoice.check_in),
                      checkOut: toDateInput(savedInvoice.check_out),
                      pricePerDay: savedInvoice.price_per_day,
                      foodCharge: savedInvoice.food_charge,
                      extraCharge: savedInvoice.extra_charge,
                      gst: savedInvoice.gst,
                      discount: savedInvoice.discount,
                      paymentMode: savedInvoice.payment_mode,
                      status: savedInvoice.status,
                      notes: savedInvoice.notes,
                    }
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

      {/* Bill View Modal */}
      {showBillView && (
        <BillViewModal
          invoice={savedInvoice}
          onClose={() => setShowBillView(false)}
          onEdit={() => {
            setShowBillView(false);
            handleEditBill();
          }}
        />
      )}
    </>
  );
};

const Btn = ({ children, onClick, color, title }) => (
  <button
    onClick={onClick}
    title={title}
    className={`px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r ${color} text-white shadow hover:scale-105 transition-transform duration-150 whitespace-nowrap`}
  >
    {children}
  </button>
);

export default BookingRow;