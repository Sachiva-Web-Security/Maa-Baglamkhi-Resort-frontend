import { useEffect, useState } from "react";
import API from "../api";

const emptyFilters = {
  invoice_no: "",
  from: "",
  to: "",
  table_no: "",
  type: "",
  amount_from: "",
  amount_to: "",
  payment_mode: "",
  sort_rate: "none",
};

const formatDateTime = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const ManageData = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());

  const load = async (params = filters) => {
    setLoading(true);
    setError("");
    try {
      const q = {
        invoice_no: params.invoice_no || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
        customer: params.table_no || undefined,
        table_no: params.table_no || undefined,
        type: params.type || undefined,
        amount_from: params.amount_from || undefined,
        amount_to: params.amount_to || undefined,
        payment_mode: params.payment_mode || undefined,
        sort_rate: params.sort_rate !== "none" ? params.sort_rate : undefined,
      };
      const { data } = await API.get("/fb-invoices", { params: q });
      setRows(Array.isArray(data) ? data : []);
      setSelected(new Set());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(emptyFilters);
  }, []);

  const setF = (key) => (e) =>
    setFilters((p) => ({ ...p, [key]: e.target.value }));

  const onSearch = () => load(filters);
  const onClear = () => {
    setFilters(emptyFilters);
    load(emptyFilters);
  };

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Data</h2>
        <button type="button" style={styles.refreshBtn} onClick={() => load(filters)}>
          ⟳ Refresh
        </button>
      </div>

      <div style={styles.sectionTitle}>Search Invoice</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}

      <div style={styles.filterGrid}>
        <Field label="Invoice No">
          <input
            style={styles.input}
            placeholder="Enter Invoice No"
            value={filters.invoice_no}
            onChange={setF("invoice_no")}
          />
        </Field>
        <Field label="Invoice Date From">
          <input type="date" style={styles.input} value={filters.from} onChange={setF("from")} />
        </Field>
        <Field label="Invoice Date To">
          <input type="date" style={styles.input} value={filters.to} onChange={setF("to")} />
        </Field>
        <Field label="Table No/Customer Name">
          <input
            style={styles.input}
            placeholder="Enter Table no"
            value={filters.table_no}
            onChange={setF("table_no")}
          />
        </Field>
        <Field label="Invoice Type">
          <select style={styles.input} value={filters.type} onChange={setF("type")}>
            <option value="">All</option>
            <option value="Table">Table</option>
            <option value="Parcel">Parcel</option>
            <option value="CS">Counter Sale</option>
          </select>
        </Field>
      </div>

      <div style={{ ...styles.filterGrid, marginTop: 6 }}>
        <Field label="Bill Amount From">
          <input
            type="number"
            step="0.01"
            style={styles.input}
            value={filters.amount_from}
            onChange={setF("amount_from")}
          />
        </Field>
        <Field label="To">
          <input
            type="number"
            step="0.01"
            style={styles.input}
            value={filters.amount_to}
            onChange={setF("amount_to")}
          />
        </Field>
        <Field label="Payment Mode">
          <select style={styles.input} value={filters.payment_mode} onChange={setF("payment_mode")}>
            <option value="">All</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Wallet">Wallet</option>
          </select>
        </Field>
        <Field label="Sort Rate">
          <div style={{ display: "flex", gap: 12, alignItems: "center", height: 34 }}>
            <RadioOpt name="sort_rate" value="lowest" current={filters.sort_rate} onChange={(v) => setFilters((p) => ({ ...p, sort_rate: v }))} label="Lowest First" />
            <RadioOpt name="sort_rate" value="highest" current={filters.sort_rate} onChange={(v) => setFilters((p) => ({ ...p, sort_rate: v }))} label="Highest First" />
            <RadioOpt name="sort_rate" value="none" current={filters.sort_rate} onChange={(v) => setFilters((p) => ({ ...p, sort_rate: v }))} label="None" />
          </div>
        </Field>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button type="button" style={styles.searchBtn} onClick={onSearch}>
            🔍 Search
          </button>
          <button type="button" style={styles.clearBtn} onClick={onClear}>
            ⟲ Clear Filter
          </button>
        </div>
      </div>

      <div style={{ ...styles.tableWrap, marginTop: 14 }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.thDark, width: 36 }}>
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              <th style={styles.thDark}>Invoice#</th>
              <th style={styles.thDark}>Date</th>
              <th style={styles.thDark}>Table/Parcel/CS No</th>
              <th style={styles.thDark}>Customer</th>
              <th style={styles.thDark}>Type</th>
              <th style={styles.thDark}>Captain</th>
              <th style={styles.thDark}>Total Items</th>
              <th style={styles.thDark}>Grand Total</th>
              <th style={styles.thDark}>Payment Mode</th>
              <th style={{ ...styles.thDark, width: 80 }}>Settled?</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={11} style={styles.empty}>
                  No invoices match the filters.
                </td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const paymentLabel = `${r.payment_mode || "—"}-${Number(r.total_amount || 0).toFixed(2)}`;
              return (
                <tr key={r.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleRow(r.id)}
                    />
                  </td>
                  <td style={styles.td}>{r.invoice_no}</td>
                  <td style={styles.td}>{formatDateTime(r.invoice_date)}</td>
                  <td style={styles.td}>{r.table_label || r.table_name || "—"}</td>
                  <td style={styles.td}>{r.customer_name || ""}</td>
                  <td style={styles.td}>{r.type || "Table"}</td>
                  <td style={styles.td}>{r.captain_name || ""}</td>
                  <td style={styles.td}>{r.total_items}</td>
                  <td style={styles.td}>{Number(r.total_amount || 0).toFixed(2)}</td>
                  <td style={styles.td}>{paymentLabel}</td>
                  <td style={styles.td}>
                    <input type="checkbox" readOnly checked={!!r.settled} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <div style={styles.loading}>Loading...</div>}
      </div>

      {selected.size > 0 && (
        <div style={styles.selectedFooter}>
          {selected.size} selected
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: "#1f2d3d" }}>{label}</label>
    {children}
  </div>
);

const RadioOpt = ({ name, value, current, onChange, label }) => (
  <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
    <input
      type="radio"
      name={name}
      checked={current === value}
      onChange={() => onChange(value)}
    />
    {label}
  </label>
);

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
  sectionTitle: { fontSize: 14, fontWeight: 600, color: "#1f2d3d", marginBottom: 10 },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },

  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 10,
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
    width: "100%",
    boxSizing: "border-box",
  },
  searchBtn: {
    background: "#337ab7",
    color: "#fff",
    border: "1px solid #2e6da4",
    padding: "6px 14px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    height: 34,
  },
  clearBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#337ab7",
    padding: "6px 14px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
    height: 34,
  },

  tableWrap: { border: "1px solid #e6e8eb", borderRadius: 3, overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thDark: {
    background: "#5a6877",
    color: "#fff",
    padding: "10px 12px",
    textAlign: "left",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f0f0f0",
    color: "#2c3e50",
  },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#fafbfc" },
  empty: { padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" },
  loading: { padding: "8px 12px", color: "#6c757d", fontSize: 13 },

  selectedFooter: {
    position: "sticky",
    bottom: 0,
    background: "#1f2d3d",
    color: "#fff",
    padding: "8px 14px",
    fontSize: 13,
    marginTop: 8,
    borderRadius: 3,
  },
};

export default ManageData;
