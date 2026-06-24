import { useEffect, useState } from "react";
import API from "../api";
import RichTextEditor from "../components/RichTextEditor/RichTextEditor";
import "../components/RichTextEditor/RichTextEditor.css";

const BOOL_FIELDS = [
  { key: "inclusive_tax", label: "Inclusive Tax" },
  { key: "reverse_tax_calculation", label: "Reverse Tax Calculation" },
  { key: "enable_discount", label: "Enable Discount?" },
  { key: "print_user_name_in_invoice", label: "Print User Name In Invoice?" },
  { key: "price_override_allowed", label: "Price Override Allowed?" },
  { key: "apply_service_charge_in_parcel", label: "Apply Service Charges In Parcel?" },
  { key: "allow_refund", label: "Allow Refund?" },
  { key: "allow_nc", label: "Allow NC?" },
  { key: "open_tender_with_save", label: "Open Tender With Save?" },
  { key: "print_invoice", label: "Print Invoice?" },
  { key: "print_token_no", label: "Print Token No in Invoice?" },
  { key: "print_time_in_invoice", label: "Print Time In Invoice?" },
  { key: "enable_parcel", label: "Enable Parcel?" },
  { key: "enable_hold", label: "Enable Hold?" },
  { key: "enable_recall", label: "Enable Recall?" },
  { key: "enable_tender", label: "Enable Tender?" },
  { key: "enable_reprint", label: "Enable Re-Print?" },
  { key: "enable_barcode", label: "Enable Barcode?" },
  { key: "enable_open_drawer", label: "Enable Open Drawer?" },
  { key: "enable_sitting_location", label: "Enable SL (Sitting Location)?" },
  { key: "show_top_selling_items", label: "Show Top Selling Items?" },
  { key: "show_favourite_items", label: "Show Favourite Items?" },
  { key: "print_invoice_no_in_invoice", label: "Print Invoice No In Invoice?" },
  { key: "print_date_in_invoice", label: "Print Date In Invoice?" },
  { key: "split_invoice_as_per_group", label: "Split Invoice As Per Group?" },
  { key: "customer_required_in_refund", label: "Customer required in Refund?" },
  { key: "ask_mobile_before_billing", label: "Ask Mobile Number Before Billing?" },
  { key: "open_subgroup_in_popup", label: "Open SubGroup In Popup?" },
  { key: "send_bill_via_sms", label: "Send Bill Via SMS?" },
  { key: "disable_save", label: "Disable SAVE?" },
  { key: "ask_guest_for_nc", label: "Ask Guest For NC?" },
  { key: "display_items_in_local_language", label: "Display Items In Local Language?" },
  { key: "print_invoice_for_online_orders", label: "Print Invoice For Online Orders" },
  { key: "ask_order_number_for_online_orders", label: "Ask Order Number For Online Orders" },
  { key: "print_token_copy_at_terminal_printer", label: "Print Token Copy At Terminal Printer" },
  { key: "print_invoice_copy_at_terminal_printer", label: "Print Invoice Copy At Terminal Printer" },
  { key: "ask_sales_person_on_each_item", label: "Ask for Sales Person on each Item" },
  { key: "ask_sales_person_on_bill", label: "Ask for Sales Person on Bill" },
];

const TOKEN_OPTS = ["Daily", "After 300", "After 500", "After 1000", "None"];
const INVOICE_OPTS = ["Daily", "Monthly", "Yearly", "None"];

