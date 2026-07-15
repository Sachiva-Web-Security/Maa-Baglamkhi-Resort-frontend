// src/pages/InventoryPurchasesPage.jsx
// Purchase Orders / Invoices — fetches from /api/inventory/purchase-orders
// Add / Edit via modal; search + status filter.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShoppingCart,
} from "react-icons/fa";

import API from "../api";
import { fetchInventoryMasterRecords } from "../services/inventoryMastersService";

/* ── style tokens ── */
const c = {
  ink: "#132A2A",
  paper: "#F6F5F1",
  panel: "#FFFFFF",
  line: "#E4E1D8",
  teal: "#0F6E64",
  tealDeep: "#0B4F48",
  amber: "#C8791A",
  rose: "#B5442E",
  muted: "#6B6F66",
  text: "#1C231F",
};

const fieldCls =
  "w-full rounded-[9px] border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] font-medium text-[#1C231F] shadow-sm transition-all duration-200 placeholder:text-[#6B6F66] placeholder:font-medium focus:border-[#0F6E64] focus:outline-none focus:outline-2 focus:outline-offset-1 focus:outline-[#0F6E64]";

const labelCls = "mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B6F66]";

const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap bg-[#0B4F48] text-white hover:bg-[#0F6E64]";

const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 active:scale-[0.97] bg-transparent border border-[#E4E1D8] text-[#1C231F] hover:bg-[#F6F5F1]";

const rowActionBtn = (tone = "neutral") => {
  const tones = {
    neutral: "border-[#E4E1D8] bg-white text-[#1C231F] hover:bg-[#F6F5F1]",
    primary: "border-[#E4E1D8] bg-[#E4F0EE] text-[#0B4F48] hover:bg-[#CFE7E2]",
  };
  return `inline-flex items-center justify-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold border transition-all duration-200 ${tones[tone] || tones.neutral}`;
};

const STATUS_STYLES = {
  draft: "bg-[#F6F5F1] text-[#6B6F66]",
  pending: "bg-[#F3E9DD] text-[#C8791A]",
  "grn received": "bg-[#E4F0EE] text-[#0B4F48]",
  completed: "bg-[#E4F0EE] text-[#0B4F48]",
  cancelled: "bg-[#F5DFDA] text-[#B5442E]",
};

const statusBadge = (s) => {
  const key = String(s || "").toLowerCase().trim().replace(/\s+/g, "-");
  const style = STATUS_STYLES[key] || "bg-[#F6F5F1] text-[#6B6F66]";
  return `inline-block rounded-full px-3 py-1 text-[11px] font-bold ${style}`;
};

/* ── Modal ── */
const Modal = ({ open, onClose, title, subtitle, children, actions }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#132A2A]/45 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] max-h-[88vh] overflow-y-auto rounded-[16px] bg-white p-5 sm:p-6 shadow-[0_30px_90px_rgba(19,42,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[19px] font-bold text-[#132A2A] m-0">{title}</h3>
            {subtitle && <p className="text-[12.5px] text-[#6B6F66] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-[#6B6F66] transition hover:bg-[#F6F5F1] hover:text-[#132A2A]"
            aria-label="Close"
            type="button"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>
        <div className="text-[13.5px] leading-relaxed text-[#1C231F]">{children}</div>
        {actions && <div className="mt-5 flex flex-wrap justify-end gap-2.5">{actions}</div>}
      </div>
    </div>
  );
};

/* ── Toast ── */
const Toast = ({ open, type, title, message, onClose }) => {
  if (!open) return null;
  const tone = type === "success" ? "bg-[#E4F0EE] text-[#0B4F48]" : "bg-[#F5DFDA] text-[#B5442E]";
  const Icon = type === "success" ? FaCheckCircle : FaExclamationTriangle;
  return (
    <div className={`fixed bottom-5 right-5 z-[90] flex items-center gap-3 rounded-[12px] border border-[#E4E1D8] ${tone} px-5 py-3.5 shadow-lg max-w-sm`}>
      <Icon className="text-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold">{title}</div>
        <div className="text-[12px] opacity-80 truncate">{message}</div>
      </div>
      <button type="button" onClick={onClose} className="shrink-0 rounded-full p-1 hover:bg-black/5">
        <FaTimes className="text-sm" />
      </button>
    </div>
  );
};

/* ─────────────────────────────── Main Component ─────────────────────────────── */

const InventoryPurchasesPage = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await API.get("/inventory/purchase-orders");
      setPurchases(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await fetchInventoryMasterRecords("vendors");
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      setVendors([]);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchVendors();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((p) => {
      const matchesSearch = !q || [p.po_number, p.vendor, p.item_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || String(p.status || "").toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchases, search, statusFilter]);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editingId) {
        await API.put(`/inventory/purchase-orders/${editingId}`, formData);
        setToast({ open: true, type: "success", title: "Purchase updated", message: `Order ${formData.poNumber} has been updated.` });
      } else {
        await API.post("/inventory/purchase-orders", formData);
        setToast({ open: true, type: "success", title: "Purchase created", message: `Order ${formData.poNumber} has been created.` });
      }
      setShowForm(false);
      setEditingId(null);
      await fetchPurchases();
    } catch (err) {
      setToast({ open: true, type: "error", title: "Save failed", message: err.response?.data?.message || "Could not save purchase." });
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (purchase) => {
    setEditingId(purchase.id);
    setShowForm(true);
  };

  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  const statusPills = ["all", "draft", "pending", "grn received", "completed", "cancelled"];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: c.paper, color: c.text, padding: "22px 22px 60px" }}>
      {/* ── top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-white font-bold text-[18px]"
              style={{ background: c.tealDeep }}
            >
              <FaShoppingCart />
            </div>
            <div>
              <h1 className="text-[21px] font-semibold m-0 leading-tight" style={{ letterSpacing: "0.2px" }}>
                Purchase Invoices
              </h1>
              <p className="m-0 text-[12px]" style={{ color: c.muted }}>
                Track purchase orders and vendor invoices
              </p>
            </div>
          </div>
        </div>
        <button type="button" onClick={openAdd} className={primaryBtn}>
          <FaPlus className="text-sm" /> New Purchase
        </button>
      </div>

      {/* ── search + filter ── */}
      <div className="flex gap-2.5 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F66] text-xs" />
          <input
            className={`${fieldCls} pl-9`}
            placeholder="Search by PO #, vendor, item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusPills.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-[20px] px-3 py-1.5 text-[12px] font-medium transition-all border ${
                statusFilter === s
                  ? "bg-[#0B4F48] text-white border-[#0B4F48]"
                  : "bg-white border-[#E4E1D8] text-[#1C231F] hover:bg-[#F6F5F1]"
              }`}
            >
              {s === "all" ? "All" : s === "grn received" ? "GRN Received" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── table ── */}
      <div className="bg-white border border-[#E4E1D8] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-[13px]">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">PO #</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Vendor</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Item</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Qty</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Rate (₹)</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Total (₹)</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Status</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 border-b border-[#E4E1D8] w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E1D8]">
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center text-[#6B6F66]">Loading purchases…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="text-center py-9 text-[#6B6F66]">
                      <b className="block text-[14.5px] text-[#1C231F] mb-1">No purchases found</b>
                      <span className="text-[13px]">Create your first purchase order to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const total = Number(p.quantity || 0) * Number(p.rate || 0);
                  return (
                    <tr key={p.id} className="hover:bg-[#F6F5F1]/50 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-[#1C231F]">{p.po_number || "-"}</td>
                      <td className="py-2.5 pr-3 text-[#1C231F]">{p.vendor || "-"}</td>
                      <td className="py-2.5 pr-3 text-[#1C231F]">{p.item_name || "-"}</td>
                      <td className="py-2.5 pr-3 text-[#1C231F]">{p.quantity || 0}</td>
                      <td className="py-2.5 pr-3 text-[#1C231F]">{Number(p.rate || 0).toFixed(2)}</td>
                      <td className="py-2.5 pr-3 font-semibold text-[#1C231F]">{total.toFixed(2)}</td>
                      <td className="py-2.5 pr-3"><span className={statusBadge(p.status)}>{p.status || "Draft"}</span></td>
                      <td className="py-2.5">
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => openEdit(p)} className={rowActionBtn("primary")}>
                            <FaEdit /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Form modal ── */}
      <PurchaseFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingId(null); }}
        onSave={handleSave}
        initialId={editingId}
        vendors={vendors}
        saving={saving}
      />
      <Toast open={toast.open} type={toast.type} title={toast.title} message={toast.message} onClose={closeToast} />
    </div>
  );
};

/* ── Purchase Form Modal ── */
const PurchaseFormModal = ({ open, onClose, onSave, initialId, vendors, saving }) => {
  const blank = { poNumber: "", vendor: "", itemName: "", quantity: "", unit: "", rate: "", expectedDate: "", status: "Draft" };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (open) {
      if (initialId) {
        // Fetch single PO for editing
        API.get(`/inventory/purchase-orders/${initialId}`)
          .then((res) => {
            const d = res.data;
            setForm({
              poNumber: d.po_number || "",
              vendor: d.vendor || "",
              itemName: d.item_name || "",
              quantity: String(d.quantity || 0),
              unit: d.unit || "",
              rate: String(d.rate || 0),
              expectedDate: d.expected_date ? String(d.expected_date).slice(0, 10) : "",
              status: d.status || "Draft",
            });
          })
          .catch(() => setForm(blank));
      } else {
        setForm(blank);
      }
    }
  }, [open, initialId]);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const total = useMemo(() => (Number(form.quantity) || 0) * (Number(form.rate) || 0), [form.quantity, form.rate]);

  const handleSubmit = () => {
    if (!form.poNumber.trim() || !form.vendor.trim()) return;
    onSave({
      poNumber: form.poNumber,
      vendor: form.vendor,
      itemName: form.itemName,
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      rate: Number(form.rate) || 0,
      expectedDate: form.expectedDate || null,
      status: form.status,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialId ? "Edit purchase order" : "New purchase order"}
      subtitle={initialId ? "Update purchase order details" : "Create a new purchase order or invoice"}
      actions={
        <>
          <button type="button" onClick={onClose} className={ghostBtn} disabled={saving}>Cancel</button>
          <button type="button" onClick={handleSubmit} className={primaryBtn} disabled={saving}>
            {saving ? "Saving…" : initialId ? "Save changes" : "Create order"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="field">
          <label className={labelCls}>PO Number *</label>
          <input className={fieldCls} placeholder="e.g. PO-001" value={form.poNumber} onChange={(e) => setField("poNumber", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Vendor *</label>
          <select className={fieldCls} value={form.vendor} onChange={(e) => setField("vendor", e.target.value)}>
            <option value="">Select vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.name}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className={labelCls}>Item name</label>
          <input className={fieldCls} placeholder="e.g. Rice" value={form.itemName} onChange={(e) => setField("itemName", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Quantity</label>
          <input type="number" className={fieldCls} placeholder="0" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Unit</label>
          <input className={fieldCls} placeholder="kg / pcs / ltr" value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Rate per unit (₹)</label>
          <input type="number" className={fieldCls} placeholder="0.00" value={form.rate} onChange={(e) => setField("rate", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Expected date</label>
          <input type="date" className={fieldCls} value={form.expectedDate} onChange={(e) => setField("expectedDate", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Status</label>
          <select className={fieldCls} value={form.status} onChange={(e) => setField("status", e.target.value)}>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="GRN Received">GRN Received</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="field sm:col-span-2">
          <label className={labelCls}>Total amount (₹)</label>
          <input className={`${fieldCls} bg-[#F6F5F1]`} value={total.toFixed(2)} readOnly />
        </div>
      </div>
    </Modal>
  );
};

export default InventoryPurchasesPage;
