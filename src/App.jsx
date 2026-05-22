import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Navbar from './components/Layout/UserNavbar';
import AdminLayout from './components/Layout/AdminLayout';

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
import QuickSales from './pages/QuickSales';
import RestaurantSettings from './pages/RestaurantSettings';
import RoomService from './pages/RoomService';
import TableGroups from './pages/TableGroups';
import Modifiers from './pages/Modifiers';
import ParcelSetting from './pages/ParcelSetting';
import BarToFood from './pages/BarToFood';
import ItemGroups from './pages/ItemGroups';
import PriceGroups from './pages/PriceGroups';
import PrintGroups from './pages/PrintGroups';
import Units from './pages/Units';
import InvoiceGroups from './pages/InvoiceGroups';
import EditInvoice from './pages/EditInvoice';
import Items from './pages/Items';
import ManageData from './pages/ManageData';
import AdminHome from './pages/AdminHome';
import FinancialYear from './pages/manage/FinancialYear';
import IDCards from './pages/manage/IDCards';
import TaxCategory from './pages/manage/TaxCategory';
import TaxSetting from './pages/manage/TaxSetting';
import ManageUsers from './pages/manage/Users';
import PaymentModes from './pages/manage/PaymentModes';
import ManageGuests from './pages/manage/Guests';
import Employees from './pages/manage/Employees';
import Terminals from './pages/manage/Terminals';
import PrinterLocations from './pages/manage/PrinterLocations';
import Branches from './pages/manage/Branches';
import MailConfiguration from './pages/manage/MailConfiguration';
import AccessRules from './pages/manage/AccessRules';
import PrepaidCards from './pages/manage/PrepaidCards';
import DiscountCoupons from './pages/manage/DiscountCoupons';
import RoomType from './pages/front-office/RoomType';
import FORooms from './pages/front-office/Rooms';
import FOServices from './pages/front-office/Services';
import FOCompanies from './pages/front-office/Companies';
import FrontOfficeSettings from './pages/front-office/FrontOfficeSettings';
import FBTables from './pages/fnb/Tables';
import FBCaptains from './pages/fnb/Captains';
import FBInvoices from './pages/fnb/Invoices';
import OwnerSmsSettings from './pages/fnb/OwnerSmsSettings';

// Layout for non-admin users (using horizontal navbar)
function UserLayout({ children, setIsAuthenticated }) {
  return (
    <div className="simple-layout">
      <Navbar setIsAuthenticated={setIsAuthenticated} />
      <main className="simple-main">
        {children}
      </main>
    </div>
  );
}

// Layout for pages that have their own nav (like RestaurantPOS)
function BareLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {children}
    </div>
  );
}

