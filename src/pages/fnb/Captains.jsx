import { useEffect, useState } from "react";
import API from "../../api";

const EMP_TYPES = ["Captain", "Delivery Boy", "Sales Executive"];

const emptyForm = {
  id: null,
  name: "",
  date_of_joining: "",
  designation: "",
  address: "",
  contact_number: "",
  employee_types: ["Captain"],
  is_active: true,
};

const fmtDate = (d) => {
  if (!d) return "";
  const iso = String(d).slice(0, 10);
  const [y, m, day] = iso.split("-");
  return y && m && day ? `${day}/${m}/${y}` : iso;
};

const Captains = () => {
  const [view, setView] = useState("list");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fb-captains");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load captains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
      name: row.name || "",
      date_of_joining: row.date_of_joining
        ? String(row.date_of_joining).slice(0, 10)
        : "",
      designation: row.designation || "",
      address: row.address || "",
      contact_number: row.contact_number || "",
      employee_types: Array.isArray(row.employee_types) ? row.employee_types : ["Captain"],
      is_active: row.is_active !== false,
    });
    setView("form");
  };

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!form.name?.trim()) {
      setError("Name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      date_of_joining: form.date_of_joining || null,
      designation: form.designation?.trim() || null,
      address: form.address?.trim() || null,
      contact_number: form.contact_number?.trim() || null,
      employee_types: form.employee_types,
      is_active: form.is_active ? 1 : 0,
    };
    setSaving(true);
    try {
      if (form.id) {
        await API.put(`/fb-captains/${form.id}`, payload);
        setMessage("Captain updated.");
      } else {
        await API.post("/fb-captains", payload);
        setMessage("Captain added.");
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
    if (!confirm(`Delete captain "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/fb-captains/${row.id}`);
      setMessage("Captain deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const toggleType = (type) => {
    setForm((p) => {
      const set = new Set(p.employee_types);
      if (set.has(type)) set.delete(type);
      else set.add(type);
      return { ...p, employee_types: Array.from(set) };
    });
  };

  const renderListView = () => (
    <>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Employee</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New User
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Captains</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>#</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Date Of Joining</th>
              <th style={styles.th}>Designation</th>
              <th style={styles.th}>Address</th>
              <th style={styles.th}>MobileNumber</th>
              <th style={{ ...styles.th, textAlign: "center" }}>Active</th>
              <th style={{ ...styles.th, width: 100, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={8} style={styles.empty}>
                  No captains yet. Click <b>+ New User</b> to add one.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={styles.td}>{row.name}</td>
                <td style={styles.td}>{fmtDate(row.date_of_joining)}</td>
                <td style={styles.td}>{row.designation || ""}</td>
                <td style={styles.td}>{row.address || ""}</td>
                <td style={styles.td}>{row.contact_number || ""}</td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <input type="checkbox" checked={!!row.is_active} readOnly />
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
        {loading && <div style={styles.loading}>Loading...</div>}
      </div>
    </>
  );

  const renderFormView = () => (
    <>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Employee</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New User
          </button>
        </div>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 1fr)",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 600, color: "#1f2d3d" }}>Add/Edit Employee Details</div>
          </div>

          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.label}>Captain Name</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Date of Joining</label>
              <input
                type="date"
                style={styles.input}
                value={form.date_of_joining}
                onChange={(e) => setForm((p) => ({ ...p, date_of_joining: e.target.value }))}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Address</label>
            <input
              style={styles.input}
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />
          </div>

          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.label}>Designation</label>
              <input
                style={styles.input}
                value={form.designation}
                onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Contact Number</label>
              <input
                style={styles.input}
                value={form.contact_number}
                onChange={(e) => setForm((p) => ({ ...p, contact_number: e.target.value }))}
              />
            </div>
          </div>

          <label style={{ ...styles.checkLabel, marginTop: 6, marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            Active
          </label>

          <div style={styles.actionRow}>
            <button type="button" style={styles.saveBtn} onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" style={styles.backBtn} onClick={goList}>
              Back
            </button>
          </div>
        </div>

        <div style={styles.empPanel}>
          <div style={styles.empPanelHeader}>
            <span>Employee Types</span>
            <button
              type="button"
              onClick={goList}
              style={styles.panelClose}
              title="Close"
            >
              ×
            </button>
          </div>
          <div style={styles.empPanelBody}>
            {EMP_TYPES.map((t) => (
              <label key={t} style={styles.empTypeRow}>
                <input
                  type="checkbox"
                  checked={form.employee_types.includes(t)}
                  onChange={() => toggleType(t)}
                />
                {t}
              </label>
            ))}
          </div>
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
    padding: "5px 14px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
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

  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 },
  field: { display: "flex", flexDirection: "column", marginBottom: 10 },
  label: { fontSize: 12, fontWeight: 600, color: "#1f2d3d", marginBottom: 4 },
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
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#1f2d3d",
    cursor: "pointer",
  },
  actionRow: { display: "flex", gap: 8 },
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
  backBtn: {
    background: "#fff",
    color: "#333",
    border: "1px solid #ccc",
    padding: "6px 18px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
  },

  empPanel: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    background: "#fff",
    overflow: "hidden",
  },
  empPanelHeader: {
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
  empPanelBody: { padding: 0 },
  empTypeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: 13,
    cursor: "pointer",
  },
  panelClose: {
    background: "transparent",
    border: "none",
    fontSize: 20,
    cursor: "pointer",
    color: "#888",
    lineHeight: 1,
  },
};

export default Captains;
