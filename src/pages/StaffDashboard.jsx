import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaIdBadge,
  FaTasks,
  FaUserCheck,
} from "react-icons/fa";

import API from "../api";
import RoleDashboardShell from "../components/roleDashboards/RoleDashboardShell";

const todayISO = () => new Date().toISOString().slice(0, 10);

const StaffDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const name = localStorage.getItem("name");
        const role = localStorage.getItem("role");

        const results = await Promise.allSettled([
          API.get("/attendance", { params: { date: todayISO() } }),
          API.get(`/assignments?role=${role}&name=${encodeURIComponent(name || "")}`),
        ]);

        if (!mounted) return;

        const [attendanceRes, assignmentRes] = results;
        setAttendance(attendanceRes.status === "fulfilled" ? attendanceRes.value.data || [] : []);
        setAssignments(assignmentRes.status === "fulfilled" ? assignmentRes.value.data || [] : []);

        if (attendanceRes.status !== "fulfilled" && assignmentRes.status !== "fulfilled") {
          setError("Staff dashboard data load nahi ho pa raha.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const currentUserName = localStorage.getItem("name") || "Staff";
  const myAttendance = attendance.find(
    (item) => String(item.name || "").toLowerCase() === currentUserName.toLowerCase()
  );

  const stats = useMemo(() => [
    {
      label: "Attendance Summary",
      value: myAttendance?.status || "Not Marked",
      note: "Today's personal attendance status.",
      icon: FaUserCheck,
      tone: "cyan",
    },
    {
      label: "Assigned Work",
      value: assignments.length,
      note: "Tasks currently mapped to this staff account.",
      icon: FaTasks,
      tone: "emerald",
    },
    {
      label: "Announcements",
      value: 3,
      note: "Operational updates and reminders visible today.",
      icon: FaBell,
      tone: "amber",
    },
    {
      label: "Profile Shortcut",
      value: "Ready",
      note: "Profile and user details are one click away.",
      icon: FaIdBadge,
      tone: "violet",
    },
  ], [assignments.length, myAttendance?.status]);

  const insights = useMemo(() => [
    {
      label: "Check-In Time",
      value: myAttendance?.checkIn || "--",
      note: "Today's recorded check-in timing.",
    },
    {
      label: "Check-Out Time",
      value: myAttendance?.checkOut || "--",
      note: "Today's current check-out value, if available.",
    },
    {
      label: "Pending Tasks",
      value: assignments.filter((item) => String(item.status || "").toLowerCase() !== "completed").length,
      note: "Assignments still waiting to be completed.",
    },
  ], [assignments, myAttendance?.checkIn, myAttendance?.checkOut]);

  const table = useMemo(() => ({
    eyebrow: "My Workboard",
    title: "Assigned tasks",
    meta: `${assignments.length} tasks`,
    columns: [
      { key: "room_number", label: "Room" },
      { key: "task", label: "Task" },
      { key: "status", label: "Status" },
      { key: "assigned_by", label: "Assigned By" },
    ],
    rows: assignments.slice(0, 8),
    emptyText: "No tasks assigned to this staff account.",
  }), [assignments]);

  return (
    <RoleDashboardShell
      badge="Staff Workspace"
      title="Staff dashboard for personal daily workflow"
      description="Attendance, assigned work, reminders aur profile access ko staff-focused layout mein organize kiya gaya hai."
      stats={stats}
      quickActions={[
        { label: "My Attendance", helper: "Attendance panel kholkar current records dekhein.", route: "/attendance", icon: FaUserCheck, tone: "cyan" },
        { label: "My Assignments", helper: "Assigned tasks aur completion flow manage karein.", route: "/assignments", icon: FaTasks, tone: "emerald" },
        { label: "My Profile", helper: "Personal profile aur account details open karein.", route: "/profile", icon: FaIdBadge, tone: "violet" },
        { label: "Announcements", helper: "Daily updates ke liye dashboard snapshot review karein.", route: "/attendance", icon: FaBell, tone: "amber" },
      ]}
      insights={insights}
      table={table}
      loading={loading}
      error={error}
    />
  );
};

export default StaffDashboard;
