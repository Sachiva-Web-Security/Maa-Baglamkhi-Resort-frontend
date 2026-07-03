import { useEffect, useRef, useState } from "react";
import API from "../../api";

const emptyForm = {
  name: "",
  age: "",
  gender: "Male",
  address: "",
  mobile: "",
  alternate_mobile: "",
  email: "",
  nationality: "INDIAN",
  company: "",
  company_gst: "",
  company_address: "",
  id_type: "",
  id_number: "",
};

const Guests = () => {
  const [view, setView] = useState("list"); // 'list' | 'form'
  const [rows, setRows] = useState([]);
  const [idTypes, setIdTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [filters, setFilters] = useState({ mobile: "", name: "" });
  const [form, setForm] = useState({ mode: "add", ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fileRef = useRef(null);

  const load = async (params = {}) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/guest-master", { params });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load guests");
    } finally {
      setLoading(false);
    }
  };

  const loadIdTypes = async () => {
    try {
      const { data } = await API.get("/id-types");
      setIdTypes(Array.isArray(data) ? data : []);
    } catch {
      setIdTypes([]);
    }
  };

  useEffect(() => {
    load();
    loadIdTypes();
  }, []);

  const onSearch = (e) => {
    e?.preventDefault();
    load({ mobile: filters.mobile, name: filters.name });
  };

  const clearFilters = () => {
    setFilters({ mobile: "", name: "" });
    load();
  };

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
      name: row.name || "",
      age: row.age ?? "",
      gender: row.gender || "Male",
      address: row.address || "",
      mobile: row.mobile || "",
      alternate_mobile: row.alternate_mobile || "",
      email: row.email || "",
      nationality: row.nationality || "INDIAN",
      company: row.company || "",
      company_gst: row.company_gst || "",
      company_address: row.company_address || "",
      id_type: row.id_type || "",
      id_number: row.id_number || "",
    });
    setError("");
    setMessage("");
    setView("form");
  };

  const closeForm = () => setView("list");

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSave = async (e) => {
    e?.preventDefault();
    setError("");
    setMessage("");
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, age: form.age === "" ? null : Number(form.age) };
      if (form.mode === "add") {
        await API.post("/guest-master", payload);
        setMessage("Guest added.");
      } else {
        await API.put(`/guest-master/${form.id}`, payload);
        setMessage("Guest updated.");
      }
      await load(filters);
      setView("list");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete guest "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/guest-master/${row.id}`);
      setMessage("Guest deleted.");
      await load(filters);
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const onExport = async () => {
    try {
      const params = new URLSearchParams(filters).toString();
      const base = API.defaults.baseURL || "";
      const url = `${base}/guest-master/export${params ? `?${params}` : ""}`;
      const token = localStorage.getItem("token");
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `guests-${Date.now()}.csv`;
      link.click();
      setMessage("Exported.");
    } catch (err) {
      setError(err.message || "Export failed");
    }
  };

  const onImportClick = () => fileRef.current?.click();

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await API.post("/guest-master/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(`Imported ${data.added} guests (${data.skipped} skipped).`);
      await load(filters);
    } catch (err) {
      setError(err.response?.data?.message || "Import failed");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Guests</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={() => load(filters)}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.importBtn} onClick={onImportClick}>
            ⤓ Import Guest
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={onImportFile}
          />
          <button type="button" style={styles.exportBtn} onClick={onExport}>
            ⤒ Export to Excel
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New Guest
          </button>
        </div>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      {view === "list" ? (
        <>
          <div style={styles.subtitle}>List of Guest</div>

          <form onSubmit={onSearch} style={styles.filterBar}>
            <div style={styles.filterField}>
              <label style={styles.label}>Mobile Number</label>
              <input
                style={styles.input}
                value={filters.mobile}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, mobile: e.target.value }))
                }
                placeholder=""
              />
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Name</label>
              <input
                style={styles.input}
                value={filters.name}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, name: e.target.value }))
                }
                placeholder=""
              />
            </div>
            <button type="submit" style={styles.searchBtn}>
              🔍 Search
            </button>
            <button type="button" style={styles.clearBtn} onClick={clearFilters}>
              ⟳ Clear
            </button>
          </form>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: 40 }}>#</th>
                  <th style={styles.th}>Name</th>
                  <th style={{ ...styles.th, width: 50 }}>Age</th>
                  <th style={{ ...styles.th, width: 80 }}>Gender</th>
                  <th style={styles.th}>Address</th>
                  <th style={styles.th}>Mobile Number</th>
                  <th style={styles.th}>Email Id</th>
                  <th style={styles.th}>Company</th>
                  <th style={{ ...styles.th, width: 70, textAlign: "right" }} />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} style={styles.empty}>
                      No guests yet. Click <b>+ New Guest</b> to add one.
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
                    <td style={styles.td}>{row.age ?? ""}</td>
                    <td style={styles.td}>{row.gender}</td>
                    <td style={styles.td}>{row.address}</td>
                    <td style={styles.td}>{row.mobile}</td>
                    <td style={styles.td}>{row.email}</td>
                    <td style={styles.td}>{row.company}</td>
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
        </>
      ) : (
        <form onSubmit={onSave} style={{ marginTop: 8 }}>
          <div style={styles.subtitle}>
            <span>Add/Edit Guest Details</span>
            <button
              type="button"
              onClick={closeForm}
              style={styles.closeBtn}
              title="Close"
            >
              ×
            </button>
          </div>

          <div style={styles.formCol}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={setField("name")}
                autoFocus
              />
            </div>

            <div style={styles.row2}>
              <div style={styles.field}>
                <label style={styles.label}>Age</label>
                <input
                  type="number"
                  style={styles.input}
                  value={form.age}
                  onChange={setField("age")}
                  placeholder="Enter age"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Gender</label>
                <select
                  style={styles.input}
                  value={form.gender}
                  onChange={setField("gender")}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Address</label>
              <input
                style={styles.input}
                value={form.address}
                onChange={setField("address")}
              />
            </div>

            <div style={styles.row2}>
              <div style={styles.field}>
                <label style={styles.label}>Mobile Number</label>
                <input
                  style={styles.input}
                  value={form.mobile}
                  onChange={setField("mobile")}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Alternate Numbers</label>
                <input
                  style={styles.input}
                  value={form.alternate_mobile}
                  onChange={setField("alternate_mobile")}
                  placeholder="Enter alternate contact number"
                />
              </div>
            </div>

            <div style={styles.row2}>
              <div style={styles.field}>
                <label style={styles.label}>Email Id</label>
                <input
                  type="email"
                  style={styles.input}
                  value={form.email}
                  onChange={setField("email")}
                  placeholder="Enter email id"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Nationality</label>
                <input
                  style={styles.input}
                  value={form.nationality}
                  onChange={setField("nationality")}
                />
              </div>
            </div>

            <div style={styles.row2}>
              <div style={styles.field}>
                <label style={styles.label}>Company</label>
                <input
                  style={styles.input}
                  value={form.company}
                  onChange={setField("company")}
                  placeholder="Enter company name"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Company GST</label>
                <input
                  style={styles.input}
                  value={form.company_gst}
                  onChange={setField("company_gst")}
                  placeholder="Enter company GST"
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Company Address</label>
              <input
                style={styles.input}
                value={form.company_address}
                onChange={setField("company_address")}
                placeholder="Enter company address"
              />
            </div>

            <div style={styles.row2}>
              <div style={styles.field}>
                <label style={styles.label}>ID Type</label>
                <select
                  style={styles.input}
                  value={form.id_type}
                  onChange={setField("id_type")}
                >
                  <option value="">— Select —</option>
                  {idTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>
                  ID Number <span style={{ color: "#d9534f" }}>*</span>
                </label>
                <input
                  style={styles.input}
                  value={form.id_number}
                  onChange={setField("id_number")}
                  placeholder="XXXXXXXX1234"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" style={styles.saveBtn} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" style={styles.listBtn} onClick={closeForm}>
                List
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

const styles = {
  page: {
    padding: "0 10px 30px",
    background: "#f1f1f1",
    minHeight: "100%",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#222",
    fontSize: 9,
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #e6e8eb",
    height: 36,
    paddingBottom: 0,
    marginBottom: 8,
    background: "#fff",
    gap: 8,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: 12, fontWeight: 400, color: "#555" },
  refreshBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#333",
    padding: "4px 7px",
    borderRadius: 0,
    fontSize: 9,
    cursor: "pointer",
  },
  importBtn: {
    background: "#f0ad4e",
    border: "1px solid #eea236",
    color: "#fff",
    padding: "4px 7px",
    borderRadius: 0,
    fontSize: 9,
    fontWeight: 500,
    cursor: "pointer",
  },
  exportBtn: {
    background: "#f0ad4e",
    border: "1px solid #eea236",
    color: "#fff",
    padding: "4px 7px",
    borderRadius: 0,
    fontSize: 9,
    fontWeight: 500,
    cursor: "pointer",
  },
  newBtn: {
    background: "#5bc0de",
    border: "1px solid #46b8da",
    color: "#fff",
    padding: "4px 7px",
    borderRadius: 0,
    fontSize: 9,
    fontWeight: 500,
    cursor: "pointer",
  },
  subtitle: {
    fontSize: 9,
    fontWeight: 600,
    color: "#1f2d3d",
    marginBottom: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#46b8da",
    fontSize: 20,
    cursor: "pointer",
    lineHeight: 1,
  },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  filterBar: {
    display: "flex",
    alignItems: "flex-end",
    gap: 14,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  filterField: { display: "flex", flexDirection: "column", minWidth: 200 },
  searchBtn: {
    background: "transparent",
    border: "none",
    color: "#3a8bff",
    fontSize: 9,
    cursor: "pointer",
    padding: "8px 12px",
  },
  clearBtn: {
    background: "transparent",
    border: "none",
    color: "#5b6b7c",
    fontSize: 9,
    cursor: "pointer",
    padding: "8px 4px",
  },

  tableWrap: {
    border: "1px solid #e6e8eb",
    borderRadius: 0,
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 9,
    minWidth: 1100,
  },
  th: {
    background: "#f5f5f5",
    color: "#111",
    borderBottom: "1px solid #d5d9dc",
    padding: "7px 7px",
    textAlign: "left",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "7px 7px",
    borderBottom: "1px solid #f0f0f0",
    color: "#2c3e50",
  },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#f3f3f3" },
  editBtn: {
    background: "#5bc0de",
    border: "1px solid #46b8da",
    color: "#fff",
    width: 20,
    height: 20,
    borderRadius: 0,
    fontSize: 9,
    marginRight: 4,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#d9534f",
    border: "1px solid #d43f3a",
    color: "#fff",
    width: 20,
    height: 20,
    borderRadius: 0,
    fontSize: 9,
    cursor: "pointer",
  },
  empty: { padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },

  formCol: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxWidth: 260,
  },
  field: { display: "flex", flexDirection: "column" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  label: {
    fontSize: 9,
    fontWeight: 600,
    color: "#1f2d3d",
    marginBottom: 4,
  },
  input: {
    height: 23,
    border: "1px solid #ced4da",
    borderRadius: 0,
    padding: "4px 8px",
    fontSize: 9,
    background: "#fff",
    color: "#2c3e50",
    outline: "none",
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
  listBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#333",
    padding: "6px 14px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
  },
};

export default Guests;
