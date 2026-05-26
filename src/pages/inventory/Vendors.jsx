import { useEffect, useState } from "react";
import API from "../../api";

const emptyForm = {
  id: null,
  name: "",
  address: "",
  city: "",
  contact_person: "",
  mobile_number: "",
  landline_number: "",
  gstin: "",
  email: "",
  opening_balance: "0",
  is_active: true,
};

const Vendors = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/inventory-vendors");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => setPanel({ ...emptyForm });
  const openEdit = (row) =>
    setPanel({
      id: row.id,
      name: row.name || "",
      address: row.address || "",
      city: row.city || "",
      contact_person: row.contact_person || "",
      mobile_number: row.mobile_number || "",
      landline_number: row.landline_number || "",
      gstin: row.gstin || "",
      email: row.email || "",
      opening_balance: String(row.opening_balance ?? "0"),
      is_active: row.is_active !== false,
    });
  const closePanel = () => setPanel(null);

  const setF = (key) => (e) =>
    setPanel((prev) => ({ ...prev, [key]: e.target.value }));

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!panel.name?.trim()) {
      setError("Vendor name is required");
      return;
    }
    const payload = {
      name: panel.name.trim(),
      address: panel.address.trim(),
      city: panel.city.trim(),
      contact_person: panel.contact_person.trim(),
      mobile_number: panel.mobile_number.trim(),
      landline_number: panel.landline_number.trim(),
      gstin: panel.gstin.trim(),
      email: panel.email.trim(),
      opening_balance: Number(panel.opening_balance) || 0,
      is_active: panel.is_active ? 1 : 0,
    };
    setSaving(true);
    try {
      if (panel.id) {
        await API.put(`/inventory-vendors/${panel.id}`, payload);
        setMessage("Vendor updated.");
      } else {
        await API.post("/inventory-vendors", payload);
        setMessage("Vendor added.");
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
    if (!confirm(`Delete vendor "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/inventory-vendors/${row.id}`);
      setMessage("Vendor deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Vendors</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Vendor</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: panel
            ? "minmax(0, 1fr) minmax(420px, 1fr)"
            : "minmax(0, 1fr)",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.thDark, width: 40 }}>#</th>
                <th style={styles.thDark}>Name</th>
                <th style={styles.thDark}>Address</th>
                <th style={styles.thDark}>City</th>
                <th style={styles.thDark}>Contact Person</th>
                <th style={styles.thDark}>Mobile Number</th>
                <th style={styles.thDark}>Landline Number</th>
                <th style={{ ...styles.thDark, width: 110, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={styles.empty}>
                    No vendors yet. Click <b>+ New</b> to add one.
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
                  <td style={styles.td}>{row.address || ""}</td>
                  <td style={styles.td}>{row.city || ""}</td>
                  <td style={styles.td}>{row.contact_person || ""}</td>
                  <td style={styles.td}>{row.mobile_number || ""}</td>
                  <td style={styles.td}>{row.landline_number || ""}</td>
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

        {panel && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span>{panel.id ? "Edit Vendor" : "Add Vendor"}</span>
              <button
                type="button"
                onClick={closePanel}
                style={styles.panelClose}
                title="Close"
              >
                ×
              </button>
            </div>
            <div style={styles.panelBody}>
              <Field label="Vendor Name" required>
                <input style={styles.input} autoFocus value={panel.name} onChange={setF("name")} placeholder="e.g. NAKODA SWEETS" />
              </Field>
              <div style={styles.grid2}>
                <Field label="Address">
                  <input style={styles.input} value={panel.address} onChange={setF("address")} />
                </Field>
                <Field label="City">
                  <input style={styles.input} value={panel.city} onChange={setF("city")} />
                </Field>
              </div>
              <Field label="Contact Person">
                <input style={styles.input} value={panel.contact_person} onChange={setF("contact_person")} />
              </Field>
              <div style={styles.grid2}>
                <Field label="Mobile Number">
                  <input style={styles.input} value={panel.mobile_number} onChange={setF("mobile_number")} />
                </Field>
                <Field label="Landline Number">
                  <input style={styles.input} value={panel.landline_number} onChange={setF("landline_number")} />
                </Field>
              </div>
              <div style={styles.grid2}>
                <Field label="GSTIN">
                  <input style={styles.input} value={panel.gstin} onChange={setF("gstin")} />
                </Field>
                <Field label="Email">
                  <input type="email" style={styles.input} value={panel.email} onChange={setF("email")} />
                </Field>
              </div>
              <Field label="Opening Balance">
                <input type="number" step="0.01" style={styles.input} value={panel.opening_balance} onChange={setF("opening_balance")} />
              </Field>
              <label style={styles.activeRow}>
                <input
                  type="checkbox"
                  checked={!!panel.is_active}
                  onChange={(e) =>
                    setPanel((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
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
  subtitle: { fontSize: 13, color: "#5b6b7c", marginBottom: 12 },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  tableWrap: { border: "1px solid #e6e8eb", borderRadius: 3, overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thDark: {
    background: "#5a6877",
    color: "#fff",
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
  grid2: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 },
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

export default Vendors;
