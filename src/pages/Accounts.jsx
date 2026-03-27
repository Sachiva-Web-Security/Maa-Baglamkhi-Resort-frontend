import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChartLine, FaMoneyBillWave, FaPlus, FaReceipt } from "react-icons/fa";

import InvoiceForm from "../components/Accounts/forms/InvoiceForm";
import TransactionForm from "../components/Accounts/forms/TransactionForm";
import API from "../api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-200";

const moduleColumns = {
  bankLedger: [
    { key: "entry_date", label: "Date" },
    { key: "bank_name", label: "Bank" },
    { key: "reconciliation_status", label: "Status" },
    { key: "credit", label: "Credit" },
    { key: "debit", label: "Debit" },
  ],
  pettyCash: [
    { key: "entry_date", label: "Date" },
    { key: "entry_type", label: "Type" },
    { key: "category", label: "Category" },
    { key: "amount", label: "Amount" },
  ],
  gstReturns: [
    { key: "filing_period", label: "Period" },
    { key: "return_type", label: "Return" },
    { key: "status", label: "Status" },
    { key: "net_payable", label: "Net Payable" },
  ],
  vendorPayments: [
    { key: "vendor_name", label: "Vendor" },
    { key: "payment_date", label: "Date" },
    { key: "status", label: "Status" },
    { key: "amount", label: "Amount" },
  ],
  purchaseOrders: [
    { key: "po_number", label: "PO No" },
    { key: "vendor_name", label: "Vendor" },
    { key: "status", label: "Status" },
    { key: "total_amount", label: "Amount" },
  ],
  payroll: [
    { key: "staff_name", label: "Staff" },
    { key: "payroll_month", label: "Month" },
    { key: "status", label: "Status" },
    { key: "net_salary", label: "Net Salary" },
  ],
  profitCenters: [
    { key: "center_name", label: "Center" },
    { key: "entry_date", label: "Date" },
    { key: "income_amount", label: "Income" },
    { key: "expense_amount", label: "Expense" },
  ],
};

const renderModuleValue = (value, key) => {
  if (key.includes("amount") || key === "credit" || key === "debit" || key === "net_payable" || key === "net_salary") {
    return formatINR(value);
  }
  return value || "-";
};

