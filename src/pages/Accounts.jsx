import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaChartLine,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaPlus,
  FaReceipt,
  FaThLarge,
} from "react-icons/fa";

import PaymentSettingsManager from "../components/Accounts/PaymentSettingsManager";
import InvoiceForm from "../components/Accounts/forms/InvoiceForm";
import TransactionForm from "../components/Accounts/forms/TransactionForm";
import API from "../api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const toNumber = (value) => Number(value || 0);
const TRANSACTION_PAGE_SIZE = 10;
const BILLING_PAGE_SIZE = 10;
const ACCOUNTS_MODULE_PAGE_SIZE = 10;

const SummaryRow = ({ label, value, tone }) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      {label}
    </span>
    <span className={`text-lg font-black ${tone || "text-slate-900"}`}>{value}</span>
  </div>
);

const getInvoiceRoomValue = (invoice) =>
  String(invoice.room_no || invoice.roomNo || invoice.roomNumber || "").trim();

const getHotelBookingRoomValue = (booking) =>
  String(booking.rooms || booking.room_no || booking.roomNo || "").trim();

const normalizePaymentMode = (value) => {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();

  if (!text) return "Unknown";
  if (lower.includes("cash")) return "Cash";
  if (lower.includes("upi")) return "UPI";
  if (lower.includes("card")) return "Card";
  if (lower.includes("bank")) return "Bank Transfer";
  if (lower.includes("cheque")) return "Cheque";
  if (lower.includes("pending")) return "Pending";
  return text;
};

const normalizeReconciliationStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getInvoicePaymentMode = (invoice) =>
  normalizePaymentMode(
    invoice.paymentMode ||
      invoice.payment_mode ||
      invoice.paymentMethod ||
      invoice.payment_method ||
      "",
  );

const getHotelBookingPaymentMode = (booking) =>
  normalizePaymentMode(booking.paymentMode || booking.payment_mode || "");

