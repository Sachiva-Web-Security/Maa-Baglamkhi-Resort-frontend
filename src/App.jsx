import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

import { RestaurantProvider } from "./Context/RestaurantContext.jsx";
import Header from "./components/Header/Header";
import InventoryDashboard from "./components/Inventory/InventoryDashboard";
import InventoryMastersModulePage from "./pages/InventoryMastersModulePage";
import MenuRecipeModulePage from "./pages/MenuRecipeModulePage";
import ProtectedRoute from "./components/ProtectedRoute";
import AddMenuItemPage from "./components/Restaurant/AddMenuItemPage";
import EditToken from "./components/Restaurant/EditToken";
import MenuPage from "./components/Restaurant/MenuPage";
import Payment from "./components/Restaurant/Payment";
import PaymentBills from "./components/Restaurant/PaymentBills";
import PayNowPage from "./components/Restaurant/PayNowPage";
import Roomitem from "./components/Restaurant/Roomitem";
import TablePage from "./components/Restaurant/TablePage";
import TokenItemsPage from "./components/Restaurant/TokenItempage";
import TokenPage from "./components/Restaurant/TokenPage";
import Sidebar from "./components/Sidebar/Sidebar";
import RoleHomeRedirect from "./components/RoleHomeRedirect";
import Stayover from "./components/Dashboard/Stayover";
import Accounts from "./pages/Accounts";
import AccountsDashboard from "./pages/AccountsDashboard";
import Assignment from "./pages/Assignments";
import Attendance from "./pages/Attendance";
import Banquet from "./pages/Banquet";
import CustomerInvoicePage from "./pages/CustomerInvoicePage";
import Dashboard from "./pages/Dashboard";
import Hotel from "./pages/Hotel";
import Housekeeping from "./pages/Housekeeping";
import HousekeepingDashboard from "./pages/HousekeepingDashboard";
import Kitchen from "./pages/Kitchen";
import KitchenDashboard from "./pages/KitchenDashboard";
import Login from "./pages/Login";
import ManagerDashboard from "./pages/ManagerDashboard";
import Profile from "./pages/Profile";
import ReceptionDashboard from "./pages/ReceptionDashboard";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import RestaurantPOS from "./pages/RestaurantPOS";
import StaffDashboard from "./pages/StaffDashboard";
import User from "./pages/User";
import AuditReport from "./pages/reports/AuditReport";
import CollectionReport from "./pages/reports/CollectionReport";
import DaywiseCollection from "./pages/reports/DaywiseCollection";
import IncomeExpenditure from "./pages/reports/IncomeExpenditure";
import SalesReport from "./pages/reports/SalesReport";

const ROLES = {
  ALL: ["admin", "manager", "receptionist", "waiter", "kitchen", "housekeeping", "accountant", "staff"],
  ADMIN_ONLY: ["admin"],
  HOTEL: ["admin", "manager", "receptionist", "staff"],
  RESTAURANT: ["admin", "manager", "waiter", "kitchen", "staff", "receptionist"],
  KITCHEN: ["admin", "manager", "kitchen"],
  ACCOUNTS: ["admin", "manager", "accountant"],
  INVENTORY: ["admin", "manager", "kitchen", "receptionist"],
  HOUSEKEEPING: ["admin", "manager", "housekeeping"],
  BANQUET: ["admin", "manager", "receptionist"],
  REPORTS: ["admin", "manager", "accountant"],
  AUDIT: ["admin", "manager", "accountant"],
  ASSIGNMENTS: ["admin", "manager", "receptionist", "housekeeping", "accountant", "staff"],
};

