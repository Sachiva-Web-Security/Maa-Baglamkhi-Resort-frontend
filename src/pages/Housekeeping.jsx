import React, { useEffect, useMemo, useState } from 'react';
import { housekeepingService } from '../services/housekeepingService';
import { userService } from '../services/userService';
import { hotelService } from '../services/hotelService';
import {
  FaSearch,
  FaTimes,
  FaCog,
  FaClipboardList,
  FaChartLine,
  FaBoxOpen,
  FaClipboardCheck,
  FaBroom,
  FaCheck,
  FaBed,
  FaSyncAlt,
} from 'react-icons/fa';

const HOUSEKEEPING_OPTIONS = [
  {
    id: 'parameters',
    label: 'Parameters',
    icon: FaCog,
    description: 'Operational settings and housekeeping controls',
  },
  {
    id: 'cleaning-log',
    label: 'Cleaning Log',
    icon: FaClipboardList,
    description: 'Room-wise cleaning activity and status',
  },
  {
    id: 'room-costing',
    label: 'Room Costing',
    icon: FaChartLine,
    description: 'Estimated cleaning cost per room',
  },
  {
    id: 'room-report',
    label: 'Room Report',
    icon: FaClipboardList,
    description: 'Status-wise room distribution report',
  },
  {
    id: 'amenities-consumption-report',
    label: 'Amenities Consumption Report',
    icon: FaBoxOpen,
    description: 'Consumables usage and refill summary',
  },
  {
    id: 'housekeeping-audit',
    label: 'Housekeeping Audit',
    icon: FaClipboardCheck,
    description: 'Audit checklist for room readiness',
  },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function statusPillClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('dirty')) return 'bg-amber-500/20 text-amber-300 border-amber-400/40';
  if (normalized.includes('clean')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40';
  if (normalized.includes('out of service')) return 'bg-rose-500/20 text-rose-300 border-rose-400/40';
  return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40';
}

