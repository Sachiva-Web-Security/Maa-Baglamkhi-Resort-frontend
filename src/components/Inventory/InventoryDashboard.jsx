import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FaBalanceScale, FaBoxes, FaClipboardList, FaExchangeAlt,
  FaFilter, FaFire, FaLayerGroup, FaListAlt, FaPlus, FaSearch,
  FaStore, FaTimes, FaTruck, FaUtensils, FaWarehouse, FaExclamationTriangle,
  FaCheckCircle, FaTrash, FaEdit, FaShoppingCart, FaFlask, FaChartBar,
  FaArrowRight, FaBell, FaCalendarAlt, FaChevronDown,
} from "react-icons/fa";
import API, { getBackendBaseURL } from "../../api";
import {
  createInventoryMasterRecord,
  deleteInventoryMasterRecord,
  fetchInventoryMasterRecords,
  updateInventoryMasterRecord,
} from "../../services/inventoryMastersService";

// ─── Constants ───────────────────────────────────────────────────────────────

const INVENTORY_SECTIONS = [
  { id: "items",              label: "Items",               icon: FaWarehouse,    type: "items" },
  { id: "menu-items",         label: "Menu Items",          icon: FaUtensils,     type: "menu" },
  { id: "menu-categories",    label: "Menu Categories",     icon: FaListAlt,      type: "master" },
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

const NAVIGATION_GROUPS = [
  {
    label: "Stock",
    helper: "Core stock controls and movement",
    ids: ["items", "menu-items", "stock-transfer", "stock-audit", "waste-log"],
    activeButton: "border-cyan-300 bg-[linear-gradient(135deg,#06b6d4_0%,#3b82f6_100%)] text-white shadow-[0_18px_36px_rgba(14,165,233,0.28)]",
    idleButton: "border-cyan-100 bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_100%)] text-cyan-950 hover:border-cyan-200",
    dropdown: "border-cyan-200/80 bg-[linear-gradient(180deg,rgba(236,254,255,0.98)_0%,rgba(239,246,255,0.98)_100%)]",
    itemActive: "border-cyan-200 bg-white text-cyan-900 shadow-[0_14px_28px_rgba(8,145,178,0.10)]",
    itemIdle: "border-cyan-100/80 bg-white/90 text-slate-700 hover:border-cyan-200 hover:bg-white",
    iconTone: "bg-white/20 text-white",
    iconIdleTone: "bg-cyan-100 text-cyan-700",
  },
  {
    label: "Masters",
    helper: "Base masters and inventory setup",
    ids: ["menu-categories", "segments", "vendors", "units", "unit-conversion", "store-kitchen", "item-groups", "gravies", "ingredients"],
    activeButton: "border-violet-400 bg-[linear-gradient(135deg,#5b21b6_0%,#1d4ed8_100%)] text-white shadow-[0_18px_36px_rgba(91,33,182,0.30)]",
    idleButton: "border-violet-200 bg-[linear-gradient(135deg,#ede9fe_0%,#dbeafe_100%)] text-violet-950 hover:border-violet-300",
    dropdown: "border-violet-300/90 bg-[linear-gradient(180deg,rgba(237,233,254,0.99)_0%,rgba(219,234,254,0.99)_100%)]",
    itemActive: "border-violet-300 bg-white text-violet-950 shadow-[0_14px_28px_rgba(91,33,182,0.14)]",
    itemIdle: "border-violet-200/90 bg-white/95 text-slate-800 hover:border-violet-300 hover:bg-white",
    iconTone: "bg-white/20 text-white",
    iconIdleTone: "bg-violet-200 text-violet-900",
  },
  {
    label: "Purchases",
    helper: "Purchase entries, services and orders",
    ids: ["purchase-items", "purchase-services", "purchase-orders"],
    activeButton: "border-amber-400 bg-[linear-gradient(135deg,#c2410c_0%,#d97706_100%)] text-white shadow-[0_18px_36px_rgba(194,65,12,0.30)]",
    idleButton: "border-amber-200 bg-[linear-gradient(135deg,#ffedd5_0%,#fef3c7_100%)] text-amber-950 hover:border-amber-300",
    dropdown: "border-amber-300/90 bg-[linear-gradient(180deg,rgba(255,237,213,0.99)_0%,rgba(254,243,199,0.99)_100%)]",
    itemActive: "border-amber-300 bg-white text-amber-950 shadow-[0_14px_28px_rgba(194,65,12,0.14)]",
    itemIdle: "border-amber-200/90 bg-white/95 text-slate-800 hover:border-amber-300 hover:bg-white",
    iconTone: "bg-white/20 text-white",
    iconIdleTone: "bg-amber-200 text-amber-900",
  },
  {
    label: "Reports",
    helper: "Operational and inventory reporting",
    ids: ["vendor-report", "stock-report", "closing-stock-report", "item-report", "item-consumption-report", "total-consumption-report", "item-audit"],
    activeButton: "border-emerald-400 bg-[linear-gradient(135deg,#047857_0%,#0f766e_100%)] text-white shadow-[0_18px_36px_rgba(4,120,87,0.30)]",
    idleButton: "border-emerald-200 bg-[linear-gradient(135deg,#d1fae5_0%,#ccfbf1_100%)] text-emerald-950 hover:border-emerald-300",
    dropdown: "border-emerald-300/90 bg-[linear-gradient(180deg,rgba(209,250,229,0.99)_0%,rgba(204,251,241,0.99)_100%)]",
    itemActive: "border-emerald-300 bg-white text-emerald-950 shadow-[0_14px_28px_rgba(4,120,87,0.14)]",
    itemIdle: "border-emerald-200/90 bg-white/95 text-slate-800 hover:border-emerald-300 hover:bg-white",
    iconTone: "bg-white/20 text-white",
    iconIdleTone: "bg-emerald-200 text-emerald-900",
  },
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
  "menu-items": "inventory_menu_items",
  "menu-categories": "inventory_menu_categories",
};

const INVENTORY_MASTER_API_SECTION_MAP = {
  "menu-categories": "menu-categories",
  segments: "segments",
  vendors: "vendors",
  units: "units",
  "unit-conversion": "unit-conversions",
  "store-kitchen": "locations",
  "item-groups": "item-groups",
  gravies: "gravies",
  ingredients: "ingredients",
  "purchase-items": "purchase-items",
  "purchase-services": "purchase-services",
};

const API_BACKED_MASTER_SECTIONS = new Set(Object.keys(STORAGE_KEYS));

const MENU_ITEM_FIELDS = [
  { key: "name", label: "Dish Name", type: "text", required: true },
  { key: "category", label: "Category", type: "text", required: true },
  { key: "price", label: "Price", type: "number", required: true },
  { key: "imageFile", label: "Upload Image", type: "file" },
  { key: "imageUrl", label: "Image URL", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "foodType", label: "Food Type", type: "select", options: ["Veg", "Non Veg", "Egg"] },
  { key: "status", label: "Status", type: "select", options: ["Available", "Out of Stock"] },
];

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
    { key: "notes", label: "Notes", type: "text" },
    { key: "date", label: "Date", type: "date", required: true },
  ],
  "menu-categories": [
    { key: "name", label: "Category Name", type: "text", required: true },
    { key: "parent", label: "Parent Group", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
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
  "stock-transfer": ["itemName", "fromStore", "toStore", "quantity", "unit", "approvedBy", "notes", "date"],
  "menu-categories": ["name", "parent", "status"],
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
  "menu-categories": [
    { id: 1, name: "Veg Starter", parent: "Starters", status: "Active" },
    { id: 2, name: "Non Veg Starter", parent: "Starters", status: "Active" },
    { id: 3, name: "Soups", parent: "Starters", status: "Active" },
    { id: 4, name: "Salads", parent: "Starters", status: "Active" },
    { id: 5, name: "Main Course Veg", parent: "Main Course", status: "Active" },
    { id: 6, name: "Main Course Non Veg", parent: "Main Course", status: "Active" },
    { id: 7, name: "Breads", parent: "Main Course", status: "Active" },
    { id: 8, name: "Rice & Biryani", parent: "Main Course", status: "Active" },
    { id: 9, name: "Chinese", parent: "Speciality", status: "Active" },
    { id: 10, name: "South Indian", parent: "Speciality", status: "Active" },
    { id: 11, name: "Snacks", parent: "Quick Bites", status: "Active" },
    { id: 12, name: "Fast Food", parent: "Quick Bites", status: "Active" },
    { id: 13, name: "Combos", parent: "Meals", status: "Active" },
    { id: 14, name: "Thali", parent: "Meals", status: "Active" },
    { id: 15, name: "Breakfast", parent: "Meals", status: "Active" },
    { id: 16, name: "Beverages", parent: "Drinks", status: "Active" },
    { id: 17, name: "Mocktails", parent: "Drinks", status: "Active" },
    { id: 18, name: "Tea & Coffee", parent: "Drinks", status: "Active" },
    { id: 19, name: "Desserts", parent: "Sweet Section", status: "Active" },
    { id: 20, name: "Sweets", parent: "Sweet Section", status: "Active" },
    { id: 21, name: "Ice Cream", parent: "Sweet Section", status: "Active" },
    { id: 22, name: "Jain Food", parent: "Speciality", status: "Active" },
    { id: 23, name: "Kids Menu", parent: "Speciality", status: "Active" },
    { id: 24, name: "Tandoor", parent: "Speciality", status: "Active" },
  ],
  "menu-items": [
    { id: 1, name: "Paneer Butter Masala", category: "Main Course", price: 280, imageUrl: "", description: "Rich tomato gravy with soft paneer cubes.", foodType: "Veg", status: "Available" },
    { id: 2, name: "Veg Thali", category: "Combos", price: 250, imageUrl: "", description: "Complete thali with sabzi, dal, rice and roti.", foodType: "Veg", status: "Available" },
  ],
};
const PRESET_MENU_CATEGORY_OPTIONS = Array.from(
  new Set(
    [
      ...(DEFAULT_MASTER_DATA["menu-categories"] || []).flatMap((item) => [
        String(item.name || "").trim(),
        String(item.parent || "").trim(),
      ]),
      "Starters",
      "Veg Starters",
      "Non Veg Starters",
      "Soups",
      "Salads",
      "Main Course",
      "Main Course Veg",
      "Main Course Non Veg",
      "Breads",
      "Rice",
      "Rice & Biryani",
      "Dal Specials",
      "Tandoor",
      "Chinese",
      "South Indian",
      "North Indian",
      "Punjabi",
      "Jain Food",
      "Breakfast",
      "Snacks",
      "Fast Food",
      "Street Food",
      "Quick Bites",
      "Meals",
      "Combos",
      "Thali",
      "Desserts",
      "Sweets",
      "Ice Cream",
      "Bakery",
      "Beverage",
      "Beverages",
      "Cold Beverages",
      "Hot Beverages",
      "Mocktails",
      "Tea & Coffee",
      "Shakes",
      "Juices",
      "Kids Menu",
      "Chef Specials",
    ].filter(Boolean),
  ),
).sort((a, b) => a.localeCompare(b));

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

function resolveAssetUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${getBackendBaseURL()}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
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
  const cls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-xl text-slate-900 outline-none transition placeholder:text-xl placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100";
  if (field.type === "select") {
    return (
      <select value={value} onChange={(e) => onChange(field.key, e.target.value)} className={cls}>
        <option value="">Select {field.label}</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === "file") {
    return (
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onChange(field.key, e.target.files?.[0] || null)}
        className={cls}
      />
    );
  }
  const datalistId = field.suggestions?.length ? `field-suggestions-${field.key.replace(/[^a-z0-9]/gi, "-").toLowerCase()}` : undefined;
  return (
    <>
      <input type={field.type} value={value} onChange={(e) => onChange(field.key, e.target.value)}
        list={datalistId}
        className={cls} placeholder={field.label} />
      {datalistId ? (
        <datalist id={datalistId}>
          {field.suggestions.map((option) => <option key={option} value={option} />)}
        </datalist>
      ) : null}
    </>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl transition focus-within:-translate-y-0.5 focus-within:border-cyan-200">
      <FaSearch className="shrink-0 text-cyan-500" size={13} />
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-xl outline-none placeholder:text-lg placeholder:text-slate-400" />
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
    <span className={`inline-block rounded-full px-4 py-1.5 text-base font-semibold ${colors[color]}`}>
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
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1.5 text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-base text-slate-400">{sub}</p>}
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
            <h3 className="text-3xl font-semibold">
              {editingId ? `Edit ${title}` : `Add ${title}`}
            </h3>
            {subtitle && <p className="mt-1 text-xl text-white/75">{subtitle}</p>}
          </div>
          {editingId && (
            <button type="button" onClick={onReset}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xl font-medium text-white transition hover:bg-white/20">
              Cancel Edit
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-2 block text-xl font-semibold uppercase tracking-[0.18em] text-slate-500">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            <FormInput field={field} value={draft[field.key] ?? ""}
              onChange={(key, val) => setDraft((c) => ({ ...c, [key]: val }))} />
          </div>
        ))}
      </div>
      <button type="button" onClick={onSave}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-6 py-3.5 text-xl font-semibold text-white shadow-[0_18px_30px_rgba(37,99,235,0.25)] transition hover:-translate-y-0.5">
        <FaPlus size={12} />
        {editingId ? "Update" : "Save"}
      </button>
    </div>
  );
}

