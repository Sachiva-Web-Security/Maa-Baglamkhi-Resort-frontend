import { useEffect, useState } from "react";
import API from "../../api";

const AUTO_SEND_FIELDS = [
  { key: "auto_send_booking_confirmation", label: "Auto-send Booking Confirmation" },
  { key: "auto_send_invoice", label: "Auto-send Invoice on Generate" },
  { key: "auto_send_restaurant_bill", label: "Auto-send Restaurant Bill on Generate" },
  { key: "auto_send_payment_reminder", label: "Auto-send Payment Reminder" },
  { key: "auto_send_checkout_thanks", label: "Auto-send Checkout Thank You" },
];

const OwnerSmsSettings = () => {
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [editingTpl, setEditingTpl] = useState(null);
  const [test, setTest] = useState({ number: "", message: "Hi from Maa Baglamukhi Resort" });
  const [pdfBaseUrl, setPdfBaseUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [pdfSending, setPdfSending] = useState(false);
  const [tplSend, setTplSend] = useState(null);
  const [tplSending, setTplSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [s, t] = await Promise.all([
        API.get("/fb-owner-sms-settings"),
        API.get("/fb-owner-sms-settings/templates"),
      ]);
      setSettings(s.data || {});
      setPdfBaseUrl(s.data?.public_base_url || "");
      setTemplates(Array.isArray(t.data) ? t.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load settings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSaveSettings = async () => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const payload = {
        ...settings,
        public_base_url: String(settings?.public_base_url || "").trim(),
      };
      const { data } = await API.put("/fb-owner-sms-settings", payload);
      setSettings(data);
      setPdfBaseUrl(data?.public_base_url || payload.public_base_url || "");
      setMessage("Settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onSaveTemplate = async () => {
    if (!editingTpl) return;
    setError("");
    setMessage("");
    try {
      const { data } = await API.put(
        `/fb-owner-sms-settings/templates/${editingTpl.id}`,
        editingTpl,
      );
      setTemplates((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      setEditingTpl(null);
      setMessage("Template updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };

  const onTestSend = async () => {
    setError("");
    setMessage("");
    if (!test.number || !test.message) {
      setError("Number and message are required to send a test.");
      return;
    }
    setSending(true);
    try {
      const { data } = await API.post("/fb-owner-sms-settings/test-send", test);
      const ok = data?.status && Number(data.status) < 400;
      setMessage(ok ? "Test message sent to WASend." : `Sent. WASend response: ${JSON.stringify(data?.data)}`);
    } catch (err) {
      setError(err.response?.data?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const onDownloadTestPdf = () => {
    const base = (API.defaults?.baseURL || "").replace(/\/$/, "");
    const url = `${base}/fb-owner-sms-settings/test-pdf`;
    window.open(url, "_blank");
  };

  const openTplSend = (tpl) =>
    setTplSend({
      tpl,
      number: test.number || settings?.sender_number?.replace(/[^0-9]/g, "") || "",
      message: tpl.body,
      attach_pdf: tpl.code === "invoice",
    });
  const closeTplSend = () => setTplSend(null);

  const onSendTemplate = async () => {
    if (!tplSend) return;
    setError("");
    setMessage("");
    if (!tplSend.number) {
      setError("Recipient number is required.");
      return;
    }
    setTplSending(true);
    try {
      const endpoint = tplSend.attach_pdf
        ? "/fb-owner-sms-settings/test-send-pdf"
        : "/fb-owner-sms-settings/test-send";
      const { data } = await API.post(endpoint, {
        number: tplSend.number,
        message: tplSend.message,
        public_base_url: pdfBaseUrl || undefined,
      });
      const ok = data?.status && Number(data.status) < 400;
      setMessage(
        ok
          ? `Template "${tplSend.tpl.label}" sent. WASend ID: ${data?.data?.id || "(none)"}`
          : `Sent. WASend response: ${JSON.stringify(data?.data)}`,
      );
      closeTplSend();
    } catch (err) {
      setError(err.response?.data?.message || "Send failed");
    } finally {
      setTplSending(false);
    }
  };

  const onSendTestPdf = async () => {
    setError("");
    setMessage("");
    if (!test.number) {
      setError("Recipient number is required to send the PDF.");
      return;
    }
    setPdfSending(true);
    try {
      const { data } = await API.post("/fb-owner-sms-settings/test-send-pdf", {
        number: test.number,
        message: test.message || "Your test invoice from Maa Baglamukhi Resort",
        public_base_url: pdfBaseUrl || undefined,
      });
      const ok = data?.status && Number(data.status) < 400;
      const respBody = JSON.stringify(data?.data);
      setMessage(
        ok
          ? `PDF sent. WASend ID: ${data?.data?.id || "(none)"} via ${data?.publicBaseUrl}`
          : `Sent. WASend response: ${respBody}`,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Send failed");
    } finally {
      setPdfSending(false);
    }
  };

  if (!settings) {
    return (
      <div style={styles.page}>
        <div style={styles.title}>Owner SMS Settings</div>
        <div style={{ color: "#6c757d", fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.title}>Owner SMS Settings</div>
      <div style={styles.subtitle}>
        WhatsApp integration via WASend. Credentials default to <code>.env</code> but can be overridden here.
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>WASend Credentials</div>
        <div style={styles.formGrid}>
          <Field label="WASend Username">
            <input
              style={styles.input}
              value={settings.wasend_username || ""}
              onChange={(e) =>
                setSettings((p) => ({ ...p, wasend_username: e.target.value }))
              }
              placeholder="anju"
            />
          </Field>
          <Field label="WASend Token">
            <input
              style={styles.input}
              value={settings.wasend_token || ""}
              onChange={(e) =>
                setSettings((p) => ({ ...p, wasend_token: e.target.value }))
              }
              placeholder="8Tqkk..."
            />
          </Field>
          <Field label="Sender Number">
            <input
              style={styles.input}
              value={settings.sender_number || ""}
              onChange={(e) =>
                setSettings((p) => ({ ...p, sender_number: e.target.value }))
              }
              placeholder="+917247242931"
            />
          </Field>
          <Field label="Public Base URL">
            <input
              style={styles.input}
              value={settings.public_base_url || pdfBaseUrl || ""}
              onChange={(e) => {
                const value = e.target.value;
                setPdfBaseUrl(value);
                setSettings((p) => ({ ...p, public_base_url: value }));
              }}
              placeholder="https://your-ngrok-url.ngrok-free.app"
            />
          </Field>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Auto-Send Triggers</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {AUTO_SEND_FIELDS.map((f) => (
            <label key={f.key} style={styles.checkRow}>
              <input
                type="checkbox"
                checked={!!settings[f.key]}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, [f.key]: e.target.checked }))
                }
              />
              {f.label}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            style={styles.saveBtn}
            onClick={onSaveSettings}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Message Templates</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Template</th>
                <th style={styles.th}>Body</th>
                <th style={{ ...styles.th, width: 90 }}>Active</th>
                <th style={{ ...styles.th, width: 110, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {templates.map((t, idx) => (
                <tr key={t.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>
                    <strong>{t.label}</strong>
                    <div style={{ color: "#888", fontSize: 11 }}>{t.code}</div>
                  </td>
                  <td style={{ ...styles.td, whiteSpace: "pre-wrap" }}>{t.body}</td>
                  <td style={styles.td}>
                    <span style={t.is_active ? styles.badgeActive : styles.badgeInactive}>
                      {t.is_active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      style={styles.sendRowBtn}
                      onClick={() => openTplSend(t)}
                      title="Send this template"
                    >
                      ➤ Send
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.editBtn, marginLeft: 6 }}
                      onClick={() => setEditingTpl({ ...t })}
                      title="Edit"
                    >
                      ✎
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
          Placeholders: <code>{"{guest_name}"}</code>, <code>{"{room_no}"}</code>,
          <code>{" {invoice_no}"}</code>, <code>{" {amount}"}</code>,
          <code>{" {checkin_date}"}</code>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Send Test Message</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,240px) minmax(0,1fr) auto",
            gap: 8,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <input
            style={styles.input}
            placeholder="Recipient number (with country code)"
            value={test.number}
            onChange={(e) => setTest((p) => ({ ...p, number: e.target.value }))}
          />
          <input
            style={styles.input}
            placeholder="Message body"
            value={test.message}
            onChange={(e) => setTest((p) => ({ ...p, message: e.target.value }))}
          />
          <button
            type="button"
            style={styles.sendBtn}
            onClick={onTestSend}
            disabled={sending}
          >
            {sending ? "Sending..." : "Send Test"}
          </button>
        </div>

        <div style={styles.pdfBlock}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2d3d", marginBottom: 6 }}>
            Test PDF Bill
          </div>
          <div style={{ fontSize: 12, color: "#5b6b7c", marginBottom: 8 }}>
            Generates a sample bill (₹700.00 — 6 items) and either downloads it
            or sends it via WhatsApp. To send via WhatsApp, WASend must be able
            to reach the PDF over the public internet — set a public URL below
            (e.g. an ngrok URL like <code>https://abc123.ngrok.io</code>) or
            leave blank to use the request host (only works if backend is
            already publicly reachable).
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              style={styles.input}
              placeholder="Public base URL (optional — e.g. https://abc123.ngrok.io)"
              value={pdfBaseUrl || settings.public_base_url || ""}
              onChange={(e) => {
                const value = e.target.value;
                setPdfBaseUrl(value);
                setSettings((p) => ({ ...p, public_base_url: value }));
              }}
            />
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onDownloadTestPdf}
            >
              Download PDF
            </button>
            <button
              type="button"
              style={styles.sendBtn}
              onClick={onSendTestPdf}
              disabled={pdfSending}
            >
              {pdfSending ? "Sending..." : "Send PDF via WhatsApp"}
            </button>
          </div>
        </div>
      </div>

      {tplSend && (
        <div style={styles.modalBackdrop} onClick={closeTplSend}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              Send Template — {tplSend.tpl.label}
              <button onClick={closeTplSend} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <Field label="Recipient Number">
                <input
                  style={styles.input}
                  value={tplSend.number}
                  onChange={(e) =>
                    setTplSend((p) => ({ ...p, number: e.target.value }))
                  }
                  placeholder="918818848558"
                />
              </Field>
              <Field label="Message Body">
                <textarea
                  style={{ ...styles.input, height: 110, padding: 8 }}
                  value={tplSend.message}
                  onChange={(e) =>
                    setTplSend((p) => ({ ...p, message: e.target.value }))
                  }
                />
              </Field>
              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={!!tplSend.attach_pdf}
                  onChange={(e) =>
                    setTplSend((p) => ({ ...p, attach_pdf: e.target.checked }))
                  }
                />
                Attach sample invoice PDF (Total ₹700.00)
              </label>
              {tplSend.attach_pdf && (
                <div style={{ fontSize: 11, color: "#888" }}>
                  Public base URL for WASend to fetch the PDF:{" "}
                  <code>{pdfBaseUrl || "(using request host)"}</code>. Set the
                  ngrok URL in the "Test PDF Bill" section if your backend isn't
                  publicly reachable.
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={closeTplSend}
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.sendBtn}
                onClick={onSendTemplate}
                disabled={tplSending}
              >
                {tplSending
                  ? "Sending..."
                  : tplSend.attach_pdf
                    ? "Send with PDF"
                    : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTpl && (
        <div style={styles.modalBackdrop} onClick={() => setEditingTpl(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              Edit Template — {editingTpl.label}
              <button onClick={() => setEditingTpl(null)} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <Field label="Label">
                <input
                  style={styles.input}
                  value={editingTpl.label}
                  onChange={(e) =>
                    setEditingTpl((p) => ({ ...p, label: e.target.value }))
                  }
                />
              </Field>
              <Field label="Body">
                <textarea
                  style={{ ...styles.input, height: 120, padding: 8 }}
                  value={editingTpl.body}
                  onChange={(e) =>
                    setEditingTpl((p) => ({ ...p, body: e.target.value }))
                  }
                />
              </Field>
              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={!!editingTpl.is_active}
                  onChange={(e) =>
                    setEditingTpl((p) => ({ ...p, is_active: e.target.checked }))
                  }
                />
                Active
              </label>
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => setEditingTpl(null)}
              >
                Cancel
              </button>
              <button type="button" style={styles.saveBtn} onClick={onSaveTemplate}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: "#1f2d3d" }}>{label}</label>
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
    marginBottom: 6,
  },
  subtitle: { fontSize: 13, color: "#5b6b7c", marginBottom: 16 },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },
  section: {
    border: "1px solid #e6e8eb",
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    background: "#fff",
  },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: "#1f2d3d", marginBottom: 10 },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
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
    padding: "8px 22px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  sendBtn: {
    background: "#337ab7",
    color: "#fff",
    border: "1px solid #2e6da4",
    padding: "8px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  tableWrap: { border: "1px solid #e6e8eb", borderRadius: 3, overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    padding: "8px 10px",
    textAlign: "left",
    fontWeight: 600,
    color: "#1f2d3d",
  },
  td: { padding: "8px 10px", borderBottom: "1px solid #f0f0f0", color: "#2c3e50", verticalAlign: "top" },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#fafbfc" },
  badgeActive: {
    background: "#e6f4ea",
    color: "#2c7a3d",
    border: "1px solid #bfe2c8",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeInactive: {
    background: "#f3f3f3",
    color: "#777",
    border: "1px solid #ddd",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
  },
  editBtn: {
    background: "#5bc0de",
    border: "1px solid #46b8da",
    color: "#fff",
    width: 28,
    height: 26,
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
  },
  sendRowBtn: {
    background: "#5cb85c",
    border: "1px solid #4cae4c",
    color: "#fff",
    padding: "3px 10px",
    height: 26,
    borderRadius: 3,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },

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
    width: 560,
    overflow: "hidden",
  },
  modalHeader: {
    padding: "12px 16px",
    background: "#f7f7f7",
    borderBottom: "1px solid #e6e8eb",
    fontSize: 14,
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
  modalBody: { padding: 16, display: "flex", flexDirection: "column", gap: 12 },
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
  pdfBlock: {
    border: "1px dashed #d0d4d9",
    borderRadius: 4,
    padding: 12,
    background: "#fafbfc",
  },
};

export default OwnerSmsSettings;
