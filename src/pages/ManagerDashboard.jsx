import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBed,
  FaBoxOpen,
  FaChartBar,
  FaClipboardList,
  FaMoneyBillWave,
  FaUsers,
} from "react-icons/fa";

import API from "../api";
import RoleDashboardShell from "../components/roleDashboards/RoleDashboardShell";
import useDashboardAutoRefresh from "../hooks/useDashboardAutoRefresh";

const formatINR = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState({});
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [banquets, setBanquets] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        API.get("/dashboard/metrics"),
        API.get("/hotel/all-bookings"),
        API.get("/inventory"),
        API.get("/banquet"),
        API.get("/attendance", { params: { date: todayISO() } }),
      ]);

      const [metricsRes, bookingsRes, inventoryRes, banquetRes, attendanceRes] = results;

      setMetrics(metricsRes.status === "fulfilled" ? metricsRes.value.data || {} : {});
      setBookings(bookingsRes.status === "fulfilled" ? bookingsRes.value.data || [] : []);
      setInventory(inventoryRes.status === "fulfilled" ? inventoryRes.value.data || [] : []);
      setBanquets(banquetRes.status === "fulfilled" ? banquetRes.value.data || [] : []);
      setAttendance(attendanceRes.status === "fulfilled" ? attendanceRes.value.data || [] : []);

      if (
        metricsRes.status !== "fulfilled" &&
        bookingsRes.status !== "fulfilled" &&
        inventoryRes.status !== "fulfilled"
      ) {
        setError("Manager dashboard data load nahi ho pa raha.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useDashboardAutoRefresh(load);

  const stats = useMemo(() => {
    const totalRooms = Number(metrics.totalRooms) || 0;
    const occupiedRooms = Number(metrics.occupiedRooms) || 0;
    const arrivals = bookings.filter((item) => String(item.checkIn || "").slice(0, 10) === todayISO()).length;
    const departures = bookings.filter((item) => String(item.checkOut || "").slice(0, 10) === todayISO()).length;
    const lowInventory = inventory.filter((item) => {
      const quantity = Number(item.quantity ?? item.stock ?? item.currentStock ?? 0);
      const threshold = Number(item.minStock ?? item.threshold ?? item.reorderLevel ?? 10);
      return quantity <= threshold;
    }).length;
    const presentStaff = attendance.filter((item) => String(item.status || "").toLowerCase() === "present").length;

    return [
      {
        label: "Hotel Occupancy",
        value: totalRooms ? `${Math.round((occupiedRooms / totalRooms) * 100)}%` : "0%",
        note: "Live room occupancy based on current room metrics.",
        icon: FaBed,
        tone: "cyan",
      },
      {
        label: "Today's Revenue",
        value: formatINR(metrics.todayRevenue),
        note: "Current day collection overview for hotel operations.",
        icon: FaMoneyBillWave,
        tone: "emerald",
      },
      {
        label: "Check-ins / Check-outs",
        value: `${arrivals} / ${departures}`,
        note: "Today's front office movement snapshot.",
        icon: FaClipboardList,
        tone: "amber",
      },
      {
        label: "Staff Present",
        value: presentStaff,
        note: "Today's attendance marked as present.",
        icon: FaUsers,
        tone: "violet",
      },
      {
        label: "Low Inventory Alerts",
        value: lowInventory,
        note: "Items near reorder threshold and needing attention.",
        icon: FaBoxOpen,
        tone: "rose",
      },
      {
        label: "Banquet Bookings",
        value: banquets.length,
        note: "Current banquet items available for review.",
        icon: FaChartBar,
        tone: "slate",
      },
    ];
  }, [attendance, banquets.length, bookings, inventory, metrics]);

  const insights = useMemo(() => {
    const pendingBookings = bookings.filter((item) =>
      String(item.bookingStatus || item.status || "").toLowerCase().includes("pending")
    ).length;

    return [
      {
        label: "Pending Booking Queue",
        value: pendingBookings,
        note: "Front desk follow-up ke liye pending confirmations.",
      },
      {
        label: "Available Rooms",
        value: Math.max((Number(metrics.totalRooms) || 0) - (Number(metrics.occupiedRooms) || 0), 0),
        note: "Immediate sellable room inventory overview.",
      },
      {
        label: "Today's Check-ins",
        value: Number(metrics.todayCheckins) || 0,
        note: "Quick glance for lobby and room readiness planning.",
      },
    ];
  }, [bookings, metrics]);

  const table = useMemo(() => ({
    eyebrow: "Manager Queue",
    title: "Recent booking movement",
    meta: `${bookings.length} visible records`,
    columns: [
      { key: "guestName", label: "Guest" },
      { key: "roomNumber", label: "Room" },
      { key: "checkIn", label: "Check In" },
      { key: "checkOut", label: "Check Out" },
      { key: "status", label: "Status", render: (row) => row.bookingStatus || row.status || "--" },
    ],
    rows: bookings.slice(0, 8).map((item, index) => ({
      id: item.id || item.bookingId || index,
      guestName: item.guestName || item.name || item.customerName || "Guest",
      roomNumber: item.roomNumber || item.roomNo || "--",
      checkIn: item.checkIn || "--",
      checkOut: item.checkOut || "--",
      status: item.bookingStatus || item.status || "--",
    })),
    emptyText: "No booking records available for manager dashboard.",
  }), [bookings]);

  return (
    <RoleDashboardShell
      badge="Manager Command Center"
      title="Manager dashboard built for daily oversight"
      description="Occupancy, revenue, staff movement, banquet activity aur inventory alerts ko ek focused operational screen par dekhiye."
      stats={stats}
      quickActions={[
        { label: "Open Reports", helper: "Revenue aur trend reports review karein.", route: "/reports", icon: FaChartBar, tone: "emerald" },
        { label: "All Bookings", helper: "Front office pipeline aur arrivals manage karein.", route: "/hotel/all-bookings", icon: FaClipboardList, tone: "cyan" },
        { label: "Inventory Alerts", helper: "Low stock items ko immediately review karein.", route: "/inventory", icon: FaBoxOpen, tone: "amber" },
        { label: "Banquet Board", helper: "Upcoming banquet load aur hall planning dekhein.", route: "/banquet", icon: FaUsers, tone: "violet" },
      ]}
      insights={insights}
      table={table}
      loading={loading}
      error={error}
    />
  );
};

export default ManagerDashboard;
