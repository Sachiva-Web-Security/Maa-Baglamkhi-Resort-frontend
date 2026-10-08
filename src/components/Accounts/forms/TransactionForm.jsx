import React, { useState } from "react";
import { FaTimes, FaArrowDown, FaArrowUp, FaEdit } from "react-icons/fa";
import "./TransactionForm.css";

const todayISO = () => new Date().toISOString().slice(0, 10);

const DESCRIPTION_SUGGESTIONS = {
  Expense: [
    "Vendor payment",
    "Kitchen purchase",
    "Room maintenance",
    "Electricity bill",
    "Staff expense",
    "Laundry expense",
  ],
  Income: [
    "Room booking payment",
    "Restaurant payment",
    "Advance received",
    "Banquet booking",
    "Invoice collection",
    "Settlement received",
  ],
};

const DEPARTMENT_OPTIONS = ["Room", "Restaurant", "Other"];

const TransactionForm = ({ type, onSubmit, onCancel, initialData = {} }) => {
  const [form, setForm] = useState({
    date: initialData.date || todayISO(),
    description: initialData.description || "",
    narration: initialData.narration || "",
    customerName: initialData.customerName || "",
    customerMobile: initialData.customerMobile || "",
    amount: initialData.amount ?? "",
    paymentMode: initialData.paymentMode || "UPI",
    department:
      initialData.department || (type === "Income" ? "Room" : "Other"),
  });

  const isEdit = Boolean(initialData.description || initialData.amount);
  const isIncome = type === "Income";
  const suggestions = DESCRIPTION_SUGGESTIONS[type] || [];

  const title = isEdit
    ? "Edit transaction record"
    : type === "Expense"
      ? "Add expense record"
      : "Add income record";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const amountNumber = Number(form.amount);

    if (!form.description.trim()) {
      alert("Please enter description");
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    onSubmit({
      type,
      date: form.date,
      description: form.description.trim(),
      narration: form.narration.trim() || undefined,
      customerName: form.customerName.trim() || undefined,
      customerMobile: form.customerMobile.trim() || undefined,
      amount: amountNumber,
      paymentMode: form.paymentMode,
      department: form.department,
      sourceModule: "accounts-manual",
    });
  };

  return (
    <form className="flex flex-col bg-white" onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isEdit
                ? "bg-blue-50 text-blue-600 border border-blue-100"
                : isIncome
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-rose-50 text-rose-600 border border-rose-100"
            }`}
          >
            {isEdit ? (
              <FaEdit className="text-base" />
            ) : isIncome ? (
              <FaArrowDown className="text-base" />
            ) : (
              <FaArrowUp className="text-base" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {title}
              </h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${
                  isIncome
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60"
                }`}
              >
                {type}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Saved directly to accounts ledger with automatic balance reconciliation.
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <FaTimes className="text-lg" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <div className="space-y-5 px-6 py-5 sm:px-8 max-h-[calc(90vh-180px)] overflow-y-auto">
        {/* Row 1: Date & Type */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="date">
              Transaction Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              className="form-input"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Entry Type
            </label>
            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-base font-semibold text-slate-700">
              <span
                className={`mr-2.5 h-2.5 w-2.5 rounded-full ${
                  isIncome ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {type} ({isIncome ? "Cash Inflow" : "Cash Outflow"})
            </div>
          </div>
        </div>

        {/* Row 2: Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-bold uppercase tracking-wider text-slate-600" htmlFor="description">
              Description / Party Name <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400">Quick suggestions:</span>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-all ${
                  form.description === suggestion
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    description: suggestion,
                  }))
                }
              >
                {suggestion}
              </button>
            ))}
          </div>

          <input
            id="description"
            name="description"
            type="text"
            className="form-input"
            value={form.description}
            onChange={handleChange}
            placeholder="e.g. Room booking payment, Laundry, Vendor supply"
            list={`transaction-description-${type.toLowerCase()}`}
            required
          />
          <datalist id={`transaction-description-${type.toLowerCase()}`}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>

        {/* Row 3: Amount & Payment Mode */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="amount">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">
                ₹
              </span>
              <input
                id="amount"
                name="amount"
                type="number"
                className="form-input pl-9"
                value={form.amount}
                onChange={handleChange}
                placeholder="0"
                min="1"
                step="any"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="paymentMode">
              Payment Mode
            </label>
            <select
              id="paymentMode"
              name="paymentMode"
              className="form-input cursor-pointer"
              value={form.paymentMode}
              onChange={handleChange}
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
        </div>

        {/* Row 4: Customer Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="customerName">
              Customer / Party Name
            </label>
            <input
              id="customerName"
              name="customerName"
              type="text"
              className="form-input"
              value={form.customerName}
              onChange={handleChange}
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="customerMobile">
              Mobile Number
            </label>
            <input
              id="customerMobile"
              name="customerMobile"
              type="tel"
              className="form-input"
              value={form.customerMobile}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
            />
          </div>
        </div>

        {/* Row 5: Department */}
        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="department">
            Department Center
          </label>
          <select
            id="department"
            name="department"
            className="form-input cursor-pointer"
            value={form.department}
            onChange={handleChange}
          >
            {DEPARTMENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Row 6: Narration */}
        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="narration">
            Narration / Reference Notes
          </label>
          <textarea
            id="narration"
            name="narration"
            rows={3}
            className="form-input resize-y"
            value={form.narration}
            onChange={handleChange}
            placeholder="Add invoice reference, remarks, or reconciliation notes..."
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-8">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 hover:bg-slate-100 shadow-sm transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          className={`rounded-xl px-6 py-2.5 text-base font-bold text-white shadow-sm transition-all ${
            isIncome
              ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
              : "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
          }`}
        >
          {isEdit ? "Update Entry" : isIncome ? "Save Income" : "Save Expense"}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
