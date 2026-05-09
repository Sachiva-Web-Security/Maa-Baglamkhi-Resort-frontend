import React, { useState } from "react";
import "./Units.css";

const Units = () => {
  const [units, setUnits] = useState([
    { id: 1, name: "pcs", description: "Pieces", abbr: "pcs" },
    { id: 2, name: "kg", description: "Kilogram", abbr: "kg" },
    { id: 3, name: "g", description: "Gram", abbr: "g" },
    { id: 4, name: "L", description: "Litre", abbr: "L" },
    { id: 5, name: "ml", description: "Millilitre", abbr: "ml" },
    { id: 6, name: "dozen", description: "Dozen", abbr: "dz" },
    { id: 7, name: "box", description: "Box", abbr: "box" },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", abbr: "" });

  const handleSave = () => {
    if (!form.name || !form.abbr) return alert("Name and abbreviation required");
    if (editing) {
      setUnits(prev => prev.map(u => u.id === editing.id ? { ...u, ...form } : u));
    } else {
      setUnits(prev => [...prev, { id: Date.now(), ...form }]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({ name: "", description: "", abbr: "" });
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this unit?")) return;
    setUnits(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="u-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Units of Measurement</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => { setEditing(null); setForm({ name: "", description: "", abbr: "" }); setShowModal(true); }}>+ Add Unit</button>
      </div>
      <div className="simple-card">
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead><tr><th>Name</th><th>Abbreviation</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
              {units.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td><span className="simple-badge badge-gray">{u.abbr}</span></td>
                  <td className="text-gray-600">{u.description || "—"}</td>
                  <td>
                    <button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => { setEditing(u); setForm({ name: u.name, description: u.description || "", abbr: u.abbr }); setShowModal(true); }}>Edit</button>
                    <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDelete(u.id)} style={{marginLeft: "6px"}}>Delete</button>
                  </td>
                </tr>
              ))}
              {units.length === 0 && <tr><td colSpan="4" className="text-center p-4 text-gray-400">No units found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="u-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="u-modal" onClick={e => e.stopPropagation()}>
            <h3 className="u-modal-title">{editing ? "Edit Unit" : "Add Unit"}</h3>
            <div className="simple-form-group"><label className="simple-label">Name *</label><input className="simple-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kilogram" /></div>
            <div className="simple-form-group"><label className="simple-label">Abbreviation *</label><input className="simple-input" value={form.abbr} onChange={e => setForm(p => ({ ...p, abbr: e.target.value }))} placeholder="e.g. kg" /></div>
            <div className="simple-form-group"><label className="simple-label">Description</label><input className="simple-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
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
export default Units;