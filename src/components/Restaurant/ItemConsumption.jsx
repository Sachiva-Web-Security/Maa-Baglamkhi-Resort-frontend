import React, { useState } from "react";
import { restaurantService } from "../../services/restaurantService";

const ItemConsumption = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("Item");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      setAttempted(true);

      const orders = await restaurantService.getKitchenOrders();
      const result = {};

      orders.forEach((order) => {
        const orderDate = new Date(order.created_at);

        if (startDate) {
          const start = new Date(startDate);
          if (orderDate < start) return;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return;
        }

        (order.items || []).forEach((item) => {
          const key =
            groupBy === "Item"
              ? item.name || item.item_name
              : item.category || "Items";

          if (!result[key]) {
            result[key] = {
              name: key,
              qty: 0,
            };
          }

          const qty = Number(item.quantity ?? item.qty ?? item.Qty ?? 0) || 0;
          result[key].qty += qty;
        });
      });

      setData(result);
    } catch (err) {
      console.error(err);
      setData({});
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    const rows = Object.values(data)
      .map(
        (item) => `
        <tr>
          <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">${item.name}</td>
          <td style="padding:6px 8px; text-align:right; border-bottom:1px solid #e2e8f0;">${item.qty}</td>
        </tr>`
      )
      .join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Item Consumption Report</title>
          <style>
            body { font-family: "Segoe UI", sans-serif; color:#0f172a; padding:16px; }
            h2 { margin:0 0 4px 0; }
            .meta { color:#64748b; font-size:12px; margin-bottom:12px; }
            table { width:100%; border-collapse:collapse; font-size:13px; }
            th { text-align:left; padding:6px 8px; background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#475569; letter-spacing:0.02em; }
          </style>
        </head>
        <body>
          <h2>Item Consumption Report</h2>
          <div class="meta">
            Group By: ${groupBy} |
            Start: ${startDate || "—"} |
            End: ${endDate || "—"}
          </div>
          <table>
            <thead>
              <tr><th>Name</th><th style="text-align:right;">Quantity</th></tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="2" style="padding:12px; text-align:center; color:#94a3b8;">No data</td></tr>`}
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
      <div className="text-sm text-slate-500 mb-3">
        Home &gt; Item Consumption Report
      </div>

      <div className="rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white px-6 py-4 text-lg font-semibold">
          Item Consumption Report
        </div>

        <div className="p-6 space-y-4">
          <div className="grid md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">
                Start Date
              </label>
              <input
                type="date"
                className="border border-slate-200 p-3 w-full rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">
                End Date
              </label>
              <input
                type="date"
                className="border border-slate-200 p-3 w-full rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">
                Group By
              </label>
              <select
                className="border border-slate-200 p-3 w-full rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="Item">Item</option>
                <option value="Category">Category</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">
                POS
              </label>
              <select className="border border-slate-200 p-3 w-full rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All POS</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">
                Token Type
              </label>
              <select className="border border-slate-200 p-3 w-full rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Regular Tokens</option>
                <option>NC Tokens</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadReport}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition w-full"
              >
                {loading ? "Loading..." : "Get Report"}
              </button>
            <button
                onClick={printReport}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition w-full"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mt-4 overflow-hidden">
        {attempted && Object.keys(data).length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500 text-sm">No Data Found</div>
        )}

        {loading && (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        )}

        {!loading && Object.values(data).length > 0 && (
          <table className="w-full text-sm text-slate-800">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-right px-4 py-3">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(data).map((item, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-right">{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ItemConsumption;
