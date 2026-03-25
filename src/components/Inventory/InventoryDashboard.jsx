import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FaBalanceScale, FaBoxes, FaClipboardList, FaExchangeAlt,
  FaFilter, FaFire, FaLayerGroup, FaListAlt, FaPlus, FaSearch,
  FaStore, FaTimes, FaTruck, FaUtensils, FaWarehouse, FaExclamationTriangle,
  FaCheckCircle, FaTrash, FaEdit, FaShoppingCart, FaFlask, FaChartBar,
  FaArrowRight, FaBell, FaCalendarAlt,
} from "react-icons/fa";
import API from "../../api";

// ─── Constants ───────────────────────────────────────────────────────────────

const INVENTORY_SECTIONS = [
  { id: "items",              label: "Items",               icon: FaWarehouse,    type: "items" },
  { id: "segments",           label: "Segments",            icon: FaLayerGroup,   type: "master" },
  { id: "vendors",            label: "Vendors",             icon: FaTruck,        type: "master" },
  { id: "units",              label: "Units",               icon: FaBalanceScale, type: "master" },
  { id: "unit-conversion",    label: "Unit Conversion",     icon: FaExchangeAlt,  type: "master" },
  { id: "store-kitchen",      label: "Store / Kitchen",     icon: FaStore,        type: "master" },
  { id: "item-groups",        label: "Item Groups",         icon: FaBoxes,        type: "master" },
  { id: "gravies",            label: "Gravies",             icon: FaUtensils,     type: "master" },
  { id: "ingredients",        label: "Ingredients",         icon: FaFire,         type: "master" },
  { id: "purchase-items",     label: "Purchase Items",      icon: FaShoppingCart, type: "master" },
  { id: "purchase-services",  label: "Purchase Services",   icon: FaClipboardList,type: "master" },
  { id: "purchase-orders",    label: "Purchase Orders",     icon: FaClipboardList,type: "po" },
  { id: "stock-transfer",     label: "Stock Transfer",      icon: FaExchangeAlt,  type: "master" },
  { id: "waste-log",          label: "Waste / Spoilage",    icon: FaTrash,        type: "waste" },
  { id: "stock-audit",        label: "Stock Audit",         icon: FaCheckCircle,  type: "audit" },
  { id: "vendor-report",      label: "Vendor Report",       icon: FaListAlt,      type: "report" },
  { id: "stock-report",       label: "Stock Report",        icon: FaChartBar,     type: "report" },
  { id: "closing-stock-report",label:"Closing Stock Report",icon: FaListAlt,      type: "report" },
  { id: "item-report",        label: "Item Report",         icon: FaListAlt,      type: "report" },
  { id: "item-consumption-report",label:"Consumption Report",icon:FaFlask,        type: "report" },
  { id: "total-consumption-report",label:"Total Consumption",icon:FaListAlt,      type: "report" },
  { id: "item-audit",         label: "Item Audit Report",   icon: FaListAlt,      type: "report" },
];

const STORAGE_KEYS = {
  segments: "inventory_segments",
  vendors: "inventory_vendors",
  units: "inventory_units",
  "unit-conversion": "inventory_unit_conversion",
  "store-kitchen": "inventory_store_kitchen",
  "item-groups": "inventory_item_groups",
  gravies: "inventory_gravies",
  ingredients: "inventory_ingredients",
  "purchase-items": "inventory_purchase_items",
  "purchase-services": "inventory_purchase_services",
  "stock-transfer": "inventory_stock_transfer",
  "purchase-orders": "inventory_purchase_orders",
  "waste-log": "inventory_waste_log",
};

const MASTER_FIELDS = {
  segments: [
    { key: "name", label: "Segment Name", type: "text", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
  ],
  vendors: [
    { key: "name", label: "Vendor Name", type: "text", required: true },
    { key: "contact", label: "Contact Person", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "gstin", label: "GSTIN", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["Active", "On Hold", "Blacklisted"] },
  ],
  units: [
    { key: "name", label: "Unit Name", type: "text", required: true },
    { key: "shortName", label: "Short Name", type: "text", required: true },
    { key: "type", label: "Type", type: "select", options: ["Weight", "Volume", "Count"] },
  ],
  "unit-conversion": [
    { key: "fromUnit", label: "From Unit", type: "text", required: true },
    { key: "toUnit", label: "To Unit", type: "text", required: true },
    { key: "factor", label: "Conversion Factor", type: "number", required: true },
    { key: "notes", label: "Notes", type: "text" },
  ],
  "store-kitchen": [
    { key: "name", label: "Store Name", type: "text", required: true },
    { key: "type", label: "Type", type: "select", options: ["Store", "Kitchen", "Bar", "Banquet"] },
    { key: "manager", label: "Manager", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["Open", "Closed"] },
  ],
  "item-groups": [
    { key: "name", label: "Group Name", type: "text", required: true },
    { key: "segment", label: "Segment", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
  ],
  gravies: [
    { key: "name", label: "Gravy Name", type: "text", required: true },
    { key: "base", label: "Base", type: "text" },
    { key: "spiceLevel", label: "Spice Level", type: "select", options: ["Low", "Medium", "High"] },
  ],
  ingredients: [
    { key: "name", label: "Ingredient Name", type: "text", required: true },
    { key: "group", label: "Group", type: "text" },
    { key: "unit", label: "Unit", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
  ],
  "purchase-items": [
    { key: "itemName", label: "Item Name", type: "text", required: true },
    { key: "vendor", label: "Vendor", type: "text", required: true },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "unit", label: "Unit", type: "text" },
    { key: "ratePerUnit", label: "Rate / Unit (₹)", type: "number" },
    { key: "amount", label: "Total Amount (₹)", type: "number", required: true },
    { key: "invoiceNo", label: "Invoice No", type: "text" },
    { key: "date", label: "Date", type: "date", required: true },
  ],
  "purchase-services": [
    { key: "serviceName", label: "Service Name", type: "text", required: true },
    { key: "vendor", label: "Vendor", type: "text", required: true },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "status", label: "Status", type: "select", options: ["Pending", "Completed", "Cancelled"] },
  ],
  "stock-transfer": [
    { key: "itemName", label: "Item Name", type: "text", required: true },
    { key: "fromStore", label: "From Department", type: "text", required: true },
    { key: "toStore", label: "To Department", type: "text", required: true },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "unit", label: "Unit", type: "text" },
    { key: "approvedBy", label: "Approved By", type: "text" },
    { key: "date", label: "Date", type: "date", required: true },
  ],
};

