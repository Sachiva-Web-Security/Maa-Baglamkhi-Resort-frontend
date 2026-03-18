import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChartLine,
  FaDownload,
  FaFileInvoice,
  FaPrint,
  FaSearch,
  FaSyncAlt,
} from "react-icons/fa";

import ReportCharts from "../components/Reports/ReportCharts";
import ReportFilters from "../components/Reports/ReportFilters";
import ReportTable from "../components/Reports/ReportTable";
import ReportTypeSelector from "../components/Reports/ReportTypeSelector";
import API from "../api";

const REPORT_TYPES = [
  { id: "room", label: "Room", note: "Occupancy and stay performance" },
  { id: "banquet", label: "Banquet", note: "Events, halls and settlement" },
  { id: "restaurant", label: "Restaurant", note: "Orders and food sales" },
  { id: "housekeeping", label: "Housekeeping", note: "Room status and staff load" },
  { id: "accounts", label: "Accounts", note: "Income, expense and net flow" },
  { id: "all-bills", label: "All Bills", note: "Combined billing across modules" },
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
  "Posted",
];

const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;

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

function getPrimaryValue(reportType, rows) {
  if (reportType === "banquet") {
    return formatCurrency(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
  }
  if (reportType === "restaurant") {
    return formatCurrency(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
  }
  if (reportType === "accounts" || reportType === "all-bills") {
    return formatCurrency(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
  }
  if (reportType === "housekeeping") {
    return String(rows.reduce((sum, row) => sum + (Number(row.rooms) || 0), 0));
  }
  return formatCurrency(rows.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0));
}

function getInsight(reportType, rows) {
  if (!rows.length) {
    return "Current filters ke liye koi report row available nahi hai.";
  }

  if (reportType === "banquet") {
    const topHall = rows.reduce(
      (best, row) =>
        Number(row.amount || 0) > Number(best.amount || 0) ? row : best,
      rows[0]
    );
    return `Top banquet entry ${topHall.hall || "Hall"} se aa rahi hai with ${formatCurrency(topHall.amount)}.`;
  }

  if (reportType === "restaurant") {
    const busiest = rows.reduce(
      (best, row) =>
        Number(row.amount || 0) > Number(best.amount || 0) ? row : best,
      rows[0]
    );
    return `Restaurant ka strongest billing day ${busiest.date || "selected period"} hai with ${formatCurrency(busiest.amount)}.`;
  }

  if (reportType === "accounts") {
    const income = rows
      .filter((row) => row.type === "Income")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const expense = rows
      .filter((row) => row.type === "Expense")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    return `Net position ${formatCurrency(income - expense)} hai for selected account transactions.`;
  }

  if (reportType === "housekeeping") {
    const open = rows.filter((row) => row.status === "Vacant Dirty").length;
    return `${open} rooms abhi immediate cleaning attention demand kar rahe hain.`;
  }

  if (reportType === "all-bills") {
    const topBill = rows.reduce(
      (best, row) =>
        Number(row.amount || 0) > Number(best.amount || 0) ? row : best,
      rows[0]
    );
    return `Highest bill ${topBill.source || "module"} source se hai at ${formatCurrency(topBill.amount)}.`;
  }

  const active = rows.filter((row) => row.status === "Occupied").length;
  return `${active} room bookings occupied status mein hain within the selected range.`;
}

const SummaryPanel = ({ cards }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {cards.map((card) => (
      <div
        key={card.label}
        className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {card.label}
        </div>
        <div className="mt-3 text-2xl font-black text-slate-900">{card.value}</div>
        <div className="mt-2 text-sm text-slate-500">{card.note}</div>
      </div>
    ))}
  </div>
);

const Reports = () => {
  const [reportType, setReportType] = useState("room");
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: todayISO(),
    status: "All",
    hall: "All",
    roomType: "All",
    paymentMode: "All",
  });

  const reportMeta = useMemo(
    () => REPORT_TYPES.find((item) => item.id === reportType),
    [reportType]
  );

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
        reportType === "room" ||
        reportType === "all-bills",
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
    setError("");

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
      setError("Report data load nahi ho paya. Please refresh karke dobara try karein.");
    } finally {
      setLoading(false);
    }
  }, [filters, reportType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    const csv = toCSV(filtered);
    if (!csv) {
      window.alert("No rows to export");
      return;
    }
    downloadText(`report-${reportType}-${todayISO()}.csv`, csv);
  };

  const printReport = () => window.print();

  const applyQuickRange = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);

    setFilters((prev) => ({
      ...prev,
      dateFrom: d.toISOString().slice(0, 10),
      dateTo: todayISO(),
    }));
  };

  const summaryCards = useMemo(() => {
    const rowsCount = filtered.length;
    const primaryValue = getPrimaryValue(reportType, filtered);
    const uniqueDays = new Set(filtered.map((row) => row.date).filter(Boolean)).size;
    const activeStatuses = new Set(filtered.map((row) => row.status).filter(Boolean)).size;

    return [
      {
        label: "Visible Rows",
        value: rowsCount,
        note: "Filters aur search ke baad current visible report rows.",
      },
      {
        label: "Primary Total",
        value: primaryValue,
        note: reportType === "housekeeping" ? "Total room count in selected rows." : "Selected report type ka main business total.",
      },
      {
        label: "Active Days",
        value: uniqueDays || "--",
        note: "Kitne distinct dates ke records abhi screen par dikh rahe hain.",
      },
      {
        label: "Status Mix",
        value: activeStatuses || "--",
        note: "Selected rows mein unique operational statuses.",
      },
    ];
  }, [filtered, reportType]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1260px] space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Insight Studio
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  Reports built for faster daily decisions
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                  Dashboard jaisa clean analytics workspace jahan se room, banquet,
                  restaurant, housekeeping, accounts aur combined billing reports
                  ek jagah se manage ho sakein.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FaSyncAlt />
                  {loading ? "Refreshing..." : "Refresh Reports"}
                </button>
                <button
                  type="button"
                  onClick={exportCSV}
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md"
                >
                  Export Current Report
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: "Current Type", value: reportMeta?.label || reportType },
                { label: "Visible Rows", value: filtered.length || 0 },
                {
                  label: "Last Update",
                  value: lastFetchedAt
                    ? lastFetchedAt.toLocaleTimeString()
                    : "--",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  Report Type
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Select analytics module
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {reportMeta?.note || "Operational report module"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => applyQuickRange(days)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
                  >
                    Last {days} days
                  </button>
                ))}
              </div>
            </div>
            <ReportTypeSelector
              value={reportType}
              onChange={setReportType}
              types={REPORT_TYPES}
            />
          </div>

          <div className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Insight Snapshot
            </p>
            <div className="mt-2 flex items-start gap-3">
              <span className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                <FaChartLine />
              </span>
              <div>
                <div className="text-lg font-bold text-slate-900">Smart takeaway</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {getInsight(reportType, filtered)}
                </p>
              </div>
            </div>
            {summary ? (
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Rooms", summary.totalRooms],
                  ["Hotel", summary.hotelBookings],
                  ["Banquet", summary.banquetBookings],
                  ["Restaurant", summary.restaurantBills],
                  ["Accounts", summary.accountsTransactions],
                  ["Attendance", summary.attendanceRecords],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-3"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {label}
                    </div>
                    <div className="mt-2 text-lg font-black text-slate-900">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <SummaryPanel cards={summaryCards} />

        <section className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="relative w-full">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guest, hall, source, payment mode, amount..."
                className="w-full rounded-[20px] border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(13,148,136,0.24)] transition hover:-translate-y-0.5"
              >
                <FaDownload />
                Export CSV
              </button>
              <button
                type="button"
                onClick={printReport}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
              >
                <FaPrint />
                Print
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
              <FaCalendarAlt />
              {filters.dateFrom || "--"} to {filters.dateTo || "--"}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-2">
              Rows: <strong className="text-slate-900">{filtered.length}</strong>
            </span>
            {lastFetchedAt ? (
              <span className="rounded-full bg-slate-50 px-3 py-2">
                Last fetched:{" "}
                <strong className="text-slate-900">
                  {lastFetchedAt.toLocaleString()}
                </strong>
              </span>
            ) : null}
          </div>
        </section>

        <ReportFilters
          value={filters}
          onChange={setFilters}
          visible={visibleFilters}
          options={options}
        />

        {error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <ReportCharts reportType={reportType} rows={filtered} />

          <div className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <FaFileInvoice />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  Report Summary
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Filter-based metrics
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[20px] border border-slate-200/80 bg-slate-50 p-4"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {card.label}
                  </div>
                  <div className="mt-2 text-xl font-black text-slate-900">
                    {card.value}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{card.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ReportTable reportType={reportType} rows={filtered} loading={loading} />
      </div>
    </div>
  );
};

export default Reports;