function DataTable({ columns, rows, onEdit, onDelete, emptyMessage }) {
  const DATA_TABLE_PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / DATA_TABLE_PAGE_SIZE));
  const paginatedRows = rows.slice(
    (page - 1) * DATA_TABLE_PAGE_SIZE,
    page * DATA_TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [rows, columns]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="overflow-x-auto">
      <table className="min-w-full text-base text-slate-700">
        <thead className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-left text-sm font-semibold uppercase tracking-widest text-slate-500">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-4">{formatLabel(col)}</th>
            ))}
            {(onEdit || onDelete) && <th className="px-4 py-4">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length ? paginatedRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 hover:bg-cyan-50/40 transition">
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 text-slate-700">{row[col] ?? "—"}</td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(row)}
                        className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100">
                        <FaEdit size={10} /> Edit
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" onClick={() => onDelete(row.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100">
                        <FaTrash size={10} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-base text-slate-400">
                {emptyMessage || "No records found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {rows.length > DATA_TABLE_PAGE_SIZE ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-base text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {(page - 1) * DATA_TABLE_PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(page * DATA_TABLE_PAGE_SIZE, rows.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{rows.length}</span> records
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  pageNumber === page
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionTabs({
  activeTab,
  onChange,
  listLabel,
  listHelper,
  formLabel,
  formHelper,
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex flex-wrap gap-3">
        {[
          { id: "list", label: listLabel, helper: listHelper },
          { id: "form", label: formLabel, helper: formHelper },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`min-w-[220px] rounded-[22px] border px-5 py-4 text-left transition ${
                active
                  ? "border-cyan-300 bg-[linear-gradient(135deg,#ecfeff_0%,#dbeafe_100%)] shadow-[0_18px_35px_rgba(14,165,233,0.16)]"
                  : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/60"
              }`}
            >
              <div className={`text-2xl font-black uppercase tracking-[0.18em] ${active ? "text-cyan-700" : "text-slate-700"}`}>
                {tab.label}
              </div>
              <div className={`mt-1 text-xl ${active ? "text-cyan-700/80" : "text-slate-500"}`}>
                {tab.helper}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section: Items ───────────────────────────────────────────────────────────

function ItemsSection({ items, form, setForm, editingId, setEditingId, onSave, onDelete, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter, categories }) {
  const ITEMS_LEDGER_PAGE_SIZE = 10;
  const [ledgerPage, setLedgerPage] = useState(1);
  const [stockTab, setStockTab] = useState("list");

  const visibleItems = items.filter((item) => {
    const matchCat = categoryFilter === "All" || item.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = [item.name, item.category, item.branch].some(
      (v) => String(v || "").toLowerCase().includes(q)
    );
    return matchCat && matchSearch;
  });

  const totalLedgerPages = Math.max(1, Math.ceil(visibleItems.length / ITEMS_LEDGER_PAGE_SIZE));
  const paginatedItems = visibleItems.slice(
    (ledgerPage - 1) * ITEMS_LEDGER_PAGE_SIZE,
    ledgerPage * ITEMS_LEDGER_PAGE_SIZE,
  );

  useEffect(() => {
    setLedgerPage(1);
  }, [searchQuery, categoryFilter, items]);

  useEffect(() => {
    if (ledgerPage > totalLedgerPages) {
      setLedgerPage(totalLedgerPages);
    }
  }, [ledgerPage, totalLedgerPages]);

  useEffect(() => {
    if (editingId) {
      setStockTab("add");
    }
  }, [editingId]);

  const resetStockForm = () => {
    setForm(buildInitialForm(ITEMS_FORM));
    setEditingId(null);
    setStockTab("list");
  };

  const handleSaveStock = async () => {
    const saved = await onSave();
    if (saved) {
      setStockTab("list");
    }
  };

  const handleEditStock = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      category: item.category || "",
      stock: item.stock || "",
      unit: item.unit || "",
      price: item.price || "",
      reorderPoint: item.reorderPoint || "",
      expiry: item.expiry ? String(item.expiry).split("T")[0] : "",
      branch: item.branch || "",
    });
    setStockTab("add");
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap gap-3">
          {[
            { id: "list", label: "Stock List", helper: "Current stock table and records" },
            {
              id: "add",
              label: editingId ? "Edit Stock" : "Add Stock",
              helper: editingId ? "Update the selected stock item" : "Open form to add new stock",
            },
          ].map((tab) => {
            const active = stockTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStockTab(tab.id)}
                className={`min-w-[220px] rounded-[22px] border px-5 py-4 text-left transition ${
                  active
                    ? "border-cyan-300 bg-[linear-gradient(135deg,#ecfeff_0%,#dbeafe_100%)] shadow-[0_18px_35px_rgba(14,165,233,0.16)]"
                    : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/60"
                }`}
              >
                <div className={`text-lg font-black uppercase tracking-[0.18em] ${active ? "text-cyan-700" : "text-slate-700"}`}>
                  {tab.label}
                </div>
                <div className={`mt-1 text-sm ${active ? "text-cyan-700/80" : "text-slate-500"}`}>
                  {tab.helper}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-1">
        {stockTab === "add" ? (
        <FormPanel
          title="Stock Item"
          subtitle="Use this tab to add or update inventory stock"
          fields={ITEMS_FORM}
          draft={form}
          setDraft={setForm}
          editingId={editingId}
          onSave={handleSaveStock}
          onReset={resetStockForm}
        />
        ) : null}

        {stockTab === "list" ? (
        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">Items Ledger</h3>
              <p className="text-lg text-slate-400">{items.length} total items loaded from backend</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="w-full sm:w-60">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search item / store" />
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-lg text-slate-700 shadow-[0_16px_35px_rgba(15,23,42,0.06)]">
                <FaFilter size={12} className="text-cyan-500" />
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent text-lg outline-none">
                  <option value="All">All Categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-[26px] border border-slate-200/80">
            <table className="min-w-full text-lg">
              <thead className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-left text-base font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Reorder</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length ? paginatedItems.map((item) => {
                  const low = isLowStock(item);
                  const expStatus = getExpiryStatus(item.expiry);
                  return (
                    <tr key={item.id} className={`border-t border-slate-100 hover:bg-cyan-50/40 transition ${low ? "bg-amber-50/40" : ""}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-semibold text-slate-900">{item.name}</span>
                          {low && <FaExclamationTriangle className="text-amber-500" size={11} title="Low stock" />}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-lg text-slate-600">{item.category}</td>
                      <td className="px-4 py-4">
                        <span className={`text-lg font-semibold ${low ? "text-amber-600" : "text-slate-900"}`}>
                          {item.stock} <span className="text-base font-normal text-slate-400">{item.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-base text-slate-500">{item.reorderPoint || 10} {item.unit}</td>
                      <td className="px-4 py-4 text-lg text-slate-700">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-4">
                        {expStatus
                          ? <span className={`inline-block rounded-full border px-3 py-1.5 text-base font-semibold ${expStatus.color}`}>{expStatus.label}</span>
                          : item.expiry ? <span className="text-base text-slate-400">{String(item.expiry).split("T")[0]}</span> : <span className="text-base text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-4 text-lg text-slate-600">{item.branch}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEditStock(item)}
                            className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-base font-semibold text-cyan-700 transition hover:bg-cyan-100">
                            <FaEdit size={10} /> Edit
                          </button>
                          <button type="button" onClick={() => onDelete(item.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-base font-semibold text-red-600 transition hover:bg-red-100">
                            <FaTrash size={10} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-lg text-slate-400">No matching inventory items.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {visibleItems.length > ITEMS_LEDGER_PAGE_SIZE ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-base text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {(ledgerPage - 1) * ITEMS_LEDGER_PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(ledgerPage * ITEMS_LEDGER_PAGE_SIZE, visibleItems.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-900">{visibleItems.length}</span> items
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLedgerPage((current) => Math.max(1, current - 1))}
                  disabled={ledgerPage === 1}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                {Array.from({ length: totalLedgerPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setLedgerPage(pageNumber)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                      pageNumber === ledgerPage
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setLedgerPage((current) => Math.min(totalLedgerPages, current + 1))}
                  disabled={ledgerPage === totalLedgerPages}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Section: Generic Master ──────────────────────────────────────────────────

function GenericMasterSection({ section, records, onSave, onEdit, onDelete, draft, setDraft, editingId, searchQuery, setSearchQuery }) {
  const fields = MASTER_FIELDS[section.id];
  const columns = MASTER_TABLE_COLUMNS[section.id];
  const [activeTab, setActiveTab] = useState("form");
  const subtitle = API_BACKED_MASTER_SECTIONS.has(section.id)
    ? "Synced with inventory backend API"
    : "Stored in local inventory workspace";
  const filtered = records.filter((r) =>
    Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    setActiveTab("form");
  }, [section.id]);

  useEffect(() => {
    if (editingId) {
      setActiveTab("form");
    }
  }, [editingId]);

  const handleSave = async () => {
    const saved = await onSave();
    if (saved) {
      setActiveTab("list");
    }
  };

  const handleReset = () => {
    setDraft(buildInitialForm(fields));
    onEdit(null);
    setActiveTab("list");
  };

  const handleEdit = (record) => {
    onEdit(record);
    setActiveTab("form");
  };

  return (
    <div className="space-y-5">
      <SectionTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        listLabel={`${section.label} Register`}
        listHelper={`View all ${section.label.toLowerCase()} records`}
        formLabel={editingId ? `Edit ${section.label}` : `Add ${section.label}`}
        formHelper={editingId ? "Update selected record" : "Open form to create a new record"}
      />
      {activeTab === "form" ? (
        <FormPanel
          title={section.label}
          subtitle={subtitle}
          fields={fields}
          draft={draft}
          setDraft={setDraft}
          editingId={editingId}
          onSave={handleSave}
          onReset={handleReset}
        />
      ) : null}
      {activeTab === "list" ? (
        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{section.label} Register</h3>
              <p className="text-base text-slate-400">{records.length} records</p>
            </div>
            <div className="w-64">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={`Search ${section.label.toLowerCase()}`} />
            </div>
          </div>
          <DataTable columns={columns} rows={filtered} onEdit={handleEdit} onDelete={onDelete} emptyMessage="No matching records found." />
        </div>
      ) : null}
    </div>
  );
}

// ─── Section: Purchase Orders (PO / GRN) ─────────────────────────────────────

function MenuItemsSection({ records, draft, setDraft, editingId, onSave, onEdit, onDelete, searchQuery, setSearchQuery, menuCategoryOptions }) {
  const MENU_LIBRARY_PAGE_SIZE = 8;
  const [activeTab, setActiveTab] = useState("form");
  const filtered = records.filter((record) =>
    Object.values(record).some((value) => String(value ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const [menuPages, setMenuPages] = useState({});
  const previewImage = useMemo(() => {
    if (draft.imageFile instanceof File) {
      return URL.createObjectURL(draft.imageFile);
    }
    return resolveAssetUrl(draft.imageUrl);
  }, [draft.imageFile, draft.imageUrl]);

  useEffect(() => {
    if (!previewImage || !(draft.imageFile instanceof File)) return undefined;
    return () => URL.revokeObjectURL(previewImage);
  }, [draft.imageFile, previewImage]);

  useEffect(() => {
    setMenuPages({});
  }, [records, searchQuery]);

  useEffect(() => {
    if (editingId) {
      setActiveTab("form");
    }
  }, [editingId]);

  const handleSave = async () => {
    const saved = await onSave();
    if (saved) {
      setActiveTab("list");
    }
  };

  const handleReset = () => {
    setDraft(buildInitialForm(MENU_ITEM_FIELDS));
    onEdit(null);
    setActiveTab("list");
  };

  const handleEdit = (record) => {
    onEdit(record);
    setActiveTab("form");
  };

  const grouped = filtered.reduce((acc, item) => {
    const key = item.category || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <SectionTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        listLabel="Menu Library"
        listHelper="Browse saved menu cards"
        formLabel={editingId ? "Edit Menu Item" : "Add Menu Item"}
        formHelper={editingId ? "Update the selected dish card" : "Open form to create a new menu item"}
      />
      {activeTab === "form" ? (
        <div className="space-y-5">
          <FormPanel
            title="Menu Item"
            subtitle="Manage category-wise dish cards from the inventory module."
            fields={MENU_ITEM_FIELDS.map((field) =>
              field.key === "category"
                ? {
                    ...field,
                    type: "select",
                    options: Array.from(
                      new Set(
                        [
                          ...menuCategoryOptions,
                          String(draft.category || "").trim(),
                        ].filter(Boolean),
                      ),
                    ).sort((a, b) => a.localeCompare(b)),
                  }
                : field
            )}
            draft={draft}
            setDraft={setDraft}
            editingId={editingId}
            onSave={handleSave}
            onReset={handleReset}
          />
          {previewImage ? (
            <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.10)]">
              <div className="relative h-52 overflow-hidden bg-slate-100 sm:h-56">
                <img
                  src={previewImage}
                  alt={draft.name || "Menu preview"}
                  className="block h-full w-full object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/40 via-slate-950/10 to-transparent" />
                <div className="absolute left-3 top-3">
                  <Badge color="cyan">{draft.category || "Menu item"}</Badge>
                </div>
                <div className="absolute right-3 top-3">
                  <Badge color={String(draft.status || "").toLowerCase().includes("out") ? "red" : "green"}>
                    {draft.status || "Available"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 bg-gradient-to-b from-white to-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{draft.name || "Dish image preview"}</div>
                    <div className="mt-1 min-h-[40px] text-sm leading-5 text-slate-500">
                      {draft.description || (draft.imageFile instanceof File ? "Selected image upload ke saath save hogi." : "Saved image preview.")}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={String(draft.foodType || "").toLowerCase().includes("non") ? "red" : "green"}>
                    {draft.foodType || "Veg"}
                  </Badge>
                  <Badge color="amber">{formatCurrency(draft.price || 0)}</Badge>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "list" ? (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-3xl font-semibold text-slate-900">Menu card library</h3>
                <p className="text-xl text-slate-400">{records.length} dishes ready to manage</p>
              </div>
              <div className="w-80">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search dish / category / food type" />
              </div>
            </div>
          </div>

          {Object.keys(grouped).length ? Object.entries(grouped).map(([category, items]) => {
            const currentPage = menuPages[category] || 1;
            const totalPages = Math.max(1, Math.ceil(items.length / MENU_LIBRARY_PAGE_SIZE));
            const paginatedItems = items.slice(
              (currentPage - 1) * MENU_LIBRARY_PAGE_SIZE,
              currentPage * MENU_LIBRARY_PAGE_SIZE,
            );

            return (
              <div key={category} className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500">Category</div>
                    <h3 className="mt-1 text-2xl font-semibold text-slate-900">{category}</h3>
                  </div>
                  <Badge color="cyan">{items.length} items</Badge>
                </div>

                <div className="overflow-hidden rounded-[22px] border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white text-left text-lg">
                      <thead className="bg-slate-50 text-sm uppercase tracking-[0.16em] text-slate-500">
                        <tr>
                          <th className="px-4 py-4">Image</th>
                          <th className="px-4 py-4">Item</th>
                          <th className="px-4 py-4">Category</th>
                          <th className="px-4 py-4">Food Type</th>
                          <th className="px-4 py-4">Price</th>
                          <th className="px-4 py-4">Status</th>
                          <th className="px-4 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((item) => (
                          <tr key={item.id} className="border-t border-slate-200 align-top">
                            <td className="px-4 py-4">
                              <div className="flex justify-center">
                                {item.imageUrl ? (
                                  <img
                                    src={resolveAssetUrl(item.imageUrl)}
                                    alt={item.name}
                                    className="h-20 w-20 rounded-2xl border border-slate-200 object-cover object-center shadow-sm"
                                  />
                                ) : (
                                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-cyan-200 bg-[linear-gradient(135deg,#dbeafe_0%,#f8fafc_100%)] text-base font-semibold text-slate-400">
                                    No Image
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-xl font-bold text-slate-900">{item.name}</div>
                              <div className="mt-1 max-w-[320px] text-base leading-6 text-slate-500">
                                {item.description || "No description added yet."}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-slate-700">{item.category || "Menu item"}</td>
                            <td className="px-4 py-4">
                              <Badge color={String(item.foodType || "").toLowerCase().includes("non") ? "red" : "green"}>
                                {item.foodType || "Veg"}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 font-bold text-slate-900">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-4">
                              <Badge color={String(item.status || "").toLowerCase().includes("out") ? "red" : "green"}>
                                {item.status || "Available"}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-center gap-2">
                                <button type="button" onClick={() => handleEdit(item)}
                                  className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-base font-semibold text-cyan-700 hover:bg-cyan-100 transition">
                                  <FaEdit size={10} /> Edit
                                </button>
                                <button type="button" onClick={() => onDelete(item.id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-base font-semibold text-red-600 hover:bg-red-100 transition">
                                  <FaTrash size={10} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {items.length > MENU_LIBRARY_PAGE_SIZE ? (
                    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xl text-slate-500">
                        Showing{" "}
                        <span className="font-semibold text-slate-900">
                          {(currentPage - 1) * MENU_LIBRARY_PAGE_SIZE + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold text-slate-900">
                          {Math.min(currentPage * MENU_LIBRARY_PAGE_SIZE, items.length)}
                        </span>{" "}
                        of <span className="font-semibold text-slate-900">{items.length}</span> items
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuPages((current) => ({
                              ...current,
                              [category]: Math.max(1, (current[category] || 1) - 1),
                            }))
                          }
                          disabled={currentPage === 1}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>

                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() =>
                              setMenuPages((current) => ({
                                ...current,
                                [category]: pageNumber,
                              }))
                            }
                            className={`rounded-full px-4 py-2.5 text-base font-semibold transition ${
                              pageNumber === currentPage
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            setMenuPages((current) => ({
                              ...current,
                              [category]: Math.min(totalPages, (current[category] || 1) + 1),
                            }))
                          }
                          disabled={currentPage === totalPages}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center text-sm text-slate-500 shadow-[0_24px_60px_rgba(15,23,42,0.07)]">
              No menu items yet. Left side form se first dish save karo.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PurchaseOrderSection({ records, onSave, onEdit, onDelete, draft, setDraft, editingId, searchQuery, setSearchQuery }) {
  const [activeTab, setActiveTab] = useState("form");
  const filtered = records.filter((r) =>
    Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const poColumns = ["poNumber", "vendor", "itemName", "quantity", "unit", "rate", "expectedDate", "status"];

  useEffect(() => {
    if (editingId) {
      setActiveTab("form");
    }
  }, [editingId]);

  const handleSave = async () => {
    const saved = await onSave();
    if (saved) {
      setActiveTab("list");
    }
  };

  const handleReset = () => {
    setDraft(buildInitialForm(PO_FIELDS));
    onEdit(null);
    setActiveTab("list");
  };

  const handleEdit = (record) => {
    onEdit(record);
    setActiveTab("form");
  };

  return (
    <div className="space-y-5">
      <SectionTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        listLabel="PO Register"
        listHelper="View purchase order history"
        formLabel={editingId ? "Edit PO" : "Add PO"}
        formHelper={editingId ? "Update selected purchase order" : "Open form to create a purchase order"}
      />
      {activeTab === "form" ? (
        <FormPanel
          title="Purchase Order"
          subtitle="Create PO → Send to vendor → Mark GRN Received"
          fields={PO_FIELDS}
          draft={draft}
          setDraft={setDraft}
          editingId={editingId}
          onSave={handleSave}
          onReset={handleReset}
        />
      ) : null}
      {activeTab === "list" ? (
        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-3xl font-semibold text-slate-900">Purchase Order Register</h3>
              <p className="text-xl text-slate-400">{records.length} purchase orders</p>
            </div>
            <div className="w-80">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search PO / vendor" />
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-lg">
              <thead className="bg-slate-50 text-sm font-semibold uppercase tracking-widest text-slate-400 text-left">
                <tr>
                  {poColumns.map((col) => <th key={col} className="px-4 py-4">{formatLabel(col)}</th>)}
                  <th className="px-4 py-4">Actions</th>
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
                      <td className="px-4 py-4 font-semibold text-slate-900">{row.poNumber}</td>
                      <td className="px-4 py-4 text-slate-700">{row.vendor}</td>
                      <td className="px-4 py-4 text-slate-700">{row.itemName}</td>
                      <td className="px-4 py-4">{row.quantity}</td>
                      <td className="px-4 py-4 text-slate-500">{row.unit}</td>
                      <td className="px-4 py-4">{formatCurrency(row.rate)}</td>
                      <td className="px-4 py-4 text-base text-slate-500">{row.expectedDate || "—"}</td>
                      <td className="px-4 py-4">
                        <Badge color={statusColors[row.status] || "gray"}>{row.status}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEdit(row)}
                            className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-base font-semibold text-cyan-700 hover:bg-cyan-100 transition">
                            <FaEdit size={10} /> Edit
                          </button>
                          <button type="button" onClick={() => onDelete(row.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-base font-semibold text-red-600 hover:bg-red-100 transition">
                            <FaTrash size={10} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-xl text-slate-400">No purchase orders found. Create your first PO above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Section: Waste / Spoilage Log ────────────────────────────────────────────

function WasteLogSection({ records, onSave, onEdit, onDelete, draft, setDraft, editingId, searchQuery, setSearchQuery }) {
  const [activeTab, setActiveTab] = useState("form");
  const filtered = records.filter((r) =>
    Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const wasteColumns = ["itemName", "quantity", "unit", "reason", "store", "remarks", "date"];
  const totalWaste = records.reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  useEffect(() => {
    if (editingId) {
      setActiveTab("form");
    }
  }, [editingId]);

  const handleSave = async () => {
    const saved = await onSave();
    if (saved) {
      setActiveTab("list");
    }
  };

  const handleReset = () => {
    setDraft(buildInitialForm(WASTE_FIELDS));
    onEdit(null);
    setActiveTab("list");
  };

  const handleEdit = (record) => {
    onEdit(record);
    setActiveTab("form");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Waste Entries" value={records.length} tone="red" />
        <MetricCard label="Total Qty Wasted" value={totalWaste} sub="units across all items" tone="amber" />
        <MetricCard label="Top Reason" value={records.length ? records.reduce((acc, r) => { acc[r.reason] = (acc[r.reason] || 0) + 1; return acc; }, {}) && Object.entries(records.reduce((acc, r) => { acc[r.reason] = (acc[r.reason] || 0) + 1; return acc; }, {})).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—" : "—"} tone="default" />
      </div>
      <SectionTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        listLabel="Waste Register"
        listHelper="View all waste and spoilage entries"
        formLabel={editingId ? "Edit Waste" : "Add Waste"}
        formHelper={editingId ? "Update selected waste entry" : "Open form to log a new waste entry"}
      />
      {activeTab === "form" ? (
        <FormPanel
          title="Waste / Spoilage Entry"
          subtitle="Log expired, damaged or wasted items"
          fields={WASTE_FIELDS}
          draft={draft}
          setDraft={setDraft}
          editingId={editingId}
          onSave={handleSave}
          onReset={handleReset}
        />
      ) : null}
      {activeTab === "list" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Waste Log Register</h3>
              <p className="text-base text-slate-400">{records.length} entries recorded</p>
            </div>
            <div className="w-64">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search waste entry" />
            </div>
          </div>
          <DataTable columns={wasteColumns} rows={filtered} onEdit={handleEdit} onDelete={onDelete} emptyMessage="No waste entries recorded." />
        </div>
      ) : null}
    </div>
  );
}

// ─── Section: Stock Audit ─────────────────────────────────────────────────────

function StockAuditSection({ items, onSubmit, isSubmitting }) {
  const [auditData, setAuditData] = useState(() =>
    items.map((item) => ({
      id: item.id, name: item.name, category: item.category, branch: item.branch,
      unit: item.unit, systemStock: item.stock, physicalStock: "", remarks: "",
    }))
  );
  const [submitted, setSubmitted] = useState(false);
  const [showValidationNotice, setShowValidationNotice] = useState(false);

  useEffect(() => {
    setAuditData(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        branch: item.branch,
        unit: item.unit,
        systemStock: item.stock,
        physicalStock: "",
        remarks: "",
      }))
    );
    setSubmitted(false);
    setShowValidationNotice(false);
  }, [items]);

  const handlePhysicalChange = (id, val) => {
    if (showValidationNotice && val !== "") {
      setShowValidationNotice(false);
    }
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

  const handleSubmit = async () => {
    const entries = auditResults.filter((row) => row.physicalStock !== "");
    if (!entries.length) {
      setShowValidationNotice(true);
      return;
    }

    setShowValidationNotice(false);
    const success = await onSubmit(entries);
    if (success) {
      setSubmitted(true);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-amber-200/80 bg-[linear-gradient(135deg,#fff7ed_0%,#fef3c7_100%)] px-5 py-4 shadow-[0_18px_40px_rgba(245,158,11,0.12)] flex items-start gap-3">
        <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-base font-semibold text-amber-800">Physical Stock Audit Mode</p>
          <p className="mt-0.5 text-sm text-amber-600">Enter physical count for each item. System will calculate variance automatically.</p>
        </div>
      </div>

      {submitted && withVariance.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-base font-semibold text-red-700">{withVariance.length} variance(s) detected</p>
          <div className="space-y-1">
            {withVariance.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm text-red-600">
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
            <h3 className="text-xl font-semibold text-slate-900">Physical Count Sheet</h3>
            <p className="text-base text-slate-400">{items.length} items to audit</p>
          </div>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:opacity-90">
            <FaCheckCircle size={13} /> {isSubmitting ? "Submitting..." : "Submit Audit"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-lg">
            <thead className="bg-slate-50 text-sm font-semibold uppercase tracking-widest text-slate-400 text-left">
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

      {showValidationNotice ? (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={() => setShowValidationNotice(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-amber-200/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-[radial-gradient(circle_at_top_left,#fef3c7_0%,#fff7ed_42%,#ffffff_100%)] px-6 pb-5 pt-6">
              <button
                type="button"
                onClick={() => setShowValidationNotice(false)}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-500 shadow-sm transition hover:text-slate-700"
              >
                <FaTimes />
              </button>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-amber-700">
                <FaExclamationTriangle className="text-amber-500" />
                Audit Notice
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] text-white shadow-[0_20px_40px_rgba(249,115,22,0.28)]">
                  <FaClipboardList size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Physical count missing</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Submit karne se pehle kam se kam ek item ka physical count enter kijiye. Tabhi audit variance calculate hoga.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4">
              <div className="rounded-[22px] border border-amber-100 bg-[linear-gradient(135deg,#fffbeb_0%,#fff7ed_100%)] p-4">
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">Quick fix</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Table me kisi bhi row ke <span className="font-semibold text-slate-800">Physical Count</span> field ko fill karke dubara
                  <span className="font-semibold text-slate-800"> Submit Audit</span> dabaiye.
                </p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowValidationNotice(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_30px_rgba(249,115,22,0.24)] transition hover:scale-[1.01] hover:shadow-[0_22px_36px_rgba(249,115,22,0.28)]"
                >
                  <FaCheckCircle size={14} />
                  OK, I'll add count
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Section: Reports ─────────────────────────────────────────────────────────

function ReportSection({ title, subtitle, columns, rows }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-base text-slate-400">{subtitle}</p>}
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
        <h4 className="text-lg font-semibold text-amber-800">Inventory Alerts</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {lowItems.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-700">
            <FaExclamationTriangle size={10} />
            {item.name}: {item.stock} {item.unit} left
          </span>
        ))}
        {expiredItems.map((item) => (
          <span key={`exp-${item.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-3 py-1 text-sm font-medium text-red-700">
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
      acc[key] = API_BACKED_MASTER_SECTIONS.has(key)
        ? []
        : loadStoredValue(STORAGE_KEYS[key], DEFAULT_MASTER_DATA[key] || []);
      return acc;
    }, {})
  );
  const [masterDraft, setMasterDraft] = useState({});
  const [editingMasterId, setEditingMasterId] = useState(null);
  const [menuDraft, setMenuDraft] = useState(buildInitialForm(MENU_ITEM_FIELDS));
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [menuItemsData, setMenuItemsData] = useState([]);
  const [auditReportRows, setAuditReportRows] = useState([]);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState(NAVIGATION_GROUPS[0]?.label || "");

  // Load inventory items from API
  useEffect(() => {
    const load = async () => {
      try {
        setItemsLoading(true);
        const masterSectionEntries = await Promise.all(
          Object.entries(INVENTORY_MASTER_API_SECTION_MAP).map(async ([sectionKey, apiSectionKey]) => {
            const records = await fetchInventoryMasterRecords(apiSectionKey);
            return [sectionKey, records];
          }),
        );
        const [
          inventoryRes,
          menuRes,
          wasteRes,
          purchaseOrdersRes,
          transfersRes,
          auditReportRes,
        ] = await Promise.all([
          API.get("/inventory"),
          API.get("/restaurant/menu"),
          API.get("/inventory/waste"),
          API.get("/inventory/purchase-orders"),
          API.get("/inventory/transfers"),
          API.get("/inventory/audit/report"),
        ]);
        const nextMasterSections = Object.fromEntries(masterSectionEntries);
        setInventoryItems(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
        setMenuItemsData(
          (Array.isArray(menuRes.data) ? menuRes.data : []).map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category || "",
            price: Number(item.price || 0),
            imageUrl: item.image_url || item.imageUrl || "",
            description: item.description || "",
            foodType: item.food_type || item.foodType || "Veg",
            status: item.availability_status || item.status || "Available",
          })),
        );
        setMasterData((cur) => ({
          ...cur,
          ...nextMasterSections,
          "waste-log": Array.isArray(wasteRes.data) ? wasteRes.data : [],
          "purchase-orders": Array.isArray(purchaseOrdersRes.data)
            ? purchaseOrdersRes.data
            : [],
          "stock-transfer": Array.isArray(transfersRes.data) ? transfersRes.data : [],
        }));
        setAuditReportRows(
          Array.isArray(auditReportRes.data) ? auditReportRes.data : []
        );
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
      if (API_BACKED_MASTER_SECTIONS.has(key)) return;
      localStorage.setItem(storageKey, JSON.stringify(masterData[key] || []));
    });
  }, [masterData]);

  const refreshWasteLogs = useCallback(async () => {
    const response = await API.get("/inventory/waste");
    setMasterData((cur) => ({
      ...cur,
      "waste-log": Array.isArray(response.data) ? response.data : [],
    }));
  }, []);

  const refreshPurchaseOrders = useCallback(async () => {
    const response = await API.get("/inventory/purchase-orders");
    setMasterData((cur) => ({
      ...cur,
      "purchase-orders": Array.isArray(response.data) ? response.data : [],
    }));
  }, []);

  const refreshTransfers = useCallback(async () => {
    const response = await API.get("/inventory/transfers");
    setMasterData((cur) => ({
      ...cur,
      "stock-transfer": Array.isArray(response.data) ? response.data : [],
    }));
  }, []);

  const refreshAuditReport = useCallback(async () => {
    const response = await API.get("/inventory/audit/report");
    setAuditReportRows(Array.isArray(response.data) ? response.data : []);
  }, []);

  const refreshMasterSection = useCallback(async (sectionKey) => {
    const apiSectionKey = INVENTORY_MASTER_API_SECTION_MAP[sectionKey];
    if (!apiSectionKey) return;

    const records = await fetchInventoryMasterRecords(apiSectionKey);
    setMasterData((cur) => ({
      ...cur,
      [sectionKey]: records,
    }));
  }, []);

  // Reset form on section switch
  useEffect(() => {
    const section = INVENTORY_SECTIONS.find((s) => s.id === activeSection);
    if (!section) return;
    const fields = section.type === "master" ? MASTER_FIELDS[activeSection] || [] : [];
    setMasterDraft(buildInitialForm(fields));
    setEditingMasterId(null);
    if (section.type === "menu") {
      setMenuDraft(buildInitialForm(MENU_ITEM_FIELDS));
      setEditingMenuId(null);
    }
    setSectionSearch("");
  }, [activeSection]);

  useEffect(() => {
    const parentGroup = NAVIGATION_GROUPS.find((group) => group.ids.includes(activeSection));
    if (!parentGroup) return;
    setOpenNavGroup(parentGroup.label);
  }, [activeSection]);

  const categories = useMemo(
    () => [...new Set(inventoryItems.map((i) => i.category).filter(Boolean))].sort(),
    [inventoryItems]
  );

  const menuCategoryOptions = useMemo(() => {
    const optionMap = new Map();

    [
      ...PRESET_MENU_CATEGORY_OPTIONS,
      ...(masterData["menu-categories"] || []).map((item) => String(item.name || "").trim()),
      ...menuItemsData.map((item) => String(item.category || "").trim()),
      String(menuDraft.category || "").trim(),
    ]
      .filter(Boolean)
      .forEach((category) => {
        const key = category.toLowerCase();
        if (!optionMap.has(key)) {
          optionMap.set(key, category);
        }
      });

    return Array.from(optionMap.values()).sort((a, b) => a.localeCompare(b));
  }, [masterData, menuDraft.category, menuItemsData]);

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
      "item-audit": auditReportRows.map((row) => ({
        item: row.itemName,
        auditDate: row.auditDate || "---",
        physicalStock: `${Number(row.physicalStock || 0)} ${row.unit || ""}`.trim(),
        systemStock: `${Number(row.systemStock || 0)} ${row.unit || ""}`.trim(),
        variance: `${Number(row.variance || 0) > 0 ? "+" : ""}${Number(row.variance || 0)} ${row.unit || ""}`.trim(),
        status: Number(row.variance || 0) === 0 ? "Matched" : "Review",
        remarks: row.remarks || "---",
      })),
    };
  }, [auditReportRows, inventoryItems, masterData]);

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
    "item-audit": { title:"Item Audit Report", subtitle:"Saved audit report from inventory backend",
      columns:[{key:"item"},{key:"auditDate"},{key:"physicalStock"},{key:"systemStock"},{key:"variance"},{key:"status"},{key:"remarks"}] },
  };

  // ── Master CRUD helpers ───────────────────────────────────
  const saveMasterRecord = useCallback(() => {
    const run = async () => {
      const isPoSection = activeSection === "purchase-orders";
      const isWasteSection = activeSection === "waste-log";
      const isTransferSection = activeSection === "stock-transfer";
      const inventoryMasterApiSection = INVENTORY_MASTER_API_SECTION_MAP[activeSection];
      const relevantFields = isPoSection
        ? PO_FIELDS
        : isWasteSection
          ? WASTE_FIELDS
          : (MASTER_FIELDS[activeSection] || []);

      const missing = relevantFields.some((f) => f.required && !String(masterDraft[f.key] ?? "").trim());
      if (missing) {
        alert("Please fill all required fields.");
        return false;
      }

      const payload = relevantFields.reduce((acc, f) => {
        acc[f.key] = masterDraft[f.key];
        return acc;
      }, {});

      if (isPoSection) {
        payload.quantity = Number(payload.quantity || 0);
        payload.rate = Number(payload.rate || 0);
      }
      if (isWasteSection || isTransferSection) {
        payload.quantity = Number(payload.quantity || 0);
      }

      try {
        if (isPoSection) {
          if (editingMasterId) {
            await API.put(`/inventory/purchase-orders/${editingMasterId}`, payload);
          } else {
            await API.post("/inventory/purchase-orders", payload);
          }
          await refreshPurchaseOrders();
        } else if (isWasteSection) {
          if (editingMasterId) {
            await API.put(`/inventory/waste/${editingMasterId}`, payload);
          } else {
            await API.post("/inventory/waste", payload);
          }
          await refreshWasteLogs();
        } else if (isTransferSection) {
          if (editingMasterId) {
            await API.put(`/inventory/transfers/${editingMasterId}`, payload);
          } else {
            await API.post("/inventory/transfers", payload);
          }
          await refreshTransfers();
        } else if (inventoryMasterApiSection) {
          if (editingMasterId) {
            await updateInventoryMasterRecord(inventoryMasterApiSection, editingMasterId, payload);
          } else {
            await createInventoryMasterRecord(inventoryMasterApiSection, payload);
          }
          await refreshMasterSection(activeSection);
        } else {
          setMasterData((cur) => {
            const list = cur[activeSection] || [];
            if (editingMasterId) {
              return {
                ...cur,
                [activeSection]: list.map((r) => r.id === editingMasterId ? { ...r, ...payload } : r),
              };
            }
            return { ...cur, [activeSection]: [...list, { id: Date.now(), ...payload }] };
          });
        }

        setMasterDraft(buildInitialForm(relevantFields));
        setEditingMasterId(null);
        return true;
      } catch (err) {
        alert(err.response?.data?.message || "Record save nahi ho paaya.");
        return false;
      }
    };

    return run();
  }, [
    activeSection,
    editingMasterId,
    masterDraft,
    refreshMasterSection,
    refreshPurchaseOrders,
    refreshTransfers,
    refreshWasteLogs,
  ]);

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
    const run = async () => {
      try {
        if (activeSection === "purchase-orders") {
          await API.delete(`/inventory/purchase-orders/${id}`);
          await refreshPurchaseOrders();
        } else if (activeSection === "waste-log") {
          await API.delete(`/inventory/waste/${id}`);
          await refreshWasteLogs();
        } else if (activeSection === "stock-transfer") {
          await API.delete(`/inventory/transfers/${id}`);
          await refreshTransfers();
        } else if (INVENTORY_MASTER_API_SECTION_MAP[activeSection]) {
          await deleteInventoryMasterRecord(INVENTORY_MASTER_API_SECTION_MAP[activeSection], id);
          await refreshMasterSection(activeSection);
        } else {
          setMasterData((cur) => ({
            ...cur,
            [activeSection]: (cur[activeSection] || []).filter((r) => r.id !== id),
          }));
        }
      } catch (err) {
        alert(err.response?.data?.message || "Record delete nahi ho paaya.");
      }
    };

    run();
  }, [activeSection, refreshMasterSection, refreshPurchaseOrders, refreshTransfers, refreshWasteLogs]);

  const submitInventoryAudit = useCallback(async (entries) => {
    const payloadEntries = entries.map((entry) => ({
      itemId: entry.id,
      itemName: entry.name,
      systemStock: Number(entry.systemStock || 0),
      physicalStock: Number(entry.physicalStock || 0),
      variance: Number(entry.variance || 0),
      unit: entry.unit || "",
      remarks: entry.remarks || "",
    }));

    try {
      setIsSubmittingAudit(true);
      const response = await API.post("/inventory/audit", { entries: payloadEntries });
      await refreshAuditReport();
      alert(response.data?.message || "Audit submitted successfully.");
      return true;
    } catch (err) {
      alert(err.response?.data?.message || "Audit submit nahi ho paaya.");
      return false;
    } finally {
      setIsSubmittingAudit(false);
    }
  }, [refreshAuditReport]);

  const saveMenuItem = useCallback(() => {
    const run = async () => {
      const missing = MENU_ITEM_FIELDS.filter((field) => field.required).some((field) => {
        if (field.key === "imageFile") return false;
        return !String(menuDraft[field.key] ?? "").trim();
      });
      if (missing) {
        alert("Please fill all required menu item fields.");
        return false;
      }

      const formData = new FormData();
      formData.append("name", menuDraft.name || "");
      formData.append("category", menuDraft.category || "");
      formData.append("price", String(Number(menuDraft.price || 0)));
      formData.append("description", menuDraft.description || "");
      formData.append("foodType", menuDraft.foodType || "Veg");
      formData.append("status", menuDraft.status || "Available");
      formData.append("imageUrl", menuDraft.imageUrl || "");
      if (menuDraft.imageUrl) {
        formData.append("existingImageUrl", menuDraft.imageUrl);
      }
      if (menuDraft.imageFile instanceof File) {
        formData.append("image", menuDraft.imageFile);
      }

      try {
        let nextId = editingMenuId;
        if (editingMenuId) {
          await API.put(`/restaurant/menu/${editingMenuId}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          const response = await API.post("/restaurant/menu", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          nextId = response.data?.id || null;
        }

        const menuRes = await API.get("/restaurant/menu");
        const nextMenuItems = (Array.isArray(menuRes.data) ? menuRes.data : []).map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category || "",
          price: Number(item.price || 0),
          imageUrl: item.image_url || item.imageUrl || "",
          description: item.description || "",
          foodType: item.food_type || item.foodType || "Veg",
          status: item.availability_status || item.status || "Available",
        }));
        setMenuItemsData(nextMenuItems);

        const normalizedCategory = String(menuDraft.category || "").trim();
        if (normalizedCategory) {
          const existingCategories = masterData["menu-categories"] || [];
          const hasCategory = existingCategories.some(
            (item) => String(item.name || "").trim().toLowerCase() === normalizedCategory.toLowerCase(),
          );
          if (!hasCategory) {
            await createInventoryMasterRecord("menu-categories", {
              name: normalizedCategory,
              parent: "Custom",
              status: "Active",
            });
            await refreshMasterSection("menu-categories");
          }
        }

        setMenuDraft(buildInitialForm(MENU_ITEM_FIELDS));
        setEditingMenuId(null);
        return true;
      } catch (err) {
        alert(err.response?.data?.message || "Menu item save nahi ho paaya.");
        return false;
      }
    };

    return run();
  }, [editingMenuId, masterData, menuDraft, refreshMasterSection]);

  const editMenuItem = useCallback((record) => {
    if (!record) {
      setEditingMenuId(null);
      setMenuDraft(buildInitialForm(MENU_ITEM_FIELDS));
      return;
    }
    setEditingMenuId(record.id);
    setMenuDraft({ ...buildInitialForm(MENU_ITEM_FIELDS), ...record, imageFile: null });
  }, []);

  const deleteMenuItem = useCallback((id) => {
    const run = async () => {
      try {
        await API.delete(`/restaurant/menu/${id}`);
        setMenuItemsData((cur) => cur.filter((item) => item.id !== id));
      } catch (err) {
        alert(err.response?.data?.message || "Menu item delete nahi ho paaya.");
      }
    };
    run();
  }, []);

  // ── Inventory items CRUD ──────────────────────────────────
  const saveInventoryItem = async () => {
    const missing = ITEMS_FORM.some((f) => f.required && !String(itemsForm[f.key] ?? "").trim());
    if (missing) { setItemsError("Please fill all required fields."); return false; }

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
      return true;
    } catch (err) {
      setItemsError(err.response?.data?.message || "Could not save item. Check role permissions.");
      return false;
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

    if (selectedSection.type === "menu") {
      return (
        <MenuItemsSection
          records={menuItemsData}
          draft={menuDraft}
          setDraft={setMenuDraft}
          editingId={editingMenuId}
          onSave={saveMenuItem}
          onEdit={editMenuItem}
          onDelete={deleteMenuItem}
          searchQuery={sectionSearch}
          setSearchQuery={setSectionSearch}
          menuCategoryOptions={menuCategoryOptions}
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
      return (
        <StockAuditSection
          items={inventoryItems}
          onSubmit={submitInventoryAudit}
          isSubmitting={isSubmittingAudit}
        />
      );
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
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300/80">Baglamukhi Resort</p>
            <h1 className="mt-1 text-3xl font-bold text-white md:text-4xl">Inventory Management</h1>
            <p className="mt-1.5 max-w-xl text-lg text-slate-300">
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
                <p className="text-sm font-semibold uppercase tracking-wider opacity-70">{l}</p>
                <p className="mt-1 text-2xl font-bold">{itemsLoading && l === "Total Items" ? "..." : v}</p>
              </div>
            ))}
          </div>
        </div>

        {itemsError && (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-base text-red-200">
            {itemsError}
          </div>
        )}
        </div>
      </div>

      <div className="space-y-5">
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="mb-3 px-1 text-sm font-bold uppercase tracking-widest text-slate-400">Navigation</p>
          <div className="grid gap-3 lg:grid-cols-4">
            {NAVIGATION_GROUPS.map((group) => {
              const isOpen = openNavGroup === group.label;
              const isActiveGroup = group.ids.includes(activeSection);

              return (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => {
                    setOpenNavGroup(group.label);
                    setActiveSection(group.ids[0]);
                  }}
                  className={`flex min-h-[68px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    isOpen || isActiveGroup ? group.activeButton : group.idleButton
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isOpen || isActiveGroup ? group.iconTone : group.iconIdleTone
                      }`}
                    >
                      <FaFilter size={13} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-lg font-black uppercase tracking-[0.24em]">
                        {group.label}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-[0.18em] ${
                        isOpen || isActiveGroup
                          ? "border-white/20 bg-white/15 text-white"
                          : "border-slate-200 bg-white/80 text-slate-500"
                      }`}
                    >
                      {group.ids.length} items
                    </span>
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                        isOpen || isActiveGroup
                          ? "border-white/20 bg-white/15 text-white"
                          : "border-slate-200 bg-white/80 text-slate-500"
                      } ${isOpen ? "rotate-180" : ""}`}
                    >
                      <FaChevronDown size={13} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {openNavGroup ? (
            <div className="mt-4">
              {(() => {
                const group = NAVIGATION_GROUPS.find((entry) => entry.label === openNavGroup);
                if (!group) return null;

                return (
                  <div
                    className={`w-full rounded-[24px] border p-4 text-left ${group.dropdown}`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xl font-black uppercase tracking-[0.24em] text-slate-900">
                          {group.label} Navigation
                        </div>
                        <div className="mt-1.5 text-xl text-slate-600">{group.helper}</div>
                      </div>
                      <div className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-base font-bold uppercase tracking-[0.18em] text-slate-600">
                        Click any button to open module
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      {group.ids.map((id) => {
                        const sec = INVENTORY_SECTIONS.find((section) => section.id === id);
                        if (!sec) return null;

                        const Icon = sec.icon;
                        const active = activeSection === id;

                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setActiveSection(id)}
                            className={`inline-flex cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 text-left text-lg font-semibold transition ${
                              active ? group.itemActive : group.itemIdle
                            }`}
                          >
                            <span
                              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${
                                active ? "bg-slate-900 text-white" : "bg-white text-slate-500"
                              }`}
                            >
                              <Icon size={16} />
                            </span>
                            <span className="truncate">{sec.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </section>

        {/* Main content */}
        <main className="min-w-0 space-y-5">
          {/* Mobile section picker */}
          {activeSection === "items" && <LowStockAlerts items={inventoryItems} />}

          {/* Section content */}
          <div>
            {itemsLoading && activeSection === "items" ? (
              <div className="flex items-center justify-center rounded-[28px] border border-white/70 bg-white/90 py-20 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                  <p className="mt-3 text-base text-slate-400">Loading inventory...</p>
                </div>
              </div>
            ) : renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

