import { useEffect, useState } from "react";
import API from "../api";

const BarToFood = () => {
  const [form, setForm] = useState(null);
  const [invoiceGroups, setInvoiceGroups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [{ data }, groupsRes] = await Promise.all([
        API.get("/fb-bar-to-food"),
        API.get("/fb-invoice-groups").catch(() => ({ data: [] })),
      ]);
      setForm(data || {});
      setInvoiceGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load settings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await API.put("/fb-bar-to-food", form);
      setMessage("Saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div style={styles.page}>
        <div style={styles.title}>Bar To Food</div>
        <div style={{ color: "#6c757d", fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.title}>Bar To Food</div>
      <div style={styles.subtitle}>
        Map the bar invoice group to the food invoice group so bar tabs can be
        merged with food bills.
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>
        <Row label="Bar Invoice Group">
          <select
            style={styles.input}
            value={form.bar_invoice_group_id || ""}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                bar_invoice_group_id: e.target.value ? Number(e.target.value) : null,
              }))
            }
          >
            <option value="">— Select —</option>
            {invoiceGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </Row>
        <Row label="Food Invoice Group">
          <select
            style={styles.input}
            value={form.food_invoice_group_id || ""}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                food_invoice_group_id: e.target.value ? Number(e.target.value) : null,
              }))
            }
          >
            <option value="">— Select —</option>
            {invoiceGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </Row>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={!!form.auto_transfer_on_settle}
            onChange={(e) =>
              setForm((p) => ({ ...p, auto_transfer_on_settle: e.target.checked }))
            }
          />
          Auto-transfer bar items to food invoice on settle
        </label>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={!!form.merge_into_single_invoice}
            onChange={(e) =>
              setForm((p) => ({ ...p, merge_into_single_invoice: e.target.checked }))
            }
          />
          Merge into single combined invoice
        </label>
        <div style={{ marginTop: 8 }}>
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
  );
};

const Row = ({ label, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center", gap: 12 }}>
    <label style={{ fontSize: 13, color: "#1f2d3d", fontWeight: 500 }}>{label}</label>
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
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: "#1f2d3d",
    borderBottom: "1px solid #e6e8eb",
    paddingBottom: 8,
    marginBottom: 8,
  },
  subtitle: { fontSize: 13, color: "#5b6b7c", marginBottom: 16 },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#1f2d3d",
    cursor: "pointer",
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
  saveBtn: {
    background: "#5cb85c",
    color: "#fff",
    border: "1px solid #4cae4c",
    padding: "8px 26px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};

export default BarToFood;
