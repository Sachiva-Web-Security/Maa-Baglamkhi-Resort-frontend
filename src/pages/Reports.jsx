import { useEffect, useMemo, useState, useCallback } from "react";
import { FaSearch, FaDownload, FaPrint, FaSyncAlt } from "react-icons/fa";
import ReportTypeSelector from "../components/Reports/ReportTypeSelector";
import ReportFilters from "../components/Reports/ReportFilters";
import ReportTable from "../components/Reports/ReportTable";
import ReportCharts from "../components/Reports/ReportCharts";
import API from "../api";

const REPORT_TYPES = [
  { id: "room", label: "Room" },
  { id: "banquet", label: "Banquet" },
  { id: "restaurant", label: "Restaurant" },
  { id: "housekeeping", label: "Housekeeping" },
  { id: "accounts", label: "Accounts" },
];

const PAYMENT_MODES = ["Cash", "Card", "UPI", "Bank Transfer"];
const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Executive"];
const HALLS = [
  "Grand Ballroom",
  "Garden Banquet",
  "Crystal Hall",
  "Board Room",
];
const STATUSES = [
  "All",
  "Pending",
  "Confirmed",
  "Completed",
  "Billed",
  "Vacant Dirty",
  "Vacant Clean",
  "Occupied",
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function inDateRange(dateISO, fromISO, toISO) {
  if (!dateISO) return false;
  if (fromISO && dateISO < fromISO) return false;
  if (toISO && dateISO > toISO) return false;
  return true;
}

function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;

const Reports = () => {
  const [reportType, setReportType] = useState("room");
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: todayISO(),
    status: "All",
    hall: "All",
    roomType: "All",
    paymentMode: "All",
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const options = useMemo(
    () => ({
      statuses: STATUSES,
      halls: ["All", ...HALLS],
      roomTypes: ["All", ...ROOM_TYPES],
      paymentModes: ["All", ...PAYMENT_MODES],
    }),
    []
  );

  const visibleFilters = useMemo(
    () => ({
      hall: reportType === "banquet",
      roomType: reportType === "room" || reportType === "housekeeping",
      paymentMode:
        reportType === "accounts" ||
        reportType === "restaurant" ||
        reportType === "banquet" ||
        reportType === "room",
      status: true,
    }),
    [reportType]
  );

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await API.get("/reports/summary");
        setSummary(res.data);
      } catch (err) {
        console.error("Error loading report summary", err);
      }
    };
    fetchSummary();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (!inDateRange(row.date, filters.dateFrom, filters.dateTo)) {
        return false;
      }
      if (filters.status !== "All" && row.status && row.status !== filters.status) {
        return false;
      }
      if (filters.hall !== "All" && row.hall && row.hall !== filters.hall) {
        return false;
      }
      if (
        filters.roomType !== "All" &&
        row.roomType &&
        row.roomType !== filters.roomType
      ) {
        return false;
      }
      if (
        filters.paymentMode !== "All" &&
        row.paymentMode &&
        row.paymentMode !== filters.paymentMode
      ) {
        return false;
      }
      if (!q) return true;
      return Object.values(row).join(" ").toLowerCase().includes(q);
    });
  }, [data, filters, query]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/reports/data", {
        params: {
          type: reportType,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          status: filters.status,
          hall: filters.hall,
          roomType: filters.roomType,
          paymentMode: filters.paymentMode,
        },
      });
      setData(res.data || []);
      setLastFetchedAt(new Date());
    } catch (err) {
      console.error("Error fetching report data", err);
    } finally {
      setLoading(false);
    }
  }, [filters, reportType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    const csv = toCSV(filtered);
    if (!csv) return alert("No rows to export");
    downloadText(`report-${reportType}.csv`, csv);
  };

  const printReport = () => window.print();

  return (
    <div className="resort-page">
      <div className="resort-shell">
        <section className="resort-hero">
          <div className="resort-hero-content lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="resort-eyebrow">Insight Studio</p>
              <h1 className="resort-title">Reports built for quick decisions</h1>
              <p className="resort-subtitle">
                Compare room, banquet, restaurant, accounts, and housekeeping
                activity from one cleaner responsive analytics workspace.
              </p>
              {summary && (
                <div className="text-xs font-semibold text-slate-200/85">
                  Rooms: <span className="font-bold">{summary.totalRooms}</span> ·
                  Hotel bookings: <span className="font-bold"> {summary.hotelBookings}</span> ·
                  Restaurant bills: <span className="font-bold"> {summary.restaurantBills}</span> ·
                  Accounts txns: <span className="font-bold"> {summary.accountsTransactions}</span> ·
                  Banquet bookings: <span className="font-bold"> {summary.banquetBookings}</span> ·
                  Attendance rows: <span className="font-bold"> {summary.attendanceRecords}</span>
                </div>
              )}
            </div>

            <div className="resort-stat-grid">
              <div className="resort-stat">
                <span className="resort-stat-label">Current Type</span>
                <span className="resort-stat-value text-[1.1rem] capitalize">
                  {reportType}
                </span>
              </div>
              <div className="resort-stat">
                <span className="resort-stat-label">Visible Rows</span>
                <span className="resort-stat-value">{filtered.length}</span>
              </div>
              <div className="resort-stat">
                <span className="resort-stat-label">Last Update</span>
                <span className="resort-stat-value text-[1rem]">
                  {lastFetchedAt ? lastFetchedAt.toLocaleTimeString() : "--"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="resort-panel">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
            <ReportTypeSelector
              value={reportType}
              onChange={setReportType}
              types={REPORT_TYPES}
            />

            <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
              <button
                className="resort-button inline-flex items-center gap-2"
                onClick={fetchData}
                disabled={loading}
              >
                <FaSyncAlt />
                {loading ? "Fetching..." : "Fetch Data"}
              </button>
              <button
                className="resort-button inline-flex items-center gap-2 bg-[linear-gradient(135deg,rgba(5,150,105,0.96),rgba(16,185,129,0.92))]"
                onClick={exportCSV}
              >
                <FaDownload />
                Export CSV
              </button>
              <button
                className="resort-button resort-button-soft inline-flex items-center gap-2"
                onClick={printReport}
              >
                <FaPrint />
                Print
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(320px,1fr)_auto] lg:items-center">
            <div className="relative w-full">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search in report..."
                className="resort-search"
              />
            </div>

            <div className="text-xs font-semibold text-slate-300">
              Rows: <span className="font-extrabold text-white">{filtered.length}</span>
              {lastFetchedAt ? (
                <span className="ml-3">
                  Last fetched:{" "}
                  <span className="font-extrabold text-white">
                    {lastFetchedAt.toLocaleString()}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <ReportFilters
          value={filters}
          onChange={setFilters}
          visible={visibleFilters}
          options={options}
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ReportCharts reportType={reportType} rows={filtered} />
          <div className="resort-panel">
            <h2 className="resort-panel-title mb-1">Report Summary</h2>
            <div className="mb-3 text-xs font-semibold text-gray-300">
              Quick totals based on current filters.
            </div>
            <SummaryPanel reportType={reportType} rows={filtered} />
          </div>
        </section>

        <ReportTable reportType={reportType} rows={filtered} loading={loading} />
      </div>
    </div>
  );
};

const SummaryPanel = ({ reportType, rows }) => {
  const cards = useMemo(() => {
    const sum = (key) => rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);

    if (reportType === "banquet") {
      return [
        { label: "Total Events", value: rows.length },
        { label: "Total Guests", value: sum("guests") },
        { label: "Total Amount", value: formatCurrency(sum("amount")) },
      ];
    }

    if (reportType === "restaurant") {
      return [
        { label: "Total Days", value: new Set(rows.map((row) => row.date)).size },
        { label: "Total Orders", value: sum("orders") },
        { label: "Total Sales", value: formatCurrency(sum("amount")) },
      ];
    }

    if (reportType === "housekeeping") {
      return [
        { label: "Total Rows", value: rows.length },
        { label: "Rooms Count", value: sum("rooms") },
        { label: "Assignees", value: new Set(rows.map((row) => row.assignee)).size },
      ];
    }

    if (reportType === "accounts") {
      const income = rows
        .filter((row) => row.type === "Income")
        .reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
      const expense = rows
        .filter((row) => row.type === "Expense")
        .reduce((acc, row) => acc + (Number(row.amount) || 0), 0);

      return [
        { label: "Income", value: formatCurrency(income) },
        { label: "Expense", value: formatCurrency(expense) },
        { label: "Net", value: formatCurrency(income - expense) },
      ];
    }

    return [
      { label: "Total Rows", value: rows.length },
      { label: "Total Rooms", value: sum("rooms") },
      { label: "Revenue", value: formatCurrency(sum("revenue")) },
    ];
  }, [reportType, rows]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
        >
          <div className="text-xs font-extrabold text-gray-300">{card.label}</div>
          <div className="mt-1 text-lg font-black text-white">{card.value}</div>
        </div>
      ))}
    </div>
  );
};

export default Reports;
