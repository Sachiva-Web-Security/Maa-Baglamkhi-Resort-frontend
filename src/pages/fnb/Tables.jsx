import { useEffect, useState } from "react";
import API from "../../api";

const emptyForm = {
  id: null,
  table_group_id: "",
  name: "",
  is_active: true,
};

const Tables = () => {
  const [view, setView] = useState("list"); // "list" | "form"
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fb-tables");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const { data } = await API.get("/fb-table-groups");
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    }
  };

  useEffect(() => {
    load();
    loadGroups();
  }, []);

  const goList = () => {
    setView("list");
    setForm(emptyForm);
  };

  const openAdd = () => {
    setForm({ ...emptyForm });
    setView("form");
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      table_group_id: row.table_group_id ? String(row.table_group_id) : "",
      name: row.name || "",
      is_active: row.is_active !== false,
    });
    setView("form");
  };

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!form.name?.trim()) {
      setError("Table no. is required");
      return;
    }
    const payload = {
      table_group_id: form.table_group_id ? Number(form.table_group_id) : null,
      name: form.name.trim(),
      is_active: form.is_active ? 1 : 0,
    };
    setSaving(true);
    try {
      if (form.id) {
        await API.put(`/fb-tables/${form.id}`, payload);
        setMessage("Table updated.");
      } else {
        await API.post("/fb-tables", payload);
        setMessage("Table added.");
      }
      goList();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete table "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/fb-tables/${row.id}`);
      setMessage("Table deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const renderListView = () => (
    <>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Tables</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd} title="New">
            +
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Tables</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>#</th>
              <th style={styles.th}>Table No</th>
              <th style={styles.th}>Table Group</th>
              <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={styles.empty}>
                  No tables yet. Click <b>+</b> to add one.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={styles.td}>{row.name}</td>
                <td style={styles.td}>{row.table_group_name || "—"}</td>
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
        {loading && <div style={styles.loading}>Loading...</div>}
      </div>
    </>
  );

  const renderFormView = () => (
    <>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Tables</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd} title="New">
            +
          </button>
        </div>
      </div>

      <div style={{ fontWeight: 600, color: "#1f2d3d", marginBottom: 12 }}>
        Add/Edit Table
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={styles.field}>
          <label style={styles.label}>Table No</label>
          <input
            style={styles.input}
            autoFocus
            value={form.name}
            onChange={(e) =>
              setForm((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="e.g. 1"
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Table Group</label>
          <select
            style={styles.input}
            value={form.table_group_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, table_group_id: e.target.value }))
            }
          >
            <option value="">— Select —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <label style={styles.activeRow}>
          <input
            type="checkbox"
            checked={!!form.is_active}
            onChange={(e) =>
              setForm((p) => ({ ...p, is_active: e.target.checked }))
            }
          />
          Active
        </label>
        <div style={styles.actionRow}>
          <button
            type="button"
            style={styles.saveBtn}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" style={styles.backBtn} onClick={goList}>
            Back To List
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div style={styles.page}>
      {view === "list" ? renderListView() : renderFormView()}
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
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    minWidth: 32,
  },
  subtitle: { fontSize: 13, color: "#5b6b7c", marginBottom: 12 },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

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
  loading: { padding: "8px 12px", color: "#6c757d", fontSize: 13 },

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
  activeRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#1f2d3d",
    cursor: "pointer",
  },
  actionRow: { display: "flex", gap: 8 },
  saveBtn: {
    background: "#337ab7",
    color: "#fff",
    border: "1px solid #2e6da4",
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
    padding: "6px 14px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};

export default Tables;
