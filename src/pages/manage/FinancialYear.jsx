import { useEffect, useState } from "react";
import API from "../../api";

const FinancialYear = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/financial-year");
      setStartDate(data.fy_start_date || "");
      setEndDate(data.fy_end_date || "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load financial year");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!startDate || !endDate) {
      setError("Please select both FY Start and End dates.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError("FY End Date must be after FY Start Date.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await API.put("/financial-year", {
        fy_start_date: startDate,
        fy_end_date: endDate,
      });
      setStartDate(data.fy_start_date);
      setEndDate(data.fy_end_date);
      setMessage("Financial year saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Set Current Financial Year</h2>
      </div>

      <div style={styles.subtitle}>Update Financial Year</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <form onSubmit={onSave} style={styles.form}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>FY Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>FY End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <button type="submit" style={styles.saveBtn} disabled={saving || loading}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>

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
    borderBottom: "1px solid #e6e8eb",
    paddingBottom: 8,
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: "#1f2d3d",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1f2d3d",
    marginBottom: 14,
  },
  alert: {
    padding: "8px 12px",
    borderRadius: 4,
    fontSize: 13,
    marginBottom: 10,
  },
  alertError: {
    background: "#fdecea",
    color: "#b94a48",
    border: "1px solid #f3c2bd",
  },
  alertSuccess: {
    background: "#e6f4ea",
    color: "#2c7a3d",
    border: "1px solid #bfe2c8",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    maxWidth: 560,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#1f2d3d",
    marginBottom: 4,
  },
  input: {
    height: 32,
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
    borderRadius: 3,
    padding: "6px 18px",
    fontSize: 13,
    fontWeight: 500,
    height: 32,
    cursor: "pointer",
    alignSelf: "flex-start",
    minWidth: 70,
  },
  loading: {
    marginTop: 12,
    color: "#6c757d",
    fontSize: 13,
  },
};

export default FinancialYear;
