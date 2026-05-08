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

  const sampleEmployees = [
    { id: 1, name: "Rahul Sharma", role: "Receptionist", department: "Reception", checkIn: "09:02", checkOut: "18:05", status: "Present", method: "Biometric" },
    { id: 2, name: "Priya Singh", role: "Housekeeper", department: "Housekeeping", checkIn: "08:55", checkOut: "17:00", status: "Present", method: "Manual" },
    { id: 3, name: "Anil Kumar", role: "Chef", department: "Kitchen", checkIn: "07:30", checkOut: "16:30", status: "Present", method: "Biometric" },
    { id: 4, name: "Sunita Devi", role: "Waiter", department: "Restaurant", checkIn: "10:15", checkOut: "", status: "Late", method: "Manual" },
    { id: 5, name: "Vikram Patel", role: "Manager", department: "Reception", checkIn: "", checkOut: "", status: "Absent", method: "—" },
    { id: 6, name: "Meena Joshi", role: "Accountant", department: "Accounts", checkIn: "09:00", checkOut: "18:00", status: "Present", method: "Biometric" },
    { id: 7, name: "Raju Verma", role: "Security", department: "Security", checkIn: "", checkOut: "", status: "On Leave", method: "—" },
    { id: 8, name: "Kavita Rao", role: "Cook", department: "Kitchen", checkIn: "07:45", checkOut: "16:45", status: "Present", method: "Biometric" },
  ];

  const [employees, setEmployees] = useState(sampleEmployees);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await API.get("/attendance", { params: { date } });
        if (res.data && res.data.length > 0) setEmployees(res.data);
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-6">
        <SummaryCard label="Total Staff" value={totalStaff} />
        <SummaryCard label="Present" value={presentStaff} color="green" />
        <SummaryCard label="Absent" value={absentStaff} color="red" />
        <SummaryCard label="Late" value={lateStaff} color="yellow" />
        <SummaryCard label="On Leave" value={onLeaveStaff} color="blue" />
      </div>

      {/* Table */}
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
              <AttendanceRow key={employee.id} employee={employee} />
            ))}
            {filteredEmployees.length === 0 && (
              <tr><td colSpan="7" className="p-4 text-center text-gray-400">No attendance records found</td></tr>
            )}
          </tbody>
        </table>
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