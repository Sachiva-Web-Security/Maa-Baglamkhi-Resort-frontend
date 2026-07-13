import React, { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiPrinter,
  FiXCircle,
} from "react-icons/fi";
import { FaSyncAlt } from "react-icons/fa";
import API from "../api";
import { restaurantService } from "../services/restaurantService";
import WaiterAssignmentCard from "../components/Restaurant/WaiterAssignmentCard";

const PREP_TIME_OPTIONS = [10, 15, 20, 30, 45, 60];
const ORDERS_PER_PAGE = 6;

const toMillis = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const mysqlMatch = value.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
    );

    if (mysqlMatch) {
      const [, year, month, day, hours, minutes, seconds = "00"] = mysqlMatch;
      const parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
      ).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    }
  }

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

const getRemainingSeconds = (order) => {
  const dueAt = toMillis(order.expectedReadyAt);
  if (!dueAt) return null;
  return Math.max(0, Math.ceil((dueAt - Date.now()) / 1000));
};

const formatCountdown = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) return "--:--";
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);
  const [, setTicker] = useState(0);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: "", order: null });
  const [noticeModal, setNoticeModal] = useState({ open: false, type: "success", message: "" });
  // ── Table / Room filter chip ───────────────────────────────────────────────
  const [entityFilter, setEntityFilter] = useState("All"); // "All" | "Table" | "Room"
  const orderSound = useRef(null);
  const firstLoad = useRef(true);
  const seenOrderIds = useRef(new Set());

  const showNotice = (type, message) => {
    setNoticeModal({ open: true, type, message });
  };

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

      const incomingIds = new Set((data || []).map((order) => String(order.id)));
      const hasNewOrder = (data || []).some((order) => !seenOrderIds.current.has(String(order.id)));

      if (!firstLoad.current && hasNewOrder && orderSound.current) {
        orderSound.current.currentTime = 0;
        orderSound.current.play().catch(() => {});
      }
      seenOrderIds.current = incomingIds;
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
    const ticker = setInterval(() => setTicker((current) => current + 1), 1000);
    window.addEventListener("kitchenUpdated", fetchOrders);
    return () => {
      clearInterval(interval);
      clearInterval(ticker);
      window.removeEventListener("kitchenUpdated", fetchOrders);
    };
  }, []);

  const cancelOrder = async (order) => {
    try {
      const response = await restaurantService.cancelKitchenOrder(order.id);
      fetchOrders();
      showNotice("success", response?.message || "Order cancelled successfully.");
    } catch (err) {
      console.error(err);
      showNotice("error", err.response?.data?.message || "Failed to cancel order");
    }
  };

  const restoreOrder = async (order) => {
    try {
      await restaurantService.updateKitchenOrderStatus(order.id, {
        status: "Pending",
        prepTimeMinutes: Number(etaDrafts[order.id] || order.prepTimeMinutes || 20),
        readyMessage: "",
      });
      fetchOrders();
      showNotice("success", "Cancelled order wapas kitchen queue me aa gaya hai.");
    } catch (err) {
      console.error(err);
      showNotice("error", err.response?.data?.message || "Order restore nahi ho paaya.");
    }
  };

  const removeCancelledOrder = async (order) => {
    try {
      const response = await restaurantService.removeKitchenOrder(order.id);
      fetchOrders();
      showNotice("success", response?.message || "Cancelled order permanently remove ho gaya.");
    } catch (err) {
      console.error(err);
      showNotice("error", err.response?.data?.message || "Cancelled order remove nahi ho paaya.");
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
      showNotice("error", "ETA update nahi ho paaya.");
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
      showNotice("error", "Order ready mark nahi ho paaya.");
    }
  };

  const openCancelOrderModal = (order) => {
    setConfirmModal({ open: true, type: "cancel-order", order });
  };

  const openRemoveOrderModal = (order) => {
    setConfirmModal({ open: true, type: "remove-order", order });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ open: false, type: "", order: null });
  };

  const handleConfirmAction = async () => {
    const { type, order } = confirmModal;
    closeConfirmModal();
    if (!order) return;

    if (type === "cancel-order") {
      await cancelOrder(order);
      return;
    }

    if (type === "remove-order") {
      await removeCancelledOrder(order);
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
  const cancelledOrders = orders.filter((o) => String(o.status || "").toLowerCase() === "cancelled");
  const visibleOrders = orders.filter((o) => {
    const status = String(o.status || "").toLowerCase();
    if (["cancelled", "saved", "served", "complete", "completed"].includes(status)) return false;
    // Entity filter chip
    if (entityFilter === "Table") {
      return resolveEntityType(o) === "Table";
    }
    if (entityFilter === "Room") {
      return resolveEntityType(o) === "Room";
    }
    return true;
  });
  const readyCount = visibleOrders.filter((o) => o.status === "Ready").length;
  const pendingCount = Math.max(0, visibleOrders.length - readyCount);
  const overdueCount = visibleOrders.filter((o) => isOrderOverdue(o)).length;
  const totalVisiblePages = Math.max(1, Math.ceil(visibleOrders.length / ORDERS_PER_PAGE));
  const totalCancelledPages = Math.max(1, Math.ceil(cancelledOrders.length / ORDERS_PER_PAGE));
  const paginatedVisibleOrders = visibleOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE,
  );
  const paginatedCancelledOrders = cancelledOrders.slice(
    (cancelledPage - 1) * ORDERS_PER_PAGE,
    cancelledPage * ORDERS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalVisiblePages));
  }, [totalVisiblePages]);

  useEffect(() => {
    setCancelledPage((page) => Math.min(page, totalCancelledPages));
  }, [totalCancelledPages]);

  const renderPagination = (page, totalPages, setPage) => {
    if (totalPages <= 1) return null;

    const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Page {page} of {totalPages}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              onClick={() => setPage(pageNumber)}
              className={`h-9 min-w-9 rounded-full px-3 text-xs font-bold transition ${
                page === pageNumber
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 transition-all duration-300 sm:p-6 lg:p-8">
        <div className="w-full space-y-6 animate-pulse">
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

      <div className="w-full space-y-7">
        <section className="overflow-hidden rounded-[26px] border border-sky-400/60 bg-[linear-gradient(90deg,#0EA5E9_0%,#0284C7_45%,#0369A1_100%)] px-4 py-5 shadow-[0_22px_55px_rgba(14,165,233,0.24)] sm:px-6 sm:py-6 lg:px-8">
          <div className="relative z-[1] grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] lg:items-center">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-950 sm:text-base">
                Resort Command Center
              </p>
              <div className="space-y-1">
                <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
                  Operational snapshot for kitchen
                </h1>
                <p className="max-w-3xl text-base leading-6 text-slate-950 sm:text-xl sm:leading-8">
                  Track order queues, ready movement, ETA promises, and warning alerts in one flow.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-base font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5"
                >
                  <FaSyncAlt className="text-cyan-600" />
                  Refresh Queue
                </button>
                <div className="rounded-full border border-sky-100/50 bg-white/20 px-5 py-3 text-base font-semibold text-slate-950 backdrop-blur-md">
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
                  className="rounded-[22px] border border-sky-100/45 bg-white/18 px-4 py-4 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
                >
                  <span className="text-[14px] text-slate-950">{item.label}</span>
                  <div className="mt-3 text-[14px] font-bold leading-none text-slate-950">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[26px] border border-white/60 bg-white/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  Live Kitchen Queue
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                  Kitchen orders
                </h2>
              </div>
              {/* ── Table / Room filter chips ─────────────────────────── */}
              <div className="flex flex-wrap gap-2">
                {["All", "Table", "Room"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => { setEntityFilter(filter); setCurrentPage(1); }}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      entityFilter === filter
                        ? filter === "Room"
                          ? "bg-sky-600 text-white shadow-md"
                          : filter === "Table"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-slate-900 text-white shadow-md"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={fetchOrders}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-3 text-base font-bold text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 sm:w-auto"
              >
                <FaSyncAlt />
                Refresh Now
              </button>
            </div>

            {visibleOrders.length ? (
              <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-base">
                    <thead className="bg-slate-50 text-sm uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Kitchen ETA</th>
                        <th className="px-4 py-3">Ready Window</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedVisibleOrders.map((order) => {
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
                          <tr
                            key={order.id}
                            className={`border-t border-slate-200 align-top ${
                              overdue ? "bg-rose-50/35" : "bg-white"
                            }`}
                          >
                            <td className="px-4 py-4">
                              <div className="text-xl font-black text-slate-900">{label}</div>
                              <div className="mt-1 text-sm text-slate-500">Order #{order.id}</div>
                              {order.readyMessage ? (
                                <div className="mt-2 rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                                  {order.readyMessage}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                                  status === "Ready"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : overdue
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {overdue ? "Overdue" : status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex min-w-[160px] items-center gap-2">
                                <select
                                  value={etaDrafts[order.id] ?? order.prepTimeMinutes ?? 20}
                                  onChange={(event) =>
                                    setEtaDrafts((current) => ({
                                      ...current,
                                      [order.id]: Number(event.target.value),
                                    }))
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-700"
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
                                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
                                >
                                  Set
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
                                <FiClock className={overdue ? "text-rose-600" : "text-cyan-600"} />
                                {formatCountdown(getRemainingSeconds(order))}
                              </div>
                              <div className={`mt-1 text-sm ${overdue ? "text-rose-700" : "text-slate-500"}`}>
                                {status === "Ready"
                                  ? "Order ready for service"
                                  : remainingMinutes === null
                                  ? "ETA not set"
                                  : remainingMinutes > 0
                                  ? `${remainingMinutes} min left`
                                  : "Time up"}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="min-w-[220px] space-y-2">
                                {(order.items || []).map((item, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between gap-3 rounded-[14px] bg-slate-50 px-3 py-2"
                                  >
                                    <div>
                                      <div className="text-lg font-semibold text-slate-900">
                                        {item.name || item.item_name}
                                      </div>
                                      <div className="text-sm text-slate-500">
                                        Qty: {item.qty ?? item.quantity ?? "-"}
                                      </div>
                                    </div>
                                    <div className="text-lg font-bold text-slate-700">Rs. {item.price}</div>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xl font-black text-slate-900">Rs. {total}</td>
                            <td className="px-4 py-4">
                              <div className="flex min-w-[180px] flex-col gap-2">
                                {status !== "Ready" ? (
                                  <button
                                    type="button"
                                    onClick={() => markOrderReady(order)}
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5"
                                  >
                                    <FiCheckCircle />
                                    Order Ready
                                  </button>
                                ) : null}
                                {/* Room-order ready: show waiter assignment card inline */}
                                {status === "Ready" && entityType === "Room" ? (
                                  <WaiterAssignmentCard
                                    order={order}
                                    onAssigned={(id, data) => {
                                      global.io?.emit("room-service-waiter-assigned", { kitchenOrderId: id });
                                    }}
                                    onDelivered={(id, data) => {
                                      fetchOrders();
                                      showNotice("success", "Delivery confirmed. Charge posted to guest folio.");
                                    }}
                                  />
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => openCancelOrderModal(order)}
                                  className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5"
                                >
                                  <FiXCircle />
                                  Cancel Order
                                </button>
                                <button
                                  type="button"
                                  onClick={() => printBill(order)}
                                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
                                >
                                  <FiPrinter />
                                  Print
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500 sm:p-10">
                <FiAlertCircle className="mx-auto mb-3 text-3xl text-slate-400" />
                <div className="text-2xl font-bold text-slate-900">No orders in kitchen queue</div>
                <div className="mt-2 text-lg">
           New orders from the restaurant will automatically appear here as they come in
                </div>
              </div>
            )}

            {renderPagination(currentPage, totalVisiblePages, setCurrentPage)}
          </div>
        </section>

        {cancelledOrders.length ? (
          <section className="rounded-[26px] border border-rose-100 bg-white/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-400">
                Cancelled Orders
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                Cancelled kitchen records
              </h2>
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
              {paginatedCancelledOrders.map((order) => {
                const ref = order.table || order.table_number || order.table_no;
                const entityType = resolveEntityType(order);
                const total = (order.items || []).reduce((sum, item) => {
                  const qty = Number(item.qty ?? item.quantity ?? 0);
                  return sum + Number(item.price || 0) * qty;
                }, 0);

                return (
                  <div
                    key={`cancelled-${order.id}`}
                    className="rounded-[24px] border border-rose-200 bg-rose-50/70 p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">
                          Reference
                        </div>
                        <div className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                          {entityType} {ref || "--"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500 sm:text-base">
                          Order #{order.id}
                        </div>
                      </div>
                      <span className="rounded-full bg-rose-100 px-4 py-1.5 text-sm font-semibold text-rose-700">
                        Cancelled
                      </span>
                    </div>

                    <div className="mt-4 rounded-[18px] border border-rose-200 bg-white/70 px-4 py-4 text-base text-slate-700">
                      {order.readyMessage || `${entityType} ${ref || "--"} order cancelled.`}
                    </div>

                    <div className="mt-4 text-base text-slate-600">
                      Total: <span className="text-xl font-black text-slate-900">Rs. {total}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-rose-700">
                      Cancelled orders ka amount accounts me add nahi hota.
                    </div>
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => restoreOrder(order)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5"
                        >
                          Restore Order
                        </button>
                        <button
                          type="button"
                          onClick={() => openRemoveOrderModal(order)}
                          className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5"
                        >
                          Remove Order
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {renderPagination(cancelledPage, totalCancelledPages, setCancelledPage)}
          </section>
        ) : null}
      </div>

      {confirmModal.open ? (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
          onClick={closeConfirmModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-rose-100 bg-[linear-gradient(135deg,#7f1d1d_0%,#be123c_48%,#ea580c_100%)] px-6 py-5 text-white">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-white/90">
                Confirm Action
              </div>
              <h3 className="mt-3 text-3xl font-black">
                {confirmModal.type === "remove-order" ? "Remove cancelled order?" : "Cancel this kitchen order?"}
              </h3>
              <p className="mt-2 text-base text-white/80">
                {confirmModal.type === "remove-order"
                  ? "Ye order permanently list se remove ho jayega."
                  : "Order queue se hata diya jayega aur active service flow stop ho jayega."}
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-[22px] border border-rose-100 bg-rose-50/80 p-4">
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-rose-700">Order Reference</div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {resolveEntityType(confirmModal.order || {})}{" "}
                  {confirmModal.order?.table || confirmModal.order?.table_number || confirmModal.order?.table_no || "--"}
                </div>
                <div className="mt-1 text-base text-slate-600">Order #{confirmModal.order?.id || "--"}</div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeConfirmModal}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {confirmModal.type === "remove-order" ? "Remove Permanently" : "Yes, Cancel Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {noticeModal.open ? (
        <div
          className="fixed inset-0 z-[1110] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm"
          onClick={() => setNoticeModal((current) => ({ ...current, open: false }))}
        >
          <div
            className={`w-full max-w-sm overflow-hidden rounded-[28px] border bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)] ${
              noticeModal.type === "error" ? "border-rose-200" : "border-emerald-200"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`px-5 py-4 text-white ${
                noticeModal.type === "error"
                  ? "bg-[linear-gradient(135deg,#991b1b_0%,#e11d48_100%)]"
                  : "bg-[linear-gradient(135deg,#065f46_0%,#0f766e_100%)]"
              }`}
            >
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-white/85">
                {noticeModal.type === "error" ? "Action Failed" : "Action Complete"}
              </div>
              <div className="mt-2 text-2xl font-black">
                {noticeModal.type === "error" ? "Something went wrong" : "Kitchen updated"}
              </div>
            </div>
            <div className="px-5 py-5">
              <p className="text-base text-slate-700">{noticeModal.message}</p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setNoticeModal((current) => ({ ...current, open: false }))}
                  className={`rounded-xl px-4 py-2.5 text-base font-semibold text-white ${
                    noticeModal.type === "error" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Kitchen;
