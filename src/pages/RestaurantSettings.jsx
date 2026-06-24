import { useEffect, useState } from "react";
import API from "../api";
import RichTextEditor from "../components/RichTextEditor/RichTextEditor";
import "../components/RichTextEditor/RichTextEditor.css";

const TOKEN_OPTS = ["Daily", "After 300", "After 500", "After 1000", "None"];
const INVOICE_OPTS = ["Daily", "Monthly", "Yearly", "None"];

const RestaurantSettings = () => {
  const [form, setForm] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");

  const load = async () => {
    try {
      const [{ data }, prtRes, modesRes] = await Promise.all([
        API.get("/fb-restaurant-settings"),
        API.get("/printer-locations").catch(() => ({ data: [] })),
        API.get("/payment-modes").catch(() => ({ data: [] })),
      ]);
      setForm(data);
      setInvoiceNote(data?.invoice_note || "");
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
      await API.put("/fb-restaurant-settings", {
        ...form,
        invoice_note: invoiceNote,
      });
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
        <div style={styles.col}>
          <Check form={form} setForm={setForm} k="inclusive_tax" label="Inclusive Tax" />
          <Check form={form} setForm={setForm} k="reverse_tax_calculation" label="Reverse Tax Calculation" />
          <Check form={form} setForm={setForm} k="enable_discount" label="Enable Discount" />

          <Row label="Default Payment Mode">
            <select style={styles.input} value={form.default_payment_mode || ""} onChange={setVal("default_payment_mode")}>
              {paymentList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Row>

          <Row label="Token No Initialize">
            <Radios name="tokenInit" opts={TOKEN_OPTS} value={form.token_no_initialize} onChange={(v) => setForm((p) => ({ ...p, token_no_initialize: v }))} />
          </Row>
          <Row label="Invoice No Initialize">
            <Radios name="invInit" opts={INVOICE_OPTS} value={form.invoice_no_initialize} onChange={(v) => setForm((p) => ({ ...p, invoice_no_initialize: v }))} />
          </Row>

          <Check form={form} setForm={setForm} k="print_user_name_in_invoice" label="Print User Name In Invoice" />

          <Row label="No Of Invoice Copy">
            <input type="number" min={1} style={{ ...styles.input, width: 100 }} value={form.no_of_invoice_copy} onChange={setNum("no_of_invoice_copy")} />
          </Row>
          <Row label="Invoice Heading">
            <input style={styles.input} value={form.invoice_heading || ""} onChange={setVal("invoice_heading")} />
          </Row>

          <Check form={form} setForm={setForm} k="price_override_allowed" label="Price Override Allowed" />
          <Check form={form} setForm={setForm} k="service_charges_in_parcel" label="Service Charges In Parcel" />
          <Check form={form} setForm={setForm} k="allow_refund" label="Allow Refund" />
          <Check form={form} setForm={setForm} k="allow_nc" label="Allow NC" />
          <Check form={form} setForm={setForm} k="open_tender_with_save" label="Open Tender With Save" />
          <Check form={form} setForm={setForm} k="skip_captain_selection" label="Skip Captain Selection" />
          <Check form={form} setForm={setForm} k="direct_bill_settlement_in_cash" label="Direct Bill Settlement In Cash" />
          <Check form={form} setForm={setForm} k="alternate_bar_kot_print" label="Alternate BAR KOT Print" />
          <Check form={form} setForm={setForm} k="print_only_token_in_counter_sale" label="Print Only Token In Counter Sale" />
          <Check form={form} setForm={setForm} k="print_token_copy_at_terminal_printer" label="Print Token Copy At Terminal Printer" />
          <Check form={form} setForm={setForm} k="print_invoice_copy_at_terminal_printer" label="Print Invoice Copy At Terminal Printer" />
        </div>

        <div style={styles.col}>
          <Check form={form} setForm={setForm} k="show_item_group_by_price_list" label="Show Item Group By Price List" />
          <Check form={form} setForm={setForm} k="send_void_sms_to_owner" label="Send Void SMS To Owner" />
          <Check form={form} setForm={setForm} k="send_nc_sms_to_owner" label="Send NC SMS To Owner" />
          <Check form={form} setForm={setForm} k="send_discount_sms_to_owner" label="Send Discount SMS To Owner" />
          <Check form={form} setForm={setForm} k="send_bill_edit_sms_to_owner" label="Send Bill Edit SMS To Owner" />
          <Check form={form} setForm={setForm} k="send_bill_settlement_sms_to_owner" label="Send Bill Settlement SMS To Owner" />
          <Check form={form} setForm={setForm} k="send_refund_sms_to_owner" label="Send Refund SMS To Owner" />

          <Row label="Owner Mobile Numbers">
            <input
              style={styles.input}
              value={form.owner_mobile_numbers || ""}
              onChange={setVal("owner_mobile_numbers")}
              placeholder="9425921501,9424582382"
            />
          </Row>
          <Row label="Owner Email">
            <input
              style={styles.input}
              value={form.owner_email || ""}
              onChange={setVal("owner_email")}
              placeholder="owner@example.com"
            />
          </Row>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
            <Row label="Invoice Printer Location">
              <select
                style={styles.input}
                value={form.invoice_printer_location_id || ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    invoice_printer_location_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              >
                <option value="">— Select —</option>
                {printers.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </Row>
            <Row label="Invoice Round Off">
              <select style={styles.input} value={form.invoice_round_off} onChange={setNum("invoice_round_off")}>
                {[0, 1, 2, 5, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Row>
          </div>

          <Row label="Day Closing Time">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select style={{ ...styles.input, width: 70 }} value={form.day_closing_hour} onChange={setNum("day_closing_hour")}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                ))}
              </select>
              <span style={{ fontWeight: 600 }}>:</span>
              <select style={{ ...styles.input, width: 70 }} value={form.day_closing_minute} onChange={setNum("day_closing_minute")}>
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
              <select style={{ ...styles.input, width: 70 }} value={form.day_closing_meridiem || "AM"} onChange={setVal("day_closing_meridiem")}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </Row>

          <Row label="Invoice Note">
            <RichTextEditor
              value={invoiceNote}
              onChange={setInvoiceNote}
              ariaLabel="Restaurant invoice note"
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

const Check = ({ form, setForm, k, label }) => (
  <label style={styles.checkRow}>
    <input
      type="checkbox"
      checked={!!form[k]}
      onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.checked }))}
    />
    {label}
  </label>
);

const Row = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: "#1f2d3d" }}>{label}</label>
    {children}
  </div>
);

const Radios = ({ name, opts, value, onChange }) => (
  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", paddingTop: 6 }}>
    {opts.map((opt) => (
      <label key={opt} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
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
  col: { display: "flex", flexDirection: "column", gap: 6 },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#1f2d3d",
    cursor: "pointer",
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

export default RestaurantSettings;
