import { useEffect, useState } from "react";
import API from "../../api";

const ROLES = [
  "admin",
  "manager",
  "receptionist",
  "accountant",
  "waiter",
  "kitchen",
  "housekeeping",
  "staff",
  "cashier",
  "store manager",
  "sales executive",
  "house keeping",
];

const emptyForm = {
  username: "",
  fullname: "",
  designation: "",
  contact_number: "",
  email: "",
  address: "",
  role: "staff",
  password: "",
  is_active: true,
};

const ManageUsers = () => {
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
      const { data } = await API.get("/manage-users");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
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
      username: row.username || "",
      fullname: row.fullname || "",
      designation: row.designation || "",
      contact_number: row.contact_number || "",
      email: row.email || "",
      address: row.address || "",
      role: row.role || "staff",
      password: "",
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
    if (!modal.fullname?.trim()) {
      setError("Fullname is required");
      return;
    }
    if (!modal.email?.trim()) {
      setError("Email is required");
      return;
    }
    if (modal.mode === "add" && !modal.password) {
      setError("Password is required for new users");
      return;
    }

    const payload = {
      username: modal.username || undefined,
      fullname: modal.fullname,
      designation: modal.designation || null,
      contact_number: modal.contact_number || null,
      email: modal.email,
      address: modal.address || null,
      role: modal.role,
      is_active: modal.is_active,
    };
    if (modal.password) payload.password = modal.password;

    setSaving(true);
    try {
      if (modal.mode === "add") {
        await API.post("/manage-users", payload);
        setMessage("User added.");
      } else {
        await API.put(`/manage-users/${modal.id}`, payload);
        setMessage("User updated.");
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
    if (!confirm(`Delete user "${row.username || row.fullname}"?`)) return;
    setError("");
    setMessage("");
    try {
      await API.delete(`/manage-users/${row.id}`);
      setMessage("User deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Users</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New User
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Users</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>#</th>
              <th style={styles.th}>Username</th>
              <th style={styles.th}>Fullname</th>
              <th style={styles.th}>Designation</th>
              <th style={styles.th}>Contact Number</th>
              <th style={styles.th}>Email Id</th>
              <th style={styles.th}>Address</th>
              <th style={styles.th}>Role</th>
              <th style={{ ...styles.th, width: 70, textAlign: "center" }}>Active</th>
              <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={10} style={styles.empty}>
                  No users yet. Click <b>+ New User</b> to add one.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
              >
                <td style={styles.td}>{idx + 1}</td>
                <td style={styles.td}>{row.username}</td>
                <td style={styles.td}>{row.fullname}</td>
                <td style={styles.td}>{row.designation}</td>
                <td style={styles.td}>{row.contact_number}</td>
                <td style={styles.td}>{row.email}</td>
                <td style={styles.td}>{row.address}</td>
                <td style={styles.td}>{row.role}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}

      {modal && (
        <div style={styles.modalBackdrop} onClick={closeModal}>
          <div
            style={{ ...styles.modal, width: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              {modal.mode === "add" ? "Add User" : "Edit User"}
              <button onClick={closeModal} style={styles.modalClose}>
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Username</label>
                  <input
                    style={styles.input}
                    value={modal.username}
                    onChange={setField("username")}
                    placeholder="e.g. ABHISHEK"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Fullname</label>
                  <input
                    style={styles.input}
                    value={modal.fullname}
                    onChange={setField("fullname")}
                    placeholder="e.g. ABHISHEK RATHORE"
                  />
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Designation</label>
                  <input
                    style={styles.input}
                    value={modal.designation}
                    onChange={setField("designation")}
                    placeholder="e.g. Manager"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Contact Number</label>
                  <input
                    style={styles.input}
                    value={modal.contact_number}
                    onChange={setField("contact_number")}
                    placeholder="e.g. 9424582382"
                  />
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Email Id</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={modal.email}
                    onChange={setField("email")}
                    placeholder="name@example.com"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Role</label>
                  <select
                    style={styles.input}
                    value={modal.role}
                    onChange={setField("role")}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Address</label>
                <input
                  style={styles.input}
                  value={modal.address}
                  onChange={setField("address")}
                  placeholder="Address"
                />
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>
                    Password{" "}
                    {modal.mode === "edit" && (
                      <span style={{ color: "#999", fontWeight: 400 }}>
                        (leave blank to keep current)
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    style={styles.input}
                    value={modal.password}
                    onChange={setField("password")}
                    placeholder={modal.mode === "add" ? "Required" : "••••••"}
                  />
                </div>
                <div style={{ ...styles.field, justifyContent: "flex-end" }}>
                  <label style={styles.label}>Active</label>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      height: 34,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={modal.is_active}
                      onChange={setField("is_active")}
                    />
                    <span style={{ fontSize: 13, color: "#2c3e50" }}>
                      {modal.is_active ? "Active" : "Inactive"}
                    </span>
                  </label>
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
  subtitle: { fontSize: 13, color: "#5b6b7c", marginBottom: 12 },
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
  modalBody: {
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
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

export default ManageUsers;
