import React, { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiPrinter,
} from "react-icons/fi";
import { FaFireAlt, FaSyncAlt } from "react-icons/fa";
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
        <td>Rs ${item.price}</td>
        <td>Rs ${Number(item.price || 0) * Number(item.qty ?? item.quantity ?? 0)}</td>
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

  const totalOrders = orders.length;
  const readyCount = orders.filter((o) => o.status === "Ready").length;
  const pendingCount = Math.max(0, totalOrders - readyCount);

  if (loading) {
    return (
      <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 transition-all duration-300 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1280px] space-y-6 animate-pulse">
          <div className="h-52 rounded-[28px] bg-slate-200/70" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-64 rounded-[26px] bg-white/80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 transition-all duration-300 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1280px] space-y-7">
        <section className="overflow-hidden rounded-[26px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-4 py-5 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-6 sm:py-6 lg:px-8">
          <div className="relative z-[1] grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] lg:items-center">
            <div className="space-y-3">
              <p className="text-[7px] font-semibold uppercase tracking-[0.26em] text-cyan-200 sm:text-[10px]">
                Resort Command Center
              </p>
              <div className="space-y-1">
                <h1 className="text-[1.25rem] font-black leading-[1.02] text-white sm:text-[2.4rem]">
                  Operational snapshot for kitchen
                </h1>
                <p className="max-w-3xl text-[12px] leading-5 text-slate-100/88 sm:text-[14px] sm:leading-6">
                  Track order queues, ready movement, and kitchen printing with the exact same background mood as the main hotel dashboard.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5"
                >
                  <FaSyncAlt className="text-cyan-600" />
                  Refresh Queue
                </button>
                <div className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md">
                  Auto refresh every 4 seconds
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: "Active Orders", value: String(totalOrders) },
                { label: "Ready Orders", value: String(readyCount) },
                { label: "Pending Orders", value: String(pendingCount) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[26px] border border-white/60 bg-white/76 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Queue Snapshot
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Kitchen stats</h2>
            </div>
            <div className="space-y-3">
              <div className="rounded-[20px] border border-slate-200/80 bg-white p-4">
                <div className="inline-flex rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                  <FaFireAlt />
                </div>
                <div className="mt-4 text-sm font-bold text-slate-900">Live queue monitor</div>
                <p className="mt-2 text-sm text-slate-500">
                  Orders restaurant side se aate hi yahan visible ho jate hain.
                </p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white p-4">
                <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <FiClock />
                </div>
                <div className="mt-4 text-sm font-bold text-slate-900">Status movement</div>
                <p className="mt-2 text-sm text-slate-500">
                  Ready mark karte hi queue clean aur service sync better rehta hai.
                </p>
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            <section className="rounded-[26px] border border-white/60 bg-white/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                    Live Kitchen Queue
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Kitchen orders</h2>
                </div>
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
                >
                  <FaSyncAlt />
                  Refresh Now
                </button>
              </div>

              {orders.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {orders.map((order) => {
                    const ref = order.table || order.table_number || order.table_no;
                    const entityType =
                      localStorage.getItem(`entityType:${ref}`) ||
                      order.entityType ||
                      "Table";
                    const label = `${entityType} ${ref}`;
                    const status = order.status || "Pending";
                    const total = (order.items || []).reduce((sum, item) => {
                      const qty = Number(item.qty ?? item.quantity ?? 0);
                      return sum + Number(item.price || 0) * qty;
                    }, 0);

                    return (
                      <div
                        key={order.id}
                        className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Reference
                            </div>
                            <div className="mt-2 text-lg font-black text-slate-900">{label}</div>
                            <div className="mt-1 text-sm text-slate-500">Order #{order.id}</div>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              status === "Ready"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 rounded-[20px] border border-slate-200/70 bg-slate-50 p-4">
                          {(order.items || []).map((item, index) => (
                            <div key={index} className="flex items-center justify-between gap-3 text-sm">
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {item.name || item.item_name}
                                </div>
                                <div className="text-slate-500">
                                  Qty: {item.qty ?? item.quantity ?? "-"}
                                </div>
                              </div>
                              <div className="font-bold text-slate-700">Rs. {item.price}</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-sm text-slate-600">
                            Total: <span className="font-black text-slate-900">Rs. {total}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {order.status !== "Ready" ? (
                              <button
                                type="button"
                                onClick={() => markReady(order.id)}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold text-white"
                              >
                                <FiCheckCircle />
                                Ready
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => printBill(order)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700"
                            >
                              <FiPrinter />
                              Print
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 p-10 text-center text-slate-500">
                  <FiAlertCircle className="mx-auto mb-3 text-3xl text-slate-400" />
                  <div className="text-lg font-bold text-slate-900">No orders in kitchen queue</div>
                  <div className="mt-2 text-sm">
                    Restaurant se naye orders aate hi yahan automatically show honge.
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Kitchen;
