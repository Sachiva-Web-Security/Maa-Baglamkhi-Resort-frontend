import { useEffect, useState } from "react";
import API from "../../../api";
import "./HousekeepingMasterView.css";

const HousekeepingMasterView = () => {
  const [rooms, setRooms] = useState([]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ remarks: "", assignee: "", status: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await API.get("/housekeeping");
      const list = data?.rooms || data || [];
      setRooms(Array.isArray(list) ? list : []);
    } catch (error) { console.error("Failed to load housekeeping rooms", error); }
  };
  useEffect(() => { load(); }, []);

  const edit = (room) => {
    setEditing(room.id || room._id);
    setDraft({ remarks: room.notes || "", assignee: room.assignee || "", status: room.status || "" });
  };
  const update = async (room) => {
    const id = room.id || room._id;
    setSaving(true);
    try {
      if (draft.status) await API.put(`/housekeeping/status/${id}`, { status: draft.status });
      if (draft.assignee) await API.put(`/housekeeping/assignee/${id}`, { assignee: draft.assignee });
      await API.put(`/housekeeping/${id}`, { ...room, notes: draft.remarks, status: draft.status || room.status, assignee: draft.assignee || room.assignee });
      setEditing(null);
      await load();
    } catch (error) { console.error("Failed to update room", error); }
    finally { setSaving(false); }
  };
  const shownStatus = (status) => String(status || "Dirty").toLowerCase().includes("clean") && !String(status).toLowerCase().includes("dirty") ? "Clean" : "Dirty";
  const today = new Date().toLocaleDateString("en-GB");

  return <div className="hk-master">
    <div className="hk-master-head"><span>Manage House Keeping</span><div><button onClick={load}>↻ Refresh</button><button className="yellow">Export to Excel</button><button className="blue">+ Print</button></div></div>
    <section className="hk-master-panel"><h4>List of Rooms</h4><div className="hk-master-table-title">House keeping details on {today}</div>
      <table><thead><tr><th>#</th><th>Room No</th><th>From</th><th>Remarks</th><th>House Keeper</th><th>Status</th><th/></tr></thead>
        <tbody>{rooms.map((room, index) => { const id = room.id || room._id; const isEdit = editing === id; return <tr key={id}>
          <td>{index + 1}</td><td>{room.roomNumber || room.roomNo || room.name}</td><td>{new Date(room.updated_at || room.created_at || Date.now()).toLocaleString("en-GB")}</td>
          <td>{isEdit ? <input value={draft.remarks} onChange={(e) => setDraft((p) => ({ ...p, remarks: e.target.value }))}/> : room.notes || ""}</td>
          <td>{isEdit ? <select value={draft.assignee} onChange={(e) => setDraft((p) => ({ ...p, assignee: e.target.value }))}><option value="">Select House Keeper</option><option>No Housekeeper</option><option>House Keeper 1</option></select> : room.assignee === "No Housekeeper" ? "" : room.assignee}</td>
          <td>{isEdit ? <select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}><option value="">Select Status</option><option>Vacant Dirty</option><option>Cleaning In Progress</option><option>Vacant Clean</option><option>Out of Service</option></select> : <b className={shownStatus(room.status) === "Dirty" ? "dirty" : "clean"}>{shownStatus(room.status)}</b>}</td>
          <td>{isEdit ? <button className="update" disabled={saving} onClick={() => update(room)}>↻ {saving ? "Updating" : "Update"}</button> : <button className="edit" onClick={() => edit(room)}>✎ Edit</button>}</td>
        </tr>; })}</tbody>
      </table>
    </section><button className="fo-edge-toggle">‹</button>
  </div>;
};
export default HousekeepingMasterView;
