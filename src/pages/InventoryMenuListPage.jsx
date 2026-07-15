// src/pages/InventoryMenuListPage.jsx
// Read-only menu list view, grouped by category with toggle for availability
// Used by kitchen, waiters, and at table bookings

import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch, FaTimes, FaCheckCircle, FaExclamationTriangle,
  FaClipboardList, FaPrint, FaUtensils, FaLeaf, FaDrumstickBite, FaEgg,
} from "react-icons/fa";

import API from "../api";

const c = {
  paper: "#F6F5F1", line: "#E4E1D8", tealDeep: "#0B4F48",
  muted: "#6B6F66", text: "#1C231F",
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

const FoodTypeIcon = ({ type, size = 12 }) => {
  if (type === "Non-Veg") return <FaDrumstickBite style={{ color: "#B5442E", fontSize: size }} title="Non-Veg" />;
  if (type === "Egg") return <FaEgg style={{ color: "#C8791A", fontSize: size }} title="Egg" />;
  return <FaLeaf style={{ color: "#0B4F48", fontSize: size }} title="Veg" />;
};

const InventoryMenuListPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [foodTypeFilter, setFoodTypeFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await API.get("/restaurant/menu");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setToast({ open: true, type: "error", title: "Failed to load", message: "Could not fetch menu." });
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      const matchesSearch = !q || [m.name, m.category, m.description].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      const matchesCat = categoryFilter === "all" || String(m.category || "").toLowerCase() === categoryFilter;
      const food = m.food_type || m.foodType || "Veg";
      const matchesFoodType = foodTypeFilter === "all" || food === foodTypeFilter;
      const status = m.availability_status || m.status || "Available";
      const matchesAvail = availabilityFilter === "all" || status === availabilityFilter;
      return matchesSearch && matchesCat && matchesFoodType && matchesAvail;
    });
  }, [items, search, categoryFilter, foodTypeFilter, availabilityFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((item) => {
      const key = item.category || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const uniqueCategories = useMemo(() => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(), [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const available = items.filter((i) => (i.availability_status || i.status || "Available") === "Available").length;
    const veg = items.filter((i) => (i.food_type || "Veg") === "Veg").length;
    const nonVeg = items.filter((i) => (i.food_type || "") === "Non-Veg").length;
    return { total, available, unavailable: total - available, veg, nonVeg };
  }, [items]);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: c.paper, color: c.text, padding: "22px 22px 60px" }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-white text-[18px]" style={{ background: c.tealDeep }}><FaClipboardList /></div>
          <div><h1 className="text-[21px] font-semibold m-0 leading-tight">Menu List</h1><p className="m-0 text-[12px]" style={{ color: c.muted }}>Always-available view of every menu item</p></div>
        </div>
        <button onClick={handlePrint} className="inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold border border-[#E4E1D8] text-[#1C231F] hover:bg-[#F6F5F1] transition-all">
          <FaPrint className="text-sm" /> Print
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Items", value: stats.total, color: c.tealDeep },
          { label: "Available", value: stats.available, color: "#0B4F48" },
          { label: "Veg", value: stats.veg, color: "#0F6E64" },
          { label: "Non-Veg", value: stats.nonVeg, color: "#B5442E" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#E4E1D8] rounded-[12px] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] mb-1">{s.label}</div>
            <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2.5 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F66] text-xs" />
          <input className="w-full rounded-[9px] border border-[#E4E1D8] bg-white pl-9 pr-3 py-2.5 text-[13.5px] font-medium focus:border-[#0F6E64] focus:outline-none" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="w-[160px] rounded-[9px] border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] font-medium" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {uniqueCategories.map((cat) => (<option key={cat} value={cat.toLowerCase()}>{cat}</option>))}
        </select>
        <select className="w-[140px] rounded-[9px] border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] font-medium" value={foodTypeFilter} onChange={(e) => setFoodTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          <option value="Veg">Veg</option>
          <option value="Non-Veg">Non-Veg</option>
          <option value="Egg">Egg</option>
        </select>
        <select className="w-[160px] rounded-[9px] border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] font-medium" value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="Available">Available</option>
          <option value="Unavailable">Unavailable</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#6B6F66]">Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-[#E4E1D8] rounded-[14px] p-12 text-center">
          <FaUtensils className="text-[36px] mx-auto mb-3 text-[#6B6F66]" />
          <b className="block text-[16px] text-[#1C231F] mb-1">No items match</b>
          <span className="text-[13px] text-[#6B6F66]">Try changing the filters or add new menu items.</span>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([category, list]) => (
            <div key={category} className="bg-white border border-[#E4E1D8] rounded-[14px] overflow-hidden shadow-sm">
              <div className="px-4 sm:px-5 py-3 border-b border-[#E4E1D8] flex items-center justify-between bg-[#F6F5F1]/40">
                <div>
                  <h2 className="text-[15px] font-bold m-0 text-[#132A2A]">{category}</h2>
                  <p className="m-0 text-[11.5px] text-[#6B6F66]">{list.length} item{list.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-[13px]">
                  <thead>
                    <tr>
                      <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8] w-[60px]">Img</th>
                      <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Item</th>
                      <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Type</th>
                      <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Price</th>
                      <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 pr-4 border-b border-[#E4E1D8]">Tax</th>
                      <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] py-2.5 border-b border-[#E4E1D8]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E1D8]">
                    {list.map((item) => {
                      const status = item.availability_status || item.status || "Available";
                      return (
                        <tr key={item.id} className="hover:bg-[#F6F5F1]/50 transition-colors">
                          <td className="py-2.5 pr-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="h-[40px] w-[40px] rounded-lg object-cover border border-[#E4E1D8]" />
                            ) : (
                              <div className="h-[40px] w-[40px] rounded-lg bg-[#F6F5F1] border border-[#E4E1D8] flex items-center justify-center text-[#6B6F66] text-xs">—</div>
                            )}
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="font-semibold text-[#1C231F]">{item.name}</div>
                            {item.description && <div className="text-[11.5px] text-[#6B6F66] mt-0.5 line-clamp-1">{item.description}</div>}
                          </td>
                          <td className="py-2.5 pr-3"><FoodTypeIcon type={item.food_type} /></td>
                          <td className="py-2.5 pr-3 font-semibold text-[#1C231F]">₹{Number(item.price || 0).toFixed(2)}</td>
                          <td className="py-2.5 pr-3 text-[#6B6F66]">{Number(item.tax || 0)}%</td>
                          <td className="py-2.5">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${status === "Available" ? "bg-[#E4F0EE] text-[#0B4F48]" : "bg-[#F3E9DD] text-[#C8791A]"}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast open={toast.open} type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
};

export default InventoryMenuListPage;
