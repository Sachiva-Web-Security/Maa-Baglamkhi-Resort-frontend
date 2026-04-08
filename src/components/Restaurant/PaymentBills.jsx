import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";

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

const getCustomerDisplay = (bill) => ({
  name: String(bill?.customerName || "").trim() || "Walk-in Customer",
  phone: String(bill?.phone || "").trim() || "--",
});
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

const PaymentBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomNumbers, setRoomNumbers] = useState(new Set());
  const [selectedBill, setSelectedBill] = useState(null);
  const [billPage, setBillPage] = useState(1);

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
      } catch (error) {
        setBills([]);
        setSelectedBill(null);
        setRoomNumbers(new Set());
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
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
        <p className="text-sm font-semibold uppercase tracking-[0.34em] text-cyan-100/80">
          Restaurant Billing
        </p>
        <h2 className="mt-3 text-4xl font-black leading-tight">Payment Bills</h2>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-100/85">
       “After generating the bill, the customer name, mobile number, amount, and payment status will be displayed here in a clean card format.”
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-500">Latest Bill</p>
          {latestBill ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Customer</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{getCustomerDisplay(latestBill).name}</div>
                <div className="mt-1 text-base font-semibold text-slate-600">{getCustomerDisplay(latestBill).phone}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-slate-200 p-4">
                  <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Entity</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{getEntityLabel(latestBill)}</div>
                </div>
                <div className="rounded-[18px] border border-slate-200 p-4">
                  <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Status</div>
                  <div className={`mt-2 inline-flex rounded-full border px-4 py-1.5 text-base font-black ${getStatusMeta(latestBill).classes}`}>
                    {getStatusMeta(latestBill).label}
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-sm uppercase tracking-[0.18em] text-emerald-700">Total Amount</div>
                <div className="mt-2 text-4xl font-black text-emerald-700">{formatCurrency(latestBill.total)}</div>
                <div className="mt-2 text-base text-emerald-900/80">{formatDate(latestBill.created_at)}</div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-base text-slate-500">
              “No bill has been generated yet.”
            </div>
          )}
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-500">Bills Overview</p>
              <h3 className="mt-2 text-3xl font-black text-slate-900">Generated payment bill cards</h3>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              {uniqueBills.length} Bills
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-base font-semibold text-slate-500">
              Bills loading...
            </div>
          ) : uniqueBills.length ? (
            <div className="mt-6 overflow-hidden rounded-[20px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white text-left text-base">
                  <thead className="bg-slate-50 text-sm uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Visit ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBills.map((bill) => {
                      const statusMeta = getStatusMeta(bill);
                      const customer = getCustomerDisplay(bill);
                      const active = selectedBill?.id === bill.id;

                      return (
                        <tr
                          key={bill.id}
                          className={`border-t border-slate-200 ${active ? "bg-cyan-50" : "bg-white"}`}
                        >
                          <td className="px-4 py-4 font-bold text-slate-900">
                            {getEntityLabel(bill)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">{customer.name}</div>
                            <div className="mt-1 text-sm text-slate-500">{customer.phone}</div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {formatVisitId(bill.tokenCode, bill.tokenId)}
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {formatDate(bill.created_at)}
                          </td>
                          <td className="px-4 py-4 font-bold text-emerald-600">
                            {formatCurrency(bill.total)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full border px-4 py-1.5 text-sm font-bold ${statusMeta.classes}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedBill(bill)}
                              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                                active
                                  ? "bg-cyan-600 text-white"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-base text-slate-500">
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
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalBillPages }, (_, index) => index + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setBillPage(pageNumber)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          pageNumber === billPage
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setBillPage((current) => Math.min(totalBillPages, current + 1))}
                      disabled={billPage === totalBillPages}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-base text-slate-500">
          “After generating the bill, the bill card will appear here.”
            </div>
          )}
        </div>
      </div>

      {selectedBill ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-[560px] rounded-[30px] border border-white/35 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.30)]">
            <button
              type="button"
              onClick={() => setSelectedBill(null)}
              className="absolute right-5 top-5 rounded-full bg-slate-900 px-4 py-1.5 text-base font-bold text-white"
            >
              Close
            </button>

            <div className="rounded-[24px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] px-5 py-5 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100/80">Bill Detail Card</p>
              <h3 className="mt-2 text-4xl font-black">{getEntityLabel(selectedBill)}</h3>
              <p className="mt-2 text-lg text-white/85">Bill #{selectedBill.id} | {formatDate(selectedBill.created_at)}</p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Customer Name</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{getCustomerDisplay(selectedBill).name}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Mobile Number</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{getCustomerDisplay(selectedBill).phone}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Bill Status</div>
                <div className={`mt-2 inline-flex rounded-full border px-4 py-1.5 text-base font-black ${getStatusMeta(selectedBill).classes}`}>
                  {getStatusMeta(selectedBill).label}
                </div>
                <div className="mt-2 text-base text-slate-500">{getStatusMeta(selectedBill).billStage}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Total Amount</div>
                <div className="mt-2 text-3xl font-black text-emerald-600">{formatCurrency(selectedBill.total)}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[18px] border border-slate-200 px-4 py-4">
                <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Subtotal</div>
                <div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(selectedBill.subtotal)}</div>
              </div>
              <div className="rounded-[18px] border border-slate-200 px-4 py-4">
                <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Tax</div>
                <div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(selectedBill.gst)}</div>
              </div>
              <div className="rounded-[18px] border border-slate-200 px-4 py-4">
                <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Payment Mode</div>
                <div className="mt-2 text-xl font-black text-slate-900">{selectedBill.paymentMethod || "Pending"}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PaymentBills;
