import { useState, useEffect } from "react";
import API from "../../../api";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * InvoiceForm — handles both creating and editing hotel invoices.
 * Props:
 *   initialData   — pre-fill values (from booking or saved invoice)
 *   bookingId     — booking the invoice belongs to (sent to backend)
 *   invoiceId     — if set, PUT update instead of POST create
 *   onCancel      — called when Cancel is clicked
 *   onSuccess(data) — called with saved invoice data after successful submit
 */
const InvoiceForm = ({ onCancel, initialData = {}, bookingId, invoiceId, onSuccess }) => {

  const generateInvoiceNo = () =>
    `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  const [invoiceNo] = useState(initialData.invoiceNo || generateInvoiceNo());

  const [form, setForm] = useState({
    invoiceNo,
    date: todayISO(),
    customerName: "",
    phone: "",
    roomNo: "",
    checkIn: todayISO(),
    checkOut: todayISO(),
    pricePerDay: "",
    foodCharge: "0",
    extraCharge: "0",
    gst: "18",
    discount: "0",
    paymentMode: "UPI",
    status: "Paid",
    notes: ""
  });

  const [calculated, setCalculated] = useState({
    days: 0,
    roomCharge: 0,
    subtotal: 0,
    gstAmount: 0,
    finalTotal: 0
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      ...initialData,
      invoiceNo: initialData.invoiceNo || prev.invoiceNo
    }));
  }, [initialData]);

  // Auto calculation
  useEffect(() => {
    const days =
      new Date(form.checkOut) - new Date(form.checkIn) > 0
        ? Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / (1000 * 60 * 60 * 24))
        : 0;

    const roomCharge = days * Number(form.pricePerDay || 0);
    const subtotal = roomCharge + Number(form.foodCharge || 0) + Number(form.extraCharge || 0);
    const gstAmount = subtotal * (Number(form.gst || 0) / 100);
    const finalTotal = subtotal + gstAmount - Number(form.discount || 0);

    setCalculated({ days, roomCharge, subtotal, gstAmount, finalTotal });
  }, [form.checkIn, form.checkOut, form.pricePerDay, form.foodCharge, form.extraCharge, form.gst, form.discount]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.customerName.trim()) return alert("Customer name required");
    if (calculated.finalTotal <= 0) return alert("Invalid total amount — please enter Price Per Day and dates");

    setLoading(true);
    try {
      const dataToSend = {
        ...form,
        ...calculated,
        bookingId: bookingId || null,
      };

      let savedData;
      if (invoiceId) {
        // Edit mode — update existing invoice
        await API.put(`/invoices/update/${invoiceId}`, dataToSend);
        savedData = { ...dataToSend, id: invoiceId };
      } else {
        // Create mode
        const res = await API.post("/invoices/create", dataToSend);
        savedData = { ...dataToSend, id: res.data.id };
      }

      if (onSuccess) onSuccess(savedData);
    } catch (err) {
      console.error(err);
      alert("Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="bg-white py-8 px-6">
      <form onSubmit={handleSubmit}>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {invoiceId ? "✏️ Edit Invoice" : "🧾 Generate Invoice"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label="Invoice No" name="invoiceNo" value={form.invoiceNo} onChange={handleChange} />
          <Input label="Date" type="date" name="date" value={form.date} onChange={handleChange} />
          <Input label="Customer Name" name="customerName" value={form.customerName} onChange={handleChange} required />
          <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
          <Input label="Room No" name="roomNo" value={form.roomNo} onChange={handleChange} />
          <Input label="Price Per Day (₹)" type="number" name="pricePerDay" value={form.pricePerDay} onChange={handleChange} />
          <Input label="Check In" type="date" name="checkIn" value={form.checkIn} onChange={handleChange} />
          <Input label="Check Out" type="date" name="checkOut" value={form.checkOut} onChange={handleChange} />
          <Input label="Food Charge (₹)" type="number" name="foodCharge" value={form.foodCharge} onChange={handleChange} />
          <Input label="Extra Charge (₹)" type="number" name="extraCharge" value={form.extraCharge} onChange={handleChange} />
          <Input label="GST %" type="number" name="gst" value={form.gst} onChange={handleChange} />
          <Input label="Discount (₹)" type="number" name="discount" value={form.discount} onChange={handleChange} />
          <Select label="Payment Mode" name="paymentMode" value={form.paymentMode} onChange={handleChange}
            options={["Cash", "Card", "UPI", "Bank Transfer"]} />
          <Select label="Status" name="status" value={form.status} onChange={handleChange}
            options={["Paid", "Pending", "Partially Paid"]} />
        </div>

        <div className="mt-5">
          <label className="block mb-1 font-semibold text-gray-700">Notes</label>
          <textarea
            className="w-full border text-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
          />
        </div>

        {/* Calculated Summary */}
        <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-5 text-gray-800">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600">Total Days:</span>
            <span className="font-semibold">{calculated.days}</span>
            <span className="text-gray-600">Room Charge:</span>
            <span>₹{calculated.roomCharge.toFixed(2)}</span>
            <span className="text-gray-600">Subtotal:</span>
            <span>₹{calculated.subtotal.toFixed(2)}</span>
            <span className="text-gray-600">GST ({form.gst}%):</span>
            <span>₹{calculated.gstAmount.toFixed(2)}</span>
            {Number(form.discount) > 0 && (
              <>
                <span className="text-gray-600">Discount:</span>
                <span className="text-green-600">- ₹{Number(form.discount).toFixed(2)}</span>
              </>
            )}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between items-center">
            <span className="font-bold text-gray-700">Final Total</span>
            <span className="text-xl font-bold text-indigo-700">₹{calculated.finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
            disabled={loading}
          >
            {loading ? "Saving..." : (invoiceId ? "Update Invoice" : "Generate Invoice")}
          </button>
        </div>
      </form>
    </div>
  );
};

const Input = ({ label, required, ...props }) => (
  <div>
    <label className="block mb-1 font-semibold text-gray-700 text-sm">{label}</label>
    <input
      className="w-full border text-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
      required={required}
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div>
    <label className="block mb-1 font-semibold text-gray-700 text-sm">{label}</label>
    <select
      className="w-full border text-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
      {...props}
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default InvoiceForm;