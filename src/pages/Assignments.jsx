import React, { useEffect, useState } from "react";
import API from "../api";

const Assignment = () => {
  const [form, setForm] = useState({
    staff_name: "",
    room_number: "",
    task: "",
  });

  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setstats] = useState({});
  const [editId, setEditId] = useState(null);

  const role = localStorage.getItem("role");

  // ================= LOAD USERS =================
  const loadUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // ================= LOAD ASSIGNMENTS =================
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

  // Load stats
  const loadStats = async () => {
    try {
      const res = await API.get("/assignments/stats");
      setstats(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadAssignments();
    loadStats();
  }, []);

  // ================= HANDLE CHANGE =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ================= SUBMIT =================
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
      alert("Error assigning task");
    }
  };

  // ================= MARK COMPLETE =================
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
  // ================= DELETE =================
  const deleteTask = async (id) => {
    try {
      await API.delete(`/assignments/${id}`);
      loadAssignments();
      loadStats();
    } catch (err) {
      console.log(err);
    }
  };

  // ================= EDIT =================
  const editTask = (task) => {
    setForm({
      staff_name: task.staff_name,
      room_number: task.room_number,
      task: task.task,
    });
    setEditId(task.id);
  };



  return (
    <div>
      {/* HEADER */}
      <div className="simple-page-header">
        <h2 className="simple-page-title">Task Assignment</h2>
        <p className="text-sm opacity-90 pl-100">
          Assign tasks to staff members and track completion
        </p>
      </div>

      {/*stats */}
      <div className="simple-metrics-grid">
        <div className="stat-tile stat-tile-blue">
          <h4 className="font-semibold">Total Tasks</h4>
          <p className="text-2xl font-bold">{stats.total || 0}</p>
        </div>
        <div className="stat-tile stat-tile-green">
          <h4 className="font-semibold">Completed</h4>
          <p className="text-2xl font-bold">{stats.completed || 0}</p>
        </div>
        <div className="stat-tile stat-tile-yellow">
          <h4 className="font-semibold">Pending</h4>
          <p className="text-2xl font-bold">{stats.pending || 0}</p>
        </div>
      </div>

      {role !== "housekeeping" && (
        <div className="simple-card mb-6">
          <h3 className="simple-card-title mb-4">Assign New Task</h3>
          <form onSubmit={handleSubmit} className="assign-form">
            <select
              name="staff_name"
              value={form.staff_name}
              onChange={handleChange}
              className="simple-select"
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
              className="simple-input"
              required
            />
            <input
              type="text"
              name="task"
              placeholder="Task"
              value={form.task}
              onChange={handleChange}
              className="simple-input"
              required
            />
            <button type="submit" className="simple-btn simple-btn-primary">
              {editId ? "Update Task" : "Assign Task"}
            </button>
          </form>
        </div>
      )}

      {/* TABLE CARD */}
      <div className="simple-table-wrapper">
        <div className="table-section-header">
          <h3 className="table-section-title">Assigned Tasks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="simple-table">
            <thead>
              <tr>
                <th className="p-3">Staff</th>
                <th className="p-3">Room</th>
                <th className="p-3">Task</th>
                <th className="p-3">Status</th>
                <th className="p-3">Assigned By</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="task-row">
                  <td className="p-3 font-medium">{a.staff_name}</td>
                  <td className="p-3">{a.room_number}</td>
                  <td className="p-3">{a.task}</td>

                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${a.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {a.status}
                    </span>
                  </td>

                  <td className="p-3">{a.assigned_by}</td>

                  <td className="p-3">
                    {a.status !== "Completed" && (
                      <button
                        onClick={() => markComplete(a.id)}
                        className="simple-btn simple-btn-success simple-btn-sm"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {assignments.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-order">
                    No tasks assigned yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Assignment;