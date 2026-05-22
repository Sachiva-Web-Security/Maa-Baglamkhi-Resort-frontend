import { useEffect, useState } from "react";
import API from "../api";

const CATEGORIES = [
  "BEVERAGES",
  "FOOD",
  "STARTERS",
  "MAIN COURSE",
  "DESSERTS",
  "ALCOHOL",
  "MISC",
];

const emptyForm = {
  mode: "add",
  name: "",
  group_type: "main",
  parent_id: "",
  invoice_group_id: "",
  print_group_id: "",
  print_group_2_id: "",
  category: "BEVERAGES",
  is_active: true,
  price_group_ids: [],
};

const ItemGroups = () => {
  const [view, setView] = useState("list");
  const [rows, setRows] = useState([]);
  const [invoiceGroups, setInvoiceGroups] = useState([]);
  const [printGroups, setPrintGroups] = useState([]);
  const [priceGroups, setPriceGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = async (params = {}) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fb-item-groups", { params });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load item groups");
    } finally {
      setLoading(false);
    }
  };

  const loadDeps = async () => {
    try {
      const [igRes, pgRes, prgRes] = await Promise.all([
        API.get("/fb-invoice-groups"),
        API.get("/fb-print-groups"),
        API.get("/fb-price-groups"),
      ]);
      setInvoiceGroups(Array.isArray(igRes.data) ? igRes.data : []);
      setPrintGroups(Array.isArray(pgRes.data) ? pgRes.data : []);
      setPriceGroups(Array.isArray(prgRes.data) ? prgRes.data : []);
    } catch {
      setInvoiceGroups([]);
      setPrintGroups([]);
      setPriceGroups([]);
    }
  };

  useEffect(() => {
    load();
    loadDeps();
  }, []);

  const onSearch = (e) => {
    e?.preventDefault();
    load({ name: search });
  };

  const openAdd = () => {
    setForm({ ...emptyForm });
    setError("");
    setMessage("");
    setView("form");
  };

  const openEdit = (row) => {
    setForm({
      mode: "edit",
      id: row.id,
      name: row.name || "",
      group_type: row.group_type || "main",
      parent_id: row.parent_id ? String(row.parent_id) : "",
      invoice_group_id: row.invoice_group_id ? String(row.invoice_group_id) : "",
      print_group_id: row.print_group_id ? String(row.print_group_id) : "",
      print_group_2_id: row.print_group_2_id ? String(row.print_group_2_id) : "",
      category: row.category || "",
      is_active: !!row.is_active,
      price_group_ids: Array.isArray(row.price_group_ids) ? row.price_group_ids : [],
    });
    setError("");
    setMessage("");
    setView("form");
  };

  const closeForm = () => setView("list");

  const setField = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: v }));
  };

  const togglePriceGroup = (id) => {
    setForm((prev) => {
      const set = new Set(prev.price_group_ids);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, price_group_ids: Array.from(set) };
    });
  };

  const toggleAllPriceGroups = () => {
    setForm((prev) => {
      const allIds = priceGroups.map((g) => g.id);
      const allSelected = allIds.every((id) => prev.price_group_ids.includes(id));
      return {
        ...prev,
        price_group_ids: allSelected ? [] : allIds,
      };
    });
  };

  const onSave = async (e) => {
    e?.preventDefault();
    setError("");
    setMessage("");
    if (!form.name?.trim()) {
      setError("Group name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      group_type: form.group_type,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      invoice_group_id: form.invoice_group_id ? Number(form.invoice_group_id) : null,
      print_group_id: form.print_group_id ? Number(form.print_group_id) : null,
      print_group_2_id: form.print_group_2_id ? Number(form.print_group_2_id) : null,
      category: form.category || null,
      is_active: form.is_active,
      price_group_ids: form.price_group_ids,
    };
    setSaving(true);
    try {
      if (form.mode === "add") {
        await API.post("/fb-item-groups", payload);
        setMessage("Item group added.");
      } else {
        await API.put(`/fb-item-groups/${form.id}`, payload);
        setMessage("Item group updated.");
      }
      await load({ name: search });
      setView("list");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete item group "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/fb-item-groups/${row.id}`);
      setMessage("Item group deleted.");
      await load({ name: search });
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const allSelected =
    priceGroups.length > 0 &&
    priceGroups.every((g) => form.price_group_ids.includes(g.id));

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Item Groups</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={() => load({ name: search })}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
          {view === "form" && (
            <button type="button" onClick={closeForm} style={styles.formClose} title="Close">
              ×
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      {view === "list" ? (
        <>
          <div style={styles.subtitle}>List of Item Groups</div>

          <form onSubmit={onSearch} style={styles.searchBar}>
            <label style={styles.searchLabel}>Group Name</label>
            <input
              style={{ ...styles.input, width: 240 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter item group name"
            />
            <button type="submit" style={styles.searchBtn}>
              Search
            </button>
          </form>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: 40 }}>#</th>
                  <th style={styles.th}>Item Group Name</th>
                  <th style={styles.th}>Invoice Group</th>
                  <th style={styles.th}>Print Group</th>
                  <th style={{ ...styles.th, textAlign: "center", width: 70 }}>Active</th>
                  <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} style={styles.empty}>
                      No item groups yet. Click <b>+ New</b> to add one.
                    </td>
                  </tr>
                )}
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
                  >
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>{row.name}</td>
                    <td style={styles.td}>{row.invoice_group_name || "—"}</td>
                    <td style={styles.td}>{row.print_group_name || "—"}</td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={!!row.is_active}
                        readOnly
                        style={{ pointerEvents: "none" }}
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <button
                        type="button"
                        style={styles.editBtn}
                        onClick={() => openEdit(row)}
                        title="Edit"
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
            </table>
          </div>

          {loading && <div style={styles.loading}>Loading...</div>}
        </>
      ) : (
        <form onSubmit={onSave} style={styles.formWrap}>
          <div style={styles.formGrid}>
            {/* Left side: form fields */}
            <div style={styles.formCol}>
              <div style={styles.subtitle}>Add/Edit Item Group</div>

              <div style={styles.typeRow}>
                <label style={styles.radio}>
                  <input
                    type="radio"
                    name="group_type"
                    value="main"
                    checked={form.group_type === "main"}
                    onChange={setField("group_type")}
                  />
                  <span style={styles.typeLabel(form.group_type === "main")}>Main Group</span>
                </label>
                <label style={styles.radio}>
                  <input
                    type="radio"
                    name="group_type"
                    value="sub"
                    checked={form.group_type === "sub"}
                    onChange={setField("group_type")}
                  />
                  <span style={styles.typeLabel(form.group_type === "sub")}>Sub Group</span>
                </label>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Group Name</label>
                <input
                  style={styles.input}
                  autoFocus
                  value={form.name}
                  onChange={setField("name")}
                />
              </div>

              {form.group_type === "sub" && (
                <div style={styles.field}>
                  <label style={styles.label}>Parent Group</label>
                  <select
                    style={styles.input}
                    value={form.parent_id}
                    onChange={setField("parent_id")}
                  >
                    <option value="">— Select parent —</option>
                    {rows
                      .filter((r) => r.group_type === "main" && r.id !== form.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                  </select>
                </div>
              )}

              <div style={styles.row3}>
                <div style={styles.field}>
                  <label style={styles.label}>Invoice Group</label>
                  <select
                    style={styles.input}
                    value={form.invoice_group_id}
                    onChange={setField("invoice_group_id")}
                  >
                    <option value="">— Select —</option>
                    {invoiceGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Print Group 1</label>
                  <select
                    style={styles.input}
                    value={form.print_group_id}
                    onChange={setField("print_group_id")}
                  >
                    <option value="">None</option>
                    {printGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Print Group 2</label>
                  <select
                    style={styles.input}
                    value={form.print_group_2_id}
                    onChange={setField("print_group_2_id")}
                  >
                    <option value="">None</option>
                    {printGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Category</label>
                <select
                  style={{ ...styles.input, maxWidth: 240 }}
                  value={form.category}
                  onChange={setField("category")}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <label style={styles.activeRow}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={setField("is_active")}
                />
                Active
              </label>

              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button type="submit" style={styles.saveBtn} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  style={styles.backBtn}
                  onClick={closeForm}
                >
                  Back To List
                </button>
              </div>
            </div>

            {/* Right side: Show This Group In */}
            <div style={styles.priceCol}>
              <div style={styles.priceHeader}>Show This Group In</div>
              <div style={styles.allRow}>
                <label style={styles.priceItem}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAllPriceGroups}
                  />
                  All
                </label>
              </div>
              {priceGroups.length === 0 && (
                <div style={styles.emptyPanel}>
                  No price groups yet. Create some in F&B Service → Price Groups.
                </div>
              )}
              {priceGroups.map((g) => (
                <div key={g.id} style={styles.priceRow}>
                  <label style={styles.priceItem}>
                    <input
                      type="checkbox"
                      checked={form.price_group_ids.includes(g.id)}
                      onChange={() => togglePriceGroup(g.id)}
                    />
                    {g.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </form>
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
    paddingBottom: 8,
    marginBottom: 8,
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
  formClose: {
    background: "transparent",
    border: "none",
    color: "#46b8da",
    fontSize: 18,
    cursor: "pointer",
    lineHeight: 1,
    padding: "5px 8px",
  },
  subtitle: { fontSize: 13, fontWeight: 600, color: "#1f2d3d", marginBottom: 12 },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  searchBar: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  searchLabel: {
    fontSize: 13,
    color: "#1f2d3d",
    fontWeight: 500,
  },
  searchBtn: {
    background: "#5cb85c",
    color: "#fff",
    border: "1px solid #4cae4c",
    padding: "6px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    height: 34,
  },

  tableWrap: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    overflow: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 },
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
  },
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
  empty: { padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },

  formWrap: { marginTop: 4 },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 1fr)",
    gap: 28,
    alignItems: "start",
  },
  formCol: { display: "flex", flexDirection: "column", gap: 14 },
  typeRow: {
    display: "flex",
    gap: 28,
    alignItems: "center",
  },
  radio: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#2c3e50",
    cursor: "pointer",
  },
  typeLabel: (active) => ({
    fontWeight: 700,
    color: active ? "#2e6da4" : "#1f2d3d",
  }),
  field: { display: "flex", flexDirection: "column" },
  row3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#1f2d3d",
    marginBottom: 4,
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
  activeRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#2c3e50",
    marginTop: 4,
  },
  saveBtn: {
    background: "#2e6da4",
    color: "#fff",
    border: "1px solid #245269",
    padding: "6px 22px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  backBtn: {
    background: "#5bc0de",
    color: "#fff",
    border: "1px solid #46b8da",
    padding: "6px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },

  priceCol: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    background: "#fff",
    overflow: "hidden",
  },
  priceHeader: {
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "#1f2d3d",
  },
  allRow: {
    background: "#e6e8eb",
    padding: "8px 12px",
    borderTop: "1px solid #d0d3d6",
    borderBottom: "1px solid #d0d3d6",
  },
  priceRow: {
    padding: "8px 12px",
    borderBottom: "1px solid #f0f0f0",
  },
  priceItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#2c3e50",
    cursor: "pointer",
    width: "100%",
  },
  emptyPanel: {
    padding: "12px",
    color: "#999",
    fontStyle: "italic",
    fontSize: 12,
  },
};

export default ItemGroups;
