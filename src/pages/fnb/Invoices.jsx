import { useEffect, useState } from "react";
import API from "../../api";

const statusBadge = (status) => {
  switch (status) {
    case "paid":
      return { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" };
    case "cancelled":
      return { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" };
    default:
      return { background: "#fff4d6", color: "#8a6d3b", border: "1px solid #f1d97a" };
  }
};

const fmtDate = (d) => {
  if (!d) return "";
  const iso = String(d).slice(0, 10);
  const [y, m, day] = iso.split("-");
  return y && m && day ? `${day}/${m}/${y}` : iso;
};

const fmtMoney = (n) => Number(n || 0).toFixed(2);

const Invoices = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    invoice_no: "",
    customer: "",
    status: "",
  });

  const load = async (q = filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fb-invoices", {
        params: {
          from: q.from || "",
          to: q.to || "",
          invoice_no: q.invoice_no || "",
          customer: q.customer || "",
          status: q.status || "",
        },
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSearch = () => load(filters);
  const onClear = () => {
    const empty = { from: "", to: "", invoice_no: "", customer: "", status: "" };
    setFilters(empty);
    load(empty);
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete invoice ${row.invoice_no}?`)) return;
    setError("");
    try {
      await API.delete(`/fb-invoices/${row.id}`);
      setMessage("Invoice deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const totals = rows.reduce(
    (acc, r) => ({
      sub: acc.sub + Number(r.sub_total || 0),
      tax: acc.tax + Number(r.tax_amount || 0),
      disc: acc.disc + Number(r.discount_amount || 0),
      total: acc.total + Number(r.total_amount || 0),
    }),
    { sub: 0, tax: 0, disc: 0, total: 0 },
  );

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Invoices</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={() => load()}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.refreshBtn} disabled title="Coming soon">
            Print
          </button>
          <button type="button" style={styles.refreshBtn} disabled title="Coming soon">
            Export
          </button>
        </div>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>From</label>
          <input
            type="date"
            style={styles.input}
            value={filters.from}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>To</label>
          <input
            type="date"
            style={styles.input}
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Invoice No</label>
          <input
            style={styles.input}
            value={filters.invoice_no}
            onChange={(e) => setFilters((p) => ({ ...p, invoice_no: e.target.value }))}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Customer</label>
          <input
            style={styles.input}
            value={filters.customer}
            onChange={(e) => setFilters((p) => ({ ...p, customer: e.target.value }))}
            placeholder="Name or phone"
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Status</label>
          <select
            style={styles.input}
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <button type="button" style={styles.searchBtn} onClick={onSearch}>Search</button>
          <button type="button" style={styles.clearBtn} onClick={onClear}>Clear</button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Invoices</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>#</th>
              <th style={styles.th}>Invoice No</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Table</th>
              <th style={styles.th}>Captain</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Sub Total</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Tax</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Discount</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Total</th>
              <th style={styles.th}>Payment</th>
              <th style={styles.th}>Status</th>
              <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={14} style={styles.empty}>
                  No invoices match the selected filters.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{row.invoice_no}</td>
                <td style={styles.td}>{fmtDate(row.invoice_date)}</td>
                <td style={styles.td}>{row.customer_name || "—"}</td>
                <td style={styles.td}>{row.customer_phone || ""}</td>
                <td style={styles.td}>{row.table_name || ""}</td>
                <td style={styles.td}>{row.captain_name || ""}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>{fmtMoney(row.sub_total)}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>{fmtMoney(row.tax_amount)}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>{fmtMoney(row.discount_amount)}</td>
                <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                  {fmtMoney(row.total_amount)}
                </td>
                <td style={styles.td}>{row.payment_mode || ""}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...statusBadge(row.status) }}>
                    {row.status}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: "right" }}>
                  <button
                    type="button"
                    style={styles.viewBtn}
                    title="View / Edit"
                    onClick={() => window.location.href = `/edit-invoice?id=${row.id}`}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    style={styles.deleteBtn}
                    onClick={() => onDelete(row)}
                    title="Delete"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={7} style={{ ...styles.tdFoot, textAlign: "right" }}>
                  Totals
                </td>
                <td style={{ ...styles.tdFoot, textAlign: "right" }}>{fmtMoney(totals.sub)}</td>
                <td style={{ ...styles.tdFoot, textAlign: "right" }}>{fmtMoney(totals.tax)}</td>
                <td style={{ ...styles.tdFoot, textAlign: "right" }}>{fmtMoney(totals.disc)}</td>
                <td style={{ ...styles.tdFoot, textAlign: "right", fontWeight: 700 }}>
                  {fmtMoney(totals.total)}
                </td>
                <td colSpan={3} style={styles.tdFoot} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {loading && <div style={styles.loading}>Loading...</div>}
    </div>
  );
};

const styles = {
  page: {
    padding: "20px 28px 40px",
    background: "#fff",
    minHeight: "100%",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#2c3e50",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #e6e8eb",
    paddingBottom: 8,
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600, color: "#1f2d3d" },
  refreshBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#333",
    padding: "5px 12px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
  },
  filterBar: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto",
    gap: 12,
    padding: 12,
    background: "#fafbfc",
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    marginBottom: 12,
  },
  filterField: { display: "flex", flexDirection: "column" },
  filterLabel: { fontSize: 12, fontWeight: 600, color: "#1f2d3d", marginBottom: 4 },
  searchBtn: {
    background: "#f0ad4e",
    border: "1px solid #eea236",
    color: "#fff",
    padding: "6px 16px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    height: 34,
  },
  clearBtn: {
    background: "#f7d046",
    border: "1px solid #e5be2c",
    color: "#5a4500",
    padding: "6px 16px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    height: 34,
  },
  subtitle: { fontSize: 13, color: "#5b6b7c", marginBottom: 8 },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  tableWrap: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    overflow: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1200 },
  th: {
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    padding: "10px 12px",
    textAlign: "left",
    fontWeight: 600,
    color: "#1f2d3d",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f0f0f0",
    color: "#2c3e50",
    whiteSpace: "nowrap",
  },
  tdFoot: {
    padding: "10px 12px",
    background: "#f7f7f7",
    borderTop: "1px solid #e6e8eb",
    color: "#1f2d3d",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#fafbfc" },
  badge: {
    padding: "2px 10px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "capitalize",
  },
  input: {
    height: 34,
    border: "1px solid #ced4da",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 13,
    background: "#fff",
    color: "#2c3e50",
    outline: "none",
  },
  viewBtn: {
    background: "#5bc0de",
    border: "1px solid #46b8da",
    color: "#fff",
    width: 28,
    height: 26,
    borderRadius: 3,
    fontSize: 13,
    marginRight: 4,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#d9534f",
    border: "1px solid #d43f3a",
    color: "#fff",
    width: 28,
    height: 26,
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
  },
  empty: { padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },
};

export default Invoices;
