import { useEffect, useState } from "react";
import {
  FaCog,
  FaFingerprint,
  FaPlug,
  FaTrashAlt,
  FaBolt,
  FaUserPlus,
} from "react-icons/fa";
import API from "../api";

/* ─── shared input styles ─────────────────────────────────────────────── */
const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200";

const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500";

const StatusDot = ({ running }) => (
  <span
    className={`inline-block h-3 w-3 rounded-full ${
      running ? "animate-pulse bg-green-500" : "bg-slate-300"
    }`}
  />
);

const Settings = () => {
  /* eSSL state */
  const [essl, setEssl] = useState(null);
  const [esslForm, setEsslForm] = useState({
    enabled: true,
    portName: "",
    baudRate: 9600,
    pollIntervalMs: 30000,
    deviceType: "eSSL01",
  });
  const [mappingForm, setMappingForm] = useState({
    deviceName: "Main Office",
    terminalUserId: 1,
    employeeEmail: "",
  });
  const [mappings, setMappings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statusRes, devRes] = await Promise.all([
          API.get("/attendance/essl/status"),
          API.get("/attendance/essl/devices"),
        ]);

        setEssl(statusRes.data);
        const cfg = statusRes.data?.config || {};
        setEsslForm({
          enabled: cfg.enabled !== false,
          portName: cfg.portName || "",
          baudRate: cfg.baudRate || 9600,
          pollIntervalMs: cfg.pollIntervalMs || 30000,
          deviceType: cfg.deviceType || "eSSL01",
        });
        setMappings(devRes.data || []);
      } catch (err) {
        console.error("Failed to load eSSL settings", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ── save port config ────────────────────────────────────────────── */
  const handleSaveConfig = async () => {
    setSaving(true);
    setTestMsg("");
    try {
      await API.put("/settings", {
        esslDevice: {
          enabled: esslForm.enabled,
          portName: esslForm.portName,
          baudRate: Number(esslForm.baudRate) || 9600,
          pollIntervalMs: Number(esslForm.pollIntervalMs) || 30000,
          deviceType: esslForm.deviceType,
        },
      });
      // refresh status
      const res = await API.get("/attendance/essl/status");
      setEssl(res.data);
      setTestMsg("✓ Settings saved. The poller will pick up the new port on its next cycle.");
    } catch (err) {
      setTestMsg("✗ " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  /* ── add employee mapping ───────────────────────────────────────── */
  const handleAddMapping = async () => {
    if (!mappingForm.terminalUserId || !mappingForm.employeeEmail) {
      setTestMsg("✗ Terminal User ID and Employee Email are required.");
      return;
    }
    setSaving(true);
    setTestMsg("");
    try {
      await API.post("/attendance/essl/devices", {
        deviceName: mappingForm.deviceName || "Main Office",
        connection: "COM",
        employeeEmail: mappingForm.employeeEmail,
        terminalUserId: Number(mappingForm.terminalUserId),
      });
      const devRes = await API.get("/attendance/essl/devices");
      setMappings(devRes.data || []);
      setMappingForm({ deviceName: "Main Office", terminalUserId: 1, employeeEmail: "" });
      setTestMsg("✓ Mapping registered.");
    } catch (err) {
      setTestMsg(
        "✗ " + (err.response?.data?.message || err.response?.data?.error || err.message)
      );
    } finally {
      setSaving(false);
    }
  };

  /* ── disable a mapping ──────────────────────────────────────────── */
  const handleDisableMapping = async (id) => {
    try {
      await API.put(`/attendance/essl/devices/${id}`, { active: false });
      const devRes = await API.get("/attendance/essl/devices");
      setMappings(devRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ── test connection ───────────────────────────────────────────── */
  const handleTest = async () => {
    setTestMsg("Testing…");
    try {
      const res = await API.get("/attendance/essl/status");
      const st = res.data;
      if (st.lastError) setTestMsg("⚠ " + st.lastError);
      else if (st.running)
        setTestMsg(
          "✓ Poller active. Last sync: " +
            (st.lastPollAt ? new Date(st.lastPollAt).toLocaleTimeString() : "—") +
            (st.lastImportCount ? ` • ${st.lastImportCount} imported last cycle.` : "")
        );
      else
        setTestMsg(
          "✓ Backend reachable. Set the COM port above, save, and restart the backend."
        );
    } catch (err) {
      setTestMsg("✗ " + (err.response?.data?.error || err.message));
    }
  };

  const activeMappings = mappings.filter((m) => m.active);
  const inactiveMappings = mappings.filter((m) => !m.active);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-extrabold text-slate-900">
          <FaCog className="text-blue-600" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage integrations and system configuration.
        </p>
      </div>

      {/* ─── eSSL CARD ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-violet-100 bg-white shadow-[0_4px_20px_rgba(109,40,217,0.06)]">
        <div className="flex items-center justify-between border-b border-violet-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <FaFingerprint className="text-lg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                eSSL Biometric Terminal
              </h2>
              <p className="text-xs text-slate-500">
                Connect the fingerprint / face attendance machine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot running={essl?.running} />
            <span className="text-xs font-semibold text-slate-600">
              {essl?.running ? "Active" : "Idle"}
            </span>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={esslForm.enabled}
              onChange={(e) =>
                setEsslForm({ ...esslForm, enabled: e.target.checked })
              }
              className="h-5 w-5 rounded accent-violet-600"
            />
            <span className="text-sm font-semibold text-slate-700">
              Enable eSSL attendance import
            </span>
          </label>

          {/* Port fields */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Serial Port</label>
              <input
                type="text"
                className={inputCls}
                placeholder="COM3"
                value={esslForm.portName}
                onChange={(e) =>
                  setEsslForm({ ...esslForm, portName: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Baud Rate</label>
              <input
                type="number"
                min={1200}
                max={115200}
                step={9600}
                className={inputCls}
                value={esslForm.baudRate}
                onChange={(e) =>
                  setEsslForm({ ...esslForm, baudRate: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Poll Interval (ms)</label>
              <input
                type="number"
                min={5000}
                step={1000}
                className={inputCls}
                value={esslForm.pollIntervalMs}
                onChange={(e) =>
                  setEsslForm({ ...esslForm, pollIntervalMs: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Device Model</label>
              <select
                className={inputCls}
                value={esslForm.deviceType}
                onChange={(e) =>
                  setEsslForm({ ...esslForm, deviceType: e.target.value })
                }
              >
                <option value="eSSL01">eSSL01</option>
                <option value="Securoid">Securoid</option>
              </select>
            </div>
          </div>

          {/* Action row */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-violet-700 disabled:opacity-50"
            >
              <FaPlug /> Save &amp; Apply
            </button>
            <button
              onClick={handleTest}
              className="flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-5 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
            >
              <FaBolt /> Test Connection
            </button>
          </div>

          {testMsg && (
            <p
              className={`text-xs font-medium ${
                testMsg.startsWith("✓")
                  ? "text-green-600"
                  : testMsg.startsWith("⚠")
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              {testMsg}
            </p>
          )}

          {essl?.lastError && !testMsg && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
              Last error: {essl.lastError}
            </div>
          )}
        </div>
      </section>

      {/* ─── EMPLOYEE MAPPINGS CARD ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-violet-100 bg-white shadow-[0_4px_20px_rgba(109,40,217,0.06)]">
        <div className="border-b border-violet-50 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">
            Employee Mappings
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Map the eSSL terminal user ID to an employee email so the system
            knows which person each fingerprint belongs to.
          </p>
        </div>

        <div className="space-y-4 p-6">
          {/* Add form */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Device Name</label>
                <input
                  type="text"
                  className={inputCls}
                  value={mappingForm.deviceName}
                  onChange={(e) =>
                    setMappingForm({
                      ...mappingForm,
                      deviceName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Terminal User ID</label>
                <input
                  type="number"
                  min={1}
                  max={128}
                  className={inputCls}
                  value={mappingForm.terminalUserId}
                  onChange={(e) =>
                    setMappingForm({
                      ...mappingForm,
                      terminalUserId: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Employee Email</label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="employee@resort.com"
                  value={mappingForm.employeeEmail}
                  onChange={(e) =>
                    setMappingForm({
                      ...mappingForm,
                      employeeEmail: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <button
              onClick={handleAddMapping}
              disabled={saving}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <FaUserPlus /> Register Mapping
            </button>
          </div>

          {/* Active list */}
          {activeMappings.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Active ({activeMappings.length})
              </h3>
              <div className="space-y-2">
                {activeMappings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-violet-100 bg-violet-50/40 px-4 py-2.5"
                  >
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        #{m.terminal_user_id}
                      </span>
                      <span className="mx-2 text-slate-300">→</span>
                      <span className="text-sm text-slate-600">
                        {m.employee_email}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        ({m.device_name})
                      </span>
                    </div>
                    <button
                      onClick={() => handleDisableMapping(m.id)}
                      title="Disable mapping"
                      className="text-slate-300 transition hover:text-red-500"
                    >
                      <FaTrashAlt size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive list */}
          {inactiveMappings.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
                Disabled ({inactiveMappings.length})
              </h3>
              <div className="space-y-2">
                {inactiveMappings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2 opacity-60"
                  >
                    <span className="text-sm text-slate-500 line-through">
                      #{m.terminal_user_id} → {m.employee_email}
                    </span>
                    <button
                      onClick={() => handleDisableMapping(m.id)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <FaTrashAlt size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mappings.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-3">
              No employee mappings registered yet. Register one above to start
              importing attendance.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Settings;
