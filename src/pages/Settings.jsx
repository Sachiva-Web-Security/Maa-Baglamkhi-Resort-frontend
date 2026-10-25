import { useEffect, useState } from "react";
import {
  FaCog,
  FaFingerprint,
  FaPlug,
  FaTrashAlt,
  FaBolt,
  FaUserPlus,
  FaSync,
  FaListUl,
  FaCheckCircle,
  FaSpinner,
  FaWrench,
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
    connection: "COM",
    protocol: "zk",
    portName: "",
    host: "192.168.1.201",
    tcpPort: 4370,
    udpPort: 4000,
    baudRate: 9600,
    pollIntervalMs: 30000,
    deviceType: "eSSL01",
    user: "essl",
    pass: "essl",
  });
  const [diagnoseResult, setDiagnoseResult] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    deviceName: "Main Office",
    terminalUserId: 1,
    employeeEmail: "",
  });
  const [mappings, setMappings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [serialPorts, setSerialPorts] = useState([]);
  const [portsLoading, setPortsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statusRes, devRes, empRes] = await Promise.all([
          API.get("/attendance/essl/status"),
          API.get("/attendance/essl/devices"),
          API.get("/users").catch(() => ({ data: [] })),
        ]);

        setEssl(statusRes.data);
        const cfg = statusRes.data?.config || {};
        setEsslForm({
          enabled: cfg.enabled !== false,
          connection: cfg.connection || "COM",
          protocol: cfg.protocol || "zk",
          portName: cfg.portName || "",
          host: cfg.host || "192.168.1.201",
          tcpPort: cfg.tcpPort || 4370,
          baudRate: cfg.baudRate || 9600,
          pollIntervalMs: cfg.pollIntervalMs || 30000,
          deviceType: cfg.deviceType || "eSSL01",
          user: cfg.user || "essl",
          pass: cfg.pass || "essl",
          udpPort: cfg.udpPort || 4000,
        });
        setMappings(devRes.data || []);
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      } catch (err) {
        console.error("Failed to load eSSL settings", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* Detect the serial ports visible on this PC so the admin doesn't have
     to dig through Windows Device Manager to find the eSSL port. */
  const refreshPorts = async () => {
    setPortsLoading(true);
    try {
      const res = await API.get("/attendance/essl/ports");
      if (res.data?.ok) {
        setSerialPorts(res.data.ports || []);
      } else if (res.data?.error) {
        setTestMsg("⚠ " + res.data.error);
      }
    } catch (err) {
      setTestMsg("⚠ Could not list ports: " + (err.response?.data?.error || err.message));
    } finally {
      setPortsLoading(false);
    }
  };

  useEffect(() => {
    refreshPorts();
  }, []);

  /* ── save port config + restart the poller with the new values ─────── */
  const handleSaveConfig = async () => {
    setSaving(true);
    setTestMsg("");
    try {
      const isTcp = esslForm.connection === "TCP";
      await API.put("/settings", {
        esslDevice: {
          enabled: esslForm.enabled,
          connection: esslForm.connection,
          protocol: isTcp ? esslForm.protocol : undefined,
          portName: isTcp ? "" : esslForm.portName,
          host: isTcp ? esslForm.host : "",
          tcpPort: Number(esslForm.tcpPort) || 4370,
          baudRate: Number(esslForm.baudRate) || 9600,
          pollIntervalMs: Number(esslForm.pollIntervalMs) || 30000,
          deviceType: esslForm.deviceType,
          user: String(esslForm.user || "00000").trim(),
          pass: String(esslForm.pass || "00").trim(),
          udpPort: Number(esslForm.udpPort) || 4000,
          realtimeEnabled: true,
        },
      });
      const res = await API.post("/attendance/essl/restart");
      setEssl(res.data);
      if (!isTcp) {
        // Re-scan so the detected-ports strip below reflects any new COM number.
        await refreshPorts();
      }
      setTestMsg(
        "✓ Settings saved and poller restarted — it now runs on " +
          (esslForm.enabled
            ? isTcp
              ? `TCP ${esslForm.host}:${esslForm.tcpPort} (${esslForm.protocol}).`
              : `port ${esslForm.portName || "(none)"}.`
            : "the disabled state.")
      );
    } catch (err) {
      setTestMsg("✗ " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  /* ── pull one batch from the machine right now ─────────────────────── */
  const handlePollNow = async () => {
    setPolling(true);
    setTestMsg("Pulling attendance from the machine…");
    try {
      const res = await API.post("/attendance/essl/poll");
      const d = res.data;
      if (d.ok) {
        setTestMsg(
          "✓ Polled. " +
            (d.imported ? `${d.imported} new record${d.imported > 1 ? "s" : ""} imported.` : "No new records in the machine buffer.")
        );
      } else {
        setTestMsg("⚠ " + (d.error || "poll failed"));
      }
    } catch (err) {
      setTestMsg("✗ " + (err.response?.data?.error || err.message));
    } finally {
      setPolling(false);
    }
  };

  /* ── test a TCP/IP connection to the eSSL machine ────────────────── */
  const [testTcpLoading, setTestTcpLoading] = useState(false);
  const handleTestTcp = async () => {
    setTestTcpLoading(true);
    setTestMsg("Contacting " + esslForm.host + ":" + esslForm.tcpPort + "…");
    try {
      const res = await API.post("/attendance/essl/test-tcp");
      const d = res.data;
      if (d.reached && d.ok) {
        setTestMsg("✓ Reached device at " + esslForm.host + ":" + esslForm.tcpPort + ". Response: " + (d.response || "(no reply)"));
      } else if (d.reached && !d.ok) {
        setTestMsg("⚠ Reached " + esslForm.host + ":" + esslForm.tcpPort + " but got: " + (d.response || d.error));
      } else {
        setTestMsg("✗ Could not reach " + esslForm.host + ":" + esslForm.tcpPort + ". " + (d.error || "Check IP and that the eSSL has networking enabled."));
      }
    } catch (err) {
      setTestMsg("✗ " + (err.response?.data?.error || err.message));
    } finally {
      setTestTcpLoading(false);
    }
  };

  /* ── run every diagnostic check at once ───────────────────────────── */
  const handleDiagnose = async () => {
    setDiagnosing(true);
    setDiagnoseResult(null);
    try {
      const res = await API.post("/attendance/essl/diagnose");
      setDiagnoseResult(res.data);
    } catch (err) {
      setDiagnoseResult({
        allOk: false,
        passing: 0,
        total: 1,
        checks: [
          {
            key: "endpoint",
            label: "Diagnose endpoint",
            ok: false,
            detail: err.response?.data?.error || err.message || "request failed",
          },
        ],
      });
    } finally {
      setDiagnosing(false);
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
          "✓ Backend reachable. Set the target above, save, and poll."
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

        {/* Live poller strip */}
        {essl && (
          <div className="grid grid-cols-2 gap-3 border-b border-violet-50 px-6 py-3 text-xs sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Last sync</p>
              <p className="mt-0.5 font-semibold text-slate-700">
                {essl.lastPollAt ? new Date(essl.lastPollAt).toLocaleString() : "never"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Last import</p>
              <p className="mt-0.5 font-semibold text-slate-700">
                {essl.lastImportCount != null ? essl.lastImportCount + " record(s)" : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Target</p>
              <p className="mt-0.5 font-mono font-semibold text-slate-700">
                {essl.connection === "TCP"
                  ? `${essl.config?.host || "not set"}:${essl.config?.tcpPort || ""}`
                  : essl.config?.portName || "not set"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Health</p>
              <p className={`mt-0.5 font-semibold ${essl.lastError ? "text-amber-600" : "text-green-600"}`}>
                {essl.lastError ? essl.lastError : "OK"}
              </p>
            </div>
          </div>
        )}

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

          {/* Connection type */}
          <div>
            <label className={labelCls}>Connection Type</label>
            <div className="flex gap-2">
              {[{ v: "COM", label: "COM / USB serial" }, { v: "TCP", label: "TCP/IP (network)" }].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setEsslForm({ ...esslForm, connection: opt.v })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    esslForm.connection === opt.v
                      ? "border-violet-400 bg-violet-600 text-white shadow-sm"
                      : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Port fields */}
          {esslForm.connection === "COM" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Serial Port</label>
              <div className="flex gap-2">
                <select
                  className={inputCls + " flex-1"}
                  value={serialPorts.some((p) => p.path === esslForm.portName) ? esslForm.portName : esslForm.portName ? "__custom__" : ""}
                  onChange={(e) =>
                    setEsslForm({
                      ...esslForm,
                      portName: e.target.value === "__custom__" ? esslForm.portName : e.target.value,
                    })
                  }
                >
                  <option value="">— detect port —</option>
                  {serialPorts.map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.path}
                      {p.manufacturer ? ` — ${p.manufacturer}` : ""}
                      {p.productName ? ` (${p.productName})` : ""}
                    </option>
                  ))}
                  {esslForm.portName && !serialPorts.some((p) => p.path === esslForm.portName) && (
                    <option value="__custom__">{esslForm.portName} (manual)</option>
                  )}
                </select>
                <button
                  onClick={refreshPorts}
                  disabled={portsLoading}
                  title="Detect serial ports on this computer"
                  className="flex w-10 shrink-0 items-center justify-center rounded-lg border border-violet-300 bg-violet-50 text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                >
                  {portsLoading ? <FaSpinner spin /> : <FaListUl size={13} />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Plug in the machine, then click the list icon to detect its COM port.
              </p>
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
          ) : (
          <>
          {/* TCP/IP fields — machine is on the network, no COM port needed */}
          <div>
            <label className={labelCls}>Network Protocol</label>
            <div className="flex gap-2">
              {[
                { v: "zk", label: "ZKTeco packet (recommended for NF282)" },
                { v: "telnet", label: "Legacy Telnet (eSSL01 text)" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setEsslForm({ ...esslForm, protocol: opt.v })}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    esslForm.protocol === opt.v
                      ? "border-violet-400 bg-violet-600 text-white"
                      : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Host / IP</label>
              <input
                type="text"
                className={inputCls}
                placeholder="192.168.1.201"
                value={esslForm.host}
                onChange={(e) => setEsslForm({ ...esslForm, host: e.target.value })}
              />
              <p className="mt-1 text-[10px] text-slate-400">
                The IP from timeTrackLite's device list.
              </p>
            </div>
            <div>
              <label className={labelCls}>TCP Port</label>
              <input
                type="number"
                min={1}
                max={65535}
                className={inputCls}
                value={esslForm.tcpPort}
                onChange={(e) => setEsslForm({ ...esslForm, tcpPort: e.target.value })}
              />
              <p className="mt-1 text-[10px] text-slate-400">
                {esslForm.protocol === "zk"
                  ? "K80/eSSL devices use port 4370 for ZK data."
                  : "Legacy Telnet port — usually 4350."}
              </p>
            </div>
            <div>
              <label className={labelCls}>Poll Interval (ms)</label>
              <input
                type="number"
                min={5000}
                step={1000}
                className={inputCls}
                value={esslForm.pollIntervalMs}
                onChange={(e) => setEsslForm({ ...esslForm, pollIntervalMs: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Device Model</label>
              <select
                className={inputCls}
                value={esslForm.deviceType}
                onChange={(e) => setEsslForm({ ...esslForm, deviceType: e.target.value })}
              >
                <option value="ZKTeco NF282">ZKTeco NF282</option>
                <option value="eSSL K80">eSSL K80</option>
                <option value="eSSL01">eSSL01</option>
                <option value="Securoid">Securoid</option>
              </select>
            </div>
          </div>

          {/* UDP real-time push port */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>UDP Real-Time Port</label>
              <input
                type="number"
                min={1024}
                max={65535}
                className={inputCls}
                value={esslForm.udpPort}
                onChange={(e) => setEsslForm({ ...esslForm, udpPort: e.target.value })}
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Port the K80 pushes punches to in real-time. Set this same port in the K80's communication settings (timeTrackLite → TD device → Communication).
              </p>
            </div>
          </div>
          </>
          )}

          {/* Admin credentials — used for LOGIN before GETLOG on most eSSL models */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Admin User ID</label>
              <input
                type="text"
                className={inputCls}
                value={esslForm.user}
                onChange={(e) => setEsslForm({ ...esslForm, user: e.target.value })}
                
              />
              <p className="mt-1 text-[10px] text-slate-400">default essl.</p>
            </div>
            <div>
              <label className={labelCls}>Admin Password</label>
              <input
                type="text"
                className={inputCls}
                value={esslForm.pass}
                onChange={(e) => setEsslForm({ ...esslForm, pass: e.target.value })}
                
              />
              <p className="mt-1 text-[10px] text-slate-400">default essl.</p>
            </div>
          </div>

          {/* Full test button */}
          <div>
            <button
              onClick={handleDiagnose}
              disabled={diagnosing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50"
            >
              {diagnosing ? <FaSpinner spin /> : <FaWrench />}
              {diagnosing ? "Running diagnostics…" : "Run Full Connection Test"}
            </button>
            <p className="mt-1 text-center text-[11px] text-slate-400">
              Checks database, config, ports, network, employee mappings and poller status — one click.
            </p>
          </div>

          {/* Diagnose result panel */}
          {diagnoseResult && (
            <div
              className={`rounded-xl border p-4 ${
                diagnoseResult.allOk
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <h3 className={`mb-3 text-sm font-bold ${diagnoseResult.allOk ? "text-green-800" : "text-red-800"}`}>
                {diagnoseResult.allOk
                  ? "✓ All checks passed — the eSSL is connected and ready."
                  : `${diagnoseResult.passing}/${diagnoseResult.total} checks passed — see below.`}
              </h3>
              <div className="space-y-1.5">
                {diagnoseResult.checks.map((c) => (
                  <div
                    key={c.key}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                      c.ok ? "bg-white" : "bg-red-100 border border-red-200"
                    }`}
                  >
                    <span className={`mt-0.5 flex-shrink-0 ${c.ok ? "text-green-600" : "text-red-500"}`}>
                      {c.ok ? "✓" : "✗"}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800">{c.label}</span>
                      <p className={`mt-0.5 ${c.ok ? "text-slate-500" : "text-red-700"}`}>{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected ports strip — only relevant for COM connections */}
          {serialPorts.length > 0 && esslForm.connection === "COM" && (
            <div className="rounded-lg bg-violet-50 border border-violet-100 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-violet-500">
                {serialPorts.length} COM port{serialPorts.length > 1 ? "s" : ""} detected on this computer
              </p>
              <div className="flex flex-wrap gap-2">
                {serialPorts.map((p) => (
                  <button
                    key={p.path}
                    onClick={() => setEsslForm({ ...esslForm, portName: p.path })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-mono font-semibold transition ${
                      esslForm.portName === p.path
                        ? "border-violet-400 bg-violet-600 text-white shadow-sm"
                        : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    }`}
                    title={p.productName || p.manufacturer || p.path}
                  >
                    {p.path}
                    {p.vendorId ? ` · ${p.vendorId}` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
          {portsLoading && (
            <p className="text-xs text-violet-500">
              <FaSpinner spin className="mr-1" /> Scanning for serial ports…
            </p>
          )}

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-violet-700 disabled:opacity-50"
            >
              <FaPlug /> Save &amp; Apply
            </button>
            <button
              onClick={handlePollNow}
              disabled={polling}
              className="flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-5 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
            >
              {polling ? <FaSpinner spin /> : <FaSync />} Poll Now
            </button>
            <button
              onClick={handleTest}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
            >
              <FaCheckCircle size={14} /> Check Status
            </button>
            {esslForm.connection === "TCP" ? (
              <button
                onClick={handleTestTcp}
                disabled={testTcpLoading}
                className="flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-5 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
              >
                {testTcpLoading ? <FaSpinner spin /> : <FaBolt />} Test TCP Connection
              </button>
            ) : (
              <button
                onClick={refreshPorts}
                disabled={portsLoading}
                className="flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-5 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
              >
                {portsLoading ? <FaSpinner spin /> : <FaListUl />} Detect COM Ports
              </button>
            )}
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
                <label className={labelCls}>Employee</label>
                <select
                  className={inputCls}
                  value={
                    employees.some((u) => u.email === mappingForm.employeeEmail)
                      ? mappingForm.employeeEmail
                      : ""
                  }
                  onChange={(e) =>
                    setMappingForm({ ...mappingForm, employeeEmail: e.target.value })
                  }
                >
                  <option value="">— pick employee —</option>
                  {employees.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name || u.full_name || u.email} ({u.email})
                    </option>
                  ))}
                </select>
                <input
                  type="email"
                  className={inputCls + " mt-2"}
                  placeholder="or type email manually"
                  value={employees.some((u) => u.email === mappingForm.employeeEmail) ? "" : mappingForm.employeeEmail}
                  onChange={(e) =>
                    setMappingForm({ ...mappingForm, employeeEmail: e.target.value })
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
