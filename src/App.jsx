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

        <Route path="/dashboard" element={
          <FlexibleRoute element={<Dashboard />} allowedRoles={["admin","manager","receptionist","staff","waiter","kitchen","housekeeping","accountant"]} />
        } />

        <Route path="/profile" element={
          <FlexibleRoute element={<Profile />} allowedRoles={["admin","manager","receptionist","staff","waiter","kitchen","housekeeping","accountant"]} />
        } />

        <Route path="/attendance" element={
          <UserRoute element={<Attendance />} allowedRoles={["admin","manager","staff","waiter","receptionist"]} />
        } />

        <Route path="/hotel" element={
          <FlexibleRoute element={<Hotel />} allowedRoles={["admin","manager","receptionist"]} />
        } />

        <Route path="/restaurant" element={
          <UserRoute element={<RestaurantPOS />} allowedRoles={["admin","manager","waiter","kitchen"]} />
        } />

        <Route path="/accounts" element={
          <FlexibleRoute element={<Accounts />} allowedRoles={["admin","manager","accountant"]} />
        } />

        <Route path="/inventory" element={
          <FlexibleRoute element={<InventoryDashboard />} allowedRoles={["admin","manager","kitchen"]} />
        } />

        <Route path="/user" element={<AdminRoute element={<User />} />} />
        <Route path="/create-user" element={<AdminRoute element={<CreateUser />} />} />

        <Route path="/housekeeping" element={
          <UserRoute element={<Housekeeping />} allowedRoles={["admin","housekeeping","manager"]} />
        } />

        <Route path="/banquet" element={
          <FlexibleRoute element={<Banquet />} allowedRoles={["admin","manager","receptionist"]} />
        } />

        <Route path="/reports" element={
          <FlexibleRoute element={<Reports />} allowedRoles={["admin","manager","accountant"]} />
        } />

        <Route path="/assignments" element={
          <UserRoute element={<Assignment />} allowedRoles={["admin","manager","housekeeping","staff"]} />
        } />

        <Route path="/kitchen" element={
          <UserRoute element={<Kitchen />} allowedRoles={["admin","manager","kitchen"]} />
        } />

        <Route path="/quick-sales" element={
          <UserRoute element={<QuickSales />} allowedRoles={["admin","manager","waiter","receptionist"]} />
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
