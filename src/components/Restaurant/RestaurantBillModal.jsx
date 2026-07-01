import React from "react";
import { createPortal } from "react-dom";
import API from "../../api";
import "./RestaurantBillModal.css";

const fmt = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const fmtDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const RestaurantBillModal = ({ bill, onClose }) => {
  if (!bill) return null;

  const items = Array.isArray(bill.items) ? bill.items : [];
  const subtotal = Number(bill.subtotal || bill.subTotal || 0);
  const gst = Number(bill.gst || 0);
  const discount = Number(bill.discountAmount || bill.discount || 0);
  const total = Number(bill.total || 0);
  const taxPct = subtotal > 0 ? ((gst / subtotal) * 100).toFixed(1) : "0";

  const billNo = bill.billNo || bill.invoiceNo || bill.id || bill.invoice_no || "";
  const tableLabel = bill.tableNumber || bill.table || bill.table_no || "";
  const waiter = bill.waiter_name || bill.waiterName || "";
  const paymentMethod = bill.paymentMethod || bill.payment_mode || "";
  const orderType = bill.entityType || bill.orderType || bill.type || "DINE_IN";
  const date = bill.created_at || bill.date || bill.invoice_date || "";

  // Local state for editable customer info (WhatsApp needs these)
  const [customerName, setCustomerName] = React.useState(bill.customerName || bill.customer_name || "");
  const [phone, setPhone] = React.useState(bill.phone || bill.customer_phone || "");
  const [phoneError, setPhoneError] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const validatePhone = (val) => {
    const cleaned = String(val || "").replace(/[^0-9]/g, "");
    if (!cleaned) return "Phone number is required";
    if (cleaned.length < 10) return "Phone must be at least 10 digits";
    return "";
  };

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    window.open(
      `${import.meta.env.VITE_API_URL || "http://localhost:5002"}/uploads/restaurant-bills/restaurant-bill-${billNo}.pdf`,
      "_blank"
    );
  };

  const handleSendWhatsApp = async () => {
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    if (!customerName.trim()) { alert("Please enter the customer name."); return; }

    setSending(true);
    setPhoneError("");
    try {
      const res = await API.post("/restaurant/bill/send-whatsapp", {
        billNo,
        customerName: customerName.trim(),
        phone: phone.replace(/[^0-9]/g, ""),
        items,
      });
      if (res.data?.wasend?.status === "success" || res.data?.whatsapp?.status === "success") {
        alert("✅ Bill sent to WhatsApp successfully!");
      } else {
        const reason = res.data?.wasend?.reason || res.data?.message || "sent";
        alert("WhatsApp: " + reason);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg.includes("credentials")) {
        alert("⚠️ WhatsApp not configured. Ask admin to set WASEND_USERNAME and WASEND_TOKEN in backend .env");
      } else {
        alert("Failed to send WhatsApp: " + msg);
      }
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="rbm-backdrop" onClick={onClose}>
      <div className="rbm-modal" onClick={(e) => e.stopPropagation()}>

        {/* header */}
        <div className="rbm-header">
          <div>
            <div className="rbm-brand">Maa Baglamukhi</div>
            <div className="rbm-title">Restaurant Bill</div>
          </div>
          <div className="rbm-header-actions">
            <button className="rbm-action-btn" onClick={handlePrint} title="Print">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>
            <button className="rbm-action-btn" onClick={handleDownloadPdf} title="Download PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
            <button className="rbm-action-btn rbm-whatsapp-btn" onClick={handleSendWhatsApp} title="Send on WhatsApp">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.296-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-.879-.79-1.481-1.761-1.656-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </button>
            <button className="rbm-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* bill body */}
        <div className="rbm-body" id="rbm-print-area">
          <div className="rbm-bill-title-row">
            <span className="rbm-bill-label">INVOICE</span>
            <span className="rbm-bill-no">#{billNo}</span>
          </div>

          <div className="rbm-meta-grid">
            <MetaItem label="Date" value={fmtDate(date)} />
            <MetaItem label="Type" value={orderType.replace("_", " ")} />
            {tableLabel && <MetaItem label="Table" value={tableLabel} />}
            {waiter && <MetaItem label="Captain" value={waiter} />}
            {paymentMethod && <MetaItem label="Payment" value={paymentMethod} />}
          </div>

          {/* Customer Info - Required for WhatsApp */}
          <div style={{ margin: '12px 0', padding: '10px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#495057', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📋 Customer Details {phone && <span style={{ color: '#28a745', fontWeight: 400 }}>✓ Ready for WhatsApp</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Customer Name *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="tel"
                  placeholder="Phone Number * (for WhatsApp)"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setPhoneError(""); }}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: phoneError ? '1px solid #dc3545' : '1px solid #ced4da', borderRadius: '4px' }}
                />
                {phoneError && <div style={{ color: '#dc3545', fontSize: '10px', marginTop: '2px' }}>{phoneError}</div>}
              </div>
            </div>
            {!phone && (
              <div style={{ fontSize: '10px', color: '#856404', background: '#fff3cd', padding: '4px 8px', borderRadius: '3px', marginTop: '6px' }}>
                ⚠️ Enter phone number to enable WhatsApp bill sharing
              </div>
            )}
          </div>

          <table className="rbm-items-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Item</th>
                <th style={{ width: 70, textAlign: "right" }}>Qty</th>
                <th style={{ width: 90, textAlign: "right" }}>Rate</th>
                <th style={{ width: 90, textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="rbm-empty">No items</td></tr>
              ) : items.map((item, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center" }}>{i + 1}</td>
                  <td><span className="rbm-item-name">{item.name}</span></td>
                  <td style={{ textAlign: "right" }}>{Number(item.quantity || 0).toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>₹{fmt(item.price || item.rate)}</td>
                  <td style={{ textAlign: "right" }}>₹{fmt(item.amount || (Number(item.quantity || 0) * Number(item.price || item.rate || 0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="rbm-totals">
            <div className="rbm-total-row">
              <span>Subtotal</span>
              <span>₹{fmt(subtotal)}</span>
            </div>
            <div className="rbm-total-row">
              <span>GST ({taxPct}%)</span>
              <span>₹{fmt(gst)}</span>
            </div>
            {discount > 0 && (
              <div className="rbm-total-row rbm-discount">
                <span>Discount</span>
                <span>− ₹{fmt(discount)}</span>
              </div>
            )}
            <div className="rbm-grand-total">
              <span>GRAND TOTAL</span>
              <span>₹{fmt(total)}</span>
            </div>
          </div>

          <p className="rbm-footer-note">Thank you for dining with us!</p>
        </div>

        {/* action bar */}
        <div className="rbm-footer-actions">
          <button className="rbm-btn rbm-btn-print" onClick={handlePrint}>
            🖨️ Print Bill
          </button>
          <button
            className="rbm-btn rbm-btn-whatsapp"
            onClick={handleSendWhatsApp}
            disabled={sending || !phone.trim()}
            title={!phone.trim() ? "Enter phone number above to enable WhatsApp" : ""}
          >
            {sending ? "⏳ Sending..." : "📱 Send on WhatsApp"}
          </button>
          <button className="rbm-btn rbm-btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const MetaItem = ({ label, value }) => (
  <div className="rbm-meta-item">
    <span className="rbm-meta-label">{label}</span>
    <span className="rbm-meta-value">{value || "—"}</span>
  </div>
);

export default RestaurantBillModal;
