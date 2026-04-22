import React, { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClipboardList,
  FaPlayCircle,
  FaTasks,
} from "react-icons/fa";

import API from "../api";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xl text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const textAreaCls = `${fieldCls} min-h-[112px] resize-y`;
const managerRoles = new Set(["admin", "manager", "receptionist"]);
const assignableRoles = new Set(["housekeeping", "accountant", "staff"]);
const statusOptions = ["Pending", "In Progress", "Completed", "Cancelled"];
const priorityOptions = ["Urgent", "High", "Normal", "Low"];

const normalizeText = (value) => String(value || "").trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();

const roomSortValue = (roomNo) => {
  const numericValue = Number.parseInt(String(roomNo || ""), 10);
  return Number.isFinite(numericValue) ? numericValue : Number.MAX_SAFE_INTEGER;
};

const isPreferredRoom = (room) => {
  const hotelStatus = normalizeLower(room.hotelStatus);
  const status = normalizeLower(room.status);

  return (
    hotelStatus === "available" ||
    status === "available" ||
    status.includes("vacant clean")
  );
};

const mergeRoomSources = (housekeepingRows, setupRows) => {
  const roomMap = new Map();

  (housekeepingRows || []).forEach((room) => {
    const roomNo = normalizeText(room.roomNo || room.room_number);
    if (!roomNo) return;

    roomMap.set(roomNo, {
      roomNo,
      roomType: normalizeText(room.roomType),
      status: normalizeText(room.status || room.hotelStatus || "Unknown"),
      hotelStatus: normalizeText(room.hotelStatus),
      preferred: isPreferredRoom(room),
    });
  });

  (setupRows || []).forEach((category) => {
    const categoryName = normalizeText(category?.name);
    const detailRows = Array.isArray(category?.roomDetails)
      ? category.roomDetails
      : Array.isArray(category?.rooms)
      ? category.rooms.map((roomNo) => ({ roomNumber: roomNo }))
      : [];

    detailRows.forEach((detail) => {
      const roomNo = normalizeText(detail?.roomNumber || detail?.room_number);
      if (!roomNo) return;

      const current = roomMap.get(roomNo) || {
        roomNo,
        roomType: categoryName,
        status: normalizeText(detail?.status || "Unknown"),
        hotelStatus: normalizeText(detail?.status),
        preferred: isPreferredRoom(detail),
      };

      roomMap.set(roomNo, {
        roomNo,
        roomType: current.roomType || categoryName,
        status: current.status || normalizeText(detail?.status || "Unknown"),
        hotelStatus: current.hotelStatus || normalizeText(detail?.status),
        preferred: current.preferred || isPreferredRoom(detail),
      });
    });
  });

  return [...roomMap.values()].sort((left, right) => {
    if (Number(right.preferred) !== Number(left.preferred)) {
      return Number(right.preferred) - Number(left.preferred);
    }

    const numericDiff = roomSortValue(left.roomNo) - roomSortValue(right.roomNo);
    if (numericDiff !== 0) return numericDiff;

    return left.roomNo.localeCompare(right.roomNo, undefined, { numeric: true });
  });
};

const getStatusBadge = (status) => {
  const normalized = normalizeLower(status);

  if (normalized === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "in progress") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (normalized === "cancelled") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

const getPriorityBadge = (priority) => {
  const normalized = normalizeLower(priority);

  if (normalized === "urgent") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (normalized === "high") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }
  if (normalized === "low") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-cyan-200 bg-cyan-50 text-cyan-700";
};

