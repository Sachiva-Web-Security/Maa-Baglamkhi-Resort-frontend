import { useEffect, useMemo, useState } from "react";
import {
  FaCashRegister,
  FaChair,
  FaClipboardCheck,
  FaReceipt,
  FaUtensils,
} from "react-icons/fa";

import RoleDashboardShell from "../components/roleDashboards/RoleDashboardShell";
import { restaurantService } from "../services/restaurantService";

const RestaurantDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [ordersData, kitchenData] = await Promise.all([
          restaurantService.getOrders(),
          restaurantService.getKitchenOrders(),
        ]);

        if (mounted) {
          setOrders(Array.isArray(ordersData) ? ordersData : []);
          setKitchenOrders(Array.isArray(kitchenData) ? kitchenData : []);
        }
      } catch (err) {
        if (mounted) {
          setError("Restaurant dashboard data load nahi ho pa raha.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const activeTables = useMemo(
    () =>
      new Set(
        orders.map((item) => item.tableNumber || item.table || item.roomNumber).filter(Boolean)
      ).size,
    [orders]
  );

  const runningOrders = useMemo(
    () =>
      orders.filter((item) => !String(item.status || "").toLowerCase().includes("paid")).length,
    [orders]
  );

  const stats = useMemo(() => [
    { label: "Active Tables", value: activeTables, note: "Tables or room refs with live order activity.", icon: FaChair, tone: "cyan" },
    { label: "Running Orders", value: runningOrders, note: "Orders not yet fully settled or closed.", icon: FaUtensils, tone: "amber" },
    { label: "Ready KOT", value: kitchenOrders.filter((item) => String(item.status || "").toLowerCase().includes("ready")).length, note: "Kitchen tickets ready for service handover.", icon: FaClipboardCheck, tone: "emerald" },
    { label: "Billing Shortcut", value: orders.filter((item) => String(item.status || "").toLowerCase().includes("paid")).length, note: "Completed or billed orders visible in the system.", icon: FaReceipt, tone: "violet" },
  ], [activeTables, kitchenOrders, orders, runningOrders]);

  const insights = useMemo(() => [
    {
      label: "Order Queue",
      value: orders.length,
      note: "Restaurant order count currently tracked in the POS layer.",
    },
    {
      label: "Kitchen Dependency",
      value: kitchenOrders.filter((item) => String(item.status || "").toLowerCase().includes("prepar")).length,
      note: "Orders still waiting on kitchen completion.",
    },
    {
      label: "Settlement Ready",
      value: kitchenOrders.filter((item) => String(item.status || "").toLowerCase().includes("ready")).length,
      note: "Ready dishes that can move to billing and serving.",
    },
  ], [kitchenOrders, orders.length]);

  const table = useMemo(() => ({
    eyebrow: "Service Queue",
    title: "Running order overview",
    meta: `${orders.length} active records`,
    columns: [
      { key: "ref", label: "Reference", render: (row) => row.tableNumber || row.table || row.roomNumber || "--" },
      { key: "orderId", label: "Order ID", render: (row) => row.orderId || row.id || "--" },
      { key: "itemCount", label: "Items", render: (row) => row.itemCount || row.qty || row.items?.length || "--" },
      { key: "status", label: "Status" },
      { key: "amount", label: "Amount", render: (row) => row.totalAmount || row.amount || "--" },
    ],
    rows: orders.slice(0, 10),
    emptyText: "No restaurant orders are currently visible.",
  }), [orders]);

  return (
    <RoleDashboardShell
      badge="Restaurant Service"
      title="Waiter dashboard for tables and running orders"
      description="Active tables, running orders, KOT readiness aur billing shortcuts ko service team ke liye role-specific tarike se dikhaya gaya hai."
      stats={stats}
      quickActions={[
        { label: "Open POS", helper: "Tables aur menu se nayi order flow start karein.", route: "/restaurant", icon: FaCashRegister, tone: "cyan" },
        { label: "Payment Bills", helper: "Settled orders aur billing history dekhein.", route: "/restaurant/payment-bills", icon: FaReceipt, tone: "emerald" },
        { label: "Token Items", helper: "Running order item details ko quickly access karein.", route: "/restaurant", icon: FaClipboardCheck, tone: "amber" },
        { label: "Menu Board", helper: "Food menu aur serving workflow ko open karein.", route: "/restaurant/add-menu-item", icon: FaUtensils, tone: "violet" },
      ]}
      insights={insights}
      table={table}
      loading={loading}
      error={error}
    />
  );
};

export default RestaurantDashboard;
