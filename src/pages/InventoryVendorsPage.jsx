// src/pages/InventoryVendorsPage.jsx
// Vendors list — fetches from /api/inventory-masters/vendors
// Add / Edit via modal; Delete inline with confirmation.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaTruck,
} from "react-icons/fa";

import API, { getBackendBaseURL } from "../api";
import {
  createInventoryMasterRecord,
  deleteInventoryMasterRecord,
  fetchInventoryMasterRecords,
  updateInventoryMasterRecord,
} from "../services/inventoryMastersService";

/* ── shared style tokens ── */
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
    danger: "border-[#E4E1D8] bg-[#F5DFDA] text-[#B5442E] hover:bg-[#F3D0C9]",
  };
  return `inline-flex items-center justify-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold border transition-all duration-200 ${tones[tone] || tones.neutral}`;
};

const STATUS_STYLES = {
  active: "bg-[#E4F0EE] text-[#0B4F48]",
  inactive: "bg-[#F5DFDA] text-[#B5442E]",
};
const statusBadge = (s) => {
  const key = String(s || "active").toLowerCase().trim();
  const style = STATUS_STYLES[key] || "bg-[#F6F5F1] text-[#6B6F66]";
  return `inline-block rounded-full px-3 py-1 text-[11px] font-bold ${style}`;
};

/* ── Modal primitive ── */
const Modal = ({ open, onClose, title, subtitle, children, actions }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#132A2A]/45 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto rounded-[16px] bg-white p-5 sm:p-6 shadow-[0_30px_90px_rgba(19,42,42,0.28)]"
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

/* ── Confirm delete modal ── */
const ConfirmDelete = ({ open, onClose, onConfirm, vendorName }) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Delete vendor?"
    subtitle={`This will remove "${vendorName || "this vendor"}" permanently.`}
    actions={
      <>
        <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
        <button type="button" onClick={() => { onConfirm(); onClose(); }} className="inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold bg-[#B5442E] text-white hover:bg-[#9a3a26] active:scale-[0.97]">Delete</button>
      </>
    }
  >
    <p className="text-[13.5px] text-[#1C231F]">Are you sure? This action cannot be undone. Any linked purchase records will keep the vendor name for historical reference.</p>
  </Modal>
);

