// src/pages/InventoryHubPage.jsx
// Main inventory landing page at /inventory
// Shows overview stats and quick access cards to all sub-sections

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBoxes, FaListAlt, FaTruck, FaBalanceScale,
  FaWarehouse, FaUtensils, FaClipboardList, FaShoppingCart,
  FaChartBar, FaPlus, FaSearch, FaExclamationTriangle,
  FaCheckCircle, FaArrowRight, FaBell,
} from "react-icons/fa";

import API from "../api";

const c = {
  paper: "#F6F5F1", line: "#E4E1D8", tealDeep: "#0B4F48", tealMid: "#0F6E64",
  muted: "#6B6F66", text: "#1C231F", rose: "#B5442E", amber: "#C8791A",
};

const sectionCards = [
  { name: "Categories", path: "/inventory/categories", icon: FaListAlt, color: "#0B4F48", desc: "Organize items into groups" },
  { name: "Vendors", path: "/inventory/vendors", icon: FaTruck, color: "#0F6E64", desc: "Manage supplier contacts" },
  { name: "Units", path: "/inventory/units", icon: FaBalanceScale, color: "#1E7A6E", desc: "kg, ltr, pcs, metres" },
  { name: "Items / Stock", path: "/inventory/items", icon: FaWarehouse, color: "#0B4F48", desc: "Track stock levels" },
  { name: "Menu Items", path: "/inventory/menu-items", icon: FaUtensils, color: "#C8791A", desc: "Food & drink with photos" },
  { name: "Menu List", path: "/inventory/menu-list", icon: FaClipboardList, color: "#8B5E1A", desc: "Kitchen/wait staff view" },
  { name: "Purchase Invoices", path: "/inventory/purchases", icon: FaShoppingCart, color: "#0F6E64", desc: "Orders from vendors" },
  { name: "Reports", path: "/inventory/reports", icon: FaChartBar, color: "#132A2A", desc: "Stock & spend analytics" },
];

const InventoryHubPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ items: 0, vendors: 0, categories: 0, units: 0, purchases: 0, menuItems: 0 });
  const [lowStock, setLowStock] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [itemsRes, vendorsRes, catsRes, unitsRes, purchasesRes] = await Promise.allSettled([
          API.get("/inventory").catch(() => ({ data: [] })),
          API.get("/inventory-masters/vendors").catch(() => ({ data: [] })),
          API.get("/inventory-masters/menu-categories").catch(() => ({ data: [] })),
          API.get("/inventory-masters/units").catch(() => ({ data: [] })),
          API.get("/inventory/purchase-orders").catch(() => ({ data: [] })),
        ]);

        const items = itemsRes.status === "fulfilled" ? (itemsRes.value.data || []) : [];
        const vendors = vendorsRes.status === "fulfilled" ? (vendorsRes.value.data || []) : [];
        const cats = catsRes.status === "fulfilled" ? (catsRes.value.data || []) : [];
        const units = unitsRes.status === "fulfilled" ? (unitsRes.value.data || []) : [];
        const purchases = purchasesRes.status === "fulfilled" ? (purchasesRes.value.data || []) : [];

        setStats({
          items: items.length,
          vendors: vendors.length,
          categories: cats.length,
          units: units.length,
          purchases: purchases.length,
          menuItems: 0,
        });

        // Low stock = items where stock_qty < min_stock_level (if available) or stock_qty < 5
        const low = items
          .filter((i) => {
            const qty = Number(i.stock_qty ?? i.stockQty ?? i.quantity ?? 0);
            const min = Number(i.min_stock_level ?? i.minStockLevel ?? 5);
            return qty < min;
          })
          .slice(0, 5);
        setLowStock(low);

        // Recent purchases sorted by date desc
        const sorted = [...purchases].sort((a, b) => {
          const da = new Date(a.created_at || a.purchase_date || 0);
          const db = new Date(b.created_at || b.purchase_date || 0);
          return db - da;
        });
        setRecentPurchases(sorted.slice(0, 5));
      } catch {
        // silently fail — individual sections show empty states
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sectionCards;
    return sectionCards.filter((s) => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
  }, [search]);

  const statCards = [
    { label: "Items / Stock", value: stats.items, color: c.tealDeep, path: "/inventory/items" },
    { label: "Vendors", value: stats.vendors, color: "#0F6E64", path: "/inventory/vendors" },
    { label: "Categories", value: stats.categories, color: "#1E7A6E", path: "/inventory/categories" },
    { label: "Units", value: stats.units, color: "#0B4F48", path: "/inventory/units" },
    { label: "Purchases", value: stats.purchases, color: "#132A2A", path: "/inventory/purchases" },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: c.paper, color: c.text, padding: "22px 22px 60px" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white text-[22px]" style={{ background: c.tealDeep }}><FaBoxes /></div>
          <div>
            <h1 className="text-[24px] font-semibold m-0 leading-tight">Inventory</h1>
            <p className="m-0 text-[12.5px]" style={{ color: c.muted }}>Manage stock, vendors, purchases, and menu</p>
          </div>
        </div>
        <div className="relative max-w-xs w-full sm:w-auto">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F66] text-xs" />
          <input
            className="w-full rounded-[9px] border border-[#E4E1D8] bg-white pl-9 pr-3 py-2.5 text-[13.5px] font-medium focus:border-[#0F6E64] focus:outline-none"
            placeholder="Quick search sections…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Quick stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {statCards.map((s) => (
          <button key={s.label} onClick={() => navigate(s.path)} className="bg-white border border-[#E4E1D8] rounded-[12px] p-4 text-left hover:shadow-md transition-all group">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] mb-1">{s.label}</div>
            <div className="text-[26px] font-bold leading-none mb-1" style={{ color: s.color }}>{loading ? "…" : s.value}</div>
            <div className="text-[11px] text-[#6B6F66] group-hover:text-[#0F6E64] transition-colors inline-flex items-center gap-1">
              View <FaArrowRight className="text-[10px]" />
            </div>
          </button>
        ))}
      </div>

      {/* Section cards */}
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#6B6F66] mb-3">All sections</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {filteredCards.map((sec) => {
          const Icon = sec.icon;
          return (
            <button key={sec.path} onClick={() => navigate(sec.path)} className="bg-white border border-[#E4E1D8] rounded-[12px] p-4 text-left hover:shadow-md transition-all group flex items-start gap-3">
              <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-white text-[16px] shrink-0" style={{ background: sec.color }}><Icon /></div>
              <div className="min-w-0">
                <div className="text-[14px] font-bold m-0 leading-tight group-hover:text-[#0F6E64] transition-colors">{sec.name}</div>
                <div className="text-[11.5px] text-[#6B6F66] mt-0.5">{sec.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low stock */}
        <div className="bg-white border border-[#E4E1D8] rounded-[14px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <FaBell className="text-[#C8791A]" />
            <h3 className="text-[14px] font-bold m-0">Low stock alerts</h3>
          </div>
          {lowStock.length === 0 ? (
            <div className="text-[13px] text-[#6B6F66] py-3 flex items-center gap-2"><FaCheckCircle className="text-[#0B4F48]" /> All items in stock.</div>
          ) : (
            <div className="divide-y divide-[#E4E1D8]">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-[13px] font-semibold text-[#1C231F]">{item.name || item.item_name || "-"}</div>
                    <div className="text-[11px] text-[#6B6F66]">{item.category || ""}</div>
                  </div>
                  <div className="text-[12px] font-semibold text-[#B5442E]">
                    {Number(item.stock_qty ?? item.stockQty ?? item.quantity ?? 0)} left
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent purchases */}
        <div className="bg-white border border-[#E4E1D8] rounded-[14px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <FaShoppingCart className="text-[#0F6E64]" />
            <h3 className="text-[14px] font-bold m-0">Recent purchases</h3>
          </div>
          {recentPurchases.length === 0 ? (
            <div className="text-[13px] text-[#6B6F66] py-3">No purchases yet.</div>
          ) : (
            <div className="divide-y divide-[#E4E1D8]">
              {recentPurchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-[13px] font-semibold text-[#1C231F]">{p.invoice_no || p.invoiceNumber || `#${p.id}`}</div>
                    <div className="text-[11px] text-[#6B6F66]">{p.vendor_name || p.vendor || "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-[#1C231F]">₹{Number(p.total_amount ?? p.total ?? 0).toFixed(2)}</div>
                    <div className="text-[11px] text-[#6B6F66]">{p.purchase_date || p.created_at ? new Date(p.purchase_date || p.created_at).toLocaleDateString() : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryHubPage;
