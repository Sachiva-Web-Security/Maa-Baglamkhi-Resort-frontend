import React, { useEffect, useState } from "react";
import AttendanceRow from "../components/Attendance/AttendanceRow";
import FiltersSection from "../components/Attendance/FiltersSection";
import SummaryCard from "../components/Attendance/SummaryCard";
import Modal from "../components/Hotel/Modal";
import AttendanceForm from "../components/Attendance/AttendanceForm";
import API from "../api";

const Attendance = () => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [department, setDepartment] = useState("All Departments");
  const [role, setRole] = useState("All Roles");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);

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

  const handleAddManualEntry = () => setShowManualEntryModal(true);

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
      setShowManualEntryModal(false);
      alert("Attendance saved");
    } catch (err) {
      console.error("Error saving attendance", err);
      alert("Error saving attendance");
    }
  };

  return (
    <div className="resort-page">
      <div className="resort-shell">
        <section className="resort-hero">
          <div className="resort-hero-content lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="resort-eyebrow">Workforce Snapshot</p>
              <h1 className="resort-title">Attendance management made cleaner</h1>
              <p className="resort-subtitle">
                Track staff presence, late arrivals, and leave patterns from one
                responsive workspace built for both front desk and mobile use.
              </p>
            </div>
            <div className="resort-stat-grid">
              <div className="resort-stat">
                <span className="resort-stat-label">Date</span>
                <span className="resort-stat-value text-[1.2rem]">{date}</span>
              </div>
              <div className="resort-stat">
                <span className="resort-stat-label">Departments</span>
                <span className="resort-stat-value">{department === "All Departments" ? "All" : "1"}</span>
              </div>
              <div className="resort-stat">
                <span className="resort-stat-label">Visible Staff</span>
                <span className="resort-stat-value">{filteredEmployees.length}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="resort-panel">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="resort-panel-title">Shift filters</h2>
              <p className="resort-panel-copy">
                Narrow the list by date, role, and department, then add manual
                entries when needed.
              </p>
            </div>
          </div>
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

        <section className="resort-grid">
          <SummaryCard label="Total Staff" value={totalStaff} />
          <SummaryCard label="Present" value={presentStaff} color="green" />
          <SummaryCard label="Absent" value={absentStaff} color="red" />
          <SummaryCard label="Late" value={lateStaff} color="yellow" />
          <SummaryCard label="On Leave" value={onLeaveStaff} color="blue" />
        </section>

        <section className="resort-table-shell">
          <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-4 sm:px-6">
            <h2 className="resort-panel-title">Daily attendance log</h2>
            <p className="resort-panel-copy">
              Responsive staff table with clear statuses and quick action access.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-gray-300 border-b border-white/10 ">
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
                  <AttendanceRow key={employee.id} employee={employee} />
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6">
                      <div className="resort-empty">
                        No attendance records match the current filters.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Modal
        isOpen={showManualEntryModal}
        onClose={() => setShowManualEntryModal(false)}
        title="Add Manual Entry"
      >
        <AttendanceForm onSubmit={handleManualSubmit} />
      </Modal>
    </div>
  );
};

export default Attendance;
