import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';

import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Hotel from './pages/Hotel';
import RestaurantPOS from './pages/RestaurantPOS';
import Accounts from './pages/Accounts';
import Housekeeping from './pages/Housekeeping';
import Banquet from './pages/Banquet';
import Reports from './pages/Reports';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import InventoryDashboard from './components/Inventory/InventoryDashboard';
import Profile from "./pages/Profile";
import User from './pages/User';
import CreateUser from "./components/Createuser/CreateUser";
import Assignment from './pages/Assignments';
import Kitchen from './pages/Kitchen';
import { RestaurantProvider } from "./Context/RestaurantContext";

import TablePage from "./components/Restaurant/TablePage";
import MenuPage from "./components/Restaurant/MenuPage";
import Payment from "./components/Restaurant/Payment";


/* ============================
   Layout Component
============================ */
function Layout({ children, setIsAuthenticated }) {
  return (
    <div className='flex bg-slate-900 min-h-screen'>

      <Header setIsAuthenticated={setIsAuthenticated} />
      <Sidebar />

      {/* ✅ FIXED: pl- removed and proper padding added */}
      <div className="ml-[250px] mt-[70px] p-4 w-full">
        {children}
      </div>

    </div>
  );
}


/* ============================
   Main App Component
============================ */
function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(authStatus);
    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>

        {/* ================= LOGIN ================= */}
        <Route
          path="/login"
          element={<Login setIsAuthenticated={setIsAuthenticated} />}
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
            <ProtectedRoute allowedRoles={["admin", "manager", "waiter", "kitchen"]}>
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
            <ProtectedRoute allowedRoles={["admin", "manager", "housekeeping", "staff"]}>
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