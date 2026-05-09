import React, { useState } from "react";
import "./PriceGroups.css";

const PriceGroups = () => {
  const [groups, setGroups] = useState([
    { id: 1, name: "Standard", description: "Regular menu pricing", discount: 0 },
    { id: 2, name: "Staff Rate", description: "Employee discount pricing", discount: 20 },
    { id: 3, name: "Bulk Order", description: "Catering / party orders", discount: 15 },
    { id: 4, name: "VIP", description: "Premium guest pricing", discount: 0 },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", discount: 0 });

  const handleSave = () => {
    if (!form.name) return alert("Group name required");
    if (editing) {
      setGroups(prev => prev.map(g => g.id === editing.id ? { ...g, ...form } : g));
    } else {
      setGroups(prev => [...prev, { id: Date.now(), ...form }]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({ name: "", description: "", discount: 0 });
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this price group?")) return;
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  return (
    <div className="pg-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Price Groups</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => { setEditing(null); setForm({ name: "", description: "", discount: 0 }); setShowModal(true); }}>+ Add Price Group</button>
      </div>
      <div className="simple-card">
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead><tr><th>Name</th><th>Description</th><th>Discount %</th><th>Actions</th></tr></thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id}>
                  <td className="font-medium">{g.name}</td>
                  <td className="text-gray-600">{g.description || "—"}</td>
                  <td>{g.discount > 0 ? <span className="simple-badge badge-orange">{g.discount}%</span> : <span className="text-gray-400">—</span>}</td>
                  <td>
                    <button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => { setEditing(g); setForm({ name: g.name, description: g.description || "", discount: g.discount }); setShowModal(true); }}>Edit</button>
                    <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDelete(g.id)} style={{marginLeft: "6px"}}>Delete</button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && <tr><td colSpan="4" className="text-center p-4 text-gray-400">No price groups found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="pg-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <h3 className="pg-modal-title">{editing ? "Edit Price Group" : "Add Price Group"}</h3>
            <div className="simple-form-group"><label className="simple-label">Name *</label><input className="simple-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Description</label><input className="simple-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Discount %</label><input type="number" className="simple-input" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: Number(e.target.value) }))} min="0" max="100" /></div>
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
export default PriceGroups;