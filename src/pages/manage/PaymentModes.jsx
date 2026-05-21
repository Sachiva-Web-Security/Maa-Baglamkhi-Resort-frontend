import { useEffect, useState } from "react";
import API from "../../api";

const PaymentModes = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/payment-modes");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payment modes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditValue(row.name || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (row) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await API.put(`/payment-modes/${row.id}`, { name: editValue });
      setMessage(editValue.trim() ? "Slot updated." : "Slot cleared.");
      setEditingId(null);
      setEditValue("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addSlot = async () => {
    setError("");
    setMessage("");
    try {
      const { data } = await API.post("/payment-modes", { name: "" });
      setMessage(`Slot ${data.position} added.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Add failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Payment Modes</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={addSlot}>
            + New
          </button>
        </div>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.slotsWrap}>
        {rows.length === 0 && !loading && (
          <div style={styles.empty}>
            No slots yet. Click <b>+ New</b> to add one.
          </div>
        )}

        {rows.map((row) => {
          const isEditing = editingId === row.id;
          return (
            <div
              key={row.id}
              style={styles.slot}
              onClick={() => !isEditing && startEdit(row)}
            >
              <div style={styles.slotNumber}>{row.position}</div>

              {isEditing ? (
                <div
                  style={styles.slotEditWrap}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    style={styles.slotInput}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(row);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    placeholder="Enter payment mode name"
                  />
                  <button
                    type="button"
                    style={styles.saveBtn}
                    onClick={() => saveEdit(row)}
                    disabled={saving}
                  >
                    {saving ? "..." : "Save"}
                  </button>
                  <button
                    type="button"
                    style={styles.cancelBtn}
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                row.name && <div style={styles.slotName}>{row.name}</div>
              )}
            </div>
          );
        })}
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}
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
    background: "transparent",
    border: "none",
    color: "#5b6b7c",
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

  slotsWrap: {
    maxWidth: 700,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  slot: {
    background: "#f5f6f7",
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    padding: "10px 14px",
    cursor: "pointer",
    minHeight: 36,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    transition: "background 0.12s ease",
  },
  slotNumber: {
    color: "#6c757d",
    fontSize: 13,
    fontWeight: 500,
  },
  slotName: {
    color: "#1f2d3d",
    fontSize: 14,
    fontWeight: 500,
    paddingLeft: 0,
  },
  slotEditWrap: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  slotInput: {
    flex: 1,
    height: 30,
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
    padding: "5px 12px",
    borderRadius: 3,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
  cancelBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#333",
    padding: "5px 10px",
    borderRadius: 3,
    fontSize: 12,
    cursor: "pointer",
  },
  empty: {
    padding: 20,
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    border: "1px dashed #d0d3d6",
    borderRadius: 4,
  },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },
};

export default PaymentModes;
