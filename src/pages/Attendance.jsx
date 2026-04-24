import React, { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaClipboardCheck,
  FaClock,
  FaUserCheck,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import AttendanceForm from "../components/Attendance/AttendanceForm";
import AttendanceRow from "../components/Attendance/AttendanceRow";
import FiltersSection from "../components/Attendance/FiltersSection";
import SummaryCard from "../components/Attendance/SummaryCard";
import API from "../api";

const Attendance = () => {

  /* ================= STATE ================= */

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [department, setDepartment] = useState("All Departments");
  const [role, setRole] = useState("All Roles");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [employees, setEmployees] = useState([]);

  // ✅ Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await API.get("/attendance", {
          params: { date },
        });
        setEmployees(res.data || []);
      } catch (err) {
        console.error("Error loading attendance", err);
      }
    };

    fetchAttendance();
  }, [date]);

  /* ================= FILTER ================= */

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesDepartment =
          department === "All Departments" ||
          employee.department === department;

        const matchesRole =
          role === "All Roles" || employee.role === role;

        const matchesSearch =
          searchQuery === "" ||
          (employee.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        return matchesDepartment && matchesRole && matchesSearch;
      }),
    [department, employees, role, searchQuery]
  );

  /* ================= PAGINATION ================= */

  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;

  const currentRecords = filteredEmployees.slice(
    indexOfFirst,
    indexOfLast
  );

  const totalPages = Math.ceil(
    filteredEmployees.length / recordsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredEmployees]);

  /* ================= STATS ================= */

  const totalStaff = employees.length;
  const presentStaff = employees.filter((e) => e.status === "Present").length;
  const absentStaff = employees.filter((e) => e.status === "Absent").length;
  const lateStaff = employees.filter((e) => e.status === "Late").length;
  const onLeaveStaff = employees.filter((e) => e.status === "On Leave").length;

  /* ================= ADD ================= */

  const handleManualSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        name: data.employeeName,
        date,
      };

      const res = await API.post("/attendance", payload);
      const newId = res.data?.id || Date.now();

      setEmployees((prev) => [{ id: newId, ...payload }, ...prev]);
      setShowManualEntry(false);
      window.alert("Attendance saved");
    } catch (err) {
      console.error("Error saving attendance", err);
      window.alert("Error saving attendance");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6 p-4 sm:p-6">

      <FiltersSection
        date={date}
        department={department}
        role={role}
        searchQuery={searchQuery}
        onDateChange={setDate}
        onDepartmentChange={setDepartment}
        onRoleChange={setRole}
        onSearchChange={setSearchQuery}
        onAddManualEntry={() => setShowManualEntry(true)}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
        <SummaryCard label="Total" value={totalStaff} icon={FaUsers} />
        <SummaryCard label="Present" value={presentStaff} color="green" icon={FaUserCheck} />
        <SummaryCard label="Absent" value={absentStaff} color="red" icon={FaClipboardCheck} />
        <SummaryCard label="Late" value={lateStaff} color="yellow" icon={FaClock} />
        <SummaryCard label="Leave" value={onLeaveStaff} color="blue" icon={FaCalendarAlt} />
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl bg-white shadow">
        <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Employee</th>
              <th>Role</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
              <th>Method</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {currentRecords.map((employee) => (
              <AttendanceRow key={employee.id} employee={employee} />
            ))}

            {currentRecords.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-6">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* ✅ PAGINATION UI */}
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
          <button
            onClick={() => setCurrentPage((prev) => prev - 1)}
            disabled={currentPage === 1}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition ${
                currentPage === i + 1
                  ? "border-transparent bg-[linear-gradient(180deg,#07111f_0%,#0b1728_100%)] text-white shadow-[0_10px_24px_rgba(2,8,23,0.2)]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
             disabled={currentPage >= totalPages || totalPages === 0}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* MODAL */}
      {showManualEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 sm:p-6">
            <AttendanceForm
              onSubmit={handleManualSubmit}
              onCancel={() => setShowManualEntry(false)}
              initialData={{ date }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