const formatTimestamp = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Assignment = () => {
  const currentRole = normalizeLower(localStorage.getItem("role"));
  const currentName = normalizeText(localStorage.getItem("name"));
  const canManageAssignments = managerRoles.has(currentRole);

  const [form, setForm] = useState({
    staff_name: "",
    room_number: "",
    task: "",
    priority: "Normal",
    due_time: "",
    notes: "",
    status: "Pending",
  });
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({});
  const [editId, setEditId] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignmentNotice, setAssignmentNotice] = useState("");

  const loadUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.log(error);
      setUsers([]);
    }
  };

  const loadAssignments = async () => {
    try {
      const res = await API.get("/assignments", {
        params: { role: currentRole, name: currentName },
      });
      setAssignments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.log(error);
      setAssignments([]);
    }
  };

  const loadStats = async () => {
    try {
      const res = await API.get("/assignments/stats", {
        params: { role: currentRole, name: currentName },
      });
      setStats(res.data || {});
    } catch (error) {
      console.log(error);
      setStats({});
    }
  };

  const loadRooms = async () => {
    const [housekeepingResult, setupResult] = await Promise.allSettled([
      API.get("/housekeeping"),
      API.get("/hotel/rooms/setup"),
    ]);

    const housekeepingRows =
      housekeepingResult.status === "fulfilled" && Array.isArray(housekeepingResult.value.data)
        ? housekeepingResult.value.data
        : [];

    const setupRows =
      setupResult.status === "fulfilled" && Array.isArray(setupResult.value.data)
        ? setupResult.value.data
        : [];

    setRooms(mergeRoomSources(housekeepingRows, setupRows));
  };

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      setPageLoading(true);
      try {
        await Promise.all([loadUsers(), loadAssignments(), loadStats(), loadRooms()]);
      } finally {
        if (active) {
          setPageLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      active = false;
    };
  }, []);

  const refreshAssignments = async () => {
    await Promise.all([loadAssignments(), loadStats()]);
  };

  const resetForm = () => {
    setForm({
      staff_name: "",
      room_number: "",
      task: "",
      priority: "Normal",
      due_time: "",
      notes: "",
      status: "Pending",
    });
    setEditId(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (editId) {
        await API.put(`/assignments/${editId}`, {
          staffName: form.staff_name,
          roomNumber: form.room_number,
          task: form.task,
          priority: form.priority,
          dueTime: form.due_time,
          notes: form.notes,
          status: form.status,
        });
      } else {
        await API.post("/assignments", {
          staffName: form.staff_name,
          roomNumber: form.room_number,
          task: form.task,
          priority: form.priority,
          dueTime: form.due_time,
          notes: form.notes,
          assignedBy: currentName,
        });

        setAssignmentNotice(
          `Task assigned on ${formatTimestamp(new Date().toISOString())}`,
        );
      }

      resetForm();
      await refreshAssignments();
    } catch (error) {
      console.log(error);
      window.alert("Error assigning task");
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (id, status) => {
    try {
      await API.patch(`/assignments/${id}/status`, {
        status,
        actorName: currentName,
      });
      await refreshAssignments();
    } catch (error) {
      console.log(error);
      window.alert("Task status update failed");
    }
  };

  const deleteTask = async (id) => {
    try {
      await API.delete(`/assignments/${id}`);
      await refreshAssignments();
    } catch (error) {
      console.log(error);
      window.alert("Task delete failed");
    }
  };

  const editTask = (taskRow) => {
    setForm({
      staff_name: normalizeText(taskRow.staff_name),
      room_number: normalizeText(taskRow.room_number),
      task: normalizeText(taskRow.task),
      priority: normalizeText(taskRow.priority) || "Normal",
      due_time: normalizeText(taskRow.due_time),
      notes: normalizeText(taskRow.notes),
      status: normalizeText(taskRow.status) || "Pending",
    });
    setEditId(taskRow.id);
  };

  const selectableUsers = useMemo(
    () =>
      users
        .filter((user) => assignableRoles.has(normalizeLower(user.role)))
        .sort((left, right) =>
          normalizeText(left.name).localeCompare(normalizeText(right.name)),
        ),
    [users],
  );

  const selectableRooms = useMemo(() => {
    const rows = [...rooms];
    if (
      form.room_number &&
      !rows.some((room) => String(room.roomNo) === String(form.room_number))
    ) {
      rows.unshift({
        roomNo: form.room_number,
        roomType: "",
        status: "Selected",
      });
    }
    return rows;
  }, [form.room_number, rooms]);

  const selectableStaff = useMemo(() => {
    const rows = [...selectableUsers];
    if (
      form.staff_name &&
      !rows.some((user) => String(user.name) === String(form.staff_name))
    ) {
      rows.unshift({
        id: `selected-${form.staff_name}`,
        name: form.staff_name,
        role: "selected",
      });
    }
    return rows;
  }, [form.staff_name, selectableUsers]);

  const summaryCards = [
    { icon: FaTasks, label: "Total Tasks", value: stats.total || 0 },
    { icon: FaClipboardList, label: "Pending", value: stats.pending || 0 },
    { icon: FaPlayCircle, label: "In Progress", value: stats.inProgress || 0 },
    { icon: FaCheckCircle, label: "Completed", value: stats.completed || 0 },
  ];

    return (
      <div className="relative min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
      </div>

      <div className="w-full space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(100deg,#fffdf8_0%,#fffaf2_45%,#fdf7ed_100%)] px-5 py-6 shadow-[0_20px_45px_rgba(120,113,108,0.14)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[15px] font-semibold uppercase tracking-[0.26em] text-slate-600">
                Task Assignment
              </p>
              <h1 className="text-4xl font-black leading-tight text-slate-900 sm:text-4xl">
                Assignment operations board
              </h1>
              <p className="max-w-3xl text-3xl  font-semibold leading-6 text-slate-700 sm:text-base">
             Tasks assigned by reception, managers, and admins are shown here in real time. Housekeeping, accounts, and staff teams can start and complete their assigned work.
              </p>
            </div>

            <div className="grid gap-3 text-xl sm:grid-cols-2">
              {summaryCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-[22px] border text-xl border-stone-200 bg-white/90 px-4 py-4 text-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[15px] font-bold text-slate-600">{item.label}</span>
                        <div className="mt-3 text-2xl font-bold leading-none text-slate-900">{item.value}</div>
                      </div>
                      <span className="rounded-2xl bg-stone-100 p-3 text-slate-700">
                        <Icon />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {assignmentNotice ? (
          <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700 shadow-[0_12px_30px_rgba(16,185,129,0.08)]">
            {assignmentNotice}
          </section>
        ) : null}

        {canManageAssignments && (
          <section className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  New Assignment
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Assign task with priority and timing
                </h2>
              </div>
              <div className="text-right text-xl text-slate-500">
                <div>{selectableStaff.length} assignable staff loaded</div>
                <div>{selectableRooms.length} current rooms loaded</div>
                <div>{stats.overdue || 0} overdue tasks right now</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-4">
              <select
                name="staff_name"
                value={form.staff_name}
                onChange={handleChange}
                className={fieldCls}
                required
              >
                <option value="">
                  {selectableStaff.length ? "Select Staff" : "No staff available"}
                </option>
                {selectableStaff.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>

              <select
                name="room_number"
                value={form.room_number}
                onChange={handleChange}
                className={fieldCls}
                required
              >
                <option value="">
                  {selectableRooms.length ? "Select Room" : "No rooms available"}
                </option>
                {selectableRooms.map((room) => (
                  <option key={room.roomNo} value={room.roomNo}>
                    Room {room.roomNo}
                    {room.roomType ? ` - ${room.roomType}` : ""}
                    {room.status ? ` - ${room.status}` : ""}
                  </option>
                ))}
              </select>

              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={fieldCls}
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority} Priority
                  </option>
                ))}
              </select>

              <input
                type="time"
                name="due_time"
                value={form.due_time}
                onChange={handleChange}
                className={fieldCls}
              />

              <input
                type="text"
                name="task"
                placeholder="Task"
                value={form.task}
                onChange={handleChange}
                className={fieldCls}
                required
              />

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={fieldCls}
                disabled={!editId}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <div className="lg:col-span-2">
                <textarea
                  name="notes"
                  placeholder="Notes for team"
                  value={form.notes}
                  onChange={handleChange}
                  className={textAreaCls}
                />
              </div>

              <div className="flex flex-wrap items-start gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-[20px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] disabled:opacity-60"
                >
                  {saving ? "Saving..." : editId ? "Update Task" : "Assign Task"}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-[20px] border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        <section className="rounded-[26px] border border-white/60 bg-white/82 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xl uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Staff</th>
                  <th className="px-5 py-4 font-semibold">Room</th>
                  <th className="px-5 py-4 font-semibold">Task</th>
                  <th className="px-5 py-4 font-semibold">Priority</th>
                  <th className="px-5 py-4 font-semibold hidden lg:table-cell">Due</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold hidden xl:table-cell">Assigned By</th>
                  <th className="px-5 py-4 font-semibold hidden xl:table-cell">Assigned On</th>
                  <th className="px-5 py-4 font-semibold hidden xl:table-cell">Updated</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="border-t border-slate-200/80 align-top hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4 text-xl font-semibold text-slate-900">
                      {assignment.staff_name}
                    </td>
                    <td className="px-5 py-4 text-xl text-slate-600">
                      {assignment.room_number}
                    </td>
                    <td className="px-5 py-4 text-xl text-slate-600">
                      <div className="font-medium text-slate-700">{assignment.task}</div>
                      {assignment.notes ? (
                        <div className="mt-2 text-xl leading-5 text-slate-500">
                          {assignment.notes}
                        </div>
                      ) : null}
                      <div className="mt-2 text-sm font-semibold text-slate-500 xl:hidden">
                        Assigned on: {formatTimestamp(assignment.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xl font-bold ${getPriorityBadge(assignment.priority)}`}
                      >
                        {assignment.priority || "Normal"}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden text-sm text-slate-600 lg:table-cell">
                      {assignment.due_time || "--"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xl font-bold ${getStatusBadge(assignment.status)}`}
                      >
                        {assignment.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden text-xl text-slate-600 xl:table-cell">
                      {assignment.assigned_by || assignment.created_by_name || "--"}
                    </td>
                    <td className="px-5 py-4 hidden text-xl text-slate-600 xl:table-cell">
                      {formatTimestamp(assignment.created_at)}
                    </td>
                    <td className="px-5 py-4 hidden text-xl text-slate-600 xl:table-cell">
                      {formatTimestamp(assignment.updated_at || assignment.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {normalizeLower(assignment.status) === "pending" && (
                          <button
                            onClick={() => updateTaskStatus(assignment.id, "In Progress")}
                            className="rounded-full bg-sky-600 px-3 py-2 text-xl font-bold text-white"
                          >
                            Start
                          </button>
                        )}
                        {normalizeLower(assignment.status) === "in progress" && (
                          <button
                            onClick={() => updateTaskStatus(assignment.id, "Completed")}
                            className="rounded-full bg-emerald-600 px-3 py-2 text-xl font-bold text-white"
                          >
                            Complete
                          </button>
                        )}
                        {canManageAssignments && (
                          <button
                            onClick={() => editTask(assignment)}
                            className="rounded-full bg-sky-50 px-3 py-2 text-xl font-bold text-sky-700"
                          >
                            Edit
                          </button>
                        )}
                        {canManageAssignments && (
                          <button
                            onClick={() => deleteTask(assignment.id)}
                            className="rounded-full bg-rose-50 px-3 py-2 text-xl font-bold text-rose-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!pageLoading && assignments.length === 0 && (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-5 py-12 text-center text-xl font-semibold text-slate-500"
                    >
                      No tasks assigned yet
                    </td>
                  </tr>
                )}

                {pageLoading && (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-5 py-12 text-center text-xl font-semibold text-slate-500"
                    >
                      Loading assignments...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Assignment;
