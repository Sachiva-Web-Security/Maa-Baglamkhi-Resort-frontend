import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import { getCurrentActor } from "../../utils/currentActor";

const PAYMENT_BILLS_PAGE_SIZE = 10;
const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
const formatVisitId = (tokenCode, tokenId) => tokenCode || (tokenId ? `VIS-${String(tokenId).padStart(6, "0")}` : "--");

const formatDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCustomerDisplay = (bill, enrichedGuest) => {
  // Use bill's customer data first, or fallback to enriched guest data from rooms/bookings
  const billName = String(bill?.customerName || "").trim();
  const billPhone = String(bill?.phone || "").trim();

  // enrichedGuest comes from room/booking data
  const guestName = billName || String(enrichedGuest?.guestName || enrichedGuest?.name || "").trim() || "Walk-in Customer";
  const phone = billPhone || String(enrichedGuest?.mobile || enrichedGuest?.phone || "").trim() || "--";

  return { name: guestName, phone: phone };
};
const createBillCardKey = (bill) =>
  bill?.tokenId
    ? `${String(bill.entityType || "Table").toLowerCase()}:token:${Number(bill.tokenId)}`
    : [
        String(bill?.tableNumber || "").trim(),
        String(bill?.entityType || "Table").trim().toLowerCase(),
      ].join("|");

const getStatusMeta = (bill) => {
  const normalizedStatus = String(bill?.invoiceStatus || "").toLowerCase();
  const isPaid = normalizedStatus === "paid";
  const isPostedToRoom = normalizedStatus === "posted to room";
  return {
    label: isPaid ? "Paid" : isPostedToRoom ? "Posted To Room" : "Pending",
    billStage: isPaid ? "Payment Completed" : isPostedToRoom ? "Shifted To Folio" : "Bill Generated",
    classes: isPaid
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : isPostedToRoom
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-amber-200 bg-amber-50 text-amber-700",
  };
};

