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
  /* ================= ROLE ================= */

  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";

  /* ================= STATE ================= */

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [department, setDepartment] = useState("All Departments");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await API.get("/attendance", { params: { date } });
        const data = Array.isArray(res.data) ? res.data : [];
        setEmployees(data);
      } catch (err) {
        console.error("Error loading attendance", err);
      }
    };

    fetchAttendance();
  }, [date]);

  /* ================= FILTER ================= */

  const filteredEmployees = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    return list.filter((employee) => {
      const matchesDepartment =
        department === "All Departments" ||
        employee.department === department;

      const matchesRole =
        roleFilter === "All Roles" || employee.role === roleFilter;

      const matchesSearch =
        searchQuery === "" ||
        (employee.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      return matchesDepartment && matchesRole && matchesSearch;
    });
  }, [department, employees, roleFilter, searchQuery]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredEmployees]);

  /* ================= STATS ================= */

  const totalStaff = employees.length;
  const presentStaff = employees.filter((e) => e.status === "Present").length;
  const absentStaff = employees.filter((e) => e.status === "Absent").length;
  const lateStaff = employees.filter((e) => e.status === "Late").length;
  const onLeaveStaff = employees.filter((e) => e.status === "On Leave").length;
  const totalSalary = employees.reduce(
    (sum, e) => sum + parseFloat(e.salary_amount || 0),
    0
  );

  /* ================= ADD (admin only) ================= */

  const handleManualSubmit = async (data) => {
    if (!isAdmin) {
      window.alert("Only admin can add attendance");
      return;
    }
    try {
      const payload = {
        ...data,
        name: data.employeeName,
        date,
      };

      const res = await API.post("/attendance", payload);
      const newId = res.data?.id || Date.now();
      setEmployees((prev) => [
        {
          id: newId,
          ...payload,
          salary_amount: res.data?.salary_amount || 0,
          user_salary: res.data?.user_salary || 0,
        },
        ...prev,
      ]);
      setShowManualEntry(false);
      window.alert("Attendance saved");
    } catch (err) {
      console.error("Error saving attendance", err);
      window.alert("Error saving attendance");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">

      <FiltersSection
        date={date}
        department={department}
        role={roleFilter}
        searchQuery={searchQuery}
        onDateChange={setDate}
        onDepartmentChange={setDepartment}
        onRoleChange={setRoleFilter}
        onSearchChange={setSearchQuery}
        onAddManualEntry={() => setShowManualEntry(true)}
        showAddButton={isAdmin}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard label="Total" value={totalStaff} icon={FaUsers} />
        <SummaryCard label="Present" value={presentStaff} color="green" icon={FaUserCheck} />
        <SummaryCard label="Absent" value={absentStaff} color="red" icon={FaClipboardCheck} />
        <SummaryCard label="Late" value={lateStaff} color="yellow" icon={FaClock} />
        <SummaryCard label="Leave" value={onLeaveStaff} color="blue" icon={FaCalendarAlt} />
        <SummaryCard
          label="Total Salary"
          value={`₹ ${totalSalary.toFixed(0)}`}
          color="emerald"
          icon={FaUsers}
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Employee</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
              <th>Method</th>
              <th>Daily Salary</th>
              {isAdmin && <th>Action</th>}
            </tr>
          </thead>

          <tbody>
            {currentRecords.map((employee) => (
              <AttendanceRow
                key={employee.id}
                employee={employee}
                isAdmin={isAdmin}
              />
            ))}

            {currentRecords.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="text-center p-6"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4">
            <button
              onClick={() => setCurrentPage((prev) => prev - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded ${
                  currentPage === i + 1
                    ? "bg-blue-900 text-white"
                    : "bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* MODAL - admin only */}
      {isAdmin && showManualEntry && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg">
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
