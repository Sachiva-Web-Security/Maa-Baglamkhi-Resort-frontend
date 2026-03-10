import { useEffect, useState } from 'react';
import SummaryCard from '../components/Accounts/SummaryCard';
import RecordRow from '../components/Accounts/RecordRow';
import ReportCard from '../components/Accounts/ReportCard';
import Modal from '../components/Hotel/Modal';
import TransactionForm from '../components/Accounts/forms/TransactionForm';
import InvoiceForm from '../components/Accounts/forms/InvoiceForm';
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
    <div className="min-h-screen w-280 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-8">
      <h1 className="accounts-title pl-100">Accounts & Finance</h1>

      <div className="accounts-actions">
        <button
          className="accounts-action-btn bg-gradient-to-r from-pink-400 to-blue-600"
          onClick={() => openModal('addIncome')}
        >
          + Add Income
        </button>

        <button
          className="accounts-action-btn bg-gradient-to-r from-yellow-400 to-orange-500"
          onClick={() => openModal('addExpense')}
        >
          + Add Expense
        </button>

        {/*
        <button
          className="accounts-action-btn bg-gradient-to-r from-blue-400 to-cyan-500"
          onClick={() => openModal('invoice')}
        >
          Generate Invoice
        </button>
        */}

        {/*
        <button
          className="accounts-action-btn bg-gradient-to-r from-purple-400 to-indigo-500"
          onClick={() => openModal('audit')}
        >
          Night Audit
        </button>
        */}
      </div>

      <div className="accounts-summary-grid">
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
      </div>

      <div className="accounts-table-card">
        <div className="accounts-table-card__header">
          <h2 className="accounts-table-card__title">Income & Expense Records</h2>
        </div>

        <div className="accounts-table-wrap">
          <table className="accounts-table">
            <thead className="accounts-thead">
              <tr>
                <th className="accounts-th">Date</th>
                <th className="accounts-th">Type</th>
                <th className="accounts-th">Description</th>
                <th className="accounts-th">Amount</th>
                <th className="accounts-th">Payment Mode</th>
                <th className="accounts-th">Action</th>
              </tr>
            </thead>

            <tbody>
              {records.length > 0 ? (
                records.map((r) => (
                  <RecordRow key={r.id} record={r} onView={handleView} />
                ))
              ) : (
                <tr>
                  <td className="accounts-td text-center" colSpan="6">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="accounts-reports-grid">
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
      </div>

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
          <div className="accounts-view">
            <div className="accounts-view__row">
              <span className="accounts-view__label">Date</span>
              <span className="accounts-view__value">{selectedRecord.date}</span>
            </div>

            <div className="accounts-view__row">
              <span className="accounts-view__label">Type</span>
              <span className="accounts-view__value">{selectedRecord.type}</span>
            </div>

            <div className="accounts-view__row">
              <span className="accounts-view__label">Description</span>
              <span className="accounts-view__value">{selectedRecord.description}</span>
            </div>

            <div className="accounts-view__row">
              <span className="accounts-view__label">Amount</span>
              <span className="accounts-view__value">
                {formatINR(selectedRecord.amount)}
              </span>
            </div>

            <div className="accounts-view__row">
              <span className="accounts-view__label">Payment Mode</span>
              <span className="accounts-view__value">{selectedRecord.paymentMode}</span>
            </div>

            <div className="accounts-view__actions">
              <button
                className="accounts-btn accounts-btn--ghost"
                onClick={() => closeModal('view')}
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
        <div className="accounts-audit">
          <p className="accounts-audit__text">
            This will summarize today’s income/expense totals (demo).
          </p>

          <ul className="accounts-audit__list">
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

          <div className="accounts-audit__actions">
            <button
              className="accounts-btn accounts-btn--ghost"
              onClick={() => closeModal('audit')}
            >
              Cancel
            </button>

            <button
              className="accounts-btn accounts-btn--primary"
              onClick={handleNightAudit}
            >
              Run Night Audit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Accounts;