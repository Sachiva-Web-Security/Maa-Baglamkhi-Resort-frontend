import { useEffect, useState, useMemo, useCallback } from "react";
import {
  FaBed, FaFilter, FaPlus, FaTimes, FaBroom, FaClipboardList,
  FaBoxOpen, FaCalculator, FaFileAlt, FaSignOutAlt, FaSearch,
  FaChevronDown, FaExclamationTriangle, FaCheckCircle, FaCog,
  FaSyncAlt, FaExclamationCircle,
} from "react-icons/fa";
import HousekeepingRow from "./HousekeepingRow";
import CleaningLogPanel from "./CleaningLogPanel";
import FiltersSection from "./FiltersSection";
import AmenitiesConsumptionModal from "./AmenitiesConsumptionModal";
import InspectionChecklistModal from "./InspectionChecklistModal";
import LostFoundModal from "./LostFoundModal";
import ShiftRosterModal from "./ShiftRosterModal";
import RoomCostingModal from "./RoomCostingModal";
import CheckoutReportModal from "./CheckoutReportModal";
import API from "../../api";
import { userService } from "../../services/userService";

const rawApiBase = String(API.defaults.baseURL || "/api").replace(/\/$/, "");
const API_BASE = rawApiBase.endsWith("/api") ? rawApiBase : `${rawApiBase}/api`;

const HOUSEKEEPING_OPTIONS = [
  { key: "parameters",   label: "Parameters",                  icon: FaCog,           color: "text-blue-600" },
  { key: "costing",      label: "Room Costing",                icon: FaCalculator,    color: "text-blue-600" },
  { key: "report",       label: "Room Report",                 icon: FaFileAlt,       color: "text-blue-600" },
  { key: "amenities",    label: "Amenities Consumption",       icon: FaBoxOpen,       color: "text-blue-600" },
  { key: "checkout",     label: "Checkout Report",             icon: FaSignOutAlt,    color: "text-blue-600" },
  { key: "lostfound",    label: "Lost & Found",                icon: FaSearch,        color: "text-blue-600" },
  { key: "shiftroster",  label: "Shift / Duty Roster",         icon: FaBroom,         color: "text-blue-600" },
  { key: "inspection",   label: "Room Inspection Checklist",   icon: FaClipboardList, color: "text-blue-600" },
];

