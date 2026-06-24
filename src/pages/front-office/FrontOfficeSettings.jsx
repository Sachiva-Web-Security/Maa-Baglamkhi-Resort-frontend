import { useEffect, useState } from "react";
import API from "../../api";
import RichTextEditor from "../../components/RichTextEditor/RichTextEditor";
import "../../components/RichTextEditor/RichTextEditor.css";

const ROOM_STATUSES = ["Available", "Cleaning", "Maintenance", "Blocked"];
const INVOICE_INITS = ["Daily", "Monthly", "Yearly", "None"];
const GRACE_OPTIONS = [
  { value: 0, label: "0 Hours" },
  { value: 1, label: "1 Hour" },
  { value: 2, label: "2 Hours" },
  { value: 3, label: "3 Hours" },
  { value: 4, label: "4 Hours" },
  { value: 6, label: "6 Hours" },
  { value: 12, label: "12 Hours" },
];

const emptyForm = {
  checkout_mode: "24hours",
  checkout_specific_time: "10:00",
  grace_period_hours: 1,
  invoice_no_init: "Yearly",
  room_status_after_checkout: "Available",
  send_checkin_sms_guest: false,
  send_checkin_sms_owner: true,
  send_checkout_sms_guest: false,
  send_checkout_sms_owner: true,
  send_night_audit_report_owner: true,
  owner_mobile_numbers: "",
  owner_email_ids: "",
  invoice_note: "",
};

const FrontOfficeSettings = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fo-settings");
      const merged = { ...emptyForm, ...data };
      setForm(merged);
      setInvoiceNote(merged.invoice_note || "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load settings");
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
        grace_period_hours: Number(form.grace_period_hours) || 0,
        invoice_note: invoiceNote,
      };
      const { data } = await API.put("/fo-settings", payload);
      const merged = { ...emptyForm, ...data };
      setForm(merged);
      setInvoiceNote(merged.invoice_note || "");
      setMessage("Settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Settings</h2>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <form onSubmit={onSave} style={styles.grid}>
        <div style={styles.col}>
          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.labelStrong}>Checkout</label>
              <div style={{ display: "flex", gap: 14 }}>
                <label style={styles.radio}>
                  <input
                    type="radio"
                    name="checkout_mode"
                    value="24hours"
                    checked={form.checkout_mode === "24hours"}
                    onChange={setField("checkout_mode")}
                  />
                  24 hours
                </label>
                <label style={styles.radio}>
                  <input
                    type="radio"
                    name="checkout_mode"
                    value="specific_time"
                    checked={form.checkout_mode === "specific_time"}
                    onChange={setField("checkout_mode")}
                  />
                  Specific Time
                </label>
              </div>
              {form.checkout_mode === "specific_time" && (
                <input
                  type="time"
                  style={{ ...styles.input, marginTop: 6, width: 140 }}
                  value={form.checkout_specific_time || "10:00"}
                  onChange={setField("checkout_specific_time")}
                />
              )}
            </div>
            <div style={styles.field}>
              <label style={styles.labelStrong}>Grace Period</label>
              <select
                style={{ ...styles.input, width: 130 }}
                value={form.grace_period_hours}
                onChange={setField("grace_period_hours")}
              >
                {GRACE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.labelStrong}>Initialize Invoice No</label>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {INVOICE_INITS.map((opt) => (
                <label key={opt} style={styles.radio}>
                  <input
                    type="radio"
                    name="invoice_no_init"
                    value={opt}
                    checked={form.invoice_no_init === opt}
                    onChange={setField("invoice_no_init")}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.labelStrong}>Room Status After Checkout</label>
            <select
              style={{ ...styles.input, maxWidth: 240 }}
              value={form.room_status_after_checkout}
              onChange={setField("room_status_after_checkout")}
            >
              {ROOM_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={styles.row2}>
            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={form.send_checkin_sms_guest}
                onChange={setField("send_checkin_sms_guest")}
              />
              Send Check In SMS To Guest?
            </label>
            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={form.send_checkin_sms_owner}
                onChange={setField("send_checkin_sms_owner")}
              />
              Send Check In SMS To Owner?
            </label>
          </div>

          <div style={styles.row2}>
            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={form.send_checkout_sms_guest}
                onChange={setField("send_checkout_sms_guest")}
              />
              Send Checkout SMS To Guest?
            </label>
            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={form.send_checkout_sms_owner}
                onChange={setField("send_checkout_sms_owner")}
              />
              Send Checkout SMS To Owner?
            </label>
          </div>

          <label style={styles.checkRow}>
            <input
              type="checkbox"
              checked={form.send_night_audit_report_owner}
              onChange={setField("send_night_audit_report_owner")}
            />
            Send Night Audit Report To Owner?
          </label>

          <div style={styles.field}>
            <label style={styles.labelStrong}>Owner Mobile Numbers</label>
            <input
              style={styles.input}
              value={form.owner_mobile_numbers}
              onChange={setField("owner_mobile_numbers")}
              placeholder="Comma-separated"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.labelStrong}>Owner Email Ids</label>
            <input
              style={styles.input}
              value={form.owner_email_ids}
              onChange={setField("owner_email_ids")}
              placeholder="Comma-separated"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div style={styles.col}>
          <label style={styles.labelStrong}>Invoice Note</label>
          <RichTextEditor
            value={invoiceNote}
            onChange={setInvoiceNote}
            ariaLabel="Front-office invoice note"
          />
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
    borderBottom: "1px solid #e6e8eb",
    paddingBottom: 8,
    marginBottom: 14,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600, color: "#1f2d3d" },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 },
  col: { display: "flex", flexDirection: "column", gap: 12 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  labelStrong: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1f2d3d",
    marginBottom: 4,
  },
  radio: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#2c3e50",
  },
  checkRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#2c3e50",
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
    boxSizing: "border-box",
  },
  saveBtn: {
    background: "#5cb85c",
    color: "#fff",
    border: "1px solid #4cae4c",
    padding: "6px 24px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },
};

export default FrontOfficeSettings;
