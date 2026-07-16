// src/pages/InventoryStockCategoriesPage.jsx
// Stock categories + subcategories management — fetches from /api/inventory-masters/stock-categories

import React, { useEffect, useMemo, useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaListAlt,
} from "react-icons/fa";

import {
  createInventoryMasterRecord,
  deleteInventoryMasterRecord,
  fetchInventoryMasterRecords,
  updateInventoryMasterRecord,
} from "../services/inventoryMastersService";

const c = {
  paper: "#F6F5F1",
  line: "#E4E1D8",
  tealDeep: "#0B4F48",
  muted: "#6B6F66",
  text: "#1C231F",
};

const fieldCls = "w-full rounded-[9px] border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] font-medium text-[#1C231F] shadow-sm focus:border-[#0F6E64] focus:outline-none focus:ring-2 focus:ring-[#0F6E64]/10";
const labelCls = "mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B6F66]";
const primaryBtn = "inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold bg-[#0B4F48] text-white hover:bg-[#0F6E64] transition-all";
const ghostBtn = "inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold border border-[#E4E1D8] text-[#1C231F] hover:bg-[#F6F5F1] transition-all";
const dangerBtn = "inline-flex items-center justify-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold border border-[#E4E1D8] bg-[#F5DFDA] text-[#B5442E] hover:bg-[#F3D0C9] transition-all";
const editBtn = "border border-[#E4E1D8] bg-[#E4F0EE] text-[#0B4F48] hover:bg-[#CFE7E2] px-2.5 py-1.5 rounded-[9px] text-[12px] font-semibold transition-all";

const Modal = ({ open, onClose, title, subtitle, children, actions }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#132A2A]/45 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto rounded-[16px] bg-white p-5 sm:p-6 shadow-[0_30px_90px_rgba(19,42,42,0.28)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[19px] font-bold text-[#132A2A] m-0">{title}</h3>
            {subtitle && <p className="text-[12.5px] text-[#6B6F66] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-1.5 text-[#6B6F66] hover:bg-[#F6F5F1]" type="button"><FaTimes className="text-lg" /></button>
        </div>
        <div className="text-[13.5px]">{children}</div>
        {actions && <div className="mt-5 flex flex-wrap justify-end gap-2.5">{actions}</div>}
      </div>
    </div>
  );
};

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
      <button onClick={onClose} className="shrink-0 rounded-full p-1 hover:bg-black/5"><FaTimes className="text-sm" /></button>
    </div>
  );
};

const ConfirmDelete = ({ open, onClose, onConfirm, name }) => (
  <Modal open={open} onClose={onClose} title="Delete category?" subtitle={`"${name || "this category"}" will be removed.`}
    actions={<><button onClick={onClose} className={ghostBtn}>Cancel</button><button onClick={() => { onConfirm(); onClose(); }} className="bg-[#B5442E] text-white hover:bg-[#9a3a26] px-4 py-2.5 rounded-[9px] text-[13.5px] font-semibold">Delete</button></>}>
    <p className="text-[13.5px]">Are you sure? Items using this category may become uncategorized.</p>
  </Modal>
);

const CategoryFormModal = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState({ name: "", subcategory: "", status: "Active" });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name || "",
          subcategory: initial.subcategory || "",
          status: initial.status || "Active",
        });
      } else {
        setForm({ name: "", subcategory: "", status: "Active" });
      }
    }
  }, [open, initial]);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));
  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      subcategory: form.subcategory.trim() || null,
      status: form.status,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit category" : "Add category"} subtitle={initial ? "Update category and subcategory" : "Create a new item category"}
      actions={<><button onClick={onClose} className={ghostBtn}>Cancel</button><button onClick={handleSubmit} className={primaryBtn}>{initial ? "Save" : "Add category"}</button></>}>
      <div className="grid grid-cols-1 gap-4">
        <div className="field">
          <label className={labelCls}>Main category *</label>
          <input className={fieldCls} placeholder="e.g. Vegetables, Dairy, Spices" value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Subcategory</label>
          <input className={fieldCls} placeholder="e.g. Root, Leafy, Organic (optional)" value={form.subcategory} onChange={(e) => setField("subcategory", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Status</label>
          <select className={fieldCls} value={form.status} onChange={(e) => setField("status", e.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
    </Modal>
  );
};

const InventoryStockCategoriesPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryMasterRecords("stock-categories");
      setRecords(Array.isArray(res) ? res : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      [r.name, r.subcategory].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [records, search]);

  const handleSave = async (formData) => {
    try {
      if (editingRecord) {
        await updateInventoryMasterRecord("stock-categories", editingRecord.id, formData);
        setToast({ open: true, type: "success", title: "Updated", message: `${formData.name} updated.` });
      } else {
        await createInventoryMasterRecord("stock-categories", formData);
        setToast({ open: true, type: "success", title: "Added", message: `${formData.name} added.` });
      }
      setShowForm(false);
      setEditingRecord(null);
      await fetchRecords();
    } catch (err) {
      setToast({ open: true, type: "error", title: "Save failed", message: err.response?.data?.message || "Could not save." });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteInventoryMasterRecord("stock-categories", deletingId);
      setToast({ open: true, type: "success", title: "Deleted", message: "Category removed." });
      setDeletingId(null);
      await fetchRecords();
    } catch (err) {
      setToast({ open: true, type: "error", title: "Delete failed", message: err.response?.data?.message || "Could not delete." });
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: c.paper, color: c.text, padding: "22px 22px 60px" }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-white text-[18px]" style={{ background: c.tealDeep }}><FaListAlt /></div>
            <div>
              <h1 className="text-[21px] font-semibold m-0 leading-tight">Item Categories &amp; Subcategories</h1>
              <p className="m-0 text-[12px]" style={{ color: c.muted }}>Manage categories and subcategories for items &amp; stock</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => { setEditingRecord(null); setShowForm(true); }} className={primaryBtn}><FaPlus className="text-sm" /> Add Category</button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F66] text-xs" />
          <input className={`${fieldCls} pl-9`} placeholder="Search categories or subcategories…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white border border-[#E4E1D8] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-[13px]">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Category</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Subcategory</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 border-b border-[#E4E1D8] w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E1D8]">
              {loading ? (
                <tr><td colSpan={3} className="py-10 text-center text-[#6B6F66]">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3}><div className="text-center py-9 text-[#6B6F66]"><b className="block text-[14.5px] text-[#1C231F] mb-1">No categories</b><span className="text-[13px]">Add your first category.</span></div></td></tr>
              ) : (
                filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#F6F5F1]/50 transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-[#1C231F]">{rec.name || "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{rec.subcategory || <span style={{ color: c.muted }}>—</span>}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditingRecord(rec); setShowForm(true); }} className={editBtn}><FaEdit /></button>
                        <button onClick={() => setDeletingId(rec.id)} className={dangerBtn}><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CategoryFormModal open={showForm} onClose={() => { setShowForm(false); setEditingRecord(null); }} onSave={handleSave} initial={editingRecord} />
      <ConfirmDelete open={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete} name={records.find((r) => r.id === deletingId)?.name} />
      <Toast open={toast.open} type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
};

export default InventoryStockCategoriesPage;
