import React, { useEffect, useState, useCallback } from "react";
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
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaPauseCircle,
  FaEye,
  FaRupeeSign as FaRupee,
} from "react-icons/fa";
import API from "../api";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const STATUS_CONFIG = {
  "Paid":     { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", icon: FaCheckCircle,    dot: "bg-emerald-500" },
  "Pending":  { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",  icon: FaClock,           dot: "bg-amber-500" },
  "Partial":  { bg: "bg-sky-50",      text: "text-sky-700",     border: "border-sky-200",    icon: FaPauseCircle,     dot: "bg-sky-500" },
  "On Hold":  { bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200",   icon: FaExclamationTriangle, dot: "bg-rose-500" },
};

const SalaryManagement = () => {
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ salary: "", designation: "" });
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [fetchError, setFetchError] = useState("");

  // Month-wise payment state
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    month: new Date().getMonth() + 1,
    status: "Paid",
    amount_paid: "",
    payment_mode: "Cash",
    paid_on: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);

  /* ================= FETCH EMPLOYEES ================= */

  const fetchEmployees = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await API.get("/salary");
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      const text = err.response?.data?.message || "Failed to load employees";
      setFetchError(text);
      setMsg({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH PAYMENTS FOR YEAR ================= */

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await API.get(`/salary/payments?year=${selectedYear}`);
      setPayments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setPaymentsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length) fetchPayments();
  }, [selectedYear, fetchPayments, employees.length]);

  /* ================= EDIT EMPLOYEE SALARY ================= */

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
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to save salary" });
    } finally {
      setSavingId(null);
    }
  };

  /* ================= PAYMENT MODAL ================= */

  const openPaymentModal = (emp, month) => {
    const existing = payments.find(
      p => p.user_id === emp.id && p.month === month && p.year === selectedYear
    );
    setSelectedEmployee(emp);
    setPaymentForm({
      month,
      status: existing?.status || "Paid",
      amount_paid: existing?.amount_paid || "",
      payment_mode: existing?.payment_mode || "Cash",
      paid_on: existing?.paid_on || new Date().toISOString().slice(0, 10),
      notes: existing?.notes || "",
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedEmployee) return;
    setSavingPayment(true);
    try {
      await API.post(`/salary/${selectedEmployee.id}/pay`, {
        year: selectedYear,
        month: paymentForm.month,
        status: paymentForm.status,
        amount_paid: parseFloat(paymentForm.amount_paid) || 0,
        payment_mode: paymentForm.payment_mode,
        paid_on: paymentForm.paid_on,
        notes: paymentForm.notes,
      });
      setMsg({ type: "success", text: `Payment updated for ${selectedEmployee.name} - ${MONTHS[paymentForm.month - 1]}` });
      setShowPaymentModal(false);
      fetchPayments();
    } catch (err) {
      console.error("Error updating payment:", err);
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to update payment" });
    } finally {
      setSavingPayment(false);
    }
  };

  const getPaymentStatus = (userId, month) => {
    const p = payments.find(
      p => p.user_id === userId && p.month === month && p.year === selectedYear
    );
    return p?.status || "Pending";
  };

  /* ================= STATUS HELPERS ================= */

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Pending"];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
        <Icon className="text-[10px]" />
        {status}
      </span>
    );
  };

  const getStatusDot = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Pending"];
    return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cfg.dot}`} title={status} />;
  };

  /* ================= MONTH GRID FOR EMPLOYEE ================= */

  const renderMonthGrid = (emp) => (
    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {MONTHS.map((mName, idx) => {
        const m = idx + 1;
        const status = getPaymentStatus(emp.id, m);
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Pending"];
        return (
          <button
            key={m}
            onClick={() => openPaymentModal(emp, m)}
            title={`${mName} ${selectedYear}: ${status}`}
            className={`flex items-center justify-between rounded-xl border px-2 py-2 text-[11px] font-bold transition-all hover:scale-[1.03] active:scale-95 ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            <span className="truncate">{mName.slice(0, 3)}</span>
            {getStatusDot(status)}
          </button>
        );
      })}
    </div>
  );

  /* ================= UI ================= */

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:w-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 shadow-sm">
              <FaBriefcase className="text-blue-600 text-[13px]" />
              <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-blue-700">Salary Management</span>
            </div>
            <h2 className="mt-4 text-[26px] sm:text-[38px] font-extrabold leading-tight text-slate-900">Employee Salaries</h2>
            <p className="mt-2 max-w-2xl text-[15px] sm:text-[18px] leading-relaxed text-slate-500">
              Set or update monthly salary and track month-wise payment status for each employee.
            </p>
          </div>

          <div className="flex w-full items-center gap-4 rounded-2xl border border-blue-100/70 bg-white px-5 py-4 shadow-[0_8px_24px_-8px_rgba(37,99,235,0.18)] sm:w-auto sm:px-6 sm:py-5">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md">
              <FaUsers className="text-2xl" />
            </div>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wider text-slate-400">Total Employees</p>
              <p className="text-[28px] sm:text-[40px] font-extrabold leading-none text-slate-900">{employees.length}</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {msg.text && (
          <div className={`w-full rounded-2xl px-4 py-3 text-[14px] font-bold shadow-sm sm:px-5 sm:py-3.5 sm:text-[15px] ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {msg.text}
          </div>
        )}

        {/* Year selector */}
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100/70 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
          <FaCalendarAlt className="text-blue-600 text-lg" />
          <span className="text-[14px] font-bold text-slate-600">Salary Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2 text-[15px] font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-[12px] text-slate-400 ml-2">Click any month to mark as Paid / Pending / Partial</span>
        </div>

        {/* ===================== DESKTOP TABLE (lg+) ===================== */}
        <div className="hidden lg:block w-full overflow-hidden rounded-3xl border border-blue-100/60 bg-white shadow-[0_20px_50px_-20px_rgba(30,64,175,0.15)]">
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-sky-500">
                  <th className="p-4 text-[16px] font-bold text-white first:rounded-tl-3xl w-[5%]">#</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[20%]">Employee</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[10%]">Role</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[12%]">Designation</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[13%]">Monthly Salary</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[10%]">Per-Day</th>
                  <th className="p-4 text-[16px] font-bold text-white w-[20%]">Payment Status ({selectedYear})</th>
                  <th className="p-4 text-[16px] font-bold text-white last:rounded-tr-3xl w-[10%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const monthly = parseFloat(emp.salary || 0);
                  const daysInMonth = new Date(selectedYear, new Date().getMonth() + 1, 0).getDate();
                  const perDay = daysInMonth > 0 ? monthly / daysInMonth : 0;
                  const isEditing = editingId === emp.id;

                  // Count payment statuses for this employee in selected year
                  const empPayments = payments.filter(p => p.user_id === emp.id && p.year === selectedYear);
                  const paidCount = empPayments.filter(p => p.status === "Paid").length;
                  const partialCount = empPayments.filter(p => p.status === "Partial").length;
                  const pendingCount = empPayments.filter(p => p.status === "Pending").length;
                  const onHoldCount = empPayments.filter(p => p.status === "On Hold").length;
                  const paidAmount = empPayments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);

                  return (
                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                      <td className="p-4 text-[16px] font-semibold text-slate-400">{idx + 1}</td>

                      {/* Employee */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-[14px] font-bold text-white shadow-sm">
                            {(emp.name?.[0] || "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold text-slate-900">{emp.name}</p>
                            <p className="truncate text-[13px] text-slate-500">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[13px] font-bold capitalize text-blue-700">
                          {emp.role}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="p-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.designation}
                            onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                            placeholder="Designation"
                            className="h-10 w-full max-w-[160px] rounded-xl border border-blue-200 bg-blue-50/50 px-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        ) : (
                          <span className="text-[15px] text-slate-600">{emp.designation || "—"}</span>
                        )}
                      </td>

                      {/* Monthly Salary */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="relative w-full max-w-[140px]">
                            <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400" />
                            <input
                              type="number"
                              value={editForm.salary}
                              onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                              min="0"
                              step="0.01"
                              className="h-10 w-full rounded-xl border border-blue-200 bg-blue-50/50 pl-7 pr-2 text-[14px] font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[14px] font-bold text-emerald-700">
                            <FaRupeeSign className="text-[11px]" />
                            {monthly.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Per-Day */}
                      <td className="p-4">
                        <span className="text-[14px] font-semibold text-slate-600">
                          ₹ {perDay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Payment Status Summary */}
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {paidCount > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{paidCount} Paid</span>}
                          {partialCount > 0 && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">{partialCount} Partial</span>}
                          {pendingCount > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">{pendingCount} Pending</span>}
                          {onHoldCount > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">{onHoldCount} Hold</span>}
                          {empPayments.length === 0 && <span className="text-[12px] text-slate-400">No payments</span>}
                        </div>
                        {paidAmount > 0 && (
                          <p className="mt-1 text-[12px] font-semibold text-slate-500">
                            Total paid: ₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleSave(emp)}
                              disabled={savingId === emp.id}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {savingId === emp.id ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            </button>
                            <button onClick={cancelEdit} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-50">
                              <FaTimes />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(emp)}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 px-3 py-1.5 text-[12px] font-bold text-white hover:shadow-md"
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
                    <td colSpan={8} className="p-0">
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
        </div>

        {/* ===================== MOBILE CARDS (below lg) ===================== */}
        <div className="block lg:hidden w-full">
          {employees.map((emp, idx) => {
            const monthly = parseFloat(emp.salary || 0);
            const daysInMonth = new Date(selectedYear, new Date().getMonth() + 1, 0).getDate();
            const perDay = daysInMonth > 0 ? monthly / daysInMonth : 0;
            const isEditing = editingId === emp.id;
            const empPayments = payments.filter(p => p.user_id === emp.id && p.year === selectedYear);
            const paidAmount = empPayments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);

            return (
              <div key={emp.id} className="mb-4 w-full rounded-2xl border border-blue-100/60 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow-sm">
                      {(emp.name?.[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[16px] font-bold text-slate-900">{idx + 1}. {emp.name}</p>
                      <p className="text-[13px] text-slate-500">{emp.email}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[12px] font-bold capitalize text-blue-700">{emp.role}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Designation</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.designation}
                        onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-blue-200 bg-blue-50/50 px-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-500"
                      />
                    ) : (
                      <p className="mt-1 text-[14px] font-semibold text-slate-700">{emp.designation || "—"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly Salary</p>
                    {isEditing ? (
                      <div className="relative mt-1">
                        <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400" />
                        <input
                          type="number"
                          value={editForm.salary}
                          onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                          min="0"
                          step="0.01"
                          className="h-10 w-full rounded-xl border border-blue-200 bg-blue-50/50 pl-7 pr-2 text-[14px] font-bold text-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>
                    ) : (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-bold text-emerald-700">
                        <FaRupeeSign className="text-[10px]" />
                        {monthly.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Per-Day Pay</p>
                    <p className="mt-1 text-[14px] font-semibold text-slate-600">
                      ₹ {perDay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paid Amount</p>
                    <p className="mt-1 text-[14px] font-semibold text-emerald-700">
                      ₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Month-wise payment grid */}
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {selectedYear} Payment Status (tap to update)
                  </p>
                  {renderMonthGrid(emp)}
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSave(emp)}
                        disabled={savingId === emp.id}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
                      >
                        {savingId === emp.id ? <FaSpinner className="animate-spin" /> : "Save"}
                      </button>
                      <button onClick={cancelEdit} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-600">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(emp)}
                      className="w-full rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 px-4 py-2.5 text-[14px] font-bold text-white"
                    >
                      <FaEdit /> Edit Salary
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <div className="flex w-full items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-[14px] leading-relaxed text-slate-600 shadow-sm sm:px-5 sm:py-4 sm:text-[16px]">
          <FaInfoCircle className="mt-0.5 flex-shrink-0 text-blue-500" />
          <p className="break-words">
            <strong className="font-bold text-slate-800">Note:</strong> Leave (100% deduction) and Absent (100% deduction) are configurable in the backend. Currently: Present = full day pay, Absent/Leave = ₹0, Late = 10% deduction, Half Day = 50% pay.
          </p>
        </div>
      </div>

      {/* ===================== PAYMENT MODAL ===================== */}
      {showPaymentModal && selectedEmployee && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
          <div
            className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.32)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] uppercase tracking-[0.26em] text-blue-700">Salary Payment</div>
            <div className="mt-2 text-2xl font-black text-slate-900">
              {selectedEmployee.name}
            </div>
            <p className="mt-1 text-[14px] text-slate-500">
              {MONTHS[paymentForm.month - 1]} {selectedYear}
            </p>

            <div className="mt-5 space-y-4">
              {/* Status */}
              <div>
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-slate-500">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Paid", "Pending", "Partial", "On Hold"].map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const selected = paymentForm.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, status: s })}
                        className={`rounded-xl border-2 px-3 py-2.5 text-[13px] font-bold transition-all ${
                          selected ? `${cfg.bg} ${cfg.text} ${cfg.border} border-current` : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Paid */}
              <div>
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-slate-500">Amount Paid (₹)</label>
                <div className="relative">
                  <FaRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-400" />
                  <input
                    type="number"
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 bg-slate-50 pl-8 pr-3.5 text-[15px] font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-slate-500">Payment Mode</label>
                <select
                  value={paymentForm.payment_mode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 text-[15px] font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              {/* Paid On */}
              <div>
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-slate-500">Paid On</label>
                <input
                  type="date"
                  value={paymentForm.paid_on}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paid_on: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 text-[15px] font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-slate-500">Notes (optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Add any notes..."
                  rows={2}
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-[14px] font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={savingPayment}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingPayment ? <FaSpinner className="animate-spin" /> : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;
