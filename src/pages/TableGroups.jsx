import React, { useEffect, useState } from "react";
import API from "../api";
import "./TableGroups.css";

const TableGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", floor: "", sortOrder: 0 });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await API.get("/restaurant/table-groups");
      setGroups(res.data || []);
    } catch (err) {
      console.error("Error fetching table groups:", err);
      // Fallback to defaults
      setGroups([
        { id: 1, name: "RESTAURANT", description: "Main dining hall", floor: "Ground Floor", sortOrder: 1, tableCount: 0 },
        { id: 2, name: "GARDEN", description: "Outdoor garden seating", floor: "Ground Floor", sortOrder: 2, tableCount: 0 },
        { id: 3, name: "PARSAL", description: "Parcel/Carryout zone", floor: "Entrance", sortOrder: 3, tableCount: 0 },
        { id: 4, name: "ROOM DINING", description: "In-room dining service", floor: "All Floors", sortOrder: 4, tableCount: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Group name is required");
    setLoading(true);
    try {
      if (editingGroup) {
        await API.put(`/restaurant/table-groups/${editingGroup.id}`, form);
      } else {
        await API.post("/restaurant/table-groups", form);
      }
      setShowModal(false);
      setEditingGroup(null);
      setForm({ name: "", description: "", floor: "", sortOrder: 0 });
      fetchGroups();
      alert(editingGroup ? "Group updated" : "Group created");
    } catch (err) {
      console.error("Error saving table group:", err);
      alert("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (group) => {
    if (!confirm(`Delete table group "${group.name}"?`)) return;
    try {
      await API.delete(`/restaurant/table-groups/${group.id}`);
      fetchGroups();
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("Failed to delete");
    }
  };

  return (
    <div className="tg-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Table Groups</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => { setEditingGroup(null); setForm({ name: "", description: "", floor: "", sortOrder: groups.length + 1 }); setShowModal(true); }}>
          + Add Group
        </button>
      </div>

      <div className="tg-grid">
        {groups.map(group => (
          <div key={group.id} className="tg-card">
            <div className="tg-card-header" style={{ background: group.id % 2 === 0 ? "#4db1d4" : "#5da548" }}>
              <div className="tg-card-name">{group.name}</div>
              <div className="tg-card-floor">{group.floor}</div>
            </div>
            <div className="tg-card-body">
              <div className="tg-card-desc">{group.description || "No description"}</div>
              <div className="tg-card-meta">
                <span>Sort: {group.sortOrder}</span>
                {group.tableCount > 0 && <span>{group.tableCount} tables</span>}
              </div>
            </div>
            <div className="tg-card-actions">
              <button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => { setEditingGroup(group); setForm({ name: group.name, description: group.description || "", floor: group.floor || "", sortOrder: group.sortOrder || 0 }); setShowModal(true); }}>Edit</button>
              <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDelete(group)}>Delete</button>
            </div>
          </div>
        ))}
        {groups.length === 0 && !loading && (
          <div className="tg-empty">No table groups found. Create one to get started.</div>
        )}
      </div>

      {showModal && (
        <div className="tg-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="tg-modal" onClick={e => e.stopPropagation()}>
            <h3 className="tg-modal-title">{editingGroup ? "Edit Table Group" : "Add Table Group"}</h3>
            <div className="simple-form-group">
              <label className="simple-label">Group Name *</label>
              <input className="simple-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. GARDEN" />
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Floor / Area</label>
              <input className="simple-input" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} placeholder="e.g. Ground Floor" />
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Description</label>
              <textarea className="simple-textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." />
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Sort Order</label>
              <input type="number" className="simple-input" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} />
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

export default TableGroups;