import { useEffect, useState } from "react";
import API from "../../api";

const PrinterLocations = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/printer-locations");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load printer locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => setModal({ mode: "add", name: "" });
  const openEdit = (row) => setModal({ mode: "edit", id: row.id, name: row.name });
  const closeModal = () => setModal(null);

  const onSave = async () => {
    const name = String(modal?.name || "").trim();
    if (!name) {
      setError("Printer name is required");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (modal.mode === "add") {
        await API.post("/printer-locations", { name });
        setMessage("Printer location added.");
      } else {
        await API.put(`/printer-locations/${modal.id}`, { name });
        setMessage("Printer location updated.");
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
    if (!confirm(`Delete "${row.name}"?`)) return;
    setError("");
    setMessage("");
    try {
      await API.delete(`/printer-locations/${row.id}`);
      setMessage("Printer location deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Printer Location</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Printer Locations</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>#</th>
              <th style={styles.th}>Printer Name</th>
              <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={3} style={styles.empty}>
                  No printer locations yet. Click <b>+ New</b> to add one.
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
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              {modal.mode === "add" ? "Add Printer Location" : "Edit Printer Location"}
              <button onClick={closeModal} style={styles.modalClose}>
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.label}>Printer Name</label>
              <input
                style={styles.input}
                autoFocus
                value={modal.name}
                onChange={(e) =>
                  setModal((prev) => ({ ...prev, name: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSave();
                  if (e.key === "Escape") closeModal();
                }}
                placeholder="e.g. Kitchen"
              />
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
    overflow: "hidden",
    maxWidth: 700,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    padding: "10px 12px",
    textAlign: "left",
    fontWeight: 600,
    color: "#1f2d3d",
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
    width: 380,
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
  modalBody: {
    padding: 16,
    display: "flex",
    flexDirection: "column",
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

export default PrinterLocations;
