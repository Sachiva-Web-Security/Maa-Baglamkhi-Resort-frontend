import { useEffect, useState } from "react";
import API from "../../api";

const RATE_TYPES = ["Single Bed", "Double Bed", "Triple Bed", "Extra Bed", "Child Rate"];
const SEASONS = [
  { key: "basic", label: "Basic" },
  { key: "rack", label: "Rack" },
  { key: "seasonal", label: "Seasonal" },
  { key: "peak_season", label: "Peak Season" },
  { key: "ep", label: "EP" },
];

const emptyRates = () =>
  RATE_TYPES.map((rt) => ({
    rate_type: rt,
    basic: 0,
    rack: 0,
    seasonal: 0,
    peak_season: 0,
    ep: 0,
  }));

const emptyForm = () => ({
  mode: "add",
  name: "",
  description: "",
  max_adults: 10,
  max_child: 10,
  is_active: true,
  rates: emptyRates(),
});

const RoomType = () => {
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
      const { data } = await API.get("/room-types");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load room types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => setModal({ ...emptyForm() });
  const openEdit = (row) =>
    setModal({
      mode: "edit",
      id: row.id,
      name: row.name || "",
      description: row.description || "",
      max_adults: row.max_adults ?? 10,
      max_child: row.max_child ?? 10,
      is_active: !!row.is_active,
      rates: RATE_TYPES.map((rt) => {
        const existing = (row.rates || []).find((r) => r.rate_type === rt);
        return {
          rate_type: rt,
          basic: Number(existing?.basic) || 0,
          rack: Number(existing?.rack) || 0,
          seasonal: Number(existing?.seasonal) || 0,
          peak_season: Number(existing?.peak_season) || 0,
          ep: Number(existing?.ep) || 0,
        };
      }),
    });
  const closeModal = () => setModal(null);

  const updateRate = (rateType, season) => (e) => {
    const v = e.target.value;
    setModal((prev) => ({
      ...prev,
      rates: prev.rates.map((r) =>
        r.rate_type === rateType ? { ...r, [season]: v } : r,
      ),
    }));
  };

  const onSave = async () => {
    setError("");
    setMessage("");
    if (!modal.name?.trim()) {
      setError("Room type name is required");
      return;
    }
    const payload = {
      name: modal.name.trim(),
      description: modal.description || "",
      max_adults: Number(modal.max_adults) || 0,
      max_child: Number(modal.max_child) || 0,
      is_active: modal.is_active,
      rates: modal.rates.map((r) => ({
        rate_type: r.rate_type,
        basic: Number(r.basic) || 0,
        rack: Number(r.rack) || 0,
        seasonal: Number(r.seasonal) || 0,
        peak_season: Number(r.peak_season) || 0,
        ep: Number(r.ep) || 0,
      })),
    };
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await API.post("/room-types", payload);
        setMessage("Room type added.");
      } else {
        await API.put(`/room-types/${modal.id}`, payload);
        setMessage("Room type updated.");
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
    if (!confirm(`Delete room type "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/room-types/${row.id}`);
      setMessage("Room type deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Room Types</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={styles.refreshBtn} onClick={load}>
            ⟳ Refresh
          </button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>
            + New Room Type
          </button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Room Types</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.outerHeader}>
        <div style={{ ...styles.headerCell, width: 40 }}>#</div>
        <div style={{ ...styles.headerCell, flex: 1 }}>Room Type</div>
        <div style={{ ...styles.headerCell, width: 90, textAlign: "center" }}>Active</div>
        <div style={{ ...styles.headerCell, width: 90 }} />
      </div>

      {rows.length === 0 && !loading && (
        <div style={styles.empty}>
          No room types yet. Click <b>+ New Room Type</b> to add one.
        </div>
      )}

      {rows.map((row, idx) => (
        <div key={row.id} style={styles.outerRow}>
          <div style={{ ...styles.outerCell, width: 40, alignSelf: "flex-start" }}>
            {idx + 1}
          </div>
          <div style={{ ...styles.outerCell, flex: 1, display: "block" }}>
            <div style={styles.rtName}>{row.name}</div>
            <table style={styles.nested}>
              <thead>
                <tr>
                  <th style={styles.nestedTh}>Rate Type</th>
                  {SEASONS.map((s) => (
                    <th key={s.key} style={styles.nestedTh}>{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RATE_TYPES.map((rt) => {
                  const r = (row.rates || []).find((x) => x.rate_type === rt) || {};
                  return (
                    <tr key={rt}>
                      <td style={styles.nestedTd}>{rt}</td>
                      {SEASONS.map((s) => (
                        <td key={s.key} style={styles.nestedTd}>
                          {Number(r[s.key]) || 0}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ ...styles.outerCell, width: 90, justifyContent: "center", alignSelf: "flex-start" }}>
            <input
              type="checkbox"
              checked={!!row.is_active}
              readOnly
              style={{ pointerEvents: "none" }}
            />
          </div>
          <div style={{ ...styles.outerCell, width: 90, alignSelf: "flex-start" }}>
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
          </div>
        </div>
      ))}

      {loading && <div style={styles.loading}>Loading...</div>}

      {modal && (
        <div style={styles.modalBackdrop} onClick={closeModal}>
          <div style={{ ...styles.modal, width: 590 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              Add/Edit Room Type
              <button onClick={closeModal} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.row2}>
                <div style={styles.field}>
                  <label style={styles.label}>Room Type Name</label>
                  <input
                    style={styles.input}
                    autoFocus
                    value={modal.name}
                    onChange={(e) =>
                      setModal((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Executive"
                  />
                </div>
                <div style={{ ...styles.field, justifyContent: "flex-end" }}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#2c3e50",
                      height: 34,
                      marginTop: 18,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={modal.is_active}
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                    Active
                  </label>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <input style={styles.input} value={modal.description} placeholder="Room type description (facilities if any)"
                  onChange={(e) => setModal((prev) => ({ ...prev, description: e.target.value }))} />
              </div>
              <div style={{ ...styles.row2, gridTemplateColumns: "80px 80px" }}>
                <div style={styles.field}><label style={styles.label}>Max Adults</label><input type="number" style={styles.input} value={modal.max_adults} onChange={(e) => setModal((prev) => ({ ...prev, max_adults: e.target.value }))} /></div>
                <div style={styles.field}><label style={styles.label}>Max Child</label><input type="number" style={styles.input} value={modal.max_child} onChange={(e) => setModal((prev) => ({ ...prev, max_child: e.target.value }))} /></div>
              </div>
              <div style={{ fontSize: 8, color: "#2196d3" }}>Enter Rate with/without meal plan according to your need.</div>

              <div style={{ ...styles.label, marginTop: 6 }}>Rate Matrix</div>
              <table style={styles.matrix}>
                <thead>
                  <tr>
                    <th style={styles.matrixTh}>Rate Type</th>
                    {SEASONS.map((s) => (
                      <th key={s.key} style={styles.matrixTh}>{s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modal.rates.map((r) => (
                    <tr key={r.rate_type}>
                      <td style={styles.matrixTd}>{r.rate_type}</td>
                      {SEASONS.map((s) => (
                        <td key={s.key} style={styles.matrixTd}>
                          <input
                            type="number"
                            step="0.01"
                            style={styles.cellInput}
                            value={r[s.key]}
                            onChange={updateRate(r.rate_type, s.key)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
  },
  title: { margin: 0, fontSize: 12, fontWeight: 600, color: "#222" },
  refreshBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#333",
    padding: "4px 7px",
    borderRadius: 0,
    fontSize: 9,
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
  subtitle: { display: "none" },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  outerHeader: {
    display: "flex",
    background: "#f5f5f5",
    color: "#111",
    border: "1px solid #d6d9dc",
    borderRadius: 0,
    fontWeight: 600,
    fontSize: 9,
  },
  headerCell: { padding: "7px 10px", whiteSpace: "nowrap" },
  outerRow: {
    display: "flex",
    borderBottom: "1px solid #e6e8eb",
    borderLeft: "1px solid #e6e8eb",
    borderRight: "1px solid #e6e8eb",
    background: "#fff",
  },
  outerCell: { padding: "5px 7px", display: "flex", alignItems: "center" },
  rtName: { fontSize: 9, fontWeight: 500, marginBottom: 4, color: "#222" },

  nested: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 9,
    background: "#fff",
    border: "1px solid #e6e8eb",
  },
  nestedTh: {
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    padding: "6px 7px",
    textAlign: "left",
    fontWeight: 600,
    color: "#1f2d3d",
  },
  nestedTd: {
    padding: "6px 7px",
    borderBottom: "1px solid #f0f0f0",
    color: "#2c3e50",
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
  empty: {
    padding: 16,
    color: "#5b6b7c",
    fontSize: 13,
    background: "#fff",
    border: "1px solid #e6e8eb",
    borderRadius: "0 0 3px 3px",
  },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },

  modalBackdrop: {
    position: "fixed",
    top: 70,
    right: 0,
    bottom: 0,
    left: 0,
    background: "#f1f1f1",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    zIndex: 20,
  },
  modal: {
    background: "#fff",
    borderRadius: 0,
    boxShadow: "none",
    border: "1px solid #d4d8db",
    overflow: "hidden",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    padding: "7px 9px",
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    fontSize: 9,
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
  modalBody: { padding: 8, display: "flex", flexDirection: "column", gap: 8 },
  field: { display: "flex", flexDirection: "column" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#1f2d3d",
    marginBottom: 4,
  },
  input: {
    height: 23,
    border: "1px solid #ced4da",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 9,
    background: "#fff",
    color: "#2c3e50",
    outline: "none",
  },

  matrix: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 9,
    border: "1px solid #e6e8eb",
  },
  matrixTh: {
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    padding: "6px 5px",
    textAlign: "left",
    fontWeight: 600,
    color: "#1f2d3d",
    whiteSpace: "nowrap",
  },
  matrixTd: {
    padding: "4px 5px",
    borderBottom: "1px solid #f0f0f0",
    color: "#2c3e50",
  },
  cellInput: {
    width: "100%",
    height: 23,
    border: "1px solid #ced4da",
    borderRadius: 3,
    padding: "2px 6px",
    fontSize: 12,
    outline: "none",
  },

  modalFooter: {
    padding: "7px 8px",
    borderTop: "1px solid #e6e8eb",
    display: "flex",
    justifyContent: "flex-start",
    gap: 8,
    position: "sticky",
    bottom: 0,
    background: "#fff",
  },
  cancelBtn: {
    display: "none",
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

export default RoomType;