const MASTER_TABLE_COLUMNS = {
  segments: ["name", "description", "status"],
  vendors: ["name", "contact", "phone", "city", "gstin", "status"],
  units: ["name", "shortName", "type"],
  "unit-conversion": ["fromUnit", "toUnit", "factor", "notes"],
  "store-kitchen": ["name", "type", "manager", "status"],
  "item-groups": ["name", "segment", "status"],
  gravies: ["name", "base", "spiceLevel"],
  ingredients: ["name", "group", "unit", "status"],
  "purchase-items": ["itemName", "vendor", "quantity", "unit", "ratePerUnit", "amount", "invoiceNo", "date"],
  "purchase-services": ["serviceName", "vendor", "amount", "date", "status"],
  "stock-transfer": ["itemName", "fromStore", "toStore", "quantity", "unit", "approvedBy", "date"],
};

const ITEMS_FORM = [
  { key: "name",         label: "Item Name",       type: "text",   required: true },
  { key: "category",     label: "Category",         type: "text",   required: true },
  { key: "stock",        label: "Current Stock",    type: "number", required: true },
  { key: "unit",         label: "Unit",             type: "text",   required: true },
  { key: "price",        label: "Price / Unit (₹)", type: "number", required: true },
  { key: "reorderPoint", label: "Reorder Point",    type: "number" },
  { key: "expiry",       label: "Expiry Date",      type: "date" },
  { key: "branch",       label: "Store / Branch",   type: "text",   required: true },
];

const PO_FIELDS = [
  { key: "poNumber",     label: "PO Number",        type: "text",   required: true },
  { key: "vendor",       label: "Vendor",           type: "text",   required: true },
  { key: "itemName",     label: "Item Name",        type: "text",   required: true },
  { key: "quantity",     label: "Quantity",         type: "number", required: true },
  { key: "unit",         label: "Unit",             type: "text" },
  { key: "rate",         label: "Rate / Unit (₹)",  type: "number", required: true },
  { key: "expectedDate", label: "Expected Delivery",type: "date" },
  { key: "status",       label: "Status",           type: "select", options: ["Draft","Sent","GRN Received","Closed","Cancelled"] },
];

const WASTE_FIELDS = [
  { key: "itemName",  label: "Item Name",       type: "text",   required: true },
  { key: "quantity",  label: "Quantity Lost",   type: "number", required: true },
  { key: "unit",      label: "Unit",            type: "text" },
  { key: "reason",    label: "Reason",          type: "select", options: ["Expired","Spoiled","Damaged","Overcooked","Spilled","Other"] },
  { key: "store",     label: "From Store",      type: "text" },
  { key: "remarks",   label: "Remarks",         type: "text" },
  { key: "date",      label: "Date",            type: "date",   required: true },
];

const DEFAULT_MASTER_DATA = {
  segments: [
    { id: 1, name: "Food", description: "Kitchen raw material", status: "Active" },
    { id: 2, name: "Beverage", description: "Soft drinks and mocktails", status: "Active" },
  ],
  vendors: [
    { id: 1, name: "Fresh Farm Supply", contact: "Ravi", phone: "9876543210", email: "", city: "Varanasi", gstin: "", status: "Active" },
    { id: 2, name: "Royal Traders", contact: "Amit", phone: "9988776655", email: "", city: "Mirzapur", gstin: "", status: "On Hold" },
  ],
  units: [
    { id: 1, name: "Kilogram", shortName: "kg", type: "Weight" },
    { id: 2, name: "Litre", shortName: "ltr", type: "Volume" },
    { id: 3, name: "Piece", shortName: "pcs", type: "Count" },
  ],
  "unit-conversion": [
    { id: 1, fromUnit: "kg", toUnit: "gram", factor: 1000, notes: "Standard kitchen weight" },
    { id: 2, fromUnit: "ltr", toUnit: "ml", factor: 1000, notes: "Liquid conversion" },
  ],
  "store-kitchen": [
    { id: 1, name: "Main Store", type: "Store", manager: "Mohan", status: "Open" },
    { id: 2, name: "Live Kitchen", type: "Kitchen", manager: "Chef Arjun", status: "Open" },
    { id: 3, name: "Bar Counter", type: "Bar", manager: "Suresh", status: "Open" },
    { id: 4, name: "Banquet Store", type: "Banquet", manager: "Dinesh", status: "Open" },
  ],
  "item-groups": [
    { id: 1, name: "Dry Store", segment: "Food", status: "Active" },
    { id: 2, name: "Cold Storage", segment: "Food", status: "Active" },
  ],
  gravies: [
    { id: 1, name: "Brown Gravy", base: "Onion Tomato", spiceLevel: "Medium" },
    { id: 2, name: "White Gravy", base: "Cream Cashew", spiceLevel: "Low" },
  ],
  ingredients: [
    { id: 1, name: "Basmati Rice", group: "Dry Store", unit: "kg", status: "Active" },
    { id: 2, name: "Cooking Oil", group: "Kitchen Essentials", unit: "ltr", status: "Active" },
  ],
  "purchase-items": [
    { id: 1, itemName: "Paneer", vendor: "Fresh Farm Supply", quantity: 20, unit: "kg", ratePerUnit: 240, amount: 4800, invoiceNo: "INV-001", date: "2026-03-14" },
    { id: 2, itemName: "Cold Drink", vendor: "Royal Traders", quantity: 48, unit: "pcs", ratePerUnit: 75, amount: 3600, invoiceNo: "INV-002", date: "2026-03-15" },
  ],
  "purchase-services": [
    { id: 1, serviceName: "Deep Cleaning", vendor: "Royal Traders", amount: 4500, date: "2026-03-12", status: "Completed" },
  ],
  "stock-transfer": [
    { id: 1, itemName: "Soft Drinks", fromStore: "Main Store", toStore: "Bar Counter", quantity: 24, unit: "pcs", approvedBy: "Manager", date: "2026-03-15" },
  ],
  "purchase-orders": [
    { id: 1, poNumber: "PO-001", vendor: "Fresh Farm Supply", itemName: "Basmati Rice", quantity: 50, unit: "kg", rate: 85, expectedDate: "2026-03-28", status: "Sent" },
  ],
  "waste-log": [
    { id: 1, itemName: "Paneer", quantity: 2, unit: "kg", reason: "Expired", store: "Live Kitchen", remarks: "Past expiry date", date: "2026-03-15" },
  ],
};

