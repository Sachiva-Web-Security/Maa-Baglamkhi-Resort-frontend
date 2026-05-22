import { useEffect, useState } from "react";
import API from "../api";

const emptyForm = {
  name: "",
  printer_location_id: "",
  is_active: true,
};

const PrintGroups = () => {
  const [rows, setRows] = useState([]);
  const [printerLocations, setPrinterLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fb-print-groups");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load print groups");
    } finally {
      setLoading(false);
    }
  };

  const loadPrinterLocations = async () => {
    try {
      const { data } = await API.get("/printer-locations");
      setPrinterLocations(Array.isArray(data) ? data : []);
    } catch {
      setPrinterLocations([]);
    }
  };

  useEffect(() => {
    load();
    loadPrinterLocations();
  }, []);

  const openAdd = () => setModal({ mode: "add", ...emptyForm });
  const openEdit = (row) =>
    setModal({
      mode: "edit",
      id: row.id,
      name: row.name || "",
      printer_location_id: row.printer_location_id
        ? String(row.printer_location_id)
        : "",
      is_active: row.is_active !== false,
    });
  const closeModal = () => setModal(null);

  const setField = (key) => (e) =>
    setModal((prev) => ({ ...prev, [key]: e.target.value }));

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!modal.name?.trim()) {
      setError("Print group name is required");
      return;
    }
    const payload = {
      name: modal.name.trim(),
      printer_location_id: modal.printer_location_id
        ? Number(modal.printer_location_id)
        : null,
      is_active: modal.is_active ? 1 : 0,
    };
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await API.post("/fb-print-groups", payload);
        setMessage("Print group added.");
      } else {
        await API.put(`/fb-print-groups/${modal.id}`, payload);
        setMessage("Print group updated.");
      }
      closeModal();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete print group "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/fb-print-groups/${row.id}`);
      setMessage("Print group deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Print Groups</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Print Groups</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>#</th>
              <th style={styles.th}>Print Group</th>
              <th style={styles.th}>Printer Location</th>
              <th style={{ ...styles.th, width: 90 }}>Status</th>
              <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={styles.empty}>
                  No print groups yet. Click <b>+ New</b> to add one.
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
                <td style={styles.td}>{row.printer_location_name || "—"}</td>
                <td style={styles.td}>
                  <span
                    style={
                      row.is_active ? styles.badgeActive : styles.badgeInactive
                    }
                  >
                    {row.is_active ? "Active" : "Inactive"}
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

      {loading && <div style={styles.loading}>Loading...</div>}

      {modal && (
        <div style={styles.modalBackdrop} onClick={closeModal}>
          <div style={{ ...styles.modal, width: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              {modal.mode === "add" ? "Add Print Group" : "Edit Print Group"}
              <button onClick={closeModal} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.field}>
                <label style={styles.label}>Print Group Name</label>
                <input
                  style={styles.input}
                  autoFocus
                  value={modal.name}
                  onChange={setField("name")}
                  placeholder="e.g. Kitchen KOT"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Printer Location</label>
                <select
                  style={styles.input}
                  value={modal.printer_location_id}
                  onChange={setField("printer_location_id")}
                >
                  <option value="">— Select —</option>
                  {printerLocations.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ ...styles.field, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input
                  id="pg-active"
                  type="checkbox"
                  checked={!!modal.is_active}
                  onChange={(e) =>
                    setModal((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                />
                <label htmlFor="pg-active" style={{ ...styles.label, marginBottom: 0 }}>
                  Active
                </label>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
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
    maxWidth: 800,
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
  empty: { padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modal: {
    background: "#fff",
    borderRadius: 4,
    boxShadow: "0 5px 20px rgba(0,0,0,0.25)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "12px 16px",
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    fontSize: 15,
    fontWeight: 600,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalClose: {
    background: "transparent",
    border: "none",
    fontSize: 22,
    cursor: "pointer",
    color: "#888",
    lineHeight: 1,
  },
  modalBody: { padding: 16, display: "flex", flexDirection: "column", gap: 10 },
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
  modalFooter: {
    padding: "10px 16px",
    borderTop: "1px solid #e6e8eb",
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#333",
    padding: "6px 14px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
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

export default PrintGroups;
