import { useEffect, useState } from "react";
import API from "../../api";

const MODULES = [
  "Admin",
  "Dashboard",
  "Front Office",
  "F&B Service",
  "Quick Sales",
  "Inventory",
  "Banquet",
  "Gaming Zone",
  "Reports",
];

const ROLES = [
  "admin",
  "manager",
  "receptionist",
  "accountant",
  "waiter",
  "kitchen",
  "housekeeping",
  "cashier",
  "store manager",
  "sales executive",
  "staff",
];

const emptyForm = {
  module: "",
  role: "",
  branch_id: "all",
  can_view: true,
  can_create: false,
  can_edit: false,
  can_delete: false,
};

const AccessRules = () => {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [filters, setFilters] = useState({
    module: "",
    role: "",
    branch_id: "",
  });
  const [searched, setSearched] = useState(false);

  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadBranches = async () => {
    try {
      const { data } = await API.get("/branches");
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      setBranches([]);
    }
  };

  const search = async (params = filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/access-rules", { params });
      setRows(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load access rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const onSearch = (e) => {
    e?.preventDefault();
    search();
  };

  const refresh = () => search();

  const setFilter = (key) => (e) =>
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  const openAdd = () =>
    setModal({
      mode: "add",
      ...emptyForm,
      module: filters.module || "",
      role: filters.role || "",
      branch_id: filters.branch_id || "all",
    });
  const openEdit = (row) =>
    setModal({
      mode: "edit",
      id: row.id,
      module: row.module,
      role: row.role,
      branch_id: row.branch_id == null ? "all" : String(row.branch_id),
      can_view: row.can_view,
      can_create: row.can_create,
      can_edit: row.can_edit,
      can_delete: row.can_delete,
    });
  const closeModal = () => setModal(null);

  const setField = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setModal((prev) => ({ ...prev, [key]: v }));
  };

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!modal.module) { setError("Module is required"); return; }
    if (!modal.role) { setError("Role is required"); return; }

    const payload = {
      module: modal.module,
      role: modal.role,
      branch_id: modal.branch_id === "all" ? null : Number(modal.branch_id) || null,
      can_view: !!modal.can_view,
      can_create: !!modal.can_create,
      can_edit: !!modal.can_edit,
      can_delete: !!modal.can_delete,
    };
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await API.post("/access-rules", payload);
        setMessage("Access rule added.");
      } else {
        await API.put(`/access-rules/${modal.id}`, payload);
        setMessage("Access rule updated.");
      }
      closeModal();
      if (searched) await search();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete access rule for ${row.module} / ${row.role}?`)) return;
    setError("");
    try {
      await API.delete(`/access-rules/${row.id}`);
      setMessage("Access rule deleted.");
      await search();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Access Rules</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={refresh}>
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

      <form onSubmit={onSearch} style={styles.filterBar}>
        <div style={styles.field}>
          <label style={styles.label}>Module</label>
          <select style={styles.input} value={filters.module} onChange={setFilter("module")}>
            <option value="">Select Module</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Role</label>
          <select style={styles.input} value={filters.role} onChange={setFilter("role")}>
            <option value="">Select Role</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Branch</label>
          <select
            style={styles.input}
            value={filters.branch_id}
            onChange={setFilter("branch_id")}
          >
            <option value="">Select Branch</option>
            <option value="all">All</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" style={styles.searchBtn} disabled={loading}>
          ⟳ Search
        </button>
      </form>

      <div style={styles.tableWrap}>
        {!searched ? (
          <div style={styles.empty}>
            Choose filters and click <b>Search</b> to view access rules.
          </div>
        ) : rows.length === 0 ? (
          <div style={styles.empty}>No records found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40 }}>#</th>
                <th style={styles.th}>Module</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Branch</th>
                <th style={{ ...styles.th, textAlign: "center", width: 60 }}>View</th>
                <th style={{ ...styles.th, textAlign: "center", width: 70 }}>Create</th>
                <th style={{ ...styles.th, textAlign: "center", width: 60 }}>Edit</th>
                <th style={{ ...styles.th, textAlign: "center", width: 70 }}>Delete</th>
                <th style={{ ...styles.th, width: 100, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>{idx + 1}</td>
                  <td style={styles.td}>{row.module}</td>
                  <td style={styles.td}>{row.role}</td>
                  <td style={styles.td}>{row.branch_name || "All"}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {row.can_view ? "✔" : ""}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {row.can_create ? "✔" : ""}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {row.can_edit ? "✔" : ""}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {row.can_delete ? "✔" : ""}
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
          <div style={{ ...styles.modal, width: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              {modal.mode === "add" ? "Add Access Rule" : "Edit Access Rule"}
              <button onClick={closeModal} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.field}>
                <label style={styles.label}>Module</label>
                <select style={styles.input} value={modal.module} onChange={setField("module")}>
                  <option value="">Select Module</option>
                  {MODULES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Role</label>
                <select style={styles.input} value={modal.role} onChange={setField("role")}>
                  <option value="">Select Role</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Branch</label>
                <select
                  style={styles.input}
                  value={modal.branch_id}
                  onChange={setField("branch_id")}
                >
                  <option value="all">All</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.permGrid}>
                {[
                  ["can_view", "View"],
                  ["can_create", "Create"],
                  ["can_edit", "Edit"],
                  ["can_delete", "Delete"],
                ].map(([key, label]) => (
                  <label key={key} style={styles.permLabel}>
                    <input
                      type="checkbox"
                      checked={!!modal[key]}
                      onChange={setField(key)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
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

  filterBar: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr auto",
    gap: 14,
    alignItems: "end",
    marginBottom: 12,
  },
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
  searchBtn: {
    background: "#3a8bff",
    color: "#fff",
    border: "1px solid #2e6da4",
    padding: "7px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    height: 34,
  },

  tableWrap: {
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    overflow: "auto",
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
  permGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: "8px 0",
  },
  permLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#2c3e50",
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

export default AccessRules;
