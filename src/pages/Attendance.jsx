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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const res = await API.get("/attendance", { params: { date } });
        if (res.data && res.data.length > 0) {
          setEmployees(res.data.map(e => ({
            id: e.id || e.user_id,
            name: e.name || e.userName || e.employee_name,
            role: e.role || e.designation || "Staff",
            department: e.department || "General",
            checkIn: e.checkIn || e.check_in || "",
            checkOut: e.checkOut || e.check_out || "",
            status: e.status || "Present",
            method: e.method || e.entryMethod || "Manual",
          })));
        } else {
          setEmployees([]);
        }
      } catch (err) {
        console.error("Error loading attendance", err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [date]);

  const handleCheckIn = async (employee) => {
    try {
      const res = await API.post("/attendance", {
        name: employee.name,
        role: employee.role,
        department: employee.department,
        date,
        checkIn: new Date().toLocaleTimeString("en-US", { hour12: false }),
        status: "Present",
        method: "Manual",
      });
      setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, checkIn: res.data?.checkIn || new Date().toLocaleTimeString(), status: "Present" } : e));
      alert(`${employee.name} checked in`);
    } catch (err) {
      console.error("Check-in error:", err);
      alert("Check-in failed");
    }
  };

  const handleCheckOut = async (employee) => {
    try {
      const res = await API.put(`/attendance/${employee.id}`, {
        checkOut: new Date().toLocaleTimeString("en-US", { hour12: false }),
      });
      setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, checkOut: res.data?.checkOut || new Date().toLocaleTimeString() } : e));
      alert(`${employee.name} checked out`);
    } catch (err) {
      console.error("Check-out error:", err);
      alert("Check-out failed");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesDepartment = department === "All Departments" || emp.department === department;
    const matchesRole = role === "All Roles" || emp.role === role;
    const matchesSearch = searchQuery === "" || (emp.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDepartment && matchesRole && matchesSearch;
  });

  const totalStaff = employees.length;
  const presentStaff = employees.filter((e) => e.status === "Present").length;
  const absentStaff = employees.filter((e) => e.status === "Absent").length;
  const lateStaff = employees.filter((e) => e.status === "Late").length;
  const onLeaveStaff = employees.filter((e) => e.status === "On Leave").length;

  const handleAddManualEntry = () => setShowManualEntryModal(true);

  const handleManualSubmit = async (data) => {
    try {
      const payload = { ...data, date };
      const res = await API.post("/attendance", payload);
      const newId = res.data?.id || Date.now();
      setEmployees((prev) => [
        { id: newId, name: data.employeeName, role: data.role, department: data.department, checkIn: data.checkIn, checkOut: data.checkOut, status: data.status, method: data.method },
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
    <div>
      <div className="simple-page-header"><h1 className="simple-page-title">Attendance Management</h1></div>

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

      {/* Summary Cards */}
      <div className="simple-metrics-grid">
        <SummaryCard label="Total Staff" value={totalStaff} />
        <SummaryCard label="Present" value={presentStaff} color="green" />
        <SummaryCard label="Absent" value={absentStaff} color="red" />
        <SummaryCard label="Late" value={lateStaff} color="yellow" />
        <SummaryCard label="On Leave" value={onLeaveStaff} color="blue" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-order">Loading...</div>
      ) : (
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
                <th>Method</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <AttendanceRow key={employee.id} employee={employee} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />
              ))}
              {filteredEmployees.length === 0 && (
                <tr><td colSpan="7" className="empty-order">No attendance records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showManualEntryModal} onClose={() => setShowManualEntryModal(false)} title="Add Manual Entry">
        <AttendanceForm onSubmit={handleManualSubmit} onCancel={() => setShowManualEntryModal(false)} />
      </Modal>
    </div>
  );
};

export default Attendance;