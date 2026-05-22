import { useEffect, useState } from "react";
import API from "../../api";

const STATUSES = ["Available", "Occupied", "Cleaning", "Maintenance", "Blocked"];

const emptyForm = {
  room_no: "",
  room_type_id: "",
  description: "",
  floor: "",
  room_status: "Available",
  is_active: true,
};

const Rooms = () => {
  const [view, setView] = useState("list");
  const [rows, setRows] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({ mode: "add", ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fo-rooms");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  const loadRoomTypes = async () => {
    try {
      const { data } = await API.get("/room-types");
      setRoomTypes(Array.isArray(data) ? data.filter((t) => t.is_active) : []);
    } catch {
      setRoomTypes([]);
    }
  };

  useEffect(() => {
    load();
    loadRoomTypes();
  }, []);

  const openAdd = () => {
    setForm({ mode: "add", ...emptyForm });
    setError("");
    setMessage("");
    setView("form");
  };

  const openEdit = (row) => {
    setForm({
      mode: "edit",
      id: row.id,
      room_no: row.room_no || "",
      room_type_id: row.room_type_id ? String(row.room_type_id) : "",
      description: row.description || "",
      floor: row.floor || "",
      room_status: row.room_status || "Available",
      is_active: !!row.is_active,
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

  const onSave = async (e) => {
    e?.preventDefault();
    setError("");
    setMessage("");
    if (!form.room_no?.trim()) {
      setError("Room No is required");
      return;
    }
    const payload = {
      room_no: form.room_no.trim(),
      room_type_id: form.room_type_id ? Number(form.room_type_id) : null,
      description: form.description || null,
      floor: form.floor || null,
      room_status: form.room_status,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      if (form.mode === "add") {
        await API.post("/fo-rooms", payload);
        setMessage("Room added.");
      } else {
        await API.put(`/fo-rooms/${form.id}`, payload);
        setMessage("Room updated.");
      }
      await load();
      setView("list");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete room "${row.room_no}"?`)) return;
    setError("");
    try {
      await API.delete(`/fo-rooms/${row.id}`);
      setMessage("Room deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Rooms</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New Room
          </button>
        </div>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      {view === "form" && (
        <div style={styles.formPanel}>
          <div style={styles.formHeader}>
            <span>Add/Edit Room</span>
            <button onClick={closeForm} style={styles.formClose} title="Close">
              ×
            </button>
          </div>
          <form onSubmit={onSave} style={styles.formBody}>
            <div style={styles.row2}>
              <Field label="Room No">
                <input
                  style={styles.input}
                  value={form.room_no}
                  onChange={setField("room_no")}
                  autoFocus
                />
              </Field>
              <Field label="Room Type">
                <select
                  style={styles.input}
                  value={form.room_type_id}
                  onChange={setField("room_type_id")}
                >
                  <option value="">— Select Room Type —</option>
                  {roomTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Description">
              <input
                style={styles.input}
                value={form.description}
                onChange={setField("description")}
                placeholder="Description (like 1. English toilet, bath tub etc...)"
              />
            </Field>

            <div style={styles.row2}>
              <Field label="Floor">
                <input
                  style={styles.input}
                  value={form.floor}
                  onChange={setField("floor")}
                />
              </Field>
              <Field label="Room Status">
                <select
                  style={styles.input}
                  value={form.room_status}
                  onChange={setField("room_status")}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#2c3e50",
                marginTop: 4,
              }}
            >
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={setField("is_active")}
              />
              Active
            </label>

            <div style={{ marginTop: 6 }}>
              <button type="submit" style={styles.saveBtn} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {view === "list" && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40 }}>#</th>
                <th style={styles.th}>Room No</th>
                <th style={styles.th}>Room Type</th>
                <th style={styles.th}>Floor</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: "center", width: 70 }}>Active</th>
                <th style={{ ...styles.th, width: 100, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} style={styles.empty}>
                    No rooms yet. Click <b>+ New Room</b> to add one.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{row.room_no}</td>
                    <td style={styles.td}>{row.room_type_name || "—"}</td>
                    <td style={styles.td}>{row.floor}</td>
                    <td style={styles.td}>{row.description}</td>
                    <td style={styles.td}>
                      <span style={statusBadge(row.room_status)}>{row.room_status}</span>
                    </td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {loading && <div style={styles.loading}>Loading...</div>}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <label style={{ ...styles.label, width: 110, marginBottom: 0, textAlign: "right" }}>
      {label}
    </label>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

const statusBadge = (status) => {
  const map = {
    Available: { bg: "#e6f4ea", color: "#2c7a3d", border: "#bfe2c8" },
    Occupied: { bg: "#fdecea", color: "#b94a48", border: "#f3c2bd" },
    Cleaning: { bg: "#fef6df", color: "#8a6d3b", border: "#f0e1a4" },
    Maintenance: { bg: "#eef3ff", color: "#3a51a8", border: "#c7d4f2" },
    Blocked: { bg: "#f4f4f4", color: "#6c757d", border: "#dadada" },
  };
  const c = map[status] || map.Available;
  return {
    padding: "2px 8px",
    fontSize: 11,
    borderRadius: 10,
    background: c.bg,
    color: c.color,
    border: `1px solid ${c.border}`,
    fontWeight: 500,
  };
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
    marginBottom: 14,
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
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  formPanel: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    background: "#fff",
    marginBottom: 16,
    maxWidth: 640,
  },
  formHeader: {
    padding: "8px 12px",
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    fontSize: 13,
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
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
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

  tableWrap: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    overflow: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 },
  th: {
    background: "#2f3640",
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
};

export default Rooms;
