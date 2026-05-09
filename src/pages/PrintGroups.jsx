import React, { useState } from "react";
import "./PrintGroups.css";

const PrintGroups = () => {
  const [groups, setGroups] = useState([
    { id: 1, name: "Kitchen", description: "Print to main kitchen", printCount: 1, printerName: "Kitchen-Printer" },
    { id: 2, name: "Bar", description: "Print to bar counter", printCount: 1, printerName: "Bar-Printer" },
    { id: 3, name: "Dessert Counter", description: "Print to dessert station", printCount: 1, printerName: "Dessert-Printer" },
    { id: 4, name: "Both", description: "Print to kitchen AND bar", printCount: 2, printerName: "Kitchen + Bar" },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", printCount: 1, printerName: "" });

  const handleSave = () => {
    if (!form.name) return alert("Group name required");
    if (editing) {
      setGroups(prev => prev.map(g => g.id === editing.id ? { ...g, ...form } : g));
    } else {
      setGroups(prev => [...prev, { id: Date.now(), ...form }]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({ name: "", description: "", printCount: 1, printerName: "" });
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this print group?")) return;
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  return (
    <div className="pug-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Print Groups</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => { setEditing(null); setForm({ name: "", description: "", printCount: 1, printerName: "" }); setShowModal(true); }}>+ Add Print Group</button>
      </div>
      <div className="simple-card">
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead><tr><th>Name</th><th>Description</th><th>Print Count</th><th>Printer</th><th>Actions</th></tr></thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id}>
                  <td className="font-medium">{g.name}</td>
                  <td className="simple-text-muted">{g.description || "—"}</td>
                  <td><span className="simple-badge badge-blue">{g.printCount}</span></td>
                  <td className="simple-text-muted">{g.printerName || "—"}</td>
                  <td>
                    <button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => { setEditing(g); setForm({ name: g.name, description: g.description || "", printCount: g.printCount, printerName: g.printerName || "" }); setShowModal(true); }}>Edit</button>
                    <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDelete(g.id)} style={{marginLeft: "6px"}}>Delete</button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && <tr><td colSpan="5" className="empty-order">No print groups found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="pug-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="pug-modal" onClick={e => e.stopPropagation()}>
            <h3 className="pug-modal-title">{editing ? "Edit Print Group" : "Add Print Group"}</h3>
            <div className="simple-form-group"><label className="simple-label">Name *</label><input className="simple-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Description</label><input className="simple-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="simple-form-group"><label className="simple-label">Print Count</label><input type="number" className="simple-input" value={form.printCount} onChange={e => setForm(p => ({ ...p, printCount: Number(e.target.value) }))} min="1" max="5" /></div>
            <div className="simple-form-group"><label className="simple-label">Printer Name</label><input className="simple-input" value={form.printerName} onChange={e => setForm(p => ({ ...p, printerName: e.target.value }))} placeholder="e.g. Kitchen-Printer" /></div>
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
export default PrintGroups;