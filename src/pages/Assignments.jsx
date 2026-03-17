import React, { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaClipboardList,
  FaTasks,
} from "react-icons/fa";

import API from "../api";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const Assignment = () => {
  const [form, setForm] = useState({
    staff_name: "",
    room_number: "",
    task: "",
  });
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [editId, setEditId] = useState(null);

  const role = localStorage.getItem("role");

  const loadUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const loadAssignments = async () => {
    try {
      const res = await API.get(
        `/assignments?role=${localStorage.getItem("role")}&name=${localStorage.getItem("name")}`
      );
      setAssignments(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await API.get("/assignments/stats");
      setStats(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadAssignments();
    loadStats();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editId) {
        await API.put(`/assignments/edit/${editId}`, form);
        setEditId(null);
      } else {
        await API.post("/assignments", {
          ...form,
          assigned_by: localStorage.getItem("name"),
        });
      }

      setForm({
        staff_name: "",
        room_number: "",
        task: "",
      });

      loadAssignments();
      loadStats();
    } catch (err) {
      console.log(err);
      window.alert("Error assigning task");
    }
  };

  const markComplete = async (id) => {
    try {
      await API.put(`/assignments/${id}`, {
        status: "Completed",
      });
      loadAssignments();
      loadStats();
    } catch (err) {
      console.log(err);
    }
  };

  const deleteTask = async (id) => {
    try {
      await API.delete(`/assignments/${id}`);
      loadAssignments();
      loadStats();
    } catch (err) {
      console.log(err);
    }
  };

  const editTask = (task) => {
    setForm({
      staff_name: task.staff_name,
      room_number: task.room_number,
      task: task.task,
    });
    setEditId(task.id);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
      </div>

      <div className="mx-auto max-w-[1260px] space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Task Assignment
              </p>
              <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                Cleaner staff assignment workspace
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Housekeeping aur room tasks ko assign, track aur complete karne ke
                liye dashboard-style responsive workspace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: "Total Tasks", value: stats.total || 0 },
                { label: "Completed", value: stats.completed || 0 },
                { label: "Pending", value: stats.pending || 0 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: FaTasks, label: "Total Tasks", value: stats.total || 0 },
            { icon: FaCheckCircle, label: "Completed", value: stats.completed || 0 },
            { icon: FaClipboardList, label: "Pending", value: stats.pending || 0 },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-[24px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {card.label}
                    </div>
                    <div className="mt-3 text-3xl font-black text-slate-900">
                      {card.value}
                    </div>
                  </div>
                  <span className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                    <Icon />
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {role !== "housekeeping" && (
          <section className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                New Assignment
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Assign new task
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
              <select
                name="staff_name"
                value={form.staff_name}
                onChange={handleChange}
                className={fieldCls}
                required
              >
                <option value="">Select Staff</option>
                {users
                  .filter((u) => u.role === "Housekeeping")
                  .map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role})
                    </option>
                  ))}
              </select>

              <input
                type="text"
                name="room_number"
                placeholder="Room Number"
                value={form.room_number}
                onChange={handleChange}
                className={fieldCls}
                required
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

              <button
                type="submit"
                className="rounded-[20px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)]"
              >
                {editId ? "Update Task" : "Assign Task"}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-[26px] border border-white/60 bg-white/82 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Staff</th>
                  <th className="px-5 py-4 font-semibold">Room</th>
                  <th className="px-5 py-4 font-semibold">Task</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold hidden md:table-cell">Assigned By</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-t border-slate-200/80 hover:bg-slate-50/80">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{a.staff_name}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{a.room_number}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{a.task}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                          a.status === "Completed"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden text-sm text-slate-600 md:table-cell">{a.assigned_by}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {a.status !== "Completed" && (
                          <button
                            onClick={() => markComplete(a.id)}
                            className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => editTask(a)}
                          className="rounded-full bg-sky-600 px-3 py-2 text-xs font-bold text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTask(a.id)}
                          className="rounded-full bg-rose-600 px-3 py-2 text-xs font-bold text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {assignments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
                      No tasks assigned yet
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
