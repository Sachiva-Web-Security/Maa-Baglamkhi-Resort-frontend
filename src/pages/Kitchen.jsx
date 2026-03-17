import React, { useEffect, useRef, useState } from "react";
import { FaPrint, FaUtensils } from "react-icons/fa";

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
      0
    );

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHTML = (order.items || [])
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>Rs ${item.price}</td>
        <td>Rs ${Number(item.price || 0) * Number(item.qty || 0)}</td>
      </tr>
    `
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

  const readyCount = orders.filter(
    (order) => String(order.status || "").toLowerCase() === "ready"
  ).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
      </div>

      <div className="mx-auto max-w-[1260px] space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 text-white shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Kitchen Queue
              </p>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                Live kitchen orders in cleaner dashboard view
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Restaurant orders ko real-time monitor karein, ready mark karein aur
                print bill action ke saath smooth kitchen workflow chalayein.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: "Total Orders", value: orders.length },
                { label: "Ready Orders", value: readyCount },
                { label: "Status", value: loading ? "Loading..." : "Live" },
              ].map((item) => (
                <div key={item.label} className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-md">
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[24px] border border-white/60 bg-white/82 px-5 py-12 text-center text-sm font-semibold text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            Loading kitchen orders...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orders.length === 0 ? (
              <div className="rounded-[24px] border border-white/60 bg-white/82 px-5 py-12 text-center text-sm font-semibold text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                No kitchen orders found.
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[24px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Table
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        {order.table || "-"}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        Waiter: {order.waiter || "-"}
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                        String(order.status || "").toLowerCase() === "ready"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {order.status || "-"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-slate-200/80 bg-slate-50 p-4">
                    <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                      <FaUtensils className="text-cyan-700" />
                      Order Items
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      {(order.items || []).map((item, i) => (
                        <div key={`${order.id}-${i}`} className="flex justify-between gap-3">
                          <span>{item.name}</span>
                          <span className="font-semibold text-slate-900">x {item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {String(order.status || "").toLowerCase() !== "ready" && (
                      <button
                        onClick={() => markReady(order.id)}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                      >
                        Ready
                      </button>
                    )}
                    <button
                      onClick={() => printBill(order)}
                      className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white"
                    >
                      <FaPrint />
                      Print
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Kitchen;
