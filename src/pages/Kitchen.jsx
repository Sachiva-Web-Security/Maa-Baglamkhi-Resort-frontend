import React, { useEffect, useRef, useState } from "react";
import { FiCheckCircle, FiPrinter, FiClock, FiAlertCircle } from "react-icons/fi";
import { restaurantService } from "../services/restaurantService";

const Kitchen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const orderSound = useRef(null);
  const prevOrderCount = useRef(0);
  const firstLoad = useRef(true);

  const fetchOrders = async () => {
    if (firstLoad.current) setLoading(true);
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
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
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
    const ref = order.table || order.table_number || order.table_no;
    const entityType =
      localStorage.getItem(`entityType:${ref}`) || order.entityType || "Table";
    const total = order.items.reduce((sum, item) => {
      const qty = Number(item.qty ?? item.quantity ?? 0);
      return sum + Number(item.price || 0) * qty;
    }, 0);

    const printWindow = window.open("", "_blank");

    const itemsHTML = order.items
      .map(
        (item) => `
      <tr>
        <td>${item.name || item.item_name}</td>
        <td>${item.qty ?? item.quantity ?? "-"}</td>
        <td>₹${item.price}</td>
        <td>₹${Number(item.price || 0) * Number(item.qty ?? item.quantity ?? 0)}</td>
      </tr>
    `
      )
      .join("");

    printWindow.document.write(`
      <h2>Restaurant Bill</h2>
      <p>${entityType}: ${ref}</p>
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-64 bg-white/10 rounded-full" />
            <div className="grid md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-56 bg-white/5 rounded-3xl border border-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalOrders = orders.length;
  const readyCount = orders.filter((o) => o.status === "Ready").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hero */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-5 backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Live Kitchen Queue</p>
              <h2 className="text-2xl font-bold">Kitchen Orders</h2>
              <p className="text-sm text-slate-300 mt-1 flex items-center gap-1">
                <FiClock className="inline" /> Auto-refresh every 4s
              </p>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/30">
                <div className="text-xs text-emerald-200 uppercase">Total</div>
                <div className="text-xl font-bold text-white">{totalOrders}</div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-amber-500/15 border border-amber-400/30">
                <div className="text-xs text-amber-200 uppercase">Ready</div>
                <div className="text-xl font-bold text-white">{readyCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders grid */}
        <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-4">
          {orders.map((order) => {
            const ref = order.table || order.table_number || order.table_no;
            const entityType =
              localStorage.getItem(`entityType:${ref}`) ||
              order.entityType ||
              "Table";
            const label = `${entityType} ${ref}`;
            const status = order.status || "Pending";
            const statusColor =
              status === "Ready"
                ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/40"
                : "bg-amber-500/15 text-amber-100 border-amber-400/40";

            const total = (order.items || []).reduce((sum, item) => {
              const qty = Number(item.qty ?? item.quantity ?? 0);
              return sum + Number(item.price || 0) * qty;
            }, 0);

            return (
              <div
                key={order.id}
                className="rounded-3xl bg-white/[0.04] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.35)] p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Ref</p>
                    <h3 className="text-xl font-bold text-white">{label}</h3>
                    <p className="text-xs text-slate-400 mt-1">Order #{order.id}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="space-y-2 bg-white/5 rounded-2xl border border-white/10 p-3">
                  {(order.items || []).map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm text-slate-100"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {item.name || item.item_name}
                        </span>
                        <span className="text-slate-400 text-xs">
                          Qty: {item.qty ?? item.quantity ?? "-"}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">₹{item.price}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-200">
                    Total: <span className="font-bold text-white">₹{total}</span>
                  </div>
                  <div className="flex gap-2">
                    {order.status !== "Ready" && (
                      <button
                        onClick={() => markReady(order.id)}
                        className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/30"
                      >
                        <FiCheckCircle /> Ready
                      </button>
                    )}
                    <button
                      onClick={() => printBill(order)}
                      className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30"
                    >
                      <FiPrinter /> Print
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {orders.length === 0 && (
          <div className="border border-dashed border-white/20 rounded-3xl p-10 text-center text-slate-300 bg-white/5">
            <FiAlertCircle className="mx-auto text-3xl mb-3 text-slate-200" />
            <p className="text-lg font-semibold">No orders in the kitchen queue.</p>
            <p className="text-sm text-slate-400 mt-1">New orders will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Kitchen;

