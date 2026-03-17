import React, { useEffect, useRef, useState } from "react";
import { restaurantService } from "../services/restaurantService";

const Kitchen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const orderSound = useRef(null);
  const prevOrderCount = useRef(0);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await restaurantService.getKitchenOrders();
      setOrders(data || []);

      if ((data?.length || 0) > prevOrderCount.current && orderSound.current) {
        orderSound.current.currentTime = 0;
        orderSound.current.play().catch(() => {});
      }
      prevOrderCount.current = data?.length || 0;
    } catch (err) {
      console.error("Failed to load kitchen orders", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    orderSound.current = new Audio("/order.mp3");
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    window.addEventListener("kitchenUpdated", fetchOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener("kitchenUpdated", fetchOrders);
    };
  }, []);

  const markReady = async (id) => {
    try {
      await restaurantService.updateKitchenOrderStatus(id, "Ready");
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const printBill = (order) => {
    const total = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const printWindow = window.open("", "_blank");

    const itemsHTML = order.items
      .map(
        (item) => `
      <tr>
        <td>${item.name || item.item_name}</td>
        <td>${item.quantity}</td>
        <td>₹${item.price}</td>
        <td>₹${item.price * item.quantity}</td>
      </tr>
    `
      )
      .join("");

    printWindow.document.write(`
      <h2>Restaurant Bill</h2>
      <p>Table: ${order.table_number || order.table_no}</p>
      <table border="1" style="width:100%">
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
        ${itemsHTML}
      </table>
      <h3>Total: Rs ${total}</h3>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 p-6 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <h2 className="text-2xl font-bold mb-6">Kitchen Orders</h2>

      {loading && (
        <div className="text-slate-400 text-sm mb-3">Loading orders...</div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="p-4 bg-slate-800 rounded-lg shadow"
          >
            <h3 className="text-xl font-bold">
              Table {order.table_number || order.table_no}
            </h3>

            <div className="mt-2 space-y-1">
              {order.items?.map((item, i) => (
                <div key={i}>
                  {item.name || item.item_name} x {item.quantity}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              {order.status !== "Ready" && (
                <button
                  onClick={() => markReady(order.id)}
                  className="bg-green-600 px-3 py-1 rounded"
                >
                  Print
                </button>
              )}

              <button
                onClick={() => printBill(order)}
                className="bg-purple-600 px-3 py-1 rounded"
              >
                Print
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Kitchen;
