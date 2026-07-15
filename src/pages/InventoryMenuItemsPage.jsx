// src/pages/InventoryMenuItemsPage.jsx
// Menu Items — create/edit/delete with image upload
// Uses /api/restaurant/restaurant/menu (POST/PUT with multipart for image, GET for list)

import React, { useEffect, useMemo, useState } from "react";
import {
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes,
  FaCheckCircle, FaExclamationTriangle, FaUtensils,
} from "react-icons/fa";

import API, { getBackendBaseURL } from "../api";

const c = {
  paper: "#F6F5F1", line: "#E4E1D8", tealDeep: "#0B4F48",
  muted: "#6B6F66", text: "#1C231F", amber: "#C8791A", rose: "#B5442E",
};

const fieldCls = "w-full rounded-[9px] border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] font-medium text-[#1C231F] shadow-sm focus:border-[#0F6E64] focus:outline-none";
const labelCls = "mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B6F66]";
const primaryBtn = "inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold bg-[#0B4F48] text-white hover:bg-[#0F6E64] transition-all";
const ghostBtn = "inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold border border-[#E4E1D8] text-[#1C231F] hover:bg-[#F6F5F1] transition-all";
const dangerBtn = "inline-flex items-center justify-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold border border-[#E4E1D8] bg-[#F5DFDA] text-[#B5442E] hover:bg-[#F3D0C9] transition-all";

// Convert DB-stored "/uploads/foo.jpg" into a full URL pointing at the backend.
// DB may return null, a relative path ("/uploads/foo.jpg"), or an absolute URL.
const resolveImageUrl = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;          // already absolute
  const base = getBackendBaseURL();
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
};

const Modal = ({ open, onClose, title, subtitle, children, actions }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#132A2A]/45 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[580px] max-h-[88vh] overflow-y-auto rounded-[16px] bg-white p-5 sm:p-6 shadow-[0_30px_90px_rgba(19,42,42,0.28)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div><h3 className="text-[19px] font-bold text-[#132A2A] m-0">{title}</h3>{subtitle && <p className="text-[12.5px] text-[#6B6F66] mt-0.5">{subtitle}</p>}</div>
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
      <Icon className="text-lg shrink-0" /><div className="flex-1 min-w-0"><div className="text-[13px] font-bold">{title}</div><div className="text-[12px] opacity-80 truncate">{message}</div></div>
      <button onClick={onClose} className="shrink-0 rounded-full p-1 hover:bg-black/5"><FaTimes className="text-sm" /></button>
    </div>
  );
};

const ConfirmDelete = ({ open, onClose, onConfirm, name }) => (
  <Modal open={open} onClose={onClose} title="Delete menu item?" subtitle={`"${name || "this item"}" will be permanently removed.`}
    actions={<><button onClick={onClose} className={ghostBtn}>Cancel</button><button onClick={() => { onConfirm(); onClose(); }} className="bg-[#B5442E] text-white hover:bg-[#9a3a26] px-4 py-2.5 rounded-[9px] text-[13.5px] font-semibold">Delete</button></>}>
    <p className="text-[13.5px]">This cannot be undone. Any recipes linked to this item will be removed too.</p>
  </Modal>
);

