import React, { useEffect, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBed,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHistory,
  FaLayerGroup,
  FaMoneyBillWave,
  FaReceipt,
  FaRedoAlt,
  FaTimes,
  FaTimesCircle,
  FaWallet,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { setStoredBookingId } from "./bookingSession";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getBookingStatusMeta = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("checked in")) {
    return { label: "Checked In", classes: "bg-sky-100 text-sky-700 ring-1 ring-sky-200" };
  }
  if (normalized.includes("checked out")) {
    return { label: "Checked Out", classes: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" };
  }
  if (normalized.includes("cancel")) {
    return { label: "Cancelled", classes: "bg-rose-100 text-rose-700 ring-1 ring-rose-200" };
  }
  if (normalized.includes("pencil") || normalized.includes("tentative")) {
    return { label: "Tentative", classes: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" };
  }
  return { label: "Confirmed", classes: "bg-blue-100 text-blue-700 ring-1 ring-blue-200" };
};

const getPaymentStatusMeta = (remaining) =>
  Number(remaining) <= 0
    ? { label: "Fully Paid", classes: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" }
    : { label: "Balance Due", classes: "bg-rose-100 text-rose-700 ring-1 ring-rose-200" };

const SUMMARY_CARDS = [
  { key: "totalBookings", label: "Total Bookings", icon: FaLayerGroup, tone: "from-slate-950 via-slate-800 to-slate-700" },
  { key: "totalRevenue", label: "Total Revenue", icon: FaMoneyBillWave, tone: "from-blue-700 via-blue-600 to-cyan-500" },
  { key: "totalReceived", label: "Received", icon: FaWallet, tone: "from-emerald-600 via-teal-500 to-cyan-500" },
  { key: "totalBalance", label: "Balance Due", icon: FaReceipt, tone: "from-amber-500 via-orange-500 to-orange-400" },
];

const BOOKINGS_PAGE_SIZE = 9;

const viewConfig = {
  active: {
    title: "Active bookings",
    subtitle: "Upcoming arrivals, in-house guests, and payment follow-up in one clean dashboard.",
    badge: "Live Operations",
  },
  history: {
    title: "Checkout history",
    subtitle: "Review completed stays, settled folios, and post-checkout activity without clutter.",
    badge: "Past Stays",
  },
};

const actionButtonCls =
  "inline-flex min-h-[46px] w-full items-center justify-center whitespace-nowrap rounded-full px-4.5 py-3 text-base font-bold transition";

const feedbackToneClasses = {
  success: {
    accent: "from-emerald-500 to-teal-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    icon: FaCheckCircle,
  },
  error: {
    accent: "from-rose-500 to-red-500",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    icon: FaExclamationTriangle,
  },
};

const AllBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [viewMode, setViewMode] = useState("active");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState({ open: false, booking: null, reason: "", submitting: false });
  const [feedbackModal, setFeedbackModal] = useState({ open: false, type: "success", title: "", message: "" });
  const navigate = useNavigate();

  const openFeedbackModal = (type, title, message) => {
    setFeedbackModal({ open: true, type, title, message });
  };

  const closeFeedbackModal = () => {
    setFeedbackModal((current) => ({ ...current, open: false }));
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const [activeRes, historyRes] = await Promise.all([
        API.get("/hotel/all-bookings"),
        API.get("/hotel/booking-history"),
      ]);
      setBookings(Array.isArray(activeRes.data) ? activeRes.data : []);
      setHistoryBookings(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
      alert("Server connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleLifecycle = async (booking, action) => {
    try {
      await API.put(`/hotel/${action}/${booking.bookingId}`);
      await fetchBookings();
      openFeedbackModal(
        "success",
        action === "check-out" ? "Check-out completed" : "Check-in completed",
        action === "check-out"
          ? "The guest was checked out successfully. The booking is now available in booking history."
          : "The guest was checked in successfully.",
      );
    } catch (err) {
      console.error(err);
      openFeedbackModal(
        "error",
        action === "check-out" ? "Check-out failed" : "Check-in failed",
        action === "check-out"
          ? "We could not complete the guest check-out. Please try again."
          : "We could not complete the guest check-in. Please try again.",
      );
    }
  };

  const handleCancelBooking = async () => {
    const booking = cancelModal.booking;
    const reason = String(cancelModal.reason || "").trim();
    if (!booking?.bookingId) {
      alert("Valid booking nahi mili.");
      return;
    }
    if (!reason) {
      alert("Cancellation reason likhna zaroori hai.");
      return;
    }
    try {
      setCancelModal((current) => ({ ...current, submitting: true }));
      await API.put(`/hotel/cancel/${booking.bookingId}`, { reason });
      setCancelModal({ open: false, booking: null, reason: "", submitting: false });
      fetchBookings();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Booking cancel nahi ho paayi.");
      setCancelModal((current) => ({ ...current, submitting: false }));
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleRefund = async (id) => {
    const amount = prompt("Enter refund amount");
    if (!amount || Number.isNaN(Number(amount))) {
      alert("Invalid amount");
      return;
    }
    try {
      await API.post(`/hotel/refund/${id}`, { amount });
      alert("Refund Done");
      fetchBookings();
    } catch (err) {
      console.error("Refund failed:", err);
      alert("Refund Failed");
    }
  };

  const visibleBookings = useMemo(
    () => (viewMode === "history" ? historyBookings : bookings),
    [bookings, historyBookings, viewMode],
  );

  const summary = useMemo(() => {
    return visibleBookings.reduce(
      (acc, booking) => {
        acc.totalBookings += 1;
        acc.totalRevenue += Number(booking.totalAmount || 0);
        acc.totalReceived += Number(booking.paidAmount || 0);
        acc.totalBalance += Number(booking.remainingAmount || 0);
        acc.totalRefund += Number(booking.refundAmount || 0);
        return acc;
      },
      { totalBookings: 0, totalRevenue: 0, totalReceived: 0, totalBalance: 0, totalRefund: 0 },
    );
  }, [visibleBookings]);

  const quickSnapshot = useMemo(() => {
    return visibleBookings.reduce(
      (acc, booking) => {
        const remaining = Number(booking.remainingAmount || 0);
        const status = String(booking.booking_status || "").toLowerCase();
        if (status.includes("checked in")) acc.checkedIn += 1;
        if (status.includes("confirmed")) acc.confirmed += 1;
        if (remaining > 0) acc.balanceDue += 1;
        return acc;
      },
      { checkedIn: 0, confirmed: 0, balanceDue: 0 },
    );
  }, [visibleBookings]);

  const totalPages = Math.max(1, Math.ceil(visibleBookings.length / BOOKINGS_PAGE_SIZE));
  const paginatedBookings = visibleBookings.slice((page - 1) * BOOKINGS_PAGE_SIZE, page * BOOKINGS_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [viewMode, bookings, historyBookings]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const buildActionButtons = (booking) => {
    const isCheckedIn = String(booking.booking_status || "").toLowerCase().includes("checked in");
    const remaining = Number(booking.remainingAmount || 0);
    const items = [
      {
        key: "view",
        label: "View",
        className: `${actionButtonCls} bg-slate-950 text-white hover:bg-slate-800`,
        onClick: () => {
          setStoredBookingId(booking.bookingId);
          navigate("/hotel/communication", { state: { bookingId: booking.bookingId } });
        },
      },
      {
        key: "invoice",
        label: "Invoice",
        className: `${actionButtonCls} bg-indigo-600 text-white hover:bg-indigo-700`,
        onClick: () => navigate(`/invoice/${booking.bookingId}`),
      },
    ];

    if (viewMode === "active") {
      items.push(
        {
          key: "check",
          label: isCheckedIn ? "Check Out" : "Check In",
          className: `${actionButtonCls} bg-emerald-600 text-white hover:bg-emerald-700`,
          onClick: () => handleLifecycle(booking, isCheckedIn ? "check-out" : "check-in"),
        },
        {
          key: "edit",
          label: "Edit",
          className: `${actionButtonCls} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`,
          onClick: () => {
            setStoredBookingId(booking.bookingId);
            navigate("/hotel/edit-booking", { state: { bookingId: booking.bookingId } });
          },
        },
        {
          key: "refund",
          label: "Refund",
          className: `${actionButtonCls} bg-fuchsia-600 text-white hover:bg-fuchsia-700`,
          onClick: () => handleRefund(booking.bookingId),
        },
      );

      if (!isCheckedIn) {
        items.push({
          key: "cancel",
          label: "Cancel",
          className: `${actionButtonCls} bg-rose-600 text-white hover:bg-rose-700`,
          onClick: () => setCancelModal({ open: true, booking, reason: "", submitting: false }),
        });
      }

      if (remaining > 0) {
        items.push({
          key: "collect",
          label: "Collect",
          className: `${actionButtonCls} bg-blue-600 text-white hover:bg-blue-700`,
          onClick: () => {
            setStoredBookingId(booking.bookingId);
            navigate("/hotel/collect-payment", {
              state: { bookingId: booking.bookingId, remainingAmount: remaining },
            });
          },
        });
      }

      items.push({
        key: "folio",
        label: "Folio",
        className: `${actionButtonCls} border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100`,
        onClick: () => {
          setStoredBookingId(booking.bookingId);
          navigate("/hotel/folio", { state: { bookingId: booking.bookingId } });
        },
      });
    }

    items.push({
      key: "history",
      label: "History",
      className: `${actionButtonCls} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`,
      onClick: () => navigate("/hotel/payment-history", { state: { bookingId: booking.bookingId } }),
    });

    return items;
  };

  const activeView = viewConfig[viewMode];

  const renderBookingCards = (cardGridClasses = "xl:hidden") => (
    <div className={`mt-6 grid gap-4 ${cardGridClasses}`}>
      {paginatedBookings.map((booking) => {
        const paid = Number(booking.paidAmount || 0);
        const discount = Number(booking.discountAmount || 0);
        const remaining = Number(booking.remainingAmount || 0);
        const total = Number(booking.totalAmount || 0);
        const bookingStatusMeta = getBookingStatusMeta(booking.booking_status);
        const paymentStatusMeta = getPaymentStatusMeta(remaining);
        const actionButtons = buildActionButtons(booking);

        return (
          <article
            key={booking.bookingId}
            className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">
                  Booking #{booking.bookingId}
                </div>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {booking.guest_name || "Walk-in Guest"}
                </h3>
                <p className="mt-1 text-base font-medium text-slate-500">Room {booking.rooms || "Not assigned"}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold uppercase tracking-[0.16em] ${bookingStatusMeta.classes}`}
                  >
                    {bookingStatusMeta.label}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold uppercase tracking-[0.16em] ${paymentStatusMeta.classes}`}
                  >
                    {paymentStatusMeta.label}
                  </span>
                </div>
              </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">Stay Window</div>
                <div className="mt-2 text-base font-bold text-slate-900">{formatDate(booking.check_in)}</div>
                <div className="text-sm uppercase tracking-[0.16em] text-slate-400">to</div>
                <div className="text-base font-bold text-slate-900">{formatDate(booking.check_out)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm uppercase tracking-[0.2em] font-bold text-slate-500">Total</div>
                  <div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(total)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm uppercase tracking-[0.2em] font-bold text-slate-500">Paid</div>
                  <div className="mt-2 text-xl font-black text-emerald-700">{formatCurrency(paid)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm uppercase tracking-[0.2em] font-bold text-slate-500">Discount</div>
                  <div className="mt-2 text-xl font-black text-amber-700">{formatCurrency(discount)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm uppercase tracking-[0.2em] font-bold text-slate-500">Balance</div>
                  <div className={`mt-2 text-xl font-black ${remaining > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {formatCurrency(remaining)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {actionButtons.map((button) => (
                <button
                  key={button.key}
                  type="button"
                  onClick={button.onClick}
                  className={button.className}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );

  const renderDesktopTable = () => (
    <div className="mt-6 hidden overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] xl:block">
      <div className="overflow-x-auto">
        <table className="min-w-[1480px] w-full text-left">
          <thead className="bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]">
            <tr className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              <th className="px-5 py-4">Booking</th>
              <th className="px-5 py-4">Stay Dates</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Paid</th>
              <th className="px-5 py-4">Discount</th>
              <th className="px-5 py-4">Balance</th>
              <th className="w-[430px] px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBookings.map((booking) => {
              const paid = Number(booking.paidAmount || 0);
              const discount = Number(booking.discountAmount || 0);
              const remaining = Number(booking.remainingAmount || 0);
              const total = Number(booking.totalAmount || 0);
              const bookingStatusMeta = getBookingStatusMeta(booking.booking_status);
              const paymentStatusMeta = getPaymentStatusMeta(remaining);
              const actionButtons = buildActionButtons(booking);

              return (
                <tr
                  key={booking.bookingId}
                  className="border-t border-slate-200 align-top text-base text-slate-700 transition hover:bg-slate-50/60"
                >
                  <td className="px-5 py-5">
                    <div className="space-y-2">
                      <div className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">
                        Booking #{booking.bookingId}
                      </div>
                      <div className="max-w-[220px] break-words text-xl font-black leading-7 text-slate-900">
                        {booking.guest_name || "Walk-in Guest"}
                      </div>
                      <div className="text-base font-medium text-slate-500">Room {booking.rooms || "Not assigned"}</div>
                    </div>
                  </td>
                  <td className="px-5 py-5">
                    <div className="space-y-1">
                      <div className="text-base font-bold text-slate-900">{formatDate(booking.check_in)}</div>
                      <div className="text-sm uppercase tracking-[0.18em] text-slate-400">to</div>
                      <div className="text-base font-bold text-slate-900">{formatDate(booking.check_out)}</div>
                    </div>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex flex-col items-start gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold uppercase tracking-[0.16em] ${bookingStatusMeta.classes}`}
                      >
                        {bookingStatusMeta.label}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold uppercase tracking-[0.16em] ${paymentStatusMeta.classes}`}
                      >
                        {paymentStatusMeta.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-5 text-xl font-black text-slate-900">{formatCurrency(total)}</td>
                  <td className="px-5 py-5 text-xl font-black text-emerald-700">{formatCurrency(paid)}</td>
                  <td className="px-5 py-5 text-xl font-black text-amber-700">{formatCurrency(discount)}</td>
                  <td className={`px-5 py-5 text-xl font-black ${remaining > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {formatCurrency(remaining)}
                  </td>
                  <td className="min-w-[430px] px-5 py-5">
                    <div className="grid w-full grid-cols-6 gap-2">
                      {actionButtons.map((button) => (
                        <button
                          key={button.key}
                          type="button"
                          onClick={button.onClick}
                          className={button.className}
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPagination = () => {
    if (!visibleBookings.length) return null;

    return (
      <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 lg:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-base font-medium text-slate-500">
          Showing <span className="font-semibold text-slate-900">{(page - 1) * BOOKINGS_PAGE_SIZE + 1}</span> to{" "}
          <span className="font-semibold text-slate-900">
            {Math.min(page * BOOKINGS_PAGE_SIZE, visibleBookings.length)}
          </span>{" "}
          of <span className="font-semibold text-slate-900">{visibleBookings.length}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="inline-flex min-w-[96px] items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white/80"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;
            const isActive = pageNumber === page;

            return (
              <button
                key={`bookings-page-${pageNumber}`}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`h-10 min-w-[44px] rounded-full border px-3 text-sm font-bold transition ${
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="inline-flex min-w-[96px] items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-white/80"
          >
            Next
          </button>
        </div>
      </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        {viewMode === "history" ? <FaHistory /> : <FaBed />}
      </div>
      <h3 className="mt-4 text-3xl font-black text-slate-900">
        {viewMode === "history" ? "No checkout history yet" : "No active booking yet"}
      </h3>
      <p className="mt-2 text-lg font-medium leading-8 text-slate-500">
        {viewMode === "history"
          ? "Once bookings are checked out, their records will be displayed here with a clean timeline."
          : "After adding a new hotel booking, all active entries will be displayed neatly here."
}
      </p>
      {viewMode === "active" ? (
        <button
          type="button"
          onClick={() => navigate("/hotel/guest")}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-lg font-bold text-white transition hover:bg-slate-800"
        >
          Start new booking
          <FaArrowRight className="text-xs" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.1),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_52%,#fefaf5_100%)] p-4 sm:p-6">
      <div className="w-full space-y-6">
        {feedbackModal.open ? (
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
            onClick={closeFeedbackModal}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={`relative flex items-start gap-4 bg-gradient-to-r ${feedbackToneClasses[feedbackModal.type].accent} px-6 py-6 text-white`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_46%)]" />
                <div className="relative rounded-[20px] border border-white/20 bg-white/15 p-3 shadow-[0_12px_30px_rgba(255,255,255,0.08)]">
                  {React.createElement(feedbackToneClasses[feedbackModal.type].icon, {
                    className: "text-xl",
                  })}
                </div>
                <div className="relative min-w-0 flex-1">
              <div className={`mb-2 inline-flex rounded-full px-3 py-1 text-sm font-bold uppercase tracking-[0.22em] ${feedbackToneClasses[feedbackModal.type].badge}`}>
                    {feedbackModal.type === "success" ? "Success" : "Action Error"}
                  </div>
                  <h2 className="text-lg font-black leading-tight">{feedbackModal.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeFeedbackModal}
                  className="relative rounded-full border border-white/15 p-2 text-white/85 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close popup"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="px-6 py-6">
                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Details
                  </p>
                  <p className="mt-2 text-base font-medium leading-7 text-slate-700">{feedbackModal.message}</p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={closeFeedbackModal}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-3 text-base font-bold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:from-slate-800 hover:to-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#0f766e_100%)] text-white shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
          <div className="grid gap-8 px-6 py-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:px-8 lg:py-8">
            <div className="relative">
              <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
              <p className="relative inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-bold uppercase tracking-[0.3em] text-cyan-100">
                Hotel Booking Desk
              </p>
              <h1 className="relative mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                All bookings in a cleaner, faster workspace
              </h1>
              <p className="relative mt-3 max-w-2xl text-base font-medium leading-7 text-slate-100/85 sm:text-lg">
                Track stay dates, payment balance, and guest actions in one polished page that feels lighter and easier to scan.
              </p>
              <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-100/80">Checked In</div>
                  <div className="mt-2 text-3xl font-black">{quickSnapshot.checkedIn}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-100/80">Confirmed</div>
                  <div className="mt-2 text-3xl font-black">{quickSnapshot.confirmed}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-100/80">Balance Due</div>
                  <div className="mt-2 text-3xl font-black">{quickSnapshot.balanceDue}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.26em] text-white/70">Daily Snapshot</p>
                  <h2 className="mt-2 text-2xl font-black">Revenue overview</h2>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white/85">
                  {visibleBookings.length} bookings
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SUMMARY_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.key}
                      className={`rounded-[24px] bg-gradient-to-br ${card.tone} p-4 shadow-[0_16px_30px_rgba(15,23,42,0.16)]`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-bold uppercase tracking-[0.22em] text-white/75">
                          {card.label}
                        </div>
                        <div className="rounded-2xl bg-white/15 p-2.5">
                          <Icon className="text-sm text-white" />
                        </div>
                      </div>
                      <div className="mt-4 text-3xl font-black text-white">
                        {card.key === "totalBookings" ? summary[card.key] : formatCurrency(summary[card.key])}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-700">{activeView.badge}</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-slate-900 sm:text-4xl">{activeView.title}</h2>
              <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-slate-600">{activeView.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setViewMode("active")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-bold transition ${
                  viewMode === "active"
                    ? "bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <FaBed className="text-xs" />
                Active
              </button>
              <button
                type="button"
                onClick={() => setViewMode("history")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-bold transition ${
                  viewMode === "history"
                    ? "bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <FaHistory className="text-xs" />
                History
              </button>
              <button
                type="button"
                onClick={() => navigate("/hotel/group-booking")}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-base font-bold text-white transition hover:bg-indigo-700"
              >
                <FaLayerGroup className="text-xs" />
                Group Booking
              </button>
              <button
                type="button"
                onClick={() => navigate("/hotel/occupancy-forecast")}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-base font-bold text-white transition hover:bg-amber-600"
              >
                <FaCalendarAlt className="text-xl" />
                Occupancy
              </button>
              <button
                type="button"
                onClick={fetchBookings}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white   px-4 py-2.5 text-base font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaRedoAlt className={`text-xs ${loading ? "animate-spin" : ""}`} />
                {loading ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center text-base font-medium text-slate-500">
              Loading bookings...
            </div>
          ) : visibleBookings.length ? (
            <>
              {viewMode === "history"
                ? renderBookingCards("md:grid-cols-2 2xl:grid-cols-3")
                : (
                  <>
                    {renderBookingCards()}
                    {renderDesktopTable()}
                  </>
                )}
              {renderPagination()}
            </>
          ) : (
            renderEmptyState()
          )}
        </section>

        {cancelModal.open ? (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
            onClick={() => setCancelModal({ open: false, booking: null, reason: "", submitting: false })}
          >
            <div
              className="w-full max-w-md rounded-[28px] border border-rose-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-sm font-bold uppercase tracking-[0.18em] text-rose-700">
                <FaTimesCircle />
                Cancel Booking
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-900">Booking #{cancelModal.booking?.bookingId}</h3>
              <p className="mt-2 text-base font-medium text-slate-600">
                {cancelModal.booking?.guest_name || "--"} | Room {cancelModal.booking?.rooms || "--"}
              </p>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                  Cancellation Reason
                </span>
                <textarea
                  value={cancelModal.reason}
                  onChange={(event) => setCancelModal((current) => ({ ...current, reason: event.target.value }))}
                  rows={4}
                  placeholder="Guest cancelled, no-show, wrong date, price issue..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-800 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
                />
              </label>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelModal({ open: false, booking: null, reason: "", submitting: false })}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-base font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={cancelModal.submitting}
                  className={`inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-base font-bold text-white transition hover:bg-rose-700 ${
                    cancelModal.submitting ? "cursor-not-allowed opacity-70" : ""
                  }`}
                >
                  {cancelModal.submitting ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AllBooking;
