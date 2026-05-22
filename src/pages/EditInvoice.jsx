import { useEffect, useMemo, useState } from "react";
import API from "../api";

const fmtDateTime = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const money = (n) => Number(n || 0).toFixed(2);

const EditInvoice = () => {
  const [view, setView] = useState("list"); // "list" | "edit"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [filters, setFilters] = useState({
    invoice_no: "",
    from: "",
    to: "",
    table_no: "",
    contact: "",
    customer: "",
    type: "",
  });

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [keypadFocus, setKeypadFocus] = useState({ row: 0, field: "qty" });

  const load = async (q = filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fb-invoices", { params: q });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const loadAllItems = async () => {
    try {
      const { data } = await API.get("/fb-items");
      setAllItems(Array.isArray(data) ? data : []);
    } catch {
      setAllItems([]);
    }
  };

  useEffect(() => {
    load();
    loadAllItems();
  }, []);

  const onSearch = () => load(filters);
  const onClear = () => {
    const empty = {
      invoice_no: "", from: "", to: "", table_no: "", contact: "", customer: "", type: "",
    };
    setFilters(empty);
    load(empty);
  };

  const openEdit = async (row) => {
    setError("");
    setMessage("");
    try {
      const { data } = await API.get(`/fb-invoices/${row.id}`);
      setInvoice(data);
      setItems(Array.isArray(data.items) ? data.items : []);
      setView("edit");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoice");
    }
  };

  const backToList = () => {
    setView("list");
    setInvoice(null);
    setItems([]);
    setItemSearch("");
  };

  // ---- Item line operations ----
  const setQty = (idx, delta) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const newQty = Math.max(0, Number(it.qty || 0) + delta);
        return { ...it, qty: newQty, amount: Number((newQty * Number(it.rate || 0) - Number(it.discount || 0)).toFixed(2)) };
      }),
    );
  };

  const setQtyDirect = (idx, value) => {
    const n = Number(value);
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const newQty = Number.isFinite(n) ? Math.max(0, n) : 0;
        return { ...it, qty: newQty, amount: Number((newQty * Number(it.rate || 0) - Number(it.discount || 0)).toFixed(2)) };
      }),
    );
  };

  const removeLine = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItemFromList = (it) => {
    setItems((prev) => [
      ...prev,
      {
        item_id: it.id,
        item_name: it.name,
        qty: 1,
        rate: Number(it.current_rate || 0),
        discount: 0,
        amount: Number(it.current_rate || 0),
      },
    ]);
  };

  // ---- Totals ----
  const subTotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0) - Number(it.discount || 0), 0),
    [items],
  );
  const delCh = Number(invoice?.delivery_charge || 0);
  const contCh = Number(invoice?.container_charge || 0);
  const total = subTotal + delCh + contCh;
  const netTotal = Number(invoice?.net_total ?? Math.round(total));
  const roundOff = Number((netTotal - total).toFixed(2));

  const onSave = async (alsoPrint = false) => {
    if (!invoice) return;
    setError("");
    setMessage("");
    try {
      const payload = {
        type: invoice.type,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone,
        tax_amount: invoice.tax_amount,
        discount_amount: invoice.discount_amount,
        delivery_charge: delCh,
        container_charge: contCh,
        service_charge: invoice.service_charge,
        no_service_charge: invoice.no_service_charge,
        net_total: netTotal,
        status: invoice.status,
        settled: invoice.settled,
        notes: invoice.notes,
        items: items.map((it) => ({
          item_id: it.item_id || null,
          item_name: it.item_name,
          qty: Number(it.qty || 0),
          rate: Number(it.rate || 0),
          discount: Number(it.discount || 0),
        })),
      };
      const { data } = await API.put(`/fb-invoices/${invoice.id}`, payload);
      setInvoice(data);
      setItems(Array.isArray(data.items) ? data.items : []);
      setMessage(alsoPrint ? "Saved. Sending to printer..." : "Invoice saved.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();
    if (!term) return allItems.slice(0, 25);
    return allItems
      .filter((i) => i.name.toLowerCase().includes(term) || (i.item_code || "").toLowerCase().includes(term))
      .slice(0, 50);
  }, [allItems, itemSearch]);

  const handleKeypad = (key) => {
    if (!items.length) return;
    const row = Math.min(keypadFocus.row, items.length - 1);
    const field = keypadFocus.field;
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== row) return it;
        let current = String(it[field] ?? "");
        if (key === "Clear") current = "";
        else if (key === "<-") current = current.slice(0, -1);
        else current = current + String(key);
        const num = Number(current);
        const next = {
          ...it,
          [field]: Number.isFinite(num) ? num : 0,
        };
        next.amount = Number(((next.qty || 0) * (next.rate || 0) - (next.discount || 0)).toFixed(2));
        return next;
      }),
    );
  };

  // -------- list render --------
  const renderList = () => (
    <>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Edit Invoice</h2>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Invoice No</label>
          <input
            style={styles.input}
            placeholder="Invoice No"
            value={filters.invoice_no}
            onChange={(e) => setFilters((p) => ({ ...p, invoice_no: e.target.value }))}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Invoice Date From</label>
          <input
            type="date"
            style={styles.input}
            value={filters.from}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Invoice Date To</label>
          <input
            type="date"
            style={styles.input}
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Table No</label>
          <input
            style={styles.input}
            placeholder="Enter Table no"
            value={filters.table_no}
            onChange={(e) => setFilters((p) => ({ ...p, table_no: e.target.value }))}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Contact Number</label>
          <input
            style={styles.input}
            placeholder="Search by Contact Number"
            value={filters.contact}
            onChange={(e) => setFilters((p) => ({ ...p, contact: e.target.value }))}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Guest</label>
          <input
            style={styles.input}
            placeholder="Search by Guest Name"
            value={filters.customer}
            onChange={(e) => setFilters((p) => ({ ...p, customer: e.target.value }))}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Type</label>
          <select
            style={styles.input}
            value={filters.type}
            onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
          >
            <option value="">All</option>
            <option value="Table">Table</option>
            <option value="Parcel">Parcel</option>
            <option value="CS">CS</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <button type="button" style={styles.searchBtnLink} onClick={onSearch}>
            🔍 Search
          </button>
          <button type="button" style={styles.clearBtnLink} onClick={onClear}>
            ⟲ Clear Filter
          </button>
        </div>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.thDark }}>Date</th>
              <th style={styles.thDark}>Table/Parcel/CS No</th>
              <th style={styles.thDark}>Customer</th>
              <th style={styles.thDark}>Type</th>
              <th style={styles.thDark}>Captain</th>
              <th style={{ ...styles.thDark, textAlign: "right" }}>Total Items</th>
              <th style={{ ...styles.thDark, textAlign: "right" }}>Grand Total</th>
              <th style={{ ...styles.thDark, textAlign: "center" }}>Settled?</th>
              <th style={{ ...styles.thDark, textAlign: "center", width: 80 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={9} style={styles.empty}>
                  No invoices match the filters.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td style={styles.td}>{fmtDateTime(row.invoice_date)}</td>
                <td style={styles.td}>{row.table_label || row.table_name || ""}</td>
                <td style={styles.td}>{row.customer_name || ""}</td>
                <td style={styles.td}>{row.type}</td>
                <td style={styles.td}>{row.captain_name || ""}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>{row.total_items}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>
                  {Number(row.net_total || row.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <input type="checkbox" checked={!!row.settled} readOnly />
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <button
                    type="button"
                    style={styles.editBtn}
                    onClick={() => openEdit(row)}
                    title="Edit"
                  >
                    ✎
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div style={styles.loading}>Loading...</div>}
    </>
  );

  // -------- edit render --------
  const KEYS = [
    ["7", "8", "9", ""],
    ["4", "5", "6", "Clear"],
    ["1", "2", "3", "<-"],
    [".", "", "Discount", "Rate"],
  ];

  const renderEdit = () => (
    <>
      <div style={{ ...styles.topbar, paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "baseline", flexWrap: "wrap" }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {invoice?.table_label || ""}
          </div>
          <div style={{ fontSize: 13 }}>
            <b>Invoice#</b> {invoice?.invoice_no}
          </div>
          <div style={{ fontSize: 13 }}>
            <b>Date</b> {fmtDateTime(invoice?.invoice_date)}
          </div>
        </div>
        <button type="button" style={styles.refreshBtn} onClick={backToList}>← Back</button>
      </div>
      <div style={{ fontSize: 13, color: "#5b6b7c", marginBottom: 6 }}>
        {invoice?.captain_name}
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 12 }}>
        {/* Left: items grid */}
        <div style={styles.editGrid}>
          <table style={styles.itemsTable}>
            <thead>
              <tr>
                <th style={styles.thDark}>Item Name</th>
                <th style={{ ...styles.thDark, width: 180 }}>Quantity</th>
                <th style={{ ...styles.thDark, textAlign: "right", width: 90 }}>Rate</th>
                <th style={{ ...styles.thDark, textAlign: "right", width: 70 }}>Disc</th>
                <th style={{ ...styles.thDark, textAlign: "right", width: 100 }}>Amount</th>
                <th style={{ ...styles.thDark, width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={styles.empty}>No items. Add items from the right panel.</td>
                </tr>
              )}
              {items.map((it, idx) => (
                <tr key={idx} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>{it.item_name}</td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button type="button" style={styles.qtyPlus} onClick={() => setQty(idx, +1)}>+</button>
                      <input
                        style={{ ...styles.input, width: 90, textAlign: "center" }}
                        value={Number(it.qty || 0).toFixed(3)}
                        onFocus={() => setKeypadFocus({ row: idx, field: "qty" })}
                        onChange={(e) => setQtyDirect(idx, e.target.value)}
                      />
                      {it.qty > 1 && (
                        <button type="button" style={styles.qtyMinus} onClick={() => setQty(idx, -1)}>−</button>
                      )}
                    </div>
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{money(it.rate)}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{money(it.discount)}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{money(it.amount)}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button type="button" style={styles.miniDelete} title="Remove" onClick={() => removeLine(idx)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: item name search panel */}
        <div>
          <label style={styles.label}>Item Name</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              style={{ ...styles.input, flex: 1 }}
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Type to filter..."
            />
            <button type="button" style={styles.searchBtnSolid} onClick={() => { /* live filter */ }}>
              Search
            </button>
            <button type="button" style={styles.clearBtnSolid} onClick={() => setItemSearch("")}>
              Clear
            </button>
          </div>
          <div style={styles.itemListWrap}>
            {filteredItems.length === 0 && (
              <div style={styles.empty}>No items match.</div>
            )}
            {filteredItems.map((it) => (
              <button
                key={it.id}
                type="button"
                style={styles.itemListRow}
                onClick={() => addItemFromList(it)}
              >
                <span>{it.name}</span>
                <span style={{ color: "#5b6b7c" }}>{money(it.current_rate)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: keypad + totals */}
      <div style={styles.bottomBar}>
        <div style={styles.itemsTotal}>Items: {items.length}</div>

        <div style={styles.bottomGrid}>
          <div style={styles.keypad}>
            {KEYS.map((row, ri) =>
              row.map((k, ci) => (
                <button
                  key={`${ri}-${ci}`}
                  type="button"
                  style={{
                    ...styles.key,
                    ...(k === "Clear" ? styles.keyClear : {}),
                    ...(k === "<-" ? styles.keyBack : {}),
                    ...(["Discount", "Rate"].includes(k) ? styles.keySpecial : {}),
                    visibility: k === "" ? "hidden" : "visible",
                  }}
                  onClick={() => {
                    if (k === "Discount") setKeypadFocus((p) => ({ ...p, field: "discount" }));
                    else if (k === "Rate") setKeypadFocus((p) => ({ ...p, field: "rate" }));
                    else if (k !== "") handleKeypad(k);
                  }}
                >
                  {k}
                </button>
              )),
            )}
          </div>

          <div style={styles.totalsPanel}>
            <div style={styles.totalsRow}>
              <span>Food</span>
              <span>{money(subTotal)}</span>
            </div>
            <div style={styles.totalsRow}>
              <span>Sub Total</span>
              <span>{money(subTotal)}</span>
            </div>
            <div style={{ ...styles.totalsRow, ...styles.totalsRowDark, gap: 6 }}>
              <span>Del. Ch.</span>
              <input
                style={styles.totalsInput}
                value={String(delCh.toFixed(3))}
                onChange={(e) => setInvoice((p) => ({ ...p, delivery_charge: e.target.value }))}
              />
              <span>Cont. Ch.</span>
              <input
                style={styles.totalsInput}
                value={String(contCh.toFixed(3))}
                onChange={(e) => setInvoice((p) => ({ ...p, container_charge: e.target.value }))}
              />
            </div>
            <div style={{ ...styles.totalsRow, ...styles.totalsRowDark }}>
              <span>Round Off.</span>
              <span>{money(roundOff)}</span>
              <span style={{ marginLeft: 12 }}>Net Total</span>
              <span style={{ fontWeight: 700 }}>{money(netTotal)}</span>
            </div>
          </div>
        </div>

        <div style={styles.actionBar}>
          <button type="button" style={styles.ncBtn}>NC</button>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={!!invoice?.no_service_charge}
              onChange={(e) =>
                setInvoice((p) => ({ ...p, no_service_charge: e.target.checked }))
              }
            />
            No Ser. Charge?
          </label>
          <span style={styles.originalTotal}>
            Original Bill Total: {money(invoice?.original_bill_total || netTotal)}
          </span>
          <div style={{ flex: 1 }} />
          <button type="button" style={styles.discountBtn}>🏷 Discount</button>
          <button type="button" style={styles.saveBtn} onClick={() => onSave(false)}>💾 Save</button>
          <button type="button" style={styles.saveBtn} onClick={() => onSave(true)}>🖨 Save & Print</button>
          <button type="button" style={styles.iconBtn} title="Print only">🖨</button>
        </div>
      </div>
    </>
  );

  return (
    <div style={styles.page}>
      {view === "list" ? renderList() : renderEdit()}
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
    gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr",
    gap: 12,
    padding: 12,
    background: "#fafbfc",
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    marginBottom: 12,
  },
  filterField: { display: "flex", flexDirection: "column" },
  filterLabel: { fontSize: 12, fontWeight: 600, color: "#1f2d3d", marginBottom: 4 },
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
  searchBtnLink: {
    background: "transparent",
    border: "none",
    color: "#337ab7",
    fontSize: 13,
    cursor: "pointer",
    padding: "6px 4px",
  },
  clearBtnLink: {
    background: "transparent",
    border: "none",
    color: "#337ab7",
    fontSize: 13,
    cursor: "pointer",
    padding: "6px 4px",
  },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  tableWrap: { border: "1px solid #e6e8eb", borderRadius: 3, overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thDark: {
    background: "#1f2d3d",
    color: "#fff",
    borderBottom: "1px solid #1f2d3d",
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
  editBtn: {
    background: "#5bc0de",
    border: "1px solid #46b8da",
    color: "#fff",
    width: 32,
    height: 28,
    borderRadius: 3,
    fontSize: 14,
    cursor: "pointer",
  },
  empty: { padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },

  // edit view
  editGrid: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    overflow: "auto",
    maxHeight: "55vh",
  },
  itemsTable: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  qtyPlus: {
    background: "#5bc0de", border: "1px solid #46b8da", color: "#fff",
    width: 28, height: 28, borderRadius: 3, fontSize: 14, cursor: "pointer",
  },
  qtyMinus: {
    background: "#5bc0de", border: "1px solid #46b8da", color: "#fff",
    width: 28, height: 28, borderRadius: 3, fontSize: 16, cursor: "pointer",
  },
  miniDelete: {
    background: "#d9534f", border: "1px solid #d43f3a", color: "#fff",
    width: 22, height: 22, borderRadius: 3, fontSize: 13, cursor: "pointer",
  },
  label: { fontSize: 12, fontWeight: 600, color: "#1f2d3d", marginBottom: 4, display: "block" },
  searchBtnSolid: {
    background: "#f0ad4e", border: "1px solid #eea236", color: "#fff",
    padding: "4px 14px", borderRadius: 3, fontSize: 13, cursor: "pointer",
  },
  clearBtnSolid: {
    background: "#f7d046", border: "1px solid #e5be2c", color: "#5a4500",
    padding: "4px 14px", borderRadius: 3, fontSize: 13, cursor: "pointer",
  },
  itemListWrap: {
    marginTop: 8,
    maxHeight: "48vh",
    overflowY: "auto",
    border: "1px solid #e6e8eb",
    borderRadius: 3,
  },
  itemListRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    background: "#fff",
    border: "none",
    borderBottom: "1px solid #f0f0f0",
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  },

  bottomBar: { marginTop: 12 },
  itemsTotal: { fontSize: 12, color: "#5b6b7c", marginBottom: 4 },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr)",
    gap: 12,
    alignItems: "stretch",
  },
  keypad: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 6,
    background: "#fff",
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    padding: 8,
  },
  key: {
    background: "#fff",
    border: "1px solid #ccc",
    padding: "10px 0",
    fontSize: 14,
    cursor: "pointer",
    borderRadius: 3,
  },
  keyClear: { background: "#fff", border: "1px solid #ccc" },
  keyBack:  { background: "#fff", border: "1px solid #ccc" },
  keySpecial: { background: "#e6e8eb", border: "1px solid #ccc", fontSize: 12 },

  totalsPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    background: "#fff",
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    padding: 8,
  },
  totalsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    padding: "4px 6px",
  },
  totalsRowDark: {
    background: "#1f2d3d",
    color: "#fff",
    borderRadius: 3,
    flexWrap: "wrap",
  },
  totalsInput: {
    height: 28,
    width: 80,
    border: "1px solid #ced4da",
    borderRadius: 3,
    padding: "2px 6px",
    fontSize: 13,
    color: "#2c3e50",
    background: "#fff",
  },

  actionBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #e6e8eb",
    flexWrap: "wrap",
  },
  ncBtn: {
    background: "#d9534f", border: "1px solid #d43f3a", color: "#fff",
    padding: "6px 14px", borderRadius: 3, fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  checkboxLabel: {
    display: "flex", alignItems: "center", gap: 6, fontSize: 13,
  },
  originalTotal: { color: "#d9534f", fontWeight: 600, fontSize: 13 },
  discountBtn: {
    background: "#5bc0de", border: "1px solid #46b8da", color: "#fff",
    padding: "6px 14px", borderRadius: 3, fontSize: 13, cursor: "pointer",
  },
  saveBtn: {
    background: "#5cb85c", border: "1px solid #4cae4c", color: "#fff",
    padding: "6px 14px", borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  iconBtn: {
    background: "#fff", border: "1px solid #ccc", color: "#333",
    padding: "6px 10px", borderRadius: 3, fontSize: 13, cursor: "pointer",
  },
};

export default EditInvoice;
