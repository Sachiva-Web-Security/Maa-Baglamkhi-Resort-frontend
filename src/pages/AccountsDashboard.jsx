import { useEffect, useMemo, useState } from "react";
import {
  FaFileInvoiceDollar,
  FaHistory,
  FaHotel,
  FaMoneyBillWave,
  FaReceipt,
  FaUtensils,
} from "react-icons/fa";

import API from "../api";
import RoleDashboardShell from "../components/roleDashboards/RoleDashboardShell";

const formatINR = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;

const AccountsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [banquets, setBanquets] = useState([]);
  const [restaurantBills, setRestaurantBills] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const results = await Promise.allSettled([
          API.get("/accounts/summary"),
          API.get("/accounts/transactions"),
          API.get("/hotel/all-bookings"),
          API.get("/banquet"),
          API.get("/restaurant/bills"),
        ]);

        if (!mounted) return;

        const [summaryRes, transactionRes, bookingRes, banquetRes, billsRes] = results;

        setSummary(summaryRes.status === "fulfilled" ? summaryRes.value.data || {} : {});
        setTransactions(transactionRes.status === "fulfilled" ? transactionRes.value.data || [] : []);
        setBookings(bookingRes.status === "fulfilled" ? bookingRes.value.data || [] : []);
        setBanquets(banquetRes.status === "fulfilled" ? banquetRes.value.data || [] : []);
        setRestaurantBills(billsRes.status === "fulfilled" ? billsRes.value.data || [] : []);

        if (summaryRes.status !== "fulfilled" && transactionRes.status !== "fulfilled") {
          setError("Accounts dashboard data load nahi ho pa raha.");
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

  const pendingDues = useMemo(
    () =>
      bookings.reduce(
        (sum, item) => sum + (Number(item.remainingAmount || item.balanceAmount || 0) || 0),
        0
      ),
    [bookings]
  );

  const stats = useMemo(() => [
    {
      label: "Total Payments",
      value: formatINR(summary.income),
      note: "Combined income captured in accounts summary.",
      icon: FaMoneyBillWave,
      tone: "emerald",
    },
    {
      label: "Pending Dues",
      value: formatINR(pendingDues),
      note: "Remaining balance across current guest bookings.",
      icon: FaReceipt,
      tone: "rose",
    },
    {
      label: "Guest Billing",
      value: bookings.length,
      note: "Bookings visible for billing and reconciliation.",
      icon: FaHotel,
      tone: "cyan",
    },
    {
      label: "Banquet Bills",
      value: banquets.length,
      note: "Banquet records available for payment review.",
      icon: FaFileInvoiceDollar,
      tone: "amber",
    },
    {
      label: "Restaurant Billing",
      value: restaurantBills.length,
      note: "Issued restaurant bills ready for verification.",
      icon: FaUtensils,
      tone: "violet",
    },
    {
      label: "Payment History",
      value: transactions.length,
      note: "Transactions currently visible in the accounts feed.",
      icon: FaHistory,
      tone: "slate",
    },
  ], [banquets.length, bookings.length, pendingDues, restaurantBills.length, summary.income, transactions.length]);

  const insights = useMemo(() => [
    {
      label: "Net Position",
      value: formatINR(summary.net),
      note: "Income minus expense from the current finance summary.",
    },
    {
      label: "GST Payable",
      value: formatINR(summary.gstPayable),
      note: "Tax payable snapshot for current financial entries.",
    },
    {
      label: "Expense Load",
      value: formatINR(summary.expense),
      note: "Total expense values posted in the accounts module.",
    },
  ], [summary]);

  const table = useMemo(() => ({
    eyebrow: "Accounts Feed",
    title: "Recent transactions",
    meta: `${transactions.length} transactions`,
    columns: [
      { key: "date", label: "Date" },
      { key: "type", label: "Type" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount", render: (row) => formatINR(row.amount) },
      { key: "paymentMode", label: "Mode" },
    ],
    rows: transactions.slice(0, 8),
    emptyText: "No transactions found for accounts dashboard.",
  }), [transactions]);

  return (
    <RoleDashboardShell
      badge="Accounts Overview"
      title="Accounts dashboard for billing and collections"
      description="Payments, guest balances, banquet billing, restaurant collections aur transaction history ko ek finance-first screen par rakha gaya hai."
      stats={stats}
      quickActions={[
        { label: "Open Accounts", helper: "Income, expense aur invoices manage karein.", route: "/accounts", icon: FaMoneyBillWave, tone: "emerald" },
        { label: "Reports", helper: "Collections aur finance reports ko review karein.", route: "/reports", icon: FaHistory, tone: "cyan" },
        { label: "Hotel Billing", helper: "Guest booking balances ko reconcile karein.", route: "/hotel/all-bookings", icon: FaHotel, tone: "amber" },
        { label: "Restaurant Bills", helper: "Food billing aur outlet settlement review karein.", route: "/restaurant/payment-bills", icon: FaUtensils, tone: "violet" },
      ]}
      insights={insights}
      table={table}
      loading={loading}
      error={error}
    />
  );
};

export default AccountsDashboard;
