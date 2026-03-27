import { useEffect, useMemo, useState } from "react";
import { FaBroom, FaPlus, FaSyncAlt } from "react-icons/fa";

import CleaningLogPanel from "../components/Housekeeping/CleaningLogPanel";
import FiltersSection from "../components/Housekeeping/FiltersSection";
import HousekeepingRow from "../components/Housekeeping/HousekeepingRow";
import { housekeepingService } from "../services/housekeepingService";
import { userService } from "../services/userService";

const STATUS_OPTIONS = [
  "Vacant Dirty",
  "Vacant Clean",
  "Occupied Dirty",
  "Cleaning In Progress",
  "Out of Service",
];

const isDirtyStatus = (value) => {
  const normalized = String(value || "").toLowerCase();
  return normalized === "vacant dirty" || normalized === "occupied dirty";
};

const isCleanStatus = (value) =>
  String(value || "").toLowerCase() === "vacant clean";

const isBusyStatus = (value) =>
  String(value || "").toLowerCase() === "cleaning in progress";

export default function Housekeeping() {
  const [rooms, setRooms] = useState([]);
  const [logs, setLogs] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [assignee, setAssignee] = useState("All");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    roomNo: "",
    status: "Vacant Dirty",
    assignee: "No Housekeeper",
    priority: "Normal",
    notes: "",
  });

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await housekeepingService.getAllRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("fetchRooms error", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await housekeepingService.getLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("fetchLogs error", error);
    }
  };

  const fetchHousekeepers = async () => {
    try {
      const users = await userService.getAllUsers();
      const hkUsers = users.filter((user) =>
        String(user.role || "").toLowerCase().includes("housekeeping")
      );
      setHousekeepers(hkUsers.length ? hkUsers : users);
    } catch (error) {
      console.error("fetchHousekeepers error", error);
      setHousekeepers([]);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchLogs();
    fetchHousekeepers();
  }, []);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        String(room.roomNo || room.roomNumber || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        String(room.guest || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        status === "All" ||
        String(room.status || "").toLowerCase() === status.toLowerCase();

      const matchesAssignee =
        assignee === "All" ||
        String(room.assignee || "").toLowerCase() === assignee.toLowerCase();

      return matchesSearch && matchesStatus && matchesAssignee;
    });
  }, [rooms, search, status, assignee]);

  const handleAddRoom = async () => {
    try {
      if (!form.roomNo.trim()) {
        alert("Room number is required");
        return;
      }

      await housekeepingService.createRoom(form);

      setForm({
        roomNo: "",
        status: "Vacant Dirty",
        assignee: "No Housekeeper",
        priority: "Normal",
        notes: "",
      });

      await fetchRooms();
      await fetchLogs();
      setStatus("All");
    } catch (error) {
      console.error("handleAddRoom error", error);
      alert(error.response?.data?.message || "Room add failed");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await housekeepingService.updateRoomStatus(id, newStatus);
      await fetchRooms();
      await fetchLogs();
    } catch (error) {
      console.error("handleStatusChange error", error);
    }
  };

  const handleAssigneeChange = async (id, newAssignee) => {
    try {
      await housekeepingService.updateRoomAssignee(id, newAssignee);
      await fetchRooms();
    } catch (error) {
      console.error("handleAssigneeChange error", error);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#eff8ff_0%,#f6fbf7_42%,#fffaf0_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-cyan-200/60 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-8%] top-[8%] h-72 w-72 rounded-full bg-blue-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[-8%] left-[22%] h-72 w-72 rounded-full bg-amber-200/40 blur-3xl sm:h-[26rem] sm:w-[26rem]" />
      </div>

      <div className="relative mx-auto max-w-[1500px] space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,#08253d_0%,#0e5b6a_50%,#0f3f67_100%)] px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-7 sm:py-7">
          <div className="rounded-[28px] border border-white/12 bg-white/10 p-6 backdrop-blur-sm">
            <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-cyan-400 text-white shadow-lg shadow-cyan-950/25">
                  <FaBroom />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100">
                    Housekeeping
                  </p>
                  <h1 className="text-2xl font-black text-white sm:text-3xl">
                    Room Cleaning Dashboard
                  </h1>
                  <p className="mt-1 text-sm text-white/70">
                    Live room status, cleaners aur logs ek jagah.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4 text-white">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100">
                    Total Rooms
                  </p>
                  <h2 className="mt-3 text-3xl font-black">{rooms.length}</h2>
                  <p className="mt-1 text-xs text-white/65">
                    Housekeeping mapped inventory
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4 text-white">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100">
                    Dirty Rooms
                  </p>
                  <h2 className="mt-3 text-3xl font-black">
                    {rooms.filter((room) => isDirtyStatus(room.status)).length}
                  </h2>
                  <p className="mt-1 text-xs text-white/65">
                    Immediate cleaning attention
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4 text-white">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100">
                    Clean Rooms
                  </p>
                  <h2 className="mt-3 text-3xl font-black">
                    {rooms.filter((room) => isCleanStatus(room.status)).length}
                  </h2>
                  <p className="mt-1 text-xs text-white/65">
                    Ready for next allocation
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4 text-white">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100">
                    In Progress
                  </p>
                  <h2 className="mt-3 text-3xl font-black">
                    {rooms.filter((room) => isBusyStatus(room.status)).length}
                  </h2>
                  <p className="mt-1 text-xs text-white/65">
                    Team currently working
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/70 bg-white/86 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-6">
          <div className="grid gap-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">
                    Quick Add
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    Add Housekeeping Room
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Naya room create ya existing room details update karein.
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  {loading ? "Syncing" : "Ready"}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Room Number"
                  value={form.roomNo}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, roomNo: e.target.value }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Assignee"
                  value={form.assignee}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, assignee: e.target.value }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />

                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>

                <textarea
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100 md:col-span-2"
                  rows={3}
                />

                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <button
                    onClick={handleAddRoom}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] px-5 py-3 font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5"
                  >
                    <FaPlus />
                    Add Room
                  </button>

                  <button
                    onClick={() => {
                      fetchRooms();
                      fetchLogs();
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FaSyncAlt />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <FiltersSection
              search={search}
              setSearch={setSearch}
              status={status}
              setStatus={setStatus}
              assignee={assignee}
              setAssignee={setAssignee}
              housekeepers={housekeepers}
            />

            <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
                    Status Board
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    Room Status List
                  </h2>
                </div>
                {loading ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    Loading...
                  </span>
                ) : null}
              </div>

              <div className="grid gap-4">
                {filteredRooms.length > 0 ? (
                  filteredRooms.map((room) => (
                    <HousekeepingRow
                      key={room.id || room.roomNo || room.roomNumber}
                      room={room}
                      housekeepers={housekeepers}
                      onStatusChange={handleStatusChange}
                      onAssigneeChange={handleAssigneeChange}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    No rooms found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <CleaningLogPanel logs={logs} />
      </div>
    </div>
  );
}
