import React, { useState } from "react";
import {
  FaRupeeSign,
  FaPlus,
  FaBell,
  FaArrowLeft,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

export default function CategoryInventory({
  categoryName,
  items,
  onBack,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [branch, setBranch] = useState("All");

  // 🔹 Filter items
  const filtered = items.filter(
    (i) =>
      i.category === categoryName &&
      (branch === "All" || i.branch === branch)
  );

  // 🔹 Alerts & calculations
  const lowStockItems = filtered.filter((i) => i.stock > 0 && i.stock < 10);
  const outOfStock = filtered.filter((i) => i.stock === 0);

  const totalValue = filtered.reduce(
    (sum, i) => sum + i.stock * (Number(i.price) || 0),
    0
  );

  // 🔹 Expiry alerts (expired OR next 3 days)
  const today = new Date();
  const expiryAlerts = filtered.filter((i) => {
    const diff =
      (new Date(i.expiry) - today) / (1000 * 60 * 60 * 24);
    return diff <= 3;
  });

  // 🔹 Add item
  const addItem = (e) => {
    e.preventDefault();
    const form = e.target;

    const newItem = {
      id: Date.now(), // ✅ UNIQUE ID (IMPORTANT)
      name: form.name.value,
      category: categoryName,
      stock: Number(form.stock.value),
      unit: form.unit.value,
      price: Number(form.price.value),
      expiry: form.expiry.value,
      branch: form.branch.value,
    };

    onAddItem(newItem);
    setShowModal(false);
    form.reset();
  };

  // 🔹 Edit item
  const handleEditClick = (item) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleUpdateItem = (e) => {
    e.preventDefault();
    onUpdateItem(editingItem.id, editingItem);
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleEditChange = (field, value) => {
    setEditingItem({
      ...editingItem,
      [field]: field === "stock" || field === "price" ? Number(value) : value,
    });
  };

  // 🔹 Delete item
  const handleDeleteItem = (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      onDeleteItem(id);
    }
  };

  return (
    <div
      className="
        min-h-screen p-6 
        bg-gradient-to-br from-blue-50 via-white to-indigo-100
        dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
        text-gray-800 dark:text-white
      "
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-blue-600 dark:text-blue-400">
            <FaArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-3xl font-bold">{categoryName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage {categoryName.toLowerCase()} inventory
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="border rounded-lg px-3 py-2 dark:bg-gray-800"
          >
            <option>All</option>
            <option>Main</option>
            <option>Branch 2</option>
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaPlus /> Add Item
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-100 dark:bg-yellow-900/40 p-4 rounded-xl flex gap-3">
          <FaBell /> Low Stock: {lowStockItems.length}
        </div>
        <div className="bg-red-100 dark:bg-red-900/40 p-4 rounded-xl flex gap-3">
          <FaBell /> Out of Stock: {outOfStock.length}
        </div>
        <div className="bg-green-100 dark:bg-green-900/40 p-4 rounded-xl flex gap-3">
          <FaRupeeSign /> Total Value: ₹{totalValue.toLocaleString()}
        </div>
      </div>

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-4 rounded-xl mb-6">
          <h3 className="font-semibold text-red-600">Expiry Alerts</h3>
          {expiryAlerts.map((item) => (
            <p key={item.id} className="text-sm">
              {item.name} – {item.expiry}
            </p>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Unit</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Expiry</th>
              <th className="p-3 text-left">Branch</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.stock}</td>
                  <td className="p-3">{item.unit}</td>
                  <td className="p-3">₹{item.price}</td>
                  <td className="p-3">{item.expiry}</td>
                  <td className="p-3">{item.branch}</td>
                  <td className="p-3 flex gap-2 justify-center">
                    <button onClick={() => handleEditClick(item)} className="text-blue-500">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-500">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add Item</h3>
            <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input name="name" placeholder="Item name" required className="border rounded-lg px-3 py-2 dark:bg-gray-900" />
              <input name="stock" type="number" placeholder="Stock" required className="border rounded-lg px-3 py-2 dark:bg-gray-900" />
              <input name="unit" placeholder="Unit (kg/pcs)" required className="border rounded-lg px-3 py-2 dark:bg-gray-900" />
              <input name="price" type="number" placeholder="Price" required className="border rounded-lg px-3 py-2 dark:bg-gray-900" />
              <input name="expiry" type="date" className="border rounded-lg px-3 py-2 dark:bg-gray-900" />
              <select name="branch" className="border rounded-lg px-3 py-2 dark:bg-gray-900">
                <option>Main</option>
                <option>Branch 2</option>
              </select>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Edit Item</h3>
            <form onSubmit={handleUpdateItem} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={editingItem.name || ""}
                onChange={(e) => handleEditChange("name", e.target.value)}
                placeholder="Item name"
                required
                className="border rounded-lg px-3 py-2 dark:bg-gray-900"
              />
              <input
                type="number"
                value={editingItem.stock ?? 0}
                onChange={(e) => handleEditChange("stock", e.target.value)}
                placeholder="Stock"
                required
                className="border rounded-lg px-3 py-2 dark:bg-gray-900"
              />
              <input
                value={editingItem.unit || ""}
                onChange={(e) => handleEditChange("unit", e.target.value)}
                placeholder="Unit"
                required
                className="border rounded-lg px-3 py-2 dark:bg-gray-900"
              />
              <input
                type="number"
                value={editingItem.price ?? 0}
                onChange={(e) => handleEditChange("price", e.target.value)}
                placeholder="Price"
                required
                className="border rounded-lg px-3 py-2 dark:bg-gray-900"
              />
              <input
                type="date"
                value={editingItem.expiry || ""}
                onChange={(e) => handleEditChange("expiry", e.target.value)}
                className="border rounded-lg px-3 py-2 dark:bg-gray-900"
              />
              <input
                value={editingItem.branch || ""}
                onChange={(e) => handleEditChange("branch", e.target.value)}
                placeholder="Branch"
                className="border rounded-lg px-3 py-2 dark:bg-gray-900"
              />
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}