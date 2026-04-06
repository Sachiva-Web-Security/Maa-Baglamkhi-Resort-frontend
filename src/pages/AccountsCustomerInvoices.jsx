import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaFileInvoiceDollar } from "react-icons/fa";

import API from "../api";

const BILLING_PAGE_SIZE = 10;

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const toNumber = (value) => Number(value || 0);

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-cyan-200";

const getInvoiceRoomValue = (invoice) =>
  String(invoice.room_no || invoice.roomNo || invoice.roomNumber || "").trim();

const getHotelBookingRoomValue = (booking) =>
  String(booking.rooms || booking.room_no || booking.roomNo || "").trim();

const normalizePaymentMode = (value) => {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();

  if (!text) return "Unknown";
  if (lower.includes("cash")) return "Cash";
  if (lower.includes("upi")) return "UPI";
  if (lower.includes("card")) return "Card";
  if (lower.includes("bank")) return "Bank Transfer";
  if (lower.includes("cheque")) return "Cheque";
  if (lower.includes("pending")) return "Pending";
  return text;
};

const getInvoicePaymentMode = (invoice) =>
  normalizePaymentMode(
    invoice.paymentMode ||
      invoice.payment_mode ||
      invoice.paymentMethod ||
      invoice.payment_method ||
      "",
  );

const getHotelBookingPaymentMode = (booking) =>
  normalizePaymentMode(booking.paymentMode || booking.payment_mode || "");

