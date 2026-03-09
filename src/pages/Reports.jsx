
import { useEffect, useMemo, useState } from "react";
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

// makeMockData removed

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

  const options = useMemo(() => {
    return {
      statuses: STATUSES,
      halls: ["All", ...HALLS],
      roomTypes: ["All", ...ROOM_TYPES],
      paymentModes: ["All", ...PAYMENT_MODES],
    };
  }, []);

  const visibleFilters = useMemo(() => {
    return {
      hall: reportType === "banquet",
      roomType: reportType === "room" || reportType === "housekeeping",
      paymentMode:
        reportType === "accounts" ||
        reportType === "restaurant" ||
        reportType === "banquet" ||
        reportType === "room",
      status: true,
    };
  }, [reportType]);

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
      if (!inDateRange(row.date, filters.dateFrom, filters.dateTo))
        return false;
      if (
        filters.status !== "All" &&
        row.status &&
        row.status !== filters.status
      )
        return false;
      if (filters.hall !== "All" && row.hall && row.hall !== filters.hall)
        return false;
      if (
        filters.roomType !== "All" &&
        row.roomType &&
        row.roomType !== filters.roomType
      )
        return false;
      if (
        filters.paymentMode !== "All" &&
        row.paymentMode &&
        row.paymentMode !== filters.paymentMode
      )
        return false;
      if (!q) return true;
      const hay = Object.values(row).join(" ").toLowerCase();
      return hay.includes(q);
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
  }, [
    reportType,
    filters.dateFrom,
    filters.dateTo,
    filters.status,
    filters.hall,
    filters.roomType,
    filters.paymentMode,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Automatically fetch when report type/filters change

  const exportCSV = () => {
    const csv = toCSV(filtered);
    if (!csv) return alert("No rows to export");
    downloadText(`report-${reportType}.csv`, csv);
  };

  const printReport = () => window.print();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#071226] via-[#081827] to-[#041019] text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white mb-1">Reports</h1>
        <div className="text-sm text-gray-500">Home / Reports</div>
        {summary && (
          <div className="mt-2 text-xs text-gray-600 font-semibold">
            Rooms: <span className="font-bold">{summary.totalRooms}</span> ·
            Hotel bookings:{" "}
            <span className="font-bold">{summary.hotelBookings}</span> ·
            Restaurant bills:{" "}
            <span className="font-bold">{summary.restaurantBills}</span> ·
            Accounts txns:{" "}
            <span className="font-bold">{summary.accountsTransactions}</span> ·
            Banquet bookings:{" "}
            <span className="font-bold">{summary.banquetBookings}</span> ·
            Attendance rows:{" "}
            <span className="font-bold">{summary.attendanceRecords}</span>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-b from-[#0f1a2b] to-[#0b1622] rounded-xl shadow-lg border border-white/5 p-7 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_auto] gap-3 items-center">
          <ReportTypeSelector
            value={reportType}
            onChange={setReportType}
            types={REPORT_TYPES}
          />

          <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-extrabold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              onClick={fetchData}
              disabled={loading}
            >
              <FaSyncAlt />
              {loading ? "Fetching..." : "Fetch Data"}
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-extrabold text-white bg-green-600 hover:bg-green-700 transition-colors"
              onClick={exportCSV}
            >
              <FaDownload />
              Export CSV
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-extrabold text-white bg-gray-900 hover:bg-black transition-colors"
              onClick={printReport}
            >
              <FaPrint />
              Print
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_auto] gap-3 items-center">
          <div className="relative w-full">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in report..."
              className="w-full pl-10 pr-4 py-2 border border-teal-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 bg-transparent text-gray-100 font-semibold"
            />
          </div>

          <div className="text-xs text-gray-500 font-semibold">
            Rows:{" "}
            <span className="font-extrabold text-gray-700">
              {filtered.length}
            </span>
            {lastFetchedAt ? (
              <span className="ml-3">
                Last fetched:{" "}
                <span className="font-extrabold text-gray-700">
                  {lastFetchedAt.toLocaleString()}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <ReportFilters
        value={filters}
        onChange={setFilters}
        visible={visibleFilters}
        options={options}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <ReportCharts reportType={reportType} rows={filtered} />
        <div className="bg-gradient-to-b from-[#0f1a2b] to-[#0b1622] rounded-xl shadow-lg border border-white/5 p-4">
          <h2 className="text-base font-extrabold text-white mb-1">
            Report Summary
          </h2>
          <div className="text-xs text-gray-300 font-semibold mb-3">
            Quick totals based on current filters (demo).
          </div>
          <SummaryPanel reportType={reportType} rows={filtered} />
        </div>
      </div>

      <ReportTable reportType={reportType} rows={filtered} loading={loading} />
    </div>
  );
};

const SummaryPanel = ({ reportType, rows }) => {
  const cards = useMemo(() => {

    const sum = (key) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    if (reportType === 'banquet') {

      return [
        { label: "Total Events", value: rows.length },
        { label: "Total Guests", value: sum("guests") },
        {
          label: "Total Amount",
          value: `₹${sum("amount").toLocaleString("en-IN")}`,
        },
      ];
    }
    if (reportType === "restaurant") {
      return [
        { label: "Total Days", value: new Set(rows.map((r) => r.date)).size },
        { label: "Total Orders", value: sum("orders") },
        {
          label: "Total Sales",
          value: `₹${sum("amount").toLocaleString("en-IN")}`,
        },
      ];
    }
    if (reportType === "housekeeping") {
      return [
        { label: "Total Rows", value: rows.length },
        { label: "Rooms Count", value: sum("rooms") },
        {
          label: "Assignees",
          value: new Set(rows.map((r) => r.assignee)).size,
        },
      ];
    }
    if (reportType === "accounts") {
      const income = rows
        .filter((r) => r.type === "Income")
        .reduce((a, r) => a + (Number(r.amount) || 0), 0);
      const expense = rows
        .filter((r) => r.type === "Expense")
        .reduce((a, r) => a + (Number(r.amount) || 0), 0);
      return [
        { label: "Income", value: `₹${income.toLocaleString("en-IN")}` },
        { label: "Expense", value: `₹${expense.toLocaleString("en-IN")}` },
        {
          label: "Net",
          value: `₹${(income - expense).toLocaleString("en-IN")}`,
        },
      ];
    }
    // room
    return [
      { label: "Total Rows", value: rows.length },
      { label: "Total Rooms", value: sum("rooms") },
      { label: "Revenue", value: `₹${sum("revenue").toLocaleString("en-IN")}` },
    ];
  }, [reportType, rows]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-transparent border border-white/5 rounded-xl p-3"
        >
          <div className="text-xs text-gray-300 font-extrabold">{c.label}</div>
          <div className="mt-1 text-lg text-white font-black">{c.value}</div>
        </div>
      ))}
    </div>
  );
};

export default Reports;
