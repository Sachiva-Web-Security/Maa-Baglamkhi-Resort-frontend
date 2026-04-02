import { useState, useEffect, useCallback } from "react";
import { FaTimes, FaCalculator, FaPlus, FaSyncAlt, FaDownload } from "react-icons/fa";
import API from "../../api";

const DEFAULT_COSTS = {
  staffCostPerHour: 120,
  avgCleaningHours: 0.5,
  lineCostPerClean: 45,
  toiletrieCostPerClean: 30,
  miscCostPerClean: 15,
};

export default function RoomCostingModal({ rooms, onClose, apiBase }) {
  const [costs, setCosts] = useState(DEFAULT_COSTS);
  const [costLogs, setCostLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("calculator");
  const [saving, setSaving] = useState(false);

  // Per-room overrides
  const [roomOverrides, setRoomOverrides] = useState({});
  const [selectedRoom, setSelectedRoom] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/housekeeping/costing");
      setCostLogs(res.data);
    } catch { setCostLogs([]); }
    finally { setLoading(false); }
  }, [apiBase]);

  useEffect(() => { if (tab === "history") fetchLogs(); }, [tab, fetchLogs]);

  const calcCostPerClean = (override = {}) => {
    const c = { ...costs, ...override };
    return (
      (c.staffCostPerHour * c.avgCleaningHours) +
      c.lineCostPerClean +
      c.toiletrieCostPerClean +
      c.miscCostPerClean +
      (c.extraLinen || 0) +
      (c.extraMisc || 0)
    );
  };

  const totalCostPerClean = calcCostPerClean();

  const handleLogCost = async () => {
    if (!selectedRoom) return;
    setSaving(true);
    const room = rooms.find(r => String(r.id) === selectedRoom);
    const costData = { ...costs, ...(roomOverrides[selectedRoom] || {}) };
    const totalCost = calcCostPerClean(roomOverrides[selectedRoom]);
    try {
      await API.post("/housekeeping/costing", {
        roomId: selectedRoom,
        roomNo: room?.roomNo,
        ...costData,
        totalCost,
        loggedBy: localStorage.getItem("username") || "Staff",
      });
      alert(`Cost logged for Room ${room?.roomNo}: ₹${totalCost.toFixed(2)}`);
      fetchLogs();
      setTab("history");
    } catch { alert("Failed to save cost log."); }
    setSaving(false);
  };

  const exportCSV = () => {
    const rows = [["Room", "Staff Cost", "Linen", "Toiletries", "Misc", "Total", "Date", "By"]];
    costLogs.forEach(r => rows.push([r.room_no, r.staff_cost, r.linen_cost, r.toiletrie_cost, r.misc_cost, r.total_cost, r.created_at?.slice(0, 10), r.logged_by]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv); a.download = "room_costing.csv"; a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl bg-white px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <FaCalculator className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Room Costing</h3>
              <p className="text-xs text-slate-500">Calculate cost per clean including staff, linen & supplies</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><FaTimes /></button>
        </div>

        <div className="p-6">
          <div className="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
            {[{ key: "calculator", label: "Calculator" }, { key: "history", label: "Cost History" }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "calculator" && (
            <>
              {/* Global Parameters */}
              <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <h4 className="mb-4 font-bold text-indigo-900">Default Cost Parameters</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Staff Cost / Hour (₹)", key: "staffCostPerHour" },
                    { label: "Avg Cleaning Time (hrs)", key: "avgCleaningHours" },
                    { label: "Linen Cost / Clean (₹)", key: "lineCostPerClean" },
                    { label: "Toiletries / Clean (₹)", key: "toiletrieCostPerClean" },
                    { label: "Misc / Clean (₹)", key: "miscCostPerClean" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="mb-1 block text-xs font-semibold text-indigo-700">{f.label}</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={costs[f.key]}
                        onChange={e => setCosts(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown */}
                <div className="mt-5 rounded-xl border border-indigo-200 bg-white p-4">
                  <div className="text-xs font-bold uppercase text-indigo-600 mb-3">Cost Breakdown</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">Staff Labour</span><span className="font-semibold">₹{(costs.staffCostPerHour * costs.avgCleaningHours).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Linen</span><span className="font-semibold">₹{costs.lineCostPerClean.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Toiletries</span><span className="font-semibold">₹{costs.toiletrieCostPerClean.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Misc</span><span className="font-semibold">₹{costs.miscCostPerClean.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-indigo-700">
                      <span>Total Cost / Clean</span>
                      <span className="text-xl">₹{totalCostPerClean.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Log Cost for Room */}
              <div className="rounded-2xl border border-slate-200 p-5">
                <h4 className="mb-4 font-bold text-slate-900">Log Cleaning Cost for Room</h4>
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Select Room</label>
                  <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none">
                    <option value="">Select Room</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>Room {r.roomNo} – {r.roomType || "N/A"}</option>)}
                  </select>
                </div>

                {selectedRoom && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 mb-4">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Room-specific override (optional)</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Extra Linen (₹)", key: "extraLinen" },
                        { label: "Extra Misc (₹)", key: "extraMisc" },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="mb-1 block text-xs text-slate-600">{f.label}</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={roomOverrides[selectedRoom]?.[f.key] || ""}
                            onChange={e => setRoomOverrides(prev => ({ ...prev, [selectedRoom]: { ...(prev[selectedRoom] || {}), [f.key]: parseFloat(e.target.value) || 0 } }))}
                            placeholder="0"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-right text-sm font-black text-indigo-700">
                      Total for this room: ₹{calcCostPerClean(roomOverrides[selectedRoom]).toFixed(2)}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button onClick={handleLogCost} disabled={!selectedRoom || saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    <FaPlus className="text-xs" /> {saving ? "Saving..." : "Log Cleaning Cost"}
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === "history" && (
            <>
              <div className="mb-4 flex gap-2">
                <button onClick={fetchLogs} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <FaSyncAlt className="text-xs" /> Refresh
                </button>
                <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <FaDownload className="text-xs" /> Export
                </button>
              </div>

              {loading ? (
                <div className="py-10 text-center text-slate-400"><FaSyncAlt className="animate-spin inline mr-2" />Loading...</div>
              ) : costLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-slate-400">No cost records yet.</div>
              ) : (
                <>
                  <div className="mb-3 flex gap-4">
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                      <div className="text-xs font-semibold text-indigo-600">Total Logged</div>
                      <div className="text-2xl font-black text-indigo-900">{costLogs.length} cleans</div>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <div className="text-xs font-semibold text-rose-600">Total Cost</div>
                      <div className="text-2xl font-black text-rose-900">₹{costLogs.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0).toFixed(0)}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <div className="text-xs font-semibold text-emerald-600">Avg Cost / Clean</div>
                      <div className="text-2xl font-black text-emerald-900">₹{costLogs.length ? (costLogs.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0) / costLogs.length).toFixed(0) : 0}</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>{["Room", "Staff", "Linen", "Toiletries", "Misc", "Total", "Date", "By"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {costLogs.map((r, i) => (
                          <tr key={r.id || i} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold">{r.room_no}</td>
                            <td className="px-4 py-3">₹{parseFloat(r.staff_cost || 0).toFixed(0)}</td>
                            <td className="px-4 py-3">₹{parseFloat(r.linen_cost || 0).toFixed(0)}</td>
                            <td className="px-4 py-3">₹{parseFloat(r.toiletrie_cost || 0).toFixed(0)}</td>
                            <td className="px-4 py-3">₹{parseFloat(r.misc_cost || 0).toFixed(0)}</td>
                            <td className="px-4 py-3 font-black text-indigo-700">₹{parseFloat(r.total_cost || 0).toFixed(0)}</td>
                            <td className="px-4 py-3 text-slate-400">{r.created_at?.slice(0, 10)}</td>
                            <td className="px-4 py-3 text-slate-400">{r.logged_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
