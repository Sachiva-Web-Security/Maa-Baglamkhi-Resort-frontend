import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import DailyfoodReport from "./components/Restaurant/DailyfoodReport";
import Daywisefood from "./components/Restaurant/Daywisefood";
import SettlementReport from "./components/Restaurant/SettlementReport";
import ItemConsumption from "./components/Restaurant/ItemConsumption";
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";
import TokenItemsPage from "./components/Restaurant/TokenItempage";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Hotel from "./pages/Hotel";
import RestaurantPOS from "./pages/RestaurantPOS";
import Accounts from "./pages/Accounts";
import Housekeeping from "./pages/Housekeeping";
import Banquet from "./pages/Banquet";
import Reports from "./pages/Reports";




/* ADD THESE */
import SalesReport from "./pages/reports/SalesReport";
import IncomeExpenditure from "./pages/reports/IncomeExpenditure";
import DaywiseCollection from "./pages/reports/DaywiseCollection";
import CollectionReport from "./pages/reports/CollectionReport";
import AuditReport from "./pages/reports/AuditReport";





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
import TokenPage from "./components/Restaurant/TokenPage";
import EditToken from "./components/Restaurant/EditToken";
/* ============================
   Layout Component
============================ */
function Layout({ children, setIsAuthenticated }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = sidebarOpen ? 250 : 88;

  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth < 768;
      setIsMobile(mobileView);
      setSidebarOpen((current) => {
        if (mobileView) {
          return false;
        }

        return current;
      });
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className=" bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef6f7_38%,#f8fafc_100%)] min-h-screen overflow-hidden w-screen">
      {/* Sidebar */}
      <Sidebar
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div
        className="flex flex-col overflow-hidden h-screen transition-[margin,width] duration-300 ease-in-out"
        style={{
          marginLeft: `${sidebarWidth}px`,
          width: `calc(100vw - ${sidebarWidth}px)`,
        }}
      >
        {/* Header */}
        <Header setIsAuthenticated={setIsAuthenticated} />

        <div className="flex-1 overflow-y-auto overflow-x-hidden mt-[70px] w-full min-w-0">
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
  path="/hotel/*"
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



{/* ================= ACCOUNTS REPORTS ================= */}

<Route
  path="/accounts/audit-report"
  element={
    <ProtectedRoute allowedRoles={["admin","manager","accountant"]}>
      <Layout setIsAuthenticated={setIsAuthenticated}>
        <AuditReport />
      </Layout>
    </ProtectedRoute>
  }
/>

<Route
  path="/accounts/income-expenditure"
  element={
    <ProtectedRoute allowedRoles={["admin","manager","accountant"]}>
      <Layout setIsAuthenticated={setIsAuthenticated}>
        <IncomeExpenditure />
      </Layout>
    </ProtectedRoute>
  }
/>

<Route
  path="/accounts/sales-report"
  element={
    <ProtectedRoute allowedRoles={["admin","manager","accountant"]}>
      <Layout setIsAuthenticated={setIsAuthenticated}>
        <SalesReport />
      </Layout>
    </ProtectedRoute>
  }
/>

<Route
  path="/accounts/collection-report"
  element={
    <ProtectedRoute allowedRoles={["admin","manager","accountant"]}>
      <Layout setIsAuthenticated={setIsAuthenticated}>
        <CollectionReport />
      </Layout>
    </ProtectedRoute>
  }
/>

<Route
  path="/accounts/daywise-collection"
  element={
    <ProtectedRoute allowedRoles={["admin","manager","accountant"]}>
      <Layout setIsAuthenticated={setIsAuthenticated}>
        <DaywiseCollection />
      </Layout>
    </ProtectedRoute>
  }
/>






        {/* ================= RESTAURANT POS (Nested Routing) ================= */}
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

{/* ===== REPORT ROUTES ===== */}

<Route path="daily-room-food" element={<DailyfoodReport />} />

<Route path="daywise-food" element={<Daywisefood />} />

<Route path="transfer-token" element={<SettlementReport />} />

<Route path="item-consumption" element={<ItemConsumption />} />

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
