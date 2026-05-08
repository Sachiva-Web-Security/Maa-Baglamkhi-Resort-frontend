import React, { useEffect, useState } from "react";
import API from "../api";

const Kitchen = () => {
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
      <div className="simple-page-header">
        <h2 className="simple-page-title">Kitchen Orders</h2>
        <p className="text-sm text-gray-500">Manage restaurant food orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
        <div className="text-center p-4 text-gray-400">Loading orders...</div>
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
                  <td className="font-medium">{o.waiter_name}</td>
                  <td>{o.table}</td>
                  <td>
                    {o.items?.map((item, i) => (
                      <div key={i} className="text-sm">{item.name} x {item.quantity}</div>
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
                  <td colSpan="5" className="text-center p-4 text-gray-400">No orders yet - Print KOT from Restaurant POS</td>
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
