import { useEffect, useState } from "react";
import API from "../../api";

const emptyForm = {
  host: "",
  sender_name: "",
  sender_email: "",
  sender_password: "",
  port: 25,
  enable_ssl: false,
};

const MailConfiguration = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/email-config");
      setForm({ ...emptyForm, ...data, port: data?.port ?? 25 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load email config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: v }));
  };

  const onSave = async (e) => {
    e?.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        port: Number(form.port) || 25,
        enable_ssl: !!form.enable_ssl,
      };
      const { data } = await API.put("/email-config", payload);
      setForm({ ...emptyForm, ...data, port: data?.port ?? 25 });
      setMessage("Email configuration saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Email Configuration Setting</h2>
        <button type="button" style={styles.refreshBtn} onClick={load}>
          ⟳ Refresh
        </button>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <form onSubmit={onSave} style={styles.formWrap}>
        <div style={styles.field}>
          <label style={styles.label}>Host</label>
          <input
            style={styles.input}
            value={form.host}
            onChange={setField("host")}
            placeholder="e.g. mail.urbanpos.com"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Sender Name</label>
          <input
            style={styles.input}
            value={form.sender_name}
            onChange={setField("sender_name")}
          />
        </div>

        <div style={styles.row2}>
          <div style={styles.field}>
            <label style={styles.label}>Sender Email</label>
            <input
              type="email"
              style={styles.input}
              value={form.sender_email}
              onChange={setField("sender_email")}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Sender Mail Password</label>
            <input
              type="password"
              style={styles.input}
              value={form.sender_password}
              onChange={setField("sender_password")}
            />
          </div>
        </div>

        <div style={styles.row2}>
          <div style={styles.field}>
            <label style={styles.label}>Port</label>
            <input
              type="number"
              style={styles.input}
              value={form.port}
              onChange={setField("port")}
            />
          </div>
          <div style={{ ...styles.field, justifyContent: "flex-end" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 34,
                marginTop: 18,
                fontSize: 13,
                color: "#2c3e50",
              }}
            >
              <input
                type="checkbox"
                checked={!!form.enable_ssl}
                onChange={setField("enable_ssl")}
              />
              Enabale SSL
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button type="submit" style={styles.saveBtn} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            style={styles.returnBtn}
            onClick={() => window.history.back()}
          >
            Return
          </button>
        </div>
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #e6e8eb",
    paddingBottom: 8,
    marginBottom: 14,
  },
  title: { margin: 0, fontSize: 16, fontWeight: 600, color: "#1f2d3d" },
  refreshBtn: {
    background: "transparent",
    border: "none",
    color: "#5b6b7c",
    fontSize: 13,
    cursor: "pointer",
  },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },
  formWrap: {
    background: "#f5f6f7",
    border: "1px solid #e6e8eb",
    borderRadius: 4,
    padding: 16,
    maxWidth: 720,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  field: { display: "flex", flexDirection: "column" },
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
    cursor: "pointer",
  },
  returnBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#333",
    padding: "6px 14px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
  },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },
};

export default MailConfiguration;
