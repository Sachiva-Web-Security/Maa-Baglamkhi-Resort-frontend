import { useEffect, useState } from "react";
import API from "../../../api";
import "./InvoiceEditorView.css";

const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = (value) => value ? new Date(value).toLocaleString("en-GB") : "—";
const fmtDate = (value) => value ? new Date(value).toLocaleDateString("en-GB") : "—";

const InvoiceEditorView = ({ invoice = {}, onBack }) => {
  const [tab, setTab] = useState("basic");
  const [data, setData] = useState(invoice);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load invoice data from backend if we have a booking ID but not full data
  useEffect(() => {
    const bookingId = data.booking_id || data.bookingId || invoice?.booking_id || invoice?.bookingId;
    if (!bookingId || (data && Object.keys(data).length > 1)) return;

    setLoading(true);
    API.get(`/invoices/by-booking/${bookingId}`)
      .then((r) => {
        if (r.data && Object.keys(r.data).length > 0) {
          setData((prev) => ({ ...prev, ...r.data }));
        }
      })
      .catch((err) => console.error("Failed to load invoice:", err))
      .finally(() => setLoading(false));
  }, []);

  const room = data.room_no || data.room_no || "—";
  const guest = data.customer_name || data.guest_name || "—";
  const total = Number(data.final_total || data.total_amount || data.total || 0);
  const tariff = Number(data.price_per_day || total || 0);
  const gst = Number(data.gst || 0);
  const taxable = Math.max(0, tariff - Number(data.discount || 0));
  const tabs = [
    ["basic", "Basic Information"],
    ["tariff", "Tariff Detail"],
    ["services", "Services"],
    ["payment", "Payment Detail"],
    ["checkout", "Checkout & Print Invoice"],
  ];

  const handleSave = async () => {
    const invoiceId = data.id || data.invoice_id;
    if (!invoiceId) return;
    setSaving(true);
    try {
      await API.put(`/invoices/update/${invoiceId}`, data);
      alert("Invoice saved successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key) => (e) =>
    setData((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="fo-editor">
      <header className="fo-editor-head">
        <div>
          <span>INVOICE</span>
          <strong>Room No: {room}</strong>
        </div>
        <div>
          Checkout Type: <b>[24Hrs]</b>　|　 Grace Period: <b>[1 Hours]</b>　|
        </div>
        <div>
          <button>Export to Excel</button>
          <button className="dark" onClick={() => setData(invoice)}>↻ Refresh</button>
        </div>
      </header>

      <nav className="fo-editor-tabs">
        {tabs.map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      {loading && (
        <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>Loading invoice...</div>
      )}

      {!loading && tab === "basic" && (
        <div className="fo-basic-grid">
          <div>
            <Section title={<><span>Invoice Information</span> <b>Folio#: {data.booking_id || data.bookingId || "—"}</b></>}>
              <div className="fo-fields two">
                <Field label="Invoice No" value={data.invoice_no || data.id || ""} />
                <Field label="Invoice Date" type="date" value={fmtDate(data.date)} onChange={setField("date")} />
                <Field label="Booking Type">
                  <select value={data.booking_type || "Walk In"} onChange={setField("booking_type")}>
                    <option>Walk In</option>
                    <option>Via</option>
                    <option>Online</option>
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Arrival Details">
              <div className="fo-fields two">
                <Field label="Check In Date *" value={dateTime(data.check_in)} />
                <Field label="Check Out Date *" value={dateTime(data.check_out)} />
                <Field label="No Of Nights *" value={data.nights || "1"} />
                <div>
                  <label style={{ display: "block", margin: "3px 0 5px", fontWeight: "bold" }}>Tour Type *</label>
                  <p>◉ Personal　○ Business</p>
                </div>
              </div>
            </Section>

            <Section title="Room Details">
              <div className="fo-fields three">
                <Field label="Room No *" value={room} />
                <div />
                <div />
                <div>
                  <label style={{ display: "block", margin: "3px 0 5px", fontWeight: "bold" }}>Bed Type *</label>
                  <p>◉ Single　○ Double</p>
                </div>
                <div>
                  <label style={{ display: "block", margin: "3px 0 5px", fontWeight: "bold" }}>Rate Type *</label>
                  <p>◉ Basic　○ Rack　○ Seasonal</p>
                </div>
                <div />
                <Field label="Adults *" value={data.adults || 1} />
                <Field label="Children" value={data.children || 0} />
                <Field label="Extra Bed" value="0" />
              </div>
            </Section>
          </div>

          <Section title="Primary Guest Details">
            <div className="fo-fields">
              <Field label="Mobile Number *" value={data.phone || data.mobile || ""} />
              <Field label="Guest Name *" value={guest} />
              <Field label="Alternate Numbers" value={data.alternate_phone || ""} />
              <Field label="Gender" value={data.gender || "Male"} />
              <div className="fo-fields two">
                <Field label="Guest Details/Address" value={data.address || ""} />
                <Field label="Nationality" value={data.nationality || "INDIAN"} />
              </div>
              <div className="fo-fields two">
                <Field label="ID Type" value={data.id_type || ""} />
                <Field label="ID Number *" value={data.id_number || ""} />
              </div>
              <Field label="Id Card Photo" type="file" />
              <button className="green">Upload</button>
              <Field label="Id Card Photo 2" type="file" />
              <button className="green">Upload</button>
            </div>
          </Section>

          <div>
            <Section title="Secondary Guest Details">
              <div className="fo-fields two">
                <Field label="Guest Name" />
                <Field label="Gender" />
                <Field label="ID Proof Type" />
                <Field label="ID Number" />
              </div>
              <button className="blue">+ Add</button>
            </Section>

            <Section title="Office Use">
              <div className="fo-fields two">
                <Field label="Coming From" value={data.coming_from || ""} />
                <Field label="Going To" value={data.going_to || ""} />
              </div>
              <Field label="Purpose of Visit" value={data.purpose || ""} />
              <label>Remarks</label>
              <textarea defaultValue={data.remarks || ""} />
              <label>Special Notes</label>
              <textarea defaultValue={data.notes || ""} />
            </Section>

            <div className="fo-editor-next">
              <button>Group Details</button>
              <button className="green" onClick={() => setTab("tariff")}>Next ›</button>
              <button className="blue">Print GRC</button>
              <button className="dark" onClick={onBack}>☷ Back To List</button>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "tariff" && (
        <Panel title="Tariff Details">
          <table>
            <thead>
              <tr>
                <th>Action</th><th>Date</th><th>Room No</th><th>Particulars</th>
                <th>Tariff</th><th>Disc (%)</th><th>Taxable</th>
                <th>State GST</th><th>Center GST</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>🗑</td>
                <td>{dateTime(data.check_in)}</td>
                <td>{room}</td>
                <td>Room Charges</td>
                <td>{money(tariff)}</td>
                <td>{Number(data.discount || 0).toFixed(2)}</td>
                <td>{money(taxable)}</td>
                <td>{money(gst / 2)}</td>
                <td>{money(gst / 2)}</td>
                <td>{money(total)}</td>
              </tr>
              <tr>
                <td colSpan="9" className="right"><b>NET TOTAL</b></td>
                <td><b>{money(total)}</b></td>
              </tr>
            </tbody>
          </table>
          <div className="fo-advance">
            <b>Advance Payment Details</b>
            <p>Amount</p>
            <strong>{money(data.advance_amount || 0)}</strong>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={data.payment_mode || ""}
                onChange={setField("payment_mode")}
                style={{ width: "20%", height: 22, padding: "0 6px" }}
              >
                <option value="">Payment Mode</option>
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
              </select>
              <input
                placeholder="Payment Detail"
                value={data.payment_detail || ""}
                onChange={setField("payment_detail")}
                style={{ width: "20%", height: 22, padding: "0 6px", marginLeft: 16 }}
              />
              <input
                placeholder="Paid By"
                value={data.paid_by || ""}
                onChange={setField("paid_by")}
                style={{ width: "20%", height: 22, padding: "0 6px" }}
              />
            </div>
          </div>
        </Panel>
      )}

      {!loading && tab === "services" && (
        <Panel title="Services">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Room No</th><th>Particulars</th>
                <th>KOT/Invoice No</th><th>Amount</th><th>Discount</th>
                <th>Service Charge</th><th>Net</th><th>SGST</th><th>CGST</th><th>Final Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data.services || []).length === 0 ? (
                <tr>
                  <td colSpan="11"><b>No service found.</b></td>
                </tr>
              ) : (
                data.services.map((svc, i) => (
                  <tr key={i}>
                    <td>{fmtDate(svc.date)}</td>
                    <td>{svc.room_no || room}</td>
                    <td>{svc.name}</td>
                    <td>{svc.kot_no || ""}</td>
                    <td>{money(svc.amount)}</td>
                    <td>{money(svc.discount)}</td>
                    <td>{money(svc.service_charge)}</td>
                    <td>{money(svc.net)}</td>
                    <td>{money(svc.sgst)}</td>
                    <td>{money(svc.cgst)}</td>
                    <td>{money(svc.final_amount)}</td>
                  </tr>
                ))
              )}
              <tr>
                <td colSpan="4" className="right"><b>Total</b></td>
                <td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td>
                <td>0.00</td><td>0.00</td><td>0.00</td>
              </tr>
            </tbody>
          </table>
          <button className="blue">▣ Add Service</button>
        </Panel>
      )}

      {!loading && tab === "payment" && (
        <div className="fo-payment">
          <Panel title="Payment Received">
            <table>
              <thead>
                <tr>
                  <th>Room#</th><th>Amount</th><th>Payment Mode</th>
                  <th>Pmt Type</th><th>Pmt Detail</th><th>Date</th><th/>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{room}</td>
                  <td>{money(total)}</td>
                  <td>{data.payment_mode || "UPI"}</td>
                  <td>Tariff</td>
                  <td>{data.payment_detail || ""}</td>
                  <td>{dateTime(data.date)}</td>
                  <td>🖨 🗑 ✎</td>
                </tr>
              </tbody>
            </table>
            <Summary total={total} advanceAmount={Number(data.advance_amount || 0)} />
          </Panel>
        </div>
      )}

      {!loading && tab === "checkout" && (
        <div className="fo-checkout">
          <Panel title="Invoice Summary">
            <Info label="Guest Name" value={guest} />
            <Info label="Room No" value={room} />
            <Info label="Checkin Date" value={dateTime(data.check_in)} />
            <Info label="Checkout Date" value={dateTime(data.check_out)} />
            <Info label="No Of Pax" value={`${data.adults || 1} Adults, ${data.children || 0} Children`} />
            <Info label="Tour Type" value={data.tour_type || "Personal"} />
          </Panel>

          <Panel title="Payment Summary">
            <Summary total={total} advanceAmount={Number(data.advance_amount || 0)} />
          </Panel>

          <div className="fo-check-options">
            <p>□ Manage Invoice</p>
            <p>□ NC?</p>
            <p>□ Bill To Company</p>
            <p>□ Debit To Company</p>
            <button className="blue" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>{" "}
            <button className="blue">Save & Print</button>{" "}
            <button className="cyan">Print</button>{" "}
            <button onClick={onBack}>☷ List</button>
          </div>
        </div>
      )}

      <button className="fo-edge-toggle">‹</button>
    </div>
  );
};

const Section = ({ title, children }) => (
  <section className="fo-edit-section">
    <h3>{title}</h3>
    <div>{children}</div>
  </section>
);
const Panel = Section;
const Field = ({ label, value = "", type = "text", onChange }) => (
  <div>
    <label>{label}</label>
    {type === "select" ? (
      <select value={value} onChange={onChange}>{children}</select>
    ) : (
      <input
        type={type}
        defaultValue={type === "file" ? undefined : value}
        onChange={onChange}
        style={{ height: 23, border: "1px solid #cbd0d3", padding: "3px 5px", width: "100%", boxSizing: "border-box" }}
      />
    )}
  </div>
);
const Info = ({ label, value }) => (
  <div className="fo-info">
    <b>{label}:</b>
    <span>{value}</span>
  </div>
);
const Summary = ({ total, advanceAmount = 0 }) => (
  <div className="fo-summary">
    <Info label="Room Total" value={`Rs. ${money(total)}`} />
    <Info label="Service Total" value="Rs. 0.00" />
    <Info label="Invoice Total" value={`Rs. ${money(total)}`} />
    <Info label="Total Received" value={`Rs. ${money(advanceAmount)}`} />
    <Info label="Balance" value={`Rs. ${money(Math.max(0, total - advanceAmount))}`} />
  </div>
);

export default InvoiceEditorView;
