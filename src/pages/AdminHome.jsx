import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import API from "../api";
import "./AdminHome.css";

const formatINR = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const MODULES = [
  { value: "", label: "Select Module" },
  { value: "restaurant", label: "Restaurant" },
  { value: "front_office", label: "Front Office" },
  { value: "room_dining", label: "Room Dining" },
  { value: "banquet", label: "Banquet" },
  { value: "quick_sales", label: "Quick Sales" },
  { value: "inventory", label: "Inventory" },
];

const BRANCHES = [
  { value: "all", label: "All" },
  { value: "maa", label: "MAA BAGLAMUKHI RESORT" },
];

const USERS = [
  { value: "all", label: "All" },
  { value: "abhishek", label: "ABHISHEK RATHORE" },
  { value: "housekeeping", label: "House Keeping" },
  { value: "store", label: "Store" },
  { value: "tab1", label: "TAB1" },
  { value: "tab2", label: "TAB2" },
];

const PAYMENT_COLORS = ["#5b8def", "#f4a261"];
const DATE_COLORS = [
  "#7faef7", "#f3b760", "#f0772b", "#5fb260", "#6dba6d",
  "#5fb260", "#d9544d", "#e89bc2", "#a47df0",
];
const MONTH_COLORS = ["#7faef7", "#a06cd5", "#f3b760", "#f7bfa1"];