const AccountsModuleCard = ({ title, subtitle, fields, onSubmit, rows, columns, submitLabel }) => {
  const initialState = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? "";
    return acc;
  }, {});
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const success = await onSubmit(form);
    if (success) setForm(initialState);
    setSaving(false);
  };

  return (
    <div className="rounded-[24px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">{title}</div>
        <div className="mt-2 text-sm text-slate-500">{subtitle}</div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {field.label}
            </span>
            {field.type === "select" ? (
              <select
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                className={fieldClass}
                required={field.required}
              >
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                rows={3}
                className={fieldClass}
                required={field.required}
              />
            ) : (
              <input
                type={field.type || "text"}
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                className={fieldClass}
                required={field.required}
              />
            )}
          </label>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
      </form>

      <div className="mt-5 overflow-x-auto rounded-[18px] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-3">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).slice(0, 4).map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-3 text-slate-700">
                    {renderModuleValue(row[column.key], column.key)}
                  </td>
                ))}
              </tr>
            ))}
            {!rows?.length ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">
                  No records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Accounts = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [totals, setTotals] = useState({
    income: 0,
    expense: 0,
    net: 0,
    gstPayable: 0,
  });
  const [extendedSummary, setExtendedSummary] = useState({
    pendingBankReconciliation: 0,
    pettyCashBalance: 0,
    gstPendingPayable: 0,
    vendorOutstanding: 0,
    openPurchaseOrders: 0,
    payrollTotal: 0,
    profitCenters: [],
  });
  const [bankLedger, setBankLedger] = useState([]);
  const [pettyCashEntries, setPettyCashEntries] = useState([]);
  const [gstReturns, setGstReturns] = useState([]);
  const [vendorPayments, setVendorPayments] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [profitCenters, setProfitCenters] = useState([]);

  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const refreshTimerRef = useRef(null);

  const fetchRecords = async () => {
    try {
      const res = await API.get("/accounts/transactions");
      setRecords(res.data || []);
    } catch (err) {
      console.error("Error loading accounts records", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get("/accounts/summary");
      setTotals({
        income: Number(res.data?.income) || 0,
        expense: Number(res.data?.expense) || 0,
        net: Number(res.data?.net) || 0,
        gstPayable: Number(res.data?.gstPayable) || 0,
      });
    } catch (err) {
      console.error("Error loading accounts summary", err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await API.get("/invoices/all");
      setCustomerInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading invoices", err);
      setCustomerInvoices([]);
    }
  };

  const loadExpandedAccounts = async () => {
    try {
      const [
        extendedSummaryRes,
        bankLedgerRes,
        pettyCashRes,
        gstReturnsRes,
        vendorPaymentsRes,
        purchaseOrdersRes,
        payrollRes,
        profitCentersRes,
      ] = await Promise.all([
        API.get("/accounts/extended-summary"),
        API.get("/accounts/bank-ledger"),
        API.get("/accounts/petty-cash"),
        API.get("/accounts/gst-returns"),
        API.get("/accounts/vendor-payments"),
        API.get("/accounts/purchase-orders"),
        API.get("/accounts/payroll"),
        API.get("/accounts/profit-centers"),
      ]);

      setExtendedSummary(extendedSummaryRes.data || {});
      setBankLedger(bankLedgerRes.data || []);
      setPettyCashEntries(pettyCashRes.data || []);
      setGstReturns(gstReturnsRes.data || []);
      setVendorPayments(vendorPaymentsRes.data || []);
      setPurchaseOrders(purchaseOrdersRes.data || []);
      setPayrollRecords(payrollRes.data || []);
      setProfitCenters(profitCentersRes.data || []);
    } catch (err) {
      console.error("Error loading expanded accounts data", err);
    }
  };

  const refreshAccountsData = async () => {
    await Promise.all([
      fetchRecords(),
      fetchSummary(),
      loadExpandedAccounts(),
      fetchInvoices(),
    ]);
  };

  useEffect(() => {
    let active = true;

    const runRefresh = async () => {
      if (!active) return;
      await refreshAccountsData();
    };

    runRefresh();

    const handleAccountsUpdated = () => {
      runRefresh();
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        runRefresh();
      }
    };

    refreshTimerRef.current = window.setInterval(() => {
      runRefresh();
    }, 30000);

    window.addEventListener("accountsUpdated", handleAccountsUpdated);
    window.addEventListener("focus", handleAccountsUpdated);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    return () => {
      active = false;
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
      window.removeEventListener("accountsUpdated", handleAccountsUpdated);
      window.removeEventListener("focus", handleAccountsUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, []);

  const createModuleEntry = async (endpoint, payload) => {
    try {
      await API.post(endpoint, payload);
      await refreshAccountsData();
      return true;
    } catch (error) {
      console.error(`Error saving ${endpoint}`, error);
      window.alert("Entry save nahi ho payi.");
      return false;
    }
  };

  const handleAddIncome = async (data) => {
    try {
      await API.post("/accounts/income", data);
      await refreshAccountsData();
      setShowIncome(false);
    } catch {
      window.alert("Error adding income");
    }
  };

  const handleAddExpense = async (data) => {
    try {
      await API.post("/accounts/expense", data);
      await refreshAccountsData();
      setShowExpense(false);
    } catch {
      window.alert("Error adding expense");
    }
  };

  const handleGenerateInvoice = async (invoice) => {
    try {
      await API.post("/invoices/create", invoice);
      await refreshAccountsData();
      setShowInvoice(false);
    } catch {
      window.alert("Error generating invoice");
    }
  };

  const handleInvoiceStatusChange = async (invoiceId, paymentStatus) => {
    try {
      await API.patch(`/invoices/payment-status/${invoiceId}`, { paymentStatus });
      await fetchInvoices();
    } catch (error) {
      console.error("Failed to update invoice payment status", error);
      window.alert("Invoice status update nahi ho paya.");
    }
  };

  const handleCreateBankLedger = (form) =>
    createModuleEntry("/accounts/bank-ledger", form);

  const handleCreatePettyCash = (form) =>
    createModuleEntry("/accounts/petty-cash", form);

  const handleCreateGstReturn = (form) =>
    createModuleEntry("/accounts/gst-returns", {
      ...form,
      netPayable: Number(form.gstCollected || 0) - Number(form.gstPaid || 0),
      filedOn: form.status === "Filed" ? form.filedOn || new Date().toISOString().slice(0, 10) : null,
    });

  const handleCreateVendorPayment = (form) =>
    createModuleEntry("/accounts/vendor-payments", form);

  const handleCreatePurchaseOrder = (form) =>
    createModuleEntry("/accounts/purchase-orders", form);

  const handleCreatePayrollRecord = (form) =>
    createModuleEntry("/accounts/payroll", {
      ...form,
      netSalary:
        Number(form.baseSalary || 0) +
        Number(form.allowance || 0) -
        Number(form.deduction || 0),
    });

  const handleCreateProfitCenter = (form) =>
    createModuleEntry("/accounts/profit-centers", form);

  const accountsModuleConfigs = [
    {
      key: "bank-ledger",
      title: "Bank Reconciliation",
      subtitle: "Daily bank ledger aur reconciliation status ko track karein.",
      fields: [
        { name: "entryDate", label: "Entry Date", type: "date", required: true },
        { name: "bankName", label: "Bank Name", required: true },
        { name: "referenceNo", label: "Reference No" },
        { name: "description", label: "Description", required: true },
        { name: "debit", label: "Debit", type: "number", defaultValue: 0 },
        { name: "credit", label: "Credit", type: "number", defaultValue: 0 },
        {
          name: "reconciliationStatus",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "Pending",
          options: ["Pending", "Reconciled", "Mismatch"],
        },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      onSubmit: handleCreateBankLedger,
      rows: bankLedger,
      columns: moduleColumns.bankLedger,
      submitLabel: "Add Bank Entry",
    },
    {
      key: "petty-cash",
      title: "Petty Cash",
      subtitle: "Small daily cash movements aur approvals ko maintain karein.",
      fields: [
        { name: "entryDate", label: "Entry Date", type: "date", required: true },
        {
          name: "entryType",
          label: "Entry Type",
          type: "select",
          required: true,
          defaultValue: "Out",
          options: ["In", "Out"],
        },
        { name: "category", label: "Category", required: true },
        { name: "description", label: "Description", required: true },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "approvedBy", label: "Approved By" },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      onSubmit: handleCreatePettyCash,
      rows: pettyCashEntries,
      columns: moduleColumns.pettyCash,
      submitLabel: "Add Petty Cash",
    },
    {
      key: "gst-returns",
      title: "GST Return Tracker",
      subtitle: "Return filing, collected GST aur payable amount ko sync me rakhein.",
      fields: [
        { name: "filingPeriod", label: "Filing Period", placeholder: "Mar-2026", required: true },
        {
          name: "returnType",
          label: "Return Type",
          type: "select",
          required: true,
          defaultValue: "GSTR-3B",
          options: ["GSTR-1", "GSTR-3B", "GSTR-9"],
        },
        { name: "taxableAmount", label: "Taxable Amount", type: "number", required: true },
        { name: "gstCollected", label: "GST Collected", type: "number", required: true },
        { name: "gstPaid", label: "GST Paid/Input", type: "number", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "Draft",
          options: ["Draft", "Ready", "Filed"],
        },
        { name: "filedOn", label: "Filed On", type: "date" },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      onSubmit: handleCreateGstReturn,
      rows: gstReturns,
      columns: moduleColumns.gstReturns,
      submitLabel: "Save GST Record",
    },
    {
      key: "vendor-payments",
      title: "Vendor Payments",
      subtitle: "Supplier invoices, scheduled payouts aur payment mode tracking.",
      fields: [
        { name: "vendorName", label: "Vendor Name", required: true },
        { name: "invoiceRef", label: "Invoice Ref" },
        { name: "paymentDate", label: "Payment Date", type: "date", required: true },
        { name: "amount", label: "Amount", type: "number", required: true },
        {
          name: "paymentMode",
          label: "Payment Mode",
          type: "select",
          required: true,
          defaultValue: "Bank Transfer",
          options: ["Bank Transfer", "Cash", "UPI", "Cheque"],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "Scheduled",
          options: ["Scheduled", "Partially Paid", "Paid"],
        },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      onSubmit: handleCreateVendorPayment,
      rows: vendorPayments,
      columns: moduleColumns.vendorPayments,
      submitLabel: "Add Vendor Payment",
    },
    {
      key: "purchase-orders",
      title: "Purchase Orders",
      subtitle: "Procurement approvals aur open PO pipeline ko manage karein.",
      fields: [
        { name: "poNumber", label: "PO Number", required: true },
        { name: "vendorName", label: "Vendor Name", required: true },
        { name: "orderDate", label: "Order Date", type: "date", required: true },
        { name: "expectedDate", label: "Expected Date", type: "date" },
        { name: "totalAmount", label: "Total Amount", type: "number", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "Draft",
          options: ["Draft", "Approved", "Ordered", "Closed", "Cancelled"],
        },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      onSubmit: handleCreatePurchaseOrder,
      rows: purchaseOrders,
      columns: moduleColumns.purchaseOrders,
      submitLabel: "Create PO",
    },
    {
      key: "payroll",
      title: "Payroll Tracker",
      subtitle: "Attendance-linked salary sheet ka ready register maintain karein.",
      fields: [
        { name: "staffName", label: "Staff Name", required: true },
        { name: "payrollMonth", label: "Payroll Month", placeholder: "Mar-2026", required: true },
        { name: "attendanceDays", label: "Attendance Days", type: "number", required: true },
        { name: "baseSalary", label: "Base Salary", type: "number", required: true },
        { name: "allowance", label: "Allowance", type: "number", defaultValue: 0 },
        { name: "deduction", label: "Deduction", type: "number", defaultValue: 0 },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "Draft",
          options: ["Draft", "Processed", "Paid"],
        },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      onSubmit: handleCreatePayrollRecord,
      rows: payrollRecords,
      columns: moduleColumns.payroll,
      submitLabel: "Add Payroll",
    },
    {
      key: "profit-centers",
      title: "Profit Center Split",
      subtitle: "Hotel, restaurant aur banquet wise income-expense breakdown.",
      fields: [
        {
          name: "centerName",
          label: "Center Name",
          type: "select",
          required: true,
          defaultValue: "Hotel",
          options: ["Hotel", "Restaurant", "Banquet", "Spa", "Other"],
        },
        { name: "entryDate", label: "Entry Date", type: "date", required: true },
        { name: "incomeAmount", label: "Income Amount", type: "number", defaultValue: 0 },
        { name: "expenseAmount", label: "Expense Amount", type: "number", defaultValue: 0 },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      onSubmit: handleCreateProfitCenter,
      rows: profitCenters,
      columns: moduleColumns.profitCenters,
      submitLabel: "Add Profit Entry",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
      </div>

      <div className="mx-auto max-w-[1260px] space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 text-white shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Finance Center
              </p>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                Accounts workspace in dashboard style
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Income, expense, invoice aur transaction records ko ek attractive
                responsive finance panel se manage karein.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)]"
                  onClick={() => setShowIncome(true)}
                >
                  <FaPlus className="text-cyan-600" />
                  Add Income
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md"
                  onClick={() => setShowExpense(true)}
                >
                  <FaMoneyBillWave />
                  Add Expense
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md"
                  onClick={() => setShowInvoice(true)}
                >
                  <FaReceipt />
                  Invoice
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {[
                { label: "Net Position", value: formatINR(totals.net) },
                { label: "GST Payable", value: formatINR(totals.gstPayable) },
              ].map((item) => (
                <div key={item.label} className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-md">
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Income", value: formatINR(totals.income), icon: FaMoneyBillWave, tone: "emerald" },
            { label: "Total Expense", value: formatINR(totals.expense), icon: FaReceipt, tone: "rose" },
            { label: "Net Profit", value: formatINR(totals.net), icon: FaChartLine, tone: "sky" },
            { label: "GST Payable", value: formatINR(totals.gstPayable), icon: FaReceipt, tone: "amber" },
          ].map((card) => {
            const Icon = card.icon;
            const toneClass =
              card.tone === "emerald"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : card.tone === "rose"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : card.tone === "amber"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-sky-50 text-sky-700 border-sky-200";
            return (
              <div key={card.label} className="rounded-[24px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                    <div className="mt-3 text-3xl font-black text-slate-900">{card.value}</div>
                  </div>
                  <span className={`rounded-2xl border p-3 ${toneClass}`}>
                    <Icon />
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-[26px] border border-white/60 bg-white/82 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Description</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Payment Mode</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200/80 hover:bg-slate-50/80">
                    <td className="px-5 py-4 text-sm text-slate-600">{r.date}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${r.type === "Income" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{r.description}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">{formatINR(r.amount)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{r.paymentMode}</td>
                    <td className="px-5 py-4">
                      <button
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                        onClick={() => {
                          setSelectedRecord(r);
                          setShowView(true);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Customer Invoices
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Hotel + restaurant billing records</h2>
              <p className="mt-2 text-sm text-slate-500">
                Reception se generate hui invoices yahan save hoti hain. Accounts yahin se payment status track kar sakta hai.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
              {customerInvoices.length} invoices
            </div>
          </div>

          <div className="overflow-x-auto rounded-[22px] border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customerInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-slate-200">
                    <td className="px-4 py-4 font-semibold text-slate-900">{invoice.invoice_no || invoice.invoiceNo}</td>
                    <td className="px-4 py-4 text-slate-700">{invoice.customer_name || invoice.customerName}</td>
                    <td className="px-4 py-4 text-slate-700">{invoice.room_no || invoice.roomNumber || "--"}</td>
                    <td className="px-4 py-4 text-slate-700">{invoice.date || "--"}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">
                      {formatINR(invoice.totalAmount ?? invoice.total_amount ?? invoice.final_total)}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={invoice.paymentStatus || invoice.payment_status || invoice.status || "Pending"}
                        onChange={(event) => handleInvoiceStatusChange(invoice.id, event.target.value)}
                        className={fieldClass}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/invoice/${invoice.booking_id || invoice.customer_id}`)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                      >
                        Open Invoice
                      </button>
                    </td>
                  </tr>
                ))}
                {!customerInvoices.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Abhi tak koi customer invoice generate nahi hui.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Pending Reconciliation",
              value: extendedSummary.pendingBankReconciliation,
              tone: "text-cyan-700",
            },
            {
              label: "Petty Cash Balance",
              value: formatINR(extendedSummary.pettyCashBalance),
              tone: "text-emerald-700",
            },
            {
              label: "GST Pending",
              value: formatINR(extendedSummary.gstPendingPayable),
              tone: "text-amber-700",
            },
            {
              label: "Vendor Outstanding",
              value: formatINR(extendedSummary.vendorOutstanding),
              tone: "text-rose-700",
            },
            {
              label: "Open POs",
              value: extendedSummary.openPurchaseOrders,
              tone: "text-indigo-700",
            },
            {
              label: "Payroll Total",
              value: formatINR(extendedSummary.payrollTotal),
              tone: "text-fuchsia-700",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-[24px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
              <div className={`mt-3 text-2xl font-black ${item.tone}`}>{item.value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Full Accounts Flow
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Extended accounts controls</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Existing transaction aur invoice workflow ke saath bank, petty cash, GST, vendor,
                purchase, payroll aur profit-center entries bhi isi module se manage ho rahi hain.
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Profit Center Net
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {(extendedSummary.profitCenters || []).length ? (
                  extendedSummary.profitCenters.map((center) => (
                    <div key={center.centerName} className="flex items-center justify-between gap-4">
                      <span>{center.centerName}</span>
                      <span className="font-bold text-slate-900">{formatINR(center.net)}</span>
                    </div>
                  ))
                ) : (
                  <div>No profit center breakdown yet.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          {accountsModuleConfigs.map((module) => (
            <AccountsModuleCard
              key={module.key}
              title={module.title}
              subtitle={module.subtitle}
              fields={module.fields}
              onSubmit={module.onSubmit}
              rows={module.rows}
              columns={module.columns}
              submitLabel={module.submitLabel}
            />
          ))}
        </section>

        {showIncome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
              <TransactionForm type="Income" onSubmit={handleAddIncome} onCancel={() => setShowIncome(false)} />
            </div>
          </div>
        )}

        {showExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
              <TransactionForm type="Expense" onSubmit={handleAddExpense} onCancel={() => setShowExpense(false)} />
            </div>
          </div>
        )}

        {showInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl overflow-auto rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)] max-h-[90vh]">
              <InvoiceForm onSuccess={handleGenerateInvoice} onCancel={() => setShowInvoice(false)} />
            </div>
          </div>
        )}

        {showView && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
              <h3 className="text-2xl font-black text-slate-900">Record Details</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Date: {selectedRecord.date}</p>
                <p>Type: {selectedRecord.type}</p>
                <p>Description: {selectedRecord.description}</p>
                <p>Amount: {formatINR(selectedRecord.amount)}</p>
                <p>Payment Mode: {selectedRecord.paymentMode}</p>
              </div>
              <button
                onClick={() => setShowView(false)}
                className="mt-5 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Accounts;
