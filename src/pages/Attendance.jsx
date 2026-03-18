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

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesDepartment =
          department === "All Departments" ||
          employee.department === department;

        const matchesRole = role === "All Roles" || employee.role === role;

        const matchesSearch =
          searchQuery === "" ||
          (employee.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        return matchesDepartment && matchesRole && matchesSearch;
      }),
    [department, employees, role, searchQuery]
  );

  const totalStaff = employees.length;
  const presentStaff = employees.filter((e) => e.status === "Present").length;
  const absentStaff = employees.filter((e) => e.status === "Absent").length;
  const lateStaff = employees.filter((e) => e.status === "Late").length;
  const onLeaveStaff = employees.filter((e) => e.status === "On Leave").length;

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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1260px] space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Workforce Snapshot
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  Attendance management made cleaner
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                  Staff presence, late arrivals aur leave activity ko ek
                  dashboard-style responsive workspace se track karein.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualEntry(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5"
              >
                <FaUserPlus className="text-cyan-600" />
                Add Manual Entry
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: "Attendance Date", value: date },
                { label: "Visible Staff", value: filteredEmployees.length },
                { label: "Present Today", value: presentStaff },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Total Staff" value={totalStaff} icon={FaUsers} />
          <SummaryCard
            label="Present"
            value={presentStaff}
            color="green"
            icon={FaUserCheck}
          />
          <SummaryCard
            label="Absent"
            value={absentStaff}
            color="red"
            icon={FaClipboardCheck}
          />
          <SummaryCard label="Late" value={lateStaff} color="yellow" icon={FaClock} />
          <SummaryCard
            label="On Leave"
            value={onLeaveStaff}
            color="blue"
            icon={FaCalendarAlt}
          />
        </section>

        <section className="hidden rounded-[26px] border border-white/60 bg-white/82 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Employee</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                  <th className="px-5 py-4 font-semibold">Check In</th>
                  <th className="px-5 py-4 font-semibold">Check Out</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Method</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <AttendanceRow key={employee.id} employee={employee} />
                ))}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12">
                      <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                        No attendance records found.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:hidden">
          {filteredEmployees.length ? (
            filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className="rounded-[24px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-slate-900">
                      {employee.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {employee.role || "Role not set"}
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {employee.method || "Manual"}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div>Check In: {employee.checkIn || "--"}</div>
                  <div>Check Out: {employee.checkOut || "--"}</div>
                  <div>Status: {employee.status || "--"}</div>
                  <div>Department: {employee.department || "--"}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-white/60 bg-white/82 px-4 py-10 text-center text-sm font-semibold text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              No attendance records found.
            </div>
          )}
        </section>

        {showManualEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className=" w-full  max-w-xl rounded-[30px] border border-white/50 bg-[linear-gradient(180deg,#fafdff_0%,#f8fbff_100%)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                    Manual Entry
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">
                    Add attendance record
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualEntry(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>

              <AttendanceForm
                onSubmit={handleManualSubmit}
                onCancel={() => setShowManualEntry(false)}
                initialData={{ date }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
