import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Navbar from './components/Navbar/Navbar';

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

function Layout({ children, setIsAuthenticated }) {
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";

  return (
    <div className={`simple-layout ${isAdmin ? "simple-layout-admin" : ""}`}>
      <Navbar setIsAuthenticated={setIsAuthenticated} />
      <main className={`simple-main ${isAdmin ? "simple-main-admin" : ""}`}>
        {children}
      </main>
    </div>
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

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout setIsAuthenticated={setIsAuthenticated}><Dashboard /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout setIsAuthenticated={setIsAuthenticated}><Profile /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/attendance" element={
          <ProtectedRoute allowedRoles={["admin","manager","staff","waiter","receptionist"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Attendance /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/hotel" element={
          <ProtectedRoute allowedRoles={["admin","manager","receptionist"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Hotel /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/restaurant" element={
          <ProtectedRoute allowedRoles={["admin","manager","waiter","kitchen"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><RestaurantPOS /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/accounts" element={
          <ProtectedRoute allowedRoles={["admin","manager","accountant"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Accounts /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={["admin","manager","kitchen"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><InventoryDashboard /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/user" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><User /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/create-user" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><CreateUser /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/housekeeping" element={
          <ProtectedRoute allowedRoles={["admin","housekeeping","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Housekeeping /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/banquet" element={
          <ProtectedRoute allowedRoles={["admin","manager","receptionist"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Banquet /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={["admin","manager","accountant"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Reports /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/assignments" element={
          <ProtectedRoute allowedRoles={["admin","manager","housekeeping","staff"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Assignment /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/kitchen" element={
          <ProtectedRoute allowedRoles={["admin","manager","kitchen"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Kitchen /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/quick-sales" element={
          <ProtectedRoute allowedRoles={["admin","manager","waiter","receptionist"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><QuickSales /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/restaurant-settings" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><RestaurantSettings /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/room-service" element={
          <ProtectedRoute allowedRoles={["admin","manager","waiter"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><RoomService /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/table-groups" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><TableGroups /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/modifiers" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Modifiers /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/parcel-setting" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><ParcelSetting /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/bar-to-food" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><BarToFood /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/item-groups" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><ItemGroups /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/price-groups" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><PriceGroups /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/print-groups" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><PrintGroups /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/units" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Units /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/invoice-groups" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><InvoiceGroups /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/edit-invoice" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><EditInvoice /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/items" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><Items /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/manage-data" element={
          <ProtectedRoute allowedRoles={["admin","manager"]}>
            <Layout setIsAuthenticated={setIsAuthenticated}><ManageData /></Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
