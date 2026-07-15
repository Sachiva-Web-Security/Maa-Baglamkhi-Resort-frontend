import React, { useEffect, useState } from "react";
import {
  FaMoneyBillWave,
  FaEdit,
  FaSave,
  FaTimes,
  FaRupeeSign,
  FaSpinner,
} from "react-icons/fa";
import API from "../api";

const ROLES = [
  "admin",
  "manager",
  "receptionist",
  "waiter",
  "kitchen",
  "housekeeping",
  "accountant",
  "staff",
];

const SalaryManagement = () => {
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ salary: "", designation: "" });
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  /* ================= FETCH ================= */

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await API.get("/salary");
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setMsg({ type: "error", text: "Failed to load employees" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  /* ================= EDIT ================= */

  const startEdit = (emp) => {
    setEditingId(emp.id);
    setEditForm({
      salary: emp.salary || "",
      designation: emp.designation || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ salary: "", designation: "" });
  };

  const handleSave = async (emp) => {
    if (!editForm.salary && editForm.salary !== 0) {
      setMsg({ type: "error", text: "Salary is required" });
      return;
    }

    setSavingId(emp.id);
    try {
      await API.put(`/salary/${emp.id}`, {
        salary: parseFloat(editForm.salary),
        designation: editForm.designation,
      });
      setMsg({ type: "success", text: `${emp.name}'s salary updated` });
      setEditingId(null);
      setEditForm({ salary: "", designation: "" });
      fetchEmployees();
    } catch (err) {
      console.error("Error saving salary:", err);
      setMsg({ type: "error", text: "Failed to save salary" });
    } finally {
      setSavingId(null);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full bg-green-100/80 px-4 py-2">
            <span className="h-3 w-3 rounded-full bg-green-600"></span>
            <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-green-700">
              Salary Management
            </span>
          </div>
          <h2 className="mt-4 text-[34px] font-extrabold text-slate-900">
            Employee Salaries
          </h2>
          <p className="mt-2 text-[16px] text-slate-600">
            Set or update monthly salary for each employee. Salary auto-calculates daily pay on the Attendance page.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3 text-green-700">
            <FaMoneyBillWave className="text-2xl" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Total Employees</p>
              <p className="text-2xl font-extrabold text-green-900">{employees.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {msg.text && (
        <div
          className={`rounded-xl px-5 py-3 text-sm font-bold ${
            msg.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Employee</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Designation</th>
              <th className="p-3 text-left">Monthly Salary</th>
              <th className="p-3 text-left">Per-Day Pay</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => {
              const monthly = parseFloat(emp.salary || 0);
              const daysInMonth = new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                0
              ).getDate();
              const perDay = daysInMonth > 0 ? monthly / daysInMonth : 0;
              const isEditing = editingId === emp.id;

              return (
                <tr key={emp.id} className="border-b hover:bg-blue-50/30">
                  <td className="p-3 font-semibold text-slate-500">{idx + 1}</td>

                  {/* Employee */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 text-white font-bold text-sm">
                        {emp.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {emp.role}
                    </span>
                  </td>

                  {/* Designation */}
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.designation}
                        onChange={(e) =>
                          setEditForm({ ...editForm, designation: e.target.value })
                        }
                        placeholder="Designation"
                        className="w-36 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500"
                      />
                    ) : (
                      <span className="text-slate-700">
                        {emp.designation || "—"}
                      </span>
                    )}
                  </td>

                  {/* Salary */}
                  <td className="p-3">
                    {isEditing ? (
                      <div className="relative">
                        <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                        <input
                          type="number"
                          value={editForm.salary}
                          onChange={(e) =>
                            setEditForm({ ...editForm, salary: e.target.value })
                          }
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-32 rounded-lg border border-blue-200 bg-blue-50 pl-7 pr-3 py-1.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">
                        <FaRupeeSign className="text-xs" />
                        {monthly.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>

                  {/* Per-day */}
                  <td className="p-3">
                    <span className="font-semibold text-slate-600">
                      ₹ {perDay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-3">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(emp)}
                          disabled={savingId === emp.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {savingId === emp.id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaSave />
                          )}
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(emp)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        <FaEdit /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {employees.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="text-center p-8 text-slate-500">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {loading && (
          <div className="flex items-center justify-center gap-2 p-8 text-slate-500">
            <FaSpinner className="animate-spin text-blue-600" />
            <span>Loading employees...</span>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-slate-600">
        <strong>Note:</strong> Leave (100% deduction) and Absent (100% deduction) are configurable in the backend. Currently: Present = full day pay, Absent/Leave = ₹0, Late = 10% deduction, Half Day = 50% pay.
      </div>
    </div>
  );
};

export default SalaryManagement;
