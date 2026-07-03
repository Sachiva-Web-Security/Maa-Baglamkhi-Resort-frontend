import { useEffect, useState } from "react";
import API from "../../api";

const emptyForm = {
  name: "",
  tax_setting_id: "",
  is_active: true,
};

const Services = () => {
  const [rows, setRows] = useState([]);
  const [taxSettings, setTaxSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fo-services");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const loadTaxes = async () => {
    try {
      const { data } = await API.get("/tax-settings");
      setTaxSettings(Array.isArray(data) ? data : []);
    } catch {
      setTaxSettings([]);
    }
  };

  useEffect(() => {
    load();
    loadTaxes();
  }, []);

  const openAdd = () =>
    setPanel({ mode: "add", ...emptyForm });
  const openEdit = (row) =>
    setPanel({
      mode: "edit",
      id: row.id,
      name: row.name || "",
      tax_setting_id: row.tax_setting_id ? String(row.tax_setting_id) : "",
      is_active: !!row.is_active,
    });
  const closePanel = () => setPanel(null);

  const setField = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setPanel((prev) => ({ ...prev, [key]: v }));
  };

  const onSave = async (e) => {
    e?.preventDefault();
    setError("");
    setMessage("");
    if (!panel.name?.trim()) {
      setError("Service name is required");
      return;
    }
    const payload = {
      name: panel.name.trim(),
      tax_setting_id: panel.tax_setting_id ? Number(panel.tax_setting_id) : null,
      is_active: panel.is_active,
    };
    setSaving(true);
    try {
      if (panel.mode === "add") {
        await API.post("/fo-services", payload);
        setMessage("Service added.");
      } else {
        await API.put(`/fo-services/${panel.id}`, payload);
        setMessage("Service updated.");
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
    if (!confirm(`Delete service "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/fo-services/${row.id}`);
      setMessage("Service deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Services</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Services</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={panel ? styles.splitLayout : styles.listOnly}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40 }}>#</th>
                <th style={styles.th}>Service Name</th>
                <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} style={styles.empty}>
                    No services yet. Click <b>+ New</b> to add one.
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
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <button
                      type="button"
                      style={{
                        ...styles.editBtn,
                        ...(panel?.mode === "edit" && panel.id === row.id
                          ? styles.editBtnActive
                          : null),
                      }}
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

        {panel && (
          <div style={styles.formPanel}>
            <div style={styles.formHeader}>
              <span>Add/Edit Service</span>
              <button onClick={closePanel} style={styles.formClose} title="Close">
                ×
              </button>
            </div>
            <form onSubmit={onSave} style={styles.formBody}>
              <div style={styles.field}>
                <label style={styles.label}>
                  Service Name <span style={{ color: "#d9534f" }}>*</span>
                </label>
                <input
                  style={styles.input}
                  autoFocus
                  value={panel.name}
                  onChange={setField("name")}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Tax Type</label>
                <select
                  style={styles.input}
                  value={panel.tax_setting_id}
                  onChange={setField("tax_setting_id")}
                >
                  <option value="">— Select —</option>
                  {taxSettings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginTop: 6 }}>
                <button type="submit" style={styles.saveBtn} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}
    </div>
  );
};

const styles = {
  page: {
    padding: "0 7px 30px",
    background: "#f1f1f1",
    minHeight: "100%",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#222",
    fontSize: 9,
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #e6e8eb",
    height: 36,
    paddingBottom: 0,
    marginBottom: 8,
    background: "#fff",
  },
  title: { margin: 0, fontSize: 12, fontWeight: 600, color: "#222" },
  refreshBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#333",
    padding: "4px 7px",
    borderRadius: 0,
    fontSize: 9,
    cursor: "pointer",
  },
  newBtn: {
    background: "#5bc0de",
    border: "1px solid #46b8da",
    color: "#fff",
    padding: "4px 7px",
    borderRadius: 0,
    fontSize: 9,
    fontWeight: 500,
    cursor: "pointer",
  },
  subtitle: { position: "absolute", top: 292, left: 7, fontSize: 8, color: "#5b6b7c" },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  listOnly: {},
  splitLayout: {
    display: "grid",
    gridTemplateColumns: "590px minmax(360px, 1fr)",
    gap: 18,
    alignItems: "start",
  },

  tableWrap: {
    border: "1px solid #e6e8eb",
    borderRadius: 0,
    overflow: "hidden",
    maxWidth: 600,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 9 },
  th: {
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    padding: "7px 7px",
    textAlign: "left",
    fontWeight: 600,
    color: "#1f2d3d",
  },
  td: {
    padding: "7px 7px",
    borderBottom: "1px solid #f0f0f0",
    color: "#2c3e50",
  },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#f1f1f1" },
  editBtn: {
    background: "#5bc0de",
    border: "1px solid #46b8da",
    color: "#fff",
    width: 20,
    height: 20,
    borderRadius: 0,
    fontSize: 9,
    marginRight: 4,
    cursor: "pointer",
  },
  editBtnActive: {
    background: "#31708f",
    borderColor: "#245269",
  },
  deleteBtn: {
    background: "#d9534f",
    border: "1px solid #d43f3a",
    color: "#fff",
    width: 20,
    height: 20,
    borderRadius: 0,
    fontSize: 9,
    cursor: "pointer",
  },
  empty: { padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },

  formPanel: {
    border: "1px solid #e6e8eb",
    borderRadius: 0,
    background: "#fff",
  },
  formHeader: {
    padding: "7px 9px",
    background: "#fff",
    borderBottom: "1px solid #e6e8eb",
    fontSize: 9,
    fontWeight: 600,
    color: "#1f2d3d",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formClose: {
    background: "transparent",
    border: "none",
    color: "#46b8da",
    fontSize: 18,
    cursor: "pointer",
    lineHeight: 1,
  },
  formBody: {
    padding: 9,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  field: { display: "flex", flexDirection: "column" },
  label: {
    fontSize: 9,
    fontWeight: 600,
    color: "#1f2d3d",
    marginBottom: 4,
  },
  input: {
    height: 23,
    border: "1px solid #ced4da",
    borderRadius: 0,
    padding: "4px 8px",
    fontSize: 9,
    background: "#fff",
    color: "#2c3e50",
    outline: "none",
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

export default Services;