const STATUS_COLORS = {
  "Vacant Clean":           { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "Vacant Clean Inspected": { dot: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  "Vacant Dirty":           { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "Occupied Clean":         { dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "Occupied Dirty":         { dot: "bg-orange-400",  badge: "bg-orange-50 text-orange-700 border-orange-200" },
  "Out of Service":         { dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
  "Cleaning In Progress":   { dot: "bg-violet-400",  badge: "bg-violet-50 text-violet-700 border-violet-200" },
};

const ALL_COLUMNS = ["type","roomNo","building","floor","section","guestStatus","roomType","status","assignee","layout","articles","services","notes"];
const DEFAULT_COLUMNS = ["type","roomNo","floor","guestStatus","roomType","status","assignee","notes"];
const BOARD_PAGE_SIZE = 10;

const getLocalDateISO = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export default function Housekeeping() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [knownHousekeepers, setKnownHousekeepers] = useState([]);
  const [completedTodayRows, setCompletedTodayRows] = useState([]);

  // Filters
  const [filters, setFilters] = useState({ room: "", type: "", status: "", priority: "", floor: "" });
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [activeTab, setActiveTab] = useState("board"); // "board" | "log"
  const [boardPage, setBoardPage] = useState(1);

  // Modal
  const [openModal, setOpenModal] = useState(null);

  // Cleaning log (for log tab)
  const [logSearch, setLogSearch] = useState("");
  const [logStatus, setLogStatus] = useState("All");
  const [logAssignee, setLogAssignee] = useState("All");
  const [roomMessageDrafts, setRoomMessageDrafts] = useState({});
  const [cleaningTasks, setCleaningTasks] = useState([]);

  // Add room modal
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ roomNo: "", type: "Accommodation", floor: "", roomType: "", status: "Vacant Dirty", assignee: "No Housekeeper" });

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/housekeeping");
      setRooms(res.data.map(r => ({ ...r, selected: false })));
    } catch (e) {
      setError("Failed to load housekeeping data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHousekeepers = useCallback(async () => {
    try {
      const users = await userService.getAllUsers();
      const rows = users
        .filter((user) => String(user.role || "").toLowerCase().includes("housekeeping"))
        .map((user) => user.name || user.username || user.email || "")
        .filter(Boolean);
      setKnownHousekeepers([...new Set(rows)]);
    } catch {
      setKnownHousekeepers([]);
    }
  }, []);

  const fetchCompletedCleaningLogs = useCallback(async () => {
    try {
      const today = getLocalDateISO();
      const res = await API.get("/housekeeping/completed-cleaning", { params: { date: today } });
      setCompletedTodayRows(
        Array.isArray(res.data)
          ? res.data.map((row) => ({
              id: row.id,
              roomId: row.room_id,
              roomNo: row.room_no,
              assignee: row.assignee,
              guestStatus: row.guest_status,
              finalStatus: row.final_status,
              completedAt: row.completed_at,
            }))
          : [],
      );
    } catch {
      setCompletedTodayRows([]);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchHousekeepers();
    fetchCompletedCleaningLogs();
  }, [fetchCompletedCleaningLogs, fetchHousekeepers, fetchRooms]);

  const housekeepers = useMemo(() => {
    const set = new Set();
    knownHousekeepers.forEach((name) => set.add(name));
    rooms.forEach(r => { if (r.assignee && r.assignee !== "No Housekeeper") set.add(r.assignee); });
    return Array.from(set);
  }, [knownHousekeepers, rooms]);

  const housekeeperStatuses = useMemo(() => {
    const map = {};
    rooms.forEach(r => {
      if (r.assignee && r.assignee !== "No Housekeeper") {
        const isBusy = r.status === "Cleaning In Progress" || r.status === "Occupied Dirty" || r.status === "Vacant Dirty";
        if (!map[r.assignee] || isBusy) map[r.assignee] = isBusy ? "BUSY" : "AVAILABLE";
      }
    });
    return map;
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      if (filters.room && !String(r.roomNo || "").toLowerCase().includes(String(filters.room).toLowerCase())) return false;
      if (filters.type && !String(r.roomType || "").toLowerCase().includes(String(filters.type).toLowerCase())) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.floor && !String(r.floor || "").toLowerCase().includes(String(filters.floor).toLowerCase())) return false;
      return true;
    });
  }, [rooms, filters]);

  const totalBoardPages = Math.max(1, Math.ceil(filteredRooms.length / BOARD_PAGE_SIZE));

  const paginatedRooms = useMemo(() => {
    const start = (boardPage - 1) * BOARD_PAGE_SIZE;
    return filteredRooms.slice(start, start + BOARD_PAGE_SIZE);
  }, [boardPage, filteredRooms]);

  const visibleBoardPages = useMemo(() => {
    const start = Math.max(1, boardPage - 2);
    const end = Math.min(totalBoardPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [boardPage, totalBoardPages]);

  const stats = useMemo(() => ({
    total:    rooms.length,
    clean:    rooms.filter(r => r.status?.toLowerCase().includes("clean")).length,
    dirty:    rooms.filter(r => r.status?.toLowerCase().includes("dirty")).length,
    occupied: rooms.filter(r => r.status?.toLowerCase().includes("occupied")).length,
    oos:      rooms.filter(r => r.status === "Out of Service").length,
  }), [rooms]);

  // Cleaning log rows (rooms with cleaning tasks)
  const cleaningRows = useMemo(() => {
    return rooms
      .filter(r => {
        const matchSearch = !logSearch || r.roomNo?.toString().includes(logSearch) || r.roomType?.toLowerCase().includes(logSearch.toLowerCase());
        const matchStatus = logStatus === "All" || r.status?.toLowerCase().includes(logStatus.toLowerCase());
        const matchAssignee = logAssignee === "All" || r.assignee === logAssignee || (logAssignee === "No Housekeeper" && r.assignee === "No Housekeeper");
        return matchSearch && matchStatus && matchAssignee;
      })
      .map(r => {
        const task = cleaningTasks.find(t => String(t.roomId) === String(r.id));
        const now = Date.now();
        const dueAt = task?.dueAt ? new Date(task.dueAt).getTime() : null;
        const remainingMs = dueAt ? dueAt - now : null;
        return {
          ...r,
          task,
          remainingMs,
          minutesLeft: remainingMs !== null ? Math.floor(remainingMs / 60000) : null,
          isOverdue: remainingMs !== null && remainingMs <= 0,
          progress: dueAt && task?.startedAt ? Math.min(100, ((now - new Date(task.startedAt).getTime()) / (dueAt - new Date(task.startedAt).getTime())) * 100) : 34,
        };
      });
  }, [rooms, cleaningTasks, logSearch, logStatus, logAssignee]);

  const warningRows = useMemo(() => cleaningRows.filter(r => r.isOverdue || (r.minutesLeft !== null && r.minutesLeft <= 5)), [cleaningRows]);

  useEffect(() => {
    setBoardPage(1);
  }, [filters.room, filters.type, filters.status, filters.priority, filters.floor]);

  useEffect(() => {
    if (boardPage > totalBoardPages) {
      setBoardPage(totalBoardPages);
    }
  }, [boardPage, totalBoardPages]);

  const handleStatusChange = async (id, status) => {
    try {
      await API.put(`/housekeeping/status/${id}`, { status });
      setRooms(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch { /* ignore */ }
  };

  const handleAssigneeChange = async (id, assignee) => {
    try {
      await API.put(`/housekeeping/assignee/${id}`, { assignee });
      setRooms(prev => prev.map(r => r.id === id ? { ...r, assignee } : r));
    } catch { /* ignore */ }
  };

  const handleSelectChange = (id, checked) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, selected: checked } : r));
  };

  const handleAddRoom = async () => {
    try {
      await API.post("/housekeeping", {
        roomNumber: newRoom.roomNo,
        type: newRoom.type,
        floor: newRoom.floor,
        roomType: newRoom.roomType,
        status: newRoom.status,
        assignee: newRoom.assignee,
      });
      setShowAddRoom(false);
      setNewRoom({ roomNo: "", type: "Accommodation", floor: "", roomType: "", status: "Vacant Dirty", assignee: "No Housekeeper" });
      fetchRooms();
    } catch { /* ignore */ }
  };

  const handleSendMessage = (room) => {
    const key = String(room.id || room.roomNo);
    const msg = roomMessageDrafts[key] || "";
    if (!msg.trim()) return;
    API.post("/housekeeping/message", { roomId: room.id, roomNo: room.roomNo, message: msg }).catch(() => {});
    setRoomMessageDrafts(prev => ({ ...prev, [key]: "" }));
  };

  const handleExtendTime = (room, minutes) => {
    setCleaningTasks(prev => {
      const existing = prev.find(t => String(t.roomId) === String(room.id));
      if (existing) {
        return prev.map(t => String(t.roomId) === String(room.id) ? { ...t, dueAt: new Date(new Date(t.dueAt).getTime() + minutes * 60000).toISOString() } : t);
      }
      return [...prev, { roomId: room.id, startedAt: new Date().toISOString(), dueAt: new Date(Date.now() + minutes * 60000).toISOString() }];
    });
  };

  const handleMarkCleaningComplete = async (room) => {
    try {
      await API.put(`/housekeeping/status/${room.id}`, { status: "Vacant Clean" });
      try {
        await API.post("/housekeeping/completed-cleaning", {
          roomId: room.id,
          roomNo: room.roomNo,
          assignee: room.assignee,
          guestStatus: room.guestStatus || room.guest || null,
          finalStatus: "Vacant Clean",
        });
      } catch (logError) {
        await API.put(`/housekeeping/status/${room.id}`, {
          status: room.status || "Cleaning In Progress",
        });
        throw logError;
      }
      setCleaningTasks((prev) => prev.filter((task) => String(task.roomId) !== String(room.id)));
      await fetchRooms();
      await fetchCompletedCleaningLogs();
    } catch {
      // ignore
    }
  };

  const assigneeOptions = ["No Housekeeper", ...housekeepers];

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black text-slate-900">Housekeeping</h1>
          <p className="text-xl text-slate-500">Manage rooms, assignments, amenities, inspections & more</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchRooms} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <FaSyncAlt className="text-xl" /> Refresh
          </button>
          <button onClick={() => setShowAddRoom(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xl font-semibold text-white shadow-sm transition hover:bg-slate-800">
            <FaPlus className="text-xl" /> Add Room
          </button>
        </div>
      </div>

      {/* HOUSEKEEPING_OPTIONS Quick Actions */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {HOUSEKEEPING_OPTIONS.map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              onClick={() => setOpenModal(opt.key)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Icon className={`text-xl ${opt.color}`} />
              <span className="text-xl font-semibold text-slate-700 leading-tight">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total Rooms", value: stats.total, color: "text-slate-900 text-4xl" },
          { label: "Clean", value: stats.clean, color: "text-emerald-600" },
          { label: "Dirty", value: stats.dirty, color: "text-amber-600" },
          { label: "Occupied", value: stats.occupied, color: "text-blue-600" },
          { label: "Out of Service", value: stats.oos, color: "text-rose-600" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">{s.label}</div>
            <div className={`mt-1 text-3xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {[{ key: "board", label: "Room Board", icon: FaBed }, { key: "log", label: "Cleaning Log", icon: FaClipboardList }].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xl font-semibold transition ${activeTab === t.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon className="text-xl" /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "board" && (
        <>
          {/* Filters + Column picker */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-0">
              <FiltersSection filters={filters} onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))} />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowColumnPicker(v => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <FaFilter className="text-xl" /> Columns <FaChevronDown className="text-xl" />
              </button>
              {showColumnPicker && (
                <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Toggle Columns</div>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_COLUMNS.map(col => (
                      <label key={col} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(col)}
                          onChange={() => setVisibleColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                          className="rounded"
                        />
                        {col}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Summary Row */}
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(STATUS_COLORS).map(([status, { dot, badge }]) => {
              const count = rooms.filter(r => r.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setFilters(prev => ({ ...prev, status: prev.status === status ? "" : status }))}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-bold transition ${filters.status === status ? badge + " ring-2 ring-offset-1 ring-slate-400" : badge}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  {status} ({count})
                </button>
              );
            })}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500">
              <FaSyncAlt className="animate-spin mr-2" /> Loading rooms...
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700">
              <FaExclamationTriangle /> {error}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {visibleColumns.includes("type")       && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Type / Room No</th>}
                      {visibleColumns.includes("roomNo")     && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Room No</th>}
                      {visibleColumns.includes("building")   && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Building</th>}
                      {visibleColumns.includes("floor")      && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Floor</th>}
                      {visibleColumns.includes("section")    && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Section</th>}
                      {visibleColumns.includes("guestStatus") && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Guest Status</th>}
                      {visibleColumns.includes("roomType")   && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Room Type</th>}
                      {visibleColumns.includes("status")     && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">HK Status</th>}
                      {visibleColumns.includes("assignee")   && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Assignee</th>}
                      {visibleColumns.includes("layout")     && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Layout</th>}
                      {visibleColumns.includes("articles")   && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Articles</th>}
                      {visibleColumns.includes("services")   && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Services</th>}
                      {visibleColumns.includes("notes")      && <th className="px-4 py-3 text-xl font-semibold uppercase tracking-wide text-slate-600">Notes</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.length ? paginatedRooms.map(item => (
                      <HousekeepingRow
                        key={item.id}
                        item={item}
                        visibleColumns={visibleColumns}
                        onSelectChange={handleSelectChange}
                        onStatusChange={handleStatusChange}
                        onAssigneeChange={handleAssigneeChange}
                        housekeeperStatuses={housekeeperStatuses}
                        assigneeOptions={assigneeOptions}
                      />
                    )) : (
                      <tr>
                        <td colSpan={visibleColumns.length} className="px-6 py-10 text-center text-xl text-slate-400">
                          No rooms match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredRooms.length > BOARD_PAGE_SIZE && (
                <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-600">
                    Showing {(boardPage - 1) * BOARD_PAGE_SIZE + 1}-{Math.min(boardPage * BOARD_PAGE_SIZE, filteredRooms.length)} of {filteredRooms.length} rooms
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBoardPage((current) => Math.max(1, current - 1))}
                      disabled={boardPage === 1}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {visibleBoardPages.map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setBoardPage(page)}
                        className={`min-w-[40px] rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          boardPage === page
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setBoardPage((current) => Math.min(totalBoardPages, current + 1))}
                      disabled={boardPage === totalBoardPages}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "log" && (
        <CleaningLogPanel
          rows={cleaningRows}
          warningRows={warningRows}
          completedTodayRows={completedTodayRows}
          logSearch={logSearch}
          setLogSearch={setLogSearch}
          logStatus={logStatus}
          setLogStatus={setLogStatus}
          logAssignee={logAssignee}
          setLogAssignee={setLogAssignee}
          housekeepers={housekeepers}
          roomMessageDrafts={roomMessageDrafts}
          setRoomMessageDrafts={setRoomMessageDrafts}
          onSendCleaningMessage={handleSendMessage}
          onExtendCleaningTime={handleExtendTime}
          onMarkCleaningComplete={handleMarkCleaningComplete}
        />
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Add New Room</h3>
              <button onClick={() => setShowAddRoom(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><FaTimes /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Room Number", key: "roomNo", type: "text" },
                { label: "Floor", key: "floor", type: "text" },
                { label: "Room Type", key: "roomType", type: "text", placeholder: "e.g. Deluxe, Suite" },
              ].map(f => (
                <div key={f.key}>
                  <label className="mb-1.5 block text-xl font-semibold text-slate-600">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder || f.label}
                    value={newRoom[f.key]}
                    onChange={e => setNewRoom(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xl text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1.5 block text-xl font-semibold text-slate-600">Status</label>
                <select value={newRoom.status} onChange={e => setNewRoom(prev => ({ ...prev, status: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none">
                  {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xl font-semibold text-slate-600">Assignee</label>
                <select value={newRoom.assignee} onChange={e => setNewRoom(prev => ({ ...prev, assignee: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none">
                  {assigneeOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowAddRoom(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xl font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleAddRoom} disabled={!newRoom.roomNo} className="rounded-xl bg-slate-900 px-5 py-2 text-xl font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Add Room</button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Modals */}
      {openModal === "amenities"   && <AmenitiesConsumptionModal rooms={rooms} onClose={() => setOpenModal(null)} apiBase={API_BASE} />}
      {openModal === "inspection"  && <InspectionChecklistModal  rooms={rooms} onClose={() => setOpenModal(null)} apiBase={API_BASE} />}
      {openModal === "lostfound"   && <LostFoundModal            rooms={rooms} onClose={() => setOpenModal(null)} apiBase={API_BASE} />}
      {openModal === "shiftroster" && <ShiftRosterModal          housekeepers={[...housekeepers, ...["tarunsingh","kapilrana","sumit"].filter(h => !housekeepers.includes(h))]} onClose={() => setOpenModal(null)} apiBase={API_BASE} />}
      {openModal === "costing"     && <RoomCostingModal          rooms={rooms} onClose={() => setOpenModal(null)} apiBase={API_BASE} />}
      {openModal === "checkout"    && <CheckoutReportModal       onClose={() => setOpenModal(null)} apiBase={API_BASE} />}
      {openModal === "report"      && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Room Report</h3>
              <button onClick={() => setOpenModal(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><FaTimes /></button>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {Object.entries(STATUS_COLORS).map(([status, { badge }]) => {
                const count = rooms.filter(r => r.status === status).length;
                return (
                  <div key={status} className={`rounded-xl border px-4 py-3 ${badge}`}>
                    <div className="text-xl font-semibold">{status}</div>
                    <div className="mt-1 text-2xl font-black">{count}</div>
                  </div>
                );
              })}
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200"><th className="py-2 text-left font-semibold text-slate-600">Room</th><th className="py-2 text-left font-semibold text-slate-600">Type</th><th className="py-2 text-left font-semibold text-slate-600">Status</th><th className="py-2 text-left text-xl font-semibold text-slate-600">Assignee</th></tr></thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 font-semibold">{r.roomNo}</td>
                    <td className="py-2 text-slate-500">{r.roomType || "-"}</td>
                    <td className="py-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status]?.badge || "bg-slate-50 text-slate-700 border-slate-200"}`}>{r.status}</span></td>
                    <td className="py-2 text-slate-500">{r.assignee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {openModal === "parameters" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-[36px] bg-white p-8 shadow-2xl">
            <div className="mb-7 flex items-center justify-between">
              <h3 className="text-3xl font-black text-slate-900">Housekeeping Parameters</h3>
              <button onClick={() => setOpenModal(null)} className="rounded-full p-3 text-slate-400 hover:bg-slate-100"><FaTimes size={24} /></button>
            </div>
            <ParametersForm onClose={() => setOpenModal(null)} apiBase={API_BASE} />
          </div>
        </div>
      )}
    </div>
  );
}

function ParametersForm({ onClose, apiBase }) {
  const [params, setParams] = useState({
    cleaningTimeMinutes: 30,
    defaultAssignee: "No Housekeeper",
    autoReleaseEnabled: true,
    inspectionRequired: true,
    maxRoomsPerHousekeeper: 10,
    shiftStartTime: "08:00",
    shiftEndTime: "20:00",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadParameters = async () => {
      try {
        const response = await API.get("/housekeeping/parameters");
        if (!mounted || !response.data) return;
        setParams((prev) => ({
          ...prev,
          cleaningTimeMinutes: Number(response.data.cleaning_time_minutes ?? prev.cleaningTimeMinutes),
          defaultAssignee: response.data.default_assignee ?? prev.defaultAssignee,
          autoReleaseEnabled: Boolean(response.data.auto_release_enabled ?? prev.autoReleaseEnabled),
          inspectionRequired: Boolean(response.data.inspection_required ?? prev.inspectionRequired),
          maxRoomsPerHousekeeper: Number(response.data.max_rooms_per_housekeeper ?? prev.maxRoomsPerHousekeeper),
          shiftStartTime: response.data.shift_start_time ?? prev.shiftStartTime,
          shiftEndTime: response.data.shift_end_time ?? prev.shiftEndTime,
        }));
      } catch {
        // ignore
      }
    };

    loadParameters();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await API.post("/housekeeping/parameters", params);
      onClose();
    } catch {
      setSaveError("Failed to save parameters. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xl font-semibold text-slate-600">Default Cleaning Time (mins)</label>
          <input type="number" value={params.cleaningTimeMinutes} onChange={e => setParams(p => ({ ...p, cleaningTimeMinutes: +e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-xl outline-none" />
        </div>
        <div>
          <label className="mb-2 block text-xl font-semibold text-slate-600">Max Rooms / Housekeeper</label>
          <input type="number" value={params.maxRoomsPerHousekeeper} onChange={e => setParams(p => ({ ...p, maxRoomsPerHousekeeper: +e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-xl outline-none" />
        </div>
        <div>
          <label className="mb-2 block text-xl font-semibold text-slate-600">Shift Start Time</label>
          <input type="time" value={params.shiftStartTime} onChange={e => setParams(p => ({ ...p, shiftStartTime: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-xl outline-none" />
        </div>
        <div>
          <label className="mb-2 block text-xl font-semibold text-slate-600">Shift End Time</label>
          <input type="time" value={params.shiftEndTime} onChange={e => setParams(p => ({ ...p, shiftEndTime: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-xl outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-3 text-xl text-slate-700 cursor-pointer">
          <input type="checkbox" checked={params.autoReleaseEnabled} onChange={e => setParams(p => ({ ...p, autoReleaseEnabled: e.target.checked }))} className="h-5 w-5 rounded" />
          Auto-release cleaning task when timer expires
        </label>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-3 text-xl text-slate-700 cursor-pointer">
          <input type="checkbox" checked={params.inspectionRequired} onChange={e => setParams(p => ({ ...p, inspectionRequired: e.target.checked }))} className="h-5 w-5 rounded" />
          Require inspection before marking room Clean
        </label>
      </div>
      {saveError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {saveError}
        </div>
      ) : null}
      <div className="flex justify-end gap-4 pt-4">
        <button onClick={onClose} disabled={saving} className="rounded-2xl border border-slate-200 px-6 py-3 text-xl font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="rounded-2xl bg-slate-900 px-8 py-3 text-xl font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "Saving..." : "Save Parameters"}
        </button>
      </div>
    </div>
  );
}
