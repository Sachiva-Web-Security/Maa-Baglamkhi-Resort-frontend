import React, { useState, useEffect } from "react";
import API from "../api";
import "./Items.css";

const Items = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", price: 0, foodType: "Veg", status: "Available", unit: "pcs", effectivePrice: 0 });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await API.get("/restaurant/menu");
      setItems(res.data || []);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...new Set(items.map(i => i.category).filter(Boolean))];

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || item.category === category;
    return matchSearch && matchCat;
  });

  const handleSave = async () => {
    if (!form.name) return alert("Item name required");
    setLoading(true);
    try {
      if (editing) {
        await API.put(`/restaurant/menu/${editing.id}`, form);
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
      } else {
        const res = await API.post("/restaurant/menu", form);
        const newItem = { id: res.data?.id || Date.now(), ...form };
        setItems(prev => [...prev, newItem]);
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: "", category: "", price: 0, foodType: "Veg", status: "Available", unit: "pcs", effectivePrice: 0 });
    } catch (err) {
      console.error("Error saving item:", err);
      alert("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this item?")) return;
    try {
      await API.delete(`/restaurant/menu/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to delete");
    }
  };

  return (
    <div className="items-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Menu Items</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => { setEditing(null); setForm({ name: "", category: "", price: 0, foodType: "Veg", status: "Available", unit: "pcs", effectivePrice: 0 }); setShowModal(true); }}>
          + Add Item
        </button>
      </div>

      <div className="items-toolbar">
        <input className="simple-input" style={{ maxWidth: 260 }} placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="simple-select" style={{ maxWidth: 180 }} value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="simple-text-muted">{filtered.length} items</span>
      </div>

      <div className="simple-card">
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Eff. Price</th><th>Unit</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td className="font-medium">{item.name}</td>
                  <td><span className="simple-badge badge-blue">{item.category || "—"}</span></td>
                  <td>₹{item.price || 0}</td>
                  <td>₹{item.effectivePrice || item.effective_price || item.price || 0}</td>
                  <td>{item.unit || "pcs"}</td>
                  <td><span className={`simple-badge ${item.foodType === "Veg" ? "badge-green" : "badge-red"}`}>{item.foodType || "Veg"}</span></td>
                  <td><span className={`simple-badge ${item.status === "Available" ? "badge-green" : "badge-orange"}`}>{item.status || "Available"}</span></td>
                  <td>
                    <button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => { setEditing(item); setForm({ name: item.name, category: item.category || "", price: item.price || 0, foodType: item.foodType || "Veg", status: item.status || "Available", unit: item.unit || "pcs", effectivePrice: item.effectivePrice || item.effective_price || 0 }); setShowModal(true); }}>Edit</button>
                    <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDelete(item.id)} style={{marginLeft: "6px"}}>Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && <tr><td colSpan="8" className="empty-order">No items found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="items-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="items-modal" onClick={e => e.stopPropagation()}>
            <h3 className="items-modal-title">{editing ? "Edit Item" : "Add Item"}</h3>
            <div className="simple-form-group"><label className="simple-label">Item Name *</label><input className="simple-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="items-form-row">
              <div className="simple-form-group"><label className="simple-label">Category</label><input className="simple-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} list="item-cats" /><datalist id="item-cats">{categories.filter(c => c !== "All").map(c => <option key={c} value={c} />)}</datalist></div>
              <div className="simple-form-group"><label className="simple-label">Unit</label><input className="simple-input" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="pcs" /></div>
            </div>
            <div className="items-form-row">
              <div className="simple-form-group"><label className="simple-label">Price (₹)</label><input type="number" className="simple-input" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} min="0" /></div>
              <div className="simple-form-group"><label className="simple-label">Effective Price (₹)</label><input type="number" className="simple-input" value={form.effectivePrice} onChange={e => setForm(p => ({ ...p, effectivePrice: Number(e.target.value) }))} min="0" /></div>
            </div>
            <div className="items-form-row">
              <div className="simple-form-group"><label className="simple-label">Food Type</label><select className="simple-select" value={form.foodType} onChange={e => setForm(p => ({ ...p, foodType: e.target.value }))}><option>Veg</option><option>Non-Veg</option></select></div>
              <div className="simple-form-group"><label className="simple-label">Status</label><select className="simple-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}><option>Available</option><option>Not Available</option></select></div>
            </div>
            <div className="simple-btn-row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
              <button className="simple-btn simple-btn-gray" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="simple-btn simple-btn-primary" onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;