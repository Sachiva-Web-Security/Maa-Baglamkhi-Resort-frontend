// src/pages/InventoryItemsPage.jsx
// Items & Stock list — fetches from /api/inventory
// Add / Edit via modal; page is the default landing for /inventory.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaEye,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaWarehouse,
  FaArrowLeft,
} from "react-icons/fa";

import API, { getBackendBaseURL } from "../api";

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

const InventoryItemsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Master data for form dropdowns
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [stores, setStores] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await API.get("/inventory");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [catRes, unitRes, storeRes] = await Promise.all([
        API.get("/inventory-masters/item-groups").catch(() => ({ data: [] })),
        API.get("/inventory-masters/units").catch(() => ({ data: [] })),
        API.get("/inventory-masters/locations").catch(() => ({ data: [] })),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setUnits(Array.isArray(unitRes.data) ? unitRes.data : []);
      setStores(Array.isArray(storeRes.data) ? storeRes.data : []);
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchItems();
    fetchMasters();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((s) => {
      const matchesSearch = !q || [s.name, s.category, s.unit]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
      const matchesCategory = categoryFilter === "all" || String(s.category || "").toLowerCase() === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    return Array.from(cats);
  }, [items]);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editingItem) {
        await API.put(`/inventory/${editingItem.id}`, formData);
        setToast({ open: true, type: "success", title: "Item updated", message: `${formData.name} has been updated.` });
      } else {
        await API.post("/inventory", formData);
        setToast({ open: true, type: "success", title: "Item added", message: `${formData.name} has been added to stock.` });
      }
      setShowForm(false);
      setEditingItem(null);
      await fetchItems();
    } catch (err) {
      setToast({ open: true, type: "error", title: "Save failed", message: err.response?.data?.message || "Could not save item." });
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  const stockLow = (item) => {
    const reorder = Number(item.reorder_point || 5);
    return Number(item.stock || 0) <= reorder;
  };

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
              <FaWarehouse />
            </div>
            <div>
              <h1 className="text-[21px] font-semibold m-0 leading-tight" style={{ letterSpacing: "0.2px" }}>
                Items &amp; Stock
              </h1>
              <p className="m-0 text-[12px]" style={{ color: c.muted }}>
                All inventory items across stores and kitchens
              </p>
            </div>
          </div>
        </div>
        <button type="button" onClick={openAdd} className={primaryBtn}>
          <FaPlus className="text-sm" /> Add Item
        </button>
      </div>

      {/* ── search + filter ── */}
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F66] text-xs" />
          <input
            className={`${fieldCls} pl-9`}
            placeholder="Search items by name, category, unit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="w-[180px] rounded-[9px] border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] font-medium text-[#1C231F]"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat.toLowerCase()}>{cat}</option>
          ))}
        </select>
      </div>

      {/* ── table ── */}
      <div className="bg-white border border-[#E4E1D8] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-[13px]">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Item Name</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Category</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Stock</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Reorder Level</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Unit</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Price (₹)</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Expiry</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Store</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 border-b border-[#E4E1D8] w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E1D8]">
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-[#6B6F66]">Loading items…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="text-center py-9 text-[#6B6F66]">
                      <b className="block text-[14.5px] text-[#1C231F] mb-1">No items in stock</b>
                      <span className="text-[13px]">Add your first item to start tracking inventory.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F6F5F1]/50 transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-[#1C231F]">{item.name || "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{item.category || "-"}</td>
                    <td className="py-2.5 pr-3">
                      <span className={stockLow(item) ? "text-[#C8791A] font-semibold" : "text-[#1C231F]"}>
                        {Number(item.stock || 0)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{item.reorder_point ?? 5}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{item.unit || "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{item.price ? Number(item.price).toFixed(2) : "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{item.expiry ? String(item.expiry).slice(0, 10) : "-"}</td>
                    <td className="py-2.5 pr-3 text-[#1C231F]">{item.branch || "-"}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => openEdit(item)} className={rowActionBtn("primary")}>
                          <FaEdit /> Edit
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

      {/* ── Item form modal ── */}
      <ItemFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingItem(null); }}
        onSave={handleSave}
        initial={editingItem}
        categories={categories}
        units={units}
        stores={stores}
        saving={saving}
      />
      <Toast open={toast.open} type={toast.type} title={toast.title} message={toast.message} onClose={closeToast} />
    </div>
  );
};

/* ── Item Form Modal ── */
const ItemFormModal = ({ open, onClose, onSave, initial, categories, units, stores, saving }) => {
  const [form, setForm] = useState({
    name: "",
    category: "",
    stock: "",
    unit: "",
    price: "",
    reorder_point: "5",
    expiry: "",
    branch: "",
  });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name || "",
          category: initial.category || "",
          stock: String(initial.stock ?? 0),
          unit: initial.unit || "",
          price: String(initial.price ?? 0),
          reorder_point: String(initial.reorder_point ?? 5),
          expiry: initial.expiry ? String(initial.expiry).slice(0, 10) : "",
          branch: initial.branch || "",
        });
      } else {
        setForm({ name: "", category: "", stock: "", unit: "", price: "", reorder_point: "5", expiry: "", branch: "" });
      }
    }
  }, [open, initial]);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      stock: Number(form.stock) || 0,
      price: Number(form.price) || 0,
      reorder_point: Number(form.reorder_point) || 5,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit item" : "Add item"}
      subtitle={initial ? "Update item details" : "Add a new item to your inventory"}
      actions={
        <>
          <button type="button" onClick={onClose} className={ghostBtn} disabled={saving}>Cancel</button>
          <button type="button" onClick={handleSubmit} className={primaryBtn} disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Add item"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="field sm:col-span-2">
          <label className={labelCls}>Item name *</label>
          <input className={fieldCls} placeholder="e.g. Onion" value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Category</label>
          <select className={fieldCls} value={form.category} onChange={(e) => setField("category", e.target.value)}>
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className={labelCls}>Unit</label>
          <select className={fieldCls} value={form.unit} onChange={(e) => setField("unit", e.target.value)}>
            <option value="">Select unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.name}>{u.name} ({u.short_name || u.shortName || ""})</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className={labelCls}>Initial stock</label>
          <input type="number" className={fieldCls} placeholder="0" value={form.stock} onChange={(e) => setField("stock", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Reorder level</label>
          <input type="number" className={fieldCls} placeholder="5" value={form.reorder_point} onChange={(e) => setField("reorder_point", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Price per unit (₹)</label>
          <input type="number" className={fieldCls} placeholder="0.00" value={form.price} onChange={(e) => setField("price", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Expiry date</label>
          <input type="date" className={fieldCls} value={form.expiry} onChange={(e) => setField("expiry", e.target.value)} />
        </div>
        <div className="field">
          <label className={labelCls}>Store / Kitchen</label>
          <select className={fieldCls} value={form.branch} onChange={(e) => setField("branch", e.target.value)}>
            <option value="">Select store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
};

export default InventoryItemsPage;