/* ── Vendor form modal ── */
const VendorFormModal = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
    city: "",
    gstin: "",
    status: "active",
  });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name || "",
          contact: initial.contact || "",
          phone: initial.phone || "",
          email: initial.email || "",
          city: initial.city || "",
          gstin: initial.gstin || "",
          status: initial.status || "active",
        });
      } else {
        setForm({ name: "", contact: "", phone: "", email: "", city: "", gstin: "", status: "active" });
      }
    }
  }, [open, initial]);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit vendor" : "Add vendor"}
      subtitle={initial ? "Update vendor details" : "Add a new supplier to your vendor list"}
      actions={
        <>
          <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
          <button type="button" onClick={handleSubmit} className={primaryBtn}>{initial ? "Save changes" : "Add vendor"}</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="field">
          <label className={labelCls}>Vendor name *</label>
          <input className={fieldCls} placeholder="e.g. Sharma Traders" value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Contact person</label>
          <input className={fieldCls} placeholder="e.g. Ramesh Sharma" value={form.contact} onChange={(e) => setField("contact", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Phone</label>
          <input className={fieldCls} placeholder="+91" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Email</label>
          <input className={fieldCls} placeholder="vendor@email.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>City</label>
          <input className={fieldCls} placeholder="e.g. Delhi" value={form.city} onChange={(e) => setField("city", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>GSTIN</label>
          <input className={fieldCls} placeholder="e.g. 07AABCS1234R1ZX" value={form.gstin} onChange={(e) => setField("gstin", e.target.value)} />
        </div>
      </div>
    </Modal>
  );
};

/* ─────────────────────────────── Main Component ─────────────────────────────── */

const InventoryVendorsPage = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryMasterRecords("vendors");
      setVendors(Array.isArray(res) ? res : []);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) =>
      [v.name, v.contact, v.phone, v.email, v.city]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q)),
    );
  }, [vendors, search]);

  const handleSave = async (formData) => {
    try {
      if (editingVendor) {
        await updateInventoryMasterRecord("vendors", editingVendor.id, formData);
        setToast({ open: true, type: "success", title: "Vendor updated", message: `${formData.name} has been updated.` });
      } else {
        await createInventoryMasterRecord("vendors", formData);
        setToast({ open: true, type: "success", title: "Vendor added", message: `${formData.name} has been added to your vendor list.` });
      }
      setShowForm(false);
      setEditingVendor(null);
      await fetchVendors();
    } catch (err) {
      setToast({ open: true, type: "error", title: "Save failed", message: err.response?.data?.message || "Could not save vendor." });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteInventoryMasterRecord("vendors", deletingId);
      setToast({ open: true, type: "success", title: "Vendor deleted", message: "The vendor has been removed." });
      setDeletingId(null);
      await fetchVendors();
    } catch (err) {
      setToast({ open: true, type: "error", title: "Delete failed", message: err.response?.data?.message || "Could not delete vendor." });
      setDeletingId(null);
    }
  };

  const openAdd = () => {
    setEditingVendor(null);
    setShowForm(true);
  };

  const openEdit = (vendor) => {
    setEditingVendor(vendor);
    setShowForm(true);
  };

  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: c.paper, color: c.text, padding: "22px 22px 60px" }}>
      {/* ── top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/inventory/items")}
            className="flex items-center gap-2 rounded-lg bg-white/80 px-4 py-2 text-sm font-medium text-[#1C231F] shadow-sm ring-1 ring-[#E4E1D8] hover:bg-white hover:text-[#0B4F48] active:scale-[0.98] transition"
            title="Back to Items"
          >
            <FaArrowLeft className="text-base" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-white font-bold text-[18px]"
              style={{ background: c.tealDeep }}
            >
              <FaTruck />
            </div>
            <div>
              <h1 className="text-[21px] font-semibold m-0 leading-tight" style={{ letterSpacing: "0.2px" }}>
                Vendors
              </h1>
              <p className="m-0 text-[12px]" style={{ color: c.muted }}>
                Manage your suppliers and vendors
              </p>
            </div>
          </div>
        </div>
        <button type="button" onClick={openAdd} className={primaryBtn}>
          <FaPlus className="text-sm" /> Add Vendor
        </button>
      </div>

      {/* ── search ── */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F66] text-xs" />
          <input
            className={`${fieldCls} pl-9`}
            placeholder="Search vendors by name, phone, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── table ── */}
      <div className="bg-white border border-[#E4E1D8] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-[13px]">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Vendor Name</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Contact</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Phone</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Email</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">City</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">GSTIN</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Status</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 border-b border-[#E4E1D8] w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E1D8]">
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center text-[#6B6F66]">Loading vendors…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="text-center py-9 text-[#6B6F66]">
                      <b className="block text-[14.5px] text-[#1C231F] mb-1">No vendors found</b>
                      <span className="text-[13px]">Add your first vendor to start tracking suppliers.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-[#F6F5F1]/50 transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-[#1C231F]">{v.name || "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{v.contact || "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{v.phone || "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{v.email || "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{v.city || "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{v.gstin || "-"}</td>
                    <td className="py-2.5 pr-3"><span className={statusBadge(v.status)}>{v.status || "active"}</span></td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => openEdit(v)} className={rowActionBtn("neutral")}>
                          <FaEdit /> Edit
                        </button>
                        <button type="button" onClick={() => setDeletingId(v.id)} className={rowActionBtn("danger")}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── modals ── */}
      <VendorFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingVendor(null); }}
        onSave={handleSave}
        initial={editingVendor}
      />
      <ConfirmDelete
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        vendorName={vendors.find((v) => v.id === deletingId)?.name}
      />
      <Toast open={toast.open} type={toast.type} title={toast.title} message={toast.message} onClose={closeToast} />
    </div>
  );
};

export default InventoryVendorsPage;
