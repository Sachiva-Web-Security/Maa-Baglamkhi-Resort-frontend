import { useEffect, useState } from "react";
import API from "../../api";

const emptyFilters = { stock_location_id: "", item_group_id: "", name: "" };

const emptyForm = {
  id: null,
  stock_location_id: "",
  ingredient_id: "",
  qty: "0",
  rate: "0",
  total_value: "0",
  entry_date: new Date().toISOString().slice(0, 10),
  notes: "",
};

const OpeningStockEntry = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [locations, setLocations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async (params = filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/inventory-opening-stock", {
        params: {
          stock_location_id: params.stock_location_id || undefined,
          item_group_id: params.item_group_id || undefined,
          name: params.name || undefined,
        },
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load opening stock");
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [l, g, i] = await Promise.all([
        API.get("/inventory-stock-locations"),
        API.get("/fb-item-groups").catch(() => ({ data: [] })),
        API.get("/inventory-ingredients").catch(() => ({ data: [] })),
      ]);
      setLocations(Array.isArray(l.data) ? l.data : []);
      setGroups(Array.isArray(g.data) ? g.data : []);
      setIngredients(Array.isArray(i.data) ? i.data : []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load(emptyFilters);
    loadLookups();
  }, []);

  const setF = (key) => (e) =>
    setFilters((p) => ({ ...p, [key]: e.target.value }));

  const onSearch = () => load(filters);
  const onClear = () => {
    setFilters(emptyFilters);
    load(emptyFilters);
  };

  const openAdd = () =>
    setPanel({
      ...emptyForm,
      stock_location_id: filters.stock_location_id || "",
    });
  const openEdit = (row) =>
    setPanel({
      id: row.id,
      stock_location_id: row.stock_location_id ? String(row.stock_location_id) : "",
      ingredient_id: row.ingredient_id ? String(row.ingredient_id) : "",
      qty: String(row.qty ?? "0"),
      rate: String(row.rate ?? "0"),
      total_value: String(row.total_value ?? "0"),
      entry_date: (row.entry_date || "").toString().slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      notes: row.notes || "",
    });
  const closePanel = () => setPanel(null);

  const recalcTotal = (next) => {
    const q = Number(next.qty) || 0;
    const r = Number(next.rate) || 0;
    return { ...next, total_value: (q * r).toFixed(2) };
  };

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!panel.ingredient_id) {
      setError("Ingredient is required");
      return;
    }
    const payload = {
      stock_location_id: panel.stock_location_id ? Number(panel.stock_location_id) : null,
      ingredient_id: Number(panel.ingredient_id),
      qty: Number(panel.qty) || 0,
      rate: Number(panel.rate) || 0,
      total_value: Number(panel.total_value) || 0,
      entry_date: panel.entry_date,
      notes: panel.notes,
    };
    setSaving(true);
    try {
      if (panel.id) {
        await API.put(`/inventory-opening-stock/${panel.id}`, payload);
        setMessage("Opening stock updated.");
      } else {
        await API.post("/inventory-opening-stock", payload);
        setMessage("Opening stock added.");
      }
      closePanel();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete this entry for "${row.ingredient_name}"?`)) return;
    setError("");
    try {
      await API.delete(`/inventory-opening-stock/${row.id}`);
      setMessage("Entry deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Stock</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={() => load(filters)}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
        </div>
      </div>

      <div style={styles.filterCard}>
        <div style={styles.filterGrid}>
          <FilterField label="Stock Location">
            <select
              style={styles.input}
              value={filters.stock_location_id}
              onChange={setF("stock_location_id")}
            >
              <option value="">Select</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Item Group">
            <select
              style={styles.input}
              value={filters.item_group_id}
              onChange={setF("item_group_id")}
            >
              <option value="">All</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Item Name">
            <input style={styles.input} value={filters.name} onChange={setF("name")} />
          </FilterField>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
            <button type="button" style={styles.searchBtn} onClick={onSearch}>Search</button>
            <button type="button" style={styles.clearBtn} onClick={onClear}>Clear</button>
          </div>
        </div>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: panel
            ? "minmax(0, 1fr) minmax(380px, 1fr)"
            : "minmax(0, 1fr)",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div>
          {rows.length === 0 && !loading ? (
            <div style={styles.emptyRow}>No records found.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: 40 }}>#</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Stock Location</th>
                    <th style={styles.th}>Item Group</th>
                    <th style={styles.th}>Ingredient</th>
                    <th style={styles.th}>Unit</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Qty</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Rate</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Total Value</th>
                    <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>{formatDate(row.entry_date)}</td>
                      <td style={styles.td}>{row.stock_location_name || "—"}</td>
                      <td style={styles.td}>{row.item_group_name || "—"}</td>
                      <td style={styles.td}>{row.ingredient_name}</td>
                      <td style={styles.td}>{row.unit_name || "—"}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{Number(row.qty).toFixed(3)}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{Number(row.rate).toFixed(2)}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{Number(row.total_value).toFixed(2)}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <button type="button" style={styles.editBtn} onClick={() => openEdit(row)} title="Edit">✎</button>
                        <button type="button" style={styles.deleteBtn} onClick={() => onDelete(row)} title="Delete">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {loading && <div style={styles.loading}>Loading...</div>}
        </div>

        {panel && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span>{panel.id ? "Edit Opening Stock" : "Add Opening Stock"}</span>
              <button type="button" onClick={closePanel} style={styles.panelClose} title="Close">×</button>
            </div>
            <div style={styles.panelBody}>
              <Field label="Entry Date">
                <input
                  type="date"
                  style={styles.input}
                  value={panel.entry_date}
                  onChange={(e) => setPanel((p) => ({ ...p, entry_date: e.target.value }))}
                />
              </Field>
              <Field label="Stock Location">
                <select
                  style={styles.input}
                  value={panel.stock_location_id}
                  onChange={(e) => setPanel((p) => ({ ...p, stock_location_id: e.target.value }))}
                >
                  <option value="">— Select —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ingredient" required>
                <select
                  style={styles.input}
                  value={panel.ingredient_id}
                  onChange={(e) => setPanel((p) => ({ ...p, ingredient_id: e.target.value }))}
                >
                  <option value="">— Select —</option>
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}{i.item_group_name ? ` (${i.item_group_name})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <div style={styles.grid2}>
                <Field label="Qty">
                  <input
                    type="number"
                    step="0.001"
                    style={styles.input}
                    value={panel.qty}
                    onChange={(e) =>
                      setPanel((p) => recalcTotal({ ...p, qty: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Rate">
                  <input
                    type="number"
                    step="0.01"
                    style={styles.input}
                    value={panel.rate}
                    onChange={(e) =>
                      setPanel((p) => recalcTotal({ ...p, rate: e.target.value }))
                    }
                  />
                </Field>
              </div>
              <Field label="Total Value">
                <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={panel.total_value}
                  onChange={(e) => setPanel((p) => ({ ...p, total_value: e.target.value }))}
                />
              </Field>
              <Field label="Notes">
                <input
                  style={styles.input}
                  value={panel.notes}
                  onChange={(e) => setPanel((p) => ({ ...p, notes: e.target.value }))}
                />
              </Field>
              <div style={{ marginTop: 6 }}>
                <button type="button" style={styles.saveBtn} onClick={onSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const formatDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const FilterField = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: "#1f2d3d" }}>{label}</label>
    {children}
  </div>
);

const Field = ({ label, required, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: "#1f2d3d" }}>
      {label}
      {required && <span style={{ color: "#d9534f" }}> *</span>}
    </label>
    {children}
  </div>
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
  newBtn: {
    background: "#5bc0de",
    border: "1px solid #46b8da",
    color: "#fff",
    padding: "5px 12px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  filterCard: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    padding: 12,
    background: "#fff",
    marginBottom: 14,
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto",
    gap: 10,
  },
  searchBtn: {
    background: "#337ab7",
    color: "#fff",
    border: "1px solid #2e6da4",
    padding: "6px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    height: 34,
  },
  clearBtn: {
    background: "#f0ad4e",
    color: "#fff",
    border: "1px solid #eea236",
    padding: "6px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    height: 34,
  },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  emptyRow: {
    padding: "10px 12px",
    borderTop: "1px solid #e6e8eb",
    borderBottom: "1px solid #e6e8eb",
    color: "#5b6b7c",
    fontSize: 13,
  },

  tableWrap: { border: "1px solid #e6e8eb", borderRadius: 3, overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    padding: "10px 12px",
    textAlign: "left",
    fontWeight: 600,
    color: "#1f2d3d",
    whiteSpace: "nowrap",
  },
  td: { padding: "10px 12px", borderBottom: "1px solid #f0f0f0", color: "#2c3e50" },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#fafbfc" },
  editBtn: {
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
  loading: { padding: "8px 12px", color: "#6c757d", fontSize: 13 },

  panel: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    background: "#fff",
    overflow: "hidden",
  },
  panelHeader: {
    padding: "10px 14px",
    background: "#fff",
    borderBottom: "1px solid #e6e8eb",
    fontSize: 14,
    fontWeight: 600,
    color: "#1f2d3d",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelClose: {
    background: "transparent",
    border: "none",
    fontSize: 20,
    cursor: "pointer",
    color: "#888",
    lineHeight: 1,
  },
  panelBody: { padding: 16, display: "flex", flexDirection: "column", gap: 10 },
  grid2: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 },
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
  saveBtn: {
    background: "#5cb85c",
    color: "#fff",
    border: "1px solid #4cae4c",
    padding: "6px 22px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};

export default OpeningStockEntry;