// Small inline icon set (kept purely presentational, no logic impact)
const IconBillDoc = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 3.75A1.75 1.75 0 0 1 7.75 2h6.19c.464 0 .909.184 1.238.513l3.31 3.31c.329.329.513.774.513 1.238V20.25A1.75 1.75 0 0 1 17.25 22h-9.5A1.75 1.75 0 0 1 6 20.25V3.75Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 9h6M9 12.5h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconHome = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 10.5 12 4l8 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 9.5V19a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTable = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 8h18M5 8v11M19 8v11M3 8l2-4h14l2 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconWallet = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h13A1.5 1.5 0 0 1 19 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 16.5v-9Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M15.5 12.5h3a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-3a1.5 1.5 0 0 0 0 3Z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const PaymentBills = () => {
  const actor = getCurrentActor();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomNumbers, setRoomNumbers] = useState(new Set());
  const [rooms, setRooms] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billPage, setBillPage] = useState(1);

  // Create guest info lookup from rooms (for enriching bill data)
  const guestLookup = useMemo(() => {
    const lookup = new Map();
    (Array.isArray(rooms) ? rooms : []).forEach((room) => {
      const roomNo = String(room.roomNo || room.roomNumber || "").trim();
      if (roomNo) {
        lookup.set(roomNo, {
          name: room.guest || null,
          mobile: room.mobile || room.phone || null,
        });
      }
    });
    return lookup;
  }, [rooms]);

  // Get enriched guest info for a bill based on room number
  const getGuestInfoForBill = (bill) => {
    const roomNo = String(bill?.tableNumber || "").trim();
    return guestLookup.get(roomNo) || null;
  };

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const [billsResponse, roomsResponse] = await Promise.all([
          API.get("/restaurant/bills"),
          API.get("/housekeeping"),
        ]);

        const nextBills = Array.isArray(billsResponse.data) ? billsResponse.data : [];
        setBills(nextBills);
        setSelectedBill(nextBills[0] || null);
        setRoomNumbers(
          new Set(
            (Array.isArray(roomsResponse.data) ? roomsResponse.data : [])
              .map((room) => String(room.roomNo || room.roomNumber || "").trim())
              .filter(Boolean),
          ),
        );
        setRooms(Array.isArray(roomsResponse.data) ? roomsResponse.data : []);
      } catch (error) {
        setBills([]);
        setSelectedBill(null);
        setRoomNumbers(new Set());
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  const uniqueBills = useMemo(() => {
    const latestByTable = new Map();
    (Array.isArray(bills) ? bills : []).forEach((bill) => {
      const key = createBillCardKey(bill);

      const existing = latestByTable.get(key);
      if (!existing || Number(bill.id || 0) > Number(existing.id || 0)) {
        latestByTable.set(key, bill);
      }
    });

    return Array.from(latestByTable.values()).sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [bills]);

  const resolveEntityType = (bill) => {
    const explicitType = String(bill.entityType || "").trim().toLowerCase();
    if (explicitType === "room" || explicitType === "table") return explicitType;
    return roomNumbers.has(String(bill.tableNumber || "").trim()) ? "room" : "table";
  };

  const getEntityLabel = (bill) =>
    resolveEntityType(bill) === "room"
      ? `Room ${bill.tableNumber || "--"}`
      : `Table ${bill.tableNumber || "--"}`;

  const latestBill = uniqueBills[0] || null;
  const totalBillPages = Math.max(1, Math.ceil(uniqueBills.length / PAYMENT_BILLS_PAGE_SIZE));
  const paginatedBills = uniqueBills.slice(
    (billPage - 1) * PAYMENT_BILLS_PAGE_SIZE,
    billPage * PAYMENT_BILLS_PAGE_SIZE,
  );

  useEffect(() => {
    setBillPage(1);
  }, [uniqueBills]);

  useEffect(() => {
    if (billPage > totalBillPages) {
      setBillPage(totalBillPages);
    }
  }, [billPage, totalBillPages]);

  return (
    <section className="space-y-6 md:space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[28px] border border-blue-900/20 bg-gradient-to-br from-blue-950 via-blue-900 via-blue-700 to-sky-500 px-6 py-8 text-white shadow-[0_25px_65px_rgba(15,44,111,0.28)] sm:px-10 sm:py-10">
        {/* Abstract wave pattern */}
        {/* <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
          viewBox="0 0 1000 300"
          preserveAspectRatio="none"
          fill="none"
        >
          <path d="M0 180 C 150 120, 300 240, 500 170 S 850 90, 1000 160 L1000 300 L0 300 Z" fill="white" />
          <path d="M0 220 C 180 160, 320 260, 520 210 S 860 150, 1000 210 L1000 300 L0 300 Z" fill="white" opacity="0.6" />
        </svg> */}
        {/* Blue glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-300/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-blue-400/30 blur-3xl" />
        {/* Watermark icon */}
        <IconBillDoc className="pointer-events-none absolute -right-4 top-1/2 h-40 w-40 -translate-y-1/2 text-white/10 sm:h-48 sm:w-48" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
            <IconBillDoc className="h-6 w-6 text-white" />
          </span>
          <p className="text-[13px] font-semibold uppercase tracking-[0.34em] text-cyan-100/85">
            {actor.isWaiter ? "Waiter Billing" : "Restaurant Billing"}
          </p>
        </div>
        <h2 className="relative z-10 mt-4 text-4xl font-black leading-tight sm:text-5xl">
          {actor.isWaiter ? "My Payment Bills" : "Payment Bills"}
        </h2>
        {/* <p className="relative z-10 mt-3 max-w-2xl text-[18px] leading-8 text-slate-100/90 sm:text-[20px]">
          After generating the bill, the customer name, mobile number, amount, and payment status will be displayed here in a clean card format.
        </p> */}
      </div>

      <div className="grid gap-5 md:gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Latest Bill Card */}
        <div className="rounded-[28px] border border-blue-100 bg-white/90 p-6 shadow-[0_20px_50px_rgba(30,64,175,0.08)] backdrop-blur-sm sm:p-7">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <IconBillDoc className="h-5 w-5" />
            </span>
            <p className="text-[15px] font-bold uppercase tracking-[0.28em] text-blue-600">Latest Bill</p>
          </div>

          {latestBill ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[22px] border border-blue-50 bg-blue-50/50 p-5">
                <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-slate-500">Customer</div>
                <div className="mt-2 text-3xl font-black text-slate-900">
                  {getCustomerDisplay(latestBill, getGuestInfoForBill(latestBill)).name}
                </div>
                <div className="mt-1 text-[18px] font-semibold text-slate-600">
                  {getCustomerDisplay(latestBill, getGuestInfoForBill(latestBill)).phone}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[15px] uppercase tracking-[0.18em] text-slate-500">
                    {resolveEntityType(latestBill) === "room" ? (
                      <IconHome className="h-4 w-4 text-blue-500" />
                    ) : (
                      <IconTable className="h-4 w-4 text-blue-500" />
                    )}
                    Entity
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{getEntityLabel(latestBill)}</div>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[15px] uppercase tracking-[0.18em] text-slate-500">Status</div>
                  <div
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[15px] font-bold ${getStatusMeta(latestBill).classes}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {getStatusMeta(latestBill).label}
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] uppercase tracking-[0.18em] text-emerald-700">Total Amount</div>
                    <div className="mt-2 text-4xl font-black text-emerald-700">{formatCurrency(latestBill.total)}</div>
                    <div className="mt-2 text-[17px] text-emerald-900/80">{formatDate(latestBill.created_at)}</div>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <IconWallet className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-blue-200 bg-blue-50/40 px-4 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-500">
                <IconBillDoc className="h-7 w-7" />
              </span>
              <p className="text-[20px] font-semibold text-slate-500 sm:text-[22px]">No bill has been generated yet.</p>
            </div>
          )}
        </div>

        {/* Bills Overview */}
        <div className="rounded-[28px] border border-blue-100 bg-white/90 p-6 shadow-[0_20px_50px_rgba(30,64,175,0.08)] backdrop-blur-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <IconBillDoc className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[15px] font-bold uppercase tracking-[0.28em] text-blue-600">Bills Overview</p>
                <h3 className="mt-1 text-[30px] font-black leading-tight text-slate-900 sm:text-[34px]">
                  Generated payment bill cards
                </h3>
              </div>
            </div>
            <div className="rounded-full bg-blue-50 px-4 py-2 text-[15px] font-bold text-blue-700 ring-1 ring-blue-100">
              {uniqueBills.length} Bills
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-[22px] border border-blue-100 bg-blue-50/40 px-4 py-12 text-center text-[20px] font-semibold text-slate-500">
              Bills loading...
            </div>
          ) : uniqueBills.length ? (
            <div className="mt-6 overflow-hidden rounded-[22px] border border-blue-100">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white text-left">
                  <thead className="bg-blue-50/70 text-[16px] uppercase tracking-[0.16em] text-blue-900/70 sm:text-[17px]">
                    <tr>
                      <th className="px-5 py-4 font-bold">Entity</th>
                      <th className="px-5 py-4 font-bold">Customer</th>
                      <th className="px-5 py-4 font-bold">Visit ID</th>
                      <th className="px-5 py-4 font-bold">Date</th>
                      <th className="px-5 py-4 font-bold">Amount</th>
                      <th className="px-5 py-4 font-bold">Status</th>
                      <th className="px-5 py-4 text-center font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBills.map((bill) => {
                      const statusMeta = getStatusMeta(bill);
                      const customer = getCustomerDisplay(bill, getGuestInfoForBill(bill));
                      const active = selectedBill?.id === bill.id;

                      return (
                        <tr
                          key={bill.id}
                          className={`border-t border-blue-50 transition-colors ${
                            active ? "bg-blue-50/70" : "bg-white hover:bg-blue-50/40"
                          }`}
                        >
                          <td className="px-5 py-5 text-[18px] font-bold text-slate-900">
                            <span className="flex items-center gap-2">
                              {resolveEntityType(bill) === "room" ? (
                                <IconHome className="h-4 w-4 text-blue-400" />
                              ) : (
                                <IconTable className="h-4 w-4 text-blue-400" />
                              )}
                              {getEntityLabel(bill)}
                            </span>
                          </td>
                          <td className="px-5 py-5">
                            <div className="text-[18px] font-semibold text-slate-900">{customer.name}</div>
                            <div className="mt-1 text-[16px] text-slate-500">{customer.phone}</div>
                          </td>
                          <td className="px-5 py-5 text-[17px] text-slate-600">
                            {formatVisitId(bill.tokenCode, bill.tokenId)}
                          </td>
                          <td className="px-5 py-5 text-[17px] text-slate-600">
                            {formatDate(bill.created_at)}
                          </td>
                          <td className="px-5 py-5 text-[18px] font-bold text-emerald-600">
                            {formatCurrency(bill.total)}
                          </td>
                          <td className="px-5 py-5">
                            <span className={`rounded-full border px-4 py-1.5 text-[15px] font-bold ${statusMeta.classes}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-5 py-5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedBill(bill)}
                              className={`rounded-xl px-5 py-2.5 text-[17px] font-bold shadow-sm transition-all duration-150 ${
                                active
                                  ? "bg-blue-700 text-white hover:bg-blue-800"
                                  : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                              }`}
                            >
                              {active ? "Selected" : "View"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {uniqueBills.length > PAYMENT_BILLS_PAGE_SIZE ? (
                <div className="flex flex-col gap-4 border-t border-blue-100 bg-blue-50/30 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[16px] text-slate-500 sm:text-[17px]">
                    Showing{" "}
                    <span className="font-semibold text-slate-900">
                      {(billPage - 1) * PAYMENT_BILLS_PAGE_SIZE + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-900">
                      {Math.min(billPage * PAYMENT_BILLS_PAGE_SIZE, uniqueBills.length)}
                    </span>{" "}
                    of <span className="font-semibold text-slate-900">{uniqueBills.length}</span> bills
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBillPage((current) => Math.max(1, current - 1))}
                      disabled={billPage === 1}
                      className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-[16px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-[17px]"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalBillPages }, (_, index) => index + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setBillPage(pageNumber)}
                        className={`rounded-xl px-4 py-2.5 text-[16px] font-semibold shadow-sm transition sm:text-[17px] ${
                          pageNumber === billPage
                            ? "bg-blue-700 text-white"
                            : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setBillPage((current) => Math.min(totalBillPages, current + 1))}
                      disabled={billPage === totalBillPages}
                      className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-[16px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-[17px]"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-blue-200 bg-blue-50/40 px-4 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-500">
                <IconBillDoc className="h-7 w-7" />
              </span>
              <p className="text-[20px] text-slate-500 sm:text-[22px]">After generating the bill, the bill card will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bill Detail Popup */}
      {selectedBill ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="relative flex max-h-[92vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[30px] border border-white/40 bg-white/95 shadow-[0_35px_100px_rgba(15,23,42,0.35)]">
            <button
              type="button"
              onClick={() => setSelectedBill(null)}
              className="absolute right-5 top-5 z-10 rounded-xl bg-white/15 px-4 py-2 text-[17px] font-bold text-white backdrop-blur-sm ring-1 ring-white/30 transition hover:bg-white/25"
            >
              Close
            </button>

            <div className="overflow-y-auto">
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-700 to-sky-500 px-6 py-7 text-white sm:px-8">
                <IconBillDoc className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-white/10" />
                <p className="relative z-10 text-[15px] font-semibold uppercase tracking-[0.28em] text-cyan-100/85">
                  Bill Detail Card
                </p>
                <h3 className="relative z-10 mt-3 text-4xl font-black">{getEntityLabel(selectedBill)}</h3>
                <p className="relative z-10 mt-2 text-[18px] text-white/85">
                  Bill #{selectedBill.id} | {formatDate(selectedBill.created_at)}
                </p>
              </div>

              <div className="px-6 py-6 sm:px-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-blue-100 bg-blue-50/50 px-5 py-5">
                    <div className="text-[15px] uppercase tracking-[0.18em] text-slate-500">Customer Name</div>
                    <div className="mt-2 text-2xl font-black text-slate-900">
                      {getCustomerDisplay(selectedBill, getGuestInfoForBill(selectedBill)).name}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-blue-100 bg-blue-50/50 px-5 py-5">
                    <div className="text-[15px] uppercase tracking-[0.18em] text-slate-500">Mobile Number</div>
                    <div className="mt-2 text-2xl font-black text-slate-900">
                      {getCustomerDisplay(selectedBill, getGuestInfoForBill(selectedBill)).phone}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-blue-100 bg-blue-50/50 px-5 py-5">
                    <div className="text-[15px] uppercase tracking-[0.18em] text-slate-500">Bill Status</div>
                    <div
                      className={`mt-2 inline-flex rounded-full border px-4 py-1.5 text-[17px] font-black ${getStatusMeta(selectedBill).classes}`}
                    >
                      {getStatusMeta(selectedBill).label}
                    </div>
                    <div className="mt-2 text-[17px] text-slate-500">{getStatusMeta(selectedBill).billStage}</div>
                  </div>
                  <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/60 px-5 py-5">
                    <div className="text-[15px] uppercase tracking-[0.18em] text-slate-500">Total Amount</div>
                    <div className="mt-2 text-3xl font-black text-emerald-600">{formatCurrency(selectedBill.total)}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-blue-100 px-5 py-5">
                    <div className="text-[15px] uppercase tracking-[0.18em] text-slate-500">Subtotal</div>
                    <div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(selectedBill.subtotal)}</div>
                  </div>
                  <div className="rounded-[20px] border border-blue-100 px-5 py-5">
                    <div className="text-[15px] uppercase tracking-[0.18em] text-slate-500">Tax</div>
                    <div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(selectedBill.gst)}</div>
                  </div>
                  <div className="rounded-[20px] border border-blue-100 px-5 py-5">
                    <div className="text-[15px] uppercase tracking-[0.18em] text-slate-500">Payment Mode</div>
                    <div className="mt-2 text-xl font-black text-slate-900">{selectedBill.paymentMethod || "Pending"}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="mt-6 w-full rounded-xl border border-blue-200 bg-white px-5 py-3.5 text-[17px] font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 sm:hidden"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PaymentBills;