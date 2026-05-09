import React, { useState } from "react";
import "./Modifiers.css";

const Modifiers = () => {
  const [modifiers, setModifiers] = useState([
    { id: 1, name: "Extra Spicy", group: "Spice Level", price: 0 },
    { id: 2, name: "No Onion", group: "Preferences", price: 0 },
    { id: 3, name: "Less Salt", group: "Preferences", price: 0 },
    { id: 4, name: "Extra Cheese", group: "Toppings", price: 30 },
    { id: 5, name: "Gluten Free", group: "Dietary", price: 50 },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", group: "", price: 0 });

  const groups = [...new Set(modifiers.map(m => m.group))];

  const handleSave = () => {
    if (!form.name || !form.group) return alert("Name and group required");
    if (editing) {
      setModifiers(prev => prev.map(m => m.id === editing.id ? { ...m, ...form } : m));
    } else {
      setModifiers(prev => [...prev, { id: Date.now(), ...form }]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({ name: "", group: "", price: 0 });
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this modifier?")) return;
    setModifiers(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="mod-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Modifiers</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => { setEditing(null); setForm({ name: "", group: "", price: 0 }); setShowModal(true); }}>+ Add Modifier</button>
      </div>
      <div className="simple-card">
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead><tr><th>Name</th><th>Group</th><th>Extra Price</th><th>Actions</th></tr></thead>
            <tbody>
              {modifiers.map(m => (
                <tr key={m.id}>
                  <td className="font-medium">{m.name}</td>
                  <td><span className="simple-badge badge-blue">{m.group}</span></td>
                  <td>{m.price > 0 ? `₹${m.price}` : "—"}</td>
                  <td>
                    <button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => { setEditing(m); setForm({ name: m.name, group: m.group, price: m.price }); setShowModal(true); }}>Edit</button>
                    <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDelete(m.id)} style={{marginLeft: "6px"}}>Delete</button>
                  </td>
                </tr>
              ))}
              {modifiers.length === 0 && <tr><td colSpan="4" className="empty-order">No modifiers found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="mod-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <h3 className="mod-modal-title">{editing ? "Edit Modifier" : "Add Modifier"}</h3>
            <div className="simple-form-group"><label className="simple-label">Name *</label><input className="simple-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Group *</label><input className="simple-input" value={form.group} onChange={e => setForm(p => ({ ...p, group: e.target.value }))} list="mod-groups" /><datalist id="mod-groups">{groups.map(g => <option key={g} value={g} />)}</datalist></div>
            <div className="simple-form-group"><label className="simple-label">Extra Price (₹)</label><input type="number" className="simple-input" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} min="0" /></div>
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
export default Modifiers;