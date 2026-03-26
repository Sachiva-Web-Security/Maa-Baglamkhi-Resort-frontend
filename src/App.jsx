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
import PaymentBills from "./components/Restaurant/PaymentBills";
import TokenPage from "./components/Restaurant/TokenPage";
import EditToken from "./components/Restaurant/EditToken";
import TokenItemsPage from "./components/Restaurant/TokenItempage";
import Roomitem from "./components/Restaurant/Roomitem";

/* ================= RESTAURANT REPORTS ================= */
import DailyfoodReport from "./components/Restaurant/DailyfoodReport";
import Daywisefood from "./components/Restaurant/Daywisefood";
import AddMenuItemPage from "./components/Restaurant/AddMenuItemPage";
import Stayover from "./components/Dashboard/Stayover";

/* ================= ACCOUNT REPORTS ================= */
import SalesReport from "./pages/reports/SalesReport";
import IncomeExpenditure from "./pages/reports/IncomeExpenditure";
import DaywiseCollection from "./pages/reports/DaywiseCollection";
import CollectionReport from "./pages/reports/CollectionReport";
import AuditReport from "./pages/reports/AuditReport";

/* ================= CONTEXT ================= */
import { RestaurantProvider } from "./Context/RestaurantContext";

// ─── Role Sets ────────────────────────────────────────────────────────────────
// Define once here — easy to update in one place
const ROLES = {
  ALL: ["admin", "manager", "receptionist", "waiter", "kitchen", "housekeeping", "accountant", "staff"],
  ADMIN_ONLY: ["admin"],
  ADMIN_MANAGER: ["admin", "manager", "staff"],
  AUDIT: ["admin", "manager"],
  HOTEL: ["admin", "manager", "receptionist", "staff"],
  RESTAURANT: ["admin", "manager", "waiter", "kitchen", "staff"],
  KITCHEN: ["admin", "manager", "kitchen", "staff"],
  ACCOUNTS: ["admin", "manager", "accountant"],
  INVENTORY: ["admin", "manager", "kitchen", "staff"],
  HOUSEKEEPING: ["admin", "manager", "housekeeping", "staff"],
  BANQUET: ["admin", "manager", "receptionist", "staff"],
  REPORTS: ["admin", "manager", "accountant"],
  ASSIGNMENTS: ["admin", "manager", "housekeeping", "staff"],
};

/* ================= LAYOUT ================= */
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

/* ================= MAIN APP ================= */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );

  // Helper: wrap a page in Layout + ProtectedRoute together
  const protect = (element, roles) => (
    <ProtectedRoute allowedRoles={roles}>
      <Layout setIsAuthenticated={setIsAuthenticated}>
        {element}
      </Layout>
    </ProtectedRoute>
  );

  return (
    <Router>
      <Routes>

        {/* ── AUTH ──────────────────────────────────────── */}
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to="/dashboard" replace />
              : <Login setIsAuthenticated={setIsAuthenticated} />
          }
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── DASHBOARD — all authenticated roles ───────── */}
        <Route
          path="/dashboard"
          element={protect(<Dashboard />, ROLES.ALL)}
        />
        <Route
          path="/stayover"
          element={protect(<Stayover />, ROLES.ALL)}
        />

        {/* ── PROFILE — all authenticated roles ─────────── */}
        <Route
          path="/profile"
          element={protect(<Profile />, ROLES.ALL)}
        />

        {/* ── HOTEL ─────────────────────────────────────── */}
        <Route
          path="/hotel/*"
          element={protect(<Hotel />, ROLES.HOTEL)}
        />

        {/* ── RESTAURANT ────────────────────────────────── */}
        <Route
          path="/restaurant"
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
          <Route path="payment-bills" element={<PaymentBills />} />
          <Route path="token-items/:table" element={<TokenItemsPage />} />
          <Route path="room-items" element={<Roomitem />} />
          <Route path="add-menu-item" element={<AddMenuItemPage />} />
          <Route path="daily-room-food" element={<DailyfoodReport />} />
          <Route path="daywise-food" element={<Daywisefood />} />
        </Route>

        {/* ── KITCHEN ───────────────────────────────────── */}
        <Route
          path="/kitchen"
          element={protect(<Kitchen />, ROLES.KITCHEN)}
        />

        {/* ── ACCOUNTS ──────────────────────────────────── */}
        <Route
          path="/accounts"
          element={protect(<Accounts />, ROLES.ACCOUNTS)}
        />

        {/* ── INVENTORY ─────────────────────────────────── */}
        <Route
          path="/inventory"
          element={protect(<InventoryDashboard />, ROLES.INVENTORY)}
        />

        {/* ── HOUSEKEEPING ──────────────────────────────── */}
        <Route
          path="/housekeeping"
          element={protect(<Housekeeping />, ROLES.HOUSEKEEPING)}
        />

        {/* ── BANQUET ───────────────────────────────────── */}
        <Route
          path="/banquet"
          element={protect(<Banquet />, ROLES.BANQUET)}
        />

        {/* ── REPORTS ───────────────────────────────────── */}
        <Route
          path="/reports"
          element={protect(<Reports />, ROLES.REPORTS)}
        />

        {/* ── ACCOUNT SUB-REPORTS ───────────────────────── */}
        <Route path="/reports/sales"       element={protect(<SalesReport />,       ROLES.REPORTS)} />
        <Route path="/reports/income-exp"  element={protect(<IncomeExpenditure />, ROLES.REPORTS)} />
        <Route path="/reports/daywise"     element={protect(<DaywiseCollection />, ROLES.REPORTS)} />
        <Route path="/reports/collection"  element={protect(<CollectionReport />,  ROLES.REPORTS)} />
        <Route path="/reports/audit"       element={protect(<AuditReport />,       ROLES.AUDIT)} />

        {/* ── ATTENDANCE — all roles ─────────────────────── */}
        <Route
          path="/attendance"
          element={protect(<Attendance />, ROLES.ALL)}
        />

        {/* ── ASSIGNMENTS ───────────────────────────────── */}
        <Route
          path="/assignments"
          element={protect(<Assignment />, ROLES.ASSIGNMENTS)}
        />

        {/* ── USER MANAGEMENT — admin only ──────────────── */}
        <Route
          path="/user"
          element={protect(<User />, ROLES.ADMIN_ONLY)}
        />

        {/* ── CATCH-ALL: redirect unknown paths to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </Router>
  );
}

export default App;
