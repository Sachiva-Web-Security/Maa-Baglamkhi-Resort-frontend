import { useEffect, useState } from "react";
import SummaryCard from "../components/Accounts/SummaryCard";
import RecordRow from "../components/Accounts/RecordRow";
import ReportCard from "../components/Accounts/ReportCard";

import './Accounts.css';
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

  const handleView = (record) => {

    alert(
      `Date: ${record.date}
Type: ${record.type}
Description: ${record.description}
Amount: ${formatINR(record.amount)}
Payment Mode: ${record.paymentMode}`
    );

  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-4 sm:p-6 lg:p-8">

      <h1 className="text-3xl font-bold mb-8">
        Accounts & Finance
      </h1>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

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

      </div>

      {/* Table */}

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl shadow-lg overflow-hidden">

        <div className="px-6 py-5 border-b border-slate-700/30">
          <h2 className="text-xl font-bold">
            Income & Expense Records
          </h2>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm text-slate-200">

            <thead className="bg-slate-900/50 border-b border-slate-700/30">

              <tr>

                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Payment Mode</th>
                <th className="px-4 py-3 text-left">Action</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-700/20">

              {records.map((r) => (

                <RecordRow
                  key={r.id}
                  record={r}
                  onView={() => handleView(r)}
                />

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* Reports */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">

        <ReportCard
          variant="blue"
          title="Profit & Loss Report"
          subtitle="View monthly P&L summary"
          onClick={() => alert("Profit & Loss Report")}
        />

        <ReportCard
          variant="green"
          title="GST Report"
          subtitle="Download GST statement"
          onClick={() => alert("GST Report")}
        />

        <ReportCard
          variant="purple"
          title="Cash Collection Report"
          subtitle="Daily cashier summary"
          onClick={() => alert("Cash Collection Report")}
        />

      </div>

    </div>
  );
};

export default Accounts;