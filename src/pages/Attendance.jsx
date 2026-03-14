import React, { useEffect, useState } from "react";
import AttendanceRow from "../components/Attendance/AttendanceRow";
import FiltersSection from "../components/Attendance/FiltersSection";
import SummaryCard from "../components/Attendance/SummaryCard";
import AttendanceForm from "../components/Attendance/AttendanceForm";
import API from "../api";

const Attendance = () => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [department, setDepartment] = useState("All Departments");
  const [role, setRole] = useState("All Roles");
  const [searchQuery, setSearchQuery] = useState("");

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await API.get("/attendance", { params: { date } });
        setEmployees(res.data || []);
      } catch (err) {
        console.error("Error loading attendance", err);
      }
    };

    fetchAttendance();
  }, [date]);

  const filteredEmployees = employees.filter((emp) => {
    const matchesDepartment =
      department === "All Departments" || emp.department === department;

    const matchesRole = role === "All Roles" || emp.role === role;

    const matchesSearch =
      searchQuery === "" ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDepartment && matchesRole && matchesSearch;
  });

  const totalStaff = employees.length;
  const presentStaff = employees.filter((e) => e.status === "Present").length;
  const absentStaff = employees.filter((e) => e.status === "Absent").length;
  const lateStaff = employees.filter((e) => e.status === "Late").length;
  const onLeaveStaff = employees.filter(
    (e) => e.status === "On Leave"
  ).length;

  const handleAddManualEntry = () => {
    setShowManualEntry(true);
  };

  const handleManualSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        date,
      };

      const res = await API.post("/attendance", payload);

      const newId = res.data?.id || Date.now();

      setEmployees((prev) => [
        { id: newId, ...payload },
        ...prev,
      ]);

      setShowManualEntry(false);

      alert("Attendance saved");

    } catch (err) {
      console.error("Error saving attendance", err);
      alert("Error saving attendance");
    }
  };

  return (
    <div className="resort-page">

      <div className="resort-shell">

        {/* HERO */}

        <section className="resort-hero">

          <div className="resort-hero-content lg:flex-row lg:items-end lg:justify-between">

            <div className="space-y-3">

              <p className="resort-eyebrow">
                Workforce Snapshot
              </p>

              <h1 className="resort-title">
                Attendance management made cleaner
              </h1>

              <p className="resort-subtitle">
                Track staff presence, late arrivals, and leave patterns
                from one responsive workspace.
              </p>

            </div>

            <div className="resort-stat-grid">

              <div className="resort-stat">
                <span className="resort-stat-label">Date</span>
                <span className="resort-stat-value">
                  {date}
                </span>
              </div>

              <div className="resort-stat">
                <span className="resort-stat-label">Visible Staff</span>
                <span className="resort-stat-value">
                  {filteredEmployees.length}
                </span>
              </div>

            </div>

          </div>

        </section>

        {/* FILTERS */}

        <section className="resort-panel">

          <FiltersSection
            date={date}
            department={department}
            role={role}
            searchQuery={searchQuery}
            onDateChange={setDate}
            onDepartmentChange={setDepartment}
            onRoleChange={setRole}
            onSearchChange={setSearchQuery}
            onAddManualEntry={handleAddManualEntry}
          />

        </section>

        {/* SUMMARY */}

        <section className="resort-grid">

          <SummaryCard label="Total Staff" value={totalStaff} />
          <SummaryCard label="Present" value={presentStaff} color="green" />
          <SummaryCard label="Absent" value={absentStaff} color="red" />
          <SummaryCard label="Late" value={lateStaff} color="yellow" />
          <SummaryCard label="On Leave" value={onLeaveStaff} color="blue" />

        </section>

        {/* TABLE */}

        <section className="resort-table-shell">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[760px] text-sm">

              <thead>

                <tr className="text-gray-300 border-b border-white/10">

                  <th className="p-3 text-left">Employee</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Check In</th>
                  <th className="p-3 text-left">Check Out</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Method</th>
                  <th className="p-3 text-left">Action</th>

                </tr>

              </thead>

              <tbody>

                {filteredEmployees.map((employee) => (
                  <AttendanceRow
                    key={employee.id}
                    employee={employee}
                  />
                ))}

                {filteredEmployees.length === 0 && (

                  <tr>

                    <td colSpan={7} className="p-6">

                      <div className="resort-empty">
                        No attendance records found.
                      </div>

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* MANUAL ENTRY FORM */}

        {showManualEntry && (

          <div className="mt-8 border border-white/10 rounded-xl p-6 bg-slate-900">

            <h2 className="text-lg font-bold mb-4">
              Add Manual Entry
            </h2>

            <AttendanceForm
              onSubmit={handleManualSubmit}
            />

            <button
              className="mt-4 bg-red-500 px-4 py-2 rounded"
              onClick={() => setShowManualEntry(false)}
            >
              Cancel
            </button>

          </div>

        )}

      </div>

    </div>
  );
};

export default Attendance;