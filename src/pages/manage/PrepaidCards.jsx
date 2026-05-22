import { useEffect, useState } from "react";
import API from "../../api";

const STATUS_OPTIONS = ["Active", "Used", "Expired", "Cancelled"];

const emptyForm = {
  card_number: "",
  holder_name: "",
  mobile: "",
  amount: "0",
  balance: "0",
  issue_date: "",
  expiry_date: "",
  status: "Active",
};

const formatINR = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const formatDMY = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const PrepaidCards = () => {
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
      const { data } = await API.get("/prepaid-cards");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load prepaid cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => setModal({ mode: "add", ...emptyForm });
  const openEdit = (row) =>
    setModal({
      mode: "edit",
      id: row.id,
      card_number: row.card_number || "",
      holder_name: row.holder_name || "",
      mobile: row.mobile || "",
      amount: String(row.amount ?? "0"),
      balance: String(row.balance ?? "0"),
      issue_date: row.issue_date || "",
      expiry_date: row.expiry_date || "",
      status: row.status || "Active",
    });
  const closeModal = () => setModal(null);

  const setField = (key) => (e) =>
    setModal((prev) => ({ ...prev, [key]: e.target.value }));

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!modal.card_number?.trim()) {
      setError("Card number is required");
      return;
    }
    const payload = {
      card_number: modal.card_number.trim(),
      holder_name: modal.holder_name || null,
      mobile: modal.mobile || null,
      amount: Number(modal.amount) || 0,
      balance: Number(modal.balance) || 0,
      issue_date: modal.issue_date || null,
      expiry_date: modal.expiry_date || null,
      status: modal.status || "Active",
    };
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await API.post("/prepaid-cards", payload);
        setMessage("Prepaid card added.");
      } else {
        await API.put(`/prepaid-cards/${modal.id}`, payload);
        setMessage("Prepaid card updated.");
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
    if (!confirm(`Delete card "${row.card_number}"?`)) return;
    setError("");
    try {
      await API.delete(`/prepaid-cards/${row.id}`);
      setMessage("Prepaid card deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Prepaid Cards</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
        </div>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.tableWrap}>
        {rows.length === 0 && !loading ? (
          <div style={styles.empty}>No records found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40 }}>#</th>
                <th style={styles.th}>Card Number</th>
                <th style={styles.th}>Holder Name</th>
                <th style={styles.th}>Mobile</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Amount</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Balance</th>
                <th style={styles.th}>Issue Date</th>
                <th style={styles.th}>Expiry Date</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, width: 100, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>{idx + 1}</td>
                  <td style={{ ...styles.td, fontFamily: "monospace" }}>{row.card_number}</td>
                  <td style={styles.td}>{row.holder_name}</td>
                  <td style={styles.td}>{row.mobile}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{formatINR(row.amount)}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{formatINR(row.balance)}</td>
                  <td style={styles.td}>{formatDMY(row.issue_date)}</td>
                  <td style={styles.td}>{formatDMY(row.expiry_date)}</td>
                  <td style={styles.td}>
                    <span style={statusStyle(row.status)}>{row.status}</span>
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
        )}
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}

      {modal && (
        <div style={styles.modalBackdrop} onClick={closeModal}>
          <div style={{ ...styles.modal, width: 540 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              {modal.mode === "add" ? "Add Prepaid Card" : "Edit Prepaid Card"}
              <button onClick={closeModal} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Card Number</label>
                  <input
                    style={styles.input}
                    autoFocus
                    value={modal.card_number}
                    onChange={setField("card_number")}
                    placeholder="e.g. CARD-001"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Status</label>
                  <select
                    style={styles.input}
                    value={modal.status}
                    onChange={setField("status")}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Holder Name</label>
                  <input
                    style={styles.input}
                    value={modal.holder_name}
                    onChange={setField("holder_name")}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Mobile</label>
                  <input
                    style={styles.input}
                    value={modal.mobile}
                    onChange={setField("mobile")}
                  />
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    style={styles.input}
                    value={modal.amount}
                    onChange={setField("amount")}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    style={styles.input}
                    value={modal.balance}
                    onChange={setField("balance")}
                  />
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Issue Date</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={modal.issue_date}
                    onChange={setField("issue_date")}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Expiry Date</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={modal.expiry_date}
                    onChange={setField("expiry_date")}
                  />
                </div>
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

const statusStyle = (status) => {
  const map = {
    Active: { background: "#e6f4ea", color: "#2c7a3d", border: "#bfe2c8" },
    Used: { background: "#eef3ff", color: "#3a51a8", border: "#c7d4f2" },
    Expired: { background: "#fdecea", color: "#b94a48", border: "#f3c2bd" },
    Cancelled: { background: "#f4f4f4", color: "#6c757d", border: "#dadada" },
  };
  const c = map[status] || map.Active;
  return {
    padding: "2px 8px",
    fontSize: 11,
    borderRadius: 10,
    background: c.background,
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
  tableWrap: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    overflow: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 },
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
  empty: {
    padding: 16,
    color: "#5b6b7c",
    fontSize: 13,
    background: "#fff",
  },
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
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
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

export default PrepaidCards;
