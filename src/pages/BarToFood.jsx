import React, { useState } from "react";
import API from "../api";
import "./BarToFood.css";

const BarToFood = () => {
  const [items, setItems] = useState([
    { id: 1, name: "Whisky", category: "Liquor", barCode: "BAR001", price: 350, linkedTo: "Starters" },
    { id: 2, name: "Beer", category: "Beverage", barCode: "BAR002", price: 180, linkedTo: "Snacks" },
    { id: 3, name: "Vodka", category: "Liquor", barCode: "BAR003", price: 250, linkedTo: null },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", barCode: "", price: 0, linkedTo: "" });

  const categories = [...new Set(items.map(i => i.category))];
  const foodGroups = ["Starters", "Main Course", "Snacks", "Beverages", "Desserts"];

  const handleSave = () => {
    if (!form.name) return alert("Item name required");
    if (editing) {
      setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
    } else {
      setItems(prev => [...prev, { id: Date.now(), ...form }]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({ name: "", category: "", barCode: "", price: 0, linkedTo: "" });
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this item?")) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="bf-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Bar to Food Mapping</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => { setEditing(null); setForm({ name: "", category: "", barCode: "", price: 0, linkedTo: "" }); setShowModal(true); }}>+ Add Bar Item</button>
      </div>
      <div className="simple-card">
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead><tr><th>Item</th><th>Category</th><th>Bar Code</th><th>Price</th><th>Linked to Food Group</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td className="font-medium">{item.name}</td>
                  <td><span className="simple-badge badge-purple">{item.category}</span></td>
                  <td>{item.barCode}</td>
                  <td>₹{item.price}</td>
                  <td>{item.linkedTo ? <span className="simple-badge badge-green">{item.linkedTo}</span> : <span className="text-gray-400 text-sm">—</span>}</td>
                  <td>
                    <button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => { setEditing(item); setForm({ name: item.name, category: item.category, barCode: item.barCode, price: item.price, linkedTo: item.linkedTo || "" }); setShowModal(true); }}>Edit</button>
                    <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDelete(item.id)} style={{marginLeft: "6px"}}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan="6" className="text-center p-4 text-gray-400">No bar items mapped</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="bf-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="bf-modal" onClick={e => e.stopPropagation()}>
            <h3 className="bf-modal-title">{editing ? "Edit Bar Item" : "Add Bar Item"}</h3>
            <div className="simple-form-group"><label className="simple-label">Item Name *</label><input className="simple-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Category</label><input className="simple-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} list="bf-cats" /><datalist id="bf-cats">{categories.map(c => <option key={c} value={c} />)}</datalist></div>
            <div className="simple-form-group"><label className="simple-label">Bar Code</label><input className="simple-input" value={form.barCode} onChange={e => setForm(p => ({ ...p, barCode: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Price (₹)</label><input type="number" className="simple-input" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} min="0" /></div>
            <div className="simple-form-group"><label className="simple-label">Link to Food Group</label><select className="simple-select" value={form.linkedTo} onChange={e => setForm(p => ({ ...p, linkedTo: e.target.value }))}><option value="">-- None --</option>{foodGroups.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
            <div className="simple-btn-row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
              <button className="simple-btn simple-btn-gray" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="simple-btn simple-btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BarToFood;