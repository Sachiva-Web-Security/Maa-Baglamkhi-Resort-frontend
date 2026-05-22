import { useEffect, useState } from "react";
import API from "../../api";

const TYPES = ["Percentage", "Fixed"];

const emptyForm = {
  coupon_code: "",
  discount_type: "Percentage",
  discount_value: "0",
  valid_from: "",
  valid_to: "",
  max_usage: "0",
  is_active: true,
};

const formatDMY = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const formatINR = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const formatValidRange = (from, to) => {
  if (!from && !to) return "—";
  if (from && to) return `${formatDMY(from)} → ${formatDMY(to)}`;
  return formatDMY(from || to);
};

const DiscountCoupons = () => {
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
      const { data } = await API.get("/discount-coupons");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load coupons");
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
      coupon_code: row.coupon_code || "",
      discount_type: row.discount_type || "Percentage",
      discount_value: String(row.discount_value ?? "0"),
      valid_from: row.valid_from || "",
      valid_to: row.valid_to || "",
      max_usage: String(row.max_usage ?? "0"),
      is_active: !!row.is_active,
    });
  const closeModal = () => setModal(null);

  const setField = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setModal((prev) => ({ ...prev, [key]: v }));
  };

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!modal.coupon_code?.trim()) {
      setError("Coupon code is required");
      return;
    }
    const payload = {
      coupon_code: modal.coupon_code.trim().toUpperCase(),
      discount_type: modal.discount_type,
      discount_value: Number(modal.discount_value) || 0,
      valid_from: modal.valid_from || null,
      valid_to: modal.valid_to || null,
      max_usage: Number(modal.max_usage) || 0,
      is_active: modal.is_active,
    };
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await API.post("/discount-coupons", payload);
        setMessage("Coupon added.");
      } else {
        await API.put(`/discount-coupons/${modal.id}`, payload);
        setMessage("Coupon updated.");
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
    if (!confirm(`Delete coupon "${row.coupon_code}"?`)) return;
    setError("");
    try {
      await API.delete(`/discount-coupons/${row.id}`);
      setMessage("Coupon deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Coupon Discount</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New Coupon
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Coupon Discount</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>#</th>
              <th style={styles.th}>Coupon Code</th>
              <th style={styles.th}>Discount Type</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Discount Value</th>
              <th style={styles.th}>Valid Range</th>
              <th style={{ ...styles.th, textAlign: "center" }}>Max Usage</th>
              <th style={{ ...styles.th, textAlign: "center" }}>Total Used</th>
              <th style={{ ...styles.th, textAlign: "center", width: 70 }}>Active</th>
              <th style={{ ...styles.th, width: 100, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} style={styles.empty}>No records found.</td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>{idx + 1}</td>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontWeight: 600 }}>
                    {row.coupon_code}
                  </td>
                  <td style={styles.td}>{row.discount_type}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {row.discount_type === "Percentage"
                      ? `${row.discount_value}%`
                      : `₹ ${formatINR(row.discount_value)}`}
                  </td>
                  <td style={styles.td}>{formatValidRange(row.valid_from, row.valid_to)}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {row.max_usage || "∞"}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{row.total_used}</td>
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

      {loading && <div style={styles.loading}>Loading...</div>}

      {modal && (
        <div style={styles.modalBackdrop} onClick={closeModal}>
          <div style={{ ...styles.modal, width: 540 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              {modal.mode === "add" ? "Add Coupon" : "Edit Coupon"}
              <button onClick={closeModal} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Coupon Code</label>
                  <input
                    style={styles.input}
                    autoFocus
                    value={modal.coupon_code}
                    onChange={setField("coupon_code")}
                    placeholder="e.g. SUMMER25"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Discount Type</label>
                  <select
                    style={styles.input}
                    value={modal.discount_type}
                    onChange={setField("discount_type")}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>
                    Discount Value {modal.discount_type === "Percentage" ? "(%)" : "(₹)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    style={styles.input}
                    value={modal.discount_value}
                    onChange={setField("discount_value")}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Max Usage (0 = unlimited)</label>
                  <input
                    type="number"
                    step="1"
                    style={styles.input}
                    value={modal.max_usage}
                    onChange={setField("max_usage")}
                  />
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Valid From</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={modal.valid_from}
                    onChange={setField("valid_from")}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Valid To</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={modal.valid_to}
                    onChange={setField("valid_to")}
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#2c3e50",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={modal.is_active}
                    onChange={setField("is_active")}
                  />
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
  subtitle: { fontSize: 13, fontWeight: 600, color: "#1f2d3d", marginBottom: 10 },
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
  empty: { padding: 16, color: "#5b6b7c", fontSize: 13, background: "#fff" },
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

export default DiscountCoupons;
