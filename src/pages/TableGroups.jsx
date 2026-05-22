import { useEffect, useState } from "react";
import API from "../api";

const emptyForm = {
  name: "",
  price_group_id: "",
  terminal_id: "",
  is_active: true,
};

const TableGroups = () => {
  const [rows, setRows] = useState([]);
  const [priceGroups, setPriceGroups] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fb-table-groups");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load table groups");
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [pg, tm] = await Promise.all([
        API.get("/fb-price-groups"),
        API.get("/terminals"),
      ]);
      setPriceGroups(Array.isArray(pg.data) ? pg.data : []);
      setTerminals(Array.isArray(tm.data) ? tm.data : []);
    } catch {
      setPriceGroups([]);
      setTerminals([]);
    }
  };

  useEffect(() => {
    load();
    loadLookups();
  }, []);

  const openAdd = () => setPanel({ mode: "add", ...emptyForm });
  const openEdit = (row) =>
    setPanel({
      mode: "edit",
      id: row.id,
      name: row.name || "",
      price_group_id: row.price_group_id ? String(row.price_group_id) : "",
      terminal_id: row.terminal_id ? String(row.terminal_id) : "",
      is_active: row.is_active !== false,
    });
  const closePanel = () => setPanel(null);

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!panel.name?.trim()) {
      setError("Table group name is required");
      return;
    }
    const payload = {
      name: panel.name.trim(),
      price_group_id: panel.price_group_id ? Number(panel.price_group_id) : null,
      terminal_id: panel.terminal_id ? Number(panel.terminal_id) : null,
      is_active: panel.is_active ? 1 : 0,
    };
    setSaving(true);
    try {
      if (panel.mode === "add") {
        await API.post("/fb-table-groups", payload);
        setMessage("Table group added.");
      } else {
        await API.put(`/fb-table-groups/${panel.id}`, payload);
        setMessage("Table group updated.");
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
    if (!confirm(`Delete table group "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/fb-table-groups/${row.id}`);
      setMessage("Table group deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Table Groups</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Table Groups</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: panel
            ? "minmax(0, 1fr) minmax(420px, 1fr)"
            : "minmax(0, 1fr)",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40 }}>#</th>
                <th style={styles.th}>Table Group</th>
                <th style={styles.th}>Price List Group</th>
                <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} style={styles.empty}>
                    No table groups yet. Click <b>+ New</b> to add one.
                  </td>
                </tr>
              )}
              {rows.map((row, idx) => {
                const isEditing = panel?.mode === "edit" && panel.id === row.id;
                return (
                  <tr
                    key={row.id}
                    style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
                  >
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>{row.name}</td>
                    <td style={styles.td}>{row.price_group_name || "—"}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <button
                        type="button"
                        style={isEditing ? styles.editBtnActive : styles.editBtn}
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
                );
              })}
            </tbody>
          </table>
          {loading && <div style={styles.loading}>Loading...</div>}
        </div>

        {panel && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span>Add/Edit Table Group</span>
              <button
                type="button"
                onClick={closePanel}
                style={styles.panelClose}
                title="Close"
              >
                ×
              </button>
            </div>
            <div style={styles.panelBody}>
              <div style={styles.field}>
                <label style={styles.label}>Table Group</label>
                <input
                  style={styles.input}
                  autoFocus
                  value={panel.name}
                  onChange={(e) =>
                    setPanel((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. RESTAURANT"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Price List Group</label>
                <select
                  style={styles.input}
                  value={panel.price_group_id}
                  onChange={(e) =>
                    setPanel((prev) => ({ ...prev, price_group_id: e.target.value }))
                  }
                >
                  <option value="">— Select —</option>
                  {priceGroups.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Display At Terminal</label>
                <select
                  style={styles.input}
                  value={panel.terminal_id}
                  onChange={(e) =>
                    setPanel((prev) => ({ ...prev, terminal_id: e.target.value }))
                  }
                >
                  <option value="">— Select —</option>
                  {terminals.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  style={styles.saveBtn}
                  onClick={onSave}
                  disabled={saving}
                >
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
  subtitle: { fontSize: 13, color: "#5b6b7c", marginBottom: 12 },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  tableWrap: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    overflow: "auto",
  },
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
  editBtnActive: {
    background: "#1f2d3d",
    border: "1px solid #1f2d3d",
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
  panelBody: { padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  field: { display: "flex", flexDirection: "column" },
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
  saveBtn: {
    background: "#5cb85c",
    color: "#fff",
    border: "1px solid #4cae4c",
    padding: "6px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};

export default TableGroups;
