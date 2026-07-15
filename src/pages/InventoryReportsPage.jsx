// src/pages/InventoryReportsPage.jsx
// Inventory Reports — read-only tabs: Low Stock, Expiring Items, Vendor Insights, Stock Ledger

import React, { useEffect, useMemo, useState } from "react";
import {
  FaChartBar,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaTruck,
  FaBook,
  FaSearch,
  FaCheckCircle,
  FaExclamationTriangle as FaWarn,
} from "react-icons/fa";

import API from "../api";

/* ── style tokens ── */
const c = {
  ink: "#132A2A",
  paper: "#F6F5F1",
  panel: "#FFFFFF",
  line: "#E4E1D8",
  teal: "#0F6E64",
  tealDeep: "#0B4F48",
  amber: "#C8791A",
  rose: "#B5442E",
  muted: "#6B6F66",
  text: "#1C231F",
};

const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap bg-[#0B4F48] text-white hover:bg-[#0F6E64]";

const STATUS_STYLES = {
  low: "bg-[#F3E9DD] text-[#C8791A]",
  ok: "bg-[#E4F0EE] text-[#0B4F48]",
  expired: "bg-[#F5DFDA] text-[#B5442E]",
  warning: "bg-[#F3E9DD] text-[#C8791A]",
};
const statusBadge = (s) => {
  const key = String(s || "").toLowerCase().trim().replace(/\s+/g, "-");
  const style = STATUS_STYLES[key] || "bg-[#F6F5F1] text-[#6B6F66]";
  return `inline-block rounded-full px-3 py-1 text-[11px] font-bold ${style}`;
};

/* ── Report tabs ── */
const REPORT_TABS = [
  { key: "low-stock", label: "Low Stock", icon: FaExclamationTriangle, endpoint: "/inventory/alerts/low-stock" },
  { key: "expiring", label: "Expiring Items", icon: FaCalendarAlt, endpoint: "/inventory/alerts/expiring?days=30" },
  { key: "vendor-insights", label: "Vendor Insights", icon: FaTruck, endpoint: "/inventory/vendor-insights" },
  { key: "stock-ledger", label: "Stock Ledger", icon: FaBook, endpoint: "/inventory/stock-ledger" },
];

/* ── Column definitions per report ── */
const COLUMNS_MAP = {
  "low-stock": [
    { key: "name", label: "Item" },
    { key: "category", label: "Category" },
    { key: "stock", label: "Current Stock" },
    { key: "reorder_point", label: "Reorder Level" },
    { key: "unit", label: "Unit" },
    { key: "branch", label: "Store" },
  ],
  expiring: [
    { key: "name", label: "Item" },
    { key: "category", label: "Category" },
    { key: "expiry", label: "Expiry Date" },
    { key: "stock", label: "Stock" },
    { key: "unit", label: "Unit" },
    { key: "branch", label: "Store" },
  ],
  "vendor-insights": [
    { key: "vendor", label: "Vendor" },
    { key: "totalOrders", label: "Orders" },
    { key: "totalSpend", label: "Total Spend" },
    { key: "pendingPayments", label: "Pending" },
  ],
  "stock-ledger": [
    { key: "entry_date", label: "Date" },
    { key: "item_name", label: "Item" },
    { key: "direction", label: "Type" },
    { key: "quantity", label: "Qty" },
    { key: "vendor_name", label: "Vendor" },
    { key: "amount", label: "Amount" },
    { key: "balance_after", label: "Balance" },
    { key: "remarks", label: "Remarks" },
  ],
};

/* ─────────────────────────────── Main Component ─────────────────────────────── */

const InventoryReportsPage = () => {
  const [activeTab, setActiveTab] = useState("low-stock");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const activeConfig = REPORT_TABS.find((t) => t.key === activeTab);

  const fetchReport = async (tabKey) => {
    setLoading(true);
    try {
      const tab = REPORT_TABS.find((t) => t.key === tabKey);
      if (!tab) return;
      const res = await API.get(tab.endpoint);
      setReportData(Array.isArray(res.data) ? res.data : []);
    } catch {
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab]);

  const columns = COLUMNS_MAP[activeTab] || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reportData;
    return reportData.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val && String(val).toLowerCase().includes(q);
      }),
    );
  }, [reportData, search, columns]);

  const formatCell = (row, colKey) => {
    const val = row[colKey];
    if (colKey === "amount" || colKey === "totalSpend" || colKey === "rate") {
      return val ? `₹${Number(val).toFixed(2)}` : "-";
    }
    if (colKey === "stock" || colKey === "quantity" || colKey === "balance_after") {
      return val ?? "-";
    }
    if (colKey === "entry_date" || colKey === "expiry" || colKey === "expected_date") {
      if (!val) return "-";
      return String(val).slice(0, 10);
    }
    return val || "-";
  };

  const renderValue = (row, colKey) => {
    const val = row[colKey];
    if (colKey === "status" || colKey === "direction") {
      return <span className={statusBadge(val)}>{val || "-"}</span>;
    }
    return <span>{formatCell(row, colKey)}</span>;
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: c.paper, color: c.text, padding: "22px 22px 60px" }}>
      {/* ── top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-white font-bold text-[18px]"
              style={{ background: c.tealDeep }}
            >
              <FaChartBar />
            </div>
            <div>
              <h1 className="text-[21px] font-semibold m-0 leading-tight" style={{ letterSpacing: "0.2px" }}>
                Inventory Reports
              </h1>
              <p className="m-0 text-[12px]" style={{ color: c.muted }}>
                Stock value, alerts, vendor spend and audit trail
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── tab pills ── */}
      <div className="flex gap-2 flex-wrap mb-4">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setSearch(""); }}
              className={`inline-flex items-center gap-1.5 rounded-[20px] px-3.5 py-1.5 text-[12.5px] font-medium transition-all border ${
                isActive
                  ? "bg-[#0B4F48] text-white border-[#0B4F48]"
                  : "bg-white border-[#E4E1D8] text-[#1C231F] hover:bg-[#F6F5F1]"
              }`}
            >
              <Icon className="text-xs" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── search ── */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F66] text-xs" />
          <input
            className={`${c.paper === "#F6F5F1" ? "bg-white" : ""} w-full rounded-[9px] border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] font-medium text-[#1C231F] pl-9 shadow-sm transition-all duration-200 placeholder:text-[#6B6F66] placeholder:font-medium focus:border-[#0F6E64] focus:outline-none focus:outline-2 focus:outline-offset-1 focus:outline-[#0F6E64]`}
            placeholder={`Search ${activeConfig?.label.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── stat cards for low-stock and expiring ── */}
      {(activeTab === "low-stock" || activeTab === "expiring") && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white border border-[#E4E1D8] rounded-[12px] p-4">
            <div className="text-[26px] font-semibold leading-tight">{filtered.length}</div>
            <div className="text-[12px] text-[#6B6F66] mt-1">{activeTab === "low-stock" ? "Low stock items" : "Expiring items"}</div>
          </div>
          <div className="bg-white border border-[#E4E1D8] rounded-[12px] p-4">
            <div className="text-[26px] font-semibold leading-tight">
              {filtered.reduce((sum, r) => sum + (Number(r.stock || 0)), 0)}
            </div>
            <div className="text-[12px] text-[#6B6F66] mt-1">Total units affected</div>
          </div>
        </div>
      )}

      {/* ── table ── */}
      <div className="bg-white border border-[#E4E1D8] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-[13px]">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E1D8]">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="py-10 text-center text-[#6B6F66]">
                    Loading report data…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="text-center py-9 text-[#6B6F66]">
                      <b className="block text-[14.5px] text-[#1C231F] mb-1">No data available</b>
                      <span className="text-[13px]">Data will appear here once there is activity in the system.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={i} className="hover:bg-[#F6F5F1]/50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="py-2.5 pr-3">
                        {renderValue(row, col.key)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryReportsPage;