function Housekeeping() {
  const [data, setData] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);

  const [activeOption, setActiveOption] = useState('parameters');
  const [isOptionPopupOpen, setIsOptionPopupOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomNo, setNewRoomNo] = useState('');

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifyDirty, setNotifyDirty] = useState(true);
  const [defaultShift, setDefaultShift] = useState('Morning');

  const [logSearch, setLogSearch] = useState('');
  const [logStatus, setLogStatus] = useState('All');
  const [logAssignee, setLogAssignee] = useState('All');

  const [auditChecks, setAuditChecks] = useState({});

  const fetchHousekeepers = async () => {
    try {
      const users = await userService.getAllUsers();
      const hkUsers = users.filter(
        (u) => u.role && String(u.role).toLowerCase().includes('housekeeping'),
      );
      const finalHousekeepers = hkUsers.length > 0 ? hkUsers : users;
      setHousekeepers(finalHousekeepers.map((u) => u.name));
    } catch (error) {
      console.error('Error fetching housekeepers', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const rooms = await housekeepingService.getAllRooms();
      const today = todayISO();

      const mappedRooms = rooms.map((room) => {
        let guestStatus = '-';
        if (String(room.hotelStatus || '').toLowerCase() === 'occupied') {
          if (room.checkOut === today) guestStatus = 'Departs today';
          else if (room.checkIn === today) guestStatus = 'Arrives today';
          else guestStatus = 'Occupied';
        }

        return {
          id: room.id || room.roomNo,
          roomNo: room.roomNo || 'N/A',
          status: room.status || 'Vacant Dirty',
          assignee: room.assignee || 'No Housekeeper',
          roomType:
            String(room.hotelStatus || '').toLowerCase() === 'occupied'
              ? 'Occupied Room'
              : 'Available Room',
          guestStatus,
        };
      });

      setData(mappedRooms);
    } catch (error) {
      console.error('Error fetching rooms', error);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchHousekeepers();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const timer = setInterval(fetchRooms, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  useEffect(() => {
    if (!isOptionPopupOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOptionPopupOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOptionPopupOpen]);

  const handleAddRoom = async () => {
    if (!newRoomNo.trim()) return;

    try {
      await hotelService.addRoom(newRoomNo.trim());
      setShowAddModal(false);
      setNewRoomNo('');
      fetchRooms();
    } catch (error) {
      console.error('Error creating room', error);
      if (error?.response?.data?.message) {
        alert(error.response.data.message);
      }
    }
  };

  const statusCounts = useMemo(() => {
    return data.reduce(
      (acc, room) => {
        const status = String(room.status || '').toLowerCase();
        if (status.includes('dirty')) acc.dirty += 1;
        if (status.includes('clean')) acc.clean += 1;
        if (status.includes('occupied')) acc.occupied += 1;
        if (status.includes('out of service')) acc.outOfService += 1;
        return acc;
      },
      { dirty: 0, clean: 0, occupied: 0, outOfService: 0 },
    );
  }, [data]);

  const filteredCleaningRows = useMemo(() => {
    return data.filter((room) => {
      const search = logSearch.trim().toLowerCase();
      const matchesSearch =
        !search ||
        String(room.roomNo).toLowerCase().includes(search) ||
        String(room.roomType).toLowerCase().includes(search);

      const matchesStatus =
        logStatus === 'All' || String(room.status).toLowerCase().includes(logStatus.toLowerCase());

      const matchesAssignee = logAssignee === 'All' || room.assignee === logAssignee;

      return matchesSearch && matchesStatus && matchesAssignee;
    });
  }, [data, logSearch, logStatus, logAssignee]);

  const costingRows = useMemo(() => {
    return data.map((room) => {
      const isDirty = String(room.status).toLowerCase().includes('dirty');
      const isOccupied = String(room.status).toLowerCase().includes('occupied');
      const isOut = String(room.status).toLowerCase().includes('out of service');

      const baseCost = isDirty ? 480 : 260;
      const occupancyCost = isOccupied ? 150 : 0;
      const maintenance = isOut ? 220 : 0;
      const totalCost = baseCost + occupancyCost + maintenance;

      return {
        roomNo: room.roomNo,
        status: room.status,
        totalCost,
      };
    });
  }, [data]);

  const totalCost = costingRows.reduce((sum, row) => sum + row.totalCost, 0);

  const amenitiesRows = useMemo(() => {
    return data.map((room) => {
      const occupied = String(room.status).toLowerCase().includes('occupied');
      const dirty = String(room.status).toLowerCase().includes('dirty');

      return {
        roomNo: room.roomNo,
        toiletries: occupied ? 4 : 2,
        linen: dirty ? 3 : 1,
        waterBottles: occupied ? 3 : 1,
      };
    });
  }, [data]);

  const amenitiesTotals = amenitiesRows.reduce(
    (acc, row) => {
      acc.toiletries += row.toiletries;
      acc.linen += row.linen;
      acc.waterBottles += row.waterBottles;
      return acc;
    },
    { toiletries: 0, linen: 0, waterBottles: 0 },
  );

  const auditSummary = useMemo(() => {
    const total = data.length;
    const passed = data.filter((room) => auditChecks[room.id]).length;
    const failed = total - passed;
    const passRate = total ? Math.round((passed / total) * 100) : 0;
    return { total, passed, failed, passRate };
  }, [data, auditChecks]);

  const activeOptionMeta = HOUSEKEEPING_OPTIONS.find((opt) => opt.id === activeOption);
  const unassignedRooms = data.filter((room) => room.assignee === 'No Housekeeper').length;
  const readyRooms = data.filter((room) =>
    String(room.status || '').toLowerCase().includes('clean'),
  ).length;
  const summaryCards = [
    {
      label: 'Active Rooms',
      value: data.length,
      helper: 'Current housekeeping inventory',
      accent: 'from-cyan-500 to-sky-500',
      ring: 'border-cyan-200/70',
    },
    {
      label: 'Ready For Guest',
      value: readyRooms,
      helper: 'Clean rooms ready to allocate',
      accent: 'from-emerald-500 to-teal-500',
      ring: 'border-emerald-200/70',
    },
    {
      label: 'Need Assignment',
      value: unassignedRooms,
      helper: 'Rooms without housekeeper',
      accent: 'from-amber-500 to-orange-500',
      ring: 'border-amber-200/70',
    },
    {
      label: 'Audit Pass Rate',
      value: `${auditSummary.passRate}%`,
      helper: 'Live readiness compliance',
      accent: 'from-violet-500 to-indigo-500',
      ring: 'border-violet-200/70',
    },
  ];

  const renderOptionPanel = () => {
    if (activeOption === 'parameters') {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-600">Dirty Rooms</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{statusCounts.dirty}</p>
            </div>
            <div className="rounded-[1.4rem] border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Clean Rooms</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{statusCounts.clean}</p>
            </div>
            <div className="rounded-[1.4rem] border border-cyan-200/60 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Occupied Rooms</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{statusCounts.occupied}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <h4 className="text-sm font-semibold text-slate-900">Automation Settings</h4>
              <div className="mt-4 space-y-3">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Auto Refresh (15s)
                  <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Notify for Dirty Rooms
                  <input type="checkbox" checked={notifyDirty} onChange={(e) => setNotifyDirty(e.target.checked)} />
                </label>
                <label className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="mb-2 block">Default Shift</span>
                  <select
                    value={defaultShift}
                    onChange={(e) => setDefaultShift(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
                  >
                    <option>Morning</option>
                    <option>Evening</option>
                    <option>Night</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <h4 className="text-sm font-semibold text-slate-900">Quick Actions</h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(8,145,178,0.24)]"
                >
                  + Add Room
                </button>
                <button
                  type="button"
                  onClick={fetchRooms}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  <span className="inline-flex items-center gap-2 text-slate-700">
                    <FaSyncAlt /> Refresh Now
                  </span>
                </button>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Yeh panel housekeeping operations ka control center hai. Yahan se live settings aur quick actions manage kar sakte hain.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (activeOption === 'cleaning-log') {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1.4fr,1fr,1fr]">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <FaSearch className="text-cyan-300" />
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search by room no or type"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />
            </label>

            <select
              value={logStatus}
              onChange={(e) => setLogStatus(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
            >
              <option value="All">All Status</option>
              <option value="dirty">Dirty</option>
              <option value="clean">Clean</option>
              <option value="occupied">Occupied</option>
              <option value="out of service">Out of Service</option>
            </select>

            <select
              value={logAssignee}
              onChange={(e) => setLogAssignee(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
            >
              <option value="All">All Assignees</option>
              <option value="No Housekeeper">No Housekeeper</option>
              {housekeepers.map((hk) => (
                <option key={hk} value={hk}>{hk}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCleaningRows.map((room) => (
              <div key={`clean-${room.id}`} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Room {room.roomNo}</p>
                    <p className="text-xs text-slate-500">{room.roomType}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(room.status)}`}>
                    {room.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>Assignee: <span className="text-slate-900">{room.assignee}</span></p>
                  <p>Guest: <span className="text-slate-900">{room.guestStatus || '-'}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeOption === 'room-costing') {
      const maxCost = Math.max(...costingRows.map((row) => row.totalCost), 1);

      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">Total Cost</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">Rs {totalCost}</p>
            </div>
            <div className="rounded-[1.35rem] border border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Average / Room</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">Rs {data.length ? Math.round(totalCost / data.length) : 0}</p>
            </div>
            <div className="rounded-[1.35rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-600">High Cost Rooms</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{costingRows.filter((r) => r.totalCost >= 600).length}</p>
            </div>
          </div>

          <div className="space-y-3">
            {costingRows.map((row) => (
              <div key={`cost-${row.roomNo}`} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">Room {row.roomNo}</span>
                  <span className="text-emerald-600">Rs {row.totalCost}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                    style={{ width: `${Math.round((row.totalCost / maxCost) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeOption === 'room-report') {
      const totalRooms = data.length || 1;

      const reportItems = [
        {
          label: 'Dirty',
          count: statusCounts.dirty,
          color: 'from-amber-500/30 to-amber-900/10 border-amber-400/30',
        },
        {
          label: 'Clean',
          count: statusCounts.clean,
          color: 'from-emerald-500/30 to-emerald-900/10 border-emerald-400/30',
        },
        {
          label: 'Occupied',
          count: statusCounts.occupied,
          color: 'from-cyan-500/30 to-cyan-900/10 border-cyan-400/30',
        },
        {
          label: 'Out of Service',
          count: statusCounts.outOfService,
          color: 'from-rose-500/30 to-rose-900/10 border-rose-400/30',
        },
      ];

      return (
        <div className="grid gap-4 md:grid-cols-2">
          {reportItems.map((item) => (
            <div key={item.label} className={`rounded-xl border bg-gradient-to-br p-4 ${item.color}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-200">{item.label}</p>
                <p className="text-2xl font-bold text-white">{item.count}</p>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white/70"
                  style={{ width: `${Math.round((item.count / totalRooms) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-300">
                {Math.round((item.count / totalRooms) * 100)}% of current inventory
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (activeOption === 'amenities-consumption-report') {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Toiletries</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{amenitiesTotals.toiletries}</p>
            </div>
            <div className="rounded-[1.35rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">Linen</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{amenitiesTotals.linen}</p>
            </div>
            <div className="rounded-[1.35rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-700">Water Bottles</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{amenitiesTotals.waterBottles}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Toiletries</th>
                  <th className="px-4 py-3">Linen</th>
                  <th className="px-4 py-3">Water Bottles</th>
                </tr>
              </thead>
              <tbody>
                {amenitiesRows.map((row) => (
                  <tr key={`amen-${row.roomNo}`} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.roomNo}</td>
                    <td className="px-4 py-3">{row.toiletries}</td>
                    <td className="px-4 py-3">{row.linen}</td>
                    <td className="px-4 py-3">{row.waterBottles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeOption === 'housekeeping-audit') {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Rooms</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{auditSummary.total}</p>
            </div>
            <div className="rounded-[1.35rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">Passed</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{auditSummary.passed}</p>
            </div>
            <div className="rounded-[1.35rem] border border-rose-200/70 bg-gradient-to-br from-rose-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-rose-600">Needs Review</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{auditSummary.failed}</p>
            </div>
            <div className="rounded-[1.35rem] border border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Pass Rate</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{auditSummary.passRate}%</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.map((room) => (
              <label key={`audit-${room.id}`} className="flex items-center justify-between rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
                <div>
                  <p className="font-semibold text-slate-900">Room {room.roomNo}</p>
                  <p className="text-xs text-slate-500">{room.status}</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(auditChecks[room.id])}
                  onChange={(e) =>
                    setAuditChecks((prev) => ({
                      ...prev,
                      [room.id]: e.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-64 w-64 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-64 w-64 rounded-full bg-amber-200/45 blur-3xl sm:h-[26rem] sm:w-[26rem]" />
        <div className="absolute bottom-[14%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1200px]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(7,27,52,0.97)_0%,rgba(8,47,73,0.93)_52%,rgba(15,23,42,0.92)_100%)] px-6 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:px-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[-8%] top-[-18%] h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute bottom-[-20%] left-[8%] h-52 w-52 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12)_0%,transparent_40%,rgba(255,255,255,0.05)_100%)]" />
          </div>
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr,0.8fr] lg:items-end">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
                Housekeeping Control
              </span>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Dashboard-style housekeeping workspace for faster room readiness and cleaner operations.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                Room status, audit flow, costing aur cleaning activity ko ek hi attractive responsive workspace me manage kariye.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-[1.5rem] border ${card.ring} bg-white/10 p-4 backdrop-blur-sm`}
                >
                  <div className={`inline-flex rounded-full bg-gradient-to-r ${card.accent} px-3 py-1 text-xs font-semibold text-white`}>
                    {card.label}
                  </div>
                  <p className="mt-4 text-3xl font-bold text-white">{card.value}</p>
                  <p className="mt-1 text-sm text-slate-200">{card.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-[0_22px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Workspace Options</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Choose the housekeeping module</h2>
            </div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
              Popup pages with responsive controls
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {HOUSEKEEPING_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = option.id === activeOption;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setActiveOption(option.id);
                    setIsOptionPopupOpen(true);
                  }}
                  className={`group rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                    isActive
                      ? 'border-cyan-300 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 shadow-[0_18px_40px_rgba(6,182,212,0.12)]'
                      : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-cyan-700 group-hover:bg-cyan-50'
                    }`}>
                      <Icon />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-5 rounded-[2rem] border border-white/70 bg-white/80 p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-500">Housekeeping Workspace</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">Option select karke focused popup open karein</h3>
          <p className="mt-2 text-sm text-slate-600">
            Parameters, Cleaning Log, Room Costing, Room Report, Amenities aur Audit sab ko dashboard-style layout me fast access diya gaya hai.
          </p>
        </div>
      </div>

      {isOptionPopupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-3 py-6 backdrop-blur-sm"
          onClick={() => setIsOptionPopupOpen(false)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,#f8fbff_0%,#f4f9f7_100%)] shadow-[0_30px_80px_rgba(2,8,23,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Housekeeping Page</p>
                <h3 className="text-2xl font-semibold text-slate-900">{activeOptionMeta?.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{activeOptionMeta?.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOptionPopupOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-cyan-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto p-5">
              {renderOptionPanel()}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Add New Room</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 transition hover:text-slate-900"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm text-slate-500">Room No. / Name</label>
              <input
                type="text"
                value={newRoomNo}
                onChange={(e) => setNewRoomNo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g. 101"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddRoom}
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 px-4 py-2 font-medium text-white transition hover:opacity-90"
              >
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Housekeeping;
