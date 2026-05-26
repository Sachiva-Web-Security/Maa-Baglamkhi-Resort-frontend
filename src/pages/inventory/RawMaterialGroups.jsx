import { useEffect, useState } from "react";
import API from "../../api";

const emptyForm = {
  id: null,
  name: "",
  description: "",
  parent_id: "",
  is_active: true,
};

const RawMaterialGroups = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchName, setSearchName] = useState("");

  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async (name = searchName) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/inventory-item-groups", {
        params: name ? { name } : {},
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load item groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
  }, []);

  const openAdd = () => setPanel({ ...emptyForm });
  const openEdit = (row) =>
    setPanel({
      id: row.id,
      name: row.name || "",
      description: row.description || "",
      parent_id: row.parent_id ? String(row.parent_id) : "",
      is_active: row.is_active !== false,
    });
  const closePanel = () => setPanel(null);

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!panel.name?.trim()) {
      setError("Group name is required");
      return;
    }
    const payload = {
      name: panel.name.trim(),
      description: panel.description.trim(),
      parent_id: panel.parent_id ? Number(panel.parent_id) : null,
      is_active: panel.is_active ? 1 : 0,
    };
    setSaving(true);
    try {
      if (panel.id) {
        await API.put(`/inventory-item-groups/${panel.id}`, payload);
        setMessage("Item group updated.");
      } else {
        await API.post("/inventory-item-groups", payload);
        setMessage("Item group added.");
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
    if (!confirm(`Delete item group "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/inventory-item-groups/${row.id}`);
      setMessage("Item group deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Item Groups</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={() => load("")}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Item Groups</div>

      <div style={styles.searchBar}>
        <label style={styles.searchLabel}>Group Name</label>
        <input
          style={styles.searchInput}
          placeholder="Enter item group name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load(searchName);
          }}
        />
        <button type="button" style={styles.searchBtn} onClick={() => load(searchName)}>
          Search
        </button>
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
                    <th style={styles.th}>Group Name</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Parent</th>
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
                      <td style={styles.td}>{row.name}</td>
                      <td style={styles.td}>{row.description || ""}</td>
                      <td style={styles.td}>{row.parent_name || "—"}</td>
                      <td style={styles.td}>
                        <span style={row.is_active ? styles.badgeActive : styles.badgeInactive}>
                          {row.is_active ? "Yes" : "No"}
                        </span>
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
          )}
          {loading && <div style={styles.loading}>Loading...</div>}
        </div>

        {panel && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span>{panel.id ? "Edit Item Group" : "Add Item Group"}</span>
              <button type="button" onClick={closePanel} style={styles.panelClose} title="Close">×</button>
            </div>
            <div style={styles.panelBody}>
              <Field label="Group Name" required>
                <input
                  style={styles.input}
                  autoFocus
                  value={panel.name}
                  onChange={(e) => setPanel((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Vegetables"
                />
              </Field>
              <Field label="Description">
                <input
                  style={styles.input}
                  value={panel.description}
                  onChange={(e) => setPanel((p) => ({ ...p, description: e.target.value }))}
                />
              </Field>
              <Field label="Parent Group">
                <select
                  style={styles.input}
                  value={panel.parent_id}
                  onChange={(e) => setPanel((p) => ({ ...p, parent_id: e.target.value }))}
                >
                  <option value="">— None (Top-level) —</option>
                  {rows
                    .filter((r) => r.id !== panel.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
              </Field>
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
  subtitle: { fontSize: 13, fontWeight: 600, color: "#1f2d3d", marginBottom: 8 },

  searchBar: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 14,
  },
  searchLabel: { fontSize: 12, fontWeight: 500, color: "#1f2d3d" },
  searchInput: {
    height: 30,
    border: "1px solid #ced4da",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 13,
    width: 220,
    outline: "none",
  },
  searchBtn: {
    background: "#5cb85c",
    color: "#fff",
    border: "1px solid #4cae4c",
    padding: "5px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
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
};

export default RawMaterialGroups;
