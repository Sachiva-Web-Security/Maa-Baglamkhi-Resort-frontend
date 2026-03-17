import React, { useState } from "react";

const SettlementReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const data = [
    {
      date: "2024-07-10 16:46:42",
      from: "Table / Table-1",
      to: "Table / Table-2",
      token: "BM5242501167",
      by: "Sujay Roy Chakraborty",
    },
    {
      date: "2024-07-10 06:11:17",
      from: "Room / 204",
      to: "Table / Table-5",
      token: "BM5242501178",
      by: "Sujay Roy Chakraborty",
    },
    {
      date: "2024-07-10 06:09:26",
      from: "Table / Table-4",
      to: "Room / 204",
      token: "BM5242501176",
      by: "Sujay Roy Chakraborty",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-100 via-white to-slate-100 min-h-screen p-6">
      <div className="text-sm text-slate-500 mb-3">Home &gt; Transfer Restaurant Token</div>

      <div className="rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white px-6 py-4 text-lg font-semibold">
          Transferred Restaurant Tokens
        </div>

        <div className="p-6 bg-amber-50 border-b border-amber-100">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">Start Date</label>
              <input
                type="date"
                className="border border-amber-200 p-3 w-full rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">End Date</label>
              <input
                type="date"
                className="border border-amber-200 p-3 w-full rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition w-full">
                Submit
              </button>
              <button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition w-full">
                Print
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition">
              Transfer Token By Table +
            </button>
            <button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition">
              Transfer Token By Token Code +
            </button>
            <button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition">
              Transfer Token By Room +
            </button>
            <button className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition">
              Excel Export
            </button>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>Display</span>
              <select className="border border-slate-200 rounded-lg px-2 py-1">
                <option>15</option>
                <option>25</option>
                <option>50</option>
              </select>
              <span>records</span>
            </div>
            <input
              type="text"
              placeholder="Search"
              className="border border-slate-200 rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mt-4 overflow-x-auto">
        <table className="w-full text-sm text-slate-800 min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Transferred From</th>
              <th className="p-3 text-left">Transferred To</th>
              <th className="p-3 text-left">Tokens</th>
              <th className="p-3 text-left">Transferred By</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b border-slate-100">
                <td className="p-3">{row.date}</td>
                <td className="p-3">{row.from}</td>
                <td className="p-3">{row.to}</td>
                <td className="p-3 text-blue-600 font-medium">{row.token}</td>
                <td className="p-3">{row.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettlementReport;
