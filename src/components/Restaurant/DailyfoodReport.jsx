import React, { useState } from "react";
import { reportService } from "../../services/reportService";

const DailyfoodReport = () => {
  const [date, setDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setAttempted(true);
      const data = await reportService.getDailyRoomFood(date || undefined);
      setRows(data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    const body = (rows || [])
      .map(
        (r) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.room || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.status || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.guest || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.checkin || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.checkout || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">${r.adult ?? "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">${r.child ?? "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">${r.meal || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">₹${Number(r.food || 0).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Daily Roomwise Food Sale Report</title>
          <style>
            body { font-family: "Segoe UI", sans-serif; color:#0f172a; padding:16px; }
            h2 { margin:0 0 8px 0; }
            .meta { color:#64748b; font-size:12px; margin-bottom:12px; }
            table { width:100%; border-collapse:collapse; font-size:13px; }
            th { text-align:left; padding:8px; background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#475569; letter-spacing:0.02em; }
          </style>
        </head>
        <body>
          <h2>Daily Roomwise Food Sale Report</h2>
          <div class="meta">Date: ${date || "—"}</div>
          <table>
            <thead>
              <tr>
                <th>Room No.</th><th>Guest Status</th><th>Guest Name</th><th>Check In</th><th>Check Out</th><th>Adult</th><th>Child</th><th>Meal Plan</th><th style="text-align:right;">Food</th>
              </tr>
            </thead>
            <tbody>
              ${body || `<tr><td colspan="9" style="padding:12px;text-align:center;color:#94a3b8;">No data</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="bg-gradient-to-br from-slate-100 via-white to-slate-100 min-h-screen p-6">
      <div className="text-sm text-slate-500 mb-3">Home &gt; Daily Roomwise Food Sale Report</div>

      <div className="rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white px-6 py-4 text-lg font-semibold">
          Daily Roomwise Food Sale Report
        </div>

        <div className="p-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs uppercase text-slate-500 font-semibold">Start Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-slate-200 p-3 w-full rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition disabled:opacity-60"
            >
              {loading ? "Loading..." : "Submit"}
            </button>
            <button
              onClick={printReport}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mt-4 overflow-x-auto">
        {attempted && rows.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500 text-sm">No Data Found</div>
        )}

        {loading && (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        )}

        {!loading && rows.length > 0 && (
          <table className="w-full text-sm text-slate-800 min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Room No.</th>
                <th className="text-left px-4 py-3">Guest Status</th>
                <th className="text-left px-4 py-3">Guest Name</th>
                <th className="text-left px-4 py-3">Check In</th>
                <th className="text-left px-4 py-3">Check Out</th>
                <th className="text-center px-4 py-3">Pax Adult</th>
                <th className="text-center px-4 py-3">Pax Child</th>
                <th className="text-center px-4 py-3">Meal Plan</th>
                <th className="text-right px-4 py-3">Food</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="px-4 py-3">{row.room}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3 text-rose-600 font-medium">{row.guest}</td>
                  <td className="px-4 py-3">{row.checkin}</td>
                  <td className="px-4 py-3">{row.checkout}</td>
                  <td className="px-4 py-3 text-center">{row.adult}</td>
                  <td className="px-4 py-3 text-center">{row.child}</td>
                  <td className="px-4 py-3 text-center">{row.meal}</td>
                  <td className="px-4 py-3 text-right">₹{Number(row.food || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DailyfoodReport;
