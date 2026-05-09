import React, { useState, useEffect } from "react";
import { FaRupeeSign, FaPlus, FaBell, FaSearch, FaEdit, FaTrash, FaSync } from "react-icons/fa";
import CategoryInventory from "./CategoryInventory";
import CategoryCard from "./CategoryCard";
import API from "../../api";

export default function InventoryDashboard() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeView, setActiveView] = useState("dashboard");
  const [showItemModal, setShowItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [expiryFilter, setExpiryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);

  const today = new Date();

  // Fetch items and categories from backend
  useEffect(() => {
    fetchInventory();
    fetchAlerts();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await API.get('/inventory');
      const data = res.data;
      setItems(data.items || data || []);
      // Extract unique categories
      const cats = [...new Set((data.items || data || []).map(i => i.category).filter(Boolean))];
      if (cats.length === 0) cats.push("Raw Ingredients", "Housekeeping", "Beverages");
      setCategories(cats);
    } catch (err) {
      console.error('Error loading inventory:', err);
      // Fallback to default categories
      setCategories(["Raw Ingredients", "Housekeeping", "Beverages"]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const [lowStockRes, expiringRes] = await Promise.all([
        API.get('/inventory/alerts/low-stock'),
        API.get('/inventory/alerts/expiring')
      ]);
      setLowStockAlerts(lowStockRes.data || []);
      setExpiringItems(expiringRes.data || []);
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  const totalValue = items.reduce(
    (sum, i) => sum + (Number(i.stock) || 0) * (Number(i.price) || 0),
    0
  );

  const lowStockItems = items.filter((i) => (Number(i.stock) || 0) > 0 && (Number(i.stock) || 0) < 10);
  const outOfStock = items.filter((i) => (Number(i.stock) || 0) === 0);

  const displayedItems = items.filter((i) => {
    const categoryMatch = filterCategory === "All" || i.category === filterCategory;
    let expiryMatch = true;
    if (i.expiry) {
      const diff = (new Date(i.expiry) - today) / (1000 * 60 * 60 * 24);
      if (expiryFilter === "Expired") expiryMatch = new Date(i.expiry) <= today;
      else if (expiryFilter === "Expiring Soon") expiryMatch = diff > 0 && diff <= 7;
    }
    const searchMatch = searchQuery === "" || (i.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && expiryMatch && searchMatch;
  });

  const addItem = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const newItem = {
        name: form.name.value,
        category: form.category.value,
        stock: Number(form.stock.value),
        unit: form.unit.value,
        price: Number(form.price.value),
        expiry: form.expiry.value,
        branch: form.branch.value,
      };
      const res = await API.post('/inventory', newItem);
      setItems(prev => [...prev, { ...newItem, id: res.data?.id || Date.now() }]);
      setShowItemModal(false);
      form.reset();
      fetchAlerts();
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Failed to add item');
    }
  };

  const handleAddItemFromCategory = (item) => {
    setItems(prev => [...prev, item]);
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setShowEditItemModal(true);
  };

  const saveEditedItem = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
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
      await API.put(`/inventory/${editingItem.id}`, updated);
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...updated, id: editingItem.id } : i));
      setShowEditItemModal(false);
      setEditingItem(null);
      fetchAlerts();
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await API.delete(`/inventory/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      fetchAlerts();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  const handleCategoryClick = (category) => {
    setActiveView(category);
  };

  const handleBackToDashboard = () => {
    setActiveView("dashboard");
  };

  const handleAddNewCategory = (e) => {
    e.preventDefault();
    if (newCategoryName && !categories.includes(newCategoryName)) {
      setCategories(prev => [...prev, newCategoryName]);
      setNewCategoryName("");
      setShowCategoryModal(false);
    }
  };

  const handleDeleteCategory = (category) => {
    if (!confirm(`Delete category "${category}" and all its items?`)) return;
    setCategories(prev => prev.filter(c => c !== category));
    setItems(prev => prev.filter(i => i.category !== category));
  };

  if (activeView !== "dashboard") {
    return (
      <CategoryInventory
        categoryName={activeView}
        items={items}
        onBack={handleBackToDashboard}
        onAddItem={handleAddItemFromCategory}
        onUpdateItem={(id, updated) => setItems(prev => prev.map(i => i.id === id ? updated : i))}
        onDeleteItem={handleDeleteItem}
      />
    );
  }

  return (
    <div className="p-2">
      <div className="simple-page-header">
        <div>
          <h1 className="simple-page-title">Inventory Dashboard</h1>
          <p className="text-sm text-gray-500">Hotel inventory overview</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchInventory} className="simple-btn simple-btn-outline flex items-center gap-2">
            <FaSync /> Refresh
          </button>
          <button onClick={() => setShowCategoryModal(true)} className="simple-btn simple-btn-outline flex items-center gap-2">
            <FaPlus /> Category
          </button>
          <button onClick={() => setShowItemModal(true)} className="simple-btn simple-btn-primary flex items-center gap-2">
            <FaPlus /> Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="simple-metric-tile tile-orange">
          <div className="simple-metric-tile-label">Low Stock</div>
          <div className="simple-metric-tile-value">{lowStockItems.length}</div>
        </div>
        <div className="simple-metric-tile tile-red">
          <div className="simple-metric-tile-label">Out of Stock</div>
          <div className="simple-metric-tile-value">{outOfStock.length}</div>
        </div>
        <div className="simple-metric-tile tile-blue">
          <div className="simple-metric-tile-label">Expiring Soon</div>
          <div className="simple-metric-tile-value">{expiringItems.length}</div>
        </div>
        <div className="simple-metric-tile tile-green">
          <div className="simple-metric-tile-label">Total Value</div>
          <div className="simple-metric-tile-value">₹{totalValue.toLocaleString()}</div>
        </div>
      </div>

      <div className="simple-card mb-6 flex flex-col md:flex-row items-center gap-4">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="simple-select w-full md:w-auto">
          <option>All</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)} className="simple-select w-full md:w-auto">
          <option>All</option>
          <option>Expired</option>
          <option>Expiring Soon</option>
        </select>
        <div className="relative w-full flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="simple-input pl-10 w-full" />
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-400">Loading inventory...</div>
      ) : (
        <div className="simple-table-wrapper mb-6">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Price (₹)</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.length === 0 ? (
                <tr><td colSpan="7" className="p-4 text-center text-gray-400">No items found</td></tr>
              ) : (
                displayedItems.map((item) => (
                  <tr key={item.id || item._id}>
                    <td className="font-medium">{item.name}</td>
                    <td>{item.category}</td>
                    <td className={item.stock === 0 ? 'text-red-600 font-bold' : item.stock < 10 ? 'text-orange-600' : ''}>{item.stock}</td>
                    <td>{item.unit}</td>
                    <td>₹{item.price?.toLocaleString()}</td>
                    <td>{item.expiry || '-'}</td>
                    <td className="flex gap-2">
                      <button onClick={() => handleEditClick(item)} className="text-blue-500 hover:text-blue-700"><FaEdit /></button>
                      <button onClick={() => handleDeleteItem(item.id || item._id)} className="text-red-500 hover:text-red-700"><FaTrash /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {expiringItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
          <h3 className="font-semibold text-red-600 mb-1">Expiry Alerts</h3>
          {expiringItems.map((i, idx) => (
            <p key={idx} className="text-sm text-gray-600">{i.name} - {i.expiry}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category) => {
          const categoryItems = items.filter(i => i.category === category);
          const total = categoryItems.reduce((sum, i) => sum + (Number(i.stock) || 0) * (Number(i.price) || 0), 0);
          return (
            <CategoryCard
              key={category}
              category={category}
              itemCount={categoryItems.length}
              totalValue={total}
              onClick={() => handleCategoryClick(category)}
              onDeleteCategory={handleDeleteCategory}
              isDefault={["Raw Ingredients", "Housekeeping", "Beverages"].includes(category)}
            />
          );
        })}
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="simple-modal-overlay">
          <div className="simple-modal">
            <div className="simple-modal-header">
              <h2>Add Category</h2>
              <button className="simple-modal-close" onClick={() => setShowCategoryModal(false)}>✕</button>
            </div>
            <div className="simple-modal-body">
              <form onSubmit={handleAddNewCategory}>
                <div className="simple-form-group">
                  <label className="simple-label">Category Name</label>
                  <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="simple-input w-full" placeholder="Category name" required />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setShowCategoryModal(false)} className="simple-btn simple-btn-outline">Cancel</button>
                  <button type="submit" className="simple-btn simple-btn-success">Add</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="simple-modal-overlay">
          <div className="simple-modal">
            <div className="simple-modal-header">
              <h2>Add Item</h2>
              <button className="simple-modal-close" onClick={() => setShowItemModal(false)}>✕</button>
            </div>
            <div className="simple-modal-body">
              <form onSubmit={addItem}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="simple-form-group col-span-2">
                    <label className="simple-label">Item Name</label>
                    <input name="name" placeholder="Item name" className="simple-input w-full" required />
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Category</label>
                    <select name="category" className="simple-select w-full">
                      {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Branch</label>
                    <select name="branch" className="simple-select w-full">
                      <option>Main</option>
                      <option>Branch 2</option>
                    </select>
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Stock</label>
                    <input name="stock" type="number" placeholder="0" className="simple-input w-full" required />
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Unit</label>
                    <input name="unit" placeholder="kg / L / pcs" className="simple-input w-full" required />
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Price (₹)</label>
                    <input name="price" type="number" placeholder="0" className="simple-input w-full" required />
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Expiry Date</label>
                    <input name="expiry" type="date" className="simple-input w-full" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setShowItemModal(false)} className="simple-btn simple-btn-outline">Cancel</button>
                  <button type="submit" className="simple-btn simple-btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && editingItem && (
        <div className="simple-modal-overlay">
          <div className="simple-modal">
            <div className="simple-modal-header">
              <h2>Edit Item</h2>
              <button className="simple-modal-close" onClick={() => setShowEditItemModal(false)}>✕</button>
            </div>
            <div className="simple-modal-body">
              <form onSubmit={saveEditedItem}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="simple-form-group col-span-2">
                    <label className="simple-label">Item Name</label>
                    <input name="name" defaultValue={editingItem.name} className="simple-input w-full" required />
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Category</label>
                    <select name="category" defaultValue={editingItem.category} className="simple-select w-full">
                      {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Branch</label>
                    <select name="branch" defaultValue={editingItem.branch} className="simple-select w-full">
                      <option>Main</option>
                      <option>Branch 2</option>
                    </select>
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Stock</label>
                    <input name="stock" type="number" defaultValue={editingItem.stock} className="simple-input w-full" required />
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Unit</label>
                    <input name="unit" defaultValue={editingItem.unit} className="simple-input w-full" required />
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Price (₹)</label>
                    <input name="price" type="number" defaultValue={editingItem.price} className="simple-input w-full" required />
                  </div>
                  <div className="simple-form-group">
                    <label className="simple-label">Expiry Date</label>
                    <input name="expiry" type="date" defaultValue={editingItem.expiry} className="simple-input w-full" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setShowEditItemModal(false)} className="simple-btn simple-btn-outline">Cancel</button>
                  <button type="submit" className="simple-btn simple-btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}