function Layout({ children, setIsAuthenticated }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isMobile ? 0 : sidebarOpen ? 250 : 88;

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
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      <Sidebar
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <div
        className="flex min-h-screen flex-col transition-all duration-300"
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
          width: isMobile ? "100%" : `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <Header setIsAuthenticated={setIsAuthenticated} />
        <div className="flex-1 overflow-y-auto pt-[70px]">
          <div className="p-3 sm:p-4 lg:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token")),
  );

  const protect = (element, roles) => (
    <ProtectedRoute allowedRoles={roles}>
      <Layout setIsAuthenticated={setIsAuthenticated}>{element}</Layout>
    </ProtectedRoute>
  );

  return (
    <Router>
      <div className="desktop-scale-shell">
        <div className="desktop-scale-content">
          <Routes>
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <RoleHomeRedirect />
                ) : (
                  <Login setIsAuthenticated={setIsAuthenticated} />
                )
              }
            />
            <Route
              path="/register"
              element={isAuthenticated ? <RoleHomeRedirect /> : <Register />}
            />
            <Route path="/" element={<RoleHomeRedirect />} />

            <Route path="/dashboard" element={protect(<Dashboard />, ["admin"])} />
            <Route path="/manager-dashboard" element={protect(<ManagerDashboard />, ["manager"])} />
            <Route
              path="/reception-dashboard"
              element={protect(<ReceptionDashboard />, ["receptionist"])}
            />
            <Route
              path="/housekeeping-dashboard"
              element={protect(<HousekeepingDashboard />, ["housekeeping"])}
            />
            <Route
              path="/accounts-dashboard"
              element={protect(<AccountsDashboard />, ["accountant"])}
            />
            <Route path="/kitchen-dashboard" element={protect(<KitchenDashboard />, ["kitchen"])} />
            <Route
              path="/restaurant-dashboard"
              element={protect(<RestaurantDashboard />, ["waiter"])}
            />
            <Route path="/staff-dashboard" element={protect(<StaffDashboard />, ["staff"])} />
            <Route path="/stayover" element={protect(<Stayover />, ["admin", "manager"])} />

            <Route path="/profile" element={protect(<Profile />, ROLES.ALL)} />
            <Route path="/attendance" element={protect(<Attendance />, ROLES.ALL)} />
            <Route path="/hotel/*" element={protect(<Hotel />, ROLES.HOTEL)} />
            <Route path="/accounts" element={protect(<Accounts />, ROLES.ACCOUNTS)} />
            <Route path="/inventory" element={protect(<InventoryDashboard />, ROLES.INVENTORY)} />
            <Route path="/inventory/masters" element={protect(<InventoryMastersModulePage />, ROLES.INVENTORY)} />
            <Route path="/inventory/recipes" element={protect(<MenuRecipeModulePage />, ROLES.INVENTORY)} />
            <Route path="/housekeeping" element={protect(<Housekeeping />, ROLES.HOUSEKEEPING)} />
            <Route path="/banquet" element={protect(<Banquet />, ROLES.BANQUET)} />
            <Route path="/reports" element={protect(<Reports />, ROLES.REPORTS)} />
            <Route path="/assignments" element={protect(<Assignment />, ROLES.ASSIGNMENTS)} />
            <Route path="/kitchen" element={protect(<Kitchen />, ROLES.KITCHEN)} />
            <Route path="/user" element={protect(<User />, ROLES.ADMIN_ONLY)} />
            <Route path="/invoice/:customerId" element={protect(<CustomerInvoicePage />, ROLES.ALL)} />

            <Route path="/reports/sales" element={protect(<SalesReport />, ROLES.REPORTS)} />
            <Route
              path="/reports/income-exp"
              element={protect(<IncomeExpenditure />, ROLES.REPORTS)}
            />
            <Route path="/reports/daywise" element={protect(<DaywiseCollection />, ROLES.REPORTS)} />
            <Route
              path="/reports/collection"
              element={protect(<CollectionReport />, ROLES.REPORTS)}
            />
            <Route path="/reports/audit" element={protect(<AuditReport />, ROLES.AUDIT)} />

            <Route
              path="/restaurant/*"
              element={
                <ProtectedRoute allowedRoles={ROLES.RESTAURANT}>
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
              <Route path="pay-now/:table" element={<PayNowPage />} />
              <Route path="payment-bills" element={<PaymentBills />} />
              <Route path="token-items/:table" element={<TokenItemsPage />} />
              <Route path="room-items" element={<Roomitem />} />
              <Route path="add-menu-item" element={<AddMenuItemPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
