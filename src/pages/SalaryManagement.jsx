import React, { useEffect, useState } from "react";
import {
  FaMoneyBillWave,
  FaEdit,
  FaSave,
  FaTimes,
  FaRupeeSign,
  FaSpinner,
  FaBriefcase,
  FaUsers,
  FaInfoCircle,
  FaUserSlash,
  FaFingerprint,
  FaCalendarAlt,
  FaChartBar,
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

  // Payroll report state
  const [payrollMonth, setPayrollMonth] = useState(
    () => new Date().toISOString().slice(0, 7)
  );
  const [payroll, setPayroll] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

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

  const fetchPayroll = async () => {
    setPayrollLoading(true);
    try {
      const res = await API.get("/salary/payroll", {
        params: { month: payrollMonth },
      });
      setPayroll(res.data);
    } catch (err) {
      console.error("Failed to fetch payroll", err);
      setPayroll(null);
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchPayroll();
  }, []);

  useEffect(() => {
    if (payrollMonth) fetchPayroll();
  }, [payrollMonth]);

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
      await API.post(`/salary/${emp.id}`, {
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
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:w-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 shadow-sm">
              <FaBriefcase className="text-blue-600 text-[13px]" />
              <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-blue-700">
                Salary Management
              </span>
            </div>
            <h2 className="mt-4 text-[26px] sm:text-[38px] lg:text-[38px] font-extrabold leading-tight text-slate-900">
              Employee Salaries
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] sm:text-[18px] leading-relaxed text-slate-500">
              Set or update monthly salary for each employee. Salary
              auto-calculates daily pay on the Attendance page.
            </p>
          </div>

          <div className="flex w-full items-center gap-4 rounded-2xl border border-blue-100/70 bg-white px-5 py-4 shadow-[0_8px_24px_-8px_rgba(37,99,235,0.18)] transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto sm:px-6 sm:py-5 lg:self-auto">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md">
              <FaUsers className="text-2xl" />
            </div>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wider text-slate-400">
                Total Employees
              </p>
              <p className="text-[28px] sm:text-[40px] font-extrabold leading-none text-slate-900">
                {employees.length}
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
        {msg.text && (
          <div
            className={`w-full rounded-2xl px-4 py-3 text-[14px] font-bold shadow-sm sm:px-5 sm:py-3.5 sm:text-[15px] ${
              msg.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* ===================== DESKTOP / LAPTOP TABLE (lg and up) — UNCHANGED ===================== */}
        <div className="hidden lg:block w-full overflow-hidden rounded-3xl border border-blue-100/60 bg-white shadow-[0_20px_50px_-20px_rgba(30,64,175,0.15)]">
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-sky-500">
                  <th className="p-4 text-[16px] font-bold text-white first:rounded-tl-3xl w-[5%]">#</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[25%]">Employee</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[13%]">Role</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[15%]">Designation</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[17%]">Monthly Salary</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[13%]">Per-Day Pay</th>
                  <th className="p-4 text-[16px] font-bold text-white last:rounded-tr-3xl w-[12%]">Action</th>
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
                    <tr
                      key={emp.id}
                      className="border-b border-slate-100 transition-colors duration-200 last:border-b-0 hover:bg-blue-50/40"
                    >
                      <td className="p-4 text-[16px] font-semibold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Employee */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow-sm">
                            {emp.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[17px] font-bold text-slate-900">{emp.name}</p>
                            <p className="truncate text-[14px] text-slate-500">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3.5 py-1.5 text-[15px] font-bold capitalize text-blue-700">
                          {emp.role}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="p-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.designation}
                            onChange={(e) =>
                              setEditForm({ ...editForm, designation: e.target.value })
                            }
                            placeholder="Designation"
                            className="h-11 w-full max-w-[180px] rounded-xl border border-blue-200 bg-blue-50/50 px-3.5 text-[15px] font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        ) : (
                          <span className="text-[16px] text-slate-600">
                            {emp.designation || "—"}
                          </span>
                        )}
                      </td>

                      {/* Salary */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="relative w-full max-w-[180px]">
                            <FaRupeeSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-400" />
                            <input
                              type="number"
                              value={editForm.salary}
                              onChange={(e) =>
                                setEditForm({ ...editForm, salary: e.target.value })
                              }
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="h-11 w-full rounded-xl border border-blue-200 bg-blue-50/50 pl-8 pr-3.5 text-[15px] font-bold text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3.5 py-1.5 text-[16px] font-bold text-emerald-700">
                            <FaRupeeSign className="text-[13px]" />
                            {monthly.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Per-day */}
                      <td className="p-4">
                        <span className="text-[16px] font-semibold text-slate-600">
                          ₹ {perDay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleSave(emp)}
                              disabled={savingId === emp.id}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[14px] font-bold text-white shadow-sm transition-all duration-250 hover:bg-emerald-700 hover:shadow-md disabled:opacity-50"
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
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[14px] font-bold text-slate-600 shadow-sm transition-all duration-250 hover:bg-slate-50 hover:shadow-md"
                            >
                              <FaTimes /> Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(emp)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 px-4 py-2 text-[14px] font-bold text-white shadow-sm transition-all duration-250 hover:shadow-md hover:-translate-y-0.5"
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
                    <td colSpan={7} className="p-0">
                      <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-400">
                          <FaUserSlash className="text-3xl" />
                        </div>
                        <p className="text-[21px] font-bold text-slate-800">No employees found</p>
                        <p className="max-w-sm text-[17px] text-slate-500">
                          Employees will appear here once they are added to the system.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <FaSpinner className="animate-spin text-3xl text-blue-600" />
              <span className="text-[17px] font-semibold text-slate-500">Loading employees...</span>
            </div>
          )}
        </div>

        {/* ===================== MOBILE / TABLET / iPAD CARD LAYOUT (below lg) ===================== */}
        <div className="block lg:hidden w-full">
          {loading && (
            <div className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-blue-100/60 bg-white py-14 shadow-sm">
              <FaSpinner className="animate-spin text-3xl text-blue-600" />
              <span className="text-[15px] font-semibold text-slate-500">Loading employees...</span>
            </div>
          )}

          {!loading && employees.length === 0 && (
            <div className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-blue-100/60 bg-white px-6 py-14 text-center shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-400">
                <FaUserSlash className="text-3xl" />
              </div>
              <p className="text-[18px] font-bold text-slate-800">No employees found</p>
              <p className="max-w-sm text-[15px] text-slate-500">
                Employees will appear here once they are added to the system.
              </p>
            </div>
          )}

          {!loading && employees.length > 0 && (
            <div className="w-full space-y-4">
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
                  <div
                    key={emp.id}
                    className="w-full rounded-2xl border border-blue-100/60 bg-white p-4 shadow-[0_8px_24px_-12px_rgba(30,64,175,0.15)] sm:p-5"
                  >
                    {/* Top row: avatar, name, email, role */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow-sm">
                          {emp.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[16px] font-bold text-slate-900">
                            {idx + 1}. {emp.name}
                          </p>
                          <p className="break-words text-[13px] text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                      <span className="inline-flex flex-shrink-0 items-center rounded-full bg-blue-50 px-3 py-1 text-[13px] font-bold capitalize text-blue-700">
                        {emp.role}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Designation
                        </p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.designation}
                            onChange={(e) =>
                              setEditForm({ ...editForm, designation: e.target.value })
                            }
                            placeholder="Designation"
                            className="mt-1 h-11 w-full rounded-xl border border-blue-200 bg-blue-50/50 px-3.5 text-[15px] font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        ) : (
                          <p className="mt-1 break-words text-[15px] font-semibold text-slate-700">
                            {emp.designation || "—"}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Monthly Salary
                        </p>
                        {isEditing ? (
                          <div className="relative mt-1">
                            <FaRupeeSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400" />
                            <input
                              type="number"
                              value={editForm.salary}
                              onChange={(e) =>
                                setEditForm({ ...editForm, salary: e.target.value })
                              }
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="h-11 w-full rounded-xl border border-blue-200 bg-blue-50/50 pl-8 pr-3 text-[15px] font-bold text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </div>
                        ) : (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[14px] font-bold text-emerald-700">
                            <FaRupeeSign className="text-[11px]" />
                            {monthly.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Per-Day Pay
                        </p>
                        <p className="mt-1 text-[15px] font-semibold text-slate-600">
                          ₹ {perDay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            onClick={() => handleSave(emp)}
                            disabled={savingId === emp.id}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-[14px] font-bold text-white shadow-sm transition-all duration-250 hover:bg-emerald-700 hover:shadow-md disabled:opacity-50 sm:w-auto"
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
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-600 shadow-sm transition-all duration-250 hover:bg-slate-50 hover:shadow-md sm:w-auto"
                          >
                            <FaTimes /> Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(emp)}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 px-4 py-2.5 text-[14px] font-bold text-white shadow-sm transition-all duration-250 hover:shadow-md hover:-translate-y-0.5 sm:w-auto"
                        >
                          <FaEdit /> Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===================== PAYROLL SECTION (eSSL attendance-driven) ===================== */}
        <section className="w-full space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-md">
                <FaFingerprint className="text-lg" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Payroll Report
                </h3>
                <p className="text-xs text-slate-500">
                  Calculated from actual attendance (eSSL + manual)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-slate-400 text-sm" />
              <input
                type="month"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Summary cards */}
          {payroll && !payrollLoading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Total Monthly Salary
                </p>
                <p className="mt-1 text-xl font-extrabold text-blue-700">
                  ₹ {payroll.summary.totalMonthlySalary.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                  Total Earned (Attendance)
                </p>
                <p className="mt-1 text-xl font-extrabold text-emerald-700">
                  ₹ {payroll.summary.totalEarnedPay.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-500">
                  Avg Earned %
                </p>
                <p className="mt-1 text-xl font-extrabold text-violet-700">
                  {payroll.summary.avgEarnedPercent}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Employees
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-700">
                  {payroll.summary.totalEmployees}
                </p>
              </div>
            </div>
          )}

          {/* Payroll table */}
          <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-violet-50/60 text-xs font-bold uppercase tracking-wider text-violet-700">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 text-center">Days Present</th>
                    <th className="px-4 py-3 text-center">Late</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3 text-center">Biometric</th>
                    <th className="px-4 py-3">Monthly Salary</th>
                    <th className="px-4 py-3">Earned Pay</th>
                    <th className="px-4 py-3">Earned %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {payrollLoading && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        <FaSpinner className="mx-auto mb-2 animate-spin text-slate-400" />
                        Loading payroll…
                      </td>
                    </tr>
                  )}
                  {!payrollLoading &&
                    payroll?.employees?.map((emp) => {
                      const pct =
                        emp.monthlySalary > 0
                          ? (
                              (emp.earnedPay / emp.monthlySalary) *
                              100
                            ).toFixed(0)
                          : "0";
                      return (
                        <tr
                          key={emp.employeeId}
                          className="transition hover:bg-violet-50/30"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {emp.employeeName || emp.employeeCode}
                            </p>
                            <p className="text-xs text-slate-400">
                              {emp.designation || ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex min-w-[36px] items-center justify-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                              {emp.presentDays}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-semibold text-amber-600">
                              {emp.lateDays}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-semibold text-red-500">
                              {emp.absentDays}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-600">
                              <FaFingerprint className="text-[10px]" />
                              {emp.biometricDays}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800">
                              ₹ {emp.monthlySalary.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-emerald-700">
                              ₹ {emp.earnedPay.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-600">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {!payrollLoading && payroll?.employees?.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-sm text-slate-400">
                        No employees found for this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Note */}
        <div className="flex w-full items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-[14px] leading-relaxed text-slate-600 shadow-sm sm:px-5 sm:py-4 sm:text-[16px]">
          <FaInfoCircle className="mt-0.5 flex-shrink-0 text-blue-500" />
          <p className="break-words">
            <strong className="font-bold text-slate-800">Note:</strong> Leave (100% deduction) and Absent (100% deduction) are configurable in the backend. Currently: Present = full day pay, Absent/Leave = ₹0, Late = 10% deduction, Half Day = 50% pay.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalaryManagement;