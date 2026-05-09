import React, { useEffect, useState } from "react";
import API from "../api";
import "./RoomService.css";

const RoomService = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newOrder, setNewOrder] = useState({ roomNumber: "", items: [], notes: "" });
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchMenu();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await API.get("/restaurant/orders?entityType=Room");
      setOrders(res.data || []);
    } catch (err) {
      console.error("Error fetching room service orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await API.get("/restaurant/menu");
      setMenuItems(res.data || []);
    } catch (err) {
      console.error("Error fetching menu:", err);
    }
  };

  const filtered = orders.filter(o => {
    if (filter === "All") return true;
    return o.status === filter;
  });

  const statusBadge = (status) => {
    const map = { Pending: "badge-orange", Preparing: "badge-blue", Ready: "badge-green", Delivered: "badge-gray", Cancelled: "badge-red" };
    return <span className={`simple-badge ${map[status] || "badge-gray"}`}>{status}</span>;
  };

  const handleMarkReady = async (id) => {
    try {
      await API.put(`/restaurant/order/${id}`, { status: "Ready" });
      fetchOrders();
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  const handleMarkDelivered = async (id) => {
    try {
      await API.put(`/restaurant/order/${id}`, { status: "Delivered" });
      fetchOrders();
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  const addItemToNewOrder = (item) => {
    const existing = newOrder.items.find(i => i.id === item.id);
    if (existing) {
      setNewOrder(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }));
    } else {
      setNewOrder(prev => ({
        ...prev,
        items: [...prev.items, { id: item.id, name: item.name, price: item.price || item.effectivePrice, quantity: 1 }]
      }));
    }
  };

  const removeItemFromNewOrder = (id) => {
    setNewOrder(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const submitNewOrder = async () => {
    if (!newOrder.roomNumber || newOrder.items.length === 0) {
      return alert("Room number and at least one item required");
    }
    try {
      await API.post("/restaurant/order/add", {
        tableNumber: newOrder.roomNumber,
        entityType: "Room",
        items: newOrder.items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
        notes: newOrder.notes,
        waiter: localStorage.getItem("name") || "Room Service",
      });
      setShowNewModal(false);
      setNewOrder({ roomNumber: "", items: [], notes: "" });
      fetchOrders();
      alert("Room service order created");
    } catch (err) {
      console.error("Error creating order:", err);
      alert("Failed to create order");
    }
  };

  return (
    <div className="rs-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Room Service</h1>
        <button className="simple-btn simple-btn-primary" onClick={() => setShowNewModal(true)}>+ New Order</button>
      </div>

      {/* Summary */}
      <div className="rs-summary-grid">
        <div className="simple-metric-tile tile-orange">
          <div className="simple-metric-tile-value">{orders.filter(o => o.status === "Pending").length}</div>
          <div className="simple-metric-tile-label">Pending</div>
        </div>
        <div className="simple-metric-tile tile-blue">
          <div className="simple-metric-tile-value">{orders.filter(o => o.status === "Preparing").length}</div>
          <div className="simple-metric-tile-label">Preparing</div>
        </div>
        <div className="simple-metric-tile tile-green">
          <div className="simple-metric-tile-value">{orders.filter(o => o.status === "Ready").length}</div>
          <div className="simple-metric-tile-label">Ready</div>
        </div>
        <div className="simple-metric-tile tile-purple">
          <div className="simple-metric-tile-value">{orders.filter(o => o.status === "Delivered").length}</div>
          <div className="simple-metric-tile-label">Delivered</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rs-filter-tabs">
        {["All", "Pending", "Preparing", "Ready", "Delivered"].map(f => (
          <button key={f} className={`rs-filter-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="simple-card">
        {loading ? (
          <div className="empty-order">Loading...</div>
        ) : (
          <div className="simple-table-wrapper">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Room</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td className="font-medium">#{o.id}</td>
                    <td>{o.tableNumber || o.table || o.roomNumber || "-"}</td>
                    <td>{Array.isArray(o.items) ? o.items.map(i => `${i.name} ×${i.quantity}`).join(", ") : "-"}</td>
                    <td>₹{Array.isArray(o.items) ? o.items.reduce((a, i) => a + (Number(i.price) * Number(i.quantity)), 0).toFixed(0) : 0}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td>{o.created_at ? new Date(o.created_at).toLocaleTimeString() : "-"}</td>
                    <td>
                      {o.status === "Pending" && (
                        <button className="simple-btn simple-btn-sm simple-btn-primary" onClick={() => handleMarkReady(o.id)}>Start</button>
                      )}
                      {o.status === "Preparing" && (
                        <button className="simple-btn simple-btn-sm simple-btn-success" onClick={() => handleMarkDelivered(o.id)}>Delivered</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="7" className="empty-order">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showNewModal && (
        <div className="rs-modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="rs-modal" onClick={e => e.stopPropagation()}>
            <h3 className="rs-modal-title">New Room Service Order</h3>

            <div className="simple-form-group" style={{ marginBottom: 12 }}>
              <label className="simple-label">Room Number *</label>
              <input className="simple-input" value={newOrder.roomNumber}
                onChange={e => setNewOrder(prev => ({ ...prev, roomNumber: e.target.value }))}
                placeholder="e.g. 101" />
            </div>

            <div className="rs-modal-items-label">Select Items</div>
            <div className="rs-modal-menu">
              {menuItems.slice(0, 15).map(item => (
                <button key={item.id} className="rs-modal-item" onClick={() => addItemToNewOrder(item)}>
                  <span>{item.name}</span>
                  <small>₹{item.price || item.effectivePrice}</small>
                </button>
              ))}
              {menuItems.length === 0 && <div className="empty-order">No menu items available</div>}
            </div>

            {newOrder.items.length > 0 && (
              <div className="rs-modal-cart">
                <div className="rs-modal-cart-title">Cart ({newOrder.items.length})</div>
                {newOrder.items.map(item => (
                  <div key={item.id} className="rs-modal-cart-row">
                    <span>{item.name}</span>
                    <span>×{item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(0)}</span>
                    <button onClick={() => removeItemFromNewOrder(item.id)} className="rs-remove-btn">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="simple-form-group" style={{ marginTop: 12 }}>
              <label className="simple-label">Notes</label>
              <textarea className="simple-textarea" value={newOrder.notes}
                onChange={e => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Special instructions..." />
            </div>

            <div className="simple-btn-row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
              <button className="simple-btn simple-btn-gray" onClick={() => setShowNewModal(false)}>Cancel</button>
              <button className="simple-btn simple-btn-primary" onClick={submitNewOrder}
                disabled={!newOrder.roomNumber || newOrder.items.length === 0}>
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomService;