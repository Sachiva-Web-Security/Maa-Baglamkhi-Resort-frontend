import React, { useState } from "react";
import { FaRupeeSign, FaPlus, FaBell, FaSearch, FaEdit, FaTrash } from "react-icons/fa";
import CategoryInventory from "./CategoryInventory";
import CategoryCard from "./CategoryCard";

// 🔹 Default categories
const defaultCategories = [
  "Raw Ingredients",
  "Housekeeping",
  "Beverages",
];

// 🔹 Initial items (WITH ID)
const initialItems = [
  {
    id: 1,
    name: "Tomatoes",
    category: "Raw Ingredients",
    stock: 25,
    unit: "kg",
    price: 40,
    expiry: "2026-02-25",
    branch: "Main",
  },
  {
    id: 2,
    name: "Milk",
    category: "Raw Ingredients",
    stock: 5,
    unit: "L",
    price: 55,
    expiry: "2026-02-19",
    branch: "Main",
  },
  {
    id: 3,
    name: "Rice",
    category: "Raw Ingredients",
    stock: 0,
    unit: "kg",
    price: 70,
    expiry: "2026-06-01",
    branch: "Branch 2",
  },
];

export default function InventoryDashboard() {
  const [items, setItems] = useState(initialItems);
  const [categories, setCategories] = useState(defaultCategories);
  const [activeView, setActiveView] = useState("dashboard");

  const [showItemModal, setShowItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // filter / search state
  const [filterCategory, setFilterCategory] = useState("All");
  const [expiryFilter, setExpiryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // 🔹 Alerts (overall counts)
  const today = new Date();
  const lowStockItems = items.filter((i) => i.stock > 0 && i.stock < 10);
  const outOfStock = items.filter((i) => i.stock === 0);
  const expiringSoon = items.filter((i) => {
    const diff = (new Date(i.expiry) - today) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 7;
  });

  const totalValue = items.reduce(
    (sum, i) => sum + i.stock * (Number(i.price) || 0),
    0
  );

  // 🔹 Expiry alerts (for listing expired items)
  const expiryAlerts = items.filter((i) => new Date(i.expiry) <= today);

  // filtered items for display in table
  const displayedItems = items.filter((i) => {
    const categoryMatch =
      filterCategory === "All" || i.category === filterCategory;
    let expiryMatch = true;
    const diff = (new Date(i.expiry) - today) / (1000 * 60 * 60 * 24);
    if (expiryFilter === "Expired") expiryMatch = new Date(i.expiry) <= today;
    else if (expiryFilter === "Expiring Soon") expiryMatch = diff > 0 && diff <= 7;
    const searchMatch =
      searchQuery === "" ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && expiryMatch && searchMatch;
  });

  // 🔹 Add item
  const addItem = (e) => {
    e.preventDefault();
    const form = e.target;

    const newItem = {
      id: Date.now(),
      name: form.name.value,
      category: form.category.value,
      stock: Number(form.stock.value),
      unit: form.unit.value,
      price: Number(form.price.value),
      expiry: form.expiry.value,
      branch: form.branch.value,
    };

    setItems([...items, newItem]);
    setShowItemModal(false);
    form.reset();
  };

  // 🔹 Add item from category page
  const handleAddItemFromCategory = (item) => {
    setItems([...items, item]);
  };

  // 🔹 click edit icon in table
  const handleEditClick = (item) => {
    setEditingItem(item);
    setShowEditItemModal(true);
  };

  // 🔹 save changes from edit modal
  const saveEditedItem = (e) => {
    e.preventDefault();
    const form = e.target;
    const updated = {
      ...editingItem,
      name: form.name.value,
      category: form.category.value,
      stock: Number(form.stock.value),
      unit: form.unit.value,
      price: Number(form.price.value),
      expiry: form.expiry.value,
      branch: form.branch.value,
    };
    handleUpdateItem(editingItem.id, updated);
    setShowEditItemModal(false);
    setEditingItem(null);
  };

  // 🔹 Update item (ID based)
  const handleUpdateItem = (id, updatedItem) => {
    setItems(items.map((i) => (i.id === id ? updatedItem : i)));
  };

  // 🔹 Delete item (ID based)
  const handleDeleteItem = (id) => {
    setItems(items.filter((i) => i.id !== id));
  };

  // 🔹 Category navigation
  const handleCategoryClick = (category) => {
    setActiveView(category);
  };

  const handleBackToDashboard = () => {
    setActiveView("dashboard");
  };

  // 🔹 Add category
  const handleAddNewCategory = (e) => {
    e.preventDefault();
    if (newCategoryName && !categories.includes(newCategoryName)) {
      setCategories([...categories, newCategoryName]);
      setNewCategoryName("");
      setShowCategoryModal(false);
    }
  };

  // 🔹 Delete category
  const handleDeleteCategory = (category) => {
    setCategories(categories.filter((c) => c !== category));
    setItems(items.filter((i) => i.category !== category));
  };

  // 🔹 Category view
  if (activeView !== "dashboard") {
    return (
      <CategoryInventory
        categoryName={activeView}
        items={items}
        onBack={handleBackToDashboard}
        onAddItem={handleAddItemFromCategory}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
      />
    );
  }

  // 🔹 Dashboard view
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#071226] via-[#081827] to-[#041019] text-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventory Dashboard</h1>
          <p className="text-sm text-gray-300">Hotel inventory overview</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-gradient-to-r from-[#60a5fa] to-[#10b981] text-black px-4 py-2 rounded"
          >
            <FaPlus /> Category
          </button>
          <button
            onClick={() => setShowItemModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            <FaPlus /> Item
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#2b1210] p-4 rounded-xl flex gap-2 items-center border border-white/5">
          <FaBell className="text-yellow-300"/> <span className="ml-1">Low Stock: <span className="font-bold text-white">{lowStockItems.length}</span></span>
        </div>
        <div className="bg-[#2b1210] p-4 rounded-xl flex gap-2 items-center border border-white/5">
          <FaBell className="text-red-400"/> <span className="ml-1">Out of Stock: <span className="font-bold text-white">{outOfStock.length}</span></span>
        </div>
        <div className="bg-[#102233] p-4 rounded-xl flex gap-2 items-center border border-white/5">
          <FaBell className="text-sky-300"/> <span className="ml-1">Expiring Soon: <span className="font-bold text-white">{expiringSoon.length}</span></span>
        </div>
        <div className="bg-[#122b1f] p-4 rounded-xl flex gap-2 items-center border border-white/5">
          <FaRupeeSign className="text-emerald-300"/> <span className="ml-1">₹ <span className="font-bold text-white">{totalValue.toLocaleString()}</span></span>
        </div>
      </div>

      {/* Filters + search */}
      <div className="bg-[#071826] p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-4 border border-white/5">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-white/10 bg-transparent text-white px-3 py-2 rounded w-full md:w-auto"
        >
          <option>All</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          className="border border-white/10 bg-transparent text-white px-3 py-2 rounded w-full md:w-auto"
        >
          <option>All</option>
          <option>Expired</option>
          <option>Expiring Soon</option>
        </select>
        <div className="relative w-full md:w-auto flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-white/10 bg-transparent rounded text-white"
          />
        </div>
      </div>

      {/* Table of items */}
      <div className="bg-[#071826] rounded-xl shadow overflow-x-auto mb-6 border border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="p-3 text-left text-gray-300">Item Name</th>
              <th className="p-3 text-left text-gray-300">Category</th>
              <th className="p-3 text-left text-gray-300">Quantity</th>
              <th className="p-3 text-left text-gray-300">Unit</th>
              <th className="p-3 text-left text-gray-300">Expiry</th>
              <th className="p-3 text-left text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-400">
                  No items found
                </td>
              </tr>
            ) : (
              displayedItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-white/5 hover:bg-white/5"
                >
                  <td className="p-3 text-white">{item.name}</td>
                  <td className="p-3 text-gray-300">{item.category}</td>
                  <td className="p-3 text-white">{item.stock}</td>
                  <td className="p-3 text-gray-300">{item.unit}</td>
                  <td className="p-3 text-gray-300">{item.expiry}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="text-sky-300"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-rose-400"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Expiry alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-[#2b1111] p-4 rounded-xl mb-6 border border-red-700/20">
          <h3 className="font-semibold text-red-400">Expiry Alerts</h3>
          {expiryAlerts.map((i) => (
            <p key={i.id} className="text-sm text-gray-300">
              {i.name} expired on {i.expiry}
            </p>
          ))}
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category) => {
          const categoryItems = items.filter(
            (i) => i.category === category
          );
          const total = categoryItems.reduce(
            (sum, i) => sum + i.stock * i.price,
            0
          );

          return (
            <CategoryCard
              key={category}
              category={category}
              itemCount={categoryItems.length}
              totalValue={total}
              onClick={() => handleCategoryClick(category)}
              onDeleteCategory={handleDeleteCategory}
              isDefault={defaultCategories.includes(category)}
            />
          );
        })}
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form
            onSubmit={handleAddNewCategory}
            className="bg-[#071826] p-6 rounded-xl w-96 border border-white/5 text-white"
          >
            <h2 className="font-semibold mb-3 text-white">Add Category</h2>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="border border-white/10 bg-transparent p-2 w-full mb-3 text-white"
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCategoryModal(false)} className="text-gray-300">
                Cancel
              </button>
              <button className="bg-emerald-500 text-black px-3 py-1 rounded">
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form
            onSubmit={addItem}
            className="bg-[#071826] p-6 rounded-xl w-96 border border-white/5 text-white"
          >
            <h2 className="font-semibold mb-3 text-white">Add Item</h2>
            <input name="name" placeholder="Item name" className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white" />
            <select name="category" className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white">
              {categories.map((c) => (
                <option key={c} className="bg-[#071826]">{c}</option>
              ))}
            </select>
            <input name="stock" type="number" className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white" />
            <input name="unit" className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white" />
            <input name="price" type="number" className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white" />
            <input name="expiry" type="date" className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white" />
            <select name="branch" className="border border-white/10 bg-transparent p-2 w-full mb-3 text-white">
              <option className="bg-[#071826]">Main</option>
              <option className="bg-[#071826]">Branch 2</option>
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowItemModal(false)} className="text-gray-300">
                Cancel
              </button>
              <button className="bg-blue-500 text-white px-3 py-1 rounded">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && editingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form
            onSubmit={saveEditedItem}
            className="bg-[#071826] p-6 rounded-xl w-96 border border-white/5 text-white"
          >
            <h2 className="font-semibold mb-3 text-white">Edit Item</h2>
            <input
              name="name"
              placeholder="Item name"
              defaultValue={editingItem.name}
              className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white"
            />
            <select
              name="category"
              defaultValue={editingItem.category}
              className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white"
            >
              {categories.map((c) => (
                <option key={c} className="bg-[#071826]">{c}</option>
              ))}
            </select>
            <input
              name="stock"
              type="number"
              defaultValue={editingItem.stock}
              className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white"
            />
            <input
              name="unit"
              defaultValue={editingItem.unit}
              className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white"
            />
            <input
              name="price"
              type="number"
              defaultValue={editingItem.price}
              className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white"
            />
            <input
              name="expiry"
              type="date"
              defaultValue={editingItem.expiry}
              className="border border-white/10 bg-transparent p-2 w-full mb-2 text-white"
            />
            <select
              name="branch"
              defaultValue={editingItem.branch}
              className="border border-white/10 bg-transparent p-2 w-full mb-3 text-white"
            >
              <option className="bg-[#071826]">Main</option>
              <option className="bg-[#071826]">Branch 2</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditItemModal(false)}
                className="text-gray-300"
              >
                Cancel
              </button>
              <button className="bg-blue-500 text-white px-3 py-1 rounded">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}