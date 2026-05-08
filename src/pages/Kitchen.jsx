import React, { useEffect, useState } from "react";
import API from "../api";

const sampleOrders = [
  { id: 1, waiter_name: "Sunita Devi", table_number: "T-3", items: [{ name: "Paneer Butter Masala", quantity: 2 }, { name: "Naan", quantity: 4 }], status: "Pending" },
  { id: 2, waiter_name: "Ramesh Gupta", table_number: "T-7", items: [{ name: "Dal Tadka", quantity: 1 }, { name: "Jeera Rice", quantity: 2 }], status: "Preparing" },
  { id: 3, waiter_name: "Anita Sharma", table_number: "T-1", items: [{ name: "Veg Biryani", quantity: 3 }], status: "Ready" },
  { id: 4, waiter_name: "Suresh Kumar", table_number: "T-5", items: [{ name: "Chicken Tikka", quantity: 2 }, { name: "Butter Roti", quantity: 6 }], status: "Pending" },
  { id: 5, waiter_name: "Kavita Rao", table_number: "T-9", items: [{ name: "Mango Lassi", quantity: 2 }, { name: "Gulab Jamun", quantity: 4 }], status: "Preparing" },
];

const Kitchen = () => {
  const [orders, setOrders] = useState(sampleOrders);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await API.get("/kitchen/orders");
      if (res.data && res.data.length > 0) setOrders(res.data);
    } catch (err) {
      console.log(err);
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
                <td>{o.table_number}</td>
                <td>
                  {o.items?.map((item, i) => (
                    <div key={i} className="text-sm">{item.name} × {item.quantity}</div>
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
                <td colSpan="5" className="text-center p-4 text-gray-400">No orders yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Kitchen;
