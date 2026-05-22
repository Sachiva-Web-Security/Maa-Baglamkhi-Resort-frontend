import { useEffect, useState } from "react";
import API from "../api";

const ParcelSetting = () => {
  const [priceGroups, setPriceGroups] = useState([]);
  const [priceGroupId, setPriceGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, pg] = await Promise.all([
        API.get("/fb-parcel-settings"),
        API.get("/fb-price-groups"),
      ]);
      setPriceGroups(Array.isArray(pg.data) ? pg.data : []);
      setPriceGroupId(s.data?.price_group_id ? String(s.data.price_group_id) : "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load parcel settings");
    } finally {
      setLoading(false);
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
      await API.put("/fb-parcel-settings", {
        price_group_id: priceGroupId ? Number(priceGroupId) : null,
      });
      setMessage("Parcel setting saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Parcel Setting</h2>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.row}>
        <label style={styles.labelInline}>Price List Group</label>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, maxWidth: 360 }}>
          <select
            style={styles.input}
            value={priceGroupId}
            onChange={(e) => setPriceGroupId(e.target.value)}
            disabled={loading}
          >
            <option value="">— Select —</option>
            {priceGroups.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              style={styles.saveBtn}
              onClick={onSave}
              disabled={saving || loading}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
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
    marginBottom: 20,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600, color: "#1f2d3d" },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10, maxWidth: 560 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: 24,
    paddingTop: 8,
  },
  labelInline: {
    fontSize: 13,
    color: "#1f2d3d",
    minWidth: 130,
    paddingTop: 8,
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
    padding: "6px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};

export default ParcelSetting;
