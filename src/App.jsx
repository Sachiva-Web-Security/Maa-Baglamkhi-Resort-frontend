import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState } from "react";

import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";

import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Hotel from "./pages/Hotel";
import RestaurantPOS from "./pages/RestaurantPOS";
import Accounts from "./pages/Accounts";
import Housekeeping from "./pages/Housekeeping";
import Banquet from "./pages/Banquet";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import InventoryDashboard from "./components/Inventory/InventoryDashboard";
import Profile from "./pages/Profile";
import User from "./pages/User";
import CreateUser from "./components/Createuser/CreateUser";
import Assignment from "./pages/Assignments";
import Kitchen from "./pages/Kitchen";
import { RestaurantProvider } from "./Context/RestaurantContext";

import TablePage from "./components/Restaurant/TablePage";
import MenuPage from "./components/Restaurant/MenuPage";
import Payment from "./components/Restaurant/Payment";

/* ============================
   Layout Component
============================ */
function Layout({ children, setIsAuthenticated }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-slate-900 min-h-screen overflow-hidden w-screen">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex flex-col overflow-hidden h-screen md:ml-[250px]">
        {/* Header */}
        <Header
          setIsAuthenticated={setIsAuthenticated}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden mt-[70px] w-full">
          <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}


/* ============================
   Main App Component
============================ */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Prefer token as source of truth
    return Boolean(localStorage.getItem("token"));
  });

  return (
    <Router>
      <Routes>
        {/* ================= LOGIN ================= */}
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
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Register />
            )
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ================= DASHBOARD ================= */}
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

        {/* ================= PROFILE ================= */}
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

        {/* ================= ATTENDANCE ================= */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
                "manager",
                "staff",
                "waiter",
                "receptionist",
              ]}
            >
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Attendance />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= HOTEL ================= */}
        <Route
          path="/hotel"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "receptionist"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Hotel />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= ACCOUNTS ================= */}
        <Route
          path="/accounts"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "accountant"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Accounts />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= RESTAURANT POS (Nested Routing) ================= */}
        <Route
          path="/restaurant"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "manager", "waiter", "kitchen"]}
            >
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <RestaurantProvider>
                  <RestaurantPOS />
                </RestaurantProvider>
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route index element={<TablePage />} />
          <Route path="menu/:id" element={<MenuPage />} />
          <Route path="payment" element={<Payment />} />
        </Route>

        {/* ================= INVENTORY ================= */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "kitchen"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <InventoryDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= USER ================= */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <User />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-user"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <CreateUser />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= HOUSEKEEPING ================= */}
        <Route
          path="/housekeeping"
          element={
            <ProtectedRoute allowedRoles={["admin", "housekeeping", "manager"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Housekeeping />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= BANQUET ================= */}
        <Route
          path="/banquet"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "receptionist"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Banquet />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= REPORTS ================= */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "accountant"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= ASSIGNMENTS ================= */}
        <Route
          path="/assignments"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "manager", "housekeeping", "staff"]}
            >
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Assignment />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= KITCHEN ================= */}
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "kitchen"]}>
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Kitchen />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
