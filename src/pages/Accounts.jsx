import { useEffect, useMemo, useState } from "react";
import SummaryCard from "../components/Accounts/SummaryCard";
import RecordRow from "../components/Accounts/RecordRow";
import ReportCard from "../components/Accounts/ReportCard";
import Modal from "../components/Hotel/Modal";
import TransactionForm from "../components/Accounts/forms/TransactionForm";
import InvoiceForm from "../components/Accounts/forms/InvoiceForm";
import './Accounts.css';
import API from "../api";

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const Accounts = () => {
  const [records, setRecords] = useState([]);
  const [totals, setTotals] = useState({
    income: 0,
    expense: 0,
    net: 0,
    gstPayable: 0,
  });

  const [modals, setModals] = useState({
    addIncome: false,
    addExpense: false,
    invoice: false,
    view: false,
    audit: false,
  });

  const [selectedRecord, setSelectedRecord] = useState(null);

  const openModal = (name) =>
    setModals((prev) => ({ ...prev, [name]: true }));

  const closeModal = (name) =>
    setModals((prev) => ({ ...prev, [name]: false }));

  const addRecord = (record) => {
    setRecords((prev) => [
      {
        ...record,
        id: record.id || Date.now(),
      },
      ...prev,
    ]);
  };

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

  useEffect(() => {
    fetchRecords();
    fetchSummary();
  }, []);

  const handleAddIncome = async (data) => {
    try {
      const res = await API.post("/accounts/income", data);

      addRecord({
        id: res.data?.id,
        date: new Date(data.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        type: 'Income',
        description: data.description,
        amount: Number(data.amount),
        paymentMode: data.paymentMode,
      });

      await fetchSummary();
      closeModal('addIncome');
      alert('Income added');
    } catch (err) {
      console.error("Error adding income", err);
      alert("Error adding income");
    }
  };

  const handleAddExpense = async (data) => {
    try {
      const res = await API.post("/accounts/expense", data);

      addRecord({
        id: res.data?.id,
        date: new Date(data.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        type: 'Expense',
        description: data.description,
        amount: Number(data.amount),
        paymentMode: data.paymentMode,
      });

      await fetchSummary();
      closeModal('addExpense');
      alert('Expense added');
    } catch (err) {
      console.error("Error adding expense", err);
      alert("Error adding expense");
    }
  };

  const handleGenerateInvoice = async (invoice) => {
    try {
      const res = await API.post("/invoices/create", invoice);

      addRecord({
        id: res.data?.id || Date.now(),
        date: new Date(invoice.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        type: "Income",
        description: `Invoice ${invoice.invoiceNo} - ${invoice.customerName}`,
        amount: Number(invoice.amount || invoice.finalTotal || 0),
        paymentMode: invoice.paymentMode,
      });

      await fetchSummary();

      alert("Invoice generated successfully");
      closeModal("invoice");
    } catch (err) {
      console.error("Error generating invoice", err);
      alert("Error generating invoice");
    }
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    openModal('view');
  };

  const handleNightAudit = () => {
    alert(
      `Night Audit Completed\n\nTotal Income: ${formatINR(
        totals.income
      )}\nTotal Expense: ${formatINR(
        totals.expense
      )}\nNet Profit: ${formatINR(
        totals.net
      )}\nGST Payable: ${formatINR(totals.gstPayable)}`
    );
    closeModal('audit');
  };

  return (
    <div className="resort-page overflow-x-hidden">
      <div className="resort-shell">
        <section className="resort-hero">
          <div className="resort-hero-content lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="resort-eyebrow">Finance Overview</p>
              <h1 className="resort-title">Accounts and cash flow center</h1>
              <p className="resort-subtitle">
                Keep income, expense, GST, and report actions in a cleaner
                finance workspace that adapts well across phone and desktop.
              </p>
            </div>
            <div className="resort-stat-grid">
              <div className="resort-stat">
                <span className="resort-stat-label">Income</span>
                <span className="resort-stat-value text-[1.25rem]">{formatINR(totals.income)}</span>
              </div>
              <div className="resort-stat">
                <span className="resort-stat-label">Expense</span>
                <span className="resort-stat-value text-[1.25rem]">{formatINR(totals.expense)}</span>
              </div>
              <div className="resort-stat">
                <span className="resort-stat-label">Net</span>
                <span className="resort-stat-value text-[1.25rem]">{formatINR(totals.net)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="resort-panel">
          <div className="mb-5">
            <h2 className="resort-panel-title">Quick finance actions</h2>
            <p className="resort-panel-copy">
              Create transactions fast and keep finance tasks user-friendly for
              both desktop operators and tablet use.
            </p>
          </div>
          <div className="resort-actions">
        <button
          className="resort-button"
          onClick={() => openModal("addIncome")}
        >
          + Add Income
        </button>

        <button
          className="resort-button bg-[linear-gradient(135deg,rgba(217,119,6,0.95),rgba(249,115,22,0.92))]"
          onClick={() => openModal("addExpense")}
        >
          + Add Expense
        </button>

        {/*
        <button
          className="flex-1 min-w-max px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base bg-gradient-to-r from-blue-400 to-cyan-500 text-white hover:opacity-90 transition"
          onClick={() => openModal("invoice")}
        >
          Generate Invoice
        </button>
        */}

        {/*
        <button
          className="flex-1 min-w-max px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base bg-gradient-to-r from-purple-400 to-indigo-500 text-white hover:opacity-90 transition"
          onClick={() => openModal("audit")}
        >
          Night Audit
        </button>
        */}
          </div>
        </section>

        <section className="resort-grid">
        <SummaryCard
          label="Total Income"
          value={formatINR(totals.income)}
          valueColor="green"
          onClick={() => alert(`Total Income: ${formatINR(totals.income)}`)}
        />

        <SummaryCard
          label="Total Expense"
          value={formatINR(totals.expense)}
          valueColor="red"
          onClick={() => alert(`Total Expense: ${formatINR(totals.expense)}`)}
        />

        <SummaryCard
          label="Net Profit"
          value={formatINR(totals.net)}
          valueColor="blue"
          onClick={() => alert(`Net Profit: ${formatINR(totals.net)}`)}
        />

        <SummaryCard
          label="GST Payable"
          value={formatINR(totals.gstPayable)}
          valueColor="purple"
          onClick={() => alert(`GST Payable: ${formatINR(totals.gstPayable)}`)}
        />
        </section>

        <section className="resort-table-shell">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-700/30">
          <h2 className="resort-panel-title">
            Income & Expense Records
          </h2>
          <p className="resort-panel-copy mt-1">
            Browse transaction history with mobile-friendly scrolling and clear actions.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-xs sm:text-sm text-slate-200">
            <thead className="bg-slate-900/50 border-b border-slate-700/30">
              <tr>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-semibold text-slate-300">
                  Date
                </th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-semibold text-slate-300">
                  Type
                </th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-semibold text-slate-300">
                  Description
                </th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-semibold text-slate-300">
                  Amount
                </th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-semibold text-slate-300 hidden sm:table-cell">
                  Payment Mode
                </th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-semibold text-slate-300">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/20">
              {records.map((r) => (
                <RecordRow key={r.id} record={r} onView={handleView} />
              ))}
            </tbody>
          </table>
        </div>
        </section>

        <section className="resort-grid">
        <ReportCard
          variant="blue"
          title="Profit & Loss Report"
          subtitle="View monthly P&L summary"
          onClick={() => alert('Profit & Loss Report (demo)')}
        />

        <ReportCard
          variant="green"
          title="GST Report"
          subtitle="Download GST statement"
          onClick={() => alert('GST Report (demo)')}
        />

        <ReportCard
          variant="purple"
          title="Cash Collection Report"
          subtitle="Daily cashier summary"
          onClick={() => alert('Cash Collection Report (demo)')}
        />
        </section>

        <Modal
        isOpen={modals.addIncome}
        onClose={() => closeModal('addIncome')}
        title="Add Income"
      >
        <TransactionForm
          type="Income"
          onSubmit={handleAddIncome}
          onCancel={() => closeModal('addIncome')}
        />
      </Modal>

      <Modal
        isOpen={modals.addExpense}
        onClose={() => closeModal('addExpense')}
        title="Add Expense"
      >
        <TransactionForm
          type="Expense"
          onSubmit={handleAddExpense}
          onCancel={() => closeModal('addExpense')}
        />
      </Modal>

      <Modal
        isOpen={modals.invoice}
        onClose={() => closeModal('invoice')}
        title="Generate Invoice"
      >
        <InvoiceForm
          onSubmit={handleGenerateInvoice}
          onCancel={() => closeModal('invoice')}
        />
      </Modal>

      <Modal
        isOpen={modals.view}
        onClose={() => closeModal('view')}
        title="Record Details"
      >
        {selectedRecord ? (
          <div className="space-y-4">
            <div className="flex justify-between gap-3 pb-3 border-b border-slate-600/30">
              <span className="text-slate-400 text-sm font-medium">Date</span>
              <span className="text-slate-100 text-sm font-semibold">
                {selectedRecord.date}
              </span>
            </div>
            <div className="flex justify-between gap-3 pb-3 border-b border-slate-600/30">
              <span className="text-slate-400 text-sm font-medium">Type</span>
              <span className="text-slate-100 text-sm font-semibold">
                {selectedRecord.type}
              </span>
            </div>
            <div className="flex justify-between gap-3 pb-3 border-b border-slate-600/30">
              <span className="text-slate-400 text-sm font-medium">
                Description
              </span>
              <span className="text-slate-100 text-sm font-semibold">
                {selectedRecord.description}
              </span>
            </div>
            <div className="flex justify-between gap-3 pb-3 border-b border-slate-600/30">
              <span className="text-slate-400 text-sm font-medium">Amount</span>
              <span className="text-slate-100 text-sm font-semibold">
                {formatINR(selectedRecord.amount)}
              </span>
            </div>
            <div className="flex justify-between gap-3 pb-3">
              <span className="text-slate-400 text-sm font-medium">
                Payment Mode
              </span>
              <span className="text-slate-100 text-sm font-semibold">
                {selectedRecord.paymentMode}
              </span>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-600/30">
              <button
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium transition"
                onClick={() => closeModal("view")}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={modals.audit}
        onClose={() => closeModal('audit')}
        title="Night Audit"
      >
        <div className="space-y-3">
          <p className="text-slate-300 text-sm">
            This will summarize today's income/expense totals (demo).
          </p>
          <ul className="ml-4 space-y-2 text-slate-100 text-sm list-disc">
            <li>
              <strong>Total Income:</strong> {formatINR(totals.income)}
            </li>
            <li>
              <strong>Total Expense:</strong> {formatINR(totals.expense)}
            </li>
            <li>
              <strong>Net Profit:</strong> {formatINR(totals.net)}
            </li>
            <li>
              <strong>GST Payable:</strong> {formatINR(totals.gstPayable)}
            </li>
          </ul>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-600/30">
            <button
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium transition"
              onClick={() => closeModal("audit")}
            >
              Cancel
            </button>

            <button
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              onClick={handleNightAudit}
            >
              Run Night Audit
            </button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
};

export default Accounts;
