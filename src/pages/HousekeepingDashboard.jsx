import { useEffect, useMemo, useState } from "react";
import {
  FaBroom,
  FaCheckCircle,
  FaClipboardList,
  FaTasks,
} from "react-icons/fa";

import RoleDashboardShell from "../components/roleDashboards/RoleDashboardShell";
import { housekeepingService } from "../services/housekeepingService";

const floorFromRoom = (roomNo) => {
  const match = String(roomNo || "").match(/^(\d)/);
  return match ? `Floor ${match[1]}` : "Ground / Other";
};

const HousekeepingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await housekeepingService.getAllRooms();
        if (mounted) {
          setRooms(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (mounted) {
          setError("Housekeeping dashboard data load nahi ho pa raha.");
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

  const stats = useMemo(() => {
    const dirty = rooms.filter((room) => String(room.status || "").toLowerCase().includes("dirty")).length;
    const clean = rooms.filter((room) => String(room.status || "").toLowerCase().includes("clean")).length;
    const inCleaning = rooms.filter((room) => String(room.status || "").toLowerCase().includes("progress")).length;
    const assigned = rooms.filter((room) => {
      const assignee = String(room.assignee || "");
      return assignee && assignee.toLowerCase() !== "no housekeeper";
    }).length;

    return [
      { label: "Dirty Rooms", value: dirty, note: "Immediate cleaning attention needed.", icon: FaBroom, tone: "rose" },
      { label: "Cleaned Rooms", value: clean, note: "Rooms currently marked ready.", icon: FaCheckCircle, tone: "emerald" },
      { label: "In Cleaning", value: inCleaning, note: "Tasks currently in progress.", icon: FaTasks, tone: "amber" },
      { label: "Assigned Rooms", value: assigned, note: "Rooms already mapped to a housekeeper.", icon: FaClipboardList, tone: "cyan" },
    ];
  }, [rooms]);

  const insights = useMemo(() => {
    const floorMap = new Map();
    rooms.forEach((room) => {
      const floor = floorFromRoom(room.roomNo || room.roomNumber);
      floorMap.set(floor, (floorMap.get(floor) || 0) + 1);
    });

    return Array.from(floorMap.entries()).slice(0, 3).map(([label, value]) => ({
      label,
      value,
      note: "Rooms currently mapped on this floor.",
    }));
  }, [rooms]);

  const table = useMemo(() => ({
    eyebrow: "Room Status Board",
    title: "Floor-wise room list",
    meta: `${rooms.length} rooms`,
    columns: [
      { key: "roomNo", label: "Room" },
      { key: "floor", label: "Floor" },
      { key: "status", label: "Status" },
      { key: "assignee", label: "Assignee" },
    ],
    rows: rooms.slice(0, 12).map((room, index) => ({
      id: room.id || index,
      roomNo: room.roomNo || room.roomNumber || "--",
      floor: floorFromRoom(room.roomNo || room.roomNumber),
      status: room.status || "--",
      assignee: room.assignee || "No Housekeeper",
    })),
    emptyText: "No housekeeping rooms available.",
  }), [rooms]);

  return (
    <RoleDashboardShell
      badge="Housekeeping Control"
      title="Housekeeping dashboard for room readiness"
      description="Dirty, cleaned, in-progress aur assigned rooms ka live cleaning view ek dedicated dashboard mein."
      stats={stats}
      quickActions={[
        { label: "Open Housekeeping", helper: "Full cleaning workflow aur room updates manage karein.", route: "/housekeeping", icon: FaBroom, tone: "cyan" },
        { label: "Open Assignments", helper: "Assigned tasks aur completion status review karein.", route: "/assignments", icon: FaTasks, tone: "emerald" },
        { label: "Room Status Board", helper: "Current room condition ko quickly inspect karein.", route: "/housekeeping", icon: FaClipboardList, tone: "amber" },
        { label: "My Profile", helper: "User profile aur session details dekhein.", route: "/profile", icon: FaCheckCircle, tone: "violet" },
      ]}
      insights={insights}
      table={table}
      loading={loading}
      error={error}
    />
  );
};

export default HousekeepingDashboard;
