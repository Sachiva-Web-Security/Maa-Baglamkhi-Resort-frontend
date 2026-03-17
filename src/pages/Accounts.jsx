import { useEffect, useState } from "react";
import SummaryCard from "../components/Accounts/SummaryCard";
import RecordRow from "../components/Accounts/RecordRow";
import ReportCard from "../components/Accounts/ReportCard";
import TransactionForm from "../components/Accounts/forms/TransactionForm";
import InvoiceForm from "../components/Accounts/forms/InvoiceForm";

import "./Accounts.css";
import API from "../api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
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

  /* ===== UI STATES ===== */

  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showView, setShowView] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);

  /* ===== FETCH ===== */

  const fetchRecords = async () => {
    try {
      const res = await API.get("/accounts/transactions");
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
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
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchSummary();
  }, []);

  /* ===== ADD RECORD ===== */

  const addRecord = (record) => {
    setRecords((prev) => [
      { ...record, id: record.id || Date.now() },
      ...prev,
    ]);
  };

  /* ===== ACTIONS ===== */

  const handleAddIncome = async (data) => {
    try {
      const res = await API.post("/accounts/income", data);

      addRecord({
        id: res.data?.id,
        date: new Date(data.date).toLocaleDateString("en-GB"),
        type: "Income",
        description: data.description,
        amount: Number(data.amount),
        paymentMode: data.paymentMode,
      });

      fetchSummary();
      setShowIncome(false);

    } catch {
      alert("Error adding income");
    }
  };

  const handleAddExpense = async (data) => {
    try {
      const res = await API.post("/accounts/expense", data);

      addRecord({
        id: res.data?.id,
        date: new Date(data.date).toLocaleDateString("en-GB"),
        type: "Expense",
        description: data.description,
        amount: Number(data.amount),
        paymentMode: data.paymentMode,
      });

      fetchSummary();
      setShowExpense(false);

    } catch {
      alert("Error adding expense");
    }
  };

  const handleGenerateInvoice = async (invoice) => {
    try {
      const res = await API.post("/invoices/create", invoice);

      addRecord({
        id: res.data?.id,
        date: new Date(invoice.date).toLocaleDateString("en-GB"),
        type: "Income",
        description: `Invoice ${invoice.invoiceNo}`,
        amount: Number(invoice.amount),
        paymentMode: invoice.paymentMode,
      });

      fetchSummary();
      setShowInvoice(false);

    } catch {
      alert("Error generating invoice");
    }
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    setShowView(true);
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-6">

      <h1 className="text-3xl font-bold mb-6">
        Accounts & Finance
      </h1>

      {/* ACTION BUTTONS */}

      <div className="flex gap-3 mb-6">
        <button onClick={() => setShowIncome(true)} className="bg-green-600 px-4 py-2 rounded">
          + Add Income
        </button>
        <button onClick={() => setShowExpense(true)} className="bg-red-600 px-4 py-2 rounded">
          + Add Expense
        </button>
        <button onClick={() => setShowInvoice(true)} className="bg-blue-600 px-4 py-2 rounded">
          + Generate Invoice
        </button>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        <SummaryCard label="Total Income" value={formatINR(totals.income)} />
        <SummaryCard label="Total Expense" value={formatINR(totals.expense)} />
        <SummaryCard label="Net Profit" value={formatINR(totals.net)} />
        <SummaryCard label="GST Payable" value={formatINR(totals.gstPayable)} />

      </div>

      {/* TABLE */}

      <div className="bg-slate-800/40 rounded-xl overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-slate-900/50">

            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Payment Mode</th>
              <th className="p-3 text-left">Action</th>
            </tr>

          </thead>

          <tbody>

            {records.map((r) => (
              <RecordRow key={r.id} record={r} onView={() => handleView(r)} />
            ))}

          </tbody>

        </table>

      </div>

      {/* REPORT CARDS */}

      <div className="grid grid-cols-3 gap-4 mt-6">

        <ReportCard title="Profit & Loss" onClick={() => alert("P&L")} />
        <ReportCard title="GST Report" onClick={() => alert("GST")} />
        <ReportCard title="Collection Report" onClick={() => alert("Collection")} />

      </div>

      {/* FORMS */}

      {showIncome && (
        <TransactionForm type="Income" onSubmit={handleAddIncome} onCancel={() => setShowIncome(false)} />
      )}

      {showExpense && (
        <TransactionForm type="Expense" onSubmit={handleAddExpense} onCancel={() => setShowExpense(false)} />
      )}

      {showInvoice && (
        <InvoiceForm onSubmit={handleGenerateInvoice} onCancel={() => setShowInvoice(false)} />
      )}

      {/* VIEW */}

      {showView && selectedRecord && (
        <div className="mt-6 p-4 bg-slate-700 rounded">
          <p>{selectedRecord.description}</p>
          <button onClick={() => setShowView(false)}>Close</button>
        </div>
      )}

    </div>
  );
};

export default Accounts;