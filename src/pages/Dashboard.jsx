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
    expectedArrivals: 0,
    expectedCheckouts: 0,
    totalRevenueGenerated: 0,
  });
  const [chartData, setChartData] = useState({
    monthlyRevenue: [],
    roomOccupancy: [],
    foodSales: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (location.state?.loginSuccess) {
      toast.success("Login Successful", { position: "top-center", autoClose: 2000 });
    }
  }, [location]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [metricsRes, chartsRes] = await Promise.all([
          API.get("/dashboard/metrics"),
          API.get("/dashboard/charts"),
        ]);
        setMetrics((prev) => ({ ...prev, ...metricsRes.data }));
        setChartData({
          monthlyRevenue: chartsRes.data?.monthlyRevenue || [],
          roomOccupancy: chartsRes.data?.roomOccupancy || [],
          foodSales: chartsRes.data?.foodSales || [],
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const tiles = [
    { label: "Total Rooms", value: metrics.totalRooms, cls: "tile-blue", route: "/hotel" },
    { label: "Occupied Rooms", value: metrics.occupiedRooms, cls: "tile-red", route: "/hotel" },
    { label: "Available Rooms", value: metrics.availableRooms || (metrics.totalRooms - metrics.occupiedRooms), cls: "tile-green", route: "/hotel" },
    { label: "Today's Check-ins", value: metrics.todayCheckins, cls: "tile-orange", route: "/hotel" },
    { label: "Today's Checkouts", value: metrics.todayCheckouts || 0, cls: "tile-teal", route: "/hotel" },
    { label: "Expected Arrivals", value: metrics.expectedArrivals || 0, cls: "tile-blue", route: "/hotel" },
    { label: "Expected Checkouts", value: metrics.expectedCheckouts || 0, cls: "tile-red", route: "/hotel" },
    { label: "Today's Revenue", value: `₹${(metrics.todayRevenue || 0).toLocaleString()}`, cls: "tile-purple", route: "/accounts" },
    { label: "Total Revenue", value: `₹${(metrics.totalRevenueGenerated || 0).toLocaleString()}`, cls: "tile-green", route: "/accounts" },
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
      {isLoading && <div className="simple-text-muted simple-mb">Loading live dashboard data...</div>}

      {/* Metric Tiles */}
      <div className="simple-metrics-grid simple-metrics-grid-admin">
        {tiles.map((t, i) => (
          <div
            key={i}
            className={`simple-metric-tile simple-metric-tile-admin ${t.cls}`}
            onClick={() => navigate(t.route)}
          >
            <div className="simple-metric-tile-value">{t.value}</div>
            <div className="simple-metric-tile-label">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="simple-dashboard-chart-grid">
        <div className="simple-card">
          <div className="simple-card-title">Monthly Revenue</div>
          <MonthlyRevenueChart data={chartData.monthlyRevenue} />
        </div>
        <div className="simple-card">
          <div className="simple-card-title">Room Occupancy</div>
          <RoomOccupancyChart data={chartData.roomOccupancy} />
        </div>
        <div className="simple-card">
          <div className="simple-card-title">Food Sales</div>
          <FoodSalesChart data={chartData.foodSales} />
        </div>
      </div>

      {/* Module Quick Access */}
      <div className="simple-card">
        <div className="simple-card-title">Quick Access</div>
        <div className="simple-dashboard-modules-grid">
          {modules.map((m) => (
            <div
              key={m.path}
              onClick={() => navigate(m.path)}
              className="simple-dashboard-module-card"
            >
              <div className="simple-dashboard-module-name">{m.name}</div>
              <div className="simple-dashboard-module-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
