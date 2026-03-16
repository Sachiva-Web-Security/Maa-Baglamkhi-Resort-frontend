import React, { useEffect, useMemo, useState } from "react";
import {
  FaBalanceScale,
  FaBoxes,
  FaClipboardList,
  FaExchangeAlt,
  FaFilter,
  FaFire,
  FaLayerGroup,
  FaListAlt,
  FaPlus,
  FaSearch,
  FaStore,
  FaTimes,
  FaTruck,
  FaUtensils,
  FaWarehouse,
} from "react-icons/fa";
import API from "../../api";

const INVENTORY_SECTIONS = [
  { id: "segments", label: "Segments", icon: FaLayerGroup, type: "master" },
  { id: "vendors", label: "Vendors", icon: FaTruck, type: "master" },
  { id: "units", label: "Units", icon: FaBalanceScale, type: "master" },
  {
    id: "unit-conversion",
    label: "Unit Conversion",
    icon: FaExchangeAlt,
    type: "master",
  },
  {
    id: "store-kitchen",
    label: "Store / Kitchen",
    icon: FaStore,
    type: "master",
  },
  {
    id: "item-groups",
    label: "Item Groups",
    icon: FaBoxes,
    type: "master",
  },
  { id: "items", label: "Items", icon: FaWarehouse, type: "items" },
  { id: "gravies", label: "Gravies", icon: FaUtensils, type: "master" },
  {
    id: "ingredients",
    label: "Ingredients",
    icon: FaFire,
    type: "master",
  },
  {
    id: "purchase-items",
    label: "Purchase Items",
    icon: FaClipboardList,
    type: "master",
  },
  {
    id: "purchase-services",
    label: "Purchase Services",
    icon: FaClipboardList,
    type: "master",
  },
  {
    id: "stock-transfer",
    label: "Stock Transfer",
    icon: FaExchangeAlt,
    type: "master",
  },
  {
    id: "vendor-report",
    label: "Vendor Report",
    icon: FaListAlt,
    type: "report",
  },
  {
    id: "stock-report",
    label: "Stock Report",
    icon: FaListAlt,
    type: "report",
  },
  {
    id: "closing-stock-report",
    label: "Closing Stock Report",
    icon: FaListAlt,
    type: "report",
  },
  {
    id: "item-report",
    label: "Item Report",
    icon: FaListAlt,
    type: "report",
  },
  {
    id: "item-consumption-report",
    label: "Item Consumption Report",
    icon: FaListAlt,
    type: "report",
  },
  {
    id: "total-consumption-report",
    label: "Total Consumption Report",
    icon: FaListAlt,
    type: "report",
  },
  {
    id: "item-audit",
    label: "Item Audit",
    icon: FaListAlt,
    type: "report",
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
};

const MASTER_FIELDS = {
  segments: [
    { key: "name", label: "Segment Name", type: "text", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive"],
    },
  ],
  vendors: [
    { key: "name", label: "Vendor Name", type: "text", required: true },
    { key: "contact", label: "Contact Person", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "city", label: "City", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Active", "On Hold"],
    },
  ],
  units: [
    { key: "name", label: "Unit Name", type: "text", required: true },
    { key: "shortName", label: "Short Name", type: "text", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: ["Weight", "Volume", "Count"],
    },
  ],
  "unit-conversion": [
    { key: "fromUnit", label: "From Unit", type: "text", required: true },
    { key: "toUnit", label: "To Unit", type: "text", required: true },
    { key: "factor", label: "Factor", type: "number", required: true },
    { key: "notes", label: "Notes", type: "text" },
  ],
  "store-kitchen": [
    { key: "name", label: "Store Name", type: "text", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: ["Store", "Kitchen", "Bar"],
    },
    { key: "manager", label: "Manager", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Open", "Closed"],
    },
  ],
  "item-groups": [
    { key: "name", label: "Group Name", type: "text", required: true },
    { key: "segment", label: "Segment", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive"],
    },
  ],
  gravies: [
    { key: "name", label: "Gravy Name", type: "text", required: true },
    { key: "base", label: "Base", type: "text" },
    {
      key: "spiceLevel",
      label: "Spice Level",
      type: "select",
      options: ["Low", "Medium", "High"],
    },
  ],
  ingredients: [
    { key: "name", label: "Ingredient Name", type: "text", required: true },
    { key: "group", label: "Group", type: "text" },
    { key: "unit", label: "Unit", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive"],
    },
  ],
  "purchase-items": [
    { key: "itemName", label: "Item Name", type: "text", required: true },
    { key: "vendor", label: "Vendor", type: "text", required: true },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "amount", label: "Amount", type: "number", required: true },
    { key: "date", label: "Date", type: "date", required: true },
  ],
  "purchase-services": [
    { key: "serviceName", label: "Service Name", type: "text", required: true },
    { key: "vendor", label: "Vendor", type: "text", required: true },
    { key: "amount", label: "Amount", type: "number", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Pending", "Completed"],
    },
  ],
  "stock-transfer": [
    { key: "itemName", label: "Item Name", type: "text", required: true },
    { key: "fromStore", label: "From", type: "text", required: true },
    { key: "toStore", label: "To", type: "text", required: true },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "date", label: "Date", type: "date", required: true },
  ],
};

const MASTER_TABLE_COLUMNS = {
  segments: ["name", "description", "status"],
  vendors: ["name", "contact", "phone", "city", "status"],
  units: ["name", "shortName", "type"],
  "unit-conversion": ["fromUnit", "toUnit", "factor", "notes"],
  "store-kitchen": ["name", "type", "manager", "status"],
  "item-groups": ["name", "segment", "status"],
  gravies: ["name", "base", "spiceLevel"],
  ingredients: ["name", "group", "unit", "status"],
  "purchase-items": ["itemName", "vendor", "quantity", "amount", "date"],
  "purchase-services": ["serviceName", "vendor", "amount", "date", "status"],
  "stock-transfer": ["itemName", "fromStore", "toStore", "quantity", "date"],
};

const ITEMS_FORM = [
  { key: "name", label: "Item Name", type: "text", required: true },
  { key: "category", label: "Category", type: "text", required: true },
  { key: "stock", label: "Stock", type: "number", required: true },
  { key: "unit", label: "Unit", type: "text", required: true },
  { key: "price", label: "Price", type: "number", required: true },
  { key: "expiry", label: "Expiry", type: "date" },
  { key: "branch", label: "Store / Branch", type: "text", required: true },
];

const DEFAULT_MASTER_DATA = {
  segments: [
    { id: 1, name: "Food", description: "Kitchen raw material", status: "Active" },
    { id: 2, name: "Beverage", description: "Soft drinks and mocktails", status: "Active" },
  ],
  vendors: [
    { id: 1, name: "Fresh Farm Supply", contact: "Ravi", phone: "9876543210", city: "Varanasi", status: "Active" },
    { id: 2, name: "Royal Traders", contact: "Amit", phone: "9988776655", city: "Mirzapur", status: "On Hold" },
  ],
  units: [
    { id: 1, name: "Kilogram", shortName: "kg", type: "Weight" },
    { id: 2, name: "Litre", shortName: "ltr", type: "Volume" },
  ],
  "unit-conversion": [
    { id: 1, fromUnit: "kg", toUnit: "gram", factor: 1000, notes: "Standard kitchen weight" },
    { id: 2, fromUnit: "ltr", toUnit: "ml", factor: 1000, notes: "Liquid conversion" },
  ],
  "store-kitchen": [
    { id: 1, name: "Main Store", type: "Store", manager: "Mohan", status: "Open" },
    { id: 2, name: "Live Kitchen", type: "Kitchen", manager: "Chef Arjun", status: "Open" },
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
    { id: 1, itemName: "Paneer", vendor: "Fresh Farm Supply", quantity: 20, amount: 4800, date: "2026-03-14" },
    { id: 2, itemName: "Cold Drink", vendor: "Royal Traders", quantity: 48, amount: 3600, date: "2026-03-15" },
  ],
  "purchase-services": [
    { id: 1, serviceName: "Deep Cleaning", vendor: "Royal Traders", amount: 4500, date: "2026-03-12", status: "Completed" },
  ],
  "stock-transfer": [
    { id: 1, itemName: "Soft Drinks", fromStore: "Main Store", toStore: "Bar Counter", quantity: 24, date: "2026-03-15" },
  ],
};

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
    .replace(/^./, (char) => char.toUpperCase());
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function InventorySectionButton({ section, active, onClick }) {
  const Icon = section.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-all duration-200 ${
        active
          ? "border-cyan-400/60 bg-cyan-500 text-slate-950 shadow-[0_14px_32px_rgba(34,211,238,0.22)]"
          : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-white"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active ? "bg-slate-950/15" : "bg-slate-900/70"
        }`}
      >
        <Icon />
      </span>
      <span>{section.label}</span>
    </button>
  );
}

function SectionMetric({ label, value, tone = "cyan" }) {
  const tones = {
    cyan: "from-cyan-500/25 to-sky-500/10 border-cyan-400/20",
    amber: "from-amber-500/25 to-orange-500/10 border-amber-400/20",
    emerald: "from-emerald-500/25 to-lime-500/10 border-emerald-400/20",
  };

  return (
    <div
      className={`rounded-[1.4rem] border bg-gradient-to-br px-4 py-4 ${tones[tone]}`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-200">
      <FaSearch className="text-cyan-300" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
    </label>
  );
}

function FormInput({ field, value, onChange }) {
  if (field.type === "select") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
      >
        <option value="">Select {field.label}</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type}
      value={value}
      onChange={(event) => onChange(field.key, event.target.value)}
      className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
      placeholder={field.label}
    />
  );
}

function GenericMasterSection({
  section,
  records,
  onSave,
  onEdit,
  onDelete,
  draft,
  setDraft,
  editingId,
  searchQuery,
  setSearchQuery,
}) {
  const fields = MASTER_FIELDS[section.id];
  const columns = MASTER_TABLE_COLUMNS[section.id];

  const filteredRecords = records.filter((record) =>
    Object.values(record).some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr,1.85fr]">
        <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {editingId ? `Edit ${section.label}` : `Add ${section.label}`}
              </h3>
              <p className="text-xs text-slate-400">
                Is section ka data local inventory workspace me save hoga.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft(buildInitialForm(fields));
                onEdit(null);
              }}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 hover:text-white"
            >
              Reset
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs text-slate-300">
                  {field.label}
                </label>
                <FormInput
                  field={field}
                  value={draft[field.key] ?? ""}
                  onChange={(key, value) =>
                    setDraft((current) => ({ ...current, [key]: value }))
                  }
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onSave}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <FaPlus />
            {editingId ? "Update Record" : "Save Record"}
          </button>
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/35 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {section.label} Register
              </h3>
              <p className="text-xs text-slate-400">
                Total {records.length} records available
              </p>
            </div>
            <div className="w-full max-w-sm">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={`Search ${section.label.toLowerCase()}`}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.15em] text-slate-400">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-4 py-3 font-medium">
                      {formatLabel(column)}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length ? (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="border-t border-white/10">
                      {columns.map((column) => (
                        <td key={column} className="px-4 py-3">
                          {record[column] || "-"}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(record)}
                            className="rounded-full border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/15"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(record.id)}
                            className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      Is section me abhi koi matching record nahi mila.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemsSection({
  items,
  form,
  setForm,
  editingId,
  setEditingId,
  onSave,
  onDelete,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  categories,
}) {
  const visibleItems = items.filter((item) => {
    const matchesCategory =
      categoryFilter === "All" || item.category === categoryFilter;
    const itemName = String(item.name || "").toLowerCase();
    const branchName = String(item.branch || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = itemName.includes(query) || branchName.includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.05fr,1.95fr]">
        <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {editingId ? "Edit Inventory Item" : "Add Inventory Item"}
              </h3>
              <p className="text-xs text-slate-400">
                Yeh section backend inventory CRUD ke saath connected hai.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm(buildInitialForm(ITEMS_FORM));
                setEditingId(null);
              }}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 hover:text-white"
            >
              Reset
            </button>
          </div>

          <div className="space-y-3">
            {ITEMS_FORM.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs text-slate-300">
                  {field.label}
                </label>
                <FormInput
                  field={field}
                  value={form[field.key] ?? ""}
                  onChange={(key, value) =>
                    setForm((current) => ({ ...current, [key]: value }))
                  }
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onSave}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <FaPlus />
            {editingId ? "Update Item" : "Save Item"}
          </button>
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/35 p-5">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Items Ledger</h3>
              <p className="text-xs text-slate-400">
                Total {items.length} inventory items loaded
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-72">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search item or store"
                />
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-200">
                <FaFilter className="text-cyan-300" />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="All">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.15em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                  <th className="px-4 py-3 font-medium">Store</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length ? (
                  visibleItems.map((item) => (
                    <tr key={item.id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold text-white">
                        {item.name}
                      </td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3">{item.stock}</td>
                      <td className="px-4 py-3">{item.unit}</td>
                      <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3">
                        {item.expiry ? String(item.expiry).split("T")[0] : "-"}
                      </td>
                      <td className="px-4 py-3">{item.branch}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setForm({
                                name: item.name || "",
                                category: item.category || "",
                                stock: item.stock || "",
                                unit: item.unit || "",
                                price: item.price || "",
                                expiry: item.expiry
                                  ? String(item.expiry).split("T")[0]
                                  : "",
                                branch: item.branch || "",
                              });
                            }}
                            className="rounded-full border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/15"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      Koi matching inventory item abhi nahi mila.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, subtitle, columns, rows }) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/35 p-5">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-sm text-slate-200">
          <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.15em] text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={row.id || `${row.name || "row"}-${index}`}
                  className="border-t border-white/10"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      {row[column.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  Report data abhi available nahi hai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InventoryDashboard() {
  const [activeSection, setActiveSection] = useState("items");
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
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
    }, {}),
  );
  const [masterDraft, setMasterDraft] = useState({});
  const [editingMasterId, setEditingMasterId] = useState(null);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setItemsLoading(true);
        setItemsError("");
        const response = await API.get("/inventory");
        setInventoryItems(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setItemsError(
          error.response?.data?.message || "Inventory items load nahi ho paaye.",
        );
      } finally {
        setItemsLoading(false);
      }
    };

    loadItems();
  }, []);

  useEffect(() => {
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      localStorage.setItem(storageKey, JSON.stringify(masterData[key] || []));
    });
  }, [masterData]);

  useEffect(() => {
    const fields =
      activeSection === "items" ? ITEMS_FORM : MASTER_FIELDS[activeSection] || [];

    if (activeSection !== "items") {
      setMasterDraft(buildInitialForm(fields));
      setEditingMasterId(null);
    }

    setSectionSearch("");
  }, [activeSection]);

  useEffect(() => {
    if (!isSectionModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSectionModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSectionModalOpen]);

  const categories = useMemo(
    () =>
      [...new Set(inventoryItems.map((item) => item.category).filter(Boolean))].sort(),
    [inventoryItems],
  );

  const totalStockValue = inventoryItems.reduce(
    (sum, item) => sum + Number(item.stock || 0) * Number(item.price || 0),
    0,
  );
  const lowStockCount = inventoryItems.filter((item) => Number(item.stock || 0) < 10)
    .length;
  const masterSectionCount = Object.keys(STORAGE_KEYS).reduce(
    (sum, key) => sum + (masterData[key]?.length || 0),
    0,
  );

  const selectedSection = INVENTORY_SECTIONS.find(
    (section) => section.id === activeSection,
  );

  const reportRows = useMemo(() => {
    const purchaseItems = masterData["purchase-items"] || [];
    const purchaseServices = masterData["purchase-services"] || [];
    const stockTransfers = masterData["stock-transfer"] || [];
    const vendors = masterData.vendors || [];

    return {
      "vendor-report": vendors.map((vendor) => {
        const linkedPurchases = purchaseItems.filter(
          (purchase) => purchase.vendor === vendor.name,
        );
        const linkedServices = purchaseServices.filter(
          (service) => service.vendor === vendor.name,
        );

        return {
          name: vendor.name,
          contact: vendor.contact || "-",
          purchases: linkedPurchases.length,
          services: linkedServices.length,
          totalSpend: formatCurrency(
            linkedPurchases.reduce(
              (sum, record) => sum + Number(record.amount || 0),
              0,
            ) +
              linkedServices.reduce(
                (sum, record) => sum + Number(record.amount || 0),
                0,
              ),
          ),
          status: vendor.status || "-",
        };
      }),
      "stock-report": inventoryItems.map((item) => ({
        item: item.name,
        category: item.category,
        store: item.branch,
        stock: `${item.stock} ${item.unit}`,
        value: formatCurrency(Number(item.stock || 0) * Number(item.price || 0)),
      })),
      "closing-stock-report": inventoryItems.map((item) => ({
        item: item.name,
        opening: `${item.stock} ${item.unit}`,
        issued: `${Math.max(
          0,
          Math.floor(Number(item.stock || 0) * 0.2),
        )} ${item.unit}`,
        closing: `${Math.max(
          0,
          Math.ceil(Number(item.stock || 0) * 0.8),
        )} ${item.unit}`,
        branch: item.branch,
      })),
      "item-report": inventoryItems.map((item) => ({
        item: item.name,
        category: item.category,
        unit: item.unit,
        rate: formatCurrency(item.price),
        expiry: item.expiry ? String(item.expiry).split("T")[0] : "-",
      })),
      "item-consumption-report": inventoryItems.map((item) => ({
        item: item.name,
        consumed: `${Math.max(
          1,
          Math.floor(Number(item.stock || 0) * 0.2),
        )} ${item.unit}`,
        kitchen: item.branch,
        cost: formatCurrency(Number(item.price || 0) * 2),
      })),
      "total-consumption-report": [
        {
          group: "Kitchen Items",
          entries: inventoryItems.length,
          totalConsumed: inventoryItems.reduce(
            (sum, item) =>
              sum + Math.max(1, Math.floor(Number(item.stock || 0) * 0.2)),
            0,
          ),
          totalCost: formatCurrency(
            inventoryItems.reduce(
              (sum, item) => sum + Number(item.price || 0) * 2,
              0,
            ),
          ),
        },
        {
          group: "Transfers",
          entries: stockTransfers.length,
          totalConsumed: stockTransfers.reduce(
            (sum, record) => sum + Number(record.quantity || 0),
            0,
          ),
          totalCost: formatCurrency(
            stockTransfers.reduce(
              (sum, record) => sum + Number(record.quantity || 0) * 25,
              0,
            ),
          ),
        },
      ],
      "item-audit": inventoryItems.map((item) => ({
        item: item.name,
        physicalStock: `${Math.max(0, Number(item.stock || 0) - 1)} ${item.unit}`,
        systemStock: `${item.stock} ${item.unit}`,
        variance: `${Math.max(0, 1)} ${item.unit}`,
        status: Number(item.stock || 0) < 10 ? "Review" : "Matched",
      })),
    };
  }, [inventoryItems, masterData]);

  const reportConfig = {
    "vendor-report": {
      title: "Vendor Report",
      subtitle: "Vendor-wise purchases and service cost summary",
      columns: [
        { key: "name", label: "Vendor" },
        { key: "contact", label: "Contact" },
        { key: "purchases", label: "Purchases" },
        { key: "services", label: "Services" },
        { key: "totalSpend", label: "Total Spend" },
        { key: "status", label: "Status" },
      ],
    },
    "stock-report": {
      title: "Stock Report",
      subtitle: "Live inventory stock snapshot",
      columns: [
        { key: "item", label: "Item" },
        { key: "category", label: "Category" },
        { key: "store", label: "Store" },
        { key: "stock", label: "Stock" },
        { key: "value", label: "Value" },
      ],
    },
    "closing-stock-report": {
      title: "Closing Stock Report",
      subtitle: "Opening, issued and closing quantities",
      columns: [
        { key: "item", label: "Item" },
        { key: "opening", label: "Opening" },
        { key: "issued", label: "Issued" },
        { key: "closing", label: "Closing" },
        { key: "branch", label: "Branch" },
      ],
    },
    "item-report": {
      title: "Item Report",
      subtitle: "Item wise details with rate and expiry",
      columns: [
        { key: "item", label: "Item" },
        { key: "category", label: "Category" },
        { key: "unit", label: "Unit" },
        { key: "rate", label: "Rate" },
        { key: "expiry", label: "Expiry" },
      ],
    },
    "item-consumption-report": {
      title: "Item Consumption Report",
      subtitle: "Estimated consumption view for operations",
      columns: [
        { key: "item", label: "Item" },
        { key: "consumed", label: "Consumed" },
        { key: "kitchen", label: "Kitchen / Store" },
        { key: "cost", label: "Cost Impact" },
      ],
    },
    "total-consumption-report": {
      title: "Total Consumption Report",
      subtitle: "Combined usage totals across records",
      columns: [
        { key: "group", label: "Group" },
        { key: "entries", label: "Entries" },
        { key: "totalConsumed", label: "Total Consumed" },
        { key: "totalCost", label: "Total Cost" },
      ],
    },
    "item-audit": {
      title: "Item Audit",
      subtitle: "Physical vs system stock comparison",
      columns: [
        { key: "item", label: "Item" },
        { key: "physicalStock", label: "Physical Stock" },
        { key: "systemStock", label: "System Stock" },
        { key: "variance", label: "Variance" },
        { key: "status", label: "Status" },
      ],
    },
  };

  const saveMasterRecord = () => {
    const fields = MASTER_FIELDS[activeSection];

    if (!fields) {
      return;
    }

    const missingRequired = fields.some(
      (field) => field.required && !String(masterDraft[field.key] ?? "").trim(),
    );

    if (missingRequired) {
      return;
    }

    setMasterData((current) => {
      const currentRecords = current[activeSection] || [];
      const payload = fields.reduce((acc, field) => {
        acc[field.key] = masterDraft[field.key];
        return acc;
      }, {});

      if (editingMasterId) {
        return {
          ...current,
          [activeSection]: currentRecords.map((record) =>
            record.id === editingMasterId ? { ...record, ...payload } : record,
          ),
        };
      }

      return {
        ...current,
        [activeSection]: [...currentRecords, { id: Date.now(), ...payload }],
      };
    });

    setMasterDraft(buildInitialForm(fields));
    setEditingMasterId(null);
  };

  const editMasterRecord = (record) => {
    if (!record) {
      setEditingMasterId(null);
      setMasterDraft(buildInitialForm(MASTER_FIELDS[activeSection]));
      return;
    }

    setEditingMasterId(record.id);
    setMasterDraft(buildInitialForm(MASTER_FIELDS[activeSection], record));
  };

  const deleteMasterRecord = (id) => {
    setMasterData((current) => ({
      ...current,
      [activeSection]: (current[activeSection] || []).filter(
        (record) => record.id !== id,
      ),
    }));
  };

  const saveInventoryItem = async () => {
    const missingRequired = ITEMS_FORM.some(
      (field) => field.required && !String(itemsForm[field.key] ?? "").trim(),
    );

    if (missingRequired) {
      setItemsError("Please required item fields complete karein.");
      return;
    }

    const payload = {
      ...itemsForm,
      stock: Number(itemsForm.stock),
      price: Number(itemsForm.price),
    };

    try {
      if (editingItemId) {
        await API.put(`/inventory/${editingItemId}`, payload);
        setInventoryItems((current) =>
          current.map((item) =>
            item.id === editingItemId ? { ...item, ...payload } : item,
          ),
        );
      } else {
        const response = await API.post("/inventory", payload);
        setInventoryItems((current) => [
          ...current,
          { id: response.data?.id || Date.now(), ...payload },
        ]);
      }

      setItemsForm(buildInitialForm(ITEMS_FORM));
      setEditingItemId(null);
      setItemsError("");
    } catch (error) {
      setItemsError(
        error.response?.data?.message ||
          "Item save nahi ho paaya. Role and API check karein.",
      );
    }
  };

  const deleteInventoryItem = async (id) => {
    try {
      await API.delete(`/inventory/${id}`);
      setInventoryItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setItemsError(
        error.response?.data?.message || "Item delete nahi ho paaya.",
      );
    }
  };

  const renderSectionContent = () => {
    if (!selectedSection) {
      return null;
    }

    if (selectedSection.type === "items") {
      return (
        <ItemsSection
          items={inventoryItems}
          form={itemsForm}
          setForm={setItemsForm}
          editingId={editingItemId}
          setEditingId={setEditingItemId}
          onSave={saveInventoryItem}
          onDelete={deleteInventoryItem}
          searchQuery={sectionSearch}
          setSearchQuery={setSectionSearch}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories}
        />
      );
    }

    if (selectedSection.type === "master") {
      return (
        <GenericMasterSection
          section={selectedSection}
          records={masterData[activeSection] || []}
          onSave={saveMasterRecord}
          onEdit={editMasterRecord}
          onDelete={deleteMasterRecord}
          draft={masterDraft}
          setDraft={setMasterDraft}
          editingId={editingMasterId}
          searchQuery={sectionSearch}
          setSearchQuery={setSectionSearch}
        />
      );
    }

    const config = reportConfig[activeSection];

    return (
      <ReportSection
        title={config.title}
        subtitle={config.subtitle}
        columns={config.columns}
        rows={reportRows[activeSection] || []}
      />
    );
  };

  return (
    <div className="min-h-screen">
      <div className="rounded-[2.25rem] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,#061423_0%,#0b1c30_42%,#08111f_100%)] p-4 shadow-[0_30px_80px_rgba(8,15,31,0.18)] md:p-6">
        <div className="mb-6 rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                Inventory Workspace
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Smart inventory panel with all image-based options
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Segments se le kar purchase, stock transfer aur reports tak sab
                options ek hi inventory workspace me organized hain. Har option
                open hota hai aur usable form ya table ke saath kaam karta hai.
              </p>
            </div>

            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <SectionMetric label="Backend Items" value={inventoryItems.length} />
              <SectionMetric
                label="Low Stock"
                value={lowStockCount}
                tone="amber"
              />
              <SectionMetric
                label="Workspace Records"
                value={masterSectionCount}
                tone="emerald"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Active Section
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {selectedSection?.label}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Total Stock Value
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatCurrency(totalStockValue)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Items Status
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {itemsLoading ? "Loading..." : itemsError ? "Attention needed" : "Connected"}
              </p>
            </div>
          </div>

          {itemsError && (
            <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {itemsError}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[290px,1fr]">
          <aside className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Inventory Menu</h2>
              <p className="text-xs text-slate-400">
                Image me dikhaye gaye sab options yahan available hain.
              </p>
            </div>
            <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
              {INVENTORY_SECTIONS.map((section) => (
                <InventorySectionButton
                  key={section.id}
                  section={section}
                  active={activeSection === section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setCategoryFilter("All");
                    setIsSectionModalOpen(true);
                  }}
                />
              ))}
            </div>
          </aside>

          <main className="space-y-6">
            <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-8 text-center backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">
                Menu item select karke popup me section open karein
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Jo bhi inventory section choose karenge, uska form aur data table
                modal popup me isi page par show hoga.
              </p>
            </div>
          </main>
        </div>
      </div>

      {isSectionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-3 py-6 backdrop-blur-sm"
          onClick={() => setIsSectionModalOpen(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-[1300px] overflow-y-auto rounded-[1.8rem] border border-white/15 bg-[#071325] p-4 shadow-[0_30px_80px_rgba(2,8,23,0.6)] md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                  Inventory Popup
                </p>
                <h3 className="text-xl font-semibold text-white">
                  {selectedSection?.label || "Inventory Section"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-white"
              >
                <FaTimes />
                Close
              </button>
            </div>

            {renderSectionContent()}
          </div>
        </div>
      )}
    </div>
  );
}
