import React, { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiPrinter,
  FiSave,
  FiXCircle,
} from "react-icons/fi";
import { FaSyncAlt } from "react-icons/fa";
import API from "../api";
import { restaurantService } from "../services/restaurantService";

const PREP_TIME_OPTIONS = [10, 15, 20, 30, 45, 60];

const toMillis = (value) => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const formatClock = (value) => {
  const parsed = toMillis(value);
  if (!parsed) return "--";
  return new Date(parsed).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getRemainingMinutes = (order) => {
  const dueAt = toMillis(order.expectedReadyAt);
  if (!dueAt) return null;
  return Math.ceil((dueAt - Date.now()) / 60000);
};

const isOrderOverdue = (order) => {
  if (String(order.status || "").toLowerCase() === "ready") return false;
  const remaining = getRemainingMinutes(order);
  return remaining !== null && remaining < 0;
};

const Kitchen = () => {
  const [orders, setOrders] = useState([]);
  const [roomRefs, setRoomRefs] = useState(new Set());
  const [etaDrafts, setEtaDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const orderSound = useRef(null);
  const prevOrderCount = useRef(0);
  const firstLoad = useRef(true);
  const overdueRegistry = useRef(new Set());

  const fetchOrders = async () => {
    if (firstLoad.current) setLoading(true);
    try {
      const data = await restaurantService.getKitchenOrders();
      setOrders(data || []);
      setEtaDrafts((current) => {
        const next = { ...current };
        (data || []).forEach((order) => {
          if (!next[order.id]) {
            next[order.id] = Number(order.prepTimeMinutes || 20);
          }
        });
        return next;
      });

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

  const fetchRoomRefs = async () => {
    try {
      const response = await API.get("/housekeeping");
      setRoomRefs(
        new Set(
          (Array.isArray(response.data) ? response.data : [])
            .map((room) => String(room.roomNo || room.roomNumber || "").trim())
            .filter(Boolean),
        ),
      );
    } catch (err) {
      console.error("Failed to load kitchen room refs", err);
      setRoomRefs(new Set());
    }
  };

  const resolveEntityType = (order) => {
    const ref = String(order.table || order.table_number || order.table_no || "").trim();
    if (!ref) return "Table";

    const explicitType = String(order.entityType || "").trim();
    if (explicitType) return explicitType;

    const localType = localStorage.getItem(`entityType:${ref}`);
    if (localType) return localType;

    if (String(order.waiter || order.waiter_name || "").toLowerCase().includes("room")) {
      return "Room";
    }

    if (roomRefs.has(ref)) {
      return "Room";
    }

    return "Table";
  };

  useEffect(() => {
    orderSound.current = new Audio("/order.mp3");
    fetchOrders();
    fetchRoomRefs();
    const interval = setInterval(fetchOrders, 4000);
    window.addEventListener("kitchenUpdated", fetchOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener("kitchenUpdated", fetchOrders);
    };
  }, []);

  useEffect(() => {
    const overdueOrders = orders.filter((order) => isOrderOverdue(order));
    const registry = overdueRegistry.current;
    let shouldPlayWarning = false;

    overdueOrders.forEach((order) => {
      if (!registry.has(order.id)) {
        registry.add(order.id);
        shouldPlayWarning = true;
      }
    });

    Array.from(registry).forEach((id) => {
      if (!overdueOrders.some((order) => order.id === id)) {
        registry.delete(id);
      }
    });

    if (shouldPlayWarning && orderSound.current) {
      orderSound.current.currentTime = 0;
      orderSound.current.play().catch(() => {});
    }
  }, [orders]);

  const saveOrder = async (id) => {
    try {
      const res = await restaurantService.saveKitchenOrder(id, "Saved");
      fetchOrders();
      window.dispatchEvent(
        new CustomEvent("accountsUpdated", {
          detail: res?.accountEntry || null,
        }),
      );
      window.alert("Data account main save ho gaya hai.");
    } catch (err) {
      console.error(err);
      alert("Failed to save order");
    }
  };

  const cancelOrder = async (id) => {
    const confirmCancel = window.confirm("Cancel this kitchen order?");
    if (!confirmCancel) return;

    try {
      await restaurantService.cancelKitchenOrder(id);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel order");
    }
  };

  const updateEta = async (order) => {
    try {
      await restaurantService.updateKitchenOrderStatus(order.id, {
        status: order.status || "Pending",
        prepTimeMinutes: Number(etaDrafts[order.id] || order.prepTimeMinutes || 20),
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("ETA update nahi ho paaya.");
    }
  };

  const markOrderReady = async (order) => {
    const ref = order.table || order.table_number || order.table_no || "--";
    const entityType = resolveEntityType(order);
    try {
      await restaurantService.updateKitchenOrderStatus(order.id, {
        status: "Ready",
        readyMessage: `${entityType} ${ref} ka order ready hai. Service ke liye bhej dijiye.`,
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Order ready mark nahi ho paaya.");
    }
  };

  const printBill = (order) => {
    const ref = order.table || order.table_number || order.table_no;
    const entityType = resolveEntityType(order);
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
    `,
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
  const visibleOrders = orders.filter((o) => o.status !== "Cancelled");
  const readyCount = visibleOrders.filter((o) => o.status === "Ready").length;
  const pendingCount = Math.max(0, visibleOrders.length - readyCount);
  const overdueCount = visibleOrders.filter((o) => isOrderOverdue(o)).length;

  if (loading) {
    return (
      <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 transition-all duration-300 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1280px] space-y-6 animate-pulse">
          <div className="h-52 rounded-[28px] bg-slate-200/70" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                  Track order queues, ready movement, ETA promises, and warning alerts in one flow.
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

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Active Orders", value: String(totalOrders) },
                { label: "Ready Orders", value: String(readyCount) },
                { label: "Pending Orders", value: String(pendingCount) },
                { label: "Overdue", value: String(overdueCount) },
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

        <section className="space-y-4">
          <div className="rounded-[26px] border border-white/60 bg-white/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  Live Kitchen Queue
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                  Kitchen orders
                </h2>
              </div>
              <button
                type="button"
                onClick={fetchOrders}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 sm:w-auto"
              >
                <FaSyncAlt />
                Refresh Now
              </button>
            </div>

            {visibleOrders.length ? (
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {visibleOrders.map((order) => {
                  const ref = order.table || order.table_number || order.table_no;
                  const entityType = resolveEntityType(order);
                  const label = `${entityType} ${ref || "--"}`;
                  const status = order.status || "Pending";
                  const overdue = isOrderOverdue(order);
                  const remainingMinutes = getRemainingMinutes(order);
                  const total = (order.items || []).reduce((sum, item) => {
                    const qty = Number(item.qty ?? item.quantity ?? 0);
                    return sum + Number(item.price || 0) * qty;
                  }, 0);

                  return (
                    <div
                      key={order.id}
                      className={`rounded-[24px] border bg-white p-4 shadow-sm sm:p-5 ${
                        overdue
                          ? "border-rose-300 shadow-[0_20px_45px_rgba(244,63,94,0.12)]"
                          : "border-slate-200/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Reference
                          </div>
                          <div className="mt-2 text-base font-black text-slate-900 sm:text-lg">
                            {label}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 sm:text-sm">
                            Order #{order.id}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            status === "Ready"
                              ? "bg-emerald-50 text-emerald-700"
                              : overdue
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {overdue ? "Overdue" : status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className={`rounded-[18px] border px-3 py-3 ${overdue ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Kitchen ETA
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <select
                              value={etaDrafts[order.id] ?? order.prepTimeMinutes ?? 20}
                              onChange={(event) =>
                                setEtaDrafts((current) => ({
                                  ...current,
                                  [order.id]: Number(event.target.value),
                                }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                            >
                              {PREP_TIME_OPTIONS.map((minutes) => (
                                <option key={minutes} value={minutes}>
                                  {minutes} min
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => updateEta(order)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                            >
                              Set
                            </button>
                          </div>
                        </div>

                        <div className={`rounded-[18px] border px-3 py-3 ${overdue ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Ready Window
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                            <FiClock className={overdue ? "text-rose-600" : "text-cyan-600"} />
                            {formatClock(order.expectedReadyAt)}
                          </div>
                          <div className={`mt-1 text-xs ${overdue ? "text-rose-700" : "text-slate-500"}`}>
                            {status === "Ready"
                              ? `Ready at ${formatClock(order.readyAt)}`
                              : remainingMinutes === null
                              ? "ETA not set"
                              : remainingMinutes >= 0
                              ? `${remainingMinutes} min left`
                              : `${Math.abs(remainingMinutes)} min late`}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 rounded-[20px] border border-slate-200/70 bg-slate-50 p-3 sm:p-4">
                        {(order.items || []).map((item, index) => (
                          <div key={index} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
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

                      {order.readyMessage ? (
                        <div className="mt-3 rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                          {order.readyMessage}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-600">
                          Total: <span className="font-black text-slate-900">Rs. {total}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {status !== "Ready" ? (
                            <button
                              type="button"
                              onClick={() => markOrderReady(order)}
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5"
                            >
                              <FiCheckCircle />
                              Order Ready
                            </button>
                          ) : null}
                          {status === "Ready" ? (
                            <button
                              type="button"
                              onClick={() => saveOrder(order.id)}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5"
                            >
                              <FiSave />
                              Save Order
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => cancelOrder(order.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5"
                          >
                            <FiXCircle />
                            Cancel Order
                          </button>
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
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500 sm:p-10">
                <FiAlertCircle className="mx-auto mb-3 text-3xl text-slate-400" />
                <div className="text-lg font-bold text-slate-900">No orders in kitchen queue</div>
                <div className="mt-2 text-sm">
                  Restaurant se naye orders aate hi yahan automatically show honge.
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Kitchen;
