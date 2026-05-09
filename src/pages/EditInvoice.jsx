import React, { useState, useEffect } from "react";
import API from "../api";
import "./EditInvoice.css";

const EditInvoice = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await API.get("/invoices/all");
      setInvoices(res.data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const selectInvoice = (inv) => {
    setSelected(inv);
    setEditData({
      customerName: inv.customerName || inv.guestName || "",
      phone: inv.phone || inv.mobile || "",
      subtotal: inv.subtotal || inv.amount || 0,
      discount: inv.discount || 0,
      gst: inv.gst || 0,
      total: inv.total || inv.grandTotal || 0,
      paymentStatus: inv.paymentStatus || inv.status || "Pending",
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await API.put(`/invoices/update/${selected.id}`, editData);
      setInvoices(prev => prev.map(i => i.id === selected.id ? { ...i, ...editData } : i));
      setSelected(null);
      alert("Invoice updated successfully");
    } catch (err) {
      console.error("Error updating invoice:", err);
      alert("Failed to update invoice");
    }
  };

  const formatINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="ei-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Edit Invoice</h1>
      </div>

      <div className="ei-layout">
        {/* Invoice List */}
        <div className="ei-list">
          <div className="simple-card" style={{ padding: 0 }}>
            <div className="ei-list-header">All Invoices</div>
            <div className="ei-list-items">
              {invoices.map(inv => (
                <div key={inv.id} className={`ei-list-row ${selected?.id === inv.id ? "selected" : ""}`} onClick={() => selectInvoice(inv)}>
                  <div className="ei-list-id">#{inv.id}</div>
                  <div className="ei-list-name">{inv.customerName || inv.guestName || `Guest ${inv.guest_name || inv.room}` || "—"}</div>
                  <div className="ei-list-amount">{formatINR(inv.total || inv.grandTotal || inv.amount)}</div>
                  <div className="ei-list-status">
                    <span className={`simple-badge ${inv.paymentStatus === "Paid" || inv.status === "Paid" ? "badge-green" : "badge-orange"}`}>
                      {inv.paymentStatus || inv.status || "Pending"}
                    </span>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && !loading && (
                <div className="ei-empty">No invoices found</div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Panel */}
        <div className="ei-edit">
          {!selected ? (
            <div className="ei-placeholder">Select an invoice from the list to edit</div>
          ) : (
            <div className="simple-card">
              <div className="ei-edit-header">
                <h3>Edit Invoice #{selected.id}</h3>
                <span className="simple-text-muted">{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : ""}</span>
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Customer Name</label>
                <input className="simple-input" value={editData.customerName} onChange={e => setEditData(p => ({ ...p, customerName: e.target.value }))} />
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Phone</label>
                <input className="simple-input" value={editData.phone} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="ei-edit-amounts">
                <div className="simple-form-group">
                  <label className="simple-label">Subtotal (₹)</label>
                  <input type="number" className="simple-input" value={editData.subtotal} onChange={e => setEditData(p => ({ ...p, subtotal: Number(e.target.value) }))} min="0" />
                </div>
                <div className="simple-form-group">
                  <label className="simple-label">Discount (₹)</label>
                  <input type="number" className="simple-input" value={editData.discount} onChange={e => setEditData(p => ({ ...p, discount: Number(e.target.value) }))} min="0" />
                </div>
                <div className="simple-form-group">
                  <label className="simple-label">GST (₹)</label>
                  <input type="number" className="simple-input" value={editData.gst} onChange={e => setEditData(p => ({ ...p, gst: Number(e.target.value) }))} min="0" />
                </div>
                <div className="simple-form-group">
                  <label className="simple-label">Payment Status</label>
                  <select className="simple-select" value={editData.paymentStatus} onChange={e => setEditData(p => ({ ...p, paymentStatus: e.target.value }))}>
                    <option>Pending</option><option>Paid</option><option>Partial</option><option>Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="ei-total-row">
                <span>Total Amount</span>
                <span className="ei-total-val">{formatINR(editData.total)}</span>
              </div>
              <div className="simple-btn-row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
                <button className="simple-btn simple-btn-gray" onClick={() => setSelected(null)}>Cancel</button>
                <button className="simple-btn simple-btn-primary" onClick={handleSave}>Update Invoice</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditInvoice;