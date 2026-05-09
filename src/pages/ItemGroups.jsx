import React, { useState } from "react";
import "./ItemGroups.css";

const ItemGroups = () => {
  const [groups, setGroups] = useState([
    { id: 1, name: "Starters", sortOrder: 1 },
    { id: 2, name: "Main Course", sortOrder: 2 },
    { id: 3, name: "Beverages", sortOrder: 3 },
    { id: 4, name: "Desserts", sortOrder: 4 },
    { id: 5, name: "Snacks", sortOrder: 5 },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", sortOrder: 0 });

  const handleSave = () => {
    if (!form.name) return alert("Group name required");
    if (editing) {
      setGroups(prev => prev.map(g => g.id === editing.id ? { ...g, ...form } : g));
    } else {
      setGroups(prev => [...prev, { id: Date.now(), ...form }]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({ name: "", sortOrder: groups.length + 1 });
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this item group?")) return;
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  return (
    <div className="ig-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Item Groups</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => { setEditing(null); setForm({ name: "", sortOrder: groups.length + 1 }); setShowModal(true); }}>+ Add Group</button>
      </div>
      <div className="simple-card">
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead><tr><th>Group Name</th><th>Sort Order</th><th>Actions</th></tr></thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id}>
                  <td className="font-medium">{g.name}</td>
                  <td>{g.sortOrder}</td>
                  <td>
                    <button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => { setEditing(g); setForm({ name: g.name, sortOrder: g.sortOrder }); setShowModal(true); }}>Edit</button>
                    <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDelete(g.id)} style={{marginLeft: "6px"}}>Delete</button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && <tr><td colSpan="3" className="empty-order">No item groups found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="ig-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="ig-modal" onClick={e => e.stopPropagation()}>
            <h3 className="ig-modal-title">{editing ? "Edit Item Group" : "Add Item Group"}</h3>
            <div className="simple-form-group"><label className="simple-label">Group Name *</label><input className="simple-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Sort Order</label><input type="number" className="simple-input" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} /></div>
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
export default ItemGroups;