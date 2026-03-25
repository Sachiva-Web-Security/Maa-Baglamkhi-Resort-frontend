import React, { useEffect, useState } from "react";
import API from "../../api";

const formatCurrency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

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

const PaymentBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomNumbers, setRoomNumbers] = useState(new Set());

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const [billsResponse, roomsResponse] = await Promise.all([
          API.get("/restaurant/bills"),
          API.get("/housekeeping"),
        ]);

        setBills(Array.isArray(billsResponse.data) ? billsResponse.data : []);
        setRoomNumbers(
          new Set(
            (Array.isArray(roomsResponse.data) ? roomsResponse.data : [])
              .map((room) => String(room.roomNo || room.roomNumber || "").trim())
              .filter(Boolean),
          ),
        );
      } catch (error) {
        setBills([]);
        setRoomNumbers(new Set());
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  const uniqueBills = bills.filter((bill, index, allBills) => {
    const billKey = [
      (bill.customerName || "").trim().toLowerCase(),
      (bill.phone || "").trim(),
      String(bill.tableNumber || "").trim(),
      Number(bill.total || 0),
    ].join("|");

    return (
      index ===
      allBills.findIndex((candidate) => {
        const candidateKey = [
          (candidate.customerName || "").trim().toLowerCase(),
          (candidate.phone || "").trim(),
          String(candidate.tableNumber || "").trim(),
          Number(candidate.total || 0),
        ].join("|");

        return candidateKey === billKey;
      })
    );
  });

  const latestBill = uniqueBills[0] || null;
  const resolveEntityType = (bill) => {
    const explicitType = String(bill.entityType || "").trim().toLowerCase();
    if (explicitType === "room" || explicitType === "table") return explicitType;

    return roomNumbers.has(String(bill.tableNumber || "").trim()) ? "room" : "table";
  };

  const getEntityLabel = (bill) =>
    resolveEntityType(bill) === "room"
      ? `Room ${bill.tableNumber || "--"}`
      : `Table ${bill.tableNumber || "--"}`;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-100/80">
          Restaurant Billing
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight">
          Payment Bills
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100/85">
          Generate kiye gaye bills aur payment history yahin show honge.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-500">
            Latest Bill
          </p>
          {latestBill ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Customer
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {latestBill.customerName || "Walk-in Customer"}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-600">
                  {getEntityLabel(latestBill)} | {latestBill.phone || "--"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-slate-200 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {resolveEntityType(latestBill) === "room" ? "Room" : "Table"}
                  </div>
                  <div className="mt-2 text-lg font-black text-slate-900">
                    {latestBill.tableNumber}
                  </div>
                </div>
                <div className="rounded-[18px] border border-slate-200 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </div>
                  <div className="mt-2 text-lg font-black text-emerald-600">
                    {latestBill.invoiceStatus || "Saved"}
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
                  Total Amount
                </div>
                <div className="mt-2 text-3xl font-black text-emerald-700">
                  {formatCurrency(latestBill.total)}
                </div>
                <div className="mt-2 text-sm text-emerald-900/80">
                  {formatDate(latestBill.created_at)}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              Abhi tak koi bill generate nahi hua.
            </div>
          )}
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-500">
                Bills History
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">
                Generated payment bills
              </h3>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
              {uniqueBills.length} Bills
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">
              Bills loading...
            </div>
          ) : uniqueBills.length ? (
            <div className="mt-6 overflow-hidden rounded-[22px] border border-slate-200">
              <div className="grid grid-cols-[80px_1.1fr_1fr_120px_130px_140px] gap-3 bg-slate-100 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                <div>ID</div>
                <div>Customer</div>
                <div>Phone</div>
                <div>Entity</div>
                <div>Total</div>
                <div>Status</div>
              </div>

              <div className="max-h-[620px] overflow-auto">
                {uniqueBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="grid grid-cols-[80px_1.1fr_1fr_120px_130px_140px] gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-700"
                  >
                    <div className="font-black text-slate-900">#{bill.id}</div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {bill.customerName || "Walk-in Customer"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(bill.created_at)}
                      </div>
                    </div>
                    <div className="font-semibold">{bill.phone || "--"}</div>
                    <div className="font-semibold">{getEntityLabel(bill)}</div>
                    <div className="font-black text-emerald-600">
                      {formatCurrency(bill.total)}
                    </div>
                    <div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {bill.invoiceStatus || "Saved"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Generate Bill karne ke baad yahan entry show ho jayegi.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PaymentBills;