// ─── Utility Functions ────────────────────────────────────────────────────────

function loadStoredValue(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function buildInitialForm(fields, record = {}) {
  return fields.reduce((acc, field) => {
    acc[field.key] = record[field.key] ?? "";
    return acc;
  }, {});
}

function formatLabel(value) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  const exp = new Date(expiryDate);
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { label: "Expired",      color: "bg-red-100 text-red-700 border-red-300" };
  if (diffDays <= 7) return { label: `Exp in ${diffDays}d`, color: "bg-orange-100 text-orange-700 border-orange-300" };
  if (diffDays <= 30) return { label: `Exp in ${diffDays}d`, color: "bg-amber-100 text-amber-700 border-amber-300" };
  return null;
}

function isLowStock(item) {
  const stock = Number(item.stock || 0);
  const reorder = Number(item.reorderPoint || 10);
  return stock <= reorder;
}

// ─── Small Shared Components ──────────────────────────────────────────────────

function FormInput({ field, value, onChange }) {
  const cls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition";
  if (field.type === "select") {
    return (
      <select value={value} onChange={(e) => onChange(field.key, e.target.value)} className={cls}>
        <option value="">Select {field.label}</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input type={field.type} value={value} onChange={(e) => onChange(field.key, e.target.value)}
      className={cls} placeholder={field.label} />
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl transition focus-within:-translate-y-0.5 focus-within:border-cyan-200">
      <FaSearch className="shrink-0 text-cyan-500" size={13} />
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
    </label>
  );
}

function Badge({ children, color = "gray" }) {
  const colors = {
    gray: "bg-slate-100 text-slate-600",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    cyan: "bg-cyan-100 text-cyan-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}

function MetricCard({ label, value, sub, tone = "default" }) {
  const tones = {
    default: "from-white to-slate-50 border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
    cyan:    "from-cyan-50 to-sky-100 border-cyan-200 shadow-[0_18px_40px_rgba(8,145,178,0.12)]",
    amber:   "from-amber-50 to-orange-100 border-amber-200 shadow-[0_18px_40px_rgba(245,158,11,0.12)]",
    emerald: "from-emerald-50 to-teal-100 border-emerald-200 shadow-[0_18px_40px_rgba(16,185,129,0.12)]",
    red:     "from-rose-50 to-red-100 border-red-200 shadow-[0_18px_40px_rgba(244,63,94,0.12)]",
  };
  return (
    <div className={`relative overflow-hidden rounded-[24px] border bg-gradient-to-br px-4 py-4 ${tones[tone]}`}>
      <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/40 blur-2xl" />
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Form Panel + Table ───────────────────────────────────────────────────────

function FormPanel({ title, subtitle, fields, draft, setDraft, editingId, onSave, onReset }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.09)] backdrop-blur-xl">
      <div className="mb-5 rounded-[24px] bg-[linear-gradient(135deg,#0f172a_0%,#155e75_48%,#0f766e_100%)] px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">
              {editingId ? `Edit ${title}` : `Add ${title}`}
            </h3>
            {subtitle && <p className="mt-1 text-xs text-white/75">{subtitle}</p>}
          </div>
          {editingId && (
            <button type="button" onClick={onReset}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20">
              Cancel Edit
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            <FormInput field={field} value={draft[field.key] ?? ""}
              onChange={(key, val) => setDraft((c) => ({ ...c, [key]: val }))} />
          </div>
        ))}
      </div>
      <button type="button" onClick={onSave}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(37,99,235,0.25)] hover:-translate-y-0.5 transition">
        <FaPlus size={12} />
        {editingId ? "Update" : "Save"}
      </button>
    </div>
  );
}

