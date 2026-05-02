import { useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import API from "../api";
import MonthlyRevenueChart from "../components/Dashboard/Charts/MonthlyRevenueChart";
import RoomOccupancyChart from "../components/Dashboard/Charts/RoomOccupancyChart";
import FoodSalesChart from "../components/Dashboard/Charts/FoodSalesChart";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [metrics, setMetrics] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    todayRevenue: 0,
    todayCheckins: 0,
    availableRooms: 0,
    todayCheckouts: 0,
  });

  useEffect(() => {
    if (location.state?.loginSuccess) {
      toast.success("Login Successful", { position: "top-center", autoClose: 2000 });
    }
  }, [location]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await API.get("/dashboard/metrics");
        setMetrics((prev) => ({ ...prev, ...res.data }));
      } catch (err) {
        console.error("Error fetching dashboard metrics:", err);
      }
    };
    fetchMetrics();
  }, []);

  const tiles = [
    { label: "Total Rooms", value: metrics.totalRooms, cls: "tile-blue", route: "/hotel" },
    { label: "Occupied Rooms", value: metrics.occupiedRooms, cls: "tile-red", route: "/hotel" },
    { label: "Available Rooms", value: metrics.availableRooms || (metrics.totalRooms - metrics.occupiedRooms), cls: "tile-green", route: "/hotel" },
    { label: "Today's Check-ins", value: metrics.todayCheckins, cls: "tile-orange", route: "/hotel" },
    { label: "Today's Checkouts", value: metrics.todayCheckouts || 0, cls: "tile-teal", route: "/hotel" },
    { label: "Today's Revenue", value: `₹${(metrics.todayRevenue || 0).toLocaleString()}`, cls: "tile-purple", route: "/accounts" },
  ];

  const role = (localStorage.getItem("role") || "").toLowerCase();
  const modules = [
    { name: "Hotel / PMS", desc: "Room reservations, check-in/out", path: "/hotel", roles: ["admin","manager","receptionist"] },
    { name: "Restaurant POS", desc: "Table orders and billing", path: "/restaurant", roles: ["admin","manager","waiter","kitchen"] },
    { name: "Kitchen", desc: "KOT and kitchen display", path: "/kitchen", roles: ["admin","manager","kitchen"] },
    { name: "Banquet", desc: "Hall bookings and events", path: "/banquet", roles: ["admin","manager","receptionist"] },
    { name: "Housekeeping", desc: "Room cleaning and status", path: "/housekeeping", roles: ["admin","manager","housekeeping"] },
    { name: "Accounts", desc: "Revenue and payments", path: "/accounts", roles: ["admin","manager","accountant"] },
    { name: "Inventory", desc: "Stock and purchases", path: "/inventory", roles: ["admin","manager","kitchen"] },
    { name: "Reports", desc: "Analytics and exports", path: "/reports", roles: ["admin","manager","accountant"] },
  ].filter(m => role === "admin" || m.roles.includes(role));

  return (
    <div>
      <ToastContainer />

      {/* Page Title */}
      <div className="simple-page-header">
        <h1 className="simple-page-title">Dashboard</h1>
        <span className="simple-text-muted">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      {/* Metric Tiles */}
      <div className="simple-metrics-grid">
        {tiles.map((t, i) => (
          <div
            key={i}
            className={`simple-metric-tile ${t.cls}`}
            onClick={() => navigate(t.route)}
          >
            <div className="simple-metric-tile-value">{t.value}</div>
            <div className="simple-metric-tile-label">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "20px" }}>
        <div className="simple-card" style={{ gridColumn: "span 1" }}>
          <div className="simple-card-title">Monthly Revenue</div>
          <MonthlyRevenueChart />
        </div>
        <div className="simple-card">
          <div className="simple-card-title">Room Occupancy</div>
          <RoomOccupancyChart />
        </div>
        <div className="simple-card">
          <div className="simple-card-title">Food Sales</div>
          <FoodSalesChart />
        </div>
      </div>

      {/* Module Quick Access */}
      <div className="simple-card">
        <div className="simple-card-title">Quick Access</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
          {modules.map((m) => (
            <div
              key={m.path}
              onClick={() => navigate(m.path)}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: "6px",
                padding: "14px",
                cursor: "pointer",
                background: "#fafafa",
                transition: "background .15s, box-shadow .15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#e3f0ff"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(21,101,192,.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1565c0", marginBottom: 4 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
