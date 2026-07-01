import { useState, useEffect } from "react";
import API from "../../../api";
import "./InvoiceForm.css";

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
    <div className="accounts-invoice-form">
      <form className="accounts-invoice-form__body" onSubmit={handleSubmit}>
        <h2 className="accounts-invoice-form__title">
          {invoiceId ? "✏️ Edit Invoice" : "🧾 Generate Invoice"}
        </h2>
        <div className="accounts-invoice-form__grid">
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

        <div className="accounts-invoice-form__notes">
          <label className="accounts-invoice-form__label">Notes</label>
          <textarea
            className="accounts-invoice-form__textarea"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
          />
        </div>

        {/* Calculated Summary */}
        <div className="accounts-invoice-form__summary">
          <div className="accounts-invoice-form__summary-grid">
            <span className="accounts-invoice-form__summary-label">Total Days:</span>
            <span className="accounts-invoice-form__summary-value">{calculated.days}</span>
            <span className="accounts-invoice-form__summary-label">Room Charge:</span>
            <span className="accounts-invoice-form__summary-value">₹{calculated.roomCharge.toFixed(2)}</span>
            <span className="accounts-invoice-form__summary-label">Subtotal:</span>
            <span className="accounts-invoice-form__summary-value">₹{calculated.subtotal.toFixed(2)}</span>
            <span className="accounts-invoice-form__summary-label">GST ({form.gst}%):</span>
            <span className="accounts-invoice-form__summary-value">₹{calculated.gstAmount.toFixed(2)}</span>
            {Number(form.discount) > 0 && (
              <>
                <span className="accounts-invoice-form__summary-label">Discount:</span>
                <span className="accounts-invoice-form__summary-value accounts-invoice-form__summary-value--positive">- ₹{Number(form.discount).toFixed(2)}</span>
              </>
            )}
          </div>
          <div className="accounts-invoice-form__final">
            <span className="accounts-invoice-form__final-label">Final Total</span>
            <span className="accounts-invoice-form__final-value">₹{calculated.finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="accounts-invoice-form__actions">
          <button
            type="button"
            className="accounts-invoice-form__btn accounts-invoice-form__btn--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="accounts-invoice-form__btn accounts-invoice-form__btn--primary"
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
  <div className="accounts-invoice-form__field">
    <label className="accounts-invoice-form__label">{label}</label>
    <input
      className="accounts-invoice-form__input"
      required={required}
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="accounts-invoice-form__field">
    <label className="accounts-invoice-form__label">{label}</label>
    <select
      className="accounts-invoice-form__input"
      {...props}
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default InvoiceForm;