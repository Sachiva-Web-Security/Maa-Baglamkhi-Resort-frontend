import React from "react";

// Safely extract YYYY-MM-DD without timezone shift
const toDate = (val) => {
    if (!val) return null;
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val + "T12:00:00");
    const d = new Date(val);
    return isNaN(d) ? null : d;
};

const BillViewModal = ({ invoice, onClose, onEdit }) => {
    if (!invoice) return null;

    // Recalculate all values from stored data (room_charge is not stored in DB)
    const checkIn = toDate(invoice.check_in || invoice.checkIn);
    const checkOut = toDate(invoice.check_out || invoice.checkOut);
    const days = (checkIn && checkOut && checkOut > checkIn)
        ? Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
        : 0;

    const pricePerDay = parseFloat(invoice.price_per_day || invoice.pricePerDay || 0);
    const roomCharge = days * pricePerDay;
    const foodCharge = parseFloat(invoice.food_charge || invoice.foodCharge || 0);
    const extraCharge = parseFloat(invoice.extra_charge || invoice.extraCharge || 0);
    const subtotal = roomCharge + foodCharge + extraCharge;
    const gstPct = parseFloat(invoice.gst || 0);
    const gstAmount = subtotal * gstPct / 100;
    const discount = parseFloat(invoice.discount || 0);
    const finalTotal = subtotal + gstAmount - discount;

    const fmt = (v) => parseFloat(v || 0).toFixed(2);

    const handlePrint = () => window.print();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold">🏨 Hotel Invoice</h2>
                        <p className="text-indigo-200 text-sm mt-1">{invoice.invoice_no || invoice.invoiceNo}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onEdit}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition"
                            title="Edit Invoice"
                        >
                            ✏️ Edit
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition"
                        >
                            🖨️ Print
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Bill Content */}
                <div className="p-6 space-y-5">
                    {/* Guest Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Guest Name" value={invoice.customer_name || invoice.customerName} />
                        <InfoItem label="Phone" value={invoice.phone || "—"} />
                        <InfoItem label="Room No" value={invoice.room_no || invoice.roomNo} />
                        <InfoItem label="Date" value={invoice.date} />
                        <InfoItem label="Check-In" value={invoice.check_in || invoice.checkIn} />
                        <InfoItem label="Check-Out" value={invoice.check_out || invoice.checkOut} />
                        <InfoItem label="Payment Mode" value={invoice.payment_mode || invoice.paymentMode} />
                        <InfoItem label="Status" value={invoice.status} highlight />
                    </div>

                    {/* Charges Breakdown — always recalculated */}
                    <div className="bg-gray-50 rounded-xl p-5 border">
                        <h3 className="font-semibold text-gray-600 mb-4 text-xs uppercase tracking-widest">
                            Charges Breakdown
                        </h3>
                        <div className="space-y-2 text-sm text-gray-700">
                            <Row label={`Room Charge (${days} day${days !== 1 ? "s" : ""} × ₹${fmt(pricePerDay)})`} value={`₹${fmt(roomCharge)}`} />
                            {foodCharge > 0 && <Row label="Food Charge" value={`₹${fmt(foodCharge)}`} />}
                            {extraCharge > 0 && <Row label="Extra Charge" value={`₹${fmt(extraCharge)}`} />}
                            <div className="border-t border-dashed pt-2 mt-1">
                                <Row label="Subtotal" value={`₹${fmt(subtotal)}`} />
                                <Row label={`GST (${gstPct}%)`} value={`₹${fmt(gstAmount)}`} />
                                {discount > 0 && (
                                    <Row label="Discount" value={`− ₹${fmt(discount)}`} valueClass="text-green-600" />
                                )}
                            </div>
                            <div className="border-t pt-3 mt-1 flex justify-between items-center">
                                <span className="font-bold text-gray-800 text-base">Final Total</span>
                                <span className="text-xl font-bold text-indigo-700">₹{fmt(finalTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
                            <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">{invoice.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ label, value, highlight }) => (
    <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 ${highlight ? "text-green-600" : "text-gray-800"}`}>
            {value || "—"}
        </p>
    </div>
);

const Row = ({ label, value, valueClass = "" }) => (
    <div className="flex justify-between py-0.5">
        <span className="text-gray-600">{label}</span>
        <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
);

export default BillViewModal;
