import { useState } from "react";
import "./InvoiceEditorView.css";

const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = (value) => value ? new Date(value).toLocaleString("en-GB") : "—";

const InvoiceEditorView = ({ invoice = {}, onBack }) => {
  const [tab, setTab] = useState("basic");
  const room = invoice.room_no || "—";
  const guest = invoice.customer_name || invoice.guest_name || "—";
  const total = Number(invoice.final_total || invoice.total_amount || invoice.total || 0);
  const tariff = Number(invoice.price_per_day || total || 0);
  const gst = Number(invoice.gst || 0);
  const taxable = Math.max(0, tariff - Number(invoice.discount || 0));
  const tabs = [["basic", "Basic Information"], ["tariff", "Tariff Detail"], ["services", "Services"], ["payment", "Payment Detail"], ["checkout", "Checkout & Print Invoice"]];

  return <div className="fo-editor">
    <header className="fo-editor-head"><div><span>INVOICE</span><strong>Room No: {room}</strong></div><div>Checkout Type: <b>[24Hrs]</b>　|　 Grace Period: <b>[1 Hours]</b>　|</div><div><button>Export to Excel</button><button className="dark">↻ Refresh</button></div></header>
    <nav className="fo-editor-tabs">{tabs.map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>

    {tab === "basic" && <div className="fo-basic-grid">
      <div><Section title={<>Invoice Information <b>Folio#: {invoice.booking_id || "—"}</b></>}><div className="fo-fields two"><Field label="Invoice No" value={invoice.invoice_no || invoice.id} /><Field label="Invoice Date" type="date" /><select><option>Walk In</option></select></div></Section><Section title="Arrival Details"><div className="fo-fields two"><Field label="Check In Date *" value={dateTime(invoice.check_in)} /><Field label="Check Out Date *" value={dateTime(invoice.check_out)} /><Field label="No Of Nights *" value="1" /><div><label>Tour Type *</label><p>◉ Personal　○ Business</p></div></div></Section><Section title="Room Details"><div className="fo-fields three"><Field label="Room No *" value={room} /><div/><div/><div><label>Bed Type *</label><p>◉ Single　○ Double</p></div><div><label>Rate Type *</label><p>◉ Basic　○ Rack　○ Seasonal</p></div><div/><Field label="Adults *" value={invoice.adults || 1}/><Field label="Children" value={invoice.children || 0}/><Field label="Extra Bed" value="0"/></div></Section></div>
      <Section title="Primary Guest Details"><div className="fo-fields"><Field label="Mobile Number *" value={invoice.phone}/><Field label="Guest Name *" value={guest}/><Field label="Alternate Numbers"/><Field label="Gender" value="Male"/><div className="fo-fields two"><Field label="Guest Details/Address"/><Field label="Nationality" value="INDIAN"/></div><div className="fo-fields two"><Field label="ID Type" value="Aadhar Card"/><Field label="ID Number *"/></div><Field label="Id Card Photo" type="file"/><button className="green">Upload</button><Field label="Id Card Photo 2" type="file"/><button className="green">Upload</button></div></Section>
      <div><Section title="Secondary Guest Details"><div className="fo-fields two"><Field label="Guest Name"/><Field label="Gender"/><Field label="ID Proof Type"/><Field label="ID Number"/></div><button className="blue">+ Add</button></Section><Section title="Office Use"><div className="fo-fields two"><Field label="Coming From"/><Field label="Going To"/></div><Field label="Purpose of Visit"/><label>Remarks</label><textarea/><label>Special Notes</label><textarea/></Section><div className="fo-editor-next"><button>Group Details</button><button className="green" onClick={() => setTab("tariff")}>Next ›</button><button className="blue">Print GRC</button><button className="dark" onClick={onBack}>☷ Back To List</button></div></div>
    </div>}

    {tab === "tariff" && <Panel title="Tariff Details"><table><thead><tr><th>Action</th><th>Date</th><th>Room No</th><th>Particulars</th><th>Tariff</th><th>Disc (%)</th><th>Taxable</th><th>State GST</th><th>Center GST</th><th>Total</th></tr></thead><tbody><tr><td>🗑</td><td>{dateTime(invoice.check_in)}</td><td>{room}</td><td>Room Charges</td><td>{money(tariff)}</td><td>0.00</td><td>{money(taxable)}</td><td>{money(gst/2)}</td><td>{money(gst/2)}</td><td>{money(total)}</td></tr><tr><td colSpan="9" className="right"><b>NET TOTAL</b></td><td><b>{money(total)}</b></td></tr></tbody></table><div className="fo-advance"><b>Advance Payment Details</b><p>Amount</p><strong>0.00</strong><select><option>Payment Mode</option></select><input placeholder="Payment Detail"/><input placeholder="Paid By"/></div></Panel>}
    {tab === "services" && <Panel title="Services"><table><thead><tr><th>Date</th><th>Room No</th><th>Particulars</th><th>KOT/Invoice No</th><th>Amount</th><th>Discount</th><th>Service Charge</th><th>Net</th><th>SGST</th><th>CGST</th><th>Final Amount</th></tr></thead><tbody><tr><td colSpan="11"><b>No service found.</b></td></tr><tr><td colSpan="4" className="right"><b>Total</b></td><td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td></tr></tbody></table><button className="blue">▣ Add Service</button></Panel>}
    {tab === "payment" && <div className="fo-payment"><Panel title="Payment Received"><table><thead><tr><th>Room#</th><th>Amount</th><th>Payment Mode</th><th>Pmt Type</th><th>Pmt Detail</th><th>Date</th><th/></tr></thead><tbody><tr><td>{room}</td><td>{money(total)}</td><td>{invoice.payment_mode || "UPI"}</td><td>Tariff</td><td/><td>{dateTime(invoice.date)}</td><td>🖨 🗑 ✎</td></tr></tbody></table><Summary total={total}/></Panel></div>}
    {tab === "checkout" && <div className="fo-checkout"><Panel title="Invoice Summary"><Info label="Guest Name" value={guest}/><Info label="Room No" value={room}/><Info label="Checkin Date" value={dateTime(invoice.check_in)}/><Info label="Checkout Date" value={dateTime(invoice.check_out)}/><Info label="No Of Pax" value={`${invoice.adults || 1} Adults, ${invoice.children || 0} Children`}/><Info label="Tour Type" value="Personal"/></Panel><Panel title="Payment Summary"><Summary total={total}/></Panel><div className="fo-check-options"><p>□ Manage Invoice</p><p>□ NC?</p><p>□ Bill To Company</p><p>□ Debit To Company</p><button className="blue">Save</button> <button className="blue">Save & Print</button> <button className="cyan">Print</button> <button onClick={onBack}>☷ List</button></div></div>}
    <button className="fo-edge-toggle">‹</button>
  </div>;
};

const Section = ({ title, children }) => <section className="fo-edit-section"><h3>{title}</h3><div>{children}</div></section>;
const Panel = Section;
const Field = ({ label, value = "", type = "text" }) => <div><label>{label}</label><input type={type} defaultValue={type === "file" ? undefined : value}/></div>;
const Info = ({ label, value }) => <div className="fo-info"><b>{label}:</b><span>{value}</span></div>;
const Summary = ({ total }) => <div className="fo-summary"><Info label="Room Total" value={`Rs. ${money(total)}`}/><Info label="Service Total" value="Rs. 0.00"/><Info label="Invoice Total" value={`Rs. ${money(total)}`}/><Info label="Total Received" value={`Rs. ${money(total)}`}/><Info label="Balance" value="Rs. 0.00"/></div>;
export default InvoiceEditorView;
