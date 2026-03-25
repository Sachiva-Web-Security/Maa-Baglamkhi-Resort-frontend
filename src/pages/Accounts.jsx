import { useEffect, useState } from "react";
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

    const handleAccountsUpdated = () => {
      fetchRecords();
      fetchSummary();
    };

    window.addEventListener("accountsUpdated", handleAccountsUpdated);
    return () => {
      window.removeEventListener("accountsUpdated", handleAccountsUpdated);
    };
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
    } catch {
      window.alert("Error adding income");
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
      window.alert("Error adding expense");
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
      window.alert("Error generating invoice");
    }
  };

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
