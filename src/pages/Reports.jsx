import { useEffect, useMemo, useState } from 'react';
import { FaSearch, FaDownload, FaPrint, FaSyncAlt } from 'react-icons/fa';
import API from "../api";

const REPORT_TYPES = [
  { id: 'room', label: 'Room' },
  { id: 'banquet', label: 'Banquet' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'housekeeping', label: 'Housekeeping' },
  { id: 'accounts', label: 'Accounts' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function inDateRange(dateISO, fromISO, toISO) {
  if (!dateISO) return false;
  if (fromISO && dateISO < fromISO) return false;
  if (toISO && dateISO > toISO) return false;
  return true;
}

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Reports = () => {
  const [reportType, setReportType] = useState('room');
  const [query, setQuery] = useState('');
  const [summary, setSummary] = useState(null);
  const [filters] = useState({
    dateFrom: '',
    dateTo: todayISO(),
    status: 'All',
    hall: 'All',
    roomType: 'All',
    paymentMode: 'All',
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

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
      if (!inDateRange(row.date, filters.dateFrom, filters.dateTo)) return false;
      if (filters.status !== 'All' && row.status && row.status !== filters.status) return false;
      if (filters.hall !== 'All' && row.hall && row.hall !== filters.hall) return false;
      if (filters.roomType !== 'All' && row.roomType && row.roomType !== filters.roomType) return false;
      if (filters.paymentMode !== 'All' && row.paymentMode && row.paymentMode !== filters.paymentMode) return false;
      if (!q) return true;
      const hay = Object.values(row).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [data, filters, query]);

  const fetchData = async () => {
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
          paymentMode: filters.paymentMode
        }
      });
      setData(res.data || []);
      setLastFetchedAt(new Date());
    } catch (err) {
      console.error("Error fetching report data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [reportType]);

  const exportCSV = () => {
    const csv = toCSV(filtered);
    if (!csv) return alert('No rows to export');
    downloadText(`report-${reportType}.csv`, csv);
  };

  const printReport = () => window.print();

  const getColumns = () => {
    switch (reportType) {
      case 'banquet':
        return ['Date', 'Hall', 'Event', 'Guests', 'Status', 'Amount'];
      case 'restaurant':
        return ['Date', 'Table', 'Items', 'Status', 'Amount'];
      case 'housekeeping':
        return ['Room', 'Type', 'Status', 'Assignee', 'Notes'];
      case 'accounts':
        return ['Date', 'Type', 'Description', 'Amount', 'Mode'];
      default:
        return ['Room', 'Guest', 'Check In', 'Check Out', 'Status', 'Amount'];
    }
  };

  const getCellValue = (row, key) => {
    const value = row[key];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && key === 'amount') return '₹' + value.toLocaleString('en-IN');
    return String(value);
  };

  return (
    <div className="p-4">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Reports</h1>
        {summary && (
          <div className="mt-2 simple-text-muted font-semibold text-sm">
            Hotel: {summary.totalRooms || 0} rooms, {summary.hotelBookings || 0} bookings |
            Restaurant: {summary.restaurantBills || 0} bills |
            Banquet: {summary.banquetBookings || 0} events |
            Accounts: {summary.accountsTransactions || 0} transactions
          </div>
        )}
      </div>

      <div className="simple-card mb-4">
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <div className="simple-tabs">
            {REPORT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setReportType(t.id)}
                className={`simple-tab${reportType === t.id ? ' simple-tab-active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <button className="simple-btn simple-btn-primary" onClick={fetchData} disabled={loading}>
              <FaSyncAlt /> {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button className="simple-btn simple-btn-success" onClick={exportCSV}>
              <FaDownload /> Export CSV
            </button>
            <button className="simple-btn simple-btn-gray" onClick={printReport}>
              <FaPrint /> Print
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center mb-3">
          <div className="flex items-center gap-2">
            <FaSearch className="text-gray-400" />
            <input type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="simple-input"
            />
          </div>
          <span className="text-sm text-gray-500">
            Rows: <b>{filtered.length}</b> {lastFetchedAt && <span>| Fetched: {lastFetchedAt.toLocaleTimeString()}</span>}
          </span>
        </div>
      </div>

      <div className="simple-card">
        <h2 className="text-lg font-bold mb-3">{reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h2>
        {loading ? (
          <div className="text-center p-8 text-gray-500">Loading data...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No data found. Click Refresh to load data.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="simple-table">
              <thead>
                <tr>
                  {getColumns().map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((row, idx) => (
                  <tr key={idx}>
                    {getColumns().map((col) => {
                      const key = col.toLowerCase().replace(' ', '');
                      return <td key={key}>{getCellValue(row, key)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div className="text-center p-2 text-sm text-gray-500">
                Showing first 100 of {filtered.length} rows
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