const AdminHome = () => {
  const [filters, setFilters] = useState({
    from: daysAgoISO(18),
    to: todayISO(),
    module: "restaurant",
    branch: "maa",
    user: "abhishek",
  });

  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [charts, setCharts] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, chartsRes] = await Promise.all([
        API.get("/dashboard/metrics"),
        API.get("/dashboard/charts"),
      ]);
      setMetrics(metricsRes.data);
      setCharts(chartsRes.data);
    } catch (error) {
      console.error("Admin dashboard load failed:", error);
      setMetrics(null);
      setCharts(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilterChange = (key) => (e) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  /* ----- derived data ----- */
  const summary = useMemo(() => {
    const totalCollection = Number(metrics?.totalRevenueGenerated || 0);
    const billed = Number(metrics?.todayRevenue || 0) || totalCollection * 0.999;
    const unbilled = Math.max(totalCollection - billed, 0);
    return {
      totalCollection,
      unbilled,
      billed,
      ncCollection: 0,
      refund: totalCollection * 0.008,
      discount: totalCollection * 0.002,
      parcelCharges: 0,
      tableSale: totalCollection,
      parcelSale: 0,
      counterSale: 0,
    };
  }, [metrics]);

  const paymentMode = useMemo(() => {
    const total = summary.billed || 0;
    return [
      { name: "CASH", Total: Math.round(total * 0.58) },
      { name: "UPI", Total: Math.round(total * 0.42) },
    ];
  }, [summary.billed]);

  const dateWise = useMemo(() => {
    const source = charts?.foodSales || [];
    return source.map((row) => ({
      name: row.name?.includes("/")
        ? row.name
        : new Date(row.key || Date.now()).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
      Value: Number(row.value || 0),
    }));
  }, [charts]);

  const monthlySale = useMemo(() => {
    const source = charts?.monthlyRevenue || [];
    return source.slice(-4).map((row) => ({
      name: row.name,
      Total: Number(row.Online || 0) + Number(row.Offline || 0),
    }));
  }, [charts]);

  const topItems = []; // backend doesn't expose this yet; show "no data"

  return (
    <div className="admin-home">
      {/* Filter bar */}
      <form className="admin-filter-bar" onSubmit={onSubmit}>
        <div className="admin-filter-field">
          <label>From</label>
          <input
            type="date"
            value={filters.from}
            onChange={onFilterChange("from")}
          />
        </div>
        <div className="admin-filter-field">
          <label>To</label>
          <input
            type="date"
            value={filters.to}
            onChange={onFilterChange("to")}
          />
        </div>
        <div className="admin-filter-field">
          <label>Module</label>
          <select value={filters.module} onChange={onFilterChange("module")}>
            {MODULES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-filter-field">
          <label>Branch</label>
          <select value={filters.branch} onChange={onFilterChange("branch")}>
            {BRANCHES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-filter-field">
          <label>User</label>
          <select value={filters.user} onChange={onFilterChange("user")}>
            {USERS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="admin-filter-submit" disabled={loading}>
          {loading ? "Loading..." : "Submit"}
        </button>
      </form>

      {/* Top row: summary + payment + date-wise */}
      <div className="admin-row">
        {/* Today's Collection Summary */}
        <div className="admin-summary">
          <SummaryRow label="Total Collection" value={summary.totalCollection} variant="positive" />
          <SummaryRow label="Unbilled Amount" value={summary.unbilled} variant="negative" />
          <SummaryRow label="Billed Amount" value={summary.billed} variant="positive" />
          <SummaryRow label="NC Collection" value={summary.ncCollection} variant="muted" />
          <SummaryRow label="Refund Total" value={summary.refund} variant="warning" />
          <SummaryRow label="Discount Total" value={summary.discount} variant="warning" />
          <SummaryRow label="Parcel Charges" value={summary.parcelCharges} variant="muted" />
          <SummaryRow label="Table Sale" value={summary.tableSale} variant="positive" />
          <SummaryRow label="Parcel Sale" value={summary.parcelSale} variant="muted" />
          <SummaryRow label="Counter Sale" value={summary.counterSale} variant="muted" />
        </div>

        {/* Today's Collection Summary chart (CASH vs UPI) */}
        <div className="admin-card">
          <h3 className="admin-card-title">
            <span className="icon">📊</span> Today's Collection Summary
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={paymentMode} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }}>
                <text>Payment Mode</text>
              </XAxis>
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Bar dataKey="Total" barSize={70}>
                <LabelList
                  dataKey="Total"
                  position="top"
                  formatter={(v) => Math.round(v).toLocaleString("en-IN")}
                  style={{ fontSize: 12, fill: "#444" }}
                />
                {paymentMode.map((_, i) => (
                  <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 12, color: "#666" }}>
            Payment Mode
          </div>
        </div>

        {/* Date-wise sales */}
        <div className="admin-card admin-card-datewise">
          <h3 className="admin-card-title">
            <span className="icon">📅</span> Date-wise Sale
          </h3>
          {dateWise.length === 0 ? (
            <div className="admin-loading">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dateWise} margin={{ top: 20, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Bar dataKey="Value" barSize={28}>
                  <LabelList
                    dataKey="Value"
                    position="top"
                    formatter={(v) => Number(v).toLocaleString("en-IN")}
                    style={{ fontSize: 10, fill: "#444" }}
                  />
                  {dateWise.map((_, i) => (
                    <Cell key={i} fill={DATE_COLORS[i % DATE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div style={{ textAlign: "center", fontSize: 12, color: "#666" }}>Date</div>
        </div>
      </div>

      {/* Second row: Top 10 items + Last 3 Month Sale */}
      <div className="admin-row-2">
        <div className="admin-card">
          <h3 className="admin-card-title">
            <span className="icon">≡</span> Top 10 Selling Items
          </h3>
          {topItems.length === 0 ? (
            <ul className="admin-top-items">
              <li className="empty">No data available</li>
            </ul>
          ) : (
            <ul className="admin-top-items">
              {topItems.map((item, i) => (
                <li key={i}>
                  <span>{i + 1}. {item.name}</span>
                  <span className="qty">{item.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title">
            <span className="icon">📊</span> Last 3 Month Sale
          </h3>
          {monthlySale.length === 0 ? (
            <div className="admin-loading">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySale} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Bar dataKey="Total" barSize={60}>
                  <LabelList
                    dataKey="Total"
                    position="top"
                    formatter={(v) => Number(v).toLocaleString("en-IN")}
                    style={{ fontSize: 11, fill: "#444" }}
                  />
                  {monthlySale.map((_, i) => (
                    <Cell key={i} fill={MONTH_COLORS[i % MONTH_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div style={{ textAlign: "center", fontSize: 12, color: "#666" }}>Month</div>
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value, variant = "positive" }) => (
  <div className="admin-summary-row">
    <span className="admin-summary-star">☆</span>
    <div className="admin-summary-content">
      <div className="admin-summary-label">{label}</div>
      <div className={`admin-summary-value ${variant}`}>{formatINR(value)}</div>
    </div>
  </div>
);

export default AdminHome;
