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
    <div className="p-2">
      {/* Header */}
      <div className="simple-page-header">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-800">
            <FaArrowLeft size={22} />
          </button>
          <div>
            <h1 className="simple-page-title">{categoryName}</h1>
            <p className="text-sm text-gray-500">Manage {categoryName.toLowerCase()} inventory</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="simple-select"
          >
            <option>All</option>
            <option>Main</option>
            <option>Branch 2</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="simple-btn simple-btn-primary flex items-center gap-2"
          >
            <FaPlus /> Add Item
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="simple-metric-tile tile-orange">
          <div className="simple-metric-tile-label">Low Stock</div>
          <div className="simple-metric-tile-value">{lowStockItems.length}</div>
        </div>
        <div className="simple-metric-tile tile-red">
          <div className="simple-metric-tile-label">Out of Stock</div>
          <div className="simple-metric-tile-value">{outOfStock.length}</div>
        </div>
        <div className="simple-metric-tile tile-green">
          <div className="simple-metric-tile-label">Total Value</div>
          <div className="simple-metric-tile-value">₹{totalValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
          <h3 className="font-semibold text-red-600 mb-1">Expiry Alerts</h3>
          {expiryAlerts.map((item) => (
            <p key={item.id} className="text-sm text-gray-600">
              {item.name} – {item.expiry}
            </p>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="simple-table-wrapper">
        <table className="simple-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Stock</th>
              <th>Unit</th>
              <th>Price</th>
              <th>Expiry</th>
              <th>Branch</th>
              <th className="text-center">Actions</th>
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
                <tr key={item.id}>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.stock}</td>
                  <td>{item.unit}</td>
                  <td>₹{item.price}</td>
                  <td>{item.expiry}</td>
                  <td>{item.branch}</td>
                  <td className="flex gap-2 justify-center">
                    <button onClick={() => handleEditClick(item)} className="text-blue-500 hover:text-blue-700">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}