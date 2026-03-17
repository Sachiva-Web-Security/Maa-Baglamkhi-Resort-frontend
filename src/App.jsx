import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";

/* ================= COMPONENTS ================= */
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";
import ProtectedRoute from "./components/ProtectedRoute";

/* ================= PAGES ================= */
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Accounts from "./pages/Accounts";
import Housekeeping from "./pages/Housekeeping";
import Banquet from "./pages/Banquet";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import User from "./pages/User";
import Assignment from "./pages/Assignments";
import Kitchen from "./pages/Kitchen";
import Hotel from "./pages/Hotel";

/* ================= AUTH ================= */
import Login from "./pages/Login";
import Register from "./pages/Register";

/* ================= INVENTORY ================= */
import InventoryDashboard from "./components/Inventory/InventoryDashboard";

/* ================= RESTAURANT ================= */
import RestaurantPOS from "./pages/RestaurantPOS";
import TablePage from "./components/Restaurant/TablePage";
import MenuPage from "./components/Restaurant/MenuPage";
import Payment from "./components/Restaurant/Payment";
import TokenPage from "./components/Restaurant/TokenPage";
import EditToken from "./components/Restaurant/EditToken";
import TokenItemsPage from "./components/Restaurant/TokenItempage";
import Roomitem from "./components/Restaurant/Roomitem";

/* ================= REPORTS ================= */
import DailyfoodReport from "./components/Restaurant/DailyfoodReport";
import Daywisefood from "./components/Restaurant/Daywisefood";
import SettlementReport from "./components/Restaurant/SettlementReport";
import ItemConsumption from "./components/Restaurant/ItemConsumption";

/* ================= ACCOUNT REPORTS ================= */
import SalesReport from "./pages/reports/SalesReport";
import IncomeExpenditure from "./pages/reports/IncomeExpenditure";
import DaywiseCollection from "./pages/reports/DaywiseCollection";
import CollectionReport from "./pages/reports/CollectionReport";
import AuditReport from "./pages/reports/AuditReport";

/* ================= CONTEXT ================= */
import { RestaurantProvider } from "./Context/RestaurantContext";

/* ================= LAYOUT ================= */
function Layout({ children, setIsAuthenticated }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = sidebarOpen ? 250 : 88;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef6f7_38%,#f8fafc_100%)]">
      <Sidebar
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div
        className="flex flex-col h-screen transition-all duration-300"
        style={{
          marginLeft: sidebarWidth,
          width: `calc(100vw - ${sidebarWidth}px)`,
        }}
      >
        <Header setIsAuthenticated={setIsAuthenticated} />

        <div className="flex-1 overflow-y-auto mt-[70px]">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN APP ================= */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );

  return (
    <Router>
      <Routes>

        {/* AUTH */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login setIsAuthenticated={setIsAuthenticated} />
            )
          }
        />

        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* PROFILE */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ATTENDANCE */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute allowedRoles={["admin","manager","staff","waiter","receptionist"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Attendance />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* HOTEL */}
        <Route
          path="/hotel/*"
          element={
            <ProtectedRoute allowedRoles={["admin","manager","receptionist"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Hotel />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ACCOUNTS */}
        <Route
          path="/accounts"
          element={
            <ProtectedRoute allowedRoles={["admin","manager","accountant"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Accounts />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ACCOUNT REPORTS */}
        <Route path="/accounts/audit-report" element={<Layout setIsAuthenticated={setIsAuthenticated}><AuditReport /></Layout>} />
        <Route path="/accounts/income-expenditure" element={<Layout setIsAuthenticated={setIsAuthenticated}><IncomeExpenditure /></Layout>} />
        <Route path="/accounts/sales-report" element={<Layout setIsAuthenticated={setIsAuthenticated}><SalesReport /></Layout>} />
        <Route path="/accounts/collection-report" element={<Layout setIsAuthenticated={setIsAuthenticated}><CollectionReport /></Layout>} />
        <Route path="/accounts/daywise-collection" element={<Layout setIsAuthenticated={setIsAuthenticated}><DaywiseCollection /></Layout>} />

        {/* RESTAURANT */}
        <Route
          path="/restaurant"
          element={
            <ProtectedRoute allowedRoles={["admin","manager","waiter","kitchen"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <RestaurantProvider>
                  <RestaurantPOS />
                </RestaurantProvider>
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route index element={<TablePage />} />
          <Route path="token/:table" element={<TokenPage />} />
          <Route path="menu/:table" element={<MenuPage />} />
          <Route path="edit-token/:table" element={<EditToken />} />
          <Route path="payment" element={<Payment />} />
          <Route path="token-items/:table" element={<TokenItemsPage />} />
          <Route path="room-items" element={<Roomitem />} />
          <Route path="daily-room-food" element={<DailyfoodReport />} />
          <Route path="daywise-food" element={<Daywisefood />} />
          <Route path="transfer-token" element={<SettlementReport />} />
          <Route path="item-consumption" element={<ItemConsumption />} />
        </Route>

        {/* INVENTORY */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["admin","manager","kitchen"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <InventoryDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* USER */}
        <Route path="/user" element={<Layout setIsAuthenticated={setIsAuthenticated}><User /></Layout>} />

        {/* HOUSEKEEPING */}
        <Route path="/housekeeping" element={<Layout setIsAuthenticated={setIsAuthenticated}><Housekeeping /></Layout>} />

        {/* BANQUET */}
        <Route path="/banquet" element={<Layout setIsAuthenticated={setIsAuthenticated}><Banquet /></Layout>} />

        {/* REPORTS */}
        <Route path="/reports" element={<Layout setIsAuthenticated={setIsAuthenticated}><Reports /></Layout>} />

        {/* ASSIGNMENTS */}
        <Route path="/assignments" element={<Layout setIsAuthenticated={setIsAuthenticated}><Assignment /></Layout>} />

        {/* KITCHEN */}
        <Route path="/kitchen" element={<Layout setIsAuthenticated={setIsAuthenticated}><Kitchen /></Layout>} />

      </Routes>
    </Router>
  );
}

export default App;