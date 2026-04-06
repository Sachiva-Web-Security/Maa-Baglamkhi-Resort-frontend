import { useState, useEffect } from "react";
import API from "../../../api";

const todayISO = () => new Date().toISOString().slice(0, 10);
const EMPTY_INITIAL_DATA = Object.freeze({});

const InvoiceForm = ({
  onCancel,
  initialData = EMPTY_INITIAL_DATA,
  bookingId,
  invoiceId,
  onSuccess,
}) => {
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
    notes: "",
  });

  const [calculated, setCalculated] = useState({
    days: 0,
    roomCharge: 0,
    subtotal: 0,
    gstAmount: 0,
    finalTotal: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      ...initialData,
      invoiceNo: initialData.invoiceNo || prev.invoiceNo,
    }));
  }, [initialData]);

  useEffect(() => {
    const checkInDate = new Date(form.checkIn);
    const checkOutDate = new Date(form.checkOut);

    const diff = checkOutDate - checkInDate;

    const days = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;

    const roomCharge = days * Number(form.pricePerDay || 0);
    const subtotal =
      roomCharge +
      Number(form.foodCharge || 0) +
      Number(form.extraCharge || 0);

    const gstAmount = subtotal * (Number(form.gst || 0) / 100);
    const finalTotal = subtotal + gstAmount - Number(form.discount || 0);

    setCalculated({
      days,
      roomCharge,
      subtotal,
      gstAmount,
      finalTotal,
    });
  }, [
    form.checkIn,
    form.checkOut,
    form.pricePerDay,
    form.foodCharge,
    form.extraCharge,
    form.gst,
    form.discount,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.customerName.trim()) {
      return alert("Customer name required");
    }

    if (calculated.finalTotal <= 0) {
      return alert("Invalid total amount - please enter Price Per Day and dates");
    }

    setLoading(true);

    try {
      const dataToSend = {
        ...form,
        ...calculated,
        amount: calculated.finalTotal,
        bookingId: bookingId || null,
      };

      let savedData;

      if (invoiceId) {
        await API.put(`/invoices/update/${invoiceId}`, dataToSend);
        savedData = { ...dataToSend, id: invoiceId };
      } else {
        const res = await API.post("/invoices/create", dataToSend);
        savedData = { ...dataToSend, id: res.data.id };
      }

      if (onSuccess) {
        onSuccess(savedData);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-6 sm:px-6 sm:py-7">
      <form onSubmit={handleSubmit}>
        <div className="mb-6 rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
                Invoice Form
              </p>
              <h2 className="mt-2 text-[2rem] font-black text-slate-900 sm:text-[2.2rem]">
                {invoiceId ? "Edit Invoice" : "Generate Invoice"}
              </h2>
              <p className="mt-2 text-lg text-slate-500">
                Fill guest, stay, and billing details. Final total updates automatically.
              </p>
            </div>

            <div className="rounded-[18px] border border-cyan-100 bg-cyan-50/80 px-4 py-3 sm:min-w-[220px]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Invoice No
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900">{form.invoiceNo}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.95fr)]">
          <div className="space-y-5">
            <section className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Basic Details
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Invoice No"
                  name="invoiceNo"
                  value={form.invoiceNo}
                  onChange={handleChange}
                />

                <Input
                  label="Date"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                />

                <Input
                  label="Customer Name"
                  name="customerName"
                  value={form.customerName}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />

                <Input
                  label="Room No"
                  name="roomNo"
                  value={form.roomNo}
                  onChange={handleChange}
                />

                <Input
                  label="Price Per Day (Rs.)"
                  type="number"
                  name="pricePerDay"
                  value={form.pricePerDay}
                  onChange={handleChange}
                />
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Stay And Charges
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Check In"
                  type="date"
                  name="checkIn"
                  value={form.checkIn}
                  onChange={handleChange}
                />

                <Input
                  label="Check Out"
                  type="date"
                  name="checkOut"
                  value={form.checkOut}
                  onChange={handleChange}
                />

                <Input
                  label="Food Charge (Rs.)"
                  type="number"
                  name="foodCharge"
                  value={form.foodCharge}
                  onChange={handleChange}
                />

                <Input
                  label="Extra Charge (Rs.)"
                  type="number"
                  name="extraCharge"
                  value={form.extraCharge}
                  onChange={handleChange}
                />

                <Input
                  label="GST %"
                  type="number"
                  name="gst"
                  value={form.gst}
                  onChange={handleChange}
                />

                <Input
                  label="Discount (Rs.)"
                  type="number"
                  name="discount"
                  value={form.discount}
                  onChange={handleChange}
                />
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Payment And Notes
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Payment Mode"
                  name="paymentMode"
                  value={form.paymentMode}
                  onChange={handleChange}
                  options={["Cash", "Card", "UPI", "Bank Transfer"]}
                />

                <Select
                  label="Status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  options={["Paid", "Pending", "Partially Paid"]}
                />
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-lg font-semibold text-slate-700">
                  Notes
                </label>
                <textarea
                  className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Optional notes for the invoice"
                />
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#f5f9ff_0%,#eef6ff_100%)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Invoice Summary
              </div>
              <div className="mt-4 space-y-3">
                <SummaryRow label="Total Days" value={String(calculated.days)} />
                <SummaryRow label="Room Charge" value={`Rs. ${calculated.roomCharge.toFixed(2)}`} />
                <SummaryRow label="Subtotal" value={`Rs. ${calculated.subtotal.toFixed(2)}`} />
                <SummaryRow label={`GST (${form.gst}%)`} value={`Rs. ${calculated.gstAmount.toFixed(2)}`} />
                {Number(form.discount) > 0 ? (
                  <SummaryRow
                    label="Discount"
                    value={`- Rs. ${Number(form.discount).toFixed(2)}`}
                    valueClassName="text-emerald-600"
                  />
                ) : null}
              </div>

              <div className="mt-5 rounded-[18px] border border-cyan-100 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-lg font-bold text-slate-700">Final Total</span>
                  <span className="text-[2rem] font-black text-cyan-700">
                    Rs. {calculated.finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white/90 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Quick Info
              </div>
              <div className="mt-4 space-y-3 text-lg text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <span>Payment Mode</span>
                  <span className="font-semibold text-slate-900">{form.paymentMode}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Status</span>
                  <span className="font-semibold text-slate-900">{form.status}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Customer</span>
                  <span className="font-semibold text-slate-900">{form.customerName || "--"}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-5 py-3 text-lg font-semibold text-white shadow-[0_12px_30px_rgba(8,145,178,0.2)] transition hover:from-cyan-700 hover:to-indigo-700"
            disabled={loading}
          >
            {loading ? "Saving..." : invoiceId ? "Update Invoice" : "Generate Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
};

const Input = ({ label, required, ...props }) => (
  <div>
    <label className="mb-1 block text-lg font-semibold text-slate-700">
      {label}
    </label>
    <input
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
      required={required}
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div>
    <label className="mb-1 block text-lg font-semibold text-slate-700">
      {label}
    </label>
    <select
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
      {...props}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const SummaryRow = ({ label, value, valueClassName = "text-slate-900" }) => (
  <div className="flex items-center justify-between gap-4 rounded-[14px] bg-white/70 px-3 py-3">
    <span className="text-lg text-slate-500">{label}</span>
    <span className={`text-lg font-semibold ${valueClassName}`}>{value}</span>
  </div>
);

export default InvoiceForm;
