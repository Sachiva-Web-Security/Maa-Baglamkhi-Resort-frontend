import React, { useState, useEffect } from "react";
import API from "../api";
import "./InvoiceGroups.css";

const InvoiceGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", prefix: "", description: "", isActive: true });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await API.get("/accounts/invoice-groups");
      if (res.data && res.data.length > 0) {
        setGroups(res.data);
      } else {
        setGroups([
          { id: 1, name: "Restaurant", prefix: "REST", description: "Restaurant billing invoices", isActive: true },
          { id: 2, name: "Banquet", prefix: "BANQ", description: "Banquet and event invoices", isActive: true },
          { id: 3, name: "Room Service", prefix: "ROOM", description: "In-room dining invoices", isActive: true },
          { id: 4, name: "Parcel", prefix: "PARC", description: "Takeaway and parcel invoices", isActive: true },
          { id: 5, name: "Quick Sales", prefix: "QS", description: "Quick counter sales", isActive: true },
        ]);
      }
    } catch (err) {
      console.error("Error fetching invoice groups:", err);
      setGroups([
        { id: 1, name: "Restaurant", prefix: "REST", description: "Restaurant billing invoices", isActive: true },
        { id: 2, name: "Banquet", prefix: "BANQ", description: "Banquet and event invoices", isActive: true },
        { id: 3, name: "Room Service", prefix: "ROOM", description: "In-room dining invoices", isActive: true },
        { id: 4, name: "Parcel", prefix: "PARC", description: "Takeaway and parcel invoices", isActive: true },
        { id: 5, name: "Quick Sales", prefix: "QS", description: "Quick counter sales", isActive: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.prefix) return alert("Name and prefix are required");
    if (editing) {
      try {
        await API.put(`/accounts/invoice-groups/${editing.id}`, form);
        setGroups(prev => prev.map(g => g.id === editing.id ? { ...g, ...form } : g));
      } catch (err) {
        setGroups(prev => prev.map(g => g.id === editing.id ? { ...g, ...form } : g));
      }
    } else {
      const newGroup = { id: Date.now(), ...form };
      try {
        const res = await API.post("/accounts/invoice-groups", form);
        newGroup.id = res.data?.id || Date.now();
      } catch (err) { /* use local id */ }
      setGroups(prev => [...prev, newGroup]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({ name: "", prefix: "", description: "", isActive: true });
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this invoice group?")) return;
    API.delete(`/accounts/invoice-groups/${id}`).catch(console.error);
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  return (
    <div className="ig-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Invoice Groups</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => { setEditing(null); setForm({ name: "", prefix: "", description: "", isActive: true }); setShowModal(true); }}>
          + Add Invoice Group
        </button>
      </div>

      <div className="ig-grid">
        {groups.map(group => (
          <div key={group.id} className="ig-card">
            <div className="ig-card-top" style={{ background: group.isActive ? "#5da548" : "#999" }}>
              <div className="ig-card-prefix">{group.prefix}</div>
              <div className="ig-card-status">{group.isActive ? "Active" : "Inactive"}</div>
            </div>
            <div className="ig-card-body">
              <div className="ig-card-name">{group.name}</div>
              <div className="ig-card-desc">{group.description || "No description"}</div>
            </div>
            <div className="ig-card-actions">
              <button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => { setEditing(group); setForm({ name: group.name, prefix: group.prefix, description: group.description || "", isActive: group.isActive }); setShowModal(true); }}>Edit</button>
              <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDelete(group.id)}>Delete</button>
            </div>
          </div>
        ))}
        {groups.length === 0 && !loading && (
          <div className="ig-empty">No invoice groups found.</div>
        )}
      </div>

      {showModal && (
        <div className="ig-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="ig-modal" onClick={e => e.stopPropagation()}>
            <h3 className="ig-modal-title">{editing ? "Edit Invoice Group" : "Add Invoice Group"}</h3>
            <div className="simple-form-group"><label className="simple-label">Group Name *</label><input className="simple-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Restaurant" /></div>
            <div className="simple-form-group"><label className="simple-label">Prefix *</label><input className="simple-input" value={form.prefix} onChange={e => setForm(p => ({ ...p, prefix: e.target.value }))} placeholder="e.g. REST" maxLength="6" /></div>
            <div className="simple-form-group"><label className="simple-label">Description</label><textarea className="simple-textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." /></div>
            <div className="ig-toggle-row">
              <span>Active</span>
              <label className="ig-toggle">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                <span className="ig-toggle-slider"></span>
              </label>
            </div>
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

export default InvoiceGroups;