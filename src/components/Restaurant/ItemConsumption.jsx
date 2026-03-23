import React, { useCallback, useEffect, useMemo, useState } from "react";
import { restaurantService } from "../../services/restaurantService";

const TABS = [
  { id: "logs", label: "Consumption Report" },
  { id: "ingredient", label: "Ingredient Summary" },
  { id: "stock", label: "Stock Impact" },
];

const ItemConsumption = () => {
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    itemName: "",
    ingredientName: "",
    category: "",
    outlet: "",
  });
  const [activeTab, setActiveTab] = useState("logs");
  const [bootstrap, setBootstrap] = useState({ menuItems: [], ingredients: [], outlets: [] });
  const [dashboard, setDashboard] = useState({
    totalItemsSold: 0,
    totalIngredientsConsumed: 0,
    totalConsumptionCost: 0,
    lowStockAffectedItems: 0,
    wastageQty: 0,
  });
  const [logs, setLogs] = useState([]);
  const [ingredientSummary, setIngredientSummary] = useState([]);
  const [stockImpact, setStockImpact] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const categoryOptions = useMemo(
    () =>
      bootstrap.menuItems
        .map((item) => item.category || "Other")
        .filter((value, index, array) => array.indexOf(value) === index),
    [bootstrap.menuItems],
  );

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await restaurantService.getConsumptionBootstrap();
      setBootstrap(data || { menuItems: [], ingredients: [], outlets: [] });
    } catch (error) {
      console.log(error);
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardRes, logsRes, ingredientRes, stockRes] = await Promise.all([
        restaurantService.getConsumptionDashboardSummary(filters),
        restaurantService.getConsumptionReport(filters),
        restaurantService.getIngredientConsumptionSummary(filters),
        restaurantService.getStockImpact(filters),
      ]);

      setDashboard(dashboardRes || {});
      setLogs(logsRes || []);
      setIngredientSummary(ingredientRes || []);
      setStockImpact(stockRes || []);
      setSelectedLog((logsRes || [])[0] || null);
    } catch (error) {
      console.log(error);
      setLogs([]);
      setIngredientSummary([]);
      setStockImpact([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadBootstrap();
    loadReports();
  }, [loadBootstrap, loadReports]);

  const printCurrentView = () => {
    const rows =
      activeTab === "logs"
        ? logs
            .map(
              (row) => `
              <tr>
                <td>${row.menu_item_name}</td>
                <td>${row.ingredient_name}</td>
                <td style="text-align:right">${row.quantity_sold}</td>
                <td style="text-align:right">${row.total_consumption}</td>
                <td style="text-align:right">${row.total_consumption_cost}</td>
              </tr>`,
            )
            .join("")
        : activeTab === "ingredient"
          ? ingredientSummary
              .map(
                (row) => `
                <tr>
                  <td>${row.ingredient_name}</td>
                  <td style="text-align:right">${row.total_consumption}</td>
                  <td style="text-align:right">${row.total_cost}</td>
                </tr>`,
              )
              .join("")
          : stockImpact
              .map(
                (row) => `
                <tr>
                  <td>${row.name}</td>
                  <td style="text-align:right">${row.currentStock}</td>
                  <td style="text-align:right">${row.reorderLevel}</td>
                </tr>`,
              )
              .join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head><title>Item Consumption Report</title></head>
        <body style="font-family:Segoe UI;padding:16px;">
          <h2>Item Consumption</h2>
          <div>View: ${activeTab}</div>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;">
            <tbody>${rows || "<tr><td>No data</td></tr>"}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#19253c_0%,#1f2d47_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#0f766e_100%)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">Item Consumption</p>
              <h1 className="mt-2 text-3xl font-black">Production-ready consumption analytics</h1>
              <p className="mt-2 text-sm text-white/80">
                Recipe/BOM based ingredient usage, cost impact, stock deduction aur branch-wise reporting.
              </p>
            </div>
            <button onClick={printCurrentView} className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg">
              Print View
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-[22px] border border-slate-200/70 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total Items Sold</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{dashboard.totalItemsSold || 0}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200/70 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Ingredients Consumed</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{dashboard.totalIngredientsConsumed || 0}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200/70 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Consumption Cost</div>
            <div className="mt-2 text-3xl font-black text-slate-900">Rs. {Number(dashboard.totalConsumptionCost || 0).toFixed(2)}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200/70 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Low Stock Items</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{dashboard.lowStockAffectedItems || 0}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200/70 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Wastage Qty</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{dashboard.wastageQty || 0}</div>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
          <div className="grid gap-4 xl:grid-cols-[repeat(6,minmax(0,1fr))_150px] xl:items-end">
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3" />
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3" />
            <input value={filters.itemName} onChange={(e) => setFilters({ ...filters, itemName: e.target.value })} placeholder="Item wise" className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3" />
            <input value={filters.ingredientName} onChange={(e) => setFilters({ ...filters, ingredientName: e.target.value })} placeholder="Ingredient wise" className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3" />
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
              <option value="">All Categories</option>
              {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={filters.outlet} onChange={(e) => setFilters({ ...filters, outlet: e.target.value })} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
              <option value="">All Outlets</option>
              {bootstrap.outlets.map((outlet) => (
                <option key={`${outlet.outlet}-${outlet.branch}`} value={outlet.outlet}>{outlet.outlet}</option>
              ))}
            </select>
            <button onClick={loadReports} className="rounded-[18px] bg-blue-600 px-4 py-3 text-sm font-bold text-white">
              {loading ? "Loading..." : "Apply Filters"}
            </button>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
          <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  activeTab === tab.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "logs" ? (
            <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="overflow-hidden rounded-[22px] border border-slate-200">
                <div className="grid grid-cols-[140px_160px_120px_120px_140px] bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  <div>Menu Item</div>
                  <div>Ingredient</div>
                  <div className="text-right">Sold Qty</div>
                  <div className="text-right">Consumed</div>
                  <div className="text-right">Cost</div>
                </div>
                <div className="max-h-[620px] overflow-auto">
                  {logs.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedLog(row)}
                      className={`grid w-full grid-cols-[140px_160px_120px_120px_140px] items-center gap-2 border-t border-slate-100 px-4 py-4 text-left ${selectedLog?.id === row.id ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                    >
                      <div className="font-semibold text-slate-800">{row.menu_item_name}</div>
                      <div className="text-sm text-slate-600">{row.ingredient_name}</div>
                      <div className="text-right text-sm font-bold text-slate-800">{row.quantity_sold}</div>
                      <div className="text-right text-sm font-bold text-slate-800">{row.total_consumption} {row.unit}</div>
                      <div className="text-right text-sm font-black text-slate-900">Rs. {Number(row.total_consumption_cost || 0).toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Consumption Details</div>
                {selectedLog ? (
                  <div className="mt-4 space-y-3">
                    {[
                      ["Date", selectedLog.date],
                      ["Bill No", selectedLog.bill_no],
                      ["Menu Item", selectedLog.menu_item_name],
                      ["Category", selectedLog.category],
                      ["Ingredient", selectedLog.ingredient_name],
                      ["Per Item", `${selectedLog.per_item_consumption} ${selectedLog.unit}`],
                      ["Total Consumption", `${selectedLog.total_consumption} ${selectedLog.unit}`],
                      ["Opening Stock", selectedLog.opening_stock],
                      ["Remaining Stock", selectedLog.remaining_stock],
                      ["Outlet", selectedLog.outlet],
                      ["Created By", selectedLog.created_by],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[16px] bg-white px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">{value || "--"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[16px] bg-white px-4 py-6 text-sm text-slate-500">Select a row to view modal-style details.</div>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "ingredient" ? (
            <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200">
              <div className="grid grid-cols-[minmax(0,1.4fr)_160px_160px_180px] bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                <div>Ingredient</div>
                <div className="text-right">Total Consumption</div>
                <div className="text-right">Total Cost</div>
                <div className="text-right">Lowest Remaining</div>
              </div>
              {ingredientSummary.map((row, index) => (
                <div key={`${row.ingredient_name}-${index}`} className="grid grid-cols-[minmax(0,1.4fr)_160px_160px_180px] border-t border-slate-100 px-4 py-4">
                  <div className="font-semibold text-slate-800">{row.ingredient_name}</div>
                  <div className="text-right font-bold text-slate-800">{row.total_consumption} {row.unit}</div>
                  <div className="text-right font-black text-slate-900">Rs. {Number(row.total_cost || 0).toFixed(2)}</div>
                  <div className="text-right text-slate-700">{row.lowest_remaining_stock}</div>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "stock" ? (
            <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200">
              <div className="grid grid-cols-[minmax(0,1.4fr)_140px_140px_120px_120px] bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                <div>Ingredient</div>
                <div className="text-right">Current</div>
                <div className="text-right">Reorder</div>
                <div className="text-right">Wastage</div>
                <div className="text-right">Status</div>
              </div>
              {stockImpact.map((row) => (
                <div key={row.id} className="grid grid-cols-[minmax(0,1.4fr)_140px_140px_120px_120px] border-t border-slate-100 px-4 py-4">
                  <div className="font-semibold text-slate-800">{row.name}</div>
                  <div className="text-right font-bold text-slate-800">{row.currentStock} {row.unit}</div>
                  <div className="text-right text-slate-700">{row.reorderLevel} {row.unit}</div>
                  <div className="text-right text-slate-700">{row.wastageQty} {row.unit}</div>
                  <div className={`text-right font-black ${Number(row.is_low_stock) ? "text-rose-600" : "text-emerald-600"}`}>
                    {Number(row.is_low_stock) ? "Low Stock" : "Healthy"}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default ItemConsumption;
