import React, { useEffect, useRef, useState } from "react";
import API from "../api";

const Kitchen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const orderSound = useRef(null);
  const soundCount = useRef(0);
  const prevOrderCount = useRef(0);

  const fetchOrders = async () => {
    try {
      const res = await API.get("/kitchen/orders");
      const fetchedOrders = Array.isArray(res.data) ? res.data : [];

      if (
        fetchedOrders.length > prevOrderCount.current &&
        soundCount.current < 2 &&
        orderSound.current
      ) {
        orderSound.current.currentTime = 0;
        orderSound.current.play().catch(() => {});
        soundCount.current += 1;
      }

      prevOrderCount.current = fetchedOrders.length;
      setOrders(fetchedOrders);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Kitchen orders load nahi huye.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    orderSound.current = new Audio("/order.mp3");
    fetchOrders();

    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const markReady = async (id) => {
    try {
      await API.put(`/kitchen/orders/${id}`, { status: "Ready" });
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Order update nahi ho paaya.");
    }
  };

  const printBill = (order) => {
    const total = (order.items || []).reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0,
    );

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      return;
    }

    const itemsHTML = (order.items || [])
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>Rs ${item.price}</td>
        <td>Rs ${Number(item.price || 0) * Number(item.qty || 0)}</td>
      </tr>
    `,
      )
      .join("");

    printWindow.document.write(`
      <h2>Restaurant Bill</h2>
      <p>Table: ${order.table || "-"}</p>
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
      <h2 className="mb-6 text-2xl font-bold">Kitchen Orders</h2>

      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {orders.length === 0 ? (
          <p className="text-slate-300">No kitchen orders found.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-lg bg-slate-800 p-4 shadow">
              <h3 className="text-xl font-bold">Table {order.table || "-"}</h3>
              <p className="mt-1 text-sm text-slate-300">Waiter: {order.waiter || "-"}</p>
              <p className="text-sm text-slate-300">Status: {order.status || "-"}</p>

              <div className="mt-2 space-y-1">
                {(order.items || []).map((item, i) => (
                  <div key={`${order.id}-${i}`}>
                    {item.name} x {item.qty}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                {String(order.status || "").toLowerCase() !== "ready" && (
                  <button
                    onClick={() => markReady(order.id)}
                    className="rounded bg-green-600 px-3 py-1"
                  >
                    Ready
                  </button>
                )}

                <button
                  onClick={() => printBill(order)}
                  className="rounded bg-purple-600 px-3 py-1"
                >
                  Print
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Kitchen;
