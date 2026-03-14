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

  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);

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
        date: new Date(data.date).toLocaleDateString("en-GB"),
        type: "Income",
        description: data.description,
        amount: Number(data.amount),
        paymentMode: data.paymentMode,
      });

      fetchSummary();
      setShowIncome(false);
    } catch (err) {
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
    } catch (err) {
      alert("Error adding expense");
    }
  };

  const handleGenerateInvoice = async (invoice) => {
    try {
      const res = await API.post("/invoices/create", invoice);

      addRecord({
        id: res.data?.id || Date.now(),
        date: new Date(invoice.date).toLocaleDateString("en-GB"),
        type: "Income",
        description: `Invoice ${invoice.invoiceNo}`,
        amount: Number(invoice.amount || 0),
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

  const handleNightAudit = () => {
    alert(
      `Night Audit Completed

Income: ${formatINR(totals.income)}
Expense: ${formatINR(totals.expense)}
Net: ${formatINR(totals.net)}
GST: ${formatINR(totals.gstPayable)}`
    );
    setShowAudit(false);
  };

  return (
    <div className="resort-page">
      <div className="resort-shell">

        {/* ACTION BUTTONS */}

        <div className="resort-actions">

          <button
            className="resort-button"
            onClick={() => setShowIncome(true)}
          >
            + Add Income
          </button>

          <button
            className="resort-button"
            onClick={() => setShowExpense(true)}
          >
            + Add Expense
          </button>

        </div>

        {/* SUMMARY */}

        <section className="resort-grid">

          <SummaryCard
            label="Total Income"
            value={formatINR(totals.income)}
            valueColor="green"
          />

          <SummaryCard
            label="Total Expense"
            value={formatINR(totals.expense)}
            valueColor="red"
          />

          <SummaryCard
            label="Net Profit"
            value={formatINR(totals.net)}
            valueColor="blue"
          />

          <SummaryCard
            label="GST Payable"
            value={formatINR(totals.gstPayable)}
            valueColor="purple"
          />

        </section>

        {/* RECORD TABLE */}

        <table className="w-full">

          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Payment Mode</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {records.map((r) => (
              <RecordRow
                key={r.id}
                record={r}
                onView={handleView}
              />
            ))}

          </tbody>

        </table>

        {/* ADD INCOME */}

        {showIncome && (
          <TransactionForm
            type="Income"
            onSubmit={handleAddIncome}
            onCancel={() => setShowIncome(false)}
          />
        )}

        {/* ADD EXPENSE */}

        {showExpense && (
          <TransactionForm
            type="Expense"
            onSubmit={handleAddExpense}
            onCancel={() => setShowExpense(false)}
          />
        )}

        {/* INVOICE */}

        {showInvoice && (
          <InvoiceForm
            onSubmit={handleGenerateInvoice}
            onCancel={() => setShowInvoice(false)}
          />
        )}

        {/* RECORD VIEW */}

        {showView && selectedRecord && (

          <div className="mt-6 border p-4 rounded">

            <p>Date: {selectedRecord.date}</p>
            <p>Type: {selectedRecord.type}</p>
            <p>Description: {selectedRecord.description}</p>
            <p>Amount: {formatINR(selectedRecord.amount)}</p>
            <p>Payment Mode: {selectedRecord.paymentMode}</p>

            <button
              onClick={() => setShowView(false)}
              className="mt-3 bg-red-500 px-4 py-2 rounded"
            >
              Close
            </button>

          </div>

        )}

      </div>
    </div>
  );
};

export default Accounts;