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

function Layout({ children, setIsAuthenticated }) {
  return (
    <div className="simple-layout">
      <Navbar setIsAuthenticated={setIsAuthenticated} />
      <main className="simple-main">
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
      </Routes>
    </Router>
  );
}

export default App;