const getHotelBookingPaymentStatus = (booking) => {
  const remaining = toNumber(booking.remainingAmount || booking.balanceAmount);
  const paid = toNumber(booking.netPaid || booking.paidAmount);

  if (remaining <= 0 && paid > 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
};

const getHotelBookingReference = (booking) =>
  String(booking.bookingCode || booking.booking_code || booking.bookingId || booking.id || "").trim();

const getRestaurantBillTableValue = (bill) =>
  String(bill.tableNumber || bill.table_number || bill.table || bill.locationLabel || "").trim();

const getRestaurantBillPaymentMode = (bill) =>
  normalizePaymentMode(
    bill.paymentMethod || bill.payment_method || bill.paymentMode || bill.payment_mode || "",
  );

const getRestaurantBillStatus = (bill) =>
  String(bill.invoiceStatus || bill.invoice_status || bill.status || "Generated").trim();

const getBanquetHallValue = (booking) =>
  String(booking.hallName || booking.hall_name || booking.hall || "").trim();

const getBanquetPaymentMode = (booking) =>
  normalizePaymentMode(
    booking.paymentMode || booking.payment_mode || booking.paymentMethod || booking.payment_method || "",
  );

const getBanquetPaymentStatus = (booking) =>
  String(booking.paymentStatus || booking.payment_status || booking.status || "Pending").trim();

const getBanquetReference = (booking) =>
  String(booking.invoiceNo || booking.invoice_no || "").trim();

const splitInvoiceAmounts = (invoice) => {
  const roomBase = toNumber(invoice.price_per_day) + toNumber(invoice.extra_charge);
  const restaurantBase = toNumber(invoice.food_charge);
  const finalTotal = toNumber(
    invoice.totalAmount ?? invoice.total_amount ?? invoice.final_total ?? invoice.subtotal,
  );
  const baseTotal = roomBase + restaurantBase;

  if (baseTotal <= 0) {
    return { roomAmount: 0, restaurantAmount: 0, finalAmount: finalTotal };
  }

  if (restaurantBase <= 0) {
    return { roomAmount: finalTotal || roomBase, restaurantAmount: 0, finalAmount: finalTotal || roomBase };
  }

  if (roomBase <= 0) {
    return { roomAmount: 0, restaurantAmount: finalTotal || restaurantBase, finalAmount: finalTotal || restaurantBase };
  }

  return {
    roomAmount: Number((((finalTotal || baseTotal) * roomBase) / baseTotal).toFixed(2)),
    restaurantAmount: Number((((finalTotal || baseTotal) * restaurantBase) / baseTotal).toFixed(2)),
    finalAmount: finalTotal || baseTotal,
  };
};

const AccountsCustomerInvoices = () => {
  const navigate = useNavigate();
  const refreshTimerRef = useRef(null);
  const refreshInFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [hotelBookings, setHotelBookings] = useState([]);
  const [restaurantBills, setRestaurantBills] = useState([]);
  const [banquetBookings, setBanquetBookings] = useState([]);
  const [selectedBillingSource, setSelectedBillingSource] = useState("all");
  const [selectedInvoiceRoom, setSelectedInvoiceRoom] = useState("all");
  const [selectedRestaurantTable, setSelectedRestaurantTable] = useState("all");
  const [selectedBanquetHall, setSelectedBanquetHall] = useState("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const [billingPage, setBillingPage] = useState(1);

  const billingSourceOptions = [
    { value: "all", label: "All Sources" },
    { value: "hotel", label: "Hotel" },
    { value: "restaurant", label: "Restaurant" },
    { value: "banquet", label: "Banquet" },
  ];
  const paymentModeOptions = ["all", "Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

  const fetchInvoices = async () => {
    try {
      const res = await API.get("/invoices/all");
      setCustomerInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading invoices", error);
      setCustomerInvoices([]);
    }
  };

  const fetchHotelBookings = async () => {
    try {
      const res = await API.get("/accounts/hotel-billing");
      setHotelBookings(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading hotel billing records", error);
      setHotelBookings([]);
    }
  };

  const fetchRestaurantBills = async () => {
    try {
      const res = await API.get("/accounts/restaurant-billing");
      setRestaurantBills(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading restaurant bills", error);
      setRestaurantBills([]);
    }
  };

  const fetchBanquetBookings = async () => {
    try {
      const res = await API.get("/banquet");
      setBanquetBookings(Array.isArray(res.data?.bookings) ? res.data.bookings : []);
    } catch (error) {
      console.error("Error loading banquet bookings", error);
      setBanquetBookings([]);
    }
  };

  const refreshData = async () => {
    if (refreshInFlightRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;

    try {
      do {
        pendingRefreshRef.current = false;
        await Promise.all([
          fetchInvoices(),
          fetchHotelBookings(),
          fetchRestaurantBills(),
          fetchBanquetBookings(),
        ]);
      } while (pendingRefreshRef.current);
    } finally {
      refreshInFlightRef.current = false;
    }
  };

  useEffect(() => {
    let active = true;

    const runRefresh = async () => {
      if (!active) return;
      await refreshData();
    };

    runRefresh();

    const handleAccountsUpdated = () => {
      runRefresh();
    };

    refreshTimerRef.current = window.setInterval(() => {
      runRefresh();
    }, 30000);

    window.addEventListener("accountsUpdated", handleAccountsUpdated);
    window.addEventListener("focus", handleAccountsUpdated);

    return () => {
      active = false;
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
      window.removeEventListener("accountsUpdated", handleAccountsUpdated);
      window.removeEventListener("focus", handleAccountsUpdated);
    };
  }, []);

  const roomFilterOptions = Array.from(
    new Set(
      [
        ...customerInvoices.map((invoice) => getInvoiceRoomValue(invoice)),
        ...hotelBookings.map((booking) => getHotelBookingRoomValue(booking)),
      ].filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const restaurantTableOptions = Array.from(
    new Set(restaurantBills.map((bill) => getRestaurantBillTableValue(bill)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const banquetHallOptions = Array.from(
    new Set(banquetBookings.map((booking) => getBanquetHallValue(booking)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const roomFilteredInvoices =
    selectedInvoiceRoom === "all"
      ? customerInvoices
      : customerInvoices.filter((invoice) => getInvoiceRoomValue(invoice) === selectedInvoiceRoom);

  const invoiceBookingIds = new Set(
    customerInvoices
      .map((invoice) => String(invoice.booking_id || invoice.customer_id || ""))
      .filter(Boolean),
  );

  const invoiceFallbackBookings = hotelBookings.filter(
    (booking) => !invoiceBookingIds.has(String(booking.bookingId || booking.id || "")),
  );

  const roomFilteredHotelBookings =
    selectedInvoiceRoom === "all"
      ? invoiceFallbackBookings
      : invoiceFallbackBookings.filter(
          (booking) => getHotelBookingRoomValue(booking) === selectedInvoiceRoom,
        );

  const hotelInvoices =
    selectedPaymentMode === "all"
      ? roomFilteredInvoices
      : roomFilteredInvoices.filter(
          (invoice) => getInvoicePaymentMode(invoice) === selectedPaymentMode,
        );

  const filteredHotelBookings =
    selectedPaymentMode === "all"
      ? roomFilteredHotelBookings
      : roomFilteredHotelBookings.filter(
          (booking) => getHotelBookingPaymentMode(booking) === selectedPaymentMode,
        );

  const tableFilteredRestaurantBills =
    selectedRestaurantTable === "all"
      ? restaurantBills
      : restaurantBills.filter(
          (bill) => getRestaurantBillTableValue(bill) === selectedRestaurantTable,
        );

  const filteredRestaurantBills =
    selectedPaymentMode === "all"
      ? tableFilteredRestaurantBills
      : tableFilteredRestaurantBills.filter(
          (bill) => getRestaurantBillPaymentMode(bill) === selectedPaymentMode,
        );

  const hallFilteredBanquetBookings =
    selectedBanquetHall === "all"
      ? banquetBookings
      : banquetBookings.filter((booking) => getBanquetHallValue(booking) === selectedBanquetHall);

  const filteredBanquetBookings =
    selectedPaymentMode === "all"
      ? hallFilteredBanquetBookings
      : hallFilteredBanquetBookings.filter(
          (booking) => getBanquetPaymentMode(booking) === selectedPaymentMode,
        );

  const showHotelSource = selectedBillingSource === "all" || selectedBillingSource === "hotel";
  const showRestaurantSource =
    selectedBillingSource === "all" || selectedBillingSource === "restaurant";
  const showBanquetSource =
    selectedBillingSource === "all" || selectedBillingSource === "banquet";

  const visibleHotelInvoices = showHotelSource ? hotelInvoices : [];
  const visibleHotelBookings = showHotelSource ? filteredHotelBookings : [];
  const visibleRestaurantBills = showRestaurantSource ? filteredRestaurantBills : [];
  const visibleBanquetBookings = showBanquetSource ? filteredBanquetBookings : [];

  const filteredHotelTotals = hotelInvoices.reduce(
    (acc, invoice) => {
      const split = splitInvoiceAmounts(invoice);
      acc.roomAmount += split.roomAmount;
      acc.restaurantAmount += split.restaurantAmount;
      acc.finalAmount += split.finalAmount;
      return acc;
    },
    { roomAmount: 0, restaurantAmount: 0, finalAmount: 0 },
  );

  filteredHotelBookings.forEach((booking) => {
    const total = toNumber(
      booking.totalAmount || booking.total_amount || booking.netPaid || booking.paidAmount,
    );
    filteredHotelTotals.roomAmount += total;
    filteredHotelTotals.finalAmount += total;
  });

  const filteredRestaurantBillTotals = filteredRestaurantBills.reduce(
    (acc, bill) => {
      const total = toNumber(bill.total);
      acc.restaurantAmount += total;
      acc.finalAmount += total;
      return acc;
    },
    { roomAmount: 0, restaurantAmount: 0, finalAmount: 0 },
  );

  const filteredBanquetTotals = filteredBanquetBookings.reduce(
    (acc, booking) => {
      const total = toNumber(
        booking.grandTotal || booking.grand_total || booking.totalAmount || booking.total_amount,
      );
      acc.banquetAmount += total;
      acc.finalAmount += total;
      return acc;
    },
    { banquetAmount: 0, finalAmount: 0 },
  );

  const filteredBillingTotals = {
    roomAmount: showHotelSource ? filteredHotelTotals.roomAmount : 0,
    restaurantAmount:
      (showHotelSource ? filteredHotelTotals.restaurantAmount : 0) +
      (showRestaurantSource ? filteredRestaurantBillTotals.restaurantAmount : 0),
    banquetAmount: showBanquetSource ? filteredBanquetTotals.banquetAmount : 0,
    finalAmount:
      (showHotelSource ? filteredHotelTotals.finalAmount : 0) +
      (showRestaurantSource ? filteredRestaurantBillTotals.finalAmount : 0) +
      (showBanquetSource ? filteredBanquetTotals.finalAmount : 0),
  };

  const combinedBillingRecords = [
    ...visibleHotelInvoices.map((invoice) => ({
      id: `hotel-${invoice.id}`,
      source: "Hotel",
      reference: invoice.invoice_no || invoice.invoiceNo || "--",
      customerName: invoice.customer_name || invoice.customerName || "--",
      locationLabel: getInvoiceRoomValue(invoice) ? `Room ${getInvoiceRoomValue(invoice)}` : "--",
      date: invoice.date || "--",
      total: toNumber(invoice.totalAmount ?? invoice.total_amount ?? invoice.final_total),
      paymentMode: getInvoicePaymentMode(invoice),
      paymentStatus: invoice.paymentStatus || invoice.payment_status || invoice.status || "Pending",
      actionId: invoice.booking_id || invoice.customer_id,
      actionKind: "invoice",
    })),
    ...visibleHotelBookings.map((booking) => ({
      id: `hotel-booking-${booking.bookingId || booking.id}`,
      source: "Hotel",
      reference: getHotelBookingReference(booking) || "--",
      customerName: booking.guest_name || booking.customerName || "--",
      locationLabel: getHotelBookingRoomValue(booking) ? `Room ${getHotelBookingRoomValue(booking)}` : "--",
      date: booking.check_out || booking.checkOut || booking.check_in || booking.checkIn || "--",
      total: toNumber(
        booking.totalAmount || booking.total_amount || booking.netPaid || booking.paidAmount,
      ),
      paymentMode: getHotelBookingPaymentMode(booking),
      paymentStatus: getHotelBookingPaymentStatus(booking),
      actionId: booking.bookingId || booking.id,
      actionKind: "hotel-booking",
    })),
    ...visibleRestaurantBills.map((bill) => ({
      id: `restaurant-${bill.id}`,
      source: "Restaurant",
      reference: bill.reference || `RBILL-${bill.id}`,
      customerName: bill.customerName || bill.customer_name || "Walk-in",
      locationLabel: bill.locationLabel || (getRestaurantBillTableValue(bill)
        ? `Table ${getRestaurantBillTableValue(bill)}`
        : "--"),
      date: bill.created_at || bill.date || "--",
      total: toNumber(bill.total),
      paymentMode: getRestaurantBillPaymentMode(bill),
      paymentStatus: bill.paymentStatus || getRestaurantBillStatus(bill),
      actionId: bill.actionId || bill.id,
      actionKind: "restaurant-bill",
    })),
    ...visibleBanquetBookings.map((booking) => ({
      id: `banquet-${booking.id}`,
      source: "Banquet",
      reference: getBanquetReference(booking) || `BNQ-${booking.id}`,
      customerName: booking.customerName || booking.customer_name || "--",
      locationLabel: getBanquetHallValue(booking) || "--",
      date: booking.date || "--",
      total: toNumber(
        booking.grandTotal || booking.grand_total || booking.totalAmount || booking.total_amount,
      ),
      paymentMode: getBanquetPaymentMode(booking),
      paymentStatus: getBanquetPaymentStatus(booking),
      actionId: booking.id,
      actionKind: "banquet",
    })),
  ].sort((left, right) => String(right.date).localeCompare(String(left.date)));

  const billingTotalPages = Math.max(1, Math.ceil(combinedBillingRecords.length / BILLING_PAGE_SIZE));
  const paginatedBillingRecords = combinedBillingRecords.slice(
    (billingPage - 1) * BILLING_PAGE_SIZE,
    billingPage * BILLING_PAGE_SIZE,
  );

  useEffect(() => {
    setBillingPage(1);
  }, [
    selectedBillingSource,
    selectedInvoiceRoom,
    selectedRestaurantTable,
    selectedBanquetHall,
    selectedPaymentMode,
  ]);

  useEffect(() => {
    if (billingPage > billingTotalPages) {
      setBillingPage(billingTotalPages);
    }
  }, [billingPage, billingTotalPages]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
      </div>

      <div className="space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 text-white shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.95fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Finance Center
              </p>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl">
                Customer invoices full workspace
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-100/85 sm:text-xl">
                View hotel, restaurant, and banquet billing records together on one dedicated page.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/accounts")}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-base font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)]"
                >
                  <FaArrowLeft className="text-cyan-600" />
                  Back To Accounts
                </button>
                <button
                  type="button"
                  onClick={refreshData}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-200/40 bg-cyan-400/15 px-5 py-3 text-base font-bold text-white backdrop-blur-md transition hover:border-cyan-200 hover:bg-cyan-400/20"
                >
                  <FaFileInvoiceDollar className="text-cyan-200" />
                  Refresh Invoices
                </button>
                <label className="min-w-[220px] rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 text-left backdrop-blur-md">
                  <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100/80">
                    Payment Filter
                  </span>
                  <select
                    value={selectedPaymentMode}
                    onChange={(event) => setSelectedPaymentMode(event.target.value)}
                    className="mt-2 w-full bg-transparent text-base font-semibold text-white outline-none"
                  >
                    {paymentModeOptions.map((mode) => (
                      <option key={mode} value={mode} className="text-slate-900">
                        {mode === "all" ? "All Payment Modes" : mode}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Billing Records", value: String(combinedBillingRecords.length), tone: "text-cyan-200" },
                { label: "Combined Total", value: formatINR(filteredBillingTotals.finalAmount), tone: "text-white" },
                { label: "Room Total", value: formatINR(filteredBillingTotals.roomAmount), tone: "text-emerald-200" },
                { label: "Restaurant Total", value: formatINR(filteredBillingTotals.restaurantAmount), tone: "text-sky-200" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-md"
                >
                  <span className="text-sm text-slate-100/75">{item.label}</span>
                  <div className={`mt-3 text-3xl font-bold leading-none ${item.tone}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Customer Invoices
              </div>
              <h2 className="mt-2 text-5xl font-black text-slate-900">
                Hotel + restaurant + banquet billing records
              </h2>
              <p className="mt-2 text-xl text-slate-500">
                Hotel invoices, restaurant bills, and banquet invoices are displayed here together
                so the Accounts team can track source-wise billing, totals, and payment status.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-5 py-2.5 text-base font-bold text-slate-600">
              {combinedBillingRecords.length} billing records
            </div>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-base font-semibold uppercase tracking-[0.16em] text-slate-500">
                Billing Source
              </span>
              <select value={selectedBillingSource} onChange={(event) => setSelectedBillingSource(event.target.value)} className={`${fieldClass} py-3.5 text-lg`}>
                {billingSourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-base font-semibold uppercase tracking-[0.16em] text-slate-500">
                Filter By Room
              </span>
              <select value={selectedInvoiceRoom} onChange={(event) => setSelectedInvoiceRoom(event.target.value)} className={`${fieldClass} py-3.5 text-lg`}>
                <option value="all">All Rooms</option>
                {roomFilterOptions.map((room) => (
                  <option key={room} value={room}>
                    Room {room}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-base font-semibold uppercase tracking-[0.16em] text-slate-500">
                Filter By Restaurant Table
              </span>
              <select value={selectedRestaurantTable} onChange={(event) => setSelectedRestaurantTable(event.target.value)} className={`${fieldClass} py-3.5 text-lg`}>
                <option value="all">All Tables</option>
                {restaurantTableOptions.map((tableNo) => (
                  <option key={tableNo} value={tableNo}>
                    Table {tableNo}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-base font-semibold uppercase tracking-[0.16em] text-slate-500">
                Filter By Banquet Hall
              </span>
              <select value={selectedBanquetHall} onChange={(event) => setSelectedBanquetHall(event.target.value)} className={`${fieldClass} py-3.5 text-lg`}>
                <option value="all">All Halls</option>
                {banquetHallOptions.map((hallName) => (
                  <option key={hallName} value={hallName}>
                    {hallName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Filtered Room Total</div>
              <div className="mt-2 text-3xl font-black text-emerald-800">{formatINR(filteredBillingTotals.roomAmount)}</div>
              <div className="mt-1 text-base text-emerald-700/80">
                {selectedInvoiceRoom === "all" ? "Room share across all invoice records." : `Room share for Room ${selectedInvoiceRoom}.`}
              </div>
            </div>
            <div className="rounded-[22px] border border-cyan-100 bg-cyan-50/80 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">Filtered Restaurant Total</div>
              <div className="mt-2 text-3xl font-black text-cyan-800">{formatINR(filteredBillingTotals.restaurantAmount)}</div>
              <div className="mt-1 text-base text-cyan-700/80">Restaurant bills plus room-service order totals.</div>
            </div>
            <div className="rounded-[22px] border border-violet-100 bg-violet-50/80 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">Filtered Banquet Total</div>
              <div className="mt-2 text-3xl font-black text-violet-800">{formatINR(filteredBillingTotals.banquetAmount)}</div>
              <div className="mt-1 text-base text-violet-700/80">Real banquet booking totals from the banquet module.</div>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Filtered Combined Total</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{formatINR(filteredBillingTotals.finalAmount)}</div>
              <div className="mt-1 text-base text-slate-500">Combined billed amount for the current filter.</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[22px] border border-slate-200">
            <table className="min-w-full text-left text-base">
              <thead className="bg-slate-50 text-sm uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Room / Table</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBillingRecords.map((record) => (
                  <tr key={record.id} className="border-t border-slate-200">
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-bold ${record.source === "Restaurant" ? "border-cyan-200 bg-cyan-50 text-cyan-700" : record.source === "Banquet" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                        {record.source}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-lg font-semibold text-slate-900">{record.reference}</td>
                    <td className="px-4 py-4 text-lg text-slate-700">{record.customerName}</td>
                    <td className="px-4 py-4 text-lg text-slate-700">{record.locationLabel}</td>
                    <td className="px-4 py-4 text-lg text-slate-700">{record.date}</td>
                    <td className="px-4 py-4 text-lg font-bold text-slate-900">{formatINR(record.total)}</td>
                    <td className="px-4 py-4 text-lg text-slate-700">{record.paymentMode}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-bold ${String(record.paymentStatus).toLowerCase() === "paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                        {record.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {record.actionKind === "invoice" ? (
                          <button type="button" onClick={() => navigate(`/invoice/${record.actionId}`)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
                            Open Invoice
                          </button>
                        ) : record.actionKind === "hotel-booking" ? (
                          <button type="button" onClick={() => navigate("/hotel/payment-history", { state: { bookingId: record.actionId } })} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
                            Open Payment History
                          </button>
                        ) : record.actionKind === "banquet" ? (
                          <button type="button" onClick={() => navigate("/banquet", { state: { focusBookingId: record.actionId, openBanquetBill: true } })} className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700">
                            Open Banquet
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500">
                            Restaurant bill record
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!combinedBillingRecords.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No hotel, restaurant, or banquet billing records match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {combinedBillingRecords.length > BILLING_PAGE_SIZE ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-900">{(billingPage - 1) * BILLING_PAGE_SIZE + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(billingPage * BILLING_PAGE_SIZE, combinedBillingRecords.length)}</span> of <span className="font-semibold text-slate-900">{combinedBillingRecords.length}</span> billing records
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setBillingPage((current) => Math.max(1, current - 1))} disabled={billingPage === 1} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  Previous
                </button>
                {Array.from({ length: billingTotalPages }, (_, index) => {
                  const page = index + 1;
                  const isActive = page === billingPage;

                  return (
                    <button
                      key={`billing-page-${page}`}
                      type="button"
                      onClick={() => setBillingPage(page)}
                      className={`h-9 min-w-[36px] rounded-full border px-3 text-xs font-bold transition ${
                        isActive
                          ? "border-cyan-600 bg-cyan-600 text-white shadow-[0_10px_24px_rgba(8,145,178,0.18)]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setBillingPage((current) => Math.min(billingTotalPages, current + 1))} disabled={billingPage === billingTotalPages} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default AccountsCustomerInvoices;