function DataTable({ columns, rows, onEdit, onDelete, emptyMessage }) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-slate-700">
        <thead className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3">{formatLabel(col)}</th>
            ))}
            {(onEdit || onDelete) && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 hover:bg-cyan-50/40 transition">
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 text-slate-700">{row[col] ?? "—"}</td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(row)}
                        className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 transition">
                        <FaEdit size={10} /> Edit
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" onClick={() => onDelete(row.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition">
                        <FaTrash size={10} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-sm text-slate-400">
                {emptyMessage || "No records found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ─── Section: Items ───────────────────────────────────────────────────────────

function ItemsSection({ items, form, setForm, editingId, setEditingId, onSave, onDelete, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter, categories }) {
  const today = new Date();

  const visibleItems = items.filter((item) => {
    const matchCat = categoryFilter === "All" || item.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = [item.name, item.category, item.branch].some(
      (v) => String(v || "").toLowerCase().includes(q)
    );
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[340px,1fr]">
        <FormPanel
          title="Inventory Item"
          subtitle="Connected to backend API — real-time sync"
          fields={ITEMS_FORM}
          draft={form}
          setDraft={setForm}
          editingId={editingId}
          onSave={onSave}
          onReset={() => { setForm(buildInitialForm(ITEMS_FORM)); setEditingId(null); }}
        />

        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Items Ledger</h3>
              <p className="text-xs text-slate-400">{items.length} total items loaded from backend</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="w-full sm:w-60">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search item / store" />
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_16px_35px_rgba(15,23,42,0.06)]">
                <FaFilter size={12} className="text-cyan-500" />
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent outline-none text-sm">
                  <option value="All">All Categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-[26px] border border-slate-200/80">
            <table className="min-w-full text-sm">
              <thead className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Reorder</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length ? visibleItems.map((item) => {
                  const low = isLowStock(item);
                  const expStatus = getExpiryStatus(item.expiry);
                  return (
                    <tr key={item.id} className={`border-t border-slate-100 hover:bg-cyan-50/40 transition ${low ? "bg-amber-50/40" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          {low && <FaExclamationTriangle className="text-amber-500" size={11} title="Low stock" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.category}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${low ? "text-amber-600" : "text-slate-900"}`}>
                          {item.stock} <span className="font-normal text-slate-400 text-xs">{item.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{item.reorderPoint || 10} {item.unit}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3">
                        {expStatus
                          ? <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${expStatus.color}`}>{expStatus.label}</span>
                          : item.expiry ? <span className="text-xs text-slate-400">{String(item.expiry).split("T")[0]}</span> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.branch}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => {
                            setEditingId(item.id);
                            setForm({
                              name: item.name || "", category: item.category || "",
                              stock: item.stock || "", unit: item.unit || "",
                              price: item.price || "", reorderPoint: item.reorderPoint || "",
                              expiry: item.expiry ? String(item.expiry).split("T")[0] : "",
                              branch: item.branch || "",
                            });
                          }}
                            className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 transition">
                            <FaEdit size={10} /> Edit
                          </button>
                          <button type="button" onClick={() => onDelete(item.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition">
                            <FaTrash size={10} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">No matching inventory items.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Generic Master ──────────────────────────────────────────────────

function GenericMasterSection({ section, records, onSave, onEdit, onDelete, draft, setDraft, editingId, searchQuery, setSearchQuery }) {
  const fields = MASTER_FIELDS[section.id];
  const columns = MASTER_TABLE_COLUMNS[section.id];
  const filtered = records.filter((r) =>
    Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[340px,1fr]">
        <FormPanel
          title={section.label}
          subtitle="Stored in local inventory workspace"
          fields={fields}
          draft={draft}
          setDraft={setDraft}
          editingId={editingId}
          onSave={onSave}
          onReset={() => { setDraft(buildInitialForm(fields)); onEdit(null); }}
        />
        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{section.label} Register</h3>
              <p className="text-xs text-slate-400">{records.length} records</p>
            </div>
            <div className="w-64">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={`Search ${section.label.toLowerCase()}`} />
            </div>
          </div>
          <DataTable columns={columns} rows={filtered} onEdit={onEdit} onDelete={onDelete} emptyMessage="No matching records found." />
        </div>
      </div>
    </div>
  );
}

// ─── Section: Purchase Orders (PO / GRN) ─────────────────────────────────────

function PurchaseOrderSection({ records, onSave, onEdit, onDelete, draft, setDraft, editingId, searchQuery, setSearchQuery }) {
  const filtered = records.filter((r) =>
    Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const poColumns = ["poNumber", "vendor", "itemName", "quantity", "unit", "rate", "expectedDate", "status"];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[340px,1fr]">
        <FormPanel
          title="Purchase Order"
          subtitle="Create PO → Send to vendor → Mark GRN Received"
          fields={PO_FIELDS}
          draft={draft}
          setDraft={setDraft}
          editingId={editingId}
          onSave={onSave}
          onReset={() => { setDraft(buildInitialForm(PO_FIELDS)); onEdit(null); }}
        />
        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Purchase Order Register</h3>
              <p className="text-xs text-slate-400">{records.length} purchase orders</p>
            </div>
            <div className="w-64">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search PO / vendor" />
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-widest text-slate-400 text-left">
                <tr>
                  {poColumns.map((col) => <th key={col} className="px-4 py-3">{formatLabel(col)}</th>)}
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map((row) => {
                  const statusColors = {
                    Draft: "gray", Sent: "cyan", "GRN Received": "green",
                    Closed: "emerald", Cancelled: "red",
                  };
                  return (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.poNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{row.vendor}</td>
                      <td className="px-4 py-3 text-slate-700">{row.itemName}</td>
                      <td className="px-4 py-3">{row.quantity}</td>
                      <td className="px-4 py-3 text-slate-500">{row.unit}</td>
                      <td className="px-4 py-3">{formatCurrency(row.rate)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{row.expectedDate || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge color={statusColors[row.status] || "gray"}>{row.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => onEdit(row)}
                            className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 transition">
                            <FaEdit size={10} /> Edit
                          </button>
                          <button type="button" onClick={() => onDelete(row.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition">
                            <FaTrash size={10} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">No purchase orders found. Create your first PO above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Waste / Spoilage Log ────────────────────────────────────────────

function WasteLogSection({ records, onSave, onEdit, onDelete, draft, setDraft, editingId, searchQuery, setSearchQuery }) {
  const filtered = records.filter((r) =>
    Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const wasteColumns = ["itemName", "quantity", "unit", "reason", "store", "remarks", "date"];
  const totalWaste = records.reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Waste Entries" value={records.length} tone="red" />
        <MetricCard label="Total Qty Wasted" value={totalWaste} sub="units across all items" tone="amber" />
        <MetricCard label="Top Reason" value={records.length ? records.reduce((acc, r) => { acc[r.reason] = (acc[r.reason] || 0) + 1; return acc; }, {}) && Object.entries(records.reduce((acc, r) => { acc[r.reason] = (acc[r.reason] || 0) + 1; return acc; }, {})).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—" : "—"} tone="default" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[340px,1fr]">
        <FormPanel
          title="Waste / Spoilage Entry"
          subtitle="Log expired, damaged or wasted items"
          fields={WASTE_FIELDS}
          draft={draft}
          setDraft={setDraft}
          editingId={editingId}
          onSave={onSave}
          onReset={() => { setDraft(buildInitialForm(WASTE_FIELDS)); onEdit(null); }}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Waste Log Register</h3>
              <p className="text-xs text-slate-400">{records.length} entries recorded</p>
            </div>
            <div className="w-64">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search waste entry" />
            </div>
          </div>
          <DataTable columns={wasteColumns} rows={filtered} onEdit={onEdit} onDelete={onDelete} emptyMessage="No waste entries recorded." />
        </div>
      </div>
    </div>
  );
}

// ─── Section: Stock Audit ─────────────────────────────────────────────────────

function StockAuditSection({ items }) {
  const [auditData, setAuditData] = useState(() =>
    items.map((item) => ({
      id: item.id, name: item.name, category: item.category, branch: item.branch,
      unit: item.unit, systemStock: item.stock, physicalStock: "", remarks: "",
    }))
  );
  const [submitted, setSubmitted] = useState(false);

  const handlePhysicalChange = (id, val) => {
    setAuditData((d) => d.map((r) => r.id === id ? { ...r, physicalStock: val } : r));
  };
  const handleRemarks = (id, val) => {
    setAuditData((d) => d.map((r) => r.id === id ? { ...r, remarks: val } : r));
  };

  const auditResults = auditData.map((r) => {
    const sys = Number(r.systemStock || 0);
    const phy = Number(r.physicalStock || 0);
    const diff = phy - sys;
    return { ...r, variance: r.physicalStock !== "" ? diff : null };
  });

  const withVariance = auditResults.filter((r) => r.variance !== null && r.variance !== 0);

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-amber-200/80 bg-[linear-gradient(135deg,#fff7ed_0%,#fef3c7_100%)] px-5 py-4 shadow-[0_18px_40px_rgba(245,158,11,0.12)] flex items-start gap-3">
        <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Physical Stock Audit Mode</p>
          <p className="text-xs text-amber-600 mt-0.5">Enter physical count for each item. System will calculate variance automatically.</p>
        </div>
      </div>

      {submitted && withVariance.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">{withVariance.length} variance(s) detected</p>
          <div className="space-y-1">
            {withVariance.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs text-red-600">
                <FaArrowRight size={10} />
                <span className="font-medium">{r.name}</span>: System {r.systemStock} {r.unit} vs Physical {r.physicalStock} {r.unit}
                <span className={`font-bold ${r.variance < 0 ? "text-red-700" : "text-emerald-600"}`}>
                  ({r.variance > 0 ? "+" : ""}{r.variance})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Physical Count Sheet</h3>
            <p className="text-xs text-slate-400">{items.length} items to audit</p>
          </div>
          <button type="button" onClick={() => setSubmitted(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
            <FaCheckCircle size={13} /> Submit Audit
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-widest text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">System Stock</th>
                <th className="px-4 py-3">Physical Count</th>
                <th className="px-4 py-3">Variance</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {auditResults.map((row) => {
                const hasVariance = row.variance !== null && row.variance !== 0;
                return (
                  <tr key={row.id} className={`border-t border-slate-100 ${hasVariance ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-500">{row.category}</td>
                    <td className="px-4 py-3 text-slate-500">{row.branch}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.systemStock} <span className="font-normal text-slate-400 text-xs">{row.unit}</span></td>
                    <td className="px-4 py-3">
                      <input type="number" value={row.physicalStock}
                        onChange={(e) => handlePhysicalChange(row.id, e.target.value)}
                        className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition"
                        placeholder="Enter count" />
                    </td>
                    <td className="px-4 py-3">
                      {row.variance !== null ? (
                        <span className={`font-bold text-sm ${row.variance < 0 ? "text-red-600" : row.variance > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                          {row.variance > 0 ? "+" : ""}{row.variance} {row.unit}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <input type="text" value={row.remarks}
                        onChange={(e) => handleRemarks(row.id, e.target.value)}
                        className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-cyan-400 transition"
                        placeholder="Optional" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Reports ─────────────────────────────────────────────────────────

function ReportSection({ title, subtitle, columns, rows }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      <DataTable columns={columns.map((c) => c.key)} rows={rows.map((r, i) => ({ id: i, ...r }))} emptyMessage="No report data available." />
    </div>
  );
}

// ─── Low Stock Alerts Banner ──────────────────────────────────────────────────

function LowStockAlerts({ items }) {
  const lowItems = items.filter(isLowStock);
  const expiredItems = items.filter((i) => {
    if (!i.expiry) return false;
    return new Date(i.expiry) <= new Date();
  });

  if (lowItems.length === 0 && expiredItems.length === 0) return null;

  return (
    <div className="rounded-[26px] border border-amber-200/80 bg-[linear-gradient(135deg,#fff8eb_0%,#fef3c7_100%)] p-4 shadow-[0_18px_40px_rgba(245,158,11,0.12)]">
      <div className="flex items-center gap-2 mb-3">
        <FaBell className="text-amber-600" />
        <h4 className="text-sm font-semibold text-amber-800">Inventory Alerts</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {lowItems.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700">
            <FaExclamationTriangle size={10} />
            {item.name}: {item.stock} {item.unit} left
          </span>
        ))}
        {expiredItems.map((item) => (
          <span key={`exp-${item.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700">
            <FaCalendarAlt size={10} />
            {item.name}: Expired
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function InventoryDashboard() {
  const [activeSection, setActiveSection] = useState("items");
  const [inventoryItems, setInventoryItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState("");

  const [sectionSearch, setSectionSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [itemsForm, setItemsForm] = useState(buildInitialForm(ITEMS_FORM));
  const [editingItemId, setEditingItemId] = useState(null);

  const [masterData, setMasterData] = useState(() =>
    Object.keys(STORAGE_KEYS).reduce((acc, key) => {
      acc[key] = loadStoredValue(STORAGE_KEYS[key], DEFAULT_MASTER_DATA[key] || []);
      return acc;
    }, {})
  );
  const [masterDraft, setMasterDraft] = useState({});
  const [editingMasterId, setEditingMasterId] = useState(null);

  // Load inventory items from API
  useEffect(() => {
    const load = async () => {
      try {
        setItemsLoading(true);
        const res = await API.get("/inventory");
        setInventoryItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setItemsError(err.response?.data?.message || "Could not load inventory items.");
      } finally {
        setItemsLoading(false);
      }
    };
    load();
  }, []);

  // Persist master data to localStorage
  useEffect(() => {
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      localStorage.setItem(storageKey, JSON.stringify(masterData[key] || []));
    });
  }, [masterData]);

  // Reset form on section switch
  useEffect(() => {
    const section = INVENTORY_SECTIONS.find((s) => s.id === activeSection);
    if (!section) return;
    const fields = section.type === "master" ? MASTER_FIELDS[activeSection] || [] : [];
    setMasterDraft(buildInitialForm(fields));
    setEditingMasterId(null);
    setSectionSearch("");
  }, [activeSection]);

  const categories = useMemo(
    () => [...new Set(inventoryItems.map((i) => i.category).filter(Boolean))].sort(),
    [inventoryItems]
  );

  const totalStockValue = inventoryItems.reduce((s, i) => s + Number(i.stock || 0) * Number(i.price || 0), 0);
  const lowStockCount  = inventoryItems.filter(isLowStock).length;
  const expiredCount   = inventoryItems.filter((i) => i.expiry && new Date(i.expiry) <= new Date()).length;
  const selectedSection = INVENTORY_SECTIONS.find((s) => s.id === activeSection);

  // ── Report rows ──────────────────────────────────────────
  const reportRows = useMemo(() => {
    const pi  = masterData["purchase-items"] || [];
    const ps  = masterData["purchase-services"] || [];
    const st  = masterData["stock-transfer"] || [];
    const vds = masterData.vendors || [];

    return {
      "vendor-report": vds.map((v) => {
        const vPurchases = pi.filter((p) => p.vendor === v.name);
        const vServices  = ps.filter((s) => s.vendor === v.name);
        return {
          name: v.name, contact: v.contact || "—",
          purchases: vPurchases.length, services: vServices.length,
          totalSpend: formatCurrency(
            vPurchases.reduce((s,r) => s + Number(r.amount||0), 0) +
            vServices.reduce((s,r) => s + Number(r.amount||0), 0)
          ),
          status: v.status || "—",
        };
      }),
      "stock-report": inventoryItems.map((i) => ({
        item: i.name, category: i.category, store: i.branch,
        stock: `${i.stock} ${i.unit}`,
        reorderPoint: `${i.reorderPoint || 10} ${i.unit}`,
        alert: isLowStock(i) ? "⚠ Low" : "OK",
        value: formatCurrency(Number(i.stock||0) * Number(i.price||0)),
      })),
      "closing-stock-report": inventoryItems.map((i) => ({
        item: i.name, branch: i.branch,
        opening: `${i.stock} ${i.unit}`,
        issued: `${Math.max(0, Math.floor(Number(i.stock||0)*0.2))} ${i.unit}`,
        closing: `${Math.max(0, Math.ceil(Number(i.stock||0)*0.8))} ${i.unit}`,
      })),
      "item-report": inventoryItems.map((i) => ({
        item: i.name, category: i.category, unit: i.unit,
        rate: formatCurrency(i.price),
        expiry: i.expiry ? String(i.expiry).split("T")[0] : "—",
        status: isLowStock(i) ? "Low Stock" : "Normal",
      })),
      "item-consumption-report": inventoryItems.map((i) => ({
        item: i.name,
        consumed: `${Math.max(1, Math.floor(Number(i.stock||0)*0.2))} ${i.unit}`,
        kitchen: i.branch,
        cost: formatCurrency(Number(i.price||0) * Math.max(1, Math.floor(Number(i.stock||0)*0.2))),
      })),
      "total-consumption-report": [
        { group: "Kitchen Items", entries: inventoryItems.length,
          totalConsumed: inventoryItems.reduce((s,i) => s + Math.max(1,Math.floor(Number(i.stock||0)*0.2)),0),
          totalCost: formatCurrency(inventoryItems.reduce((s,i) => s + Number(i.price||0)*2,0)) },
        { group: "Transfers", entries: st.length,
          totalConsumed: st.reduce((s,r) => s + Number(r.quantity||0),0),
          totalCost: formatCurrency(st.reduce((s,r) => s + Number(r.quantity||0)*25,0)) },
      ],
      "item-audit": inventoryItems.map((i) => ({
        item: i.name, branch: i.branch,
        physicalStock: `${Math.max(0,Number(i.stock||0)-1)} ${i.unit}`,
        systemStock:   `${i.stock} ${i.unit}`,
        variance:      `1 ${i.unit}`,
        status: Number(i.stock||0) < 10 ? "⚠ Review" : "✔ Matched",
      })),
    };
  }, [inventoryItems, masterData]);

  const reportConfig = {
    "vendor-report": { title:"Vendor Report", subtitle:"Purchase & service cost by vendor",
      columns:[{key:"name"},{key:"contact"},{key:"purchases"},{key:"services"},{key:"totalSpend"},{key:"status"}] },
    "stock-report": { title:"Stock Report", subtitle:"Live inventory snapshot with reorder alerts",
      columns:[{key:"item"},{key:"category"},{key:"store"},{key:"stock"},{key:"reorderPoint"},{key:"alert"},{key:"value"}] },
    "closing-stock-report": { title:"Closing Stock Report", subtitle:"Opening, issued and closing quantities",
      columns:[{key:"item"},{key:"branch"},{key:"opening"},{key:"issued"},{key:"closing"}] },
    "item-report": { title:"Item Report", subtitle:"Item details with rate and expiry",
      columns:[{key:"item"},{key:"category"},{key:"unit"},{key:"rate"},{key:"expiry"},{key:"status"}] },
    "item-consumption-report": { title:"Item Consumption Report", subtitle:"Estimated consumption per item",
      columns:[{key:"item"},{key:"consumed"},{key:"kitchen"},{key:"cost"}] },
    "total-consumption-report": { title:"Total Consumption Report", subtitle:"Combined usage totals across all records",
      columns:[{key:"group"},{key:"entries"},{key:"totalConsumed"},{key:"totalCost"}] },
    "item-audit": { title:"Item Audit Report", subtitle:"System vs physical stock comparison",
      columns:[{key:"item"},{key:"branch"},{key:"physicalStock"},{key:"systemStock"},{key:"variance"},{key:"status"}] },
  };

  // ── Master CRUD helpers ───────────────────────────────────
  const saveMasterRecord = useCallback(() => {
    const fields = MASTER_FIELDS[activeSection] || PO_FIELDS;
    const isPoSection = activeSection === "purchase-orders";
    const isWasteSection = activeSection === "waste-log";
    const relevantFields = isPoSection ? PO_FIELDS : isWasteSection ? WASTE_FIELDS : (MASTER_FIELDS[activeSection] || []);

    const missing = relevantFields.some((f) => f.required && !String(masterDraft[f.key] ?? "").trim());
    if (missing) { alert("Please fill all required fields."); return; }

    const payload = relevantFields.reduce((acc, f) => { acc[f.key] = masterDraft[f.key]; return acc; }, {});

    setMasterData((cur) => {
      const list = cur[activeSection] || [];
      if (editingMasterId) {
        return { ...cur, [activeSection]: list.map((r) => r.id === editingMasterId ? { ...r, ...payload } : r) };
      }
      return { ...cur, [activeSection]: [...list, { id: Date.now(), ...payload }] };
    });
    setMasterDraft(buildInitialForm(relevantFields));
    setEditingMasterId(null);
  }, [activeSection, masterDraft, editingMasterId]);

  const editMasterRecord = useCallback((record) => {
    if (!record) {
      setEditingMasterId(null);
      const fields = activeSection === "purchase-orders" ? PO_FIELDS :
        activeSection === "waste-log" ? WASTE_FIELDS :
        (MASTER_FIELDS[activeSection] || []);
      setMasterDraft(buildInitialForm(fields));
      return;
    }
    setEditingMasterId(record.id);
    setMasterDraft({ ...record });
  }, [activeSection]);

  const deleteMasterRecord = useCallback((id) => {
    setMasterData((cur) => ({
      ...cur,
      [activeSection]: (cur[activeSection] || []).filter((r) => r.id !== id),
    }));
  }, [activeSection]);

  // ── Inventory items CRUD ──────────────────────────────────
  const saveInventoryItem = async () => {
    const missing = ITEMS_FORM.some((f) => f.required && !String(itemsForm[f.key] ?? "").trim());
    if (missing) { setItemsError("Please fill all required fields."); return; }

    const payload = { ...itemsForm, stock: Number(itemsForm.stock), price: Number(itemsForm.price), reorderPoint: Number(itemsForm.reorderPoint || 10) };

    try {
      if (editingItemId) {
        await API.put(`/inventory/${editingItemId}`, payload);
        setInventoryItems((cur) => cur.map((i) => i.id === editingItemId ? { ...i, ...payload } : i));
      } else {
        const res = await API.post("/inventory", payload);
        setInventoryItems((cur) => [...cur, { id: res.data?.id || Date.now(), ...payload }]);
      }
      setItemsForm(buildInitialForm(ITEMS_FORM));
      setEditingItemId(null);
      setItemsError("");
    } catch (err) {
      setItemsError(err.response?.data?.message || "Could not save item. Check role permissions.");
    }
  };

  const deleteInventoryItem = async (id) => {
    try {
      await API.delete(`/inventory/${id}`);
      setInventoryItems((cur) => cur.filter((i) => i.id !== id));
    } catch (err) {
      setItemsError(err.response?.data?.message || "Could not delete item.");
    }
  };

  // ── Render section content ────────────────────────────────
  const renderContent = () => {
    if (!selectedSection) return null;

    if (selectedSection.type === "items") {
      return (
        <ItemsSection
          items={inventoryItems} form={itemsForm} setForm={setItemsForm}
          editingId={editingItemId} setEditingId={setEditingItemId}
          onSave={saveInventoryItem} onDelete={deleteInventoryItem}
          searchQuery={sectionSearch} setSearchQuery={setSectionSearch}
          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
          categories={categories}
        />
      );
    }

    if (selectedSection.type === "po") {
      return (
        <PurchaseOrderSection
          records={masterData["purchase-orders"] || []}
          onSave={saveMasterRecord} onEdit={editMasterRecord} onDelete={deleteMasterRecord}
          draft={masterDraft} setDraft={setMasterDraft} editingId={editingMasterId}
          searchQuery={sectionSearch} setSearchQuery={setSectionSearch}
        />
      );
    }

    if (selectedSection.type === "waste") {
      return (
        <WasteLogSection
          records={masterData["waste-log"] || []}
          onSave={saveMasterRecord} onEdit={editMasterRecord} onDelete={deleteMasterRecord}
          draft={masterDraft} setDraft={setMasterDraft} editingId={editingMasterId}
          searchQuery={sectionSearch} setSearchQuery={setSectionSearch}
        />
      );
    }

    if (selectedSection.type === "audit") {
      return <StockAuditSection items={inventoryItems} />;
    }

    if (selectedSection.type === "master") {
      return (
        <GenericMasterSection
          section={selectedSection}
          records={masterData[activeSection] || []}
          onSave={saveMasterRecord} onEdit={editMasterRecord} onDelete={deleteMasterRecord}
          draft={masterDraft} setDraft={setMasterDraft} editingId={editingMasterId}
          searchQuery={sectionSearch} setSearchQuery={setSectionSearch}
        />
      );
    }

    const cfg = reportConfig[activeSection];
    if (cfg) {
      return <ReportSection title={cfg.title} subtitle={cfg.subtitle} columns={cfg.columns} rows={reportRows[activeSection] || []} />;
    }

    return null;
  };

  // ── Sidebar section groups ────────────────────────────────
  const sectionGroups = [
    { label: "Stock", ids: ["items", "stock-transfer", "stock-audit", "waste-log"] },
    { label: "Masters", ids: ["segments","vendors","units","unit-conversion","store-kitchen","item-groups","gravies","ingredients"] },
    { label: "Purchases", ids: ["purchase-items","purchase-services","purchase-orders"] },
    { label: "Reports", ids: ["vendor-report","stock-report","closing-stock-report","item-report","item-consumption-report","total-consumption-report","item-audit"] },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f6fbff_0%,#eef6f8_28%,#fff8ef_58%,#f8fafc_100%)] p-4 sm:p-5">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-[30px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_48%,#1d4ed8_100%)] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8%] top-[-18%] h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute right-[-6%] top-[12%] h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:68px_68px] opacity-35" />
        </div>
        <div className="relative z-[1]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300/80">Baglamukhi Resort</p>
            <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">Inventory Management</h1>
            <p className="mt-1.5 max-w-xl text-sm text-slate-300">
              Full-stack inventory workspace — items, POs, waste logs, stock audits, inter-department transfers and reports.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: "Total Items",    v: inventoryItems.length,         c: "border-white/20 bg-white/10 text-white" },
              { l: "Stock Value",    v: formatCurrency(totalStockValue),c: "border-white/20 bg-white/10 text-white" },
              { l: "Low Stock",      v: lowStockCount,                  c: "border-amber-400/40 bg-amber-500/20 text-amber-200" },
              { l: "Expired",        v: expiredCount,                   c: "border-red-400/40 bg-red-500/20 text-red-200" },
            ].map(({ l, v, c }) => (
              <div key={l} className={`rounded-2xl border px-4 py-3 ${c}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{l}</p>
                <p className="mt-1 text-xl font-bold">{itemsLoading && l === "Total Items" ? "..." : v}</p>
              </div>
            ))}
          </div>
        </div>

        {itemsError && (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-200">
            {itemsError}
          </div>
        )}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <aside className="hidden w-[230px] shrink-0 xl:block">
          <div className="sticky top-4 rounded-[28px] border border-white/70 bg-white/85 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Navigation</p>
            <div className="space-y-4">
              {sectionGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.ids.map((id) => {
                      const sec = INVENTORY_SECTIONS.find((s) => s.id === id);
                      if (!sec) return null;
                      const Icon = sec.icon;
                      const active = activeSection === id;
                      return (
                        <button key={id} type="button" onClick={() => setActiveSection(id)}
                          className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${
                            active ? "border border-cyan-200 bg-[linear-gradient(135deg,#ecfeff_0%,#dbeafe_100%)] text-cyan-900 shadow-[0_16px_30px_rgba(8,145,178,0.12)]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}>
                          <Icon size={13} className={active ? "text-cyan-600" : "text-slate-400"} />
                          <span>{sec.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-5">
          {/* Mobile section picker */}
          <div className="xl:hidden">
            <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <FaFilter className="text-cyan-500" size={13} />
              <select value={activeSection} onChange={(e) => setActiveSection(e.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none">
                {sectionGroups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.ids.map((id) => {
                      const sec = INVENTORY_SECTIONS.find((s) => s.id === id);
                      return sec ? <option key={id} value={id}>{sec.label}</option> : null;
                    })}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          {/* Low stock alerts */}
          {activeSection === "items" && <LowStockAlerts items={inventoryItems} />}

          {/* Section content */}
          <div>
            {itemsLoading && activeSection === "items" ? (
              <div className="flex items-center justify-center rounded-[28px] border border-white/70 bg-white/90 py-20 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                  <p className="mt-3 text-sm text-slate-400">Loading inventory...</p>
                </div>
              </div>
            ) : renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