// Layout for admin users (using sidebar)
function AdminLayoutWrapper({ setIsAuthenticated, children }) {
  return (
    <AdminLayout setIsAuthenticated={setIsAuthenticated}>
      {children}
    </AdminLayout>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(authStatus);
    setLoading(false);
  }, []);

  if (loading) return <div className="simple-loading">Loading...</div>;

  // Helper to create route with admin layout
  const AdminRoute = ({ element }) => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminLayoutWrapper setIsAuthenticated={setIsAuthenticated}>
        {element}
      </AdminLayoutWrapper>
    </ProtectedRoute>
  );

  // Helper to create route with user layout (navbar)
  const UserRoute = ({ element, allowedRoles }) => (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <UserLayout setIsAuthenticated={setIsAuthenticated}>
        {element}
      </UserLayout>
    </ProtectedRoute>
  );

  // Helper for routes that can be both admin and user
  const FlexibleRoute = ({ element, allowedRoles }) => {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const isAdmin = role === "admin";

    if (isAdmin) {
      return (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminLayoutWrapper setIsAuthenticated={setIsAuthenticated}>
            {element}
          </AdminLayoutWrapper>
        </ProtectedRoute>
      );
    }

    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <UserLayout setIsAuthenticated={setIsAuthenticated}>
          {element}
        </UserLayout>
      </ProtectedRoute>
    );
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        // Dashboard has its own UrbanPOS navigation - no wrapper
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/profile" element={
          <FlexibleRoute element={<Profile />} allowedRoles={["admin","manager","receptionist","staff","waiter","kitchen","housekeeping","accountant"]} />
        } />

        <Route path="/attendance" element={
          <UserRoute element={<Attendance />} allowedRoles={["admin","manager","staff","waiter","receptionist"]} />
        } />

        <Route path="/hotel" element={
          <ProtectedRoute allowedRoles={["admin","manager","receptionist"]}>
            <BareLayout>
              <Hotel />
            </BareLayout>
          </ProtectedRoute>
        } />

        <Route path="/restaurant" element={
          <ProtectedRoute allowedRoles={["admin","manager","waiter","kitchen"]}>
            <BareLayout>
              <RestaurantPOS />
            </BareLayout>
          </ProtectedRoute>
        } />

        <Route path="/accounts" element={
          <FlexibleRoute element={<Accounts />} allowedRoles={["admin","manager","accountant"]} />
        } />

        <Route path="/inventory" element={
          <FlexibleRoute element={<InventoryDashboard />} allowedRoles={["admin","manager","kitchen"]} />
        } />

        <Route path="/admin" element={<AdminRoute element={<AdminHome />} />} />
        <Route path="/manage/financial-year" element={<AdminRoute element={<FinancialYear />} />} />
        <Route path="/manage/id-cards" element={<AdminRoute element={<IDCards />} />} />
        <Route path="/manage/tax-category" element={<AdminRoute element={<TaxCategory />} />} />
        <Route path="/manage/tax-setting" element={<AdminRoute element={<TaxSetting />} />} />
        <Route path="/manage/users" element={<AdminRoute element={<ManageUsers />} />} />
        <Route path="/manage/payment-modes" element={<AdminRoute element={<PaymentModes />} />} />
        <Route path="/manage/guests" element={<AdminRoute element={<ManageGuests />} />} />
        <Route path="/manage/employees" element={<AdminRoute element={<Employees />} />} />
        <Route path="/manage/terminals" element={<AdminRoute element={<Terminals />} />} />
        <Route path="/manage/printer-locations" element={<AdminRoute element={<PrinterLocations />} />} />
        <Route path="/manage/branches" element={<AdminRoute element={<Branches />} />} />
        <Route path="/manage/mail-configuration" element={<AdminRoute element={<MailConfiguration />} />} />
        <Route path="/manage/access-rules" element={<AdminRoute element={<AccessRules />} />} />
        <Route path="/manage/prepaid-cards" element={<AdminRoute element={<PrepaidCards />} />} />
        <Route path="/manage/discount-coupons" element={<AdminRoute element={<DiscountCoupons />} />} />
        <Route path="/front-office/room-type" element={<AdminRoute element={<RoomType />} />} />
        <Route path="/front-office/rooms" element={<AdminRoute element={<FORooms />} />} />
        <Route path="/front-office/services" element={<AdminRoute element={<FOServices />} />} />
        <Route path="/front-office/companies" element={<AdminRoute element={<FOCompanies />} />} />
        <Route path="/front-office/settings" element={<AdminRoute element={<FrontOfficeSettings />} />} />
        <Route path="/fnb/tables" element={<AdminRoute element={<FBTables />} />} />
        <Route path="/fnb/captains" element={<AdminRoute element={<FBCaptains />} />} />
        <Route path="/fnb/invoices" element={<AdminRoute element={<FBInvoices />} />} />
        <Route path="/fnb/owner-sms-settings" element={<AdminRoute element={<OwnerSmsSettings />} />} />
        <Route path="/user" element={<AdminRoute element={<User />} />} />
        <Route path="/create-user" element={<AdminRoute element={<CreateUser />} />} />

        <Route path="/housekeeping" element={
          <UserRoute element={<Housekeeping />} allowedRoles={["admin","housekeeping","manager"]} />
        } />

        <Route path="/banquet" element={
          <ProtectedRoute allowedRoles={["admin","manager","receptionist"]}>
            <BareLayout>
              <Banquet />
            </BareLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <FlexibleRoute element={<Reports />} allowedRoles={["admin","manager","accountant"]} />
        } />

        <Route path="/assignments" element={
          <UserRoute element={<Assignment />} allowedRoles={["admin","manager","housekeeping","staff"]} />
        } />

        <Route path="/kitchen" element={
          <ProtectedRoute allowedRoles={["admin","manager","kitchen"]}>
            <BareLayout>
              <Kitchen />
            </BareLayout>
          </ProtectedRoute>
        } />

        <Route path="/quick-sales" element={
          <ProtectedRoute allowedRoles={["admin","manager","waiter","receptionist"]}>
            <BareLayout>
              <QuickSales />
            </BareLayout>
          </ProtectedRoute>
        } />

        <Route path="/restaurant-settings" element={<AdminRoute element={<RestaurantSettings />} />} />
        <Route path="/room-service" element={<AdminRoute element={<RoomService />} />} />
        <Route path="/table-groups" element={<AdminRoute element={<TableGroups />} />} />
        <Route path="/modifiers" element={<AdminRoute element={<Modifiers />} />} />
        <Route path="/parcel-setting" element={<AdminRoute element={<ParcelSetting />} />} />
        <Route path="/bar-to-food" element={<AdminRoute element={<BarToFood />} />} />
        <Route path="/item-groups" element={<AdminRoute element={<ItemGroups />} />} />
        <Route path="/price-groups" element={<AdminRoute element={<PriceGroups />} />} />
        <Route path="/print-groups" element={<AdminRoute element={<PrintGroups />} />} />
        <Route path="/units" element={<AdminRoute element={<Units />} />} />
        <Route path="/invoice-groups" element={<AdminRoute element={<InvoiceGroups />} />} />
        <Route path="/edit-invoice" element={<AdminRoute element={<EditInvoice />} />} />
        <Route path="/items" element={<AdminRoute element={<Items />} />} />
        <Route path="/manage-data" element={<AdminRoute element={<ManageData />} />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
