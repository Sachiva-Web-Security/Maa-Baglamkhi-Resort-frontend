import React, { useState, useEffect } from "react";
import { reportService } from "../../services/reportService";

const Daywisefood = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const generateReport = async () => {
    try {
      setLoading(true);
      setAttempted(true);
      const rows = await reportService.getDaywiseFood(startDate || undefined, endDate || undefined);
      setReportData(rows || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load report");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load full range on mount
  useEffect(() => {
    generateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const printReport = () => {
    const rows = (reportData || [])
      .map(
        (row) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.bill_date || row.date || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">₹${Number(row.restaurant_sales || row.restaurant || 0).toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">₹${Number(row.gst_amount || row.gst3 || 0).toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;font-weight:600;">₹${Number(row.total_sales || row.total || 0).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Daywise Food Report</title>
          <style>
            body { font-family: "Segoe UI", sans-serif; color:#0f172a; padding:16px; }
            h2 { margin:0 0 8px 0; }
            .meta { color:#64748b; font-size:12px; margin-bottom:12px; }
            table { width:100%; border-collapse:collapse; font-size:13px; }
            th { text-align:left; padding:8px; background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#475569; letter-spacing:0.02em; }
          </style>
        </head>
        <body>
          <h2>Daywise Food Report</h2>
          <div class="meta">Start: ${startDate || "—"} | End: ${endDate || "—"}</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style="text-align:right;">Restaurant</th>
                <th style="text-align:right;">GST</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8;">No data</td></tr>`}
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
      <div className="text-sm text-slate-500 mb-3">Home &gt; Daywise Food Report</div>

      <div className="rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white px-6 py-4 text-lg font-semibold">
          Daywise Food Report
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">Start Date</label>
              <input
                type="date"
                className="border border-slate-200 p-3 w-full rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">End Date</label>
              <input
                type="date"
                className="border border-slate-200 p-3 w-full rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={generateReport}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition"
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

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mt-4 overflow-hidden">
        {attempted && reportData.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500 text-sm">No Data Found</div>
        )}

        {loading && (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        )}

        {!loading && reportData.length > 0 && (
          <table className="w-full text-sm text-slate-800">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Restaurant</th>
                <th className="text-right px-4 py-3">GST</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="px-4 py-3">{row.bill_date || row.date}</td>
                  <td className="px-4 py-3 text-right">
                    ₹{Number(row.restaurant_sales || row.restaurant || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ₹{Number(row.gst_amount || row.gst3 || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ₹{Number(row.total_sales || row.total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Daywisefood;
