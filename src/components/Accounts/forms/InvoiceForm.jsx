import { useState, useEffect } from "react";
import axios from "axios";

const todayISO = () => new Date().toISOString().slice(0, 10);

const InvoiceForm = ({ onCancel, initialData = {} }) => {

  const generateInvoiceNo = () =>
    `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  const [invoiceNo] = useState(generateInvoiceNo());

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

  // 🔹 Auto calculation
  useEffect(() => {
    const days =
      new Date(form.checkOut) - new Date(form.checkIn) > 0
        ? Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / (1000*60*60*24))
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
    if (calculated.finalTotal <= 0) return alert("Invalid total amount");

    setLoading(true);
    try {
      const dataToSend = { ...form, ...calculated };
      const res = await axios.post("http://localhost:5001/api/invoices/create", dataToSend);
      if (res.data?.id) alert(`Invoice created successfully! ID: ${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <form className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-8" onSubmit={handleSubmit}>
        <h2 className="text-2xl font-bold mb-6 text-black">Hotel Invoice Form</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Invoice No" name="invoiceNo" value={form.invoiceNo} onChange={handleChange} />
          <Input label="Date" type="date" name="date" value={form.date} onChange={handleChange} />
          <Input label="Customer Name" name="customerName" value={form.customerName} onChange={handleChange} />
          <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
          <Input label="Room No" name="roomNo" value={form.roomNo} onChange={handleChange} />
          <Input label="Price Per Day" type="number" name="pricePerDay" value={form.pricePerDay} onChange={handleChange} />
          <Input label="Check In" type="date" name="checkIn" value={form.checkIn} onChange={handleChange} />
          <Input label="Check Out" type="date" name="checkOut" value={form.checkOut} onChange={handleChange} />
          <Input label="Food Charge" type="number" name="foodCharge" value={form.foodCharge} onChange={handleChange} />
          <Input label="Extra Charge" type="number" name="extraCharge" value={form.extraCharge} onChange={handleChange} />
          <Input label="GST %" type="number" name="gst" value={form.gst} onChange={handleChange} />
          <Input label="Discount" type="number" name="discount" value={form.discount} onChange={handleChange} />
          <Select label="Payment Mode" name="paymentMode" value={form.paymentMode} onChange={handleChange} options={["Cash","Card","UPI","Bank Transfer"]} />
          <Select label="Status" name="status" value={form.status} onChange={handleChange} options={["Paid","Pending","Partially Paid"]} />
        </div>

        <div className="mt-6">
          <label className="block mb-1 font-semibold text-black">Notes</label>
          <textarea className="w-full border text-black rounded-lg px-3 py-2" name="notes" value={form.notes} onChange={handleChange} />
        </div>

        <div className="mt-8 bg-blue-50 border rounded-xl p-6 text-black">
          <p>Total Days: <strong>{calculated.days}</strong></p>
          <p>Room Charge: ₹{calculated.roomCharge}</p>
          <p>Subtotal: ₹{calculated.subtotal}</p>
          <p>GST: ₹{calculated.gstAmount}</p>
          <h3 className="text-lg font-bold text-blue-700 mt-2">Final Total: ₹{calculated.finalTotal}</h3>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button type="button" className="px-5 py-2 rounded-lg bg-gray-300" onClick={onCancel}>Cancel</button>
          <button type="submit" className="px-5 py-2 rounded-lg bg-blue-600 text-white" disabled={loading}>
            {loading ? "Saving..." : "Generate Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div>
    <label className="block mb-1 font-semibold text-black">{label}</label>
    <input className="w-full border text-black rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" {...props} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div>
    <label className="block mb-1 font-semibold text-black">{label}</label>
    <select className="w-full border text-black rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" {...props}>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default InvoiceForm;