const MenuItemFormModal = ({ open, onClose, onSave, initial, categories, saving }) => {
  const blank = { name: "", price: "", category: "Others", description: "", foodType: "Veg", status: "Available", tax: "5", imageFile: null, imagePreview: null };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name || "",
          price: String(initial.price ?? 0),
          category: initial.category || "Others",
          description: initial.description || "",
          foodType: initial.food_type || initial.foodType || "Veg",
          status: initial.status || "Available",
          tax: String(initial.tax ?? 5),
          imageFile: null,
          imagePreview: initial.image_url || null,
        });
      } else {
        setForm(blank);
      }
    }
  }, [open, initial]);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((p) => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file) }));
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit menu item" : "Add menu item"} subtitle={initial ? "Update item details and image" : "Add a new item to your menu with photo"}
      actions={<><button onClick={onClose} className={ghostBtn} disabled={saving}>Cancel</button><button onClick={handleSubmit} className={primaryBtn} disabled={saving}>{saving ? "Saving…" : (initial ? "Save changes" : "Add item")}</button></>}>
      <div className="grid grid-cols-1 gap-4">
        <div className="field"><label className={labelCls}>Item name *</label><input className={fieldCls} placeholder="e.g. Butter Chicken" value={form.name} onChange={(e) => setField("name", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="field"><label className={labelCls}>Price (₹) *</label><input type="number" className={fieldCls} placeholder="0" value={form.price} onChange={(e) => setField("price", e.target.value)} /></div>
          <div className="field"><label className={labelCls}>Category</label>
            <select className={fieldCls} value={form.category} onChange={(e) => setField("category", e.target.value)}>
              <option value="Others">Others</option>
              {categories.map((cat) => (<option key={cat.id} value={cat.name}>{cat.name}</option>))}
            </select>
          </div>
        </div>
        <div className="field"><label className={labelCls}>Description</label><textarea className={fieldCls} rows={2} placeholder="Short description…" value={form.description} onChange={(e) => setField("description", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="field"><label className={labelCls}>Food type</label>
            <select className={fieldCls} value={form.foodType} onChange={(e) => setField("foodType", e.target.value)}>
              <option value="Veg">Veg</option><option value="Non-Veg">Non-Veg</option><option value="Egg">Egg</option>
            </select>
          </div>
          <div className="field"><label className={labelCls}>Status</label>
            <select className={fieldCls} value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="Available">Available</option><option value="Unavailable">Unavailable</option>
            </select>
          </div>
        </div>
        <div className="field"><label className={labelCls}>Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} className="text-[13px] text-[#6B6F66]" />
          {(() => { const src = resolveImageUrl(form.imagePreview || initial?.image_url); return src ? <img src={src} alt="Preview" className="mt-3 h-[120px] w-auto rounded-[10px] border border-[#E4E1D8] object-cover" /> : null; })()}
        </div>
      </div>
    </Modal>
  );
};

const InventoryMenuItemsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await API.get("/restaurant/menu");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch { setItems([]); } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get("/inventory-masters/menu-categories");
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch { setCategories([]); }
  };

  useEffect(() => { fetchItems(); fetchCategories(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      const matchesSearch = !q || [m.name, m.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      const matchesCat = categoryFilter === "all" || String(m.category || "").toLowerCase() === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [items, search, categoryFilter]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    return Array.from(cats);
  }, [items]);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("price", formData.price || "0");
      fd.append("category", formData.category || "Others");
      fd.append("description", formData.description || "");
      fd.append("foodType", formData.foodType || "Veg");
      fd.append("status", formData.status || "Available");
      fd.append("tax", formData.tax || "5");
      if (formData.imageFile) {
        fd.append("image", formData.imageFile);
      } else if (!editingItem && formData.imagePreview) {
        // For new items, imagePreview is a blob: URL — send the original raw value (none yet)
        fd.append("imageUrl", "");
      } else if (editingItem?.image_url) {
        // Backend's updateMenuItem reads BOTH `imageUrl` (body) and `existingImageUrl`.
        // Sending `existingImageUrl` is the safe choice — it keeps the previous image
        // when the user edits without picking a new file.
        fd.append("existingImageUrl", editingItem.image_url);
      }

      if (editingItem) {
        await API.put(`/restaurant/menu/${editingItem.id}`, fd);
        setToast({ open: true, type: "success", title: "Updated", message: `${formData.name} updated.` });
      } else {
        await API.post("/restaurant/menu", fd);
        setToast({ open: true, type: "success", title: "Added", message: `${formData.name} added to menu.` });
      }
      setShowForm(false); setEditingItem(null); await fetchItems();
    } catch (err) {
      setToast({ open: true, type: "error", title: "Save failed", message: err.response?.data?.message || err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await API.delete(`/restaurant/menu/${deletingItem.id}`);
      setToast({ open: true, type: "success", title: "Deleted", message: "Item removed." });
      setDeletingItem(null); await fetchItems();
    } catch (err) {
      setToast({ open: true, type: "error", title: "Delete failed", message: err.response?.data?.message || "Could not delete." });
    }
  };

  const openAdd = () => { setEditingItem(null); setShowForm(true); };
  const openEdit = (item) => { setEditingItem(item); setShowForm(true); };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: c.paper, color: c.text, padding: "22px 22px 60px" }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-white text-[18px]" style={{ background: c.tealDeep }}><FaUtensils /></div>
            <div><h1 className="text-[21px] font-semibold m-0 leading-tight">Menu Items</h1><p className="m-0 text-[12px]" style={{ color: c.muted }}>Create menu items with photos — used in table bookings</p></div>
          </div>
        </div>
        <button type="button" onClick={openAdd} className={primaryBtn}><FaPlus className="text-sm" /> Add Menu Item</button>
      </div>
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F66] text-xs" /><input className={`${fieldCls} pl-9`} placeholder="Search menu items…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="w-[180px] rounded-[9px] border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] font-medium" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>{uniqueCategories.map((cat) => (<option key={cat} value={cat.toLowerCase()}>{cat}</option>))}
        </select>
      </div>
      <div className="bg-white border border-[#E4E1D8] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-[13px]">
            <thead><tr>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8] w-[60px]">Img</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Name</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Category</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Price (₹)</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Type</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Status</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 border-b border-[#E4E1D8] w-[90px]">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-[#E4E1D8]">
              {loading ? <tr><td colSpan={7} className="py-10 text-center text-[#6B6F66]">Loading…</td></tr> : filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="text-center py-9 text-[#6B6F66]"><b className="block text-[14.5px] text-[#1C231F] mb-1">No menu items</b><span className="text-[13px]">Add your first item with a photo.</span></div></td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#F6F5F1]/50 transition-colors">
                  <td className="py-2.5 pr-3">
                    {resolveImageUrl(item.image_url) ? (
                      <img src={resolveImageUrl(item.image_url)} alt={item.name} className="h-[40px] w-[40px] rounded-lg object-cover border border-[#E4E1D8]" />
                    ) : (
                      <div className="h-[40px] w-[40px] rounded-lg bg-[#F6F5F1] border border-[#E4E1D8] flex items-center justify-center text-[#6B6F66] text-xs">No img</div>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold text-[#1C231F]">{item.name || "-"}</td>
                  <td className="py-2.5 pr-3 text-[#1C231F]">{item.category || "-"}</td>
                  <td className="py-2.5 pr-3 text-[#1C231F]">{item.price ? Number(item.price).toFixed(2) : "-"}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${item.food_type === "Veg" ? "bg-[#E4F0EE] text-[#0B4F48]" : item.food_type === "Non-Veg" ? "bg-[#F5DFDA] text-[#B5442E]" : "bg-[#F3E9DD] text-[#C8791A]"}`}>
                      {item.food_type || "Veg"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${item.availability_status === "Available" || item.status === "Available" ? "bg-[#E4F0EE] text-[#0B4F48]" : "bg-[#F3E9DD] text-[#C8791A]"}`}>
                      {item.availability_status || item.status || "Available"}
                    </span>
                  </td>
                  <td className="py-2.5"><div className="flex gap-1.5">
                    <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="border border-[#E4E1D8] bg-[#E4F0EE] text-[#0B4F48] hover:bg-[#CFE7E2] px-2.5 py-1.5 rounded-[9px] text-[12px] font-semibold transition-all"><FaEdit /></button>
                    <button onClick={() => { setDeletingItem(item); }} className={dangerBtn}><FaTrash /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <MenuItemFormModal open={showForm} onClose={() => { setShowForm(false); setEditingItem(null); }} onSave={handleSave} initial={editingItem} categories={categories} saving={saving} />
      <ConfirmDelete open={!!deletingItem} onClose={() => setDeletingItem(null)} onConfirm={handleDelete} name={deletingItem?.name} />
      <Toast open={toast.open} type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
};

export default InventoryMenuItemsPage;
