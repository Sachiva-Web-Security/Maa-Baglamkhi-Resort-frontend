import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Dashboard.css";

const Kitchen = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await API.get("/kitchen/orders");
      if (res.data) {
        setOrders(res.data);
      }
      setLoading(false);
    } catch (err) {
      console.log("Error fetching kitchen orders:", err);
      setLoading(false);
    }
  };

  const markReady = async (id) => {
    try {
      await API.put(`/kitchen/orders/${id}`, { status: "Ready" });
      fetchOrders();
    } catch (err) {
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Ready" } : o));
    }
  };

  const markPreparing = async (id) => {
    try {
      await API.put(`/kitchen/orders/${id}`, { status: "Preparing" });
      fetchOrders();
    } catch (err) {
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Preparing" } : o));
    }
  };

  return (
    <div>
      {/* Top Navigation Bar */}
      <div className="maab-nav" style={{ marginBottom: 0 }}>
        <div className="maab-nav-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <div className="maab-logo">Q</div>
          <span className="maab-brand-name">Maa Baglamukhi</span>
        </div>
        <div className="maab-nav-tabs">
          <div className="maab-nav-tab" onClick={() => navigate('/dashboard')}>Dashboard</div>
          <div className="maab-nav-tab" onClick={() => navigate('/restaurant')}>New Order</div>
          <div className="maab-nav-tab green">KDS</div>
          <div className="maab-nav-tab" onClick={() => navigate('/reports')}>Daily Transaction</div>
        </div>
        <div className="maab-nav-user">
          <span>{localStorage.getItem("userName") || localStorage.getItem("name") || "User"}</span>
          <span className="maab-nav-arrow" onClick={() => {
            if (confirm("Logout?")) {
              localStorage.clear();
              navigate("/login");
            }
          }}>🚪</span>
        </div>
      </div>

      <div className="simple-page-header" style={{ padding: '12px 16px', marginTop: 0 }}>
        <h2 className="simple-page-title">Kitchen Display System (KDS)</h2>
        <p className="simple-text-muted">Manage restaurant food orders</p>
      </div>

      {/* Stats */}
      <div className="simple-metrics-grid">
        <div className="simple-metric-tile tile-orange">
          <div className="simple-metric-tile-label">Pending</div>
          <div className="simple-metric-tile-value">{orders.filter(o => o.status === "Pending").length}</div>
        </div>
        <div className="simple-metric-tile tile-blue">
          <div className="simple-metric-tile-label">Preparing</div>
          <div className="simple-metric-tile-value">{orders.filter(o => o.status === "Preparing").length}</div>
        </div>
        <div className="simple-metric-tile tile-green">
          <div className="simple-metric-tile-label">Ready</div>
          <div className="simple-metric-tile-value">{orders.filter(o => o.status === "Ready").length}</div>
        </div>
      </div>

      {loading ? (
        <div className="empty-order">Loading orders...</div>
      ) : (
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Waiter</th>
                <th>Table</th>
                <th>Items</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.waiter_name}</td>
                  <td>{o.table}</td>
                  <td>
                    {o.items?.map((item, i) => (
                      <div key={i}>{item.name} x {item.quantity}</div>
                    ))}
                  </td>
                  <td>
                    <span className={`simple-badge ${
                      o.status === "Ready" ? "badge-green" :
                      o.status === "Preparing" ? "badge-blue" : "badge-orange"
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    {o.status === "Pending" && (
                      <button
                        onClick={() => markPreparing(o.id)}
                        className="simple-btn simple-btn-primary simple-btn-sm"
                        style={{ marginRight: "5px" }}
                      >
                        Start Preparing
                      </button>
                    )}
                    {o.status !== "Ready" && (
                      <button
                        onClick={() => markReady(o.id)}
                        className="simple-btn simple-btn-success simple-btn-sm"
                      >
                        Mark Ready
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-order">No orders yet - Print KOT from Restaurant POS</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Kitchen;