const getHotelBookingPaymentStatus = (booking) => {
  const remaining = toNumber(booking.remainingAmount || booking.balanceAmount);
  const paid = toNumber(booking.netPaid || booking.paidAmount);

  if (remaining <= 0 && paid > 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
};

const getHotelBookingReference = (booking) =>
  String(booking.bookingCode || booking.booking_code || booking.bookingId || booking.id || "").trim();

const getRestaurantBillTableValue = (bill) =>
  String(bill.tableNumber || bill.table_number || bill.table || bill.locationLabel || "").trim();

const getRestaurantBillPaymentMode = (bill) =>
  normalizePaymentMode(
    bill.paymentMethod || bill.payment_method || bill.paymentMode || bill.payment_mode || "",
  );

const getRestaurantBillStatus = (bill) =>
  String(bill.invoiceStatus || bill.invoice_status || bill.status || "Generated").trim();

const getBanquetHallValue = (booking) =>
  String(booking.hallName || booking.hall_name || booking.hall || "").trim();

const getBanquetPaymentMode = (booking) =>
  normalizePaymentMode(
    booking.paymentMode || booking.payment_mode || booking.paymentMethod || booking.payment_method || "",
  );

const getBanquetPaymentStatus = (booking) =>
  String(booking.paymentStatus || booking.payment_status || booking.status || "Pending").trim();

const getBanquetReference = (booking) =>
  String(booking.invoiceNo || booking.invoice_no || "").trim();

const splitInvoiceAmounts = (invoice) => {
  const roomBase = toNumber(invoice.price_per_day) + toNumber(invoice.extra_charge);
  const restaurantBase = toNumber(invoice.food_charge);
  const finalTotal = toNumber(
    invoice.totalAmount ?? invoice.total_amount ?? invoice.final_total ?? invoice.subtotal,
  );
  const baseTotal = roomBase + restaurantBase;

  if (baseTotal <= 0) {
    return {
      roomAmount: 0,
      restaurantAmount: 0,
      finalAmount: finalTotal,
    };
  }

  if (restaurantBase <= 0) {
    return {
      roomAmount: finalTotal || roomBase,
      restaurantAmount: 0,
      finalAmount: finalTotal || roomBase,
    };
  }

  if (roomBase <= 0) {
    return {
      roomAmount: 0,
      restaurantAmount: finalTotal || restaurantBase,
      finalAmount: finalTotal || restaurantBase,
    };
  }

  return {
    roomAmount: Number((((finalTotal || baseTotal) * roomBase) / baseTotal).toFixed(2)),
    restaurantAmount: Number((((finalTotal || baseTotal) * restaurantBase) / baseTotal).toFixed(2)),
    finalAmount: finalTotal || baseTotal,
  };
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-cyan-200";

const moduleColumns = {
  bankLedger: [
    { key: "entry_date", label: "Date" },
    { key: "bank_name", label: "Bank" },
    { key: "payment_mode", label: "Payment Mode" },
    { key: "reconciliation_status", label: "Status" },
    { key: "match_status", label: "Match" },
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

const formatInputDate = (value) => {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
};

const AccountsModuleCard = ({
  title,
  subtitle,
  fields,
  onSubmit,
  onUpdate,
  onDelete,
  rows,
  columns,
  submitLabel,
  editLabel,
  toFormState,
  filterNote,
  onClearFilter,
}) => {
  const initialState = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? "";
    return acc;
  }, {});
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((rows || []).length / ACCOUNTS_MODULE_PAGE_SIZE));
  const paginatedRows = (rows || []).slice(
    (page - 1) * ACCOUNTS_MODULE_PAGE_SIZE,
    page * ACCOUNTS_MODULE_PAGE_SIZE,
  );

  useEffect(() => {
    if (!editingId) {
      setForm(initialState);
    }
  }, [editingId]);

  useEffect(() => {
    setPage(1);
  }, [rows, filterNote]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const success = editingId ? await onUpdate(editingId, form) : await onSubmit(form);
    if (success) {
      setForm(initialState);
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setForm(toFormState(row));
  };

  const handleDeleteClick = async (row) => {
    const confirmed = window.confirm(`Delete this ${title.toLowerCase()} record?`);
    if (!confirmed) return;

    await onDelete(row.id);

    if (editingId === row.id) {
      setEditingId(null);
      setForm(initialState);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div>
          <div className="text-base font-bold uppercase tracking-[0.18em] text-cyan-700">{title}</div>
          <div className="mt-2 text-lg font-medium leading-7 text-slate-500">{subtitle}</div>
        </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const isWideField =
            field.type === "textarea" || field.name === "description" || field.name === "notes";

          return (
          <label key={field.name} className={isWideField ? "block md:col-span-2" : "block"}>
            <span className="mb-2 block text-base font-bold uppercase tracking-[0.14em] text-slate-500">
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
          );
        })}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 px-5 py-3 text-lg font-bold text-white disabled:opacity-60 md:col-span-2"
        >
          {saving ? "Saving..." : editingId ? editLabel || "Update Entry" : submitLabel}
        </button>
        {editingId ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(initialState);
            }}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-lg font-bold text-slate-700 md:col-span-2"
          >
            Cancel Edit
          </button>
        ) : null}
      </form>

      {filterNote ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-lg font-medium text-amber-800">
          <span>{filterNote}</span>
          {onClearFilter ? (
            <button
              type="button"
              onClick={onClearFilter}
              className="rounded-full border border-amber-300 bg-white px-4 py-2 text-base font-bold text-amber-700"
            >
              Show All
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-[18px] border border-slate-200">
        <table className="min-w-full text-left text-lg">
          <thead className="bg-slate-50 text-lg font-bold uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-4">{column.label}</th>
              ))}
              <th className="px-3 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-4 text-lg font-semibold text-slate-700">
                    {renderModuleValue(row[column.key], column.key)}
                  </td>
                ))}
                <td className="px-3 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-2.5 text-lg font-bold text-cyan-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(row)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-5 py-2.5 text-lg font-bold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows?.length ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-xl font-medium text-slate-500">
                  No records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {(rows || []).length > ACCOUNTS_MODULE_PAGE_SIZE ? (
        <div className="mt-4 flex flex-col gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-lg font-medium text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {(page - 1) * ACCOUNTS_MODULE_PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(page * ACCOUNTS_MODULE_PAGE_SIZE, (rows || []).length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">{(rows || []).length}</span>{" "}
            records
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-lg font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              const isActive = pageNumber === page;

              return (
                <button
                  key={`${title}-page-${pageNumber}`}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`h-11 min-w-[44px] rounded-full border px-3 text-lg font-bold transition ${
                    isActive
                      ? "border-cyan-600 bg-cyan-600 text-white shadow-[0_10px_24px_rgba(8,145,178,0.18)]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-lg font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Accounts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeAccountsModule, setActiveAccountsModule] = useState("petty-cash");
  const [records, setRecords] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [hotelBookings, setHotelBookings] = useState([]);
  const [restaurantBills, setRestaurantBills] = useState([]);
  const [banquetBookings, setBanquetBookings] = useState([]);
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
  const [reconciliationSummary, setReconciliationSummary] = useState({
    totalBankIn: 0,
    totalBankOut: 0,
    matchedAmount: 0,
    unmatchedAmount: 0,
    partialAmount: 0,
    reconciledAmount: 0,
    totalItems: 0,
    unmatchedItems: 0,
    partialItems: 0,
    matchedItems: 0,
  });
  const [reconciliationItems, setReconciliationItems] = useState([]);
  const [pettyCashEntries, setPettyCashEntries] = useState([]);
  const [gstReturns, setGstReturns] = useState([]);
  const [vendorPayments, setVendorPayments] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [profitCenters, setProfitCenters] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState([]);

  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedBillingSource, setSelectedBillingSource] = useState("all");
  const [selectedInvoiceRoom, setSelectedInvoiceRoom] = useState("all");
  const [selectedRestaurantTable, setSelectedRestaurantTable] = useState("all");
  const [selectedBanquetHall, setSelectedBanquetHall] = useState("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const [transactionPage, setTransactionPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);
  const [bankLedgerStatusFilter, setBankLedgerStatusFilter] = useState("all");
  const [selectedReconciliationSource, setSelectedReconciliationSource] = useState("all");
  const [selectedReconciliationMatch, setSelectedReconciliationMatch] = useState("all");

  const refreshTimerRef = useRef(null);
  const refreshInFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const accountsModuleSectionRef = useRef(null);
  const isAccountsModulesPage = new URLSearchParams(location.search).get("view") === "modules";

  const isAbortedRequest = (error) =>
    error?.code === "ERR_CANCELED" ||
    error?.message === "canceled" ||
    error?.message === "Request aborted" ||
    error?.name === "CanceledError";

  const fetchRecords = async () => {
    try {
      const res = await API.get("/accounts/transactions");
      setRecords(res.data || []);
    } catch (err) {
      if (isAbortedRequest(err)) return;
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
      if (isAbortedRequest(err)) return;
      console.error("Error loading accounts summary", err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await API.get("/invoices/all");
      setCustomerInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (isAbortedRequest(err)) return;
      console.error("Error loading invoices", err);
      setCustomerInvoices([]);
    }
  };

  const fetchHotelBookings = async () => {
    try {
      const res = await API.get("/accounts/hotel-billing");
      setHotelBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (isAbortedRequest(err)) return;
      console.error("Error loading hotel billing records", err);
      setHotelBookings([]);
    }
  };

  const fetchRestaurantBills = async () => {
    try {
      const res = await API.get("/accounts/restaurant-billing");
      setRestaurantBills(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (isAbortedRequest(err)) return;
      console.error("Error loading restaurant bills", err);
      setRestaurantBills([]);
    }
  };

  const fetchBanquetBookings = async () => {
    try {
      const res = await API.get("/banquet");
      setBanquetBookings(Array.isArray(res.data?.bookings) ? res.data.bookings : []);
    } catch (err) {
      if (isAbortedRequest(err)) return;
      console.error("Error loading banquet bookings", err);
      setBanquetBookings([]);
    }
  };

  const fetchReconciliationData = async () => {
    try {
      const params = {
        paymentMode: selectedPaymentMode,
        sourceType: selectedReconciliationSource,
        matchStatus: selectedReconciliationMatch,
      };

      const [summaryRes, itemsRes] = await Promise.all([
        API.get("/accounts/reconciliation/summary", { params }),
        API.get("/accounts/reconciliation/items", { params }),
      ]);

      setReconciliationSummary(summaryRes.data || {});
      setReconciliationItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
    } catch (err) {
      if (isAbortedRequest(err)) return;
      console.error("Error loading reconciliation data", err);
      setReconciliationSummary({
        totalBankIn: 0,
        totalBankOut: 0,
        matchedAmount: 0,
        unmatchedAmount: 0,
        partialAmount: 0,
        reconciledAmount: 0,
        totalItems: 0,
        unmatchedItems: 0,
        partialItems: 0,
        matchedItems: 0,
      });
      setReconciliationItems([]);
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
        paymentSettingsRes,
      ] = await Promise.all([
        API.get("/accounts/extended-summary"),
        API.get("/accounts/bank-ledger"),
        API.get("/accounts/petty-cash"),
        API.get("/accounts/gst-returns"),
        API.get("/accounts/vendor-payments"),
        API.get("/accounts/purchase-orders"),
        API.get("/accounts/payroll"),
        API.get("/accounts/profit-centers"),
        API.get("/accounts/payment-settings"),
      ]);

      setExtendedSummary(extendedSummaryRes.data || {});
      setBankLedger(bankLedgerRes.data || []);
      setPettyCashEntries(pettyCashRes.data || []);
      setGstReturns(gstReturnsRes.data || []);
      setVendorPayments(vendorPaymentsRes.data || []);
      setPurchaseOrders(purchaseOrdersRes.data || []);
      setPayrollRecords(payrollRes.data || []);
      setProfitCenters(profitCentersRes.data || []);
      setPaymentSettings(paymentSettingsRes.data || []);
    } catch (err) {
      if (isAbortedRequest(err)) return;
      console.error("Error loading expanded accounts data", err);
    }
  };

  const refreshAccountsData = async () => {
    if (refreshInFlightRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;

    try {
      do {
        pendingRefreshRef.current = false;

        await Promise.all([
          fetchRecords(),
          fetchSummary(),
          loadExpandedAccounts(),
          fetchInvoices(),
          fetchHotelBookings(),
          fetchRestaurantBills(),
          fetchBanquetBookings(),
          fetchReconciliationData(),
        ]);
      } while (pendingRefreshRef.current);
    } finally {
      refreshInFlightRef.current = false;
    }
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

  useEffect(() => {
    fetchReconciliationData();
  }, [selectedPaymentMode, selectedReconciliationSource, selectedReconciliationMatch]);

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

  const updateModuleEntry = async (endpoint, id, payload) => {
    try {
      await API.put(`${endpoint}/${id}`, payload);
      await refreshAccountsData();
      return true;
    } catch (error) {
      console.error(`Error updating ${endpoint}`, error);
      window.alert("Entry update failed.");
      return false;
    }
  };

  const deleteModuleEntry = async (endpoint, id) => {
    try {
      await API.delete(`${endpoint}/${id}`);
      await refreshAccountsData();
      return true;
    } catch (error) {
      console.error(`Error deleting ${endpoint}`, error);
      window.alert("Entry delete failed.");
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


  const savePaymentSetting = async (method, id, form) => {
    const payload = new FormData();
    payload.append("paymentMode", form.paymentMode || "UPI");
    payload.append("department", form.department || "Hotel");
    payload.append("providerName", form.providerName || "");
    payload.append("upiId", form.upiId || "");
    payload.append("accountHolderName", form.accountHolderName || "");
    payload.append("bankName", form.bankName || "");
    payload.append("qrImageUrl", form.qrImageUrl || "");
    payload.append("isActive", form.isActive ? "1" : "0");
    payload.append("notes", form.notes || "");
    if (form.qrImageFile) {
      payload.append("qrImage", form.qrImageFile);
    }

    try {
      if (method === "post") {
        await API.post("/accounts/payment-settings", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.put(`/accounts/payment-settings/${id}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      await refreshAccountsData();
      return true;
    } catch (error) {
      console.error("Error saving payment setting", error);
      window.alert("Payment setting save failed.");
      return false;
    }
  };

  const handleCreatePaymentSetting = (form) => savePaymentSetting("post", null, form);

  const handleUpdatePaymentSetting = (id, form) => savePaymentSetting("put", id, form);

  const handleDeletePaymentSetting = async (id) => {
    try {
      await API.delete(`/accounts/payment-settings/${id}`);
      await refreshAccountsData();
      return true;
    } catch (error) {
      console.error("Error deleting payment setting", error);
      window.alert("Payment setting delete failed.");
      return false;
    }
  };

  const handleLinkBankLedger = async (payload) => {
    try {
      await API.post("/accounts/reconciliation/match", payload);
      await refreshAccountsData();
      return true;
    } catch (error) {
      console.error("Error linking bank ledger", error);
      window.alert("Bank ledger link failed.");
      return false;
    }
  };

  const handleUnlinkBankLedger = async (payload) => {
    try {
      await API.post("/accounts/reconciliation/unmatch", payload);
      await refreshAccountsData();
      return true;
    } catch (error) {
      console.error("Error unlinking bank ledger", error);
      window.alert("Bank ledger unlink failed.");
      return false;
    }
  };

  const accountsModuleConfigs = [
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
      onUpdate: (id, form) => updateModuleEntry("/accounts/petty-cash", id, form),
      onDelete: (id) => deleteModuleEntry("/accounts/petty-cash", id),
      rows: pettyCashEntries,
      columns: moduleColumns.pettyCash,
      submitLabel: "Add Petty Cash",
      editLabel: "Update Petty Cash",
      toFormState: (row) => ({
        entryDate: formatInputDate(row.entry_date),
        entryType: row.entry_type || "Out",
        category: row.category || "",
        description: row.description || "",
        amount: row.amount || 0,
        approvedBy: row.approved_by || "",
        notes: row.notes || "",
      }),
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
      onUpdate: (id, form) =>
        updateModuleEntry("/accounts/gst-returns", id, {
          ...form,
          netPayable: Number(form.gstCollected || 0) - Number(form.gstPaid || 0),
          filedOn: form.status === "Filed" ? form.filedOn || new Date().toISOString().slice(0, 10) : null,
        }),
      onDelete: (id) => deleteModuleEntry("/accounts/gst-returns", id),
      rows: gstReturns,
      columns: moduleColumns.gstReturns,
      submitLabel: "Save GST Record",
      editLabel: "Update GST Record",
      toFormState: (row) => ({
        filingPeriod: row.filing_period || "",
        returnType: row.return_type || "GSTR-3B",
        taxableAmount: row.taxable_amount || 0,
        gstCollected: row.gst_collected || 0,
        gstPaid: row.gst_paid || 0,
        status: row.status || "Draft",
        filedOn: formatInputDate(row.filed_on),
        notes: row.notes || "",
      }),
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
      onUpdate: (id, form) => updateModuleEntry("/accounts/vendor-payments", id, form),
      onDelete: (id) => deleteModuleEntry("/accounts/vendor-payments", id),
      rows: vendorPayments,
      columns: moduleColumns.vendorPayments,
      submitLabel: "Add Vendor Payment",
      editLabel: "Update Vendor Payment",
      toFormState: (row) => ({
        vendorName: row.vendor_name || "",
        invoiceRef: row.invoice_ref || "",
        paymentDate: formatInputDate(row.payment_date),
        amount: row.amount || 0,
        paymentMode: row.payment_mode || "Bank Transfer",
        status: row.status || "Scheduled",
        notes: row.notes || "",
      }),
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
      onUpdate: (id, form) => updateModuleEntry("/accounts/purchase-orders", id, form),
      onDelete: (id) => deleteModuleEntry("/accounts/purchase-orders", id),
      rows: purchaseOrders,
      columns: moduleColumns.purchaseOrders,
      submitLabel: "Create PO",
      editLabel: "Update PO",
      toFormState: (row) => ({
        poNumber: row.po_number || "",
        vendorName: row.vendor_name || "",
        orderDate: formatInputDate(row.order_date),
        expectedDate: formatInputDate(row.expected_date),
        totalAmount: row.total_amount || 0,
        status: row.status || "Draft",
        notes: row.notes || "",
      }),
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
      onUpdate: (id, form) =>
        updateModuleEntry("/accounts/payroll", id, {
          ...form,
          netSalary:
            Number(form.baseSalary || 0) +
            Number(form.allowance || 0) -
            Number(form.deduction || 0),
        }),
      onDelete: (id) => deleteModuleEntry("/accounts/payroll", id),
      rows: payrollRecords,
      columns: moduleColumns.payroll,
      submitLabel: "Add Payroll",
      editLabel: "Update Payroll",
      toFormState: (row) => ({
        staffName: row.staff_name || "",
        payrollMonth: row.payroll_month || "",
        attendanceDays: row.attendance_days || 0,
        baseSalary: row.base_salary || 0,
        allowance: row.allowance || 0,
        deduction: row.deduction || 0,
        status: row.status || "Draft",
        notes: row.notes || "",
      }),
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
      onUpdate: (id, form) => updateModuleEntry("/accounts/profit-centers", id, form),
      onDelete: (id) => deleteModuleEntry("/accounts/profit-centers", id),
      rows: profitCenters,
      columns: moduleColumns.profitCenters,
      submitLabel: "Add Profit Entry",
      editLabel: "Update Profit Entry",
      toFormState: (row) => ({
        centerName: row.center_name || "Hotel",
        entryDate: formatInputDate(row.entry_date),
        incomeAmount: row.income_amount || 0,
        expenseAmount: row.expense_amount || 0,
        notes: row.notes || "",
      }),
    },
    {
      key: "payment-settings",
      title: "UPI & Scanner Setup",
      subtitle: "Client payment scanners, UPI IDs, and bank-linked payment setups.",
      submitLabel: "UPI & Scanner",
    },
  ];
  const activeModule =
    accountsModuleConfigs.find((module) => module.key === activeAccountsModule) ||
    accountsModuleConfigs[0];
  const paymentModeOptions = ["all", "Cash", "UPI", "Card", "Bank Transfer", "Cheque"];
  const billingSourceOptions = [
    { value: "all", label: "All Sources" },
    { value: "hotel", label: "Hotel" },
    { value: "restaurant", label: "Restaurant" },
    { value: "banquet", label: "Banquet" },
  ];
  const filteredRecords =
    selectedPaymentMode === "all"
      ? records
      : records.filter((record) => normalizePaymentMode(record.paymentMode) === selectedPaymentMode);
  const transactionTotalPages = Math.max(1, Math.ceil(filteredRecords.length / TRANSACTION_PAGE_SIZE));
  const paginatedTransactionRecords = filteredRecords.slice(
    (transactionPage - 1) * TRANSACTION_PAGE_SIZE,
    transactionPage * TRANSACTION_PAGE_SIZE,
  );
  const roomFilterOptions = Array.from(
    new Set(
      [
        ...customerInvoices.map((invoice) => getInvoiceRoomValue(invoice)),
        ...hotelBookings.map((booking) => getHotelBookingRoomValue(booking)),
      ].filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const restaurantTableOptions = Array.from(
    new Set(restaurantBills.map((bill) => getRestaurantBillTableValue(bill)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const banquetHallOptions = Array.from(
    new Set(banquetBookings.map((booking) => getBanquetHallValue(booking)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const roomFilteredInvoices =
    selectedInvoiceRoom === "all"
      ? customerInvoices
      : customerInvoices.filter((invoice) => getInvoiceRoomValue(invoice) === selectedInvoiceRoom);
  const invoiceBookingIds = new Set(
    customerInvoices
      .map((invoice) => String(invoice.booking_id || invoice.customer_id || ""))
      .filter(Boolean),
  );
  const invoiceFallbackBookings = hotelBookings.filter(
    (booking) => !invoiceBookingIds.has(String(booking.bookingId || booking.id || "")),
  );
  const roomFilteredHotelBookings =
    selectedInvoiceRoom === "all"
      ? invoiceFallbackBookings
      : invoiceFallbackBookings.filter(
          (booking) => getHotelBookingRoomValue(booking) === selectedInvoiceRoom,
        );
  const hotelInvoices =
    selectedPaymentMode === "all"
      ? roomFilteredInvoices
      : roomFilteredInvoices.filter(
          (invoice) => getInvoicePaymentMode(invoice) === selectedPaymentMode,
        );
  const filteredHotelBookings =
    selectedPaymentMode === "all"
      ? roomFilteredHotelBookings
      : roomFilteredHotelBookings.filter(
          (booking) => getHotelBookingPaymentMode(booking) === selectedPaymentMode,
        );
  const tableFilteredRestaurantBills =
    selectedRestaurantTable === "all"
      ? restaurantBills
      : restaurantBills.filter(
          (bill) => getRestaurantBillTableValue(bill) === selectedRestaurantTable,
        );
  const filteredRestaurantBills =
    selectedPaymentMode === "all"
      ? tableFilteredRestaurantBills
      : tableFilteredRestaurantBills.filter(
          (bill) => getRestaurantBillPaymentMode(bill) === selectedPaymentMode,
        );
  const hallFilteredBanquetBookings =
    selectedBanquetHall === "all"
      ? banquetBookings
      : banquetBookings.filter(
          (booking) => getBanquetHallValue(booking) === selectedBanquetHall,
        );
  const filteredBanquetBookings =
    selectedPaymentMode === "all"
      ? hallFilteredBanquetBookings
      : hallFilteredBanquetBookings.filter(
          (booking) => getBanquetPaymentMode(booking) === selectedPaymentMode,
        );
  const showHotelSource = selectedBillingSource === "all" || selectedBillingSource === "hotel";
  const showRestaurantSource =
    selectedBillingSource === "all" || selectedBillingSource === "restaurant";
  const showBanquetSource =
    selectedBillingSource === "all" || selectedBillingSource === "banquet";
  const visibleHotelInvoices = showHotelSource ? hotelInvoices : [];
  const visibleHotelBookings = showHotelSource ? filteredHotelBookings : [];
  const visibleRestaurantBills = showRestaurantSource ? filteredRestaurantBills : [];
  const visibleBanquetBookings = showBanquetSource ? filteredBanquetBookings : [];
  const filteredHotelTotals = hotelInvoices.reduce(
    (acc, invoice) => {
      const split = splitInvoiceAmounts(invoice);
      acc.roomAmount += split.roomAmount;
      acc.restaurantAmount += split.restaurantAmount;
      acc.finalAmount += split.finalAmount;
      return acc;
    },
    { roomAmount: 0, restaurantAmount: 0, finalAmount: 0 },
  );
  filteredHotelBookings.forEach((booking) => {
    const total = toNumber(
      booking.totalAmount || booking.total_amount || booking.netPaid || booking.paidAmount,
    );
    filteredHotelTotals.roomAmount += total;
    filteredHotelTotals.finalAmount += total;
  });
  const filteredRestaurantBillTotals = filteredRestaurantBills.reduce(
    (acc, bill) => {
      const total = toNumber(bill.total);
      acc.restaurantAmount += total;
      acc.finalAmount += total;
      return acc;
    },
    { roomAmount: 0, restaurantAmount: 0, finalAmount: 0 },
  );
  const filteredBanquetTotals = filteredBanquetBookings.reduce(
    (acc, booking) => {
      const total = toNumber(
        booking.grandTotal || booking.grand_total || booking.totalAmount || booking.total_amount,
      );
      acc.banquetAmount += total;
      acc.finalAmount += total;
      return acc;
    },
    { banquetAmount: 0, finalAmount: 0 },
  );
  const filteredBillingTotals = {
    roomAmount: showHotelSource ? filteredHotelTotals.roomAmount : 0,
    restaurantAmount:
      (showHotelSource ? filteredHotelTotals.restaurantAmount : 0) +
      (showRestaurantSource ? filteredRestaurantBillTotals.restaurantAmount : 0),
    banquetAmount: showBanquetSource ? filteredBanquetTotals.banquetAmount : 0,
    finalAmount:
      (showHotelSource ? filteredHotelTotals.finalAmount : 0) +
      (showRestaurantSource ? filteredRestaurantBillTotals.finalAmount : 0) +
      (showBanquetSource ? filteredBanquetTotals.finalAmount : 0),
  };
  const combinedBillingRecords = [
    ...visibleHotelInvoices.map((invoice) => ({
      id: `hotel-${invoice.id}`,
      source: "Hotel",
      billType: "Hotel Invoice",
      reference: invoice.invoice_no || invoice.invoiceNo || "--",
      customerName: invoice.customer_name || invoice.customerName || "--",
      locationLabel: getInvoiceRoomValue(invoice) ? `Room ${getInvoiceRoomValue(invoice)}` : "--",
      date: invoice.date || "--",
      total: toNumber(invoice.totalAmount ?? invoice.total_amount ?? invoice.final_total),
      paymentMode: getInvoicePaymentMode(invoice),
      paymentStatus: invoice.paymentStatus || invoice.payment_status || invoice.status || "Pending",
      actionId: invoice.booking_id || invoice.customer_id,
      actionKind: "invoice",
      raw: invoice,
    })),
    ...visibleHotelBookings.map((booking) => ({
      id: `hotel-booking-${booking.bookingId || booking.id}`,
      source: "Hotel",
      billType: "Hotel Booking",
      reference: getHotelBookingReference(booking) || "--",
      customerName: booking.guest_name || booking.customerName || "--",
      locationLabel: getHotelBookingRoomValue(booking) ? `Room ${getHotelBookingRoomValue(booking)}` : "--",
      date: booking.check_out || booking.checkOut || booking.check_in || booking.checkIn || "--",
      total: toNumber(
        booking.totalAmount || booking.total_amount || booking.netPaid || booking.paidAmount,
      ),
      paymentMode: getHotelBookingPaymentMode(booking),
      paymentStatus: getHotelBookingPaymentStatus(booking),
      actionId: booking.bookingId || booking.id,
      actionKind: "hotel-booking",
      raw: booking,
    })),
    ...visibleRestaurantBills.map((bill) => ({
      id: `restaurant-${bill.id}`,
      source: "Restaurant",
      billType: "Restaurant Bill",
      reference: bill.reference || `RBILL-${bill.id}`,
      customerName: bill.customerName || bill.customer_name || "Walk-in",
      locationLabel: bill.locationLabel || (getRestaurantBillTableValue(bill)
        ? `Table ${getRestaurantBillTableValue(bill)}`
        : "--"),
      date: bill.created_at || bill.date || "--",
      total: toNumber(bill.total),
      paymentMode: getRestaurantBillPaymentMode(bill),
      paymentStatus: bill.paymentStatus || getRestaurantBillStatus(bill),
      actionId: bill.actionId || bill.id,
      actionKind: "restaurant-bill",
      raw: bill,
    })),
    ...visibleBanquetBookings.map((booking) => ({
      id: `banquet-${booking.id}`,
      source: "Banquet",
      billType: "Banquet Invoice",
      reference: getBanquetReference(booking) || `BNQ-${booking.id}`,
      customerName: booking.customerName || booking.customer_name || "--",
      locationLabel: getBanquetHallValue(booking) || "--",
      date: booking.date || "--",
      total: toNumber(
        booking.grandTotal || booking.grand_total || booking.totalAmount || booking.total_amount,
      ),
      paymentMode: getBanquetPaymentMode(booking),
      paymentStatus: getBanquetPaymentStatus(booking),
      actionId: booking.id,
      actionKind: "banquet",
      raw: booking,
    })),
  ].sort((left, right) => String(right.date).localeCompare(String(left.date)));
  const billingTotalPages = Math.max(1, Math.ceil(combinedBillingRecords.length / BILLING_PAGE_SIZE));
  const paginatedBillingRecords = combinedBillingRecords.slice(
    (billingPage - 1) * BILLING_PAGE_SIZE,
    billingPage * BILLING_PAGE_SIZE,
  );
  const paymentModeSummary = {
    recordsCount: filteredRecords.length,
    recordsAmount: filteredRecords.reduce((sum, record) => sum + toNumber(record.amount), 0),
    invoiceCount: combinedBillingRecords.length,
    invoiceAmount: combinedBillingRecords.reduce((sum, row) => sum + toNumber(row.total), 0),
  };
  paymentModeSummary.combinedCount =
    paymentModeSummary.recordsCount + paymentModeSummary.invoiceCount;
  paymentModeSummary.combinedAmount =
    paymentModeSummary.recordsAmount + paymentModeSummary.invoiceAmount;

  // Today's payment overview — derived from accounts_transactions (records)
  // records[].date format: "DD MMM YYYY" (e.g. "15 Jul 2026")
  const MONTHS_INDEX = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const parseRecordDate = (text) => {
    if (!text) return null;
    const match = String(text).match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (!match) return null;
    const day = Number(match[1]);
    const month = MONTHS_INDEX[match[2]];
    const year = Number(match[3]);
    if (month == null || Number.isNaN(day) || Number.isNaN(year)) return null;
    return new Date(year, month, day);
  };
  const isSameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const today = new Date();
  const todayRecords = (records || []).filter((record) =>
    isSameDay(parseRecordDate(record.date), today),
  );
  const todayStats = {
    count: todayRecords.length,
    total: todayRecords.reduce((sum, record) => sum + toNumber(record.amount), 0),
    income: todayRecords
      .filter((record) => record.type === "Income")
      .reduce((sum, record) => sum + toNumber(record.amount), 0),
    expense: todayRecords
      .filter((record) => record.type === "Expense")
      .reduce((sum, record) => sum + toNumber(record.amount), 0),
  };

  // Extract booking id from a transaction row (description like "Hotel payment received - Booking #123 - Guest Name")
  const extractBookingId = (record) => {
    if (!record) return null;
    const text = String(record.description || "");
    const match = text.match(/Booking\s*#\s*(\d+)/i);
    if (match) return match[1];
    // Fallback: sourceModule == hotel-payment rows have synthetic ids like hotel-payment-7
    if (record.id && String(record.id).startsWith("hotel-payment-")) {
      return String(record.id).replace("hotel-payment-", "");
    }
    return null;
  };

  const selectedBookingId = selectedRecord ? extractBookingId(selectedRecord) : null;
  const bookingPaymentGroups = selectedBookingId
    ? [
        {
          bookingId: selectedBookingId,
          transactions: (records || []).filter(
            (record) => extractBookingId(record) === selectedBookingId,
          ),
          invoices: (customerInvoices || []).filter(
            (invoice) => String(invoice.booking_id || invoice.bookingId || "") === selectedBookingId,
          ),
          hotelBookings: (hotelBookings || []).filter(
            (booking) => String(booking.bookingId || booking.id || "") === selectedBookingId,
          ),
          restaurantBills: (restaurantBills || []).filter(
            (bill) => String(bill.bookingId || bill.booking_id || bill.id || "") === selectedBookingId,
          ),
          banquetBookings: (banquetBookings || []).filter(
            (booking) => String(booking.bookingId || booking.booking_id || booking.id || "") === selectedBookingId,
          ),
        },
      ]
    : [];

  useEffect(() => {
    setTransactionPage(1);
  }, [selectedPaymentMode]);

  useEffect(() => {
    setBillingPage(1);
  }, [
    selectedBillingSource,
    selectedInvoiceRoom,
    selectedRestaurantTable,
    selectedBanquetHall,
    selectedPaymentMode,
  ]);

  useEffect(() => {
    if (transactionPage > transactionTotalPages) {
      setTransactionPage(transactionTotalPages);
    }
  }, [transactionPage, transactionTotalPages]);

  useEffect(() => {
    if (billingPage > billingTotalPages) {
      setBillingPage(billingTotalPages);
    }
  }, [billingPage, billingTotalPages]);

  useEffect(() => {
    if (!isAccountsModulesPage) return;

    setActiveAccountsModule("petty-cash");
    setShowIncome(false);
    setShowExpense(false);
    setShowInvoice(false);
    setShowView(false);
  }, [isAccountsModulesPage]);

  const openBankReconciliationModule = () => {
    navigate("/accounts/bank-reconciliation");
  };

  const openCustomerInvoicesPage = () => {
    navigate("/accounts/customer-invoices");
  };

  const openAccountsTabsPage = () => {
    navigate("/accounts?view=modules");
  };

  const accountsModulesSection = (
    <section ref={accountsModuleSectionRef} className="space-y-5">
      <div className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Accounts Tabs
        </div>
        <h3 className="mt-2 text-[15px] font-black text-slate-900">
          Open any finance module from one click
        </h3>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-500">
          Click any tab to open the related
          form and its latest saved records.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {accountsModuleConfigs.map((module) => {
            const isActive = module.key === activeModule?.key;
            return (
              <button
                key={module.key}
                type="button"
                onClick={() => setActiveAccountsModule(module.key)}
                className={`rounded-full px-5 py-3 text-[15px] font-bold transition ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-[0_14px_30px_rgba(8,145,178,0.2)]"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:text-cyan-700"
                }`}
              >
                {module.submitLabel}
              </button>
            );
          })}
        </div>
      </div>

      {activeModule.key === "payment-settings" ? (
        <PaymentSettingsManager
          rows={paymentSettings}
          onSubmit={handleCreatePaymentSetting}
          onUpdate={handleUpdatePaymentSetting}
          onDelete={handleDeletePaymentSetting}
        />
      ) : (
        <AccountsModuleCard
          key={activeModule.key}
          title={activeModule.title}
          subtitle={activeModule.subtitle}
          fields={activeModule.fields}
          onSubmit={activeModule.onSubmit}
          onUpdate={activeModule.onUpdate}
          onDelete={activeModule.onDelete}
          rows={activeModule.rows}
          columns={activeModule.columns}
          submitLabel={activeModule.submitLabel}
          editLabel={activeModule.editLabel}
          toFormState={activeModule.toFormState}
          filterNote={activeModule.filterNote}
          onClearFilter={activeModule.onClearFilter}
        />
      )}
    </section>
  );

  if (isAccountsModulesPage) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
          <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        </div>

        <div className="w-full space-y-7">
          <section className="overflow-hidden rounded-[28px] border border-sky-200/70 bg-[linear-gradient(90deg,#2563EB_0%,#38BDF8_50%,#60A5FA_100%)] px-5 py-6 text-white shadow-[0_22px_55px_rgba(37,99,235,0.18)] sm:px-7 sm:py-8">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => navigate("/accounts")}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:border-cyan-200 hover:text-cyan-100"
              >
                <FaArrowLeft className="text-cyan-200" />
                Back to Accounts Workspace
              </button>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Finance Center
              </p>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl">
                Accounts tabs workspace
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-100/85 sm:text-xl">
                Petty cash, GST, vendor payment, payroll aur scanner setup ko
                yahan alag screen par open karke manage karein.
              </p>
            </div>
          </section>

          {accountsModulesSection}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
      </div>

      <div className="w-full space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-sky-500/55 bg-[linear-gradient(90deg,#1E40AF_0%,#0369A1_52%,#075985_100%)] px-5 py-6 text-slate-950 shadow-[0_22px_55px_rgba(30,64,175,0.28)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-2xl font-semibold uppercase tracking-[0.26em] text-slate-950">
                Finance Center
              </p>
              <h1 className="text-5xl font-black leading-tight text-slate-950 sm:text-6xl">
                Accounts workspace in dashboard style
              </h1>
              <p className="max-w-3xl text-2xl leading-9 text-slate-950 sm:text-2xl">
                Manage income, expenses, invoices, and transaction records from
                one attractive and responsive finance dashboard.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-base font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)]"
                  onClick={() => setShowIncome(true)}
                >
                  <FaPlus className="text-cyan-600" />
                  Add Income
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-sky-100/40 bg-white/18 px-5 py-3 text-base font-semibold text-slate-950 backdrop-blur-md"
                  onClick={() => setShowExpense(true)}
                >
                  <FaMoneyBillWave />
                  Add Expense
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-sky-100/40 bg-white/18 px-5 py-3 text-base font-semibold text-slate-950 backdrop-blur-md"
                  onClick={() => setShowInvoice(true)}
                >
                  <FaReceipt />
                  Invoice
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-sky-100/40 bg-white/18 px-5 py-3 text-base font-bold text-slate-950 backdrop-blur-md transition hover:border-sky-100"
                  onClick={openAccountsTabsPage}
                >
                  <FaThLarge className="text-slate-950" />
                  Accounts Tab
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-sky-100/40 bg-white/22 px-5 py-3 text-base font-bold text-slate-950 backdrop-blur-md transition hover:border-sky-100 hover:bg-white/26"
                  onClick={openBankReconciliationModule}
                >
                  <FaChartLine className="text-slate-950" />
                  Bank Reconciliation
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-sky-100/40 bg-white/18 px-5 py-3 text-base font-bold text-slate-950 backdrop-blur-md transition hover:border-sky-100"
                  onClick={openCustomerInvoicesPage}
                >
                  <FaFileInvoiceDollar className="text-slate-950" />
                  Customer Invoices
                </button>
                <label className="min-w-[220px] rounded-[20px] border border-sky-100/40 bg-white/18 px-4 py-3 text-left backdrop-blur-md">
                  <span className="block text-base font-semibold uppercase tracking-[0.2em] text-slate-950">
                    Payment Filter
                  </span>
                  <select
                    value={selectedPaymentMode}
                    onChange={(event) => setSelectedPaymentMode(event.target.value)}
                    className="mt-2 w-full bg-transparent text-lg font-semibold text-slate-950 outline-none"
                  >
                    {paymentModeOptions.map((mode) => (
                      <option key={mode} value={mode} className="text-slate-900">
                        {mode === "all" ? "All Payment Modes" : mode}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {[
                { label: "Net Position", value: formatINR(totals.net) },
                { label: "GST Payable", value: formatINR(totals.gstPayable) },
              ].map((item) => (
                <div key={item.label} className="rounded-[22px] border border-sky-100/40 bg-white/18 px-4 py-4 backdrop-blur-md">
                  <span className="text-base text-slate-950">{item.label}</span>
                  <div className="mt-3 text-4xl font-bold leading-none text-slate-950">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Today's Payments",
                  value: String(todayStats.count),
                  note: todayStats.count
                    ? `${todayStats.count} transaction${todayStats.count === 1 ? "" : "s"} logged today`
                    : "No transactions recorded today",
                  tone: "text-cyan-700",
                },
                {
                  label: "Today's Total Amount",
                  value: formatINR(todayStats.total),
                  note: todayStats.count
                    ? "Sum of all income + expense entries today"
                    : "Awaiting first entry for the day",
                  tone: "text-emerald-700",
                },
                {
                  label: "Today's Income",
                  value: formatINR(todayStats.income),
                  note: "Income entries posted today",
                  tone: "text-sky-700",
                },
                {
                  label: "Today's Expense",
                  value: formatINR(todayStats.expense),
                  note: "Expense entries posted today",
                  tone: "text-rose-700",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-[20px] border border-sky-100/40 bg-white/18 px-4 py-4 backdrop-blur-md"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    {card.label}
                  </div>
                  <div className={`mt-2 text-2xl font-black leading-none ${card.tone}`}>
                    {card.value}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-700">{card.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Selected Payment Mode",
              value: selectedPaymentMode === "all" ? "All Modes" : selectedPaymentMode,
              note: "Live filter applied across transaction and invoice sections.",
              tone: "text-cyan-700",
            },
            {
              label: "Payment Entries",
              value: String(paymentModeSummary.recordsCount),
              note: `${formatINR(paymentModeSummary.recordsAmount)} recorded in accounts and hotel payment logs.`,
              tone: "text-emerald-700",
            },
            {
              label: "Billing Records",
              value: String(paymentModeSummary.invoiceCount),
              note: `${formatINR(paymentModeSummary.invoiceAmount)} linked to hotel, restaurant, and banquet billing.`,
              tone: "text-sky-700",
            },
            {
              label: "Combined Payment Amount",
              value: formatINR(paymentModeSummary.combinedAmount),
              note: `${paymentModeSummary.combinedCount} payment rows for the current mode.`,
              tone: "text-amber-700",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-[24px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="text-base font-semibold uppercase tracking-[0.18em] text-slate-500">
                {item.label}
              </div>
              <div className={`mt-3 text-4xl font-black ${item.tone}`}>{item.value}</div>
              <div className="mt-2 text-lg text-slate-500">{item.note}</div>
            </div>
          ))}
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
                    <div className="text-base font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                    <div className="mt-3 text-5xl font-black text-slate-900">{card.value}</div>
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
              <thead className="bg-slate-50 text-base uppercase tracking-[0.18em] text-slate-500">
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
                {paginatedTransactionRecords.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200/80 hover:bg-slate-50/80">
                    <td className="px-5 py-4 text-lg text-slate-600">{r.date}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-4 py-2 text-base font-bold ${r.type === "Income" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-lg text-slate-600">{r.description}</td>
                    <td className="px-5 py-4 text-lg font-bold text-slate-900">{formatINR(r.amount)}</td>
                    <td className="px-5 py-4 text-lg text-slate-600">{r.paymentMode}</td>
                    <td className="px-5 py-4">
                      <button
                        className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-base font-bold text-slate-700"
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
                {!filteredRecords.length ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                      No transaction records match the selected payment mode.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {filteredRecords.length > TRANSACTION_PAGE_SIZE ? (
            <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {(transactionPage - 1) * TRANSACTION_PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(transactionPage * TRANSACTION_PAGE_SIZE, filteredRecords.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">{filteredRecords.length}</span>{" "}
                records
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTransactionPage((current) => Math.max(1, current - 1))}
                  disabled={transactionPage === 1}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                {Array.from({ length: transactionTotalPages }, (_, index) => {
                  const page = index + 1;
                  const isActive = page === transactionPage;

                  return (
                    <button
                      key={`transaction-page-${page}`}
                      type="button"
                      onClick={() => setTransactionPage(page)}
                      className={`h-9 min-w-[36px] rounded-full border px-3 text-xs font-bold transition ${
                        isActive
                          ? "border-cyan-600 bg-cyan-600 text-white shadow-[0_10px_24px_rgba(8,145,178,0.18)]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setTransactionPage((current) => Math.min(transactionTotalPages, current + 1))}
                  disabled={transactionPage === transactionTotalPages}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {false ? (
        <section className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Customer Invoices
              </div>
              <h2 className="mt-2 text-5xl font-black text-slate-900">
                Hotel + restaurant + banquet billing records
              </h2>
              <p className="mt-2 text-xl text-slate-500">
        “Hotel invoices, restaurant bills, and banquet invoices are displayed here together so the Accounts team can track source-wise billing, totals, and payment status.”
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-slate-100 px-5 py-2.5 text-base font-bold text-slate-600">
                {combinedBillingRecords.length} billing records
              </div>
            </div>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1">
                <span className="text-base font-semibold uppercase tracking-[0.16em] text-slate-500">
                Billing Source
              </span>
              <select
                value={selectedBillingSource}
                onChange={(event) => setSelectedBillingSource(event.target.value)}
                className={`${fieldClass} py-3.5 text-lg`}
              >
                {billingSourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-base font-semibold uppercase tracking-[0.16em] text-slate-500">
                Filter By Room
              </span>
              <select
                value={selectedInvoiceRoom}
                onChange={(event) => setSelectedInvoiceRoom(event.target.value)}
                className={`${fieldClass} py-3.5 text-lg`}
              >
                <option value="all">All Rooms</option>
                {roomFilterOptions.map((room) => (
                  <option key={room} value={room}>
                    Room {room}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-base font-semibold uppercase tracking-[0.16em] text-slate-500">
                Filter By Restaurant Table
              </span>
              <select
                value={selectedRestaurantTable}
                onChange={(event) => setSelectedRestaurantTable(event.target.value)}
                className={`${fieldClass} py-3.5 text-lg`}
              >
                <option value="all">All Tables</option>
                {restaurantTableOptions.map((tableNo) => (
                  <option key={tableNo} value={tableNo}>
                    Table {tableNo}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-base font-semibold uppercase tracking-[0.16em] text-slate-500">
                Filter By Banquet Hall
              </span>
              <select
                value={selectedBanquetHall}
                onChange={(event) => setSelectedBanquetHall(event.target.value)}
                className={`${fieldClass} py-3.5 text-lg`}
              >
                <option value="all">All Halls</option>
                {banquetHallOptions.map((hallName) => (
                  <option key={hallName} value={hallName}>
                    {hallName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Filtered Room Total
              </div>
              <div className="mt-2 text-3xl font-black text-emerald-800">
                {formatINR(filteredBillingTotals.roomAmount)}
              </div>
              <div className="mt-1 text-base text-emerald-700/80">
                {selectedInvoiceRoom === "all"
                  ? "Room share across all invoice records."
                  : `Room share for Room ${selectedInvoiceRoom}.`}
              </div>
            </div>

            <div className="rounded-[22px] border border-cyan-100 bg-cyan-50/80 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">
                Filtered Restaurant Total
              </div>
              <div className="mt-2 text-3xl font-black text-cyan-800">
                {formatINR(filteredBillingTotals.restaurantAmount)}
              </div>
              <div className="mt-1 text-base text-cyan-700/80">
                Restaurant bills plus room-service order totals.
              </div>
            </div>

            <div className="rounded-[22px] border border-violet-100 bg-violet-50/80 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
                Filtered Banquet Total
              </div>
              <div className="mt-2 text-3xl font-black text-violet-800">
                {formatINR(filteredBillingTotals.banquetAmount)}
              </div>
              <div className="mt-1 text-base text-violet-700/80">
                Real banquet booking totals from the banquet module.
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Filtered Combined Total
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900">
                {formatINR(filteredBillingTotals.finalAmount)}
              </div>
              <div className="mt-1 text-base text-slate-500">
                Combined billed amount for the current filter.
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[22px] border border-slate-200">
            <table className="min-w-full text-left text-base">
              <thead className="bg-slate-50 text-sm uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Room / Table</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBillingRecords.map((record) => (
                  <tr key={record.id} className="border-t border-slate-200">
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-bold ${
                        record.source === "Restaurant"
                          ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                          : record.source === "Banquet"
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}>
                        {record.source}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-lg font-semibold text-slate-900">{record.reference}</td>
                    <td className="px-4 py-4 text-lg text-slate-700">{record.customerName}</td>
                    <td className="px-4 py-4 text-lg text-slate-700">{record.locationLabel}</td>
                    <td className="px-4 py-4 text-lg text-slate-700">{record.date}</td>
                    <td className="px-4 py-4 text-lg font-bold text-slate-900">{formatINR(record.total)}</td>
                    <td className="px-4 py-4 text-lg text-slate-700">{record.paymentMode}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-bold ${
                        String(record.paymentStatus).toLowerCase() === "paid"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}>
                        {record.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {record.actionKind === "invoice" ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/invoice/${record.actionId}`)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
                          >
                            Open Invoice
                          </button>
                        ) : record.actionKind === "hotel-booking" ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate("/hotel/payment-history", {
                                state: { bookingId: record.actionId },
                              })
                            }
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"
                          >
                            Open Payment History
                          </button>
                        ) : record.actionKind === "banquet" ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate("/banquet", {
                                state: {
                                  focusBookingId: record.actionId,
                                  openBanquetBill: true,
                                },
                              })
                            }
                            className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700"
                          >
                            Open Banquet
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500">
                            Restaurant bill record
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!combinedBillingRecords.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No hotel, restaurant, or banquet billing records match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {combinedBillingRecords.length > BILLING_PAGE_SIZE ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {(billingPage - 1) * BILLING_PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(billingPage * BILLING_PAGE_SIZE, combinedBillingRecords.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">{combinedBillingRecords.length}</span>{" "}
                billing records
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBillingPage((current) => Math.max(1, current - 1))}
                  disabled={billingPage === 1}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                {Array.from({ length: billingTotalPages }, (_, index) => {
                  const page = index + 1;
                  const isActive = page === billingPage;

                  return (
                    <button
                      key={`billing-page-${page}`}
                      type="button"
                      onClick={() => setBillingPage(page)}
                      className={`h-9 min-w-[36px] rounded-full border px-3 text-xs font-bold transition ${
                        isActive
                          ? "border-cyan-600 bg-cyan-600 text-white shadow-[0_10px_24px_rgba(8,145,178,0.18)]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setBillingPage((current) => Math.min(billingTotalPages, current + 1))}
                  disabled={billingPage === billingTotalPages}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
        ) : null}

        <section className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Full Accounts Flow
              </div>
              <h2 className="mt-2 text-4xl font-black text-slate-900">Extended accounts controls</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-500">
          “Along with the existing transaction and invoice workflow, bank, petty cash, GST, vendor, purchase, payroll, and profit-center entries are also managed within this module.”
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Profit Center Net
              </div>
              <div className="mt-3 space-y-2 text-[15px] text-slate-700">
                {(extendedSummary.profitCenters || []).length ? (
                  extendedSummary.profitCenters.map((center) => (
                    <div key={center.centerName} className="flex items-center justify-between gap-4">
                      <span>{center.centerName}</span>
                      <span className="text-lg font-bold text-slate-900">{formatINR(center.net)}</span>
                    </div>
                  ))
                ) : (
                  <div>No profit center breakdown yet.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {showIncome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
              <TransactionForm type="Income" onSubmit={handleAddIncome} onCancel={() => setShowIncome(false)} />
            </div>
          </div>
        )}

        {showExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
              <TransactionForm type="Expense" onSubmit={handleAddExpense} onCancel={() => setShowExpense(false)} />
            </div>
          </div>
        )}

        {showInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-0 backdrop-blur-sm">
            <div className="h-[100dvh] w-[100vw] max-w-none overflow-auto rounded-[18px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
              <InvoiceForm onSuccess={handleGenerateInvoice} onCancel={() => setShowInvoice(false)} />
            </div>
          </div>
        )}

        {showView && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {selectedBookingId
                      ? `Payments for Booking #${selectedBookingId}`
                      : "Record Details"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedBookingId
                      ? `All transactions, invoices, and payments linked to this booking.`
                      : "No booking id found on this record."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowView(false);
                    setSelectedRecord(null);
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
                {selectedBookingId && bookingPaymentGroups.map((group) => (
                  <div key={group.bookingId} className="space-y-4">
                    <SummaryRow
                      label="Transaction Total"
                      value={formatINR(
                        group.transactions.reduce((sum, record) => sum + toNumber(record.amount), 0),
                      )}
                      tone="text-emerald-700"
                    />
                    <SummaryRow
                      label="Invoice Total"
                      value={formatINR(
                        group.invoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount || invoice.total_amount || invoice.final_total || 0), 0),
                      )}
                      tone="text-sky-700"
                    />
                    <SummaryRow
                      label="Booking Total"
                      value={formatINR(
                        group.hotelBookings.reduce((sum, booking) => sum + toNumber(booking.totalAmount || booking.total_amount || 0), 0),
                      )}
                      tone="text-cyan-700"
                    />
                    <SummaryRow
                      label="Restaurant Bills"
                      value={formatINR(
                        group.restaurantBills.reduce((sum, bill) => sum + toNumber(bill.total || 0), 0),
                      )}
                      tone="text-amber-700"
                    />
                    <SummaryRow
                      label="Banquet Bookings"
                      value={formatINR(
                        group.banquetBookings.reduce((sum, booking) => sum + toNumber(booking.grand_total || booking.total || 0), 0),
                      )}
                      tone="text-purple-700"
                    />
                    {group.transactions.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Account Transactions
                        </div>
                        <table className="min-w-full rounded-xl border border-slate-200 text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Type</th>
                              <th className="px-3 py-2">Description</th>
                              <th className="px-3 py-2">Amount</th>
                              <th className="px-3 py-2">Mode</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.transactions.map((record) => (
                              <tr key={record.id} className="border-t border-slate-100">
                                <td className="px-3 py-2">{record.date}</td>
                                <td className="px-3 py-2">{record.type}</td>
                                <td className="px-3 py-2">{record.description}</td>
                                <td className="px-3 py-2 font-semibold">{formatINR(record.amount)}</td>
                                <td className="px-3 py-2">{record.paymentMode}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {group.invoices.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Linked Invoices
                        </div>
                        <table className="min-w-full rounded-xl border border-slate-200 text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Invoice</th>
                              <th className="px-3 py-2">Guest</th>
                              <th className="px-3 py-2">Room</th>
                              <th className="px-3 py-2">Total</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.invoices.map((invoice) => (
                              <tr key={invoice.id} className="border-t border-slate-100">
                                <td className="px-3 py-2">{invoice.invoice_no || `#${invoice.id}`}</td>
                                <td className="px-3 py-2">{invoice.customer_name || invoice.guest_name || "-"}</td>
                                <td className="px-3 py-2">{invoice.room_no || "-"}</td>
                                <td className="px-3 py-2 font-semibold">{formatINR(invoice.totalAmount || invoice.total_amount || invoice.final_total || 0)}</td>
                                <td className="px-3 py-2">
                                  {invoice.payment_status || invoice.status || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {group.transactions.length === 0 && group.invoices.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        No transactions or invoices found for Booking #{group.bookingId}.
                      </div>
                    )}
                  </div>
                ))}
                {!selectedBookingId && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Could not extract a booking id from this record. Showing raw details only.
                    <div className="mt-3 space-y-1 text-left">
                      <p><strong>Date:</strong> {selectedRecord.date}</p>
                      <p><strong>Type:</strong> {selectedRecord.type}</p>
                      <p><strong>Description:</strong> {selectedRecord.description}</p>
                      <p><strong>Amount:</strong> {formatINR(selectedRecord.amount)}</p>
                      <p><strong>Payment Mode:</strong> {selectedRecord.paymentMode}</p>
                      <p><strong>Source Module:</strong> {selectedRecord.sourceModule || "-"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Accounts;
