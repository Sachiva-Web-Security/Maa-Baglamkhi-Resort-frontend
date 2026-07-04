import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api";
import "./Dashboard.css";

const Kitchen = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection if not already present
    if (!global.socket) {
      // Get the base URL without /api suffix for socket.io connection
      const apiBase = API.defaults.baseURL || '';
      const socketUrl = apiBase.replace(/\/api\/?$/, '') || 'http://localhost:5002';
      global.socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });
    }

    const socket = global.socket;

    // Join kitchen room
    socket.emit("join-kitchen");

    // Connection status
    setSocketConnected(socket.connected);

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("KDS: Socket connected");
      socket.emit("join-kitchen");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      console.log("KDS: Socket disconnected");
    });

    // Handle new order created
    const handleOrderCreated = (data) => {
      console.log("KDS: New order created", data);
      setOrders(prev => [...prev, {
        id: data.id,
        waiter_name: data.waiter,
        table: data.table,
        items: [],
        status: "Pending",
        entityType: data.entityType,
        expectedReadyAt: data.expectedReadyAt,
        prepTimeMinutes: data.prepTimeMinutes,
        readyMessage: data.readyMessage,
      }]);
    };

    // Handle order updated (status change, prep time, etc.)
    const handleOrderUpdated = (data) => {
      console.log("KDS: Order updated", data);
      setOrders(prev => prev.map(o => {
        if (o.id === data.id) {
          return {
            ...o,
            status: data.status,
            readyMessage: data.readyMessage,
            prepTimeMinutes: data.prepTimeMinutes,
            expectedReadyAt: data.expectedReadyAt,
          };
        }
        return o;
      }));
    };

    // Handle order ready notification
    const handleOrderReady = (data) => {
      console.log("KDS: Order ready", data);
      setOrders(prev => prev.map(o => {
        if (o.id === data.id) {
          return { ...o, status: "Ready", readyMessage: data.readyMessage };
        }
        return o;
      }));
    };

    socket.on("kitchen-order-created", handleOrderCreated);
    socket.on("kitchen-order-updated", handleOrderUpdated);
    socket.on("kitchen-order-ready", handleOrderReady);

    // Initial fetch
    fetchOrders();

    // Cleanup
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("kitchen-order-created", handleOrderCreated);
      socket.off("kitchen-order-updated", handleOrderUpdated);
      socket.off("kitchen-order-ready", handleOrderReady);
    };
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
      // Socket will handle the update, but optimistic update for responsiveness
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Ready" } : o));
    } catch (err) {
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Ready" } : o));
    }
  };

  const markPreparing = async (id) => {
    try {
      await API.put(`/kitchen/orders/${id}`, { status: "Preparing" });
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Preparing" } : o));
    } catch (err) {
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Preparing" } : o));
    }
  };

  const markServed = async (id) => {
    try {
      await API.put(`/kitchen/orders/${id}`, { status: "Served" });
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Served" } : o));
    } catch (err) {
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Served" } : o));
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
          {socketConnected && (
            <span style={{ marginLeft: "8px", color: "#4CAF50", fontSize: "12px" }}>● Live</span>
          )}
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
              {orders
                .filter(o => o.status !== "Served" && o.status !== "Cancelled" && o.status !== "Saved")
                .map((o) => (
                <tr key={o.id}>
                  <td>{o.waiter_name}</td>
                  <td>{o.table || (o.entityType === "Room" ? "Room Service" : "-")}</td>
                  <td>
                    {o.items?.map((item, i) => (
                      <div key={i} style={{ marginBottom: "4px" }}>
                        {item.name} x {item.quantity}
                      </div>
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
                    {o.status === "Preparing" && (
                      <button
                        onClick={() => markReady(o.id)}
                        className="simple-btn simple-btn-success simple-btn-sm"
                      >
                        Mark Ready
                      </button>
                    )}
                    {o.status === "Ready" && (
                      <button
                        onClick={() => markServed(o.id)}
                        className="simple-btn simple-btn-secondary simple-btn-sm"
                      >
                        Mark Served
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.filter(o => o.status !== "Served" && o.status !== "Cancelled" && o.status !== "Saved").length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-order">No active orders - Print KOT from Restaurant POS</td>
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
