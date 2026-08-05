import { useState } from "react";
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
    amount: initialData.amount ?? "",
    paymentMode: initialData.paymentMode || "UPI",
    department:
      initialData.department || (type === "Income" ? "Room" : "Other"),
  });

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
      amount: amountNumber,
      paymentMode: form.paymentMode,
      department: form.department,
      sourceModule: "accounts-manual",
    });
  };

  const title = type === "Expense" ? "Add expense record" : "Add income record";
  const suggestions = DESCRIPTION_SUGGESTIONS[type] || [];
  const isIncome = type === "Income";

  return (
    <form className="accounts-form" onSubmit={handleSubmit}>
      <div className="accounts-form__header">
        <div className="accounts-form__header-copy">
          <div className="accounts-form__eyebrow">{type} Entry</div>
          <h3 className="accounts-form__title">{title}</h3>
          <p className="accounts-form__subtitle">
     The description, amount, and payment mode will be saved directly in the accounts ledger.
          </p>
        </div>
        <span className={`accounts-form__badge ${isIncome ? "accounts-form__badge--income" : "accounts-form__badge--expense"}`}>
          {type}
        </span>
      </div>

      <div className="accounts-form__panel">
        <div className="accounts-form__row">
          <div className="accounts-form__field">
            <label className="accounts-form__label">Type</label>
            <input className="accounts-form__input accounts-form__input--readonly" value={type} disabled />
          </div>

          <div className="accounts-form__field">
            <label className="accounts-form__label" htmlFor="date">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              className="accounts-form__input"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="accounts-form__field">
          <label className="accounts-form__label" htmlFor="description">
            Description
          </label>
          <div className="accounts-form__chips">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={`accounts-form__chip${
                  form.description === suggestion ? " accounts-form__chip--active" : ""
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
            className="accounts-form__input"
            value={form.description}
            onChange={handleChange}
            placeholder="e.g. Kitchen order, vendor payment, room booking"
            list={`transaction-description-${type.toLowerCase()}`}
            required
          />
          <datalist id={`transaction-description-${type.toLowerCase()}`}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>

        <div className="accounts-form__row">
          <div className="accounts-form__field">
            <label className="accounts-form__label" htmlFor="amount">
              Amount (Rs.)
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              className="accounts-form__input"
              value={form.amount}
              onChange={handleChange}
              placeholder="5000"
              min="1"
              required
            />
          </div>

          <div className="accounts-form__field">
            <label className="accounts-form__label" htmlFor="paymentMode">
              Payment Mode
            </label>
            <select
              id="paymentMode"
              name="paymentMode"
              className="accounts-form__input"
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

        <div className="accounts-form__field">
          <label className="accounts-form__label" htmlFor="department">
            Department
          </label>
          <select
            id="department"
            name="department"
            className="accounts-form__input"
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
      </div>

      <div className="accounts-form__actions">
        <button
          type="button"
          className="accounts-btn accounts-btn--ghost"
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="accounts-btn accounts-btn--primary"
        >
          Save Entry
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
