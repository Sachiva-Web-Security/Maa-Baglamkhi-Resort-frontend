import { useEffect, useState, useRef } from "react";
import { FaPlug, FaTimes, FaTrashAlt, FaCheck, FaFingerprint, FaBolt } from "react-icons/fa";
import API from "../../api";

const EsslDevicePanel = ({ open, onClose, onConfigChanged }) => {
  const [status, setStatus] = useState(null);
  const [devices, setDevices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [form, setForm] = useState({
    deviceName: "Main Office",
    connection: "COM",
    portName: "",
    baudRate: 9600,
    pollIntervalMs: 30000,
    employeeId: null,
    employeeEmail: "",
    terminalUserId: 1,
  });

  useEffect(() => {
    if (!open) return;

    const fetchStatus = async () => {
      try {
        const res = await API.get("/attendance/essl/status");
        const cfg = res.data?.config || {};
        setStatus(res.data);
        setForm((prev) => ({
          ...prev,
          deviceName: cfg.deviceType || prev.deviceName,
          portName: cfg.portName || prev.portName,
          baudRate: cfg.baudRate || prev.baudRate,
          pollIntervalMs: cfg.pollIntervalMs || prev.pollIntervalMs,
        }));
      } catch (err) {
        console.error("Failed to fetch eSSL status", err);
      }
    };

    const fetchDevices = async () => {
      try {
        const res = await API.get("/attendance/essl/devices");
        setDevices(res.data || []);
      } catch (err) {
        console.error("Failed to fetch eSSL devices", err);
      }
    };

    fetchStatus();
    fetchDevices();
  }, [open]);

  const handleConfigSave = async () => {
    setSaving(true);
    try {
      // Save port settings into app_settings via the PUT /settings endpoint
      await API.put("/settings", {
        esslDevice: {
          enabled: form.enabled !== false,
          portName: form.portName,
          baudRate: form.baudRate,
          pollIntervalMs: form.pollIntervalMs,
          deviceType: form.deviceName,
        },
      });
      onConfigChanged?.();
      await fetchStatus();
      window.alert("eSSL settings saved");
    } catch (err) {
      console.error("Failed to save eSSL settings", err);
      window.alert("Failed to save settings: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleAddDevice = async () => {
    if (!form.employeeId || !form.terminalUserId) {
      window.alert("Employee ID and Terminal User ID are required");
      return;
    }
    setSaving(true);
    try {
      await API.post("/attendance/essl/devices", {
        deviceName: form.deviceName,
        connection: form.connection,
        baudRate: form.baudRate,
        employeeId: form.employeeId,
        employeeEmail: form.employeeEmail,
        terminalUserId: form.terminalUserId,
      });
      const res = await API.get("/attendance/essl/devices");
      setDevices(res.data || []);
      onConfigChanged?.();
    } catch (err) {
      console.error("Failed to register eSSL device", err);
      window.alert("Failed to register device: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDisableDevice = async (id) => {
    try {
      await API.put(`/attendance/essl/devices/${id}`, { active: false });
      const res = await API.get("/attendance/essl/devices");
      setDevices(res.data || []);
    } catch (err) {
      console.error("Failed to disable device", err);
    }
  };

  const handleTestConnection = async () => {
    setTestMsg("Testing connection…");
    try {
      const res = await API.get("/attendance/essl/status");
      const st = res.data;
      if (st.lastError) {
        setTestMsg(`⚠ ${st.lastError}`);
      } else if (st.running) {
        setTestMsg(`✓ Poller active — last sync ${st.lastPollAt ? new Date(st.lastPollAt).toLocaleTimeString() : "—"}`);
      } else {
        setTestMsg("✓ Backend reachable. Set a port and restart the backend to activate the poller.");
      }
    } catch (err) {
      setTestMsg("✗ Could not reach the backend eSSL endpoint: " + (err.response?.data?.error || err.message));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/50 p-3 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-[680px] overflow-y-auto rounded-[28px] border border-white/60 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FaFingerprint className="text-violet-600" /> eSSL Biometric Terminal
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
            <FaTimes />
          </button>
        </div>

        {/* Status card */}
        <div className="mb-5 rounded-2xl bg-violet-50 border border-violet-100 p-4">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${status?.running ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
            <span className="text-sm font-semibold text-slate-700">
              {status?.running ? "Poller Active" : "Poller Idle"}
            </span>
            {status?.lastPollAt && (
              <span className="text-xs text-slate-500">Last sync: {new Date(status.lastPollAt).toLocaleString()}</span>
            )}
          </div>
          {status?.lastError && (
            <p className="mt-2 text-xs text-red-600">{status.lastError}</p>
          )}
        </div>

        {/* Port config */}
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-600 flex items-center gap-2">
            <FaPlug /> Serial Port Configuration
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Port (Windows: COM3 etc.)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                value={form.portName}
                onChange={(e) => setForm({ ...form, portName: e.target.value })}
                placeholder="COM3"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Baud Rate</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                value={form.baudRate}
                onChange={(e) => setForm({ ...form, baudRate: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Poll Interval (ms)</label>
              <input
                type="number"
                step={1000}
                min={5000}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                value={form.pollIntervalMs}
                onChange={(e) => setForm({ ...form, pollIntervalMs: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleConfigSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Port Settings"}
            </button>
            <button
              onClick={handleTestConnection}
              className="flex-1 rounded-lg border border-violet-300 bg-violet-50 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100"
            >
              <span className="flex items-center justify-center gap-1.5">
                <FaBolt /> Test Connection
              </span>
            </button>
          </div>
          {testMsg && (
            <p className={`mt-2 text-xs font-medium ${testMsg.startsWith("✓") ? "text-green-600" : testMsg.startsWith("⚠") ? "text-amber-600" : "text-red-600"}`}>
              {testMsg}
            </p>
          )}
        </div>

        {/* Device mappings */}
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-600">Device / Employee Mappings</h3>

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Employee ID</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-blue-400"
                  value={form.employeeId || ""}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Employee Email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-blue-400"
                  value={form.employeeEmail}
                  onChange={(e) => setForm({ ...form, employeeEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Terminal User ID</label>
                <input
                  type="number"
                  min={1}
                  max={128}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-blue-400"
                  value={form.terminalUserId}
                  onChange={(e) => setForm({ ...form, terminalUserId: Number(e.target.value) })}
                />
              </div>
            </div>
            <button
              onClick={handleAddDevice}
              disabled={saving}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <FaCheck /> Register Mapping
            </button>
          </div>

          {devices.length > 0 && (
            <div className="divide-y divide-slate-100">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-700">
                      #{d.terminal_user_id} — {d.employee_email}
                    </span>
                    <span className={`ml-2 text-xs ${d.active ? "text-green-600" : "text-slate-400 line-through"}`}>
                      {d.active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDisableDevice(d.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    title="Disable"
                  >
                    <FaTrashAlt size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {devices.length === 0 && (
            <p className="py-3 text-center text-xs text-slate-400">No mappings registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EsslDevicePanel;
