import { useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";

const emptyFilters = { item_group_id: "", item_code: "", name: "" };

const emptyForm = {
  id: null,
  item_group_id: "",
  item_code: "",
  name: "",
  unit_id: "",
  current_stock: "0",
  reorder_level: "0",
  avg_rate: "0",
  vendor_id: "",
  is_active: true,
};

const Ingredients = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async (params = filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/inventory-ingredients", {
        params: {
          item_group_id: params.item_group_id || undefined,
          item_code: params.item_code || undefined,
          name: params.name || undefined,
        },
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load ingredients");
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [g, u, v] = await Promise.all([
        API.get("/fb-item-groups"),
        API.get("/fb-units").catch(() => ({ data: [] })),
        API.get("/inventory-vendors").catch(() => ({ data: [] })),
      ]);
      setGroups(Array.isArray(g.data) ? g.data : []);
      setUnits(Array.isArray(u.data) ? u.data : []);
      setVendors(Array.isArray(v.data) ? v.data : []);
    } catch {
      // ignore lookup failures
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
    setPanel({ ...emptyForm, item_group_id: filters.item_group_id || "" });
  const openEdit = (row) =>
    setPanel({
      id: row.id,
      item_group_id: row.item_group_id ? String(row.item_group_id) : "",
      item_code: row.item_code || "",
      name: row.name || "",
      unit_id: row.unit_id ? String(row.unit_id) : "",
      current_stock: String(row.current_stock ?? "0"),
      reorder_level: String(row.reorder_level ?? "0"),
      avg_rate: String(row.avg_rate ?? "0"),
      vendor_id: row.vendor_id ? String(row.vendor_id) : "",
      is_active: row.is_active !== false,
    });
  const closePanel = () => setPanel(null);

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!panel.name?.trim()) {
      setError("Ingredient name is required");
      return;
    }
    const payload = {
      item_group_id: panel.item_group_id ? Number(panel.item_group_id) : null,
      item_code: panel.item_code.trim() || null,
      name: panel.name.trim(),
      unit_id: panel.unit_id ? Number(panel.unit_id) : null,
      current_stock: Number(panel.current_stock) || 0,
      reorder_level: Number(panel.reorder_level) || 0,
      avg_rate: Number(panel.avg_rate) || 0,
      vendor_id: panel.vendor_id ? Number(panel.vendor_id) : null,
      is_active: panel.is_active ? 1 : 0,
    };
    setSaving(true);
    try {
      if (panel.id) {
        await API.put(`/inventory-ingredients/${panel.id}`, payload);
        setMessage("Ingredient updated.");
      } else {
        await API.post("/inventory-ingredients", payload);
        setMessage("Ingredient added.");
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
    if (!confirm(`Delete ingredient "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/inventory-ingredients/${row.id}`);
      setMessage("Ingredient deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Ingredients</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={() => load(filters)}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Ingredients</div>

      <div style={styles.filterGrid}>
        <FilterField label="Item Group">
          <SearchableSelect
            value={filters.item_group_id}
            placeholder="Select Parent"
            options={groups.map((g) => ({ id: g.id, label: g.name }))}
            onChange={(v) => setFilters((p) => ({ ...p, item_group_id: v }))}
          />
        </FilterField>
        <FilterField label="Item Code">
          <input style={styles.input} value={filters.item_code} onChange={setF("item_code")} />
        </FilterField>
        <FilterField label="Item Name">
          <input style={styles.input} value={filters.name} onChange={setF("name")} />
        </FilterField>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <button type="button" style={styles.searchBtn} onClick={onSearch}>Search</button>
          <button type="button" style={styles.clearBtn} onClick={onClear}>Clear</button>
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
                    <th style={styles.th}>Item Group</th>
                    <th style={styles.th}>Item Code</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Unit</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Current Stock</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Reorder Level</th>
                    <th style={styles.th}>Vendor</th>
                    <th style={{ ...styles.th, width: 80 }}>Active</th>
                    <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
                    >
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>{row.item_group_name || "—"}</td>
                      <td style={styles.td}>{row.item_code || "—"}</td>
                      <td style={styles.td}>{row.name}</td>
                      <td style={styles.td}>{row.unit_name || "—"}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {Number(row.current_stock).toFixed(3)}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {Number(row.reorder_level).toFixed(3)}
                      </td>
                      <td style={styles.td}>{row.vendor_name || "—"}</td>
                      <td style={styles.td}>
                        <span style={row.is_active ? styles.badgeActive : styles.badgeInactive}>
                          {row.is_active ? "Yes" : "No"}
                        </span>
                      </td>
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
              <span>{panel.id ? "Edit Ingredient" : "Add Ingredient"}</span>
              <button type="button" onClick={closePanel} style={styles.panelClose} title="Close">×</button>
            </div>
            <div style={styles.panelBody}>
              <Field label="Ingredient Name" required>
                <input
                  style={styles.input}
                  autoFocus
                  value={panel.name}
                  onChange={(e) => setPanel((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Onion"
                />
              </Field>
              <Field label="Item Group">
                <select
                  style={styles.input}
                  value={panel.item_group_id}
                  onChange={(e) => setPanel((p) => ({ ...p, item_group_id: e.target.value }))}
                >
                  <option value="">— Select —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </Field>
              <div style={styles.grid2}>
                <Field label="Item Code">
                  <input
                    style={styles.input}
                    value={panel.item_code}
                    onChange={(e) => setPanel((p) => ({ ...p, item_code: e.target.value }))}
                  />
                </Field>
                <Field label="Unit">
                  <select
                    style={styles.input}
                    value={panel.unit_id}
                    onChange={(e) => setPanel((p) => ({ ...p, unit_id: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div style={styles.grid2}>
                <Field label="Current Stock">
                  <input
                    type="number"
                    step="0.001"
                    style={styles.input}
                    value={panel.current_stock}
                    onChange={(e) => setPanel((p) => ({ ...p, current_stock: e.target.value }))}
                  />
                </Field>
                <Field label="Reorder Level">
                  <input
                    type="number"
                    step="0.001"
                    style={styles.input}
                    value={panel.reorder_level}
                    onChange={(e) => setPanel((p) => ({ ...p, reorder_level: e.target.value }))}
                  />
                </Field>
              </div>
              <div style={styles.grid2}>
                <Field label="Avg Rate">
                  <input
                    type="number"
                    step="0.01"
                    style={styles.input}
                    value={panel.avg_rate}
                    onChange={(e) => setPanel((p) => ({ ...p, avg_rate: e.target.value }))}
                  />
                </Field>
                <Field label="Vendor">
                  <select
                    style={styles.input}
                    value={panel.vendor_id}
                    onChange={(e) => setPanel((p) => ({ ...p, vendor_id: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <label style={styles.activeRow}>
                <input
                  type="checkbox"
                  checked={!!panel.is_active}
                  onChange={(e) => setPanel((p) => ({ ...p, is_active: e.target.checked }))}
                />
                Active
              </label>
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

const SearchableSelect = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selected = options.find((o) => String(o.id) === String(value));

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        style={{ ...styles.input, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ color: selected ? "#2c3e50" : "#999" }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ color: "#888" }}>▾</span>
      </button>
      {open && (
        <div style={styles.dropdown}>
          <div style={{ padding: 6, borderBottom: "1px solid #e6e8eb", display: "flex", alignItems: "center", gap: 4 }}>
            <input
              autoFocus
              style={{ ...styles.input, height: 28, flex: 1 }}
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span style={{ fontSize: 13, color: "#888" }}>🔍</span>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            <div
              style={styles.dropdownItem}
              onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
            >
              {placeholder}
            </div>
            {filtered.map((o) => (
              <div
                key={o.id}
                style={{
                  ...styles.dropdownItem,
                  ...(String(o.id) === String(value) ? styles.dropdownItemActive : {}),
                }}
                onClick={() => { onChange(String(o.id)); setOpen(false); setSearch(""); }}
              >
                {o.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 10, color: "#888", fontSize: 12 }}>No matches</div>
            )}
          </div>
        </div>
      )}
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
  subtitle: { fontSize: 13, fontWeight: 600, color: "#1f2d3d", marginBottom: 8 },

  filterGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto",
    gap: 10,
    marginBottom: 14,
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
  badgeActive: {
    background: "#e6f4ea",
    color: "#2c7a3d",
    border: "1px solid #bfe2c8",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeInactive: {
    background: "#f3f3f3",
    color: "#777",
    border: "1px solid #ddd",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
  },
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
  activeRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#1f2d3d",
    cursor: "pointer",
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

  dropdown: {
    position: "absolute",
    top: "calc(100% + 2px)",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #ced4da",
    borderRadius: 3,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    zIndex: 1000,
  },
  dropdownItem: {
    padding: "8px 10px",
    fontSize: 13,
    cursor: "pointer",
    color: "#2c3e50",
    borderBottom: "1px solid #f0f0f0",
  },
  dropdownItemActive: {
    background: "#337ab7",
    color: "#fff",
  },
};

export default Ingredients;