const QuickSalesSettings = () => {
  const [form, setForm] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [{ data }, prtRes, modesRes] = await Promise.all([
        API.get("/fb-quick-sales-settings"),
        API.get("/printer-locations").catch(() => ({ data: [] })),
        API.get("/payment-modes").catch(() => ({ data: [] })),
      ]);
      setForm(data);
      setPrinters(Array.isArray(prtRes.data) ? prtRes.data : []);
      setPaymentModes(
        Array.isArray(modesRes.data)
          ? modesRes.data.filter((m) => m.name).map((m) => m.name)
          : [],
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load settings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setBool = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.checked }));
  const setVal = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const setNum = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: Number(e.target.value) }));

  const onSave = async () => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await API.put("/fb-quick-sales-settings", form);
      setMessage("Settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div style={styles.page}>
        <div style={styles.title}>Settings</div>
        <div style={{ color: "#6c757d", fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  const paymentList = paymentModes.length
    ? paymentModes
    : ["CASH", "CARD", "UPI", "WALLET"];

  return (
    <div style={styles.page}>
      <div style={styles.title}>Settings</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>
      )}

      <div style={styles.grid}>
        <div style={styles.leftCol}>
          {BOOL_FIELDS.map((f) => (
            <label key={f.key} style={styles.checkRow}>
              <input
                type="checkbox"
                checked={!!form[f.key]}
                onChange={setBool(f.key)}
              />
              {f.label}
            </label>
          ))}
        </div>

        <div style={styles.rightCol}>
          <Row label="No Of Invoice Copy">
            <input
              type="number"
              min={1}
              style={{ ...styles.input, width: 100 }}
              value={form.no_of_invoice_copy}
              onChange={setNum("no_of_invoice_copy")}
            />
          </Row>
          <Row label="Invoice Heading">
            <input
              style={styles.input}
              value={form.invoice_heading || ""}
              onChange={setVal("invoice_heading")}
            />
          </Row>
          <Row label="Default Payment Mode">
            <select
              style={styles.input}
              value={form.default_payment_mode || ""}
              onChange={setVal("default_payment_mode")}
            >
              {paymentList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Row>
          <Row label="Token No Initialize">
            <Radios
              name="tokenInit"
              opts={TOKEN_OPTS}
              value={form.token_no_initialize}
              onChange={(v) => setForm((p) => ({ ...p, token_no_initialize: v }))}
            />
          </Row>
          <Row label="Invoice No Initialize">
            <Radios
              name="invInit"
              opts={INVOICE_OPTS}
              value={form.invoice_no_initialize}
              onChange={(v) => setForm((p) => ({ ...p, invoice_no_initialize: v }))}
            />
          </Row>
          <Row label="Invoice No">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={styles.subLabel}>Prefix</span>
              <input
                style={{ ...styles.input, width: 100 }}
                value={form.invoice_no_prefix || ""}
                onChange={setVal("invoice_no_prefix")}
              />
              <span style={styles.subLabel}>Suffix</span>
              <input
                style={{ ...styles.input, width: 100 }}
                value={form.invoice_no_suffix || ""}
                onChange={setVal("invoice_no_suffix")}
              />
            </div>
          </Row>
          <Row label="Invoice Printer Location">
            <select
              style={styles.input}
              value={form.invoice_printer_location_id || ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  invoice_printer_location_id: e.target.value
                    ? Number(e.target.value)
                    : null,
                }))
              }
            >
              <option value="">— Select —</option>
              {printers.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </select>
          </Row>
          <Row label="Extra Copy Printer Location">
            <select
              style={styles.input}
              value={form.extra_copy_printer_location_id || ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  extra_copy_printer_location_id: e.target.value
                    ? Number(e.target.value)
                    : null,
                }))
              }
            >
              <option value="">None</option>
              {printers.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </select>
          </Row>
          <Row label="Day Closing Time">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                style={{ ...styles.input, width: 70 }}
                value={form.day_closing_hour}
                onChange={setNum("day_closing_hour")}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                ))}
              </select>
              <span style={{ fontWeight: 600 }}>:</span>
              <select
                style={{ ...styles.input, width: 70 }}
                value={form.day_closing_minute}
                onChange={setNum("day_closing_minute")}
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
              <select
                style={{ ...styles.input, width: 70 }}
                value={form.day_closing_meridiem || "AM"}
                onChange={setVal("day_closing_meridiem")}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </Row>
          <Row label="Invoice Note">
            <RichTextEditor
              value={form.invoice_note || ""}
              onChange={(html) =>
                setForm((p) => ({ ...p, invoice_note: html }))
              }
              minHeight={100}
              ariaLabel="Quick sales invoice note"
            />
          </Row>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button type="button" style={styles.saveBtn} onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

const Row = ({ label, children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
    }}
  >
    <label style={{ fontSize: 13, color: "#1f2d3d", fontWeight: 500 }}>
      {label}
    </label>
    {children}
  </div>
);

const Radios = ({ name, opts, value, onChange }) => (
  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
    {opts.map((opt) => (
      <label
        key={opt}
        style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13, cursor: "pointer" }}
      >
        <input
          type="radio"
          name={name}
          checked={value === opt}
          onChange={() => onChange(opt)}
        />
        {opt}
      </label>
    ))}
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
    marginBottom: 16,
  },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 28,
    alignItems: "flex-start",
  },
  leftCol: { display: "flex", flexDirection: "column", gap: 6 },
  rightCol: { display: "flex", flexDirection: "column" },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#1f2d3d",
    cursor: "pointer",
  },
  subLabel: { fontSize: 12, color: "#5b6b7c" },
  input: {
    height: 32,
    border: "1px solid #ced4da",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 13,
    background: "#fff",
    color: "#2c3e50",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  saveBtn: {
    background: "#5cb85c",
    color: "#fff",
    border: "1px solid #4cae4c",
    padding: "8px 28px",
    borderRadius: 3,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
};

export default QuickSalesSettings;
